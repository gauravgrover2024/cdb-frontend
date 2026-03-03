// NEW (Vercel production backend)

const API_BASE_URL = "https://cdb-api.vercel.app";

console.log("API_BASE_URL at runtime:", API_BASE_URL);

const getHeaders = (options) => {
  const base = { "Content-Type": "application/json" };
  if (options && options.Authorization) {
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
      throw new Error(data.error || data.message || "API Request Failed");
    }
    return data;
  } catch (e) {
    if (!res.ok) throw new Error(text || "API Request Failed");
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
  get: async (endpoint, options = {}) => {
    const query = buildQuery(options.params || {});
    const url = `${API_BASE_URL}${endpoint}${query}`;

    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(options),
    });
    return handleResponse(res);
  },

  post: async (endpoint, body, options) => {
    // 🌐 LOG NETWORK REQUEST
    console.log(`\n🌐 API POST REQUEST: ${endpoint}`);
    console.log("  URL:", `${API_BASE_URL}${endpoint}`);
    console.log("  Body Size:", JSON.stringify(body).length, "bytes");
    console.log("  Field Count:", Object.keys(body || {}).length);
    console.log("  Sample Fields:", {
      customerName: body?.customerName,
      primaryMobile: body?.primaryMobile,
      vehicleModel: body?.vehicleModel,
      isFinanced: body?.isFinanced,
    });

    const startTime = Date.now();
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: getHeaders(options),
      body: JSON.stringify(body),
    });
    const duration = Date.now() - startTime;

    console.log(
      `✅ Response received in ${duration}ms - Status: ${res.status}\n`,
    );
    return handleResponse(res);
  },

  put: async (endpoint, body, options) => {
    console.log(`\n🌐 API PUT REQUEST: ${endpoint}`);
    console.log("  URL:", `${API_BASE_URL}${endpoint}`);
    console.log("  Body Size:", JSON.stringify(body).length, "bytes");
    console.log("  Field Count:", Object.keys(body || {}).length);

    const startTime = Date.now();
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: getHeaders(options),
      body: JSON.stringify(body),
    });
    const duration = Date.now() - startTime;

    console.log(
      `✅ Response received in ${duration}ms - Status: ${res.status}\n`,
    );
    return handleResponse(res);
  },

  delete: async (endpoint, options) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: getHeaders(options),
    });
    return handleResponse(res);
  },
};
