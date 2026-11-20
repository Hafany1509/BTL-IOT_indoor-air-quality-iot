const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const formatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh',
});
export function serverTime(value) {
  if (!value) return NaN;
  return Date.parse(zoned.test(value) ? value : value.replace(' ', 'T') + 'Z');
}
export function measurementClock(value) {
  return serverTime(value) + (zoned.test(value) ? 7 * 3600000 : 0);
}
export function formatDate(value, { measured = false } = {}) {
  if (!value) return '—';
  // The ingestion worker strips the source offset from measured_at.
  if (measured && !zoned.test(value)) return value.replace('T', ' ').slice(0, 19) + ' (giờ nguồn)';
  const epoch = serverTime(value);
  return Number.isFinite(epoch) ? formatter.format(epoch) : '—';
}
export function localInputToIso(value) {
  return value ? new Date(value + '+07:00').toISOString() : undefined;
}
