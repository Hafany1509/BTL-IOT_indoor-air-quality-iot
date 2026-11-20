const labels = {
  ADMIN: 'ADMIN', OPERATOR: 'OPERATOR', VIEWER: 'VIEWER', ONLINE: 'Trực tuyến',
  UNKNOWN: 'Chưa xác định', OFFLINE: 'Mất kết nối', ACTIVE: 'Hoạt động', INACTIVE: 'Vô hiệu hóa',
  REGISTERED: 'Đã đăng ký', PROVISIONED: 'Đã thiết lập', FAULT: 'Có lỗi',
  MAINTENANCE: 'Bảo trì', LOCKED: 'Đã khóa', DECOMMISSIONED: 'Ngừng sử dụng',
  GOOD: 'Tốt', MODERATE: 'Trung bình', POOR: 'Kém', UNHEALTHY: 'Có hại',
  VALID: 'Hợp lệ', INVALID: 'Không hợp lệ', ANOMALY: 'Bất thường', STALE: 'Dữ liệu cũ',
  OPEN: 'Chưa xử lý', ACKNOWLEDGED: 'Đã xác nhận', RESOLVED: 'Đã giải quyết',
  PENDING: 'Đang chờ', SENT: 'Đã gửi', ACKED: 'Node đã phản hồi',
  FAILED: 'Thất bại', TIMEOUT: 'Hết thời gian chờ',
  LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nghiêm trọng',
  SUCCESS: 'Thành công', ENABLED: 'Đang bật', DISABLED: 'Đã tắt',
};
const tones = {
  success: ['ONLINE', 'ACTIVE', 'GOOD', 'VALID', 'RESOLVED', 'ACKED', 'SUCCESS', 'ENABLED'],
  warning: ['OPEN', 'PENDING', 'TIMEOUT', 'ANOMALY', 'STALE', 'MODERATE', 'MEDIUM', 'HIGH', 'MAINTENANCE'],
  danger: ['OFFLINE', 'FAULT', 'LOCKED', 'UNHEALTHY', 'POOR', 'INVALID', 'FAILED', 'CRITICAL'],
  info: ['SENT', 'REGISTERED', 'PROVISIONED', 'ACKNOWLEDGED', 'ADMIN'],
};
export const statusLabel = status => labels[status] ?? status ?? '—';
export function StatusBadge({ status }) {
  const tone = Object.keys(tones).find(key => tones[key].includes(status)) || 'neutral';
  return <span className={'badge ' + tone}><span aria-hidden="true">●</span>{statusLabel(status)}</span>;
}
