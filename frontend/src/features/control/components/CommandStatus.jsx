import { StatusBadge } from '../../../components/common/StatusBadge';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
export const commandNames = { FAN_SET: 'Quạt thông gió', LED_SET: 'LED cảnh báo' };
export const commandValue = value => ({ ON: 'Bật', OFF: 'Tắt' })[value] || value || '—';
export function CommandStatus({ command, ended, statusError }) {
  if (!command) return null;
  return <div className="stack" role="status">
    <div className="split"><span>{commandNames[command.command_type] || command.command_type} · {commandValue(command.payload?.value)}</span><StatusBadge status={command.status} /></div>
    {command.error_message && <ErrorMessage error={command.error_message} />}
    <ErrorMessage error={statusError} />
    {ended && ['SENT', 'PENDING'].includes(command.status) && <p className="notice">Đã dừng theo dõi. Chưa nhận được trạng thái cuối từ API.</p>}
  </div>;
}
