import { Cpu } from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatDate } from '../../../utils/formatDate';
import { connectionStatus } from '../../../utils/sensorStatus';
export function NodeStatusCard({ device, sample, roomName }) {
  return <Card className="node-summary">
    <div className="node-identity"><span className="sensor-icon"><Cpu size={22} /></span>
      <div><h2>{device.display_name}</h2><p className="muted">{device.device_id} · {roomName || device.room_id} · Firmware {device.firmware_version}</p></div>
    </div>
    <div className="inline"><StatusBadge status={connectionStatus(device, sample)} /><StatusBadge status={device.lifecycle} /></div>
    <div className="node-meta"><small>Liên hệ lần cuối</small><strong>{formatDate(device.last_seen_at)}</strong></div>
    {sample && <div className="node-meta"><small>Nhận mẫu mới nhất</small><strong>{formatDate(sample.received_at)}</strong></div>}
  </Card>;
}
