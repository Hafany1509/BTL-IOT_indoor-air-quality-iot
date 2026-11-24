import { useCallback, useState } from 'react';
import { Card } from '../../../components/common/Card';
import { ErrorMessage } from '../../../components/common/ErrorMessage';
import { PageHeader } from '../../../components/common/PageHeader';
import { QueryState } from '../../../components/common/QueryState';
import { useDevice } from '../../../context/DeviceContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { usePolling } from '../../../hooks/usePolling';
import { serverTime } from '../../../utils/formatDate';
import { alertRuleService } from '../../alertRules/alertRuleService';
import { alertService } from '../alertService';
import { AlertDetailModal } from '../components/AlertDetailModal';
import { AlertFilter } from '../components/AlertFilter';
import { AlertSummary } from '../components/AlertSummary';
import { AlertTable } from '../components/AlertTable';

export function AlertsPage() {
  const { devices, devicesQuery, detail, id } = useDevice();
  const { admin, viewer } = usePermissions();
  const [filters, setFilters] = useState({ status: '', from: '', to: '' });
  const [filterError, setFilterError] = useState('');
  const [selected, setSelected] = useState(null);
  const load = useCallback(signal => alertService.list(filters.status, signal), [filters.status]);
  const alerts = usePolling(load, { enabled: admin || devicesQuery.data !== undefined, interval: 20000 });
  const rules = usePolling(alertRuleService.list);
  const blockedCurrentDevice = [403, 404].includes(detail.error?.response?.status);
  const allowed = new Set(devices.filter(device => !blockedCurrentDevice || device.device_id !== id).map(device => device.device_id));
  const from = filters.from ? Date.parse(filters.from + 'T00:00:00+07:00') : -Infinity;
  const to = filters.to ? Date.parse(filters.to + 'T00:00:00+07:00') + 86400000 : Infinity;
  function apply(values) {
    if (values.from && values.to && values.from > values.to) return setFilterError('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
    setFilterError('');
    setFilters(values);
  }
  function updated(row) {
    setSelected(row);
    alerts.reload();
  }
  return <>
    <PageHeader title="Cảnh báo" description={viewer ? 'Xem các sự kiện vượt ngưỡng của node được cấp quyền.' : 'Theo dõi và xử lý các sự kiện vượt ngưỡng.'} />
    <div className="stack">
      <Card><AlertFilter devices={devices.filter(device => allowed.has(device.device_id))} onApply={apply} /><ErrorMessage error={filterError} /></Card>
      {!admin && <ErrorMessage error={devicesQuery.error} retry={devicesQuery.reload} />}
      <ErrorMessage error={rules.error} retry={rules.reload} />
      <QueryState query={alerts}>{data => {
        const rows = data.filter(row => {
          const time = serverTime(row.triggered_at);
          return (admin || allowed.has(row.device_id)) && (!filters.device || row.device_id === filters.device) && time >= from && time < to;
        });
        return <>
          <small>Thống kê từ {rows.length} cảnh báo phù hợp trong lượt tải (API tối đa 100 bản ghi).</small>
          <AlertSummary rows={rows} />
          <Card><AlertTable rows={rows} rules={rules.data || []} onOpen={setSelected} /></Card>
        </>;
      }}</QueryState>
      {selected && (admin || allowed.has(selected.device_id)) && <AlertDetailModal row={selected}
        rule={rules.data?.find(rule => rule.id === selected.rule_id)} onClose={() => setSelected(null)} onUpdated={updated} />}
    </div>
  </>;
}
