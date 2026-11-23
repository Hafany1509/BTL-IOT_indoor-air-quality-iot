import { Activity, Bell, ChartNoAxesCombined, ClipboardList, Cpu, Gauge, Leaf, Settings2, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

const navigation = [
  { to: '/dashboard', title: 'Tổng quan', icon: Gauge },
  { to: '/telemetry', title: 'Lịch sử dữ liệu', icon: ChartNoAxesCombined },
  { to: '/alerts', title: 'Cảnh báo', icon: Bell },
  { to: '/control', title: 'Điều khiển', icon: Settings2, access: 'requestControl' },
  { to: '/alert-rules', title: 'Quy tắc cảnh báo', icon: ShieldCheck, access: 'admin' },
  { to: '/users', title: 'Người dùng', icon: Users, access: 'admin' },
  { to: '/device', title: 'Node ESP32', icon: Cpu, access: 'requestControl' },
  { to: '/audit-logs', title: 'Nhật ký hệ thống', icon: ClipboardList, access: 'admin' },
  { to: '/profile', title: 'Hồ sơ cá nhân', icon: UserRound },
];
export const pageTitles = Object.fromEntries(navigation.map(({ to, title }) => [to, title]));

export function Sidebar({ open, close }) {
  const permissions = usePermissions();
  return <aside id={open ? "mobile-sidebar" : undefined} className={'sidebar' + (open ? ' open' : '')}>
    <div className="sidebar-top"><NavLink to="/dashboard" className="brand" onClick={close}>
      <span className="brand-icon"><Leaf size={21} /></span><span>Air Quality IoT<small>Giám sát trong nhà</small></span>
    </NavLink><button className="icon-button drawer-close" onClick={close} aria-label="Đóng menu"><X size={21} /></button></div>
    <nav aria-label="Điều hướng chính">
      {navigation.filter(item => !item.access || permissions[item.access]).map(({ to, title, icon: Icon }) =>
        <NavLink key={to} to={to} onClick={close}><Icon size={19} />{title}</NavLink>)}
    </nav>
    <div className="sidebar-foot"><Activity size={17} /> Hệ thống IoT trong nhà</div>
  </aside>;
}
