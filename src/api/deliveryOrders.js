import { apiClient } from "./client";

export const deliveryOrdersApi = {
  getAll: async () => {
    return await apiClient.get("/api/do");
  },

  getByLoanId: async (loanId) => {
    return await apiClient.get(`/api/do/${loanId}`);
  },

  save: async (loanId, data) => {
    return await apiClient.post(`/api/do/${loanId}`, data);
  },

  update: async (loanId, data) => {
    try {
      return await apiClient.put(`/api/do/${loanId}`, data);
    } catch (err) {
      // Backward compatibility for older deployments that only accepted POST
      return await apiClient.post(`/api/do/${loanId}`, data);
    }
  },
};
