import { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { statusLabel } from '../../../components/common/StatusBadge';
import { sensors } from '../../../utils/formatSensor';

export const operators = { GT: '>', GTE: '≥', LT: '<', LTE: '≤', EQ: '=' };
export function AlertRuleForm({ rule, rooms, devices, mutation, onSubmit, onClose }) {
  const [metric, setMetric] = useState(rule?.metric || 'MQ135_RAW');
  const [scope, setScope] = useState('global');
  function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const body = {
      name: values.get('name').trim(),
      threshold: Number(values.get('threshold')),
      severity: values.get('severity'),
      cooldown_seconds: Number(values.get('cooldown')),
      is_enabled: values.has('enabled'),
    };
    if (!body.name || !Number.isFinite(body.threshold)) return mutation.setError('Vui lòng nhập tên và ngưỡng hợp lệ.');
    if (!rule) Object.assign(body, {
      metric, operator: values.get('operator'),
      room_id: scope === 'room' ? values.get('room_id') : null,
      device_id: scope === 'device' ? values.get('device_id') : null,
    });
    onSubmit(body);
  }
  return <form className="form-stack" onSubmit={submit}>
    <Input name="name" label="Tên quy tắc" required maxLength={100} defaultValue={rule?.name} />
    <div className="grid two">
      {rule ? <><Input label="Chỉ số" readOnly value={sensors[metric]?.label || metric} />
        <Input label="Toán tử" readOnly value={operators[rule.operator] || rule.operator} /></> :
        <><Select label="Chỉ số" value={metric} onChange={event => setMetric(event.target.value)}>
          {Object.entries(sensors).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
        </Select><Select label="Toán tử" name="operator">
          {Object.entries(operators).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </Select></>}
      <Input name="threshold" label={'Ngưỡng (' + sensors[metric].unit + ')'} type="number" step="any" defaultValue={rule?.threshold} required />
      <Select name="severity" label="Mức độ" defaultValue={rule?.severity || 'MEDIUM'}>
        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}
      </Select>
      <Input name="cooldown" label="Giãn cách cảnh báo (giây)" type="number" min={10} max={86400} defaultValue={rule?.cooldown_seconds ?? 300} required />
      {rule ? <Input label="Phạm vi" readOnly value={[rule.device_id, rule.room_id].filter(Boolean).join(' / ') || 'Toàn bộ'} /> :
        <Select label="Phạm vi" value={scope} onChange={event => setScope(event.target.value)}>
          <option value="global">Toàn bộ</option><option value="room">Theo phòng</option><option value="device">Theo node</option>
        </Select>}
      {!rule && scope === 'room' && <Select label="Phòng" name="room_id" required defaultValue="">
        <option value="" disabled>Chọn phòng</option>{rooms.map(room => <option key={room.room_id} value={room.room_id}>{room.name}</option>)}
      </Select>}
      {!rule && scope === 'device' && <Select label="Node" name="device_id" required defaultValue="">
        <option value="" disabled>Chọn node</option>{devices.map(device => <option key={device.device_id} value={device.device_id}>{device.display_name}</option>)}
      </Select>}
    </div>
    <label className="check-field"><input type="checkbox" name="enabled" defaultChecked={rule?.is_enabled ?? true} /> Bật quy tắc</label>
    <ErrorMessage error={mutation.error} />
    <div className="actions"><Button variant="secondary" disabled={mutation.busy} onClick={onClose}>Hủy</Button>
      <Button type="submit" disabled={mutation.busy}>{mutation.busy ? 'Đang lưu…' : 'Lưu quy tắc'}</Button></div>
  </form>;
}
