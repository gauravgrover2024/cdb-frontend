import { apiClient } from "./client";
import { featuresApi } from "./features";
import API_BASE_URL from "../config/apiBaseUrl";

const CANDIDATE_ARRAY_KEYS = [
  "data",
  "vehicles",
  "items",
  "results",
  "rows",
  "list",
  "makes",
  "models",
  "variants",
];

const firstArrayFromObject = (obj) => {
  if (!obj || typeof obj !== "object") return null;

  for (const key of CANDIDATE_ARRAY_KEYS) {
    if (Array.isArray(obj[key])) return obj[key];
  }

  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) return value;
  }

  return null;
};

const normalizeArrayData = (payload) => {
  if (Array.isArray(payload)) return payload;

  const direct = firstArrayFromObject(payload);
  if (direct) return direct;

  const nestedData = firstArrayFromObject(payload?.data);
  if (nestedData) return nestedData;

  const nestedPayload = firstArrayFromObject(payload?.payload);
  if (nestedPayload) return nestedPayload;

  return [];
};

const withNormalizedData = (payload, data) => {
  if (Array.isArray(payload)) return { data };
  return { ...(payload || {}), data };
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();
const normalizeRegNo = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const isLocalApiBase = /localhost|127\.0\.0\.1/i.test(String(API_BASE_URL || ""));
const MASTER_RECORD_FALLBACK_BASES = ["https://cdb-api.vercel.app"];
const DISTINCT_FALLBACK_BASES = MASTER_RECORD_FALLBACK_BASES;
const normalizeCityText = (value) =>
  normalizeText(value).replace(/[^a-z0-9]/g, "");
const parseBooleanFlag = (value) => {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
};
const hasDiscontinuedDate = (value) => {
  if (value === undefined || value === null) return false;
  const raw = String(value).trim();
  if (!raw) return false;
  return raw.toLowerCase() !== "null";
};
const isVehicleRecordDiscontinued = (row) => {
  if (!row || typeof row !== "object") return false;
  return (
    parseBooleanFlag(row?.is_discontinued ?? row?.isDiscontinued) ||
    hasDiscontinuedDate(row?.discontinued_date ?? row?.discontinuedDate)
  );
};
const filterByDiscontinuedPreference = (rows, includeDiscontinued) => {
  if (includeDiscontinued) return rows;
  return rows.filter((row) => !isVehicleRecordDiscontinued(row));
};

const isCityMatch = (candidateCity, targetCity) => {
  const normalizedCandidate = normalizeCityText(candidateCity);
  const normalizedTarget = normalizeCityText(targetCity);
  if (!normalizedTarget) return true;
  if (!normalizedCandidate) return false;
  if (normalizedCandidate === normalizedTarget) return true;
  if (
    normalizedCandidate.includes(normalizedTarget) ||
    normalizedTarget.includes(normalizedCandidate)
  ) {
    return true;
  }
  return false;
};

const uniqueSorted = (items) => {
  if (!Array.isArray(items)) return [];

  const uniqueMap = new Map();
  for (const item of items) {
    const raw = String(item || "").trim();
    if (!raw) continue;
    const key = normalizeText(raw);
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, raw);
    }
  }

  return [...uniqueMap.values()].sort((a, b) => a.localeCompare(b));
};

const searchVehicleRecordsFromAbsoluteBase = async (baseUrl, query, limit = 20) => {
  const base = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!base) return [];
  const url = `${base}/api/vehicles/records/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(limit)}`;
  const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
  if (!res.ok) {
    throw new Error(`Vehicle record lookup failed (${res.status}) at ${base}`);
  }
  const payload = await res.json();
  return normalizeArrayData(payload);
};

