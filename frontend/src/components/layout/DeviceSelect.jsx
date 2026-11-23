import { useDevice } from '../../context/DeviceContext';
import { Select } from '../common/Select';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ErrorMessage } from '../common/ErrorMessage';
import { EmptyState } from '../common/EmptyState';

export function DeviceSelect() {
  const { id, devices, setSelected } = useDevice();
  if (devices.length < 2) return null;
  return <Select label="Node theo dõi" value={id} onChange={event => setSelected(event.target.value)}>
    {devices.map(device => <option key={device.device_id} value={device.device_id}>{device.display_name}</option>)}
  </Select>;
}
export function DeviceScope({ children }) {
  const { id, devicesQuery, detail } = useDevice();
  if (devicesQuery.error && !id) return <ErrorMessage error={devicesQuery.error} retry={devicesQuery.reload} />;
  if (!id && devicesQuery.loading) return <LoadingSkeleton />;
  if (!id) return <EmptyState retry={devicesQuery.reload}>Chưa có node được cấp quyền.</EmptyState>;
  if ([403, 404].includes(detail.error?.response?.status)) return <ErrorMessage error={detail.error} retry={devicesQuery.reload} />;
  return <>{children(id)}</>;
}
