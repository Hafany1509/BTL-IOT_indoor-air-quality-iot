import { Wind } from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { StatusBadge } from '../../../components/common/StatusBadge';
export function AirQualityStatus({ sample }) {
  return <Card className="split"><div className="inline"><span className="sensor-icon"><Wind size={20} /></span>
    <h2>Chất lượng không khí</h2></div><StatusBadge status={sample?.quality_level || 'UNKNOWN'} /></Card>;
}
