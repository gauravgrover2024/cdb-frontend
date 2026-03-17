import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  message as staticMessage,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import softwareSchema from "../schema/loan-module.schema.json";
import vehicleCleanupIndex from "../data/vehicle_make_model_cleanup.safe_index.json";
import { submitMappedLoan } from "../../../api/fieldMapping";
import API_BASE_URL from "../../../config/apiBaseUrl";

const { Text, Title } = Typography;
const MAX_MATRIX_TARGET_SLOTS = 25;
const BULK_POST_MAX_RETRIES = 2;
const BULK_POST_INTER_CASE_DELAY_MS = 80;
const MATRIX_ROLE_OPTIONS = [
  { label: "Mapping", value: "Mapping" },
  ...Array.from({ length: 24 }, (_, i) => ({
    label: `Fallback${i + 1}`,
    value: `Fallback${i + 1}`,
  })),
];

const normalizeKey = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const safeKey = (name = "") =>
  String(name)
    .replace(/\.json$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "file";

const digitsOnly = (v) => String(v || "").replace(/\D/g, "").trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeNameLoose = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const REG_CITY_BY_PREFIX = {
  UP16: "Noida",
  UP14: "Ghaziabad",
  UP13: "Ghaziabad",
  UP15: "Meerut",
  DL01: "Delhi",
  DL1: "Delhi",
  DL2: "Delhi",
  DL3: "Delhi",
  DL4: "Delhi",
  DL5: "Delhi",
  DL6: "Delhi",
  DL7: "Delhi",
  HR26: "Gurgaon",
  HR51: "Faridabad",
};

const getValueByPath = (obj, path) => {
  if (!obj || !path) return undefined;

  return String(path)
    .split(".")
    .reduce((acc, part) => {
      if (acc === null || acc === undefined) return undefined;
      if (Array.isArray(acc)) {
        const idx = Number(part);
        if (Number.isInteger(idx)) return acc[idx];
      }
      if (Object.prototype.hasOwnProperty.call(acc, part)) return acc[part];
      const directLower = String(part).toLowerCase();
      const fuzzyKey = Object.keys(acc).find(
        (k) => String(k).toLowerCase() === directLower,
      );
      return fuzzyKey ? acc[fuzzyKey] : undefined;
    }, obj);
};

const stripNumericSuffix = (s = "") => String(s).replace(/_\d+$/g, "");

const getValueByPathWithNumericAlias = (obj, path) => {
  const direct = getValueByPath(obj, path);
  if (direct !== undefined) return direct;
  if (!obj || !path) return undefined;

  const parts = String(path).split(".");
  const tail = parts.pop();
  if (!tail) return undefined;
  const parentPath = parts.join(".");
  const parent = parentPath ? getValueByPath(obj, parentPath) : obj;
  if (!parent || typeof parent !== "object" || Array.isArray(parent)) return undefined;

  const targetNorm = normalizeKey(stripNumericSuffix(tail));
  const keyHit = Object.keys(parent).find((k) => normalizeKey(stripNumericSuffix(k)) === targetNorm);
  return keyHit ? parent[keyHit] : undefined;
};

const shouldHideLegacyCodeGroupPath = (path = "") => {
  const p = String(path || "");
  if (!p) return false;
  const parts = p.split(".");
  const tail = String(parts[parts.length - 1] || "").toUpperCase();
  if (tail === "TEMP_CUST_CODE") return false;
  return (
    tail.includes("CODE") ||
    tail.includes("GROUP") ||
    tail.includes("STATUS") ||
    tail.includes("AGEING") ||
    tail.includes("AGING")
  );
};

const isMeaningfulValue = (v) =>
  v !== undefined &&
  v !== null &&
  !(typeof v === "string" && v.trim() === "");

const getValueFromCaseMerged = (merged, sourcePath) => {
  if (!merged || !sourcePath) return undefined;
  const [head, ...rest] = String(sourcePath).split(".");
  const tailPath = rest.join(".");
  const headVal = merged?.[head];

  if (Array.isArray(headVal)) {
    let firstDefined;
    for (const row of headVal) {
      const candidate = tailPath ? getValueByPathWithNumericAlias(row, tailPath) : row;
      if (firstDefined === undefined && candidate !== undefined) firstDefined = candidate;
      if (isMeaningfulValue(candidate)) return candidate;
    }
    return firstDefined;
  }

  if (headVal && typeof headVal === "object") {
    return tailPath ? getValueByPathWithNumericAlias(headVal, tailPath) : headVal;
  }

  return getValueByPathWithNumericAlias(merged, sourcePath);
};

const normalizeLegacyInstrumentType = (value) => {
  const t = String(value || "").trim().toUpperCase();
  if (!t) return "";
  if (t.includes("CHEQUE") || t.includes("CHQ") || t.includes("PDC")) return "CHEQUE";
  if (t.includes("ECS")) return "ECS";
  if (t === "SI" || t.includes("STANDING INSTRUCTION")) return "SI";
  if (t.includes("NACH") || t.includes("MANDATE")) return "NACH";
  return "";
};

const resolveInstrumentAwareValue = (merged, targetField, sourcePath) => {
  if (!merged || !targetField || !sourcePath) return getValueFromCaseMerged(merged, sourcePath);
  const [head, ...rest] = String(sourcePath).split(".");
  const tailPath = rest.join(".");
  const rows = merged?.[head];
  if (!Array.isArray(rows) || !tailPath) return getValueFromCaseMerged(merged, sourcePath);

  const pickFromRows = (filteredRows, index = 0) => {
    const row = filteredRows[index];
    if (!row) return undefined;
    return getValueByPathWithNumericAlias(row, tailPath);
  };

  const instrumentRows = rows.filter((r) => r && typeof r === "object");
  if (!instrumentRows.length) return getValueFromCaseMerged(merged, sourcePath);

  const typedRows = instrumentRows.map((row) => ({
    row,
    type: normalizeLegacyInstrumentType(
      row.INSTRMNT_TYPE || row.instrmnt_type || row.instrument_type || row.InstrumentType,
    ),
  }));

  const chequeMatch = String(targetField).match(/^cheque_(\d+)_/i);
  if (chequeMatch) {
    const slotIndex = Math.max(0, Number(chequeMatch[1]) - 1);
    const chequeRows = typedRows
      .filter(({ row, type }) => {
        if (type === "CHEQUE") return true;
        if (!type) return !!(row.INSTRMNT_NO || row.instrmnt_no || row.CHEQUE_NO || row.cheque_no);
        return false;
      })
      .map(({ row }) => row);
    const v = pickFromRows(chequeRows, slotIndex);
    if (v !== undefined) return v;
    return getValueFromCaseMerged(merged, sourcePath);
  }

  if (String(targetField).startsWith("ecs_")) {
    const ecsRows = typedRows.filter(({ type }) => type === "ECS").map(({ row }) => row);
    const v = pickFromRows(ecsRows, 0);
    if (v !== undefined) return v;
    return getValueFromCaseMerged(merged, sourcePath);
  }

  if (String(targetField).startsWith("si_")) {
    const siRows = typedRows.filter(({ type }) => type === "SI").map(({ row }) => row);
    const v = pickFromRows(siRows, 0);
    if (v !== undefined) return v;
    return getValueFromCaseMerged(merged, sourcePath);
  }

  return getValueFromCaseMerged(merged, sourcePath);
};

const findFirstValueByTail = (merged, tailCandidates = []) => {
  if (!merged || !tailCandidates.length) return undefined;
  const allPaths = new Set();
  Object.entries(merged).forEach(([fileKey, value]) => {
    if (Array.isArray(value)) {
      value.forEach((row) => flattenObject(row, fileKey, allPaths));
    } else {
      flattenObject(value, fileKey, allPaths);
    }
  });

  const candidates = [...allPaths];
  for (const tail of tailCandidates) {
    const tailNorm = normalizeKey(tail);
    const hitPath = candidates.find((p) => {
      const parts = String(p).split(".");
      const pathTail = parts[parts.length - 1] || "";
      return normalizeKey(pathTail) === tailNorm;
    });
    if (hitPath) {
      const val = getValueFromCaseMerged(merged, hitPath);
      if (isMeaningfulValue(val)) return val;
    }
  }
  return undefined;
};

const joinNonEmptyParts = (...parts) =>
  parts
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(", ");

const pickVehicleCleanupCandidateByName = (candidates, customerName) => {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  if (candidates.length === 1) return candidates[0];
  const target = normalizeNameLoose(customerName);
  if (!target) return null;
  return (
    candidates.find((c) => {
      const name = normalizeNameLoose(c?.customer_name);
      return name && (name === target || name.includes(target) || target.includes(name));
    }) || null
  );
};

const resolveVehicleCleanupOverride = (merged, caseId, customerName) => {
  if (!vehicleCleanupIndex || !merged) return null;
  const tempCandidates = [
    caseId,
    findFirstValueByTail(merged, ["TEMP_CUST_CODE"]),
  ]
    .map(digitsOnly)
    .filter(Boolean);
  const cdbCandidates = [
    caseId,
    findFirstValueByTail(merged, ["CDB_ACCOUNT_NO", "CDB_ACCOUNT_NUMBER", "CDB_AC_NO"]),
  ]
    .map(digitsOnly)
    .filter(Boolean);
  const cpvCandidates = [findFirstValueByTail(merged, ["CPV_ACCOUNT_NO", "CPV_AC_NO"])]
    .map(digitsOnly)
    .filter(Boolean);

  for (const id of [...new Set(tempCandidates)]) {
    const hit = vehicleCleanupIndex?.by_temp_cust_code?.[id];
    if (hit) return hit;
  }
  for (const id of [...new Set(cdbCandidates)]) {
    const hit = vehicleCleanupIndex?.by_cdb_account_no?.[id];
    if (hit) return hit;
  }
  for (const id of [...new Set(cpvCandidates)]) {
    const list = vehicleCleanupIndex?.by_cpv_account_no_candidates?.[id];
    if (!Array.isArray(list) || !list.length) continue;
    const byName = pickVehicleCleanupCandidateByName(list, customerName);
    if (byName) return byName;
    if (list.length === 1) return list[0];
  }
  return null;
};

const detectLegacyChequeCount = (merged) => {
  if (!merged || typeof merged !== "object") return 0;
  const rows = [];
  Object.values(merged).forEach((value) => {
    const list = Array.isArray(value) ? value : [value];
    list.forEach((row) => {
      if (!row || typeof row !== "object") return;
      const keys = Object.keys(row).map((k) => String(k).toUpperCase());
      const hasInstrumentShape =
        keys.some((k) => k.includes("INSTRMNT")) ||
        keys.includes("DRAWN_ON") ||
        keys.includes("ACCOUNT_NUMBER") ||
        keys.includes("MICR_CODE");
      if (hasInstrumentShape) rows.push(row);
    });
  });

  if (!rows.length) return 0;

  const chequeRows = rows.filter((row) => {
    const typeRaw =
      row.INSTRMNT_TYPE ||
      row.instrmnt_type ||
      row.instrument_type ||
      row.InstrumentType ||
      "";
    const type = String(typeRaw).trim().toUpperCase();
    if (type.includes("CHEQUE") || type.includes("CHQ") || type.includes("PDC")) return true;
    if (!type) {
      // Some legacy rows omit type but still carry cheque number.
      return !!(row.INSTRMNT_NO || row.instrmnt_no || row.cheque_no || row.CHEQUE_NO);
    }
    return false;
  });

  return Math.min(20, chequeRows.length);
};

const capChequeFieldsByCount = (doc, maxCheques) => {
  if (!doc || typeof doc !== "object") return;
  const keepUpto = Math.max(0, Math.min(20, Number(maxCheques) || 0));
  for (let i = keepUpto + 1; i <= 20; i += 1) {
    [
      "number",
      "bankName",
      "accountNumber",
      "date",
      "amount",
      "tag",
      "favouring",
      "signedBy",
      "image",
    ].forEach((suffix) => {
      delete doc[`cheque_${i}_${suffix}`];
    });
  }
};

const pruneEmptyChequeRows = (doc) => {
  if (!doc || typeof doc !== "object") return;
  const suffixes = [
    "number",
    "bankName",
    "accountNumber",
    "date",
    "amount",
    "tag",
    "favouring",
    "signedBy",
    "image",
  ];

  const isFilled = (v) => {
    if (v === undefined || v === null) return false;
    if (typeof v === "number") return Number.isFinite(v) && v !== 0;
    const s = String(v).trim();
    if (!s) return false;
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    if (!Number.isNaN(n) && s === "0") return false;
    return true;
  };

  for (let i = 1; i <= 20; i += 1) {
    const rowHasValue = suffixes.some((suffix) => isFilled(doc[`cheque_${i}_${suffix}`]));
    if (!rowHasValue) {
      suffixes.forEach((suffix) => delete doc[`cheque_${i}_${suffix}`]);
    }
  }
};

const normalizeInstrumentType = (rawValue) => {
  const v = String(rawValue || "").trim().toUpperCase();
  if (!v) return "";
  if (v.includes("CHEQUE") || v.includes("CHQ") || v.includes("PDC")) return "Cheque";
  if (v.includes("ECS")) return "ECS";
  if (v === "SI" || v.includes("STANDING INSTRUCTION")) return "SI";
  if (v.includes("NACH") || v.includes("E-MANDATE") || v.includes("MANDATE")) return "NACH";
  return "";
};

const detectLegacyInstrumentType = (merged) => {
  if (!merged || typeof merged !== "object") return "";
  const counts = new Map();
  Object.values(merged).forEach((value) => {
    const rows = Array.isArray(value) ? value : [value];
    rows.forEach((row) => {
      if (!row || typeof row !== "object") return;
      const candidate =
        row.INSTRMNT_TYPE ||
        row.instrmnt_type ||
        row.instrument_type ||
        row.InstrumentType;
      const t = normalizeInstrumentType(candidate);
      if (!t) return;
      counts.set(t, (counts.get(t) || 0) + 1);
    });
  });
  if (!counts.size) return "";
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

const collectLegacyInstrumentRows = (merged) => {
  if (!merged || typeof merged !== "object") return [];
  const rows = [];
  Object.values(merged).forEach((value) => {
    const list = Array.isArray(value) ? value : [value];
    list.forEach((row) => {
      if (!row || typeof row !== "object") return;
      const keys = Object.keys(row).map((k) => String(k).toUpperCase());
      const hasInstrumentShape =
        keys.some((k) => k.includes("INSTRMNT")) ||
        keys.includes("DRAWN_ON") ||
        keys.includes("ACCOUNT_NUMBER") ||
        keys.includes("MICR_CODE");
      if (hasInstrumentShape) rows.push(row);
    });
  });
  return rows;
};

const normalizeInstrumentPartyLite = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  if (text.includes("grntr") || text.includes("guarantor")) return "Guarantor";
  if (text.includes("co")) return "Co-applicant";
  return "Applicant";
};

const buildInstrumentFallbackFromLegacy = (merged, approvalBank = "") => {
  const rows = collectLegacyInstrumentRows(merged);
  if (!rows.length) return {};

  const typedRows = rows.map((row) => ({
    row,
    type: normalizeLegacyInstrumentType(
      row.INSTRMNT_TYPE || row.instrmnt_type || row.instrument_type || row.InstrumentType,
    ),
  }));

  const chequeRows = typedRows
    .filter(({ row, type }) => {
      if (type === "CHEQUE") return true;
      if (!type) {
        return !!(row.INSTRMNT_NO || row.instrmnt_no || row.CHEQUE_NO || row.cheque_no);
      }
      return false;
    })
    .map(({ row }) => row);
  const siRow = typedRows.find(({ type }) => type === "SI")?.row;
  const ecsRow = typedRows.find(({ type }) => type === "ECS")?.row;
  const nachRow = typedRows.find(({ type }) => type === "NACH")?.row;

  const out = {};
  const resolvedType = siRow
    ? "SI"
    : ecsRow
      ? "ECS"
      : nachRow
        ? "NACH"
        : chequeRows.length
          ? "Cheque"
          : "";
  if (!resolvedType) return out;
  out.instrumentType = resolvedType;

  if (siRow) {
    out.si_accountNumber = String(siRow.ACCOUNT_NUMBER || "").trim();
    out.si_signedBy = normalizeInstrumentPartyLite(siRow.INSTRMNT_BY_BORWR_GRNTR);
  }
  if (nachRow) {
    out.nach_accountNumber = String(nachRow.ACCOUNT_NUMBER || "").trim();
    out.nach_signedBy = normalizeInstrumentPartyLite(nachRow.INSTRMNT_BY_BORWR_GRNTR);
  }
  if (ecsRow) {
    out.ecs_micrCode = String(ecsRow.MICR_CODE || "").trim();
    out.ecs_bankName = normalizeBankNameValue(ecsRow.DRAWN_ON);
    out.ecs_accountNumber = String(ecsRow.ACCOUNT_NUMBER || "").trim();
    out.ecs_date = String(ecsRow.INSTRMNT_DATE || ecsRow.ENTERED_ON_DATE || "").trim();
    out.ecs_amount = castNumber(ecsRow.INSTRMNT_AMOUNT, false);
    out.ecs_tag = String(ecsRow.INSTRMNT_FAVOURING || "").trim();
    out.ecs_favouring = normalizeBankNameValue(approvalBank);
    out.ecs_signedBy = normalizeInstrumentPartyLite(ecsRow.INSTRMNT_BY_BORWR_GRNTR);
  }

  chequeRows.slice(0, 20).forEach((row, index) => {
    const i = index + 1;
    out[`cheque_${i}_number`] = String(row.INSTRMNT_NO || row.INSTRMNT_RECPT_ID_NO || "").trim();
    out[`cheque_${i}_bankName`] = normalizeBankNameValue(row.DRAWN_ON);
    out[`cheque_${i}_accountNumber`] = String(row.ACCOUNT_NUMBER || "").trim();
    out[`cheque_${i}_date`] = String(row.INSTRMNT_DATE || row.ENTERED_ON_DATE || "").trim();
    out[`cheque_${i}_amount`] = castNumber(row.INSTRMNT_AMOUNT, false);
    out[`cheque_${i}_tag`] = String(row.INSTRMNT_FAVOURING || "").trim();
    out[`cheque_${i}_favouring`] = normalizeBankNameValue(approvalBank);
    out[`cheque_${i}_signedBy`] = normalizeInstrumentPartyLite(row.INSTRMNT_BY_BORWR_GRNTR);
  });

  return out;
};

const pruneInstrumentPayload = (doc, instrumentType) => {
  if (!doc || typeof doc !== "object") return;
  const type = normalizeInstrumentType(instrumentType);
  if (!type) return;

  const deleteCheque = () => {
    for (let i = 1; i <= 20; i += 1) {
      [
        "number",
        "bankName",
        "accountNumber",
        "date",
        "amount",
        "tag",
        "favouring",
        "signedBy",
        "image",
      ].forEach((suffix) => delete doc[`cheque_${i}_${suffix}`]);
    }
  };
  const deleteEcs = () => {
    [
      "ecs_micrCode",
      "ecs_bankName",
      "ecs_accountNumber",
      "ecs_date",
      "ecs_amount",
      "ecs_tag",
      "ecs_favouring",
      "ecs_signedBy",
      "ecs_image",
    ].forEach((k) => delete doc[k]);
  };
  const deleteSi = () => {
    ["si_accountNumber", "si_signedBy", "si_image"].forEach((k) => delete doc[k]);
  };
  const deleteNach = () => {
    ["nach_accountNumber", "nach_signedBy", "nach_image"].forEach((k) => delete doc[k]);
  };

  if (type === "Cheque") {
    deleteEcs();
    deleteSi();
    deleteNach();
  } else if (type === "ECS") {
    deleteCheque();
    deleteSi();
    deleteNach();
  } else if (type === "SI") {
    deleteCheque();
    deleteEcs();
    deleteNach();
  } else if (type === "NACH") {
    deleteCheque();
    deleteEcs();
    deleteSi();
  }
};

const flattenObject = (obj, prefix = "", out = new Set()) => {
  if (obj === null || obj === undefined) return out;

  if (Array.isArray(obj)) {
    if (!obj.length) return out;
    flattenObject(obj[0], prefix, out);
    return out;
  }

  if (typeof obj !== "object") {
    if (prefix) out.add(prefix);
    return out;
  }

  Object.entries(obj).forEach(([key, val]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    const keyAlias = stripNumericSuffix(key);
    const nextAlias = keyAlias && keyAlias !== key ? (prefix ? `${prefix}.${keyAlias}` : keyAlias) : "";

    if (Array.isArray(val)) {
      out.add(next);
      if (nextAlias) out.add(nextAlias);
      if (val[0] && typeof val[0] === "object") flattenObject(val[0], next, out);
      return;
    }

    if (val && typeof val === "object") {
      flattenObject(val, next, out);
      return;
    }

    out.add(next);
    if (nextAlias) out.add(nextAlias);
  });

  return out;
};

const collectRecordsFromJson = (data) => {
  if (Array.isArray(data)) return data.filter((x) => x && typeof x === "object");
  if (!data || typeof data !== "object") return [];

  const hintKeys = ["data", "records", "items", "loans", "results", "result"];
  for (const key of hintKeys) {
    if (Array.isArray(data[key])) {
      return data[key].filter((x) => x && typeof x === "object");
    }
  }

  for (const val of Object.values(data)) {
    if (Array.isArray(val) && val.length && typeof val[0] === "object") {
      return val.filter((x) => x && typeof x === "object");
    }
  }

  return [data];
};

const stringifyValue = (value) => {
  if (value === undefined) return "(no value)";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const downloadTextFile = (filename, content, type = "application/json") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const castBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(v)) return true;
    if (["false", "0", "no", "n"].includes(v)) return false;
  }
  return null;
};

const castNumber = (value, isInteger = false) => {
  if (typeof value === "number") return isInteger ? Math.trunc(value) : value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    if (!cleaned) return null;
    const num = Number(cleaned);
    if (Number.isNaN(num)) return null;
    return isInteger ? Math.trunc(num) : num;
  }
  return null;
};

const shouldFallbackToString = (schemaNode) => {
  const hints = Array.isArray(schemaNode?.["x-typeHints"]) ? schemaNode["x-typeHints"] : [];
  const hintSet = new Set(hints.map((h) => String(h).toLowerCase()));
  return (
    hintSet.has("string") ||
    hintSet.has("text") ||
    hintSet.has("date") ||
    hintSet.has("enum") ||
    hintSet.has("unknown")
  );
};

const castBySchemaType = (value, schemaNode) => {
  if (value === undefined) return null;
  if (!schemaNode || !schemaNode.type) return value;

  const type = Array.isArray(schemaNode.type)
    ? schemaNode.type.find((t) => t !== "null") || schemaNode.type[0]
    : schemaNode.type;

  switch (type) {
    case "string":
      if (value === null) return null;
      return String(value);
    case "number":
      {
        const n = castNumber(value, false);
        if (n !== null) return n;
        if (
          value !== null &&
          value !== undefined &&
          String(value).trim() !== "" &&
          shouldFallbackToString(schemaNode)
        ) {
          return String(value).trim();
        }
        return null;
      }
    case "integer":
      {
        const n = castNumber(value, true);
        if (n !== null) return n;
        if (
          value !== null &&
          value !== undefined &&
          String(value).trim() !== "" &&
          shouldFallbackToString(schemaNode)
        ) {
          return String(value).trim();
        }
        return null;
      }
    case "boolean":
      {
        const b = castBoolean(value);
        if (b !== null) return b;
        if (
          value !== null &&
          value !== undefined &&
          String(value).trim() !== "" &&
          shouldFallbackToString(schemaNode)
        ) {
          return String(value).trim();
        }
        return null;
      }
    case "object":
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
        } catch {
          return null;
        }
      }
      return null;
    case "array":
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [value];
        } catch {
          return [value];
        }
      }
      return value === null ? [] : [value];
    default:
      return value;
  }
};

const listPaneStyle = {
  border: "1px solid #f0f0f0",
  borderRadius: 10,
  minHeight: 430,
  maxHeight: 430,
  overflow: "auto",
  background: "#fff",
};

const DEFAULT_IDENTIFIER_HINTS = [
  "CPV_ACCOUNT_NO",
  "CDB_ACCOUNT_NO",
  "CDB_ACCOUNT_NUMBER",
  "CDB_AC_NO",
  "CDB_NO",
  "TEMP_CUST_CODE",
  "cpv_account_no",
  "cdb_account_no",
  "cdb_account_number",
  "cdb_ac_no",
  "cdb_no",
  "temp_cust_code",
  "cpvNo",
  "cdbNo",
  "loanId",
  "caseId",
];

