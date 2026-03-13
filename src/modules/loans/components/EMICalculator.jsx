import React, { useState, useEffect, useMemo, useRef } from "react";
import { Input, Select, message, Modal, AutoComplete } from "antd";
import VehiclePricingPopup from "./VehiclePricingPopup";
import VehicleMediaGallery from "./VehicleMediaGallery";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import { vehiclesApi } from "../../../api/vehicles";
import { motion, useSpring } from "framer-motion";
import { quotationsApi } from "../../../api/quotations";
import { useLocation } from "react-router-dom";
import { featuresApi } from "../../../api/features";

const { Option } = Select;

const Label = ({ children }) => (
  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
    {children}
  </div>
);

// ---------- Animated number ----------

const AnimatedNumber = ({ value, className }) => {
  const spring = useSpring(value || 0, {
    mass: 0.8,
    stiffness: 80,
    damping: 18,
  });

  useEffect(() => {
    spring.set(value || 0);
  }, [value, spring]);

  return (
    <motion.span className={className}>
      {/* spring is a motion value; React can't render it directly, so we subscribe and render its current number */}
      {spring.get() !== undefined
        ? `₹${Math.round(spring.get()).toLocaleString("en-IN")}`
        : "₹0"}
    </motion.span>
  );
};

// ---------- Math helpers ----------

const solveEMI = (P, rMonthly, nMonths) => {
  if (P <= 0 || rMonthly <= 0 || nMonths <= 0) return 0;
  const x = Math.pow(1 + rMonthly, nMonths);
  return (P * rMonthly * x) / (x - 1);
};

const trimLeadingToken = (value = "", token = "") => {
  const source = String(value || "").trim();
  const prefix = String(token || "").trim();
  if (!source || !prefix) return source;

  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(`^${escaped}\\s+`, "i"), "").trim();
};

const canonicalizeMake = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");

  const aliases = {
    mercedes: "mercedes benz",
    "mercedes benz": "mercedes benz",
    benz: "mercedes benz",
    maruti: "maruti suzuki",
    "maruti suzuki": "maruti suzuki",
  };

  return aliases[normalized] || normalized;
};

const presentMake = (vehicle = {}) =>
  String(vehicle.make || vehicle.brand || "").trim();

const presentModel = (vehicle = {}) => {
  const rawModel = String(vehicle.model || "").trim();
  const make = presentMake(vehicle);
  return trimLeadingToken(rawModel, make);
};

const presentVariant = (vehicle = {}) => {
  const rawVariant = String(vehicle.variant || "").trim();
  const make = presentMake(vehicle);
  const rawModel = String(vehicle.model || "").trim();
  const model = presentModel(vehicle);

  return (
    trimLeadingToken(
      trimLeadingToken(
        trimLeadingToken(trimLeadingToken(rawVariant, `${make} ${rawModel}`), rawModel),
        `${make} ${model}`,
      ),
      make,
    ) || rawVariant
  );
};

const cleanName = (str = "") => String(str || "").trim();
const cleanVariant = (variant = "", make = "", model = "") => {
  const raw = String(variant || "").trim();
  const makeValue = String(make || "").trim();
  const modelValue = String(model || "").trim();
  const modelWithoutMake = trimLeadingToken(modelValue, makeValue);

  return (
    trimLeadingToken(
      trimLeadingToken(
        trimLeadingToken(
          trimLeadingToken(raw, `${makeValue} ${modelValue}`.trim()),
          modelValue,
        ),
        `${makeValue} ${modelWithoutMake}`.trim(),
      ),
      makeValue,
    ) || raw
  );
};

const solvePrincipal = (emi, rMonthly, nMonths) => {
  if (emi <= 0 || rMonthly <= 0 || nMonths <= 0) return 0;
  const x = Math.pow(1 + rMonthly, nMonths);
  return (emi * (x - 1)) / (rMonthly * x);
};

const solveTenure = (emi, P, rMonthly) => {
  if (emi <= 0 || P <= 0 || rMonthly <= 0 || emi <= P * rMonthly) return 0;
  const num = Math.log(emi) - Math.log(emi - P * rMonthly);
  const den = Math.log(1 + rMonthly);
  return num / den;
};

const solveRate = (emi, P, nMonths) => {
  if (emi <= 0 || P <= 0 || nMonths <= 0) return 0;
  let low = 0.0001;
  let high = 0.05;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const guessEmi = solveEMI(P, mid, nMonths);
    if (guessEmi > emi) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
};

const normalizeValueLabel = (raw) => {
  if (raw == null) return "Not Available";
  const v = String(raw).trim().toLowerCase();
  if (["yes", "y", "available", "present"].includes(v)) return "Yes";
  if (["no", "n", "not available", "na", "n/a"].includes(v))
    return "Not Available";
  return raw;
};

const formatINR = (num) =>
  isNaN(num) ? "₹0" : `₹${Math.round(num).toLocaleString("en-IN")}`;

const formatNumber = (v) =>
  v === "" || v === null || isNaN(v)
    ? ""
    : Math.round(v).toLocaleString("en-IN");

const parseNumber = (str) => Number(String(str).replace(/,/g, "")) || 0;

const normalizeLookup = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");

const normalizeMakeLookup = (value) => canonicalizeMake(value);
const normalizeModelLookup = (value, make = "") => {
  const normalized = normalizeLookup(value);
  const canonicalMake = normalizeMakeLookup(make);
  return normalized.startsWith(`${canonicalMake} `)
    ? normalized.slice(canonicalMake.length + 1)
    : normalized;
};

