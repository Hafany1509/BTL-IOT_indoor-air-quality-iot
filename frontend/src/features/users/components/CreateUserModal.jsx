import { Button } from '../../../components/common/Button';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { Select } from '../../../components/common/Select';
import { useMutation } from '../../../hooks/useMutation';
import { userService } from '../userService';
import { roles } from './UserFilter';
export function CreateUserModal({ onClose, onSaved }) {
  const mutation = useMutation();
  function submit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    body.username = body.username.trim();
    body.full_name = body.full_name.trim();
    if (body.username.length < 3 || !body.full_name) return mutation.setError('Tên đăng nhập cần ít nhất 3 ký tự và họ tên không được để trống.');
    mutation.run(() => userService.create(body), onSaved, 'Đã thêm người dùng.');
  }
  return <Modal title="Thêm người dùng" onClose={onClose} busy={mutation.busy}><form className="form-stack" onSubmit={submit}>
    <Input name="username" label="Tên đăng nhập" minLength={3} maxLength={50} autoComplete="off" required />
    <Input name="full_name" label="Họ tên" maxLength={100} required />
    <Input name="email" label="Email" type="email" required />
    <Input name="password" label="Mật khẩu" type="password" autoComplete="new-password" minLength={6} maxLength={100} required />
    <Select name="role" label="Vai trò" defaultValue="VIEWER">{roles.map(role => <option key={role}>{role}</option>)}</Select>
    <ErrorMessage error={mutation.error} />
    <div className="actions"><Button variant="secondary" onClick={onClose} disabled={mutation.busy}>Hủy</Button>
      <Button type="submit" disabled={mutation.busy}>{mutation.busy ? 'Đang lưu…' : 'Tạo người dùng'}</Button></div>
  </form></Modal>;
}