const mapLoanToVehicleRecord = (loan = {}) => {
  const registrationNumber = String(
    loan?.vehicleRegNo ||
      loan?.vehicleRegdNumber ||
      loan?.rc_redg_no ||
      loan?.registrationNumber ||
      "",
  ).trim();
  const registrationNumberNormalized = normalizeRegNo(registrationNumber);
  if (!registrationNumberNormalized) return null;

  return {
    registrationNumber: registrationNumber || registrationNumberNormalized,
    registrationNumberNormalized,
    registrationNumberLast4: registrationNumberNormalized.slice(-4),
    make: String(loan?.vehicleMake || "").trim(),
    model: String(loan?.vehicleModel || "").trim(),
    variant: String(loan?.vehicleVariant || "").trim(),
    yearOfManufacture: String(
      loan?.yearOfManufacture || loan?.manufacturingYear || loan?.boughtInYear || "",
    ).trim(),
    engineNumber: String(loan?.engineNumber || loan?.rc_engine_no || "").trim(),
    chassisNumber: String(loan?.chassisNumber || loan?.rc_chassis_no || "").trim(),
    registrationDate: loan?.rc_redg_date || loan?.registrationDate || null,
    registrationCity: String(loan?.registrationCity || loan?.postfile_regd_city || "").trim(),
    hypothecation: String(loan?.hypothecationBank || "").trim(),
  };
};

const fallbackVehicleRecordsFromLoans = async (query, limit = 20) => {
  const payload = await apiClient.get(
    `/api/loans?search=${encodeURIComponent(query)}&limit=${encodeURIComponent(Math.max(limit * 5, 50))}`,
  );
  const rawRows = normalizeArrayData(payload);
  const q = normalizeRegNo(query);
  const suffix = q.slice(-4);

  const dedup = new Map();
  for (const loan of rawRows) {
    const row = mapLoanToVehicleRecord(loan);
    if (!row) continue;
    const normalized = row.registrationNumberNormalized;
    if (!normalized) continue;
    if (!normalized.includes(q) && !(suffix.length === 4 && normalized.endsWith(suffix))) {
      continue;
    }
    if (!dedup.has(normalized)) dedup.set(normalized, row);
    if (dedup.size >= limit) break;
  }

  return [...dedup.values()].slice(0, limit);
};

const fetchJsonFromAbsoluteBase = async (baseUrl, endpointPath, params = {}) => {
  const base = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!base) return null;
  const query = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = String(value);
      }
      return acc;
    }, {}),
  ).toString();
  const url = `${base}${endpointPath}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}`);
  }
  return res.json();
};

const FEATURE_ROWS_BY_CITY = new Map();
const VEHICLE_ROWS_BY_CITY = new Map();
const VEHICLE_ROWS_FETCHING = new Map();
const VEHICLE_LIST_LIMIT = 1000;
const VEHICLE_FALLBACK_MAX_ROWS = 2000;

const normalizeVehicleRecord = (row) => ({
  ...row,
  make: String(row?.make || row?.brand || row?.brandName || "").trim(),
  model: String(row?.model || row?.vehicleModel || row?.vehicle_name || "").trim(),
  variant: String(
    row?.variant || row?.variantName || row?.name || row?.vehicleVariant || "",
  ).trim(),
  city: String(
    row?.city ||
      row?.locationCity ||
      row?.showroomCity ||
      row?.pricingCity ||
      "",
  ).trim(),
});

const dedupeVehicleRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of rows) {
    const row = normalizeVehicleRecord(raw || {});
    if (!row.make || !row.model || !row.variant) continue;
    const key = `${normalizeText(row.make)}|${normalizeText(row.model)}|${normalizeText(row.variant)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
};

const fetchVehicleList = async (query) => {
  const limit = VEHICLE_LIST_LIMIT;
  let skip = 0;
  const allRows = [];

  while (true) {
    const pageQuery = { ...query, limit, skip };
    const queryString = new URLSearchParams(pageQuery).toString();
    const endpoint = `/api/vehicles?${queryString}`;

    const payload = await apiClient.get(endpoint);
    const fetched = normalizeArrayData(payload);
    if (Array.isArray(fetched)) {
      allRows.push(...fetched);
      if (allRows.length >= VEHICLE_FALLBACK_MAX_ROWS) {
        break;
      }
      const totalFromPayload = Number(payload?.count) || Number(payload?.total) || 0;
      if (totalFromPayload && totalFromPayload <= allRows.length) {
        break;
      }
      if (fetched.length < limit) {
        break;
      }
    } else {
      break;
    }

    skip += limit;
  }

  return allRows;
};

const fetchVehicleRowsByCity = async (city = null, includeDiscontinued = false) => {
  const cacheKeyBase = String(city || "").trim().toLowerCase() || "__all__";
  const cacheKey = `${cacheKeyBase}|${includeDiscontinued ? "all" : "active"}`;
  if (VEHICLE_ROWS_BY_CITY.has(cacheKey)) {
    return VEHICLE_ROWS_BY_CITY.get(cacheKey);
  }
  if (VEHICLE_ROWS_FETCHING.has(cacheKey)) {
    return VEHICLE_ROWS_FETCHING.get(cacheKey);
  }

  VEHICLE_ROWS_FETCHING.set(
    cacheKey,
    (async () => {
      const queryVariants = [];
      const normalizedCity = String(city || "").trim();
      if (normalizedCity) {
        queryVariants.push({
          city: normalizedCity,
          includeDiscontinued,
          limit: VEHICLE_LIST_LIMIT,
        });
      }
      queryVariants.push({ includeDiscontinued, limit: VEHICLE_LIST_LIMIT });

      let rows = [];
      let cityQuerySucceeded = false;
      for (const query of queryVariants) {
        try {
          const fetched = await fetchVehicleList(query);
          if (Array.isArray(fetched) && fetched.length) {
            rows = dedupeVehicleRows(fetched);
            cityQuerySucceeded = query.city ? true : cityQuerySucceeded;
            break;
          }
        } catch (error) {
          console.error("Failed to fetch vehicles master list", error);
          if (!normalizedCity) {
            continue;
          }
          if (
            query.city &&
            (String(query.city).trim().toLowerCase() ===
              normalizedCity.toLowerCase())
          ) {
            continue;
          }
        }
      }

      if (normalizedCity && cityQuerySucceeded) {
        rows = rows.filter((row) =>
          isCityMatch(row.city, normalizedCity),
        );
      }
      rows = filterByDiscontinuedPreference(rows, includeDiscontinued);

      VEHICLE_ROWS_BY_CITY.set(cacheKey, rows);
      return rows;
    })(),
  );

  try {
    return await VEHICLE_ROWS_FETCHING.get(cacheKey);
  } finally {
    VEHICLE_ROWS_FETCHING.delete(cacheKey);
  }
};

const pickVehicleFallback = async (
  endpointType,
  make = null,
  model = null,
  city = null,
  includeDiscontinued = false,
) => {
  const rows = await fetchVehicleRowsByCity(city, includeDiscontinued);
  let result = rows;
  if (city) {
    result = result.filter((r) => isCityMatch(r.city, city));
  }
  if (make) {
    const makeKey = normalizeText(make);
    result = result.filter((r) => normalizeText(r.make) === makeKey);
  }
  if (model) {
    const modelKey = normalizeText(model);
    result = result.filter((r) => normalizeText(r.model) === modelKey);
  }
  result = filterByDiscontinuedPreference(result, includeDiscontinued);

  if (endpointType === "makes") {
    return uniqueSorted(result.map((r) => r.make));
  }
  if (endpointType === "models") {
    return uniqueSorted(result.map((r) => r.model));
  }
  if (endpointType === "variants") {
    return uniqueSorted(result.map((r) => r.variant));
  }
  if (endpointType === "variantsWithPrice") {
    return result;
  }
  return [];
};

const fetchFeatureRowsByCity = async (city = null) => {
  const cacheKey = String(city || "").trim().toLowerCase() || "__all__";
  if (FEATURE_ROWS_BY_CITY.has(cacheKey)) {
    return FEATURE_ROWS_BY_CITY.get(cacheKey);
  }

  const queries = [];
  const normalizedCity = String(city || "").trim();
  if (normalizedCity) {
    queries.push({ city: normalizedCity });
  }
  queries.push({});

  let rows = [];
  let featureCityRowsFound = false;
  for (const query of queries) {
    try {
      const payload = await featuresApi.getVariantsWithPrice(query);
      const fetchedRows = Array.isArray(payload?.data) ? payload.data : [];
      rows = fetchedRows;
      if (fetchedRows.length) {
        featureCityRowsFound = Boolean(query.city);
        break;
      }
    } catch (error) {
      if (!normalizedCity) {
        throw error;
      }
      if (query.city) {
        continue;
      }
      throw error;
    }
  }

  const normalizedRows = rows.map((row) => ({
    ...row,
    make: String(row?.make || row?.brand || row?.brandName || "").trim(),
    model: String(row?.model || row?.modelName || "").trim(),
    variant: String(row?.variant || row?.variantName || row?.name || "").trim(),
    city: String(
      row?.city || row?.locationCity || row?.showroomCity || "",
    ).trim(),
  }));
  const finalRows =
    normalizedCity && featureCityRowsFound
      ? normalizedRows.filter((row) => isCityMatch(row.city, normalizedCity))
      : normalizedRows;
  FEATURE_ROWS_BY_CITY.set(cacheKey, finalRows);
  return finalRows;
};

const pickFeatureFallback = async (
  endpointType,
  make = null,
  model = null,
  city = null,
  includeDiscontinued = false,
) => {
  const rows = await fetchFeatureRowsByCity(city);
  let result = rows;

  if (make) {
    const makeKey = normalizeText(make);
    result = result.filter((r) => normalizeText(r.make) === makeKey);
  }
  if (model) {
    const modelKey = normalizeText(model);
    result = result.filter((r) => normalizeText(r.model) === modelKey);
  }
  result = filterByDiscontinuedPreference(result, includeDiscontinued);

  if (endpointType === "makes") {
    return uniqueSorted(result.map((r) => r.make));
  }
  if (endpointType === "models") {
    return uniqueSorted(result.map((r) => r.model));
  }
  if (endpointType === "variants") {
    return uniqueSorted(result.map((r) => r.variant));
  }
  if (endpointType === "variantsWithPrice") {
    return result.filter((r) => {
      if (city && !isCityMatch(r.city, city)) return false;
      if (make && normalizeText(r.make) !== normalizeText(make)) return false;
      if (model && normalizeText(r.model) !== normalizeText(model)) return false;
      return true;
    });
  }
  return [];
};

export const vehiclesApi = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const payload = await apiClient.get(`/api/vehicles?${query}`);
    return withNormalizedData(payload, normalizeArrayData(payload));
  },

  search: async (searchTerm) => {
    return await apiClient.get(`/api/vehicles?q=${encodeURIComponent(searchTerm)}`);
  },

  getById: async (id) => {
    return await apiClient.get(`/api/vehicles/${id}`);
  },

  create: async (data) => {
    return await apiClient.post("/api/vehicles", data);
  },

  update: async (id, data) => {
    return await apiClient.put(`/api/vehicles/${id}`, data);
  },

  delete: async (id) => {
    return await apiClient.delete(`/api/vehicles/${id}`);
  },

  bulkUpload: async (data) => {
     return await apiClient.post("/api/vehicles/bulk", data);
  },

  // Distinct values API
  getUniqueMakes: async (city = null, includeDiscontinued = false) => {
    try {
      const url = city
        ? `/api/vehicles/distinct/makes?city=${encodeURIComponent(city)}&includeDiscontinued=${includeDiscontinued ? "true" : "false"}`
        : `/api/vehicles/distinct/makes?includeDiscontinued=${includeDiscontinued ? "true" : "false"}`;
      const payload = await apiClient.get(url);
      const rows = normalizeArrayData(payload);
      return withNormalizedData(payload, rows);
    } catch (error) {
      console.error("Primary makes endpoint failed, using fallback", error);
    }
    if (isLocalApiBase) {
      for (const base of DISTINCT_FALLBACK_BASES) {
        try {
          const payload = await fetchJsonFromAbsoluteBase(base, "/api/vehicles/distinct/makes", {
            city,
            includeDiscontinued: includeDiscontinued ? "true" : "false",
          });
          const rows = normalizeArrayData(payload);
          if (rows.length) return withNormalizedData(payload, rows);
        } catch {
          // continue fallback chain
        }
      }
    }
    let fallback = await pickVehicleFallback(
      "makes",
      null,
      null,
      city,
      includeDiscontinued,
    );
    if (!fallback.length) {
      try {
        fallback = await pickFeatureFallback(
          "makes",
          null,
          null,
          city,
          includeDiscontinued,
        );
      } catch {}
    }
    return withNormalizedData([], fallback);
  },

  getUniqueModels: async (make, city = null, includeDiscontinued = false) => {
    let url = `/api/vehicles/distinct/models?make=${encodeURIComponent(make)}`;
    if (city) url += `&city=${encodeURIComponent(city)}`;
    url += `&includeDiscontinued=${includeDiscontinued ? "true" : "false"}`;
    try {
      const payload = await apiClient.get(url);
      const rows = normalizeArrayData(payload);
      return withNormalizedData(payload, rows);
    } catch (error) {
      console.error("Primary models endpoint failed, using fallback", error);
    }
    if (isLocalApiBase) {
      for (const base of DISTINCT_FALLBACK_BASES) {
        try {
          const payload = await fetchJsonFromAbsoluteBase(base, "/api/vehicles/distinct/models", {
            make,
            city,
            includeDiscontinued: includeDiscontinued ? "true" : "false",
          });
          const rows = normalizeArrayData(payload);
          if (rows.length) return withNormalizedData(payload, rows);
        } catch {
          // continue fallback chain
        }
      }
    }
    let fallback = await pickVehicleFallback(
      "models",
      make,
      null,
      city,
      includeDiscontinued,
    );
    if (!fallback.length) {
      try {
        fallback = await pickFeatureFallback(
          "models",
          make,
          null,
          city,
          includeDiscontinued,
        );
      } catch {}
    }
    return withNormalizedData([], fallback);
  },

  getUniqueVariants: async (make, model, city = null, includeDiscontinued = false) => {
    let url = `/api/vehicles/distinct/variants?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
    if (city) url += `&city=${encodeURIComponent(city)}`;
    url += `&includeDiscontinued=${includeDiscontinued ? "true" : "false"}`;
    try {
      const payload = await apiClient.get(url);
      const rows = normalizeArrayData(payload);
      return withNormalizedData(payload, rows);
    } catch (error) {
      console.error("Primary variants endpoint failed, using fallback", error);
    }
    if (isLocalApiBase) {
      for (const base of DISTINCT_FALLBACK_BASES) {
        try {
          const payload = await fetchJsonFromAbsoluteBase(base, "/api/vehicles/distinct/variants", {
            make,
            model,
            city,
            includeDiscontinued: includeDiscontinued ? "true" : "false",
          });
          const rows = normalizeArrayData(payload);
          if (rows.length) return withNormalizedData(payload, rows);
        } catch {
          // continue fallback chain
        }
      }
    }
    let fallback = await pickVehicleFallback(
      "variants",
      make,
      model,
      city,
      includeDiscontinued,
    );
    if (!fallback.length) {
      try {
        fallback = await pickFeatureFallback(
          "variants",
          make,
          model,
          city,
          includeDiscontinued,
        );
      } catch {}
    }
    return withNormalizedData([], fallback);
  },

  getVariantsWithPrice: async (
    make,
    model,
    city = null,
    includeDiscontinued = false,
  ) => {
    let url = `/api/vehicles/distinct/variants-with-price?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
    if (city) url += `&city=${encodeURIComponent(city)}`;
    url += `&includeDiscontinued=${includeDiscontinued ? "true" : "false"}`;
    try {
      const payload = await apiClient.get(url);
      const rows = normalizeArrayData(payload);
      return withNormalizedData(payload, rows);
    } catch (error) {
      console.error("Primary variants-with-price endpoint failed, using fallback", error);
    }
    if (isLocalApiBase) {
      for (const base of DISTINCT_FALLBACK_BASES) {
        try {
          const payload = await fetchJsonFromAbsoluteBase(
            base,
            "/api/vehicles/distinct/variants-with-price",
            {
              make,
              model,
              city,
              includeDiscontinued: includeDiscontinued ? "true" : "false",
            },
          );
          const rows = normalizeArrayData(payload);
          if (rows.length) return withNormalizedData(payload, rows);
        } catch {
          // continue fallback chain
        }
      }
    }
    let fallback = await pickVehicleFallback(
      "variantsWithPrice",
      make,
      model,
      city,
      includeDiscontinued,
    );
    if (!fallback.length) {
      try {
        fallback = await pickFeatureFallback(
          "variantsWithPrice",
          make,
          model,
          city,
          includeDiscontinued,
        );
      } catch {}
    }
    return withNormalizedData([], fallback);
  },

  getByDetails: async (make, model, variant, fuel = null, city = null) => {
    let url = `/api/vehicles/by-details?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&variant=${encodeURIComponent(variant)}`;
    if (fuel) url += `&fuel=${encodeURIComponent(fuel)}`;
    if (city) url += `&city=${encodeURIComponent(city)}`;
    const payload = await apiClient.get(url);

    // Keep backward-compatible shape for consumers expecting { success, data }.
    if (payload && typeof payload === "object" && "success" in payload) {
      return payload;
    }
    if (payload && typeof payload === "object" && "data" in payload) {
      return { success: true, data: payload.data };
    }
    if (payload && typeof payload === "object" && "vehicle" in payload) {
      return { success: true, data: payload.vehicle };
    }
    return { success: !!payload, data: payload || null };
  },

  getMedia: async (make, model, variant = null) => {
    let url = `/api/vehicles/media?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
    if (variant) url += `&variant=${encodeURIComponent(variant)}`;
    const payload = await apiClient.get(url);
    return withNormalizedData(payload, normalizeArrayData(payload));
  },

  searchMasterRecords: async (query, limit = 20) => {
    const q = String(query || "").trim();
    if (!q) return { success: true, data: [] };

    let primaryRows = [];
    let primaryPayload = null;
    let primaryError = null;

    try {
      primaryPayload = await apiClient.get(
        `/api/vehicles/records/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`,
      );
      primaryRows = normalizeArrayData(primaryPayload);
      if (primaryRows.length) return withNormalizedData(primaryPayload, primaryRows);
    } catch (error) {
      primaryError = error;
    }

    // Fallback 1: if local API is missing this route, try deployed backend endpoint.
    if (isLocalApiBase) {
      for (const base of MASTER_RECORD_FALLBACK_BASES) {
        try {
          const rows = await searchVehicleRecordsFromAbsoluteBase(base, q, limit);
          if (rows.length) {
            return withNormalizedData({ success: true, source: "remote-fallback" }, rows);
          }
        } catch (error) {
          // continue fallback chain
        }
      }
    }

    // Fallback 2: build candidates from loans search so autosuggest is still usable.
    try {
      const rows = await fallbackVehicleRecordsFromLoans(q, limit);
      if (rows.length) {
        return withNormalizedData({ success: true, source: "loans-fallback" }, rows);
      }
    } catch (error) {
      // ignore and return primary response shape
    }

    if (primaryError) {
      console.error("Vehicle registration master lookup failed", primaryError);
    }

    return withNormalizedData(primaryPayload || { success: true }, primaryRows);
  },
};
