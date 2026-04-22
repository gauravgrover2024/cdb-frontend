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

  syncReceivable: async (id) => {
    return await apiClient.post(
      `/api/insurance/${encodeURIComponent(String(id || "").trim())}/sync-receivable`,
    );
  },

  getPayoutRate: async ({ companyName, onDate } = {}) => {
    return await apiClient.get("/api/insurance/payout-rates", {
      params: { companyName, onDate },
    });
  },

  upsertPayoutRate: async (payload = {}) => {
    return await apiClient.post("/api/insurance/payout-rates", payload);
  },

  getNextTempRegistration: async () => {
    return await apiClient.post("/api/insurance/temp-registration/next");
  },

  resolveVehicleCubicCapacity: async (payload = {}) => {
    return await apiClient.post(
      "/api/insurance/vehicle-cubic-capacity/resolve",
      payload,
    );
  },

  findPotentialVehicleMatch: async (payload = {}) => {
    return await apiClient.post("/api/insurance/vehicle-match/potential", payload);
  },

  mergeVehicleMatch: async (payload = {}) => {
    return await apiClient.post("/api/insurance/vehicle-match/merge", payload);
  },

  appendPayment: async (id, payload = {}, options = {}) => {
    const idempotencyKey =
      String(options?.idempotencyKey || payload?.idempotencyKey || "").trim() || undefined;

    return await apiClient.post(
      `/api/insurance/${encodeURIComponent(String(id || "").trim())}/payments`,
      payload,
      {
        ...(options || {}),
        headers: {
          ...(options?.headers || {}),
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
      },
    );
  },
};
