import { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { Modal } from '../../../components/common/Modal';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { usePermissions } from '../../../hooks/usePermissions';
import { useMutation } from '../../../hooks/useMutation';
import { formatDate } from '../../../utils/formatDate';
import { formatSensor, sensors } from '../../../utils/formatSensor';
import { alertService } from '../alertService';

export function AlertDetailModal({ row, rule, onClose, onUpdated }) {
  const { requestControl, admin } = usePermissions();
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');
  const mutation = useMutation();
  function submit(event) {
    event.preventDefault();
    mutation.run(() => action === 'ack' ? alertService.acknowledge(row.id) : alertService.resolve(row.id, notes.trim()), updated => {
      onUpdated(updated);
      setAction('');
      setNotes('');
    }, action === 'ack' ? 'Đã xác nhận cảnh báo.' : 'Đã giải quyết cảnh báo.');
  }
  return <Modal title={'Cảnh báo #' + row.id} busy={mutation.busy} onClose={onClose}>
    <div className="stack">
      <dl className="detail-list">
        <dt>Node</dt><dd>{row.device_id}</dd>
        <dt>Quy tắc</dt><dd>{rule?.name || '#' + row.rule_id}</dd>
        {rule && <><dt>Điều kiện</dt><dd>{sensors[rule.metric]?.label} {rule.operator} {formatSensor(rule.threshold)} {sensors[rule.metric]?.unit}</dd>
          <dt>Mức độ</dt><dd><StatusBadge status={rule.severity} /></dd></>}
        <dt>Giá trị đo</dt><dd>{formatSensor(row.metric_value)} {sensors[rule?.metric]?.unit}</dd>
        <dt>Kích hoạt</dt><dd>{formatDate(row.triggered_at)}</dd>
        <dt>Trạng thái</dt><dd><StatusBadge status={row.status} /></dd>
        <dt>Người xác nhận</dt><dd>{row.acknowledged_by ? '#' + row.acknowledged_by : '—'} · {formatDate(row.acknowledged_at)}</dd>
        <dt>Người giải quyết</dt><dd>{row.resolved_by ? '#' + row.resolved_by : '—'} · {formatDate(row.resolved_at)}</dd>
        <dt>Ghi chú</dt><dd>{row.resolution_notes || '—'}</dd>
      </dl>
      {requestControl && row.status !== 'RESOLVED' && <>
        {!admin && <p className="notice">API kiểm tra quyền CONTROL hoặc MANAGE khi xử lý cảnh báo.</p>}
        {action ? <form className="form-stack" onSubmit={submit}>
          {action === 'resolve' ? <label className="field"><span>Ghi chú xử lý</span><textarea rows={3} maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} /></label> : <p>Xác nhận đã tiếp nhận cảnh báo này?</p>}
          <ErrorMessage error={mutation.error} />
          <div className="actions"><Button variant="secondary" disabled={mutation.busy} onClick={() => setAction('')}>Quay lại</Button>
            <Button type="submit" disabled={mutation.busy}>{mutation.busy ? 'Đang xử lý…' : action === 'ack' ? 'Xác nhận tiếp nhận' : 'Lưu và giải quyết'}</Button></div>
        </form> : <div className="actions">
          {row.status === 'OPEN' && <Button variant="secondary" onClick={() => { mutation.setError(null); setAction('ack'); }}>Xác nhận</Button>}
          <Button onClick={() => { mutation.setError(null); setAction('resolve'); }}>Giải quyết</Button>
        </div>}
      </>}
    </div>
  </Modal>;
}
