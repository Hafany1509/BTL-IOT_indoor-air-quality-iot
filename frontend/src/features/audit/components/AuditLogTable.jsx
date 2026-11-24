import { Button } from '../../../components/common/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatDate } from '../../../utils/formatDate';
export function AuditLogTable({ rows, onOpen }) {
  if (!rows.length) return <EmptyState>Chưa có bản ghi phù hợp.</EmptyState>;
  return <div className="table-wrap"><table aria-label="Nhật ký hệ thống">
    <thead><tr><th>Thời gian</th><th>Tác nhân</th><th>Hành động</th><th>Loại đối tượng</th><th>ID đối tượng</th><th>Kết quả</th><th>Địa chỉ IP</th><th>Request ID</th><th>Chi tiết</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.id}><td>{formatDate(row.created_at)}</td>
      <td>{row.actor_type} · {row.actor_user_id ?? row.actor_device_id ?? '—'}</td>
      <td>{row.action}</td><td>{row.target_type}</td><td>{row.target_id}</td><td><StatusBadge status={row.result} /></td>
      <td>{row.ip_address || '—'}</td><td>{row.request_id || '—'}</td>
      <td><Button variant="secondary" onClick={() => onOpen(row)}>Metadata</Button></td>
    </tr>)}</tbody>
  </table></div>;
}
