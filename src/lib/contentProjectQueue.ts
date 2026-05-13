/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

type QueueAction<T = unknown> = {
  id: string;
  projectId: string;
  operation: string;
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

type QueueSnapshot = {
  activeOperation: string | null;
  pendingCount: number;
  isBusy: boolean;
  lastSuccessfulPatch: string | null;
  failedOperations: number;
  aiLatencyMs: number | null;
  lastFailure: string | null;
};

const queues = new Map<string, QueueAction[]>();
const active = new Map<string, QueueAction>();
const listeners = new Map<string, Set<() => void>>();
const snapshots = new Map<string, QueueSnapshot>();
const telemetry = new Map<string, Pick<QueueSnapshot, "lastSuccessfulPatch" | "failedOperations" | "aiLatencyMs" | "lastFailure">>();

const IDLE_SNAPSHOT: QueueSnapshot = Object.freeze({
  activeOperation: null,
  pendingCount: 0,
  isBusy: false,
  lastSuccessfulPatch: null,
  failedOperations: 0,
  aiLatencyMs: null,
  lastFailure: null,
});

const wait = (ms: number) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));
const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function buildSnapshot(projectId: string): QueueSnapshot {
  const current = active.get(projectId);
  const pending = queues.get(projectId)?.length ?? 0;
  const stats = telemetry.get(projectId) ?? IDLE_SNAPSHOT;
  return {
    activeOperation: current?.operation ?? null,
    pendingCount: pending,
    isBusy: Boolean(current) || pending > 0,
    lastSuccessfulPatch: stats.lastSuccessfulPatch,
    failedOperations: stats.failedOperations,
    aiLatencyMs: stats.aiLatencyMs,
    lastFailure: stats.lastFailure,
  };
}

function sameSnapshot(a: QueueSnapshot, b: QueueSnapshot) {
  return a.activeOperation === b.activeOperation
    && a.pendingCount === b.pendingCount
    && a.isBusy === b.isBusy
    && a.lastSuccessfulPatch === b.lastSuccessfulPatch
    && a.failedOperations === b.failedOperations
    && a.aiLatencyMs === b.aiLatencyMs
    && a.lastFailure === b.lastFailure;
}

function commitSnapshot(projectId: string) {
  const next = buildSnapshot(projectId);
  const stableNext = sameSnapshot(next, IDLE_SNAPSHOT) ? IDLE_SNAPSHOT : next;
  const previous = snapshots.get(projectId) ?? IDLE_SNAPSHOT;
  if (sameSnapshot(previous, stableNext)) return false;
  if (stableNext === IDLE_SNAPSHOT) snapshots.delete(projectId);
  else snapshots.set(projectId, stableNext);
  return true;
}

function emit(projectId: string) {
  const changed = commitSnapshot(projectId);
  if (!changed) return;
  listeners.get(projectId)?.forEach((listener) => listener());
}

export function subscribeProjectQueue(projectId: string, listener: () => void) {
  const set = listeners.get(projectId) ?? new Set<() => void>();
  set.add(listener);
  listeners.set(projectId, set);
  return () => {
    set.delete(listener);
    if (!set.size) listeners.delete(projectId);
  };
}

export function getProjectQueueSnapshot(projectId: string): QueueSnapshot {
  const cached = snapshots.get(projectId);
  if (cached) return cached;
  const next = buildSnapshot(projectId);
  if (sameSnapshot(next, IDLE_SNAPSHOT)) return IDLE_SNAPSHOT;
  snapshots.set(projectId, next);
  return next;
}

async function acquireContextLock(projectId: string, operation: string, actionId: string) {
  const currentOperation = `${operation} #${actionId.slice(-6)}`;
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    await (supabase as any)
      .from("content_project_locks")
      .delete()
      .eq("project_id", projectId)
      .lt("expires_at", new Date().toISOString());

    const { error } = await (supabase as any).from("content_project_locks").insert({
      project_id: projectId,
      current_operation: currentOperation,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90_000).toISOString(),
    });

    if (!error) return currentOperation;

    const locked = error.code === "23505" || String(error.message ?? "").toLowerCase().includes("duplicate");
    if (!locked) throw error;
    await wait(1_200);
  }

  throw new Error("A esteira ainda está processando outra ação. Tente novamente em instantes.");
}

async function releaseContextLock(projectId: string, currentOperation: string) {
  await (supabase as any)
    .from("content_project_locks")
    .delete()
    .eq("project_id", projectId)
    .eq("current_operation", currentOperation);
}

export function enqueueAction<T>(input: {
  projectId: string;
  operation: string;
  run: () => Promise<T>;
}) {
  const id = makeId();
  const promise = new Promise<T>((resolve, reject) => {
    const action: QueueAction<T> = { id, projectId: input.projectId, operation: input.operation, run: input.run, resolve, reject };
    const queue = queues.get(input.projectId) ?? [];
    queue.push(action as QueueAction);
    queues.set(input.projectId, queue);
    emit(input.projectId);
    void processNextAction(input.projectId);
  });

  return promise;
}

export async function processNextAction(projectId: string) {
  if (active.has(projectId)) return;

  const queue = queues.get(projectId) ?? [];
  const action = queue.shift();
  if (!action) {
    queues.delete(projectId);
    emit(projectId);
    return;
  }

  active.set(projectId, action);
  queues.set(projectId, queue);
  emit(projectId);

  let lockOperation: string | null = null;
  const startedAt = Date.now();
  try {
    lockOperation = await acquireContextLock(projectId, action.operation, action.id);
    const result = await action.run();
    const previous = telemetry.get(projectId) ?? IDLE_SNAPSHOT;
    telemetry.set(projectId, {
      lastSuccessfulPatch: action.operation,
      failedOperations: previous.failedOperations,
      aiLatencyMs: Date.now() - startedAt,
      lastFailure: null,
    });
    action.resolve(result);
  } catch (error) {
    const previous = telemetry.get(projectId) ?? IDLE_SNAPSHOT;
    telemetry.set(projectId, {
      lastSuccessfulPatch: previous.lastSuccessfulPatch,
      failedOperations: previous.failedOperations + 1,
      aiLatencyMs: Date.now() - startedAt,
      lastFailure: error instanceof Error ? error.message : "Falha desconhecida",
    });
    action.reject(error);
  } finally {
    if (lockOperation) await releaseContextLock(projectId, lockOperation);
    active.delete(projectId);
    emit(projectId);
    void processNextAction(projectId);
  }
}

export function cancelPendingActions(projectId: string) {
  const queue = queues.get(projectId) ?? [];
  queue.forEach((action) => action.reject(new Error("Ações pendentes canceladas")));
  queues.delete(projectId);
  emit(projectId);
}

export function getAllQueueSnapshots() {
  const ids = new Set<string>([...queues.keys(), ...active.keys(), ...snapshots.keys(), ...telemetry.keys()]);
  return Array.from(ids).map((projectId) => ({ projectId, ...getProjectQueueSnapshot(projectId) }));
}