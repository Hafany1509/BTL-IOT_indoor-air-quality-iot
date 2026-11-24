import { useCallback, useState } from 'react';
import { Download } from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { PageHeader } from '../../../components/common/PageHeader';
import { QueryState } from '../../../components/common/QueryState';
import { DeviceScope, DeviceSelect } from '../../../components/layout/DeviceSelect';
import { usePolling } from '../../../hooks/usePolling';
import { formatDate } from '../../../utils/formatDate';
import { telemetryService } from '../telemetryService';
import { TelemetryChart } from '../components/TelemetryChart';
import { TelemetrySummary } from '../components/TelemetrySummary';
import { TelemetryTable } from '../components/TelemetryTable';
import { recentRange, TimeRangeFilter } from '../components/TimeRangeFilter';

const fields = ['device_id', 'measured_at', 'received_at', 'temperature_c', 'humidity_pct', 'mq135_adc_raw', 'quality_level', 'validation_status'];
function exportCsv(rows) {
  const escape = value => {
    let text = String(value ?? '');
    if (typeof value === 'string' && /^[\t\r\n=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const csv = [fields.join(','), ...rows.map(row => fields.map(field => escape(row[field])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'telemetry.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function History({ id }) {
  const [metric, setMetric] = useState('MQ135_RAW');
  const [range, setRange] = useState(() => recentRange(24));
  const load = useCallback(signal => telemetryService.history(id, { ...range, limit: 1000 }, signal), [id, range]);
  const query = usePolling(load);
  return <div className="stack">
    <Card><TimeRangeFilter metric={metric} setMetric={setMetric} onApply={setRange} /></Card>
    <QueryState query={query}>{rows => <>
      <TelemetrySummary rows={rows} metric={metric} />
      <Card><div className="card-heading"><h2>Xu hướng cảm biến</h2></div><TelemetryChart rows={rows} metric={metric} /></Card>
      <Card><div className="card-heading"><div><h2>Dữ liệu đã tải</h2><small>{rows.length} mẫu · tối đa 1.000 · {formatDate(range.from)} – {formatDate(range.to)}</small></div>
        <Button variant="secondary" disabled={!rows.length} onClick={() => exportCsv(rows)}><Download size={16} /> Xuất CSV ({rows.length})</Button>
      </div><TelemetryTable key={range.from + range.to} rows={rows} /></Card>
    </>}</QueryState>
  </div>;
}
export function TelemetryPage() {
  return <>
    <PageHeader title="Lịch sử dữ liệu" description="Xem xu hướng và tải dữ liệu cảm biến."><DeviceSelect /></PageHeader>
    <DeviceScope>{id => <History id={id} key={id} />}</DeviceScope>
  </>;
}
