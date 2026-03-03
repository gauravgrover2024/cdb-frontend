import React, { useEffect, useMemo, useState } from "react";
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
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import softwareSchema from "../schema/loan-module.schema.json";

const { Text, Title } = Typography;

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
      const candidate = tailPath ? getValueByPath(row, tailPath) : row;
      if (firstDefined === undefined && candidate !== undefined) firstDefined = candidate;
      if (isMeaningfulValue(candidate)) return candidate;
    }
    return firstDefined;
  }

  if (headVal && typeof headVal === "object") {
    return tailPath ? getValueByPath(headVal, tailPath) : headVal;
  }

  return getValueByPath(merged, sourcePath);
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
    const hitPath = candidates.find((p) =>
      String(p).toLowerCase().endsWith(`.${String(tail).toLowerCase()}`),
    );
    if (hitPath) {
      const val = getValueFromCaseMerged(merged, hitPath);
      if (isMeaningfulValue(val)) return val;
    }
  }
  return undefined;
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

    if (Array.isArray(val)) {
      out.add(next);
      if (val[0] && typeof val[0] === "object") flattenObject(val[0], next, out);
      return;
    }

    if (val && typeof val === "object") {
      flattenObject(val, next, out);
      return;
    }

    out.add(next);
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
      return castNumber(value, false);
    case "integer":
      return castNumber(value, true);
    case "boolean":
      return castBoolean(value);
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
  minHeight: 520,
  maxHeight: 520,
  overflow: "auto",
  background: "#fff",
};

