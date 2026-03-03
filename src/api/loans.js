import { apiClient } from "./client";

export const loansApi = {
  getAll: async (params = {}) => {
    return await apiClient.get("/api/loans", { params });
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

export const disburseLoan = async (id, data) => {
  return await loansApi.disburse(id, data);
};
