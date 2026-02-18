import { apiClient } from "./client";

export const loansApi = {
  getAll: async (queryParams = "") => {
    return await apiClient.get(`/api/loans${queryParams}`);
  },

  getById: async (id) => {
    return await apiClient.get(`/api/loans/${id}`);
  },

  create: async (data) => {
    return await apiClient.post("/api/loans", data);
  },

  update: async (id, data) => {
    return await apiClient.put(`/api/loans/${id}`, data);
  },

  delete: async (id) => {
    return await apiClient.delete(`/api/loans/${id}`);
  },

  disburse: async (id, data) => {
    return await apiClient.post(`/api/loans/${id}/disburse`, data);
  },
};

// Convenience export for direct use
export const disburseLoan = async (id, data) => {
  return await loansApi.disburse(id, data);
};
