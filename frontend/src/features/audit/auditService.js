import { api } from '../../api/axiosClient';
export const auditService = { list: (params, signal) => api.get('/audit-logs', { params, signal }) };
