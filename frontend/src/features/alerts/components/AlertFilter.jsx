import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { statusLabel } from '../../../components/common/StatusBadge';
export function AlertFilter({ devices, onApply }) {
  return <form className="filters" onSubmit={event => {
    event.preventDefault();
    onApply(Object.fromEntries(new FormData(event.currentTarget)));
  }}>
    <Select label="Trạng thái" name="status"><option value="">Tất cả</option>{['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].map(value =>
      <option key={value} value={value}>{statusLabel(value)}</option>)}</Select>
    {devices.length > 1 && <Select label="Node" name="device">
      <option value="">Tất cả node</option>
      {devices.map(device => <option key={device.device_id} value={device.device_id}>{device.display_name}</option>)}
    </Select>}
    <Input label="Từ ngày" type="date" name="from" /><Input label="Đến ngày" type="date" name="to" />
    <Button type="submit">Áp dụng</Button>
  </form>;
}
