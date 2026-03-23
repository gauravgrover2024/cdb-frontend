import { useState, useEffect, useCallback, useRef } from "react";
import { message } from "antd";
import { vehiclesApi } from "../api/vehicles";

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const stripLeadingPhrase = (text, phrase) => {
  const rawText = String(text || "").trim();
  const rawPhrase = String(phrase || "").trim();
  if (!rawText || !rawPhrase) return rawText;
  const pattern = new RegExp(
    `^${escapeRegex(rawPhrase).replace(/\s+/g, "[\\s\\-]*")}[\\s\\-:]*`,
    "i",
  );
  return rawText.replace(pattern, "").trim();
};

const cleanVariantLabel = (rawVariant, selectedMake, selectedModel) => {
  const raw = String(rawVariant || "").trim();
  if (!raw) return "";

  const make = String(selectedMake || "").trim();
  const model = String(selectedModel || "").trim();
  let cleaned = raw;

  const composedPrefix = [make, model].filter(Boolean).join(" ").trim();
  if (composedPrefix) cleaned = stripLeadingPhrase(cleaned, composedPrefix);
  if (model) cleaned = stripLeadingPhrase(cleaned, model);
  if (make) cleaned = stripLeadingPhrase(cleaned, make);

  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return cleaned || raw;
};

const toVariantDisplayMap = (rawVariants, selectedMake, selectedModel) => {
  const map = {};
  for (const raw of rawVariants) {
    const rawValue = String(raw || "").trim();
    if (!rawValue) continue;
    const displayValue = cleanVariantLabel(rawValue, selectedMake, selectedModel);
    if (!displayValue) continue;
    if (!map[displayValue]) map[displayValue] = rawValue;
  }
  const labels = Object.keys(map).sort((a, b) => a.localeCompare(b));
  return { labels, rawByDisplay: map };
};

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

const isVehicleRowDiscontinued = (row) =>
  parseBooleanFlag(row?.is_discontinued ?? row?.isDiscontinued) ||
  hasDiscontinuedDate(row?.discontinued_date ?? row?.discontinuedDate);

const filterRowsByDiscontinuedPreference = (rows, includeDiscontinued) => {
  if (!Array.isArray(rows)) return [];
  if (includeDiscontinued) return rows;
  return rows.filter((row) => !isVehicleRowDiscontinued(row));
};

const normalizeVehicleToken = (value) =>
  String(value || "").trim().toLowerCase();
const normalizeCityToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const isCityTokenMatch = (candidate, target) => {
  if (!target) return true;
  if (!candidate) return false;
  if (candidate === target) return true;
  return candidate.includes(target) || target.includes(candidate);
};

const uniqueNonEmptyValues = (items = []) => {
  const out = [];
  const seen = new Set();
  items.forEach((item) => {
    const value = String(item || "").trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(value);
  });
  return out;
};

const toBackendMakeCandidates = (make) => {
  const raw = String(make || "").trim();
  if (!raw) return [];
  const titleCased = `${raw.charAt(0).toUpperCase()}${raw.slice(1).toLowerCase()}`;
  return uniqueNonEmptyValues([raw, titleCased]);
};

const toMasterRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const makeValue = String(row?.make || row?.brand || "").trim();
    const modelValue = String(row?.model || "").trim();
    const variantValue = String(row?.variant || "").trim();
    if (!makeValue) continue;
    const cityValue = String(
      row?.city || row?.locationCity || row?.showroomCity || "",
    ).trim();
    const fuelValue = String(
      row?.fuel || row?.fuel_type || row?.fuelType || "",
    ).trim();
    const key = `${normalizeVehicleToken(makeValue)}|${normalizeVehicleToken(
      modelValue,
    )}|${normalizeVehicleToken(variantValue)}|${normalizeCityToken(
      cityValue,
    )}|${normalizeVehicleToken(fuelValue)}|${
      isVehicleRowDiscontinued(row) ? "discontinued" : "active"
    }`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      make: makeValue,
      model: modelValue,
      variant: variantValue,
      city: cityValue,
      fuel: fuelValue,
      fuel_type: row?.fuel_type,
      fuelType: row?.fuelType,
      exShowroom: row?.exShowroom,
      ex_showroom: row?.ex_showroom,
      exShowroomPrice: row?.exShowroomPrice,
      rto: row?.rto,
      roadTax: row?.roadTax,
      insurance: row?.insurance,
      insuranceCost: row?.insuranceCost,
      otherCharges: row?.otherCharges,
      onRoadPrice: row?.onRoadPrice,
      is_discontinued: row?.is_discontinued,
      isDiscontinued: row?.isDiscontinued,
      discontinued_date: row?.discontinued_date,
      discontinuedDate: row?.discontinuedDate,
    });
  }
  return out;
};

