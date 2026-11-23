import { sensors } from '../../../utils/formatSensor';
import { isStale } from '../../../utils/sensorStatus';
import { SensorCard } from './SensorCard';
export function SensorOverview({ sample }) {
  return <div className="grid three">{Object.entries(sensors).map(([key, sensor]) =>
    <SensorCard key={key} sensor={sensor} sample={sample} stale={isStale(sample)} />)}</div>;
}
