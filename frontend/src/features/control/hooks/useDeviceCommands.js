import { useCallback, useEffect, useState } from 'react';
import { usePolling } from '../../../hooks/usePolling';
import { useMutation } from '../../../hooks/useMutation';
import { commandService } from '../commandService';
import { serverTime } from '../../../utils/formatDate';

const pending = command => ['SENT', 'PENDING'].includes(command?.status);
export function useDeviceCommands(id) {
  const [tracked, setTracked] = useState(null);
  const [ended, setEnded] = useState(false);
  const mutation = useMutation();
  const loadHistory = useCallback(signal => commandService.list(id, signal), [id]);
  const history = usePolling(loadHistory, { enabled: Boolean(id) });
  const commandId = tracked?.command_id;
  const loadStatus = useCallback(signal => commandService.status(commandId, signal), [commandId]);
  const [completed, setCompleted] = useState(null);
  const polling = pending(tracked) && !ended && completed?.command_id !== commandId;
  const status = usePolling(loadStatus, { enabled: polling, interval: 1800 });

  useEffect(() => {
    if (!polling || !status.data || pending(status.data)) return;
    setCompleted(status.data);
    history.reload();
  }, [polling, status.data, history.reload]);

  useEffect(() => {
    if (!polling) return;
    const deadline = serverTime(tracked.timeout_at);
    const remaining = Number.isFinite(deadline) ? deadline - Date.now() : 15000;
    const timer = window.setTimeout(() => { setEnded(true); history.reload(); }, Math.max(3500, remaining + 5000));
    return () => window.clearTimeout(timer);
  }, [polling, tracked, history.reload]);

  function send(action, value, onSuccess) {
    if (polling) return;
    mutation.run(() => commandService.send(id, action, value), command => {
      setTracked(command);
      setEnded(false);
      setCompleted(null);
      history.reload();
      onSuccess?.();
    });
  }
  return { ...mutation, send, history, polling, ended, command: completed || status.data || tracked, statusError: status.error };
}
