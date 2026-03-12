import { banksApi } from "../api/banks";

const IFSC_BANK_CODE_MAP = {
  HDFC: "HDFC Bank",
  ICIC: "ICICI Bank",
  SBIN: "State Bank of India",
  UTIB: "Axis Bank",
  KKBK: "Kotak Mahindra Bank",
  FDRL: "Federal Bank",
  PUNB: "Punjab National Bank",
  CNRB: "Canara Bank",
  IDIB: "Indian Bank",
  BARB: "Bank of Baroda",
  BKID: "Bank of India",
  UBIN: "Union Bank of India",
  INDB: "IndusInd Bank",
  YESB: "Yes Bank",
  IDFB: "IDFC First Bank",
  MAHB: "Bank of Maharashtra",
};

// MICR format: CCCBBBXXX where BBB is bank code.
// This map is intentionally conservative for common banks used in our flows.
const MICR_BANK_CODE_MAP = {
  "002": "State Bank of India",
  "012": "Bank of Baroda",
  "013": "Bank of India",
  "015": "Canara Bank",
  "019": "Indian Bank",
  "026": "Union Bank of India",
  "176": "Punjab National Bank",
  "211": "Axis Bank",
  "229": "ICICI Bank",
  "237": "IndusInd Bank",
  "240": "HDFC Bank",
  "425": "Federal Bank",
  "485": "Kotak Mahindra Bank",
  "532": "Yes Bank",
  "760": "IDFC First Bank",
};

const cache = new Map();
const cacheKey = (kind, value) => `${kind}:${String(value || "")}`;

export const normalizeIfsc = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 11);

export const inferBankNameFromIfsc = (ifsc) => {
  const normalized = normalizeIfsc(ifsc);
  const code = normalized.slice(0, 4);
  return IFSC_BANK_CODE_MAP[code] || "";
};

export const normalizeMicr = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 9);

export const inferBankNameFromMicr = (micr) => {
  const normalized = normalizeMicr(micr);
  if (normalized.length !== 9) return "";
  const bankCode = normalized.slice(3, 6);
  return MICR_BANK_CODE_MAP[bankCode] || "";
};

export const isValidIfsc = (ifsc) =>
  /^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizeIfsc(ifsc));

export const lookupIfscDetails = async (ifsc) => {
  const normalized = normalizeIfsc(ifsc);
  if (!isValidIfsc(normalized)) return null;
  const key = cacheKey("ifsc", normalized);
  if (cache.has(key)) return cache.get(key);

  let details = null;
  try {
    const res = await banksApi.lookup({ ifsc: normalized });
    const data = res?.data || res;
    if (data) {
      details = {
        ifsc: normalized,
        micr: normalizeMicr(data?.micr || ""),
        bankName: String(data?.bankName || data?.BANK || "").trim(),
        branch: String(data?.branch || data?.BRANCH || "").trim(),
        address: String(data?.address || data?.ADDRESS || "").trim(),
        city: String(data?.city || data?.CITY || "").trim(),
      };
    }
  } catch {
    // Ignore backend/API errors; fallback below.
  }

  if (!details) {
    details = {
      ifsc: normalized,
      bankName: inferBankNameFromIfsc(normalized),
      branch: "",
      address: "",
      city: "",
    };
  }

  cache.set(key, details);
  return details;
};

export const lookupMicrDetails = async (micr) => {
  const normalized = normalizeMicr(micr);
  if (normalized.length !== 9) return null;
  const key = cacheKey("micr", normalized);
  if (cache.has(key)) return cache.get(key);

  let details = null;
  try {
    const res = await banksApi.lookup({ micr: normalized });
    const data = res?.data || res;
    if (data) {
      details = {
        ifsc: normalizeIfsc(data?.ifsc || ""),
        micr: normalized,
        bankName: String(data?.bankName || "").trim(),
        branch: String(data?.branch || "").trim(),
        address: String(data?.address || "").trim(),
        city: String(data?.city || "").trim(),
      };
    }
  } catch {
    // Ignore backend/API errors; fallback below.
  }

  if (!details) {
    details = {
      ifsc: "",
      micr: normalized,
      bankName: inferBankNameFromMicr(normalized),
      branch: "",
      address: "",
      city: "",
    };
  }

  cache.set(key, details);
  return details;
};
