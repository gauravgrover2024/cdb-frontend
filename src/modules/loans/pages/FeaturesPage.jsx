// src/modules/loans/pages/FeaturesPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, SlidersHorizontal, X, Check, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { featuresApi } from "../../../api/features";
import ScenarioAInline from "../components/ScenarioAInline";
import { Select } from "antd";

// helper to extract a number from a string
const extractNumber = (str) => {
  if (!str) return null;
  const m = String(str).match(/[\d.]+/);
  return m ? Number(m[0]) : null;
};

// helper to format INR price
const formatPrice = (value) => {
  if (value == null) return "Price NA";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `₹${num.toLocaleString("en-IN")}`;
};

const normalizeValueLabel = (raw) => {
  if (raw == null) return "Not Available";
  const v = String(raw).trim().toLowerCase();
  if (["yes", "y", "available", "present"].includes(v)) return "Yes";
  if (["no", "n", "not available", "na", "n/a"].includes(v))
    return "Not Available";
  return raw;
};

const FeaturesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromVariant = location.state?.fromVariant;

  const [searchTerm, setSearchTerm] = useState("");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [transmissionFilter, setTransmissionFilter] = useState("all");

  const [makeFilter, setMakeFilter] = useState(fromVariant?.make || "");
  const [modelFilter, setModelFilter] = useState(fromVariant?.model || "");
  const [variantFilter, setVariantFilter] = useState(fromVariant?.variant || "");

  const [expandedId, setExpandedId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [showMatrix, setShowMatrix] = useState(false);
  const [onlyDifferences, setOnlyDifferences] = useState(false);

  const [panelSearch, setPanelSearch] = useState("");

  // allVariants = full unfiltered set (used for dropdown option lists)
  const [allVariants, setAllVariants] = useState([]);
  // variants = currently displayed set (filtered by backend params)
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Two-phase load: features fetched on-demand when a card is expanded / added to compare
  // { [variantId]: featuresArray }
  const [loadedFeatures, setLoadedFeatures] = useState({});
  const [featureLoading, setFeatureLoading] = useState(null); // id being loaded

  // EMI modal
  const [emiModalOpen, setEmiModalOpen] = useState(false);
  const [emiVariant, setEmiVariant] = useState(null);

  // Upgrades modal
  const [upgradeModal, setUpgradeModal] = useState(null);

  // keyboard navigation
  const cardRefs = useRef({});

  // Initial load: serve from sessionStorage if fresh (5 min TTL), else fetch slim list
  const FEATURES_SLIM_CACHE_KEY = "features_slim_v1";
  const FEATURES_SLIM_TTL_MS = 5 * 60 * 1000;
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        // Try sessionStorage first
        const cached = sessionStorage.getItem(FEATURES_SLIM_CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < FEATURES_SLIM_TTL_MS && Array.isArray(data) && data.length > 0) {
            if (isMounted) {
              setAllVariants(data);
              setVariants(data);
              setLoading(false);
            }
            return;
          }
        }
        setLoading(true);
        setError(null);
        const res = await featuresApi.getVariantsWithPrice({ slim: '1' });
        const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
        if (!isMounted) return;
        setAllVariants(items);
        setVariants(items);
        try {
          sessionStorage.setItem(FEATURES_SLIM_CACHE_KEY, JSON.stringify({ data: items, ts: Date.now() }));
        } catch { /* storage quota exceeded — ignore */ }
      } catch (err) {
        if (!isMounted) return;
        console.error("features load error", err);
        setError("Could not load variants. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch from backend when make/model/variant/fuel change (backend filters cached data)
  useEffect(() => {
    // Skip on initial mount — initial load handles it
    if (!allVariants.length) return;
    let isMounted = true;
    const params = {};
    if (makeFilter)    params.make    = makeFilter;
    if (modelFilter)   params.model   = modelFilter;
    if (variantFilter) params.variant = variantFilter;
    if (fuelFilter !== "all") params.fuel = fuelFilter;
    params.slim = '1';

    const fetch = async () => {
      try {
        setLoading(true);
        const res = await featuresApi.getVariantsWithPrice(params);
        const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
        if (!isMounted) return;
        setVariants(items);
      } catch {
        // silently keep current set on error
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetch();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makeFilter, modelFilter, variantFilter, fuelFilter]);

  // Debounced search — pass q to backend (backend filters over cached dataset)
  useEffect(() => {
    if (!allVariants.length) return;
    const q = searchTerm.trim();
    if (!q) {
      // No search query: re-apply dropdown filters locally from current set
      return;
    }
    let isMounted = true;
    const params = { q, slim: '1' };
    if (makeFilter)    params.make    = makeFilter;
    if (modelFilter)   params.model   = modelFilter;
    if (fuelFilter !== "all") params.fuel = fuelFilter;

    const handle = setTimeout(async () => {
      try {
        const res = await featuresApi.getVariantsWithPrice(params);
        const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
        if (!isMounted) return;
        setVariants(items);
      } catch { /* keep current set */ }
    }, 300);
    return () => { isMounted = false; clearTimeout(handle); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // On-demand feature loading: fetch full features when a card is expanded
  useEffect(() => {
    if (!expandedId) return;
    if (loadedFeatures[expandedId] !== undefined) return; // already loaded
    const v = allVariants.find((x) => x.id === expandedId);
    if (!v) return;
    let isMounted = true;
    setFeatureLoading(expandedId);
    featuresApi
      .getBySelection({ make: v.make, model: v.model, variant: v.variant, vehicleId: v.vehicleId })
      .then((res) => {
        if (!isMounted) return;
        const items = Array.isArray(res.data) ? res.data : [];
        setLoadedFeatures((prev) => ({ ...prev, [expandedId]: items }));
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadedFeatures((prev) => ({ ...prev, [expandedId]: [] }));
      })
      .finally(() => { if (isMounted) setFeatureLoading(null); });
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedId]);

  // Prefetch features for variants added to compare (so matrix populates immediately)
  useEffect(() => {
    compareIds.forEach((id) => {
      if (loadedFeatures[id] !== undefined) return;
      const v = allVariants.find((x) => x.id === id);
      if (!v) return;
      featuresApi
        .getBySelection({ make: v.make, model: v.model, variant: v.variant, vehicleId: v.vehicleId })
        .then((res) => {
          const items = Array.isArray(res.data) ? res.data : [];
          setLoadedFeatures((prev) => ({ ...prev, [id]: items }));
        })
        .catch(() => setLoadedFeatures((prev) => ({ ...prev, [id]: [] })));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareIds]);

  // Auto-expand the variant that matches fromVariant after data loads
  useEffect(() => {
    if (!fromVariant || !variants.length) return;
    const match = variants.find(
      (v) =>
        String(v.make || "").toLowerCase() === String(fromVariant.make || "").toLowerCase() &&
        String(v.model || "").toLowerCase() === String(fromVariant.model || "").toLowerCase() &&
        String(v.variant || "").toLowerCase() === String(fromVariant.variant || "").toLowerCase(),
    );
    if (match?.id) setExpandedId(match.id);
  }, [fromVariant, variants]);

  // Local post-filter: handles transmission (not a backend param) + clears search when empty
  const filteredVariants = useMemo(
    () =>
      variants.filter((v) => {
        if (transmissionFilter !== "all" && v.transmission !== transmissionFilter) return false;
        return true;
      }),
    [variants, transmissionFilter],
  );

  // Dropdown option lists — computed from full unfiltered set
  const uniqueMakes = useMemo(
    () => [...new Set(allVariants.map((v) => v.make).filter(Boolean))].sort(),
    [allVariants],
  );

  const uniqueModels = useMemo(() => {
    if (!makeFilter) return [];
    return [
      ...new Set(
        allVariants.filter((v) => v.make === makeFilter).map((v) => v.model).filter(Boolean),
      ),
    ].sort();
  }, [allVariants, makeFilter]);

  const uniqueVariants = useMemo(() => {
    let list = allVariants;
    if (makeFilter) list = list.filter((v) => v.make === makeFilter);
    if (modelFilter) list = list.filter((v) => v.model === modelFilter);
    return [...new Set(list.map((v) => v.variant).filter(Boolean))].sort();
  }, [allVariants, makeFilter, modelFilter]);

  const handleToggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
    setShowMatrix(true);
  };

  const compareDetails = useMemo(
    () =>
      compareIds.map((id) => allVariants.find((v) => v.id === id)).filter(Boolean),
    [compareIds, allVariants],
  );

  // EMI computation for finance comparison (10% down, 90% loan, 60 months, 10% p.a.)
  const computeEmi = (price) => {
    if (!price) return null;
    const principal = price * 0.9;
    const annualRate = 0.1;
    const r = annualRate / 12;
    const n = 60;
    const emi =
      (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
    const totalPayable = emi * n;
    const interest = totalPayable - principal;
    return { emi, interest, principal, totalPayable, months: n };
  };

  // Per-card EMI diff data when exactly 2 variants are compared
  const cardEmiInfo = useMemo(() => {
    if (compareDetails.length !== 2) return null;
    const [v1, v2] = compareDetails;
    const price1 = v1.exShowroom || v1.onRoadPrice;
    const price2 = v2.exShowroom || v2.onRoadPrice;
    if (!price1 || !price2) return null;

    const c1 = computeEmi(price1);
    const c2 = computeEmi(price2);
    if (!c1 || !c2) return null;

    const emiDiff = Math.round(c2.emi - c1.emi);
    const interestDiff = Math.round(c2.interest - c1.interest);

    const more = emiDiff > 0 ? v2 : v1;
    const less = emiDiff > 0 ? v1 : v2;
    const absEmiDiff = Math.abs(emiDiff);
    const absIntDiff = Math.abs(interestDiff);

    return {
      moreId: more.id,
      lessId: less.id,
      moreLabel: more.variant,
      lessLabel: less.variant,
      emiDiff: absEmiDiff,
      interestDiff: absIntDiff,
    };
  }, [compareDetails]);

  const compareMatrix = useMemo(() => {
    if (compareDetails.length === 0) return [];
    const byCategory = new Map();

    compareDetails.forEach((variant) => {
      (loadedFeatures[variant.id] || []).forEach((f) => {
        const key = `${f.category}||${f.name}`;
        if (!byCategory.has(key)) {
          byCategory.set(key, {
            category: f.category,
            name: f.name,
            values: {},
          });
        }
        byCategory.get(key).values[variant.id] = f.value;
      });
    });

    const groups = new Map();
    for (const entry of byCategory.values()) {
      if (!groups.has(entry.category)) groups.set(entry.category, []);
      groups.get(entry.category).push(entry);
    }

    for (const arr of groups.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, rows]) => ({ category, rows }));
  }, [compareDetails, loadedFeatures]);

  const diffFilteredMatrix = useMemo(() => {
    if (!onlyDifferences) return compareMatrix;
    if (compareDetails.length <= 1) return compareMatrix;

    return compareMatrix
      .map((group) => {
        const filteredRows = group.rows.filter((row) => {
          const vals = compareDetails.map(
            (v) => row.values[v.id] ?? "Not Available",
          );
          return new Set(vals).size > 1;
        });
        return { ...group, rows: filteredRows };
      })
      .filter((group) => group.rows.length > 0);
  }, [compareMatrix, compareDetails, onlyDifferences]);

  const computeAdditions = (currentVariant, previousVariant, curFeatures, prevFeatures) => {
    if (!currentVariant || !previousVariant) return [];

    const additions = [];

    (curFeatures || []).forEach((f) => {
      const prevVal = (prevFeatures || []).find(
        (p) => p.name === f.name,
      )?.value;
      if (!prevVal) return;
      if (f.value === prevVal) return;

      const c = String(f.value || "").toLowerCase();
      const p = String(prevVal || "").toLowerCase();

      const yesAdded = c === "yes" && p === "not available";

      const isAirbag = f.name.toLowerCase().includes("airbag");
      const isTouchscreen = f.name.toLowerCase().includes("touchscreen");

      const upgradedAirbags =
        isAirbag &&
        !isNaN(Number(f.value)) &&
        !isNaN(Number(prevVal)) &&
        Number(f.value) > Number(prevVal);

      const currNum = extractNumber(f.value);
      const prevNum = extractNumber(prevVal);
      const upgradedScreen =
        isTouchscreen && currNum && prevNum && currNum > prevNum;

      if (yesAdded || upgradedAirbags || upgradedScreen) {
        additions.push({ name: f.name, from: prevVal, to: f.value });
      }
    });

    return additions;
  };

  const computeUpgradeSuggestion = (currentVariant, previousVariant, curFeatures, prevFeatures) => {
    if (!currentVariant || !previousVariant) return null;

    const priceNow = Number(
      currentVariant.exShowroom || currentVariant.onRoadPrice,
    );
    const pricePrev = Number(
      previousVariant.exShowroom || previousVariant.onRoadPrice,
    );

    if (!priceNow || !pricePrev || priceNow <= pricePrev) return null;

    const diff = priceNow - pricePrev;
    if (diff <= 0) return null;

    const additions = computeAdditions(currentVariant, previousVariant, curFeatures, prevFeatures);
    if (!additions.length) return null;

    const airbagsAddition = additions.find((a) =>
      a.name.toLowerCase().includes("airbag"),
    );
    const headlineAddition = airbagsAddition || additions[0];

    const diffText =
      diff >= 100000
        ? `₹${(diff / 100000).toFixed(1)}L`
        : `₹${Math.round(diff / 1000)}k`;

    return {
      text: `Only ${diffText} more for ${headlineAddition.name} — worth the upgrade`,
      diff,
      additions,
    };
  };

  const handleMakeChange = (value) => {
    setMakeFilter(value || "");
    setModelFilter("");
    setVariantFilter("");
  };

  const handleModelChange = (value) => {
    setModelFilter(value || "");
    setVariantFilter("");
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFuelFilter("all");
    setTransmissionFilter("all");
    setMakeFilter("");
    setModelFilter("");
    setVariantFilter("");
    setCompareIds([]);
    setShowMatrix(false);
    setExpandedId(null);
    setOnlyDifferences(false);
    setPanelSearch("");
  };

  const handleCardKeyDown = (e, index) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(filteredVariants.length - 1, index + 1);
      const id = filteredVariants[next]?.id;
      if (id && cardRefs.current[id]) {
        cardRefs.current[id].focus();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(0, index - 1);
      const id = filteredVariants[prev]?.id;
      if (id && cardRefs.current[id]) {
        cardRefs.current[id].focus();
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const v = filteredVariants[index];
      if (v) {
        setExpandedId((prev) => (prev === v.id ? null : v.id));
      }
    }
  };

  return (
    <div className="min-h-screen  px-4 py-6 md:px-8 md:py-8">
      <div className="app-max-wrap pb-24 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-1 px-1 md:px-0">
          <div>
            <h1 className="text-[24px] md:text-[26px] font-semibold text-slate-900 dark:text-slate-50">
              Variant Features Catalog
            </h1>
            <p className="text-[14px] md:text-[15px] text-slate-600 dark:text-slate-400 mt-1">
              Search any make, model or variant and quickly compare detailed
              features.
            </p>
            {!loading && !error && (
              <p className="text-[12px] text-slate-500 dark:text-slate-500 mt-1">
                Showing {filteredVariants.length} of {variants.length} variants
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/loans/emi-calculator")}
              className="px-3.5 py-2 rounded-full text-[13px] font-medium border border-slate-300/70 dark:border-neutral-700 text-slate-800 dark:text-slate-100 bg-white dark:bg-[#111111] hover:bg-slate-50"
            >
              EMI & Loan Planner
            </button>
            <button
              type="button"
              onClick={() => navigate("/loans/quotations")}
              className="px-3.5 py-2 rounded-full text-[13px] font-medium border border-emerald-500/70 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100/80"
            >
              Quotation manager
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white dark:bg-[#111111] rounded-2xl border border-slate-100 dark:border-neutral-800 px-4 py-3.5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {/* Fuel */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  Fuel
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: "all", label: "All" },
                  { value: "Petrol", label: "Petrol" },
                  { value: "CNG", label: "CNG" },
                  { value: "Diesel", label: "Diesel" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFuelFilter(opt.value)}
                    className={[
                      "px-3 py-1.5 rounded-full text-[13px] border transition-colors",
                      fuelFilter === opt.value
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 dark:bg-[#181818] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-[#202020]",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transmission */}
            <div>
              <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wide">
                Transmission
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: "all", label: "All" },
                  { value: "MT", label: "MT" },
                  { value: "AT", label: "AT" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTransmissionFilter(opt.value)}
                    className={[
                      "px-3 py-1.5 rounded-full text-[13px] border transition-colors",
                      transmissionFilter === opt.value
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 dark:bg-[#181818] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-[#202020]",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clear filters */}
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.75 rounded-full text-[13px] border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#202020]"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters & compare
          </button>
        </div>

        {/* Make / Model / Variant dependent dropdowns */}
        <div className="bg-white dark:bg-[#111111] rounded-2xl border border-slate-100 dark:border-neutral-800 px-4 py-3.5">
          <div className="flex items-center gap-1 mb-2.5">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
              Filter by vehicle
            </span>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            {/* Make */}
            <div className="min-w-[160px]">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Make
              </label>
              <Select
                placeholder="Any make"
                value={makeFilter || undefined}
                onChange={handleMakeChange}
                allowClear
                showSearch
                className="w-full"
                size="middle"
                filterOption={(input, option) =>
                  (option?.children ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {uniqueMakes.map((make) => (
                  <Select.Option key={make} value={make}>
                    {make}
                  </Select.Option>
                ))}
              </Select>
            </div>

            {/* Model — dependent on Make */}
            <div className="min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Model
              </label>
              <Select
                placeholder="Any model"
                value={modelFilter || undefined}
                onChange={handleModelChange}
                allowClear
                showSearch
                disabled={!makeFilter}
                className="w-full"
                size="middle"
                filterOption={(input, option) =>
                  (option?.children ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {uniqueModels.map((model) => (
                  <Select.Option key={model} value={model}>
                    {model}
                  </Select.Option>
                ))}
              </Select>
            </div>

            {/* Variant — dependent on Make + Model */}
            <div className="min-w-[240px]">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Variant
              </label>
              <Select
                placeholder="Any variant"
                value={variantFilter || undefined}
                onChange={(v) => setVariantFilter(v || "")}
                allowClear
                showSearch
                disabled={!makeFilter && !modelFilter}
                className="w-full"
                size="middle"
                filterOption={(input, option) =>
                  (option?.children ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {uniqueVariants.map((variant) => (
                  <Select.Option key={variant} value={variant}>
                    {variant}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Global search */}
        <div className="bg-white dark:bg-[#111111] rounded-2xl border border-slate-100 dark:border-neutral-800 px-4 py-3.5 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search make, model, variant or feature keyword (e.g. ‘Hyundai Verna SX sunroof’)"
            className="flex-1 bg-transparent outline-none text-[14px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-[#181818]"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>

        {/* Loading / error */}
        {loading && (
          <div className="text-[14px] text-slate-500 dark:text-slate-400 px-1 py-6">
            Loading variants…
          </div>
        )}
        {!loading && error && (
          <div className="text-[14px] text-red-500 px-1 py-6">{error}</div>
        )}

        {/* Variant cards */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVariants.length === 0 ? (
              <div className="col-span-full text-[14px] text-slate-500 dark:text-slate-400 px-1 py-8">
                No variants match the current search and filters.
              </div>
            ) : (
              filteredVariants.map((v, idx) => {
                const inCompare = compareIds.includes(v.id);

                // Use pre-computed summary fields from backend (slim payload)
                const airbags = v._airbags ?? null;
                const ncap    = v._ncap ?? null;
                const screen  = v._screen ?? null;

                // previous variant within same make+model in the current filtered list
                let prevVariant = null;
                for (let i = idx - 1; i >= 0; i -= 1) {
                  const candidate = filteredVariants[i];
                  if (
                    candidate.make === v.make &&
                    candidate.model === v.model
                  ) {
                    prevVariant = candidate;
                    break;
                  }
                }

                const vFeats    = loadedFeatures[v.id] || [];
                const prevFeats = prevVariant ? (loadedFeatures[prevVariant.id] || []) : [];
                const additions = prevVariant
                  ? computeAdditions(v, prevVariant, vFeats, prevFeats)
                  : [];
                const upgrade = prevVariant
                  ? computeUpgradeSuggestion(v, prevVariant, vFeats, prevFeats)
                  : null;

                const isExpanded = expandedId === v.id;

                const localPanelSearch =
                  isExpanded && panelSearch ? panelSearch.toLowerCase() : "";

                const pillKeywords = [];
                if (airbags) pillKeywords.push("airbag");
                if (ncap) pillKeywords.push("ncap");
                if (screen) pillKeywords.push("screen");
                const filteredTags = (v.tags || []).filter((tag) => {
                  const t = tag.toLowerCase();
                  return !pillKeywords.some((k) => t.includes(k));
                });

                const priceToUse = v.exShowroom || v.onRoadPrice;

                // Per-card EMI compare text (if exactly 2 compared and this is the more expensive one)
                let emiHint = null;
                if (cardEmiInfo && cardEmiInfo.moreId === v.id) {
                  emiHint = `${v.variant} EMI is ${formatPrice(
                    cardEmiInfo.emiDiff,
                  )} higher per month and ${formatPrice(
                    cardEmiInfo.interestDiff,
                  )} more interest over tenure compared to ${
                    cardEmiInfo.lessLabel
                  } (10% downpayment, 90% loan).`;
                }

                return (
                  <div
                    key={v.id}
                    ref={(el) => {
                      cardRefs.current[v.id] = el;
                    }}
                    tabIndex={0}
                    onKeyDown={(e) => handleCardKeyDown(e, idx)}
                    className="bg-white dark:bg-[#111111] rounded-2xl border border-slate-100 dark:border-neutral-800 px-4 py-3.5 flex flex-col gap-3 shadow-[0_6px_18px_rgba(15,23,42,0.06)] focus:outline-none focus:ring-2 focus:ring-slate-400/60 dark:focus:ring-slate-500/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="text-[16px] font-semibold text-slate-900 dark:text-slate-50">
                          {v.variant}
                        </div>
                        <div className="text-[14px] text-slate-600 dark:text-slate-400">
                          {v.make} {v.model} • {v.fuel} • {v.transmission}
                        </div>
                        <div className="text-[13px] text-slate-800 dark:text-slate-200 font-medium">
                          {formatPrice(priceToUse)}
                          {v.city ? ` • ${v.city}` : ""}
                        </div>
                        {prevVariant && (
                          <div className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                            Includes all features of{" "}
                            <span className="font-semibold">
                              {prevVariant.variant}
                            </span>
                            {additions.length ? " plus:" : ""}
                          </div>
                        )}
                      </div>

                      {/* Compare icon button */}
                      <button
                        type="button"
                        onClick={() => handleToggleCompare(v.id)}
                        className={[
                          "relative w-9 h-9 rounded-full border flex items-center justify-center transition-colors",
                          inCompare
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 dark:bg-[#181818] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-[#222222]",
                        ].join(" ")}
                      >
                        {inCompare ? (
                          <Check className="w-4.5 h-4.5" />
                        ) : (
                          <span className="text-[18px] leading-none">+</span>
                        )}
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {inCompare ? "In compare" : "Add"}
                        </span>
                      </button>
                    </div>

                    {prevVariant && additions.length > 0 && (
                      <div className="text-[13px] text-slate-600 dark:text-slate-300 mt-0.5">
                        Only{" "}
                        {upgrade
                          ? upgrade.diff >= 100000
                            ? `₹${(upgrade.diff / 100000).toFixed(1)}L`
                            : `₹${Math.round(upgrade.diff / 1000)}k`
                          : ""}{" "}
                        more for {additions.length} upgrades — worth the upgrade{" "}
                        <button
                          type="button"
                          onClick={() =>
                            setUpgradeModal({
                              current: v,
                              baseVariant: prevVariant,
                              additions,
                              priceDiff: upgrade?.diff || 0,
                              compareToId: prevVariant.id,
                            })
                          }
                          className="text-emerald-700 dark:text-emerald-300 underline underline-offset-2"
                        >
                          ({additions.length} upgrades)
                        </button>
                      </div>
                    )}

                    {/* EMI finance hint inside card */}
                    {emiHint && (
                      <div className="text-[12px] text-amber-900 dark:text-amber-100 bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-800/60 rounded-xl px-3 py-1.5 mt-1">
                        {emiHint}
                      </div>
                    )}

                    {/* feature tags */}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {airbags && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                          <Check className="w-3.5 h-3.5" />
                          {airbags} Airbags
                        </span>
                      )}
                      {ncap && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300">
                          {ncap} NCAP
                        </span>
                      )}
                      {screen && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
                          {screen} Screen
                        </span>
                      )}
                      {filteredTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] bg-slate-50 dark:bg-[#181818] text-slate-600 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Finance actions */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {/* Send to quotation → EMI page with fromVariant */}
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/loans/emi-calculator", {
                            state: {
                              fromVariant: {
                                vehicleId: v.vehicleId,
                                make: v.make,
                                model: v.model,
                                variant: v.variant,
                                price: priceToUse,
                              },
                            },
                          })
                        }
                        className="px-3 py-1.5 rounded-full text-[12px] border border-emerald-500/70 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100/80"
                      >
                        Send to quotation
                      </button>

                      {/* Scenario A popup for EMI */}
                      <button
                        type="button"
                        onClick={() => {
                          setEmiVariant(v);
                          setEmiModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-full text-[12px] border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#202020]"
                      >
                        Calculate EMI
                      </button>

                      {/* Compare finance cost → ensure in compare & open matrix */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!compareIds.includes(v.id)) {
                            handleToggleCompare(v.id);
                          } else {
                            setShowMatrix(true);
                          }
                        }}
                        className="px-3 py-1.5 rounded-full text-[12px] border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#202020]"
                      >
                        Compare finance cost
                      </button>
                    </div>

                    {/* Expandable features section */}
                    <div className="mt-1 pt-2 border-t border-dashed border-slate-100 dark:border-neutral-800">
                      <button
                        type="button"
                        onClick={() => {
                          const next = expandedId === v.id ? null : v.id;
                          setExpandedId(next);
                          if (next) setPanelSearch("");
                        }}
                        className="w-full flex items-center justify-between gap-2 group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            {isExpanded ? "Hide features" : "All features"}
                          </span>
                          {(v.featureCount ?? vFeats.length) > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400">
                              {v.featureCount ?? vFeats.length}
                            </span>
                          )}
                        </div>
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-violet-500 transition-colors" />
                          : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-violet-500 transition-colors" />
                        }
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          {/* Loading skeleton */}
                          {featureLoading === v.id ? (
                            <div className="space-y-2">
                              {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between gap-3 animate-pulse">
                                  <div className="h-3 bg-slate-100 dark:bg-neutral-800 rounded w-2/3" />
                                  <div className="h-3 bg-slate-100 dark:bg-neutral-800 rounded w-12" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              {/* Panel search */}
                              <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#181818] border border-slate-100 dark:border-neutral-800 rounded-xl px-3 py-2">
                                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <input
                                  type="text"
                                  value={panelSearch}
                                  onChange={(e) => setPanelSearch(e.target.value)}
                                  placeholder="Search features…"
                                  className="flex-1 bg-transparent outline-none text-[12px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 min-w-0"
                                />
                                {panelSearch && (
                                  <button
                                    type="button"
                                    onClick={() => setPanelSearch("")}
                                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-neutral-700 shrink-0"
                                  >
                                    <X className="w-3 h-3 text-slate-400" />
                                  </button>
                                )}
                              </div>

                              {/* Categories */}
                              <div className="overflow-y-auto max-h-[52vh] space-y-4 pr-0.5">
                                {[
                                  { key: "Safety",                color: "text-rose-600 dark:text-rose-400",    dot: "bg-rose-400" },
                                  { key: "Comfort & Convenience", color: "text-sky-600 dark:text-sky-400",      dot: "bg-sky-400" },
                                  { key: "Exterior",              color: "text-amber-600 dark:text-amber-400",  dot: "bg-amber-400" },
                                  { key: "Infotainment",          color: "text-violet-600 dark:text-violet-400",dot: "bg-violet-400" },
                                  { key: "Connected",             color: "text-teal-600 dark:text-teal-400",    dot: "bg-teal-400" },
                                  { key: "Others",                color: "text-slate-500 dark:text-slate-400",  dot: "bg-slate-400" },
                                ].map(({ key: cat, color, dot }) => {
                                  let items = vFeats.filter((f) => f.category === cat);
                                  if (localPanelSearch) {
                                    items = items.filter((f) =>
                                      `${f.name} ${f.value}`.toLowerCase().includes(localPanelSearch),
                                    );
                                  }
                                  if (!items.length) return null;
                                  return (
                                    <div key={cat}>
                                      {/* Category header */}
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${color}`}>
                                          {cat}
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-600">
                                          {items.length}
                                        </span>
                                      </div>

                                      {/* Feature rows */}
                                      <div className="rounded-xl border border-slate-100 dark:border-neutral-800 divide-y divide-slate-50 dark:divide-neutral-800/80 overflow-hidden">
                                        {items.map((f) => {
                                          const label = normalizeValueLabel(f.value);
                                          const valLower = String(label).toLowerCase().trim();
                                          const isYes = valLower === "yes";
                                          const isNo  = valLower === "not available";
                                          return (
                                            <div
                                              key={f.name}
                                              className="flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-[#111111] hover:bg-slate-50/70 dark:hover:bg-[#161616] transition-colors"
                                            >
                                              <span className="text-[12px] text-slate-700 dark:text-slate-300 leading-snug min-w-0">
                                                {f.name}
                                              </span>
                                              {isYes ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 shrink-0">
                                                  <Check className="w-3 h-3" />
                                                  Yes
                                                </span>
                                              ) : isNo ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 dark:bg-neutral-800 text-slate-400 dark:text-slate-500 shrink-0">
                                                  <Minus className="w-3 h-3" />
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
                                })}

                                {/* No results for search */}
                                {localPanelSearch && vFeats.filter((f) =>
                                  `${f.name} ${f.value}`.toLowerCase().includes(localPanelSearch)
                                ).length === 0 && (
                                  <div className="text-[12px] text-slate-400 py-4 text-center">
                                    No features match "{panelSearch}"
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Matrix view */}
        {showMatrix && compareDetails.length >= 1 && (
          <div className="mt-5 bg-white dark:bg-[#111111] rounded-2xl border border-slate-100 dark:border-neutral-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <div className="text-[16px] font-semibold text-slate-900 dark:text-slate-50">
                  Feature comparison matrix
                </div>
                <div className="text-[13px] text-slate-500 dark:text-slate-400">
                  {compareDetails.length} variant
                  {compareDetails.length > 1 ? "s" : ""} selected
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-slate-300 dark:border-neutral-700"
                    checked={onlyDifferences}
                    onChange={(e) => setOnlyDifferences(e.target.checked)}
                  />
                  Show only differences
                </label>
                <button
                  type="button"
                  onClick={() => setShowMatrix(false)}
                  className="px-3 py-1.5 rounded-full text-[12px] border border-slate-300 dark:border-neutral-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#181818]"
                >
                  Close compare
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-[13px]">
                <thead className="bg-slate-50 dark:bg-[#181818]">
                  <tr>
                    <th className="sticky left-0 z-10 bg-slate-50 dark:bg-[#181818] text-left px-3 py-2 border-r border-slate-100 dark:border-neutral-800 font-medium text-slate-700 dark:text-slate-100 w-60">
                      Feature
                    </th>
                    {compareDetails.map((v) => (
                      <th
                        key={v.id}
                        className="px-3 py-2 border-b border-slate-100 dark:border-neutral-800 font-medium text-slate-700 dark:text-slate-100 whitespace-nowrap"
                      >
                        {v.variant}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {diffFilteredMatrix.length === 0 ? (
                    <tr>
                      <td
                        colSpan={1 + compareDetails.length}
                        className="px-3 py-4 text-center text-[13px] text-slate-500"
                      >
                        No differing features to show with current selection.
                      </td>
                    </tr>
                  ) : (
                    diffFilteredMatrix.map((section) => (
                      <React.Fragment key={section.category}>
                        <tr className="bg-slate-100/80 dark:bg-[#181818]">
                          <td
                            colSpan={1 + compareDetails.length}
                            className="px-3 py-1.5 border-t border-b border-slate-100 dark:border-neutral-800 text-[12px] font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400"
                          >
                            {section.category}
                          </td>
                        </tr>
                        {section.rows.map((row) => (
                          <tr
                            key={row.name}
                            className="hover:bg-slate-50 dark:hover:bg-[#181818]"
                          >
                            <td className="sticky left-0 z-10 bg-white dark:bg-[#111111] px-3 py-1.5 border-t border-r border-slate-100 dark:border-neutral-800 text-slate-700 dark:text-slate-100 align-top">
                              {row.name}
                            </td>
                            {compareDetails.map((v) => {
                              const rawValue =
                                row.values[v.id] ?? "Not Available";
                              const label = normalizeValueLabel(rawValue);
                              const valLower = String(label)
                                .toLowerCase()
                                .trim();
                              const isYes = valLower === "yes";
                              const isNo = valLower === "not available";
                              return (
                                <td
                                  key={v.id}
                                  className="px-3 py-1.5 border-t border-slate-100 dark:border-neutral-800 text-center text-slate-700 dark:text-slate-100 align-top"
                                >
                                  {isYes ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500 inline" />
                                  ) : isNo ? (
                                    <Minus className="w-3.5 h-3.5 text-slate-400 inline" />
                                  ) : (
                                    label
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EMI Scenario A modal */}
        {emiModalOpen && emiVariant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-xl max-w-xl w-full p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">
                    EMI Scenario A
                  </div>
                  <div className="text-[13px] text-slate-500 dark:text-slate-400">
                    {emiVariant.make} {emiVariant.model} • {emiVariant.variant}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmiModalOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-[#181818]"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {emiVariant.exShowroom || emiVariant.onRoadPrice ? (
                <ScenarioAInline
                  initialPrice={emiVariant.exShowroom || emiVariant.onRoadPrice}
                />
              ) : (
                <div className="text-[13px] text-slate-500 dark:text-slate-400">
                  Price not available for EMI calculation.
                </div>
              )}

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEmiModalOpen(false)}
                  className="px-3 py-1.5 rounded-full text-[12px] border border-slate-300 dark:border-neutral-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#181818]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const price =
                      emiVariant.exShowroom || emiVariant.onRoadPrice;
                    setEmiModalOpen(false);
                    navigate("/loans/emi-calculator", {
                      state: {
                        fromVariant: {
                          vehicleId: emiVariant.vehicleId,
                          make: emiVariant.make,
                          model: emiVariant.model,
                          variant: emiVariant.variant,
                          price,
                        },
                      },
                    });
                  }}
                  className="px-3 py-1.5 rounded-full text-[12px] border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#181818]"
                >
                  Open full EMI calculator
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upgrades modal with dropdown compare */}
        {upgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-xl max-w-lg w-full p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="space-y-1">
                  <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">
                    Upgrades to {upgradeModal.current.variant}
                  </div>
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">
                    Compared to{" "}
                    <select
                      className="bg-transparent border border-slate-200 dark:border-[#262626] rounded-full px-2 py-0.5 text-[12px]"
                      value={upgradeModal.compareToId}
                      onChange={(e) => {
                        const newBase = variants.find(
                          (vv) => vv.id === e.target.value,
                        );
                        if (!newBase) return;

                        const newAdditions = computeAdditions(
                          upgradeModal.current,
                          newBase,
                        );
                        const priceNow =
                          Number(
                            upgradeModal.current.exShowroom ||
                              upgradeModal.current.onRoadPrice,
                          ) || 0;
                        const priceBase =
                          Number(newBase.exShowroom || newBase.onRoadPrice) ||
                          0;

                        setUpgradeModal((prev) => ({
                          ...prev,
                          baseVariant: newBase,
                          additions: newAdditions,
                          priceDiff: priceNow - priceBase,
                          compareToId: newBase.id,
                        }));
                      }}
                    >
                      {variants
                        .filter(
                          (vv) =>
                            vv.make === upgradeModal.current.make &&
                            vv.model === upgradeModal.current.model &&
                            vv.id !== upgradeModal.current.id,
                        )
                        .map((vv) => (
                          <option key={vv.id} value={vv.id}>
                            {vv.variant}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUpgradeModal(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-[#181818]"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="text-[13px] text-slate-700 dark:text-slate-200 mb-2">
                Price difference: {formatPrice(upgradeModal.priceDiff || 0)} for{" "}
                {upgradeModal.additions.length} key upgrades.
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto text-[13px] text-slate-700 dark:text-slate-200">
                {upgradeModal.additions.map((a) => (
                  <div key={a.name} className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 mt-[2px]" />
                    <span>
                      <span className="font-semibold">{a.name}</span>: {a.to}
                      {a.from && a.from !== "Not Available"
                        ? ` (from ${a.from})`
                        : ""}
                    </span>
                  </div>
                ))}
                {!upgradeModal.additions.length && (
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">
                    No major feature upgrades detected for this pair.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturesPage;
