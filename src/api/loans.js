import { apiClient } from "./client";

export const loansApi = {
  getAll: async (params = {}) => {
    return await apiClient.get("/api/loans", { params });
  },
  getDashboardStats: async () => {
    return await apiClient.get("/api/loans/dashboard/stats");
  },
  getCollectionsReceivables: async (params = {}) => {
    return await apiClient.get("/api/loans/collections/receivables", {
      params,
    });
  },
  upsertCollectionReceivable: async (data = {}) => {
    return await apiClient.post("/api/loans/collections/receivables/upsert", data);
  },
  updateCollectionReceivable: async (payoutId, data = {}) => {
    return await apiClient.patch(
      `/api/loans/collections/receivables/${encodeURIComponent(String(payoutId || "").trim())}`,
      data,
    );
  },
  deleteCollectionReceivable: async (payoutId, params = {}) => {
    return await apiClient.delete(
      `/api/loans/collections/receivables/${encodeURIComponent(String(payoutId || "").trim())}`,
      { params },
    );
  },
  getAnalyticsOverview: async (params = {}, options = {}) => {
    return await apiClient.get("/api/loans/analytics/overview", { params, ...options });
  },
  getAnalyticsDrilldown: async (params = {}, options = {}) => {
    return await apiClient.get("/api/loans/analytics/drilldown", { params, ...options });
  },
  createCustomWidget: async (body = {}) => {
    return await apiClient.post("/api/loans/analytics/custom-widget", body);
  },
  createCustomReport: async (body = {}) => {
    return await apiClient.post("/api/loans/analytics/custom-report", body);
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

  getNextRcInvStorageNumber: async () => {
    return await apiClient.get("/api/loans/counters/rc-inv/next");
  },
};

export const disburseLoan = async (id, data) => {
  return await loansApi.disburse(id, data);
};