const PROFILE_STORAGE_KEY = "loanFieldMappingProfilesV1";
const WORK_DRAFT_STORAGE_KEY = "loanFieldMappingWorkingDraftV1";
const WORK_DRAFT_DB_NAME = "loanFieldMappingDB";
const WORK_DRAFT_DB_STORE = "drafts";
const WORK_DRAFT_DB_KEY = "working-draft";

const STAGE_ORDER = [
  { key: "customer-profile", rank: 1, label: "Customer Profile" },
  { key: "pre-file", rank: 2, label: "Pre-File" },
  { key: "loan-approval", rank: 3, label: "Approval" },
  { key: "post-file", rank: 4, label: "Post-File" },
  { key: "vehicle-delivery", rank: 5, label: "Delivery" },
];

const FIELD_UI_SOURCE_ORDER = [
  // Profile
  "src/modules/loans/components/loan-form/customer-profile/LeadDetails.jsx",
  "src/modules/loans/components/loan-form/customer-profile/VehicleDetailsForm.jsx",
  "src/modules/loans/components/loan-form/customer-profile/FinanceDetailsForm.jsx",
  "src/modules/loans/components/loan-form/PersonalDetailsWithSearch.jsx",
  "src/modules/customers/customer-form/EmploymentDetails.jsx",
  "src/modules/customers/customer-form/IncomeDetails.jsx",
  "src/modules/customers/customer-form/BankDetails.jsx",
  "src/modules/customers/customer-form/ReferenceDetails.jsx",
  "src/modules/customers/customer-form/KycDetails.jsx",
  // Pre-file
  "src/modules/loans/components/loan-form/pre-file/PersonalDetailsPreFile.jsx",
  "src/modules/loans/components/loan-form/pre-file/OccupationalDetailsPreFile.jsx",
  "src/modules/loans/components/loan-form/pre-file/IncomeBankingDetailsPreFile.jsx",
  "src/modules/loans/components/loan-form/pre-file/VehiclePricingLoanDetails.jsx",
  "src/modules/loans/components/loan-form/pre-file/Section7RecordDetails.jsx",
  "src/modules/loans/components/loan-form/pre-file/CoApplicantSection.jsx",
  "src/modules/loans/components/loan-form/pre-file/GuarantorSection.jsx",
  "src/modules/loans/components/loan-form/pre-file/AuthorisedSignatorySection.jsx",
  // Approval
  "src/modules/loans/components/loan-form/loan-approval/LoanApprovalStep.jsx",
  // Post-file
  "src/modules/loans/components/loan-form/post-file/PostFileApprovalDetails.jsx",
  "src/modules/loans/components/loan-form/post-file/PostFileVehicleVerification.jsx",
  "src/modules/loans/components/loan-form/post-file/PostFileInstrumentDetails.jsx",
  "src/modules/loans/components/loan-form/post-file/PostFileDispatchAndRecords.jsx",
  "src/modules/loans/components/loan-form/post-file/PostFileDocumentManagement.jsx",
  "src/modules/loans/components/loan-form/post-file/DocumentsList.jsx",
  // Delivery
  "src/modules/loans/components/loan-form/vehicle-delivery/VehicleDeliveryStep.jsx",
  // Payout
  "src/modules/loans/components/loan-form/payout/PayoutSection.jsx",
  "src/modules/loans/components/loan-form/payout/PayoutReceivablesDashboard.jsx",
  "src/modules/loans/components/loan-form/payout/PayoutPayablesDashboard.jsx",
];

// Schema x-typeHints has false positives (e.g. email marked enum), so use a strict whitelist.
const DROPDOWN_FIELD_WHITELIST = new Set([
  "applicantType",
  "caseType",
  "typeOfLoan",
  "usage",
  "constitutionType",
  "companyType",
  "professionalType",
  "occupationType",
  "natureOfBusiness",
  "addressType",
  "identityProofType",
  "addressProofType",
  "house",
  "education",
  "maritalStatus",
  "gender",
  "isFinanced",
  "isMSME",
  "hasCoApplicant",
  "hasGuarantor",
  "recordSource",
  "invoice_received_from",
  "invoice_received_as",
  "dispatch_mode",
  "instrumentType",
  "cheque_tag",
  "ecs_tag",
  "si_tag",
  "bankName",
  "approval_status",
  "insurance_by",
  "insurance_type",
  "insurance_company_name",
  "registration_city",
  "vehicleFuelType",
]);

// Alias/header compatibility fields: keep in backend but hide from mapping UI to reduce confusion.
const MAPPING_UI_HIDDEN_FIELDS = new Set([
  "_id",
  "vehicleChassisNo",
  "vehicleEngineNo",
  "vehicleRegNo",
  "customerMobile",
  "mobileNo",
  "customerEmail",
  "customerAddress",
  "customerPan",
  "customerAadhar",
  "guarantor_name",
  "coApplicant_name",
]);

// Some live form fields are used in flow but can be missing from derived schema.
// Keep them explicit so mapping UI always exposes them.
const EXTRA_TARGET_FIELDS = [
  "reference1_name",
  "reference1_mobile",
  "reference1_address",
  "reference1_pincode",
  "reference1_city",
  "reference1_relation",
  "reference2_name",
  "reference2_mobile",
  "reference2_address",
  "reference2_pincode",
  "reference2_city",
  "reference2_relation",
  "co_yearsAtCurrentResidence",
];

const COMPANY_PARTNER_SLOTS = 5;
const COMPANY_PARTNER_ATTRS = ["name", "panNumber", "contactNumber", "dateOfBirth"];
for (let i = 1; i <= COMPANY_PARTNER_SLOTS; i += 1) {
  COMPANY_PARTNER_ATTRS.forEach((attr) => {
    EXTRA_TARGET_FIELDS.push(`companyPartners_${i}_${attr}`);
  });
}

const EXTRA_TARGET_LOCATOR = {
  reference1_name: "Pre-File > PersonalDetailsPreFile > Reference 1 Name",
  reference1_mobile: "Pre-File > PersonalDetailsPreFile > Reference 1 Mobile",
  reference1_address: "Pre-File > PersonalDetailsPreFile > Reference 1 Address",
  reference1_pincode: "Pre-File > PersonalDetailsPreFile > Reference 1 Pincode",
  reference1_city: "Pre-File > PersonalDetailsPreFile > Reference 1 City",
  reference1_relation: "Pre-File > PersonalDetailsPreFile > Reference 1 Relation",
  reference2_name: "Pre-File > PersonalDetailsPreFile > Reference 2 Name",
  reference2_mobile: "Pre-File > PersonalDetailsPreFile > Reference 2 Mobile",
  reference2_address: "Pre-File > PersonalDetailsPreFile > Reference 2 Address",
  reference2_pincode: "Pre-File > PersonalDetailsPreFile > Reference 2 Pincode",
  reference2_city: "Pre-File > PersonalDetailsPreFile > Reference 2 City",
  reference2_relation: "Pre-File > PersonalDetailsPreFile > Reference 2 Relation",
  co_yearsAtCurrentResidence:
    "Pre-File > CoApplicantSection > Occupational Details > Years at current Residence",
};
for (let i = 1; i <= COMPANY_PARTNER_SLOTS; i += 1) {
  EXTRA_TARGET_LOCATOR[`companyPartners_${i}_name`] =
    `Pre-File > OccupationalDetailsPreFile > Partner/Director ${i} Name`;
  EXTRA_TARGET_LOCATOR[`companyPartners_${i}_panNumber`] =
    `Pre-File > OccupationalDetailsPreFile > Partner/Director ${i} PAN`;
  EXTRA_TARGET_LOCATOR[`companyPartners_${i}_contactNumber`] =
    `Pre-File > OccupationalDetailsPreFile > Partner/Director ${i} Contact`;
  EXTRA_TARGET_LOCATOR[`companyPartners_${i}_dateOfBirth`] =
    `Pre-File > OccupationalDetailsPreFile > Partner/Director ${i} DOB`;
}

const getFieldStageMeta = (sourceFiles = []) => {
  let best = { rank: 99, label: "Other" };
  sourceFiles.forEach((src) => {
    const hit = STAGE_ORDER.find((s) => String(src).includes(`/${s.key}/`));
    if (hit && hit.rank < best.rank) {
      best = { rank: hit.rank, label: hit.label };
    }
  });
  return best;
};

const getUiSourceRank = (sourceFiles = []) => {
  let best = Number.MAX_SAFE_INTEGER;
  sourceFiles.forEach((src) => {
    const idx = FIELD_UI_SOURCE_ORDER.findIndex((s) => String(src).includes(s));
    if (idx !== -1) best = Math.min(best, idx);
  });
  return best;
};

const getPreferredSourcePath = (sourceFiles = []) => {
  const files = (sourceFiles || []).map((x) => String(x || "")).filter(Boolean);
  if (!files.length) return "";

  const rank = (p) => {
    if (p.includes("/customers/customer-form/")) return 1;
    if (p.includes("/loan-form/")) return 2;
    if (p.includes("/LoanStickyHeader.jsx")) return 9;
    return 5;
  };

  return [...files].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))[0];
};

const getPrimarySourceFileName = (sourceFiles = []) => {
  const preferred = getPreferredSourcePath(sourceFiles);
  if (!preferred) return "UnknownFile";
  const base = preferred.split("/").pop() || "UnknownFile";
  return base.replace(/\.(jsx|tsx|js|ts)$/i, "");
};

const stableStringify = (value) => {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
};

const normalizeMapKey = (value) => String(value ?? "").trim().toLowerCase();

const getIdentifierTailNorm = (path = "") => {
  const parts = String(path || "").split(".");
  const tail = parts[parts.length - 1] || path;
  return normalizeKey(tail);
};

const isCpvIdentifierPath = (path = "") => {
  const t = getIdentifierTailNorm(path);
  return t === "cpvaccountno" || t === "cpvacno" || t === "cpvaccount";
};

const isStrongIdentifierPath = (path = "") => {
  const t = getIdentifierTailNorm(path);
  return (
    t === "tempcustcode" ||
    t === "cdbaccountno" ||
    t === "cdbaccountnumber" ||
    t === "cdbacno" ||
    t === "cdbno"
  );
};

const isStrictAutoIdentifierPath = (path = "") =>
  isStrongIdentifierPath(path) || isCpvIdentifierPath(path);

const applyNormalizationRule = (rawValue, rules = {}) => {
  const hasNonEmptyRule =
    rules.__NON_EMPTY__ !== undefined || rules.__non_empty__ !== undefined;
  const hasEmptyRule = rules.__EMPTY__ !== undefined || rules.__empty__ !== undefined;
  const isEmpty =
    rawValue === undefined ||
    rawValue === null ||
    (typeof rawValue === "string" && rawValue.trim() === "");

  if (isEmpty) {
    if (hasEmptyRule) return rules.__EMPTY__ ?? rules.__empty__;
    return rawValue;
  }
  const direct = rules[String(rawValue)];
  if (direct !== undefined && direct !== "") return direct;
  const normalized = rules[normalizeMapKey(rawValue)];
  if (normalized !== undefined && normalized !== "") return normalized;
  if (hasNonEmptyRule) return rules.__NON_EMPTY__ ?? rules.__non_empty__;
  return rawValue;
};

const normalizeTypeOfLoanValue = (rawValue) => {
  const text = String(rawValue || "").trim().toLowerCase();
  if (!text) return rawValue;
  if (text.includes("cash sale")) return "New Car";
  if (text.includes("cash-in") || text.includes("cash in")) return "Car Cash-in";
  if (text.includes("refinance") || text.includes("re-finance")) return "Refinance";
  if (text.includes("used")) return "Used Car";
  if (text.includes("new")) return "New Car";
  return rawValue;
};

const normalizeLegacyTimeValue = (rawValue) => {
  const text = String(rawValue ?? "").trim();
  if (!text) return rawValue;

  const normalized = text.replace(/\./g, ":").replace(/\s+/g, " ").toUpperCase();
  const ampmMatch = normalized.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)$/);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const minute = Number(ampmMatch[2] || 0);
    const ampm = ampmMatch[3];
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) {
      return rawValue;
    }
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    if (hour < 0 || hour > 23) return rawValue;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const hhmmMatch = normalized.match(/^(\d{1,2}):(\d{1,2})$/);
  if (hhmmMatch) {
    const hour = Number(hhmmMatch[1]);
    const minute = Number(hhmmMatch[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return rawValue;
    }
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  return rawValue;
};

const normalizeMaritalStatusValue = (rawValue) => {
  const v = String(rawValue || "").trim().toLowerCase();
  if (!v) return rawValue;
  if (v === "m" || v === "married") return "Married";
  if (v === "u" || v === "unmarried") return "Unmarried";
  return rawValue;
};

const normalizeBankNameValue = (rawValue) => {
  const text = String(rawValue ?? "").trim();
  if (!text) return rawValue;

  const upper = text.toUpperCase();
  if (upper.includes("HDFC")) return "HDFC Bank";
  if (upper.includes("ICICI")) return "ICICI Bank";
  if (upper.includes("AXIS")) return "Axis Bank";
  if (upper === "SBI" || upper.includes("STATE BANK")) return "State Bank of India";
  if (upper.includes("KOTAK")) return "Kotak Mahindra Bank";
  if (upper.includes("FEDERAL")) return "Federal Bank";
  if (upper.includes("PNB") || upper.includes("PUNJAB NATIONAL")) return "Punjab National Bank";
  if (upper.includes("YESBANK") || upper.includes("YES BANK")) return "Yes Bank";
  if (!/\bBANK\b/i.test(text) && /^[A-Z\s.&-]{2,}$/.test(text)) return `${text} Bank`;
  return text;
};

const normalizeOccupationValue = (rawValue) => {
  const text = String(rawValue ?? "").trim();
  if (!text) return rawValue;
  const lc = text.toLowerCase().replace(/[_-]+/g, " ");
  if (lc.includes("salaried")) return "Salaried";
  if (lc.includes("professional")) return "Self Employed Professional";
  if (lc.includes("self employed") || lc.includes("selfemployed")) return "Self Employed";
  return text;
};

const applyBuiltInNormalization = (targetField, rawValue) => {
  if (rawValue === undefined || rawValue === null) return rawValue;
  const target = String(targetField || "");
  if (
    target === "dispatch_time" ||
    target === "disbursement_time" ||
    target === "dispatchTime" ||
    target === "disbursementTime"
  ) {
    return normalizeLegacyTimeValue(rawValue);
  }
    if (
      target === "bankName" ||
      target === "approval_bankName" ||
      target === "postfile_bankName" ||
      target === "hypothecationBank" ||
      target === "ecs_bankName" ||
      /^cheque_\d+_bankName$/.test(target)
    ) {
      return normalizeBankNameValue(rawValue);
    }
    if (target === "vehicleFuelType") {
      const v = String(rawValue || "").trim().toLowerCase();
      if (!v) return rawValue;
      if (v.includes("petrol")) return "Petrol";
      if (v.includes("diesel") || v.includes("dsl")) return "Diesel";
      if (v.includes("cng")) return "CNG";
      if (v.includes("hybrid") || v.includes("hev") || v.includes("mhev")) return "Hybrid";
      if (v.includes("electric") || v === "ev") return "Electric";
      return rawValue;
    }
  switch (target) {
    case "typeOfLoan":
      return normalizeTypeOfLoanValue(rawValue);
    case "instrumentType":
      return normalizeInstrumentType(rawValue) || rawValue;
    case "isFinanced": {
      const v = String(rawValue).trim().toLowerCase();
      if (v.includes("cash sale") || v.includes("cash")) return "No";
      if (["yes", "y", "true", "1", "finance", "financed"].includes(v)) return "Yes";
      if (["no", "n", "false", "0"].includes(v)) return "No";
      if (v) return "Yes";
      return rawValue;
    }
    case "registerSameAsAadhaar":
    case "registerSameAsPermanent": {
      const v = String(rawValue).trim().toLowerCase();
      if (!v) return rawValue;
      if (
        v.includes("same as office") ||
        v.includes("same as gst") ||
        v.includes("same as resi") ||
        v.includes("same as aadhar") ||
        v.includes("same as aadhaar") ||
        v.includes("same as current") ||
        ["yes", "y", "true", "1"].includes(v)
      ) return "Yes";
      if (
        v.includes("different") ||
        v.includes("not same") ||
        ["no", "n", "false", "0"].includes(v)
      ) return "No";
      return rawValue;
    }
    case "insurance_by": {
      const v = String(rawValue).trim().toLowerCase();
      if (!v) return rawValue;
      if (
        v.includes("mnfg") ||
        v.includes("mfg") ||
        v.includes("manufacturer") ||
        v.includes("dealer") ||
        v.includes("showroom")
      ) {
        return "Showroom";
      }
      if (
        v.includes("autocredit") ||
        v.includes("auto credit") ||
        v.includes("aci")
      ) {
        return "Autocredits India LLP";
      }
      return rawValue;
    }
    case "accountType": {
      const v = String(rawValue).trim().toLowerCase();
      if (!v) return rawValue;
      if (v.includes("current") || v === "ca" || v.includes("c/a")) return "Current";
      if (v.includes("saving") || v === "sb" || v.includes("s/b")) return "Savings";
      return rawValue;
    }
    case "houseType":
    case "co_houseType": {
      const v = String(rawValue).trim().toLowerCase();
      if (!v) return rawValue;
      if (v === "your own" || v === "own" || v === "owned") return "Owned";
      if (v.includes("rent")) return "Rented";
      if (v.includes("parent")) return "Parental";
      if (v.includes("company")) return "Company Provided";
      return rawValue;
    }
    case "maritalStatus":
    case "co_maritalStatus":
      return normalizeMaritalStatusValue(rawValue);
    case "occupationType":
    case "co_occupation":
    case "gu_occupation":
      return normalizeOccupationValue(rawValue);
    default:
      return rawValue;
  }
};

const inferTypeOfLoanFromLegacy = (merged) => {
  const read = (...tails) => findFirstValueByTail(merged, tails);
  const text = String(
    read("CASE_TYPE", "CASE_TYPE_NAME", "CASE_TYPE_DESC") ||
      read(
        "TYPE_OF_LOAN",
        "LOAN_TYPE",
        "HIRE_PURPOSE",
        "PURPOSE_OF_LOAN",
        "LOAN_FOR",
      ) ||
      "",
  )
    .trim()
    .toLowerCase();

  if (text.includes("cash-in") || text.includes("cash in")) return "Car Cash-in";
  if (text.includes("refinance") || text.includes("re-finance")) return "Refinance";
  if (text.includes("used")) return "Used Car";
  if (text.includes("new")) return "New Car";

  const hpTo = read("HP_TO");
  const hpToText = String(hpTo || "").trim().toLowerCase();
  if (hpToText.includes("cash sale") || hpToText.includes("cash")) return "New Car";
  const loanAmount = castNumber(
    read("LOAN_AMOUNT", "APPLIED_LOAN_AMOUNT", "LOAN_EXPECTED"),
    false,
  );
  if (isMeaningfulValue(hpTo) || (loanAmount || 0) > 0) return "Used Car";

  return "New Car";
};

const inferIsFinancedFromLegacy = (merged, typeOfLoan) => {
  const read = (...tails) => findFirstValueByTail(merged, tails);
  const type = String(typeOfLoan || "").trim().toLowerCase();
  if (type === "car cash-in" || type === "refinance") return "Yes";

  const hpToText = String(read("HP_TO") || "").trim().toLowerCase();
  if (hpToText.includes("cash sale") || hpToText.includes("cash")) return "No";
  if (hpToText) return "Yes";

  const explicitFinance = String(
    read("IS_FINANCED", "FINANCE_REQUIRED", "FINANCED", "ISFINANCED") || "",
  )
    .trim()
    .toLowerCase();
  if (["no", "n", "false", "0"].includes(explicitFinance)) return "No";
  if (["yes", "y", "true", "1"].includes(explicitFinance)) return "Yes";

  const loanAmount = castNumber(
    read("LOAN_AMOUNT", "APPLIED_LOAN_AMOUNT", "LOAN_EXPECTED"),
    false,
  );
  if ((loanAmount || 0) > 0) return "Yes";
  return "No";
};

const inferAccountTypeFromLegacy = (merged) => {
  const ca = findFirstValueByTail(merged, ["CA_ACCOUNT_NO", "CURRENT_ACCOUNT_NO"]);
  const sb = findFirstValueByTail(merged, ["SB_ACCOUNT_NO", "SAVINGS_ACCOUNT_NO"]);
  if (isMeaningfulValue(ca)) return "Current";
  if (isMeaningfulValue(sb)) return "Savings";
  return "";
};

const joinNameParts = (...parts) =>
  parts
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const firstMeaningful = (...vals) => vals.find((v) => isMeaningfulValue(v));

const combineBusinessNature = (...parts) => {
  const seen = new Set();
  const out = [];
  parts.forEach((p) => {
    const v = String(p || "").trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(v);
  });
  return out.join(", ");
};

const extractReferencePincodeFromAddress = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  const sixDigit = text.match(/(\d{6})(?!.*\d)/);
  if (sixDigit) return sixDigit[1];
  const twoDigit = text.match(/(\d{2})(?!.*\d)/);
  if (twoDigit) return `1100${twoDigit[1]}`;
  return "";
};

const getRegistrationCityFromNumber = (registrationNumber) => {
  const normalized = String(registrationNumber || "")
    .toUpperCase()
    .replace(/\s+/g, "");
  if (!normalized) return "";
  const directKey = Object.keys(REG_CITY_BY_PREFIX).find((key) => normalized.startsWith(key));
  if (directKey) return REG_CITY_BY_PREFIX[directKey];
  if (normalized.startsWith("DL")) return "Delhi";
  return "";
};

const sameAddressLoose = (a, b) => {
  const norm = (v) =>
    String(v || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const na = norm(a);
  const nb = norm(b);
  return na && nb && na === nb;
};

const guessCityFromAddressLite = (value) => {
  const text = String(value || "").toUpperCase();
  if (!text) return "";
  const cityHints = [
    "NOIDA",
    "GHAZIABAD",
    "DELHI",
    "GREATER NOIDA",
    "GURGAON",
    "FARIDABAD",
    "MEERUT",
  ];
  const hit = cityHints.find((c) => text.includes(c));
  return hit || "";
};

const guessCityFromPincodeLite = (value) => {
  const pin = String(value || "").replace(/\D/g, "").slice(0, 6);
  if (!pin) return "";
  if (pin.startsWith("110")) return "Delhi";
  if (pin.startsWith("122")) return "Gurgaon";
  if (pin.startsWith("121")) return "Faridabad";
  if (pin.startsWith("2013")) return "Noida";
  if (pin.startsWith("2010")) return "Ghaziabad";
  return "";
};

const inferBankFromIfscLite = (value) => {
  const ifsc = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 11);
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return "";
  const code = ifsc.slice(0, 4);
  const map = {
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
  return map[code] || "";
};

const inferBankFromMicrLite = (value) => {
  const micr = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 9);
  if (micr.length !== 9) return "";
  const bankCode = micr.slice(3, 6);
  const map = {
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
  return map[bankCode] || "";
};

const inferUsageFromLegacy = (merged) => {
  const direct = firstMeaningful(
    findFirstValueByTail(merged, ["USAGE", "VEHICLE_USAGE", "VEHICLE_FOR", "USAGE_TYPE"]),
    "",
  );
  const text = String(direct || "").toLowerCase();
  if (/(commercial|taxi|cab|transport|permit|school)/.test(text)) return "Commercial";
  if (/(private|personal)/.test(text)) return "Private";

  // Broader signal fallback from a few common legacy fields.
  const broad = firstMeaningful(
    findFirstValueByTail(merged, ["CAR_MODEL", "PURPOSE_OF_LOAN", "CASE_TYPE", "MAKE_MODEL"]),
    "",
  );
  const broadText = String(broad || "").toLowerCase();
  if (/(commercial|taxi|cab|transport|permit|school)/.test(broadText)) return "Commercial";
  return "Private";
};

const defaultCompanyDesignation = (companyType) => {
  const t = String(companyType || "").trim().toLowerCase();
  if (t.includes("partnership") || t.includes("partner")) return "Partner";
  return "Director";
};

const addressSimilarityScore = (a, b) => {
  const norm = (v) =>
    String(v || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const ta = new Set(norm(a).split(" ").filter(Boolean));
  const tb = new Set(norm(b).split(" ").filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  ta.forEach((t) => {
    if (tb.has(t)) common += 1;
  });
  const denom = Math.max(ta.size, tb.size);
  return denom ? common / denom : 0;
};

const combineDateAndTimeForStatus = (dateValue, timeValue) => {
  const d = String(dateValue || "").trim();
  if (!d) return "";
  const t = String(timeValue || "").trim();
  if (!t) return d;
  const dm = d.match(/^(\d{4}-\d{2}-\d{2})/);
  const tm = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!dm || !tm) return `${d} ${t}`.trim();
  return `${dm[1]}T${String(tm[1]).padStart(2, "0")}:${tm[2]}:00.000Z`;
};

const yearsFromDateString = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) years -= 1;
  return years >= 0 ? years : null;
};

