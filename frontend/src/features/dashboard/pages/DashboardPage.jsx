import { Card } from '../../../components/common/Card';
import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { PageHeader } from '../../../components/common/PageHeader';
import { QueryState } from '../../../components/common/QueryState';
import { DeviceScope, DeviceSelect } from '../../../components/layout/DeviceSelect';
import { useDevice } from '../../../context/DeviceContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { usePolling } from '../../../hooks/usePolling';
import { useLatestTelemetry } from '../../../hooks/useTelemetry';
import { deviceService } from '../../devices/deviceService';
import { AirQualityStatus } from '../components/AirQualityStatus';
import { DashboardChart } from '../components/DashboardChart';
import { NodeStatusCard } from '../components/NodeStatusCard';
import { QuickControl } from '../components/QuickControl';
import { RecentAlerts } from '../components/RecentAlerts';
import { SensorOverview } from '../components/SensorOverview';
import { RoleWorkspace } from '../components/RoleWorkspace';

function Overview({ id }) {
  const { device, detail } = useDevice();
  const { quickControl, operator, viewer } = usePermissions();
  const latest = useLatestTelemetry(id);
  const rooms = usePolling(deviceService.rooms);
  return <div className="stack">
    <ErrorMessage error={detail.error} retry={detail.reload} />
    <NodeStatusCard device={device} sample={latest.data} roomName={rooms.data?.find(item => item.room_id === device.room_id)?.name} />
    <QueryState query={latest}>{sample => <>
      {sample === null && <Card><EmptyState retry={latest.reload}>Chưa có dữ liệu từ cảm biến.</EmptyState></Card>}
      <SensorOverview sample={sample} />
      <AirQualityStatus sample={sample} />
    </>}</QueryState>
    {(operator || viewer) && <RoleWorkspace operator={operator} />}
    <div className="grid dashboard">
      <DashboardChart id={id} />
      <div className="stack">{quickControl && <QuickControl id={id} />}<RecentAlerts id={id} /></div>
    </div>
  </div>;
}
export function DashboardPage() {
  const { admin, operator } = usePermissions();
  const description = admin ? 'Theo dõi số đo và hoạt động của node ESP32.'
    : operator ? 'Theo dõi và vận hành các node được cấp quyền.'
      : 'Theo dõi số đo và cảnh báo của các node được cấp quyền.';
  return <>
    <PageHeader title="Tổng quan chất lượng không khí" description={description}><DeviceSelect /></PageHeader>
    <DeviceScope>{id => <Overview key={id} id={id} />}</DeviceScope>
  </>;
}
