import { Card } from '../../../components/common/Card';
import { PageHeader } from '../../../components/common/PageHeader';
import { QueryState } from '../../../components/common/QueryState';
import { DeviceScope, DeviceSelect } from '../../../components/layout/DeviceSelect';
import { useDevice } from '../../../context/DeviceContext';
import { usePolling } from '../../../hooks/usePolling';
import { usePermissions } from '../../../hooks/usePermissions';
import { NodeStatusCard } from '../../dashboard/components/NodeStatusCard';
import { DeviceAssignmentForm } from '../components/DeviceAssignmentForm';
import { DeviceHealthCard } from '../components/DeviceHealthCard';
import { DeviceInfoCard } from '../components/DeviceInfoCard';
import { DeviceLifecycleForm } from '../components/DeviceLifecycleForm';
import { DeviceRegistrationForm } from '../components/DeviceRegistrationForm';
import { RoomForm } from '../components/RoomForm';
import { deviceService } from '../deviceService';

function DeviceAdminTools() {
  const { devicesQuery, setSelected } = useDevice();
  const rooms = usePolling(deviceService.rooms);
  return <Card><details className="admin-tools"><summary>Quản trị nâng cao</summary>
    <div className="grid two">
      <QueryState query={rooms}>{rows => <DeviceRegistrationForm rooms={rows} onSaved={device => {
        setSelected(device.device_id); devicesQuery.reload();
      }} />}</QueryState>
      <RoomForm onSaved={rooms.reload} />
    </div>
  </details></Card>;
}
function DeviceDetails({ id, admin }) {
  const { detail, devicesQuery } = useDevice();
  return <QueryState query={detail}>{device => <>
    <NodeStatusCard device={device} />
    <div className="grid two"><DeviceInfoCard device={device} /><DeviceHealthCard id={id} /></div>
    <DeviceLifecycleForm key={device.lifecycle} device={device} admin={admin} onSaved={() => { detail.reload(); devicesQuery.reload(); }} />
    {admin && <DeviceAssignmentForm id={id} />}
  </>}</QueryState>;
}
export function DevicePage() {
  const { admin } = usePermissions();
  return <>
    <PageHeader title="Node ESP32" description={admin ? "Xem thông tin node, vòng đời và quyền truy cập." : "Xem node được cấp quyền và yêu cầu cập nhật vòng đời."}><DeviceSelect /></PageHeader>
    <div className="stack">
      <DeviceScope>{id => <DeviceDetails key={id} id={id} admin={admin} />}</DeviceScope>
      {admin && <DeviceAdminTools />}
    </div>
  </>;
}
