import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeIndianRupee,
  Bell,
  Camera,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleMinus,
  Gauge,
  Info,
  Layers3,
  Mic,
  Music2,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Wand2,
  Wind,
  Armchair,
  Smartphone,
} from "lucide-react";

import { ACI_CANVAS_TYPES, ACI_INTENTS } from "../shared/aciV2Constants";
import { AciComposer, AciLogo, emitAciAction } from "../shared/AciAssistShared";
import { getDisplayCarImage } from "../shared/aciV2Image";
import { buildVehicleContextPatch } from "../context/aciV2ContextManager";

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(7px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.03,
    },
  },
};

const CATEGORY_META = {
  all: { label: "All", Icon: Layers3 },
  comfort: { label: "Comfort", Icon: Armchair },
  safety: { label: "Safety", Icon: ShieldCheck },
  infotainment: { label: "Infotainment", Icon: Music2 },
  convenience: { label: "Convenience", Icon: Wand2 },
  adas: { label: "ADAS", Icon: Route },
  performance: { label: "Performance", Icon: Gauge },
  dimensions: { label: "Space", Icon: Car },
  exterior: { label: "Exterior", Icon: Camera },
  other: { label: "More", Icon: Sparkles },
};

const DEFAULT_CITY = "new-delhi";

const cleanText = (value = "") => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value.map(cleanText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return cleanText(
      value.label ||
        value.name ||
        value.title ||
        value.value ||
        value.text ||
        "",
    );
  }
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
};

const asArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
};

const slugify = (value = "", fallback = "item") =>
  cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || fallback;