const VEHICLE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const parseCachePayload = (raw) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.__codexCache === true) {
      const ts = Number(parsed.ts) || 0;
      if (Date.now() - ts > VEHICLE_CACHE_TTL_MS) return null;
      return parsed.value;
    }
    // Backward compatibility with pre-envelope cache payloads.
    return parsed;
  } catch {
    return null;
  }
};

const readVehicleCache = (key, fallback) => {
  try {
    const sessionValue = parseCachePayload(sessionStorage.getItem(key));
    if (sessionValue !== null && sessionValue !== undefined) {
      return sessionValue;
    }
    const localValue = parseCachePayload(sessionStorage.getItem(key));
    if (localValue !== null && localValue !== undefined) {
      // Hydrate session cache for quicker current-tab reads.
      sessionStorage.setItem(
        key,
        JSON.stringify({ __codexCache: true, ts: Date.now(), value: localValue }),
      );
      return localValue;
    }
    return fallback;
  } catch {
    return fallback;
  }
};

const writeVehicleCache = (key, value) => {
  const payload = JSON.stringify({
    __codexCache: true,
    ts: Date.now(),
    value,
  });
  try {
    sessionStorage.setItem(key, payload);
  } catch {
    // no-op
  }
  try {
    sessionStorage.setItem(key, payload);
  } catch {
    // no-op
  }
};


/**
 * useVehicleData Hook
 *
 * Centralized hook for managing Vehicle Master Data across all modules.
 * Provides cascading dropdowns for Make → Model → Variant.
 *
 * Features:
 * - Fetches data from Vehicle Price List master data
 * - Cascading dropdowns (Make affects Models, Model affects Variants)
 * - Caching to minimize API calls
 * - Auto-population of vehicle pricing when all three are selected
 * - Support for custom vehicle creation
 *
 * @param {Object} form - Ant Design form instance
 * @param {Object} options - Configuration options
 * @param {string} options.makeFieldName - Form field name for Make (default: "vehicleMake")
 * @param {string} options.modelFieldName - Form field name for Model (default: "vehicleModel")
 * @param {string} options.variantFieldName - Form field name for Variant (default: "vehicleVariant")
 * @param {boolean} options.autofillPricing - Auto-populate pricing fields when vehicle is selected (default: false)
 * @param {Function} options.onVehicleSelect - Callback when a complete vehicle is selected
 *
 * @returns {Object} Vehicle data and handlers
 */
