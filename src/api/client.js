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
  
  // Try to get token from sessionStorage
  let token = null;
  try {
    token = sessionStorage.getItem("token");
  } catch (e) {
    console.warn("Could not access sessionStorage:", e);
  }
  
  // Use token from sessionStorage or from options.Authorization
  if (token) {
    base["Authorization"] = `Bearer ${token}`;
  } else if (options && options.Authorization) {
    base["Authorization"] = options.Authorization;
  }
  
  return base;
};

// Helper for consistent error handling
const handleResponse = async (res) => {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (!res.ok) {
      const error = new Error(data.error || data.message || "API Request Failed");
      error.status = res.status;
      error.statusText = res.statusText;
      error.payload = data;
      throw error;
    }
    return data;
  } catch (e) {
    if (!res.ok) {
      const error = e instanceof Error ? e : new Error(text || "API Request Failed");
      error.status = res.status;
      error.statusText = res.statusText;
      error.payload = text;
      throw error;
    }
    return {};
  }
};

// Helper to build query string from params
const buildQuery = (params = {}) => {
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

  delete: async (endpoint, options) => {
    const res = await fetch(buildUrl(endpoint), {
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
