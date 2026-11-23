import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ForbiddenPage } from '../../routes/ForbiddenPage';
export function RoleGuard({ roles }) {
  const { user } = useAuth();
  return roles.includes(user?.role) ? <Outlet /> : <ForbiddenPage />;
}
