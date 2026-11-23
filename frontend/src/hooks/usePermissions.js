import { useAuth } from './useAuth';
import { canAdminister, canQuickControl, canRequestControl } from '../utils/permissions';
export function usePermissions() {
  const { user } = useAuth();
  return {
    admin: canAdminister(user),
    operator: user?.role === 'OPERATOR',
    viewer: user?.role === 'VIEWER',
    quickControl: canQuickControl(user),
    requestControl: canRequestControl(user),
  };
}
