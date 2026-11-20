import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDate, measurementClock } from '../../../utils/formatDate';
import { formatSensor, sensors } from '../../../utils/formatSensor';
import { EmptyState } from '../../../components/common/EmptyState';

const axisTime = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
});

export function TelemetryChart({ rows, metric }) {
  const sensor = sensors[metric];
  if (!rows.length) return <EmptyState>Chưa có mẫu trong khoảng này.</EmptyState>;
  const points = rows.map(row => ({
    // Keep the source clock for measurement timestamps whose offset was discarded.
    time: measurementClock(row.measured_at),
    timeLabel: formatDate(row.measured_at, { measured: true }),
    value: row.validation_status === 'INVALID' ? null : row[sensor.key],
  })).filter(point => Number.isFinite(point.time)).sort((a, b) => a.time - b.time);
  if (points.every(point => point.value == null)) return <EmptyState>Chưa có giá trị hợp lệ để vẽ biểu đồ.</EmptyState>;

  return <><small>Đơn vị · {sensor.unit}</small><div className="chart-area" role="region" aria-label={'Biểu đồ ' + sensor.label}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 8, right: 18, bottom: 4, left: 5 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis type="number" dataKey="time" domain={['dataMin', 'dataMax']} tickFormatter={time => axisTime.format(time)} tick={{ fontSize: 10 }} minTickGap={36} />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} tickFormatter={formatSensor} width={48} />
        <Tooltip labelFormatter={(_, entries) => entries[0]?.payload?.timeLabel}
          formatter={value => [formatSensor(value) + ' ' + sensor.unit, sensor.label]} />
        <Line type="linear" dataKey="value" stroke={sensor.color} strokeWidth={2.5} dot={points.length < 20} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div></>;
}
