import { api } from '../../api/axiosClient';
export const alertService = {
  list: (status, signal) => api.get('/alerts', { params: { status: status || undefined }, signal }),
  acknowledge: id => api.patch('/alerts/' + id + '/acknowledge'),
  resolve: (id, notes) => api.patch('/alerts/' + id + '/resolve', { resolution_notes: notes || null }),
};
