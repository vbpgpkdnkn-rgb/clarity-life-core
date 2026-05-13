import { useSyncExternalStore } from "react";
import { cancelPendingActions, getProjectQueueSnapshot, subscribeProjectQueue } from "@/lib/contentProjectQueue";

const idleSnapshot = { activeOperation: null, pendingCount: 0, isBusy: false };

export function useContentProjectQueue(projectId?: string | null) {
  const snapshot = useSyncExternalStore(
    (listener) => (projectId ? subscribeProjectQueue(projectId, listener) : () => undefined),
    () => (projectId ? getProjectQueueSnapshot(projectId) : idleSnapshot),
    () => idleSnapshot,
  );

  return {
    ...snapshot,
    cancelPendingActions: () => projectId && cancelPendingActions(projectId),
  };
}