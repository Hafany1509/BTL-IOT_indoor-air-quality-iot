import { Link } from 'react-router-dom';
import { useCallback } from 'react';
import { Card } from '../../../components/common/Card';
import { QueryState } from '../../../components/common/QueryState';
import { EmptyState } from '../../../components/common/EmptyState';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { usePolling } from '../../../hooks/usePolling';
import { formatDate } from '../../../utils/formatDate';
import { alertService } from '../../alerts/alertService';
import { alertRuleService } from '../../alertRules/alertRuleService';
export function RecentAlerts({ id }) {
  const load = useCallback(signal => alertService.list('', signal).then(rows => rows.filter(row => row.device_id === id).slice(0, 5)), [id]);
  const alerts = usePolling(load, { interval: 20000 });
  const rules = usePolling(alertRuleService.list);
  return <Card><div className="card-heading"><h2>Cảnh báo gần đây</h2><Link to="/alerts">Xem tất cả</Link></div>
    <QueryState query={alerts}>{rows => rows.length ? <ul className="clean-list">{rows.map(row =>
      <li className="split" key={row.id}><div><strong>{rules.data?.find(item => item.id === row.rule_id)?.name || 'Quy tắc #' + row.rule_id}</strong><br />
        <small>{formatDate(row.triggered_at)}</small></div><StatusBadge status={row.status} /></li>
    )}</ul> : <EmptyState>Chưa có cảnh báo cho node này.</EmptyState>}</QueryState>
  </Card>;
}
