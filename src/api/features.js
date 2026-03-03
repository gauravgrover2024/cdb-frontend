import { apiClient } from "./client";

export const featuresApi = {
  getVariantsWithPrice: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = query
      ? `/api/features/variants-with-price?${query}`
      : "/api/features/variants-with-price";
    const payload = await apiClient.get(url);

    // Normalize backend response so callers can reliably use `res.data`.
    if (Array.isArray(payload)) {
      return { data: payload };
    }
    if (Array.isArray(payload?.data)) {
      return payload;
    }
    if (Array.isArray(payload?.data?.data)) {
      return { ...payload, data: payload.data.data };
    }

    return { ...payload, data: [] };
  },

  getBySelection: async ({ make, model, variant, vehicleId } = {}) => {
    const query = new URLSearchParams();
    if (make) query.set("make", make);
    if (model) query.set("model", model);
    if (variant) query.set("variant", variant);
    if (vehicleId) query.set("vehicleId", vehicleId);

    const payload = await apiClient.get(
      `/api/features/by-selection?${query.toString()}`,
    );

    if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
      return payload;
    }

    return { ...payload, data: [] };
  },
};
