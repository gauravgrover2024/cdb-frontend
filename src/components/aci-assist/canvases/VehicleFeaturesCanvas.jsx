import React, { useMemo, useState } from "react";
import {
  BadgeCheck,
  Car,
  CheckCircle2,
  CircleAlert,
  Layers3,
  ListFilter,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";
import { asArray, humanize } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";
import { rowsFrom, valueFrom, compactText } from "../canvas-utils";

const cx = (...parts) => parts.filter(Boolean).join(" ");

const getVariantName = (variant, index = 0) =>
  compactText(
    valueFrom(
      variant,
      [
        "variant",
        "variantName",
        "variant_name",
        "VariantName",
        "name",
        "title",
      ],
      `Variant ${index + 1}`,
    ),
  );

const getVariantMeta = (variant) => {
  const fuel = compactText(
    valueFrom(variant, ["fuel", "fuelType", "fuel_type", "FuelType"], ""),
  );

  const transmission = compactText(
    valueFrom(
      variant,
      [
        "transmission",
        "transmissionType",
        "transmission_type",
        "TransmissionType",
      ],
      "",
    ),
  );

  const engine = compactText(
    valueFrom(variant, ["engine", "engineType", "engine_type"], ""),
  );

  const price = compactText(
    valueFrom(
      variant,
      [
        "price",
        "priceText",
        "exShowroomPrice",
        "ex_showroom_price",
        "onRoadPrice",
        "on_road_price",
      ],
      "",
    ),
  );

  return {
    fuel,
    transmission,
    engine,
    price,
    line: [fuel, transmission, engine].filter(Boolean).join(" / "),
  };
};

const classifyFeatureValue = (value) => {
  if (value === true) return "yes";
  if (value === false) return "no";

  const text = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!text || text === "—" || text === "-") return "unknown";

  if (
    /not available|not offered|unavailable|missing|^no$|^false$|^n\/a$|^na$/i.test(
      text,
    )
  ) {
    return "no";
  }

  if (
    /^yes$|^true$|available|included|standard|present|offered|equipped|✓|✔/i.test(
      text,
    )
  ) {
    return "yes";
  }

  return "unknown";
};

const formatFeatureValue = (value) => {
  if (value === true) return "Yes";
  if (value === false) return "No";

  const text = compactText(value, "—");

  if (text === "true") return "Yes";
  if (text === "false") return "No";

  return text;
};

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

const directValueKeys = [
  "value",
  "featureValue",
  "feature_value",
  "available",
  "status",
  "answer",
  "details",
];

const readDirectValue = (item) => {
  for (const key of directValueKeys) {
    if (
      Object.prototype.hasOwnProperty.call(item, key) &&
      item[key] !== undefined &&
      item[key] !== null
    ) {
      return item[key];
    }
  }

  return undefined;
};

const addFeature = (acc, group, feature, value) => {
  const safeGroup = compactText(group, "Features");
  const safeFeature = compactText(feature, "");

  if (!safeFeature) return;

  if (!acc[safeGroup]) acc[safeGroup] = [];

  acc[safeGroup].push({
    group: safeGroup,
    feature: humanize(safeFeature),
    rawFeature: safeFeature,
    value,
    status: classifyFeatureValue(value),
    searchable:
      `${safeGroup} ${safeFeature} ${compactText(value, "")}`.toLowerCase(),
  });
};

