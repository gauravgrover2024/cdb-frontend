const API_BASE_URL = String(process.env.REACT_APP_API_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");

if (!API_BASE_URL) {
  console.warn("⚠️ REACT_APP_API_BASE_URL is not set in .env file");
}

export default API_BASE_URL;
