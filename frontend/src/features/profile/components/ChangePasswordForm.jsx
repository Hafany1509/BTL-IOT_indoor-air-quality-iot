import { Button } from '../../../components/common/Button';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { Input } from '../../../components/common/Input';
import { useMutation } from '../../../hooks/useMutation';
import { profileService } from '../profileService';
export function ChangePasswordForm() {
  const mutation = useMutation();
  return <form className="form-stack" onSubmit={event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const new_password = values.get('new_password');
    if (new_password !== values.get('confirmation')) return mutation.setError('Mật khẩu xác nhận chưa khớp.');
    mutation.run(() => profileService.changePassword({ current_password: values.get('current_password'), new_password }),
      () => form.reset(), 'Đã đổi mật khẩu.');
  }}>
    <Input name="current_password" label="Mật khẩu hiện tại" type="password" autoComplete="current-password" required />
    <Input name="new_password" label="Mật khẩu mới" type="password" autoComplete="new-password" minLength={6} maxLength={100} required />
    <Input name="confirmation" label="Xác nhận mật khẩu mới" type="password" autoComplete="new-password" required />
    <ErrorMessage error={mutation.error} />
    <div className="actions"><Button type="submit" disabled={mutation.busy}>{mutation.busy ? 'Đang lưu…' : 'Đổi mật khẩu'}</Button></div>
  </form>;
}
