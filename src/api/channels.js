import { apiClient } from "./client";

export const channelsApi = {
  // Get all channels with optional filters
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/channels?${query}`);
  },

  // Search channels for auto-complete (returns limited fields)
  search: async (term, type = null) => {
    let url = `/api/channels/search?term=${encodeURIComponent(term)}`;
    if (type) url += `&type=${encodeURIComponent(type)}`;
    return await apiClient.get(url);
  },

  // Get channel by ID
  getById: async (id) => {
    return await apiClient.get(`/api/channels/${id}`);
  },

  // Create new channel
  create: async (data) => {
    return await apiClient.post("/api/channels", data);
  },

  // Update channel
  update: async (id, data) => {
    return await apiClient.put(`/api/channels/${id}`, data);
  },

  // Delete channel (soft delete)
  delete: async (id) => {
    return await apiClient.delete(`/api/channels/${id}`);
  },

  // Add payout entry
  addPayout: async (id, data) => {
    return await apiClient.post(`/api/channels/${id}/payouts`, data);
  },

  // Get channel statistics
  getStats: async (id) => {
    return await apiClient.get(`/api/channels/${id}/stats`);
  },
};
