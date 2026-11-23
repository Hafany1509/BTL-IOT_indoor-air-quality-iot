import axios from 'axios';
import { session } from '../utils/storage';

export const api = axios.create({ baseURL: '/api/v1', timeout: 12000 });
api.interceptors.request.use(config => {
  const token = session.get();
  if (token && config.url !== '/auth/login') config.headers.Authorization = 'Bearer ' + token;
  return config;
});
api.interceptors.response.use(response => response.data, error => {
  const config = error.config;
  if (error.response?.status === 401 && config?.url !== '/auth/login' &&
      config?.headers?.Authorization === 'Bearer ' + session.get()) {
    session.clear();
    window.dispatchEvent(new Event('session-expired'));
  }
  return Promise.reject(error);
});

export function errorText(error, fallback = 'Không thể hoàn thành yêu cầu.') {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;
  if (status === 403) {
    if (typeof detail === 'string' && detail.startsWith('Requires CONTROL permission')) {
      return 'Thao tác này yêu cầu quyền CONTROL hoặc MANAGE trên node.';
    }
    if (typeof detail === 'string' && detail.startsWith('Requires MANAGE permission')) {
      return 'Thao tác này yêu cầu quyền MANAGE trên node.';
    }
    return 'Bạn không có quyền thực hiện thao tác này hoặc quyền đã hết hạn.';
  }
  if (status === 404) return 'Không tìm thấy dữ liệu yêu cầu.';
  if (status === 422 && Array.isArray(detail)) {
    return detail.map(item => item.loc?.slice(1).join('.') + ' — ' + item.msg).join(' · ');
  }
  if (status >= 500) return fallback;
  if (typeof detail === 'string') return detail;
  if (error?.isAxiosError && !status) return 'Không kết nối được API. Vui lòng thử lại.';
  return fallback;
}
