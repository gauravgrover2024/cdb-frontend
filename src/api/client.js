import API_BASE_URL from "../config/apiBaseUrl";

// API base resolution:
// 1) explicit env override
// 2) deployed backend fallback


const buildUrl = (endpoint, params = {}) => {
  const query = buildQuery(params);
  const normalizedEndpoint = String(endpoint || "");

  if (/^https?:\/\//i.test(normalizedEndpoint)) {
    return `${normalizedEndpoint}${query}`;
  }

  return `${API_BASE_URL}${normalizedEndpoint}${query}`;
};

const getHeaders = (options) => {
  const base = { "Content-Type": "application/json" };
  
  // Try to get token (localStorage-first for new-tab persistence)
  let token = null;
  try {
    token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");
  } catch (e) {
    console.warn("Could not access storage:", e);
  }
  
  // Use token from sessionStorage or from options.Authorization
  if (token) {
    base["Authorization"] = `Bearer ${token}`;
  } else if (options && options.Authorization) {
    base["Authorization"] = options.Authorization;
  }
  
  return base;
};

const tryParseJson = (text) => {
  if (!text || typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// Helper for consistent error handling
const handleResponse = async (res) => {
  const text = await res.text();
  const data = tryParseJson(text);

  if (!res.ok) {
    const message =
      data?.error ||
      data?.message ||
      text ||
      "API Request Failed";
    const error = new Error(message);
    error.status = res.status;
    error.statusText = res.statusText;
    error.payload = data || text;
    throw error;
  }

  return data ?? {};
};

// Helper to build query string from params
const buildQuery = (params = {}) => {
  if (typeof params === "string" || params instanceof String) {
    const raw = String(params || "");
    if (!raw) return "";
    return raw.startsWith("?") ? raw : `?${raw}`;
  }
  if (params instanceof URLSearchParams) {
    const raw = params.toString();
    return raw ? `?${raw}` : "";
  }
  if (params === null || params === undefined) return "";
  if (typeof params !== "object") {
    const raw = String(params || "");
    if (!raw) return "";
    return raw.startsWith("?") ? raw : `?${raw}`;
  }
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (!entries.length) return "";
  const qs = new URLSearchParams();
  entries.forEach(([k, v]) => qs.append(k, String(v)));
  return `?${qs.toString()}`;
};

export const apiClient = {
  request: async ({ endpoint, method = "GET", params = {}, body, options = {} }) => {
    const url = buildUrl(endpoint, params);
    const requestInit = {
      method,
      headers: getHeaders(options),
    };

    if (body !== undefined) {
      requestInit.body = JSON.stringify(body);
    }
    if (options?.signal) {
      requestInit.signal = options.signal;
    }

    const res = await fetch(url, requestInit);
    return handleResponse(res);
  },

  get: async (endpoint, options = {}) => {
    const url = buildUrl(endpoint, options.params || {});

    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(options),
      signal: options?.signal,
    });
    return handleResponse(res);
  },

  post: async (endpoint, body, options) => {

    const res = await fetch(buildUrl(endpoint), {
      method: "POST",
      headers: getHeaders(options),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  put: async (endpoint, body, options) => {

    const res = await fetch(buildUrl(endpoint), {
      method: "PUT",
      headers: getHeaders(options),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  patch: async (endpoint, body, options) => {
    const res = await fetch(buildUrl(endpoint), {
      method: "PATCH",
      headers: getHeaders(options),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  delete: async (endpoint, options) => {
    const res = await fetch(buildUrl(endpoint, options?.params || {}), {
      method: "DELETE",
      headers: getHeaders(options),
    });
    return handleResponse(res);
  },

  upload: async (endpoint, formData, options = {}) => {
    const headers = { ...(options.Authorization ? { Authorization: options.Authorization } : {}) };
    const res = await fetch(buildUrl(endpoint, options.params || {}), {
      method: "POST",
      headers,
      body: formData,
    });
    return handleResponse(res);
  },

  getBlob: async (endpoint, options = {}) => {
    const res = await fetch(buildUrl(endpoint, options.params || {}), {
      method: "GET",
      headers: getHeaders(options),
    });

    if (!res.ok) {
      const text = await res.text();
      const error = new Error(text || "API Request Failed");
      error.status = res.status;
      error.statusText = res.statusText;
      throw error;
    }

    return res.blob();
  },
};

export { buildUrl };