const DEFAULT_IDENTIFIER_HINTS = [
  "CPV_ACCOUNT_NO",
  "CDB_ACCOUNT_NUMBER",
  "TEMP_CUST_CODE",
  "cpv_account_no",
  "cdb_account_number",
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

const stableStringify = (value) => {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
};

const normalizeMapKey = (value) => String(value ?? "").trim().toLowerCase();

const applyNormalizationRule = (rawValue, rules = {}) => {
  if (rawValue === undefined || rawValue === null) return rawValue;
  const direct = rules[String(rawValue)];
  if (direct !== undefined && direct !== "") return direct;
  const normalized = rules[normalizeMapKey(rawValue)];
  if (normalized !== undefined && normalized !== "") return normalized;
  return rawValue;
};

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
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const req = window.indexedDB.open(WORK_DRAFT_DB_NAME, 1);
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
  const targetFields = useMemo(() => {
    const all = Object.keys(softwareSchema?.properties || {});
    return all
      .filter((f) => !f.startsWith("__"))
      .sort((a, b) => {
        const aSources = softwareSchema?.properties?.[a]?.["x-sourceFiles"] || [];
        const bSources = softwareSchema?.properties?.[b]?.["x-sourceFiles"] || [];
        const aStage = getFieldStageMeta(aSources);
        const bStage = getFieldStageMeta(bSources);
        if (aStage.rank !== bStage.rank) return aStage.rank - bStage.rank;
        const aHead = String(aSources[0] || "");
        const bHead = String(bSources[0] || "");
        const bySource = aHead.localeCompare(bHead);
        if (bySource !== 0) return bySource;
        return a.localeCompare(b);
      });
  }, []);

  const [importedFiles, setImportedFiles] = useState([]);
  const [importError, setImportError] = useState("");

  const [identifierPaths, setIdentifierPaths] = useState([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);

  const [mapping, setMapping] = useState({});
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");

  const [selectedTarget, setSelectedTarget] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [profileName, setProfileName] = useState("");
  const [savedProfiles, setSavedProfiles] = useState(() => readSavedProfiles());
  const [normalizationRules, setNormalizationRules] = useState({});
  const [normalizationField, setNormalizationField] = useState("");
  const [hideMappedFields, setHideMappedFields] = useState(true);
  const [allowSourceReuse, setAllowSourceReuse] = useState(true);
  const [livePostUrl, setLivePostUrl] = useState("https://cdb-api.vercel.app/api/loans");
  const [livePostLoading, setLivePostLoading] = useState(false);
  const [livePostStatus, setLivePostStatus] = useState("");
  const [livePostResponse, setLivePostResponse] = useState("");
  const [postedCaseBackendIds, setPostedCaseBackendIds] = useState({});
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = (await readWorkingDraftFromDb()) || readWorkingDraft();
      if (!mounted) return;
      if (draft) {
        setIdentifierPaths(draft.identifierPaths || []);
        setSelectedCaseIds(draft.selectedCaseIds || []);
        setMapping(draft.mapping || {});
        setNormalizationRules(draft.normalizationRules || {});
        setNormalizationField(draft.normalizationField || "");
        setLeftSearch(draft.leftSearch || "");
        setRightSearch(draft.rightSearch || "");
        setHideMappedFields(
          typeof draft.hideMappedFields === "boolean" ? draft.hideMappedFields : true,
        );
        setAllowSourceReuse(
          typeof draft.allowSourceReuse === "boolean" ? draft.allowSourceReuse : true,
        );
        setLivePostUrl(draft.livePostUrl || "https://cdb-api.vercel.app/api/loans");
      setPostedCaseBackendIds(draft.postedCaseBackendIds || {});
      setProfileName(draft.profileName || "");
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

    const all = [...paths];
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

    const candidatesByNorm = new Map(
      identifierCandidates.map((p) => [normalizeKey(p), p]),
    );

    const defaults = DEFAULT_IDENTIFIER_HINTS.map((hint) => candidatesByNorm.get(normalizeKey(hint))).filter(Boolean);

    return [...new Set(defaults)];
  }, [identifierCandidates]);

  const { aliasToCanonical, caseGroups } = useMemo(() => {
    if (!identifierPaths.length) {
      return { aliasToCanonical: new Map(), caseGroups: new Map() };
    }

    const parent = new Map();
    const metaRows = [];

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

    importedFiles.forEach((file) => {
      file.records.forEach((record) => {
        const ids = identifierPaths
          .map((path) => getValueByPath(record, path))
          .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
          .map((v) => String(v).trim());

        if (!ids.length) return;

        ids.forEach((id) => init(id));
        for (let i = 1; i < ids.length; i += 1) union(ids[0], ids[i]);

        metaRows.push({
          fileKey: file.key,
          record,
          ids,
        });
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
      const identifiers = [...group.identifiers].sort((a, b) => a.localeCompare(b));
      const canonicalId = identifiers[0];
      const row = {
        canonicalId,
        identifiers,
        recordsByFile: group.recordsByFile,
      };
      groups.set(canonicalId, row);
      identifiers.forEach((id) => aliasMap.set(id, canonicalId));
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
    return [...out].sort();
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
    const base = hideMappedFields && !allowSourceReuse
      ? sourcePaths.filter((p) => !usedSourcePaths.has(String(p)))
      : sourcePaths;
    const q = rightSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((p) => p.toLowerCase().includes(q));
  }, [rightSearch, sourcePaths, hideMappedFields, allowSourceReuse, mapping]);

  const mappedEntries = useMemo(
    () =>
      Object.entries(mapping)
        .filter(([, source]) => !!source)
        .sort((a, b) => a[0].localeCompare(b[0])),
    [mapping],
  );

  const unmappedFields = useMemo(
    () => targetFields.filter((f) => !mapping[f]),
    [mapping, targetFields],
  );

  const mappingCoverage = useMemo(() => {
    if (!targetFields.length) return 0;
    return Math.round((mappedEntries.length / targetFields.length) * 100);
  }, [mappedEntries.length, targetFields.length]);

  const dropdownTargetFields = useMemo(
    () =>
      targetFields.filter((field) => {
        const node = softwareSchema?.properties?.[field];
        const typeHints = node?.["x-typeHints"] || [];
        return Array.isArray(node?.enum) || typeHints.includes("enum");
      }),
    [targetFields],
  );
  const dropdownFieldSet = useMemo(() => new Set(dropdownTargetFields), [dropdownTargetFields]);

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
        message.warning(`${file.name}: no object records found.`);
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
      message.success(`${file.name}: loaded ${records.length} records.`);
    } catch (e) {
      const err = `${file.name}: invalid JSON (${e.message})`;
      setImportError(err);
      message.error(err);
    }
  };

  const onAutoSelectIdentifiers = () => {
    if (!selectedIdentifierOptions.length) {
      message.warning("No identifier-like fields detected yet.");
      return;
    }

    setIdentifierPaths(selectedIdentifierOptions);
    setSelectedCaseIds([]);
    message.success("Identifier fields auto-selected.");
  };

  const onAutoSuggest = () => {
    if (!sourcePaths.length) {
      message.warning("Select a case first to load source fields.");
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
    message.success("Auto-suggest applied.");
  };

  const onMap = () => {
    if (!selectedTarget || !selectedSource) {
      message.warning("Select one software field and one imported field.");
      return;
    }
    setMapping((prev) => ({ ...prev, [selectedTarget]: selectedSource }));
  };

  const onUnmap = () => {
    if (!selectedTarget) {
      message.warning("Select a software field first.");
      return;
    }
    setMapping((prev) => ({ ...prev, [selectedTarget]: "" }));
  };

  const buildMappedLoanDoc = (caseId) => {
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

    // Keep output complete for Mongo import: every software field is present.
    targetFields.forEach((field) => {
      doc[field] = null;
    });

    mappedEntries.forEach(([targetField, sourcePath]) => {
      const rawValue = getValueFromCaseMerged(merged, sourcePath);
      const fieldRules = normalizationRules[targetField] || {};
      const normalizedValue = applyNormalizationRule(rawValue, fieldRules);
      const schemaNode = softwareSchema?.properties?.[targetField];
      doc[targetField] = castBySchemaType(normalizedValue, schemaNode);
    });

    // Backend safety fallback for mandatory fields when legacy keys vary.
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

    return doc;
  };

  const selectedMappedPreview = useMemo(() => {
    if (!activeSelectedCanonical || !caseGroups.has(activeSelectedCanonical)) return null;
    return buildMappedLoanDoc(activeSelectedCanonical);
  }, [activeSelectedCanonical, caseGroups, mappedEntries, identifierPaths, normalizationRules]);

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
      message.warning("Enter a profile name.");
      return;
    }

    const next = [
      ...savedProfiles.filter((p) => p.name !== name),
      {
        name,
        identifierPaths,
        mapping,
        normalizationRules,
        savedAt: new Date().toISOString(),
      },
    ].sort((a, b) => a.name.localeCompare(b.name));

    setSavedProfiles(next);
    writeSavedProfiles(next);
    message.success(`Saved profile: ${name}`);
  };

  const loadProfile = (name) => {
    const profile = savedProfiles.find((p) => p.name === name);
    if (!profile) {
      message.warning("Profile not found.");
      return;
    }
    setIdentifierPaths(profile.identifierPaths || []);
    setMapping(profile.mapping || {});
    setNormalizationRules(profile.normalizationRules || {});
    setProfileName(profile.name || "");
    setSelectedCaseIds([]);
    message.success(`Loaded profile: ${name}`);
  };

  const deleteProfile = (name) => {
    const next = savedProfiles.filter((p) => p.name !== name);
    setSavedProfiles(next);
    writeSavedProfiles(next);
    message.success(`Deleted profile: ${name}`);
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
    };
    downloadTextFile("loan-mapping-session-backup.json", JSON.stringify(payload, null, 2));
    message.success("Working session backup exported.");
  };

  const importWorkingSession = async (file) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setIdentifierPaths(parsed.identifierPaths || []);
      setSelectedCaseIds(parsed.selectedCaseIds || []);
      setMapping(parsed.mapping || {});
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
      setLivePostUrl(parsed.livePostUrl || "https://cdb-api.vercel.app/api/loans");
      setPostedCaseBackendIds(parsed.postedCaseBackendIds || {});
      setProfileName(parsed.profileName || "");
      setImportedFiles(Array.isArray(parsed.importedFiles) ? parsed.importedFiles : []);
      message.success("Working session restored.");
    } catch (e) {
      message.error(`Session import failed: ${e.message}`);
    }
  };

  const exportMongoReadyJsonArray = () => {
    if (!identifierPaths.length) {
      message.warning("Select one or more identifier fields first.");
      return;
    }

    if (!mappedEntries.length) {
      message.warning("Create at least one mapping first.");
      return;
    }

    const docs = scopedCanonicalCaseIds.map((caseId) => buildMappedLoanDoc(caseId));
    downloadTextFile("mongo-loans-ready.json", JSON.stringify(docs, null, 2));
    message.success(`Exported ${docs.length} Mongo-ready documents (JSON array).`);
    if (dropdownMismatchRows.length) {
      message.warning(
        `Found dropdown mismatches in ${mismatchCaseCount} cases. Download mismatch report.`,
      );
    }
  };

  const exportMongoReadyJsonl = () => {
    if (!identifierPaths.length) {
      message.warning("Select one or more identifier fields first.");
      return;
    }

    if (!mappedEntries.length) {
      message.warning("Create at least one mapping first.");
      return;
    }

    const lines = scopedCanonicalCaseIds.map((caseId) => JSON.stringify(buildMappedLoanDoc(caseId)));
    downloadTextFile("mongo-loans-ready.jsonl", `${lines.join("\n")}\n`, "application/x-ndjson");
    message.success(`Exported ${lines.length} Mongo-ready documents (JSONL).`);
    if (dropdownMismatchRows.length) {
      message.warning(
        `Found dropdown mismatches in ${mismatchCaseCount} cases. Download mismatch report.`,
      );
    }
  };

  const selectedSourceValue = useMemo(() => {
    if (!selectedSource || !selectedCaseMerged) return "";
    return stringifyValue(getValueFromCaseMerged(selectedCaseMerged, selectedSource));
  }, [selectedCaseMerged, selectedSource]);

  const postSelectedEntryLive = async () => {
    if (!selectedMappedPreview) {
      message.warning("Select a case first to post live.");
      return;
    }
    if (!livePostUrl.trim()) {
      message.warning("Enter backend endpoint URL.");
      return;
    }
    if (/localhost:3000/i.test(livePostUrl.trim())) {
      message.warning("This points to frontend dev server. Use backend API URL.");
      return;
    }
    const caseKey = activeSelectedCanonical || activeSelectedAlias;
    if (!caseKey) {
      message.warning("No active case selected.");
      return;
    }

    setLivePostLoading(true);
    setLivePostStatus("");
    setLivePostResponse("");

    try {
      const knownBackendId = postedCaseBackendIds[caseKey];
      const baseUrl = livePostUrl.replace(/\/+$/, "");
      const endpointUrl = knownBackendId ? `${baseUrl}/${knownBackendId}` : baseUrl;
      const method = knownBackendId ? "PUT" : "POST";

      const res = await fetch(endpointUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedMappedPreview),
      });

      const text = await res.text();
      let parsed = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        // keep text as-is
      }

      setLivePostStatus(`${method} ${res.status} ${res.statusText}`);
      setLivePostResponse(
        typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2),
      );

      if (res.ok) {
        if (!knownBackendId && parsed && typeof parsed === "object") {
          const backendId =
            parsed?._id ||
            parsed?.id ||
            parsed?.loanId ||
            parsed?.data?._id ||
            parsed?.data?.id ||
            parsed?.data?.loanId ||
            parsed?.loan?._id ||
            parsed?.loan?.id;
          if (backendId) {
            setPostedCaseBackendIds((prev) => ({
              ...prev,
              [caseKey]: String(backendId),
            }));
          }
        }
        message.success(
          knownBackendId
            ? "Selected entry updated successfully."
            : "Selected entry created successfully.",
        );
      } else {
        message.error("Backend returned an error. Check response panel.");
      }
    } catch (e) {
      setLivePostStatus("request_failed");
      setLivePostResponse(String(e?.message || e));
      message.error("Failed to reach backend endpoint.");
    } finally {
      setLivePostLoading(false);
    }
  };

  const normalizationRows = useMemo(() => {
    if (!normalizationField) return [];
    const existing = Object.keys(normalizationRules[normalizationField] || {});
    return [...new Set([...observedNormalizationValues, ...existing])].sort((a, b) =>
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
      <div>
        <Title level={4} style={{ marginBottom: 4 }}>
          Loan Field Selection and Mapping
        </Title>
        <Text type="secondary">
          Import all source JSON files, choose multiple case identifiers, preview one case, map fields, and export Mongo-ready loan documents.
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

            <Button onClick={onAutoSelectIdentifiers}>Auto Select ID Fields</Button>
            <Button onClick={onAutoSuggest}>Auto-suggest Mapping</Button>

            <Button type="primary" icon={<DownloadOutlined />} onClick={exportMappingTemplate}>
              Export Mapping
            </Button>

            <Button type="primary" ghost icon={<DownloadOutlined />} onClick={exportMongoReadyJsonArray}>
              Export Mongo JSON
            </Button>

            <Button type="primary" ghost icon={<DownloadOutlined />} onClick={exportMongoReadyJsonl}>
              Export Mongo JSONL
            </Button>

            <Button icon={<DownloadOutlined />} onClick={exportDropdownMismatchReport}>
              Export Dropdown Mismatch Report
            </Button>

            <Button icon={<DownloadOutlined />} onClick={exportWorkingSession}>
              Export Session Backup
            </Button>

            <Button
              onClick={() => {
                setImportedFiles([]);
                setIdentifierPaths([]);
                setSelectedCaseIds([]);
                setMapping({});
                setNormalizationRules({});
                setNormalizationField("");
                setPostedCaseBackendIds({});
                setAllowSourceReuse(true);
                setSelectedSource("");
                setSelectedTarget("");
                message.info("Imports and mappings cleared.");
              }}
            >
              Clear All
            </Button>
          </Space>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
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
                  message.warning("Enter profile name to delete.");
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
            <Tag color="purple">Raw records: {importedRecordCount}</Tag>
            <Tag color="gold">
              Cases found: {allCanonicalCaseIds.length} (aliases: {caseAliasOptions.length})
            </Tag>
            <Tag color="green">Mapped fields: {mappedEntries.length}</Tag>
            <Tag color="red">Pending fields: {unmappedFields.length}</Tag>
            <Tag color="cyan">Coverage: {mappingCoverage}%</Tag>
            <Tag color={dropdownMismatchRows.length ? "volcano" : "green"}>
              Dropdown mismatch cases: {mismatchCaseCount}
            </Tag>
            <Tag color={hideMappedFields ? "green" : "default"}>
              Hide mapped in lists: {hideMappedFields ? "ON" : "OFF"}
            </Tag>
            <Tag color={allowSourceReuse ? "green" : "default"}>
              Allow source reuse: {allowSourceReuse ? "ON" : "OFF"}
            </Tag>
            <Tag color="blue">Draft autosave: ON</Tag>
          </Space>

          <Space>
            <Button
              onClick={() => setHideMappedFields((prev) => !prev)}
              type={hideMappedFields ? "primary" : "default"}
            >
              {hideMappedFields ? "Show Mapped Fields" : "Hide Mapped Fields"}
            </Button>
            <Button
              onClick={() => setAllowSourceReuse((prev) => !prev)}
              type={allowSourceReuse ? "primary" : "default"}
            >
              {allowSourceReuse ? "Disable Source Reuse" : "Enable Source Reuse"}
            </Button>
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

          {!!importedFiles.length && (
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
                    <div style={{ marginTop: 4 }}>
                      <Tag color="blue">{stageMeta.label}</Tag>
                      {isDropdown ? <Tag color="magenta">dropdown</Tag> : null}
                      {softwareSchema?.required?.includes(field) ? <Tag color="red">required</Tag> : null}
                      {mapped ? <Tag color="green">mapped</Tag> : null}
                      {isDropdown && mapped ? (
                        <Tag color={normCount ? "cyan" : "orange"}>
                          {normCount ? `normalized (${normCount})` : "normalization pending"}
                        </Tag>
                      ) : null}
                    </div>
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

      <Card>
        <Text strong>Mapped Pairs</Text>
        <div
          style={{
            marginTop: 10,
            border: "1px solid #f0f0f0",
            borderRadius: 10,
            maxHeight: 240,
            overflow: "auto",
          }}
        >
          {mappedEntries.map(([target, source]) => (
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
              <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>{source}</div>
              <Button
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => setMapping((prev) => ({ ...prev, [target]: "" }))}
              />
            </div>
          ))}
          {!mappedEntries.length ? (
            <div style={{ padding: 16 }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No mappings created yet" />
            </div>
          ) : null}
        </div>
      </Card>

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
              placeholder="Select dropdown target field"
              value={normalizationField || undefined}
              onChange={(val) => setNormalizationField(val || "")}
              options={dropdownTargetFields.map((f) => ({
                label: `${f}${mapping[f] ? ` (${mapping[f]})` : ""}`,
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
                      {oldValue}
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
                            fieldMap[normalizeMapKey(oldValue)] = nextValue;
                          } else {
                            delete fieldMap[oldValue];
                            delete fieldMap[normalizeMapKey(oldValue)];
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

      <Card>
        <Text strong>Live Backend Post (Selected Entry)</Text>
        <div style={{ marginTop: 6 }}>
          <Text type="secondary">
            Posts the currently previewed mapped entry to your backend so you can validate real insertion/validation behavior.
          </Text>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2" style={{ marginTop: 10 }}>
          <Input
            className="md:col-span-2"
            placeholder="Backend POST endpoint"
            value={livePostUrl}
            onChange={(e) => setLivePostUrl(e.target.value)}
          />
          <Button type="primary" loading={livePostLoading} onClick={postSelectedEntryLive}>
            Create/Update Entry
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
            <Tag color="geekblue">
              Backend ID:{" "}
              {activeSelectedCanonical
                ? postedCaseBackendIds[activeSelectedCanonical] || "not linked yet"
                : "n/a"}
            </Tag>
          </Space>
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
    </div>
  );
};

export default FieldMappingPage;
