import { apiClient } from './client';

export const banksApi = {
  getAll: () => apiClient.get('/api/banks'),
  create: (data) => apiClient.post('/api/banks', data),
};