export const useVehicleData = (form, options = {}) => {
  const {
    makeFieldName = "vehicleMake",
    modelFieldName = "vehicleModel",
    variantFieldName = "vehicleVariant",
    cityFieldName = null,
    cityResolver = null,
    autofillPricing = false,
    onVehicleSelect,
    initialShowDiscontinued = false,
  } = options;

  const normalize = (v) => String(v || "").trim().toLowerCase();
  const MODELS_CACHE_KEY = "vehicle_models_by_make_cache_v2";
  const VARIANTS_CACHE_KEY = "vehicle_variants_by_make_model_cache_v3";
  const MAKES_CACHE_KEY = "vehicle_makes_cache_v2";
  const MASTER_ROWS_CACHE_KEY = "vehicle_master_rows_cache_v3";
  const toLabelList = (items, keys = []) => {
    if (!Array.isArray(items)) return [];
    const values = items
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          for (const key of keys) {
            if (item[key]) return String(item[key]).trim();
          }
        }
        return "";
      })
      .filter(Boolean);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  };
  const isVehicleNotFoundError = (error) => {
    const raw = String(error?.message || "").toLowerCase();
    return (
      raw.includes("vehicle not found") ||
      raw.includes("\"message\":\"vehicle not found\"") ||
      raw.includes("404")
    );
  };

  // State management
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showDiscontinuedCars, setShowDiscontinuedCars] = useState(
    Boolean(initialShowDiscontinued),
  );
  const discontinuedModeKey = showDiscontinuedCars ? "all" : "active";

  // Cache to avoid redundant API calls
  const cacheRef = useRef({
    makesByMode: {},
    modelsByMake: {},
    variantsByMakeModel: {},
    variantRawByDisplayByMakeModel: {},
    featureRows: null,
  });
  const inFlightRef = useRef({
    makesByMode: {},
    modelsByMake: {},
    variantsByMakeModel: {},
    masterRows: null,
  });

  const loadMasterRows = useCallback(async () => {
    if (Array.isArray(cacheRef.current.featureRows) && cacheRef.current.featureRows.length) {
      return cacheRef.current.featureRows;
    }
    const cachedRows = readVehicleCache(MASTER_ROWS_CACHE_KEY, []);
    if (Array.isArray(cachedRows) && cachedRows.length) {
      cacheRef.current.featureRows = cachedRows;
      return cachedRows;
    }
    if (inFlightRef.current.masterRows) {
      return inFlightRef.current.masterRows;
    }

    inFlightRef.current.masterRows = (async () => {
      try {
        const vehiclesRes = await vehiclesApi.getAll({ limit: 10000 });
        const rows = toMasterRows(Array.isArray(vehiclesRes?.data) ? vehiclesRes.data : []);
        cacheRef.current.featureRows = rows;
        writeVehicleCache(MASTER_ROWS_CACHE_KEY, rows);
        return rows;
      } catch {
        return [];
      } finally {
        inFlightRef.current.masterRows = null;
      }
    })();

    return inFlightRef.current.masterRows;
  }, []);

  // Watch form values
  const make = form?.getFieldValue(makeFieldName);
  const model = form?.getFieldValue(modelFieldName);
  const variant = form?.getFieldValue(variantFieldName);
  const cityValue = cityFieldName ? form?.getFieldValue(cityFieldName) : null;

  /* =========================
     FETCH UNIQUE MAKES
  ========================= */
  const fetchMakes = useCallback(async () => {
    const modeCacheKey = discontinuedModeKey;
    if (
      Array.isArray(cacheRef.current.makesByMode[modeCacheKey]) &&
      cacheRef.current.makesByMode[modeCacheKey].length
    ) {
      setMakes(cacheRef.current.makesByMode[modeCacheKey]);
      return;
    }
    const cachedMakesMap = readVehicleCache(MAKES_CACHE_KEY, {});
    const cachedMakes = cachedMakesMap?.[modeCacheKey];
    if (Array.isArray(cachedMakes) && cachedMakes.length) {
      cacheRef.current.makesByMode[modeCacheKey] = cachedMakes;
      setMakes(cachedMakes);
      return;
    }
    if (inFlightRef.current.makesByMode[modeCacheKey]) {
      await inFlightRef.current.makesByMode[modeCacheKey];
      return;
    }

    try {
      setLoading(true);
      // Fast path: lightweight distinct endpoint
      inFlightRef.current.makesByMode[modeCacheKey] = vehiclesApi.getUniqueMakes(
        null,
        showDiscontinuedCars,
      );
      const res = await inFlightRef.current.makesByMode[modeCacheKey];
      let makesList = toLabelList(res?.data, ["make", "name", "label"]);

      // Fallback only if distinct endpoint is empty
      if (!makesList.length) {
        const masterRows = await loadMasterRows();
        const filteredRows = filterRowsByDiscontinuedPreference(
          masterRows,
          showDiscontinuedCars,
        );
        makesList = toLabelList(filteredRows, ["make"]);
      }

      cacheRef.current.makesByMode[modeCacheKey] = makesList;
      const existing = readVehicleCache(MAKES_CACHE_KEY, {});
      existing[modeCacheKey] = makesList;
      writeVehicleCache(MAKES_CACHE_KEY, existing);
      setMakes(makesList);
    } catch (error) {
      console.error("Failed to load makes:", error);
      message.error("Failed to load vehicle makes");
      setMakes([]);
    } finally {
      inFlightRef.current.makesByMode[modeCacheKey] = null;
      setLoading(false);
    }
  }, [loadMasterRows, discontinuedModeKey, showDiscontinuedCars]);


  /* =========================
     FETCH MODELS BY MAKE
  ========================= */
  const fetchModels = useCallback(async (selectedMake) => {
    if (!selectedMake) {
      setModels([]);
      return;
    }

    const cacheKey = `${discontinuedModeKey}|${selectedMake}`;
    if (cacheRef.current.modelsByMake[cacheKey]) {
      setModels(cacheRef.current.modelsByMake[cacheKey]);
      return;
    }
    const cachedModelsMap = readVehicleCache(MODELS_CACHE_KEY, {});
    if (Array.isArray(cachedModelsMap?.[cacheKey]) && cachedModelsMap[cacheKey].length) {
      cacheRef.current.modelsByMake[cacheKey] = cachedModelsMap[cacheKey];
      setModels(cachedModelsMap[cacheKey]);
      return;
    }
    if (inFlightRef.current.modelsByMake[cacheKey]) {
      await inFlightRef.current.modelsByMake[cacheKey];
      return;
    }

    try {
      setLoading(true);
      // Fast path: lightweight distinct endpoint
      inFlightRef.current.modelsByMake[cacheKey] = vehiclesApi.getUniqueModels(
        selectedMake,
        null,
        showDiscontinuedCars,
      );
      const res = await inFlightRef.current.modelsByMake[cacheKey];
      let modelsList = toLabelList(res?.data, ["model", "name", "label"]);

      // Fallback to master rows only if distinct endpoint is empty
      if (!modelsList.length) {
        const masterRows = await loadMasterRows();
        const targetMake = normalize(selectedMake);
        const filteredRows = filterRowsByDiscontinuedPreference(
          masterRows,
          showDiscontinuedCars,
        );
        modelsList = toLabelList(
          filteredRows.filter((r) => normalize(r?.make || r?.brand) === targetMake),
          ["model"],
        );
      }

      cacheRef.current.modelsByMake[cacheKey] = modelsList;
      const existing = readVehicleCache(MODELS_CACHE_KEY, {});
      existing[cacheKey] = modelsList;
      writeVehicleCache(MODELS_CACHE_KEY, existing);
      setModels(modelsList);
    } catch (error) {
      console.error("Failed to load models:", error);
      message.error("Failed to load vehicle models");
      setModels([]);
    } finally {
      inFlightRef.current.modelsByMake[cacheKey] = null;
      setLoading(false);
    }
  }, [loadMasterRows, discontinuedModeKey, showDiscontinuedCars]);


  /* =========================
     FETCH VARIANTS BY MAKE + MODEL
  ========================= */
  const fetchVariants = useCallback(async (selectedMake, selectedModel) => {
    if (!selectedMake || !selectedModel) {
      setVariants([]);
      return;
    }

    const cacheKey = `${discontinuedModeKey}|${selectedMake}|${selectedModel}`;
    if (Array.isArray(cacheRef.current.variantsByMakeModel[cacheKey])) {
      setVariants(cacheRef.current.variantsByMakeModel[cacheKey]);
      return;
    }
    const cachedVariantsMap = readVehicleCache(VARIANTS_CACHE_KEY, {});
    const cachedEntry = cachedVariantsMap?.[cacheKey];
    if (Array.isArray(cachedEntry) && cachedEntry.length) {
      cacheRef.current.variantsByMakeModel[cacheKey] = cachedEntry;
      setVariants(cachedEntry);
      return;
    }
    if (cachedEntry && Array.isArray(cachedEntry.labels) && cachedEntry.labels.length) {
      cacheRef.current.variantsByMakeModel[cacheKey] = cachedEntry.labels;
      cacheRef.current.variantRawByDisplayByMakeModel[cacheKey] = cachedEntry.rawByDisplay || {};
      setVariants(cachedEntry.labels);
      return;
    }
    if (inFlightRef.current.variantsByMakeModel[cacheKey]) {
      await inFlightRef.current.variantsByMakeModel[cacheKey];
      return;
    }

    try {
      setLoading(true);
      // Fast path: lightweight distinct endpoint
      inFlightRef.current.variantsByMakeModel[cacheKey] =
        vehiclesApi.getUniqueVariants(
          selectedMake,
          selectedModel,
          null,
          showDiscontinuedCars,
        );
      const res = await inFlightRef.current.variantsByMakeModel[cacheKey];
      let variantsListRaw = toLabelList(res?.data, ["variant", "name", "label"]);

      // Fallback to master rows only if distinct endpoint is empty
      if (!variantsListRaw.length) {
        const masterRows = await loadMasterRows();
        const targetMake = normalize(selectedMake);
        const targetModel = normalize(selectedModel);
        const filteredRows = filterRowsByDiscontinuedPreference(
          masterRows,
          showDiscontinuedCars,
        );
        variantsListRaw = toLabelList(
          filteredRows.filter(
            (r) =>
              normalize(r?.make || r?.brand) === targetMake &&
              normalize(r?.model) === targetModel,
          ),
          ["variant"],
        );
      }
      const { labels, rawByDisplay } = toVariantDisplayMap(
        variantsListRaw,
        selectedMake,
        selectedModel,
      );
      cacheRef.current.variantsByMakeModel[cacheKey] = labels;
      cacheRef.current.variantRawByDisplayByMakeModel[cacheKey] = rawByDisplay;
      const existing = readVehicleCache(VARIANTS_CACHE_KEY, {});
      existing[cacheKey] = { labels, rawByDisplay };
      writeVehicleCache(VARIANTS_CACHE_KEY, existing);
      setVariants(labels);
    } catch (error) {
      console.error("Failed to load variants:", error);
      message.error("Failed to load vehicle variants");
      setVariants([]);
    } finally {
      inFlightRef.current.variantsByMakeModel[cacheKey] = null;
      setLoading(false);
    }
  }, [loadMasterRows, discontinuedModeKey, showDiscontinuedCars]);



  /* =========================
     FETCH VEHICLE DETAILS AND AUTO-POPULATE
  ========================= */
  // Memoize fetchVehicleDetails with only stable dependencies
  const fetchVehicleDetails = useCallback(
    async (selectedMake, selectedModel, selectedVariant, selectedCity = null) => {
      if (!selectedMake || !selectedModel || !selectedVariant) {
        setSelectedVehicle(null);
        return;
      }

      try {
        const cacheKey = `${discontinuedModeKey}|${selectedMake}|${selectedModel}`;
        const rawByDisplay =
          cacheRef.current.variantRawByDisplayByMakeModel?.[cacheKey] || {};
        const resolvedVariant = rawByDisplay[selectedVariant] || selectedVariant;
        const resolvedCity = cityResolver
          ? cityResolver(selectedCity, form)
          : selectedCity;
        const normalizedSelectedVariant = normalize(selectedVariant);

        const variantCandidates = [
          resolvedVariant,
          selectedVariant,
          `${selectedMake} ${selectedModel} ${selectedVariant}`,
          `${selectedMake} ${selectedVariant}`,
          `${selectedModel} ${selectedVariant}`,
        ];

        const masterRows = await loadMasterRows();
        if (Array.isArray(masterRows) && masterRows.length) {
          const targetMake = normalize(selectedMake);
          const targetModel = normalize(selectedModel);
          masterRows.forEach((row) => {
            if (normalize(row?.make || row?.brand) !== targetMake) return;
            if (normalize(row?.model) !== targetModel) return;
            const rawVariant = String(row?.variant || "").trim();
            if (!rawVariant) return;
            const displayVariant = cleanVariantLabel(
              rawVariant,
              selectedMake,
              selectedModel,
            );
            if (
              normalize(rawVariant) === normalizedSelectedVariant ||
              normalize(displayVariant) === normalizedSelectedVariant
            ) {
              variantCandidates.push(rawVariant);
            }
          });
        }

        const finalVariantCandidates = uniqueNonEmptyValues(variantCandidates);
        const cityForLookup = String(resolvedCity || "").trim() || null;
        const makeCandidates = toBackendMakeCandidates(selectedMake);
        const cityToken = normalizeCityToken(cityForLookup);
        let response = null;

        const localMatches = [];
        if (Array.isArray(masterRows) && masterRows.length) {
          for (const makeCandidate of makeCandidates) {
            const makeToken = normalize(makeCandidate);
            const modelToken = normalize(selectedModel);
            for (const variantCandidate of finalVariantCandidates) {
              const variantToken = normalize(variantCandidate);
              masterRows.forEach((row) => {
                if (normalize(row?.make || row?.brand) !== makeToken) return;
                if (normalize(row?.model) !== modelToken) return;
                if (normalize(row?.variant) !== variantToken) return;
                localMatches.push(row);
              });
            }
          }
        }

        if (localMatches.length) {
          const cityMatched = localMatches.filter((row) =>
            isCityTokenMatch(normalizeCityToken(row?.city), cityToken),
          );
          const best =
            cityMatched.find(
              (row) =>
                row?.exShowroom !== undefined &&
                row?.exShowroom !== null &&
                String(row?.exShowroom).trim() !== "",
            ) ||
            cityMatched[0] ||
            localMatches.find(
              (row) =>
                row?.exShowroom !== undefined &&
                row?.exShowroom !== null &&
                String(row?.exShowroom).trim() !== "",
            ) ||
            localMatches[0];

          if (best) {
            response = { success: true, data: best };
          }
        }
        const tryLookupByCandidates = async (cityValue) => {
          for (const makeCandidate of makeCandidates) {
            for (const variantCandidate of finalVariantCandidates) {
              try {
                const attempt = await vehiclesApi.getByDetails(
                  makeCandidate,
                  selectedModel,
                  variantCandidate,
                  null,
                  cityValue,
                );
                if (attempt?.success && attempt?.data) {
                  return attempt;
                }
              } catch (error) {
                if (!isVehicleNotFoundError(error)) {
                  throw error;
                }
              }
            }
          }
          return null;
        };

        response = response || (await tryLookupByCandidates(cityForLookup));
        if ((!response?.success || !response?.data) && cityForLookup) {
          response = await tryLookupByCandidates(null);
        }

        if (!response?.success || !response?.data) {
          setSelectedVehicle(null);
          return;
        }

        const vehicleData = response.data;
        setSelectedVehicle(vehicleData);

        // Auto-populate pricing fields if enabled
        if (autofillPricing && form) {
          const pricingFields = {
            exShowroomPrice: vehicleData.exShowroom,
            rto: vehicleData.rto,
            insurance: vehicleData.insurance,
            otherCharges: vehicleData.otherCharges,
            onRoadPrice: vehicleData.onRoadPrice,
          };
          const currentValues = form.getFieldsValue();
          const fieldsToUpdate = {};
          Object.entries(pricingFields).forEach(([key, value]) => {
            if (value && !currentValues[key]) {
              fieldsToUpdate[key] = value;
            }
          });
          if (Object.keys(fieldsToUpdate).length > 0) {
            form.setFieldsValue(fieldsToUpdate);
          }
        }
        if (onVehicleSelect) {
          onVehicleSelect(vehicleData);
        }
      } catch (error) {
        // Legacy/migrated values may not exist in master vehicle DB.
        // Do not spam console or disturb UX for known 404-not-found cases.
        if (!isVehicleNotFoundError(error)) {
          console.error("Failed to fetch vehicle details:", error);
        }
        setSelectedVehicle(null);
      }
    },
    [
      autofillPricing,
      onVehicleSelect,
      cityResolver,
      form,
      discontinuedModeKey,
      loadMasterRows,
    ],
  );

  const canLookupVehicleDetails = useCallback(
    (selectedVariant) => {
      if (!selectedVariant) return false;
      // For migrated/legacy values not present in current master list, skip lookup to avoid noisy 404s.
      if (!Array.isArray(variants) || variants.length === 0) return true;
      const target = normalize(selectedVariant);
      return variants.some((v) => normalize(v) === target);
    },
    [variants],
  );

  /* =========================
     HANDLE CUSTOM VEHICLE CREATION
  ========================= */
  const createCustomVehicle = useCallback(
    async (field, value) => {
      if (!value || value.trim() === "") return false;

      try {
        const newVehicleData = {
          make: field === "make" ? value : make,
          model: field === "model" ? value : model || "Other",
          variant: field === "variant" ? value : "Standard",
          createdFrom: "LOAN_FORM",
        };

        const response = await vehiclesApi.create(newVehicleData);

        if (response.success) {
          message.success(`"${value}" added to vehicle master data`);

          // Invalidate cached make/model/variant lists across both active/all modes.
          cacheRef.current.makesByMode = {};
          cacheRef.current.modelsByMake = {};
          cacheRef.current.variantsByMakeModel = {};
          cacheRef.current.variantRawByDisplayByMakeModel = {};
          writeVehicleCache(MAKES_CACHE_KEY, {});
          writeVehicleCache(MODELS_CACHE_KEY, {});
          writeVehicleCache(VARIANTS_CACHE_KEY, {});

          if (field === "make") {
            await fetchMakes();
          } else if (field === "model" && make) {
            await fetchModels(make);
          } else if (field === "variant" && make && model) {
            await fetchVariants(make, model);
          }

          return true;
        }
        return false;
      } catch (error) {
        console.error("Failed to create custom vehicle:", error);
        // Don't show error to user - they can still use the custom value
        return false;
      }
    },
    [make, model, fetchMakes, fetchModels, fetchVariants],
  );

  /* =========================
     HANDLE MAKE CHANGE
  ========================= */
  const handleMakeChange = useCallback(
    (value) => {
      if (!form) return;

      // Clear dependent fields
      form.setFieldsValue({
        [modelFieldName]: undefined,
        [variantFieldName]: undefined,
      });

      setModels([]);
      setVariants([]);
      setSelectedVehicle(null);
    },
    [form, modelFieldName, variantFieldName],
  );

  /* =========================
     HANDLE MODEL CHANGE
  ========================= */
  const handleModelChange = useCallback(
    (value) => {
      if (!form) return;

      // Clear dependent fields
      form.setFieldsValue({
        [variantFieldName]: undefined,
      });

      setVariants([]);
      setSelectedVehicle(null);
    },
    [form, variantFieldName],
  );

  /* =========================
     HANDLE VARIANT CHANGE
  ========================= */
  const handleVariantChange = useCallback(
    (value) => {
      if (!form) return;

      const currentMake = form.getFieldValue(makeFieldName);
      const currentModel = form.getFieldValue(modelFieldName);
      const currentCity = cityFieldName ? form.getFieldValue(cityFieldName) : null;

      if (currentMake && currentModel && value && canLookupVehicleDetails(value)) {
        fetchVehicleDetails(currentMake, currentModel, value, currentCity);
      } else {
        setSelectedVehicle(null);
      }
    },
    [
      form,
      makeFieldName,
      modelFieldName,
      cityFieldName,
      fetchVehicleDetails,
      canLookupVehicleDetails,
    ],
  );

  /* =========================
     INITIALIZE DATA
  ========================= */
  useEffect(() => {
    fetchMakes();
  }, [fetchMakes]);

  useEffect(() => {
    // Warm master rows in background so price/fuel lookup is instant on first variant select.
    loadMasterRows();
  }, [loadMasterRows]);

  /* =========================
     WATCH MAKE CHANGES
  ========================= */
  useEffect(() => {
    if (make) {
      fetchModels(make);
    } else {
      setModels([]);
      setVariants([]);
    }
  }, [make, fetchModels]);

  /* =========================
     WATCH MODEL CHANGES
  ========================= */
  useEffect(() => {
    if (make && model) {
      fetchVariants(make, model);
    } else {
      setVariants([]);
    }
  }, [make, model, fetchVariants]);

  /* =========================
     WATCH VARIANT CHANGES
  ========================= */
  // Only trigger fetchVehicleDetails when make/model/variant change, and debounce to avoid rapid repeated calls
  useEffect(() => {
    let debounceTimer;
    if (make && model && variant && canLookupVehicleDetails(variant)) {
      debounceTimer = setTimeout(() => {
        fetchVehicleDetails(make, model, variant, cityValue);
      }, 60); // keep tiny debounce for rapid typing without visible lag
    } else {
      setSelectedVehicle(null);
    }
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [make, model, variant, cityValue, canLookupVehicleDetails, fetchVehicleDetails]);

  return {
    // Data
    makes,
    models,
    variants,
    selectedVehicle,
    loading,

    // Handlers
    handleMakeChange,
    handleModelChange,
    handleVariantChange,
    createCustomVehicle,

    // Manual refresh functions
    refreshMakes: fetchMakes,
    refreshModels: () => make && fetchModels(make),
    refreshVariants: () => make && model && fetchVariants(make, model),

    // Cache control
    clearCache: () => {
      cacheRef.current = {
        makesByMode: {},
        modelsByMake: {},
        variantsByMakeModel: {},
        variantRawByDisplayByMakeModel: {},
        featureRows: null,
      };
    },
    showDiscontinuedCars,
    setShowDiscontinuedCars,
  };
};
