import { apiClient } from "./client";

export const vehiclesApi = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/vehicles?${query}`);
  },

  search: async (searchTerm) => {
    return await apiClient.get(`/api/vehicles?q=${encodeURIComponent(searchTerm)}`);
  },

  getById: async (id) => {
    return await apiClient.get(`/api/vehicles/${id}`);
  },

  create: async (data) => {
    return await apiClient.post("/api/vehicles", data);
  },

  update: async (id, data) => {
    return await apiClient.put(`/api/vehicles/${id}`, data);
  },

  delete: async (id) => {
    return await apiClient.delete(`/api/vehicles/${id}`);
  },

  bulkUpload: async (data) => {
     return await apiClient.post("/api/vehicles/bulk", data);
  },

  // Distinct values API
  getUniqueMakes: async () => {
    return await apiClient.get("/api/vehicles/distinct/makes");
  },

  getUniqueModels: async (make) => {
    return await apiClient.get(`/api/vehicles/distinct/models?make=${encodeURIComponent(make)}`);
  },

  getUniqueVariants: async (make, model) => {
    return await apiClient.get(
      `/api/vehicles/distinct/variants?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`
    );
  },

  getByDetails: async (make, model, variant, fuel = null, city = null) => {
    let url = `/api/vehicles/by-details?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&variant=${encodeURIComponent(variant)}`;
    if (fuel) url += `&fuel=${encodeURIComponent(fuel)}`;
    if (city) url += `&city=${encodeURIComponent(city)}`;
    return await apiClient.get(url);
  },
};
