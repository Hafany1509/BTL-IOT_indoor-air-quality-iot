import { Fan } from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { StatusBadge } from '../../../components/common/StatusBadge';

export function ActuatorCard({ icon: Icon, title, action, latest, disabled, onRequest, children }) {
  return <Card className="stack">
    <div className="split"><div className="inline"><span className="sensor-icon"><Icon size={21} /></span><h2>{title}</h2></div>
      {latest && <StatusBadge status={latest.status} />}
    </div>
    <p className="muted">Trạng thái vật lý chưa xác định.</p>
    {children}
    <div className="inline"><Button disabled={disabled} onClick={() => onRequest(action, 'ON')}>Bật</Button>
      <Button variant="secondary" disabled={disabled} onClick={() => onRequest(action, 'OFF')}>Tắt</Button></div>
  </Card>;
}
export function FanControl(props) {
  return <ActuatorCard icon={Fan} title="Quạt thông gió" action="FAN_SET" {...props} />;
}
