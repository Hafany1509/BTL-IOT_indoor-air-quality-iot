import { api } from '../../api/axiosClient';
export const authService = {
  login: body => api.post('/auth/login', body),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};
