import { apiClient } from "./client";

export const customersApi = {
  getAll: async (queryParams = "") => {
    return await apiClient.get(`/api/customers${queryParams}`);
  },
  
  getById: async (id) => {
    return await apiClient.get(`/api/customers/${id}`);
  },

  create: async (data) => {
    return await apiClient.post("/api/customers", data);
  },

  update: async (id, data) => {
    return await apiClient.put(`/api/customers/${id}`, data);
  },

  delete: async (id) => {
    return await apiClient.delete(`/api/customers/${id}`);
  },

  reassignLoans: async (customerId, targetCustomerId) => {
    return await apiClient.post(`/api/customers/${customerId}/reassign-loans`, {
      targetCustomerId,
    });
  },

  search: async (query) => {
    return await apiClient.get(`/api/customers/search?q=${encodeURIComponent(query)}`);
  }
};
