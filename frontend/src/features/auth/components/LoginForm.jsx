import { useState } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
export function LoginForm() {
  const { login } = useAuth();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const username = form.get('username').trim();
    if (!username) return setError('Vui lòng nhập tên đăng nhập.');
    setBusy(true);
    setError(null);
    try { await login({ username, password: form.get('password') }); }
    catch (failure) {
      const status = failure.response?.status;
      setError([401, 403].includes(status) ? 'Tên đăng nhập hoặc mật khẩu không đúng.' : failure);
    } finally { setBusy(false); }
  }
  return <form className="form-stack" onSubmit={submit}>
    <Input label="Tên đăng nhập" name="username" autoComplete="username" maxLength={50} placeholder="Nhập tên đăng nhập" required />
    <Input label="Mật khẩu" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" maxLength={100} placeholder="Nhập mật khẩu" required>
      <button type="button" className="icon-button password-toggle" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShow(!show)}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </Input>
    <ErrorMessage error={error} />
    <Button type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'} <ArrowRight size={18} /></Button>
  </form>;
}