const normalizeKey = (value = "") =>
  cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const valueFrom = (object, keys = [], fallback = "") => {
  if (!object || typeof object !== "object") return fallback;

  for (const key of keys) {
    const value = object[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return fallback;
};

const getResolvedWidget = ({ widget, data, message }) =>
  widget ||
  data?.widget ||
  data?.widgets?.[0] ||
  message?.widget ||
  message?.widgets?.[0] ||
  {};

const getResolvedVehicle = ({ vehicle, widget, data, message }) => {
  const resolvedWidget = getResolvedWidget({ widget, data, message });

  return (
    resolvedWidget?.vehicle ||
    resolvedWidget?.data?.vehicle ||
    data?.vehicle ||
    data?.contextPatch?.selectedVehicle ||
    message?.vehicle ||
    message?.contextPatch?.selectedVehicle ||
    vehicle ||
    {}
  );
};

const isImageUrl = (value) => {
  if (!value || typeof value !== "string") return false;
  const text = value.trim();

  return (
    /^(data:image\/|blob:)/i.test(text) ||
    /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(text) ||
    /cloudinary|imgix|googleusercontent|cardekho|carwale|acko|spinny|cars24|cdn|uploads|images|r2\.dev/i.test(
      text,
    )
  );
};

const extractImage = (value, depth = 0) => {
  if (!value || depth > 6) return "";

  if (typeof value === "string") return isImageUrl(value) ? value.trim() : "";

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractImage(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof value === "object") {
    const imageKeys = [
      "displayImageUrl",
      "displayNormalizedImageUrl",
      "heroImage",
      "heroImageUrl",
      "vehicleImage",
      "vehicleImageUrl",
      "image",
      "imageUrl",
      "image_url",
      "thumbnail",
      "thumbnailUrl",
      "carImage",
      "car_image",
      "photo",
      "url",
      "src",
      "normalizedImageUrl",
      "cleanImageUrl",
      "normalized_image_url",
    ];

    for (const key of imageKeys) {
      const found = extractImage(value[key], depth + 1);
      if (found) return found;
    }

    for (const nested of Object.values(value)) {
      const found = extractImage(nested, depth + 1);
      if (found) return found;
    }
  }

  return "";
};

const formatPrice = (value) => {
  const raw = cleanText(value);
  if (!raw) return "";
  if (/₹|rs\.?|lakh|lac|cr/i.test(raw)) return raw;

  const numeric = Number(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return raw;

  if (numeric >= 10000000) return `₹${(numeric / 10000000).toFixed(2)} Cr`;
  if (numeric >= 100000) return `₹${(numeric / 100000).toFixed(2)}L`;
  return `₹${numeric.toLocaleString("en-IN")}`;
};

const getVariantPriceLabel = (variant = {}) =>
  cleanText(variant.priceLabel) ||
  cleanText(variant.exShowroomPriceLabel) ||
  cleanText(variant.onRoadPriceLabel) ||
  formatPrice(
    variant.exShowroomPrice || variant.price || variant.onRoadPrice || "",
  );

const getOnRoadLabel = (variant = {}) =>
  cleanText(variant.onRoadPriceLabel) || formatPrice(variant.onRoadPrice || "");

const getVehicleTitle = (vehicle = {}, widget = {}) => {
  const display = cleanText(vehicle.displayName || widget.vehicle?.displayName);
  if (display) return display;

  return (
    [
      vehicle.brand || vehicle.make || widget.brand || widget.make,
      vehicle.model || widget.model,
    ]
      .filter(Boolean)
      .join(" ") || "Selected car"
  );
};

const getFeatureCategory = (feature = {}) => {
  const category = normalizeKey(feature.category || feature.type || "");
  if (category) return slugify(category, "other");

  const section = normalizeKey(feature.section || feature.group || "");
  if (section.includes("safety")) return "safety";
  if (
    section.includes("comfort") ||
    section.includes("convenience") ||
    section.includes("interior")
  )
    return "comfort";
  if (section.includes("entertainment") || section.includes("communication"))
    return "infotainment";
  if (section.includes("adas")) return "adas";
  if (
    section.includes("engine") ||
    section.includes("fuel") ||
    section.includes("performance")
  )
    return "performance";
  if (section.includes("dimension") || section.includes("capacity"))
    return "dimensions";
  if (section.includes("exterior")) return "exterior";

  return "other";
};

const getFeatureIcon = (feature = {}) => {
  const text = normalizeKey(
    `${feature.name || feature.label || ""} ${feature.section || ""} ${feature.category || ""}`,
  );

  if (/camera|360/.test(text)) return Camera;
  if (/seat|ventilat|comfort|steering|climate|ac|heater/.test(text))
    return Armchair;
  if (/airbag|safety|brake|abs|esc|isofix|tpms/.test(text)) return ShieldCheck;
  if (/adas|lane|cruise|assist|collision/.test(text)) return Route;
  if (/audio|music|speaker|jbl|infotain|radio/.test(text)) return Music2;
  if (/android|apple|carplay|phone|wireless|screen|bluetooth/.test(text))
    return Smartphone;
  if (/engine|power|torque|fuel|mileage|transmission/.test(text)) return Gauge;
  if (/sunroof|roof|lamp|wheel|exterior/.test(text)) return Camera;
  if (/air conditioning|climate|wind/.test(text)) return Wind;

  return Sparkles;
};

const isUnavailableValue = (value) =>
  /^(no|na|n\/a|not available|unavailable|absent|nil|false|-)$/i.test(
    cleanText(value),
  );

const normalizeFeature = (item = {}, index = 0, selectedVariant = {}) => {
  if (typeof item === "string") {
    const name = cleanText(item);
    if (!name) return null;

    return {
      id: slugify(`${name}-${index}`, `feature-${index}`),
      name,
      label: name,
      section: "Features",
      category: "other",
      value: "Yes",
      displayValue: "Yes",
      available: true,
      variant: selectedVariant.label || selectedVariant.variant || "",
      Icon: Sparkles,
      searchableText: normalizeKey(name),
    };
  }

  if (!item || typeof item !== "object") return null;

  const name = cleanText(
    item.name || item.label || item.title || item.feature || item.featureName,
  );
  if (!name) return null;

  const value = cleanText(
    item.displayValue || item.value || item.status || item.availability || "",
  );
  const available =
    item.available === false ||
    item.present === false ||
    item.included === false ||
    item.isAvailable === false ||
    isUnavailableValue(value)
      ? false
      : true;

  const feature = {
    ...item,
    id:
      cleanText(item.id || item.key || item.slug) ||
      slugify(
        `${selectedVariant.id || selectedVariant.label || "variant"}-${name}-${index}`,
        `feature-${index}`,
      ),
    name,
    label: name,
    section: cleanText(item.section || item.group || "Features"),
    category: getFeatureCategory(item),
    value,
    displayValue: value || (available ? "Available" : "Not available"),
    available,
    present: available,
    included: available,
    variant: cleanText(
      item.variant ||
        item.variantName ||
        selectedVariant.label ||
        selectedVariant.variant ||
        "",
    ),
  };

  return {
    ...feature,
    Icon: getFeatureIcon(feature),
    searchableText: normalizeKey(
      `${feature.section} ${feature.name} ${feature.displayValue} ${feature.category}`,
    ),
  };
};

const normalizeFeatureGroup = (group = {}, index = 0, features = []) => {
  const label = cleanText(
    group.label || group.name || group.section || `Group ${index + 1}`,
  );
  const id = cleanText(group.id) || slugify(label, `group-${index}`);
  const groupFeatures = asArray(group.features)
    .map((item, featureIndex) => normalizeFeature(item, featureIndex))
    .filter(Boolean);

  const allGroupFeatures = groupFeatures.length
    ? groupFeatures
    : features.filter(
        (feature) => slugify(feature.section || feature.group || "") === id,
      );

  const availableCount = Number(
    group.availableCount ??
      allGroupFeatures.filter((feature) => feature.available).length,
  );
  const totalCount = Number(group.totalCount ?? allGroupFeatures.length);

  return {
    id,
    label,
    name: label,
    category:
      cleanText(group.category) || allGroupFeatures[0]?.category || "other",
    availableCount,
    totalCount,
    unavailableCount: Number(
      group.unavailableCount ?? Math.max(totalCount - availableCount, 0),
    ),
    features: allGroupFeatures,
  };
};

const groupFeaturesFromRows = (features = []) => {
  const map = new Map();

  features.forEach((feature) => {
    const label = cleanText(feature.section || "Features");
    const id = slugify(label, "features");
    const existing = map.get(id) || {
      id,
      label,
      name: label,
      category: feature.category || "other",
      availableCount: 0,
      totalCount: 0,
      unavailableCount: 0,
      features: [],
    };

    existing.features.push(feature);
    existing.totalCount += 1;
    if (feature.available) existing.availableCount += 1;
    else existing.unavailableCount += 1;

    map.set(id, existing);
  });

  return [...map.values()];
};

const normalizeVariant = (item = {}, index = 0) => {
  if (typeof item === "string") {
    const label = cleanText(item);
    if (!label) return null;
    return {
      id: slugify(label, `variant-${index}`),
      label,
      variant: label,
      variantName: label,
      features: [],
      featureGroups: [],
    };
  }

  if (!item || typeof item !== "object") return null;

  const label = cleanText(
    item.label ||
      item.variant ||
      item.variantName ||
      item.name ||
      item.title ||
      item.displayName,
  );
  if (!label) return null;

  return {
    ...item,
    id:
      cleanText(item.id || item._id || item.key) ||
      slugify(label, `variant-${index}`),
    label,
    name: label,
    variant: label,
    variantName: label,
    priceLabel: getVariantPriceLabel(item),
    onRoadPriceLabel: cleanText(item.onRoadPriceLabel) || getOnRoadLabel(item),
    active: item.active,
    current: item.current,
    currentPricelistMatched: item.currentPricelistMatched,
    selectedVariantIsActive: item.selectedVariantIsActive,
  };
};

const collectVariants = (widget = {}, vehicle = {}) => {
  const raw = [
    ...asArray(widget.variantOptions),
    ...asArray(widget.data?.variantOptions),
    ...asArray(widget.variants),
    ...asArray(widget.data?.variants),
    ...asArray(vehicle.variants),
  ];

  const seen = new Set();
  const variants = raw
    .map(normalizeVariant)
    .filter(Boolean)
    .filter((variant) => {
      const key = cleanText(variant.id) || normalizeKey(variant.label);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const selectedName = cleanText(
    widget.selectedVariant ||
      widget.data?.selectedVariant ||
      vehicle.selectedVariant ||
      vehicle.variant,
  );
  const selectedId = cleanText(
    widget.selectedVariantId || widget.data?.selectedVariantId,
  );

  if (
    selectedName &&
    !variants.some(
      (item) => item.label === selectedName || item.id === selectedId,
    )
  ) {
    variants.unshift({
      id: selectedId || slugify(selectedName),
      label: selectedName,
      variant: selectedName,
      variantName: selectedName,
      features: asArray(widget.features || widget.rows),
      featureGroups: asArray(widget.featureGroups),
    });
  }

  return variants;
};

const getSelectedVariantId = (widget = {}, vehicle = {}, variants = []) => {
  const preferredId = cleanText(
    widget.selectedVariantId || widget.data?.selectedVariantId,
  );
  if (preferredId && variants.some((item) => item.id === preferredId))
    return preferredId;

  const preferredLabel = cleanText(
    widget.selectedVariant ||
      widget.data?.selectedVariant ||
      vehicle.selectedVariant ||
      vehicle.variant,
  );
  if (preferredLabel) {
    const byLabel = variants.find(
      (item) => normalizeKey(item.label) === normalizeKey(preferredLabel),
    );
    if (byLabel) return byLabel.id;
  }

  return variants[0]?.id || "";
};

const getVariantFeatureRows = ({ widget, selectedVariant }) => {
  const selectedRows = asArray(
    selectedVariant?.features ||
      selectedVariant?.featureList ||
      selectedVariant?.rows ||
      selectedVariant?.items,
  )
    .map((item, index) => normalizeFeature(item, index, selectedVariant))
    .filter(Boolean);

  if (selectedRows.length) return selectedRows;

  return asArray(
    widget.features ||
      widget.featureList ||
      widget.rows ||
      widget.items ||
      widget.data?.features ||
      widget.data?.featureList,
  )
    .map((item, index) => normalizeFeature(item, index, selectedVariant))
    .filter(Boolean);
};

const getVariantGroups = ({ widget, selectedVariant, features }) => {
  const rawGroups = asArray(
    selectedVariant?.featureGroups ||
      selectedVariant?.groups ||
      widget.featureGroups ||
      widget.data?.featureGroups,
  );
  const groups = rawGroups
    .map((group, index) => normalizeFeatureGroup(group, index, features))
    .filter(Boolean);
  return groups.length ? groups : groupFeaturesFromRows(features);
};

const getQuickSpecs = ({ widget, selectedVariant }) => {
  const raw = asArray(
    selectedVariant?.quickSpecs || widget.quickSpecs || widget.data?.quickSpecs,
  );

  return raw
    .map((item, index) => {
      if (typeof item === "string")
        return { id: slugify(item, `spec-${index}`), label: item, value: "" };
      const label = cleanText(item.label || item.name || item.title);
      const value = cleanText(item.value || item.displayValue || item.text);
      if (!label && !value) return null;
      return {
        id: cleanText(item.id) || slugify(`${label}-${value}`, `spec-${index}`),
        label: label || value,
        value,
        icon: item.icon || item.category || "other",
      };
    })
    .filter(Boolean)
    .slice(0, 10);
};

const getHighlights = ({ widget, selectedVariant, features }) => {
  const raw = asArray(
    selectedVariant?.highlights ||
      widget.highlights ||
      widget.data?.highlights ||
      widget.whyThisVariant,
  );
  const provided = raw
    .map((item, index) => {
      const label = cleanText(item.label || item.text || item.name || item);
      return label
        ? {
            id: cleanText(item.id) || slugify(label, `highlight-${index}`),
            label,
          }
        : null;
    })
    .filter(Boolean)
    .slice(0, 8);

  if (provided.length) return provided;

  return features
    .filter(
      (feature) =>
        feature.available &&
        /sunroof|airbag|adas|camera|ventilated|wireless|climate|alloy|cruise/i.test(
          `${feature.name} ${feature.section}`,
        ),
    )
    .slice(0, 8)
    .map((feature, index) => ({
      id: slugify(`${feature.name}-${index}`, `highlight-${index}`),
      label: /^(yes|available)$/i.test(feature.displayValue || feature.value)
        ? `${feature.name} available`
        : `${feature.name}: ${feature.displayValue || feature.value}`,
    }));
};

const buildCategoryTabs = (groups = [], features = []) => {
  const byCategory = new Map();

  groups.forEach((group) => {
    const category = group.category || group.features?.[0]?.category || "other";
    const key = slugify(category, "other");
    const meta = CATEGORY_META[key] || CATEGORY_META.other;
    const existing = byCategory.get(key) || {
      id: key,
      label: meta.label || group.label,
      Icon: meta.Icon || Sparkles,
      availableCount: 0,
      totalCount: 0,
    };

    existing.availableCount += Number(group.availableCount || 0);
    existing.totalCount += Number(
      group.totalCount || group.features?.length || 0,
    );
    byCategory.set(key, existing);
  });

  if (!byCategory.size) {
    features.forEach((feature) => {
      const key = feature.category || "other";
      const meta = CATEGORY_META[key] || CATEGORY_META.other;
      const existing = byCategory.get(key) || {
        id: key,
        label: meta.label,
        Icon: meta.Icon,
        availableCount: 0,
        totalCount: 0,
      };
      existing.totalCount += 1;
      if (feature.available) existing.availableCount += 1;
      byCategory.set(key, existing);
    });
  }

  const preferredOrder = [
    "comfort",
    "safety",
    "infotainment",
    "adas",
    "performance",
    "dimensions",
    "exterior",
    "other",
  ];

  const tabs = [...byCategory.values()].sort((a, b) => {
    const ai = preferredOrder.indexOf(a.id);
    const bi = preferredOrder.indexOf(b.id);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.label.localeCompare(b.label);
  });

  return [
    {
      id: "all",
      label: "All",
      Icon: Layers3,
      availableCount: features.filter((feature) => feature.available).length,
      totalCount: features.length,
    },
    ...tabs,
  ];
};

const featureMatchesSearch = (feature = {}, query = "") => {
  const needle = normalizeKey(query);
  if (!needle) return true;
  const haystack =
    feature.searchableText ||
    normalizeKey(
      `${feature.section} ${feature.name} ${feature.displayValue} ${feature.value} ${feature.category}`,
    );
  return haystack.includes(needle);
};

const fireFeatureAction = (
  onAction,
  {
    label,
    query,
    type = "features_action",
    intent,
    canvasType,
    vehicle,
    payload = {},
    contextPatch = {},
  },
) => {
  const hasPatchVariant = Object.prototype.hasOwnProperty.call(
    contextPatch || {},
    "anchorVariant",
  );
  const scopedVariant = hasPatchVariant
    ? contextPatch.anchorVariant
    : vehicle?.selectedVariant || vehicle?.variant;

  emitAciAction(
    {
      id: slugify(`${label}-${query || ""}`, "feature-action"),
      label,
      title: label,
      query: query || label,
      type,
      intent: intent || ACI_INTENTS.FEATURES,
      canvasType: canvasType || ACI_CANVAS_TYPES.FEATURES,
      vehicle,
      payload,
      contextPatch: {
        ...buildVehicleContextPatch({
          vehicle,
          variant: scopedVariant,
          city: vehicle?.citySlug || vehicle?.city || DEFAULT_CITY,
        }),
        ...contextPatch,
      },
    },
    onAction,
  );
};

function VehicleImage({ src, title, mobile = false }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div className={`afi-car-placeholder ${mobile ? "mobile" : ""}`}>
        <Car size={mobile ? 58 : 84} strokeWidth={1.35} />
      </div>
    );
  }

  return (
    <motion.img
      key={src}
      src={src}
      alt={title}
      draggable="false"
      onError={() => setFailed(true)}
      initial={{ opacity: 0, scale: 0.985, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 25 }}
      className="afi-car-image"
    />
  );
}

function VariantSelect({
  variants,
  selectedVariantId,
  setSelectedVariantId,
  compact = false,
}) {
  if (!variants.length) return null;

  return (
    <label className={`afi-variant-select ${compact ? "compact" : ""}`}>
      <span>{compact ? "Variant" : "Change variant"}</span>
      <select
        value={selectedVariantId}
        onChange={(event) => setSelectedVariantId(event.target.value)}
      >
        {variants.map((variant) => (
          <option key={variant.id} value={variant.id}>
            {variant.label}
            {getVariantPriceLabel(variant)
              ? ` · ${getVariantPriceLabel(variant)}`
              : ""}
          </option>
        ))}
      </select>
      <ChevronDown size={compact ? 15 : 16} />
    </label>
  );
}

function SearchBox({
  query,
  setQuery,
  placeholder = "Search sunroof, ADAS, airbags, touchscreen...",
}) {
  return (
    <label className="afi-search-box">
      <Search size={18} />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <span className="afi-stat-pill">
      <Icon size={15} />
      <strong>{value}</strong>
      <em>{label}</em>
    </span>
  );
}

function ActiveStatusBadge({ variant, compact = false }) {
  const isCurrent =
    variant?.active === true ||
    variant?.current === true ||
    variant?.currentPricelistMatched === true;

  return (
    <span
      className={`afi-status-badge ${isCurrent ? "current" : "inactive"} ${compact ? "compact" : ""}`}
    >
      {isCurrent ? "Current variant" : "Older variant"}
    </span>
  );
}

function FeatureTabs({
  tabs,
  activeCategory,
  setActiveCategory,
  mobile = false,
}) {
  return (
    <motion.nav
      variants={fadeUp}
      className={`afi-category-tabs ${mobile ? "mobile" : ""}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.Icon || Sparkles;
        const active = tab.id === activeCategory;
        return (
          <button
            key={tab.id}
            type="button"
            className={active ? "active" : ""}
            onClick={() => setActiveCategory(tab.id)}
          >
            <Icon size={mobile ? 20 : 19} strokeWidth={1.9} />
            <span>{tab.label}</span>
            <small>
              {tab.availableCount}/{tab.totalCount}
            </small>
          </button>
        );
      })}
    </motion.nav>
  );
}

function FeatureRow({ feature, mobile = false }) {
  const Icon = feature.Icon || Sparkles;

  return (
    <motion.div
      layout
      variants={fadeUp}
      className={`afi-feature-row ${mobile ? "mobile" : ""}`}
    >
      <span className="afi-feature-icon">
        <Icon size={mobile ? 20 : 21} strokeWidth={1.85} />
      </span>
      <div className="afi-feature-main">
        <strong title={feature.name}>{feature.name}</strong>
        <small>{feature.section}</small>
      </div>
      <span className="afi-feature-value" title={feature.displayValue}>
        {feature.displayValue}
      </span>
      <span className="afi-feature-state">
        {feature.available ? (
          <CircleCheck
            size={mobile ? 24 : 23}
            fill="#075df6"
            stroke="white"
            strokeWidth={2.35}
          />
        ) : (
          <CircleMinus size={mobile ? 24 : 23} strokeWidth={1.8} />
        )}
      </span>
    </motion.div>
  );
}

function FeatureTable({
  activeCategory,
  filteredFeatures,
  activeTab,
  mobile = false,
}) {
  return (
    <motion.section
      variants={fadeUp}
      className={`afi-feature-table ${mobile ? "mobile" : ""}`}
    >
      <div className="afi-section-head">
        <div>
          <h2>
            {activeCategory === "all"
              ? "All features"
              : `${activeTab?.label || "Selected"} features`}
          </h2>
          <p>{filteredFeatures.length} matching feature records</p>
        </div>
        <span>
          {filteredFeatures.filter((feature) => feature.available).length}{" "}
          available
        </span>
      </div>

      <div className="afi-feature-list">
        <AnimatePresence mode="popLayout">
          {filteredFeatures.length ? (
            filteredFeatures.map((feature) => (
              <FeatureRow key={feature.id} feature={feature} mobile={mobile} />
            ))
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="afi-empty-features"
            >
              <Search size={25} />
              <strong>No feature found</strong>
              <p>Try searching another feature or switch category.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function QuickSpecs({ specs = [], mobile = false }) {
  if (!specs.length) return null;

  return (
    <motion.section
      variants={fadeUp}
      className={`afi-card afi-specs-card ${mobile ? "mobile" : ""}`}
    >
      <div className="afi-card-head">
        <h3>Quick specs</h3>
        <Gauge size={16} />
      </div>
      <div className="afi-spec-grid">
        {specs.slice(0, mobile ? 6 : 10).map((spec) => (
          <div key={spec.id || `${spec.label}-${spec.value}`}>
            <small>{spec.label}</small>
            <strong>{spec.value || "—"}</strong>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function HighlightsCard({ highlights = [], mobile = false }) {
  if (!highlights.length) return null;

  return (
    <motion.section
      variants={fadeUp}
      className={`afi-card ${mobile ? "mobile" : ""}`}
    >
      <div className="afi-card-head">
        <h3>Highlights</h3>
        <Sparkles size={16} fill="currentColor" />
      </div>
      <div className="afi-highlight-list">
        {highlights.slice(0, mobile ? 5 : 8).map((item) => (
          <p key={item.id || item.label}>
            <Check size={15} />
            {item.label}
          </p>
        ))}
      </div>
    </motion.section>
  );
}

function SuggestedQuestions({
  vehicle,
  selectedVariant,
  onAction,
  mobile = false,
}) {
  const model = vehicle?.model || "this car";
  const variant =
    selectedVariant?.label ||
    selectedVariant?.variant ||
    vehicle?.selectedVariant ||
    vehicle?.variant ||
    "";
  const prefix = `${model}${variant ? ` ${variant}` : ""}`;

  const questions = [
    {
      label: "Does it have sunroof?",
      query: `Does ${prefix} have sunroof?`,
      icon: "☀️",
    },
    {
      label: "How many airbags?",
      query: `How many airbags does ${prefix} have?`,
      icon: "🛡️",
    },
    {
      label: "Show ADAS variants",
      query: `Which ${model} variants have ADAS?`,
      icon: "✨",
      discovery: true,
    },
  ];

  return (
    <motion.section
      variants={fadeUp}
      className={`afi-card afi-questions-card ${mobile ? "mobile" : ""}`}
    >
      <div className="afi-card-head">
        <h3>Ask next</h3>
        <Info size={16} />
      </div>
      <div className="afi-question-list">
        {questions.map((question) => (
          <button
            key={question.query}
            type="button"
            onClick={() =>
              fireFeatureAction(onAction, {
                label: question.label,
                query: question.query,
                type: question.discovery
                  ? "feature_discovery"
                  : "feature_answer",
                intent: question.discovery
                  ? "vehicle_feature_discovery"
                  : "vehicle_feature_answer",
                canvasType: question.discovery
                  ? "feature_match_builder_canvas"
                  : "",
                vehicle,
                contextPatch: {
                  anchorVariant: variant,
                  feature: question.label,
                },
              })
            }
          >
            <span>{question.icon}</span>
            <strong>{question.label}</strong>
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
    </motion.section>
  );
}

function DesktopHero({
  title,
  image,
  selectedVariant,
  variants,
  selectedVariantId,
  setSelectedVariantId,
  query,
  setQuery,
  vehicle,
}) {
  const exShowroom = getVariantPriceLabel(selectedVariant);
  const onRoad = getOnRoadLabel(selectedVariant);

  return (
    <motion.section variants={fadeUp} className="afi-desktop-hero">
      <div className="afi-hero-glow" />
      <div className="afi-hero-image-wrap">
        <VehicleImage src={image} title={title} />
      </div>

      <div className="afi-hero-copy">
        <div className="afi-eyebrow">
          <Sparkles size={15} fill="currentColor" />
          Features Explorer
        </div>
        <h1>{title}</h1>
        <div className="afi-variant-title-row">
          <strong>
            {selectedVariant?.label || vehicle?.selectedVariant || "Variant"}
          </strong>
          <ActiveStatusBadge variant={selectedVariant} />
        </div>

        <div className="afi-price-row">
          {exShowroom ? (
            <StatPill
              icon={BadgeIndianRupee}
              label="ex-showroom"
              value={exShowroom}
            />
          ) : null}
          {onRoad ? (
            <StatPill icon={BadgeIndianRupee} label="on-road" value={onRoad} />
          ) : null}
          <StatPill
            icon={Layers3}
            label="features"
            value={
              selectedVariant?.featureCount || vehicle?.featureCount || "—"
            }
          />
        </div>

        <div className="afi-hero-controls">
          <VariantSelect
            variants={variants}
            selectedVariantId={selectedVariantId}
            setSelectedVariantId={setSelectedVariantId}
          />
          <SearchBox query={query} setQuery={setQuery} />
        </div>
      </div>
    </motion.section>
  );
}

function DesktopLayout(props) {
  const {
    title,
    image,
    variants,
    selectedVariant,
    selectedVariantId,
    setSelectedVariantId,
    activeCategory,
    setActiveCategory,
    query,
    setQuery,
    tabs,
    activeTab,
    filteredFeatures,
    quickSpecs,
    highlights,
    vehicle,
    onAction,
  } = props;

  return (
    <section className="afi-desktop-shell">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="afi-desktop-page"
      >
        <header className="afi-desktop-header">
          <button
            type="button"
            className="afi-back-button"
            onClick={() =>
              fireFeatureAction(onAction, {
                label: "Back to car",
                type: "back_to_car",
                intent: ACI_INTENTS.OPEN_VEHICLE,
                canvasType: ACI_CANVAS_TYPES.CAR_OVERVIEW,
                vehicle,
              })
            }
          >
            <ArrowLeft size={19} />
            Back
          </button>
          <AciLogo compact onAction={onAction} />
          <button
            type="button"
            className="afi-bell-button"
            onClick={() =>
              fireFeatureAction(onAction, {
                label: "Notifications",
                type: "notifications",
                vehicle,
              })
            }
          >
            <Bell size={20} />
            <i />
          </button>
        </header>

        <DesktopHero
          title={title}
          image={image}
          selectedVariant={selectedVariant}
          variants={variants}
          selectedVariantId={selectedVariantId}
          setSelectedVariantId={setSelectedVariantId}
          query={query}
          setQuery={setQuery}
          vehicle={vehicle}
        />

        <section className="afi-main-grid">
          <div className="afi-main-left">
            <FeatureTabs
              tabs={tabs}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
            />
            <FeatureTable
              activeCategory={activeCategory}
              activeTab={activeTab}
              filteredFeatures={filteredFeatures}
            />
          </div>
          <aside className="afi-side-rail">
            <QuickSpecs specs={quickSpecs} />
            <HighlightsCard highlights={highlights} />
            <SuggestedQuestions
              vehicle={vehicle}
              selectedVariant={selectedVariant}
              onAction={onAction}
            />
          </aside>
        </section>
      </motion.div>

      <div className="afi-desktop-composer">
        <AciComposer
          selectedVehicle={vehicle}
          onAction={onAction}
          placeholder={`Ask about ${title} features...`}
        />
      </div>
    </section>
  );
}

function MobileLayout(props) {
  const {
    title,
    image,
    variants,
    selectedVariant,
    selectedVariantId,
    setSelectedVariantId,
    activeCategory,
    setActiveCategory,
    query,
    setQuery,
    tabs,
    activeTab,
    filteredFeatures,
    quickSpecs,
    highlights,
    vehicle,
    onAction,
  } = props;

  const exShowroom = getVariantPriceLabel(selectedVariant);

  return (
    <section className="afi-mobile-shell">
      <motion.main
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="afi-mobile-page"
      >
        <header className="afi-mobile-header">
          <button
            type="button"
            onClick={() =>
              fireFeatureAction(onAction, {
                label: "Back",
                type: "back_to_car",
                intent: ACI_INTENTS.OPEN_VEHICLE,
                canvasType: ACI_CANVAS_TYPES.CAR_OVERVIEW,
                vehicle,
              })
            }
          >
            <ArrowLeft size={25} />
          </button>
          <AciLogo mobile compact onAction={onAction} />
          <button
            type="button"
            onClick={() =>
              fireFeatureAction(onAction, {
                label: "Notifications",
                type: "notifications",
                vehicle,
              })
            }
          >
            <Bell size={22} />
            <i />
          </button>
        </header>

        <motion.section variants={fadeUp} className="afi-mobile-title">
          <span>Features Explorer</span>
          <h1>{title}</h1>
          <p>{selectedVariant?.label || "Select variant"}</p>
        </motion.section>

        <motion.section variants={fadeUp} className="afi-mobile-hero">
          <div className="afi-mobile-car-wrap">
            <VehicleImage src={image} title={title} mobile />
          </div>
          <div className="afi-mobile-hero-copy">
            <ActiveStatusBadge variant={selectedVariant} compact />
            <strong>{selectedVariant?.label || "Variant"}</strong>
            {exShowroom ? (
              <p>
                {exShowroom} <small>ex-showroom</small>
              </p>
            ) : null}
            <span>
              {selectedVariant?.availableCount || 0}/
              {selectedVariant?.featureCount || filteredFeatures.length}{" "}
              available
            </span>
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="afi-mobile-controls">
          <VariantSelect
            variants={variants}
            selectedVariantId={selectedVariantId}
            setSelectedVariantId={setSelectedVariantId}
            compact
          />
          <SearchBox
            query={query}
            setQuery={setQuery}
            placeholder="Search features"
          />
        </motion.section>

        <FeatureTabs
          tabs={tabs}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          mobile
        />
        <QuickSpecs specs={quickSpecs} mobile />
        <HighlightsCard highlights={highlights} mobile />
        <FeatureTable
          activeCategory={activeCategory}
          activeTab={activeTab}
          filteredFeatures={filteredFeatures}
          mobile
        />
        <SuggestedQuestions
          vehicle={vehicle}
          selectedVariant={selectedVariant}
          onAction={onAction}
          mobile
        />
      </motion.main>

      <div className="afi-mobile-composer">
        <AciComposer
          mobile
          selectedVehicle={vehicle}
          onAction={onAction}
          placeholder="Ask about features..."
        />
      </div>
    </section>
  );
}

export function AciFeatureAnswerInlineCard({
  widget = {},
  data = {},
  vehicle = {},
  onAction,
}) {
  const answer = cleanText(
    widget.answer || data.answer || widget.title || "Feature answer",
  );
  const feature = cleanText(
    widget.feature ||
      widget.matchedFeature ||
      data.feature ||
      data.matchedFeature ||
      "Feature",
  );
  const value = cleanText(
    widget.value ||
      widget.displayValue ||
      data.value ||
      data.displayValue ||
      "",
  );
  const available =
    widget.available ?? widget.present ?? data.available ?? data.present;
  const isAvailable = available === false ? false : !isUnavailableValue(value);

  return (
    <section className="afi-inline-card">
      <span className={isAvailable ? "yes" : "no"}>
        {isAvailable ? <CircleCheck size={18} /> : <CircleMinus size={18} />}
      </span>
      <div>
        <strong>{feature}</strong>
        <p>{answer}</p>
        {value ? <small>{value}</small> : null}
      </div>
      <button
        type="button"
        onClick={() =>
          fireFeatureAction(onAction, {
            label: "Open features",
            query: `Show features of ${vehicle?.model || "this car"}`,
            intent: "vehicle_model_features_explorer",
            canvasType: "features_explorer_canvas",
            vehicle,
          })
        }
      >
        Open explorer
      </button>
    </section>
  );
}

export default function AciAssistFeaturesScreen({
  data = {},
  vehicle = {},
  widget = {},
  message = {},
  onAction,
}) {
  const resolvedWidget = useMemo(
    () => getResolvedWidget({ widget, data, message }),
    [widget, data, message],
  );
  const resolvedVehicle = useMemo(
    () =>
      getResolvedVehicle({ vehicle, widget: resolvedWidget, data, message }),
    [vehicle, resolvedWidget, data, message],
  );

  const variants = useMemo(
    () => collectVariants(resolvedWidget, resolvedVehicle),
    [resolvedWidget, resolvedVehicle],
  );
  const initialVariantId = useMemo(
    () => getSelectedVariantId(resolvedWidget, resolvedVehicle, variants),
    [resolvedWidget, resolvedVehicle, variants],
  );

  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSelectedVariantId((current) => {
      if (current && variants.some((variant) => variant.id === current))
        return current;
      return initialVariantId || variants[0]?.id || "";
    });
  }, [variants, initialVariantId]);

  const selectedVariant = useMemo(
    () =>
      variants.find((variant) => variant.id === selectedVariantId) ||
      variants[0] ||
      null,
    [variants, selectedVariantId],
  );

  const features = useMemo(
    () => getVariantFeatureRows({ widget: resolvedWidget, selectedVariant }),
    [resolvedWidget, selectedVariant],
  );
  const featureGroups = useMemo(
    () =>
      getVariantGroups({ widget: resolvedWidget, selectedVariant, features }),
    [resolvedWidget, selectedVariant, features],
  );
  const tabs = useMemo(
    () => buildCategoryTabs(featureGroups, features),
    [featureGroups, features],
  );
  const activeTab = tabs.find((tab) => tab.id === activeCategory) || tabs[0];

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeCategory)) {
      setActiveCategory(tabs[0]?.id || "all");
    }
  }, [tabs, activeCategory]);

  const filteredFeatures = useMemo(() => {
    return features.filter((feature) => {
      const categoryMatch =
        activeCategory === "all" || feature.category === activeCategory;
      return categoryMatch && featureMatchesSearch(feature, query);
    });
  }, [features, activeCategory, query]);

  const quickSpecs = useMemo(
    () => getQuickSpecs({ widget: resolvedWidget, selectedVariant }),
    [resolvedWidget, selectedVariant],
  );
  const highlights = useMemo(
    () => getHighlights({ widget: resolvedWidget, selectedVariant, features }),
    [resolvedWidget, selectedVariant, features],
  );

  const title = useMemo(
    () => getVehicleTitle(resolvedVehicle, resolvedWidget),
    [resolvedVehicle, resolvedWidget],
  );
  const image = useMemo(
    () =>
      getDisplayCarImage(resolvedVehicle) ||
      extractImage(resolvedWidget) ||
      extractImage(data) ||
      extractImage(message) ||
      extractImage(resolvedVehicle),
    [resolvedVehicle, resolvedWidget, data, message],
  );

  const selectedVehicle = useMemo(
    () => ({
      ...resolvedVehicle,
      selectedVariant:
        selectedVariant?.label ||
        resolvedVehicle.selectedVariant ||
        resolvedVehicle.variant,
      variant: selectedVariant?.label || resolvedVehicle.variant,
      variantId: selectedVariant?.id,
      exShowroomPrice: selectedVariant?.exShowroomPrice,
      onRoadPrice: selectedVariant?.onRoadPrice,
      priceLabel: getVariantPriceLabel(selectedVariant),
      featureCount: selectedVariant?.featureCount || features.length,
      availableFeatureCount:
        selectedVariant?.availableCount ||
        features.filter((feature) => feature.available).length,
    }),
    [resolvedVehicle, selectedVariant, features],
  );

  const sharedProps = {
    title,
    image,
    variants,
    selectedVariant,
    selectedVariantId,
    setSelectedVariantId,
    activeCategory,
    setActiveCategory,
    query,
    setQuery,
    tabs,
    activeTab,
    filteredFeatures,
    quickSpecs,
    highlights,
    vehicle: selectedVehicle,
    onAction,
  };

  return (
    <div
      className="afi-root"
      data-canvas="features_explorer_canvas"
      data-selected-variant={selectedVariant?.label || ""}
    >
      <style>{styles}</style>
      <DesktopLayout {...sharedProps} />
      <MobileLayout {...sharedProps} />
    </div>
  );
}

const styles = `
  :root {
    --afi-blue: #075df6;
    --afi-blue-dark: #0448d8;
    --afi-ink: #07102b;
    --afi-text: #334155;
    --afi-muted: #64748b;
    --afi-line: #dbe3ef;
    --afi-soft: #f6f9ff;
    --afi-serif: "Iowan Old Style", "Apple Garamond", "Palatino Linotype", "Book Antiqua", Georgia, serif;
    --afi-sans: Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
  }

  * { box-sizing: border-box; }

  .afi-root {
    min-height: 100vh;
    width: 100%;
    color: var(--afi-ink);
    font-family: var(--afi-sans);
    background:
      radial-gradient(circle at 84% -10%, rgba(37, 99, 235, .08), transparent 30%),
      radial-gradient(circle at 8% 16%, rgba(219, 234, 254, .42), transparent 28%),
      linear-gradient(180deg, #fff 0%, #f8fbff 100%);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  .afi-root button,
  .afi-root input,
  .afi-root select { font: inherit; }
  .afi-root button { cursor: pointer; -webkit-tap-highlight-color: transparent; }

  .afi-mobile-shell { display: none; }

  .afi-desktop-shell { display: block; }
  .afi-desktop-page { width: min(100%, 1530px); margin: 0 auto; padding: 26px 42px 116px; }

  .afi-desktop-header {
    height: 54px;
    display: grid;
    grid-template-columns: 120px 1fr 120px;
    align-items: center;
    margin-bottom: 18px;
  }

  .afi-back-button,
  .afi-bell-button {
    height: 40px;
    border: 1px solid rgba(219, 227, 239, .9);
    background: rgba(255, 255, 255, .9);
    color: #334155;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    box-shadow: 0 18px 44px -36px rgba(15, 23, 42, .42), inset 0 1px 0 #fff;
  }

  .afi-back-button { justify-self: start; padding: 0 14px; font-size: 12.5px; font-weight: 760; }
  .afi-bell-button { justify-self: end; position: relative; width: 40px; padding: 0; }
  .afi-bell-button i { position: absolute; right: 9px; top: 7px; width: 8px; height: 8px; background: var(--afi-blue); border: 2px solid #fff; border-radius: 999px; }

  .afi-desktop-hero {
    position: relative;
    min-height: 360px;
    overflow: hidden;
    border-radius: 32px;
    border: 1px solid rgba(219, 227, 239, .92);
    background: linear-gradient(135deg, #f5f9ff 0%, #ffffff 46%, #edf5ff 100%);
    box-shadow: 0 34px 96px -68px rgba(15, 23, 42, .56), inset 0 1px 0 rgba(255,255,255,.96);
    display: grid;
    grid-template-columns: 47% 53%;
    align-items: center;
    gap: 26px;
    padding: 30px 38px;
  }

  .afi-hero-glow {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 27% 54%, rgba(255,255,255,.98), transparent 30%),
      radial-gradient(circle at 80% 25%, rgba(219,234,254,.52), transparent 32%),
      repeating-radial-gradient(ellipse at 84% 32%, rgba(255,255,255,.62) 0, rgba(255,255,255,.62) 2px, transparent 3px, transparent 24px);
    opacity: .9;
  }

  .afi-hero-image-wrap {
    position: relative;
    z-index: 2;
    min-height: 280px;
    display: grid;
    place-items: center;
  }

  .afi-car-image {
    display: block;
    width: min(100%, 680px);
    max-height: 300px;
    object-fit: contain;
    mix-blend-mode: multiply;
    filter: drop-shadow(0 28px 26px rgba(15,23,42,.16));
    user-select: none;
  }

  .afi-car-placeholder {
    height: 280px;
    width: min(100%, 640px);
    display: grid;
    place-items: center;
    border-radius: 26px;
    border: 1px solid rgba(219, 227, 239, .92);
    background: radial-gradient(circle at 50% 42%, #ffffff 0%, #f8fafc 38%, #eaf2ff 100%);
    color: #94a3b8;
  }

  .afi-hero-copy { position: relative; z-index: 3; min-width: 0; }
  .afi-eyebrow { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 11px; border-radius: 999px; background: rgba(239, 246, 255, .9); color: var(--afi-blue); font-size: 11.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  .afi-hero-copy h1 { margin: 15px 0 0; font-family: var(--afi-serif); font-size: clamp(42px, 4vw, 62px); line-height: .9; letter-spacing: -.065em; font-weight: 560; color: #03091f; }
  .afi-variant-title-row { margin-top: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
  .afi-variant-title-row strong { color: var(--afi-blue); font-size: 25px; line-height: 1; font-weight: 760; letter-spacing: -.035em; }

  .afi-status-badge { display: inline-flex; align-items: center; height: 28px; padding: 0 10px; border-radius: 999px; font-size: 11px; font-weight: 820; }
  .afi-status-badge.current { color: #047857; background: #ecfdf5; border: 1px solid #bbf7d0; }
  .afi-status-badge.inactive { color: #b45309; background: #fffbeb; border: 1px solid #fde68a; }
  .afi-status-badge.compact { height: 25px; font-size: 10.5px; }

  .afi-price-row { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 10px; }
  .afi-stat-pill { min-height: 42px; display: inline-grid; grid-template-columns: 18px auto; column-gap: 7px; align-items: center; padding: 8px 12px; border-radius: 15px; border: 1px solid rgba(219, 227, 239, .92); background: rgba(255,255,255,.86); box-shadow: inset 0 1px 0 #fff; color: #475569; }
  .afi-stat-pill svg { color: var(--afi-blue); grid-row: 1 / span 2; }
  .afi-stat-pill strong { color: #07102b; font-size: 13.5px; line-height: 1; font-weight: 820; }
  .afi-stat-pill em { margin-top: 2px; font-size: 10px; line-height: 1; color: #64748b; font-style: normal; font-weight: 650; text-transform: uppercase; letter-spacing: .08em; }

  .afi-hero-controls { margin-top: 20px; display: grid; grid-template-columns: minmax(220px, 310px) minmax(260px, 1fr); gap: 12px; align-items: center; }
  .afi-variant-select { position: relative; min-width: 0; height: 48px; display: grid; grid-template-columns: auto 1fr 18px; align-items: center; gap: 8px; padding: 0 13px; border-radius: 15px; border: 1px solid rgba(219, 227, 239, .95); background: rgba(255,255,255,.94); box-shadow: 0 18px 46px -38px rgba(15,23,42,.46), inset 0 1px 0 #fff; }
  .afi-variant-select span { color: #64748b; font-size: 11px; font-weight: 770; white-space: nowrap; }
  .afi-variant-select select { min-width: 0; width: 100%; appearance: none; border: 0; background: transparent; outline: none; color: var(--afi-blue); font-size: 12.5px; font-weight: 800; }
  .afi-variant-select svg { pointer-events: none; color: #64748b; }
  .afi-variant-select.compact { height: 44px; border-radius: 14px; }

  .afi-search-box { height: 48px; min-width: 0; display: grid; grid-template-columns: 34px 1fr; align-items: center; padding: 0 13px; border-radius: 15px; border: 1px solid rgba(219,227,239,.95); background: rgba(255,255,255,.94); color: #64748b; box-shadow: 0 18px 46px -38px rgba(15,23,42,.46), inset 0 1px 0 #fff; }
  .afi-search-box input { min-width: 0; border: 0; background: transparent; outline: none; color: #172033; font-size: 13px; font-weight: 500; }
  .afi-search-box input::placeholder { color: #94a3b8; }

  .afi-main-grid { margin-top: 24px; display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; align-items: start; }
  .afi-main-left { min-width: 0; display: grid; gap: 16px; }
  .afi-side-rail { position: sticky; top: 18px; display: grid; gap: 14px; }

  .afi-category-tabs { display: flex; flex-wrap: wrap; gap: 11px; }
  .afi-category-tabs button { min-height: 52px; display: inline-grid; grid-template-columns: 20px auto auto; align-items: center; gap: 8px; padding: 0 14px; border-radius: 17px; border: 1px solid rgba(219,227,239,.95); background: rgba(255,255,255,.94); color: #172033; box-shadow: 0 16px 38px -32px rgba(15,23,42,.38); font-size: 12.5px; font-weight: 760; }
  .afi-category-tabs button small { color: #94a3b8; font-size: 10.5px; font-weight: 760; }
  .afi-category-tabs button.active { border-color: rgba(7,93,246,.6); color: var(--afi-blue); background: #eff6ff; box-shadow: 0 18px 42px -28px rgba(37,99,235,.36); }
  .afi-category-tabs button.active small { color: var(--afi-blue); }

  .afi-feature-table,
  .afi-card { border-radius: 24px; border: 1px solid rgba(219,227,239,.95); background: rgba(255,255,255,.95); box-shadow: 0 24px 70px -58px rgba(15,23,42,.5), inset 0 1px 0 #fff; }
  .afi-feature-table { padding: 18px; }
  .afi-section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .afi-section-head h2 { margin: 0; font-family: var(--afi-serif); color: #07102b; font-size: 25px; line-height: 1; letter-spacing: -.05em; font-weight: 560; }
  .afi-section-head p { margin: 7px 0 0; color: #64748b; font-size: 12px; font-weight: 560; }
  .afi-section-head > span { height: 32px; display: inline-flex; align-items: center; padding: 0 11px; border-radius: 999px; background: #eff6ff; color: var(--afi-blue); font-size: 11.5px; font-weight: 820; }

  .afi-feature-list { margin-top: 15px; overflow: hidden; border-radius: 20px; border: 1px solid #e2e8f0; background: #fff; }
  .afi-feature-row { display: grid; grid-template-columns: 54px minmax(0, 1fr) minmax(90px, 160px) 34px; align-items: center; gap: 12px; min-height: 64px; padding: 10px 14px; border-bottom: 1px solid #e8eef7; }
  .afi-feature-row:last-child { border-bottom: 0; }
  .afi-feature-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 15px; border: 1px solid #dbeafe; background: #f1f6ff; color: var(--afi-blue); }
  .afi-feature-main { min-width: 0; }
  .afi-feature-main strong { display: block; color: #07102b; font-size: 14px; line-height: 1.12; font-weight: 710; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .afi-feature-main small { display: block; margin-top: 4px; color: #94a3b8; font-size: 10.8px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .afi-feature-value { justify-self: start; max-width: 160px; color: #475569; font-size: 12.2px; line-height: 1.2; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .afi-feature-state { color: #94a3b8; display: grid; place-items: center; }

  .afi-card { padding: 16px; }
  .afi-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .afi-card-head h3 { margin: 0; color: #07102b; font-size: 13.5px; font-weight: 820; letter-spacing: -.01em; }
  .afi-card-head svg { color: var(--afi-blue); }
  .afi-spec-grid { margin-top: 13px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
  .afi-spec-grid div { min-height: 58px; padding: 10px; border-radius: 15px; border: 1px solid #e5edf7; background: #fbfdff; }
  .afi-spec-grid small { display: block; color: #94a3b8; font-size: 10px; font-weight: 760; text-transform: uppercase; letter-spacing: .06em; }
  .afi-spec-grid strong { display: block; margin-top: 6px; color: #0f172a; font-size: 12.2px; line-height: 1.2; font-weight: 780; }
  .afi-highlight-list { margin-top: 13px; display: grid; gap: 9px; }
  .afi-highlight-list p { margin: 0; display: grid; grid-template-columns: 20px 1fr; gap: 7px; align-items: start; color: #475569; font-size: 12.2px; line-height: 1.35; font-weight: 620; }
  .afi-highlight-list svg { margin-top: 1px; padding: 3px; color: #fff; background: var(--afi-blue); border-radius: 999px; }
  .afi-question-list { margin-top: 13px; display: grid; gap: 8px; }
  .afi-question-list button { min-height: 46px; border: 1px solid #e2e8f0; border-radius: 15px; background: #fff; display: grid; grid-template-columns: 28px 1fr 18px; gap: 8px; align-items: center; padding: 8px 10px; text-align: left; color: #0f172a; }
  .afi-question-list strong { font-size: 12px; line-height: 1.15; font-weight: 760; }

  .afi-empty-features { min-height: 180px; display: grid; place-items: center; text-align: center; padding: 30px; color: #94a3b8; }
  .afi-empty-features strong { display: block; margin-top: 8px; color: #475569; font-size: 14px; }
  .afi-empty-features p { margin: 5px 0 0; color: #94a3b8; font-size: 12px; }

  .afi-desktop-composer { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 80; width: min(720px, calc(100vw - 56px)); }
  .afi-desktop-composer .colors-composer-dock,
  .afi-mobile-composer .mobile-chat-dock { position: static !important; transform: none !important; width: 100% !important; padding: 0 !important; background: transparent !important; backdrop-filter: none !important; }

  .afi-inline-card { display: grid; grid-template-columns: 38px 1fr auto; gap: 12px; align-items: center; border-radius: 20px; border: 1px solid #dbe3ef; background: rgba(255,255,255,.96); padding: 13px; box-shadow: 0 18px 46px -36px rgba(15,23,42,.4); }
  .afi-inline-card > span { width: 34px; height: 34px; border-radius: 999px; display: grid; place-items: center; }
  .afi-inline-card > span.yes { color: #fff; background: var(--afi-blue); }
  .afi-inline-card > span.no { color: #64748b; background: #f1f5f9; }
  .afi-inline-card strong { display: block; color: #07102b; font-size: 13px; font-weight: 820; }
  .afi-inline-card p { margin: 3px 0 0; color: #475569; font-size: 12px; line-height: 1.35; }
  .afi-inline-card small { display: block; margin-top: 4px; color: var(--afi-blue); font-weight: 760; }
  .afi-inline-card button { height: 34px; border: 0; border-radius: 999px; background: var(--afi-blue); color: #fff; padding: 0 12px; font-size: 11.5px; font-weight: 820; }

  @media (max-width: 1180px) {
    .afi-desktop-shell { display: none; }
    .afi-mobile-shell { display: block; }
    .afi-root { background: linear-gradient(180deg, #fff 0%, #f8fbff 100%); }
    .afi-mobile-page { width: 100%; max-width: 430px; min-height: 100vh; margin: 0 auto; padding: 16px 14px calc(112px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 14px; }
    .afi-mobile-header { height: 48px; display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; gap: 8px; }
    .afi-mobile-header button { position: relative; width: 40px; height: 40px; border: 0; border-radius: 999px; background: transparent; color: #334155; display: grid; place-items: center; }
    .afi-mobile-header button:last-child { justify-self: end; }
    .afi-mobile-header button i { position: absolute; right: 8px; top: 7px; width: 8px; height: 8px; border-radius: 999px; background: var(--afi-blue); border: 2px solid #fff; }
    .afi-mobile-title { padding: 6px 2px 0; }
    .afi-mobile-title span { color: #334155; text-transform: uppercase; letter-spacing: .24em; font-size: 10px; font-weight: 820; }
    .afi-mobile-title h1 { margin: 9px 0 0; color: #050b22; font-family: var(--afi-serif); font-size: 39px; line-height: .9; letter-spacing: -.062em; font-weight: 560; }
    .afi-mobile-title p { margin: 7px 0 0; color: #64748b; font-size: 17px; line-height: 1.05; font-weight: 520; }
    .afi-mobile-hero { position: relative; min-height: 234px; overflow: hidden; border-radius: 27px; border: 1px solid rgba(219,227,239,.94); background: linear-gradient(135deg, #f5f9ff 0%, #ffffff 48%, #edf4ff 100%); box-shadow: 0 28px 78px -62px rgba(15,23,42,.58), inset 0 1px 0 #fff; padding: 18px; display: grid; grid-template-columns: 48% 52%; gap: 8px; align-items: center; }
    .afi-mobile-car-wrap { min-width: 0; display: grid; place-items: center; }
    .afi-car-placeholder.mobile { height: 150px; width: 100%; border-radius: 22px; }
    .afi-mobile-hero .afi-car-image { width: 124%; max-height: 165px; transform: translateX(-8%); filter: drop-shadow(0 18px 18px rgba(15,23,42,.15)); }
    .afi-mobile-hero-copy { min-width: 0; position: relative; z-index: 2; }
    .afi-mobile-hero-copy strong { display: block; margin-top: 9px; color: var(--afi-blue); font-size: 22px; line-height: 1; letter-spacing: -.04em; font-weight: 820; }
    .afi-mobile-hero-copy p { margin: 10px 0 0; color: #07102b; font-size: 17px; line-height: 1; font-weight: 760; }
    .afi-mobile-hero-copy p small { display: block; margin-top: 4px; color: #64748b; font-size: 10px; font-weight: 760; text-transform: uppercase; letter-spacing: .08em; }
    .afi-mobile-hero-copy > span:last-child { margin-top: 10px; display: inline-flex; height: 30px; align-items: center; border-radius: 999px; background: #eff6ff; color: var(--afi-blue); padding: 0 10px; font-size: 11px; font-weight: 820; }
    .afi-mobile-controls { display: grid; gap: 10px; }
    .afi-mobile-controls .afi-search-box { height: 44px; border-radius: 14px; }
    .afi-category-tabs.mobile { display: flex; gap: 10px; overflow-x: auto; padding: 1px 1px 5px; flex-wrap: nowrap; scrollbar-width: none; }
    .afi-category-tabs.mobile::-webkit-scrollbar { display: none; }
    .afi-category-tabs.mobile button { min-height: 50px; flex: 0 0 auto; grid-template-columns: 18px auto; padding: 0 12px; border-radius: 16px; font-size: 12px; }
    .afi-category-tabs.mobile button small { grid-column: 2; justify-self: start; margin-top: -4px; }
    .afi-feature-table.mobile,
    .afi-card.mobile { border-radius: 23px; padding: 14px; }
    .afi-section-head h2 { font-size: 20px; }
    .afi-feature-row.mobile { grid-template-columns: 46px minmax(0,1fr) 34px; gap: 10px; min-height: 61px; padding: 10px; }
    .afi-feature-row.mobile .afi-feature-value { grid-column: 2; max-width: 100%; font-size: 11.2px; margin-top: -6px; }
    .afi-feature-row.mobile .afi-feature-state { grid-column: 3; grid-row: 1 / span 2; }
    .afi-feature-row.mobile .afi-feature-icon { width: 40px; height: 40px; border-radius: 14px; }
    .afi-feature-main strong { font-size: 13.6px; }
    .afi-spec-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .afi-mobile-composer { position: fixed; left: 14px; right: 14px; bottom: calc(10px + env(safe-area-inset-bottom)); z-index: 100; max-width: 402px; margin: 0 auto; }
  }
`;
