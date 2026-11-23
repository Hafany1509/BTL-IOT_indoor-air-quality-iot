import { useRef, useState } from 'react';
import { useToast } from '../components/common/Toast';
export function useMutation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const lock = useRef(false);
  const notify = useToast();
  async function run(operation, onSuccess, message) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const data = await operation();
      onSuccess?.(data);
      if (message) notify(message);
    } catch (failure) {
      setError(failure);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run, setError };
}
