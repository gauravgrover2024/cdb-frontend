import { apiClient } from './client';

export const banksApi = {
  getAll: (params = {}) => apiClient.get('/api/banks', { params }),
  getById: async (id) => {
    const res = await apiClient.get('/api/banks', {
      params: { id, limit: 1, fields: 'detail' },
    });
    const bank = Array.isArray(res?.data) ? res.data[0] : null;
    return { success: Boolean(bank), data: bank };
  },
  lookup: ({ ifsc, micr }) =>
    apiClient.get('/api/banks/lookup', { params: { ifsc, micr } }),
  create: (data) => apiClient.post('/api/banks', data),
  update: (id, data) => apiClient.put(`/api/banks/${id}`, data),
  delete: (id) => apiClient.delete(`/api/banks/${id}`),
  // Get banks with pagination and search (list view - safe fields only)
  getPaginated: (skip = 0, limit = 100, search = "") => 
    apiClient.get('/api/banks', { params: { skip, limit, search, fields: 'list' } }),
  // Get banks with all fields for detail view
  getDetail: (skip = 0, limit = 100, search = "") =>
    apiClient.get('/api/banks', { params: { skip, limit, search, fields: 'detail' } }),
};
