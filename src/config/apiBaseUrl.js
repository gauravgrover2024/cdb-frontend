const FALLBACK_API_BASE_URL = "https://cdb-api.vercel.app";

const normalizeBase = (raw) =>
  String(raw || "")
    .trim()
    .replace(/\/+$/, "");

const envBase = normalizeBase(process.env.REACT_APP_API_BASE_URL);
const isBrowser = typeof window !== "undefined";
const browserHost = isBrowser ? String(window.location?.hostname || "") : "";
const isBrowserLocal =
  /^(localhost|127\.0\.0\.1)$/i.test(browserHost) ||
  /^192\.168\./.test(browserHost) ||
  /^10\./.test(browserHost);

// Resolution rules (simple + reliable):
// 1) If REACT_APP_API_BASE_URL is set in .env, always use it (highest priority)
// 2) Else, if running on a local network/localhost browser, default to backend on :5050.
// 3) Else, fall back to deployed backend (Vercel).
let API_BASE_URL;

if (envBase) {
  // .env variable is set and has a value
  API_BASE_URL = envBase;
} else if (isBrowserLocal && browserHost) {
  // Not set in .env, but running locally → use localhost:5050
  API_BASE_URL = `http://${browserHost}:5050`;
} else {
  // Not set and not local → use Vercel fallback
  API_BASE_URL = FALLBACK_API_BASE_URL;
}

if (!envBase && isBrowserLocal) {
  console.warn(
    `⚠️ REACT_APP_API_BASE_URL is not set. Auto-detecting local backend at http://${browserHost}:5050`,
  );
} else if (!envBase) {
  console.warn(
    `⚠️ REACT_APP_API_BASE_URL is not set. Falling back to ${FALLBACK_API_BASE_URL}`,
  );
}

export default API_BASE_URL;
