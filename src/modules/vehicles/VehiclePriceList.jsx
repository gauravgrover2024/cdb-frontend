import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Select, message, Tag } from "antd";
import { vehiclesApi } from "../../api/vehicles";
import { featuresApi } from "../../api/features";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import { buildVehiclePricingSnapshot } from "../../utils/vehiclePricingBreakup";

const { Search } = Input;
const { Option } = Select;

const FUEL_ORDER = ["All", "Petrol", "Diesel", "CNG", "Electric", "Hybrid"];

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

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

const VehiclePriceList = ({ onSelectVehicle, selectionMode = false }) => {
  const navigate = useNavigate();

  // allVehicles = full unfiltered set — used only for dropdown option lists
  const [allVehicles, setAllVehicles] = useState([]);
  // vehicles = backend-filtered set (by city/make/model/fuel) — used for display
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [fuelFilter, setFuelFilter] = useState("");
  const [variantFilter, setVariantFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("Delhi");
  const [budgetFilter, setBudgetFilter] = useState("");
  const [brandType, setBrandType] = useState("");
  const [showDiscontinued, setShowDiscontinued] = useState(false);

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [priceSort, setPriceSort] = useState("asc");
  const [galleryVehicleId, setGalleryVehicleId] = useState(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(30);
  const [galleryMedia, setGalleryMedia] = useState([]);

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
    setVisibleCount(30);
  }, [
    searchText,
    makeFilter,
    modelFilter,
    fuelFilter,
    variantFilter,
    cityFilter,
    budgetFilter,
    brandType,
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

  const uniqueVariants = useMemo(() => {
    let list = allVehicles;
    if (makeFilter) list = list.filter((v) => v.make === makeFilter);
    if (modelFilter) list = list.filter((v) => v.model === modelFilter);
    return [
      ...new Set(list.map((v) => v.variant).filter((x) => !!x && x !== "N/A")),
    ].sort();
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
    setSearchText("");
    setCityFilter("Delhi");
    setMakeFilter("");
    setModelFilter("");
    setFuelFilter("");
    setVariantFilter("");
    setBudgetFilter("");
    setBrandType("");
    setShowDiscontinued(false);
  };

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
    navigate("/loans/emi-calculator", {
      state: {
        fromVariant: {
          vehicleId: v._id,
          make: v.make,
          model: v.model,
          variant: v.variant,
          price: v.onRoadPrice,
        },
      },
    });
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

  const handleCheckFeatures = (v) => {
    navigate("/loans/features", {
      state: {
        fromVariant: {
          vehicleId: v._id,
          make: v.make,
          model: v.model,
          variant: v.variant,
        },
      },
    });
  };

  // ─── Smart search: auto-fill make / make+model when text matches ────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const s = searchText.trim();
      if (!s) return;
      const sLower = s.toLowerCase();

      // Exact make match
      const matchedMake = uniqueMakes.find((m) => m.toLowerCase() === sLower);
      if (matchedMake) {
        if (matchedMake !== makeFilter) {
          setMakeFilter(matchedMake);
          setModelFilter("");
          setVariantFilter("");
        }
        return;
      }

      // "Make Model" pattern
      for (const make of uniqueMakes) {
        const makeLower = make.toLowerCase();
        if (sLower.startsWith(makeLower + " ")) {
          const modelPart = sLower.slice(makeLower.length + 1).trim();
          const modelsForMake = [
            ...new Set(
              allVehicles.filter((v) => v.make === make).map((v) => v.model),
            ),
          ];
          const matchedModel = modelsForMake.find(
            (m) => m.toLowerCase() === modelPart,
          );
          if (matchedModel) {
            if (makeFilter !== make) setMakeFilter(make);
            if (modelFilter !== matchedModel) setModelFilter(matchedModel);
            return;
          }
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText, uniqueMakes, allVehicles, makeFilter, modelFilter]);

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

    if (brandType) {
      filtered = filtered.filter((v) => {
        const make = (v.make || "").toLowerCase();
        const premium = ["honda", "hyundai", "skoda", "volkswagen", "kia"];
        const luxury = ["mercedes", "bmw", "audi", "volvo", "lexus", "jaguar"];
        if (brandType === "luxury") return luxury.some((m) => make.includes(m));
        if (brandType === "premium")
          return premium.some((m) => make.includes(m));
        if (brandType === "mass")
          return (
            !premium.some((m) => make.includes(m)) &&
            !luxury.some((m) => make.includes(m))
          );
        return true;
      });
    }

    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      filtered = filtered.filter((v) => {
        const make = v.make || "";
        const model = v.model || "";
        const variant = v.variant || "";
        const fuel = v.fuel || "";
        const city = v.city || "";

        const combinedMakeModel = `${make} ${model}`.toLowerCase();
        const combinedModelMake = `${model} ${make}`.toLowerCase();

        return (
          make.toLowerCase().includes(s) ||
          model.toLowerCase().includes(s) ||
          variant.toLowerCase().includes(s) ||
          fuel.toLowerCase().includes(s) ||
          city.toLowerCase().includes(s) ||
          combinedMakeModel.includes(s) ||
          combinedModelMake.includes(s)
        );
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
    brandType,
    searchText,
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

  const activeGalleryVehicle = useMemo(() => {
    if (!galleryVehicleId) return null;
    return filteredVehicles.find((v) => v._id === galleryVehicleId) || null;
  }, [filteredVehicles, galleryVehicleId]);

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
    const variant = getVehicleVariant(activeGalleryVehicle);

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
  }, [activeGalleryVehicle, computeLocalGalleryMedia]);

  useEffect(() => {
    setActiveMediaIndex(0);
  }, [galleryVehicleId]);

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

  const activeMedia = galleryMedia[activeMediaIndex] || null;

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

            {/* Search */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Search
              </label>
              <Search
                placeholder="Make, model, variant…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                prefix={
                  <Icon
                    name="Search"
                    size={16}
                    className="text-slate-400 dark:text-slate-500"
                  />
                }
              />
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

            {/* Brand type */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Brand type
              </label>
              <Select
                placeholder="All brands"
                value={brandType || undefined}
                onChange={(v) => setBrandType(v || "")}
                allowClear
                className="w-full"
              >
                <Option value="mass">Mass market</Option>
                <Option value="premium">Premium</Option>
                <Option value="luxury">Luxury</Option>
              </Select>
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
                {uniqueVariants.map((variant) => (
                  <Option key={variant} value={variant}>
                    {variant}
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
                      : "Click a variant to preview"}
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
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Expand a variant below to load photos</p>
                </div>
              ) : !galleryMedia.length ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#262626] flex items-center justify-center">
                    <Icon name="ImageOff" size={22} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No photos available for this variant yet</p>
                </div>
              ) : (
                <div className="p-4 md:p-5 space-y-3 bg-slate-50/60 dark:bg-[#141414]">
                  {/* Main image */}
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-[#282828] bg-white dark:bg-[#111] shadow-sm">
                    <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
                      <button type="button" onClick={goToPreviousMedia}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-slate-800 shadow backdrop-blur-sm hover:bg-white transition-all active:scale-95">
                        <Icon name="ChevronLeft" size={17} />
                      </button>
                      <div className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white text-[11px] font-semibold">
                        {activeMediaIndex + 1} / {galleryMedia.length}
                      </div>
                      <button type="button" onClick={goToNextMedia}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-slate-800 shadow backdrop-blur-sm hover:bg-white transition-all active:scale-95">
                        <Icon name="ChevronRight" size={17} />
                      </button>
                    </div>
                    <div className="aspect-[16/9] w-full overflow-hidden">
                      <img
                        src={activeMedia.image}
                        alt={`${activeMedia.make} ${activeMedia.model} ${activeMedia.variant} ${activeMedia.color}`}
                        className="h-full w-full object-contain p-3"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Thumbnail strip */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-thin">
                    {galleryMedia.map((media, index) => {
                      const isThumbnailActive = index === activeMediaIndex;
                      return (
                        <button
                          key={`${media.image}-${media.color}-${index}`}
                          type="button"
                          onClick={() => setActiveMediaIndex(index)}
                          className={`group relative flex-shrink-0 w-[96px] rounded-xl border-2 p-1.5 text-left transition-all duration-200 ${
                            isThumbnailActive
                              ? "border-violet-500 bg-white shadow-md dark:border-violet-400 dark:bg-[#1f1f1f]"
                              : "border-transparent bg-white/80 hover:border-slate-300 hover:shadow-sm dark:bg-[#1e1e1e] dark:hover:border-slate-600"
                          }`}
                        >
                          <div className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-100 dark:bg-[#111] mb-1.5">
                            <img src={media.image} alt={media.color} className="h-full w-full object-contain p-0.5" loading="lazy" />
                          </div>
                          <div className="flex items-center gap-1.5 px-0.5">
                            <span className="h-2.5 w-2.5 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: media.hex || "#d1d5db" }} />
                            <span className="truncate text-[10px] font-semibold text-slate-700 dark:text-slate-300">{media.color}</span>
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
                              <span className="font-medium text-slate-500 dark:text-slate-400">({v.variant})</span>
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
                                    onClick={() => handleCheckFeatures(v)}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#383838] text-slate-700 dark:text-slate-200 text-[12px] font-bold hover:bg-white dark:hover:bg-[#262626] active:scale-95 transition-all"
                                  >
                                    <Icon name="List" size={13} />
                                    Full Features
                                  </button>
                                </div>
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
      </div>
    </div>
  );
};

export default VehiclePriceList;
