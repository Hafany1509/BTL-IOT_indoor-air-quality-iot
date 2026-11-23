import { useState } from 'react';
import { EmptyState } from '../../../components/common/EmptyState';
import { Pagination } from '../../../components/common/Pagination';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatDate } from '../../../utils/formatDate';
import { formatSensor } from '../../../utils/formatSensor';

export function TelemetryTable({ rows }) {
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const active = Math.min(page, Math.ceil(rows.length / pageSize));
  if (!rows.length) return <EmptyState />;
  return <>
    <div className="table-wrap"><table aria-label="Mẫu cảm biến đã tải">
      <thead><tr><th>Thời điểm đo</th><th>Nhiệt độ (°C)</th><th>Độ ẩm (%)</th><th>MQ-135 (ADC raw)</th><th>Chất lượng</th><th>Kiểm tra mẫu</th></tr></thead>
      <tbody>{rows.slice((active - 1) * pageSize, active * pageSize).map(row => <tr key={row.boot_id + ':' + row.seq}>
        <td>{formatDate(row.measured_at, { measured: true })}</td>
        <td>{formatSensor(row.temperature_c)}</td><td>{formatSensor(row.humidity_pct)}</td>
        <td>{formatSensor(row.mq135_adc_raw)}</td>
        <td><StatusBadge status={row.quality_level} /></td><td><StatusBadge status={row.validation_status} /></td>
      </tr>)}</tbody>
    </table></div>
    <Pagination page={active} onPage={setPage} hasNext={active * pageSize < rows.length} />
  </>;
}
