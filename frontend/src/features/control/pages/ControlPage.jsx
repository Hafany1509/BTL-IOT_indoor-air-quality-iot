import { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { PageHeader } from '../../../components/common/PageHeader';
import { QueryState } from '../../../components/common/QueryState';
import { DeviceScope, DeviceSelect } from '../../../components/layout/DeviceSelect';
import { useDevice } from '../../../context/DeviceContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { connectionStatus } from '../../../utils/sensorStatus';
import { NodeStatusCard } from '../../dashboard/components/NodeStatusCard';
import { CommandHistory } from '../components/CommandHistory';
import { CommandStatus } from '../components/CommandStatus';
import { ControlConfirmDialog } from '../components/ControlConfirmDialog';
import { FanControl } from '../components/FanControl';
import { LedControl } from '../components/LedControl';
import { useDeviceCommands } from '../hooks/useDeviceCommands';

function Controls({ id }) {
  const { device, detail } = useDevice();
  const { admin } = usePermissions();
  const workflow = useDeviceCommands(id);
  const [choice, setChoice] = useState(null);
  const unavailable = detail.loading || detail.error || device.lifecycle !== 'ACTIVE' || connectionStatus(device) !== 'ONLINE';
  function request(action, value) {
    workflow.setError(null);
    setChoice({ action, value });
  }
  const cards = { disabled: Boolean(unavailable || workflow.busy || workflow.polling), onRequest: request };
  const latest = action => workflow.command?.command_type === action ? workflow.command :
    workflow.history.data?.find(command => command.command_type === action);
  return <div className="stack">
    <NodeStatusCard device={device} />
    {unavailable && <p className="notice">Chỉ có thể gửi lệnh khi node đang trực tuyến và ở trạng thái hoạt động.</p>}
    {!admin && <p className="notice">API kiểm tra quyền CONTROL hoặc MANAGE cho từng yêu cầu gửi lệnh.</p>}
    <div className="grid two"><FanControl {...cards} latest={latest('FAN_SET')} />
      <LedControl {...cards} latest={latest('LED_SET')} /></div>
    {workflow.command && <Card><CommandStatus {...workflow} /></Card>}
    <Card><div className="card-heading"><h2>Lịch sử điều khiển</h2>
      <Button variant="secondary" onClick={workflow.history.reload}>Làm mới</Button></div>
      <QueryState query={workflow.history}>{rows => <CommandHistory rows={rows} />}</QueryState>
    </Card>
    {choice && <ControlConfirmDialog choice={choice} workflow={workflow} unavailable={unavailable} onClose={() => setChoice(null)} />}
  </div>;
}
export function ControlPage() {
  return <>
    <PageHeader title="Điều khiển thiết bị" description="Gửi lệnh quạt, LED và theo dõi phản hồi của node."><DeviceSelect /></PageHeader>
    <DeviceScope>{id => <Controls key={id} id={id} />}</DeviceScope>
  </>;
}
