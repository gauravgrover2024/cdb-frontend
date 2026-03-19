/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo } from "react";
import { Input, Select, message, Modal, AutoComplete } from "antd";
import VehiclePricingPopup from "./VehiclePricingPopup";
import ScenarioAInline from "./ScenarioAInline";
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
const normalizeText = (value) => String(value || "").trim().toLowerCase();

const cityMatches = (vehicleCity, selectedCity, backendCity) => {
  const city = normalizeText(vehicleCity);
  const selected = normalizeText(selectedCity);
  const backend = normalizeText(backendCity);

  if (!city) return false;
  if (!selected && !backend) return true;
  if (city === selected || city === backend) return true;
  if (selected && (city.includes(selected) || selected.includes(city))) return true;
  if (backend && (city.includes(backend) || backend.includes(city))) return true;

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

const normalizeVehicleRecord = (vehicle = {}) => {
  const toNum = (v) => Number(v) || 0;

  return {
    ...vehicle,
    _id: vehicle._id || vehicle.id || vehicle.vehicleId,
    make: String(vehicle.make || vehicle.brand || vehicle.brandName || "").trim(),
    model: String(vehicle.model || vehicle.modelName || "").trim(),
    variant: String(vehicle.variant || vehicle.variantName || vehicle.name || "").trim(),
    city: String(vehicle.city || vehicle.locationCity || vehicle.showroomCity || "").trim(),
    onRoadPrice: toNum(
      vehicle.onRoadPrice ?? vehicle.on_road_price ?? vehicle.netOnRoad ?? vehicle.onRoad,
    ),
    exShowroom: toNum(
      vehicle.exShowroom ?? vehicle.ex_showroom ?? vehicle.exShowroomPrice,
    ),
    rto: toNum(vehicle.rto ?? vehicle.roadTax),
    insurance: toNum(vehicle.insurance),
    otherCharges: toNum(vehicle.otherCharges ?? vehicle.tcs),
  };
};

const normalizeChargeLines = (items = []) => {
  const rows = Array.isArray(items) ? items : [];
  const seen = new Set();

  return rows
    .map((row) => ({
      label: String(row?.label || "").trim(),
      amount: Number(row?.amount) || 0,
    }))
    .filter((row) => row.label && row.amount > 0)
    .filter((row) => {
      const key = `${row.label.toLowerCase()}::${row.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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

  const [cityInput, setCityInput] = useState("");
  const [debouncedCityInput, setDebouncedCityInput] = useState("");
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
  const [selectedFeatures, setSelectedFeatures] = useState([]);

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

  // EMI type: advance | arrear (default arrear = standard)
  const [emiType, setEmiType] = useState("arrear");

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
  const [showScenarioB, setShowScenarioB] = useState(true);
  const [loanAmountB, setLoanAmountB] = useState(0);
  const [interestB, setInterestB] = useState(9.5);
  const [tenureB, setTenureB] = useState(5);
  const [tenureTypeB, setTenureTypeB] = useState("years");
  const [emiBInput, setEmiBInput] = useState("");
  const [solveForB, setSolveForB] = useState("emi");
  const [emiTypeB, setEmiTypeB] = useState("arrear");
  const [comparisonTouched, setComparisonTouched] = useState(false);

  // UI
  const [showSchedule, setShowSchedule] = useState(true);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [shareMode, setShareMode] = useState(false);
  const [savedQuotationId, setSavedQuotationId] = useState(null);

  const [pricingState, setPricingState] = useState(null);

  useEffect(() => {
    if (fromVariant) return;
    if (!initialQuotation) return;

    const q = initialQuotation;
    const quoteVehicle = q.vehicle || {};

    if (quoteVehicle.make) setSelectedMake(String(quoteVehicle.make));
    if (quoteVehicle.model) setSelectedModel(String(quoteVehicle.model));
    setCityInput(q.cityTyped || "");

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
      city: q.cityTyped || "",
      color: q.pricing?.color || "",
    }));
  }, [fromVariant, initialQuotation, vehicles]);

  // Populate pricing state from selected vehicle (city-specific pricing row)
  useEffect(() => {
    if (!selectedVehicle) return;

    const additionsOthers = Array.isArray(selectedVehicle.additionsOthers)
      ? selectedVehicle.additionsOthers
      : [];

    const discountsOthers = Array.isArray(selectedVehicle.discountsOthers)
      ? selectedVehicle.discountsOthers
      : [];

    const additionsTotal = additionsOthers.reduce(
      (s, x) => s + (Number(x?.amount) || 0),
      0,
    );

    const discountsTotal = discountsOthers.reduce(
      (s, x) => s + (Number(x?.amount) || 0),
      0,
    );

    const exShowroom = Number(selectedVehicle.exShowroom) || 0;
    const insurance = Number(selectedVehicle.insurance) || 0;
    const tcs =
      Number(selectedVehicle.tcs ?? selectedVehicle.otherCharges) || 0;
    const rto = Number(selectedVehicle.rto ?? selectedVehicle.roadTax) || 0;

    const epc = Number(selectedVehicle.epc) || 0;
    const accessories = Number(selectedVehicle.accessories) || 0;
    const fastag = Number(selectedVehicle.fastag) || 0;
    const extendedWarranty = Number(selectedVehicle.extendedWarranty) || 0;

    const dealerDiscount = Number(selectedVehicle.dealerDiscount) || 0;
    const schemeDiscount = Number(selectedVehicle.schemeDiscount) || 0;
    const insuranceCashback = Number(selectedVehicle.insuranceCashback) || 0;
    const exchange = Number(selectedVehicle.exchange) || 0;
    const loyalty = Number(selectedVehicle.loyalty) || 0;
    const corporate = Number(selectedVehicle.corporate) || 0;

    const onRoadBeforeDiscount =
      exShowroom +
      insurance +
      tcs +
      rto +
      epc +
      accessories +
      fastag +
      extendedWarranty +
      additionsTotal;

    const totalDiscount =
      dealerDiscount +
      schemeDiscount +
      insuranceCashback +
      exchange +
      loyalty +
      corporate +
      discountsTotal;

    const netOnRoad = onRoadBeforeDiscount - totalDiscount;

    setPricingState((prev) => {
      if (prev?.vehicleId === selectedVehicle._id) return prev;

      return {
        vehicleId: selectedVehicle._id,
        city: prev?.city || cityInput || selectedVehicle.city || "",
        color: prev?.color || "",
        exShowroom,
        rto,
        insurance,
        tcs,
        epc,
        accessories,
        fastag,
        extendedWarranty,
        additionsOthers,
        dealerDiscount,
        schemeDiscount,
        insuranceCashback,
        exchange,
        exchangeVehiclePrice: Number(prev?.exchangeVehiclePrice) || 0,
        loyalty,
        corporate,
        discountsOthers,
        onRoadBeforeDiscount,
        totalDiscount,
        netOnRoad,
      };
    });
  }, [selectedVehicle, cityInput]);

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
      Number(fromVariant.defaultDownPayment) ||
      Math.round(fallbackPrice * 0.1);
    const fallbackLoan =
      Number(fromVariant.loanAmount) ||
      Math.max(0, fallbackPrice - fallbackDownPayment);

    setLoanAmountA(fallbackLoan);
    setLoanAmountB(fallbackLoan);
    setDownPct(fallbackPrice ? (fallbackDownPayment / fallbackPrice) * 100 : 10);

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
    const loan = Number(fromVariant.loanAmount) || Math.max(0, price - downPayment);

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
        q.scenarios.A.emiMode === "advance" || q.scenarios.A.emiType === "advance"
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
        q.scenarios.B.emiMode === "advance" || q.scenarios.B.emiType === "advance"
          ? "advance"
          : "arrear",
      );
    }
  }, [initialQuotation]);

  useEffect(() => {
    const loadFeatures = async () => {
      if (!fromVariant) {
        setSelectedFeatures([]);
        return;
      }

      try {
        const res = await featuresApi.getVariantsWithPrice();

        const variants = toArray(res);

        const match = variants.find(
          (v) =>
            String(v.vehicleId || v._id || v.id) ===
            String(fromVariant.vehicleId || fromVariant._id || fromVariant.id),
        );

        setSelectedFeatures(match?.features || []);
      } catch (e) {
        setSelectedFeatures([]);
      }
    };

    loadFeatures();
  }, [fromVariant]);

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

  // Derived backend city used for pricing source selection
  const backendCityKey = useMemo(() => {
    if (!debouncedCityInput) return null;
    return resolveVehiclePricingCity(debouncedCityInput);
  }, [debouncedCityInput]);

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
        const makesRes = await vehiclesApi.getUniqueMakes(backendCityKey || null);
        const rawRows = toArray(makesRes);
        const normalized = rawRows
          .map((row) => String(row || "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        if (ignore) return;

        setMakeOptions(normalized);
        setModelOptions([]);
        setVehicles([]);
        setSelectedMake("");
        setSelectedModel("");
        setSelectedVariant(null);
        setLoanAmountA(0);
        setLoanAmountB(0);

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
        setMakeOptions([]);
        setModelOptions([]);
        setVehicles([]);
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
  }, [backendCityKey, cityInput]);

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
        const res = await vehiclesApi.getUniqueModels(selectedMake, backendCityKey || null);
        const rows = toArray(res)
          .map((row) => String(row || "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        if (ignore) return;
        setModelOptions(rows);
        setVehicles([]);
      } catch {
        if (ignore) return;
        setModelOptions([]);
        setVehicles([]);
      } finally {
        if (!ignore) setVehiclesLoading(false);
      }
    };

    fetchModels();
    return () => {
      ignore = true;
    };
  }, [selectedMake, backendCityKey]);

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
        );
        const rawRows = toArray(res);
        const normalizeStartedAt = performance.now();
        const list = rawRows.map(normalizeVehicleRecord);
        if (ignore) return;
        setVehicles(list);
        perfLog("brand-load:variants-api", {
          runId,
          city: backendCityKey,
          make: selectedMake,
          model: selectedModel,
          rows: rawRows.length,
          apiMs: Number((normalizeStartedAt - apiStartedAt).toFixed(1)),
          normalizeMs: Number((performance.now() - normalizeStartedAt).toFixed(1)),
        });
      } catch (e) {
        if (ignore) return;
        setVehicles([]);
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
  }, [selectedMake, selectedModel, backendCityKey]);

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
      setSelectedModel("");
      setSelectedVariant(null);
      setLoanAmountA(0);
      if (!comparisonTouched) setLoanAmountB(0);
    }
  }, [uniqueModels, selectedModel, comparisonTouched]);

  useEffect(() => {
    if (!selectedVariant || !selectedMake || !selectedModel || !vehicles.length) return;

    const existing = vehicles.find(
      (v) => String(v._id) === String(selectedVariant.value),
    );
    if (existing) return;

    const selectedVariantName = normalizeText(
      String(selectedVariant.label || "").split("—")[0],
    );

    const remapped = vehicles.find(
      (v) =>
        normalizeText(v.make) === normalizeText(selectedMake) &&
        normalizeText(v.model) === normalizeText(selectedModel) &&
        (!selectedVariantName ||
          normalizeText(v.variant) === selectedVariantName),
    );

    if (!remapped) return;

    setSelectedVariant({
      value: remapped._id,
      label: `${remapped.variant} — ${formatINR(remapped.onRoadPrice)}`,
    });
  }, [vehicles, selectedVariant, selectedMake, selectedModel]);

  const onRoadPrice =
    pricingState?.netOnRoad ?? selectedVehicle?.onRoadPrice ?? 0;

  const exShowroom = selectedVehicle?.exShowroom || 0;
  const rto = selectedVehicle?.rto || 0;
  const insurance = selectedVehicle?.insurance || 0;
  const otherCharges = selectedVehicle?.otherCharges || 0;

  // City & color (stored in pricingState but editable here)
  const city = pricingState?.city || "";
  const color = pricingState?.color || "";

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

  const buildQuotationPayload = () => {
    if (!selectedVehicle?._id) {
      message.warning("Please select a vehicle before saving.");
      return null;
    }

    const additionsOthers = normalizeChargeLines(pricingState?.additionsOthers);
    const discountsOthers = normalizeChargeLines(pricingState?.discountsOthers);

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
        tcs: pricingState?.tcs ?? 0,
        epc: pricingState?.epc ?? 0,
        accessories: pricingState?.accessories ?? 0,
        fastag: pricingState?.fastag ?? 0,
        extendedWarranty: pricingState?.extendedWarranty ?? 0,
        additionsOthers,
        dealerDiscount: pricingState?.dealerDiscount ?? 0,
        schemeDiscount: pricingState?.schemeDiscount ?? 0,
        insuranceCashback: pricingState?.insuranceCashback ?? 0,
        exchange: pricingState?.exchange ?? 0,
        exchangeVehiclePrice: pricingState?.exchangeVehiclePrice ?? 0,
        loyalty: pricingState?.loyalty ?? 0,
        corporate: pricingState?.corporate ?? 0,
        discountsOthers,
        onRoadBeforeDiscount: pricingState?.onRoadBeforeDiscount || onRoadPrice,
        totalDiscount: pricingState?.totalDiscount || 0,
        netOnRoad: pricingState?.netOnRoad || onRoadPrice,
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
        message.success(res.data?.duplicate ? "Duplicate prevented. Existing quotation loaded." : "Quotation saved.");
      } else {
        message.error("Save response did not include quotation id.");
      }
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save quotation.");
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
    [solveForA, loanAmountA, interestA, tenureA, tenureTypeA, emiAInput, emiType],
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
        emiTypeB,
      ),
    [solveForB, loanAmountB, interestB, tenureB, tenureTypeB, emiBInput, emiTypeB],
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
  }, [liveEmiResult.principalExact, liveEmiResult.interestExact, liveEmiResult.totalExact, liveEmiResult.principal, liveEmiResult.interest, liveEmiResult.total]);

  const principalPctA = breakupA.principalPct;
  const interestPctA = breakupA.interestPct;

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
    setEmiTypeB(emiType);
    message.success("Copied Scenario A to Scenario B.");
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

    return buildSchedule(
      principal,
      monthlyRate,
      emi,
      months,
    );
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
    setEmiTypeB("arrear");
    setComparisonTouched(false);
    setEmiType("arrear");
    setShowScenarioB(true);

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
        pricingState && Object.prototype.hasOwnProperty.call(pricingState, key)
          ? pricingState[key]
          : (() => {
              // some vehicles store TCS as otherCharges; prefer that for tcs
              if (key === "tcs")
                return (
                  selectedVehicle?.otherCharges ?? selectedVehicle?.tcs ?? 0
                );
              // rto in pricing popup is 'rto' but vehicle might use 'rto' or 'roadTax'; attempt both
              if (key === "rto")
                return selectedVehicle?.rto ?? selectedVehicle?.roadTax ?? 0;
              return selectedVehicle?.[key] ?? 0;
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
  normalizeChargeLines(pricingState?.additionsOthers).forEach((x, idx) => {
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
      const value = pricingState?.[key] || 0;
      if (!value) return null;

      return {
        key,
        label,
        amount: value,
      };
    })
    .filter(Boolean);

  // include dynamic discounts
  normalizeChargeLines(pricingState?.discountsOthers).forEach((x, idx) => {
    if (!x.amount) return;

    discountLines.push({
      key: `disc-${idx}`,
      label: x.label || "Discount",
      amount: x.amount,
    });
  });

  const disableAll = shareMode;
  const scenarioAInputsDisabled = false; // we want Scenario A editable even in share mode

  return (
    <div className="relative px-4 md:px-8 pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-50/70 to-transparent dark:from-emerald-950/20" />
      <div className="max-w-7xl mx-auto space-y-4 relative z-10">
        {/* Action bar */}
        <div className="sticky top-16 z-20 bg-white/85 dark:bg-[#121212]/85 backdrop-blur-md rounded-2xl border border-slate-200/70 dark:border-[#2a2a2a] px-3 md:px-4 py-2.5 shadow-sm">
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
              title={!savedQuotationId ? "Save quotation first" : "Copy share link"}
            >
              <Icon name="link" className="h-3 w-3" />
              Share
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSharePdf}
              disabled={disableAll || !savedQuotationId}
              title={!savedQuotationId ? "Save quotation first" : "Download PDF"}
            >
              <Icon name="file" className="h-3 w-3" />
              PDF
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={resetAll}>
              <Icon name="refresh" className="h-3 w-3" />
              Clear
            </Button>
          </div>
        </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-slate-200 dark:border-[#2b2b2b] bg-white/80 dark:bg-[#1a1a1a]/80 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Selected Vehicle</div>
            <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">
              {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.variant}` : "Not selected"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-[#2b2b2b] bg-white/80 dark:bg-[#1a1a1a]/80 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Mode</div>
            <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">
              {emiType === "advance" ? "Advance EMI" : "Arrear EMI"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-[#2b2b2b] bg-white/80 dark:bg-[#1a1a1a]/80 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Plan Snapshot</div>
            <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">
              {resultA.months || 0} months · {formatINR(resultA.emi || 0)}
            </div>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px,minmax(0,1fr)] gap-3 items-start">
          {/* Left: vehicle + downpayment + breakup */}
          <div className="space-y-3 lg:sticky lg:top-28">
            <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-sm border border-slate-100 dark:border-[#262626] px-3 py-3 flex flex-col gap-2.5 transition-all hover:shadow-md">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Vehicle & downpayment
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                  Choose city, brand, model and variant to auto-calculate loan values.
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
                      setCityInput(value);
                      setPricingState((prev) => ({
                        ...(prev || {}),
                        city: value, // store what user typed
                      }));
                    }}
                    filterOption={(inputValue, option) =>
                      String(option?.value || "")
                        .toUpperCase()
                        .includes(inputValue.toUpperCase())
                    }
                  />
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
                    No vehicles found for selected city. Try another city or clear city filter.
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

          {/* Right: Scenario A + chart + comparison + schedule */}
          <div className="space-y-4">
            {/* Scenario A */}
            <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-sm border border-slate-100 dark:border-[#262626] px-5 py-5 space-y-4 transition-all hover:shadow-md">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Scenario A – primary EMI
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Configure core loan variables and solve instantly</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Advance / Arrear toggle */}
                  <div className="inline-flex flex-wrap rounded-full bg-slate-100 dark:bg-[#262626] p-1 text-[11px]">
                    {[{ key: "arrear", label: "Arrear (Standard)" }, { key: "advance", label: "Advance" }].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => !disableAll && setEmiType(opt.key)}
                        disabled={disableAll}
                        className={`px-3 py-1 rounded-full font-medium transition-all ${
                          emiType === opt.key
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#333]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {/* Solve-for toggle */}
                  <div className="inline-flex flex-wrap rounded-full bg-slate-100 dark:bg-[#262626] p-1 text-[11px]">
                    {solveOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => !disableAll && setSolveForA(opt.key)}
                        disabled={disableAll}
                        className={`px-3 py-1 rounded-full font-medium ${
                          solveForA === opt.key
                            ? "bg-primary text-primary-foreground"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
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
                              ? "bg-primary text-primary-foreground"
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
                              ? "bg-primary text-primary-foreground"
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
                    = {liveEmiResult.months} months
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
                    <AnimatedNumber value={liveEmiResult.emi} />
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                  Based on Loan {formatINR(liveEmiResult.principal)} • Rate {(interestA || 0).toFixed(2)}% p.a. • Tenure {liveEmiResult.months || 0} months
                </div>
              </div>


              </div>
            </div>

            {/* EMI Scheme Panel — emicalculator.net style */}
            <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-sm border border-slate-100 dark:border-[#262626] overflow-hidden transition-all hover:shadow-md">
              {/* Header */}
              <div className="px-5 pt-5 pb-3 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-transparent to-transparent dark:from-emerald-950/20">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">EMI Scheme</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {emiType === "advance" ? "Advance EMI · First instalment paid upfront" : "Arrear EMI · Standard monthly payment"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSchedule(!showSchedule)}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full transition-colors"
                  >
                    {showSchedule ? "HIDE SCHEDULE" : "VIEW SCHEDULE"}
                  </button>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                    emiType === "advance"
                      ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                      : "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300"
                  }`}>
                    {emiType === "advance" ? "ADVANCE" : "ARREAR"}
                  </span>
                </div>
              </div>

              {/* Three stat cards row */}
              <div className="grid grid-cols-3 gap-px bg-slate-100 dark:bg-[#2e2e2e] mt-4 border-t border-slate-100 dark:border-[#2e2e2e]">
                {/* Loan EMI */}
                <div className="bg-white dark:bg-[#1f1f1f] px-4 py-4 text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Loan EMI</div>
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">
                    <AnimatedNumber value={liveEmiResult.emi} />
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">/month</div>
                </div>

                {/* Total Interest */}
                <div className="bg-white dark:bg-[#1f1f1f] px-4 py-4 text-center border-x border-slate-100 dark:border-[#2e2e2e]">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Total Interest</div>
                  <div className="text-xl font-extrabold text-orange-500 dark:text-orange-400 leading-none">
                    {formatINR(breakupA.interestValue)}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">payable</div>
                </div>

                {/* Total Payment */}
                <div className="bg-white dark:bg-[#1f1f1f] px-4 py-4 text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Total Payment</div>
                  <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100 leading-none">
                    {formatINR(breakupA.totalValue)}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">principal + interest</div>
                </div>
              </div>

              {/* Donut chart + legend */}
              <div className="group relative flex flex-col md:flex-row items-center gap-6 px-5 py-5">
                {/* SVG Donut — fixed arc math */}
                <div className="relative flex-shrink-0">
                   {(() => {
                    const R = 80;
                    const CIRC = 2 * Math.PI * R; // ≈ 502.65
                    const pPct = breakupA.principalRatio;
                    const iPct = breakupA.interestRatio;
                    const GAP = 5; // gap in circumference-px between segments

                    const pArc = Math.max(0, pPct * CIRC - GAP);   // principal dash length
                    const iArc = Math.max(0, iPct * CIRC - GAP);   // interest dash length
                    // Interest arc starts immediately after principal segment ends:
                    // strokeDashoffset shifts the dash-start backwards by (CIRC - startPos).
                    // startPos = pPct * CIRC (principal span including gap)
                    const iOffset = CIRC - pPct * CIRC;

                    return (
                      <svg viewBox="0 0 220 220" className="w-52 h-52" style={{ overflow: "visible" }}>
                        {/* Grey background track */}
                        <circle cx="110" cy="110" r={R}
                          fill="none" stroke="#e2e8f0" strokeWidth="26" />

                        {/* Interest arc — orange */}
                        {iArc > 0 && (
                          <circle cx="110" cy="110" r={R}
                            fill="none"
                            stroke="#fb923c"
                            strokeWidth="26"
                            strokeDasharray={`${iArc} ${CIRC}`}
                            strokeDashoffset={iOffset}
                            transform="rotate(-90 110 110)"
                            style={{ transition: "stroke-dasharray 0.7s ease, stroke-dashoffset 0.7s ease" }}
                          />
                        )}

                        {/* Principal arc — emerald, identical start (offset=0 aka 12-o'clock) */}
                        {pArc > 0 && (
                          <circle cx="110" cy="110" r={R}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="26"
                            strokeDasharray={`${pArc} ${CIRC}`}
                            strokeDashoffset={0}
                            transform="rotate(-90 110 110)"
                            style={{ transition: "stroke-dasharray 0.7s ease" }}
                          />
                        )}

                        {/* Donut hole — solid fill, JS-computed for dark mode compat */}
                        <circle cx="110" cy="110" r="54"
                          fill="var(--emi-donut-bg, #ffffff)"
                          style={{ fill: document.documentElement.classList.contains('dark') ? '#1f1f1f' : '#ffffff' }}
                        />

                        {/* Center content */}
                        {liveEmiResult.emi > 0 ? (
                          <>
                            <text x="110" y="99" textAnchor="middle" fontSize="9.5" fill="#94a3b8">Monthly EMI</text>
                            <text x="110" y="119" textAnchor="middle" fontSize="15" fontWeight="800" fill="#059669">
                              {`₹${Math.round(liveEmiResult.emi).toLocaleString("en-IN")}`}
                            </text>
                            <text x="110" y="134" textAnchor="middle" fontSize="9" fill="#94a3b8">
                              {`${principalPctA}% P · ${interestPctA}% I`}
                            </text>
                          </>
                        ) : (
                          <>
                            <text x="110" y="106" textAnchor="middle" fontSize="9.5" fill="#94a3b8">Break-up of</text>
                            <text x="110" y="122" textAnchor="middle" fontSize="9.5" fill="#94a3b8">Total Payment</text>
                          </>
                        )}
                      </svg>
                    );
                  })()}
                </div>

                {/* Legend + bar */}
                <div className="flex-1 w-full space-y-4">
                  {/* Title */}
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Break-up of Total Payment</div>

                  {/* Stacked bar */}
                  <div className="flex h-3 rounded-full overflow-hidden w-full bg-slate-100 dark:bg-[#2e2e2e]">
                    <div
                      className="bg-emerald-500 transition-all duration-700 ease-in-out"
                      style={{ width: `${principalPctA}%` }}
                    />
                    <div
                      className="bg-orange-400 transition-all duration-700 ease-in-out"
                      style={{ width: `${interestPctA}%` }}
                    />
                  </div>

                  {/* Principal legend row */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="text-[12px] text-slate-600 dark:text-slate-300 font-medium">Principal Loan Amount</span>
                    </div>
                    <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">{principalPctA}%</div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-slate-100 dark:bg-[#2a2a2a]" />

                  {/* Interest legend row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0" />
                      <span className="text-[12px] text-slate-600 dark:text-slate-300 font-medium">Total Interest</span>
                    </div>
                    <div className="text-[12px] font-bold text-orange-600 dark:text-orange-400">{interestPctA}%</div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-slate-100 dark:bg-[#2a2a2a]" />

                  {/* Total row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">Total Payment</span>
                    <div className="text-[10px] text-slate-400">{liveEmiResult.months} months</div>
                  </div>
                </div>

                <div className="pointer-events-none absolute left-1/2 top-5 z-20 hidden w-[220px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur group-hover:block dark:border-[#2e2e2e] dark:bg-[#171717]/95">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">EMI Breakup</div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-500">Principal</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatINR(breakupA.principalValue)}</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-500">Total Interest</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">{formatINR(breakupA.interestValue)}</span>
                  </div>
                  <div className="mt-1 border-t border-slate-100 pt-1 dark:border-[#2a2a2a]">
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-slate-500">Total Payable</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{formatINR(breakupA.totalValue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>




            {selectedVehicle && selectedFeatureGroups.length > 0 && (
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
            {showScenarioB ? (
            <details className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-sm border border-slate-100 dark:border-[#262626] px-5 py-5 transition-all hover:shadow-md">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Scenario B – comparison EMI
                  </h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Compare an alternate loan setup side-by-side
                  </p>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                  {/* Remove Scenario B */}
                  <button
                    type="button"
                    title="Remove Scenario B"
                    onClick={() => {
                      setShowScenarioB(false);
                      setComparisonTouched(false);
                      setLoanAmountB(0);
                      setInterestB(9.5);
                      setTenureB(5);
                      setTenureTypeB("years");
                      setEmiBInput("");
                      setSolveForB("emi");
                      setEmiTypeB("arrear");
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>
              </summary>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] gap-4">
                {/* Scenario B inputs */}
                <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-[#2a2a2a] bg-slate-50/60 dark:bg-[#202020] px-4 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Scenario B inputs
                    </span>
                    <div className="inline-flex flex-wrap rounded-full bg-slate-100 dark:bg-[#262626] p-1 text-[11px]">
                      {[{ key: "arrear", label: "Arrear (Standard)" }, { key: "advance", label: "Advance" }].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            if (disableAll) return;
                            setComparisonTouched(true);
                            setEmiTypeB(opt.key);
                          }}
                          disabled={disableAll}
                          className={`px-3 py-1 rounded-full font-medium transition-all ${
                            emiTypeB === opt.key
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#333]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {emiTypeB === "advance" ? "Advance EMI · First instalment paid upfront" : "Arrear EMI · Standard monthly payment"}
                    </span>
                    <div className="inline-flex flex-wrap rounded-full bg-slate-100 dark:bg-[#262626] p-1 text-[11px]">
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
                            ? "bg-primary text-primary-foreground"
                            : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Amount B */}
                    <div>
                      <Label>Loan amount</Label>
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
                      <Label>Interest rate (annual %)</Label>
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
                          className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                            tenureTypeB === "years"
                              ? "bg-primary text-primary-foreground"
                              : "bg-transparent text-slate-600 dark:text-slate-300"
                          }`}
                          onClick={() => {
                            if (disableAll) return;
                            setComparisonTouched(true);
                            setTenureTypeB("years");
                          }}
                          disabled={disableAll}
                        >
                          Years
                        </button>
                        <button
                          type="button"
                          className={`px-3 py-1.5 text-xs font-medium border-l border-slate-200 dark:border-[#262626] whitespace-nowrap ${
                            tenureTypeB === "months"
                              ? "bg-primary text-primary-foreground"
                              : "bg-transparent text-slate-600 dark:text-slate-300"
                          }`}
                          onClick={() => {
                            if (disableAll) return;
                            setComparisonTouched(true);
                            setTenureTypeB("months");
                          }}
                          disabled={disableAll}
                        >
                          Months
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
                <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1f1f1f] px-4 py-4">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
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
            ) : (
              /* Re-add Scenario B */
              <button
                type="button"
                onClick={() => setShowScenarioB(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-3xl border-2 border-dashed border-slate-200 dark:border-[#2e2e2e] text-[12px] font-medium text-slate-400 hover:text-emerald-600 hover:border-emerald-400 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all"
              >
                <span className="text-lg leading-none">+</span>
                Add Comparison (Scenario B)
              </button>
            )}
            {/* Repayment schedule */}
            {showSchedule && (
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
                    Schedule unavailable. Please ensure Loan Amount, Tenure, Interest, and EMI are valid.
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
