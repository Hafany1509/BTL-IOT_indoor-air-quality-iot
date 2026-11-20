import { Thermometer, Droplets, Wind } from 'lucide-react';
export const sensors = {
  TEMPERATURE: { key: 'temperature_c', label: 'Nhiệt độ', unit: '°C', icon: Thermometer, color: '#dc2626' },
  HUMIDITY: { key: 'humidity_pct', label: 'Độ ẩm', unit: '%', icon: Droplets, color: '#2563eb' },
  MQ135_RAW: { key: 'mq135_adc_raw', label: 'MQ-135', unit: 'ADC raw', icon: Wind, color: '#7c3aed' },
};
const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
export const formatSensor = value => Number.isFinite(value) ? number.format(value) : '—';
