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
};

const queues = new Map<string, QueueAction[]>();
const active = new Map<string, QueueAction>();
const listeners = new Map<string, Set<() => void>>();

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function emit(projectId: string) {
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
  const current = active.get(projectId);
  const pending = queues.get(projectId)?.length ?? 0;
  return {
    activeOperation: current?.operation ?? null,
    pendingCount: pending,
    isBusy: Boolean(current) || pending > 0,
  };
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
  try {
    lockOperation = await acquireContextLock(projectId, action.operation, action.id);
    const result = await action.run();
    action.resolve(result);
  } catch (error) {
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