import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
export function AuditLogFilter({ onApply }) {
  return <form className="filters" onSubmit={event => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    onApply({ action: values.get('action').trim() || undefined, target_type: values.get('target_type').trim() || undefined, limit: Number(values.get('limit')) });
  }}>
    <Input label="Hành động" name="action" placeholder="VD: SEND_COMMAND" />
    <Input label="Loại đối tượng" name="target_type" placeholder="VD: DEVICE" />
    <Select label="Số dòng mỗi trang" name="limit" defaultValue="50">
      {[20, 50, 100, 200].map(limit => <option key={limit}>{limit}</option>)}
    </Select>
    <Button type="submit">Áp dụng</Button>
  </form>;
}
