import { apiClient } from './client';

export const banksApi = {
  getAll: (params = {}) => apiClient.get('/api/banks', { params }),
  lookup: ({ ifsc, micr }) =>
    apiClient.get('/api/banks/lookup', { params: { ifsc, micr } }),
  create: (data) => apiClient.post('/api/banks', data),
};
