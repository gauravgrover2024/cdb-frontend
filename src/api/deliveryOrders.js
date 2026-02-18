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
    return await apiClient.post(`/api/do/${loanId}`, data);
  },
};
