import { apiClient } from "./client";

export const paymentsApi = {
  getAll: async () => {
    return await apiClient.get("/api/payments");
  },
  getByLoanId: async (loanId) => {
    return await apiClient.get(`/api/payments/${loanId}`);
  },

  create: async (loanId, data) => {
    return await apiClient.post(`/api/payments/${loanId}`, data);
  },

  update: async (loanId, data) => {
    return await apiClient.put(`/api/payments/${loanId}`, data);
  },
};
