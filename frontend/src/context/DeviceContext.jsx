import { createContext, useCallback, useContext, useState } from 'react';
import { usePolling } from '../hooks/usePolling';
import { usePermissions } from '../hooks/usePermissions';
import { deviceService } from '../features/devices/deviceService';
const DeviceContext = createContext(null);
export const useDevice = () => useContext(DeviceContext);

export function DeviceProvider({ children }) {
  const { admin } = usePermissions();
  const [selected, setSelected] = useState('');
  const loadDevices = useCallback(async signal => {
    const devices = await deviceService.list(signal);
    if (admin) return devices;
    const verified = await Promise.all(devices.map(async device => {
      try { return await deviceService.detail(device.device_id, signal); }
      catch (error) {
        if ([403, 404].includes(error.response?.status)) return null;
        throw error;
      }
    }));
    return verified.filter(Boolean);
  }, [admin]);
  const devicesQuery = usePolling(loadDevices, { interval: 25000 });
  const devices = devicesQuery.error && !admin ? [] : devicesQuery.data || [];
  const device = devices.find(item => item.device_id === selected) ||
    devices.find(item => item.device_id === 'esp32-a-01') || devices[0];
  const id = device?.device_id;
  const loadDetail = useCallback(signal => deviceService.detail(id, signal), [id]);
  const detail = usePolling(loadDetail, { enabled: Boolean(id), interval: 9000 });
  return <DeviceContext.Provider value={{ devicesQuery, devices, device: detail.data || device, id, setSelected, detail }}>
    {children}
  </DeviceContext.Provider>;
}
