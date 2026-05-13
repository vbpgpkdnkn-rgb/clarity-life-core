import { useCallback, useSyncExternalStore } from "react";
import { cancelPendingActions, getProjectQueueSnapshot, subscribeProjectQueue } from "@/lib/contentProjectQueue";

const idleSnapshot = Object.freeze({
  activeOperation: null,
  pendingCount: 0,
  isBusy: false,
  lastSuccessfulPatch: null,
  failedOperations: 0,
  aiLatencyMs: null,
  lastFailure: null,
});

export function useContentProjectQueue(projectId?: string | null) {
  const subscribe = useCallback(
    (listener: () => void) => (projectId ? subscribeProjectQueue(projectId, listener) : () => undefined),
    [projectId],
  );

  const getSnapshot = useCallback(
    () => (projectId ? getProjectQueueSnapshot(projectId) : idleSnapshot),
    [projectId],
  );

  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => idleSnapshot,
  );

  return {
    ...snapshot,
    cancelPendingActions: () => projectId && cancelPendingActions(projectId),
  };
}