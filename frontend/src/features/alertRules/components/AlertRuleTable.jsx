import { Button } from '../../../components/common/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatSensor, sensors } from '../../../utils/formatSensor';
import { operators } from './AlertRuleForm';
export function AlertRuleTable({ rows, onEdit, onRemove }) {
  if (!rows.length) return <EmptyState>Chưa có quy tắc cảnh báo.</EmptyState>;
  return <div className="table-wrap"><table aria-label="Quy tắc cảnh báo">
    <thead><tr><th>Tên</th><th>Điều kiện</th><th>Mức độ</th><th>Giãn cách</th><th>Trạng thái</th><th>Phạm vi</th><th>Thao tác</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.id}>
      <td className="wrap-cell">{row.name}</td><td>{sensors[row.metric]?.label} {operators[row.operator]} {formatSensor(row.threshold)} {sensors[row.metric]?.unit}</td>
      <td><StatusBadge status={row.severity} /></td><td>{row.cooldown_seconds} giây</td>
      <td><StatusBadge status={row.is_enabled ? 'ENABLED' : 'DISABLED'} /></td>
      <td>{[row.device_id, row.room_id].filter(Boolean).join(' / ') || 'Toàn bộ'}</td>
      <td><div className="inline"><Button variant="secondary" onClick={() => onEdit(row)}>Sửa</Button>
        <Button variant="secondary" onClick={() => onRemove(row)}>Xóa</Button></div></td>
    </tr>)}</tbody>
  </table></div>;
}
