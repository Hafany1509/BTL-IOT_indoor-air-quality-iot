import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { PageHeader } from '../../../components/common/PageHeader';
import { QueryState } from '../../../components/common/QueryState';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { useDevice } from '../../../context/DeviceContext';
import { useMutation } from '../../../hooks/useMutation';
import { usePolling } from '../../../hooks/usePolling';
import { deviceService } from '../../devices/deviceService';
import { alertRuleService } from '../alertRuleService';
import { AlertRuleModal } from '../components/AlertRuleModal';
import { AlertRuleTable } from '../components/AlertRuleTable';

export function AlertRulesPage() {
  const [dialog, setDialog] = useState(null);
  const query = usePolling(alertRuleService.list);
  const rooms = usePolling(deviceService.rooms);
  const { devices, devicesQuery } = useDevice();
  const remove = useMutation();
  const close = () => setDialog(null);
  function refresh() { close(); query.reload(); }
  return <>
    <PageHeader title="Quy tắc cảnh báo" description="Cấu hình ngưỡng, phạm vi và giãn cách cảnh báo.">
      <Button onClick={() => setDialog({ type: 'create' })}><Plus size={17} /> Tạo quy tắc</Button>
    </PageHeader>
    <Card><QueryState query={query}>{rows => <AlertRuleTable rows={rows} onEdit={row => setDialog({ type: 'edit', row })}
      onRemove={row => { remove.setError(null); setDialog({ type: 'remove', row }); }} />}</QueryState></Card>
    {dialog && dialog.type !== 'remove' && <AlertRuleModal rule={dialog.row} rooms={rooms.data || []} devices={devices} onClose={close} onSaved={refresh} />}
    {dialog?.type === 'create' && <div className="stack"><ErrorMessage error={rooms.error} retry={rooms.reload} />
      <ErrorMessage error={devicesQuery.error} retry={devicesQuery.reload} /></div>}
    {dialog?.type === 'remove' && <ConfirmDialog title="Xóa quy tắc cảnh báo" onClose={close} danger busy={remove.busy}
      error={remove.error?.response?.status >= 500 ? 'Không thể xóa quy tắc. Nếu đã có cảnh báo tham chiếu, hãy tắt quy tắc trong form chỉnh sửa.' : remove.error}
      onConfirm={() => remove.run(() => alertRuleService.remove(dialog.row.id), refresh, 'Đã xóa quy tắc.')}>
      <p>Xóa quy tắc “{dialog.row.name}”?</p>
    </ConfirmDialog>}
  </>;
}
