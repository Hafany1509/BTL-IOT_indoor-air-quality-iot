import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { commandNames, commandValue } from './CommandStatus';
export function ControlConfirmDialog({ choice, workflow, unavailable, onClose }) {
  return <ConfirmDialog title="Xác nhận gửi lệnh" busy={workflow.busy} error={workflow.error} disabled={Boolean(unavailable)} onClose={onClose}
    onConfirm={() => workflow.send(choice.action, choice.value, onClose)}>
    <p>{commandValue(choice.value)} {commandNames[choice.action].toLocaleLowerCase('vi-VN')}?</p>
  </ConfirmDialog>;
}
