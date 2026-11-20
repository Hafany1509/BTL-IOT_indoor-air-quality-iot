import { Lightbulb } from 'lucide-react';
import { ActuatorCard } from './FanControl';
export function LedControl(props) {
  return <ActuatorCard icon={Lightbulb} title="LED cảnh báo" action="LED_SET" {...props} />;
}
