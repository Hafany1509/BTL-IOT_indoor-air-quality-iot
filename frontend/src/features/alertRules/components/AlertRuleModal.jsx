import { Modal } from '../../../components/common/Modal';
import { useMutation } from '../../../hooks/useMutation';
import { alertRuleService } from '../alertRuleService';
import { AlertRuleForm } from './AlertRuleForm';
export function AlertRuleModal({ rule, rooms, devices, onClose, onSaved }) {
  const mutation = useMutation();
  return <Modal title={rule ? 'Chỉnh sửa quy tắc' : 'Tạo quy tắc'} onClose={onClose} busy={mutation.busy}>
    <AlertRuleForm rule={rule} rooms={rooms} devices={devices} mutation={mutation} onClose={onClose}
      onSubmit={body => mutation.run(() => rule ? alertRuleService.update(rule.id, body) : alertRuleService.create(body), onSaved, 'Đã lưu quy tắc.')} />
  </Modal>;
}
