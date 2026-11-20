import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { PageHeader } from '../../../components/common/PageHeader';
import { QueryState } from '../../../components/common/QueryState';
import { useAuth } from '../../../hooks/useAuth';
import { usePolling } from '../../../hooks/usePolling';
import { userService } from '../userService';
import { ChangeRoleModal } from '../components/ChangeRoleModal';
import { ChangeStatusDialog } from '../components/ChangeStatusDialog';
import { CreateUserModal } from '../components/CreateUserModal';
import { UserFilter } from '../components/UserFilter';
import { UserTable } from '../components/UserTable';
export function UsersPage() {
  const { user, setUser, clear } = useAuth();
  const [dialog, setDialog] = useState(null);
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const query = usePolling(userService.list);
  const search = filters.search.trim().toLocaleLowerCase('vi-VN');
  const close = () => setDialog(null);
  function saved(updated) {
    close();
    query.reload();
    if (updated?.id === user.id) {
      if (updated.status === 'ACTIVE') setUser(updated);
      else clear();
    }
  }
  return <>
    <PageHeader title="Quản lý người dùng" description="Tạo tài khoản, thay đổi vai trò và trạng thái.">
      <Button onClick={() => setDialog({ type: 'create' })}><Plus size={17} /> Thêm người dùng</Button>
    </PageHeader>
    <Card className="stack"><UserFilter filters={filters} onChange={setFilters} />
      <QueryState query={query}>{rows => <UserTable rows={rows.filter(row =>
        (!filters.role || row.role === filters.role) && (!filters.status || row.status === filters.status) &&
        [row.username, row.full_name, row.email].some(value => value.toLocaleLowerCase('vi-VN').includes(search))
      )} onRole={row => setDialog({ type: 'role', row })} onStatus={row => setDialog({ type: 'status', row })} />}</QueryState>
    </Card>
    {dialog?.type === 'create' && <CreateUserModal onClose={close} onSaved={saved} />}
    {dialog?.type === 'role' && <ChangeRoleModal row={dialog.row} onClose={close} onSaved={saved} />}
    {dialog?.type === 'status' && <ChangeStatusDialog row={dialog.row} onClose={close} onSaved={saved} />}
  </>;
}
