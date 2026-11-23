import { Button } from '../../../components/common/Button';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { useMutation } from '../../../hooks/useMutation';
import { deviceService } from '../deviceService';
export function DeviceRegistrationForm({ rooms, onSaved }) {
  const mutation = useMutation();
  return <form className="form-stack" onSubmit={event => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    body.display_name = body.display_name.trim();
    if (!body.display_name) return mutation.setError('Vui lòng nhập tên hiển thị.');
    mutation.run(() => deviceService.register({ ...body, mqtt_client_id: body.mqtt_client_id.trim() || null }), device => {
      form.reset(); onSaved(device);
    }, 'Đã đăng ký node.');
  }}>
    <h3>Đăng ký node</h3>
    <Input label="ID thiết bị" name="device_id" pattern="[a-z0-9\-]+" maxLength={64} required />
    <Input label="Tên hiển thị" name="display_name" maxLength={100} required />
    <Select label="Phòng" name="room_id" required defaultValue=""><option value="" disabled>Chọn phòng</option>
      {rooms.map(room => <option value={room.room_id} key={room.room_id}>{room.name}</option>)}</Select>
    <Input label="Phiên bản firmware" name="firmware_version" maxLength={32} defaultValue="1.0.0" required />
    <Input label="MQTT client ID" name="mqtt_client_id" maxLength={64} />
    <ErrorMessage error={mutation.error} />
    <div><Button type="submit" disabled={mutation.busy || !rooms.length}>Đăng ký</Button></div>
  </form>;
}
