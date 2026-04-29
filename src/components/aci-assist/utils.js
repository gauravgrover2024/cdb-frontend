export const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
};

export const pick = (source, keys, fallback = undefined) => {
  if (!source || typeof source !== "object") return fallback;
  for (const key of keys) {
    const value = source[key];
    if (value && typeof value === "object" && (value.hidden || value.restricted)) {
      continue;
    }
    const resolved = value && typeof value === "object" && "value" in value ? value.value : value;
    if (resolved !== undefined && resolved !== null && resolved !== "") return resolved;
  }
  return fallback;
};

export const compactObject = (obj = {}) =>
  Object.fromEntries(
    Object.entries(obj || {}).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );

export const humanize = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatCurrency = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return value || "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
};

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const joinValues = (value) => {
  const arr = asArray(value).filter(Boolean);
  return arr.length ? arr.join(", ") : "—";
};

export const isActionDestructive = (action = {}) => {
  const text = `${action.type || ""} ${action.action || ""} ${action.label || ""}`.toLowerCase();
  return /(update|whatsapp|sms|email|create task|assign|change status|mark payout|delete|edit field|send)/i.test(text);
};

export const normalizeActionType = (action = {}) => action.type || action.action || action.key || "";

export const knownRouteAllowed = (route) => {
  const path = String(route || "").split("?")[0];
  if (!path.startsWith("/")) return false;
  const exact = new Set([
    "/",
    "/analytics",
    "/aci-assist",
    "/insurance",
    "/insurance/new",
    "/customers",
    "/customers/new",
    "/loans",
    "/loans/new",
    "/loans/pendency",
    "/used-cars",
    "/used-cars/procurement",
    "/used-cars/inspection",
    "/used-cars/background-check",
    "/used-cars/negotiation",
    "/used-cars/documentation",
    "/used-cars/stock",
    "/loans/emi-calculator",
    "/loans/quotations",
    "/loans/features",
    "/loans/field-mapping",
    "/payouts/receivables",
    "/payouts/payables",
    "/delivery-orders",
    "/payments",
    "/bookings",
    "/bookings/new",
    "/vehicles",
    "/vehicles/manage",
    "/vehicles/price-list",
    "/vehicles/mapping",
    "/profile",
    "/superadmin/users",
    "/superadmin/showrooms",
    "/superadmin/channels",
    "/superadmin/banks",
  ]);
  if (exact.has(path)) return true;
  return [
    /^\/insurance\/edit\/[^/]+$/,
    /^\/customers\/edit\/[^/]+$/,
    /^\/loans\/edit\/[^/]+$/,
    /^\/payments\/[^/]+$/,
    /^\/bookings\/[^/]+$/,
    /^\/bookings\/edit\/[^/]+$/,
    /^\/payments\/bookings\/[^/]+$/,
    /^\/payments\/bookings\/edit\/[^/]+$/,
    /^\/delivery-orders\/[^/]+$/,
    /^\/superadmin\/showrooms\/[^/]+$/,
    /^\/superadmin\/banks\/[^/]+$/,
  ].some((pattern) => pattern.test(path));
};

export const routeWithParams = (route, queryParams) => {
  if (!route) return "";
  const [path, existing] = String(route).split("?");
  const params = new URLSearchParams(existing || "");
  Object.entries(queryParams || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};
