import { Button } from '../../../components/common/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatDate } from '../../../utils/formatDate';
import { formatSensor, sensors } from '../../../utils/formatSensor';
export function AlertTable({ rows, rules, onOpen }) {
  if (!rows.length) return <EmptyState>Chưa có cảnh báo phù hợp.</EmptyState>;
  return <div className="table-wrap"><table aria-label="Danh sách cảnh báo">
    <thead><tr><th>Kích hoạt</th><th>Node</th><th>Quy tắc</th><th>Giá trị</th><th>Mức độ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
    <tbody>{rows.map(row => {
      const rule = rules.find(item => item.id === row.rule_id);
      return <tr key={row.id}><td>{formatDate(row.triggered_at)}</td><td>{row.device_id}</td>
        <td className="wrap-cell">{rule?.name || 'Quy tắc #' + row.rule_id}</td>
        <td>{formatSensor(row.metric_value)} {sensors[rule?.metric]?.unit}</td>
        <td>{rule ? <StatusBadge status={rule.severity} /> : '—'}</td><td><StatusBadge status={row.status} /></td>
        <td><Button variant="secondary" onClick={() => onOpen(row)}>Xem chi tiết</Button></td></tr>;
    })}</tbody>
  </table></div>;
}
