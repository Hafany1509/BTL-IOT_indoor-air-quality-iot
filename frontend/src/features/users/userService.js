import { api } from '../../api/axiosClient';
export const userService = {
  list: signal => api.get('/users', { signal }),
  create: body => api.post('/users', body),
  role: (id, role) => api.patch('/users/' + id + '/role', { role }),
  status: (id, status) => api.patch('/users/' + id + '/status', { status }),
};
