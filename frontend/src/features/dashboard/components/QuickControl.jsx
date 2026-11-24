import { useState } from 'react';
import { Fan, Lightbulb } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { useDevice } from '../../../context/DeviceContext';
import { connectionStatus } from '../../../utils/sensorStatus';
import { useDeviceCommands } from '../../control/hooks/useDeviceCommands';
import { CommandStatus } from '../../control/components/CommandStatus';
import { ControlConfirmDialog } from '../../control/components/ControlConfirmDialog';
const actuators = [['FAN_SET', 'Quạt thông gió', Fan], ['LED_SET', 'LED cảnh báo', Lightbulb]];
export function QuickControl({ id }) {
  const { device, detail } = useDevice();
  const workflow = useDeviceCommands(id);
  const [choice, setChoice] = useState(null);
  const unavailable = detail.loading || detail.error || device.lifecycle !== 'ACTIVE' || connectionStatus(device) !== 'ONLINE';
  const disabled = Boolean(unavailable || workflow.polling || workflow.busy);
  return <Card className="stack">
    <h2>Điều khiển nhanh</h2>
    {unavailable && <small>Node cần trực tuyến và ở trạng thái hoạt động.</small>}
    {actuators.map(([action, label, Icon]) => <div className="split" key={action}><span className="inline"><Icon size={18} /> {label}</span>
      <div className="inline">{[['ON', 'Bật'], ['OFF', 'Tắt']].map(([value, text]) => <Button key={value}
        variant={value === 'ON' ? 'primary' : 'secondary'} disabled={disabled} aria-label={text + ' ' + label} onClick={() => {
          workflow.setError(null);
          setChoice({ action, value });
        }}>{text}</Button>)}</div></div>)}
    <CommandStatus {...workflow} />
    {choice && <ControlConfirmDialog choice={choice} workflow={workflow} unavailable={unavailable} onClose={() => setChoice(null)} />}
  </Card>;
}
