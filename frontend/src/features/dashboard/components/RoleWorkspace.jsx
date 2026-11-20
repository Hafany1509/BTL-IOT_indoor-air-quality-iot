import { Bell, ChartNoAxesCombined, Cpu, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/common/Card';

const monitoringLinks = [
  { to: '/telemetry', label: 'Xem lịch sử', icon: ChartNoAxesCombined },
  { to: '/alerts', label: 'Xem cảnh báo', icon: Bell },
];
const operatorLinks = [
  { to: '/alerts', label: 'Xử lý cảnh báo', icon: Bell },
  { to: '/control', label: 'Điều khiển quạt / LED', icon: Settings2 },
  { to: '/device', label: 'Thông tin và vòng đời node', icon: Cpu },
];

export function RoleWorkspace({ operator }) {
  const links = operator ? operatorLinks : monitoringLinks;
  return <Card className="stack">
    <div>
      <h2>{operator ? 'Vận hành node' : 'Giám sát chỉ xem'}</h2>
      <p className="muted">{operator
        ? 'Điều khiển và xử lý cảnh báo cần quyền CONTROL hoặc MANAGE. Đổi vòng đời cần quyền MANAGE.'
        : 'Xem biểu đồ, xuất lịch sử và theo dõi cảnh báo của node được cấp quyền.'}</p>
    </div>
    <nav aria-label={operator ? 'Tác vụ vận hành' : 'Tác vụ giám sát'} className="inline">
      {links.map(({ to, label, icon: Icon }) =>
        <Link key={to} className="button secondary" to={to}><Icon size={17} />{label}</Link>
      )}
    </nav>
  </Card>;
}
