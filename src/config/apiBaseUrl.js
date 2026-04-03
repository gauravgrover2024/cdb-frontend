const FALLBACK_API_BASE_URL = "https://cdb-api.vercel.app";

const rawApiBase = String(process.env.REACT_APP_API_BASE_URL || "").trim();
const normalizedApiBase = rawApiBase.replace(/\/+$/, "");
const isLocalApiBase = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
  normalizedApiBase,
);
const isBrowser = typeof window !== "undefined";
const isBrowserOnLocalhost =
  isBrowser &&
  /^(localhost|127\.0\.0\.1)$/i.test(String(window.location?.hostname || ""));

const API_BASE_URL =
  normalizedApiBase && !(isLocalApiBase && !isBrowserOnLocalhost)
    ? normalizedApiBase
    : FALLBACK_API_BASE_URL;

if (!normalizedApiBase) {
  console.warn(
    `⚠️ REACT_APP_API_BASE_URL is not set. Falling back to ${FALLBACK_API_BASE_URL}`,
  );
} else if (isLocalApiBase && !isBrowserOnLocalhost) {
  console.warn(
    `⚠️ REACT_APP_API_BASE_URL (${normalizedApiBase}) is localhost on a non-local browser. Falling back to ${FALLBACK_API_BASE_URL}`,
  );
}

export default API_BASE_URL;