const normalizeFeatures = (rawFeatures) => {
  const acc = {};

  const walkArray = (items, fallbackGroup = "Features") => {
    asArray(items).forEach((item, index) => {
      if (!item) return;

      if (typeof item === "string") {
        addFeature(acc, fallbackGroup, item, "Yes");
        return;
      }

      if (!isPlainObject(item)) {
        addFeature(acc, fallbackGroup, `Feature ${index + 1}`, item);
        return;
      }

      const group = compactText(
        valueFrom(
          item,
          ["group", "category", "section", "type"],
          fallbackGroup,
        ),
      );

      const nested = item.items || item.features || item.rows || item.children;

      if (Array.isArray(nested)) {
        walkArray(nested, group);
        return;
      }

      if (isPlainObject(nested)) {
        Object.entries(nested).forEach(([feature, value]) => {
          addFeature(acc, group, feature, value);
        });
        return;
      }

      const feature = compactText(
        valueFrom(
          item,
          ["feature", "featureName", "feature_name", "label", "name", "key"],
          "",
        ),
      );

      const directValue = readDirectValue(item);

      addFeature(
        acc,
        group,
        feature || `Feature ${index + 1}`,
        directValue !== undefined ? directValue : item,
      );
    });
  };

  if (Array.isArray(rawFeatures)) {
    walkArray(rawFeatures);
  } else if (isPlainObject(rawFeatures)) {
    Object.entries(rawFeatures).forEach(([key, value]) => {
      if (String(key).includes("|")) {
        const [group, feature] = String(key)
          .split("|")
          .map((part) => part.trim());

        addFeature(acc, group || "Features", feature || key, value);
        return;
      }

      if (Array.isArray(value)) {
        walkArray(value, humanize(key));
        return;
      }

      if (isPlainObject(value)) {
        const directValue = readDirectValue(value);

        if (directValue !== undefined) {
          addFeature(acc, "Features", key, directValue);
          return;
        }

        Object.entries(value).forEach(([feature, nestedValue]) => {
          addFeature(acc, humanize(key), feature, nestedValue);
        });
        return;
      }

      addFeature(acc, "Features", key, value);
    });
  }

  return Object.entries(acc).map(([group, items]) => ({
    group,
    items,
    total: items.length,
    included: items.filter((item) => item.status === "yes").length,
    missing: items.filter((item) => item.status === "no").length,
  }));
};

function HighlightText({ text, query }) {
  const value = String(text ?? "");

  if (!query.trim()) return value;

  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = value.split(regex);
  const lowerQuery = query.trim().toLowerCase();

  return parts.map((part, index) =>
    part.toLowerCase() === lowerQuery ? (
      <span
        key={`${part}-${index}`}
        className="rounded bg-[#dbeafe] px-0.5 font-black text-[#1d4ed8]"
      >
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

function FeatureStatusBadge({ status, value }) {
  const label = formatFeatureValue(value);

  if (status === "yes") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 size={13} />
        {label}
      </span>
    );
  }

  if (status === "no") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">
        <XCircle size={13} />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8fafc] px-2.5 py-1 text-xs font-black text-[#64748b] ring-1 ring-[#dbe3ef]">
      <CircleAlert size={13} />
      {label}
    </span>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search
        size={15}
        strokeWidth={2}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
      />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-[17px] border border-[#dbe3ef] bg-white/82 pl-10 pr-10 text-sm font-semibold text-[#0f172a] outline-none shadow-sm transition placeholder:text-[#94a3b8] focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-[#dbeafe]/70"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] transition hover:text-[#475569]"
          aria-label="Clear search"
        >
          <XCircle size={16} />
        </button>
      ) : null}
    </div>
  );
}

