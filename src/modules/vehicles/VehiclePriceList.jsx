import React, { useState, useEffect, useMemo } from "react";
import { Input, Select, message, Tag } from "antd";
import { vehiclesApi } from "../../api/vehicles";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";

const { Search } = Input;
const { Option } = Select;

const FUEL_ORDER = ["All", "Petrol", "Diesel", "CNG", "Electric"];

const VehiclePriceList = ({ onSelectVehicle, selectionMode = false }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [fuelFilter, setFuelFilter] = useState("");
  const [variantFilter, setVariantFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("New Delhi");
  const [budgetFilter, setBudgetFilter] = useState("");
  const [brandType, setBrandType] = useState("");

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [priceSort, setPriceSort] = useState("asc");

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const res = await vehiclesApi.getAll();
      setVehicles(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Load Vehicles Error:", err);
      message.error("Failed to load vehicle price list ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const uniqueMakes = useMemo(
    () => [...new Set(vehicles.map((v) => v.make))].sort(),
    [vehicles],
  );

  const uniqueModels = useMemo(() => {
    if (!makeFilter) return [];
    return [
      ...new Set(
        vehicles.filter((v) => v.make === makeFilter).map((v) => v.model),
      ),
    ].sort();
  }, [vehicles, makeFilter]);

  const uniqueVariants = useMemo(() => {
    let list = vehicles;
    if (makeFilter) list = list.filter((v) => v.make === makeFilter);
    if (modelFilter) list = list.filter((v) => v.model === modelFilter);
    return [
      ...new Set(list.map((v) => v.variant).filter((x) => !!x && x !== "N/A")),
    ].sort();
  }, [vehicles, makeFilter, modelFilter]);

  const uniqueCities = useMemo(
    () =>
      [
        ...new Set(
          vehicles.map((v) => v.city).filter((x) => !!x && x !== "N/A"),
        ),
      ].sort(),
    [vehicles],
  );

  const allFuelsPresent = useMemo(
    () =>
      new Set(vehicles.map((v) => v.fuel).filter((x) => !!x && x !== "N/A")),
    [vehicles],
  );

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
    setCityFilter("New Delhi");
    setMakeFilter("");
    setModelFilter("");
    setFuelFilter("");
    setVariantFilter("");
    setBudgetFilter("");
    setBrandType("");
  };

  const handleRowActionSelect = (record) => {
    if (onSelectVehicle) {
      onSelectVehicle(record);
      message.success(
        `Selected: ${record.make} ${record.model} ${record.variant}`,
      );
    }
  };

  const filteredVehicles = useMemo(() => {
    let filtered = [...vehicles];

    if (cityFilter) {
      filtered = filtered.filter((v) => v.city === cityFilter);
    }
    if (makeFilter) {
      filtered = filtered.filter((v) => v.make === makeFilter);
    }
    if (modelFilter) {
      filtered = filtered.filter((v) => v.model === modelFilter);
    }
    if (fuelFilter && fuelFilter !== "All") {
      filtered = filtered.filter((v) => v.fuel === fuelFilter);
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

  const vehiclesByFuel = useMemo(() => {
    const map = {};
    filteredVehicles.forEach((v) => {
      const fuel = v.fuel || "Unknown";
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
    ["Petrol", "Diesel", "CNG", "Electric"].find(
      (f) => vehiclesByFuel[f]?.length,
    ) || Object.keys(vehiclesByFuel)[0];

  const activeFuel =
    fuelFilter && fuelFilter !== "All" ? fuelFilter : firstFuelWithData;

  const variantsForActiveFuel = activeFuel
    ? vehiclesByFuel[activeFuel] || []
    : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#171717] px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-6xl mx-auto space-y-4 pb-16">
        {/* New cleaner header */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-[28px] border border-slate-100 dark:border-[#262626] shadow-sm px-6 py-4 md:px-8 md:py-4 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#262626] text-[11px] font-medium text-slate-700 dark:text-slate-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Price Intelligence
              </div>
              <h1 className="mt-2 text-[26px] md:text-[30px] font-semibold text-slate-900 dark:text-slate-50">
                Vehicle Price List
              </h1>
              <p className="mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                On‑road prices • Updated{" "}
                {new Date().toLocaleDateString("en-IN")}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-1 text-xs md:text-sm">
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-[#262626] text-slate-900 dark:text-slate-50">
                  <Icon name="MapPin" size={14} />
                  <span>{cityFilter || "New Delhi"}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-[#262626] text-slate-900 dark:text-slate-50">
                  <Icon name="List" size={14} />
                  <span>{stats.total} variants</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {stats.active} active • {stats.discontinued} discontinued •{" "}
                {stats.makes} makes
              </div>
            </div>
          </div>
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px,minmax(0,1fr)] gap-4 mt-2 items-start">
          {/* Sticky left filter panel */}
          <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-sm border border-slate-100 dark:border-[#262626] px-5 py-5 flex flex-col gap-4 h-auto sticky top-24">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Filters
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Search and refine variants by brand, model and price.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Search
              </label>
              <Search
                placeholder="Make, model, variant..."
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

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                City
              </label>
              <Select
                placeholder="City"
                value={cityFilter || "New Delhi"}
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

          {/* Right: variants & pricing */}
          <div className="flex flex-col gap-3">
            <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow border border-gray-200 dark:border-[#262626] overflow-hidden">
              <div className="px-6 py-4 md:px-8 md:py-4 border-b border-gray-100 dark:border-[#262626] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Variants & pricing
                  </h2>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {filteredVehicles.length} variants found
                  </span>
                </div>

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
                              ? "bg-emerald-600 text-white border-emerald-600"
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
                                ? "bg-emerald-600 text-white border-emerald-600"
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
                <div className="px-6 md:px-8 py-8 text-sm text-gray-500 dark:text-gray-400">
                  Loading variants…
                </div>
              ) : !firstFuelWithData ? (
                <div className="px-6 md:px-8 py-8 text-sm text-gray-500 dark:text-gray-400">
                  No variants available for current filters.
                </div>
              ) : variantsForActiveFuel.length === 0 ? (
                <div className="px-6 md:px-8 py-8 text-sm text-gray-500 dark:text-gray-400">
                  No variants available for this fuel with current filters.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-[#262626]">
                  {variantsForActiveFuel.map((v) => {
                    const isBestValue =
                      !v.isDiscontinued &&
                      v.onRoadPrice &&
                      medianOnRoad &&
                      Math.abs(v.onRoadPrice - medianOnRoad) / medianOnRoad <=
                        0.15;

                    return (
                      <details key={v._id} className="group">
                        <summary className="flex items-center justify-between gap-3 px-6 md:px-8 py-3 cursor-pointer bg-white dark:bg-[#1f1f1f] hover:bg-gray-50 dark:hover:bg-[#262626] transition-colors">
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {v.model} ({v.variant})
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {v.make} • {v.city || "City not set"}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              {v.fuel && v.fuel !== "N/A" && (
                                <Tag
                                  className={`text-[11px] px-2 py-0.5 rounded-full border-0 ${
                                    v.fuel === "Petrol"
                                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                                      : v.fuel === "Diesel"
                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
                                  }`}
                                >
                                  {v.fuel}
                                </Tag>
                              )}
                              {v.isDiscontinued && (
                                <span className="text-[11px] font-semibold text-red-500">
                                  DISCONTINUED
                                </span>
                              )}
                              {isBestValue && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-700/60">
                                  Best value
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                On‑road from
                              </div>
                              <div className="text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(v.onRoadPrice)}
                              </div>
                            </div>
                            <Icon
                              name="ChevronDown"
                              size={16}
                              className="text-gray-400 group-open:rotate-180 transition-transform"
                            />
                          </div>
                        </summary>

                        <div className="px-6 md:px-8 pb-4 bg-gray-50 dark:bg-[#171717]">
                          {/* price breakdown without inner lines */}
                          <div className="mt-3 rounded-2xl border border-gray-200 dark:border-[#262626] bg-white dark:bg-[#1f1f1f] px-4 py-3 space-y-3 text-xs md:text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">
                                Ex‑showroom
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(v.exShowroom)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">
                                RTO
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(v.rto)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">
                                Insurance
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(v.insurance)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">
                                Other charges
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(v.otherCharges)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-[#262626] mt-1">
                              <span className="text-gray-700 dark:text-gray-200">
                                Total on‑road
                              </span>
                              <span className="text-base md:text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                {formatCurrency(v.onRoadPrice)}
                              </span>
                            </div>
                          </div>

                          {selectionMode && (
                            <div className="mt-3 flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRowActionSelect(v)}
                                className="border-emerald-500 text-emerald-600 dark:border-emerald-500/70 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40"
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
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky footer summary */}
        <div className="fixed bottom-4 left-0 right-0 z-20">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/95 dark:bg-[#1f1f1f]/95 border border-gray-200 dark:border-[#262626] shadow-xl backdrop-blur">
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
