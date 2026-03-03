import { apiClient } from "./client";

const CANDIDATE_ARRAY_KEYS = [
  "data",
  "vehicles",
  "items",
  "results",
  "rows",
  "list",
  "makes",
  "models",
  "variants",
];

const firstArrayFromObject = (obj) => {
  if (!obj || typeof obj !== "object") return null;

  for (const key of CANDIDATE_ARRAY_KEYS) {
    if (Array.isArray(obj[key])) return obj[key];
  }

  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) return value;
  }

  return null;
};

const normalizeArrayData = (payload) => {
  if (Array.isArray(payload)) return payload;

  const direct = firstArrayFromObject(payload);
  if (direct) return direct;

  const nestedData = firstArrayFromObject(payload?.data);
  if (nestedData) return nestedData;

  const nestedPayload = firstArrayFromObject(payload?.payload);
  if (nestedPayload) return nestedPayload;

  return [];
};

const withNormalizedData = (payload, data) => {
  if (Array.isArray(payload)) return { data };
  return { ...(payload || {}), data };
};

export const vehiclesApi = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const payload = await apiClient.get(`/api/vehicles?${query}`);
    return withNormalizedData(payload, normalizeArrayData(payload));
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
    const payload = await apiClient.get("/api/vehicles/distinct/makes");
    return withNormalizedData(payload, normalizeArrayData(payload));
  },

  getUniqueModels: async (make) => {
    const payload = await apiClient.get(
      `/api/vehicles/distinct/models?make=${encodeURIComponent(make)}`,
    );
    return withNormalizedData(payload, normalizeArrayData(payload));
  },

  getUniqueVariants: async (make, model) => {
    const payload = await apiClient.get(
      `/api/vehicles/distinct/variants?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`
    );
    return withNormalizedData(payload, normalizeArrayData(payload));
  },

  getVariantsWithPrice: async (make, model, city = null) => {
    let url = `/api/vehicles/distinct/variants-with-price?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
    if (city) url += `&city=${encodeURIComponent(city)}`;
    const payload = await apiClient.get(url);
    return withNormalizedData(payload, normalizeArrayData(payload));
  },

  getByDetails: async (make, model, variant, fuel = null, city = null) => {
    let url = `/api/vehicles/by-details?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&variant=${encodeURIComponent(variant)}`;
    if (fuel) url += `&fuel=${encodeURIComponent(fuel)}`;
    if (city) url += `&city=${encodeURIComponent(city)}`;
    const payload = await apiClient.get(url);

    // Keep backward-compatible shape for consumers expecting { success, data }.
    if (payload && typeof payload === "object" && "success" in payload) {
      return payload;
    }
    if (payload && typeof payload === "object" && "data" in payload) {
      return { success: true, data: payload.data };
    }
    if (payload && typeof payload === "object" && "vehicle" in payload) {
      return { success: true, data: payload.vehicle };
    }
    return { success: !!payload, data: payload || null };
  },

  getMedia: async (make, model, variant = null) => {
    let url = `/api/vehicles/media?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
    if (variant) url += `&variant=${encodeURIComponent(variant)}`;
    const payload = await apiClient.get(url);
    return withNormalizedData(payload, normalizeArrayData(payload));
  },
};
