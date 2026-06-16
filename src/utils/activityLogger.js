const STORAGE_KEY = "aci_activity_log";
const MAX_ENTRIES = 600;

export const ActivityType = {
  PAGE_VISIT: "page_visit",
  LOGIN: "login",
  LOGOUT: "logout",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  EXPORT: "export",
  SEARCH: "search",
  PRINT: "print",
  ERROR: "error",
};

// Map route prefixes → human-readable module names
const PATH_MODULE_MAP = [
  ["/insurance/new", "Insurance"],
  ["/insurance/edit", "Insurance"],
  ["/insurance/renewals", "Insurance"],
  ["/insurance", "Insurance"],
  ["/customers/new", "Customers"],
  ["/customers/edit", "Customers"],
  ["/customers/profile", "Customers"],
  ["/customers", "Customers"],
  ["/loans/new", "Loans"],
  ["/loans/edit", "Loans"],
  ["/loans/pendency", "Loans"],
  ["/loans/emi-calculator", "Tools"],
  ["/loans/quotations", "Tools"],
  ["/loans/features", "Tools"],
  ["/loans/field-mapping", "Tools"],
  ["/loans", "Loans"],
  ["/payments/bookings", "Bookings"],
  ["/payments/new-booking", "Bookings"],
  ["/payments", "Payments"],
  ["/bookings/new", "Bookings"],
  ["/bookings/edit", "Bookings"],
  ["/bookings", "Bookings"],
  ["/delivery-orders", "Delivery Orders"],
  ["/payouts/receivables", "Finance"],
  ["/payouts/payables", "Finance"],
  ["/payouts", "Finance"],
  ["/vehicles/price-list", "Tools"],
  ["/vehicles/mapping", "Tools"],
  ["/vehicles", "Vehicles"],
  ["/fleet-vehicles", "Fleet"],
  ["/used-cars/inspection", "Used Cars"],
  ["/used-cars/background-check", "Used Cars"],
  ["/used-cars/negotiation", "Used Cars"],
  ["/used-cars/documentation", "Used Cars"],
  ["/used-cars/stock", "Used Cars"],
  ["/used-cars", "Used Cars"],
  ["/aci-assist", "ACI Assist"],
  ["/analytics", "Analytics"],
  ["/profile", "Profile"],
  ["/superadmin/users", "Control Panel"],
  ["/superadmin/showrooms", "Control Panel"],
  ["/superadmin/channels", "Control Panel"],
  ["/superadmin/banks", "Control Panel"],
  ["/superadmin/activity-log", "Control Panel"],
  ["/superadmin", "Control Panel"],
  ["/", "Dashboard"],
];

const PATH_LABEL_MAP = [
  ["/insurance/new", "New Insurance Case"],
  ["/insurance/edit", "Edit Insurance Case"],
  ["/insurance/renewals", "Insurance Renewals"],
  ["/insurance", "Insurance Dashboard"],
  ["/customers/new", "New Customer Registration"],
  ["/customers/edit", "Edit Customer"],
  ["/customers/profile", "Customer Profile"],
  ["/customers", "Customer Dashboard"],
  ["/loans/new", "New Loan Application"],
  ["/loans/edit", "Edit Loan"],
  ["/loans/pendency", "Pendency Tracker"],
  ["/loans/emi-calculator", "EMI Calculator"],
  ["/loans/quotations", "Quotations"],
  ["/loans/features", "Features Catalog"],
  ["/loans/field-mapping", "Field Mapping"],
  ["/loans", "Loan Dashboard"],
  ["/payments/bookings", "Booking"],
  ["/payments/new-booking", "New Booking"],
  ["/payments", "Payments Dashboard"],
  ["/bookings/new", "New Booking"],
  ["/bookings/edit", "Edit Booking"],
  ["/bookings", "Bookings Dashboard"],
  ["/delivery-orders", "Delivery Orders"],
  ["/payouts/receivables", "Receivables"],
  ["/payouts/payables", "Payables"],
  ["/vehicles/price-list", "Vehicle Price List"],
  ["/vehicles/mapping", "Vehicle Mapping"],
  ["/vehicles", "Vehicle Master"],
  ["/fleet-vehicles", "Fleet Master"],
  ["/used-cars/inspection", "Used Cars – Inspection"],
  ["/used-cars/background-check", "Used Cars – Background Check"],
  ["/used-cars/negotiation", "Used Cars – Negotiation"],
  ["/used-cars/documentation", "Used Cars – Documentation"],
  ["/used-cars/stock", "Used Cars – Stock"],
  ["/used-cars", "Used Cars – Lead Intake"],
  ["/aci-assist", "ACI Assist"],
  ["/analytics", "Analytics Dashboard"],
  ["/profile", "My Profile"],
  ["/superadmin/users", "User Management"],
  ["/superadmin/showrooms", "Showrooms"],
  ["/superadmin/channels", "Channels"],
  ["/superadmin/banks", "Banks"],
  ["/superadmin/activity-log", "Activity Log"],
  ["/superadmin", "Control Panel"],
  ["/", "Dashboard"],
];

export function resolveModule(pathname) {
  for (const [prefix, label] of PATH_MODULE_MAP) {
    if (pathname === prefix || pathname.startsWith(prefix + "/") || (prefix === "/" && pathname === "/")) {
      return label;
    }
  }
  return "App";
}

export function resolvePageLabel(pathname) {
  for (const [prefix, label] of PATH_LABEL_MAP) {
    if (pathname === prefix || pathname.startsWith(prefix + "/") || (prefix === "/" && pathname === "/")) {
      return label;
    }
  }
  return pathname;
}

function readRaw() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeRaw(entries) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage quota exceeded — trim and retry
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 100)));
    } catch {}
  }
}

export function logActivity({ type, action, detail = "", module = "", meta = {} }) {
  const existing = readRaw();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    type,
    action,
    detail,
    module,
    meta,
  };
  writeRaw([entry, ...existing]);
}

export function logPageVisit(pathname) {
  const label = resolvePageLabel(pathname);
  const mod = resolveModule(pathname);
  logActivity({
    type: ActivityType.PAGE_VISIT,
    action: `Visited ${label}`,
    detail: pathname,
    module: mod,
  });
}

export function getActivityLog() {
  return readRaw();
}

export function clearActivityLog() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function exportLogAsCSV(entries) {
  const headers = ["Timestamp", "Type", "Module", "Action", "Detail"];
  const rows = entries.map((e) => [
    new Date(e.timestamp).toLocaleString("en-IN"),
    e.type,
    e.module,
    e.action,
    e.detail,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `activity_log_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
