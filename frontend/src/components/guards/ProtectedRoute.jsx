import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ErrorMessage } from '../common/ErrorMessage';
import { Button } from '../common/Button';
export function ProtectedRoute() {
  const { user, loading, error, restore, clear } = useAuth();
  if (loading) return <main className="standalone"><LoadingSkeleton /></main>;
  if (error) return <main className="standalone"><ErrorMessage error={error} retry={restore} />
    <Button variant="secondary" onClick={clear}>Về đăng nhập</Button></main>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
