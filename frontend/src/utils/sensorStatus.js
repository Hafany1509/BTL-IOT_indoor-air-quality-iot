import { serverTime } from './formatDate';
export const offlineAfterMs = 60_000;
export function connectionStatus(device, sample) {
  if (device?.lifecycle === 'OFFLINE') return 'OFFLINE';
  const seen = serverTime(device?.last_seen_at || sample?.received_at);
  if (!Number.isFinite(seen)) return 'UNKNOWN';
  return Date.now() - seen > offlineAfterMs ? 'OFFLINE' : 'ONLINE';
}
export const isStale = sample => Date.now() - serverTime(sample?.received_at) > offlineAfterMs;
