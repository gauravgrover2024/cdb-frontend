const FALLBACK_API_BASE_URL = "https://cdb-api.vercel.app";

const rawApiBase = String(process.env.REACT_APP_API_BASE_URL || "").trim();
const normalizedApiBase = rawApiBase.replace(/\/+$/, "");

const API_BASE_URL = normalizedApiBase || FALLBACK_API_BASE_URL;

if (!normalizedApiBase) {
  console.warn(
    `⚠️ REACT_APP_API_BASE_URL is not set. Falling back to ${FALLBACK_API_BASE_URL}`,
  );
}

export default API_BASE_URL;
