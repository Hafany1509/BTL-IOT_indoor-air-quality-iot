import { useCallback, useState } from 'react';
import { Card } from '../../../components/common/Card';
import { Select } from '../../../components/common/Select';
import { QueryState } from '../../../components/common/QueryState';
import { usePolling } from '../../../hooks/usePolling';
import { telemetryService } from '../../telemetry/telemetryService';
import { SensorSelector } from '../../telemetry/components/SensorSelector';
import { TelemetryChart } from '../../telemetry/components/TelemetryChart';
import { recentRange } from '../../telemetry/components/TimeRangeFilter';
export function DashboardChart({ id }) {
  const [metric, setMetric] = useState('MQ135_RAW');
  const [hours, setHours] = useState('1');
  const load = useCallback(signal => telemetryService.history(id, { ...recentRange(Number(hours)), limit: 500 }, signal), [id, hours]);
  const query = usePolling(load, { interval: 30000 });
  return <Card><div className="card-heading"><h2>Diễn biến cảm biến</h2>
    <div className="inline"><SensorSelector value={metric} onChange={setMetric} />
      <Select label="Thời gian" value={hours} onChange={event => setHours(event.target.value)}>
        <option value="1">1 giờ qua</option><option value="6">6 giờ qua</option><option value="24">24 giờ qua</option>
      </Select></div>
    </div><QueryState query={query}>{rows => <><TelemetryChart rows={rows} metric={metric} /><small>{rows.length} mẫu đã tải · tối đa 500</small></>}</QueryState>
  </Card>;
}
