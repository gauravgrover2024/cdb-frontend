import { useState, useEffect, useCallback, useRef } from "react";
import { message } from "antd";
import { vehiclesApi } from "../api/vehicles";

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
  });

  // Watch form values
  const make = form?.getFieldValue(makeFieldName);
  const model = form?.getFieldValue(modelFieldName);
  const variant = form?.getFieldValue(variantFieldName);

  /* =========================
     FETCH UNIQUE MAKES
  ========================= */
  const fetchMakes = useCallback(async () => {
    // Return cached data if available
    if (cacheRef.current.makes) {
      setMakes(cacheRef.current.makes);
      return;
    }

    try {
      setLoading(true);
      const response = await vehiclesApi.getUniqueMakes();
      const makesList = response.data || [];
      
      cacheRef.current.makes = makesList;
      setMakes(makesList);
    } catch (error) {
      console.error("Failed to load makes:", error);
      message.error("Failed to load vehicle makes");
    } finally {
      setLoading(false);
    }
  }, []);

  /* =========================
     FETCH MODELS BY MAKE
  ========================= */
  const fetchModels = useCallback(async (selectedMake) => {
    if (!selectedMake) {
      setModels([]);
      return;
    }

    // Return cached data if available
    const cacheKey = selectedMake;
    if (cacheRef.current.modelsByMake[cacheKey]) {
      setModels(cacheRef.current.modelsByMake[cacheKey]);
      return;
    }

    try {
      setLoading(true);
      const response = await vehiclesApi.getUniqueModels(selectedMake);
      const modelsList = response.data || [];
      
      cacheRef.current.modelsByMake[cacheKey] = modelsList;
      setModels(modelsList);
    } catch (error) {
      console.error("Failed to load models:", error);
      message.error("Failed to load vehicle models");
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* =========================
     FETCH VARIANTS BY MAKE + MODEL
  ========================= */
  const fetchVariants = useCallback(async (selectedMake, selectedModel) => {
    if (!selectedMake || !selectedModel) {
      setVariants([]);
      return;
    }

    // Return cached data if available
    const cacheKey = `${selectedMake}|${selectedModel}`;
    if (cacheRef.current.variantsByMakeModel[cacheKey]) {
      setVariants(cacheRef.current.variantsByMakeModel[cacheKey]);
      return;
    }

    try {
      setLoading(true);
      const response = await vehiclesApi.getUniqueVariants(selectedMake, selectedModel);
      const variantsList = response.data || [];
      
      cacheRef.current.variantsByMakeModel[cacheKey] = variantsList;
      setVariants(variantsList);
    } catch (error) {
      console.error("Failed to load variants:", error);
      message.error("Failed to load vehicle variants");
      setVariants([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
        const response = await vehiclesApi.getByDetails(selectedMake, selectedModel, selectedVariant);
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
        console.error("Failed to fetch vehicle details:", error);
        setSelectedVehicle(null);
      }
    },
    // Only depend on autofillPricing and onVehicleSelect, not form
    [autofillPricing, onVehicleSelect]
  );

  /* =========================
     HANDLE CUSTOM VEHICLE CREATION
  ========================= */
  const createCustomVehicle = useCallback(async (field, value) => {
    if (!value || value.trim() === "") return false;

    try {
      const newVehicleData = {
        make: field === 'make' ? value : make,
        model: field === 'model' ? value : (model || 'Other'),
        variant: field === 'variant' ? value : 'Standard',
        createdFrom: 'LOAN_FORM',
      };

      const response = await vehiclesApi.create(newVehicleData);
      
      if (response.success) {
        message.success(`"${value}" added to vehicle master data`);
        
        // Invalidate cache for relevant data
        if (field === 'make') {
          cacheRef.current.makes = null;
          await fetchMakes();
        } else if (field === 'model' && make) {
          delete cacheRef.current.modelsByMake[make];
          await fetchModels(make);
        } else if (field === 'variant' && make && model) {
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
  }, [make, model, fetchMakes, fetchModels, fetchVariants]);

  /* =========================
     HANDLE MAKE CHANGE
  ========================= */
  const handleMakeChange = useCallback((value) => {
    if (!form) return;

    // Clear dependent fields
    form.setFieldsValue({
      [modelFieldName]: undefined,
      [variantFieldName]: undefined,
    });

    setModels([]);
    setVariants([]);
    setSelectedVehicle(null);

    if (value) {
      fetchModels(value);
    }
  }, [form, modelFieldName, variantFieldName, fetchModels]);

  /* =========================
     HANDLE MODEL CHANGE
  ========================= */
  const handleModelChange = useCallback((value) => {
    if (!form) return;

    // Clear dependent fields
    form.setFieldsValue({
      [variantFieldName]: undefined,
    });

    setVariants([]);
    setSelectedVehicle(null);

    const currentMake = form.getFieldValue(makeFieldName);
    if (currentMake && value) {
      fetchVariants(currentMake, value);
    }
  }, [form, makeFieldName, variantFieldName, fetchVariants]);

  /* =========================
     HANDLE VARIANT CHANGE
  ========================= */
  const handleVariantChange = useCallback((value) => {
    if (!form) return;

    const currentMake = form.getFieldValue(makeFieldName);
    const currentModel = form.getFieldValue(modelFieldName);

    if (currentMake && currentModel && value) {
      fetchVehicleDetails(currentMake, currentModel, value);
    } else {
      setSelectedVehicle(null);
    }
  }, [form, makeFieldName, modelFieldName, fetchVehicleDetails]);

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
    if (make && model && variant) {
      debounceTimer = setTimeout(() => {
        fetchVehicleDetails(make, model, variant);
      }, 200); // 200ms debounce
    } else {
      setSelectedVehicle(null);
    }
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [make, model, variant]);

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
