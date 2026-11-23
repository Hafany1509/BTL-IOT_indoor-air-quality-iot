import { useState } from 'react';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { Select } from '../../../components/common/Select';
import { statusLabel } from '../../../components/common/StatusBadge';
import { useMutation } from '../../../hooks/useMutation';
import { userService } from '../userService';
import { statuses } from './UserFilter';
export function ChangeStatusDialog({ row, onClose, onSaved }) {
  const [status, setStatus] = useState(row.status);
  const mutation = useMutation();
  return <ConfirmDialog title={'Đổi trạng thái · ' + row.username} onClose={onClose} busy={mutation.busy} error={mutation.error} danger={status === 'LOCKED'}
    onConfirm={() => status === row.status ? onClose() : mutation.run(() => userService.status(row.id, status), onSaved, 'Đã cập nhật trạng thái.')}>
    <Select label="Trạng thái" value={status} onChange={event => setStatus(event.target.value)}>
      {statuses.map(item => <option key={item} value={item}>{statusLabel(item)}</option>)}</Select>
    {status === 'LOCKED' && <p className="notice">Tài khoản này sẽ mất quyền truy cập sau khi bị khóa.</p>}
  </ConfirmDialog>;
}
