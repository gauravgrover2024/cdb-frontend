import { apiClient } from "./client";

export const deliveryOrdersApi = {
  getAll: async (params = {}) => {
    return await apiClient.get("/api/do", { params });
  },

  getByLoanId: async (loanId) => {
    return await apiClient.get(`/api/do/${loanId}`);
  },

  createDirect: async (data) => {
    return await apiClient.post("/api/do", data);
  },

  save: async (loanId, data) => {
    return await apiClient.post(`/api/do/${loanId}`, data);
  },

  update: async (loanId, data) => {
    try {
      return await apiClient.put(`/api/do/${loanId}`, data);
    } catch (err) {
      return await apiClient.post(`/api/do/${loanId}`, data);
    }
  },
};
