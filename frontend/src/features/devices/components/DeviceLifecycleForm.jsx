import { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { statusLabel } from '../../../components/common/StatusBadge';
import { useMutation } from '../../../hooks/useMutation';
import { deviceService } from '../deviceService';
const lifecycles = ['REGISTERED', 'PROVISIONED', 'ACTIVE', 'OFFLINE', 'FAULT', 'MAINTENANCE', 'LOCKED', 'DECOMMISSIONED'];

export function DeviceLifecycleForm({ device, admin, onSaved }) {
  const [request, setRequest] = useState(null);
  const mutation = useMutation();
  const options = admin ? lifecycles : lifecycles.filter(value => !['LOCKED', 'DECOMMISSIONED'].includes(value));
  return <Card className="stack"><h2>Vòng đời thiết bị</h2>
    {!admin && <p className="notice">API kiểm tra quyền MANAGE của bạn cho yêu cầu cập nhật.</p>}
    <form className="filters" onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      mutation.setError(null);
      setRequest({ lifecycle: form.get('lifecycle'), reason: form.get('reason').trim() || null });
    }}>
      <Select label="Trạng thái mới" name="lifecycle" defaultValue="" required>
        <option value="" disabled>Chọn trạng thái</option>
        {options.filter(value => value !== device.lifecycle).map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}
      </Select>
      <Input label="Lý do" name="reason" maxLength={255} />
      <Button type="submit">Cập nhật vòng đời</Button>
    </form>
    {request && <ConfirmDialog title="Xác nhận cập nhật vòng đời" onClose={() => setRequest(null)} busy={mutation.busy} error={mutation.error}
      danger={['LOCKED', 'DECOMMISSIONED'].includes(request.lifecycle)}
      onConfirm={() => mutation.run(() => deviceService.lifecycle(device.device_id, request), () => {
        setRequest(null);
        onSaved();
      }, 'Đã cập nhật vòng đời thiết bị.')}>
      <p>{device.display_name} sẽ chuyển sang “{statusLabel(request.lifecycle)}”.</p>
    </ConfirmDialog>}
  </Card>;
}
