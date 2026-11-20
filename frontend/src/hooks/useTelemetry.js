import { useCallback } from 'react';
import { telemetryService } from '../features/telemetry/telemetryService';
import { usePolling } from './usePolling';
export function useLatestTelemetry(id) {
  const load = useCallback(signal => telemetryService.latest(id, signal), [id]);
  return usePolling(load, { enabled: Boolean(id), interval: 7000 });
}
