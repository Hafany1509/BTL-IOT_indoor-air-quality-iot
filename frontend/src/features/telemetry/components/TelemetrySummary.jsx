import { Card } from '../../../components/common/Card';
import { formatSensor, sensors } from '../../../utils/formatSensor';
export function TelemetrySummary({ rows, metric }) {
  const sensor = sensors[metric];
  const values = rows.filter(row => row.validation_status !== 'INVALID').map(row => row[sensor.key]).filter(Number.isFinite);
  const summary = values.length ? [
    Math.min(...values), Math.max(...values), values.reduce((sum, value) => sum + value, 0) / values.length,
  ] : [];
  return <section className="stack" aria-label="Thống kê mẫu">
    <small>Thống kê từ {values.length} mẫu có thể sử dụng trên {rows.length} mẫu đã tải.</small>
    <div className="grid three">{['Thấp nhất', 'Cao nhất', 'Trung bình'].map((label, index) =>
      <Card className="sensor-card" key={label}><small>{label}</small><div className="value">{formatSensor(summary[index])} <span>{sensor.unit}</span></div></Card>
    )}</div>
  </section>;
}
