import { useEffect, useRef } from "react";

const mounted = new Set<string>();
const renders = new Map<string, number>();

export function useRenderProbe(name: string) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  renders.set(name, renderCount.current);

  useEffect(() => {
    mounted.add(name);
    return () => {
      mounted.delete(name);
    };
  }, [name]);

  return renderCount.current;
}

export function getRenderProbeSnapshot() {
  return {
    mountedComponents: Array.from(mounted),
    renderCounts: Object.fromEntries(renders.entries()),
  };
}