function MetricTile({ label, value, icon: Icon, tone = "blue" }) {
  const toneMap = {
    blue: "bg-[#eff6ff] text-[#1e40af] ring-[#bfdbfe]",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    slate: "bg-[#f8fafc] text-[#475569] ring-[#dbe3ef]",
  };

  return (
    <div className="rounded-[22px] bg-white/76 p-4 shadow-[0_18px_60px_-52px_rgba(15,23,42,0.36)] ring-1 ring-[#dbe3ef]/80 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#64748b]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#0f172a]">
            {value}
          </p>
        </div>

        {Icon ? (
          <span
            className={cx(
              "flex h-10 w-10 items-center justify-center rounded-[15px] ring-1",
              toneMap[tone] || toneMap.blue,
            )}
          >
            <Icon size={18} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function VehicleFeaturesCanvas({ message, widget, footer }) {
  const rows = rowsFrom(widget);
  const variants = rows.length ? rows : asArray(widget.data?.variants);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [variantSearch, setVariantSearch] = useState("");
  const [featureSearch, setFeatureSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");

  const selected = variants[selectedIndex] || variants[0] || {};

  const selectedName = getVariantName(selected, selectedIndex);
  const selectedMeta = getVariantMeta(selected);

  const model =
    widget.model ||
    widget.data?.model ||
    valueFrom(selected, ["model"], message?.entities?.model || "");

  const brand =
    widget.brand ||
    widget.data?.brand ||
    valueFrom(selected, ["brand", "make"], message?.entities?.brand || "");

  const rawFeatures =
    selected.features ||
    selected.featureGroups ||
    selected.feature_groups ||
    selected.specifications ||
    selected.specs ||
    widget.data?.features ||
    {};

  const featureGroups = useMemo(
    () => normalizeFeatures(rawFeatures),
    [rawFeatures],
  );

  const allFeatureItems = useMemo(
    () => featureGroups.flatMap((group) => group.items),
    [featureGroups],
  );

  const variantOptions = useMemo(() => {
    const q = variantSearch.trim().toLowerCase();

    return variants
      .map((variant, index) => {
        const name = getVariantName(variant, index);
        const meta = getVariantMeta(variant);

        return {
          variant,
          index,
          name,
          meta,
          searchable: `${name} ${meta.line} ${meta.price}`.toLowerCase(),
        };
      })
      .filter((item) => !q || item.searchable.includes(q));
  }, [variants, variantSearch]);

  const groupNames = useMemo(
    () => featureGroups.map((group) => group.group),
    [featureGroups],
  );

  const activeGroup =
    selectedGroup === "All" || !groupNames.includes(selectedGroup)
      ? "All"
      : selectedGroup;

  const filteredGroups = useMemo(() => {
    const q = featureSearch.trim().toLowerCase();

    return featureGroups
      .filter((group) => activeGroup === "All" || group.group === activeGroup)
      .map((group) => {
        const items = group.items.filter((item) => {
          const matchesSearch = !q || item.searchable.includes(q);

          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "included" && item.status === "yes") ||
            (statusFilter === "missing" && item.status === "no") ||
            (statusFilter === "other" && item.status === "unknown");

          return matchesSearch && matchesStatus;
        });

        return { ...group, items };
      })
      .filter((group) => group.items.length);
  }, [featureGroups, activeGroup, featureSearch, statusFilter]);

  const visibleFeatures = filteredGroups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  const totalFeatures = allFeatureItems.length;
  const includedFeatures = allFeatureItems.filter(
    (item) => item.status === "yes",
  ).length;
  const missingFeatures = allFeatureItems.filter(
    (item) => item.status === "no",
  ).length;

  const titleVehicle = [brand, model].filter(Boolean).join(" ") || "Vehicle";

  const statusFilters = [
    { key: "all", label: "All", count: totalFeatures },
    { key: "included", label: "Included", count: includedFeatures },
    { key: "missing", label: "Missing", count: missingFeatures },
    {
      key: "other",
      label: "Other",
      count: Math.max(0, totalFeatures - includedFeatures - missingFeatures),
    },
  ];

  return (
    <ModernCanvasShell
      title={widget.title || `${titleVehicle} features`}
      subtitle={`${variants.length} variants · ${totalFeatures} features in selected variant`}
      icon={Layers3}
      footer={footer}
      eyebrow="Feature catalogue"
      fullBleed
      className="w-full max-w-none"
      bodyClassName="space-y-5"
    >
      <div className="grid w-full items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="hidden xl:sticky xl:top-4 xl:block xl:self-start">
          <div className="rounded-[30px] bg-white/76 p-4 shadow-[0_28px_86px_-66px_rgba(15,23,42,0.62)] ring-1 ring-[#dbe3ef]/80 backdrop-blur-2xl">
            <div className="mb-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2563eb]">
                Variants
              </p>
              <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#0f172a]">
                Choose variant
              </h3>
              <p className="mt-1 text-sm font-semibold text-[#64748b]">
                {variants.length} variants available
              </p>
            </div>

            <SearchInput
              value={variantSearch}
              onChange={setVariantSearch}
              placeholder="Search variants"
            />

            <div className="mt-4 max-h-[calc(100vh-320px)] space-y-2 overflow-y-auto pr-1">
              {variantOptions.length ? (
                variantOptions.map((item) => {
                  const isActive = item.index === selectedIndex;

                  return (
                    <button
                      key={`${item.name}-${item.index}`}
                      type="button"
                      onClick={() => {
                        setSelectedIndex(item.index);
                        setSelectedGroup("All");
                        setFeatureSearch("");
                      }}
                      className={cx(
                        "group w-full rounded-[20px] border px-3 py-3 text-left transition",
                        isActive
                          ? "border-[#2563eb] bg-[#eff6ff] ring-2 ring-[#bfdbfe]"
                          : "border-[#e2e8f0] bg-white/82 hover:border-[#93c5fd] hover:bg-[#eff6ff]/60",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cx(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] ring-1",
                            isActive
                              ? "bg-[#2563eb] text-white ring-[#2563eb]"
                              : "bg-[#f8fafc] text-[#64748b] ring-[#dbe3ef]",
                          )}
                        >
                          <Car size={17} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span
                            className={cx(
                              "block truncate text-sm font-black",
                              isActive ? "text-[#1e40af]" : "text-[#0f172a]",
                            )}
                          >
                            {item.name}
                          </span>

                          {item.meta.line || item.meta.price ? (
                            <span className="mt-1 block truncate text-xs font-semibold text-[#64748b]">
                              {item.meta.line || item.meta.price}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-[20px] border border-[#dbe3ef] bg-[#f8fafc] p-5 text-center">
                  <p className="text-sm font-semibold text-[#64748b]">
                    No variant matches.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="rounded-[32px] bg-white/76 p-4 shadow-[0_28px_86px_-66px_rgba(15,23,42,0.62)] ring-1 ring-[#dbe3ef]/80 backdrop-blur-2xl sm:p-5 lg:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eff6ff] px-3 py-1.5 text-xs font-black text-[#1e40af] ring-1 ring-[#bfdbfe]">
                    <BadgeCheck size={13} />
                    Selected variant
                  </span>

                  {selectedMeta.price ? (
                    <span className="inline-flex rounded-full bg-white/86 px-3 py-1.5 text-xs font-black text-[#64748b] ring-1 ring-[#dbe3ef]">
                      {selectedMeta.price}
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-4 font-serif text-[36px] font-semibold leading-[1.04] tracking-[-0.065em] text-[#0f172a] sm:text-[48px]">
                  {selectedName}
                </h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-[#64748b] sm:text-base">
                  {selectedMeta.line ||
                    `${titleVehicle} feature catalogue with grouped equipment, comfort, safety and technology details.`}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                <MetricTile
                  label="Features"
                  value={totalFeatures}
                  icon={Layers3}
                  tone="blue"
                />
                <MetricTile
                  label="Included"
                  value={includedFeatures}
                  icon={CheckCircle2}
                  tone="green"
                />
                <MetricTile
                  label="Missing"
                  value={missingFeatures}
                  icon={XCircle}
                  tone="red"
                />
              </div>
            </div>

            <div className="mt-5 xl:hidden">
              <SearchInput
                value={variantSearch}
                onChange={setVariantSearch}
                placeholder="Search and select variant"
              />

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {variantOptions.map((item) => {
                  const isActive = item.index === selectedIndex;

                  return (
                    <button
                      key={`${item.name}-${item.index}-mobile`}
                      type="button"
                      onClick={() => {
                        setSelectedIndex(item.index);
                        setSelectedGroup("All");
                        setFeatureSearch("");
                      }}
                      className={cx(
                        "shrink-0 rounded-full px-4 py-2 text-xs font-black ring-1 transition",
                        isActive
                          ? "bg-[#2563eb] text-white ring-[#2563eb]"
                          : "bg-white text-[#475569] ring-[#dbe3ef]",
                      )}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-[30px] bg-white/76 p-4 shadow-[0_24px_76px_-64px_rgba(15,23,42,0.48)] ring-1 ring-[#dbe3ef]/80 backdrop-blur-2xl sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2563eb]">
                  Feature explorer
                </p>
                <h3 className="mt-1 text-xl font-black text-[#0f172a]">
                  Browse {visibleFeatures} visible features
                </h3>
              </div>

              <div className="w-full lg:max-w-[360px]">
                <SearchInput
                  value={featureSearch}
                  onChange={setFeatureSearch}
                  placeholder="Search features"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedGroup("All")}
                className={cx(
                  "shrink-0 rounded-full px-4 py-2 text-xs font-black ring-1 transition",
                  activeGroup === "All"
                    ? "bg-[#0f172a] text-white ring-[#0f172a]"
                    : "bg-white text-[#475569] ring-[#dbe3ef] hover:bg-[#eff6ff] hover:text-[#1e40af]",
                )}
              >
                All groups · {totalFeatures}
              </button>

              {featureGroups.map((group) => (
                <button
                  key={group.group}
                  type="button"
                  onClick={() => setSelectedGroup(group.group)}
                  className={cx(
                    "shrink-0 rounded-full px-4 py-2 text-xs font-black ring-1 transition",
                    activeGroup === group.group
                      ? "bg-[#2563eb] text-white ring-[#2563eb]"
                      : "bg-white text-[#475569] ring-[#dbe3ef] hover:bg-[#eff6ff] hover:text-[#1e40af]",
                  )}
                >
                  {group.group} · {group.total}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ring-1 transition",
                    statusFilter === filter.key
                      ? "bg-[#eff6ff] text-[#1e40af] ring-[#bfdbfe]"
                      : "bg-white text-[#64748b] ring-[#dbe3ef] hover:bg-[#f8fafc]",
                  )}
                >
                  <ListFilter size={13} />
                  {filter.label}
                  <span className="opacity-70">{filter.count}</span>
                </button>
              ))}
            </div>
          </div>

          {filteredGroups.length ? (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <section
                  key={group.group}
                  className="overflow-hidden rounded-[30px] bg-white/76 shadow-[0_24px_76px_-64px_rgba(15,23,42,0.48)] ring-1 ring-[#dbe3ef]/80 backdrop-blur-2xl"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0]/80 bg-[#f8fafc]/80 px-4 py-4 sm:px-5">
                    <div>
                      <h4 className="text-base font-black text-[#0f172a]">
                        {group.group}
                      </h4>
                      <p className="mt-0.5 text-xs font-semibold text-[#64748b]">
                        {group.items.length} matching features
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#64748b] ring-1 ring-[#dbe3ef]">
                      <Sparkles size={13} className="text-[#2563eb]" />
                      {group.included} included
                    </span>
                  </div>

                  <div className="divide-y divide-[#eef2f7]">
                    {group.items.map((item) => (
                      <div
                        key={`${group.group}-${item.rawFeature}`}
                        className="grid gap-3 px-4 py-3.5 transition hover:bg-[#eff6ff]/45 sm:grid-cols-[minmax(0,1fr)_minmax(160px,0.42fr)] sm:items-center sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[#0f172a]">
                            <HighlightText
                              text={item.feature}
                              query={featureSearch}
                            />
                          </p>
                        </div>

                        <div className="sm:flex sm:justify-end">
                          <FeatureStatusBadge
                            status={item.status}
                            value={
                              featureSearch ? (
                                <HighlightText
                                  text={formatFeatureValue(item.value)}
                                  query={featureSearch}
                                />
                              ) : (
                                formatFeatureValue(item.value)
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-[30px] bg-white/76 p-12 text-center shadow-[0_24px_76px_-64px_rgba(15,23,42,0.48)] ring-1 ring-[#dbe3ef]/80 backdrop-blur-2xl">
              <Search size={34} className="mx-auto text-[#cbd5e1]" />
              <p className="mt-4 text-base font-black text-[#0f172a]">
                No matching features
              </p>
              <p className="mt-1 text-sm font-semibold text-[#64748b]">
                Try a different keyword, category or status filter.
              </p>

              <button
                type="button"
                onClick={() => {
                  setFeatureSearch("");
                  setSelectedGroup("All");
                  setStatusFilter("all");
                }}
                className="mt-5 rounded-full bg-[#2563eb] px-5 py-2.5 text-sm font-black text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.8)] transition hover:bg-[#1d4ed8]"
              >
                Reset filters
              </button>
            </div>
          )}
        </section>
      </div>
    </ModernCanvasShell>
  );
}
