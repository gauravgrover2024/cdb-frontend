/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Input, Select, message, Modal, AutoComplete, Checkbox } from "antd";
import VehiclePricingPopup from "./VehiclePricingPopup";
import ScenarioAPanel from "./ScenarioAPanel";
import ScenarioBPanel from "./ScenarioBPanel";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import { vehiclesApi } from "../../../api/vehicles";
import { motion, useSpring } from "framer-motion";
import { quotationsApi } from "../../../api/quotations";
import { useLocation } from "react-router-dom";
import { featuresApi } from "../../../api/features";
import {
  INDIAN_CITY_OPTIONS,
  resolveVehiclePricingCity,
} from "./loan-form/pre-file/registrationCityPricing";
import {
  buildVehiclePricingSnapshot,
  normalizePricingLineItems,
} from "../../../utils/vehiclePricingBreakup";

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
  const [displayValue, setDisplayValue] = useState(value || 0);

  useEffect(() => {
    spring.set(value || 0);
  }, [value, spring]);

  useEffect(() => {
    setDisplayValue(value || 0);
    const unsubscribe = spring.on("change", (latest) => {
      setDisplayValue(latest);
    });
    return () => {
      unsubscribe?.();
    };
  }, [spring, value]);

  return (
    <motion.span className={className}>
      {`₹${Math.round(displayValue || 0).toLocaleString("en-IN")}`}
    </motion.span>
  );
};

// ---------- Math helpers ----------

// ---------- Arrear (standard) EMI ----------
const solveEMI = (P, rMonthly, nMonths) => {
  if (P <= 0 || rMonthly <= 0 || nMonths <= 0) return 0;
  const x = Math.pow(1 + rMonthly, nMonths);
  return (P * rMonthly * x) / (x - 1);
};

// ---------- Advance EMI ----------
// In advance EMI the first instalment is paid at disbursement.
// Effective principal = P - EMI_advance, same formula rearranged:
//   EMI_adv = P * r * (1+r)^(n-1) / ((1+r)^n - 1)
const solveEMIAdvance = (P, rMonthly, nMonths) => {
  if (P <= 0 || rMonthly <= 0 || nMonths <= 0) return 0;
  const x = Math.pow(1 + rMonthly, nMonths);
  const xm1 = Math.pow(1 + rMonthly, nMonths - 1);
  return (P * rMonthly * xm1) / (x - 1);
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
const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const normalizeLooseKey = (value) =>
  normalizeText(value).replace(/[^a-z0-9]/g, "");
const collapseSpaces = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();
const escapeRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const trimLeadingPhrase = (source, phrase) => {
  const src = collapseSpaces(source);
  const lead = collapseSpaces(phrase);
  if (!src || !lead) return src;
  return src
    .replace(new RegExp(`^${escapeRegExp(lead)}\\s*[-:]*\\s*`, "i"), "")
    .trim();
};

const trimModelLabel = (model, make) => {
  const rawModel = collapseSpaces(model);
  const rawMake = collapseSpaces(make);
  if (!rawModel) return "";
  return trimLeadingPhrase(rawModel, rawMake) || rawModel;
};

const trimVariantLabel = (variant, make, model) => {
  let output = collapseSpaces(variant);
  const rawMake = collapseSpaces(make);
  const rawModel = collapseSpaces(model);
  const normalizedModel = trimModelLabel(rawModel, rawMake);
  [
    `${rawMake} ${rawModel}`.trim(),
    `${rawMake} ${normalizedModel}`.trim(),
    rawModel,
    normalizedModel,
    rawMake,
  ]
    .filter(Boolean)
    .forEach((prefix) => {
      output = trimLeadingPhrase(output, prefix) || output;
    });
  return output || collapseSpaces(variant);
};

const isVehicleDiscontinued = (vehicle) => {
  const flag = String(
    vehicle?.is_discontinued ??
      vehicle?.isDiscontinued ??
      vehicle?.IsDiscontinued ??
      "",
  )
    .trim()
    .toLowerCase();
  if (["1", "true", "yes"].includes(flag)) return true;
  const discontinuedDate = String(
    vehicle?.discontinued_date ?? vehicle?.discontinuedDate ?? "",
  ).trim();
  if (!discontinuedDate) return false;
  return discontinuedDate.toLowerCase() !== "null";
};

const matchesMakeModelSearch = (make, model, rawQuery) => {
  const tokens = normalizeText(rawQuery).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const hay = normalizeText(`${make} ${model}`);
  return tokens.every((token) => hay.includes(token));
};

const cityMatches = (vehicleCity, selectedCity, backendCity) => {
  const city = normalizeText(vehicleCity);
  const selected = normalizeText(selectedCity);
  const backend = normalizeText(backendCity);

  if (!city) return false;
  if (!selected && !backend) return true;
  if (city === selected || city === backend) return true;
  if (selected && (city.includes(selected) || selected.includes(city)))
    return true;
  if (backend && (city.includes(backend) || backend.includes(city)))
    return true;

  return false;
};

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getVehicleImage = (vehicle) =>
  String(
    vehicle?.image_url ||
      vehicle?.imageUrl ||
      vehicle?.image ||
      vehicle?.photo ||
      vehicle?.thumbnail ||
      vehicle?.url ||
      "",
  ).trim();

const slugTokens = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean);

const mediaUrlMatchesVehicle = (url, make, model) => {
  const rawUrl = String(url || "")
    .trim()
    .toLowerCase();
  if (!rawUrl) return false;
  const makeTokens = slugTokens(make);
  const modelTokens = slugTokens(model);
  if (!makeTokens.length || !modelTokens.length) return false;

  const normalizedPath = rawUrl.replace(/[^a-z0-9]+/g, "-");
  const hasMake = makeTokens.some(
    (token) =>
      normalizedPath.includes(`-${token}-`) ||
      normalizedPath.endsWith(`-${token}`),
  );
  const hasModel = modelTokens.some(
    (token) =>
      normalizedPath.includes(`-${token}-`) ||
      normalizedPath.endsWith(`-${token}`),
  );

  return hasMake && hasModel;
};

const toHighResCardekhoUrl = (url, size = "930x620") => {
  const clean = String(url || "")
    .split("?")[0]
    .trim();
  if (!clean) return "";

  return clean
    .replace("/images/car-images/large/", `/images/car-images/${size}/`)
    .replace("/images/car-images/630x420/", `/images/car-images/${size}/`)
    .replace("/images/car-images/360x240/", `/images/car-images/${size}/`)
    .replace(
      "/images/carexteriorimages/medium/",
      `/images/carexteriorimages/${size}/`,
    )
    .replace(
      "/images/carexteriorimages/630x420/",
      `/images/carexteriorimages/${size}/`,
    )
    .replace(
      "/images/carexteriorimages/360x240/",
      `/images/carexteriorimages/${size}/`,
    );
};

const getVehicleColor = (vehicle) =>
  String(
    vehicle?.color_name ||
      vehicle?.colorName ||
      vehicle?.colour_name ||
      vehicle?.colourName ||
      vehicle?.color ||
      vehicle?.colour ||
      "",
  ).trim();

const getVehicleHex = (vehicle) =>
  String(
    vehicle?.hex || vehicle?.color_hex || vehicle?.colour_hex || "",
  ).trim();

const buildMediaKey = (vehicle) =>
  [
    normalizeText(vehicle?.make || vehicle?.brand || ""),
    normalizeText(vehicle?.model || vehicle?.modelName || ""),
    normalizeText(vehicle?.variant || vehicle?.variantName || ""),
    normalizeText(getVehicleColor(vehicle) || "default"),
    getVehicleImage(vehicle),
  ].join("|");

const normalizeVehicleRecord = (vehicle = {}) => {
  const toNum = (v) => Number(v) || 0;
  const pricingSnapshot = buildVehiclePricingSnapshot(vehicle);
  const rawMake = String(
    vehicle.make || vehicle.brand || vehicle.brandName || "",
  ).trim();
  const rawModel = String(vehicle.model || vehicle.modelName || "").trim();
  const normalizedModel = trimModelLabel(rawModel, rawMake) || rawModel;
  const rawVariant = String(
    vehicle.variant || vehicle.variantName || vehicle.name || "",
  ).trim();
  const normalizedVariant =
    trimVariantLabel(rawVariant, rawMake, normalizedModel) || rawVariant;

  return {
    ...vehicle,
    _id: vehicle._id || vehicle.id || vehicle.vehicleId,
    make: rawMake,
    model: normalizedModel,
    variant: normalizedVariant,
    city: String(
      vehicle.city || vehicle.locationCity || vehicle.showroomCity || "",
    ).trim(),
    onRoadPrice: toNum(
      pricingSnapshot.netOnRoad ||
        vehicle.onRoadPrice ||
        vehicle.on_road_price ||
        vehicle.netOnRoad ||
        vehicle.onRoad,
    ),
    exShowroom: toNum(pricingSnapshot.exShowroom),
    rto: toNum(pricingSnapshot.rto),
    insurance: toNum(pricingSnapshot.insurance),
    otherCharges: toNum(pricingSnapshot.tcs),
    pricingSnapshot,
  };
};

const buildSchedule = (principal, monthlyRate, emi, months) => {
  const rows = [];
  let bal = Math.max(0, Number(principal) || 0);
  const rate = Math.max(0, Number(monthlyRate) || 0);
  const emiVal = Math.max(0, Number(emi) || 0);
  const totalMonths = Math.max(0, Math.round(Number(months) || 0));
  for (let i = 1; i <= totalMonths; i++) {
    const interest = bal * rate;
    const principalPart = Math.max(0, Math.min(bal, emiVal - interest));
    bal = Math.max(0, bal - principalPart);
    rows.push({
      month: i,
      interest: Math.round(interest),
      principal: Math.round(principalPart),
      balance: Math.round(bal),
    });
  }
  return rows;
};

