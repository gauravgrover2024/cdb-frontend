import { useState, useEffect, useCallback, useRef } from "react";
import { message } from "antd";
import { vehiclesApi } from "../api/vehicles";
import { featuresApi } from "../api/features";


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
    autofillPricing = false,
    onVehicleSelect,
  } = options;

  const normalize = (v) => String(v || "").trim().toLowerCase();
  const MODELS_CACHE_KEY = "vehicle_models_by_make_cache_v1";
  const VARIANTS_CACHE_KEY = "vehicle_variants_by_make_model_cache_v1";
  const MAKES_CACHE_KEY = "vehicle_makes_cache_v1";
  const MASTER_ROWS_CACHE_KEY = "vehicle_master_rows_cache_v1";

  const readCache = (key, fallback) => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  const writeCache = (key, value) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // no-op
    }
  };
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
  const toMasterRows = (rows) => {
    if (!Array.isArray(rows)) return [];
    const out = [];
    const seen = new Set();
    for (const row of rows) {
      const makeValue = String(row?.make || row?.brand || "").trim();
      const modelValue = String(row?.model || "").trim();
      const variantValue = String(row?.variant || "").trim();
      if (!makeValue) continue;
      const key = `${normalize(makeValue)}|${normalize(modelValue)}|${normalize(variantValue)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        make: makeValue,
        model: modelValue,
        variant: variantValue,
      });
    }
    return out;
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

  // Cache to avoid redundant API calls
  const cacheRef = useRef({
    makes: null,
    modelsByMake: {},
    variantsByMakeModel: {},
    featureRows: null,
  });
  const inFlightRef = useRef({
    makes: null,
    modelsByMake: {},
    variantsByMakeModel: {},
    masterRows: null,
  });

  const loadMasterRows = useCallback(async () => {
    if (Array.isArray(cacheRef.current.featureRows) && cacheRef.current.featureRows.length) {
      return cacheRef.current.featureRows;
    }
    const cachedRows = readCache(MASTER_ROWS_CACHE_KEY, []);
    if (Array.isArray(cachedRows) && cachedRows.length) {
      cacheRef.current.featureRows = cachedRows;
      return cachedRows;
    }
    if (inFlightRef.current.masterRows) {
      return inFlightRef.current.masterRows;
    }

    inFlightRef.current.masterRows = (async () => {
      try {
        const featuresRes = await featuresApi.getVariantsWithPrice();
        const rows = toMasterRows(Array.isArray(featuresRes?.data) ? featuresRes.data : []);
        cacheRef.current.featureRows = rows;
        writeCache(MASTER_ROWS_CACHE_KEY, rows);
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

  /* =========================
     FETCH UNIQUE MAKES
  ========================= */
  const fetchMakes = useCallback(async () => {
    if (Array.isArray(cacheRef.current.makes) && cacheRef.current.makes.length) {
      setMakes(cacheRef.current.makes);
      return;
    }
    const cachedMakes = readCache(MAKES_CACHE_KEY, []);
    if (Array.isArray(cachedMakes) && cachedMakes.length) {
      cacheRef.current.makes = cachedMakes;
      setMakes(cachedMakes);
      return;
    }
    if (inFlightRef.current.makes) {
      await inFlightRef.current.makes;
      return;
    }

    try {
      setLoading(true);
      // Fast path: lightweight distinct endpoint
      inFlightRef.current.makes = vehiclesApi.getUniqueMakes();
      const res = await inFlightRef.current.makes;
      let makesList = toLabelList(res?.data, ["make", "name", "label"]);

      // Background warm-up of master rows for fallback
      void loadMasterRows();

      // Fallback only if distinct endpoint is empty
      if (!makesList.length) {
        const masterRows = await loadMasterRows();
        makesList = toLabelList(masterRows, ["make"]);
      }

      cacheRef.current.makes = makesList;
      writeCache(MAKES_CACHE_KEY, makesList);
      setMakes(makesList);
    } catch (error) {
      console.error("Failed to load makes:", error);
      message.error("Failed to load vehicle makes");
      setMakes([]);
    } finally {
      inFlightRef.current.makes = null;
      setLoading(false);
    }
  }, [loadMasterRows]);


  /* =========================
     FETCH MODELS BY MAKE
  ========================= */
  const fetchModels = useCallback(async (selectedMake) => {
    if (!selectedMake) {
      setModels([]);
      return;
    }

    const cacheKey = selectedMake;
    if (cacheRef.current.modelsByMake[cacheKey]) {
      setModels(cacheRef.current.modelsByMake[cacheKey]);
      return;
    }
    const cachedModelsMap = readCache(MODELS_CACHE_KEY, {});
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
      inFlightRef.current.modelsByMake[cacheKey] = vehiclesApi.getUniqueModels(selectedMake);
      const res = await inFlightRef.current.modelsByMake[cacheKey];
      let modelsList = toLabelList(res?.data, ["model", "name", "label"]);

      // Fallback to master rows only if distinct endpoint is empty
      if (!modelsList.length) {
        const masterRows = await loadMasterRows();
        const targetMake = normalize(selectedMake);
        modelsList = toLabelList(
          masterRows.filter((r) => normalize(r?.make || r?.brand) === targetMake),
          ["model"],
        );
      }

      cacheRef.current.modelsByMake[cacheKey] = modelsList;
      const existing = readCache(MODELS_CACHE_KEY, {});
      existing[cacheKey] = modelsList;
      writeCache(MODELS_CACHE_KEY, existing);
      setModels(modelsList);
    } catch (error) {
      console.error("Failed to load models:", error);
      message.error("Failed to load vehicle models");
      setModels([]);
    } finally {
      inFlightRef.current.modelsByMake[cacheKey] = null;
      setLoading(false);
    }
  }, [loadMasterRows]);


  /* =========================
     FETCH VARIANTS BY MAKE + MODEL
  ========================= */
  const fetchVariants = useCallback(async (selectedMake, selectedModel) => {
    if (!selectedMake || !selectedModel) {
      setVariants([]);
      return;
    }

    const cacheKey = `${selectedMake}|${selectedModel}`;
    if (cacheRef.current.variantsByMakeModel[cacheKey]) {
      setVariants(cacheRef.current.variantsByMakeModel[cacheKey]);
      return;
    }
    const cachedVariantsMap = readCache(VARIANTS_CACHE_KEY, {});
    if (Array.isArray(cachedVariantsMap?.[cacheKey]) && cachedVariantsMap[cacheKey].length) {
      cacheRef.current.variantsByMakeModel[cacheKey] = cachedVariantsMap[cacheKey];
      setVariants(cachedVariantsMap[cacheKey]);
      return;
    }
    if (inFlightRef.current.variantsByMakeModel[cacheKey]) {
      await inFlightRef.current.variantsByMakeModel[cacheKey];
      return;
    }

    try {
      setLoading(true);
      // Fast path: lightweight distinct endpoint
      inFlightRef.current.variantsByMakeModel[cacheKey] = vehiclesApi.getUniqueVariants(selectedMake, selectedModel);
      const res = await inFlightRef.current.variantsByMakeModel[cacheKey];
      let variantsList = toLabelList(res?.data, ["variant", "name", "label"]);

      // Fallback to master rows only if distinct endpoint is empty
      if (!variantsList.length) {
        const masterRows = await loadMasterRows();
        const targetMake = normalize(selectedMake);
        const targetModel = normalize(selectedModel);
        variantsList = toLabelList(
          masterRows.filter(
            (r) =>
              normalize(r?.make || r?.brand) === targetMake &&
              normalize(r?.model) === targetModel,
          ),
          ["variant"],
        );
      }

      cacheRef.current.variantsByMakeModel[cacheKey] = variantsList;
      const existing = readCache(VARIANTS_CACHE_KEY, {});
      existing[cacheKey] = variantsList;
      writeCache(VARIANTS_CACHE_KEY, existing);
      setVariants(variantsList);
    } catch (error) {
      console.error("Failed to load variants:", error);
      message.error("Failed to load vehicle variants");
      setVariants([]);
    } finally {
      inFlightRef.current.variantsByMakeModel[cacheKey] = null;
      setLoading(false);
    }
  }, [loadMasterRows]);



  /* =========================
     FETCH VEHICLE DETAILS AND AUTO-POPULATE
  ========================= */
  // Memoize fetchVehicleDetails with only stable dependencies
  const fetchVehicleDetails = useCallback(
    async (selectedMake, selectedModel, selectedVariant) => {
      if (!selectedMake || !selectedModel || !selectedVariant) {
        setSelectedVehicle(null);
        return;
      }

      try {
        const response = await vehiclesApi.getByDetails(
          selectedMake,
          selectedModel,
          selectedVariant,
        );
        if (response.success && response.data) {
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
        } else {
          setSelectedVehicle(null);
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
    // Only depend on autofillPricing and onVehicleSelect, not form
    [autofillPricing, onVehicleSelect],
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

          // Invalidate cache for relevant data
          if (field === "make") {
            cacheRef.current.makes = null;
            await fetchMakes();
          } else if (field === "model" && make) {
            delete cacheRef.current.modelsByMake[make];
            await fetchModels(make);
          } else if (field === "variant" && make && model) {
            delete cacheRef.current.variantsByMakeModel[`${make}|${model}`];
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

      if (currentMake && currentModel && value && canLookupVehicleDetails(value)) {
        fetchVehicleDetails(currentMake, currentModel, value);
      } else {
        setSelectedVehicle(null);
      }
    },
    [form, makeFieldName, modelFieldName, fetchVehicleDetails, canLookupVehicleDetails],
  );

  /* =========================
     INITIALIZE DATA
  ========================= */
  useEffect(() => {
    fetchMakes();
  }, [fetchMakes]);

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
        fetchVehicleDetails(make, model, variant);
      }, 200); // 200ms debounce
    } else {
      setSelectedVehicle(null);
    }
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [make, model, variant, canLookupVehicleDetails, fetchVehicleDetails]);

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
        makes: null,
        modelsByMake: {},
        variantsByMakeModel: {},
      };
    },
  };
};
