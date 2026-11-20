import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useDevice } from '../../context/DeviceContext';
import { connectionStatus } from '../../utils/sensorStatus';
import { formatDate } from '../../utils/formatDate';
import { StatusBadge } from '../common/StatusBadge';
import { pageTitles } from './Sidebar';
import { NotificationMenu } from './NotificationMenu';
import { UserMenu } from './UserMenu';
export function Header({ openMenu, menuOpen }) {
  const { pathname } = useLocation();
  const { device, detail } = useDevice();
  return <header className="topbar">
    <button className="icon-button drawer-toggle" type="button" onClick={openMenu} aria-label="Mở menu" aria-expanded={menuOpen} aria-controls={menuOpen ? "mobile-sidebar" : undefined}><Menu size={22} /></button>
    <span className="topbar-title">{pageTitles[pathname] || 'Air Quality IoT'}</span>
    <div className="topbar-actions">{device && !detail.error && <div className="header-node" title={'Liên hệ lần cuối ' + formatDate(device.last_seen_at)}><StatusBadge status={connectionStatus(device)} /></div>}
      <NotificationMenu /><UserMenu /></div>
  </header>;
}