const EMICalculator = ({
  onResetCustomer,
  customer,
  initialQuotation,
  initialShareView,
  isFloating = false,
  onClose,
}) => {
  const EMI_PERF_DEBUG = true;
  const perfLog = (...args) => {
    if (!EMI_PERF_DEBUG) return;
    // Keep logs easy to grep in browser devtools.
    console.log("[EMI-PERF]", ...args);
  };

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const location = useLocation();
  const fromVariant = location.state?.fromVariant;
  const [featureSearch, setFeatureSearch] = useState("");

  const [cityInput, setCityInput] = useState("Delhi");
  const [debouncedCityInput, setDebouncedCityInput] = useState("Delhi");
  const [includeDiscontinued, setIncludeDiscontinued] = useState(false);
  const [vehicleSearchInput, setVehicleSearchInput] = useState("");
  const [debouncedVehicleSearchInput, setDebouncedVehicleSearchInput] =
    useState("");
  const [vehicleSearchLoading, setVehicleSearchLoading] = useState(false);
  const [vehicleSearchOptions, setVehicleSearchOptions] = useState([]);
  const cityAutocompleteOptions = useMemo(() => {
    const typed = String(cityInput || "").trim();
    if (!typed) return INDIAN_CITY_OPTIONS;
    const exists = INDIAN_CITY_OPTIONS.some(
      (opt) => normalizeText(opt.value) === normalizeText(typed),
    );
    if (exists) return INDIAN_CITY_OPTIONS;
    return [{ value: typed, label: typed }, ...INDIAN_CITY_OPTIONS];
  }, [cityInput]);

  const [customerValue, setCustomerValue] = useState(null);
  const [customerKey, setCustomerKey] = useState(0);

  // Make / model / variant
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [makeOptions, setMakeOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);

  const selectedVehicle = useMemo(
    () =>
      vehicles.find(
        (v) => String(v._id) === String(selectedVariant?.value || ""),
      ),
    [vehicles, selectedVariant],
  );
  const galleryVehicleContext = useMemo(() => {
    if (selectedVehicle) return selectedVehicle;
    if (!selectedMake || !selectedModel) return null;
    return (
      vehicles.find(
        (v) =>
          normalizeText(v?.make) === normalizeText(selectedMake) &&
          normalizeText(v?.model) === normalizeText(selectedModel),
      ) || {
        _id: "",
        make: selectedMake,
        model: selectedModel,
        variant: "",
      }
    );
  }, [selectedMake, selectedModel, selectedVehicle, vehicles]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [colorGallery, setColorGallery] = useState([]);
  const [colorGalleryLoading, setColorGalleryLoading] = useState(false);
  const [mainColorImageMeta, setMainColorImageMeta] = useState(null);
  const [colorLightboxOpen, setColorLightboxOpen] = useState(false);
  const [colorLightboxIdx, setColorLightboxIdx] = useState(0);

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

  const variantLabelFromSelection = useMemo(
    () =>
      String(selectedVariant?.label || "")
        .split("—")[0]
        .trim(),
    [selectedVariant?.label],
  );

  const featureLookup = useMemo(() => {
    const src = selectedVehicle || fromVariant || null;
    if (!src) return null;
    return {
      vehicleId: String(src?._id || src?.vehicleId || src?.id || "").trim(),
      make: String(
        src?.make || src?.brand || src?.brandName || selectedMake || "",
      ).trim(),
      model: String(src?.model || src?.modelName || selectedModel || "").trim(),
      variant: String(
        src?.variant ||
          src?.variantName ||
          src?.name ||
          variantLabelFromSelection ||
          "",
      ).trim(),
    };
  }, [
    selectedVehicle?._id,
    selectedVehicle?.make,
    selectedVehicle?.model,
    selectedVehicle?.variant,
    fromVariant?._id,
    fromVariant?.id,
    fromVariant?.vehicleId,
    fromVariant?.make,
    fromVariant?.brand,
    fromVariant?.model,
    fromVariant?.variant,
    selectedMake,
    selectedModel,
    variantLabelFromSelection,
  ]);

  // EMI type: advance | arrear (default arrear = standard)
  const [emiType, setEmiType] = useState("arrear");

  // Downpayment + loan (Scenario A)
  const [downPct, setDownPct] = useState(10); // default 10%
  const [loanAmountA, setLoanAmountA] = useState(0);

  // Scenario A core
  const [interestA, setInterestA] = useState(9.5);
  const [tenureA, setTenureA] = useState(5);
  const [tenureTypeA, setTenureTypeA] = useState("years");
  const [emiAInput, setEmiAInput] = useState("");
  const [solveForA, setSolveForA] = useState("emi"); // emi | amount | rate | tenure

  // Scenario B (comparison)
  const [showScenarioB, setShowScenarioB] = useState(false);
  const [loanAmountB, setLoanAmountB] = useState(0);
  const [interestB, setInterestB] = useState(9);
  const [tenureB, setTenureB] = useState(5);
  const [tenureTypeB, setTenureTypeB] = useState("years");
  const [emiBInput, setEmiBInput] = useState("");
  const [solveForB, setSolveForB] = useState("amount");
  const [emiTypeB, setEmiTypeB] = useState("arrear");
  const [comparisonTouched, setComparisonTouched] = useState(false);

  // UI
  const [showSchedule, setShowSchedule] = useState(true);
  const [emiBreakupHover, setEmiBreakupHover] = useState(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [shareMode, setShareMode] = useState(false);
  const [savedQuotationId, setSavedQuotationId] = useState(null);

  const [pricingState, setPricingState] = useState(null);
  const [pricingSourceCity, setPricingSourceCity] = useState("");
  const cityFallbackNoticeRef = useRef("");
  const emiBreakupWrapRef = useRef(null);
  // Derived backend city used for pricing source selection
  const backendCityKey = useMemo(() => {
    if (!debouncedCityInput) return null;
    return resolveVehiclePricingCity(debouncedCityInput);
  }, [debouncedCityInput]);

  useEffect(() => {
    if (fromVariant) return;
    if (!initialQuotation) return;

    const q = initialQuotation;
    const quoteVehicle = q.vehicle || {};

    if (quoteVehicle.make) setSelectedMake(String(quoteVehicle.make));
    if (quoteVehicle.model) setSelectedModel(String(quoteVehicle.model));
    setCityInput(q.cityTyped || "Delhi");

    if (!vehicles.length) return;

    // Find vehicle by id/name from quotation
    const v = vehicles.find(
      (x) =>
        String(x._id) === String(quoteVehicle.vehicleId) ||
        (normalizeText(x.make) === normalizeText(quoteVehicle.make) &&
          normalizeText(x.model) === normalizeText(quoteVehicle.model) &&
          normalizeText(x.variant) === normalizeText(quoteVehicle.variant)),
    );
    if (!v) return;

    // Variant
    setSelectedVariant({
      value: v._id,
      label: `${v.variant} — ${formatINR(v.onRoadPrice)}`,
    });

    setPricingState((prev) => ({
      ...(prev || {}),
      ...(q.pricing || {}),
      city: q.cityTyped || "Delhi",
      color: q.pricing?.color || "",
    }));
  }, [fromVariant, initialQuotation, vehicles]);

  // Populate pricing state from selected vehicle (city-specific pricing row)
  // and always sync core pricing fields when city or selected row changes.
  useEffect(() => {
    if (!selectedVehicle) return;
    const snapshot = buildVehiclePricingSnapshot(selectedVehicle);

    setPricingState((prev) => ({
      ...(prev || {}),
      vehicleId: selectedVehicle._id,
      pricingCityKey: String(backendCityKey || "")
        .trim()
        .toLowerCase(),
      city: cityInput || prev?.city || selectedVehicle.city || "",
      color: prev?.color || "",
      // Core city-driven amounts must always update from selected city row.
      exShowroom: Number(snapshot.exShowroom) || 0,
      rto: Number(snapshot.rto) || 0,
      insurance: Number(snapshot.insurance) || 0,
      tcs: Number(snapshot.tcs) || 0,
      epc: Number(snapshot.epc) || 0,
      accessories: Number(snapshot.accessories) || 0,
      fastag: Number(snapshot.fastag) || 0,
      extendedWarranty: Number(snapshot.extendedWarranty) || 0,
      // Keep quote-only custom lines if user entered them.
      additionsOthers:
        Array.isArray(prev?.additionsOthers) && prev.additionsOthers.length
          ? prev.additionsOthers
          : snapshot.additionsOthers,
      dealerDiscount:
        Number(prev?.dealerDiscount) || Number(snapshot.dealerDiscount) || 0,
      schemeDiscount:
        Number(prev?.schemeDiscount) || Number(snapshot.schemeDiscount) || 0,
      insuranceCashback:
        Number(prev?.insuranceCashback) ||
        Number(snapshot.insuranceCashback) ||
        0,
      exchange: Number(prev?.exchange) || Number(snapshot.exchange) || 0,
      exchangeVehiclePrice: Number(prev?.exchangeVehiclePrice) || 0,
      loyalty: Number(prev?.loyalty) || Number(snapshot.loyalty) || 0,
      corporate: Number(prev?.corporate) || Number(snapshot.corporate) || 0,
      discountsOthers:
        Array.isArray(prev?.discountsOthers) && prev.discountsOthers.length
          ? prev.discountsOthers
          : snapshot.discountsOthers,
      onRoadBeforeDiscount: Number(snapshot.onRoadBeforeDiscount) || 0,
      totalDiscount: Number(snapshot.totalDiscount) || 0,
      netOnRoad: Number(snapshot.netOnRoad) || 0,
    }));
  }, [selectedVehicle, cityInput, backendCityKey]);

  useEffect(() => {
    if (!selectedVehicle?._id) return;
    if (!selectedVariant?.value) return;

    const expectedLabel = `${selectedVehicle.variant} — ${formatINR(
      selectedVehicle.onRoadPrice || 0,
    )}`;

    if (String(selectedVariant.label || "").trim() === expectedLabel) return;
    if (String(selectedVariant.value) !== String(selectedVehicle._id)) return;

    setSelectedVariant((prev) => {
      if (!prev) return prev;
      if (String(prev.value) !== String(selectedVehicle._id)) return prev;
      return {
        ...prev,
        label: expectedLabel,
      };
    });
  }, [
    selectedVehicle?._id,
    selectedVehicle?.variant,
    selectedVehicle?.onRoadPrice,
    selectedVariant?.value,
    selectedVariant?.label,
  ]);

  // When pricingState (netOnRoad or onRoadBeforeDiscount) changes, update loan amounts and derived EMI
  useEffect(() => {
    // If onRoadPrice changes (via pricingState), recompute derived loan and EMIs
    const newOnRoad =
      pricingState?.netOnRoad ?? selectedVehicle?.onRoadPrice ?? 0;
    if (!newOnRoad) return;

    const dpAmt = (newOnRoad * downPct) / 100;
    const loan = newOnRoad - dpAmt;

    setLoanAmountA(loan);
    if (!comparisonTouched) setLoanAmountB(loan);

    // If solveForA === 'emi' we rely on computeScenario useMemo which uses loanAmountA,
    // so updating loanAmountA will update resultA automatically.
  }, [pricingState, selectedVehicle, downPct]);

  useEffect(() => {
    if (!fromVariant) return;

    const fromMake =
      fromVariant.make || fromVariant.brand || fromVariant.brandName || "";
    const fromModel = fromVariant.model || fromVariant.modelName || "";
    const fromVariantName =
      fromVariant.variant || fromVariant.variantName || fromVariant.name || "";

    if (fromMake) setSelectedMake(fromMake);
    if (fromModel) setSelectedModel(fromModel);

    const prefillCity = fromVariant.city || "Delhi";
    setCityInput(prefillCity);

    const fallbackPrice =
      Number(fromVariant.onRoadPrice || fromVariant.price || 0) || 0;
    const fallbackDownPayment =
      Number(fromVariant.defaultDownPayment) || Math.round(fallbackPrice * 0.1);
    const fallbackLoan =
      Number(fromVariant.loanAmount) ||
      Math.max(0, fallbackPrice - fallbackDownPayment);

    setLoanAmountA(fallbackLoan);
    setLoanAmountB(fallbackLoan);
    setDownPct(
      fallbackPrice ? (fallbackDownPayment / fallbackPrice) * 100 : 10,
    );

    if (!vehicles.length) return;

    const v = vehicles.find(
      (x) =>
        String(x._id) === String(fromVariant.vehicleId) ||
        (normalizeText(x.make) === normalizeText(fromMake) &&
          normalizeText(x.model) === normalizeText(fromModel) &&
          normalizeText(x.variant) === normalizeText(fromVariantName)),
    );

    if (!v) return;

    setSelectedVariant({
      value: v._id,
      label: v.variant,
    });

    const price =
      Number(fromVariant.onRoadPrice || fromVariant.price || v.onRoadPrice) ||
      0;
    const downPayment =
      Number(fromVariant.defaultDownPayment) || Math.round(price * 0.1);
    const loan =
      Number(fromVariant.loanAmount) || Math.max(0, price - downPayment);

    setLoanAmountA(loan);
    setLoanAmountB(loan);
    setDownPct(price ? (downPayment / price) * 100 : 10);

    setPricingState((prev) => ({
      ...(prev || {}),
      vehicleId: v._id,
      city: prefillCity,
      exShowroom: Number(fromVariant.exShowroomPrice || v.exShowroom) || 0,
      netOnRoad: price,
      onRoadBeforeDiscount: price,
      totalDiscount: 0,
    }));
  }, [fromVariant, vehicles]);

  useEffect(() => {
    if (!initialQuotation) return;
    const q = initialQuotation;
    if (q?._id) setSavedQuotationId(q._id);

    if (q.scenarios?.A) {
      setLoanAmountA(q.scenarios.A.loanAmount || 0);
      setInterestA(q.scenarios.A.interest || 0);
      setTenureA(q.scenarios.A.tenure || 0);
      setTenureTypeA(q.scenarios.A.tenureType || "years");
      setEmiAInput(q.scenarios.A.emi || "");
      setEmiType(
        q.scenarios.A.emiMode === "advance" ||
          q.scenarios.A.emiType === "advance"
          ? "advance"
          : "arrear",
      );
    }

    if (q.scenarios?.B) {
      setLoanAmountB(q.scenarios.B.loanAmount || 0);
      setInterestB(q.scenarios.B.interest || 0);
      setTenureB(q.scenarios.B.tenure || 0);
      setTenureTypeB(q.scenarios.B.tenureType || "years");
      setEmiBInput(q.scenarios.B.emi || "");
      setEmiTypeB(
        q.scenarios.B.emiMode === "advance" ||
          q.scenarios.B.emiType === "advance"
          ? "advance"
          : "arrear",
      );
    }
  }, [initialQuotation]);

  useEffect(() => {
    let ignore = false;

    const loadFeatures = async () => {
      if (!featureLookup) {
        setSelectedFeatures([]);
        return;
      }

      const targetVehicleId = normalizeText(featureLookup.vehicleId);
      const targetMake = normalizeText(featureLookup.make);
      const targetModel = normalizeText(featureLookup.model);
      const targetVariant = normalizeText(featureLookup.variant);

      try {
        if (
          featureLookup.vehicleId ||
          featureLookup.make ||
          featureLookup.model ||
          featureLookup.variant
        ) {
          const bySelection = await featuresApi.getBySelection(featureLookup);
          const rows = toArray(bySelection);

          // Endpoint can return either direct feature rows or a wrapped variant row.
          let fromSelection = [];
          if (rows.length && Array.isArray(rows[0]?.features)) {
            fromSelection = rows[0].features;
          } else if (
            rows.length &&
            rows.every(
              (row) => typeof row === "object" && row?.name && "value" in row,
            )
          ) {
            fromSelection = rows;
          }

          if (!ignore && fromSelection.length) {
            setSelectedFeatures(fromSelection);
            return;
          }
        }

        const scopedVariantsResponse = await featuresApi.getVariantsWithPrice({
          make: featureLookup.make || "",
          model: featureLookup.model || "",
          variant: featureLookup.variant || "",
          slim: "0",
          includeDiscontinued: "1",
        });
        const variants = toArray(scopedVariantsResponse);

        const match = variants.find((row) => {
          const rowVehicleId = normalizeText(
            String(row?.vehicleId || row?._id || row?.id || "").trim(),
          );
          const rowMake = normalizeText(
            row?.make || row?.brand || row?.brandName,
          );
          const rowModel = normalizeText(row?.model || row?.modelName);
          const rowVariant = normalizeText(
            row?.variant || row?.variantName || row?.name,
          );

          if (
            targetVehicleId &&
            rowVehicleId &&
            rowVehicleId === targetVehicleId
          ) {
            return true;
          }
          return (
            !!targetMake &&
            !!targetModel &&
            !!targetVariant &&
            rowMake === targetMake &&
            rowModel === targetModel &&
            rowVariant === targetVariant
          );
        });

        if (!ignore) setSelectedFeatures(match?.features || []);
      } catch (e) {
        if (!ignore) setSelectedFeatures([]);
      }
    };

    loadFeatures();
    return () => {
      ignore = true;
    };
  }, [
    featureLookup?.vehicleId,
    featureLookup?.make,
    featureLookup?.model,
    featureLookup?.variant,
  ]);

  useEffect(() => {
    let ignore = false;

    const loadColorGallery = async () => {
      if (!galleryVehicleContext) {
        setColorGallery([]);
        return;
      }

      const makeKey = normalizeText(galleryVehicleContext.make);
      const modelKey = normalizeText(galleryVehicleContext.model);
      const variantKey = selectedVehicle
        ? normalizeText(galleryVehicleContext.variant)
        : "";

      setColorGalleryLoading(true);
      try {
        const mediaPayload = await vehiclesApi.getMedia(
          galleryVehicleContext.make,
          galleryVehicleContext.model,
          selectedVehicle ? galleryVehicleContext.variant : null,
        );

        const mediaRows = toArray(mediaPayload).filter((row) =>
          mediaUrlMatchesVehicle(
            getVehicleImage(row),
            galleryVehicleContext.make,
            galleryVehicleContext.model,
          ),
        );
        const fallbackRows = vehicles.filter((row) => {
          const rowMake = normalizeText(row.make);
          const rowModel = normalizeText(row.model);
          const rowVariant = normalizeText(row.variant);
          if (rowMake !== makeKey || rowModel !== modelKey) return false;
          if (variantKey && rowVariant === variantKey) return true;
          return !variantKey;
        });
        const modelScopedRows = fallbackRows.length
          ? fallbackRows
          : vehicles.filter((row) => {
              const rowMake = normalizeText(row.make);
              const rowModel = normalizeText(row.model);
              return rowMake === makeKey && rowModel === modelKey;
            });

        const source = [...mediaRows, ...modelScopedRows];
        const unique = [];
        const seen = new Set();

        source.forEach((row) => {
          const image = getVehicleImage(row);
          const colorName = getVehicleColor(row);
          if (!image && !colorName) return;

          const key = buildMediaKey(row);
          if (seen.has(key)) return;
          seen.add(key);

          const originalImage = getVehicleImage(row);
          const heroImage = toHighResCardekhoUrl(originalImage, "930x620");
          const thumbImage = toHighResCardekhoUrl(originalImage, "630x420");
          unique.push({
            color: colorName || "Default",
            image: heroImage || image,
            thumb: thumbImage || image,
            originalImage,
            hex: getVehicleHex(row),
          });
        });

        if (!ignore) {
          setColorGallery(unique);
          setPricingState((prev) => {
            const existing = String(prev?.color || "").trim();
            if (existing || !unique.length) return prev;
            return {
              ...(prev || {}),
              color: unique[0].color || "",
            };
          });
        }
      } catch (error) {
        const fallbackRows = vehicles.filter((row) => {
          const rowMake = normalizeText(row.make);
          const rowModel = normalizeText(row.model);
          const rowVariant = normalizeText(row.variant);
          return (
            rowMake === makeKey &&
            rowModel === modelKey &&
            (!variantKey || rowVariant === variantKey)
          );
        });

        const unique = [];
        const seen = new Set();
        fallbackRows.forEach((row) => {
          const image = getVehicleImage(row);
          const colorName = getVehicleColor(row);
          if (!image && !colorName) return;

          const key = buildMediaKey(row);
          if (seen.has(key)) return;
          seen.add(key);
          const originalImage = getVehicleImage(row);
          const heroImage = toHighResCardekhoUrl(originalImage, "930x620");
          const thumbImage = toHighResCardekhoUrl(originalImage, "630x420");
          unique.push({
            color: colorName || "Default",
            image: heroImage || image,
            thumb: thumbImage || image,
            originalImage,
            hex: getVehicleHex(row),
          });
        });

        if (!ignore) setColorGallery(unique);
      } finally {
        if (!ignore) setColorGalleryLoading(false);
      }
    };

    loadColorGallery();
    return () => {
      ignore = true;
    };
  }, [
    galleryVehicleContext?._id,
    galleryVehicleContext?.make,
    galleryVehicleContext?.model,
    galleryVehicleContext?.variant,
    selectedVehicle?._id,
    vehicles,
  ]);

  useEffect(() => {
    if (initialShareView && initialQuotation) {
      setShareMode(true);
    }
  }, [initialShareView, initialQuotation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCityInput(String(cityInput || "").trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [cityInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedVehicleSearchInput(String(vehicleSearchInput || "").trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [vehicleSearchInput]);

  useEffect(() => {
    let ignore = false;

    const fetchVehicleSearchOptions = async () => {
      const query = String(debouncedVehicleSearchInput || "").trim();
      if (query.length < 2) {
        setVehicleSearchOptions([]);
        return;
      }

      setVehicleSearchLoading(true);
      try {
        const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
        const seed = tokens[0] || query;
        const payload = await vehiclesApi.getAll({
          q: seed,
          limit: 200,
        });

        const rows = toArray(payload)
          .map(normalizeVehicleRecord)
          .filter((row) =>
            includeDiscontinued ? true : !isVehicleDiscontinued(row),
          )
          .filter((row) => matchesMakeModelSearch(row.make, row.model, query));

        const seen = new Set();
        const options = [];
        rows.forEach((row) => {
          const make = String(row.make || "").trim();
          const model = String(row.model || "").trim();
          if (!make || !model) return;
          const key = `${normalizeText(make)}|${normalizeText(model)}`;
          if (seen.has(key)) return;
          seen.add(key);
          options.push({
            value: `${make} ${model}`.trim(),
            label: `${make} ${model}`.trim(),
            make,
            model,
          });
        });

        if (ignore) return;
        setVehicleSearchOptions(options.slice(0, 20));
      } catch {
        if (!ignore) setVehicleSearchOptions([]);
      } finally {
        if (!ignore) setVehicleSearchLoading(false);
      }
    };

    fetchVehicleSearchOptions();
    return () => {
      ignore = true;
    };
  }, [debouncedVehicleSearchInput, includeDiscontinued]);

  useEffect(() => {
    let ignore = false;

    const fetchMakes = async () => {
      const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const startedAt = performance.now();
      perfLog("brand-load:start", {
        runId,
        cityInput: String(cityInput || ""),
        backendCityKey: String(backendCityKey || ""),
      });

      setVehiclesLoading(true);
      try {
        const apiStartedAt = performance.now();
        const makesRes = await vehiclesApi.getUniqueMakes(
          backendCityKey || null,
          includeDiscontinued,
        );
        const rawRows = toArray(makesRes);
        const normalized = rawRows
          .map((row) => String(row || "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        if (ignore) return;

        setMakeOptions(normalized);

        perfLog("brand-load:makes-api", {
          runId,
          city: backendCityKey,
          rows: normalized.length,
          apiMs: Number((performance.now() - apiStartedAt).toFixed(1)),
        });
        perfLog("brand-load:done", {
          runId,
          finalRows: normalized.length,
          totalMs: Number((performance.now() - startedAt).toFixed(1)),
        });
      } catch (e) {
        if (ignore) return;
        perfLog("brand-load:error", {
          runId,
          error: e?.message || String(e),
          totalMs: Number((performance.now() - startedAt).toFixed(1)),
        });
        message.error("Failed to load brands for selected city.");
      } finally {
        if (!ignore) setVehiclesLoading(false);
      }
    };

    fetchMakes();
    return () => {
      ignore = true;
    };
  }, [backendCityKey, cityInput, includeDiscontinued]);

  useEffect(() => {
    let ignore = false;

    const fetchModels = async () => {
      if (!selectedMake) {
        setModelOptions([]);
        setVehicles([]);
        return;
      }
      setVehiclesLoading(true);
      try {
        const res = await vehiclesApi.getUniqueModels(
          selectedMake,
          backendCityKey || null,
          includeDiscontinued,
        );
        const rows = toArray(res)
          .map((row) => String(row || "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        if (ignore) return;
        setModelOptions(rows);
      } catch {
        if (ignore) return;
        setModelOptions([]);
      } finally {
        if (!ignore) setVehiclesLoading(false);
      }
    };

    fetchModels();
    return () => {
      ignore = true;
    };
  }, [selectedMake, backendCityKey, includeDiscontinued]);

  useEffect(() => {
    let ignore = false;

    const fetchVariants = async () => {
      if (!selectedMake || !selectedModel) {
        setVehicles([]);
        return;
      }
      const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setVehiclesLoading(true);
      try {
        const apiStartedAt = performance.now();
        const res = await vehiclesApi.getVariantsWithPrice(
          selectedMake,
          selectedModel,
          backendCityKey || null,
          includeDiscontinued,
        );
        const rawRows = toArray(res);
        const normalizeStartedAt = performance.now();
        const list = rawRows.map(normalizeVehicleRecord);
        let finalList = list;
        let resolvedCity = backendCityKey || "";

        if (backendCityKey) {
          const strictCityRows = list.filter((row) =>
            cityMatches(row.city, backendCityKey, backendCityKey),
          );

          if (strictCityRows.length) {
            finalList = strictCityRows;
          } else {
            // Backend may return fallback rows (e.g. Gurgaon) for unsupported cities.
            // For EMI we keep deterministic behavior: fallback to Delhi pricing only.
            const delhiRes = await vehiclesApi.getVariantsWithPrice(
              selectedMake,
              selectedModel,
              "Delhi",
              includeDiscontinued,
            );
            const delhiRows = toArray(delhiRes)
              .map(normalizeVehicleRecord)
              .filter((row) => cityMatches(row.city, "Delhi", "Delhi"));

            finalList = delhiRows;
            resolvedCity = delhiRows.length ? "Delhi" : backendCityKey;

            if (delhiRows.length) {
              const noticeKey = `${normalizeText(selectedMake)}|${normalizeText(
                selectedModel,
              )}|${normalizeText(backendCityKey)}`;
              if (cityFallbackNoticeRef.current !== noticeKey) {
                cityFallbackNoticeRef.current = noticeKey;
                message.info(
                  `City pricing not available for ${backendCityKey}. Showing Delhi pricing.`,
                );
              }
            }
          }
        }

        if (ignore) return;
        setVehicles(finalList);
        setPricingSourceCity(resolvedCity || "");
        perfLog("brand-load:variants-api", {
          runId,
          city: backendCityKey,
          resolvedCity,
          make: selectedMake,
          model: selectedModel,
          rows: rawRows.length,
          finalRows: finalList.length,
          apiMs: Number((normalizeStartedAt - apiStartedAt).toFixed(1)),
          normalizeMs: Number(
            (performance.now() - normalizeStartedAt).toFixed(1),
          ),
        });
      } catch (e) {
        if (ignore) return;
        setVehicles([]);
        setPricingSourceCity("");
        perfLog("brand-load:variants-api-error", {
          runId,
          city: backendCityKey,
          make: selectedMake,
          model: selectedModel,
          error: e?.message || String(e),
        });
      } finally {
        if (!ignore) setVehiclesLoading(false);
      }
    };

    fetchVariants();
    return () => {
      ignore = true;
    };
  }, [selectedMake, selectedModel, backendCityKey, includeDiscontinued]);

  const filteredVehicles = useMemo(() => vehicles, [vehicles]);

  const uniqueMakes = useMemo(() => makeOptions, [makeOptions]);

  useEffect(() => {
    perfLog("brand-options:ready", {
      cityInput: String(cityInput || ""),
      backendCityKey: String(backendCityKey || ""),
      vehicles: vehicles.length,
      filteredVehicles: filteredVehicles.length,
      uniqueMakes: uniqueMakes.length,
      sampleMakes: uniqueMakes.slice(0, 10),
    });
  }, [
    cityInput,
    backendCityKey,
    vehicles.length,
    filteredVehicles.length,
    uniqueMakes,
  ]);

  const uniqueModels = useMemo(() => modelOptions, [modelOptions]);

  const variantsForModel = useMemo(() => vehicles, [vehicles]);

  useEffect(() => {
    if (!selectedMake) return;
    if (!uniqueMakes.length) return;
    if (!uniqueMakes.includes(selectedMake)) {
      setSelectedMake("");
      setSelectedModel("");
      setSelectedVariant(null);
      setLoanAmountA(0);
      if (!comparisonTouched) setLoanAmountB(0);
    }
  }, [uniqueMakes, selectedMake, comparisonTouched]);

  useEffect(() => {
    if (!selectedModel) return;
    if (!uniqueModels.length) return;
    if (!uniqueModels.includes(selectedModel)) {
      const selectedKey = normalizeLooseKey(selectedModel);
      const remapped =
        uniqueModels.find(
          (modelValue) => normalizeLooseKey(modelValue) === selectedKey,
        ) ||
        uniqueModels.find((modelValue) =>
          normalizeLooseKey(modelValue).includes(selectedKey),
        );
      if (remapped) {
        if (remapped !== selectedModel) setSelectedModel(remapped);
        return;
      }

      setSelectedModel("");
      setSelectedVariant(null);
      setLoanAmountA(0);
      if (!comparisonTouched) setLoanAmountB(0);
    }
  }, [uniqueModels, selectedModel, comparisonTouched]);

  useEffect(() => {
    if (!selectedVariant || !selectedMake || !selectedModel || !vehicles.length)
      return;

    const existing = vehicles.find(
      (v) => String(v._id) === String(selectedVariant.value),
    );
    if (existing) return;

    const selectedVariantName = normalizeText(
      String(selectedVariant.label || "").split("—")[0],
    );
    const selectedVariantLooseKey = normalizeLooseKey(selectedVariantName);

    const remapped =
      vehicles.find(
        (v) =>
          normalizeText(v.make) === normalizeText(selectedMake) &&
          normalizeText(v.model) === normalizeText(selectedModel) &&
          (!selectedVariantName ||
            normalizeText(v.variant) === selectedVariantName),
      ) ||
      vehicles.find((v) => {
        if (normalizeText(v.make) !== normalizeText(selectedMake)) return false;
        if (normalizeText(v.model) !== normalizeText(selectedModel))
          return false;
        if (!selectedVariantLooseKey) return false;
        const candidateKey = normalizeLooseKey(v.variant);
        return (
          candidateKey === selectedVariantLooseKey ||
          candidateKey.includes(selectedVariantLooseKey) ||
          selectedVariantLooseKey.includes(candidateKey)
        );
      });

    if (!remapped) return;

    setSelectedVariant({
      value: remapped._id,
      label: `${remapped.variant} — ${formatINR(remapped.onRoadPrice)}`,
    });
  }, [vehicles, selectedVariant, selectedMake, selectedModel]);

  const pricingComputed = useMemo(
    () =>
      buildVehiclePricingSnapshot(selectedVehicle || {}, pricingState || {}),
    [selectedVehicle, pricingState],
  );

  const onRoadPrice =
    Number(pricingComputed.netOnRoad) ||
    pricingState?.netOnRoad ||
    selectedVehicle?.onRoadPrice ||
    0;

  const exShowroom = Number(pricingComputed.exShowroom) || 0;
  const rto = Number(pricingComputed.rto) || 0;
  const insurance = Number(pricingComputed.insurance) || 0;
  const otherCharges = Number(pricingComputed.tcs) || 0;

  // City & color (stored in pricingState but editable here)
  const city = pricingState?.city || "";
  const color = pricingState?.color || "";

  const selectedColorMedia = useMemo(() => {
    if (!colorGallery.length) return null;
    const colorKey = normalizeText(color);
    const exact = colorKey
      ? colorGallery.find(
          (item) => normalizeText(item.color) === colorKey && !!item.image,
        )
      : null;
    if (exact) return exact;
    const firstWithImage = colorGallery.find((item) => !!item.image);
    return firstWithImage || colorGallery[0];
  }, [color, colorGallery]);

  useEffect(() => {
    setMainColorImageMeta(null);
  }, [selectedColorMedia?.image]);

  const selectedColorPreviewTuning = useMemo(() => {
    const safeAspect =
      Number(mainColorImageMeta?.width) > 0 && Number(mainColorImageMeta?.height) > 0
        ? Number(mainColorImageMeta.width) / Number(mainColorImageMeta.height)
        : 1.8;

    const viewportAspect = Math.max(1.55, Math.min(2.2, safeAspect));
    const minHeight = safeAspect >= 1.9 ? 320 : safeAspect >= 1.7 ? 340 : 360;
    const maxHeight = safeAspect >= 1.9 ? 500 : safeAspect >= 1.7 ? 530 : 560;
    const scale = 1;
    const focusY = 50;

    return { scale, focusY, minHeight, maxHeight, viewportAspect };
  }, [mainColorImageMeta?.width, mainColorImageMeta?.height]);

  // Downpayment sync (Scenario A)
  const downAmount = onRoadPrice ? onRoadPrice - loanAmountA : 0;

  const effectiveDownPct = onRoadPrice
    ? ((onRoadPrice - loanAmountA) / onRoadPrice) * 100
    : downPct;

  const handleDownPctChange = (val) => {
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
    const amt = Math.min(Math.max(val, 0), onRoadPrice);
    const pct = onRoadPrice ? (amt / onRoadPrice) * 100 : 0;
    setDownPct(pct);
    const loan = onRoadPrice - amt;
    setLoanAmountA(loan);
    if (!comparisonTouched) setLoanAmountB(loan);
  };

  const handleLoanAmountChange = (val) => {
    const loan = Math.min(Math.max(val, 0), onRoadPrice || val);
    setLoanAmountA(loan);
    if (!comparisonTouched) setLoanAmountB(loan);
    if (onRoadPrice) {
      const dpAmt = onRoadPrice - loan;
      const pct = (dpAmt / onRoadPrice) * 100;
      setDownPct(pct);
    }
  };

  const handleVehicleSearchSelect = (value, option) => {
    const valueText = collapseSpaces(String(value || ""));
    const looseValueKey = normalizeLooseKey(valueText);

    const selectedOption =
      vehicleSearchOptions.find(
        (row) =>
          normalizeText(row?.value || row?.label || "") ===
          normalizeText(valueText),
      ) ||
      vehicleSearchOptions.find((row) => {
        const rowKey = normalizeLooseKey(row?.value || row?.label || "");
        if (!rowKey || !looseValueKey) return false;
        return rowKey === looseValueKey;
      }) ||
      option;

    let selectedMakeText = String(selectedOption?.make || "").trim();
    let selectedModelText = String(selectedOption?.model || "").trim();

    if (!selectedMakeText || !selectedModelText) {
      const labelText = collapseSpaces(
        String(selectedOption?.label || selectedOption?.value || valueText),
      );
      const normalizedLabel = normalizeText(labelText);

      const matchedMake = [
        ...new Set([...makeOptions, selectedMake, "Renault"]),
      ]
        .map((m) => String(m || "").trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .find((makeCandidate) => {
          const candidate = normalizeText(makeCandidate);
          return (
            normalizedLabel === candidate ||
            normalizedLabel.startsWith(`${candidate} `)
          );
        });

      if (matchedMake) {
        const rawModel = labelText.slice(matchedMake.length).trim();
        selectedMakeText = selectedMakeText || matchedMake;
        selectedModelText = selectedModelText || rawModel;
      }
    }

    if ((!selectedMakeText || !selectedModelText) && valueText.includes(" ")) {
      const parts = valueText.split(" ").filter(Boolean);
      if (!selectedMakeText) selectedMakeText = parts[0];
      if (!selectedModelText) selectedModelText = parts.slice(1).join(" ");
    }

    selectedMakeText = collapseSpaces(selectedMakeText);
    selectedModelText = collapseSpaces(selectedModelText);
    if (!selectedMakeText || !selectedModelText) return;

    setVehicleSearchInput(
      String(
        selectedOption?.label ||
          valueText ||
          `${selectedMakeText} ${selectedModelText}`,
      ),
    );
    setSelectedMake(selectedMakeText);
    setSelectedModel(selectedModelText);
    setModelOptions((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      if (
        selectedModelText &&
        !next.some(
          (entry) =>
            normalizeLooseKey(entry) === normalizeLooseKey(selectedModelText),
        )
      ) {
        next.push(selectedModelText);
      }
      return next.sort((a, b) => String(a).localeCompare(String(b)));
    });
    setSelectedVariant(null);
    setComparisonTouched(false);
    setPricingState((prev) => ({
      city: prev?.city || cityInput || "",
      color: prev?.color || "",
    }));
    setLoanAmountA(0);
    if (!comparisonTouched) setLoanAmountB(0);
  };

  const buildQuotationPayload = () => {
    if (!selectedVehicle?._id) {
      message.warning("Please select a vehicle before saving.");
      return null;
    }

    const additionsOthers = normalizePricingLineItems(
      pricingComputed?.additionsOthers,
    );
    const discountsOthers = normalizePricingLineItems(
      pricingComputed?.discountsOthers,
    );

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
        exShowroom: Number(pricingComputed.exShowroom) || 0,
        rto: Number(pricingComputed.rto) || 0,
        insurance: Number(pricingComputed.insurance) || 0,
        tcs: Number(pricingComputed.tcs) || 0,
        epc: Number(pricingComputed.epc) || 0,
        accessories: Number(pricingComputed.accessories) || 0,
        fastag: Number(pricingComputed.fastag) || 0,
        extendedWarranty: Number(pricingComputed.extendedWarranty) || 0,
        additionsOthers,
        dealerDiscount: Number(pricingComputed.dealerDiscount) || 0,
        schemeDiscount: Number(pricingComputed.schemeDiscount) || 0,
        insuranceCashback: Number(pricingComputed.insuranceCashback) || 0,
        exchange: Number(pricingComputed.exchange) || 0,
        exchangeVehiclePrice: Number(pricingComputed.exchangeVehiclePrice) || 0,
        loyalty: Number(pricingComputed.loyalty) || 0,
        corporate: Number(pricingComputed.corporate) || 0,
        discountsOthers,
        onRoadBeforeDiscount:
          Number(pricingComputed.onRoadBeforeDiscount) || onRoadPrice,
        totalDiscount: Number(pricingComputed.totalDiscount) || 0,
        netOnRoad: Number(pricingComputed.netOnRoad) || onRoadPrice,
        color,
      },
      scenarios: {
        A: {
          emiMode: emiType,
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
          emiMode: emiTypeB,
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
    if (savedQuotationId || initialQuotation?._id) {
      return { ...base, _id: savedQuotationId || initialQuotation._id };
    }

    return base;
  };

  const handleSaveQuotation = async () => {
    const payload = buildQuotationPayload();
    if (!payload) return;

    try {
      const res = await quotationsApi.create(payload);
      const saved = res.data?.data || res.data;
      if (saved?._id) {
        setSavedQuotationId(saved._id);
        message.success(
          res.data?.duplicate
            ? "Duplicate prevented. Existing quotation loaded."
            : "Quotation saved.",
        );
      } else {
        message.error("Save response did not include quotation id.");
      }
    } catch (err) {
      message.error(
        err?.response?.data?.message || "Failed to save quotation.",
      );
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
      }
    } catch (err) {
      message.error("Failed to generate PDF.");
    }
  };

  // Generic solver — supports advance & arrear
  const computeScenario = (
    mode,
    principal,
    rateAnnual,
    tenureVal,
    tenureType,
    emiInput,
    type = "arrear", // "advance" | "arrear"
  ) => {
    let P = Number(principal) || 0;
    let Rm = (Number(rateAnnual) || 0) / 100 / 12;
    let N =
      tenureType === "years"
        ? (Number(tenureVal) || 0) * 12
        : Number(tenureVal) || 0;
    let E = Number(emiInput) || 0;

    const empty = {
      emi: 0,
      principal: 0,
      total: 0,
      interest: 0,
      months: 0,
      rateMonthly: Rm,
      emiExact: 0,
      principalExact: 0,
      totalExact: 0,
      interestExact: 0,
    };

    if (mode === "emi") {
      if (P <= 0 || Rm <= 0 || N <= 0) return empty;
      const emiVal =
        type === "advance" ? solveEMIAdvance(P, Rm, N) : solveEMI(P, Rm, N);
      const emiRounded = Math.round(emiVal);
      // For advance: total paid = EMI × N (first EMI is upfront, then N-1 more → but
      // conventionally total payout is still EMI × N)
      const totalExact = emiVal * N;
      const interestExact = totalExact - P;
      return {
        emi: emiRounded,
        principal: Math.round(P),
        total: Math.round(totalExact),
        interest: Math.round(interestExact),
        months: Math.round(N),
        rateMonthly: Rm,
        emiType: type,
        emiExact: emiVal,
        principalExact: P,
        totalExact,
        interestExact,
      };
    }

    if (mode === "amount") {
      if (E <= 0 || Rm <= 0 || N <= 0) return empty;
      const principalVal = solvePrincipal(E, Rm, N);
      const pR = Math.round(principalVal);
      const total = E * N;
      const interest = total - principalVal;
      return {
        emi: Math.round(E),
        principal: pR,
        total: Math.round(total),
        interest: Math.round(interest),
        months: Math.round(N),
        rateMonthly: Rm,
        emiType: type,
        emiExact: E,
        principalExact: principalVal,
        totalExact: total,
        interestExact: interest,
      };
    }

    if (mode === "tenure") {
      if (E <= 0 || P <= 0 || Rm <= 0) return empty;
      const nMonths = solveTenure(E, P, Rm);
      const nR = Math.round(nMonths);
      const total = E * nR;
      const interest = total - P;
      return {
        emi: Math.round(E),
        principal: Math.round(P),
        total: Math.round(total),
        interest: Math.round(interest),
        months: nR,
        rateMonthly: Rm,
        emiType: type,
        emiExact: E,
        principalExact: P,
        totalExact: total,
        interestExact: interest,
      };
    }

    if (mode === "rate") {
      if (E <= 0 || P <= 0 || N <= 0) return { ...empty, rateMonthly: 0 };
      const rMonthly = solveRate(E, P, N);
      const total = E * N;
      const interest = total - P;
      return {
        emi: Math.round(E),
        principal: Math.round(P),
        total: Math.round(total),
        interest: Math.round(interest),
        months: Math.round(N),
        rateMonthly: rMonthly,
        emiType: type,
        emiExact: E,
        principalExact: P,
        totalExact: total,
        interestExact: interest,
      };
    }

    return { ...empty, rateMonthly: 0 };
  };

  const computePricing = (p = {}, v = {}) => {
    const exShowroom = Number(p.exShowroom ?? v.exShowroom ?? 0);
    const insurance = Number(p.insurance ?? v.insurance ?? 0);
    const tcs = Number(p.tcs ?? v.tcs ?? v.otherCharges ?? 0);
    const roadTax = Number(p.rto ?? v.rto ?? 0);

    const epc = Number(p.epc ?? 0);
    const accessories = Number(p.accessories ?? 0);
    const fastag = Number(p.fastag ?? 0);
    const extendedWarranty = Number(p.extendedWarranty ?? 0);

    const additionsOthers = (p.additionsOthers || []).reduce(
      (s, x) => s + (Number(x.amount) || 0),
      0,
    );

    const dealerDiscount = Number(p.dealerDiscount ?? 0);
    const schemeDiscount = Number(p.schemeDiscount ?? 0);
    const insuranceCashback = Number(p.insuranceCashback ?? 0);
    const exchange = Number(p.exchange ?? 0);
    const loyalty = Number(p.loyalty ?? 0);
    const corporate = Number(p.corporate ?? 0);

    const discountsOthers = (p.discountsOthers || []).reduce(
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
  };

  // Scenario A uses latest EMI input for modes other than "emi"
  const resultA = useMemo(
    () =>
      computeScenario(
        solveForA,
        loanAmountA,
        interestA,
        tenureA,
        tenureTypeA,
        solveForA === "emi" ? loanAmountA : emiAInput,
        emiType,
      ),
    [
      solveForA,
      loanAmountA,
      interestA,
      tenureA,
      tenureTypeA,
      emiAInput,
      emiType,
    ],
  );

  // Compute arrear result for comparison (to show savings vs advance)
  const resultArrear = useMemo(
    () =>
      computeScenario(
        "emi",
        loanAmountA,
        interestA,
        tenureA,
        tenureTypeA,
        loanAmountA,
        "arrear",
      ),
    [loanAmountA, interestA, tenureA, tenureTypeA],
  );

  const resultAdvance = useMemo(
    () =>
      computeScenario(
        "emi",
        loanAmountA,
        interestA,
        tenureA,
        tenureTypeA,
        loanAmountA,
        "advance",
      ),
    [loanAmountA, interestA, tenureA, tenureTypeA],
  );

  // This is the real-time EMI source of truth for "Current EMI" and EMI Scheme panel.
  const liveEmiResult = useMemo(
    () =>
      computeScenario(
        "emi",
        loanAmountA,
        interestA,
        tenureA,
        tenureTypeA,
        0,
        emiType,
      ),
    [loanAmountA, interestA, tenureA, tenureTypeA, emiType],
  );

  // Keep EMI input in sync with latest computed EMI so mode switching uses latest values
  useEffect(() => {
    if (resultA.emi) {
      setEmiAInput(resultA.emi);
    }
  }, [resultA.emi]);

  const effectiveScenarioARate = useMemo(() => {
    const computedAnnual = Number(resultA?.rateMonthly) * 12 * 100;
    if (Number.isFinite(computedAnnual) && computedAnnual > 0) {
      return computedAnnual;
    }
    return Number(interestA) || 0;
  }, [resultA?.rateMonthly, interestA]);

  // Mirror Scenario A into B unless user edited comparison
  useEffect(() => {
    if (comparisonTouched) return;
    setLoanAmountB(loanAmountA);
    setInterestB(Math.max(0, (Number(effectiveScenarioARate) || 0) - 0.25));
    setTenureB(tenureA);
    setTenureTypeB(tenureTypeA);
    setSolveForB("amount");
    setEmiBInput(resultA.emi || "");
  }, [
    loanAmountA,
    effectiveScenarioARate,
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
        emiTypeB,
      ),
    [
      solveForB,
      loanAmountB,
      interestB,
      tenureB,
      tenureTypeB,
      emiBInput,
      emiTypeB,
    ],
  );

  const breakupA = useMemo(() => {
    const safePrincipal = Math.max(
      0,
      Number(liveEmiResult.principalExact ?? liveEmiResult.principal) || 0,
    );
    const safeInterest = Math.max(
      0,
      Number(liveEmiResult.interestExact ?? liveEmiResult.interest) || 0,
    );
    const derivedTotal = safePrincipal + safeInterest;
    const safeTotal = Math.max(
      0,
      Number(liveEmiResult.totalExact ?? liveEmiResult.total) || 0,
    );
    const total = safeTotal > 0 ? safeTotal : derivedTotal;

    if (!total) {
      return {
        principalValue: 0,
        interestValue: 0,
        totalValue: 0,
        principalRatio: 0,
        interestRatio: 0,
        principalPct: 0,
        interestPct: 0,
      };
    }

    const principalRatio = Math.min(1, Math.max(0, safePrincipal / total));
    const interestRatio = Math.min(1, Math.max(0, safeInterest / total));
    let principalPct = Math.round(principalRatio * 100);
    let interestPct = Math.round(interestRatio * 100);

    const diff = 100 - (principalPct + interestPct);
    if (diff !== 0) {
      if (principalPct >= interestPct) principalPct += diff;
      else interestPct += diff;
    }

    return {
      principalValue: safePrincipal,
      interestValue: safeInterest,
      totalValue: total,
      principalRatio,
      interestRatio,
      principalPct: Math.max(0, principalPct),
      interestPct: Math.max(0, interestPct),
    };
  }, [
    liveEmiResult.principalExact,
    liveEmiResult.interestExact,
    liveEmiResult.totalExact,
    liveEmiResult.principal,
    liveEmiResult.interest,
    liveEmiResult.total,
  ]);

  const principalPctA = breakupA.principalPct;
  const interestPctA = breakupA.interestPct;
  const activeBreakupSegment =
    emiBreakupHover?.segment === "interest"
      ? {
          label: "Interest Payable",
          value: breakupA.interestValue,
          percent: interestPctA,
          colorClass: "text-orange-600 dark:text-orange-400",
        }
      : {
          label: "Principal Payable",
          value: breakupA.principalValue,
          percent: principalPctA,
          colorClass: "text-violet-600 dark:text-violet-400",
        };

  const handleEmiBreakupHover = (segment, event) => {
    const wrap = emiBreakupWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const clampedX = Math.min(Math.max(x, 34), Math.max(rect.width - 34, 34));
    const clampedY = Math.min(Math.max(y, 48), Math.max(rect.height - 14, 48));
    setEmiBreakupHover({ segment, x: clampedX, y: clampedY });
  };

  const clearEmiBreakupHover = () => setEmiBreakupHover(null);

  const emiDiff = resultB.emi - resultA.emi;
  const interestDiff = resultB.interest - resultA.interest;
  const loanDiff = resultB.principal - resultA.principal; // subvention / extra loan

  const cloneToScenarioB = () => {
    setComparisonTouched(true);
    setLoanAmountB(loanAmountA);
    setInterestB(Number(effectiveScenarioARate) || 0);
    setTenureB(tenureA);
    setEmiBInput(emiAInput);
    setSolveForB(solveForA);
    setTenureTypeB(tenureTypeA);
    setEmiTypeB(emiType);
    message.success("Copied Scenario A to Scenario B.");
  };

  const removeScenarioB = () => {
    setShowScenarioB(false);
    setComparisonTouched(false);
    setLoanAmountB(0);
    setInterestB(9.5);
    setTenureB(5);
    setTenureTypeB("years");
    setEmiBInput("");
    setSolveForB("amount");
    setEmiTypeB("arrear");
  };

  const addScenarioB = () => {
    setShowScenarioB(true);
    setComparisonTouched(false);
    setLoanAmountB(loanAmountA);
    setInterestB(Math.max(0, (Number(effectiveScenarioARate) || 0) - 0.25));
    setTenureB(tenureA);
    setTenureTypeB(tenureTypeA);
    setEmiBInput(resultA.emi || "");
    setEmiTypeB(emiType);
    setSolveForB("amount");
  };

  const scheduleA = useMemo(() => {
    const principal = Math.max(
      0,
      Number(liveEmiResult.principalExact ?? liveEmiResult.principal) || 0,
    );
    const monthlyRate = Math.max(
      0,
      Number(liveEmiResult.rateMonthly) || (Number(interestA) || 0) / 100 / 12,
    );
    const months = Math.max(0, Math.round(Number(liveEmiResult.months) || 0));
    const emi = Math.max(
      0,
      Number(liveEmiResult.emiExact ?? liveEmiResult.emi) || 0,
    );

    if (!principal || !months || !emi) return [];

    return buildSchedule(principal, monthlyRate, emi, months);
  }, [liveEmiResult, interestA]);

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
    setInterestA(9.5);
    setTenureA(5);
    setTenureTypeA("years");
    setEmiAInput("");
    setLoanAmountB(0);
    setInterestB(9);
    setTenureB(5);
    setTenureTypeB("years");
    setEmiBInput("");
    setSolveForA("emi");
    setSolveForB("amount");
    setEmiTypeB("arrear");
    setComparisonTouched(false);
    setEmiType("arrear");
    setShowScenarioB(false);

    // UI
    setShowSchedule(true);
    setShowPricingModal(false);
    setShareMode(false);
    setSavedQuotationId(null);

    //customer
    if (typeof onResetCustomer === "function") {
      onResetCustomer();
    }
  };

  const additionLines = Array.isArray(pricingComputed?.additionLines)
    ? pricingComputed.additionLines
    : [];
  const discountLines = Array.isArray(pricingComputed?.discountLines)
    ? pricingComputed.discountLines
    : [];

  const disableAll = shareMode;
  const scenarioAInputsDisabled = false; // we want Scenario A editable even in share mode

  return (
    <div className="relative px-4 md:px-6 pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-50/70 to-transparent dark:from-emerald-950/20" />
      <div className="w-full space-y-4 relative z-10">
        {/* Action bar */}
        <div
          className={`sticky ${isFloating ? "top-0" : "top-16"} z-20 bg-white/85 dark:bg-[#121212]/85 backdrop-blur-md rounded-2xl border border-slate-200/70 dark:border-[#2a2a2a] px-3 md:px-4 py-2.5 shadow-sm`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 py-1">
            <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
              <div className="h-px w-8 bg-gradient-to-r from-emerald-400 to-teal-500" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                EMI
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={handleSaveQuotation}>
                <Icon name="save" className="h-3 w-3" />
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleShareLink}
                disabled={disableAll || !savedQuotationId}
                title={
                  !savedQuotationId ? "Save quotation first" : "Copy share link"
                }
              >
                <Icon name="link" className="h-3 w-3" />
                Share
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSharePdf}
                disabled={disableAll || !savedQuotationId}
                title={
                  !savedQuotationId ? "Save quotation first" : "Download PDF"
                }
              >
                <Icon name="file" className="h-3 w-3" />
                PDF
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={resetAll}
              >
                <Icon name="refresh" className="h-3 w-3" />
                Clear
              </Button>
              {isFloating && onClose && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onClose}
                >
                  <Icon name="X" className="h-3 w-3" />
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main layout */}
        <div
          className={
            isFloating
              ? "space-y-4"
              : "grid grid-cols-1 lg:grid-cols-[340px,minmax(0,1fr)] gap-4 items-start"
          }
        >
          {/* Left: vehicle + downpayment + breakup */}
          {!isFloating && (
            <div className="space-y-3 lg:sticky lg:top-28">
              <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-sm border border-slate-100 dark:border-[#262626] px-3 py-3 flex flex-col gap-2.5 transition-all hover:shadow-md">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Vehicle & downpayment
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                    Choose city, brand, model and variant to auto-calculate loan
                    values.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <div>
                    <Label>City</Label>
                    <AutoComplete
                      style={{ width: "100%" }}
                      value={cityInput}
                      options={cityAutocompleteOptions}
                      placeholder="Select city"
                      onChange={(value) => {
                        const nextCity = String(value || "");
                        const changed =
                          normalizeText(nextCity) !== normalizeText(cityInput);

                        setCityInput(value);
                        if (changed) {
                          // Force city-specific variant re-selection so pricing always matches selected city.
                          setSelectedVariant(null);
                          setLoanAmountA(0);
                          if (!comparisonTouched) setLoanAmountB(0);
                        }
                        setPricingState((prev) => ({
                          ...(prev || {}),
                          city: value, // store what user typed
                          ...(changed ? { vehicleId: null } : {}),
                        }));
                      }}
                      filterOption={(inputValue, option) =>
                        String(option?.value || "")
                          .toUpperCase()
                          .includes(inputValue.toUpperCase())
                      }
                    />
                    {!!pricingSourceCity &&
                      normalizeText(pricingSourceCity) !==
                        normalizeText(cityInput) && (
                        <div className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                          Showing {pricingSourceCity} pricing for selected
                          variant.
                        </div>
                      )}
                  </div>

                  <div>
                    <Label>Search Car (Make / Model)</Label>
                    <AutoComplete
                      style={{ width: "100%" }}
                      value={vehicleSearchInput}
                      options={vehicleSearchOptions}
                      placeholder="Type make/model (e.g. Carens, Kia Car...)"
                      onChange={(value) => setVehicleSearchInput(value)}
                      onSelect={handleVehicleSearchSelect}
                      notFoundContent={
                        debouncedVehicleSearchInput.length < 2
                          ? "Type at least 2 letters"
                          : vehicleSearchLoading
                            ? "Searching..."
                            : "No matching cars"
                      }
                      filterOption={false}
                    />
                  </div>

                  <div className="pt-0.5">
                    <Checkbox
                      checked={includeDiscontinued}
                      onChange={(e) =>
                        setIncludeDiscontinued(Boolean(e?.target?.checked))
                      }
                      disabled={disableAll}
                    >
                      Include discontinued cars
                    </Checkbox>
                  </div>

                  <div>
                    <Label>Brand</Label>
                    {vehiclesLoading && (
                      <div className="mb-1 text-[10px] font-medium text-slate-500">
                        Loading city pricing...
                      </div>
                    )}
                    <Select
                      value={selectedMake || undefined}
                      placeholder="Select brand"
                      allowClear
                      onChange={(val) => {
                        setSelectedMake(val);
                        setSelectedModel("");
                        setSelectedVariant(null);
                        setPricingState((prev) => ({
                          city: prev?.city || cityInput || "",
                          color: prev?.color || "",
                        }));

                        setLoanAmountA(0);
                        if (!comparisonTouched) setLoanAmountB(0);
                      }}
                      className="w-full"
                      showSearch
                      disabled={disableAll || vehiclesLoading}
                      filterOption={(input, option) =>
                        String(option?.children ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                    >
                      {uniqueMakes.map((m) => (
                        <Option key={m} value={m}>
                          {m}
                        </Option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Select
                      value={selectedModel || undefined}
                      placeholder="Select model"
                      allowClear
                      onChange={(val) => {
                        setSelectedModel(val);
                        setSelectedVariant(null);
                        setPricingState((prev) => ({
                          city: prev?.city || cityInput || "",
                          color: prev?.color || "",
                        }));

                        setLoanAmountA(0);
                        if (!comparisonTouched) setLoanAmountB(0);
                      }}
                      disabled={!selectedMake || disableAll || vehiclesLoading}
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
                          {m}
                        </Option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Variant</Label>
                    <Select
                      labelInValue
                      value={selectedVariant || undefined}
                      placeholder="Select variant"
                      allowClear
                      onChange={(val, option) => {
                        if (!val?.value) {
                          setSelectedVariant(null);
                          setLoanAmountA(0);
                          if (!comparisonTouched) setLoanAmountB(0);
                          return;
                        }

                        const optionLabel =
                          val?.label || option?.label || option?.children || "";

                        setSelectedVariant({
                          value: val.value,
                          label: String(optionLabel),
                        });

                        setComparisonTouched(false);

                        const v = variantsForModel.find(
                          (x) => String(x._id) === String(val.value),
                        );
                        const price =
                          Number(v?.onRoadPrice ?? v?.on_road_price ?? 0) || 0;

                        const initialLoan = price * 0.9;
                        setLoanAmountA(initialLoan);
                        setLoanAmountB(initialLoan);
                        setDownPct(10);
                      }}
                      disabled={
                        !selectedMake ||
                        !selectedModel ||
                        disableAll ||
                        vehiclesLoading
                      }
                      className="w-full"
                      showSearch
                      notFoundContent={
                        selectedMake && selectedModel
                          ? "No variants found"
                          : "Select brand and model first"
                      }
                    >
                      {variantsForModel.map((v) => (
                        <Option
                          key={v._id}
                          value={v._id}
                          label={`${v.variant} — ${formatINR(v.onRoadPrice || 0)}`}
                        >
                          {v.variant} — {formatINR(v.onRoadPrice || 0)}
                        </Option>
                      ))}
                    </Select>
                  </div>

                  {!vehiclesLoading && !filteredVehicles.length && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                      No vehicles found for selected city. Try another city or
                      enable{" "}
                      <span className="font-semibold">
                        Include discontinued cars
                      </span>
                      .
                    </div>
                  )}
                </div>

                {onRoadPrice > 0 && (
                  <>
                    <div className="flex gap-2">
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
                    <div className="grid grid-cols-1 gap-2 mt-1.5">
                      <div>
                        <Label>Color</Label>
                        <Input
                          type="text"
                          value={color}
                          onChange={(e) =>
                            setPricingState((prev) => ({
                              ...(prev || {}),
                              color: e.target.value,
                            }))
                          }
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
                  className={`w-full text-left bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-sm border px-4 py-3 space-y-1.5 transition-all ${
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
                        <AnimatedNumber value={onRoadPrice} />
                      </div>
                    </div>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Right: Scenario A + chart + comparison + schedule */}
          <div className="space-y-4">
            {/* Scenario A */}
            <ScenarioAPanel
              disableAll={disableAll}
              emiType={emiType}
              setEmiType={setEmiType}
              solveOptions={solveOptions}
              solveForA={solveForA}
              setSolveForA={setSolveForA}
              formatNumber={formatNumber}
              displayForField={displayForField}
              resultA={resultA}
              tenureTypeA={tenureTypeA}
              loanAmountA={loanAmountA}
              scenarioAInputsDisabled={scenarioAInputsDisabled}
              parseNumber={parseNumber}
              setLoanAmountA={setLoanAmountA}
              interestA={interestA}
              setInterestA={setInterestA}
              tenureA={tenureA}
              setTenureA={setTenureA}
              setTenureTypeA={setTenureTypeA}
              liveEmiResult={liveEmiResult}
              emiAInput={emiAInput}
              setEmiAInput={setEmiAInput}
              AnimatedNumber={AnimatedNumber}
              formatINR={formatINR}
            />

            <ScenarioBPanel
              isFloating={isFloating}
              showScenarioB={showScenarioB}
              disableAll={disableAll}
              cloneToScenarioB={cloneToScenarioB}
              onRemoveScenarioB={removeScenarioB}
              onAddScenarioB={addScenarioB}
              resultA={resultA}
              resultB={resultB}
              breakupA={breakupA}
              emiDiff={emiDiff}
              interestDiff={interestDiff}
              loanDiff={loanDiff}
              solveOptions={solveOptions}
              solveForB={solveForB}
              setSolveForB={setSolveForB}
              emiTypeB={emiTypeB}
              setEmiTypeB={setEmiTypeB}
              tenureTypeB={tenureTypeB}
              setTenureTypeB={setTenureTypeB}
              loanAmountB={loanAmountB}
              setLoanAmountB={setLoanAmountB}
              emiBInput={emiBInput}
              setEmiBInput={setEmiBInput}
              interestB={interestB}
              setInterestB={setInterestB}
              tenureB={tenureB}
              setTenureB={setTenureB}
              setComparisonTouched={setComparisonTouched}
              displayForField={displayForField}
              parseNumber={parseNumber}
              formatNumber={formatNumber}
              formatINR={formatINR}
              AnimatedNumber={AnimatedNumber}
            />

            {/* EMI Scheme Panel */}
            <div className="rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_35px_-24px_rgba(15,23,42,0.45)] transition-all hover:shadow-[0_18px_45px_-28px_rgba(76,29,149,0.35)] dark:border-[#2a2a2a] dark:bg-[#1b1b1b]">
              <div className="rounded-t-[28px] border-b border-slate-100/90 bg-gradient-to-r from-violet-50 via-fuchsia-50/40 to-white px-5 py-4 dark:border-[#2a2a2a] dark:from-violet-950/35 dark:via-fuchsia-950/10 dark:to-[#1b1b1b]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      EMI Scheme
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {emiType === "advance"
                        ? "Advance EMI - First instalment paid upfront"
                        : "Arrear EMI - Standard monthly payment"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSchedule(!showSchedule)}
                      className="rounded-full border border-violet-200/80 bg-white/85 px-3 py-1 text-[10px] font-bold tracking-wide text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-700/50 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/35"
                    >
                      {showSchedule ? "HIDE SCHEDULE" : "VIEW SCHEDULE"}
                    </button>
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-wide ${
                        emiType === "advance"
                          ? "border-violet-300 bg-violet-100/95 text-violet-700 dark:border-violet-700/60 dark:bg-violet-900/35 dark:text-violet-300"
                          : "border-sky-300 bg-sky-100/95 text-sky-700 dark:border-sky-700/60 dark:bg-sky-900/35 dark:text-sky-300"
                      }`}
                    >
                      {emiType === "advance" ? "ADVANCE" : "ARREAR"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 px-4 pt-4 md:grid-cols-3">
                <div className="rounded-2xl border border-violet-100/90 bg-violet-50/70 px-4 py-3.5 text-center dark:border-violet-900/40 dark:bg-violet-950/20">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Loan EMI
                  </div>
                  <div className="text-[22px] font-black leading-none text-violet-700 dark:text-violet-300">
                    <AnimatedNumber value={liveEmiResult.emi} />
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    per month
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-100/90 bg-sky-50/75 px-4 py-3.5 text-center dark:border-sky-900/40 dark:bg-sky-950/20">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    ROI | Tenure
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[20px] font-black leading-none text-sky-700 dark:text-sky-300">
                    <span>{`${(Number(liveEmiResult.rateMonthly) > 0
                      ? Number(liveEmiResult.rateMonthly) * 12 * 100
                      : Number(interestA) || 0
                    ).toFixed(2)}%`}</span>
                    <span className="text-sky-300 dark:text-sky-700">|</span>
                    <span>{`${Math.max(0, Number(liveEmiResult.months) || 0)}m`}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    annual rate and duration
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-3.5 text-center dark:border-[#333] dark:bg-[#232323]">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Total Payment
                  </div>
                  <div className="text-[22px] font-black leading-none text-slate-800 dark:text-slate-100">
                    {formatINR(breakupA.totalValue)}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    principal + interest
                  </div>
                </div>
              </div>

              <div
                ref={emiBreakupWrapRef}
                onMouseLeave={clearEmiBreakupHover}
                className="relative flex flex-col items-center gap-5 px-5 pb-5 pt-4 md:flex-row"
              >
                <div className="relative flex-shrink-0 rounded-[26px] border border-slate-200/90 bg-gradient-to-br from-white via-violet-50/30 to-orange-50/30 p-3 shadow-[0_10px_28px_-22px_rgba(76,29,149,0.55)] dark:border-[#2e2e2e] dark:from-[#232323] dark:via-[#211b2a] dark:to-[#2a211a]">
                  {(() => {
                    const R = 80;
                    const CIRC = 2 * Math.PI * R;
                    const pPct = breakupA.principalRatio;
                    const iPct = breakupA.interestRatio;

                    // Principal + interest must always consume 100% of ring.
                    const pArc = Math.max(0, pPct * CIRC);
                    const iArc = Math.max(0, iPct * CIRC);
                    const iStartRotation = -90 + pPct * 360;
                    const isPrincipalActive =
                      emiBreakupHover?.segment === "principal";
                    const isInterestActive =
                      emiBreakupHover?.segment === "interest";

                    return (
                      <svg
                        viewBox="0 0 220 220"
                        className="h-52 w-52"
                        style={{ overflow: "visible" }}
                      >
                        <defs>
                          <linearGradient
                            id="emiPrincipalGradient"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#6d28d9" />
                          </linearGradient>
                          <linearGradient
                            id="emiInterestGradient"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#fdba74" />
                            <stop offset="100%" stopColor="#f97316" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="110"
                          cy="110"
                          r={R}
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="24"
                        />

                        {iArc > 0 && (
                          <circle
                            cx="110"
                            cy="110"
                            r={R}
                            fill="none"
                            stroke="url(#emiInterestGradient)"
                            strokeWidth={isInterestActive ? "30" : "24"}
                            strokeLinecap="butt"
                            strokeDasharray={`${iArc} ${CIRC}`}
                            strokeDashoffset={0}
                            transform={`rotate(${iStartRotation} 110 110)`}
                            onMouseEnter={(event) =>
                              handleEmiBreakupHover("interest", event)
                            }
                            onMouseMove={(event) =>
                              handleEmiBreakupHover("interest", event)
                            }
                            onMouseLeave={clearEmiBreakupHover}
                            style={{
                              pointerEvents: "stroke",
                              transition:
                                "stroke-dasharray 0.7s ease, stroke-dashoffset 0.7s ease, stroke-width 0.2s ease",
                            }}
                          />
                        )}

                        {pArc > 0 && (
                          <circle
                            cx="110"
                            cy="110"
                            r={R}
                            fill="none"
                            stroke="url(#emiPrincipalGradient)"
                            strokeWidth={isPrincipalActive ? "30" : "24"}
                            strokeLinecap="butt"
                            strokeDasharray={`${pArc} ${CIRC}`}
                            strokeDashoffset={0}
                            transform="rotate(-90 110 110)"
                            onMouseEnter={(event) =>
                              handleEmiBreakupHover("principal", event)
                            }
                            onMouseMove={(event) =>
                              handleEmiBreakupHover("principal", event)
                            }
                            onMouseLeave={clearEmiBreakupHover}
                            style={{
                              pointerEvents: "stroke",
                              transition:
                                "stroke-dasharray 0.7s ease, stroke-width 0.2s ease",
                            }}
                          />
                        )}

                        <circle
                          cx="110"
                          cy="110"
                          r="54"
                          fill="var(--emi-donut-bg, #ffffff)"
                          style={{
                            fill: document.documentElement.classList.contains(
                              "dark",
                            )
                              ? "#1f1f1f"
                              : "#ffffff",
                          }}
                        />

                        {breakupA.totalValue > 0 ? (
                          <>
                            <text
                              x="110"
                              y="99"
                              textAnchor="middle"
                              fontSize="9.5"
                              fill="#94a3b8"
                            >
                              Payable Split
                            </text>
                            <text
                              x="110"
                              y="118"
                              textAnchor="middle"
                              fontSize="12.5"
                              fontWeight="800"
                              fill="#7c3aed"
                            >
                              {`${principalPctA}% Principal`}
                            </text>
                            <text
                              x="110"
                              y="133"
                              textAnchor="middle"
                              fontSize="11.5"
                              fontWeight="700"
                              fill="#f97316"
                            >
                              {`${interestPctA}% Interest`}
                            </text>
                          </>
                        ) : (
                          <>
                            <text
                              x="110"
                              y="106"
                              textAnchor="middle"
                              fontSize="9.5"
                              fill="#94a3b8"
                            >
                              Break-up of
                            </text>
                            <text
                              x="110"
                              y="122"
                              textAnchor="middle"
                              fontSize="9.5"
                              fill="#94a3b8"
                            >
                              Total Payment
                            </text>
                          </>
                        )}
                      </svg>
                    );
                  })()}
                </div>

                <div className="w-full flex-1 space-y-4">
                  <div className="space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Payment Components
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="rounded-2xl border border-violet-200/70 bg-violet-50/70 px-3.5 py-2.5 dark:border-violet-800/40 dark:bg-violet-900/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-violet-500" />
                            <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                              Principal Payable
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-violet-700 dark:text-violet-300">
                            {principalPctA}%
                          </div>
                        </div>
                        <div className="mt-1.5 text-[14px] font-black text-violet-700 dark:text-violet-300">
                          {formatINR(breakupA.principalValue)}
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/40">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all duration-700 ease-in-out"
                            style={{ width: `${principalPctA}%` }}
                          />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-orange-200/70 bg-orange-50/70 px-3.5 py-2.5 dark:border-orange-800/40 dark:bg-orange-900/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-orange-400" />
                            <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                              Interest Payable
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-orange-700 dark:text-orange-300">
                            {interestPctA}%
                          </div>
                        </div>
                        <div className="mt-1.5 text-[14px] font-black text-orange-700 dark:text-orange-300">
                          {formatINR(breakupA.interestValue)}
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-900/40">
                          <div
                            className="h-full rounded-full bg-orange-400 transition-all duration-700 ease-in-out"
                            style={{ width: `${interestPctA}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {emiBreakupHover && (
                  <div
                    className="pointer-events-none absolute z-20 w-[232px] -translate-x-1/2 -translate-y-[104%] rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:border-[#2e2e2e] dark:bg-[#171717]/95"
                    style={{
                      left: `${emiBreakupHover.x}px`,
                      top: `${emiBreakupHover.y}px`,
                    }}
                  >
                    <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Donut Segment
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-slate-500">
                        {activeBreakupSegment.label}
                      </span>
                      <span
                        className={`font-bold ${activeBreakupSegment.colorClass}`}
                      >
                        {formatINR(activeBreakupSegment.value)}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      Share: {activeBreakupSegment.percent}%
                    </div>
                  </div>
                )}
              </div>
            </div>
            {!isFloating && galleryVehicleContext && (
              <div className="bg-white dark:bg-[#141414] rounded-3xl border border-slate-100 dark:border-[#242424] overflow-hidden shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-[#242424] bg-gradient-to-r from-violet-50/60 to-transparent dark:from-violet-950/20 dark:to-transparent">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                      <svg
                        viewBox="0 0 16 16"
                        className="w-3.5 h-3.5 fill-violet-600 dark:fill-violet-400"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="4" cy="8" r="3" />
                        <circle cx="8" cy="5" r="2.2" opacity="0.6" />
                        <circle cx="12" cy="8" r="3" opacity="0.4" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-slate-800 dark:text-slate-100 leading-tight">
                        Exterior Colors
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Tap a color to auto-fill the Color field
                      </div>
                    </div>
                  </div>
                  {colorGallery.length > 0 && (
                    <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200/60 dark:border-violet-800/40 px-2.5 py-0.5 rounded-full">
                      {colorGallery.length} color
                      {colorGallery.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {/* Main preview image */}
                  {selectedColorMedia?.image && (
                    <div
                      className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#2a2a2a] bg-gradient-to-b from-slate-100 to-slate-50 dark:from-[#151515] dark:to-[#101010]"
                      style={{
                        height: `clamp(${selectedColorPreviewTuning.minHeight}px, 56vh, ${selectedColorPreviewTuning.maxHeight}px)`,
                      }}
                    >
                      <div
                        className="absolute inset-0 opacity-50 blur-2xl"
                        style={{
                          backgroundImage: `url(${selectedColorMedia.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: `50% ${selectedColorPreviewTuning.focusY}%`,
                          transform: `scale(${Math.max(
                            1.05,
                            selectedColorPreviewTuning.scale - 0.08,
                          )})`,
                        }}
                      />
                      {color && (
                        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 bg-black/35 backdrop-blur-sm rounded-full px-2.5 py-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/30 flex-shrink-0"
                            style={{
                              backgroundColor:
                                selectedColorMedia.hex || "#d1d5db",
                            }}
                          />
                          <span className="text-[10px] font-semibold text-white leading-none">
                            {selectedColorMedia.color || color}
                          </span>
                        </div>
                      )}
                      <img
                        src={selectedColorMedia.image}
                        alt={selectedColorMedia.color || "Vehicle color"}
                        className="relative z-[1] block h-full w-full object-cover"
                        style={{
                          objectPosition: `50% ${selectedColorPreviewTuning.focusY}%`,
                          transform: `scale(${selectedColorPreviewTuning.scale})`,
                          transformOrigin: `50% ${selectedColorPreviewTuning.focusY}%`,
                        }}
                        loading="lazy"
                        onLoad={(event) => {
                          const nextWidth =
                            Number(event.currentTarget.naturalWidth) || 0;
                          const nextHeight =
                            Number(event.currentTarget.naturalHeight) || 0;
                          if (!nextWidth || !nextHeight) return;
                          setMainColorImageMeta((prev) => {
                            if (
                              prev?.width === nextWidth &&
                              prev?.height === nextHeight
                            ) {
                              return prev;
                            }
                            return { width: nextWidth, height: nextHeight };
                          });
                        }}
                        onError={(event) => {
                          const fallback = selectedColorMedia.originalImage;
                          if (
                            fallback &&
                            event.currentTarget.src !== fallback
                          ) {
                            event.currentTarget.src = fallback;
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Thumbnails */}
                  {colorGalleryLoading ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-shrink-0 w-[88px] rounded-xl border border-slate-100 dark:border-[#262626] p-1.5 animate-pulse"
                        >
                          <div className="h-14 rounded-lg bg-slate-200 dark:bg-[#2a2a2a] mb-1.5" />
                          <div className="h-2.5 w-12 rounded-full bg-slate-200 dark:bg-[#2a2a2a] mx-auto" />
                        </div>
                      ))}
                    </div>
                  ) : colorGallery.length ? (
                    <div className="flex gap-2 overflow-x-auto pb-0.5">
                      {colorGallery.map((entry, index) => {
                        const active =
                          normalizeText(color) === normalizeText(entry.color);
                        return (
                          <button
                            key={`${entry.color || "color"}-${entry.image || "img"}-${index}`}
                            type="button"
                            onClick={() => {
                              setPricingState((prev) => ({
                                ...(prev || {}),
                                color: entry.color || "",
                              }));
                            }}
                            disabled={disableAll}
                            className={`flex-shrink-0 w-[88px] rounded-xl border-2 p-1.5 text-left transition-all duration-150 ${
                              active
                                ? "border-violet-500 dark:border-violet-400 bg-violet-50/50 dark:bg-violet-900/20 shadow-md"
                                : "border-transparent bg-slate-50 dark:bg-[#1e1e1e] hover:border-slate-200 dark:hover:border-[#383838] hover:shadow-sm"
                            } ${disableAll ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <div className="h-14 w-full overflow-hidden rounded-lg bg-white dark:bg-[#111] flex items-center justify-center mb-1.5">
                              {entry.image ? (
                                <img
                                  src={entry.thumb || entry.image}
                                  alt={entry.color || "Vehicle color"}
                                  className="h-full w-full object-contain p-0.5"
                                  loading="lazy"
                                  onError={(event) => {
                                    const fallback =
                                      entry.originalImage || entry.image;
                                    if (
                                      fallback &&
                                      event.currentTarget.src !== fallback
                                    ) {
                                      event.currentTarget.src = fallback;
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-[9px] text-slate-400">
                                  No img
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 px-0.5">
                              <span
                                className="h-2.5 w-2.5 rounded-full border border-black/10 flex-shrink-0"
                                style={{
                                  backgroundColor: entry.hex || "#d1d5db",
                                }}
                              />
                              <span className="truncate text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                                {entry.color || "Default"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#252525] flex items-center justify-center">
                        <svg
                          viewBox="0 0 20 20"
                          className="w-5 h-5 fill-slate-400"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M10 3a7 7 0 1 0 0 14A7 7 0 0 0 10 3Zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 10 5Z"
                            opacity="0.4"
                          />
                          <circle cx="10" cy="10" r="2" />
                        </svg>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        No color images yet for this variant
                      </p>
                    </div>
                  )}
                </div>

                {/* ── COLOR LIGHTBOX ── */}
                {colorLightboxOpen && colorGallery.length > 0 && (
                  <div
                    className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setColorLightboxOpen(false)}
                  >
                    <div
                      className="relative bg-[#111] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                      style={{ width: "min(90vw, 820px)", maxHeight: "90vh" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0"
                            style={{
                              backgroundColor:
                                colorGallery[colorLightboxIdx]?.hex ||
                                "#d1d5db",
                            }}
                          />
                          <span className="text-[13px] font-bold text-white leading-none">
                            {colorGallery[colorLightboxIdx]?.color ||
                              "Vehicle Color"}
                          </span>
                          <span className="text-[10px] font-mono text-white/40 ml-1">
                            {colorLightboxIdx + 1}/{colorGallery.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setColorLightboxOpen(false)}
                          className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                          aria-label="Close"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            className="w-4 h-4 fill-white"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
                          </svg>
                        </button>
                      </div>

                      {/* Main image */}
                      <div
                        className="flex-1 flex items-center justify-center bg-[#0d0d0d] overflow-hidden p-6"
                        style={{ minHeight: 0 }}
                      >
                        <img
                          key={colorGallery[colorLightboxIdx]?.image}
                          src={colorGallery[colorLightboxIdx]?.image}
                          alt={
                            colorGallery[colorLightboxIdx]?.color ||
                            "Vehicle color"
                          }
                          className="max-w-full max-h-full object-contain"
                          style={{ maxHeight: "60vh" }}
                          onError={(event) => {
                            const fallback =
                              colorGallery[colorLightboxIdx]?.originalImage;
                            if (
                              fallback &&
                              event.currentTarget.src !== fallback
                            )
                              event.currentTarget.src = fallback;
                          }}
                        />
                      </div>

                      {/* Thumbnail strip */}
                      {colorGallery.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto px-4 py-3 border-t border-white/10">
                          {colorGallery.map((entry, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setColorLightboxIdx(i);
                                setPricingState((prev) => ({
                                  ...(prev || {}),
                                  color: entry.color || "",
                                }));
                              }}
                              className={`flex-shrink-0 w-[72px] rounded-xl border-2 p-1 transition-all ${
                                i === colorLightboxIdx
                                  ? "border-violet-500 bg-violet-900/30"
                                  : "border-transparent bg-white/5 hover:border-white/20"
                              }`}
                            >
                              <div className="h-12 overflow-hidden rounded-lg bg-black flex items-center justify-center mb-1">
                                {entry.image ? (
                                  <img
                                    src={entry.thumb || entry.image}
                                    alt={entry.color || ""}
                                    className="h-full w-full object-contain p-0.5"
                                    loading="lazy"
                                  />
                                ) : (
                                  <span className="text-[8px] text-white/30">
                                    No img
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 px-0.5">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0 border border-white/20"
                                  style={{
                                    backgroundColor: entry.hex || "#d1d5db",
                                  }}
                                />
                                <span className="truncate text-[9px] text-white/70 leading-tight">
                                  {entry.color || "—"}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Prev / Next arrows */}
                      {colorGallery.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setColorLightboxIdx(
                                (i) =>
                                  (i - 1 + colorGallery.length) %
                                  colorGallery.length,
                              )
                            }
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-colors"
                            aria-label="Previous"
                          >
                            <svg
                              viewBox="0 0 16 16"
                              className="w-4 h-4 fill-white"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M10.28 3.22a.75.75 0 0 1 0 1.06L6.56 8l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setColorLightboxIdx(
                                (i) => (i + 1) % colorGallery.length,
                              )
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-colors"
                            aria-label="Next"
                          >
                            <svg
                              viewBox="0 0 16 16"
                              className="w-4 h-4 fill-white"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M5.72 3.22a.75.75 0 0 0 0 1.06L9.44 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06l4.25-4.25a.75.75 0 0 0 0-1.06L6.78 3.22a.75.75 0 0 0-1.06 0Z" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isFloating && selectedVehicle && (
              <details className="bg-white dark:bg-[#1f1f1f] rounded-3xl border border-slate-200 dark:border-[#262626] px-4 py-4 md:px-5 md:py-4 space-y-3">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Variant features
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
                    {selectedVehicle.make} {selectedVehicle.model}{" "}
                    {selectedVehicle.variant}
                  </div>
                </summary>

                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#181818] border border-slate-100 dark:border-neutral-800 rounded-xl px-3 py-2">
                    <Icon
                      name="Search"
                      size={14}
                      className="text-slate-400 shrink-0"
                    />
                    <input
                      type="text"
                      value={featureSearch}
                      onChange={(e) => setFeatureSearch(e.target.value)}
                      placeholder="Search features..."
                      className="flex-1 bg-transparent outline-none text-[12px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 min-w-0"
                    />
                    {featureSearch && (
                      <button
                        type="button"
                        onClick={() => setFeatureSearch("")}
                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-neutral-700 shrink-0"
                      >
                        <Icon name="X" size={12} className="text-slate-400" />
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto max-h-[52vh] space-y-4 pr-0.5">
                    {filteredFeatureGroups.length ? (
                      (() => {
                        const fixedCategories = [
                          {
                            key: "Safety",
                            color: "text-rose-600 dark:text-rose-400",
                            dot: "bg-rose-400",
                          },
                          {
                            key: "Comfort & Convenience",
                            color: "text-sky-600 dark:text-sky-400",
                            dot: "bg-sky-400",
                          },
                          {
                            key: "Exterior",
                            color: "text-amber-600 dark:text-amber-400",
                            dot: "bg-amber-400",
                          },
                          {
                            key: "Infotainment",
                            color: "text-violet-600 dark:text-violet-400",
                            dot: "bg-violet-400",
                          },
                          {
                            key: "Connected",
                            color: "text-teal-600 dark:text-teal-400",
                            dot: "bg-teal-400",
                          },
                          {
                            key: "Others",
                            color: "text-slate-500 dark:text-slate-400",
                            dot: "bg-slate-400",
                          },
                        ];
                        const known = new Set(fixedCategories.map((c) => c.key));
                        const extraCategories = filteredFeatureGroups
                          .filter((group) => !known.has(group.category))
                          .map((group) => ({
                            key: group.category,
                            color: "text-slate-600 dark:text-slate-300",
                            dot: "bg-slate-400",
                          }));
                        const orderedCategories = [
                          ...fixedCategories,
                          ...extraCategories,
                        ];

                        return orderedCategories.map(({ key: cat, color, dot }) => {
                          const group = filteredFeatureGroups.find(
                            (entry) => entry.category === cat,
                          );
                          if (!group?.rows?.length) return null;

                        return (
                          <div key={cat}>
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`}
                              />
                              <span
                                className={`text-[11px] font-semibold uppercase tracking-wider ${color}`}
                              >
                                {cat}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-600">
                                {group.rows.length}
                              </span>
                            </div>

                            <div className="rounded-xl border border-slate-100 dark:border-neutral-800 divide-y divide-slate-50 dark:divide-neutral-800/80 overflow-hidden">
                              {group.rows.map((row) => {
                                const label = String(row.value || "Not Available");
                                const valLower = label.toLowerCase().trim();
                                const isYes = valLower === "yes";
                                const isNo = valLower === "not available";
                                return (
                                  <div
                                    key={row.name}
                                    className="flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-[#111111] hover:bg-slate-50/70 dark:hover:bg-[#161616] transition-colors"
                                  >
                                    <span className="text-[12px] text-slate-700 dark:text-slate-300 leading-snug min-w-0">
                                      {row.name}
                                    </span>
                                    {isYes ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 shrink-0">
                                        <Icon name="Check" size={12} />
                                        Yes
                                      </span>
                                    ) : isNo ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 dark:bg-neutral-800 text-slate-400 dark:text-slate-500 shrink-0">
                                        <Icon name="Minus" size={12} />
                                      </span>
                                    ) : (
                                      <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200 shrink-0 text-right max-w-[45%] truncate">
                                        {label}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                        });
                      })()
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-[#2d2d2d] px-3 py-4 text-[11px] text-slate-500 dark:text-slate-400">
                        No features available for this variant yet.
                      </div>
                    )}
                  </div>
                </div>
              </details>
            )}

            {/* Repayment schedule */}
            {!isFloating && showSchedule && (
              <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl border border-slate-200 dark:border-[#262626] px-4 py-4 md:px-6 md:py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Repayment schedule (Scenario A)
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Month‑wise principal, interest, balance
                  </span>
                </div>
                {scheduleA.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 dark:border-[#262626] bg-slate-50/60 dark:bg-[#262626]/50 px-4 py-4 text-[12px] text-slate-500 dark:text-slate-400">
                    Schedule unavailable. Please ensure Loan Amount, Tenure,
                    Interest, and EMI are valid.
                  </div>
                ) : (
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
                )}
              </div>
            )}

            {/* Terms & conditions */}
            {!isFloating && (
              <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl border border-slate-200 dark:border-[#262626] px-4 py-4 md:px-6 md:py-5 text-[11px] space-y-1.5">
                <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Terms & conditions
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  • This is an indicative quotation only and does not constitute
                  a final offer or sanction.
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
            )}
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
            visible={showPricingModal}
            onClose={() => setShowPricingModal(false)}
            vehicle={selectedVehicle}
            value={pricingState}
            onChange={setPricingState}
          />
        </Modal>
      </div>
    </div>
  );
};

export default EMICalculator;
