import { Card } from '../../../components/common/Card';
import { EmptyState } from '../../../components/common/EmptyState';
import { QueryState } from '../../../components/common/QueryState';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { useLatestTelemetry } from '../../../hooks/useTelemetry';
import { formatDate } from '../../../utils/formatDate';
import { formatSensor, sensors } from '../../../utils/formatSensor';
import { isStale } from '../../../utils/sensorStatus';

export function DeviceHealthCard({ id }) {
  const latest = useLatestTelemetry(id);
  return <Card className="stack"><h2>Môi trường và dữ liệu mới nhất</h2>
    <QueryState query={latest}>{sample => sample ? <dl className="detail-list">
      {Object.values(sensors).map(sensor => <div key={sensor.key} style={{ display: 'contents' }}>
        <dt>{sensor.label}</dt><dd>{formatSensor(sample[sensor.key])} {sensor.unit}</dd></div>)}
      <dt>Thời điểm đo</dt><dd>{formatDate(sample.measured_at, { measured: true })}</dd>
      <dt>Thời điểm nhận</dt><dd>{formatDate(sample.received_at)}</dd>
      <dt>Chất lượng</dt><dd><StatusBadge status={sample.quality_level} /></dd>
      <dt>Tình trạng mẫu</dt><dd className="inline"><StatusBadge status={sample.validation_status} />
        {isStale(sample) && <StatusBadge status="STALE" />}</dd>
    </dl> : <EmptyState retry={latest.reload}>Chưa nhận được dữ liệu cảm biến.</EmptyState>}</QueryState>
  </Card>;
}
