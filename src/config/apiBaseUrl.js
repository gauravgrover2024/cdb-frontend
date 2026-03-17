const isLocalHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (isLocalHost ? "http://localhost:5050" : "https://cdb-api.vercel.app");

export default API_BASE_URL;
