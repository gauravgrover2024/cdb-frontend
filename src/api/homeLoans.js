import { apiClient } from "./client";

export const homeLoansApi = {
  getAll: async (params = {}) => {
    return await apiClient.get("/api/home-loans", { params });
  },
  getDashboardStats: async () => {
    return await apiClient.get("/api/home-loans/dashboard/stats");
  },
  getCollectionsReceivables: async (params = {}) => {
    return await apiClient.get("/api/home-loans/collections/receivables", {
      params,
    });
  },
  upsertCollectionReceivable: async (data = {}) => {
    return await apiClient.post("/api/home-loans/collections/receivables/upsert", data);
  },
  updateCollectionReceivable: async (payoutId, data = {}) => {
    return await apiClient.patch(
      `/api/home-loans/collections/receivables/${encodeURIComponent(String(payoutId || "").trim())}`,
      data,
    );
  },
  deleteCollectionReceivable: async (payoutId, params = {}) => {
    return await apiClient.delete(
      `/api/home-loans/collections/receivables/${encodeURIComponent(String(payoutId || "").trim())}`,
      { params },
    );
  },
  getAnalyticsOverview: async (params = {}, options = {}) => {
    return await apiClient.get("/api/home-loans/analytics/overview", { params, ...options });
  },
  getAnalyticsDrilldown: async (params = {}, options = {}) => {
    return await apiClient.get("/api/home-loans/analytics/drilldown", { params, ...options });
  },
  createCustomWidget: async (body = {}) => {
    return await apiClient.post("/api/home-loans/analytics/custom-widget", body);
  },
  createCustomReport: async (body = {}) => {
    return await apiClient.post("/api/home-loans/analytics/custom-report", body);
  },

  getById: async (id) => {
    return await apiClient.get(`/api/home-loans/${id}`);
  },

  create: async (data) => {
    return await apiClient.post("/api/home-loans", data);
  },

  update: async (id, data) => {
    return await apiClient.put(`/api/home-loans/${id}`, data);
  },

  delete: async (id) => {
    return await apiClient.delete(`/api/home-loans/${id}`);
  },

  disburse: async (id, data) => {
    return await apiClient.post(`/api/home-loans/${id}/disburse`, data);
  },

  getNextRcInvStorageNumber: async () => {
    return await apiClient.get("/api/home-loans/counters/rc-inv/next");
  },

  // Splits a saved original entry into `count` loan files (the original
  // stays file #1). `payload` is the latest form state, saved first.
  split: async (id, { count, payload } = {}) => {
    return await apiClient.post(`/api/home-loans/${id}/split`, { count, payload });
  },

  // Loan amount breakup components (home-loan specific catalog).
  getBreakupFields: async () => {
    return await apiClient.get("/api/home-loans/breakup-fields");
  },
  createBreakupField: async (data = {}) => {
    return await apiClient.post("/api/home-loans/breakup-fields", data);
  },
  deleteBreakupField: async (key) => {
    return await apiClient.delete(
      `/api/home-loans/breakup-fields/${encodeURIComponent(String(key || "").trim())}`,
    );
  },
};

export const disburseHomeLoan = async (id, data) => {
  return await homeLoansApi.disburse(id, data);
};
