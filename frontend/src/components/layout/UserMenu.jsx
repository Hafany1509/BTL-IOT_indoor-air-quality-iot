import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
export function UserMenu() {
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  async function logOut() {
    setBusy(true);
    await logout();
  }
  return <details className="user-menu">
    <summary><span className="avatar"><UserRound size={17} /></span><span className="user-name">{user.full_name}<small>{user.role}</small></span><ChevronDown size={15} /></summary>
    <div className="menu-popover"><Link to="/profile" onClick={event => event.currentTarget.closest('details').open = false}><UserRound size={17} /> Hồ sơ cá nhân</Link>
      <button type="button" disabled={busy} onClick={logOut}><LogOut size={17} /> {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}</button></div>
  </details>;
}
