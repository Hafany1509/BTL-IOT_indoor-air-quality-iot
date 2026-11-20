import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { statusLabel } from '../../../components/common/StatusBadge';
export const roles = ['ADMIN', 'OPERATOR', 'VIEWER'];
export const statuses = ['ACTIVE', 'INACTIVE', 'LOCKED'];
export function UserFilter({ filters, onChange }) {
  const change = key => event => onChange({ ...filters, [key]: event.target.value });
  return <div className="filters">
    <Input type="search" label="Tìm người dùng" placeholder="Tên đăng nhập, họ tên hoặc email" value={filters.search} onChange={change('search')} />
    <Select label="Vai trò" value={filters.role} onChange={change('role')}><option value="">Tất cả</option>
      {roles.map(value => <option key={value}>{value}</option>)}</Select>
    <Select label="Trạng thái" value={filters.status} onChange={change('status')}><option value="">Tất cả</option>
      {statuses.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</Select>
  </div>;
}
