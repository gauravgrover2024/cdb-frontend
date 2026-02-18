/**
 * Indian Standard currency and number formatting
 * - Currency: ₹ (INR) with Indian numbering (lakhs/crores: 2-2-3 digit groups)
 * - Use for all Amount, Price, Money display and input formatters
 */

/**
 * Format amount as Indian Rupees (₹) with Indian number system (en-IN)
 * e.g. 1234567 → ₹12,34,567
 * @param {number|string} amount
 * @param {{ maxFractionDigits?: number }} options
 * @returns {string}
 */
export const formatINR = (amount, options = {}) => {
  const n = Number(String(amount || 0).replace(/[^0-9.-]/g, "")) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: options.maxFractionDigits ?? 0,
    minimumFractionDigits: options.minFractionDigits,
  }).format(n);
};

/**
 * Format a plain number with Indian grouping (no currency symbol)
 * e.g. 1234567 → 12,34,567
 * @param {number|string} value
 * @returns {string}
 */
export const formatIndianNumber = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.floor(n));
};

/**
 * Parser for input fields: strip ₹ and commas (Indian or Western)
 * @param {string} value
 * @returns {string} digits only
 */
export const parseINRInput = (value) => {
  if (value == null) return "";
  return String(value).replace(/₹\s?|[,]/g, "").trim();
};

/**
 * Formatter for Ant Design InputNumber: display with ₹ and Indian grouping
 * @param {string|number} value
 * @returns {string}
 */
export const formatINRInput = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const parsed = parseINRInput(String(value));
  const num = Number(parsed);
  if (!Number.isFinite(num) || isNaN(num)) return "";
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.floor(num));
  return `₹ ${formatted}`;
};
