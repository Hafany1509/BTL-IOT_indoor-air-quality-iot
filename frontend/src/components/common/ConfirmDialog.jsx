import { Modal } from './Modal';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';
export function ConfirmDialog({ title, children, onClose, onConfirm, busy, error, danger, disabled }) {
  return <Modal title={title} onClose={onClose} busy={busy}>
    {children}
    <ErrorMessage error={error} />
    <div className="actions"><Button variant="secondary" disabled={busy} onClick={onClose}>Hủy</Button>
      <Button variant={danger ? 'destructive' : 'primary'} disabled={busy || disabled} onClick={onConfirm}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</Button>
    </div>
  </Modal>;
}
