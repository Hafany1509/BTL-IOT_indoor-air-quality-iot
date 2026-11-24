import { api } from '../../api/axiosClient';
import { devicePath } from '../../api/endpoints';
export const telemetryService = {
  latest: (id, signal) => api.get(devicePath(id) + '/telemetry/latest', { signal }),
  history: (id, params, signal) => api.get(devicePath(id) + '/telemetry', { params, signal }),
};
