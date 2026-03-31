import { apiClient } from "./client";

export const paymentsApi = {
  getAll: async () => {
    return await apiClient.get("/api/payments");
  },

  getByLoanId: async (loanId) => {
    return await apiClient.get(`/api/payments/${loanId}`);
  },

  createDirect: async (data) => {
    return await apiClient.post("/api/payments", data);
  },

  create: async (loanId, data) => {
    return await apiClient.post(`/api/payments/${loanId}`, data);
  },

  update: async (loanId, data) => {
    return await apiClient.put(`/api/payments/${loanId}`, data);
  },
};
