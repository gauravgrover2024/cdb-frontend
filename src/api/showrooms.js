import { apiClient } from "./client";

export const showroomsApi = {
  // Get all showrooms with optional filters
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/showrooms?${query}`);
  },

  // Search showrooms for auto-complete (returns limited fields)
  search: async (term) => {
    return await apiClient.get(`/api/showrooms/search?term=${encodeURIComponent(term)}`);
  },

  // Get showroom by ID
  getById: async (id) => {
    return await apiClient.get(`/api/showrooms/${id}`);
  },

  // Create new showroom
  create: async (data) => {
    return await apiClient.post("/api/showrooms", data);
  },

  // Update showroom
  update: async (id, data) => {
    return await apiClient.put(`/api/showrooms/${id}`, data);
  },

  // Delete showroom (soft delete)
  delete: async (id) => {
    return await apiClient.delete(`/api/showrooms/${id}`);
  },

  // Add payment/commission entry
  addPayment: async (id, data) => {
    return await apiClient.post(`/api/showrooms/${id}/payments`, data);
  },

  // Get showroom statistics
  getStats: async (id) => {
    return await apiClient.get(`/api/showrooms/${id}/stats`);
  },
};
