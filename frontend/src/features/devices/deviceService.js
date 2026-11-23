import { api } from '../../api/axiosClient';
import { devicePath } from '../../api/endpoints';
export const deviceService = {
  list: signal => api.get('/devices', { signal }),
  detail: (id, signal) => api.get(devicePath(id), { signal }),
  rooms: signal => api.get('/rooms', { signal }),
  lifecycle: (id, body) => api.patch(devicePath(id) + '/lifecycle', body),
  assign: (id, body) => api.post(devicePath(id) + '/assignments', body),
  register: body => api.post('/devices', body),
  createRoom: body => api.post('/rooms', body),
};
