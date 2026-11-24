import { api } from '../../api/axiosClient';
export const profileService = {
  update: body => api.patch('/auth/profile', body),
  changePassword: body => api.patch('/auth/password', body),
};
