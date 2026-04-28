import { apiClient } from "./client";

const isLocalBrowserHost = () => {
  if (typeof window === "undefined") return false;
  const host = String(window.location?.hostname || "");
  return (
    /^(localhost|127\.0\.0\.1)$/i.test(host) ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host)
  );
};

const getAuthHeader = () => {
  try {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token") || "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const directLocalFallback = async (endpoint, params = {}, signal) => {
  if (!isLocalBrowserHost() || typeof window === "undefined") return null;
  const host = window.location.hostname;
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
  });
  const url = `http://${host}:5050${endpoint}${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Search fallback failed (${res.status})`);
  }
  return res.json();
};

const runGetWithFallback = async (endpoint, params, signal) => {
  try {
    return await apiClient.get(endpoint, { params, signal });
  } catch (error) {
    const status = Number(error?.status || 0);
    const shouldFallback =
      status === 404 || /not found/i.test(String(error?.message || ""));
    if (!shouldFallback) throw error;
    const localPayload = await directLocalFallback(endpoint, params, signal);
    if (!localPayload) throw error;
    return localPayload;
  }
};

export const searchApi = {
  global: async (
    query,
    { limit = 40, perEntityLimit = 8, signal } = {},
  ) => {
    const q = String(query || "").trim();
    return runGetWithFallback(
      "/api/search",
      {
        q,
        limit,
        perEntityLimit,
      },
      signal,
    );
  },
  assist: async (
    query,
    { limit = 50, perEntityLimit = 10, signal } = {},
  ) => {
    const q = String(query || "").trim();
    return runGetWithFallback(
      "/api/search/assist",
      {
        q,
        limit,
        perEntityLimit,
      },
      signal,
    );
  },
};

export default searchApi;
