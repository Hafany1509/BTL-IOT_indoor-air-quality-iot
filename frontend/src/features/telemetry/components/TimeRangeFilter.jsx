import { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { localInputToIso } from '../../../utils/formatDate';
import { SensorSelector } from './SensorSelector';
export const recentRange = hours => ({
  from: new Date(Date.now() - hours * 3600000).toISOString(),
  to: new Date().toISOString(),
});
export function TimeRangeFilter({ metric, setMetric, onApply }) {
  const [preset, setPreset] = useState('24');
  const [error, setError] = useState('');
  function submit(event) {
    event.preventDefault();
    setError('');
    const fields = new FormData(event.currentTarget);
    if (preset !== 'custom') return onApply(recentRange(Number(preset)));
    const from = localInputToIso(fields.get('from'));
    const to = localInputToIso(fields.get('to'));
    if (!from || !to || from > to) return setError('Thời điểm kết thúc phải sau hoặc bằng thời điểm bắt đầu.');
    onApply({ from, to });
  }
  return <form className="stack" onSubmit={submit}>
    <div className="filters">
      <SensorSelector value={metric} onChange={setMetric} />
      <Select label="Khoảng thời gian" value={preset} onChange={event => setPreset(event.target.value)}>
        <option value="1">1 giờ qua</option><option value="6">6 giờ qua</option>
        <option value="24">24 giờ qua</option><option value="168">7 ngày qua</option><option value="custom">Tùy chọn</option>
      </Select>
      {preset === 'custom' && <><Input label="Từ (giờ Việt Nam)" name="from" type="datetime-local" required />
        <Input label="Đến (giờ Việt Nam)" name="to" type="datetime-local" required /></>}
      <Button type="submit">Áp dụng</Button>
    </div>
    <ErrorMessage error={error} />
  </form>;
}
