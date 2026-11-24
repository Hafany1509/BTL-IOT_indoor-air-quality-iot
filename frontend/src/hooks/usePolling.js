import { useCallback, useEffect, useState } from 'react';

export function usePolling(load, { enabled = true, interval = 0 } = {}) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({});
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let controller;
    let timer;
    let disposed = false;
    let settled = false;
    let terminal = false;

    async function run() {
      if (disposed || document.hidden || controller || terminal || (settled && !interval)) return;
      const request = new AbortController();
      controller = request;
      try {
        const data = await load(request.signal);
        if (!disposed && !request.signal.aborted) {
          settled = true;
          setResult({ load, revision, data });
        }
      } catch (error) {
        if (!disposed && !request.signal.aborted) {
          settled = true;
          terminal = [401, 403, 404].includes(error.response?.status);
          setResult(previous => ({
            load, revision, error,
            data: !terminal && previous.load === load ? previous.data : undefined,
          }));
        }
      } finally {
        controller = undefined;
      }
      if (disposed || document.hidden || terminal) return;
      if (request.signal.aborted) run();
      else if (interval) timer = window.setTimeout(run, interval);
    }

    function visibilityChanged() {
      window.clearTimeout(timer);
      if (document.hidden) controller?.abort();
      else run();
    }

    run();
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [load, enabled, interval, revision]);
  const current = enabled && result.load === load ? result : {};
  return { ...current, reload, loading: enabled && current.revision !== revision };
}
