import { api } from '../../api/axiosClient';
import { devicePath } from '../../api/endpoints';
export const commandService = {
  list: (id, signal) => api.get(devicePath(id) + '/commands', { params: { limit: 30 }, signal }),
  status: (id, signal) => api.get('/commands/' + encodeURIComponent(id), { signal }),
  send: (id, action, value) => api.post(devicePath(id) + '/commands', {
    command_type: action, payload: { action, value }, timeout_seconds: 15,
  }),
};
