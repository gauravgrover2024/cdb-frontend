import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AutoComplete, Select, message } from "antd";
import { vehiclesApi } from "../../api/vehicles";
import { featuresApi } from "../../api/features";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import { buildVehiclePricingSnapshot } from "../../utils/vehiclePricingBreakup";
import FeaturesEmiCompareModal from "../loans/components/FeaturesEmiCompareModal";

const { Option } = Select;

const FUEL_ORDER = ["All", "Petrol", "Diesel", "CNG", "Electric", "Hybrid"];

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const escapeRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const collapseSpaces = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const parseSeatCount = (value) => {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  const text = String(value).trim();
  if (!text) return null;
  const match = text.match(/(\d{1,2})/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeBodyTypeBucket = (value) => {
  const text = normalizeText(value);
  if (!text) return "";
  if (
    text.includes("suv") ||
    text.includes("crossover") ||
    text.includes("sport utility")
  ) {
    return "suv";
  }
  if (text.includes("sedan")) return "sedan";
  if (text.includes("hatch")) return "hatchback";
  if (text.includes("muv") || text.includes("mpv") || text.includes("people mover")) {
    return "mpv";
  }
  if (text.includes("coupe")) return "coupe";
  if (text.includes("convertible") || text.includes("cabriolet")) {
    return "convertible";
  }
  if (text.includes("pickup")) return "pickup";
  return text;
};

const formatBodyType = (value) => {
  const text = collapseSpaces(value);
  if (!text) return "";
  return text
    .split(" ")
    .map((token) =>
      token ? token.charAt(0).toUpperCase() + token.slice(1).toLowerCase() : "",
    )
    .join(" ");
};

const buildVariantDisplayLabel = (variant, make = "", model = "") => {
  const raw = collapseSpaces(variant);
  if (!raw) return "";

  let cleaned = raw;
  const makeModel = collapseSpaces(`${make} ${model}`);
  if (makeModel) {
    const fullPrefix = new RegExp(
      `^${escapeRegExp(makeModel)}(?:\\s*[-:|/]\\s*|\\s+)`,
      "i",
    );
    cleaned = cleaned.replace(fullPrefix, "").trim();
  }

  if (make) {
    const makePrefix = new RegExp(
      `^${escapeRegExp(collapseSpaces(make))}(?:\\s*[-:|/]\\s*|\\s+)`,
      "i",
    );
    cleaned = cleaned.replace(makePrefix, "").trim();
  }

  return cleaned || raw;
};

const buildPriceDeltaInsight = (basePrice, candidatePrice, bodyType, seatCount) => {
  const base = Number(basePrice) || 0;
  const next = Number(candidatePrice) || 0;
  if (!base || !next) return "AI insight: Similar segment option for comparison.";

  const diff = next - base;
  const pct = Math.round((Math.abs(diff) / base) * 100);
  const seatLabel = seatCount ? `${seatCount}-seater` : "same seating class";
  const bodyLabel = bodyType || "same body type";

  if (pct <= 2) {
    return `AI insight: Near-identical starting price in ${bodyLabel}, ${seatLabel}.`;
  }
  if (diff < 0) {
    return `AI insight: About ${pct}% lower than current pick with ${bodyLabel}, ${seatLabel}.`;
  }
  return `AI insight: About ${pct}% premium over current pick with ${bodyLabel}, ${seatLabel}.`;
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
  const pricingBreakup = buildVehiclePricingSnapshot(vehicle);
  // Vehicle price list should show base/on-road list pricing only.
  // Discount logic is quotation-specific and intentionally not applied here.
  const onRoadListPrice =
    Number(pricingBreakup.onRoadBeforeDiscount) ||
    Number(pricingBreakup.netOnRoad) ||
    toNum(
      vehicle.onRoadPrice ??
        vehicle.on_road_price ??
        vehicle.netOnRoad ??
        vehicle.onRoad,
    );

  return {
    ...vehicle,
    _id: vehicle._id || vehicle.id || vehicle.vehicleId,
    make:
      String(
        vehicle.make || vehicle.brand || vehicle.brandName || "N/A",
      ).trim() || "N/A",
    model: String(vehicle.model || vehicle.modelName || "N/A").trim() || "N/A",
    variant:
      String(
        vehicle.variant || vehicle.variantName || vehicle.name || "N/A",
      ).trim() || "N/A",
    city:
      String(
        vehicle.city || vehicle.locationCity || vehicle.showroomCity || "N/A",
      ).trim() || "N/A",
    fuel: String(vehicle.fuel || vehicle.fuelType || "N/A").trim() || "N/A",
    exShowroom:
      Number(pricingBreakup.exShowroom) ||
      toNum(
        vehicle.exShowroom ?? vehicle.ex_showroom ?? vehicle.exShowroomPrice,
      ),
    rto: Number(pricingBreakup.rto) || toNum(vehicle.rto ?? vehicle.roadTax),
    insurance: Number(pricingBreakup.insurance) || toNum(vehicle.insurance),
    otherCharges:
      Number(pricingBreakup.tcs) || toNum(vehicle.otherCharges ?? vehicle.tcs),
    onRoadPrice: onRoadListPrice,
    bodyType:
      collapseSpaces(
        vehicle.bodyType ||
          vehicle.body_type ||
          vehicle.body ||
          vehicle.bodyStyle ||
          vehicle.body_style ||
          vehicle.vehicleType ||
          vehicle.vehicle_type ||
          vehicle.carType ||
          vehicle.vehicleBodyType ||
          vehicle.segment ||
          "",
      ) || "",
    bodyTypeBucket:
      normalizeBodyTypeBucket(
        vehicle.bodyType ||
          vehicle.body_type ||
          vehicle.body ||
          vehicle.bodyStyle ||
          vehicle.body_style ||
          vehicle.vehicleType ||
          vehicle.vehicle_type ||
          vehicle.carType ||
          vehicle.vehicleBodyType ||
          vehicle.segment ||
          "",
      ) || "",
    seatingCapacity:
      parseSeatCount(
        vehicle.seatingCapacity ||
          vehicle.seating_capacity ||
          vehicle.seating ||
          vehicle.seat_capacity ||
          vehicle.seats ||
          vehicle.noOfSeats,
      ) || null,
    pricingBreakup,
  };
};

const cityMatches = (vehicleCity, selectedCity) => {
  const city = normalizeText(vehicleCity);
  const selected = normalizeText(selectedCity);
  if (!selected) return true;
  if (city === selected) return true;
  if (city.includes(selected) || selected.includes(city)) return true;
  return false;
};

const getVehicleMake = (vehicle) => vehicle?.make || vehicle?.brand || "";
const getVehicleModel = (vehicle) => vehicle?.model || "";
const getVehicleVariant = (vehicle) => vehicle?.variant || "";
const getVehicleImage = (vehicle) =>
  vehicle?.image_url || vehicle?.imageUrl || "";
const getVehicleColor = (vehicle) =>
  vehicle?.color_name ||
  vehicle?.colorName ||
  vehicle?.colour_name ||
  vehicle?.colourName ||
  "";
const getVehicleHex = (vehicle) =>
  vehicle?.hex || vehicle?.color_hex || vehicle?.colour_hex || "";

const buildMediaKey = (vehicle) =>
  [
    normalizeText(getVehicleMake(vehicle)),
    normalizeText(getVehicleModel(vehicle)),
    normalizeText(getVehicleVariant(vehicle)),
    normalizeText(getVehicleColor(vehicle)),
    getVehicleImage(vehicle),
  ].join("|");

// Hybrid fuel helpers
const isHybridFuel = (fuel) => {
  const f = (fuel || "").toLowerCase();
  return (
    f.includes("hybrid") || f.includes("shvs") || f.includes("mild hybrid")
  );
};

const normalizeFuelLabel = (fuel) => {
  if (!fuel || fuel === "N/A") return fuel;
  if (isHybridFuel(fuel)) return "Hybrid";
  return fuel;
};

const normalizeValueLabel = (raw) => {
  if (raw == null) return "Not Available";
  const v = String(raw).trim().toLowerCase();
  if (["yes", "y", "available", "present"].includes(v)) return "Yes";
  if (["no", "n", "not available", "na", "n/a"].includes(v))
    return "Not Available";
  return raw;
};

const hasDisplayableFeatureValue = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return false;
  const normalized = text.toLowerCase();
  return ![
    "not available",
    "na",
    "n/a",
    "null",
    "undefined",
    "-",
    "none",
    "no",
  ].includes(normalized);
};

const FEATURE_CATEGORY_STYLES = {
  Safety: { color: "text-rose-600 dark:text-rose-400", dot: "bg-rose-400" },
  "Comfort & Convenience": {
    color: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-400",
  },
  Exterior: {
    color: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  Infotainment: {
    color: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-400",
  },
  Connected: {
    color: "text-teal-600 dark:text-teal-400",
    dot: "bg-teal-400",
  },
  Others: {
    color: "text-slate-500 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

const FEATURE_CATEGORY_ORDER = [
  "Safety",
  "Comfort & Convenience",
  "Exterior",
  "Infotainment",
  "Connected",
  "Others",
];

const VehiclePriceList = ({ onSelectVehicle, selectionMode = false }) => {
  const navigate = useNavigate();

  // allVehicles = full unfiltered set — used only for dropdown option lists
  const [allVehicles, setAllVehicles] = useState([]);
  // vehicles = backend-filtered set (by city/make/model/fuel) — used for display
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [vehicleSearchInput, setVehicleSearchInput] = useState("");
  const [debouncedVehicleSearchInput, setDebouncedVehicleSearchInput] =
    useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [fuelFilter, setFuelFilter] = useState("");
  const [variantFilter, setVariantFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("Delhi");
  const [budgetFilter, setBudgetFilter] = useState("");
  const [showDiscontinued, setShowDiscontinued] = useState(false);

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [priceSort, setPriceSort] = useState("asc");
  const [galleryVehicleId, setGalleryVehicleId] = useState(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(30);
  const [galleryMedia, setGalleryMedia] = useState([]);
  const [mainColorImageMeta, setMainColorImageMeta] = useState(null);

  const [emiModalOpen, setEmiModalOpen] = useState(false);
  const [emiVariant, setEmiVariant] = useState(null);

  const [featureByVehicleId, setFeatureByVehicleId] = useState({});
  const [featureLoadingByVehicleId, setFeatureLoadingByVehicleId] = useState(
    {},
  );
  const [featurePanelOpenByVehicleId, setFeaturePanelOpenByVehicleId] =
    useState({});
  const [featurePanelSearchByVehicleId, setFeaturePanelSearchByVehicleId] =
    useState({});
  const [baseModelContext, setBaseModelContext] = useState(null);
  const [similarCarsIdeas, setSimilarCarsIdeas] = useState([]);
  const [similarCarsLoading, setSimilarCarsLoading] = useState(false);

  // ─── smart-set city from loaded data ───────────────────────────────────────
  const smartSetCity = useCallback((list) => {
    setCityFilter((prev) => {
      // If the user already changed city to something other than delhi-ish, keep it.
      if (prev && !normalizeText(prev).includes("delhi")) return prev;
      // Try to find the exact city name in data that resembles Delhi.
      const delhiCity = list.find((v) =>
        normalizeText(v.city).includes("delhi"),
      )?.city;
      return delhiCity || prev;
    });
  }, []);

  // Load the full vehicle list once — used to populate dropdown options.
  // Runs only on mount. Backend has in-memory cache so this is fast after first hit.
  const loadAllVehicles = useCallback(async () => {
    try {
      const res = await vehiclesApi.getAll();
      let list = toArray(res).map(normalizeVehicleRecord);

      if (!list.length) {
        const variantsRes = await featuresApi.getVariantsWithPrice();
        const variants = Array.isArray(variantsRes?.data) ? variantsRes.data : [];
        list = variants.map((v) =>
          normalizeVehicleRecord({
            _id: v.vehicleId || v.id || v._id,
            make: v.make || "N/A",
            model: v.model || "N/A",
            variant: v.variant || "N/A",
            fuel: v.fuel || "N/A",
            city: v.city || "N/A",
            exShowroom: Number(v.exShowroom || 0),
            rto: Number(v.rto || 0),
            insurance: Number(v.insurance || 0),
            otherCharges: Number(v.otherCharges || v.tcs || 0),
            onRoadPrice: Number(v.onRoadPrice || 0),
            status: "Active",
            isDiscontinued: false,
          }),
        );
      }

      setAllVehicles(list);
      setVehicles(list);   // initial display = full set (local filtering kicks in below)
      smartSetCity(list);
    } catch (err) {
      console.error("Load Vehicles Error:", err);
      message.error("Failed to load vehicle price list ❌");
    }
  }, [smartSetCity]);

  // Re-fetch from backend when city / make / model / fuel change.
  // Backend has indexes on these fields + response cache → fast round-trips.
  const loadFilteredVehicles = useCallback(async (params) => {
    try {
      setLoading(true);
      const res = await vehiclesApi.getAll(params);
      const list = toArray(res).map(normalizeVehicleRecord);
      setVehicles(list);
    } catch (err) {
      console.error("Load Filtered Vehicles Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial mount: load full set for dropdowns
  useEffect(() => {
    setLoading(true);
    loadAllVehicles().finally(() => setLoading(false));
  }, [loadAllVehicles]);

  // When key filters change: ask backend for the filtered subset
  useEffect(() => {
    if (!allVehicles.length) return; // wait for initial load
    const params = {};
    if (cityFilter) params.city = cityFilter;
    if (makeFilter) params.make = makeFilter;
    if (modelFilter) params.model = modelFilter;
    if (fuelFilter && fuelFilter !== "All") params.fuel = fuelFilter;
    loadFilteredVehicles(params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityFilter, makeFilter, modelFilter, fuelFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedVehicleSearchInput(collapseSpaces(vehicleSearchInput));
    }, 180);
    return () => clearTimeout(handle);
  }, [vehicleSearchInput]);

  const vehicleSearchOptions = useMemo(() => {
    const q = normalizeText(debouncedVehicleSearchInput);
    if (q.length < 2) return [];
    const dedup = new Map();
    allVehicles.forEach((row) => {
      if (!showDiscontinued && row?.isDiscontinued) return;
      const make = collapseSpaces(row?.make);
      const model = collapseSpaces(row?.model);
      if (!make || !model || make === "N/A" || model === "N/A") return;
      const hay = normalizeText(`${make} ${model}`);
      if (!hay.includes(q)) return;
      const key = `${normalizeText(make)}|${normalizeText(model)}`;
      if (dedup.has(key)) return;
      dedup.set(key, {
        value: `${make} ${model}`.trim(),
        make,
        model,
        label: (
          <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
            {make} {model}
          </span>
        ),
      });
    });
    return Array.from(dedup.values()).slice(0, 30);
  }, [allVehicles, debouncedVehicleSearchInput, showDiscontinued]);

  const handleVehicleSearchSelect = (value, option) => {
    const make = collapseSpaces(option?.make || "");
    const model = collapseSpaces(option?.model || "");
    const raw = collapseSpaces(value || "");

    if (make) setMakeFilter(make);
    if (model) setModelFilter(model);
    setVariantFilter("");

    if (!make || !model) {
      const parts = raw.split(" ").filter(Boolean);
      if (parts.length >= 2) {
        const maybeMake = parts[0];
        const maybeModel = parts[1];
        setMakeFilter((prev) => prev || maybeMake);
        setModelFilter((prev) => prev || maybeModel);
      }
    }

    setVehicleSearchInput(raw || `${make} ${model}`.trim());
  };

  useEffect(() => {
    setVisibleCount(30);
  }, [
    vehicleSearchInput,
    makeFilter,
    modelFilter,
    fuelFilter,
    variantFilter,
    cityFilter,
    budgetFilter,
    priceSort,
    showDiscontinued,
  ]);

  // Dropdown option lists always computed from the full unfiltered set
  const uniqueMakes = useMemo(
    () => [...new Set(allVehicles.map((v) => v.make))].sort(),
    [allVehicles],
  );

  const uniqueModels = useMemo(() => {
    if (!makeFilter) return [];
    return [
      ...new Set(
        allVehicles.filter((v) => v.make === makeFilter).map((v) => v.model),
      ),
    ].sort();
  }, [allVehicles, makeFilter]);

  const uniqueVariantOptions = useMemo(() => {
    let list = allVehicles;
    if (makeFilter) list = list.filter((v) => v.make === makeFilter);
    if (modelFilter) list = list.filter((v) => v.model === modelFilter);
    const rawVariants = [
      ...new Set(list.map((v) => v.variant).filter((x) => !!x && x !== "N/A")),
    ];
    return rawVariants
      .map((rawVariant) => ({
        value: rawVariant,
        label: buildVariantDisplayLabel(rawVariant, makeFilter, modelFilter),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allVehicles, makeFilter, modelFilter]);

  const uniqueCities = useMemo(
    () =>
      [
        ...new Set(
          allVehicles.map((v) => v.city).filter((x) => !!x && x !== "N/A"),
        ),
      ].sort(),
    [allVehicles],
  );

  const allFuelsPresent = useMemo(() => {
    const set = new Set();
    allVehicles.forEach((v) => {
      const f = v.fuel || "";
      if (!f || f === "N/A") return;
      set.add(normalizeFuelLabel(f));
    });
    return set;
  }, [allVehicles]);

  const formatCurrency = (amount) => {
    if (!amount || Number(amount) <= 0) return "₹ 0";
    return `₹ ${Number(amount).toLocaleString("en-IN")}`;
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
    setVehicleSearchInput("");
    setDebouncedVehicleSearchInput("");
    setCityFilter("Delhi");
    setMakeFilter("");
    setModelFilter("");
    setFuelFilter("");
    setVariantFilter("");
    setBudgetFilter("");
    setShowDiscontinued(false);
  };

  const applySimilarCarSelection = useCallback((idea) => {
    const make = collapseSpaces(idea?.make);
    const model = collapseSpaces(idea?.model);
    if (!make || !model) return;
    setMakeFilter(make);
    setModelFilter(model);
    setVariantFilter("");
    setVehicleSearchInput(`${make} ${model}`);
    setDebouncedVehicleSearchInput(`${make} ${model}`);
  }, []);

  const handleRowActionSelect = (record) => {
    if (onSelectVehicle) {
      onSelectVehicle(record);
      message.success(
        `Selected: ${record.make} ${record.model} ${record.variant}`,
      );
    }
  };

  // ─── Action button handlers ─────────────────────────────────────────────────
  const handleCalculateEmi = (v) => {
    setEmiVariant(v);
    setEmiModalOpen(true);
  };

  const handleSendToQuotation = (v) => {
    navigate("/loans/emi-calculator", {
      state: {
        fromVariant: {
          vehicleId: v._id,
          make: v.make,
          model: v.model,
          variant: v.variant,
          price: v.onRoadPrice,
        },
        openQuotation: true,
      },
    });
  };

  const toggleFeaturePanel = async (vehicle) => {
    const vehicleId = String(vehicle?._id || "");
    if (!vehicleId) return;

    setFeaturePanelOpenByVehicleId((prev) => ({
      ...prev,
      [vehicleId]: !prev[vehicleId],
    }));

    if (featureByVehicleId[vehicleId] !== undefined) return;
    if (featureLoadingByVehicleId[vehicleId]) return;

    setFeatureLoadingByVehicleId((prev) => ({ ...prev, [vehicleId]: true }));
    try {
      const res = await featuresApi.getBySelection({
        make: vehicle?.make,
        model: vehicle?.model,
        variant: vehicle?.variant,
        vehicleId: vehicle?._id,
      });
      const rows = Array.isArray(res?.data) ? res.data : [];
      setFeatureByVehicleId((prev) => ({ ...prev, [vehicleId]: rows }));
    } catch (err) {
      console.error("Feature panel load error", err);
      setFeatureByVehicleId((prev) => ({ ...prev, [vehicleId]: [] }));
    } finally {
      setFeatureLoadingByVehicleId((prev) => ({ ...prev, [vehicleId]: false }));
    }
  };

  // ─── Filtered vehicles ──────────────────────────────────────────────────────
  const filteredVehicles = useMemo(() => {
    let filtered = [...vehicles];

    // Discontinued toggle – applied first so stats are consistent
    if (!showDiscontinued) {
      filtered = filtered.filter((v) => !v.isDiscontinued);
    }

    if (cityFilter) {
      filtered = filtered.filter((v) => cityMatches(v.city, cityFilter));
    }
    if (makeFilter) {
      filtered = filtered.filter((v) => v.make === makeFilter);
    }
    if (modelFilter) {
      filtered = filtered.filter((v) => v.model === modelFilter);
    }
    if (fuelFilter && fuelFilter !== "All") {
      if (fuelFilter === "Hybrid") {
        filtered = filtered.filter((v) => isHybridFuel(v.fuel));
      } else {
        // Match by normalised label so "Petrol" etc. work exactly
        filtered = filtered.filter(
          (v) => normalizeFuelLabel(v.fuel) === fuelFilter,
        );
      }
    }
    if (variantFilter) {
      filtered = filtered.filter((v) => v.variant === variantFilter);
    }

    if (budgetFilter) {
      filtered = filtered.filter((v) => {
        const p = v.onRoadPrice || 0;
        if (budgetFilter === "1-5") return p >= 1_00_000 && p <= 5_00_000;
        if (budgetFilter === "5-10") return p > 5_00_000 && p <= 10_00_000;
        if (budgetFilter === "10-15") return p > 10_00_000 && p <= 15_00_000;
        if (budgetFilter === "15-20") return p > 15_00_000 && p <= 20_00_000;
        if (budgetFilter === "20-35") return p > 20_00_000 && p <= 35_00_000;
        if (budgetFilter === "35-50") return p > 35_00_000 && p <= 50_00_000;
        if (budgetFilter === "50-100") return p > 50_00_000 && p <= 1_00_00_000;
        if (budgetFilter === "100+") return p > 1_00_00_000;
        return true;
      });
    }

    filtered.sort((a, b) => {
      const aPrice = a.onRoadPrice || 0;
      const bPrice = b.onRoadPrice || 0;
      return priceSort === "asc" ? aPrice - bPrice : bPrice - aPrice;
    });

    return filtered;
  }, [
    vehicles,
    cityFilter,
    makeFilter,
    modelFilter,
    fuelFilter,
    variantFilter,
    budgetFilter,
    priceSort,
    showDiscontinued,
  ]);

  const stats = useMemo(() => {
    const total = filteredVehicles.length;
    const active = filteredVehicles.filter((v) => !v.isDiscontinued).length;
    const discontinued = filteredVehicles.filter(
      (v) => v.isDiscontinued,
    ).length;
    const makes = new Set(filteredVehicles.map((v) => v.make)).size;
    return { total, active, discontinued, makes };
  }, [filteredVehicles]);

  useEffect(() => {
    let ignore = false;

    if (!makeFilter || !modelFilter) {
      setBaseModelContext(null);
      setSimilarCarsIdeas([]);
      setSimilarCarsLoading(false);
      return () => {
        ignore = true;
      };
    }

    const loadSimilarCars = async () => {
      setSimilarCarsLoading(true);
      try {
        const payload = await vehiclesApi.getSimilarModels({
          make: makeFilter,
          model: modelFilter,
          city: cityFilter || undefined,
          includeDiscontinued: showDiscontinued,
          tolerance: 0.15,
          limit: 5,
        });
        if (ignore) return;

        const base = payload?.baseModel || null;
        const metadataReady = Boolean(
          base?.metadataReady !== false &&
            base?.bodyTypeBucket &&
            Number(base?.seatingCapacity || 0) > 0,
        );
        const normalizedBase = base
          ? {
              make: collapseSpaces(base?.make || makeFilter),
              model: collapseSpaces(base?.model || modelFilter),
              basePrice: Number(base?.basePrice || 0),
              bodyType:
                collapseSpaces(base?.bodyType || "") ||
                formatBodyType(base?.bodyTypeBucket || ""),
              bodyTypeBucket: normalizeText(base?.bodyTypeBucket || ""),
              seatCount: Number(base?.seatingCapacity || 0) || null,
              metadataReady,
            }
          : null;
        setBaseModelContext(normalizedBase);

        const sourceRows = Array.isArray(payload?.data) ? payload.data : [];
        const basePrice = Number(normalizedBase?.basePrice || 0);
        const ideas = sourceRows
          .map((row) => {
            const startingPrice = Number(row?.startingPrice || row?.basePrice || 0);
            const seatCount = Number(row?.seatingCapacity || row?.seatCount || 0) || null;
            if (!startingPrice) return null;
            return {
              make: collapseSpaces(row?.make || ""),
              model: collapseSpaces(row?.model || ""),
              startingPrice,
              bodyType: collapseSpaces(row?.bodyType || normalizedBase?.bodyType || ""),
              seatCount,
              aiInsight: buildPriceDeltaInsight(
                basePrice,
                startingPrice,
                row?.bodyType || normalizedBase?.bodyType || "",
                seatCount,
              ),
            };
          })
          .filter(Boolean);
        setSimilarCarsIdeas(ideas);
      } catch (error) {
        if (ignore) return;
        console.error("Failed to load AI similar cars", error);
        setBaseModelContext(null);
        setSimilarCarsIdeas([]);
      } finally {
        if (!ignore) setSimilarCarsLoading(false);
      }
    };

    loadSimilarCars();
    return () => {
      ignore = true;
    };
  }, [cityFilter, makeFilter, modelFilter, showDiscontinued]);

  const activeGalleryVehicle = useMemo(() => {
    if (galleryVehicleId) {
      return (
        filteredVehicles.find((v) => String(v._id) === String(galleryVehicleId)) ||
        allVehicles.find((v) => String(v._id) === String(galleryVehicleId)) ||
        null
      );
    }

    if (makeFilter && modelFilter) {
      return (
        filteredVehicles.find(
          (v) =>
            normalizeText(v?.make) === normalizeText(makeFilter) &&
            normalizeText(v?.model) === normalizeText(modelFilter),
        ) ||
        allVehicles.find(
          (v) =>
            normalizeText(v?.make) === normalizeText(makeFilter) &&
            normalizeText(v?.model) === normalizeText(modelFilter),
        ) ||
        null
      );
    }

    return null;
  }, [allVehicles, filteredVehicles, galleryVehicleId, makeFilter, modelFilter]);

  useEffect(() => {
    setGalleryVehicleId(null);
  }, [makeFilter, modelFilter]);

  // ─── Gallery: local-data fallback builder ───────────────────────────────────
  const computeLocalGalleryMedia = useCallback(
    (activeVehicle) => {
      if (!activeVehicle) return [];

      const makeKey = normalizeText(getVehicleMake(activeVehicle));
      const modelKey = normalizeText(getVehicleModel(activeVehicle));
      const variantKey = normalizeText(getVehicleVariant(activeVehicle));

      const variantScoped = vehicles.filter((vehicle) => {
        const image = getVehicleImage(vehicle);
        if (!image) return false;
        return (
          normalizeText(getVehicleMake(vehicle)) === makeKey &&
          normalizeText(getVehicleModel(vehicle)) === modelKey &&
          normalizeText(getVehicleVariant(vehicle)) === variantKey
        );
      });

      const modelScoped = vehicles.filter((vehicle) => {
        const image = getVehicleImage(vehicle);
        if (!image) return false;
        return (
          normalizeText(getVehicleMake(vehicle)) === makeKey &&
          normalizeText(getVehicleModel(vehicle)) === modelKey
        );
      });

      const source = variantScoped.length ? variantScoped : modelScoped;
      const unique = [];
      const seen = new Set();

      source.forEach((vehicle) => {
        const key = buildMediaKey(vehicle);
        if (seen.has(key)) return;
        seen.add(key);
        unique.push({
          image: getVehicleImage(vehicle),
          color: getVehicleColor(vehicle) || "Default",
          hex: getVehicleHex(vehicle),
          make: getVehicleMake(vehicle),
          model: getVehicleModel(vehicle),
          variant: getVehicleVariant(vehicle),
        });
      });

      return unique;
    },
    [vehicles],
  );

  // ─── Gallery: fetch from API when active vehicle changes ────────────────────
  useEffect(() => {
    if (!activeGalleryVehicle) {
      setGalleryMedia([]);
      return;
    }

    const make = getVehicleMake(activeGalleryVehicle);
    const model = getVehicleModel(activeGalleryVehicle);
    const variant = galleryVehicleId ? getVehicleVariant(activeGalleryVehicle) : null;

    vehiclesApi
      .getMedia(make, model, variant)
      .then((result) => {
        const items = toArray(result);
        if (items.length) {
          const unique = [];
          const seen = new Set();
          items.forEach((item) => {
            const key = buildMediaKey(item);
            if (seen.has(key)) return;
            seen.add(key);
            unique.push({
              image: getVehicleImage(item),
              color: getVehicleColor(item) || "Default",
              hex: getVehicleHex(item),
              make: getVehicleMake(item),
              model: getVehicleModel(item),
              variant: getVehicleVariant(item),
            });
          });
          setGalleryMedia(unique);
        } else {
          // Fallback: scan local vehicles array for images
          setGalleryMedia(computeLocalGalleryMedia(activeGalleryVehicle));
        }
      })
      .catch(() => {
        setGalleryMedia(computeLocalGalleryMedia(activeGalleryVehicle));
      });
  }, [activeGalleryVehicle, computeLocalGalleryMedia, galleryVehicleId]);

  useEffect(() => {
    setActiveMediaIndex(0);
  }, [galleryVehicleId]);

  const activeMedia = galleryMedia[activeMediaIndex] || null;

  useEffect(() => {
    setMainColorImageMeta(null);
  }, [activeMedia?.image]);

  // Gallery loads only when user explicitly clicks a variant row — no auto-selection on start.

  useEffect(() => {
    if (!galleryMedia.length) {
      setActiveMediaIndex(0);
      return;
    }
    if (activeMediaIndex > galleryMedia.length - 1) {
      setActiveMediaIndex(0);
    }
  }, [galleryMedia, activeMediaIndex]);

  const selectedColorPreviewTuning = useMemo(() => {
    const safeAspect =
      Number(mainColorImageMeta?.width) > 0 &&
      Number(mainColorImageMeta?.height) > 0
        ? Number(mainColorImageMeta.width) / Number(mainColorImageMeta.height)
        : 1.8;

    const minHeight = safeAspect >= 1.9 ? 320 : safeAspect >= 1.7 ? 340 : 360;
    const maxHeight = safeAspect >= 1.9 ? 500 : safeAspect >= 1.7 ? 530 : 560;
    const scale = 1;
    const focusY = 50;
    return { scale, focusY, minHeight, maxHeight };
  }, [mainColorImageMeta?.width, mainColorImageMeta?.height]);

  const goToPreviousMedia = () => {
    if (!galleryMedia.length) return;
    setActiveMediaIndex((current) =>
      current === 0 ? galleryMedia.length - 1 : current - 1,
    );
  };

  const goToNextMedia = () => {
    if (!galleryMedia.length) return;
    setActiveMediaIndex((current) =>
      current === galleryMedia.length - 1 ? 0 : current + 1,
    );
  };

  // ─── Fuel bucketing (normalise hybrid variants) ─────────────────────────────
  const vehiclesByFuel = useMemo(() => {
    const map = {};
    filteredVehicles.forEach((v) => {
      const fuel = normalizeFuelLabel(v.fuel) || "Unknown";
      if (!map[fuel]) map[fuel] = [];
      map[fuel].push(v);
    });
    return map;
  }, [filteredVehicles]);

  const medianOnRoad = useMemo(() => {
    if (!filteredVehicles.length) return 0;
    const sorted = [...filteredVehicles]
      .map((v) => v.onRoadPrice || 0)
      .sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }, [filteredVehicles]);

  const firstFuelWithData =
    ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"].find(
      (f) => vehiclesByFuel[f]?.length,
    ) || Object.keys(vehiclesByFuel)[0];

  // null = "All" mode (show every filtered variant); string = show that fuel's bucket
  const activeFuel = !fuelFilter || fuelFilter === "All" ? null : fuelFilter;

  const variantsForActiveFuel = activeFuel
    ? vehiclesByFuel[activeFuel] || []
    : filteredVehicles; // "All" selected → show entire filtered list

  // ─── Fuel tag colour helper ─────────────────────────────────────────────────
  const fuelTagClass = (rawFuel) => {
    const label = normalizeFuelLabel(rawFuel);
    if (label === "Petrol")
      return "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200";
    if (label === "Diesel")
      return "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200";
    if (label === "Hybrid")
      return "bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200";
    if (label === "Electric")
      return "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200";
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200";
  };

  // ─── Skeleton loader ────────────────────────────────────────────────────────
  const SkeletonCard = () => (
    <div className="px-6 md:px-8 py-4 border-b border-slate-100 dark:border-[#262626] animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 rounded-full bg-slate-200 dark:bg-[#2a2a2a]" />
          <div className="h-3 w-32 rounded-full bg-slate-100 dark:bg-[#222]" />
          <div className="h-5 w-20 rounded-full bg-slate-100 dark:bg-[#222]" />
        </div>
        <div className="h-7 w-28 rounded-full bg-slate-200 dark:bg-[#2a2a2a]" />
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-8">
      <div className="app-max-wrap space-y-4 pb-16">
        {/* ── Hero header ── */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-[#0f0f0f] dark:via-[#1a1a1a] dark:to-[#0f0f0f] px-6 py-6 md:px-10 md:py-8 shadow-xl">
          {/* subtle grid texture */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-white/80 tracking-wide uppercase mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Price Intelligence
              </div>
              <h1 className="text-[32px] md:text-[40px] font-black text-white leading-none tracking-tight">
                Vehicle Price List
              </h1>
              <p className="mt-2 text-sm text-white/50">
                On‑road prices · Updated {new Date().toLocaleDateString("en-IN")}
              </p>
            </div>

            {/* Live stat chips */}
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 border border-white/15 px-5 py-3 min-w-[100px]">
                <span className="text-[28px] font-black text-white leading-none">{stats.active}</span>
                <span className="text-[11px] text-white/60 mt-1 font-medium">Active Variants</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 border border-white/15 px-5 py-3 min-w-[100px]">
                <span className="text-[28px] font-black text-emerald-400 leading-none">{stats.total}</span>
                <span className="text-[11px] text-white/60 mt-1 font-medium">Listings</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 border border-white/15 px-5 py-3 min-w-[100px]">
                <div className="flex items-center gap-1.5">
                  <Icon name="MapPin" size={13} className="text-white/60" />
                  <span className="text-[14px] font-bold text-white leading-none">{cityFilter || "All"}</span>
                </div>
                <span className="text-[11px] text-white/60 mt-1 font-medium">{stats.makes} makes</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px,minmax(0,1fr)] gap-4 mt-2 items-start">
          {/* ── Left: filter panel ── */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-lg shadow-slate-200/60 dark:shadow-black/40 border border-slate-100 dark:border-[#262626] px-5 py-5 flex flex-col gap-4 h-auto sticky top-24">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Filters
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Search and refine variants by brand, model and price.
              </p>
            </div>

            {/* City */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                City
              </label>
              <Select
                placeholder="City"
                value={cityFilter || undefined}
                onChange={(v) => setCityFilter(v || "")}
                allowClear
                className="w-full"
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {uniqueCities.map((city) => (
                  <Option key={city} value={city}>
                    {city}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Search
              </label>
              <AutoComplete
                className="w-full"
                value={vehicleSearchInput}
                options={vehicleSearchOptions}
                onChange={(value) => setVehicleSearchInput(value)}
                onSelect={handleVehicleSearchSelect}
                placeholder="Search make/model (e.g. Kia Carens, BMW X5)"
                filterOption={false}
                notFoundContent={
                  vehicleSearchInput.trim().length < 2
                    ? "Type at least 2 letters"
                    : "No matching vehicle found"
                }
              />
            </div>

            {/* Make */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Make
              </label>
              <Select
                placeholder="Any make"
                value={makeFilter || undefined}
                onChange={handleMakeChange}
                allowClear
                className="w-full"
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {uniqueMakes.map((make) => (
                  <Option key={make} value={make}>
                    {make}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Model
              </label>
              <Select
                placeholder="Any model"
                value={modelFilter || undefined}
                onChange={handleModelChange}
                allowClear
                className="w-full"
                disabled={!makeFilter}
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {uniqueModels.map((model) => (
                  <Option key={model} value={model}>
                    {model}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Variant */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Variant
              </label>
              <Select
                placeholder="Any variant"
                value={variantFilter || undefined}
                onChange={(v) => setVariantFilter(v || "")}
                allowClear
                className="w-full"
                disabled={!makeFilter && !modelFilter}
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {uniqueVariantOptions.map((variantOption) => (
                  <Option key={variantOption.value} value={variantOption.value}>
                    {variantOption.label}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Show Discontinued toggle */}
            <div className="flex items-center gap-2.5 py-1">
              <input
                id="show-discontinued"
                type="checkbox"
                checked={showDiscontinued}
                onChange={(e) => setShowDiscontinued(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
              />
              <label
                htmlFor="show-discontinued"
                className="text-[12px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none"
              >
                Show Discontinued
              </label>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Sort by
              </label>
              <Select
                size="middle"
                value={priceSort}
                onChange={setPriceSort}
                className="w-full"
              >
                <Option value="asc">Price: Low to High</Option>
                <Option value="desc">Price: High to Low</Option>
              </Select>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Budget (on‑road)
              </label>
              <Select
                placeholder="Any budget"
                value={budgetFilter || undefined}
                onChange={(v) => setBudgetFilter(v || "")}
                allowClear
                className="w-full"
              >
                <Option value="1-5">₹1–5 Lakh</Option>
                <Option value="5-10">₹5–10 Lakh</Option>
                <Option value="10-15">₹10–15 Lakh</Option>
                <Option value="15-20">₹15–20 Lakh</Option>
                <Option value="20-35">₹20–35 Lakh</Option>
                <Option value="35-50">₹35–50 Lakh</Option>
                <Option value="50-100">₹50 Lakh–1 Cr</Option>
                <Option value="100+">Above 1 Cr</Option>
              </Select>
            </div>

            {/* Clear */}
            <div className="pt-1">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="w-full border-slate-200 dark:border-[#383838] hover:bg-slate-50 dark:hover:bg-[#262626]"
              >
                <Icon name="X" size={14} />
                Clear all
              </Button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-[#2a2a2a]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
                  AI Similar Cars
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200/70 dark:border-violet-800/50">
                  ±15%
                </span>
              </div>

              {!baseModelContext ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Select make and model to see similar options by body type and seating.
                </p>
              ) : similarCarsLoading ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Loading strict body type + seating matches...
                </p>
              ) : !baseModelContext.metadataReady ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Body type or seating data is missing for this model, so strict AI matching is paused.
                </p>
              ) : !similarCarsIdeas.length ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  No close matches found for {baseModelContext.bodyType || "this body type"} and{" "}
                  {baseModelContext.seatCount ? `${baseModelContext.seatCount}-seater` : "this seating class"}.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {similarCarsIdeas.map((idea) => (
                    <button
                      key={`${idea.make}-${idea.model}`}
                      type="button"
                      onClick={() => applySimilarCarSelection(idea)}
                      className="w-full text-left rounded-xl border border-slate-200 dark:border-[#353535] bg-slate-50/80 dark:bg-[#222] px-3 py-2.5 hover:bg-white dark:hover:bg-[#292929] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100 truncate">
                            {idea.make} {idea.model}
                          </div>
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                            From {formatCurrency(idea.startingPrice)}
                          </div>
                        </div>
                        <Icon
                          name="ArrowUpRight"
                          size={14}
                          className="text-slate-400 shrink-0"
                        />
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {idea.bodyType ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#2a2a2a] text-slate-600 dark:text-slate-300">
                            {idea.bodyType}
                          </span>
                        ) : null}
                        {idea.seatCount ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#2a2a2a] text-slate-600 dark:text-slate-300">
                            {idea.seatCount}-seater
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                        {idea.aiInsight}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: gallery + variants ── */}
          <div className="flex flex-col gap-3">
            {/* ── Color Gallery card ── */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-lg shadow-slate-200/60 dark:shadow-black/40 border border-slate-100 dark:border-[#262626] overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 md:px-7 border-b border-slate-100 dark:border-[#262626] flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-transparent dark:from-[#1f1f1f] dark:to-transparent">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Color Gallery</p>
                  <h2 className="mt-0.5 text-[15px] font-bold text-slate-900 dark:text-slate-100">
                    {activeGalleryVehicle
                      ? `${getVehicleMake(activeGalleryVehicle)} ${getVehicleModel(activeGalleryVehicle)}`
                      : "Select make and model to preview"}
                  </h2>
                  {activeGalleryVehicle && (
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {getVehicleVariant(activeGalleryVehicle)} · {galleryMedia.length} color{galleryMedia.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                {activeMedia && (
                  <div className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-[#262626] px-3 py-1.5">
                    <span className="h-3 w-3 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: activeMedia.hex || "#d1d5db" }} />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{activeMedia.color}</span>
                  </div>
                )}
              </div>

              {!activeGalleryVehicle ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#262626] flex items-center justify-center">
                    <Icon name="Image" size={22} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Choose make and model from filters or search to load photos</p>
                </div>
              ) : !galleryMedia.length ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#262626] flex items-center justify-center">
                    <Icon name="ImageOff" size={22} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No photos available for this variant yet</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {activeMedia?.image && (
                    <div
                      className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#2a2a2a] bg-gradient-to-b from-slate-100 to-slate-50 dark:from-[#151515] dark:to-[#101010]"
                      style={{
                        height: `clamp(${selectedColorPreviewTuning.minHeight}px, 56vh, ${selectedColorPreviewTuning.maxHeight}px)`,
                      }}
                    >
                      <div
                        className="absolute inset-0 opacity-50 blur-2xl"
                        style={{
                          backgroundImage: `url(${activeMedia.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: `50% ${selectedColorPreviewTuning.focusY}%`,
                          transform: `scale(${Math.max(
                            1.05,
                            selectedColorPreviewTuning.scale - 0.08,
                          )})`,
                        }}
                      />

                      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
                        <button
                          type="button"
                          onClick={goToPreviousMedia}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-slate-800 shadow backdrop-blur-sm hover:bg-white transition-all active:scale-95"
                        >
                          <Icon name="ChevronLeft" size={17} />
                        </button>
                        <div className="flex items-center gap-2 rounded-full bg-black/35 backdrop-blur-sm px-2.5 py-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/30 flex-shrink-0"
                            style={{ backgroundColor: activeMedia.hex || "#d1d5db" }}
                          />
                          <span className="text-[10px] font-semibold text-white leading-none">
                            {activeMedia.color || "Default"}
                          </span>
                          <span className="text-[10px] font-semibold text-white/80">
                            {activeMediaIndex + 1}/{galleryMedia.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={goToNextMedia}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-slate-800 shadow backdrop-blur-sm hover:bg-white transition-all active:scale-95"
                        >
                          <Icon name="ChevronRight" size={17} />
                        </button>
                      </div>

                      <img
                        src={activeMedia.image}
                        alt={`${activeMedia.make} ${activeMedia.model} ${activeMedia.variant} ${activeMedia.color}`}
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
                      />
                    </div>
                  )}

                  <div className="flex gap-2 overflow-x-auto pb-0.5">
                    {galleryMedia.map((media, index) => {
                      const active = index === activeMediaIndex;
                      return (
                        <button
                          key={`${media.image}-${media.color}-${index}`}
                          type="button"
                          onClick={() => setActiveMediaIndex(index)}
                          className={`flex-shrink-0 w-[88px] rounded-xl border-2 p-1.5 text-left transition-all duration-150 ${
                            active
                              ? "border-violet-500 dark:border-violet-400 bg-violet-50/50 dark:bg-violet-900/20 shadow-md"
                              : "border-transparent bg-slate-50 dark:bg-[#1e1e1e] hover:border-slate-200 dark:hover:border-[#383838] hover:shadow-sm"
                          }`}
                        >
                          <div className="h-14 w-full overflow-hidden rounded-lg bg-white dark:bg-[#111] flex items-center justify-center mb-1.5">
                            {media.image ? (
                              <img
                                src={media.image}
                                alt={media.color || "Vehicle color"}
                                className="h-full w-full object-contain p-0.5"
                                loading="lazy"
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
                              style={{ backgroundColor: media.hex || "#d1d5db" }}
                            />
                            <span className="truncate text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                              {media.color}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Variants & Pricing card ── */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-lg shadow-slate-200/60 dark:shadow-black/40 border border-slate-100 dark:border-[#262626] overflow-hidden">
              <div className="px-6 py-4 md:px-8 md:py-4 border-b border-slate-100 dark:border-[#262626] flex flex-col gap-3 bg-gradient-to-r from-slate-50 to-transparent dark:from-[#1f1f1f] dark:to-transparent">
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                    Variants &amp; Pricing
                  </h2>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#262626] px-3 py-1 rounded-full">
                    {filteredVehicles.length} variants
                  </span>
                </div>

                {/* Fuel filter pills */}
                <div className="flex flex-wrap gap-2">
                  {FUEL_ORDER.map((fuel) => {
                    if (fuel === "All") {
                      const isActive = !fuelFilter || fuelFilter === "All";
                      return (
                        <button
                          key={fuel}
                          onClick={() => setFuelFilter(isActive ? "" : "All")}
                          className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium border transition ${
                            isActive
                              ? "bg-violet-600 text-white border-violet-600"
                              : "bg-gray-50 dark:bg-[#262626] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#383838]"
                          }`}
                        >
                          All
                        </button>
                      );
                    }

                    const existsInData = allFuelsPresent.has(fuel);
                    const hasVariantsInFilter = !!vehiclesByFuel[fuel]?.length;
                    const isActive = fuelFilter === fuel;

                    return (
                      <button
                        key={fuel}
                        onClick={() =>
                          existsInData
                            ? setFuelFilter(isActive ? "" : fuel)
                            : null
                        }
                        className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium border transition ${
                          existsInData
                            ? hasVariantsInFilter
                              ? isActive
                                ? "bg-violet-600 text-white border-violet-600"
                                : "bg-gray-50 dark:bg-[#262626] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#383838]"
                              : "bg-gray-100 dark:bg-[#262626] text-gray-400 dark:text-gray-500 border-dashed border-gray-200 dark:border-[#383838] cursor-default"
                            : "bg-gray-100 dark:bg-[#171717] text-gray-500 dark:text-gray-600 border-dashed border-gray-200 dark:border-[#262626] cursor-default opacity-50"
                        }`}
                      >
                        {fuel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {loading ? (
                <div className="divide-y divide-slate-100 dark:divide-[#262626]">
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#262626] flex items-center justify-center">
                    <Icon name="SearchX" size={22} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No variants match your filters</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Try adjusting your search or clearing filters</p>
                </div>
              ) : variantsForActiveFuel.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#262626] flex items-center justify-center">
                    <Icon name="Fuel" size={22} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No {fuelFilter} variants with current filters</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-[#262626]">
                  {variantsForActiveFuel.slice(0, visibleCount).map((v) => {
                    const isBestValue =
                      !v.isDiscontinued &&
                      v.onRoadPrice &&
                      medianOnRoad &&
                      Math.abs(v.onRoadPrice - medianOnRoad) / medianOnRoad <= 0.15;

                    return (
                      <details key={v._id} className="group">
                        <summary
                          className="flex items-center justify-between gap-3 px-6 md:px-8 py-4 cursor-pointer select-none bg-white dark:bg-[#1a1a1a] hover:bg-slate-50/80 dark:hover:bg-[#202020] transition-colors duration-150"
                          onClick={() => setGalleryVehicleId(v._id)}
                        >
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">
                              {v.model}{" "}
                              <span className="font-medium text-slate-500 dark:text-slate-400">
                                ({buildVariantDisplayLabel(v.variant, v.make, v.model)})
                              </span>
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {v.make} · {v.city || "City not set"}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {v.fuel && v.fuel !== "N/A" && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${fuelTagClass(v.fuel)}`}>
                                  {normalizeFuelLabel(v.fuel)}
                                </span>
                              )}
                              {v.isDiscontinued && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-bold">
                                  DISCONTINUED
                                </span>
                              )}
                              {isBestValue && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40 font-semibold">
                                  ★ Best Value
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">On‑road</div>
                              <div className="text-[17px] font-black text-slate-900 dark:text-slate-50 leading-tight">
                                {formatCurrency(v.onRoadPrice)}
                              </div>
                            </div>
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-[#2a2a2a] flex items-center justify-center transition-transform group-open:rotate-180">
                              <Icon name="ChevronDown" size={14} className="text-slate-500" />
                            </div>
                          </div>
                        </summary>

                        {/* Expanded pricing + actions */}
                        <div className="px-6 md:px-8 pb-5 pt-1 bg-slate-50/60 dark:bg-[#141414]">
                          {(() => {
                            const pricing = v.pricingBreakup || buildVehiclePricingSnapshot(v);
                            const additionLines = Array.isArray(pricing?.additionLines) ? pricing.additionLines : [];
                            const onRoad = Number(pricing?.onRoadBeforeDiscount) || Number(pricing?.netOnRoad) || v.onRoadPrice || 0;
                            return (
                              <>
                                {/* Pricing breakdown */}
                                <div className="mt-3 rounded-2xl border border-slate-200 dark:border-[#262626] bg-white dark:bg-[#1f1f1f] px-4 py-3 space-y-2.5 text-xs md:text-sm shadow-sm">
                                  {additionLines.map((row) => (
                                    <div key={`add-${row.key}`} className="flex justify-between">
                                      <span className="text-slate-500 dark:text-slate-400">{row.label}</span>
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(row.amount)}</span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-[#262626]">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">On-road Total</span>
                                    <span className="text-[15px] font-black text-slate-900 dark:text-slate-50">{formatCurrency(onRoad)}</span>
                                  </div>
                                </div>

                                {/* Action buttons */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    onClick={() => handleCalculateEmi(v)}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-[12px] font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200 dark:shadow-none"
                                  >
                                    <Icon name="Calculator" size={13} />
                                    EMI Planner
                                  </button>
                                  <button
                                    onClick={() => handleSendToQuotation(v)}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 text-white text-[12px] font-bold hover:bg-violet-700 active:scale-95 transition-all shadow-sm shadow-violet-200 dark:shadow-none"
                                  >
                                    <Icon name="FileText" size={13} />
                                    Send to Quotation
                                  </button>
                                  <button
                                    onClick={() => toggleFeaturePanel(v)}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#383838] text-slate-700 dark:text-slate-200 text-[12px] font-bold hover:bg-white dark:hover:bg-[#262626] active:scale-95 transition-all"
                                  >
                                    <Icon name="List" size={13} />
                                    {featurePanelOpenByVehicleId[String(v._id)]
                                      ? "Hide Features"
                                      : "Full Features"}
                                  </button>
                                </div>

                                {featurePanelOpenByVehicleId[String(v._id)] && (
                                  <div className="mt-3 rounded-2xl border border-slate-200 dark:border-[#262626] bg-white dark:bg-[#1f1f1f] p-3">
                                    {featureLoadingByVehicleId[String(v._id)] ? (
                                      <div className="space-y-2">
                                        {[...Array(6)].map((_, i) => (
                                          <div
                                            key={i}
                                            className="flex items-center justify-between gap-3 animate-pulse"
                                          >
                                            <div className="h-3 bg-slate-100 dark:bg-neutral-800 rounded w-2/3" />
                                            <div className="h-3 bg-slate-100 dark:bg-neutral-800 rounded w-12" />
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      (() => {
                                        const vehicleId = String(v._id || "");
                                        const allFeatures =
                                          featureByVehicleId[vehicleId] || [];
                                        const displayFeatures = allFeatures.filter((feature) =>
                                          hasDisplayableFeatureValue(feature?.value),
                                        );
                                        const panelSearch =
                                          featurePanelSearchByVehicleId[vehicleId] || "";
                                        const panelSearchLower = panelSearch.toLowerCase();

                                        const categorySet = new Set(
                                          displayFeatures.map((feature) =>
                                            collapseSpaces(feature?.category || "Others") || "Others",
                                          ),
                                        );
                                        const orderedCategories = [
                                          ...FEATURE_CATEGORY_ORDER.filter((cat) =>
                                            categorySet.has(cat),
                                          ),
                                          ...Array.from(categorySet)
                                            .filter(
                                              (cat) =>
                                                !FEATURE_CATEGORY_ORDER.includes(cat),
                                            )
                                            .sort((a, b) => a.localeCompare(b)),
                                        ];

                                        if (!displayFeatures.length) {
                                          return (
                                            <div className="text-[12px] text-slate-500 dark:text-slate-400 py-4 text-center">
                                              No feature data available for this variant.
                                            </div>
                                          );
                                        }

                                        return (
                                          <div className="space-y-3">
                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#181818] border border-slate-100 dark:border-neutral-800 rounded-xl px-3 py-2">
                                              <Icon
                                                name="Search"
                                                size={14}
                                                className="text-slate-400 shrink-0"
                                              />
                                              <input
                                                type="text"
                                                value={panelSearch}
                                                onChange={(event) =>
                                                  setFeaturePanelSearchByVehicleId((prev) => ({
                                                    ...prev,
                                                    [vehicleId]: event.target.value,
                                                  }))
                                                }
                                                placeholder="Search features..."
                                                className="flex-1 bg-transparent outline-none text-[12px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 min-w-0"
                                              />
                                              {panelSearch && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setFeaturePanelSearchByVehicleId((prev) => ({
                                                      ...prev,
                                                      [vehicleId]: "",
                                                    }))
                                                  }
                                                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-neutral-700 shrink-0"
                                                >
                                                  <Icon
                                                    name="X"
                                                    size={10}
                                                    className="text-slate-400"
                                                  />
                                                </button>
                                              )}
                                            </div>

                                            <div className="overflow-y-auto max-h-[52vh] space-y-4 pr-0.5">
                                              {orderedCategories.map((category) => {
                                                const style =
                                                  FEATURE_CATEGORY_STYLES[category] ||
                                                  FEATURE_CATEGORY_STYLES.Others;
                                                let items = displayFeatures.filter(
                                                  (feature) =>
                                                    collapseSpaces(
                                                      feature?.category || "Others",
                                                    ) === category,
                                                );

                                                if (panelSearchLower) {
                                                  items = items.filter((feature) =>
                                                    `${feature?.name || ""} ${
                                                      feature?.value || ""
                                                    }`
                                                      .toLowerCase()
                                                      .includes(panelSearchLower),
                                                  );
                                                }
                                                if (!items.length) return null;

                                                return (
                                                  <div key={category}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                      <span
                                                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`}
                                                      />
                                                      <span
                                                        className={`text-[11px] font-semibold uppercase tracking-wider ${style.color}`}
                                                      >
                                                        {category}
                                                      </span>
                                                      <span className="text-[10px] text-slate-400 dark:text-slate-600">
                                                        {items.length}
                                                      </span>
                                                    </div>

                                                    <div className="rounded-xl border border-slate-100 dark:border-neutral-800 divide-y divide-slate-50 dark:divide-neutral-800/80 overflow-hidden">
                                                      {items.map((feature) => {
                                                        const label = normalizeValueLabel(
                                                          feature?.value,
                                                        );
                                                        const valLower = String(label)
                                                          .toLowerCase()
                                                          .trim();
                                                        const isYes = valLower === "yes";
                                                        const isNo =
                                                          valLower === "not available";
                                                        return (
                                                          <div
                                                            key={`${category}-${feature?.name}`}
                                                            className="flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-[#111111] hover:bg-slate-50/70 dark:hover:bg-[#161616] transition-colors"
                                                          >
                                                            <span className="text-[12px] text-slate-700 dark:text-slate-300 leading-snug min-w-0">
                                                              {feature?.name}
                                                            </span>
                                                            {isYes ? (
                                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 shrink-0">
                                                                <Icon name="Check" size={11} />
                                                                Yes
                                                              </span>
                                                            ) : isNo ? (
                                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 dark:bg-neutral-800 text-slate-400 dark:text-slate-500 shrink-0">
                                                                <Icon name="Minus" size={11} />
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

                                              {panelSearchLower &&
                                                !displayFeatures.some((feature) =>
                                                  `${feature?.name || ""} ${
                                                    feature?.value || ""
                                                  }`
                                                    .toLowerCase()
                                                    .includes(panelSearchLower),
                                                ) && (
                                                  <div className="text-[12px] text-slate-400 py-4 text-center">
                                                    No features match "{panelSearch}"
                                                  </div>
                                                )}
                                            </div>
                                          </div>
                                        );
                                      })()
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}

                          {selectionMode && (
                            <div className="mt-3 flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRowActionSelect(v)}
                                className="border-violet-500 text-violet-600 dark:border-violet-500/70 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30"
                              >
                                <Icon name="Check" size={14} />
                                Select
                              </Button>
                            </div>
                          )}
                        </div>
                      </details>
                    );
                  })}

                  {variantsForActiveFuel.length > visibleCount && (
                    <div className="p-5 flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => setVisibleCount((prev) => prev + 50)}
                        className="text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#383838] hover:bg-slate-50 dark:hover:bg-[#262626] font-semibold"
                      >
                        <Icon name="ChevronDown" size={15} />
                        Load {variantsForActiveFuel.length - visibleCount > 50 ? "50" : variantsForActiveFuel.length - visibleCount} more
                        <span className="ml-1 text-slate-400">({variantsForActiveFuel.length} total)</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sticky footer summary ── */}
        <div className="fixed bottom-4 left-0 right-0 z-20">
          <div className="app-max-wrap px-2">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-white/95 dark:bg-[#1a1a1a]/95 border border-slate-200 dark:border-[#2a2a2a] shadow-2xl shadow-slate-900/15 backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-3 text-sm md:text-base">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {filteredVehicles.length} variants
                </span>
                {filteredVehicles.length > 0 && (
                  <>
                    <span className="text-gray-500 dark:text-gray-400">
                      Ex‑showroom from{" "}
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(
                          Math.min(
                            ...filteredVehicles.map(
                              (v) => v.exShowroom || Infinity,
                            ),
                          ) || 0,
                        )}
                      </span>
                    </span>
                    <span className="hidden md:inline text-gray-500 dark:text-gray-400">
                      • On‑road up to{" "}
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(
                          Math.max(
                            ...filteredVehicles.map((v) => v.onRoadPrice || 0),
                          ) || 0,
                        )}
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <FeaturesEmiCompareModal
          open={emiModalOpen && Boolean(emiVariant)}
          variant={
            emiVariant
              ? {
                  ...emiVariant,
                  exShowroom:
                    Number(emiVariant?.exShowroom) ||
                    Number(emiVariant?.ex_showroom) ||
                    0,
                  onRoadPrice:
                    Number(emiVariant?.onRoadPrice) ||
                    Number(emiVariant?.on_road_price_cardekho) ||
                    0,
                }
              : null
          }
          assumedOnRoadPrice={Number(emiVariant?.exShowroom) || 0}
          onClose={() => {
            setEmiModalOpen(false);
            setEmiVariant(null);
          }}
          onOpenFullCalculator={() => {
            const v = emiVariant;
            if (!v) return;
            const exShowroomPrice =
              Number(v?.exShowroom) || Number(v?.ex_showroom) || 0;
            setEmiModalOpen(false);
            setEmiVariant(null);
            navigate("/loans/emi-calculator", {
              state: {
                fromVariant: {
                  vehicleId: v?._id,
                  make: v?.make,
                  model: v?.model,
                  variant: v?.variant,
                  price: exShowroomPrice,
                },
              },
            });
          }}
        />
      </div>
    </div>
  );
};

export default VehiclePriceList;
