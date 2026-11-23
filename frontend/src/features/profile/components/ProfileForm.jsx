import { Button } from '../../../components/common/Button';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { Input } from '../../../components/common/Input';
import { useAuth } from '../../../hooks/useAuth';
import { useMutation } from '../../../hooks/useMutation';
import { profileService } from '../profileService';
export function ProfileForm() {
  const { user, setUser } = useAuth();
  const mutation = useMutation();
  return <form className="form-stack" onSubmit={event => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const full_name = values.get('full_name').trim();
    if (!full_name) return mutation.setError('Vui lòng nhập họ tên.');
    mutation.run(() => profileService.update({ full_name, email: values.get('email').trim() }), setUser, 'Đã cập nhật thông tin cá nhân.');
  }}>
    <div className="grid two"><Input label="Tên đăng nhập" value={user.username} readOnly />
      <Input label="Vai trò" value={user.role} readOnly /></div>
    <Input name="full_name" label="Họ tên" defaultValue={user.full_name} maxLength={100} required />
    <Input name="email" label="Email" type="email" defaultValue={user.email} required />
    <ErrorMessage error={mutation.error} />
    <div className="actions"><Button type="submit" disabled={mutation.busy}>{mutation.busy ? 'Đang lưu…' : 'Cập nhật thông tin'}</Button></div>
  </form>;
}
