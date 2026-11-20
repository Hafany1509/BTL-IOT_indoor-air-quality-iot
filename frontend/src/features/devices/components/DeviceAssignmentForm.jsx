import { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { Input } from '../../../components/common/Input';
import { QueryState } from '../../../components/common/QueryState';
import { Select } from '../../../components/common/Select';
import { useMutation } from '../../../hooks/useMutation';
import { usePolling } from '../../../hooks/usePolling';
import { formatDate, localInputToIso } from '../../../utils/formatDate';
import { userService } from '../../users/userService';
import { deviceService } from '../deviceService';

export function DeviceAssignmentForm({ id }) {
  const users = usePolling(userService.list);
  const mutation = useMutation();
  const [assignment, setAssignment] = useState(null);
  function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const expires = localInputToIso(values.get('expires'));
    if (expires && Date.parse(expires) <= Date.now()) return mutation.setError('Thời điểm hết hạn phải ở tương lai.');
    mutation.run(() => deviceService.assign(id, {
      user_id: Number(values.get('user_id')), permission: values.get('permission'), expires_at: expires || null,
    }), setAssignment, 'Đã lưu quyền truy cập.');
  }
  return <Card className="stack"><h2>Gán quyền node</h2>
    <QueryState query={users}>{rows => {
      const eligible = rows.filter(user => user.role !== 'ADMIN');
      return <form className="filters" onSubmit={submit}>
        <Select label="Người dùng" name="user_id" required defaultValue="">
          <option value="" disabled>Chọn người dùng</option>{eligible.map(user => <option key={user.id} value={user.id}>{user.username} · {user.role}</option>)}
        </Select>
        <Select label="Quyền" name="permission"><option>VIEW</option><option>CONTROL</option><option>MANAGE</option></Select>
        <Input label="Hết hạn (giờ Việt Nam)" type="datetime-local" name="expires" />
        <Button type="submit" disabled={mutation.busy || !eligible.length}>{mutation.busy ? 'Đang gán…' : 'Gán quyền'}</Button>
      </form>;
    }}</QueryState>
    <ErrorMessage error={mutation.error} />
    {assignment && <p role="status">Đã lưu quyền <strong>{assignment.permission}</strong> cho người dùng #{assignment.user_id} trên {assignment.device_id}.
      {assignment.expires_at && ' Hết hạn ' + formatDate(assignment.expires_at) + '.'}</p>}
  </Card>;
}
