import { useState } from 'react';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { Select } from '../../../components/common/Select';
import { useMutation } from '../../../hooks/useMutation';
import { userService } from '../userService';
import { roles } from './UserFilter';
export function ChangeRoleModal({ row, onClose, onSaved }) {
  const [role, setRole] = useState(row.role);
  const mutation = useMutation();
  return <ConfirmDialog title={'Đổi vai trò · ' + row.username} onClose={onClose} busy={mutation.busy} error={mutation.error}
    onConfirm={() => role === row.role ? onClose() : mutation.run(() => userService.role(row.id, role), onSaved, 'Đã cập nhật vai trò.')}>
    <Select label="Vai trò" value={role} onChange={event => setRole(event.target.value)}>{roles.map(item => <option key={item}>{item}</option>)}</Select>
  </ConfirmDialog>;
}
