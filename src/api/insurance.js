import { apiClient } from "./client";

export const insuranceApi = {
  getAll: async (params = {}) => {
    return await apiClient.get("/api/insurance", { params });
  },

  getById: async (id) => {
    return await apiClient.get(
      `/api/insurance/${encodeURIComponent(String(id || "").trim())}`,
    );
  },

  create: async (data) => {
    return await apiClient.post("/api/insurance", data);
  },

  update: async (id, data) => {
    return await apiClient.put(
      `/api/insurance/${encodeURIComponent(String(id || "").trim())}`,
      data,
    );
  },

  delete: async (id) => {
    return await apiClient.delete(
      `/api/insurance/${encodeURIComponent(String(id || "").trim())}`,
    );
  },
};