const normalizeResidenceYearsValue = (rawValue, dobValue) => {
  if (!isMeaningfulValue(rawValue)) return undefined;
  const text = String(rawValue).trim();
  if (!text) return undefined;

  if (text.toUpperCase() === "BB") {
    const age = yearsFromDateString(dobValue);
    return age !== null ? age : undefined;
  }

  const n = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : rawValue;
};

const isCompanyLikeValue = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return false;
  return [
    "company",
    "corporate",
    "firm",
    "proprietorship",
    "proprietor",
    "partnership",
    "pvt",
    "private limited",
    "ltd",
    "llp",
    "co.",
  ].some((k) => v.includes(k));
};

const isCompanyProfileDoc = (doc) => {
  if (!doc || typeof doc !== "object") return false;
  if (isCompanyLikeValue(doc.applicantType)) return true;
  if (isCompanyLikeValue(doc.constitutionType)) return true;
  if (isCompanyLikeValue(doc.companyType)) return true;
  if (isCompanyLikeValue(doc.companyName)) return true;
  if (isCompanyLikeValue(doc.customerName)) return true;
  return false;
};

const roleRank = (role = "") => {
  if (role === "Mapping") return 0;
  const m = String(role).match(/^Fallback(\d+)$/i);
  if (!m) return 999;
  return Number(m[1]);
};

const getMappingNoteKey = (sourcePath, targetField, role) =>
  `${String(sourcePath || "").trim()}::${String(targetField || "").trim()}::${String(role || "Mapping").trim()}`;

