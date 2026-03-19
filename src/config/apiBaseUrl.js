const API_BASE_URL = String(
  process.env.REACT_APP_API_BASE_URL || "https://cdb-api.vercel.app",
)
  .trim()
  .replace(/\/+$/, "");

export default API_BASE_URL;
