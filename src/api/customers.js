import { apiClient } from "./client";

const toQueryString = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (!entries.length) return "";
  const qs = new URLSearchParams();
  entries.forEach(([k, v]) => qs.append(k, String(v)));
  return `?${qs.toString()}`;
};

export const customersApi = {
  getAll: async (queryParams = "") => {
    if (typeof queryParams === "string") {
      return await apiClient.get(`/api/customers${queryParams}`);
    }
    return await apiClient.get(`/api/customers${toQueryString(queryParams || {})}`);
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

  search: async (query, params = {}) => {
    const merged = { q: query, ...params };
    return await apiClient.get(`/api/customers/search${toQueryString(merged)}`);
  }
};
