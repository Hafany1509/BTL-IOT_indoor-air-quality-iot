import { Card } from '../../../components/common/Card';
import { StatusBadge } from '../../../components/common/StatusBadge';
export function AlertSummary({ rows }) {
  return <div className="grid three">{['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].map(status =>
    <Card className="sensor-card" key={status}><span><StatusBadge status={status} /></span>
      <strong className="value">{rows.filter(row => row.status === status).length}</strong></Card>)}</div>;
}
