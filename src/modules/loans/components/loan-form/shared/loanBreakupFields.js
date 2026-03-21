export const DEFAULT_LOAN_BREAKUP_FIELDS = [
  { key: "netLoanApproved", label: "Net Loan Amount Approved", order: 1, isDefault: true, canDelete: false, inUseCount: 0 },
  { key: "creditAssuredFinance", label: "Credit Assured Finance", order: 2, isDefault: true, canDelete: false, inUseCount: 0 },
  { key: "insuranceFinance", label: "Insurance Finance", order: 3, isDefault: true, canDelete: false, inUseCount: 0 },
  { key: "extendedWarrantyFinance", label: "Extended Warranty Finance", order: 4, isDefault: true, canDelete: false, inUseCount: 0 },
];

export const DEFAULT_LOAN_BREAKUP_FIELD_KEYS = new Set(
  DEFAULT_LOAN_BREAKUP_FIELDS.map((field) => field.key),
);

export const toLoanBreakupNumber = (value) => {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatLabelFromKey = (key = "") =>
  String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const sanitizeKey = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const cleaned = raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
  if (!cleaned) return "";
  return cleaned
    .split(/\s+/)
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");
};

export const buildLoanBreakupFieldDefinitions = (apiFields = []) => {
  const map = new Map(
    DEFAULT_LOAN_BREAKUP_FIELDS.map((field) => [field.key, { ...field }]),
  );
  (Array.isArray(apiFields) ? apiFields : []).forEach((field, index) => {
    const key = sanitizeKey(field?.key || field?.name || "");
    if (!key || DEFAULT_LOAN_BREAKUP_FIELD_KEYS.has(key)) return;
    const label = String(field?.label || field?.name || "").trim() || formatLabelFromKey(key);
    const order = Number(field?.order);
    map.set(key, {
      key,
      label,
      order: Number.isFinite(order) ? order : 1000 + index,
      isDefault: false,
      canDelete: field?.canDelete === true,
      inUseCount: Number(field?.inUseCount || 0),
    });
  });
  return [...map.values()].sort((a, b) => {
    const orderDelta = Number(a.order || 0) - Number(b.order || 0);
    if (orderDelta !== 0) return orderDelta;
    return String(a.label || "").localeCompare(String(b.label || ""));
  });
};

export const normalizeLoanBreakupCustomFields = (values = [], definitions = []) => {
  const defsMap = new Map(
    (Array.isArray(definitions) ? definitions : []).map((field) => [
      sanitizeKey(field?.key || ""),
      field,
    ]),
  );
  const normalizedMap = new Map();
  (Array.isArray(values) ? values : []).forEach((row) => {
    const key = sanitizeKey(row?.key || row?.name || "");
    if (!key || DEFAULT_LOAN_BREAKUP_FIELD_KEYS.has(key)) return;
    const def = defsMap.get(key);
    const label =
      String(row?.label || "").trim() ||
      String(def?.label || "").trim() ||
      formatLabelFromKey(key);
    normalizedMap.set(key, {
      key,
      label,
      value: toLoanBreakupNumber(row?.value),
    });
  });
  return [...normalizedMap.values()];
};

export const sumLoanBreakupCustomFields = (values = []) =>
  (Array.isArray(values) ? values : []).reduce(
    (sum, row) => sum + toLoanBreakupNumber(row?.value),
    0,
  );
