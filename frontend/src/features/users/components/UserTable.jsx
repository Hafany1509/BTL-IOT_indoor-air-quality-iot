import { Button } from '../../../components/common/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatDate } from '../../../utils/formatDate';
export function UserTable({ rows, onRole, onStatus }) {
  if (!rows.length) return <EmptyState>Chưa có người dùng phù hợp.</EmptyState>;
  return <div className="table-wrap"><table aria-label="Danh sách người dùng">
    <thead><tr><th>Tên đăng nhập</th><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.username}</strong></td><td>{row.full_name}</td><td>{row.email}</td>
      <td><StatusBadge status={row.role} /></td><td><StatusBadge status={row.status} /></td><td>{formatDate(row.created_at)}</td>
      <td><div className="inline"><Button variant="secondary" onClick={() => onRole(row)}>Đổi vai trò</Button>
        <Button variant="secondary" onClick={() => onStatus(row)}>Đổi trạng thái</Button></div></td></tr>)}</tbody>
  </table></div>;
}
