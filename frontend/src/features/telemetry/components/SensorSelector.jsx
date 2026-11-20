import { Select } from '../../../components/common/Select';
import { sensors } from '../../../utils/formatSensor';
export function SensorSelector({ value, onChange }) {
  return <Select label="Chỉ số" value={value} onChange={event => onChange(event.target.value)}>
    {Object.entries(sensors).map(([key, sensor]) => <option key={key} value={key}>{sensor.label}</option>)}
  </Select>;
}
