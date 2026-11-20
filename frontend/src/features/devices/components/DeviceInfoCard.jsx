import { Card } from '../../../components/common/Card';
import { formatDate } from '../../../utils/formatDate';
export function DeviceInfoCard({ device }) {
  return <Card className="stack"><h2>Thông tin node</h2><dl className="detail-list">
    <dt>ID thiết bị</dt><dd>{device.device_id}</dd><dt>Tên hiển thị</dt><dd>{device.display_name}</dd>
    <dt>ID phòng</dt><dd>{device.room_id}</dd><dt>Firmware</dt><dd>{device.firmware_version}</dd>
    <dt>MQTT client ID</dt><dd>{device.mqtt_client_id || '—'}</dd>
    <dt>Ngày tạo</dt><dd>{formatDate(device.created_at)}</dd><dt>Cập nhật</dt><dd>{formatDate(device.updated_at)}</dd>
  </dl></Card>;
}
