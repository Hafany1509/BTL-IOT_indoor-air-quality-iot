import { Card } from '../../../components/common/Card';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatDate } from '../../../utils/formatDate';
import { formatSensor } from '../../../utils/formatSensor';
export function SensorCard({ sensor, sample, stale }) {
  const Icon = sensor.icon;
  return <Card className="sensor-card">
    <div className="split"><span className="sensor-icon" style={{ color: sensor.color, backgroundColor: sensor.color + '14' }}><Icon size={22} /></span>
      {sample && <div className="inline"><StatusBadge status={sample.validation_status} />{stale && <StatusBadge status="STALE" />}</div>}</div>
    <h2>{sensor.label}</h2>
    <div className="value">{formatSensor(sample?.[sensor.key])} <span>{sensor.unit}</span></div>
    <footer><small>Thời điểm đo · {formatDate(sample?.measured_at, { measured: true })}</small></footer>
  </Card>;
}
