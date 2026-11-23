import { Navigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { LoadingSkeleton } from '../../../components/common/LoadingSkeleton';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { Button } from '../../../components/common/Button';
import { useAuth } from '../../../hooks/useAuth';
import { LoginForm } from '../components/LoginForm';
export function LoginPage() {
  const { user, loading, error, restore, clear } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <AuthLayout><div className="login-panel">
    <span className="brand-icon"><Leaf size={24} /></span>
    <h1>Đăng nhập</h1><p>Truy cập hệ thống giám sát Air Quality IoT.</p>
    {loading ? <LoadingSkeleton /> : error ? <>
      <ErrorMessage error={error} retry={restore} />
      <Button variant="secondary" onClick={clear}>Dùng tài khoản khác</Button>
    </> : <LoginForm />}
  </div></AuthLayout>;
}
