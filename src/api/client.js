const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";


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
    // If it's valid JSON but success is false (depending on backend standard), handle here
    // Our backend returns { success: true/false }
    return {}; // Return empty object if parse failed
  }
};

export const apiClient = {
  get: async (endpoint, options) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: getHeaders(options),
    });
    return handleResponse(res);
  },

  post: async (endpoint, body, options) => {
    // 🌐 LOG NETWORK REQUEST
    console.log(`\n🌐 API POST REQUEST: ${endpoint}`);
    console.log('  URL:', `${API_BASE_URL}${endpoint}`);
    console.log('  Body Size:', JSON.stringify(body).length, 'bytes');
    console.log('  Field Count:', Object.keys(body || {}).length);
    console.log('  Sample Fields:', {
      customerName: body.customerName,
      primaryMobile: body.primaryMobile,
      vehicleModel: body.vehicleModel,
      isFinanced: body.isFinanced
    });
    
    const startTime = Date.now();
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: getHeaders(options),
      body: JSON.stringify(body),
    });
    const duration = Date.now() - startTime;
    
    console.log(`✅ Response received in ${duration}ms - Status: ${res.status}\n`);
    return handleResponse(res);
  },

  put: async (endpoint, body, options) => {
    // 🌐 LOG NETWORK REQUEST
    console.log(`\n🌐 API PUT REQUEST: ${endpoint}`);
    console.log('  URL:', `${API_BASE_URL}${endpoint}`);
    console.log('  Body Size:', JSON.stringify(body).length, 'bytes');
    console.log('  Field Count:', Object.keys(body || {}).length);
    
    const startTime = Date.now();
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: getHeaders(options),
      body: JSON.stringify(body),
    });
    const duration = Date.now() - startTime;
    
    console.log(`✅ Response received in ${duration}ms - Status: ${res.status}\n`);
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
