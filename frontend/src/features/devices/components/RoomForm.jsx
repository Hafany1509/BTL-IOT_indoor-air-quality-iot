import { Button } from '../../../components/common/Button';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { Input } from '../../../components/common/Input';
import { useMutation } from '../../../hooks/useMutation';
import { deviceService } from '../deviceService';
export function RoomForm({ onSaved }) {
  const mutation = useMutation();
  return <form className="form-stack" onSubmit={event => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    body.name = body.name.trim();
    if (!body.name) return mutation.setError('Vui lòng nhập tên phòng.');
    mutation.run(() => deviceService.createRoom({ ...body, description: body.description.trim() || null }), () => {
      form.reset(); onSaved();
    }, 'Đã tạo phòng.');
  }}>
    <h3>Tạo phòng</h3>
    <Input label="ID phòng" name="room_id" pattern="[a-z0-9\-]+" maxLength={64} required />
    <Input label="Tên phòng" name="name" maxLength={100} required />
    <Input label="Mô tả" name="description" maxLength={255} />
    <ErrorMessage error={mutation.error} />
    <div><Button type="submit" disabled={mutation.busy}>Tạo phòng</Button></div>
  </form>;
}