const readSavedProfiles = () => {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeSavedProfiles = (profiles) => {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
};

const readWorkingDraft = () => {
  try {
    const raw = localStorage.getItem(WORK_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const writeWorkingDraft = (draft) => {
  localStorage.setItem(WORK_DRAFT_STORAGE_KEY, JSON.stringify(draft));
};

const openDraftDb = () =>
  new Promise((resolve, reject) => {
    const idb = window?.indexedDB;
    if (!idb || typeof idb.open !== "function") {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const req = idb.open(WORK_DRAFT_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(WORK_DRAFT_DB_STORE)) {
        db.createObjectStore(WORK_DRAFT_DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
  });

const readWorkingDraftFromDb = async () => {
  try {
    const db = await openDraftDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(WORK_DRAFT_DB_STORE, "readonly");
      const store = tx.objectStore(WORK_DRAFT_DB_STORE);
      const req = store.get(WORK_DRAFT_DB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("IndexedDB read failed"));
    });
  } catch {
    return null;
  }
};

const writeWorkingDraftToDb = async (draft) => {
  try {
    const db = await openDraftDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(WORK_DRAFT_DB_STORE, "readwrite");
      const store = tx.objectStore(WORK_DRAFT_DB_STORE);
      const req = store.put(draft, WORK_DRAFT_DB_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("IndexedDB write failed"));
    });
  } catch {
    // Ignore, localStorage fallback still exists.
  }
};

const FieldMappingPage = () => {
  const [messageApi, contextHolder] = staticMessage.useMessage();
  const toast = {
    success: (content) => {
      if (typeof messageApi?.success === "function") return messageApi.success(content);
      if (typeof staticMessage?.success === "function") return staticMessage.success(content);
      return undefined;
    },
    warning: (content) => {
      if (typeof messageApi?.warning === "function") return messageApi.warning(content);
      if (typeof staticMessage?.warning === "function") return staticMessage.warning(content);
      return undefined;
    },
    info: (content) => {
      if (typeof messageApi?.info === "function") return messageApi.info(content);
      if (typeof staticMessage?.info === "function") return staticMessage.info(content);
      return undefined;
    },
    error: (content) => {
      if (typeof messageApi?.error === "function") return messageApi.error(content);
      if (typeof staticMessage?.error === "function") return staticMessage.error(content);
      return undefined;
    },
  };
  const targetFields = useMemo(() => {
    const all = new Set(Object.keys(softwareSchema?.properties || {}));
    EXTRA_TARGET_FIELDS.forEach((f) => all.add(f));
    return [...all]
      .filter((f) => !f.startsWith("__"))
      .filter((f) => !MAPPING_UI_HIDDEN_FIELDS.has(f))
      .sort((a, b) => {
        const aSources = softwareSchema?.properties?.[a]?.["x-sourceFiles"] || [];
        const bSources = softwareSchema?.properties?.[b]?.["x-sourceFiles"] || [];
        const aStage = getFieldStageMeta(aSources);
        const bStage = getFieldStageMeta(bSources);
        if (aStage.rank !== bStage.rank) return aStage.rank - bStage.rank;
        const byUiSource = getUiSourceRank(aSources) - getUiSourceRank(bSources);
        if (byUiSource !== 0) return byUiSource;
        const aHead = String(aSources[0] || "");
        const bHead = String(bSources[0] || "");
        const bySource = aHead.localeCompare(bHead);
        if (bySource !== 0) return bySource;
        return a.localeCompare(b);
      });
  }, []);

  const fieldLocatorMap = useMemo(() => {
    const out = {};
    targetFields.forEach((field) => {
      if (EXTRA_TARGET_LOCATOR[field]) {
        out[field] = EXTRA_TARGET_LOCATOR[field];
        return;
      }
      const src = softwareSchema?.properties?.[field]?.["x-sourceFiles"] || [];
      const stage = getFieldStageMeta(src).label;
      const file = getPrimarySourceFileName(src);
      out[field] = `${stage} > ${file} > ${field}`;
    });
    return out;
  }, [targetFields]);

  const [importedFiles, setImportedFiles] = useState([]);
  const [importError, setImportError] = useState("");

  const [identifierPaths, setIdentifierPaths] = useState([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);

  const [mapping, setMapping] = useState({});
  const [fallbackMappings, setFallbackMappings] = useState({});
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [mappedPairsSearch, setMappedPairsSearch] = useState("");

  const [selectedTarget, setSelectedTarget] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [profileName, setProfileName] = useState("");
  const [savedProfiles, setSavedProfiles] = useState(() => readSavedProfiles());
  const [normalizationRules, setNormalizationRules] = useState({});
  const [normalizationField, setNormalizationField] = useState("");
  const [hideMappedFields, setHideMappedFields] = useState(true);
  const [allowSourceReuse, setAllowSourceReuse] = useState(false);
  const [livePostUrl, setLivePostUrl] = useState(DEFAULT_LIVE_POST_URL);
  const [livePostLoading, setLivePostLoading] = useState(false);
  const [livePostStatus, setLivePostStatus] = useState("");
  const [livePostResponse, setLivePostResponse] = useState("");
  const [postedCaseBackendIds, setPostedCaseBackendIds] = useState({});
  const [draftReady, setDraftReady] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLegacyMatrix, setShowLegacyMatrix] = useState(true);
  const [legacySearch, setLegacySearch] = useState("");
  const [selectedLegacySource, setSelectedLegacySource] = useState("");
  const [mappingNotes, setMappingNotes] = useState({});
  const [legacyAssignments, setLegacyAssignments] = useState(
    Array.from({ length: MAX_MATRIX_TARGET_SLOTS }, () => ({
      targetField: "",
      role: "Mapping",
      note: "",
    })),
  );
  const [postMappedOnly, setPostMappedOnly] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = (await readWorkingDraftFromDb()) || readWorkingDraft();
      if (!mounted) return;
      if (draft) {
        setIdentifierPaths(draft.identifierPaths || []);
        setSelectedCaseIds(draft.selectedCaseIds || []);
        setMapping(draft.mapping || {});
        setFallbackMappings(draft.fallbackMappings || {});
        setMappingNotes(draft.mappingNotes || {});
        setNormalizationRules(draft.normalizationRules || {});
        setNormalizationField(draft.normalizationField || "");
        setLeftSearch(draft.leftSearch || "");
        setRightSearch(draft.rightSearch || "");
        setMappedPairsSearch(draft.mappedPairsSearch || "");
        setHideMappedFields(
          typeof draft.hideMappedFields === "boolean" ? draft.hideMappedFields : true,
        );
        setAllowSourceReuse(
          typeof draft.allowSourceReuse === "boolean" ? draft.allowSourceReuse : true,
        );
        setLivePostUrl(draft.livePostUrl || DEFAULT_LIVE_POST_URL);
        setPostedCaseBackendIds(draft.postedCaseBackendIds || {});
        setProfileName(draft.profileName || "");
        setShowLegacyMatrix(
          typeof draft.showLegacyMatrix === "boolean" ? draft.showLegacyMatrix : true,
        );
        setLegacySearch(draft.legacySearch || "");
        setSelectedLegacySource(draft.selectedLegacySource || "");
        setPostMappedOnly(
          typeof draft.postMappedOnly === "boolean" ? draft.postMappedOnly : true,
        );
        if (Array.isArray(draft.importedFiles)) {
          setImportedFiles(draft.importedFiles);
        }
      }
      setDraftReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const draft = {
      savedAt: new Date().toISOString(),
      identifierPaths,
      selectedCaseIds,
      mapping,
      fallbackMappings,
      mappingNotes,
      normalizationRules,
      normalizationField,
      leftSearch,
      rightSearch,
      mappedPairsSearch,
      hideMappedFields,
      allowSourceReuse,
      livePostUrl,
      postedCaseBackendIds,
      profileName,
      importedFiles,
      showLegacyMatrix,
      legacySearch,
      selectedLegacySource,
      postMappedOnly,
    };
    const timer = setTimeout(() => {
      writeWorkingDraftToDb(draft);
      try {
        // Keep a lightweight localStorage backup for quick restore.
        const lite = { ...draft, importedFiles: [] };
        writeWorkingDraft(lite);
      } catch {
        // Ignore storage quota errors.
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [
    draftReady,
    identifierPaths,
    selectedCaseIds,
    mapping,
    fallbackMappings,
    mappingNotes,
    normalizationRules,
    normalizationField,
    leftSearch,
    rightSearch,
    mappedPairsSearch,
    hideMappedFields,
    allowSourceReuse,
    livePostUrl,
    postedCaseBackendIds,
    profileName,
    importedFiles,
    showLegacyMatrix,
    legacySearch,
    selectedLegacySource,
    postMappedOnly,
  ]);

  const importedRecordCount = useMemo(
    () => importedFiles.reduce((sum, f) => sum + f.records.length, 0),
    [importedFiles],
  );

  const identifierCandidates = useMemo(() => {
    const paths = new Set();

    importedFiles.forEach((file) => {
      file.records.slice(0, 200).forEach((record) => {
        flattenObject(record, "", paths);
      });
    });

    const all = [...paths].filter((p) => !shouldHideLegacyCodeGroupPath(p));
    all.sort((a, b) => {
      const aScore = /(cpv|cdb|temp|cust|loan|case|account).*(no|number|id|code)?/i.test(a) ? 0 : 1;
      const bScore = /(cpv|cdb|temp|cust|loan|case|account).*(no|number|id|code)?/i.test(b) ? 0 : 1;
      if (aScore !== bScore) return aScore - bScore;
      return a.localeCompare(b);
    });

    return all;
  }, [importedFiles]);

  const selectedIdentifierOptions = useMemo(() => {
    if (!identifierCandidates.length) return [];

    const candidatesByTailNorm = new Map();
    identifierCandidates.forEach((path) => {
      const tailNorm = getIdentifierTailNorm(path);
      const prev = candidatesByTailNorm.get(tailNorm);
      // Prefer simpler/shorter path when multiple candidates map to same identifier tail.
      if (!prev || String(path).length < String(prev).length) {
        candidatesByTailNorm.set(tailNorm, path);
      }
    });

    const defaults = DEFAULT_IDENTIFIER_HINTS
      .map((hint) => candidatesByTailNorm.get(normalizeKey(hint)))
      .filter(Boolean)
      .filter((path) => isStrictAutoIdentifierPath(path));

    return [...new Set(defaults)];
  }, [identifierCandidates]);

  const { aliasToCanonical, caseGroups } = useMemo(() => {
    if (!identifierPaths.length) {
      return { aliasToCanonical: new Map(), caseGroups: new Map() };
    }

    const getRecordIdEntries = (record) =>
      identifierPaths
        .map((path) => ({
          path,
          value: getValueByPath(record, path),
        }))
        .filter(
          ({ value }) =>
            value !== undefined &&
            value !== null &&
            String(value).trim() !== "",
        )
        .map(({ path, value }) => ({
          path,
          id: String(value).trim(),
        }));

    const parent = new Map();
    const metaRows = [];
    const idRankByValue = new Map();

    const init = (x) => {
      if (!parent.has(x)) parent.set(x, x);
    };
    const find = (x) => {
      let p = parent.get(x);
      while (p !== parent.get(p)) {
        p = parent.get(p);
      }
      let cur = x;
      while (parent.get(cur) !== p) {
        const nxt = parent.get(cur);
        parent.set(cur, p);
        cur = nxt;
      }
      return p;
    };
    const union = (a, b) => {
      init(a);
      init(b);
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(rb, ra);
    };

    const setIdRank = (id, rank) => {
      const prev = idRankByValue.get(id);
      if (prev === undefined || rank < prev) idRankByValue.set(id, rank);
    };

    const fileScores = importedFiles.map((file) => {
      let anyIdRows = 0;
      let strictIdRows = 0;
      file.records.forEach((record) => {
        const idEntries = getRecordIdEntries(record);
        if (!idEntries.length) return;
        anyIdRows += 1;
        if (idEntries.some(({ path }) => isStrictAutoIdentifierPath(path))) {
          strictIdRows += 1;
        }
      });
      const keyNorm = normalizeKey(file.key || file.name || "");
      const cpvDetailBonus = keyNorm.includes("cpvdetail") ? 1 : 0;
      return {
        key: file.key,
        anyIdRows,
        strictIdRows,
        cpvDetailBonus,
        totalRows: file.records.length,
      };
    });

    const anchorFileKey = [...fileScores].sort((a, b) => {
      if (a.cpvDetailBonus !== b.cpvDetailBonus) {
        return b.cpvDetailBonus - a.cpvDetailBonus;
      }
      if (a.strictIdRows !== b.strictIdRows) return b.strictIdRows - a.strictIdRows;
      if (a.anyIdRows !== b.anyIdRows) return b.anyIdRows - a.anyIdRows;
      if (a.totalRows !== b.totalRows) return b.totalRows - a.totalRows;
      return String(a.key || "").localeCompare(String(b.key || ""));
    })[0]?.key;

    const anchorFile = importedFiles.find((f) => f.key === anchorFileKey);
    if (!anchorFile) {
      return { aliasToCanonical: new Map(), caseGroups: new Map() };
    }

    // Pass 1: build canonical cases from anchor dataset only.
    anchorFile.records.forEach((record) => {
      const idEntries = getRecordIdEntries(record);
      if (!idEntries.length) return;

      idEntries.forEach(({ path, id }) => {
        init(id);
        if (isStrongIdentifierPath(path)) setIdRank(id, 0);
        else if (isCpvIdentifierPath(path)) setIdRank(id, 2);
        else setIdRank(id, 1);
      });

      // IMPORTANT:
      // Do not let CPV identifiers collapse multiple CDB/TEMP cases.
      // If any non-CPV identifier exists in a row, union only those.
      // CPV-only rows still union among themselves.
      const nonCpvIds = idEntries
        .filter(({ path }) => !isCpvIdentifierPath(path))
        .map(({ id }) => id);
      const unionIds = (nonCpvIds.length ? nonCpvIds : idEntries.map(({ id }) => id))
        .filter(Boolean);
      const anchor = unionIds[0];
      if (anchor) {
        for (let i = 1; i < unionIds.length; i += 1) union(anchor, unionIds[i]);
      }

      metaRows.push({
        fileKey: anchorFile.key,
        record,
        ids: [...new Set(idEntries.map(({ id }) => id))],
      });
    });

    const byRoot = new Map();
    metaRows.forEach(({ fileKey, record, ids }) => {
      const root = find(ids[0]);
      if (!byRoot.has(root)) {
        byRoot.set(root, {
          identifiers: new Set(),
          recordsByFile: {},
        });
      }
      const slot = byRoot.get(root);
      ids.forEach((id) => slot.identifiers.add(id));
      if (!slot.recordsByFile[fileKey]) slot.recordsByFile[fileKey] = [];
      slot.recordsByFile[fileKey].push(record);
    });

    const aliasMap = new Map();
    const groups = new Map();

    byRoot.forEach((group) => {
      const identifiers = [...group.identifiers].sort((a, b) => {
        const ar = idRankByValue.get(a) ?? 9;
        const br = idRankByValue.get(b) ?? 9;
        if (ar !== br) return ar - br;
        return a.localeCompare(b);
      });
      const canonicalId = identifiers[0];
      const row = {
        canonicalId,
        identifiers,
        recordsByFile: group.recordsByFile,
      };
      groups.set(canonicalId, row);
      identifiers.forEach((id) => aliasMap.set(id, canonicalId));
    });

    // Pass 2: attach non-anchor file records only to existing canonical cases.
    importedFiles
      .filter((file) => file.key !== anchorFile.key)
      .forEach((file) => {
        file.records.forEach((record) => {
          const idEntries = getRecordIdEntries(record);
          if (!idEntries.length) return;

          const matchedCanonical = idEntries
            .map(({ id }) => aliasMap.get(id))
            .find(Boolean);
          if (!matchedCanonical || !groups.has(matchedCanonical)) return;

          const group = groups.get(matchedCanonical);
          if (!group.recordsByFile[file.key]) group.recordsByFile[file.key] = [];
          group.recordsByFile[file.key].push(record);

          idEntries.forEach(({ path, id }) => {
            if (!aliasMap.has(id)) {
              aliasMap.set(id, matchedCanonical);
              group.identifiers.push(id);
            }
            if (isStrongIdentifierPath(path)) setIdRank(id, 0);
            else if (isCpvIdentifierPath(path)) setIdRank(id, 2);
            else setIdRank(id, 1);
          });
        });
      });

    return { aliasToCanonical: aliasMap, caseGroups: groups };
  }, [identifierPaths, importedFiles]);

  const caseAliasOptions = useMemo(
    () => [...aliasToCanonical.keys()].sort((a, b) => a.localeCompare(b)),
    [aliasToCanonical],
  );

  const activeSelectedAlias = selectedCaseIds[0] || "";
  const activeSelectedCanonical = activeSelectedAlias
    ? aliasToCanonical.get(activeSelectedAlias)
    : "";

  const selectedCaseData = useMemo(() => {
    if (!activeSelectedCanonical || !caseGroups.has(activeSelectedCanonical)) return null;
    return caseGroups.get(activeSelectedCanonical);
  }, [activeSelectedCanonical, caseGroups]);

  const allCanonicalCaseIds = useMemo(
    () => [...caseGroups.keys()].sort((a, b) => a.localeCompare(b)),
    [caseGroups],
  );

  const scopedCanonicalCaseIds = useMemo(() => {
    if (!selectedCaseIds.length) return allCanonicalCaseIds;
    return [
      ...new Set(
        selectedCaseIds
          .map((alias) => aliasToCanonical.get(alias))
          .filter(Boolean),
      ),
    ];
  }, [selectedCaseIds, aliasToCanonical, allCanonicalCaseIds]);

  const selectedCaseMerged = useMemo(() => {
    if (!selectedCaseData) return null;
    return { ...selectedCaseData.recordsByFile };
  }, [selectedCaseData]);

  const sourcePaths = useMemo(() => {
    if (!selectedCaseMerged) return [];
    const out = new Set();
    Object.entries(selectedCaseMerged).forEach(([fileKey, value]) => {
      if (Array.isArray(value)) {
        value.forEach((row) => flattenObject(row, fileKey, out));
      } else {
        flattenObject(value, fileKey, out);
      }
    });
    // Ensure key auth-signatory date fields are visible as mappable paths.
    const authRowsRaw = selectedCaseMerged.auth_signatory;
    const authRows = Array.isArray(authRowsRaw) ? authRowsRaw : authRowsRaw ? [authRowsRaw] : [];
    if (authRows.length) {
      const hasDob = authRows.some((r) => r && Object.prototype.hasOwnProperty.call(r, "DATE_OF_BIRTH"));
      const hasDob1 = authRows.some((r) => r && Object.prototype.hasOwnProperty.call(r, "DATE_OF_BIRTH_1"));
      if (hasDob) out.add("auth_signatory.DATE_OF_BIRTH");
      if (hasDob1) {
        out.add("auth_signatory.DATE_OF_BIRTH_1");
        out.add("auth_signatory.DATE_OF_BIRTH");
      }
    }
    return [...out].filter((p) => !shouldHideLegacyCodeGroupPath(p)).sort();
  }, [selectedCaseMerged]);

  const filteredTargetFields = useMemo(() => {
    const base = hideMappedFields ? targetFields.filter((f) => !mapping[f]) : targetFields;
    const q = leftSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((f) => f.toLowerCase().includes(q));
  }, [leftSearch, targetFields, hideMappedFields, mapping]);

  const filteredSourcePaths = useMemo(() => {
    const usedSourcePaths = new Set(
      Object.values(mapping).filter(Boolean).map((x) => String(x)),
    );
    const allowAlwaysVisibleLegacyPath = (p) => /\.CATEGORY$/i.test(String(p || ""));
    const base = hideMappedFields && !allowSourceReuse
      ? sourcePaths.filter(
          (p) =>
            !usedSourcePaths.has(String(p)) || allowAlwaysVisibleLegacyPath(p),
        )
      : sourcePaths;
    const q = rightSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((p) => p.toLowerCase().includes(q));
  }, [rightSearch, sourcePaths, hideMappedFields, allowSourceReuse, mapping]);

  const sourceToTargetLinks = useMemo(() => {
    const out = {};
    Object.entries(mapping || {}).forEach(([targetField, sourcePath]) => {
      if (!sourcePath) return;
      if (!out[sourcePath]) out[sourcePath] = [];
      out[sourcePath].push({
        targetField,
        role: "Mapping",
        note: mappingNotes[getMappingNoteKey(sourcePath, targetField, "Mapping")] || "",
      });
    });
    Object.entries(fallbackMappings || {}).forEach(([targetField, fallbacks]) => {
      (Array.isArray(fallbacks) ? fallbacks : []).forEach((sourcePath, idx) => {
        if (!sourcePath) return;
        if (!out[sourcePath]) out[sourcePath] = [];
        const role = `Fallback${idx + 1}`;
        out[sourcePath].push({
          targetField,
          role,
          note: mappingNotes[getMappingNoteKey(sourcePath, targetField, role)] || "",
        });
      });
    });
    Object.keys(out).forEach((sourcePath) => {
      const deduped = [];
      const seen = new Set();
      (out[sourcePath] || []).forEach((row) => {
        const key = `${String(row?.targetField || "")}::${String(row?.role || "")}`;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(row);
      });
      out[sourcePath] = deduped
        .sort((a, b) => {
          const byRole = roleRank(a.role) - roleRank(b.role);
          if (byRole !== 0) return byRole;
          return String(a.targetField).localeCompare(String(b.targetField));
        })
        .slice(0, MAX_MATRIX_TARGET_SLOTS);
    });
    return out;
  }, [mapping, fallbackMappings, mappingNotes]);

  const matrixSourceRows = useMemo(() => {
    const q = legacySearch.trim().toLowerCase();
    const base = sourcePaths.filter((p) => {
      if (!q) return true;
      const live = stringifyValue(getValueFromCaseMerged(selectedCaseMerged, p)).toLowerCase();
      return p.toLowerCase().includes(q) || live.includes(q);
    });
    // If user is actively searching, do not hide mapped rows; easier to locate/verify.
    if (q) return base;
    if (!hideMappedFields) return base;
    return base.filter((p) => !(sourceToTargetLinks[p] || []).length);
  }, [
    sourcePaths,
    legacySearch,
    selectedCaseMerged,
    hideMappedFields,
    sourceToTargetLinks,
  ]);

  const mappedEntries = useMemo(
    () =>
      Object.entries(mapping)
        .filter(([, source]) => !!source)
        .sort((a, b) => a[0].localeCompare(b[0])),
    [mapping],
  );

  const filteredMappedEntries = useMemo(() => {
    const q = mappedPairsSearch.trim().toLowerCase();
    if (!q) return mappedEntries;
    return mappedEntries.filter(([target, source]) => {
      const mappingNote = String(
        mappingNotes[getMappingNoteKey(source, target, "Mapping")] || "",
      ).toLowerCase();
      const fallbacksText = (fallbackMappings[target] || [])
        .map((fb, idx) => {
          const role = `Fallback${idx + 1}`;
          const note = mappingNotes[getMappingNoteKey(fb, target, role)] || "";
          return `${fb} ${role} ${note}`;
        })
        .join(" ")
        .toLowerCase();
      return (
        String(target).toLowerCase().includes(q) ||
        String(source).toLowerCase().includes(q) ||
        mappingNote.includes(q) ||
        fallbacksText.includes(q)
      );
    });
  }, [mappedEntries, mappedPairsSearch, mappingNotes, fallbackMappings]);

  const unmappedFields = useMemo(
    () => targetFields.filter((f) => !mapping[f]),
    [mapping, targetFields],
  );

  const mappingCoverage = useMemo(() => {
    if (!targetFields.length) return 0;
    return Math.round((mappedEntries.length / targetFields.length) * 100);
  }, [mappedEntries.length, targetFields.length]);

  const dropdownTargetFields = useMemo(
    () => targetFields.filter((field) => DROPDOWN_FIELD_WHITELIST.has(field)),
    [targetFields],
  );
  const dropdownFieldSet = useMemo(() => new Set(dropdownTargetFields), [dropdownTargetFields]);
  const normalizationTargetFields = useMemo(
    () =>
      targetFields
        .filter((f) => !!mapping[f])
        .sort((a, b) => a.localeCompare(b)),
    [targetFields, mapping],
  );

  const selectedNormalizationSourcePath = normalizationField ? mapping[normalizationField] : "";

  const observedNormalizationValues = useMemo(() => {
    if (!normalizationField || !selectedNormalizationSourcePath) return [];
    const values = new Set();
    allCanonicalCaseIds.slice(0, 1500).forEach((caseId) => {
      const caseData = caseGroups.get(caseId);
      const merged = caseData ? { ...caseData.recordsByFile } : {};
      const raw = getValueFromCaseMerged(merged, selectedNormalizationSourcePath);
      if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
        values.add(String(raw));
      }
    });
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [normalizationField, selectedNormalizationSourcePath, allCanonicalCaseIds, caseGroups]);

  const parseAndAddFile = async (file) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const records = collectRecordsFromJson(parsed);

      if (!records.length) {
        toast.warning(`${file.name}: no object records found.`);
        return;
      }

      const keyBase = safeKey(file.name);
      let uniqueKey = keyBase;
      let counter = 1;
      const existing = new Set(importedFiles.map((f) => f.key));
      while (existing.has(uniqueKey)) {
        counter += 1;
        uniqueKey = `${keyBase}_${counter}`;
      }

      setImportedFiles((prev) => [
        ...prev,
        {
          name: file.name,
          key: uniqueKey,
          records,
        },
      ]);

      setImportError("");
      toast.success(`${file.name}: loaded ${records.length} records.`);
    } catch (e) {
      const err = `${file.name}: invalid JSON (${e.message})`;
      setImportError(err);
      toast.error(err);
    }
  };

  useEffect(() => {
    if (!matrixSourceRows.length) {
      setSelectedLegacySource("");
      return;
    }
    if (!selectedLegacySource || !matrixSourceRows.includes(selectedLegacySource)) {
      setSelectedLegacySource(matrixSourceRows[0]);
    }
  }, [matrixSourceRows, selectedLegacySource]);

  useEffect(() => {
    if (!selectedLegacySource) {
      setLegacyAssignments(
        Array.from({ length: MAX_MATRIX_TARGET_SLOTS }, () => ({
          targetField: "",
          role: "Mapping",
          note: "",
        })),
      );
      return;
    }
    const existing = sourceToTargetLinks[selectedLegacySource] || [];
    const next = Array.from({ length: MAX_MATRIX_TARGET_SLOTS }, (_, idx) => ({
      targetField: existing[idx]?.targetField || "",
      role: existing[idx]?.role || "Mapping",
      note: existing[idx]?.note || "",
    }));
    setLegacyAssignments(next);
  }, [selectedLegacySource, sourceToTargetLinks]);

  const applyLegacyAssignments = () => {
    if (!selectedLegacySource) {
      toast.warning("Select a legacy source field first.");
      return;
    }

    const cleaned = legacyAssignments
      .filter((x) => x?.targetField)
      .map((x) => ({
        targetField: String(x.targetField).trim(),
        role: x.role || "Mapping",
        note: String(x.note || "").trim(),
      }));

    const byTarget = new Map();
    cleaned.forEach((row) => {
      if (!byTarget.has(row.targetField)) {
        byTarget.set(row.targetField, []);
      }
      const arr = byTarget.get(row.targetField);
      if (!arr.some((v) => v.role === row.role)) arr.push(row);
    });

    setMapping((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((targetField) => {
        if (String(next[targetField]) === String(selectedLegacySource)) {
          next[targetField] = "";
        }
      });
      byTarget.forEach((rows, targetField) => {
        const mappingRow = rows.find((x) => x.role === "Mapping");
        if (mappingRow) next[targetField] = selectedLegacySource;
      });
      return next;
    });

    setFallbackMappings((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((targetField) => {
        const arr = Array.isArray(next[targetField]) ? next[targetField] : [];
        next[targetField] = arr.filter((src) => String(src) !== String(selectedLegacySource));
      });

      byTarget.forEach((rows, targetField) => {
        const fallbackRows = rows
          .filter((x) => x.role !== "Mapping")
          .sort((a, b) => roleRank(a.role) - roleRank(b.role));
        if (!fallbackRows.length) return;
        const existing = Array.isArray(next[targetField]) ? [...next[targetField]] : [];
        fallbackRows.forEach((x) => {
          const desiredIndex = Math.max(0, roleRank(x.role) - 1);
          const already = existing.indexOf(selectedLegacySource);
          if (already !== -1) existing.splice(already, 1);
          if (desiredIndex >= existing.length) {
            existing.push(selectedLegacySource);
          } else {
            existing.splice(desiredIndex, 0, selectedLegacySource);
          }
        });
        next[targetField] = existing.filter(Boolean);
      });
      return next;
    });

    setMappingNotes((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${selectedLegacySource}::`)) delete next[k];
      });
      cleaned.forEach((row) => {
        const key = getMappingNoteKey(selectedLegacySource, row.targetField, row.role);
        if (row.note) next[key] = row.note;
      });
      return next;
    });

    toast.success("Legacy field mapped to selected targets.");
  };

  const bulkSelectedTargets = useMemo(
    () =>
      [
        ...new Set(
          legacyAssignments
            .map((slot) => String(slot?.targetField || "").trim())
            .filter(Boolean),
        ),
      ],
    [legacyAssignments],
  );

  const onBulkSelectTargets = (values = []) => {
    const selected = [...new Set((values || []).map((v) => String(v || "").trim()).filter(Boolean))]
      .slice(0, MAX_MATRIX_TARGET_SLOTS);

    const existingByTarget = new Map();
    legacyAssignments.forEach((slot) => {
      const key = String(slot?.targetField || "").trim();
      if (!key) return;
      if (!existingByTarget.has(key)) {
        existingByTarget.set(key, {
          role: slot?.role || "Mapping",
          note: slot?.note || "",
        });
      }
    });

    const next = Array.from({ length: MAX_MATRIX_TARGET_SLOTS }, (_, idx) => {
      const targetField = selected[idx] || "";
      if (!targetField) return { targetField: "", role: "Mapping", note: "" };
      const existing = existingByTarget.get(targetField);
      return {
        targetField,
        role:
          existing?.role ||
          (idx === 0 ? "Mapping" : `Fallback${Math.min(idx, 24)}`),
        note: existing?.note || "",
      };
    });
    setLegacyAssignments(next);
  };

  const onAutoSelectIdentifiers = () => {
    const strictAuto = (selectedIdentifierOptions || []).filter((path) =>
      isStrictAutoIdentifierPath(path),
    );
    if (!strictAuto.length) {
      toast.warning("No identifier-like fields detected yet.");
      return;
    }

    // Keep only strict identifier fields while auto-selecting to avoid noisy case explosion.
    const strictExisting = (identifierPaths || []).filter((path) =>
      isStrictAutoIdentifierPath(path),
    );
    const merged = [...new Set([...strictExisting, ...strictAuto])];
    merged.sort((a, b) => {
      const score = (path) => {
        if (isStrongIdentifierPath(path)) return 0;
        if (isCpvIdentifierPath(path)) return 1;
        return 2;
      };
      const sa = score(a);
      const sb = score(b);
      if (sa !== sb) return sa - sb;
      return String(a).localeCompare(String(b));
    });
    setIdentifierPaths(merged);
    setSelectedCaseIds([]);
    toast.success("Identifier fields auto-selected.");
  };

  const onAutoSuggest = () => {
    if (!sourcePaths.length) {
      toast.warning("Select a case first to load source fields.");
      return;
    }

    const sourceByNorm = new Map();
    sourcePaths.forEach((path) => {
      const tail = path.split(".").pop() || path;
      if (!sourceByNorm.has(normalizeKey(tail))) {
        sourceByNorm.set(normalizeKey(tail), path);
      }
    });

    const next = { ...mapping };
    targetFields.forEach((targetField) => {
      const hit = sourceByNorm.get(normalizeKey(targetField));
      if (hit) next[targetField] = hit;
    });

    setMapping(next);
    toast.success("Auto-suggest applied.");
  };

  const onMap = () => {
    if (!selectedTarget || !selectedSource) {
      toast.warning("Select one software field and one imported field.");
      return;
    }
    setMapping((prev) => ({ ...prev, [selectedTarget]: selectedSource }));
    setFallbackMappings((prev) => {
      const existing = Array.isArray(prev[selectedTarget]) ? prev[selectedTarget] : [];
      const next = existing.filter((src) => String(src) !== String(selectedSource));
      return { ...prev, [selectedTarget]: next };
    });
  };

  const onUnmap = () => {
    if (!selectedTarget) {
      toast.warning("Select a software field first.");
      return;
    }
    setMapping((prev) => ({ ...prev, [selectedTarget]: "" }));
    setFallbackMappings((prev) => ({ ...prev, [selectedTarget]: [] }));
  };

  const onAddFallback = () => {
    if (!selectedTarget || !selectedSource) {
      toast.warning("Select one software field and one imported field.");
      return;
    }
    if (String(mapping[selectedTarget] || "") === String(selectedSource)) {
      toast.warning("Selected imported field is already mapped as primary.");
      return;
    }
    setFallbackMappings((prev) => {
      const existing = Array.isArray(prev[selectedTarget]) ? prev[selectedTarget] : [];
      if (existing.includes(selectedSource)) return prev;
      return {
        ...prev,
        [selectedTarget]: [...existing, selectedSource],
      };
    });
    toast.success("Fallback added.");
  };

  const onRemoveFallback = (targetField, fallbackSourcePath) => {
    setFallbackMappings((prev) => {
      const existing = Array.isArray(prev[targetField]) ? prev[targetField] : [];
      const next = existing.filter((src) => String(src) !== String(fallbackSourcePath));
      return { ...prev, [targetField]: next };
    });
  };

  const buildMappedLoanDoc = useCallback((caseId, options = {}) => {
    const { includeAllFields = true, includeSafetyFallback = false } = options;
    const caseData = caseGroups.get(caseId);
    const merged = caseData ? { ...caseData.recordsByFile } : {};

    const doc = {
      __importMeta: {
        caseId: String(caseId),
        aliases: caseData?.identifiers || [String(caseId)],
        identifierPaths,
        sourceFiles: Object.keys(merged),
      },
    };

    if (includeAllFields) {
      // Keep output complete for Mongo import: every software field is present.
      targetFields.forEach((field) => {
        doc[field] = null;
      });
    }

    mappedEntries.forEach(([targetField, sourcePath]) => {
      let rawValue = resolveInstrumentAwareValue(merged, targetField, sourcePath);
      if (!isMeaningfulValue(rawValue)) {
        const fallbacks = Array.isArray(fallbackMappings[targetField])
          ? fallbackMappings[targetField]
          : [];
        for (const fbSourcePath of fallbacks) {
          const candidate = resolveInstrumentAwareValue(merged, targetField, fbSourcePath);
          if (isMeaningfulValue(candidate)) {
            rawValue = candidate;
            break;
          }
        }
      }
      const fieldRules = normalizationRules[targetField] || {};
      const builtInNormalized = applyBuiltInNormalization(targetField, rawValue);
      const normalizedValue = applyNormalizationRule(builtInNormalized, fieldRules);
      const schemaNode = softwareSchema?.properties?.[targetField];
      doc[targetField] = castBySchemaType(normalizedValue, schemaNode);
    });

    // Fallback: derive typeOfLoan from legacy case-type fields when mapping missed/blank.
    if (!isMeaningfulValue(doc.typeOfLoan)) {
      const normalizedTypeOfLoan = inferTypeOfLoanFromLegacy(merged);
      if (isMeaningfulValue(normalizedTypeOfLoan)) {
        const typeSchema = softwareSchema?.properties?.typeOfLoan;
        doc.typeOfLoan = castBySchemaType(normalizedTypeOfLoan, typeSchema);
      }
    }

    // Fallback: actual loan number from prefix + suffix.
    if (!isMeaningfulValue(doc.loan_number)) {
      const loanPrefix = findFirstValueByTail(merged, ["LOAN_NUMBER_PREFIX", "LOAN_PREFIX"]);
      const loanSuffix = findFirstValueByTail(merged, ["LOAN_NUMBER_SUFFIX", "LOAN_SUFFIX"]);
      const combinedLoanNo = joinNameParts(loanPrefix, loanSuffix);
      if (isMeaningfulValue(combinedLoanNo)) {
        const schemaNode = softwareSchema?.properties?.loan_number;
        doc.loan_number = castBySchemaType(combinedLoanNo, schemaNode);
      }
    }

    // Fallback: father name from first + middle + last.
    if (!isMeaningfulValue(doc.sdwOf)) {
      const fatherFull = joinNameParts(
        findFirstValueByTail(merged, ["FATHERS_NAME_FIRST", "FATHER_NAME_FIRST"]),
        findFirstValueByTail(merged, ["FATHERS_NAME_MIDDLE", "FATHER_NAME_MIDDLE"]),
        findFirstValueByTail(merged, ["FATHERS_NAME_LAST", "FATHER_NAME_LAST"]),
      );
      if (isMeaningfulValue(fatherFull)) {
        const schemaNode = softwareSchema?.properties?.sdwOf;
        doc.sdwOf = castBySchemaType(fatherFull, schemaNode);
      }
    }

    // Fallback: Date of incorporation / DOB (uses same target key `dob` in new form).
    if (!isMeaningfulValue(doc.dob)) {
      const rawDob = findFirstValueByTail(merged, [
        "DATE_OF_INCORPORATION",
        "DATE_OF_BIRTH",
        "DOB",
        "BIRTH_DATE",
      ]);
      if (isMeaningfulValue(rawDob)) {
        const schemaNode = softwareSchema?.properties?.dob;
        doc.dob = castBySchemaType(String(rawDob).trim(), schemaNode);
      }
    }

    // Fallback: account type from legacy account numbers.
    if (!isMeaningfulValue(doc.accountType)) {
      const inferredAccountType = inferAccountTypeFromLegacy(merged);
      if (isMeaningfulValue(inferredAccountType)) {
        const schemaNode = softwareSchema?.properties?.accountType;
        doc.accountType = castBySchemaType(inferredAccountType, schemaNode);
      }
    }

    // Always enforce legacy business nature composition:
    // businessNature = INDUSTRY_DETAIL + ORGANISATION_TYPE.
    {
      const industry = findFirstValueByTail(merged, ["INDUSTRY_DETAIL"]);
      const organisation = findFirstValueByTail(merged, ["ORGANISATION_TYPE"]);
      const combined = combineBusinessNature(industry, organisation);
      if (isMeaningfulValue(combined)) {
        const schemaNode = softwareSchema?.properties?.businessNature;
        doc.businessNature = castBySchemaType(combined, schemaNode);
      }
    }

    // Fallback: Contact person name.
    if (!isMeaningfulValue(doc.contactPersonName)) {
      const rawContactPerson = findFirstValueByTail(merged, [
        "CONTACT_PERSON_NAME",
        "CONTACT_PERSON",
        "NAME_1",
        "AUTH_SIGNATORY_NAME",
        "AUTHORISED_SIGNATORY_NAME",
      ]);
      if (isMeaningfulValue(rawContactPerson)) {
        const schemaNode = softwareSchema?.properties?.contactPersonName;
        doc.contactPersonName = castBySchemaType(String(rawContactPerson).trim(), schemaNode);
      }
    }

    // Fallback: Email id.
    if (!isMeaningfulValue(doc.email)) {
      const rawEmail = findFirstValueByTail(merged, [
        "EMAIL_ID",
        "EMAIL",
        "OFF_EMAIL",
        "OFFICIAL_EMAIL",
        "MAIL_ID",
        "E_MAIL",
      ]);
      if (isMeaningfulValue(rawEmail)) {
        const schemaNode = softwareSchema?.properties?.email;
        doc.email = castBySchemaType(String(rawEmail).trim(), schemaNode);
      }
    }

    // Fallback: File Prepared By from legacy PRE_DOCS_PREPARED_BY.
    // Needed for cash-car profile where pre-file section is minimal.
    {
      const rawPreparedBy = firstMeaningful(
        findFirstValueByTail(merged, ["PRE_DOCS_PREPARED_BY"]),
        findFirstValueByTail(merged, ["DOCS_PREPARED_BY"]),
      );
      if (isMeaningfulValue(rawPreparedBy)) {
        const preparedBy = String(rawPreparedBy).trim();
        doc.docsPreparedBy = preparedBy;
        if (!isMeaningfulValue(doc.docs_prepared_by)) {
          doc.docs_prepared_by = preparedBy;
        }
      }
    }

    // Indirect source fallback:
    // In profile -> Indirect Source Information, Dealer Name should come from cpv_detail.SOURCE_BY.
    {
      const sourceType = String(
        firstMeaningful(
          doc.source,
          doc.recordSource,
          findFirstValueByTail(merged, ["SOURCE"]),
        ) || "",
      )
        .trim()
        .toLowerCase();
      if (sourceType === "indirect" && !isMeaningfulValue(doc.dealerName)) {
        const indirectDealer = firstMeaningful(
          findFirstValueByTail(merged, ["SOURCE_BY"]),
          findFirstValueByTail(merged, ["DEALT_BY"]),
        );
        if (isMeaningfulValue(indirectDealer)) {
          doc.dealerName = String(indirectDealer).trim();
        }
      }
    }

    // Fallback: derive insurance_by from legacy if missing.
    if (!isMeaningfulValue(doc.insurance_by)) {
      const rawInsuranceBy = findFirstValueByTail(merged, [
        "INSURANCE_BY",
        "INSURANCEBY",
        "INSURANCE_PROVIDER",
        "INSURANCE_SOURCE",
      ]);
      if (isMeaningfulValue(rawInsuranceBy)) {
        const normalizedInsuranceBy = applyBuiltInNormalization("insurance_by", rawInsuranceBy);
        const schemaNode = softwareSchema?.properties?.insurance_by;
        doc.insurance_by = castBySchemaType(normalizedInsuranceBy, schemaNode);
      }
    }

    // Optional backend safety fallback for mandatory fields when legacy keys vary.
    if (includeSafetyFallback) {
      if (!isMeaningfulValue(doc.customerName)) {
        const fallbackName = findFirstValueByTail(merged, [
          "CUSTOMER_NAME",
          "customer_name",
          "NAME",
          "name",
          "APPLICANT_NAME",
        ]);
        if (isMeaningfulValue(fallbackName)) doc.customerName = String(fallbackName).trim();
      }
      if (!isMeaningfulValue(doc.primaryMobile)) {
        const fallbackMobile = findFirstValueByTail(merged, [
          "PRIMARY_MOBILE",
          "primary_mobile",
          "MOBILE",
          "mobile",
          "RESI_PHONE1",
          "PHONE",
        ]);
        if (isMeaningfulValue(fallbackMobile)) doc.primaryMobile = String(fallbackMobile).trim();
      }
    }

    // Instrument fallback for mapping-driven migration:
    // Even when only instrumentType is mapped, hydrate cheque/ECS/SI/NACH
    // fields from RC_INSTRUMENT_DETAIL rows.
    {
      const hasAnyInstrumentValue = Object.entries(doc).some(([k, v]) => {
        if (k === "instrumentType") return isMeaningfulValue(v);
        if (/^(cheque_\d+_|ecs_|si_|nach_)/.test(k)) return isMeaningfulValue(v);
        return false;
      });
      if (!hasAnyInstrumentValue) {
        const fallbackInst = buildInstrumentFallbackFromLegacy(
          merged,
          firstMeaningful(doc.approval_bankName, doc.bankName, ""),
        );
        Object.entries(fallbackInst).forEach(([k, v]) => {
          if (isMeaningfulValue(v)) doc[k] = v;
        });
      }
    }

    // Instrument safety:
    // 1) derive/normalize instrument type
    // 2) keep only that type's fields
    // 3) for cheque, cap to actual cheque count from legacy
    const resolvedInstrumentType =
      normalizeInstrumentType(doc.instrumentType) || detectLegacyInstrumentType(merged);
    if (resolvedInstrumentType) {
      doc.instrumentType = resolvedInstrumentType;
      pruneInstrumentPayload(doc, resolvedInstrumentType);
    }
    if (resolvedInstrumentType === "Cheque") {
      const detectedLegacyChequeCount = detectLegacyChequeCount(merged);
      if (detectedLegacyChequeCount > 0) {
        capChequeFieldsByCount(doc, detectedLegacyChequeCount);
      }
    }
    pruneEmptyChequeRows(doc);

    const companyCase = isCompanyProfileDoc(doc);

    // Office-address routing from legacy:
    // cpv_detail.OFF_ADD1 + OFF_ADD2 + OFF_PIN
    // - Company case   -> Present Address (residenceAddress)
    // - Individual case -> Office Address (employmentAddress)
    {
      const offAdd1 = findFirstValueByTail(merged, ["OFF_ADD1"]);
      const offAdd2 = findFirstValueByTail(merged, ["OFF_ADD2"]);
      const offPin = findFirstValueByTail(merged, ["OFF_PIN"]);
      const officeAddressCombined = joinNonEmptyParts(offAdd1, offAdd2, offPin);
      const officePincode = firstMeaningful(
        String(offPin || "").trim(),
        extractReferencePincodeFromAddress(officeAddressCombined),
      );
      if (isMeaningfulValue(officeAddressCombined)) {
        if (companyCase) {
          doc.residenceAddress = officeAddressCombined;
        } else {
          doc.employmentAddress = officeAddressCombined;
        }
      }
      if (companyCase && isMeaningfulValue(officePincode)) {
        doc.pincode = officePincode;
      }

      // Used-car individual rule:
      // cpv_detail.OFF_ADD1 should be applicant office address.
      const resolvedTypeForOffice = String(
        firstMeaningful(doc.typeOfLoan, inferTypeOfLoanFromLegacy(merged), ""),
      )
        .trim()
        .toLowerCase();
      if (!companyCase && resolvedTypeForOffice === "used car") {
        const usedOfficeAddress = firstMeaningful(offAdd1, officeAddressCombined);
        if (isMeaningfulValue(usedOfficeAddress)) {
          doc.employmentAddress = String(usedOfficeAddress).trim();
          doc.officeAddress = String(usedOfficeAddress).trim();
        }
      }
    }

    // Residential-address routing from legacy:
    // cpv_detail.RESI_ADD1 + RESI_ADD2 + RESI_PIN
    // - Company case    -> co_address + signatory_address
    // - Individual case -> residenceAddress
    {
      const resiAdd1 = findFirstValueByTail(merged, ["RESI_ADD1"]);
      const resiAdd2 = findFirstValueByTail(merged, ["RESI_ADD2"]);
      const resiPin = findFirstValueByTail(merged, ["RESI_PIN"]);
      const residenceAddressCombined = joinNonEmptyParts(resiAdd1, resiAdd2, resiPin);
      const residencePincode = firstMeaningful(
        String(resiPin || "").trim(),
        extractReferencePincodeFromAddress(residenceAddressCombined),
      );
      if (isMeaningfulValue(residenceAddressCombined)) {
        if (companyCase) {
          doc.co_address = residenceAddressCombined;
          doc.signatory_address = residenceAddressCombined;
        } else {
          doc.residenceAddress = residenceAddressCombined;
        }
      }
      if (companyCase && isMeaningfulValue(residencePincode)) {
        doc.co_pincode = residencePincode;
        doc.signatory_pincode = residencePincode;
      }
      if (!companyCase && isMeaningfulValue(residencePincode)) {
        doc.pincode = residencePincode;
      }
    }

    // Company auth-signatory routing:
    // auth_signatory.NAME/PHONE/AUTH_AADHAAR_NUMBER feed both Co-applicant and Signatory.
    if (companyCase) {
      const authName = firstMeaningful(
        findFirstValueByTail(merged, ["NAME"]),
        findFirstValueByTail(merged, ["NAME_1"]),
        "",
      );
      const authPhone = firstMeaningful(
        findFirstValueByTail(merged, ["PHONE"]),
        findFirstValueByTail(merged, ["PHONE_1"]),
        "",
      );
      const authAadhaar = firstMeaningful(
        findFirstValueByTail(merged, ["AUTH_AADHAAR_NUMBER"]),
        findFirstValueByTail(merged, ["AADHAAR_NUMBER_1"]),
        "",
      );
      const authDob = firstMeaningful(
        findFirstValueByTail(merged, ["DATE_OF_BIRTH"]),
        findFirstValueByTail(merged, ["DATE_OF_BIRTH_1"]),
        "",
      );
      if (isMeaningfulValue(authName)) {
        doc.co_customerName = String(authName).trim();
        doc.signatory_customerName = String(authName).trim();
      }
      if (isMeaningfulValue(authPhone)) {
        doc.co_primaryMobile = String(authPhone).trim();
        doc.signatory_primaryMobile = String(authPhone).trim();
      }
      if (isMeaningfulValue(authAadhaar)) {
        doc.co_aadhaar = String(authAadhaar).trim();
        doc.signatory_aadhaar = String(authAadhaar).trim();
      }
      if (isMeaningfulValue(authDob)) {
        doc.co_dob = isMeaningfulValue(doc.co_dob) ? doc.co_dob : String(authDob).trim();
        doc.signatory_dob = isMeaningfulValue(doc.signatory_dob)
          ? doc.signatory_dob
          : String(authDob).trim();
      }

      // Designation rule for company cases.
      const companyTypeForDesignation = firstMeaningful(doc.companyType, doc.co_companyType, "");
      const forcedDesignation = defaultCompanyDesignation(companyTypeForDesignation);
      doc.co_designation = forcedDesignation;
      doc.signatory_designation = forcedDesignation;
    }

    // Guarantor -> Co-applicant routing (legacy rule):
    // Apply only when gurantor.NAME is available.
    {
      const gurName = firstMeaningful(
        getValueFromCaseMerged(merged, "gurantor.NAME"),
        getValueFromCaseMerged(merged, "guarantor.NAME"),
      );
      if (isMeaningfulValue(gurName)) {
        const gurResiAdd1 = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.RESI_ADD1"),
          getValueFromCaseMerged(merged, "guarantor.RESI_ADD1"),
        );
        const gurResiAdd2 = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.RESI_ADD2"),
          getValueFromCaseMerged(merged, "guarantor.RESI_ADD2"),
        );
        const gurResiPin = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.RESI_PIN"),
          getValueFromCaseMerged(merged, "guarantor.RESI_PIN"),
        );
        const gurAddress = joinNonEmptyParts(gurResiAdd1, gurResiAdd2, gurResiPin);
        const gurPincode = firstMeaningful(
          String(gurResiPin || "").trim(),
          extractReferencePincodeFromAddress(gurAddress),
        );
        const gurCity = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.RESI_CITY"),
          getValueFromCaseMerged(merged, "guarantor.RESI_CITY"),
          guessCityFromPincodeLite(gurPincode),
          guessCityFromAddressLite(gurAddress),
        );
        const gurDob = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.DATE_OF_BIRTH"),
          getValueFromCaseMerged(merged, "guarantor.DATE_OF_BIRTH"),
        );
        const gurSex = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.SEX"),
          getValueFromCaseMerged(merged, "guarantor.SEX"),
        );
        const gurProfession = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.PROFESSION_TYPE"),
          getValueFromCaseMerged(merged, "guarantor.PROFESSION_TYPE"),
        );
        const gurResidenceType = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.RESIDENCE_TYPE"),
          getValueFromCaseMerged(merged, "guarantor.RESIDENCE_TYPE"),
        );
        const gurEducation = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.EDUCATION"),
          getValueFromCaseMerged(merged, "guarantor.EDUCATION"),
        );
        const gurAadhaar = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.G_AADHAAR_NUMBER"),
          getValueFromCaseMerged(merged, "guarantor.G_AADHAAR_NUMBER"),
        );
        const gurDependents = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.NO_OF_DEPEND"),
          getValueFromCaseMerged(merged, "guarantor.NO_OF_DEPEND"),
        );
        const gurYearsProfession = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.YEARS_AT_PROFESSION"),
          getValueFromCaseMerged(merged, "guarantor.YEARS_AT_PROFESSION"),
        );
        const gurYearsResidence = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.YEARS_AT_RESIDENCE"),
          getValueFromCaseMerged(merged, "guarantor.YEARS_AT_RESIDENCE"),
        );
        const gurOfficeAddress = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.OFF_ADD1"),
          getValueFromCaseMerged(merged, "guarantor.OFF_ADD1"),
        );
        const gurMobile = firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.RESI_PHONE"),
          getValueFromCaseMerged(merged, "guarantor.RESI_PHONE"),
        );

        doc.hasCoApplicant = true;
        doc.co_customerName = String(gurName).trim();
        if (isMeaningfulValue(gurMobile)) doc.co_primaryMobile = String(gurMobile).trim();
        if (isMeaningfulValue(gurDob)) doc.co_dob = String(gurDob).trim();
        if (isMeaningfulValue(gurAddress)) doc.co_address = gurAddress;
        if (isMeaningfulValue(gurPincode)) doc.co_pincode = gurPincode;
        if (isMeaningfulValue(gurCity)) doc.co_city = gurCity;
        if (isMeaningfulValue(gurAadhaar)) doc.co_aadhaar = String(gurAadhaar).trim();
        if (isMeaningfulValue(gurOfficeAddress)) doc.co_companyAddress = String(gurOfficeAddress).trim();

        if (isMeaningfulValue(gurSex)) {
          doc.co_gender = applyBuiltInNormalization("co_gender", gurSex);
        }
        if (isMeaningfulValue(gurProfession)) {
          doc.co_occupation = applyBuiltInNormalization("co_occupation", gurProfession);
        }
        if (isMeaningfulValue(gurResidenceType)) {
          doc.co_houseType = applyBuiltInNormalization("co_houseType", gurResidenceType);
        }
        if (isMeaningfulValue(gurEducation)) {
          doc.co_education = applyBuiltInNormalization("co_education", gurEducation);
        }
        if (isMeaningfulValue(gurDependents)) {
          const n = Number(String(gurDependents).replace(/[^0-9.-]/g, ""));
          doc.co_dependents = Number.isFinite(n) ? n : gurDependents;
        }
        if (isMeaningfulValue(gurYearsProfession)) {
          const n = Number(String(gurYearsProfession).replace(/[^0-9.-]/g, ""));
          const exp = Number.isFinite(n) ? n : gurYearsProfession;
          doc.co_currentExperience = exp;
          doc.co_totalExperience = exp;
        }
        if (isMeaningfulValue(gurYearsResidence)) {
          const yrs = normalizeResidenceYearsValue(
            gurYearsResidence,
            firstMeaningful(doc.co_dob, gurDob, doc.signatory_dob, doc.dob),
          );
          doc.co_yearsAtCurrentResidence = yrs;
          doc.co_yearsInCurrentResidence = yrs;
        }
      }
    }

    // Cash-car company rule:
    // Authorised Signatory Present/Current Address must come from
    // auth_signatory.ADD1 + ADD2 + PIN.
    if (companyCase) {
      const financeMode = inferIsFinancedFromLegacy(merged, doc.typeOfLoan);
      const isCashCase = String(financeMode || "").trim().toLowerCase() === "no";
      if (isCashCase) {
        const signatoryAdd1 = firstMeaningful(
          getValueFromCaseMerged(merged, "auth_signatory.ADD1"),
          findFirstValueByTail(merged, ["ADD1"]),
          findFirstValueByTail(merged, ["ADD1_1"]),
        );
        const signatoryAdd2 = firstMeaningful(
          getValueFromCaseMerged(merged, "auth_signatory.ADD2"),
          findFirstValueByTail(merged, ["ADD2"]),
          findFirstValueByTail(merged, ["ADD2_1"]),
        );
        const signatoryPin = firstMeaningful(
          getValueFromCaseMerged(merged, "auth_signatory.PIN"),
          findFirstValueByTail(merged, ["PIN"]),
          findFirstValueByTail(merged, ["PIN_1"]),
        );
        const signatoryAddress = joinNonEmptyParts(signatoryAdd1, signatoryAdd2, signatoryPin);
        const signatoryPincode = firstMeaningful(
          String(signatoryPin || "").trim(),
          extractReferencePincodeFromAddress(signatoryAddress),
        );
        if (isMeaningfulValue(signatoryAddress)) {
          doc.signatory_address = signatoryAddress;
        }
        if (isMeaningfulValue(signatoryPincode)) {
          doc.signatory_pincode = signatoryPincode;
        }
      }
    }

    // Aadhaar routing for legacy:
    // - Individual -> applicant KYC aadhaarNumber/aadharNumber
    // - Company    -> co-applicant co_aadhaar
    {
      const legacyAadhaar = firstMeaningful(
        getValueFromCaseMerged(merged, "cpv_detail.AADHAAR_NUMBER"),
        getValueFromCaseMerged(merged, "CPV_DETAIL.AADHAAR_NUMBER"),
        getValueFromCaseMerged(merged, "cpv_detail.AADHAR_NUMBER"),
        getValueFromCaseMerged(merged, "CPV_DETAIL.AADHAR_NUMBER"),
        findFirstValueByTail(merged, ["AADHAAR_NUMBER"]),
        findFirstValueByTail(merged, ["AADHAR_NUMBER"]),
      );
      if (isMeaningfulValue(legacyAadhaar)) {
        const aadhaarText = String(legacyAadhaar).trim();
        if (companyCase) {
          doc.co_aadhaar = aadhaarText;
          const signatorySameAsCo =
            String(doc.signatorySameAsCoApplicant || "")
              .trim()
              .toLowerCase() === "true" ||
            String(doc.signatorySameAsCoApplicant || "")
              .trim()
              .toLowerCase() === "yes";
          if (signatorySameAsCo || !isMeaningfulValue(doc.signatory_aadhaar)) {
            doc.signatory_aadhaar = aadhaarText;
          }
        } else {
          const aadhaarSchema = softwareSchema?.properties?.aadhaarNumber;
          const aadharSchema = softwareSchema?.properties?.aadharNumber;
          doc.aadhaarNumber = castBySchemaType(aadhaarText, aadhaarSchema);
          doc.aadharNumber = castBySchemaType(aadhaarText, aadharSchema);
        }
      }
    }

    // Permanent-address condition:
    // - Company legacy cases => always same as current (true)
    // - Individual => true when permanent address has >=75% similarity with present address.
    {
      const permanentLegacyAddress = firstMeaningful(
        doc.permanentAddress,
        findFirstValueByTail(merged, ["PERMANENT_ADDRESS"]),
      );
      const presentAddress = firstMeaningful(doc.residenceAddress, "");
      if (companyCase) {
        doc.sameAsCurrentAddress = true;
      } else if (isMeaningfulValue(permanentLegacyAddress) && isMeaningfulValue(presentAddress)) {
        const same =
          String(permanentLegacyAddress).trim().toLowerCase() ===
            String(presentAddress).trim().toLowerCase() ||
          addressSimilarityScore(permanentLegacyAddress, presentAddress) >= 0.75;
        doc.sameAsCurrentAddress = same;
        if (!same) {
          doc.permanentAddress = String(permanentLegacyAddress).trim();
          const extractedPermanentPin = extractReferencePincodeFromAddress(permanentLegacyAddress);
          if (isMeaningfulValue(extractedPermanentPin)) {
            doc.permanentPincode = extractedPermanentPin;
          }
        }
      } else if (isMeaningfulValue(permanentLegacyAddress)) {
        doc.sameAsCurrentAddress = false;
        doc.permanentAddress = String(permanentLegacyAddress).trim();
        const extractedPermanentPin = extractReferencePincodeFromAddress(permanentLegacyAddress);
        if (isMeaningfulValue(extractedPermanentPin)) {
          doc.permanentPincode = extractedPermanentPin;
        }
      }
    }

    // Company legacy default:
    // MSME must be "No" unless explicitly and meaningfully set.
    if (companyCase && !isMeaningfulValue(doc.isMSME)) {
      doc.isMSME = "No";
    }

    // Conditional name routing:
    // If same legacy name is mapped to both customerName and companyName,
    // keep only the semantically correct one based on applicant profile.
    const hasCustomerName = isMeaningfulValue(doc.customerName);
    const hasCompanyName = isMeaningfulValue(doc.companyName);
    if (hasCustomerName || hasCompanyName) {
      if (companyCase) {
        if (!hasCompanyName && hasCustomerName) doc.companyName = doc.customerName;
        doc.customerName = null;
      } else {
        if (!hasCustomerName && hasCompanyName) doc.customerName = doc.companyName;
        // Keep employment companyName for individual flow.
        // Only clear when it is clearly a duplicate alias of customerName.
        if (
          isMeaningfulValue(doc.companyName) &&
          isMeaningfulValue(doc.customerName) &&
          String(doc.companyName).trim().toLowerCase() ===
            String(doc.customerName).trim().toLowerCase()
        ) {
          doc.companyName = null;
        }
      }
    }

    // Marital status routing:
    // cpv_detail.MARITAL_STATUS -> maritalStatus for Individual,
    // and -> co_maritalStatus for Company.
    if (companyCase) {
      if (isMeaningfulValue(doc.maritalStatus) && !isMeaningfulValue(doc.co_maritalStatus)) {
        doc.co_maritalStatus = normalizeMaritalStatusValue(doc.maritalStatus);
      }
      if (!isMeaningfulValue(doc.co_maritalStatus)) {
        const legacyMarital = findFirstValueByTail(merged, ["MARITAL_STATUS"]);
        if (isMeaningfulValue(legacyMarital)) {
          doc.co_maritalStatus = normalizeMaritalStatusValue(legacyMarital);
        }
      }
      doc.maritalStatus = null;
      if (!isMeaningfulValue(doc.co_dependents)) {
        const legacyDependents = findFirstValueByTail(merged, ["NO_OF_DEPENDANTS", "NO_OF_DEPEND"]);
        if (isMeaningfulValue(legacyDependents)) {
          const n = Number(String(legacyDependents).replace(/[^0-9.-]/g, ""));
          doc.co_dependents = Number.isFinite(n) ? n : legacyDependents;
        }
      }
    } else if (!isMeaningfulValue(doc.maritalStatus)) {
      const legacyMarital = findFirstValueByTail(merged, ["MARITAL_STATUS"]);
      if (isMeaningfulValue(legacyMarital)) {
        const schemaNode = softwareSchema?.properties?.maritalStatus;
        const normalized = normalizeMaritalStatusValue(legacyMarital);
        doc.maritalStatus = castBySchemaType(String(normalized).trim(), schemaNode);
      }
      if (!isMeaningfulValue(doc.dependents)) {
        const legacyDependents = findFirstValueByTail(merged, ["NO_OF_DEPENDANTS", "NO_OF_DEPEND"]);
        if (isMeaningfulValue(legacyDependents)) {
          const n = Number(String(legacyDependents).replace(/[^0-9.-]/g, ""));
          doc.dependents = Number.isFinite(n) ? n : legacyDependents;
        }
      }
    }

    // Mother-name routing:
    // cpv_detail.MOTHERS_MAIDEN_NAME -> motherName for Individual,
    // and -> co_motherName for Company.
    {
      const legacyMotherName = firstMeaningful(
        findFirstValueByTail(merged, ["MOTHERS_MAIDEN_NAME"]),
        doc.motherName,
        doc.co_motherName,
      );
      if (companyCase) {
        if (!isMeaningfulValue(doc.co_motherName) && isMeaningfulValue(legacyMotherName)) {
          doc.co_motherName = String(legacyMotherName).trim();
        }
        doc.motherName = null;
      } else if (!isMeaningfulValue(doc.motherName) && isMeaningfulValue(legacyMotherName)) {
        doc.motherName = String(legacyMotherName).trim();
      }
    }

    // Residence-years routing:
    // Migration requirement: keep raw years (e.g., 25), not "since year".
    // - Individual case -> applicant yearsInCurrentCity + yearsInCurrentHouse
    // - Company case    -> co-applicant years at current residence
    {
      const legacyYearsAtResidence = firstMeaningful(
        findFirstValueByTail(merged, ["YEARS_AT_RESIDENCE"]),
        doc.yearsInCurrentCity,
        doc.yearsInCurrentHouse,
      );
      if (companyCase) {
        doc.yearsInCurrentCity = null;
        doc.yearsInCurrentHouse = null;
        if (isMeaningfulValue(legacyYearsAtResidence)) {
          const yearsValue = normalizeResidenceYearsValue(
            legacyYearsAtResidence,
            firstMeaningful(doc.co_dob, doc.signatory_dob, doc.dob, findFirstValueByTail(merged, ["DATE_OF_BIRTH"])),
          );
          if (!isMeaningfulValue(doc.co_yearsAtCurrentResidence)) {
            doc.co_yearsAtCurrentResidence = yearsValue;
          }
          if (!isMeaningfulValue(doc.co_yearsInCurrentResidence)) {
            doc.co_yearsInCurrentResidence = yearsValue;
          }
        }
      } else if (isMeaningfulValue(legacyYearsAtResidence)) {
        const yearsValue = normalizeResidenceYearsValue(
          legacyYearsAtResidence,
          firstMeaningful(doc.dob, findFirstValueByTail(merged, ["DATE_OF_BIRTH"])),
        );
        doc.yearsInCurrentCity = yearsValue;
        doc.yearsInCurrentHouse = yearsValue;
      }
    }

    // Legacy BB (by birth) handling for residence-years fields.
    // When YEARS_AT_RESIDENCE = "BB", convert to current age from relevant DOB.
    {
      const applicantDob = firstMeaningful(doc.dob, findFirstValueByTail(merged, ["DATE_OF_BIRTH"]));
      const coDob = firstMeaningful(doc.co_dob, doc.signatory_dob, applicantDob);
      const signatoryDob = firstMeaningful(doc.signatory_dob, doc.co_dob, applicantDob);

      const applicantYears = normalizeResidenceYearsValue(doc.yearsInCurrentCity, applicantDob);
      const applicantHouseYears = normalizeResidenceYearsValue(doc.yearsInCurrentHouse, applicantDob);
      if (isMeaningfulValue(applicantYears)) doc.yearsInCurrentCity = applicantYears;
      if (isMeaningfulValue(applicantHouseYears)) doc.yearsInCurrentHouse = applicantHouseYears;

      const coYears = normalizeResidenceYearsValue(doc.co_yearsAtCurrentResidence, coDob);
      const coCurrentYears = normalizeResidenceYearsValue(doc.co_yearsInCurrentResidence, coDob);
      if (isMeaningfulValue(coYears)) doc.co_yearsAtCurrentResidence = coYears;
      if (isMeaningfulValue(coCurrentYears)) doc.co_yearsInCurrentResidence = coCurrentYears;

      if (Object.prototype.hasOwnProperty.call(doc, "signatory_yearsAtCurrentResidence")) {
        const signatoryYears = normalizeResidenceYearsValue(
          doc.signatory_yearsAtCurrentResidence,
          signatoryDob,
        );
        if (isMeaningfulValue(signatoryYears)) {
          doc.signatory_yearsAtCurrentResidence = signatoryYears;
        }
      }
      if (Object.prototype.hasOwnProperty.call(doc, "signatory_yearsInCurrentResidence")) {
        const signatoryCurrentYears = normalizeResidenceYearsValue(
          doc.signatory_yearsInCurrentResidence,
          signatoryDob,
        );
        if (isMeaningfulValue(signatoryCurrentYears)) {
          doc.signatory_yearsInCurrentResidence = signatoryCurrentYears;
        }
      }
    }

    // Individual legacy defaults for pre-file personal details:
    // 1) Address Type => residential
    // 2) If Aadhaar present, Identity Proof + Address Proof Type => AADHAAR
    if (!companyCase) {
      if (!isMeaningfulValue(doc.addressType)) {
        doc.addressType = "residential";
      }
      const individualAadhaar = firstMeaningful(
        doc.aadhaarNumber,
        doc.aadharNumber,
        getValueFromCaseMerged(merged, "cpv_detail.AADHAAR_NUMBER"),
        getValueFromCaseMerged(merged, "CPV_DETAIL.AADHAAR_NUMBER"),
        getValueFromCaseMerged(merged, "cpv_detail.AADHAR_NUMBER"),
        getValueFromCaseMerged(merged, "CPV_DETAIL.AADHAR_NUMBER"),
        findFirstValueByTail(merged, ["AADHAAR_NUMBER"]),
        findFirstValueByTail(merged, ["AADHAR_NUMBER"]),
      );
      if (isMeaningfulValue(individualAadhaar)) {
        doc.identityProofType = "AADHAAR";
        doc.addressProofType = "AADHAAR";
        if (!isMeaningfulValue(doc.identityProofNumber)) {
          doc.identityProofNumber = String(individualAadhaar).trim();
        }
        if (!isMeaningfulValue(doc.addressProofNumber)) {
          doc.addressProofNumber = String(individualAadhaar).trim();
        }
      }
    }

    // Education / House / Experience routing by applicant profile:
    // - Individual: applicant fields
    // - Company: co-applicant fields
    {
      const legacyEducation = firstMeaningful(doc.education, findFirstValueByTail(merged, ["EDUCATION"]));
      const legacyHouse = firstMeaningful(doc.houseType, findFirstValueByTail(merged, ["RESIDENCE_TYPE"]));
      const legacyYearAtProfession = firstMeaningful(
        doc.experienceCurrent,
        doc.totalExperience,
        findFirstValueByTail(merged, ["YEAR_AT_PROFESSION"]),
      );

      if (companyCase) {
        if (isMeaningfulValue(legacyEducation)) {
          const normalized = applyBuiltInNormalization("co_education", legacyEducation);
          doc.co_education = isMeaningfulValue(doc.co_education) ? doc.co_education : normalized;
        }
        if (isMeaningfulValue(legacyHouse)) {
          const normalized = applyBuiltInNormalization("co_houseType", legacyHouse);
          doc.co_houseType = isMeaningfulValue(doc.co_houseType) ? doc.co_houseType : normalized;
        }
        if (isMeaningfulValue(legacyYearAtProfession)) {
          doc.co_currentExperience = isMeaningfulValue(doc.co_currentExperience)
            ? doc.co_currentExperience
            : legacyYearAtProfession;
          doc.co_totalExperience = isMeaningfulValue(doc.co_totalExperience)
            ? doc.co_totalExperience
            : legacyYearAtProfession;
        }

        // Company case: keep these on co-applicant side only.
        doc.education = null;
        doc.houseType = null;
        doc.experienceCurrent = null;
        doc.totalExperience = null;
      } else {
        if (!isMeaningfulValue(doc.education) && isMeaningfulValue(legacyEducation)) {
          doc.education = applyBuiltInNormalization("education", legacyEducation);
        }
        if (!isMeaningfulValue(doc.houseType) && isMeaningfulValue(legacyHouse)) {
          doc.houseType = applyBuiltInNormalization("houseType", legacyHouse);
        }
        if (!isMeaningfulValue(doc.experienceCurrent) && isMeaningfulValue(legacyYearAtProfession)) {
          doc.experienceCurrent = legacyYearAtProfession;
        }
        if (!isMeaningfulValue(doc.totalExperience) && isMeaningfulValue(legacyYearAtProfession)) {
          doc.totalExperience = legacyYearAtProfession;
        }
      }
    }

    // Company co-applicant occupational sync:
    // Co-app occupational fields should mirror company occupational fields in company cases.
    if (companyCase) {
      const hasGuarantorOccupation = isMeaningfulValue(
        firstMeaningful(
          getValueFromCaseMerged(merged, "gurantor.PROFESSION_TYPE"),
          getValueFromCaseMerged(merged, "guarantor.PROFESSION_TYPE"),
        ),
      );
      const companyOccupation = firstMeaningful(
        doc.occupationType,
        findFirstValueByTail(merged, ["PROFESSION_TYPE"]),
      );
      const companyType = firstMeaningful(
        doc.companyType,
        doc.co_companyType,
        findFirstValueByTail(merged, ["CATEGORY", "ORGANISATION_TYPE"]),
      );
      const companyBusinessNature = firstMeaningful(doc.businessNature, doc.co_businessNature);
      const forcedDesignation = defaultCompanyDesignation(companyType);

      if (isMeaningfulValue(companyOccupation) && !hasGuarantorOccupation) {
        doc.co_occupation = applyBuiltInNormalization("co_occupation", companyOccupation);
      }
      if (isMeaningfulValue(companyType)) {
        doc.co_companyType = companyType;
      }
      if (isMeaningfulValue(companyBusinessNature)) {
        doc.co_businessNature = companyBusinessNature;
      }
      doc.co_designation = forcedDesignation;
      doc.signatory_designation = forcedDesignation;
      doc.hasCoApplicant = true;
      doc.signatorySameAsCoApplicant = true;

      // Company address/pincode/phone copy from company current address.
      doc.co_companyAddress = firstMeaningful(doc.residenceAddress, doc.co_companyAddress, null);
      doc.co_companyPincode = firstMeaningful(doc.pincode, doc.co_companyPincode, null);
      doc.co_companyPhone = firstMeaningful(doc.primaryMobile, doc.co_companyPhone, null);

      // Company legacy: current/total experience from date of incorporation if missing.
      const legacyYears = yearsFromDateString(firstMeaningful(doc.dob, findFirstValueByTail(merged, ["DATE_OF_BIRTH"])));
      if (!isMeaningfulValue(doc.experienceCurrent) && legacyYears !== null) {
        doc.experienceCurrent = legacyYears;
      }
      if (!isMeaningfulValue(doc.totalExperience) && legacyYears !== null) {
        doc.totalExperience = legacyYears;
      }
    } else {
      // Individual legacy routing:
      // cpv_detail.CATEGORY -> Designation / Role (Profile > Employment Details).
      if (!isMeaningfulValue(doc.designation)) {
        const legacyCategory = findFirstValueByTail(merged, ["CATEGORY"]);
        if (isMeaningfulValue(legacyCategory)) {
          doc.designation = String(legacyCategory).trim();
        }
      }
      if (!isMeaningfulValue(doc.occupationType)) {
        const legacyProfession = findFirstValueByTail(merged, ["PROFESSION_TYPE"]);
        if (isMeaningfulValue(legacyProfession)) {
          doc.occupationType = applyBuiltInNormalization("occupationType", legacyProfession);
        }
      }
      if (!isMeaningfulValue(doc.companyType)) {
        const legacyCompanyType = findFirstValueByTail(merged, ["CATEGORY", "ORGANISATION_TYPE"]);
        if (isMeaningfulValue(legacyCompanyType)) {
          doc.companyType = String(legacyCompanyType).trim();
        }
      }
      if (!isMeaningfulValue(doc.companyName)) {
        const legacyCompanyName = findFirstValueByTail(merged, ["OFF_NAME"]);
        if (isMeaningfulValue(legacyCompanyName)) {
          doc.companyName = String(legacyCompanyName).trim();
        }
      }
    }

    // Final hard-guard: never leave typeOfLoan null.
    const finalType = normalizeTypeOfLoanValue(doc.typeOfLoan);
    if (!isMeaningfulValue(finalType)) {
      const inferred = inferTypeOfLoanFromLegacy(merged);
      doc.typeOfLoan = isMeaningfulValue(inferred) ? inferred : "New Car";
    } else {
      doc.typeOfLoan = finalType;
    }

    // Final hard-guard for finance mode:
    // normalize mapped values and if still unclear, infer from legacy signals.
    {
      const normalizedFinanced = applyBuiltInNormalization("isFinanced", doc.isFinanced);
      const normalizedText = String(normalizedFinanced || "").trim();
      if (normalizedText === "Yes" || normalizedText === "No") {
        doc.isFinanced = normalizedText;
      } else {
        doc.isFinanced = inferIsFinancedFromLegacy(merged, doc.typeOfLoan);
      }
    }

    // Hard legacy precedence:
    // rc_customer_account.HP_TO = CASH SALE must always behave as cash new-car case.
    {
      const hpToText = String(findFirstValueByTail(merged, ["HP_TO"]) || "")
        .trim()
        .toLowerCase();
      if (hpToText.includes("cash sale") || hpToText === "cash") {
        doc.isFinanced = "No";
        doc.typeOfLoan = "New Car";
      }
    }

    // Usage default/inference:
    // keep Commercial only when legacy clearly indicates it; otherwise default Private.
    {
      const currentUsage = String(doc.usage || "").trim().toLowerCase();
      if (!currentUsage) {
        doc.usage = inferUsageFromLegacy(merged);
      } else if (/(commercial|taxi|cab|transport|permit|school)/.test(currentUsage)) {
        doc.usage = "Commercial";
      } else {
        doc.usage = "Private";
      }
    }

    // Vehicle cleanup override (from reviewed Excel), applied with safe ID matching:
    // temp_cust_code -> cdb_account_no -> cpv_account_no(+name).
    {
      const nameForMatch = firstMeaningful(doc.customerName, doc.companyName);
      const vehicleOverride = resolveVehicleCleanupOverride(merged, caseId, nameForMatch);
      if (vehicleOverride) {
        if (isMeaningfulValue(vehicleOverride.make)) doc.vehicleMake = String(vehicleOverride.make).trim();
        if (isMeaningfulValue(vehicleOverride.model)) doc.vehicleModel = String(vehicleOverride.model).trim();
        if (isMeaningfulValue(vehicleOverride.variant)) doc.vehicleVariant = String(vehicleOverride.variant).trim();
        if (isMeaningfulValue(vehicleOverride.fuelType)) {
          const normalizedFuel = applyBuiltInNormalization("vehicleFuelType", vehicleOverride.fuelType);
          doc.vehicleFuelType = isMeaningfulValue(normalizedFuel)
            ? normalizedFuel
            : String(vehicleOverride.fuelType).trim();
        }
        const isUsedType = String(doc.typeOfLoan || "").trim().toLowerCase();
        if (
          (isUsedType === "used car" || isUsedType === "car cash-in" || isUsedType === "refinance") &&
          isMeaningfulValue(vehicleOverride.year)
        ) {
          doc.boughtInYear = Number(vehicleOverride.year) || vehicleOverride.year;
        }
      }
    }

    // Registration city logic (same as script):
    // 1) From registration number prefix (UP16, UP14, DL01, etc.)
    // 2) If registration address equals present/permanent, use that city
    // 3) Fallback to address_for_register rule, then city hints in address
    {
      const registrationNumber = firstMeaningful(
        doc.registrationNumber,
        doc.rc_redg_no,
        findFirstValueByTail(merged, ["REGD_NUMBER", "REGISTRATION_NUMBER"]),
      );
      const registrationAddress = firstMeaningful(
        doc.registrationAddress,
        findFirstValueByTail(merged, ["ADDRESS_FOR_REGISTER"]),
      );
      const residenceAddress = firstMeaningful(doc.residenceAddress, "");
      const permanentAddress = firstMeaningful(doc.permanentAddress, "");
      const city = firstMeaningful(doc.city, findFirstValueByTail(merged, ["RESI_CITY", "OFF_CITY"]), "");
      const permanentCity = firstMeaningful(doc.permanentCity, "");
      const rule = String(findFirstValueByTail(merged, ["ADDRESS_FOR_REGISTER"]) || "").toUpperCase();
      const fromPrefix = getRegistrationCityFromNumber(registrationNumber);
      const fallbackCity = firstMeaningful(
        findFirstValueByTail(merged, ["RC_RECEIVED_FROM"]),
        guessCityFromAddressLite(registrationAddress),
        "",
      );

      let derived = "";
      if (fromPrefix) derived = fromPrefix;
      else if (sameAddressLoose(registrationAddress, residenceAddress) && city) derived = city;
      else if (sameAddressLoose(registrationAddress, permanentAddress) && permanentCity) derived = permanentCity;
      else if (
        rule.includes("OFFICE") ||
        rule.includes("GST") ||
        rule.includes("RESI") ||
        rule.includes("AADHAR") ||
        rule.includes("AADHAAR")
      ) {
        derived = city || fallbackCity;
      } else if (rule.includes("PERMANENT")) {
        derived = permanentCity || city || fallbackCity;
      } else {
        derived = fallbackCity || city || permanentCity || "";
      }

      if (isMeaningfulValue(derived)) {
        doc.registrationCity = derived;
      }
    }

    // Date/Time/Tenure alias synchronization so posted entry matches form readers.
    const disbDate = firstMeaningful(
      doc.disbursement_date,
      doc.approval_disbursedDate,
      doc.disbursementDate,
      doc.disbursedDate,
    );
    if (isMeaningfulValue(disbDate)) {
      doc.disbursement_date = disbDate;
      doc.approval_disbursedDate = disbDate;
      doc.disbursementDate = disbDate;
      doc.disbursedDate = disbDate;
    } else {
      const legacyDisbDate = findFirstValueByTail(merged, ["DATE_OF_DISBURSE", "DISBURSE_DATE"]);
      if (isMeaningfulValue(legacyDisbDate)) {
        doc.disbursement_date = String(legacyDisbDate).trim();
        doc.approval_disbursedDate = String(legacyDisbDate).trim();
      }
    }

    const disbTime = firstMeaningful(doc.disbursement_time, doc.disbursementTime);
    if (isMeaningfulValue(disbTime)) {
      doc.disbursement_time = normalizeLegacyTimeValue(disbTime);
    } else {
      const legacyDisbTime = findFirstValueByTail(merged, ["TIME_OF_DISBURSE", "DISBURSE_TIME"]);
      if (isMeaningfulValue(legacyDisbTime)) {
        doc.disbursement_time = normalizeLegacyTimeValue(legacyDisbTime);
      }
    }

    const dispatchTime = firstMeaningful(doc.dispatch_time, doc.dispatchTime);
    if (isMeaningfulValue(dispatchTime)) {
      doc.dispatch_time = normalizeLegacyTimeValue(dispatchTime);
    } else {
      const legacyDispatchTime = findFirstValueByTail(merged, [
        "TIME_OF_FILE_DESPATCH",
        "TIME_OF_DESP",
        "DESPATCH_TIME",
      ]);
      if (isMeaningfulValue(legacyDispatchTime)) {
        doc.dispatch_time = normalizeLegacyTimeValue(legacyDispatchTime);
      }
    }

    // Enforce bank-name normalization across key bank fields.
    [
      "bankName",
      "approval_bankName",
      "postfile_bankName",
      "hypothecationBank",
      "disburse_bankName",
      "ecs_bankName",
    ].forEach((bankKey) => {
      if (isMeaningfulValue(doc[bankKey])) {
        doc[bankKey] = normalizeBankNameValue(doc[bankKey]);
      }
    });
    Object.keys(doc).forEach((key) => {
      if (/^cheque_\d+_bankName$/.test(key) && isMeaningfulValue(doc[key])) {
        doc[key] = normalizeBankNameValue(doc[key]);
      }
    });

    // Approval flow guard: keep legacy financed cases in explicit sequence
    // Approved -> Disbursed (avoids direct one-step disbursement state in UI flow).
    if (String(doc.isFinanced || "").trim() === "Yes") {
      const approvedAt = firstMeaningful(
        doc.approval_approvalDate,
        doc.approval_disbursedDate,
        doc.disbursement_date,
      );
      const disbursedAt = firstMeaningful(doc.approval_disbursedDate, doc.disbursement_date);
      const approvedAtWithTime = combineDateAndTimeForStatus(
        approvedAt,
        firstMeaningful(doc.approval_time, doc.dispatch_time),
      );
      const disbursedAtWithTime = combineDateAndTimeForStatus(
        disbursedAt,
        firstMeaningful(doc.disbursement_time, doc.dispatch_time),
      );

      if (isMeaningfulValue(disbursedAt)) {
        doc.approval_status = "Disbursed";
      } else if (!isMeaningfulValue(doc.approval_status) && isMeaningfulValue(doc.approval_bankName)) {
        doc.approval_status = "Approved";
      }

      if (!isMeaningfulValue(doc.approval_approvalDate) && isMeaningfulValue(approvedAt)) {
        doc.approval_approvalDate = approvedAt;
      }

      const statusHistory = [];
      if (String(doc.approval_status || "").trim() === "Disbursed" && isMeaningfulValue(disbursedAt)) {
        statusHistory.push({
          status: "Approved",
          date: approvedAt || disbursedAt,
          changedAt: approvedAtWithTime || approvedAt || disbursedAt,
        });
        statusHistory.push({
          status: "Disbursed",
          date: disbursedAt,
          changedAt: disbursedAtWithTime || disbursedAt,
        });
      } else if (
        String(doc.approval_status || "").trim() === "Approved" &&
        isMeaningfulValue(approvedAt)
      ) {
        statusHistory.push({
          status: "Approved",
          date: approvedAt,
          changedAt: approvedAtWithTime || approvedAt,
        });
      }
      if (statusHistory.length) {
        doc.approval_statusHistory = statusHistory;
      }

      if (
        (!Array.isArray(doc.approval_banksData) || !doc.approval_banksData.length) &&
        isMeaningfulValue(doc.approval_bankName)
      ) {
        doc.approval_banksData = [
          {
            id: 1,
            bankName: doc.approval_bankName,
            status: doc.approval_status || "Approved",
            loanAmount: doc.approval_loanAmountApproved ?? 0,
            disbursedAmount: doc.approval_loanAmountDisbursed ?? doc.approval_loanAmountApproved ?? 0,
            interestRate: doc.approval_roi ?? "",
            tenure: doc.approval_tenureMonths ?? "",
            processingFee: doc.approval_processingFees ?? 0,
            approvalDate: doc.approval_approvalDate || null,
            disbursedDate: doc.approval_disbursedDate || null,
            breakupNetLoanApproved: doc.approval_breakup_netLoanApproved ?? 0,
            breakupCreditAssured: doc.approval_breakup_creditAssured ?? 0,
            breakupInsuranceFinance: doc.approval_breakup_insuranceFinance ?? 0,
            breakupEwFinance: doc.approval_breakup_ewFinance ?? 0,
            statusHistory: doc.approval_statusHistory || [],
          },
        ];
      }
    }

    const tenureMonths = firstMeaningful(
      doc.postfile_tenureMonths,
      doc.approval_tenureMonths,
      doc.loanTenureMonths,
      doc.tenure,
    );
    if (isMeaningfulValue(tenureMonths)) {
      doc.postfile_tenureMonths = tenureMonths;
      doc.approval_tenureMonths = tenureMonths;
      doc.loanTenureMonths = tenureMonths;
    } else {
      const legacyTenure = findFirstValueByTail(merged, ["TENURE", "LOAN_TENURE", "NO_OF_EMI"]);
      if (isMeaningfulValue(legacyTenure)) {
        doc.postfile_tenureMonths = legacyTenure;
        doc.approval_tenureMonths = legacyTenure;
        doc.loanTenureMonths = legacyTenure;
      }
    }

    // Legacy rule: disbursed amount is same as approved amount.
    // Keep amount fields aligned and mark sameAsApproved = Yes.
    if (isMeaningfulValue(doc.approval_loanAmountApproved)) {
      doc.approval_loanAmountDisbursed = doc.approval_loanAmountApproved;
      doc.postfile_loanAmountDisbursed = doc.approval_loanAmountApproved;
      if (!isMeaningfulValue(doc.postfile_loanAmountApproved)) {
        doc.postfile_loanAmountApproved = doc.approval_loanAmountApproved;
      }
    } else if (isMeaningfulValue(doc.approval_loanAmountDisbursed)) {
      doc.approval_loanAmountApproved = doc.approval_loanAmountDisbursed;
      doc.postfile_loanAmountApproved = doc.approval_loanAmountDisbursed;
      doc.postfile_loanAmountDisbursed = doc.approval_loanAmountDisbursed;
    } else if (isMeaningfulValue(doc.postfile_loanAmountApproved)) {
      doc.postfile_loanAmountDisbursed = doc.postfile_loanAmountApproved;
      doc.approval_loanAmountApproved = doc.postfile_loanAmountApproved;
      doc.approval_loanAmountDisbursed = doc.postfile_loanAmountApproved;
    } else if (isMeaningfulValue(doc.postfile_loanAmountDisbursed)) {
      doc.postfile_loanAmountApproved = doc.postfile_loanAmountDisbursed;
      doc.approval_loanAmountApproved = doc.postfile_loanAmountDisbursed;
      doc.approval_loanAmountDisbursed = doc.postfile_loanAmountDisbursed;
    }
    doc.postfile_sameAsApproved = "Yes";

    // Generic pincode -> city fallback across loan form fields.
    // Keeps frontend behavior aligned with migration when postal API autofill is absent.
    [
      ["city", "pincode"],
      ["permanentCity", "permanentPincode"],
      ["employmentCity", "employmentPincode"],
      ["co_city", "co_pincode"],
      ["co_companyCity", "co_companyPincode"],
      ["gu_city", "gu_pincode"],
      ["gu_companyCity", "gu_companyPincode"],
      ["signatory_city", "signatory_pincode"],
      ["registrationCity", "registrationPincode"],
      ["reference1_city", "reference1_pincode"],
      ["reference2_city", "reference2_pincode"],
    ].forEach(([cityKey, pinKey]) => {
      if (!isMeaningfulValue(doc[cityKey]) && isMeaningfulValue(doc[pinKey])) {
        const inferred = guessCityFromPincodeLite(doc[pinKey]);
        if (isMeaningfulValue(inferred)) {
          doc[cityKey] = inferred;
        }
      }
    });

    // Generic IFSC -> bank-name fallback across loan form fields.
    const inferredIfscBank = inferBankFromIfscLite(
      firstMeaningful(doc.ifscCode, doc.ifsc, ""),
    );
    if (isMeaningfulValue(inferredIfscBank)) {
      [
        "bankName",
        "approval_bankName",
        "postfile_bankName",
        "disburse_bankName",
        "co_bankName",
        "gu_bankName",
      ].forEach((bankKey) => {
        if (!isMeaningfulValue(doc[bankKey])) {
          doc[bankKey] = inferredIfscBank;
        }
      });
    }
    const inferredEcsBank = inferBankFromMicrLite(firstMeaningful(doc.ecs_micrCode, ""));
    if (isMeaningfulValue(inferredEcsBank) && !isMeaningfulValue(doc.ecs_bankName)) {
      doc.ecs_bankName = inferredEcsBank;
    }

    // Reference object synthesis for UI/API consumers that expect nested objects.
    const toRefObj = (prefix) => ({
      name: doc[`${prefix}_name`] ?? null,
      mobile: doc[`${prefix}_mobile`] ?? null,
      address: doc[`${prefix}_address`] ?? null,
      pincode: doc[`${prefix}_pincode`] ?? null,
      city: doc[`${prefix}_city`] ?? null,
      relation: doc[`${prefix}_relation`] ?? null,
    });
    if (
      ["name", "mobile", "address", "pincode", "city", "relation"].some(
        (k) => isMeaningfulValue(doc[`reference1_${k}`]),
      )
    ) {
      doc.reference1 = toRefObj("reference1");
    }
    if (
      ["name", "mobile", "address", "pincode", "city", "relation"].some(
        (k) => isMeaningfulValue(doc[`reference2_${k}`]),
      )
    ) {
      doc.reference2 = toRefObj("reference2");
    }

    // Reference pincode fallback from trailing digits in address.
    ["reference1", "reference2"].forEach((prefix) => {
      const pinKey = `${prefix}_pincode`;
      const addrKey = `${prefix}_address`;
      const cityKey = `${prefix}_city`;
      if (isMeaningfulValue(doc[addrKey])) {
        const extracted = extractReferencePincodeFromAddress(doc[addrKey]);
        if (isMeaningfulValue(extracted)) {
          doc[pinKey] = extracted;
          if (doc[prefix] && typeof doc[prefix] === "object") {
            doc[prefix].pincode = extracted;
          }
        }
      }
      if (!isMeaningfulValue(doc[cityKey]) && isMeaningfulValue(doc[pinKey])) {
        const inferred = guessCityFromPincodeLite(doc[pinKey]);
        if (isMeaningfulValue(inferred)) {
          doc[cityKey] = inferred;
          if (doc[prefix] && typeof doc[prefix] === "object") {
            doc[prefix].city = inferred;
          }
        }
      }
    });

    // Company partners/directors synthesis from flat mapping targets.
    const partners = [];
    for (let i = 1; i <= COMPANY_PARTNER_SLOTS; i += 1) {
      const p = {
        name: doc[`companyPartners_${i}_name`] ?? null,
        panNumber: doc[`companyPartners_${i}_panNumber`] ?? null,
        contactNumber: doc[`companyPartners_${i}_contactNumber`] ?? null,
        dateOfBirth: doc[`companyPartners_${i}_dateOfBirth`] ?? null,
      };
      const hasAny = Object.values(p).some((v) => isMeaningfulValue(v));
      if (hasAny) partners.push(p);
    }
    // Company legacy rule: Partners/Directors auto-fill from Co-applicant details.
    const coAsPartner = {
      name: firstMeaningful(doc.co_customerName, doc.co_name, doc.coApplicant_name, null),
      panNumber: null,
      contactNumber: firstMeaningful(doc.co_primaryMobile, doc.co_mobile, doc.coApplicant_mobile, null),
      dateOfBirth: firstMeaningful(doc.co_dob, doc.signatory_dob, null),
    };
    const hasCoPartner = Object.values(coAsPartner).some((v) => isMeaningfulValue(v));
    if (companyCase && hasCoPartner) {
      doc.companyPartners = [coAsPartner];
    } else if (partners.length) {
      doc.companyPartners = partners;
    }

    // Final legacy flow guards for stage/status consistency.
    const financed = String(doc.isFinanced || "").trim() === "Yes";
    const disbursed = String(doc.approval_status || "").trim() === "Disbursed";
    const typeLower = String(doc.typeOfLoan || "").trim().toLowerCase();
    if (financed && disbursed) {
      if (!isMeaningfulValue(doc.currentStage) || String(doc.currentStage).trim().toLowerCase() === "profile") {
        if (typeLower === "car cash-in" || typeLower === "refinance") doc.currentStage = "payout";
        else doc.currentStage = "delivery";
      }
      doc.status = "Disbursed";
    } else if (financed && String(doc.approval_status || "").trim() === "Approved") {
      if (!isMeaningfulValue(doc.currentStage) || String(doc.currentStage).trim().toLowerCase() === "profile") {
        doc.currentStage = "approval";
      }
      doc.status = "Approved";
    } else if (String(doc.isFinanced || "").trim() === "No") {
      if (!isMeaningfulValue(doc.currentStage) || String(doc.currentStage).trim().toLowerCase() === "profile") {
        doc.currentStage = "delivery";
      }
      if (!isMeaningfulValue(doc.status)) doc.status = "In Progress";
    }

    return doc;
  }, [
    caseGroups,
    identifierPaths,
    mappedEntries,
    fallbackMappings,
    normalizationRules,
    targetFields,
  ]);

  const selectedMappedPreview = useMemo(() => {
    if (!activeSelectedCanonical || !caseGroups.has(activeSelectedCanonical)) return null;
    return buildMappedLoanDoc(activeSelectedCanonical, {
      includeAllFields: !postMappedOnly,
      includeSafetyFallback: false,
    });
  }, [activeSelectedCanonical, caseGroups, buildMappedLoanDoc, postMappedOnly]);

  const selectedEntrySummary = useMemo(() => {
    if (!selectedMappedPreview) return null;
    const baseKeys = Object.keys(selectedMappedPreview).filter((k) => !k.startsWith("__") && k !== "_id");
    let filled = 0;
    let empty = 0;
    baseKeys.forEach((k) => {
      const v = selectedMappedPreview[k];
      if (v === null || v === undefined || v === "") empty += 1;
      else filled += 1;
    });
    const dropdownMapped = baseKeys.filter((k) => dropdownFieldSet.has(k) && !!mapping[k]).length;
    const dropdownWithRules = baseKeys.filter(
      (k) => dropdownFieldSet.has(k) && !!mapping[k] && Object.keys(normalizationRules[k] || {}).length > 0,
    ).length;
    return {
      totalFields: baseKeys.length,
      filled,
      empty,
      dropdownMapped,
      dropdownWithRules,
    };
  }, [selectedMappedPreview, dropdownFieldSet, mapping, normalizationRules]);

  const selectedCaseConflicts = useMemo(() => {
    if (!selectedCaseData) return [];

    const recordsByFile = selectedCaseData.recordsByFile || {};
    const perPath = new Map();

    Object.entries(recordsByFile).forEach(([fileKey, recordOrRows]) => {
      const rows = Array.isArray(recordOrRows) ? recordOrRows : [recordOrRows];
      rows.forEach((record, rowIdx) => {
        const paths = [...flattenObject(record)];
        paths.forEach((path) => {
          const value = getValueByPath(record, path);
          const serialized = stableStringify(value);
          if (!perPath.has(path)) perPath.set(path, []);
          perPath.get(path).push({
            fileKey,
            value,
            serialized,
            rowIdx,
          });
        });
      });
    });

    return [...perPath.entries()]
      .map(([path, entries]) => {
        const unique = new Set(entries.map((e) => e.serialized));
        return {
          path,
          entries,
          conflict: unique.size > 1 && entries.length > 1,
        };
      })
      .filter((row) => row.conflict)
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [selectedCaseData]);

  const saveProfile = () => {
    const name = profileName.trim();
    if (!name) {
      toast.warning("Enter a profile name.");
      return;
    }

    const next = [
      ...savedProfiles.filter((p) => p.name !== name),
      {
        name,
        identifierPaths,
        mapping,
        fallbackMappings,
        mappingNotes,
        normalizationRules,
        savedAt: new Date().toISOString(),
      },
    ].sort((a, b) => a.name.localeCompare(b.name));

    setSavedProfiles(next);
    writeSavedProfiles(next);
    toast.success(`Saved profile: ${name}`);
  };

  const loadProfile = (name) => {
    const profile = savedProfiles.find((p) => p.name === name);
    if (!profile) {
      toast.warning("Profile not found.");
      return;
    }
    setIdentifierPaths(profile.identifierPaths || []);
    setMapping(profile.mapping || {});
    setFallbackMappings(profile.fallbackMappings || {});
    setMappingNotes(profile.mappingNotes || {});
    setNormalizationRules(profile.normalizationRules || {});
    setProfileName(profile.name || "");
    setSelectedCaseIds([]);
    toast.success(`Loaded profile: ${name}`);
  };

  const deleteProfile = (name) => {
    const next = savedProfiles.filter((p) => p.name !== name);
    setSavedProfiles(next);
    writeSavedProfiles(next);
    toast.success(`Deleted profile: ${name}`);
  };

  const exportMappingTemplate = () => {
    const payload = {
      version: 2,
      schemaId: softwareSchema?.$id,
      identifierPaths,
      generatedAt: new Date().toISOString(),
      mappedCount: mappedEntries.length,
      pendingCount: unmappedFields.length,
      mappings: mappedEntries.map(([targetField, sourcePath]) => ({
        targetField,
        sourcePath,
        transform: "castBySchemaType",
      })),
      fallbackMappings,
      mappingNotes,
      normalizationRules,
      unmappedFields,
    };

    downloadTextFile("loan-field-mapping.json", JSON.stringify(payload, null, 2));
  };

  const exportWorkingSession = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      identifierPaths,
      selectedCaseIds,
      mapping,
      fallbackMappings,
      mappingNotes,
      normalizationRules,
      normalizationField,
      leftSearch,
      rightSearch,
      hideMappedFields,
      allowSourceReuse,
      livePostUrl,
      postedCaseBackendIds,
      profileName,
      importedFiles,
      showLegacyMatrix,
      legacySearch,
      selectedLegacySource,
    };
    downloadTextFile("loan-mapping-session-backup.json", JSON.stringify(payload, null, 2));
    toast.success("Working session backup exported.");
  };

  const importWorkingSession = async (file) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setIdentifierPaths(parsed.identifierPaths || []);
      setSelectedCaseIds(parsed.selectedCaseIds || []);
      setMapping(parsed.mapping || {});
      setFallbackMappings(parsed.fallbackMappings || {});
      setMappingNotes(parsed.mappingNotes || {});
      setNormalizationRules(parsed.normalizationRules || {});
      setNormalizationField(parsed.normalizationField || "");
      setLeftSearch(parsed.leftSearch || "");
      setRightSearch(parsed.rightSearch || "");
      setHideMappedFields(
        typeof parsed.hideMappedFields === "boolean" ? parsed.hideMappedFields : true,
      );
      setAllowSourceReuse(
        typeof parsed.allowSourceReuse === "boolean" ? parsed.allowSourceReuse : true,
      );
      setLivePostUrl(parsed.livePostUrl || DEFAULT_LIVE_POST_URL);
      setPostedCaseBackendIds(parsed.postedCaseBackendIds || {});
      setProfileName(parsed.profileName || "");
      setShowLegacyMatrix(
        typeof parsed.showLegacyMatrix === "boolean" ? parsed.showLegacyMatrix : true,
      );
      setLegacySearch(parsed.legacySearch || "");
      setSelectedLegacySource(parsed.selectedLegacySource || "");
      setImportedFiles(Array.isArray(parsed.importedFiles) ? parsed.importedFiles : []);
      toast.success("Working session restored.");
    } catch (e) {
      toast.error(`Session import failed: ${e.message}`);
    }
  };

  const exportMongoReadyJsonArray = () => {
    if (!identifierPaths.length) {
      toast.warning("Select one or more identifier fields first.");
      return;
    }

    if (!mappedEntries.length) {
      toast.warning("Create at least one mapping first.");
      return;
    }

    const docs = scopedCanonicalCaseIds.map((caseId) => buildMappedLoanDoc(caseId));
    downloadTextFile("mongo-loans-ready.json", JSON.stringify(docs, null, 2));
    toast.success(`Exported ${docs.length} Mongo-ready documents (JSON array).`);
    if (dropdownMismatchRows.length) {
      toast.warning(
        `Found dropdown mismatches in ${mismatchCaseCount} cases. Download mismatch report.`,
      );
    }
  };

  const exportMongoReadyJsonl = () => {
    if (!identifierPaths.length) {
      toast.warning("Select one or more identifier fields first.");
      return;
    }

    if (!mappedEntries.length) {
      toast.warning("Create at least one mapping first.");
      return;
    }

    const lines = scopedCanonicalCaseIds.map((caseId) => JSON.stringify(buildMappedLoanDoc(caseId)));
    downloadTextFile("mongo-loans-ready.jsonl", `${lines.join("\n")}\n`, "application/x-ndjson");
    toast.success(`Exported ${lines.length} Mongo-ready documents (JSONL).`);
    if (dropdownMismatchRows.length) {
      toast.warning(
        `Found dropdown mismatches in ${mismatchCaseCount} cases. Download mismatch report.`,
      );
    }
  };

  const selectedSourceValue = useMemo(() => {
    if (!selectedSource || !selectedCaseMerged) return "";
    return stringifyValue(getValueFromCaseMerged(selectedCaseMerged, selectedSource));
  }, [selectedCaseMerged, selectedSource]);

  const postCaseEntryLive = async ({ caseKey, inputPayload, backendIdCache }) => {
    const payload = { ...(inputPayload || {}) };
    const hasCustomerLikeName =
      isMeaningfulValue(payload?.customerName) ||
      isMeaningfulValue(payload?.companyName);
    const missingCore = [];
    if (!hasCustomerLikeName) missingCore.push("customerName/companyName");
    if (!isMeaningfulValue(payload?.primaryMobile)) missingCore.push("primaryMobile");
    if (missingCore.length) {
      return {
        ok: false,
        statusLine: "validation_blocked",
        responseText: `Missing required fields for backend: ${missingCore.join(", ")}`,
      };
    }

    const baseUrl = livePostUrl.replace(/\/+$/, "");
    const isMongoId = (v) => /^[a-fA-F0-9]{24}$/.test(String(v || ""));
    if (!isMeaningfulValue(payload.customerName) && isMeaningfulValue(payload.companyName)) {
      payload.customerName = payload.companyName;
    }
    if (payload._id && !isMongoId(payload._id)) delete payload._id;

    const send = async (method, endpointUrl, body) => {
      const res = await fetch(endpointUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let parsed = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        // keep text
      }
      return { res, parsed, method, endpointUrl };
    };
    const fetchJson = async (endpointUrl) => {
      const res = await fetch(endpointUrl, { method: "GET" });
      const text = await res.text();
      let parsed = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        // keep text
      }
      return { res, parsed };
    };
    const extractLoanRows = (parsed) => {
      if (!parsed) return [];
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.data)) return parsed.data;
      if (Array.isArray(parsed?.loans)) return parsed.loans;
      if (Array.isArray(parsed?.results)) return parsed.results;
      if (Array.isArray(parsed?.items)) return parsed.items;
      return [];
    };
    const resolveExistingBackendIdByCase = async (currentCaseId) => {
      const candidates = [
        `${baseUrl}?limit=200&search=${encodeURIComponent(String(currentCaseId))}`,
        `${baseUrl}?limit=200&caseId=${encodeURIComponent(String(currentCaseId))}`,
      ];
      for (const url of candidates) {
        const probe = await fetchJson(url);
        if (!probe.res.ok) continue;
        const rows = extractLoanRows(probe.parsed);
        if (!rows.length) continue;
        const match = rows.find((row) => {
          const meta = row?.__importMeta || row?.importMeta || {};
          const metaCaseId = String(meta?.caseId || "").trim();
          const aliases = Array.isArray(meta?.aliases) ? meta.aliases.map(String) : [];
          return metaCaseId === String(currentCaseId) || aliases.includes(String(currentCaseId));
        });
        const backendId = match?._id;
        if (backendId && isMongoId(backendId)) return String(backendId);
      }
      return "";
    };

    let resolvedBackendId = isMongoId(backendIdCache?.[caseKey]) ? backendIdCache[caseKey] : "";
    if (!resolvedBackendId) {
      resolvedBackendId = await resolveExistingBackendIdByCase(caseKey);
      if (resolvedBackendId) backendIdCache[caseKey] = resolvedBackendId;
    }

    let result = resolvedBackendId
      ? await send("PUT", `${baseUrl}/${resolvedBackendId}`, payload)
      : await send("POST", baseUrl, payload);

    if (resolvedBackendId && !result.res.ok && Number(result.res.status) === 400) {
      const existing = await fetchJson(`${baseUrl}/${resolvedBackendId}`);
      if (existing.res.ok && existing.parsed && typeof existing.parsed === "object") {
        const existingDoc = existing.parsed?.data || existing.parsed?.loan || existing.parsed;
        if (existingDoc && typeof existingDoc === "object") {
          const mergedPayload = { ...existingDoc, ...payload };
          delete mergedPayload._id;
          result = await send("PUT", `${baseUrl}/${resolvedBackendId}`, mergedPayload);
        }
      }
    }

    if (resolvedBackendId && !result.res.ok && Number(result.res.status) === 404) {
      delete backendIdCache[caseKey];
      result = await send("POST", baseUrl, payload);
    }

    if (result.res.ok && result.parsed && typeof result.parsed === "object") {
      const backendId =
        result.parsed?._id ||
        result.parsed?.data?._id ||
        result.parsed?.loan?._id ||
        null;
      if (backendId && isMongoId(backendId)) {
        backendIdCache[caseKey] = String(backendId);
      }
    }

    return {
      ok: result.res.ok,
      statusLine: `${result.method} ${result.res.status} ${result.res.statusText}`,
      responseText:
        typeof result.parsed === "string"
          ? result.parsed
          : JSON.stringify(result.parsed, null, 2),
      action: result.method,
      backendId: backendIdCache[caseKey] || "",
    };
  };

  const postSelectedEntryLive = async () => {
    if (!selectedMappedPreview) {
      toast.warning("Select a case first to post live.");
      return;
    }
    if (!livePostUrl.trim()) {
      toast.warning("Enter backend endpoint URL.");
      return;
    }
    if (/localhost:3000/i.test(livePostUrl.trim())) {
      toast.warning("This points to frontend dev server. Use backend API URL.");
      return;
    }
    const caseKey = activeSelectedCanonical || activeSelectedAlias;
    if (!caseKey) {
      toast.warning("No active case selected.");
      return;
    }

    setLivePostLoading(true);
    setLivePostStatus("");
    setLivePostResponse("");
    try {
      const backendIdCache = { ...postedCaseBackendIds };
      const result = await postCaseEntryLive({
        caseKey,
        inputPayload: selectedMappedPreview,
        backendIdCache,
      });

      setPostedCaseBackendIds((prev) => {
        const next = { ...prev };
        if (backendIdCache[caseKey]) next[caseKey] = backendIdCache[caseKey];
        else delete next[caseKey];
        return next;
      });
      setLivePostStatus(result.statusLine);
      setLivePostResponse(result.responseText);

      if (result.ok) {
        toast.success(result.action === "PUT" ? "Selected entry updated successfully." : "Selected entry created successfully.");
      } else {
        toast.error("Backend returned an error. Check response panel.");
      }
    } catch (e) {
      setLivePostStatus("request_failed");
      setLivePostResponse(String(e?.message || e));
      toast.error("Failed to reach backend endpoint.");
    } finally {
      setLivePostLoading(false);
    }
  };

  const postAllEntriesLive = async () => {
    if (!scopedCanonicalCaseIds.length) {
      toast.warning("No cases available to post.");
      return;
    }
    if (!livePostUrl.trim()) {
      toast.warning("Enter backend endpoint URL.");
      return;
    }
    if (/localhost:3000/i.test(livePostUrl.trim())) {
      toast.warning("This points to frontend dev server. Use backend API URL.");
      return;
    }

    setLivePostLoading(true);
    setLivePostStatus("");
    setLivePostResponse("");

    try {
      const backendIdCache = { ...postedCaseBackendIds };
      const rows = [];
      const total = scopedCanonicalCaseIds.length;
      let processed = 0;

      for (const caseKey of scopedCanonicalCaseIds) {
        processed += 1;
        setLivePostStatus(`BULK posting ${processed}/${total} (case ${caseKey})...`);
        const payload = buildMappedLoanDoc(caseKey, {
          includeAllFields: !postMappedOnly,
          includeSafetyFallback: false,
        });
        let result = null;
        let lastError = "";

        for (let attempt = 1; attempt <= BULK_POST_MAX_RETRIES + 1; attempt += 1) {
          try {
            result = await postCaseEntryLive({
              caseKey,
              inputPayload: payload,
              backendIdCache,
            });
            if (result?.ok || attempt > BULK_POST_MAX_RETRIES) break;
            lastError = result?.responseText || "";
          } catch (e) {
            lastError = String(e?.message || e);
            if (attempt > BULK_POST_MAX_RETRIES) break;
          }
          await sleep(300 * attempt);
        }

        if (!result) {
          result = {
            ok: false,
            action: "-",
            statusLine: "request_failed",
            backendId: backendIdCache[caseKey] || "",
            responseText: lastError || "Unknown error",
          };
        }

        rows.push({
          caseId: caseKey,
          ok: result.ok,
          action: result.action || "-",
          status: result.statusLine,
          backendId: result.backendId || "",
          message: result.ok ? "" : result.responseText,
        });

        if (BULK_POST_INTER_CASE_DELAY_MS > 0) {
          await sleep(BULK_POST_INTER_CASE_DELAY_MS);
        }
      }

      setPostedCaseBackendIds((prev) => {
        const next = { ...prev };
        scopedCanonicalCaseIds.forEach((caseKey) => {
          if (backendIdCache[caseKey]) next[caseKey] = backendIdCache[caseKey];
          else delete next[caseKey];
        });
        return next;
      });

      const success = rows.filter((x) => x.ok).length;
      const failed = rows.length - success;
      const failedCaseIds = rows.filter((x) => !x.ok).map((x) => x.caseId);
      setLivePostStatus(`BULK done: ${success}/${rows.length} success, ${failed} failed`);
      setLivePostResponse(
        JSON.stringify({ total: rows.length, success, failed, failedCaseIds, rows }, null, 2),
      );

      if (failed) {
        toast.warning(`Bulk post complete: ${success} success, ${failed} failed.`);
      } else {
        toast.success(`Bulk post complete: ${success}/${rows.length} success.`);
      }
    } catch (e) {
      setLivePostStatus("request_failed");
      setLivePostResponse(String(e?.message || e));
      toast.error("Failed during bulk post.");
    } finally {
      setLivePostLoading(false);
    }
  };

  const normalizationRows = useMemo(() => {
    if (!normalizationField) return [];
    const existing = Object.keys(normalizationRules[normalizationField] || {});
    return [
      ...new Set([...observedNormalizationValues, ...existing, "__NON_EMPTY__", "__EMPTY__"]),
    ].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [normalizationField, observedNormalizationValues, normalizationRules]);

  const dropdownMismatchRows = useMemo(() => {
    if (!scopedCanonicalCaseIds.length) return [];

    const rows = [];
    const mappedDropdownFields = mappedEntries
      .filter(([targetField]) => dropdownFieldSet.has(targetField))
      .map(([targetField, sourcePath]) => ({ targetField, sourcePath }));

    scopedCanonicalCaseIds.forEach((caseId) => {
      const caseData = caseGroups.get(caseId);
      const merged = caseData ? { ...caseData.recordsByFile } : {};

      mappedDropdownFields.forEach(({ targetField, sourcePath }) => {
        const rawValue = getValueFromCaseMerged(merged, sourcePath);
        if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") return;

        const rules = normalizationRules[targetField] || {};
        const hasDirectRule =
          rules[String(rawValue)] !== undefined ||
          rules[normalizeMapKey(rawValue)] !== undefined;

        const normalized = applyNormalizationRule(rawValue, rules);
        const enumValues = softwareSchema?.properties?.[targetField]?.enum || [];
        const hasEnum = Array.isArray(enumValues) && enumValues.length > 0;
        const enumSet = new Set(enumValues.map((x) => String(x)));
        const inEnum = hasEnum ? enumSet.has(String(normalized)) : true;

        const needsNormalizationRule = hasEnum && !inEnum;
        if (!needsNormalizationRule) return;

        rows.push({
          caseId,
          targetField,
          sourcePath,
          rawValue: String(rawValue),
          normalizedValue: String(normalized),
          hasRule: hasDirectRule,
          allowedValues: enumValues,
          reason: hasDirectRule
            ? "normalized value not in target dropdown"
            : "raw value not mapped to target dropdown",
        });
      });
    });

    return rows;
  }, [scopedCanonicalCaseIds, caseGroups, mappedEntries, dropdownFieldSet, normalizationRules]);

  const mismatchCaseCount = useMemo(
    () => new Set(dropdownMismatchRows.map((r) => r.caseId)).size,
    [dropdownMismatchRows],
  );

  const exportDropdownMismatchReport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      totalMismatchRows: dropdownMismatchRows.length,
      totalMismatchCases: mismatchCaseCount,
      rows: dropdownMismatchRows,
    };
    downloadTextFile("dropdown-mismatch-report.json", JSON.stringify(payload, null, 2));
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {contextHolder}
      <div>
        <Title level={4} style={{ marginBottom: 4 }}>
          Loan Field Mapping
        </Title>
        <Text type="secondary">
          Map software fields to legacy fields with live case preview and fallback support.
        </Text>
      </div>

      <Card>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space wrap>
            <Upload
              multiple
              accept=".json,application/json"
              showUploadList={false}
              beforeUpload={async (file) => {
                await parseAndAddFile(file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>Import JSON Files</Button>
            </Upload>

            <Button onClick={onAutoSelectIdentifiers}>Auto Select IDs</Button>
            <Button onClick={onAutoSuggest}>Auto-suggest Mapping</Button>

            <Button type="primary" icon={<DownloadOutlined />} onClick={exportMongoReadyJsonArray}>
              Export Mongo JSON
            </Button>

            <Button
              onClick={() => {
                setImportedFiles([]);
                setIdentifierPaths([]);
                setSelectedCaseIds([]);
                setMapping({});
                setFallbackMappings({});
                setNormalizationRules({});
                setNormalizationField("");
                setPostedCaseBackendIds({});
                setAllowSourceReuse(false);
                setSelectedSource("");
                setSelectedTarget("");
                toast.info("Imports and mappings cleared.");
              }}
            >
              Clear All
            </Button>
            <Button onClick={() => setShowAdvanced((prev) => !prev)}>
              {showAdvanced ? "Hide Advanced Tools" : "Show Advanced Tools"}
            </Button>
            <Button
              type={showLegacyMatrix ? "primary" : "default"}
              onClick={() => setShowLegacyMatrix((prev) => !prev)}
            >
              {showLegacyMatrix ? "Legacy Grid Mapper: ON" : "Legacy Grid Mapper: OFF"}
            </Button>
          </Space>

          {showAdvanced ? (
            <Space wrap>
              <Upload
                accept=".json,application/json"
                showUploadList={false}
                beforeUpload={async (file) => {
                  await importWorkingSession(file);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />}>Import Session Backup</Button>
              </Upload>
              <Button icon={<DownloadOutlined />} onClick={exportMappingTemplate}>
                Export Mapping
              </Button>
              <Button icon={<DownloadOutlined />} onClick={exportMongoReadyJsonl}>
                Export Mongo JSONL
              </Button>
              <Button icon={<DownloadOutlined />} onClick={exportDropdownMismatchReport}>
                Export Dropdown Mismatch Report
              </Button>
              <Button icon={<DownloadOutlined />} onClick={exportWorkingSession}>
                Export Session Backup
              </Button>
            </Space>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            <Input
              placeholder="Mapping profile name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
            <Select
              showSearch
              allowClear
              placeholder="Load saved profile"
              value={undefined}
              onChange={(val) => {
                if (val) loadProfile(val);
              }}
              options={savedProfiles.map((p) => ({
                label: `${p.name} (${p.savedAt ? new Date(p.savedAt).toLocaleDateString() : "saved"})`,
                value: p.name,
              }))}
              filterOption={(input, option) =>
                String(option?.label || "").toLowerCase().includes(input.toLowerCase())
              }
            />
            <Button onClick={saveProfile}>Save Profile</Button>
            <Button
              danger
              onClick={() => {
                const name = profileName.trim();
                if (!name) {
                  toast.warning("Enter profile name to delete.");
                  return;
                }
                deleteProfile(name);
              }}
            >
              Delete Profile
            </Button>
          </div>

          {importError ? <Alert type="error" message={importError} showIcon /> : null}

          <Space wrap>
            <Tag color="blue">Imported files: {importedFiles.length}</Tag>
            <Tag color="gold">Cases: {allCanonicalCaseIds.length}</Tag>
            <Tag color="green">Mapped fields: {mappedEntries.length}</Tag>
            <Tag color="red">Pending fields: {unmappedFields.length}</Tag>
            <Tag color="cyan">Coverage: {mappingCoverage}%</Tag>
            {showAdvanced ? <Tag color="purple">Raw records: {importedRecordCount}</Tag> : null}
            {showAdvanced ? (
              <Tag color={dropdownMismatchRows.length ? "volcano" : "green"}>
                Dropdown mismatch cases: {mismatchCaseCount}
              </Tag>
            ) : null}
            <Tag color={hideMappedFields ? "green" : "default"}>
              Hide mapped: {hideMappedFields ? "ON" : "OFF"}
            </Tag>
            {showAdvanced ? (
              <Tag color={allowSourceReuse ? "green" : "default"}>
                Allow source reuse: {allowSourceReuse ? "ON" : "OFF"}
              </Tag>
            ) : null}
          </Space>

          <Space>
            <Button
              onClick={() => setHideMappedFields((prev) => !prev)}
              type={hideMappedFields ? "primary" : "default"}
            >
              {hideMappedFields ? "Show Mapped Fields" : "Hide Mapped Fields"}
            </Button>
            {showAdvanced ? (
              <Button
                onClick={() => setAllowSourceReuse((prev) => !prev)}
                type={allowSourceReuse ? "primary" : "default"}
              >
                {allowSourceReuse ? "Disable Source Reuse" : "Enable Source Reuse"}
              </Button>
            ) : null}
          </Space>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Text strong>1. Select Identifier Fields (Multiple)</Text>
              <Select
                mode="multiple"
                showSearch
                allowClear
                style={{ width: "100%", marginTop: 8 }}
                placeholder="Select CPV_ACCOUNT_NO / CDB_ACCOUNT_NUMBER / TEMP_CUST_CODE etc"
                value={identifierPaths}
                onChange={(vals) => {
                  setIdentifierPaths(vals || []);
                  setSelectedCaseIds([]);
                }}
                options={identifierCandidates.map((p) => ({ label: p, value: p }))}
                filterOption={(input, option) =>
                  String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                }
              />
            </div>

            <div>
              <Text strong>2. Select Case ID</Text>
              <Select
                mode="multiple"
                showSearch
                allowClear
                style={{ width: "100%", marginTop: 8 }}
                placeholder="Select one or more case IDs (first selected is preview)"
                value={selectedCaseIds}
                onChange={(vals) => setSelectedCaseIds(vals || [])}
                options={caseAliasOptions.map((id) => ({ label: id, value: id }))}
                filterOption={(input, option) =>
                  String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                }
              />
            </div>
          </div>

          {!!importedFiles.length && showAdvanced && (
            <div style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 10 }}>
              <Text strong>Imported JSON sources</Text>
              <div className="mt-2 flex flex-wrap gap-2">
                {importedFiles.map((f) => (
                  <Tag key={f.key}>{`${f.key} (${f.records.length})`}</Tag>
                ))}
              </div>
            </div>
          )}
        </Space>
      </Card>

      {showLegacyMatrix ? (
        <Card>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div>
              <Text strong>Legacy Fields (Pick One)</Text>
              <div style={{ marginTop: 6, marginBottom: 8 }}>
                <Text type="secondary">
                  Total: {sourcePaths.length} | Visible: {matrixSourceRows.length}
                </Text>
              </div>
              <Input
                style={{ marginBottom: 10 }}
                placeholder="Search legacy fields / values"
                value={legacySearch}
                onChange={(e) => setLegacySearch(e.target.value)}
              />
              <div style={listPaneStyle}>
                {matrixSourceRows.map((path) => {
                  const selected = selectedLegacySource === path;
                  const linkCount = (sourceToTargetLinks[path] || []).length;
                  return (
                    <div
                      key={path}
                      onClick={() => setSelectedLegacySource(path)}
                      style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid #f5f5f5",
                        cursor: "pointer",
                        background: selected ? "#f6ffed" : "#fff",
                      }}
                    >
                      <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>
                        {path}
                      </div>
                      <div style={{ marginTop: 5, color: "#6b7280", fontSize: 12, wordBreak: "break-word" }}>
                        {stringifyValue(getValueFromCaseMerged(selectedCaseMerged, path))}
                      </div>
                      {linkCount ? (
                        <div style={{ marginTop: 6 }}>
                          <Tag color="green">{`${linkCount} mapped`}</Tag>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {!matrixSourceRows.length ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No legacy fields available" />
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text strong>Map Selected Legacy Field → New Fields (Up to 25)</Text>
                <Space>
                  <Button
                    type="default"
                    disabled={!selectedMappedPreview}
                    loading={livePostLoading}
                    onClick={postSelectedEntryLive}
                  >
                    Post Selected Entry
                  </Button>
                  <Button type="primary" onClick={applyLegacyAssignments}>
                    Apply 25-Slot Mapping
                  </Button>
                </Space>
              </div>
              <div style={{ marginTop: 6 }}>
                <Text type="secondary">
                  Field role appears below each selected new field. Use Mapping/Fallback directly per slot.
                </Text>
              </div>
              <div style={{ marginTop: 10 }}>
                <Text strong>Bulk Select New Fields</Text>
                <Select
                  mode="multiple"
                  showSearch
                  allowClear
                  style={{ width: "100%", marginTop: 8 }}
                  placeholder="Pick multiple new fields once (auto-fills slots)"
                  value={bulkSelectedTargets}
                  onChange={onBulkSelectTargets}
                  maxTagCount="responsive"
                  options={targetFields.map((f) => ({
                    label: fieldLocatorMap[f] || f,
                    value: f,
                  }))}
                  filterOption={(input, option) =>
                    String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                  }
                />
              </div>
              <div
                style={{
                  marginTop: 10,
                  border: "1px solid #f0f0f0",
                  borderRadius: 10,
                  padding: 10,
                  background: "#fafafa",
                  maxHeight: 430,
                  overflow: "auto",
                }}
              >
                {!selectedLegacySource ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Select a legacy field first" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {legacyAssignments.map((slot, idx) => (
                      <div
                        key={`legacy-slot-${idx + 1}`}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          padding: 8,
                          background: "#fff",
                        }}
                      >
                        <div style={{ marginBottom: 6, fontSize: 12, color: "#6b7280" }}>
                          Slot {idx + 1}
                        </div>
                        <Select
                          showSearch
                          allowClear
                          style={{ width: "100%" }}
                          placeholder="Select new field"
                          value={slot.targetField || undefined}
                          onChange={(val) => {
                            const normalized = String(val || "").trim();
                            setLegacyAssignments((prev) =>
                              prev.map((entry, i) => {
                                if (i === idx) return { ...entry, targetField: normalized };
                                if (normalized && String(entry.targetField || "") === normalized) {
                                  return { ...entry, targetField: "", role: "Mapping", note: "" };
                                }
                                return entry;
                              }),
                            );
                          }}
                          options={targetFields.map((f) => ({
                            label: fieldLocatorMap[f] || f,
                            value: f,
                          }))}
                          filterOption={(input, option) =>
                            String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                          }
                        />
                        <Select
                          style={{ width: "100%", marginTop: 8 }}
                          value={slot.role || "Mapping"}
                          onChange={(val) => {
                            setLegacyAssignments((prev) =>
                              prev.map((entry, i) =>
                                i === idx ? { ...entry, role: val || "Mapping" } : entry,
                              ),
                            );
                          }}
                          options={MATRIX_ROLE_OPTIONS}
                        />
                        <Input
                          style={{ width: "100%", marginTop: 8 }}
                          placeholder="Comment / normalization note"
                          value={slot.note || ""}
                          onChange={(e) => {
                            const nextNote = e.target.value;
                            setLegacyAssignments((prev) =>
                              prev.map((entry, i) =>
                                i === idx ? { ...entry, note: nextNote } : entry,
                              ),
                            );
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {!showLegacyMatrix ? (
      <Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div>
            <Text strong>Software Fields (Left)</Text>
            <div style={{ marginTop: 6, marginBottom: 8 }}>
              <Text type="secondary">Total: {targetFields.length} | Pending: {unmappedFields.length}</Text>
            </div>
            <Input
              style={{ marginBottom: 10 }}
              placeholder="Search software fields"
              value={leftSearch}
              onChange={(e) => setLeftSearch(e.target.value)}
            />
            <div style={listPaneStyle}>
              {filteredTargetFields.map((field) => {
                const mapped = !!mapping[field];
                const selected = selectedTarget === field;
                const sourceFiles = softwareSchema?.properties?.[field]?.["x-sourceFiles"] || [];
                const stageMeta = getFieldStageMeta(sourceFiles);
                const isDropdown = dropdownFieldSet.has(field);
                const normCount = Object.keys(normalizationRules[field] || {}).length;
                return (
                  <div
                    key={field}
                    onClick={() => {
                      setSelectedTarget(field);
                      if (mapping[field]) setSelectedSource(mapping[field]);
                    }}
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid #f5f5f5",
                      cursor: "pointer",
                      background: selected ? "#e6f4ff" : "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{field}</div>
                    <div style={{ marginTop: 2, color: "#6b7280", fontSize: 11 }}>
                      {fieldLocatorMap[field] || field}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Tag color="blue">{stageMeta.label}</Tag>
                      {isDropdown ? <Tag color="magenta">dropdown</Tag> : null}
                      {softwareSchema?.required?.includes(field) ? <Tag color="red">required</Tag> : null}
                      {mapped ? <Tag color="green">mapped</Tag> : null}
                      {showAdvanced && isDropdown && mapped ? (
                        <Tag color={normCount ? "cyan" : "orange"}>
                          {normCount ? `normalized (${normCount})` : "normalization pending"}
                        </Tag>
                      ) : null}
                    </div>
                    {showAdvanced ? (
                      <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {sourceFiles.length ? (
                          sourceFiles.map((src) => {
                            const parts = String(src).split("/");
                            const label = parts[parts.length - 1];
                            return (
                              <Tag key={`${field}-${src}`} title={src} color="geekblue">
                                {label}
                              </Tag>
                            );
                          })
                        ) : (
                          <Tag color="default">source: unknown</Tag>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {!filteredTargetFields.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : null}
            </div>
          </div>

          <div>
            <Text strong>Field Mapping Actions</Text>
            <div
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 10,
                padding: 12,
                background: "#fafafa",
                marginTop: 8,
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <Text type="secondary">Selected software field</Text>
                <div style={{ fontWeight: 600 }}>{selectedTarget || "-"}</div>
                <div style={{ marginTop: 2, color: "#6b7280", fontSize: 11 }}>
                  {selectedTarget ? fieldLocatorMap[selectedTarget] || selectedTarget : "-"}
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <Text type="secondary">Selected imported field</Text>
                <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>
                  {selectedSource || "-"}
                </div>
              </div>

              <Space>
                <Button type="primary" icon={<ArrowRightOutlined />} onClick={onMap}>
                  Map
                </Button>
                <Button icon={<PlusOutlined />} onClick={onAddFallback}>
                  Add Fallback
                </Button>
                <Button icon={<ArrowLeftOutlined />} onClick={onUnmap}>
                  Unmap
                </Button>
              </Space>

              <div style={{ marginTop: 14 }}>
                <Text strong>Live value for selected case</Text>
                <div
                  style={{
                    marginTop: 6,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 8,
                    background: "#fff",
                    minHeight: 70,
                    fontFamily: "monospace",
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {selectedSourceValue || "Select a case and imported field to preview live data."}
                </div>
              </div>
            </div>
          </div>

          <div>
            <Text strong>Imported Fields (Right)</Text>
            <div style={{ marginTop: 6, marginBottom: 8 }}>
              <Text type="secondary">Total: {sourcePaths.length} | Pending: {unmappedFields.length}</Text>
            </div>
            <Input
              style={{ marginBottom: 10 }}
              placeholder="Search imported fields"
              value={rightSearch}
              onChange={(e) => setRightSearch(e.target.value)}
            />
            <div style={listPaneStyle}>
              {filteredSourcePaths.map((path) => {
                const selected = selectedSource === path;
                const live = stringifyValue(getValueFromCaseMerged(selectedCaseMerged, path));
                return (
                  <div
                    key={path}
                    onClick={() => setSelectedSource(path)}
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid #f5f5f5",
                      cursor: "pointer",
                      background: selected ? "#f6ffed" : "#fff",
                    }}
                  >
                    <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>{path}</div>
                    <div style={{ marginTop: 5, color: "#6b7280", fontSize: 12, wordBreak: "break-word" }}>{live}</div>
                  </div>
                );
              })}
              {!filteredSourcePaths.length ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Import files and select case to load fields" />
              ) : null}
            </div>
          </div>
        </div>
      </Card>
      ) : null}

      <Card>
        <Text strong>Mapped Pairs</Text>
        <Input
          style={{ marginTop: 10 }}
          placeholder="Search mapped pairs"
          value={mappedPairsSearch}
          onChange={(e) => setMappedPairsSearch(e.target.value)}
          allowClear
        />
        <div
          style={{
            marginTop: 10,
            border: "1px solid #f0f0f0",
            borderRadius: 10,
            maxHeight: 240,
            overflow: "auto",
          }}
        >
          {filteredMappedEntries.map(([target, source]) => (
            <div
              key={target}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1.2fr auto",
                gap: 8,
                padding: "10px 12px",
                borderBottom: "1px solid #f5f5f5",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 600 }}>{target}</div>
              <div style={{ color: "#999" }}>→</div>
              <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>
                <div>{source}</div>
                {mappingNotes[getMappingNoteKey(source, target, "Mapping")] ? (
                  <div style={{ marginTop: 4, color: "#6b7280", fontSize: 11 }}>
                    note: {mappingNotes[getMappingNoteKey(source, target, "Mapping")]}
                  </div>
                ) : null}
                {(fallbackMappings[target] || []).length ? (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ marginBottom: 4, color: "#6b7280", fontSize: 11 }}>fallbacks</div>
                    <Space size={[4, 4]} wrap>
                      {(fallbackMappings[target] || []).map((fb, idx) => {
                        const role = `Fallback${idx + 1}`;
                        const note = mappingNotes[getMappingNoteKey(fb, target, role)];
                        return (
                          <Tag
                          key={`${target}-${fb}-${idx}`}
                          color="purple"
                          closable
                          onClose={(e) => {
                            e.preventDefault();
                            onRemoveFallback(target, fb);
                          }}
                        >
                          {note ? `${fb} (${role}: ${note})` : `${fb} (${role})`}
                        </Tag>
                        );
                      })}
                    </Space>
                  </div>
                ) : null}
              </div>
              <Button
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => {
                  setMapping((prev) => ({ ...prev, [target]: "" }));
                  setFallbackMappings((prev) => ({ ...prev, [target]: [] }));
                }}
              />
            </div>
          ))}
          {!mappedEntries.length ? (
            <div style={{ padding: 16 }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No mappings created yet" />
            </div>
          ) : !filteredMappedEntries.length ? (
            <div style={{ padding: 16 }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No mapped pairs match your search" />
            </div>
          ) : null}
        </div>
      </Card>

      {showAdvanced ? (
      <Card>
        <Text strong>Dropdown Value Normalization</Text>
        <div style={{ marginTop: 6 }}>
          <Text type="secondary">
            For dropdown fields, map old values from source data to valid values used in the new software.
          </Text>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ marginTop: 10 }}>
          <div>
            <Text strong>Dropdown Field</Text>
            <Select
              showSearch
              allowClear
              style={{ width: "100%", marginTop: 8 }}
              placeholder="Select mapped field for normalization"
              value={normalizationField || undefined}
              onChange={(val) => setNormalizationField(val || "")}
              options={normalizationTargetFields.map((f) => ({
                label: `${fieldLocatorMap[f] || f}${dropdownFieldSet.has(f) ? " [dropdown]" : ""} (${mapping[f] || "unmapped"})`,
                value: f,
              }))}
              filterOption={(input, option) =>
                String(option?.label || "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>
          <div>
            <Text strong>Mapped Source Path</Text>
            <div
              style={{
                marginTop: 8,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "8px 10px",
                minHeight: 36,
                fontFamily: "monospace",
                fontSize: 12,
                color: selectedNormalizationSourcePath ? "#111827" : "#6b7280",
              }}
            >
              {selectedNormalizationSourcePath || "Map this field first to enable normalization"}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            border: "1px solid #f0f0f0",
            borderRadius: 10,
            maxHeight: 260,
            overflow: "auto",
            padding: 10,
            background: "#fff",
          }}
        >
          {normalizationField && selectedNormalizationSourcePath ? (
            normalizationRows.length ? (
              normalizationRows.map((oldValue) => {
                const normalized =
                  normalizationRules?.[normalizationField]?.[oldValue] ||
                  normalizationRules?.[normalizationField]?.[normalizeMapKey(oldValue)] ||
                  "";
                const isLogicKey = oldValue === "__NON_EMPTY__" || oldValue === "__EMPTY__";
                return (
                  <div
                    key={`${normalizationField}-${oldValue}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto 1fr",
                      gap: 8,
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: "1px solid #f5f5f5",
                    }}
                  >
                    <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-word" }}>
                      {isLogicKey
                        ? oldValue === "__NON_EMPTY__"
                          ? "__NON_EMPTY__ (if source has any value)"
                          : "__EMPTY__ (if source is blank)"
                        : oldValue}
                    </div>
                    <div style={{ color: "#9ca3af" }}>→</div>
                    <Input
                      size="small"
                      placeholder="Normalized value"
                      value={normalized}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setNormalizationRules((prev) => {
                          const fieldMap = { ...(prev[normalizationField] || {}) };
                          if (nextValue.trim()) {
                            fieldMap[oldValue] = nextValue;
                            if (!isLogicKey) fieldMap[normalizeMapKey(oldValue)] = nextValue;
                          } else {
                            delete fieldMap[oldValue];
                            if (!isLogicKey) delete fieldMap[normalizeMapKey(oldValue)];
                          }
                          return { ...prev, [normalizationField]: fieldMap };
                        });
                      }}
                    />
                  </div>
                );
              })
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No observed values yet for this field" />
            )
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Select dropdown field with a mapped source path" />
          )}
        </div>
      </Card>
      ) : null}

      <Card>
        <Text strong>Mapped Entry Preview (Selected Case)</Text>
        {selectedEntrySummary ? (
          <div style={{ marginTop: 8 }}>
            <Space wrap>
              <Tag color="blue">Total fields: {selectedEntrySummary.totalFields}</Tag>
              <Tag color="green">Filled: {selectedEntrySummary.filled}</Tag>
              <Tag color="red">Empty: {selectedEntrySummary.empty}</Tag>
              <Tag color="purple">
                Dropdown mapped: {selectedEntrySummary.dropdownMapped}
              </Tag>
              <Tag color="cyan">
                Dropdown normalized: {selectedEntrySummary.dropdownWithRules}
              </Tag>
            </Space>
          </div>
        ) : null}
        <div
          style={{
            marginTop: 10,
            border: "1px solid #f0f0f0",
            borderRadius: 10,
            padding: 10,
            background: "#fafafa",
          }}
        >
          {selectedMappedPreview ? (
            <pre
              style={{
                margin: 0,
                fontFamily: "monospace",
                fontSize: 12,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 320,
                overflow: "auto",
              }}
            >
              {JSON.stringify(selectedMappedPreview, null, 2)}
            </pre>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Select a case to preview mapped document" />
          )}
        </div>
      </Card>

      {showAdvanced ? (
      <Card>
        <Text strong>Live Backend Post (Selected Entry)</Text>
        <div style={{ marginTop: 6 }}>
          <Text type="secondary">
            Posts the currently previewed mapped entry to your backend so you can validate real insertion/validation behavior.
          </Text>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2" style={{ marginTop: 10 }}>
          <Input
            className="md:col-span-2"
            placeholder="Backend POST endpoint"
            value={livePostUrl}
            onChange={(e) => setLivePostUrl(e.target.value)}
          />
          <Button type="primary" loading={livePostLoading} onClick={postSelectedEntryLive}>
            Create/Update Entry
          </Button>
          <Button loading={livePostLoading} onClick={postAllEntriesLive}>
            Post All Cases
          </Button>
        </div>
        <div style={{ marginTop: 10 }}>
          <Space wrap>
            <Tag
              color={
                /\s2\d\d\s/.test(` ${livePostStatus} `)
                  ? "green"
                  : livePostStatus
                    ? "red"
                    : "default"
              }
            >
              Status: {livePostStatus || "not called"}
            </Tag>
            <Tag color="blue">
              Preview case: {activeSelectedCanonical || "none selected"}
            </Tag>
            <Tag color="purple">
              Mode:{" "}
              {activeSelectedCanonical && postedCaseBackendIds[activeSelectedCanonical]
                ? "update"
                : "create"}
            </Tag>
            <Tag color={postMappedOnly ? "green" : "default"}>
              Post mapped-only: {postMappedOnly ? "ON" : "OFF"}
            </Tag>
            <Tag color="cyan">
              Bulk scope: {scopedCanonicalCaseIds.length} case(s)
            </Tag>
            <Tag color="geekblue">
              Backend ID:{" "}
              {activeSelectedCanonical
                ? postedCaseBackendIds[activeSelectedCanonical] || "not linked yet"
                : "n/a"}
            </Tag>
          </Space>
        </div>
        <div style={{ marginTop: 8 }}>
          <Button
            size="small"
            type={postMappedOnly ? "primary" : "default"}
            onClick={() => setPostMappedOnly((prev) => !prev)}
          >
            {postMappedOnly ? "Disable mapped-only post" : "Enable mapped-only post"}
          </Button>
        </div>
        <div
          style={{
            marginTop: 10,
            border: "1px solid #f0f0f0",
            borderRadius: 10,
            padding: 10,
            background: "#fafafa",
            minHeight: 70,
            maxHeight: 260,
            overflow: "auto",
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: "monospace",
              fontSize: 12,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {livePostResponse || "No backend response yet."}
          </pre>
        </div>
      </Card>
      ) : null}

      {showAdvanced ? (
      <Card>
        <Text strong>Duplicate-Case Conflict Viewer</Text>
        <div style={{ marginTop: 6 }}>
          <Text type="secondary">
            Shows paths where the same selected case has different values across source files.
          </Text>
        </div>
        <div
          style={{
            marginTop: 10,
            border: "1px solid #f0f0f0",
            borderRadius: 10,
            maxHeight: 320,
            overflow: "auto",
            padding: 10,
            background: "#fff",
          }}
        >
          {selectedCaseConflicts.length ? (
            selectedCaseConflicts.map((row) => (
              <div
                key={row.path}
                style={{
                  borderBottom: "1px solid #f5f5f5",
                  padding: "10px 0",
                }}
              >
                <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
                  {row.path}
                </div>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {row.entries.map((entry, idx) => (
                    <Tag key={`${row.path}-${entry.fileKey}-${idx}`} color="orange">
                      {entry.fileKey}: {stringifyValue(entry.value)}
                    </Tag>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                selectedCaseIds.length
                  ? "No conflicting values found for selected case."
                  : "Select a case to check conflicts."
              }
            />
          )}
        </div>
      </Card>
      ) : null}

      {showAdvanced ? (
      <Card>
        <Text strong>Dropdown Mismatch Cases</Text>
        <div style={{ marginTop: 6 }}>
          <Text type="secondary">
            Cases where dropdown value does not map to valid target options after normalization.
          </Text>
        </div>
        <div
          style={{
            marginTop: 10,
            border: "1px solid #f0f0f0",
            borderRadius: 10,
            maxHeight: 300,
            overflow: "auto",
            padding: 10,
            background: "#fff",
          }}
        >
          {dropdownMismatchRows.length ? (
            dropdownMismatchRows.slice(0, 200).map((row, idx) => (
              <div
                key={`${row.caseId}-${row.targetField}-${idx}`}
                style={{ borderBottom: "1px solid #f5f5f5", padding: "8px 0" }}
              >
                <Space wrap>
                  <Tag color="volcano">Case: {row.caseId}</Tag>
                  <Tag color="blue">{row.targetField}</Tag>
                  <Tag color="gold">{row.reason}</Tag>
                  <Tag>{`raw: ${row.rawValue}`}</Tag>
                  <Tag>{`normalized: ${row.normalizedValue}`}</Tag>
                </Space>
              </div>
            ))
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No dropdown mismatches detected" />
          )}
        </div>
      </Card>
      ) : null}

      {showAdvanced ? (
      <Card>
        <Text strong>Unmapped Software Fields</Text>
        <div
          style={{
            marginTop: 10,
            border: "1px solid #f0f0f0",
            borderRadius: 10,
            maxHeight: 220,
            overflow: "auto",
            padding: 10,
          }}
        >
          {unmappedFields.length ? (
            <div className="flex flex-wrap gap-2">
              {unmappedFields.map((f) => (
                <Tag key={f} color="red">
                  {f}
                </Tag>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="All software fields are mapped" />
          )}
        </div>
      </Card>
      ) : null}
    </div>
  );
};

export default FieldMappingPage;
