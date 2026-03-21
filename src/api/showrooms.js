import { apiClient } from "./client";

export const showroomsApi = {
  // Get all showrooms with optional filters
  getAll: async (params = {}) => {
    return await apiClient.get("/api/showrooms", { params });
  },

  // Search showrooms for auto-complete (returns limited fields)
  // Supports old signature: search(term, limit)
  // And new signature: search({ term, limit, brand })
  search: async (termOrOptions = "", limit = 20, brand = "") => {
    let params;
    if (termOrOptions && typeof termOrOptions === "object") {
      params = {
        term: termOrOptions.term || "",
        limit: termOrOptions.limit ?? 20,
        brand: termOrOptions.brand || "",
      };
    } else {
      params = { term: termOrOptions || "", limit, brand: brand || "" };
    }
    return await apiClient.get("/api/showrooms/search", { params });
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

  // Get showrooms with pagination and search (list view - safe fields only)
  getPaginated: async (skip = 0, limit = 50, search = "") => {
    return await apiClient.get("/api/showrooms", { params: { skip, limit, q: search, fields: 'list' } });
  },

  // Get showrooms with all fields for detail view
  getDetail: async (skip = 0, limit = 50, search = "") => {
    return await apiClient.get("/api/showrooms", { params: { skip, limit, q: search, fields: 'detail' } });
  },
};
