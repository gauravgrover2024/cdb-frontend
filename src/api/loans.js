import { apiClient } from "./client";

const BREAKUP_FIELDS_ENDPOINT = "/api/loans/breakup-fields";
const BREAKUP_FIELDS_FALLBACK_BASE = "https://cdb-api.vercel.app";

const shouldUseFallback = (error) => {
  const status = Number(error?.status || 0);
  const message = String(error?.message || "").toLowerCase();
  const payload = String(error?.payload || "").toLowerCase();
  return (
    status === 404 ||
    message.includes("not found") ||
    payload.includes("not found")
  );
};

const parseFallbackResponse = async (res) => {
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (_) {
    data = null;
  }
  if (!res.ok) {
    const error = new Error(
      data?.error || data?.message || text || "API Request Failed",
    );
    error.status = res.status;
    error.payload = data || text;
    throw error;
  }
  return data || {};
};

export const loansApi = {
  getAll: async (params = {}) => {
    return await apiClient.get("/api/loans", { params });
  },
  getDashboardStats: async () => {
    return await apiClient.get("/api/loans/dashboard/stats");
  },
  getBreakupFields: async () => {
    try {
      return await apiClient.get(BREAKUP_FIELDS_ENDPOINT);
    } catch (error) {
      if (!shouldUseFallback(error)) throw error;
      const res = await fetch(
        `${BREAKUP_FIELDS_FALLBACK_BASE}${BREAKUP_FIELDS_ENDPOINT}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      return await parseFallbackResponse(res);
    }
  },
  createBreakupField: async (body = {}) => {
    try {
      return await apiClient.post(BREAKUP_FIELDS_ENDPOINT, body);
    } catch (error) {
      if (!shouldUseFallback(error)) throw error;
      const res = await fetch(
        `${BREAKUP_FIELDS_FALLBACK_BASE}${BREAKUP_FIELDS_ENDPOINT}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body || {}),
        },
      );
      return await parseFallbackResponse(res);
    }
  },
  deleteBreakupField: async (key = "") => {
    const safeKey = encodeURIComponent(String(key || "").trim());
    if (!safeKey) {
      throw new Error("Field key is required");
    }
    try {
      return await apiClient.delete(`${BREAKUP_FIELDS_ENDPOINT}/${safeKey}`);
    } catch (error) {
      if (!shouldUseFallback(error)) throw error;
      const res = await fetch(
        `${BREAKUP_FIELDS_FALLBACK_BASE}${BREAKUP_FIELDS_ENDPOINT}/${safeKey}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );
      return await parseFallbackResponse(res);
    }
  },
  getAnalyticsOverview: async (params = {}) => {
    return await apiClient.get("/api/loans/analytics/overview", { params });
  },
  getAnalyticsDrilldown: async (params = {}) => {
    return await apiClient.get("/api/loans/analytics/drilldown", { params });
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
    const endpoint = "/api/loans/counters/rc-inv/next";
    try {
      return await apiClient.get(endpoint);
    } catch (error) {
      if (!shouldUseFallback(error)) throw error;
      const res = await fetch(`${BREAKUP_FIELDS_FALLBACK_BASE}${endpoint}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      return await parseFallbackResponse(res);
    }
  },
};

export const disburseLoan = async (id, data) => {
  return await loansApi.disburse(id, data);
};
