import { api } from '../../api/axiosClient';
export const alertRuleService = {
  list: signal => api.get('/alert-rules', { signal }),
  create: body => api.post('/alert-rules', body),
  update: (id, body) => api.patch('/alert-rules/' + id, body),
  remove: id => api.delete('/alert-rules/' + id),
};