const toAmount = (value) => {
  if (value == null || value === "") return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const cleaned = String(value).replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const titleizeLabel = (key = "") =>
  String(key || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const BLOCKED_OTHER_LABELS = [
  "total accessories",
  "total accessories in rs",
  "total other charges",
  "orp without accessories",
  "on road price",
  "on-road price",
  "net on-road",
];

const sanitizeOtherItems = (items) =>
  (Array.isArray(items) ? items : []).filter((item) => {
    const label = String(item?.label || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!label) return false;
    return !BLOCKED_OTHER_LABELS.some((blocked) => label.includes(blocked));
  });

const buildVehiclePricingSeed = (vehicle = {}) => {
  const additionsOthers = [];
  const pushAddition = (label, amount) => {
    const normalizedAmount = toAmount(amount);
    if (!normalizedAmount) return;
    additionsOthers.push({ label, amount: normalizedAmount });
  };

  const exShowroom = toAmount(vehicle.exShowroom ?? vehicle.ex_showroom);
  const insurance = toAmount(vehicle.insurance);
  const rto = toAmount(vehicle.rto);
  const tcs = toAmount(vehicle.tcs ?? vehicle.other_tcsCharges ?? vehicle.otherCharges);

  const accessories = toAmount(
    vehicle.accessories ??
      vehicle.optional_accessoriesCharges,
  );
  const extendedWarranty = toAmount(
    vehicle.extendedWarranty ?? vehicle.optional_extendedWarrantyCharges,
  );
  const fastag = toAmount(vehicle.fastag);
  const epc = toAmount(vehicle.epc);

  const handledAdditionKeys = new Set([
    "optional_accessoriesCharges",
    "optional_totalAccessories",
    "optional_totalAccessoriesInRs",
    "optional_extendedWarrantyCharges",
    "optional_total",
    "optional_list",
    "optional_totalInRs",
    "other_totalOtherCharges",
    "other_totalOtherChargesInRsFormat",
    "other_tcsCharges",
    "total_on_road_with_accessories",
    "on_road_price_cardekho",
    "orp_without_accessories",
    "raw_price_json",
    "ex_showroom",
    "insurance",
    "rto",
    "tcs",
    "otherCharges",
    "other_list",
  ]);

  Object.entries(vehicle || {}).forEach(([key, value]) => {
    if (!/^optional_|^other_/.test(key)) return;
    if (handledAdditionKeys.has(key)) return;
    pushAddition(titleizeLabel(key.replace(/^optional_|^other_/, "")), value);
  });

  const computedBefore =
    exShowroom +
    insurance +
    rto +
    tcs +
    epc +
    accessories +
    fastag +
    extendedWarranty +
    additionsOthers.reduce((sum, item) => sum + toAmount(item.amount), 0);

  const netOnRoad = toAmount(
    vehicle.netOnRoad ??
      vehicle.total_on_road_with_accessories ??
      vehicle.onRoadPrice ??
      vehicle.on_road_price_cardekho,
  );

  return {
    exShowroom,
    insurance,
    rto,
    tcs,
    epc,
    accessories,
    fastag,
    extendedWarranty,
    additionsOthers: sanitizeOtherItems(additionsOthers),
    discountsOthers: sanitizeOtherItems(vehicle.discountsOthers),
    dealerDiscount: toAmount(vehicle.dealerDiscount),
    schemeDiscount: toAmount(vehicle.schemeDiscount),
    insuranceCashback: toAmount(vehicle.insuranceCashback),
    exchange: toAmount(vehicle.exchange),
    exchangeVehiclePrice: toAmount(vehicle.exchangeVehiclePrice),
    loyalty: toAmount(vehicle.loyalty),
    corporate: toAmount(vehicle.corporate),
    onRoadBeforeDiscount: computedBefore,
    totalDiscount: 0,
    netOnRoad: netOnRoad || computedBefore,
  };
};

const hasPricingSnapshot = (vehicle = {}) =>
  Boolean(
    toAmount(vehicle.onRoadPrice ?? vehicle.total_on_road_with_accessories ?? vehicle.on_road_price_cardekho) ||
      toAmount(vehicle.exShowroom ?? vehicle.ex_showroom) ||
      toAmount(vehicle.rto) ||
      toAmount(vehicle.insurance),
  );

const buildSchedule = (principal, monthlyRate, emi, months) => {
  const rows = [];
  let bal = principal;
  for (let i = 1; i <= months; i++) {
    const interest = bal * monthlyRate;
    const principalPart = emi - interest;
    bal -= principalPart;
    rows.push({
      month: i,
      interest: Math.round(interest),
      principal: Math.round(principalPart),
      balance: Math.max(0, Math.round(bal)),
    });
  }
  return rows;
};

const EMICalculator = ({
  onResetCustomer,
  customer,
  initialQuotation,
  initialShareView,
}) => {
  const [vehicles, setVehicles] = useState([]);
  const location = useLocation();
  const fromVariant = location.state?.fromVariant;
  const [featureSearch, setFeatureSearch] = useState("");

  // City + mapping
  const stateOptions = ["Delhi", "UP", "Haryana"];
  const cityFallbackMap = {
    Delhi: "New-Delhi",
    UP: "Noida", // adjust to actual UP city used in DB
    Haryana: "Gurgaon",
  };

  const [cityInput, setCityInput] = useState("");

  const backendCityKey = useMemo(() => {
    if (!cityInput) return null;
    if (stateOptions.includes(cityInput)) {
      return cityFallbackMap[cityInput] || cityInput;
    }
    return String(cityInput).trim();
  }, [cityInput]);

  const [customerValue, setCustomerValue] = useState(null);
  const [customerKey, setCustomerKey] = useState(0);

  // Make / model / variant
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [makeOptions, setMakeOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [variantOptions, setVariantOptions] = useState([]);
  const [selectedVehicleRecord, setSelectedVehicleRecord] = useState(null);

  const selectedVehicle = useMemo(
    () =>
      selectedVehicleRecord ||
      vehicles.find(
        (v) =>
          String(v._id || v.id) === String(selectedVariant?.value ?? "") ||
          (v.make === selectedMake &&
            v.model === selectedModel &&
            v.variant === selectedVariant?.value),
      ),
    [vehicles, selectedVariant, selectedMake, selectedModel, selectedVehicleRecord],
  );

  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const modelCacheRef = useRef(new Map());
  const variantCacheRef = useRef(new Map());
  const vehicleCacheRef = useRef(new Map());
  const featureCacheRef = useRef(new Map());
  const pricingTouchedRef = useRef(false);

  // Grouped features for the selected variant (same structure as FeaturesPage)
  const selectedFeatureGroups = useMemo(() => {
    if (!Array.isArray(selectedFeatures) || !selectedFeatures.length) return [];

    const byCategory = new Map();

    selectedFeatures.forEach((f) => {
      const category = f.category || "Others";
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push({
        name: f.name,
        value: normalizeValueLabel(f.value),
      });
    });

    const groups = Array.from(byCategory.entries()).map(([category, rows]) => ({
      category,
      rows: rows.sort((a, b) => a.name.localeCompare(b.name)),
    }));

    groups.sort((a, b) => a.category.localeCompare(b.category));
    return groups;
  }, [selectedFeatures]);

  const filteredFeatureGroups = useMemo(() => {
    if (!featureSearch.trim()) return selectedFeatureGroups;

    const q = featureSearch.toLowerCase();

    return selectedFeatureGroups
      .map((group) => {
        const rows = group.rows.filter((row) =>
          `${row.name} ${row.value}`.toLowerCase().includes(q),
        );
        return { ...group, rows };
      })
      .filter((group) => group.rows.length > 0);
  }, [selectedFeatureGroups, featureSearch]);

  // Downpayment + loan (Scenario A)
  const [downPct, setDownPct] = useState(10); // default 10%
  const [loanAmountA, setLoanAmountA] = useState(0);

  // Scenario A core
  const [interestA, setInterestA] = useState(10.5);
  const [tenureA, setTenureA] = useState(5);
  const [tenureTypeA, setTenureTypeA] = useState("years");
  const [emiAInput, setEmiAInput] = useState("");
  const [solveForA, setSolveForA] = useState("emi"); // emi | amount | rate | tenure

  // Scenario B (comparison)
  const [loanAmountB, setLoanAmountB] = useState(0);
  const [interestB, setInterestB] = useState(9.5);
  const [tenureB, setTenureB] = useState(5);
  const [tenureTypeB, setTenureTypeB] = useState("years");
  const [emiBInput, setEmiBInput] = useState("");
  const [solveForB, setSolveForB] = useState("emi");
  const [comparisonTouched, setComparisonTouched] = useState(false);

  // UI
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [shareMode, setShareMode] = useState(false);

  const [pricingState, setPricingState] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const makesRes = await vehiclesApi.getUniqueMakes();
        const makes = Array.isArray(makesRes?.data)
          ? makesRes.data.filter(Boolean)
          : [];
        setMakeOptions(makes);
      } catch (e) {
        console.error("Failed to load distinct makes for EMI", e);
      }

      try {
        const res = await featuresApi.getVariantsWithPrice();
        const items = Array.isArray(res?.data) ? res.data : res.data?.data || [];
        const mapped = items.map((v) => ({
          _id: v.vehicleId || v.id,
          id: v.vehicleId || v.id,
          make: presentMake(v),
          model: presentModel(v),
          variant: presentVariant(v),
          exShowroom: v.exShowroom,
          onRoadPrice: v.onRoadPrice,
          insurance: v.insurance ?? null,
          rto: v.rto ?? null,
          tcs: v.tcs ?? v.otherCharges ?? null,
          city: v.city,
          ...buildVehiclePricingSeed(v),
          ...v,
        }));
        setVehicles(mapped);
        setMakeOptions((prev) =>
          prev.length
            ? prev
            : [...new Set(mapped.map((v) => v.make).filter(Boolean))].sort(),
        );
      } catch (e) {
        console.error(e);
        message.error("Failed to load vehicle list for EMI.");
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      if (!selectedMake) {
        setModelOptions([]);
        setVariantOptions([]);
        return;
      }

      try {
        const startedAt = performance.now();
        const cacheKey = selectedMake;
        if (modelCacheRef.current.has(cacheKey)) {
          console.log("[EMI] models cache hit", {
            make: selectedMake,
            count: modelCacheRef.current.get(cacheKey)?.length || 0,
            ms: Math.round(performance.now() - startedAt),
          });
          setModelOptions(modelCacheRef.current.get(cacheKey));
          return;
        }
        const res = await vehiclesApi.getUniqueModels(selectedMake);
        if (cancelled) return;
        const models = Array.isArray(res?.data) ? res.data.filter(Boolean) : [];
        modelCacheRef.current.set(cacheKey, models);
        console.log("[EMI] models loaded", {
          make: selectedMake,
          count: models.length,
          ms: Math.round(performance.now() - startedAt),
        });
        setModelOptions(models);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load models", {
            make: selectedMake,
            error,
          });
          setModelOptions([]);
        }
      }
    };

    loadModels();
    return () => {
      cancelled = true;
    };
  }, [selectedMake]);

  useEffect(() => {
    let cancelled = false;

    const loadVariants = async () => {
      if (!selectedMake || !selectedModel) {
        setVariantOptions([]);
        return;
      }

      try {
        const startedAt = performance.now();
        const cacheKey = `${selectedMake}__${selectedModel}`;
        if (variantCacheRef.current.has(cacheKey)) {
          console.log("[EMI] variants cache hit", {
            make: selectedMake,
            model: selectedModel,
            count: variantCacheRef.current.get(cacheKey)?.length || 0,
            ms: Math.round(performance.now() - startedAt),
          });
          setVariantOptions(variantCacheRef.current.get(cacheKey));
          return;
        }
        const res = await vehiclesApi.getVariantsWithPrice(
          selectedMake,
          selectedModel,
          backendCityKey || null,
        );
        if (cancelled) return;
        const variants = Array.isArray(res?.data)
          ? res.data
              .filter(Boolean)
              .map((raw) => ({
                _id: raw._id || raw.id,
                id: raw._id || raw.id,
                make: presentMake(raw),
                model: presentModel(raw),
                variant: presentVariant(raw),
                exShowroom: Number(raw.exShowroom ?? raw.ex_showroom ?? 0),
                onRoadPrice: Number(
                  raw.onRoadPrice ??
                    raw.total_on_road_with_accessories ??
                    raw.on_road_price_cardekho ??
                    0,
                ),
                insurance: Number(raw.insurance ?? 0),
                rto: Number(raw.rto ?? 0),
                tcs: Number(
                  raw.tcs ?? raw.other_tcsCharges ?? raw.otherCharges ?? 0,
                ),
                city: raw.city,
                fuel: raw.fuel || raw.fuel_type || null,
                ...buildVehiclePricingSeed(raw),
                ...raw,
              }))
          : [];
        variantCacheRef.current.set(cacheKey, variants);
        console.log("[EMI] variants loaded", {
          make: selectedMake,
          model: selectedModel,
          city: backendCityKey || null,
          count: variants.length,
          ms: Math.round(performance.now() - startedAt),
        });
        setVariantOptions(variants);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load variants", {
            make: selectedMake,
            model: selectedModel,
            city: backendCityKey || null,
            error,
          });
          setVariantOptions([]);
        }
      }
    };

    loadVariants();
    return () => {
      cancelled = true;
    };
  }, [selectedMake, selectedModel, backendCityKey]);

  useEffect(() => {
    if (!selectedVariant?.value || !variantOptions.length) return;

    const matchedVariant = variantOptions.find(
      (item) => item.variant === selectedVariant.value,
    );

    if (!matchedVariant) return;

    setSelectedVehicleRecord(matchedVariant);
    pricingTouchedRef.current = false;
    setPricingState((prev) => ({
      vehicleId: matchedVariant._id || matchedVariant.id,
      city: prev?.city || cityInput || "",
      color: prev?.color || "",
      ...buildVehiclePricingSeed(matchedVariant),
    }));
  }, [variantOptions, selectedVariant, cityInput]);

  useEffect(() => {
    let cancelled = false;

    const loadVehicleDetails = async () => {
      if (!selectedMake || !selectedModel || !selectedVariant?.value) {
        setSelectedVehicleRecord(null);
        return;
      }

      const currentRecordMatches =
        selectedVehicleRecord &&
        normalizeMakeLookup(selectedVehicleRecord.make) ===
          normalizeMakeLookup(selectedMake) &&
        normalizeModelLookup(selectedVehicleRecord.model, selectedVehicleRecord.make) ===
          normalizeModelLookup(selectedModel, selectedMake) &&
        normalizeLookup(selectedVehicleRecord.variant) ===
          normalizeLookup(selectedVariant.value) &&
        (!backendCityKey ||
          normalizeLookup(selectedVehicleRecord.city || "") ===
            normalizeLookup(backendCityKey));

      if (currentRecordMatches && hasPricingSnapshot(selectedVehicleRecord)) {
        return;
      }

      try {
        const startedAt = performance.now();
        const cacheKey = [
          selectedMake,
          selectedModel,
          selectedVariant.value,
          backendCityKey || "",
        ].join("__");

        if (vehicleCacheRef.current.has(cacheKey)) {
          console.log("[EMI] vehicle details cache hit", {
            make: selectedMake,
            model: selectedModel,
            variant: selectedVariant.value,
            city: backendCityKey || null,
            ms: Math.round(performance.now() - startedAt),
          });
          setSelectedVehicleRecord(vehicleCacheRef.current.get(cacheKey));
          return;
        }

        const res = await vehiclesApi.getByDetails(
          selectedMake,
          selectedModel,
          selectedVariant.value,
          null,
          backendCityKey || null,
        );
        if (cancelled) return;

        const raw = res?.data || null;
        if (!raw) {
          setSelectedVehicleRecord(null);
          return;
        }

        const normalizedRecord = {
          _id: raw._id || raw.id,
          id: raw._id || raw.id,
          make: presentMake(raw),
          model: presentModel(raw),
          variant: presentVariant(raw),
          exShowroom: Number(raw.exShowroom ?? raw.ex_showroom ?? 0),
          onRoadPrice: Number(
            raw.onRoadPrice ??
              raw.total_on_road_with_accessories ??
              raw.on_road_price_cardekho ??
              0,
          ),
          insurance: Number(raw.insurance ?? 0),
          rto: Number(raw.rto ?? 0),
          tcs: Number(raw.tcs ?? raw.otherCharges ?? raw.other_totalOtherCharges ?? 0),
          city: raw.city,
          fuel: raw.fuel || raw.fuel_type || null,
          ...buildVehiclePricingSeed(raw),
          ...raw,
        };

        vehicleCacheRef.current.set(cacheKey, normalizedRecord);
        setSelectedVehicleRecord(normalizedRecord);
        console.log("[EMI] vehicle details loaded", {
          make: selectedMake,
          model: selectedModel,
          variant: selectedVariant.value,
          city: backendCityKey || null,
          ms: Math.round(performance.now() - startedAt),
        });
        if (!pricingTouchedRef.current) {
          const seed = buildVehiclePricingSeed(normalizedRecord);
          setPricingState((prev) => ({
            ...seed,
            vehicleId: normalizedRecord._id || normalizedRecord.id,
            city: prev?.city || cityInput || "",
            color: prev?.color || "",
          }));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load vehicle details", error);
        }
      }
    };

    loadVehicleDetails();
    return () => {
      cancelled = true;
    };
  }, [
    selectedMake,
    selectedModel,
    selectedVariant,
    backendCityKey,
    selectedVehicleRecord,
  ]);

  useEffect(() => {
    if (fromVariant) return;
    if (!initialQuotation || !vehicles.length) return;

    const q = initialQuotation;

    // Find vehicle by id from quotation
    const v = vehicles.find(
      (x) => String(x._id) === String(q.vehicle?.vehicleId),
    );
    if (!v) return;

    // Set Make and Model
    setSelectedMake(v.make || "");
    setSelectedModel(v.model || "");

    // Variant
    setSelectedVariant({
      value: v.variant,
      label: `${v.variant} — ${formatINR(v.onRoadPrice)}`,
    });

    // City/color into pricingState & inputs
    setCityInput(q.cityTyped || "");

    setPricingState((prev) => ({
      ...(prev || {}),
      ...(q.pricing || {}),
      city: q.cityTyped || "",
      color: q.pricing?.color || "",
    }));
  }, [initialQuotation, vehicles]);

  // Populate pricingState from selectedVehicle when vehicle is selected (so left panel shows popup values immediately)
  // Populate/merge pricingState from selectedVehicle when vehicle is selected
  useEffect(() => {
    if (!selectedVehicle) return;

    console.log("Rebuilding pricing from vehicle", selectedVehicle);

    const seed = buildVehiclePricingSeed(selectedVehicle);

    if (
      pricingState?.netOnRoad &&
      pricingState?.vehicleId === selectedVehicle._id
    ) {
      return;
    }

    setPricingState({
      vehicleId: selectedVehicle._id || selectedVehicle.id,
      city: pricingState?.city || cityInput || "",
      color: pricingState?.color || "",
      ...seed,
    });
  }, [selectedVehicle, pricingState?.city, pricingState?.color, cityInput]);

  useEffect(() => {
    console.log("fromVariant:", fromVariant);
    console.log(
      "vehicles sample:",
      vehicles.slice(0, 3).map((x) => ({
        make: x.make,
        model: x.model,
        variant: x.variant,
        _id: x._id,
      })),
    );
  }, [fromVariant, vehicles]);

  useEffect(() => {
    if (!fromVariant || !vehicles.length) return;

    const v = vehicles.find(
      (x) =>
        String(x._id || x.id) === String(fromVariant.vehicleId) ||
        (x.make === fromVariant.make &&
          x.model === fromVariant.model &&
          x.variant === fromVariant.variant),
    );

    if (!v) return;

    setSelectedMake(v.make);
    setSelectedModel(v.model);
    setSelectedVehicleRecord(v);

    setSelectedVariant({
      value: v.variant,
      label: v.variant,
    });

    const price = fromVariant.price || v.onRoadPrice || 0;
    const loan = price * 0.9;

    setLoanAmountA(loan);
    setLoanAmountB(loan);
    setDownPct(10);

    setCityInput("Delhi");
    pricingTouchedRef.current = false;
    setPricingState({
      vehicleId: v._id || v.id,
      city: "Delhi",
      color: "",
      ...buildVehiclePricingSeed(v),
    });
  }, [fromVariant, vehicles]);

  useEffect(() => {
    if (!initialQuotation) return;
    const q = initialQuotation;

    if (q.scenarios?.A) {
      setLoanAmountA(q.scenarios.A.loanAmount || 0);
      setInterestA(q.scenarios.A.interest || 0);
      setTenureA(q.scenarios.A.tenure || 0);
      setTenureTypeA(q.scenarios.A.tenureType || "years");
      setEmiAInput(q.scenarios.A.emi || "");
    }

    if (q.scenarios?.B) {
      setLoanAmountB(q.scenarios.B.loanAmount || 0);
      setInterestB(q.scenarios.B.interest || 0);
      setTenureB(q.scenarios.B.tenure || 0);
      setTenureTypeB(q.scenarios.B.tenureType || "years");
      setEmiBInput(q.scenarios.B.emi || "");
    }
  }, [initialQuotation]);

  useEffect(() => {
    let cancelled = false;

    const loadFeatures = async () => {
      if (!selectedVehicle && !fromVariant) {
        setSelectedFeatures([]);
        return;
      }

      try {
        const startedAt = performance.now();
        const make = selectedVehicle?.make || fromVariant?.make;
        const model = selectedVehicle?.model || fromVariant?.model;
        const variant = selectedVehicle?.variant || fromVariant?.variant;
        const vehicleId = selectedVehicle?._id || fromVariant?.vehicleId;
        const cacheKey = [
          normalizeMakeLookup(make),
          normalizeModelLookup(model, make),
          normalizeLookup(variant),
          vehicleId,
        ].join("__");

        if (featureCacheRef.current.has(cacheKey)) {
          console.log("[EMI] features cache hit", {
            make,
            model,
            variant,
            vehicleId,
            count: featureCacheRef.current.get(cacheKey)?.length || 0,
            ms: Math.round(performance.now() - startedAt),
          });
          setSelectedFeatures(featureCacheRef.current.get(cacheKey));
          return;
        }

        const res = await featuresApi.getBySelection({
          make,
          model,
          variant,
          vehicleId,
        });
        if (cancelled) return;

        const features = Array.isArray(res?.data) ? res.data : [];
        featureCacheRef.current.set(cacheKey, features);
        console.log("[EMI] features loaded", {
          make,
          model,
          variant,
          vehicleId,
          count: features.length,
          ms: Math.round(performance.now() - startedAt),
        });
        setSelectedFeatures(features);
      } catch (e) {
        if (cancelled) return;
        console.error("load features error", e);
        setSelectedFeatures([]);
      }
    };

    const timer = setTimeout(loadFeatures, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fromVariant, selectedVehicle]);

  useEffect(() => {
    if (initialShareView && initialQuotation) {
      setShareMode(true);
    }
  }, [initialShareView, initialQuotation]);

  // Filter vehicles by backend city key
  const filteredVehicles = useMemo(() => {
    if (!backendCityKey) return vehicles;
    const anyMatch = vehicles.some(
      (v) => String(v.city).toLowerCase() === backendCityKey.toLowerCase(),
    );
    if (!anyMatch) return vehicles; // do not filter out everything
    return vehicles.filter(
      (v) => String(v.city).toLowerCase() === backendCityKey.toLowerCase(),
    );
  }, [vehicles, backendCityKey]);

  const uniqueMakes = useMemo(
    () =>
      (makeOptions.length
        ? makeOptions
        : [...new Set(filteredVehicles.map((v) => v.make).filter(Boolean))]
      ).sort(),
    [filteredVehicles, makeOptions],
  );

  const modelsForMake = useMemo(
    () => filteredVehicles.filter((v) => v.make === selectedMake),
    [filteredVehicles, selectedMake],
  );

  const uniqueModels = useMemo(
    () =>
      (modelOptions.length
        ? modelOptions
        : [...new Set(modelsForMake.map((v) => v.model).filter(Boolean))]
      ).sort(),
    [modelsForMake, modelOptions],
  );

  const variantsForModel = useMemo(
    () =>
      filteredVehicles.filter(
        (v) => v.make === selectedMake && v.model === selectedModel,
      ),
    [filteredVehicles, selectedMake, selectedModel],
  );

  const normalizedVariantOptions = useMemo(() => {
    if (variantOptions.length) {
      return variantOptions.map((variantRecord) => {
        const record = variantRecord;
        const variant = cleanVariant(
          variantRecord.variant,
          selectedMake,
          selectedModel,
        );
        return {
          value: variantRecord.variant,
          label:
            record?.onRoadPrice != null
              ? `${variant} — ${formatINR(record.onRoadPrice)}`
              : variant,
          record,
        };
      });
    }

    return variantsForModel.map((v) => ({
      value: v.variant,
      label: `${cleanVariant(v.variant, selectedMake, selectedModel)} — ${formatINR(v.onRoadPrice)}`,
      record: v,
    }));
  }, [variantOptions, variantsForModel, selectedMake, selectedModel]);




  const effectivePricing = useMemo(() => {
    const seed = buildVehiclePricingSeed(selectedVehicle || {});
    const merged =
      pricingState &&
      pricingState.vehicleId === (selectedVehicle?._id || selectedVehicle?.id)
        ? {
            ...seed,
            ...pricingState,
            additionsOthers: sanitizeOtherItems(
              pricingState.additionsOthers?.length
                ? pricingState.additionsOthers
                : seed.additionsOthers,
            ),
            discountsOthers: sanitizeOtherItems(
              pricingState.discountsOthers?.length
                ? pricingState.discountsOthers
                : seed.discountsOthers,
            ),
          }
        : seed;
    const totals = computePricing(merged, selectedVehicle || {});

    return {
      ...merged,
      onRoadBeforeDiscount: totals.before,
      totalDiscount: totals.discount,
      netOnRoad: totals.netOnRoad,
    };
  }, [selectedVehicle, pricingState]);

  const onRoadPrice = effectivePricing?.netOnRoad ?? 0;

  // When pricing changes, update loan amount from the visible on-road total.
  useEffect(() => {
    const newOnRoad = effectivePricing?.netOnRoad ?? 0;
    if (!newOnRoad) return;

    const dpAmt = (newOnRoad * downPct) / 100;
    const loan = newOnRoad - dpAmt;

    setLoanAmountA(loan);
    if (!comparisonTouched) setLoanAmountB(loan);
  }, [effectivePricing?.netOnRoad, downPct, comparisonTouched]);

  const exShowroom = effectivePricing?.exShowroom || 0;
  const rto = effectivePricing?.rto || 0;
  const insurance = effectivePricing?.insurance || 0;
  const otherCharges = effectivePricing?.otherCharges || 0;

  // City & color (stored in pricingState but editable here)
  const city = pricingState?.city || "";
  const color = pricingState?.color || "";

  // Downpayment sync (Scenario A)
  const downAmount = onRoadPrice ? onRoadPrice - loanAmountA : 0;

  const effectiveDownPct = onRoadPrice
    ? ((onRoadPrice - loanAmountA) / onRoadPrice) * 100
    : downPct;

  const handleDownPctChange = (val) => {
    pricingTouchedRef.current = true;
    const pct = Math.min(Math.max(val, 0), 90);
    setDownPct(pct);
    if (onRoadPrice) {
      const dpAmt = (onRoadPrice * pct) / 100;
      const loan = onRoadPrice - dpAmt;
      setLoanAmountA(loan);
      if (!comparisonTouched) setLoanAmountB(loan);
    }
  };

  const handleDownAmountChange = (val) => {
    pricingTouchedRef.current = true;
    const amt = Math.min(Math.max(val, 0), onRoadPrice);
    const pct = onRoadPrice ? (amt / onRoadPrice) * 100 : 0;
    setDownPct(pct);
    const loan = onRoadPrice - amt;
    setLoanAmountA(loan);
    if (!comparisonTouched) setLoanAmountB(loan);
  };

  const handleLoanAmountChange = (val) => {
    pricingTouchedRef.current = true;
    const loan = Math.min(Math.max(val, 0), onRoadPrice || val);
    setLoanAmountA(loan);
    if (!comparisonTouched) setLoanAmountB(loan);
    if (onRoadPrice) {
      const dpAmt = onRoadPrice - loan;
      const pct = (dpAmt / onRoadPrice) * 100;
      setDownPct(pct);
    }
  };

  const buildQuotationPayload = () => {
    if (!selectedVehicle?.vehicleId) {
      message.warning("Select city, vehicle and pricing before saving.");
      return null;
    }

    const base = {
      customer: customer || null,
      cityTyped: pricingState?.city || cityInput || "",
      vehicleCity: selectedVehicle.city || "",
      vehicle: {
        vehicleId: selectedVehicle._id,
        make: selectedVehicle.make,
        model: selectedVehicle.model,
        variant: selectedVehicle.variant,
        onRoadPriceList: selectedVehicle.onRoadPrice,
      },
      pricing: {
        exShowroom,
        rto,
        insurance,
        tcs: effectivePricing?.tcs ?? 0,
        epc: effectivePricing?.epc ?? 0,
        accessories: effectivePricing?.accessories ?? 0,
        fastag: effectivePricing?.fastag ?? 0,
        extendedWarranty: effectivePricing?.extendedWarranty ?? 0,
        additionsOthers: effectivePricing?.additionsOthers || [],
        dealerDiscount: effectivePricing?.dealerDiscount ?? 0,
        schemeDiscount: effectivePricing?.schemeDiscount ?? 0,
        insuranceCashback: effectivePricing?.insuranceCashback ?? 0,
        exchange: effectivePricing?.exchange ?? 0,
        exchangeVehiclePrice: effectivePricing?.exchangeVehiclePrice ?? 0,
        loyalty: effectivePricing?.loyalty ?? 0,
        corporate: effectivePricing?.corporate ?? 0,
        discountsOthers: effectivePricing?.discountsOthers || [],
        onRoadBeforeDiscount: effectivePricing?.onRoadBeforeDiscount || onRoadPrice,
        totalDiscount: effectivePricing?.totalDiscount || 0,
        netOnRoad: effectivePricing?.netOnRoad || onRoadPrice,
        color,
      },
      scenarios: {
        A: {
          loanAmount: loanAmountA,
          interest: interestA,
          tenure: tenureA,
          tenureType: tenureTypeA,
          emi: resultA.emi,
          total: resultA.total,
          principal: resultA.principal,
          interestTotal: resultA.interest,
          months: resultA.months,
        },
        B: {
          loanAmount: loanAmountB,
          interest: interestB,
          tenure: tenureB,
          tenureType: tenureTypeB,
          emi: resultB.emi,
          total: resultB.total,
          principal: resultB.principal,
          interestTotal: resultB.interest,
          months: resultB.months,
        },
      },
    };

    // When editing an existing quotation, send its id so backend updates instead of creating new
    if (initialQuotation?._id) {
      return { ...base, _id: initialQuotation._id };
    }

    return base;
  };

  const [savedQuotationId, setSavedQuotationId] = useState(null);

  const handleSaveQuotation = async () => {
    const payload = buildQuotationPayload();
    if (!payload) return;

    console.log("FULL payload.pricing:", payload.pricing); // ← add

    try {
      const res = await quotationsApi.create(payload);
      const saved = res.data;
      setSavedQuotationId(saved._id);
      message.success("Quotation saved.");
    } catch (err) {
      console.error("Save quotation error:", err.response || err);
      message.error("Failed to save quotation.");
    }
  };

  const handleShareLink = async () => {
    if (!savedQuotationId) {
      message.warning("Please save the quotation first.");
      return;
    }

    const url = `${window.location.origin}/loans/emi-calculator?quote=${savedQuotationId}&mode=view`;

    try {
      await navigator.clipboard.writeText(url);
      message.success("Sharable link copied to clipboard.");
      // optional navigator.share as before
    } catch (err) {
      console.error("Share link error:", err);
      message.error("Could not copy link to clipboard.");
    }
  };

  const handleSharePdf = async () => {
    if (!savedQuotationId) {
      message.warning("Please save the quotation first.");
      return;
    }

    try {
      const res = await quotationsApi.pdf(savedQuotationId);

      const contentType = res.headers["content-type"] || "";

      if (contentType.includes("application/pdf")) {
        // real PDF blob
        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        // stub JSON: just notify for now
        message.info(
          "PDF endpoint is stubbed; server is not generating PDFs yet.",
        );
        console.log("PDF stub response:", res.data);
      }
    } catch (err) {
      console.error("PDF error:", err);
      message.error("Failed to generate PDF.");
    }
  };

  // Generic solver
  const computeScenario = (
    mode,
    principal,
    rateAnnual,
    tenureVal,
    tenureType,
    emiInput,
  ) => {
    let P = Number(principal) || 0;
    let Rm = (Number(rateAnnual) || 0) / 100 / 12;
    let N =
      tenureType === "years"
        ? (Number(tenureVal) || 0) * 12
        : Number(tenureVal) || 0;
    let E = Number(emiInput) || 0;

    if (mode === "emi") {
      // Input: principal, rate, tenure → EMI
      if (P <= 0 || Rm <= 0 || N <= 0) {
        return {
          emi: 0,
          principal: 0,
          total: 0,
          interest: 0,
          months: 0,
          rateMonthly: Rm,
        };
      }
      const emiVal = solveEMI(P, Rm, N);
      const emiRounded = Math.round(emiVal);
      const total = emiRounded * N;
      const interest = total - P;
      return {
        emi: emiRounded,
        principal: Math.round(P),
        total,
        interest,
        months: Math.round(N),
        rateMonthly: Rm,
      };
    }

    if (mode === "amount") {
      // Input: EMI, rate, tenure → principal
      if (E <= 0 || Rm <= 0 || N <= 0) {
        return {
          emi: 0,
          principal: 0,
          total: 0,
          interest: 0,
          months: 0,
          rateMonthly: Rm,
        };
      }
      const principalVal = solvePrincipal(E, Rm, N);
      const pR = Math.round(principalVal);
      const total = E * N;
      const interest = total - pR;
      return {
        emi: Math.round(E),
        principal: pR,
        total,
        interest,
        months: Math.round(N),
        rateMonthly: Rm,
      };
    }

    if (mode === "tenure") {
      // Input: EMI, principal, rate → tenure
      if (E <= 0 || P <= 0 || Rm <= 0) {
        return {
          emi: 0,
          principal: 0,
          total: 0,
          interest: 0,
          months: 0,
          rateMonthly: Rm,
        };
      }
      const nMonths = solveTenure(E, P, Rm);
      const nR = Math.round(nMonths);
      const total = E * nR;
      const interest = total - P;
      return {
        emi: Math.round(E),
        principal: Math.round(P),
        total,
        interest,
        months: nR,
        rateMonthly: Rm,
      };
    }

    if (mode === "rate") {
      // Input: EMI, principal, tenure → rate
      if (E <= 0 || P <= 0 || N <= 0) {
        return {
          emi: 0,
          principal: 0,
          total: 0,
          interest: 0,
          months: 0,
          rateMonthly: 0,
        };
      }
      const rMonthly = solveRate(E, P, N);
      const total = E * N;
      const interest = total - P;
      return {
        emi: Math.round(E),
        principal: Math.round(P),
        total,
        interest,
        months: Math.round(N),
        rateMonthly: rMonthly,
      };
    }

    return {
      emi: 0,
      principal: 0,
      total: 0,
      interest: 0,
      months: 0,
      rateMonthly: 0,
    };
  };

  function computePricing(p = {}, v = {}) {
    const seed = buildVehiclePricingSeed(v);
    const exShowroom = Number(p.exShowroom ?? seed.exShowroom ?? 0);
    const insurance = Number(p.insurance ?? seed.insurance ?? 0);
    const tcs = Number(p.tcs ?? seed.tcs ?? 0);
    const roadTax = Number(p.rto ?? seed.rto ?? 0);

    const epc = Number(p.epc ?? seed.epc ?? 0);
    const accessories = Number(p.accessories ?? seed.accessories ?? 0);
    const fastag = Number(p.fastag ?? seed.fastag ?? 0);
    const extendedWarranty = Number(
      p.extendedWarranty ?? seed.extendedWarranty ?? 0,
    );

    const additionsOthers = sanitizeOtherItems(
      (p.additionsOthers?.length ? p.additionsOthers : seed.additionsOthers) || [],
    ).reduce(
      (s, x) => s + (Number(x.amount) || 0),
      0,
    );

    const dealerDiscount = Number(p.dealerDiscount ?? 0);
    const schemeDiscount = Number(p.schemeDiscount ?? 0);
    const insuranceCashback = Number(p.insuranceCashback ?? 0);
    const exchange = Number(p.exchange ?? 0);
    const loyalty = Number(p.loyalty ?? 0);
    const corporate = Number(p.corporate ?? 0);

    const discountsOthers = sanitizeOtherItems(p.discountsOthers || []).reduce(
      (s, x) => s + (Number(x.amount) || 0),
      0,
    );

    const before =
      exShowroom +
      insurance +
      tcs +
      roadTax +
      epc +
      accessories +
      fastag +
      extendedWarranty +
      additionsOthers;

    const discount =
      dealerDiscount +
      schemeDiscount +
      insuranceCashback +
      exchange +
      loyalty +
      corporate +
      discountsOthers;

    return {
      netOnRoad: before - discount,
      before,
      discount,
    };
  }

  // Scenario A uses latest EMI input for modes other than "emi"
  const resultA = useMemo(
    () =>
      computeScenario(
        solveForA,
        loanAmountA,
        interestA,
        tenureA,
        tenureTypeA,
        solveForA === "emi" ? loanAmountA : emiAInput, // emiInput only when not deriving EMI
      ),
    [solveForA, loanAmountA, interestA, tenureA, tenureTypeA, emiAInput],
  );

  // Keep EMI input in sync with latest computed EMI so mode switching uses latest values
  useEffect(() => {
    if (resultA.emi) {
      setEmiAInput(resultA.emi);
    }
  }, [resultA.emi]);

  // Mirror Scenario A into B unless user edited comparison
  useEffect(() => {
    if (comparisonTouched) return;
    setLoanAmountB(loanAmountA);
    setInterestB(interestA - 0.25 > 0 ? interestA - 0.25 : interestA);
    setTenureB(tenureA);
    setTenureTypeB(tenureTypeA);
    setSolveForB("emi");
    setEmiBInput(resultA.emi || "");
  }, [
    loanAmountA,
    interestA,
    tenureA,
    tenureTypeA,
    comparisonTouched,
    resultA.emi,
  ]);

  useEffect(() => {
    if (!onRoadPrice) return;

    const dpAmt = (onRoadPrice * downPct) / 100;
    const loan = onRoadPrice - dpAmt;

    setLoanAmountA(loan);
    if (!comparisonTouched) setLoanAmountB(loan);
  }, [onRoadPrice]);

  const resultB = useMemo(
    () =>
      computeScenario(
        solveForB,
        loanAmountB,
        interestB,
        tenureB,
        tenureTypeB,
        solveForB === "emi" ? loanAmountB : emiBInput,
      ),
    [solveForB, loanAmountB, interestB, tenureB, tenureTypeB, emiBInput],
  );

  const principalPctA =
    resultA.total > 0
      ? ((resultA.principal / resultA.total) * 100).toFixed(0)
      : 0;
  const interestPctA =
    resultA.total > 0
      ? ((resultA.interest / resultA.total) * 100).toFixed(0)
      : 0;

  const emiDiff = resultB.emi - resultA.emi;
  const interestDiff = resultB.interest - resultA.interest;
  const loanDiff = resultB.principal - resultA.principal; // subvention / extra loan

  const cloneToScenarioB = () => {
    setComparisonTouched(true);
    setLoanAmountB(loanAmountA);
    setInterestB(interestA);
    setTenureB(tenureA);
    setEmiBInput(emiAInput);
    setSolveForB(solveForA);
    setTenureTypeB(tenureTypeA);
    message.success("Copied Scenario A to Scenario B.");
  };

  const scheduleA = useMemo(() => {
    if (
      !resultA.principal ||
      !resultA.rateMonthly ||
      !resultA.months ||
      !resultA.emi
    )
      return [];
    return buildSchedule(
      resultA.principal,
      resultA.rateMonthly,
      resultA.emi,
      resultA.months,
    );
  }, [resultA]);

  const solveOptions = [
    { key: "emi", label: "EMI" },
    { key: "amount", label: "Amount" },
    { key: "rate", label: "Rate" },
    { key: "tenure", label: "Tenure" },
  ];

  const displayForField = (mode, field, result, tenureType) => {
    if (mode === "emi" && field === "emi") return result.emi || "";
    if (mode === "amount" && field === "amount") return result.principal || "";
    if (mode === "tenure" && field === "tenure")
      return tenureType === "years"
        ? Math.round(result.months / 12) || ""
        : result.months || "";
    if (mode === "rate" && field === "rate")
      return result.rateMonthly
        ? (result.rateMonthly * 12 * 100).toFixed(2)
        : "";
    return null;
  };

  const resetAll = () => {
    // city + pricing
    setCityInput("");
    setPricingState(null);

    // vehicle
    setSelectedMake("");
    setSelectedModel("");
    setSelectedVariant(null);

    // downpayment & scenarios
    setDownPct(10);
    setLoanAmountA(0);
    setInterestA(10.5);
    setTenureA(5);
    setTenureTypeA("years");
    setEmiAInput("");
    setLoanAmountB(0);
    setInterestB(9.5);
    setTenureB(5);
    setTenureTypeB("years");
    setEmiBInput("");
    setSolveForA("emi");
    setSolveForB("emi");
    setComparisonTouched(false);

    // UI
    setShowSchedule(false);
    setShowPricingModal(false);
    setShareMode(false);
    setSavedQuotationId(null);
    pricingTouchedRef.current = false;

    //customer

    if (typeof onResetCustomer === "function") {
      onResetCustomer();
    }
  };

  const additionFieldMap = [
    { key: "exShowroom", label: "Ex-showroom" },
    { key: "rto", label: "RTO / Road tax" },
    { key: "insurance", label: "Insurance" },
    { key: "tcs", label: "TCS / Other" },
    { key: "epc", label: "EPC" },
    { key: "accessories", label: "Accessories" },
    { key: "fastag", label: "Fastag" },
    { key: "extendedWarranty", label: "Extended warranty" },
  ];

  const additionLines = additionFieldMap
    .map(({ key, label }) => {
      const value =
        effectivePricing && Object.prototype.hasOwnProperty.call(effectivePricing, key)
          ? effectivePricing[key]
          : (() => {
              const seed = buildVehiclePricingSeed(selectedVehicle || {});
              if (key === "tcs") return seed.tcs ?? 0;
              if (key === "rto") return seed.rto ?? 0;
              return seed[key] ?? selectedVehicle?.[key] ?? 0;
            })();

      if (!value) return null;

      return {
        key,
        label,
        amount: value,
      };
    })
    .filter(Boolean);

  // include dynamic additions
  (effectivePricing?.additionsOthers || []).forEach((x, idx) => {
    if (!x.amount) return;

    additionLines.push({
      key: `add-${idx}`,
      label: x.label || "Addition",
      amount: x.amount,
    });
  });

  const discountFieldMap = [
    { key: "dealerDiscount", label: "Dealer discount" },
    { key: "schemeDiscount", label: "Scheme discount" },
    { key: "insuranceCashback", label: "Insurance cashback" },
    { key: "exchange", label: "Exchange bonus" },
    { key: "exchangeVehiclePrice", label: "Exchange vehicle price" },
    { key: "loyalty", label: "Loyalty" },
    { key: "corporate", label: "Corporate" },
  ];

  const discountLines = discountFieldMap
    .map(({ key, label }) => {
      const value = effectivePricing?.[key] || 0;
      if (!value) return null;

      return {
        key,
        label,
        amount: value,
      };
    })
    .filter(Boolean);

  // include dynamic discounts
  (effectivePricing?.discountsOthers || []).forEach((x, idx) => {
    if (!x.amount) return;

    discountLines.push({
      key: `disc-${idx}`,
      label: x.label || "Discount",
      amount: x.amount,
    });
  });

  const displayNetOnRoad = Math.max(
    0,
    additionLines.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) -
      discountLines.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
  );

  const disableAll = shareMode;
  const scenarioAInputsDisabled = false; // we want Scenario A editable even in share mode

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#171717] px-4 py-6 md:px-8 md:py-8">
      <div className="app-max-wrap space-y-4 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            EMI calculator & quotation
          </h1>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={handleSaveQuotation}>
              <Icon name="save" className="mr-1 h-3 w-3" />
              Save
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleShareLink}
              disabled={disableAll}
            >
              <Icon name="link" className="mr-1 h-3 w-3" />
              Link
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSharePdf}
              disabled={disableAll}
            >
              <Icon name="file" className="mr-1 h-3 w-3" />
              PDF
            </Button>

            <Button size="sm" variant="outline" onClick={resetAll}>
              <Icon name="refresh" className="mr-1 h-3 w-3" />
              Reset
            </Button>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px,minmax(0,1fr)] gap-4 mt-2 items-start">
          {/* Left: vehicle + downpayment + breakup */}
          <div className="space-y-4 sticky top-24">
            <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-sm border border-slate-100 dark:border-[#262626] px-5 py-5 flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Vehicle & downpayment
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label>City</Label>
                  <AutoComplete
                    style={{ width: "100%" }}
                    value={cityInput}
                    options={stateOptions.map((s) => ({ value: s }))}
                    placeholder="Select or type city"
                    onChange={(value) => {
                      setCityInput(value);
                      setPricingState((prev) => ({
                        ...(prev || {}),
                        city: value, // store what user typed
                      }));
                    }}
                    filterOption={(inputValue, option) =>
                      (option?.value || "")
                        .toUpperCase()
                        .includes(inputValue.toUpperCase())
                    }
                  />
                </div>

                <div>
                  <Label>Make</Label>
                  <Select
                    value={selectedMake || undefined}
                    onChange={(val) => {
                      setSelectedMake(val);
                      setSelectedModel("");
                      setSelectedVariant(null);
                      setSelectedVehicleRecord(null);

                      setLoanAmountA(0);
                    }}
                    className="w-full"
                    showSearch
                    disabled={disableAll}
                    filterOption={(input, option) =>
                      String(option?.children ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  >
                    {uniqueMakes.map((m) => (
                      <Option key={m} value={m}>
                        {cleanName(m)}
                      </Option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Model</Label>
                  <Select
                    value={selectedModel || undefined}
                    onChange={(val) => {
                      setSelectedModel(val);
                      setSelectedVariant(null);
                      setSelectedVehicleRecord(null);

                      setLoanAmountA(0);
                    }}
                    disabled={!selectedMake || disableAll}
                    className="w-full"
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.children ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  >
                    {uniqueModels.map((m) => (
                      <Option key={m} value={m}>
                        {cleanName(m)}
                      </Option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Variant</Label>
                  <Select
                    labelInValue
                    value={selectedVariant || undefined}
                    onChange={(val, option) => {
                      setSelectedVariant({
                        value: val.value,
                        label: option.label,
                      });

                      setComparisonTouched(false);

                      const v =
                        option.record ||
                        variantsForModel.find(
                          (x) =>
                            String(x._id) === String(val.value) ||
                            x.variant === val.value,
                        );

                        if (v) {
                          setSelectedVehicleRecord(v);
                          pricingTouchedRef.current = false;
                          setPricingState((prev) => ({
                          vehicleId: v._id || v.id,
                          city: prev?.city || cityInput || "",
                          color: prev?.color || "",
                          ...buildVehiclePricingSeed(v),
                        }));
                      }

                      const price = v?.onRoadPrice || 0;

                      const initialLoan = price * 0.9;
                      setLoanAmountA(initialLoan);
                      setLoanAmountB(initialLoan);
                      setDownPct(10);
                    }}
                    disabled={!selectedMake || !selectedModel || disableAll}
                    className="w-full"
                    showSearch
                  >
                    {normalizedVariantOptions.map((v) => (
                      <Option
                        key={v.record?._id || v.value}
                        value={v.value}
                        label={v.label}
                        record={v.record}
                      >
                        {v.label}
                      </Option>
                    ))}
                  </Select>
                </div>
              </div>

              {onRoadPrice > 0 && (
                <>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label>Downpayment %</Label>
                      <Input
                        type="text"
                        value={Math.round(effectiveDownPct) || 0}
                        onChange={(e) =>
                          handleDownPctChange(parseNumber(e.target.value))
                        }
                        disabled={disableAll}
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Downpayment amount</Label>
                      <Input
                        type="text"
                        value={formatNumber(downAmount)}
                        onChange={(e) =>
                          handleDownAmountChange(parseNumber(e.target.value))
                        }
                        disabled={disableAll}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Loan amount</Label>
                    <Input
                      type="text"
                      value={formatNumber(loanAmountA)}
                      onChange={(e) =>
                        handleLoanAmountChange(parseNumber(e.target.value))
                      }
                      disabled={disableAll}
                    />
                  </div>

                  {/* City & color under loan amount */}
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    <div>
                      <Label>Color</Label>
                      <Input
                        type="text"
                        value={color}
                        onChange={(e) => {
                          pricingTouchedRef.current = true;
                          setPricingState((prev) => ({
                            ...(prev || {}),
                            color: e.target.value,
                          }));
                        }}
                        placeholder="Color (e.g. Red, White)"
                        disabled={disableAll}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {onRoadPrice > 0 && (
              <button
                type="button"
                onClick={() => !disableAll && setShowPricingModal(true)}
                disabled={disableAll}
                className={`w-full text-left bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-sm border px-5 py-4 space-y-2 ${
                  disableAll
                    ? "border-slate-100 dark:border-[#262626] opacity-60 cursor-not-allowed"
                    : "border-slate-100 dark:border-[#262626] hover:border-emerald-500 hover:shadow-md cursor-pointer transition"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    On‑road price breakup
                  </h3>
                </div>

                {/* additions */}
                <div className="space-y-1.5 text-[11px]">
                  {additionLines.map((row) => (
                    <div key={row.key} className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        {row.label}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatINR(row.amount)}
                      </span>
                    </div>
                  ))}

                  {/* discounts block */}
                  {discountLines.length > 0 && (
                    <>
                      <div className="pt-1 text-[10px] uppercase tracking-wide text-slate-900 font-bold">
                        Discounts
                      </div>
                      {discountLines.map((row) => (
                        <div key={row.key} className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">
                            {row.label}
                          </span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            -{formatINR(row.amount)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* net on-road below price list */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#262626] mt-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Net On-Road
                    </div>

                    <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 text-right">
                      {formatINR(displayNetOnRoad)}
                    </div>
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Right: Scenario A + chart + comparison + schedule */}
          <div className="space-y-4">
            {/* Scenario A */}
            <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-sm border border-slate-100 dark:border-[#262626] px-5 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Scenario A – primary EMI
                  </h2>
                </div>
                <div className="inline-flex rounded-full bg-slate-100 dark:bg-[#262626] p-1 text-[11px]">
                  {solveOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => !disableAll && setSolveForA(opt.key)}
                      disabled={disableAll}
                      className={`px-3 py-1 rounded-full font-medium ${
                        solveForA === opt.key
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Loan amount */}
                <div className="space-y-1">
                  <Label>Loan amount</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={
                        solveForA === "amount"
                          ? formatNumber(
                              displayForField(
                                solveForA,
                                "amount",
                                resultA,
                                tenureTypeA,
                              ),
                            ) || ""
                          : formatNumber(loanAmountA)
                      }
                      onChange={(e) => {
                        if (scenarioAInputsDisabled) return;
                        if (solveForA === "amount") return;
                        const n = parseNumber(e.target.value);
                        setLoanAmountA(n);
                      }}
                      readOnly={
                        solveForA === "amount" || scenarioAInputsDisabled
                      }
                      className={
                        solveForA === "amount" ? "pr-16 border-emerald-500" : ""
                      }
                    />
                    {solveForA === "amount" && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 animate-pulse">
                        Live
                      </span>
                    )}
                  </div>
                </div>

                {/* Interest */}
                <div className="space-y-1">
                  <Label>Interest rate (annual %)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      value={
                        solveForA === "rate"
                          ? displayForField(
                              solveForA,
                              "rate",
                              resultA,
                              tenureTypeA,
                            ) || ""
                          : interestA
                      }
                      onChange={(e) => {
                        if (disableAll) return;
                        if (solveForA === "rate") return;
                        setInterestA(Number(e.target.value) || 0);
                      }}
                      readOnly={solveForA === "rate" || disableAll}
                      className={
                        solveForA === "rate" ? "pr-16 border-emerald-500" : ""
                      }
                    />
                    {solveForA === "rate" && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 animate-pulse">
                        Live
                      </span>
                    )}
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step="0.1"
                    value={interestA}
                    onChange={(e) =>
                      !disableAll && setInterestA(Number(e.target.value) || 0)
                    }
                    className="w-full mt-1"
                    disabled={disableAll}
                  />
                </div>

                {/* Tenure */}
                <div className="space-y-1">
                  <Label>Tenure</Label>
                  <div className="flex gap-2 items-end">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        value={
                          solveForA === "tenure"
                            ? displayForField(
                                solveForA,
                                "tenure",
                                resultA,
                                tenureTypeA,
                              ) || ""
                            : tenureA
                        }
                        onChange={(e) => {
                          if (disableAll) return;
                          if (solveForA === "tenure") return;
                          setTenureA(Number(e.target.value) || 0);
                        }}
                        readOnly={solveForA === "tenure" || disableAll}
                        className={
                          solveForA === "tenure"
                            ? "pr-16 border-emerald-500"
                            : ""
                        }
                      />
                      {solveForA === "tenure" && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 animate-pulse">
                          Live
                        </span>
                      )}
                    </div>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-[#262626]">
                      <button
                        type="button"
                        className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                          tenureTypeA === "years"
                            ? "bg-slate-900 text-white"
                            : "bg-transparent text-slate-600 dark:text-slate-300"
                        }`}
                        onClick={() => !disableAll && setTenureTypeA("years")}
                        disabled={disableAll}
                      >
                        Years
                      </button>
                      <button
                        type="button"
                        className={`px-3 py-1.5 text-xs font-medium border-l border-slate-200 dark:border-[#262626] whitespace-nowrap ${
                          tenureTypeA === "months"
                            ? "bg-slate-900 text-white"
                            : "bg-transparent text-slate-600 dark:text-slate-300"
                        }`}
                        onClick={() => !disableAll && setTenureTypeA("months")}
                        disabled={disableAll}
                      >
                        Months
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    = {resultA.months} months
                  </div>
                </div>
              </div>

              {/* EMI row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-1">
                  <Label>EMI amount</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={
                        solveForA === "emi"
                          ? formatNumber(
                              displayForField(
                                solveForA,
                                "emi",
                                resultA,
                                tenureTypeA,
                              ),
                            ) || ""
                          : formatNumber(emiAInput)
                      }
                      onChange={(e) => {
                        if (disableAll) return;
                        const val = parseNumber(e.target.value);
                        if (solveForA === "emi") return;
                        setEmiAInput(val);
                      }}
                      readOnly={solveForA === "emi" || disableAll}
                      className={
                        solveForA === "emi" ? "pr-16 border-emerald-500" : ""
                      }
                    />
                    {solveForA === "emi" && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 animate-pulse">
                        Live
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Current EMI:{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      <AnimatedNumber value={resultA.emi} />
                    </span>
                  </div>
                </div>

                {/* Principal card */}
                <div className="bg-slate-50 dark:bg-[#262626] rounded-2xl px-3 py-2">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Principal amount
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatINR(resultA.principal)}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart + mini cards */}
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr),minmax(0,1fr)] gap-4">
              {/* Thin ring + summary */}
              <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-sm border border-slate-100 dark:border-[#262626] px-5 py-5 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 flex justify-center">
                  <svg viewBox="0 0 200 200" className="w-40 h-40">
                    <circle
                      cx="100"
                      cy="100"
                      r="70"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="10"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="70"
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="10"
                      strokeDasharray={`${100 * 4.4} 440`}
                      transform="rotate(-90 100 100)"
                    />
                    <circle cx="100" cy="100" r="60" fill="#ffffff" />
                    <text
                      x="100"
                      y="92"
                      textAnchor="middle"
                      className="text-[11px] fill-slate-500"
                    >
                      Total payout
                    </text>
                    <text
                      x="100"
                      y="110"
                      textAnchor="middle"
                      className="text-[13px] font-bold fill-slate-900"
                    >
                      {formatINR(resultA.total)}
                    </text>
                    <text
                      x="100"
                      y="130"
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500"
                    >
                      {principalPctA}% P / {interestPctA}% I
                    </text>
                  </svg>
                </div>
                <div className="flex-1 space-y-2 w-full text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      Principal
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatINR(resultA.principal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      Interest
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatINR(resultA.interest)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      Tenure
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {resultA.months} months
                    </span>
                  </div>
                </div>
              </div>

              {/* Mini cards */}
              {/* Mini cards */}
              <div className="space-y-3">
                {/* Monthly EMI – clickable even in read-only */}
                <button
                  type="button"
                  onClick={() => setShowSchedule(!showSchedule)}
                  className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-200 dark:border-[#262626] px-4 py-3 cursor-pointer w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Monthly EMI
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Click to {showSchedule ? "hide" : "view"} schedule
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                      <AnimatedNumber value={resultA.emi} />
                    </div>
                  </div>
                </button>

                {/* Total interest – unchanged, just display */}
                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-200 dark:border-[#262626] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Total interest
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Over full tenure
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatINR(resultA.interest)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectedMake && selectedModel && selectedVehicle?.variant && (
              <VehicleMediaGallery
                make={selectedMake}
                model={selectedModel}
                variant={cleanVariant(
                  selectedVehicle.variant,
                  selectedMake,
                  selectedModel,
                )}
              />
            )}

            {selectedVehicle && selectedFeatureGroups.length > 0 && (
              <details className="bg-white dark:bg-[#1f1f1f] rounded-3xl border border-slate-200 dark:border-[#262626] px-4 py-4 md:px-5 md:py-4 space-y-3">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Variant features
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
                    {selectedVehicle.make} {selectedVehicle.model}{" "}
                    {cleanVariant(
                      selectedVehicle.variant,
                      selectedVehicle.make,
                      selectedVehicle.model,
                    )}
                  </div>
                </summary>

                {/* Search */}
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#262626] rounded-xl px-2 py-1.5 mt-3">
                  <Input
                    placeholder="Search features"
                    value={featureSearch}
                    onChange={(e) => setFeatureSearch(e.target.value)}
                    allowClear
                  />
                </div>

                {/* Features list */}
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1 mt-2">
                  {filteredFeatureGroups.map((group) => (
                    <div key={group.category} className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                        {group.category}
                      </div>

                      <div className="space-y-0.5 text-[11px]">
                        {group.rows.map((row) => (
                          <div
                            key={row.name}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="text-slate-500 dark:text-slate-400">
                              {row.name}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Comparison accordion */}
            <details className="bg-white dark:bg-[#1f1f1f] rounded-3xl border border-slate-200 dark:border-[#262626] px-4 py-4 md:px-6 md:py-5">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Compare with another offer (optional)
                  </h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!disableAll) cloneToScenarioB();
                  }}
                  disabled={disableAll}
                >
                  Use Scenario A
                </Button>
              </summary>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] gap-4">
                {/* Scenario B inputs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Scenario B inputs
                    </span>
                    <div className="inline-flex rounded-full bg-slate-100 dark:bg-[#262626] p-1 text-[11px]">
                      {solveOptions.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            if (disableAll) return;
                            setComparisonTouched(true);
                            setSolveForB(opt.key);
                          }}
                          disabled={disableAll}
                          className={`px-3 py-1 rounded-full font-medium ${
                            solveForB === opt.key
                              ? "bg-slate-900 text-white"
                              : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Amount B */}
                    <div>
                      <Label>Amount</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={
                            solveForB === "amount"
                              ? formatNumber(
                                  displayForField(
                                    solveForB,
                                    "amount",
                                    resultB,
                                    tenureTypeB,
                                  ),
                                ) || ""
                              : formatNumber(loanAmountB)
                          }
                          onChange={(e) => {
                            if (disableAll) return;
                            setComparisonTouched(true);
                            if (solveForB === "amount") return;
                            setLoanAmountB(parseNumber(e.target.value));
                          }}
                          readOnly={solveForB === "amount" || disableAll}
                          className={
                            solveForB === "amount"
                              ? "pr-16 border-emerald-500"
                              : ""
                          }
                        />
                        {solveForB === "amount" && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 animate-pulse">
                            Live
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rate B */}
                    <div>
                      <Label>Rate %</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          value={
                            solveForB === "rate"
                              ? displayForField(
                                  solveForB,
                                  "rate",
                                  resultB,
                                  tenureTypeB,
                                ) || ""
                              : interestB
                          }
                          onChange={(e) => {
                            if (disableAll) return;
                            setComparisonTouched(true);
                            if (solveForB === "rate") return;
                            setInterestB(Number(e.target.value) || 0);
                          }}
                          readOnly={solveForB === "rate" || disableAll}
                          className={
                            solveForB === "rate"
                              ? "pr-16 border-emerald-500"
                              : ""
                          }
                        />
                        {solveForB === "rate" && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 animate-pulse">
                            Live
                          </span>
                        )}
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={20}
                        step="0.1"
                        value={interestB}
                        onChange={(e) => {
                          if (disableAll) return;
                          setComparisonTouched(true);
                          setInterestB(Number(e.target.value) || 0);
                        }}
                        className="w-full mt-1"
                        disabled={disableAll}
                      />
                    </div>

                    {/* Tenure B */}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label>Tenure</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={
                              solveForB === "tenure"
                                ? displayForField(
                                    solveForB,
                                    "tenure",
                                    resultB,
                                    tenureTypeB,
                                  ) || ""
                                : tenureB
                            }
                            onChange={(e) => {
                              if (disableAll) return;
                              setComparisonTouched(true);
                              if (solveForB === "tenure") return;
                              setTenureB(Number(e.target.value) || 0);
                            }}
                            readOnly={solveForB === "tenure" || disableAll}
                            className={
                              solveForB === "tenure"
                                ? "pr-16 border-emerald-500"
                                : ""
                            }
                          />
                          {solveForB === "tenure" && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 animate-pulse">
                              Live
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-[#262626]">
                        <button
                          type="button"
                          className={`px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${
                            tenureTypeB === "years"
                              ? "bg-slate-900 text-white"
                              : "bg-transparent text-slate-600 dark:text-slate-300"
                          }`}
                          onClick={() => {
                            if (disableAll) return;
                            setComparisonTouched(true);
                            setTenureTypeB("years");
                          }}
                          disabled={disableAll}
                        >
                          Y
                        </button>
                        <button
                          type="button"
                          className={`px-2.5 py-1 text-[11px] font-medium border-l border-slate-200 dark:border-[#262626] whitespace-nowrap ${
                            tenureTypeB === "months"
                              ? "bg-slate-900 text-white"
                              : "bg-transparent text-slate-600 dark:text-slate-300"
                          }`}
                          onClick={() => {
                            if (disableAll) return;
                            setComparisonTouched(true);
                            setTenureTypeB("months");
                          }}
                          disabled={disableAll}
                        >
                          M
                        </button>
                      </div>
                    </div>

                    {/* EMI B */}
                    <div>
                      <Label>EMI</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={
                            solveForB === "emi"
                              ? formatNumber(
                                  displayForField(
                                    solveForB,
                                    "emi",
                                    resultB,
                                    tenureTypeB,
                                  ),
                                ) || ""
                              : formatNumber(emiBInput)
                          }
                          onChange={(e) => {
                            if (disableAll) return;
                            setComparisonTouched(true);
                            if (solveForB === "emi") return;
                            setEmiBInput(parseNumber(e.target.value));
                          }}
                          readOnly={solveForB === "emi" || disableAll}
                          className={
                            solveForB === "emi"
                              ? "pr-16 border-emerald-500"
                              : ""
                          }
                        />
                        {solveForB === "emi" && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 animate-pulse">
                            Live
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scenario B outcome + subvention numbers */}
                <div className="space-y-3 border-l border-slate-200 dark:border-[#262626] pl-4">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Outcome
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    EMI B:{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatINR(resultB.emi)}
                    </span>{" "}
                    ({resultB.months} months)
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Loan amount B:{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatINR(resultB.principal)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Interest B:{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatINR(resultB.interest)}
                    </span>
                  </div>

                  <div className="mt-2 rounded-2xl bg-slate-50 dark:bg-[#262626] px-3 py-3 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        EMI difference
                      </span>
                      <span
                        className={`font-semibold ${
                          emiDiff < 0
                            ? "text-emerald-600"
                            : emiDiff > 0
                              ? "text-red-500"
                              : "text-slate-600"
                        }`}
                      >
                        {emiDiff === 0
                          ? "Same"
                          : `${emiDiff < 0 ? "↓" : "↑"} ${formatINR(
                              Math.abs(emiDiff),
                            )}/month`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        Total interest difference
                      </span>
                      <span
                        className={`font-semibold ${
                          interestDiff < 0
                            ? "text-emerald-600"
                            : interestDiff > 0
                              ? "text-red-500"
                              : "text-slate-600"
                        }`}
                      >
                        {interestDiff === 0
                          ? "0"
                          : `${interestDiff < 0 ? "↓" : "↑"} ${formatINR(
                              Math.abs(interestDiff),
                            )}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        Loan amount difference
                      </span>
                      <span
                        className={`font-semibold ${
                          loanDiff < 0
                            ? "text-red-500"
                            : loanDiff > 0
                              ? "text-emerald-600"
                              : "text-slate-600"
                        }`}
                      >
                        {loanDiff === 0
                          ? "0"
                          : `${loanDiff < 0 ? "↓" : "↑"} ${formatINR(
                              Math.abs(loanDiff),
                            )}`}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      At same EMI & tenure, this is the extra loan / subvention
                      required.
                    </div>
                  </div>
                </div>
              </div>
            </details>
            {/* Repayment schedule */}
            {showSchedule && scheduleA.length > 0 && (
              <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl border border-slate-200 dark:border-[#262626] px-4 py-4 md:px-6 md:py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Repayment schedule (Scenario A)
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Month‑wise principal, interest, balance
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 dark:border-[#262626]">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-[#262626] sticky top-0 z-10">
                      <tr>
                        <th className="p-2 text-left">Month</th>
                        <th className="p-2 text-right">Principal</th>
                        <th className="p-2 text-right">Interest</th>
                        <th className="p-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleA.map((row) => (
                        <tr
                          key={row.month}
                          className="border-t border-slate-100 dark:border-[#262626]"
                        >
                          <td className="p-2">{row.month}</td>
                          <td className="p-2 text-right">
                            {formatINR(row.principal)}
                          </td>
                          <td className="p-2 text-right">
                            {formatINR(row.interest)}
                          </td>
                          <td className="p-2 text-right">
                            {formatINR(row.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Terms & conditions */}
            <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl border border-slate-200 dark:border-[#262626] px-4 py-4 md:px-6 md:py-5 text-[11px] space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Terms & conditions
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                • This is an indicative quotation only and does not constitute a
                final offer or sanction.
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                • Interest rate, loan amount, tenure, and EMI are subject to
                credit approval by the financier.
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                • Price & Specifications are subject to change without notice.
                Price & Scheme prevailing at the time of delivery will be
                applicable.
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                • Registration & Issue of Registration Certificate will be at
                the sole discretion of the "Respective Transport Authority".
              </p>
            </div>
          </div>
        </div>

        {/* Pricing modal */}
        <Modal
          open={showPricingModal}
          onCancel={() => setShowPricingModal(false)}
          footer={null}
          width={720}
          destroyOnClose
          title={null}
        >
          <VehiclePricingPopup
            key={
              selectedVehicle?._id ||
              `${selectedVehicle?.make || ""}-${selectedVehicle?.model || ""}-${selectedVehicle?.variant || ""}`
            }
            visible={showPricingModal}
            onClose={() => setShowPricingModal(false)}
            vehicle={selectedVehicle}
            value={effectivePricing}
            onChange={(next) => {
              pricingTouchedRef.current = true;
              setPricingState((prev) => ({
                ...(prev || {}),
                ...(next || {}),
                vehicleId: selectedVehicle?._id || selectedVehicle?.id,
                city: prev?.city || cityInput || "",
                color: prev?.color || "",
              }));
            }}
          />
        </Modal>
      </div>
    </div>
  );
};

export default EMICalculator;
