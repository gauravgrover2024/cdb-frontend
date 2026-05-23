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
  Music2,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
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
  interior: { label: "Interior", Icon: Armchair },
  exterior: { label: "Exterior", Icon: Camera },
  safety: { label: "Safety", Icon: ShieldCheck },
  infotainment: { label: "Infotainment", Icon: Music2 },
  convenience: { label: "Convenience", Icon: Wand2 },
  adas: { label: "ADAS", Icon: Route },
  engine: { label: "Engine", Icon: Gauge },
  performance: { label: "Performance", Icon: Gauge },
  chassis: { label: "Chassis", Icon: Car },
  dimensions: { label: "Space", Icon: Car },
  key_specs: { label: "Key specs", Icon: Layers3 },
  key_features: { label: "Key features", Icon: Sparkles },
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

const firstArray = (...values) => {
  for (const value of values) {
    const list = asArray(value);
    if (list.length) return list;
  }

  return [];
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

const normalizeLookupKey = (value = "") =>
  cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeCategoryId = (value = "") => {
  const raw = normalizeKey(value);
  const slug = slugify(raw, "other");

  if (!raw || slug === "other") return "other";
  if (/comfort|convenience/.test(raw)) return "comfort";
  if (/interior|cabin|seat|upholstery|cluster|tachometer/.test(raw))
    return "interior";
  if (
    /exterior|tyre|wheel|lamp|headlamp|drl|roof|sunroof|spoiler|antenna|orvm|wiper|defogger/.test(
      raw,
    )
  )
    return "exterior";
  if (/safety|airbag|brake|abs|esc|ebd|isofix|tpms|lock|alert|camera/.test(raw))
    return "safety";
  if (
    /infotainment|entertainment|communication|audio|speaker|touchscreen|android|apple|bluetooth|usb|phone/.test(
      raw,
    )
  )
    return "infotainment";
  if (
    /adas|driver assist|collision|lane|blind spot|adaptive|cross traffic/.test(
      raw,
    )
  )
    return "adas";
  if (
    /engine|transmission|gearbox|displacement|power|torque|turbo|cylinder/.test(
      raw,
    )
  )
    return "engine";
  if (/performance|fuel|mileage|emission/.test(raw)) return "performance";
  if (/chassis|suspension|steering|brake type/.test(raw)) return "chassis";
  if (
    /dimension|capacity|length|width|height|boot|wheel base|door|body/.test(raw)
  )
    return "dimensions";
  if (/key spec|specification/.test(raw)) return "key_specs";
  if (/key feature|highlight/.test(raw)) return "key_features";

  return CATEGORY_META[slug] ? slug : "other";
};

const getMatrixValueForVariant = (item = {}, selectedVariant = {}) => {
  const values = item?.values;
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return null;
  }

  const candidates = [
    selectedVariant?.variantKey,
    selectedVariant?.key,
    selectedVariant?.id,
    normalizeLookupKey(selectedVariant?.label),
    normalizeLookupKey(selectedVariant?.variant),
    normalizeLookupKey(selectedVariant?.variantName),
  ].filter(Boolean);

  for (const key of candidates) {
    if (values[key]) return values[key];
  }

  const selectedName = normalizeKey(
    selectedVariant?.label ||
      selectedVariant?.variant ||
      selectedVariant?.variantName ||
      "",
  );

  if (!selectedName) return null;

  return (
    Object.values(values).find(
      (entry) =>
        normalizeKey(entry?.variant || entry?.variantName || entry?.label) ===
        selectedName,
    ) || null
  );
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

const parsePriceNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const raw = cleanText(value).toLowerCase();
  if (!raw) return 0;

  const numeric = Number(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;

  if (/cr|crore/.test(raw)) return numeric * 10000000;
  if (/lakh|lac|\bl\b/.test(raw)) return numeric * 100000;
  return numeric;
};

const getVariantBudgetPrice = (variant = {}) => {
  const candidates = [
    variant.exShowroomPrice,
    variant.price,
    variant.priceMin,
    variant.priceMax,
    variant.onRoadPrice,
    variant.priceLabel,
    variant.exShowroomPriceLabel,
  ];

  for (const candidate of candidates) {
    const parsed = parsePriceNumber(candidate);
    if (parsed > 0) return parsed;
  }

  return 0;
};

const formatBudgetShort = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "—";
  if (numeric >= 10000000) return `₹${(numeric / 10000000).toFixed(2)} Cr`;
  return `₹${(numeric / 100000).toFixed(2)} L`;
};

const isKeySpecsFeature = (feature = {}) => {
  const category = normalizeCategoryId(
    feature.category ||
      feature.groupKey ||
      feature.groupLabel ||
      feature.section ||
      "",
  );

  const text = normalizeKey(
    `${feature.category || ""} ${feature.groupKey || ""} ${feature.groupLabel || ""} ${feature.section || ""}`,
  );

  return (
    category === "key_specs" ||
    text.includes("key specs") ||
    text.includes("key specifications") ||
    text.includes("key specification")
  );
};

const featureToKeySpec = (feature = {}, index = 0) => {
  const label = cleanText(feature.name || feature.label || feature.displayName);
  const rawValue = cleanText(feature.displayValue || feature.value);

  if (!label) return null;

  return {
    id: feature.id || feature.key || feature.featureKey || `hero-spec-${index}`,
    label,
    value: /^(yes|available)$/i.test(rawValue) ? "Available" : rawValue || "—",
  };
};

const getKeySpecIcon = (spec = {}) => {
  const text = normalizeKey(`${spec.label || ""} ${spec.value || ""}`);

  if (/body|suv|sedan|hatch|mpv/.test(text)) return Car;
  if (/engine|displacement|cc|power|torque|turbo|cylinder/.test(text))
    return Gauge;
  if (/fuel|tank|litre|liter|mileage|diesel|petrol/.test(text)) return Gauge;
  if (/transmission|gear|manual|automatic|dct|cvt|amt|ivt/.test(text))
    return Route;
  if (/seat|capacity|space|boot|dimension|length|width|height/.test(text))
    return Layers3;

  return Sparkles;
};

const getHeroKeySpecs = ({ quickSpecs = [], availableFeatures = [] }) => {
  const fromQuickSpecs = quickSpecs
    .map((spec, index) => ({
      id: spec.id || `quick-spec-${index}`,
      label: cleanText(spec.label || spec.name || spec.title),
      value: cleanText(spec.value || spec.displayValue || spec.text),
    }))
    .filter((spec) => spec.label || spec.value)
    .slice(0, 4);

  if (fromQuickSpecs.length) return fromQuickSpecs;

  return availableFeatures
    .filter(isKeySpecsFeature)
    .map(featureToKeySpec)
    .filter(Boolean)
    .slice(0, 4);
};

const uniqueByVariantId = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const key =
      item?.id ||
      normalizeKey(item?.label || item?.variant || item?.variantName || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sortVariantsByBudgetPrice = (variants = []) =>
  [...variants].sort((a, b) => {
    const ap = getVariantBudgetPrice(a) || Number.MAX_SAFE_INTEGER;
    const bp = getVariantBudgetPrice(b) || Number.MAX_SAFE_INTEGER;
    if (ap !== bp) return ap - bp;
    return cleanText(a.label).localeCompare(cleanText(b.label));
  });

const getBudgetFocusedVariants = ({
  variants = [],
  budgetMax = 0,
  selectedVariantId = "",
  mobile = false,
}) => {
  if (!variants.length) return [];

  const sorted = sortVariantsByBudgetPrice(variants);
  const selected = variants.find((variant) => variant.id === selectedVariantId);

  if (!budgetMax) {
    return uniqueByVariantId([selected, ...sorted])
      .filter(Boolean)
      .slice(0, mobile ? 4 : 8);
  }

  const inBudget = sorted.filter((variant) => {
    const price = getVariantBudgetPrice(variant);
    return price > 0 && price <= budgetMax;
  });
  const firstAboveBudget = sorted.find((variant) => {
    const price = getVariantBudgetPrice(variant);
    return price > budgetMax;
  });

  const visible = uniqueByVariantId([
    selected,
    ...inBudget,
    firstAboveBudget,
  ]).filter(Boolean);

  if (!mobile) return visible;

  return uniqueByVariantId([selected, ...inBudget.slice(-2), firstAboveBudget])
    .filter(Boolean)
    .slice(0, 4);
};

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
  const directCategory = normalizeCategoryId(
    feature.category || feature.groupKey || feature.type || "",
  );
  if (directCategory !== "other") return directCategory;

  return normalizeCategoryId(
    feature.section ||
      feature.group ||
      feature.groupLabel ||
      feature.label ||
      "",
  );
};

const getFeatureIcon = (feature = {}) => {
  const text = normalizeKey(
    `${feature.id || feature.key || feature.featureKey || ""} ${feature.name || feature.displayName || feature.label || ""} ${feature.section || ""} ${feature.category || ""}`,
  );

  if (
    /airbag|abs|brake|safety|esc|ebd|isofix|belt|lock|alert|immobilizer|tpms|traction|hill/.test(
      text,
    )
  )
    return ShieldCheck;
  if (
    /adas|lane|collision|blind spot|adaptive|departure|driver attention|cross traffic|assist/.test(
      text,
    )
  )
    return Route;
  if (
    /touchscreen|android|apple|carplay|bluetooth|speaker|audio|radio|infotain|usb|phone|wireless|charging|connect/.test(
      text,
    )
  )
    return Smartphone;
  if (
    /engine|power|torque|turbo|cylinder|gearbox|transmission|drive type|fuel|mileage|emission|displacement/.test(
      text,
    )
  )
    return Gauge;
  if (
    /seat|headrest|arm rest|armrest|upholstery|steering|climate|ac|air conditioning|heater|ventilat|window|mirror|comfort|console|cup|vanity/.test(
      text,
    )
  )
    return Armchair;
  if (/camera|360|parking|sensor|rear view/.test(text)) return Camera;
  if (
    /sunroof|roof|lamp|headlamp|drl|tail|fog|antenna|spoiler|rail|wheel|tyre|alloy|exterior|orvm|defogger|wiper/.test(
      text,
    )
  )
    return Sparkles;
  if (/length|width|height|space|capacity|boot|wheel base|door|body/.test(text))
    return Car;
  if (/suspension|steering column|brake type|chassis/.test(text)) return Car;

  return CATEGORY_META[feature.category]?.Icon || Sparkles;
};

const isUnavailableValue = (value) =>
  /^(no|na|n\/a|not available|unavailable|absent|nil|false|-)$/i.test(
    cleanText(value),
  );

const featuresFromFeatureMap = (featuresByKey = {}, selectedVariant = {}) => {
  if (
    !featuresByKey ||
    typeof featuresByKey !== "object" ||
    Array.isArray(featuresByKey)
  ) {
    return [];
  }

  return Object.entries(featuresByKey)
    .map(([featureKey, feature]) => {
      if (!feature || typeof feature !== "object") return null;
      return {
        ...feature,
        id: feature.id || feature.key || feature.featureKey || featureKey,
        key: feature.key || featureKey,
        featureKey,
        name: feature.name || feature.label || feature.displayName,
        label: feature.label || feature.displayName || feature.name,
        section: feature.section || feature.groupLabel,
        category: feature.category || feature.groupKey,
        variant:
          selectedVariant?.label ||
          selectedVariant?.variant ||
          selectedVariant?.variantName ||
          "",
      };
    })
    .filter(Boolean);
};

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

  const hasVariantMatrix =
    item.values &&
    typeof item.values === "object" &&
    !Array.isArray(item.values);
  const variantValue = getMatrixValueForVariant(item, selectedVariant);
  const name = cleanText(
    item.name ||
      item.label ||
      item.title ||
      item.feature ||
      item.featureName ||
      item.displayName,
  );
  if (!name) return null;

  const value = cleanText(
    variantValue?.displayValue ||
      variantValue?.value ||
      variantValue?.status ||
      variantValue?.availability ||
      (hasVariantMatrix ? "" : item.displayValue) ||
      (hasVariantMatrix ? "" : item.value) ||
      (hasVariantMatrix ? "" : item.status) ||
      (hasVariantMatrix ? "" : item.availability) ||
      "",
  );
  const explicitAvailable =
    (variantValue
      ? (variantValue.available ??
        variantValue.present ??
        variantValue.included)
      : undefined) ??
    (hasVariantMatrix
      ? false
      : (item.available ?? item.present ?? item.included ?? item.isAvailable));
  const available =
    explicitAvailable === false || isUnavailableValue(value) ? false : true;

  const feature = {
    ...item,
    id:
      cleanText(item.id || item.key || item.slug || item.featureKey) ||
      slugify(
        `${selectedVariant.id || selectedVariant.label || "variant"}-${name}-${index}`,
        `feature-${index}`,
      ),
    name,
    label: name,
    section: cleanText(
      item.section || item.group || item.groupLabel || "Features",
    ),
    category: getFeatureCategory(item),
    value,
    displayValue: value || (available ? "Available" : "Not available"),
    available,
    present: available,
    included: available,
    variant: cleanText(
      variantValue?.variant ||
        variantValue?.variantName ||
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
  if (typeof group === "string") {
    const id = normalizeCategoryId(group);
    const meta = CATEGORY_META[id] || {
      label: cleanText(group),
      Icon: Sparkles,
    };
    const allGroupFeatures = features.filter(
      (feature) =>
        normalizeCategoryId(
          feature.category || feature.groupKey || feature.section || "other",
        ) === id,
    );
    const availableCount = allGroupFeatures.filter(
      (feature) => feature.available,
    ).length;

    return {
      id,
      label: meta.label || cleanText(group),
      name: meta.label || cleanText(group),
      category: id,
      availableCount,
      totalCount: allGroupFeatures.length,
      unavailableCount: Math.max(allGroupFeatures.length - availableCount, 0),
      features: allGroupFeatures,
    };
  }

  const label = cleanText(
    group.label ||
      group.name ||
      group.groupLabel ||
      group.section ||
      `Group ${index + 1}`,
  );
  const categoryKey = normalizeCategoryId(
    group.category || group.groupKey || group.key || label,
  );
  const id = normalizeCategoryId(
    group.id ||
      group.key ||
      group.slug ||
      group.groupKey ||
      categoryKey ||
      label,
  );
  const groupFeatures = firstArray(
    group.features,
    group.featureList,
    group.searchableFeatures,
    group.rows,
    group.items,
    featuresFromFeatureMap(group.featuresByKey),
  )
    .map((item, featureIndex) => normalizeFeature(item, featureIndex))
    .filter(Boolean);

  const allGroupFeatures = groupFeatures.length
    ? groupFeatures
    : features.filter(
        (feature) =>
          normalizeCategoryId(
            feature.category ||
              feature.groupKey ||
              feature.section ||
              feature.group ||
              "other",
          ) === id ||
          normalizeCategoryId(feature.section || feature.group || "") === id,
      );

  const availableCount = Number(
    group.availableCount ??
      allGroupFeatures.filter((feature) => feature.available).length,
  );
  const totalCount = Number(group.totalCount ?? allGroupFeatures.length);

  return {
    id,
    label: CATEGORY_META[id]?.label || label,
    name: CATEGORY_META[id]?.label || label,
    category: id || allGroupFeatures[0]?.category || "other",
    availableCount,
    totalCount,
    unavailableCount: Number(
      group.unavailableCount ?? Math.max(totalCount - availableCount, 0),
    ),
    features: allGroupFeatures,
  };
};

const featureRowsFromGroups = (groups = []) =>
  asArray(groups).flatMap((group) => {
    if (!group || typeof group !== "object") return [];

    const groupLabel = cleanText(
      group.label || group.name || group.section || group.group || "Features",
    );
    const groupCategory = cleanText(group.category || group.type || "");

    return firstArray(
      group.features,
      group.featureList,
      group.searchableFeatures,
      group.rows,
      group.items,
    ).map((item) => {
      if (!item || typeof item !== "object") return item;

      return {
        ...item,
        section: item.section || item.group || groupLabel,
        group: item.group || item.section || groupLabel,
        category: item.category || item.type || groupCategory,
      };
    });
  });

const uniqueFeatures = (features = []) => {
  const seen = new Set();

  return features.filter((feature) => {
    const key = normalizeKey(
      `${feature.id || ""} ${feature.section || ""} ${feature.name || feature.label || ""}`,
    );
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const groupFeaturesFromRows = (features = []) => {
  const map = new Map();

  features.forEach((feature) => {
    const id = slugify(
      feature.category || feature.groupKey || feature.section || "features",
      "features",
    );
    const meta = CATEGORY_META[id] || CATEGORY_META.other;
    const label =
      meta.label || cleanText(feature.section || feature.group || "Features");
    const existing = map.get(id) || {
      id,
      label,
      name: label,
      category: id,
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
    ...asArray(widget.allVariants),
    ...asArray(widget.data?.allVariants),
    ...asArray(vehicle.variants),
    ...asArray(
      widget.variant || widget.variantFull || widget.featuresByKey
        ? widget
        : null,
    ),
  ];

  const byKey = new Map();
  raw
    .map(normalizeVariant)
    .filter(Boolean)
    .forEach((variant) => {
      const key = cleanText(variant.id) || normalizeKey(variant.label);
      if (!key) return;

      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, variant);
        return;
      }

      byKey.set(key, {
        ...variant,
        ...existing,
        features: firstArray(
          existing.features,
          existing.featureList,
          existing.searchableFeatures,
          variant.features,
          variant.featureList,
          variant.searchableFeatures,
        ),
        featureList: firstArray(
          existing.featureList,
          existing.features,
          existing.searchableFeatures,
          variant.featureList,
          variant.features,
          variant.searchableFeatures,
        ),
        featureGroups: firstArray(
          existing.featureGroups,
          existing.groups,
          variant.featureGroups,
          variant.groups,
        ),
        quickSpecs: firstArray(existing.quickSpecs, variant.quickSpecs),
        highlights: firstArray(existing.highlights, variant.highlights),
      });
    });

  const variants = [...byKey.values()];

  const selectedName = cleanText(
    widget.selectedVariant ||
      widget.data?.selectedVariant ||
      widget.variant ||
      widget.variantFull ||
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
      features: firstArray(
        widget.features,
        widget.featureList,
        widget.searchableFeatures,
        widget.rows,
        widget.items,
        widget.data?.features,
        widget.data?.featureList,
        widget.data?.searchableFeatures,
        featuresFromFeatureMap(
          widget.featuresByKey ||
            widget.data?.featuresByKey ||
            vehicle.featuresByKey,
        ),
      ),
      featureGroups: firstArray(
        widget.featureGroups,
        widget.groups,
        widget.data?.featureGroups,
        widget.data?.groups,
      ),
      featuresByKey:
        widget.featuresByKey ||
        widget.data?.featuresByKey ||
        vehicle.featuresByKey,
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
      widget.variant ||
      widget.variantFull ||
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
  const selectedRows = firstArray(
    selectedVariant?.features,
    selectedVariant?.featureList,
    selectedVariant?.searchableFeatures,
    selectedVariant?.rows,
    selectedVariant?.items,
    featuresFromFeatureMap(selectedVariant?.featuresByKey, selectedVariant),
    featureRowsFromGroups(
      firstArray(selectedVariant?.featureGroups, selectedVariant?.groups),
    ),
  )
    .map((item, index) => normalizeFeature(item, index, selectedVariant))
    .filter(Boolean);

  if (selectedRows.length) return uniqueFeatures(selectedRows);

  const widgetRows = firstArray(
    widget.features,
    widget.featureList,
    widget.searchableFeatures,
    widget.rows,
    widget.items,
    widget.data?.features,
    widget.data?.featureList,
    widget.data?.searchableFeatures,
    featuresFromFeatureMap(
      widget.featuresByKey || widget.data?.featuresByKey,
      selectedVariant,
    ),
    featureRowsFromGroups(
      firstArray(
        widget.featureGroups,
        widget.groups,
        widget.data?.featureGroups,
        widget.data?.groups,
      ),
    ),
  )
    .map((item, index) => normalizeFeature(item, index, selectedVariant))
    .filter(Boolean);

  return uniqueFeatures(widgetRows);
};

const getVariantGroups = ({ widget, selectedVariant, features }) => {
  const rawGroups = firstArray(
    selectedVariant?.featureGroups,
    selectedVariant?.groups,
    widget.featureGroups,
    widget.groups,
    widget.data?.featureGroups,
    widget.data?.groups,
  );
  const groups = rawGroups
    .map((group, index) => normalizeFeatureGroup(group, index, features))
    .filter(Boolean);
  return groups.length ? groups : groupFeaturesFromRows(features);
};

const getQuickSpecs = ({ widget, selectedVariant }) => {
  const raw = firstArray(
    selectedVariant?.quickSpecs,
    widget.quickSpecs,
    widget.data?.quickSpecs,
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
  const raw = firstArray(
    selectedVariant?.highlights,
    widget.highlights,
    widget.data?.highlights,
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
    const key = normalizeCategoryId(category);
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
      const key = normalizeCategoryId(feature.category || "other");
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
    "interior",
    "exterior",
    "safety",
    "infotainment",
    "adas",
    "engine",
    "performance",
    "chassis",
    "dimensions",
    "key_specs",
    "key_features",
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
    ...tabs.filter((tab) => Number(tab.totalCount || 0) > 0),
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

const getFeatureIdentityKeys = (feature = {}) =>
  [
    feature.featureKey,
    feature.key,
    feature.id,
    feature.slug,
    feature.name,
    feature.label,
    feature.displayName,
  ]
    .map((value) => normalizeLookupKey(value))
    .filter(Boolean);

const getRawVariantFeatures = (variant = {}) => [
  ...featuresFromFeatureMap(variant.featuresByKey, variant),
  ...firstArray(
    variant.features,
    variant.featureList,
    variant.searchableFeatures,
    variant.rows,
    variant.items,
    featureRowsFromGroups(firstArray(variant.featureGroups, variant.groups)),
  ),
];

const getComparableVariantFeatures = (variant = {}) =>
  getRawVariantFeatures(variant)
    .map((item, index) => normalizeFeature(item, index, variant))
    .filter(Boolean);

const getFeatureStartVariant = (
  feature = {},
  variants = [],
  selectedVariantId = "",
) => {
  if (!feature || feature.available) return null;

  const featureKeys = new Set(getFeatureIdentityKeys(feature));
  if (!featureKeys.size) return null;

  for (const variant of variants) {
    if (!variant || variant.id === selectedVariantId) continue;

    const candidate = getComparableVariantFeatures(variant).find((item) => {
      if (!item?.available) return false;
      return getFeatureIdentityKeys(item).some((key) => featureKeys.has(key));
    });

    if (candidate) {
      return {
        id: variant.id,
        label:
          variant.label || variant.variant || variant.variantName || "Variant",
        priceLabel: getVariantPriceLabel(variant),
      };
    }
  }

  return null;
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
        <Car size={mobile ? 54 : 84} strokeWidth={1.35} />
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
      initial={{ opacity: 0, scale: 0.985, y: 10, filter: "blur(7px)" }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 210, damping: 25 }}
      className="afi-car-image"
    />
  );
}

function StatusBadge({ variant, compact = false }) {
  const isCurrent =
    variant?.active === true ||
    variant?.current === true ||
    variant?.currentPricelistMatched === true;

  return (
    <span
      className={`afi-status-badge ${isCurrent ? "current" : "inactive"} ${compact ? "compact" : ""}`}
    >
      <i />
      {isCurrent ? "Current" : "Older"}
    </span>
  );
}

function VariantRail({
  variants = [],
  selectedVariantId,
  setSelectedVariantId,
  budgetMax = 0,
  mobile = false,
}) {
  if (!variants.length) return null;

  const visibleVariants = getBudgetFocusedVariants({
    variants,
    budgetMax,
    selectedVariantId,
    mobile,
  });

  return (
    <div className={`afi-variant-rail ${mobile ? "mobile" : ""}`}>
      {visibleVariants.map((variant) => {
        const active = variant.id === selectedVariantId;
        const price = getVariantPriceLabel(variant);

        return (
          <button
            key={variant.id}
            type="button"
            className={active ? "active" : ""}
            onClick={() => setSelectedVariantId(variant.id)}
            title={variant.label}
          >
            <span>{variant.label}</span>
            <small>{price || "Price pending"}</small>
          </button>
        );
      })}
    </div>
  );
}

function VariantBudgetPicker({
  variants = [],
  selectedVariantId,
  setSelectedVariantId,
  budgetMax = 0,
  mobile = false,
}) {
  const [open, setOpen] = useState(false);

  if (!variants.length) return null;

  const sortedVariants = sortVariantsByBudgetPrice(variants);
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ||
    sortedVariants[0];

  const selectedPrice = getVariantPriceLabel(selectedVariant);

  return (
    <div className={`afi-premium-variant-dropdown ${mobile ? "mobile" : ""}`}>
      <button
        type="button"
        className="afi-premium-variant-trigger"
        onClick={() => setOpen((value) => !value)}
      >
        <div>
          <span>Selected variant</span>
          <strong>{selectedVariant?.label || "Choose variant"}</strong>
          {selectedPrice ? <small>{selectedPrice}</small> : null}
        </div>

        <div className="afi-premium-variant-meta">
          <ChevronDown size={18} className={open ? "open" : ""} />
        </div>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: 0.16 }}
            className="afi-premium-variant-menu"
          >
            {sortedVariants.map((variant) => {
              const active = variant.id === selectedVariantId;
              const price = getVariantPriceLabel(variant);

              return (
                <button
                  key={variant.id}
                  type="button"
                  className={active ? "active" : ""}
                  onClick={() => {
                    setSelectedVariantId(variant.id);
                    setOpen(false);
                  }}
                >
                  <span>
                    <strong>{variant.label}</strong>
                    {price ? <small>{price}</small> : null}
                  </span>
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SearchBox({
  query,
  setQuery,
  placeholder = "Search sunroof, ADAS, airbags, touchscreen...",
  mobile = false,
}) {
  return (
    <label className={`afi-search-box ${mobile ? "mobile" : ""}`}>
      <Search size={17} />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function HeroMetric({ icon: Icon, label, value }) {
  if (!value && value !== 0) return null;

  return (
    <div className="afi-hero-metric">
      <span>
        <Icon size={17} strokeWidth={1.9} />
      </span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function FeatureTabs({
  tabs,
  activeCategory,
  setActiveCategory,
  setQuery,
  mobile = false,
}) {
  const visibleTabs = tabs.filter(
    (tab) => tab.id === "all" || Number(tab.totalCount || 0) > 0,
  );

  return (
    <motion.nav
      variants={fadeUp}
      className={`afi-category-tabs ${mobile ? "mobile" : ""}`}
    >
      {visibleTabs.map((tab) => {
        const Icon = tab.Icon || Sparkles;
        const active = tab.id === activeCategory;

        return (
          <button
            key={tab.id}
            type="button"
            className={active ? "active" : ""}
            onClick={() => {
              setActiveCategory(tab.id);
              setQuery?.("");
            }}
          >
            <Icon size={mobile ? 16 : 17} strokeWidth={1.9} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </motion.nav>
  );
}

function FeatureItem({ feature, mobile = false }) {
  const value = cleanText(feature.displayValue || feature.value);
  const showValue = value && !/^(yes|available)$/i.test(value);

  return (
    <motion.div
      layout
      variants={fadeUp}
      className={`afi-feature-item ${mobile ? "mobile" : ""}`}
    >
      <div className="afi-feature-item-left">
        <span className="afi-feature-dot" />
        <div className="afi-feature-item-copy">
          <strong title={feature.name}>{feature.name}</strong>
          {showValue ? <small title={value}>{value}</small> : null}
        </div>
      </div>

      <span className="afi-feature-check">
        <CircleCheck
          size={mobile ? 20 : 21}
          fill="#075df6"
          stroke="white"
          strokeWidth={2.25}
        />
      </span>
    </motion.div>
  );
}

function EmptyFeatures({ mobile = false }) {
  return (
    <motion.div
      key="empty-features"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={`afi-empty-features ${mobile ? "mobile" : ""}`}
    >
      <span>
        <Search size={22} />
      </span>
      <strong>No matching feature found</strong>
      <p>Try a different feature name or switch to another category.</p>
    </motion.div>
  );
}

function FeatureSections({
  groups = [],
  activeCategory,
  activeTab,
  query = "",
  mobile = false,
}) {
  const [expandedGroups, setExpandedGroups] = useState({});
  const visibleGroups = groups.filter((group) => group.features?.length);
  const hasSearch = cleanText(query).length > 0;

  return (
    <motion.section
      variants={fadeUp}
      className={`afi-feature-sections ${mobile ? "mobile" : ""}`}
    >
      <div className="afi-feature-sections-head">
        <div>
          <span>Feature Intelligence</span>
          <h2>
            {query
              ? `Results for “${query}”`
              : activeCategory === "all"
                ? "Available features"
                : `${activeTab?.label || "Selected"}`}
          </h2>
          <p>
            {query
              ? "Search is scanning every category"
              : "Only features available in this variant are shown"}
          </p>
        </div>
      </div>

      <div className="afi-feature-section-stack">
        <AnimatePresence mode="popLayout">
          {visibleGroups.length ? (
            visibleGroups.map((group, groupIndex) => {
              const Icon =
                CATEGORY_META[group.category]?.Icon ||
                CATEGORY_META[slugify(group.category || "other")]?.Icon ||
                Sparkles;
              const groupKey = group.id || group.label || `group-${groupIndex}`;
              const expanded = !!expandedGroups[groupKey] || hasSearch;
              const groupFeatures = expanded
                ? group.features
                : group.features.slice(0, 10);
              const hiddenCount = Math.max(group.features.length - 10, 0);

              return (
                <motion.article
                  layout
                  variants={fadeUp}
                  key={groupKey}
                  className="afi-feature-section-card"
                >
                  <div className="afi-feature-section-card-head">
                    <div className="afi-feature-section-title">
                      <span>
                        <Icon size={mobile ? 17 : 19} strokeWidth={1.9} />
                      </span>
                      <div>
                        <strong>{group.label}</strong>
                        <small>{group.features.length} features</small>
                      </div>
                    </div>
                    <em>{String(groupIndex + 1).padStart(2, "0")}</em>
                  </div>

                  <div className="afi-feature-items-grid">
                    {groupFeatures.map((feature) => (
                      <FeatureItem
                        key={feature.id}
                        feature={feature}
                        mobile={mobile}
                      />
                    ))}
                  </div>

                  {!hasSearch && hiddenCount > 0 ? (
                    <button
                      type="button"
                      className="afi-view-all-features"
                      onClick={() =>
                        setExpandedGroups((prev) => ({
                          ...prev,
                          [groupKey]: !prev[groupKey],
                        }))
                      }
                    >
                      {expanded
                        ? "Show fewer features"
                        : `View all ${group.features.length} features`}
                    </button>
                  ) : null}
                </motion.article>
              );
            })
          ) : (
            <EmptyFeatures mobile={mobile} />
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
        <div>
          <span>Snapshot</span>
          <h3>Quick specs</h3>
        </div>
        <Gauge size={17} />
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

function KeySpecsStrip({ specs = [], mobile = false }) {
  if (!specs.length) return null;

  return (
    <motion.section
      variants={fadeUp}
      className={`afi-key-specs-strip ${mobile ? "mobile" : ""}`}
    >
      <span className="afi-key-specs-label">Key specs</span>

      <div className="afi-key-specs-grid">
        {specs.slice(0, mobile ? 4 : 4).map((spec) => {
          const Icon = getKeySpecIcon(spec);

          return (
            <div key={spec.id || `${spec.label}-${spec.value}`}>
              <Icon size={mobile ? 17 : 18} strokeWidth={1.9} />
              <strong>{spec.value || spec.label || "—"}</strong>
              {spec.value && spec.label ? <small>{spec.label}</small> : null}
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

function HighlightsCard({ highlights = [], mobile = false }) {
  if (!highlights.length) return null;

  return (
    <motion.section
      variants={fadeUp}
      className={`afi-card afi-highlights-card ${mobile ? "mobile" : ""}`}
    >
      <div className="afi-card-head">
        <div>
          <span>Why it stands out</span>
          <h3>Highlights</h3>
        </div>
        <Sparkles size={17} fill="currentColor" />
      </div>
      <div className="afi-highlight-list">
        {highlights.slice(0, mobile ? 5 : 8).map((item) => (
          <p key={item.id || item.label}>
            <Check size={14} />
            <span>{item.label}</span>
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
      label: "Find sunroof variants",
      query: `Which ${model} variants have sunroof?`,
      Icon: Camera,
    },
    {
      label: "Compare safety kit",
      query: `Compare airbags, ABS and safety features in ${prefix}`,
      Icon: ShieldCheck,
    },
    {
      label: "Show connected tech",
      query: `Show infotainment and connected car features in ${prefix}`,
      Icon: Smartphone,
      discovery: true,
    },
  ];

  return (
    <motion.section
      variants={fadeUp}
      className={`afi-card afi-questions-card ${mobile ? "mobile" : ""}`}
    >
      <div className="afi-card-head">
        <div>
          <span>Continue exploring</span>
          <h3>Ask next</h3>
        </div>
        <Info size={17} />
      </div>
      <div className="afi-question-list">
        {questions.map((question) => {
          const Icon = question.Icon || Sparkles;

          return (
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
              <span>
                <Icon size={16} strokeWidth={1.9} />
              </span>
              <strong>{question.label}</strong>
              <ChevronRight size={16} />
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}

function DesktopHero({
  title,
  image,
  selectedVariant,
  vehicle,
  features,
  heroKeySpecs,
}) {
  const exShowroom = getVariantPriceLabel(selectedVariant);
  const availableCount = features.length;

  return (
    <motion.section variants={fadeUp} className="afi-desktop-hero">
      <div className="afi-hero-mesh" />
      <div className="afi-hero-ribbon" />
      <div className="afi-hero-light one" />
      <div className="afi-hero-light two" />

      <div className="afi-hero-copy">
        <div className="afi-eyebrow">
          <Sparkles size={14} fill="currentColor" />
          Features Intelligence
        </div>

        <h1>{title}</h1>

        <div className="afi-variant-title-row">
          <strong>
            {selectedVariant?.label || vehicle?.selectedVariant || "Variant"}
          </strong>
          <StatusBadge variant={selectedVariant} />
        </div>

        <div className="afi-hero-inline-stats">
          <span>
            {exShowroom || "Price pending"} <small>ex-showroom</small>
          </span>
          <span>
            {availableCount} <small>available features</small>
          </span>
        </div>

        <KeySpecsStrip specs={heroKeySpecs} />
      </div>

      <div className="afi-hero-stage">
        <div className="afi-stage-ring outer" />
        <div className="afi-stage-ring inner" />
        <VehicleImage src={image} title={title} />
      </div>
    </motion.section>
  );
}

function BudgetRangeBar({
  variants = [],
  budgetMin = 0,
  budgetMax = 0,
  budgetMaxAvailable = 0,
  setBudgetMax,
  mobile = false,
}) {
  if (!variants.length || !budgetMaxAvailable) return null;

  const fitCount = variants.filter((variant) => {
    const price = getVariantBudgetPrice(variant);
    return !price || price <= budgetMax;
  }).length;
  const range = Math.max(budgetMaxAvailable - budgetMin, 1);
  const fill = Math.max(
    0,
    Math.min(100, ((budgetMax - budgetMin) / range) * 100),
  );

  return (
    <div className={`afi-budget-bar ${mobile ? "mobile" : ""}`}>
      <div className="afi-budget-top">
        <div>
          <span>Budget lens</span>
          <strong>
            {formatBudgetShort(budgetMin)} – {formatBudgetShort(budgetMax)}
          </strong>
        </div>
        <em>
          {fitCount}/{variants.length} variants
        </em>
      </div>
      <label
        className="afi-budget-slider"
        style={{ "--afi-budget-fill": `${fill}%` }}
      >
        <input
          type="range"
          min={budgetMin}
          max={budgetMaxAvailable}
          step="10000"
          value={budgetMax}
          onChange={(event) => setBudgetMax?.(Number(event.target.value))}
          aria-label="Select budget"
        />
      </label>
      <div className="afi-budget-scale">
        <small>{formatBudgetShort(budgetMin)}</small>
        <small>{formatBudgetShort(budgetMaxAvailable)}</small>
      </div>
    </div>
  );
}

function SearchQuickResults({
  query = "",
  filteredFeatures = [],
  visibleFeatureGroups = [],
  mobile = false,
}) {
  const cleanQuery = cleanText(query);
  if (!cleanQuery) return null;

  const groupsWithResults = visibleFeatureGroups.filter(
    (group) => group.features?.length,
  );
  const topMatches = filteredFeatures.slice(0, mobile ? 4 : 6);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={`afi-search-preview ${mobile ? "mobile" : ""}`}
    >
      <div className="afi-search-preview-head">
        <span>Instant results</span>
        <strong>
          {filteredFeatures.length} matches across{" "}
          {groupsWithResults.length || 1} groups
        </strong>
      </div>

      {topMatches.length ? (
        <div className="afi-search-preview-list">
          {topMatches.map((feature) => {
            const meta =
              CATEGORY_META[normalizeCategoryId(feature.category)] ||
              CATEGORY_META.other;
            const Icon = meta.Icon || Sparkles;
            const value = cleanText(feature.displayValue || feature.value);

            return (
              <div
                key={`preview-${feature.id}`}
                className="afi-search-preview-item"
              >
                <span>
                  <Icon size={14} strokeWidth={2} />
                </span>
                <div>
                  <strong>{feature.name}</strong>
                  <small>
                    {meta.label}
                    {value && !/^(yes|available)$/i.test(value)
                      ? ` · ${value}`
                      : ""}
                  </small>
                </div>
                {feature.available ? (
                  <CircleCheck
                    size={17}
                    fill="#075df6"
                    stroke="white"
                    strokeWidth={2.1}
                  />
                ) : (
                  <CircleMinus size={17} strokeWidth={2} />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="afi-search-preview-empty">
          No feature matched “{cleanQuery}”. Try sunroof, airbags, ADAS,
          touchscreen, cruise control.
        </div>
      )}
    </motion.div>
  );
}

function FeatureControlDeck({
  variants,
  selectedVariantId,
  setSelectedVariantId,
  budgetMin,
  budgetMax,
  budgetMaxAvailable,
  setBudgetMax,
}) {
  return (
    <motion.section
      variants={fadeUp}
      className="afi-control-deck afi-control-deck-compact"
    >
      <div className="afi-control-card budget">
        <BudgetRangeBar
          variants={variants}
          budgetMin={budgetMin}
          budgetMax={budgetMax}
          budgetMaxAvailable={budgetMaxAvailable}
          setBudgetMax={setBudgetMax}
        />
      </div>

      <div className="afi-control-card variant">
        <VariantBudgetPicker
          variants={variants}
          selectedVariantId={selectedVariantId}
          setSelectedVariantId={setSelectedVariantId}
          budgetMax={budgetMax}
        />
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
    features,
    filteredFeatures,
    visibleFeatureGroups,
    quickSpecs,
    heroKeySpecs,
    highlights,
    budgetMin,
    budgetMax,
    budgetMaxAvailable,
    setBudgetMax,
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
            <ArrowLeft size={18} />
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
            <Bell size={19} />
            <i />
          </button>
        </header>

        <DesktopHero
          title={title}
          image={image}
          selectedVariant={selectedVariant}
          vehicle={vehicle}
          features={features}
          heroKeySpecs={heroKeySpecs}
        />

        <FeatureControlDeck
          variants={variants}
          selectedVariantId={selectedVariantId}
          setSelectedVariantId={setSelectedVariantId}
          query={query}
          setQuery={setQuery}
          filteredFeatures={filteredFeatures}
          visibleFeatureGroups={visibleFeatureGroups}
          tabs={tabs}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          budgetMin={budgetMin}
          budgetMax={budgetMax}
          budgetMaxAvailable={budgetMaxAvailable}
          setBudgetMax={setBudgetMax}
        />

        <section className="afi-main-grid">
          <div className="afi-main-left">
            <div className="afi-feature-toolbar">
              <FeatureTabs
                tabs={tabs}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                setQuery={setQuery}
              />

              <div className="afi-feature-search-row">
                <SearchBox
                  query={query}
                  setQuery={setQuery}
                  placeholder="Search available features across all categories..."
                />
              </div>
            </div>
            <FeatureSections
              groups={visibleFeatureGroups}
              activeCategory={activeCategory}
              activeTab={activeTab}
              query={query}
            />
          </div>
          <aside className="afi-side-rail">
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
    features,
    filteredFeatures,
    visibleFeatureGroups,
    quickSpecs,
    heroKeySpecs,
    highlights,
    budgetMin,
    budgetMax,
    budgetMaxAvailable,
    setBudgetMax,
    vehicle,
    onAction,
  } = props;

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
            <ArrowLeft size={23} />
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
            <Bell size={21} />
            <i />
          </button>
        </header>

        <motion.section variants={fadeUp} className="afi-mobile-hero">
          <div className="afi-mobile-hero-bg" />
          <div className="afi-mobile-top-row">
            <div className="afi-mobile-title">
              <span>Features Explorer</span>
              <h1>{title}</h1>
              <p>{selectedVariant?.label || "Select variant"}</p>
            </div>

            <KeySpecsStrip specs={heroKeySpecs} mobile />
          </div>

          <div className="afi-mobile-car-stage">
            <VehicleImage src={image} title={title} mobile />
          </div>

          <div className="afi-mobile-hero-foot">
            <StatusBadge variant={selectedVariant} compact />
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="afi-mobile-controls">
          <BudgetRangeBar
            variants={variants}
            budgetMin={budgetMin}
            budgetMax={budgetMax}
            budgetMaxAvailable={budgetMaxAvailable}
            setBudgetMax={setBudgetMax}
            mobile
          />
          <VariantBudgetPicker
            variants={variants}
            selectedVariantId={selectedVariantId}
            setSelectedVariantId={setSelectedVariantId}
            budgetMax={budgetMax}
            mobile
          />
        </motion.section>

        <FeatureTabs
          tabs={tabs}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          setQuery={setQuery}
          mobile
        />

        <div className="afi-feature-search-row mobile">
          <SearchBox
            query={query}
            setQuery={setQuery}
            placeholder="Search available features"
            mobile
          />
        </div>
        <FeatureSections
          groups={visibleFeatureGroups}
          variants={variants}
          selectedVariantId={selectedVariantId}
          setSelectedVariantId={setSelectedVariantId}
          activeCategory={activeCategory}
          activeTab={activeTab}
          query={query}
          totalFeatures={filteredFeatures.length}
          availableCount={
            filteredFeatures.filter((feature) => feature.available).length
          }
          mobile
        />
        <HighlightsCard highlights={highlights} mobile />
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

  const variantBudgetPrices = useMemo(
    () => variants.map(getVariantBudgetPrice).filter((price) => price > 0),
    [variants],
  );
  const budgetMin = useMemo(
    () => (variantBudgetPrices.length ? Math.min(...variantBudgetPrices) : 0),
    [variantBudgetPrices],
  );
  const budgetMaxAvailable = useMemo(
    () => (variantBudgetPrices.length ? Math.max(...variantBudgetPrices) : 0),
    [variantBudgetPrices],
  );
  const [budgetMax, setBudgetMax] = useState(0);

  useEffect(() => {
    setBudgetMax((current) => {
      if (!budgetMaxAvailable) return 0;
      if (!current || current < budgetMin || current > budgetMaxAvailable) {
        return budgetMaxAvailable;
      }
      return current;
    });
  }, [budgetMin, budgetMaxAvailable]);

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

  const quickSpecs = useMemo(
    () => getQuickSpecs({ widget: resolvedWidget, selectedVariant }),
    [resolvedWidget, selectedVariant],
  );

  const availableFeatures = useMemo(
    () => features.filter((feature) => feature.available),
    [features],
  );

  const heroKeySpecs = useMemo(
    () =>
      getHeroKeySpecs({
        quickSpecs,
        availableFeatures,
      }),
    [quickSpecs, availableFeatures],
  );

  const explorableFeatures = useMemo(
    () => availableFeatures.filter((feature) => !isKeySpecsFeature(feature)),
    [availableFeatures],
  );

  const featureGroups = useMemo(
    () =>
      getVariantGroups({ widget: resolvedWidget, selectedVariant, features }),
    [resolvedWidget, selectedVariant, features],
  );

  const availableFeatureGroups = useMemo(
    () =>
      featureGroups
        .map((group) => {
          const groupIsKeySpecs =
            normalizeCategoryId(group.category || group.id || group.label) ===
              "key_specs" ||
            normalizeKey(group.label || "").includes("key specification");

          if (groupIsKeySpecs) return null;

          const groupFeatures = asArray(group.features).filter(
            (feature) => feature.available && !isKeySpecsFeature(feature),
          );

          if (!groupFeatures.length) return null;

          return {
            ...group,
            totalCount: groupFeatures.length,
            availableCount: groupFeatures.length,
            features: groupFeatures,
          };
        })
        .filter(Boolean),
    [featureGroups],
  );

  const tabs = useMemo(
    () => buildCategoryTabs(availableFeatureGroups, explorableFeatures),
    [availableFeatureGroups, explorableFeatures],
  );
  const activeTab = tabs.find((tab) => tab.id === activeCategory) || tabs[0];

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeCategory)) {
      setActiveCategory(tabs[0]?.id || "all");
    }
  }, [tabs, activeCategory]);

  const filteredFeatures = useMemo(() => {
    const trimmedQuery = cleanText(query);

    if (trimmedQuery) {
      return explorableFeatures.filter((feature) =>
        featureMatchesSearch(feature, trimmedQuery),
      );
    }

    return explorableFeatures.filter(
      (feature) =>
        activeCategory === "all" ||
        normalizeCategoryId(feature.category) === activeCategory,
    );
  }, [explorableFeatures, activeCategory, query]);

  const visibleFeatureGroups = useMemo(() => {
    const trimmedQuery = cleanText(query);

    return availableFeatureGroups
      .map((group) => ({
        ...group,
        features: group.features.filter((feature) => {
          if (trimmedQuery) return featureMatchesSearch(feature, trimmedQuery);

          return (
            activeCategory === "all" ||
            normalizeCategoryId(feature.category) === activeCategory
          );
        }),
      }))
      .filter((group) => group.features.length);
  }, [availableFeatureGroups, activeCategory, query]);

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
      featureCount: explorableFeatures.length,
      availableFeatureCount: explorableFeatures.length,
    }),
    [resolvedVehicle, selectedVariant, explorableFeatures],
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
    features: explorableFeatures,
    filteredFeatures,
    visibleFeatureGroups,
    quickSpecs,
    heroKeySpecs,
    highlights,
    budgetMin,
    budgetMax,
    budgetMaxAvailable,
    setBudgetMax,
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
    --afi-blue-2: #2d7dff;
    --afi-blue-soft: #eaf3ff;
    --afi-ink: #07102b;
    --afi-text: #334155;
    --afi-muted: #64748b;
    --afi-line: rgba(219, 227, 239, .82);
    --afi-serif: "Iowan Old Style", "Apple Garamond", "Palatino Linotype", "Book Antiqua", Georgia, serif;
    --afi-sans: Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
    --afi-shadow-soft: 0 24px 70px -54px rgba(15, 23, 42, .38);
    --afi-shadow-blue: 0 24px 54px -36px rgba(37, 99, 235, .34);
  }

  * { box-sizing: border-box; }

  .afi-root {
    min-height: 100vh;
    width: 100%;
    color: var(--afi-ink);
    font-family: var(--afi-sans);
    background:
      radial-gradient(circle at 82% -8%, rgba(7, 93, 246, .10), transparent 30%),
      radial-gradient(circle at 5% 12%, rgba(219, 234, 254, .58), transparent 27%),
      linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    background-attachment: fixed;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  .afi-root button,
  .afi-root input,
  .afi-root select { font: inherit; }
  .afi-root button { cursor: pointer; -webkit-tap-highlight-color: transparent; }

  .afi-mobile-shell { display: none; }
  .afi-desktop-shell { display: block; }
  .afi-desktop-page { width: min(100%, 1320px); margin: 0 auto; padding: 18px 34px 126px; }

  .afi-desktop-header {
    height: 52px;
    display: grid;
    grid-template-columns: 120px 1fr 120px;
    align-items: center;
    margin-bottom: 14px;
  }

  .afi-back-button,
  .afi-bell-button {
    height: 40px;
    border: 1px solid rgba(255,255,255,.88);
    background: rgba(255, 255, 255, .78);
    color: #334155;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    box-shadow: 0 18px 44px -36px rgba(15, 23, 42, .42), inset 0 1px 0 #fff;
    backdrop-filter: blur(18px);
  }

  .afi-back-button { justify-self: start; padding: 0 14px; font-size: 12.5px; font-weight: 780; }
  .afi-bell-button { justify-self: end; position: relative; width: 40px; padding: 0; }
  .afi-bell-button i { position: absolute; right: 9px; top: 7px; width: 8px; height: 8px; background: var(--afi-blue); border: 2px solid #fff; border-radius: 999px; }

  .afi-desktop-hero {
    position: relative;
    min-height: 330px;
    overflow: hidden;
    border-radius: 34px;
    border: 1px solid rgba(255,255,255,.82);
    background:
      linear-gradient(135deg, rgba(255,255,255,.94) 0%, rgba(247,251,255,.92) 46%, rgba(234,244,255,.92) 100%);
    box-shadow: 0 40px 110px -80px rgba(15, 23, 42, .48), inset 0 1px 0 rgba(255,255,255,.98);
    display: grid;
    grid-template-columns: minmax(0, .84fr) minmax(0, 1.16fr);
    align-items: center;
    gap: 20px;
    padding: 30px 34px;
    isolation: isolate;
  }

  .afi-hero-mesh {
    position: absolute;
    inset: 0;
    opacity: .62;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(15,23,42,.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(15,23,42,.03) 1px, transparent 1px);
    background-size: 42px 42px;
    mask-image: radial-gradient(circle at 52% 46%, black 4%, transparent 78%);
  }

  .afi-hero-light {
    position: absolute;
    width: 460px;
    height: 460px;
    border-radius: 999px;
    pointer-events: none;
    filter: blur(108px);
    opacity: .68;
  }
  .afi-hero-light.one { top: -220px; left: -150px; background: rgba(37, 99, 235, .16); }
  .afi-hero-light.two { right: -180px; bottom: -230px; background: rgba(96, 165, 250, .18); }

  .afi-hero-copy { position: relative; z-index: 3; min-width: 0; }
  .afi-eyebrow { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px; border-radius: 999px; background: rgba(255,255,255,.76); border: 1px solid rgba(255,255,255,.82); backdrop-filter: blur(18px); color: var(--afi-blue); font-size: 11px; font-weight: 850; letter-spacing: .14em; text-transform: uppercase; box-shadow: inset 0 1px 0 rgba(255,255,255,.92); }
  .afi-hero-copy h1 { margin: 14px 0 0; font-family: var(--afi-serif); font-size: clamp(50px, 5vw, 78px); line-height: .9; letter-spacing: -.075em; font-weight: 560; color: #020817; max-width: 620px; }
  .afi-variant-title-row { margin-top: 13px; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
  .afi-variant-title-row strong { display: inline-flex; align-items: center; color: var(--afi-blue); font-size: 25px; line-height: 1.05; font-weight: 780; letter-spacing: -.045em; }
  .afi-hero-subtitle { margin: 14px 0 0; max-width: 500px; color: #64748b; font-size: 14px; line-height: 1.56; font-weight: 560; }

  .afi-status-badge { display: inline-flex; align-items: center; gap: 7px; height: 28px; padding: 0 10px; border-radius: 999px; font-size: 11px; font-weight: 850; border: 1px solid rgba(255,255,255,.9); box-shadow: inset 0 1px 0 rgba(255,255,255,.9); flex-shrink: 0; }
  .afi-status-badge i { width: 7px; height: 7px; border-radius: 999px; }
  .afi-status-badge.current { color: #047857; background: rgba(236, 253, 245, .92); }
  .afi-status-badge.current i { background: #10b981; }
  .afi-status-badge.inactive { color: #b45309; background: rgba(255, 251, 235, .94); }
  .afi-status-badge.inactive i { background: #f59e0b; }
  .afi-status-badge.compact { height: 27px; font-size: 10.5px; }

  .afi-hero-stage { position: relative; z-index: 2; min-height: 280px; display: grid; place-items: center; }
  .afi-stage-ring { position: absolute; border-radius: 999px; pointer-events: none; }
  .afi-stage-ring.outer { width: min(92%, 620px); height: 205px; border: 1px solid rgba(7,93,246,.08); background: radial-gradient(ellipse at center, rgba(255,255,255,.84), rgba(219,234,254,.24) 55%, transparent 70%); }
  .afi-stage-ring.inner { width: min(72%, 480px); height: 145px; border: 1px solid rgba(255,255,255,.92); background: rgba(255,255,255,.38); box-shadow: inset 0 1px 0 rgba(255,255,255,.82); }

  .afi-car-image { position: relative; z-index: 2; display: block; width: min(112%, 680px); max-height: 330px; object-fit: contain; mix-blend-mode: normal; filter: drop-shadow(0 36px 34px rgba(15,23,42,.17)); user-select: none; }
  .afi-car-placeholder { position: relative; z-index: 2; height: 260px; width: min(100%, 600px); display: grid; place-items: center; border-radius: 30px; border: 1px solid rgba(255,255,255,.86); background: radial-gradient(circle at 50% 42%, #ffffff 0%, #f8fafc 38%, #eaf2ff 100%); color: #94a3b8; box-shadow: inset 0 1px 0 rgba(255,255,255,.95); }

  .afi-hero-compact-stats {
    position: absolute;
    left: 34px;
    right: 34px;
    bottom: 22px;
    z-index: 4;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 150px));
    gap: 10px;
    pointer-events: none;
  }

  .afi-hero-metric { min-height: 64px; border-radius: 20px; padding: 11px 13px; background: rgba(255,255,255,.78); border: 1px solid rgba(255,255,255,.86); backdrop-filter: blur(18px); box-shadow: 0 20px 48px -42px rgba(15,23,42,.32), inset 0 1px 0 rgba(255,255,255,.98); }
  .afi-hero-metric span { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 12px; color: var(--afi-blue); background: #eff6ff; float: left; margin-right: 9px; }
  .afi-hero-metric small { display: block; color: #94a3b8; font-size: 9.4px; font-weight: 820; text-transform: uppercase; letter-spacing: .08em; }
  .afi-hero-metric strong { display: block; margin-top: 5px; color: #07102b; font-size: 15px; line-height: 1; font-weight: 850; letter-spacing: -.035em; }

  .afi-control-deck {
    margin-top: 18px;
    padding: 16px;
    border-radius: 30px;
    border: 1px solid rgba(255,255,255,.84);
    background: rgba(255,255,255,.74);
    backdrop-filter: blur(22px);
    box-shadow: 0 30px 80px -66px rgba(15,23,42,.44), inset 0 1px 0 rgba(255,255,255,.96);
    display: grid;
    gap: 13px;
  }

  .afi-control-deck-head { display: flex; align-items: center; justify-content: space-between; }
  .afi-control-deck-head span { display: block; color: var(--afi-blue); font-size: 10px; font-weight: 880; letter-spacing: .17em; text-transform: uppercase; }
  .afi-control-deck-head strong { display: block; margin-top: 4px; color: #0f172a; font-size: 14px; font-weight: 800; letter-spacing: -.02em; }

  .afi-variant-rail { display: flex; gap: 10px; overflow-x: auto; padding: 2px 2px 8px; scrollbar-width: none; max-width: 100%; }
  .afi-variant-rail::-webkit-scrollbar { display: none; }
  .afi-variant-rail button { flex: 0 0 auto; min-width: 148px; max-width: 196px; min-height: 58px; padding: 0 14px; border-radius: 20px; border: 1px solid rgba(226,232,240,.86); background: rgba(255,255,255,.86); backdrop-filter: blur(18px); text-align: left; display: grid; align-content: center; box-shadow: 0 20px 44px -40px rgba(15,23,42,.32), inset 0 1px 0 rgba(255,255,255,.95); transition: transform .24s ease, box-shadow .24s ease, background .24s ease, border-color .24s ease; }
  .afi-variant-rail button:hover { transform: translateY(-2px); box-shadow: var(--afi-shadow-soft); }
  .afi-variant-rail button.active { background: linear-gradient(135deg, #075df6 0%, #2d7dff 100%); border-color: rgba(7,93,246,.28); box-shadow: var(--afi-shadow-blue); }
  .afi-variant-rail button span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #0f172a; font-size: 12.4px; font-weight: 860; letter-spacing: -.02em; }
  .afi-variant-rail button small { margin-top: 5px; color: #64748b; font-size: 10.5px; font-weight: 780; line-height: 1; }
  .afi-variant-rail button.active span,
  .afi-variant-rail button.active small { color: #fff; }

  .afi-search-box { height: 54px; width: min(100%, 640px); min-width: 0; display: grid; grid-template-columns: 36px 1fr; align-items: center; padding: 0 15px; border-radius: 18px; border: 1px solid rgba(7, 93, 246, .30); background: rgba(255,255,255,.98); color: var(--afi-blue); backdrop-filter: blur(18px); box-shadow: 0 20px 45px -38px rgba(7,93,246,.44), 0 0 0 4px rgba(7,93,246,.05), inset 0 1px 0 rgba(255,255,255,.98); }
  .afi-search-box:focus-within { border-color: rgba(7,93,246,.78); box-shadow: 0 20px 48px -34px rgba(7,93,246,.52), 0 0 0 5px rgba(7,93,246,.10), inset 0 1px 0 rgba(255,255,255,.98); }
  .afi-search-box input { min-width: 0; border: 0; background: transparent; outline: none; color: #172033; font-size: 13px; font-weight: 650; }
  .afi-search-box input::placeholder { color: #8da0bd; }

  .afi-category-tabs { display: flex; flex-wrap: wrap; gap: 9px; }
  .afi-category-tabs button { height: 46px; display: inline-flex; align-items: center; gap: 9px; padding: 0 12px; border-radius: 16px; border: 1px solid rgba(226,232,240,.88); background: rgba(255,255,255,.84); color: #172033; box-shadow: 0 16px 38px -32px rgba(15,23,42,.32), inset 0 1px 0 rgba(255,255,255,.92); font-size: 12px; font-weight: 820; transition: transform .22s ease, box-shadow .22s ease, background .22s ease; }
  .afi-category-tabs button small { min-width: auto; height: 22px; display: inline-flex; align-items: center; justify-content: center; padding: 0 7px; border-radius: 999px; color: #64748b; background: #eef3fb; font-size: 10px; font-weight: 850; }
  .afi-category-tabs button.active { border-color: rgba(7,93,246,.4); color: #fff; background: linear-gradient(135deg, #075df6 0%, #2d7dff 100%); box-shadow: var(--afi-shadow-blue); transform: translateY(-1px); }
  .afi-category-tabs button.active small { color: var(--afi-blue); background: #fff; }

  .afi-main-grid { margin-top: 20px; display: grid; grid-template-columns: minmax(0, 1fr) 344px; gap: 20px; align-items: start; }
  .afi-main-left { min-width: 0; display: grid; gap: 16px; }
  .afi-side-rail { position: sticky; top: 18px; display: grid; gap: 14px; }

  .afi-feature-sections,
  .afi-card { border-radius: 28px; border: 1px solid rgba(255,255,255,.84); background: rgba(255,255,255,.82); backdrop-filter: blur(22px); box-shadow: 0 28px 76px -64px rgba(15,23,42,.44), inset 0 1px 0 rgba(255,255,255,.96); }
  .afi-feature-sections { padding: 20px; }
  .afi-feature-sections-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .afi-feature-sections-head span { color: var(--afi-blue); text-transform: uppercase; letter-spacing: .16em; font-size: 10px; font-weight: 880; }
  .afi-feature-sections-head h2 { margin: 5px 0 0; font-family: var(--afi-serif); color: #07102b; font-size: 28px; line-height: 1; letter-spacing: -.058em; font-weight: 560; }
  .afi-feature-sections-head p { margin: 7px 0 0; color: #64748b; font-size: 12px; font-weight: 650; }
  .afi-availability-orb { width: 78px; height: 64px; display: grid; place-items: center; align-content: center; border-radius: 24px; color: var(--afi-blue); background: #eff6ff; border: 1px solid rgba(219,234,254,.9); }
  .afi-availability-orb strong { display: block; font-size: 22px; line-height: 1; font-weight: 900; letter-spacing: -.05em; }
  .afi-availability-orb small { margin-top: 4px; color: #64748b; font-size: 9px; font-weight: 850; text-transform: uppercase; letter-spacing: .07em; }

  .afi-feature-section-stack { margin-top: 18px; display: grid; gap: 14px; }
  .afi-feature-section-card { position: relative; overflow: hidden; border-radius: 22px; padding: 14px; background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,251,255,.96)); border: 1px solid rgba(226,232,240,.74); box-shadow: 0 22px 52px -48px rgba(15,23,42,.36), inset 0 1px 0 rgba(255,255,255,.96); }
  .afi-feature-section-card-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 11px; }
  .afi-feature-section-title { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .afi-feature-section-title > span { width: 42px; height: 42px; border-radius: 16px; display: grid; place-items: center; color: var(--afi-blue); background: #eff6ff; border: 1px solid #dbeafe; flex-shrink: 0; }
  .afi-feature-section-title strong { display: block; color: #07102b; font-size: 15px; line-height: 1.1; font-weight: 850; letter-spacing: -.025em; }
  .afi-feature-section-title small { display: block; margin-top: 4px; color: #94a3b8; font-size: 11px; font-weight: 800; }
  .afi-feature-section-card-head em { color: rgba(7,93,246,.16); font-family: var(--afi-serif); font-size: 28px; line-height: 1; font-style: normal; font-weight: 600; letter-spacing: -.06em; }
  .afi-feature-items-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }

  .afi-feature-item { min-height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-radius: 18px; padding: 9px 12px; background: rgba(255,255,255,.86); border: 1px solid rgba(226,232,240,.84); box-shadow: inset 0 1px 0 rgba(255,255,255,.9); transition: transform .2s ease, box-shadow .2s ease; }
  .afi-feature-item:hover { transform: translateY(-1px); box-shadow: 0 20px 42px -38px rgba(15,23,42,.28), inset 0 1px 0 rgba(255,255,255,.94); }
  .afi-feature-item.missing { background: rgba(248,250,252,.86); }
  .afi-feature-item-left { min-width: 0; display: flex; align-items: flex-start; gap: 10px; }
  .afi-feature-dot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 999px; margin-top: 7px; background: var(--afi-blue); box-shadow: 0 0 0 4px rgba(7,93,246,.08); }
  .afi-feature-item.missing .afi-feature-dot { background: #94a3b8; box-shadow: 0 0 0 4px rgba(148,163,184,.12); }
  .afi-feature-item-copy { min-width: 0; }
  .afi-feature-item-copy strong { display: block; color: #07102b; font-size: 12.9px; line-height: 1.22; font-weight: 820; letter-spacing: -.015em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .afi-feature-item-copy small { display: block; margin-top: 4px; color: #64748b; font-size: 10.6px; line-height: 1.2; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .afi-feature-check { flex-shrink: 0; color: #94a3b8; display: grid; place-items: center; }
  .afi-starting-variant-link { margin-top: 6px; min-height: 24px; max-width: 100%; display: inline-flex; align-items: center; gap: 4px; border: 0; border-radius: 999px; padding: 0 8px; color: var(--afi-blue); background: #eff6ff; font-size: 10.4px; line-height: 1; font-weight: 760; text-align: left; }
  .afi-starting-variant-link b { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 880; }
  .afi-starting-variant-link em { color: #64748b; font-style: normal; font-weight: 800; }

  .afi-card { padding: 16px; }
  .afi-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .afi-card-head span { display: block; color: var(--afi-blue); text-transform: uppercase; letter-spacing: .16em; font-size: 9.5px; font-weight: 880; }
  .afi-card-head h3 { margin: 3px 0 0; color: #07102b; font-size: 15px; font-weight: 880; letter-spacing: -.02em; }
  .afi-card-head svg { color: var(--afi-blue); }
  .afi-spec-grid { margin-top: 13px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
  .afi-spec-grid div { min-height: 58px; padding: 10px; border-radius: 15px; border: 1px solid #e5edf7; background: rgba(251,253,255,.9); }
  .afi-spec-grid small { display: block; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
  .afi-spec-grid strong { display: block; margin-top: 6px; color: #0f172a; font-size: 12.2px; line-height: 1.2; font-weight: 820; }
  .afi-highlight-list { margin-top: 13px; display: grid; gap: 9px; }
  .afi-highlight-list p { margin: 0; display: grid; grid-template-columns: 20px 1fr; gap: 7px; align-items: start; color: #475569; font-size: 12.2px; line-height: 1.35; font-weight: 660; }
  .afi-highlight-list svg { margin-top: 1px; padding: 3px; color: #fff; background: var(--afi-blue); border-radius: 999px; }
  .afi-question-list { margin-top: 13px; display: grid; gap: 8px; }
  .afi-question-list button { min-height: 48px; border: 1px solid #e2e8f0; border-radius: 16px; background: rgba(255,255,255,.84); display: grid; grid-template-columns: 30px 1fr 18px; gap: 9px; align-items: center; padding: 8px 10px; text-align: left; color: #0f172a; }
  .afi-question-list button span { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 999px; background: #eff6ff; color: var(--afi-blue); }
  .afi-question-list strong { font-size: 12px; line-height: 1.15; font-weight: 800; }

  .afi-empty-features { min-height: 180px; display: grid; place-items: center; text-align: center; padding: 30px; color: #94a3b8; border-radius: 24px; background: rgba(255,255,255,.68); border: 1px solid rgba(226,232,240,.82); }
  .afi-empty-features span { width: 48px; height: 48px; border-radius: 18px; display: grid; place-items: center; background: #eff6ff; color: var(--afi-blue); }
  .afi-empty-features strong { display: block; margin-top: 8px; color: #475569; font-size: 14px; }
  .afi-empty-features p { margin: 5px 0 0; color: #94a3b8; font-size: 12px; }

  .afi-desktop-composer { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 80; width: min(720px, calc(100vw - 56px)); }
  .afi-desktop-composer .colors-composer-dock,
  .afi-mobile-composer .mobile-chat-dock { position: static !important; transform: none !important; width: 100% !important; padding: 0 !important; background: transparent !important; backdrop-filter: none !important; }

  .afi-inline-card { display: grid; grid-template-columns: 38px 1fr auto; gap: 12px; align-items: center; border-radius: 20px; border: 1px solid #dbe3ef; background: rgba(255,255,255,.96); padding: 13px; box-shadow: 0 18px 46px -36px rgba(15,23,42,.4); }
  .afi-inline-card > span { width: 34px; height: 34px; border-radius: 999px; display: grid; place-items: center; }
  .afi-inline-card > span.yes { color: #fff; background: var(--afi-blue); }
  .afi-inline-card > span.no { color: #64748b; background: #f1f5f9; }
  .afi-inline-card strong { display: block; color: #07102b; font-size: 13px; font-weight: 850; }
  .afi-inline-card p { margin: 3px 0 0; color: #475569; font-size: 12px; line-height: 1.35; }
  .afi-inline-card small { display: block; margin-top: 4px; color: var(--afi-blue); font-weight: 780; }
  .afi-inline-card button { height: 34px; border: 0; border-radius: 999px; background: var(--afi-blue); color: #fff; padding: 0 12px; font-size: 11.5px; font-weight: 850; }

  @media (max-width: 1180px) {
    .afi-desktop-shell { display: none; }
    .afi-mobile-shell { display: block; }
    .afi-root { background: linear-gradient(180deg, #fff 0%, #f8fbff 100%); }
    .afi-mobile-page { width: 100%; max-width: 430px; min-height: 100vh; margin: 0 auto; padding: 12px 12px calc(142px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 13px; }

    .afi-mobile-header { position: sticky; top: 0; z-index: 20; height: 50px; display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; gap: 8px; background: rgba(255,255,255,.78); backdrop-filter: blur(18px); border-radius: 0 0 22px 22px; }
    .afi-mobile-header button { position: relative; width: 40px; height: 40px; border: 0; border-radius: 999px; background: transparent; color: #334155; display: grid; place-items: center; }
    .afi-mobile-header button:last-child { justify-self: end; }
    .afi-mobile-header button i { position: absolute; right: 8px; top: 7px; width: 8px; height: 8px; border-radius: 999px; background: var(--afi-blue); border: 2px solid #fff; }

    .afi-mobile-hero { position: relative; overflow: hidden; min-height: 292px; border-radius: 30px; border: 1px solid rgba(255,255,255,.86); background: linear-gradient(135deg, #f7fbff 0%, #ffffff 47%, #edf5ff 100%); box-shadow: 0 30px 84px -64px rgba(15,23,42,.58), inset 0 1px 0 #fff; padding: 16px; isolation: isolate; }
    .afi-mobile-hero-bg { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 22% 18%, rgba(255,255,255,.95), transparent 30%), radial-gradient(circle at 76% 38%, rgba(191,219,254,.44), transparent 34%); }
    .afi-mobile-top-row { position: relative; z-index: 3; display: grid; grid-template-columns: minmax(0, 1fr) 132px; gap: 10px; align-items: start; }
    .afi-mobile-title span { color: var(--afi-blue); text-transform: uppercase; letter-spacing: .19em; font-size: 9.2px; font-weight: 880; }
    .afi-mobile-title h1 { margin: 8px 0 0; color: #050b22; font-family: var(--afi-serif); font-size: 32px; line-height: .9; letter-spacing: -.065em; font-weight: 560; }
    .afi-mobile-title p { margin: 7px 0 0; color: #075df6; font-size: 15px; line-height: 1.05; font-weight: 820; letter-spacing: -.035em; }
    .afi-mobile-top-stats { display: grid; gap: 7px; }
    .afi-mobile-top-stats div { min-height: 52px; border-radius: 18px; background: rgba(255,255,255,.78); border: 1px solid rgba(255,255,255,.88); padding: 9px; box-shadow: inset 0 1px 0 rgba(255,255,255,.95); }
    .afi-mobile-top-stats small { display: block; color: #94a3b8; font-size: 8.8px; font-weight: 850; text-transform: uppercase; letter-spacing: .07em; }
    .afi-mobile-top-stats strong { display: block; margin-top: 6px; color: #07102b; font-size: 13px; line-height: 1; font-weight: 900; letter-spacing: -.035em; }
    .afi-mobile-car-stage { position: relative; z-index: 2; min-height: 148px; display: grid; place-items: center; margin-top: 4px; }
    .afi-mobile-car-stage .afi-car-image { width: 144%; max-height: 180px; transform: translateX(-2%); filter: drop-shadow(0 24px 22px rgba(15,23,42,.16)); }
    .afi-car-placeholder.mobile { height: 150px; width: 100%; border-radius: 24px; }
    .afi-mobile-hero-foot { position: relative; z-index: 3; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 2px; }
    .afi-mobile-hero-foot > span:not(.afi-status-badge) { color: #64748b; font-size: 10.8px; font-weight: 700; }

    .afi-mobile-controls { display: grid; gap: 10px; }
    .afi-variant-rail.mobile { max-width: 100%; padding-bottom: 4px; }
    .afi-variant-rail.mobile button { min-width: 134px; min-height: 52px; border-radius: 18px; }
    .afi-search-box.mobile { width: 100%; height: 46px; border-radius: 16px; }

    .afi-category-tabs.mobile { display: flex; gap: 9px; overflow-x: auto; padding: 1px 1px 5px; flex-wrap: nowrap; scrollbar-width: none; }
    .afi-category-tabs.mobile::-webkit-scrollbar { display: none; }
    .afi-category-tabs.mobile button { height: 44px; flex: 0 0 auto; padding: 0 12px; border-radius: 16px; font-size: 12px; }
    .afi-category-tabs.mobile button small { min-width: 22px; height: 22px; font-size: 10px; }

    .afi-feature-sections,
    .afi-card.mobile { border-radius: 26px; padding: 15px; }
    .afi-feature-sections-head { align-items: center; }
    .afi-feature-sections-head h2 { font-size: 23px; }
    .afi-feature-sections-head p { font-size: 11.5px; }
    .afi-availability-orb { width: 68px; height: 62px; border-radius: 22px; }
    .afi-availability-orb strong { font-size: 21px; }
    .afi-availability-orb small { font-size: 8.5px; }
    .afi-feature-section-stack { margin-top: 15px; gap: 12px; }
    .afi-feature-section-card { border-radius: 23px; padding: 13px; }
    .afi-feature-section-title > span { width: 40px; height: 40px; border-radius: 15px; }
    .afi-feature-section-title strong { font-size: 14.5px; }
    .afi-feature-section-card-head em { font-size: 28px; }
    .afi-feature-items-grid { grid-template-columns: 1fr; gap: 8px; }
    .afi-feature-item.mobile { min-height: 60px; border-radius: 18px; padding: 10px; }
    .afi-feature-item-copy strong { font-size: 12.6px; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .afi-feature-item-copy small { white-space: normal; }
    .afi-starting-variant-link { font-size: 10px; }

    .afi-spec-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .afi-mobile-composer { position: fixed; left: 14px; right: 14px; bottom: calc(10px + env(safe-area-inset-bottom)); z-index: 100; max-width: 402px; margin: 0 auto; }
  }

  /* V5 luxury cockpit overrides */
  .afi-root {
    background:
      radial-gradient(circle at 10% -10%, rgba(7, 93, 246, .13), transparent 30%),
      radial-gradient(circle at 95% 12%, rgba(205, 222, 255, .58), transparent 34%),
      radial-gradient(circle at 50% 100%, rgba(230, 236, 248, .9), transparent 45%),
      linear-gradient(135deg, #eef4ff 0%, #f8fbff 42%, #edf3fb 100%);
    background-attachment: fixed;
  }

  .afi-desktop-page {
    width: min(100%, 1320px);
    padding-top: 18px;
  }

  .afi-desktop-hero {
    min-height: 378px;
    padding: 30px 34px 28px;
    grid-template-columns: minmax(410px, .9fr) minmax(520px, 1.1fr);
    border-radius: 34px;
    background:
      linear-gradient(110deg, rgba(12, 27, 58, .055), transparent 38%),
      radial-gradient(circle at 83% 46%, rgba(7, 93, 246, .12), transparent 34%),
      linear-gradient(135deg, #fbfcff 0%, #eef5ff 48%, #dfeeff 100%);
    border: 1px solid rgba(255,255,255,.78);
    box-shadow:
      0 42px 110px -72px rgba(12, 27, 58, .42),
      inset 0 1px 0 rgba(255,255,255,.95);
  }

  .afi-hero-mesh {
    background-image:
      linear-gradient(rgba(15,23,42,.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(15,23,42,.035) 1px, transparent 1px);
    background-size: 34px 34px;
    opacity: .55;
    mask-image: radial-gradient(circle at 56% 40%, black 0%, transparent 82%);
  }

  .afi-hero-ribbon {
    position: absolute;
    right: -8%;
    top: 18%;
    width: 56%;
    height: 42%;
    border-radius: 999px;
    border: 1px solid rgba(7,93,246,.08);
    background: linear-gradient(135deg, rgba(255,255,255,.42), rgba(7,93,246,.055));
    transform: rotate(-8deg);
  }

  .afi-hero-copy h1 {
    font-size: clamp(48px, 5vw, 76px);
    line-height: .9;
    margin-top: 12px;
  }

  .afi-variant-title-row {
    margin-top: 12px;
  }

  .afi-variant-title-row strong {
    font-size: 24px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .afi-hero-subtitle {
    max-width: 520px;
    margin-top: 14px;
    line-height: 1.6;
  }

  .afi-hero-inline-stats {
    margin-top: 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .afi-hero-inline-stats span {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 13px;
    border-radius: 999px;
    color: #061334;
    background: rgba(255,255,255,.72);
    border: 1px solid rgba(255,255,255,.82);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.94);
    font-size: 14px;
    font-weight: 850;
  }

  .afi-hero-inline-stats small {
    color: #64748b;
    font-size: 10px;
    font-weight: 780;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .afi-hero-stage .afi-car-image {
    width: min(108%, 720px);
    max-height: 315px;
    transform: translateX(1%) scale(1.04);
  }

  .afi-control-deck {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
    margin-top: 18px;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .afi-control-shell,
  .afi-filter-panel {
    position: relative;
    overflow: hidden;
    border-radius: 30px;
    border: 1px solid rgba(255,255,255,.68);
    background:
      radial-gradient(circle at 0% 0%, rgba(7,93,246,.12), transparent 36%),
      linear-gradient(135deg, rgba(9,22,50,.92) 0%, rgba(18,38,76,.88) 48%, rgba(248,251,255,.94) 100%);
    box-shadow:
      0 32px 90px -68px rgba(2, 8, 23, .62),
      inset 0 1px 0 rgba(255,255,255,.32);
    backdrop-filter: blur(24px);
  }

  .afi-control-shell {
    padding: 18px;
    display: grid;
    grid-template-columns: minmax(230px, .82fr) minmax(320px, 1fr);
    gap: 14px;
    align-items: start;
  }

  .afi-control-copy {
    align-self: stretch;
    padding: 6px 8px;
    color: #fff;
  }

  .afi-control-copy span,
  .afi-filter-title span {
    display: block;
    color: #79a8ff;
    font-size: 10px;
    letter-spacing: .16em;
    text-transform: uppercase;
    font-weight: 900;
  }

  .afi-control-copy strong,
  .afi-filter-title strong {
    display: block;
    margin-top: 7px;
    color: #fff;
    font-size: 19px;
    line-height: 1.08;
    letter-spacing: -.035em;
    font-weight: 850;
  }

  .afi-control-copy p {
    margin: 8px 0 0;
    max-width: 360px;
    color: rgba(226,232,240,.82);
    font-size: 12.5px;
    line-height: 1.45;
    font-weight: 560;
  }

  .afi-control-shell .afi-search-box {
    height: 58px;
    border-radius: 21px;
    grid-column: 2;
    background: rgba(255,255,255,.96);
    border: 1px solid rgba(255,255,255,.9);
    box-shadow:
      0 20px 54px -36px rgba(7,93,246,.55),
      0 0 0 4px rgba(7,93,246,.06),
      inset 0 1px 0 rgba(255,255,255,.94);
  }

  .afi-budget-bar {
    grid-column: 1 / -1;
    border-radius: 24px;
    padding: 15px 16px 13px;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.18);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.14);
  }

  .afi-budget-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .afi-budget-top span {
    color: #9dbbff;
    font-size: 10px;
    letter-spacing: .14em;
    text-transform: uppercase;
    font-weight: 900;
  }

  .afi-budget-top strong {
    display: block;
    margin-top: 4px;
    color: #fff;
    font-size: 18px;
    letter-spacing: -.025em;
    font-weight: 850;
  }

  .afi-budget-top em {
    display: inline-flex;
    align-items: center;
    height: 30px;
    padding: 0 11px;
    border-radius: 999px;
    color: #07102b;
    background: rgba(255,255,255,.9);
    font-size: 11px;
    font-style: normal;
    font-weight: 850;
  }

  .afi-budget-slider {
    --afi-budget-fill: 100%;
    position: relative;
    display: block;
    margin-top: 12px;
    height: 28px;
  }

  .afi-budget-slider::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 11px;
    height: 6px;
    border-radius: 999px;
    background:
      linear-gradient(90deg, #75a7ff 0%, #075df6 var(--afi-budget-fill), rgba(255,255,255,.25) var(--afi-budget-fill), rgba(255,255,255,.25) 100%);
  }

  .afi-budget-slider input {
    position: absolute;
    inset: 0;
    width: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .afi-budget-scale {
    display: flex;
    justify-content: space-between;
    color: rgba(226,232,240,.76);
    font-size: 10.5px;
    font-weight: 760;
  }

  .afi-control-shell .afi-variant-rail {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    max-height: none;
    overflow: visible;
    padding: 0;
  }

  .afi-variant-rail button {
    min-width: 0;
    min-height: 64px;
    align-items: flex-start;
    padding: 11px 13px;
    border-radius: 18px;
    background: rgba(255,255,255,.9);
    border: 1px solid rgba(255,255,255,.76);
  }

  .afi-variant-rail button span {
    width: 100%;
    color: #08112b;
    font-size: 12px;
    line-height: 1.12;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .afi-variant-rail button small {
    margin-top: 5px;
    color: #075df6;
    font-size: 11px;
  }

  .afi-variant-rail button em {
    margin-top: 5px;
    color: #10b981;
    font-size: 9.5px;
    line-height: 1;
    font-style: normal;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .afi-variant-rail button.over-budget {
    opacity: .56;
    filter: grayscale(.2);
  }

  .afi-variant-rail button.over-budget em {
    color: #f59e0b;
  }

  .afi-variant-rail button.active {
    background: linear-gradient(135deg, #075df6 0%, #2f7cff 100%);
    border-color: rgba(255,255,255,.4);
    box-shadow: 0 18px 38px -24px rgba(7,93,246,.7);
    opacity: 1;
    filter: none;
  }

  .afi-variant-rail button.active span,
  .afi-variant-rail button.active small,
  .afi-variant-rail button.active em {
    color: #fff;
  }

  .afi-filter-panel {
    padding: 14px;
    display: grid;
    grid-template-columns: 190px minmax(0, 1fr);
    gap: 12px;
    align-items: center;
    background:
      linear-gradient(135deg, rgba(255,255,255,.88) 0%, rgba(239,246,255,.72) 100%);
  }

  .afi-filter-title strong {
    color: #07102b;
    font-size: 16px;
  }

  .afi-category-tabs {
    gap: 9px;
  }

  .afi-category-tabs button {
    min-height: 44px;
    border-radius: 15px;
    background: rgba(255,255,255,.88);
  }

  .afi-category-tabs button.active {
    background: #075df6;
    color: #fff;
    border-color: rgba(7,93,246,.55);
  }

  .afi-category-tabs button.active small {
    color: rgba(255,255,255,.82);
  }

  .afi-feature-section-card {
    background:
      linear-gradient(180deg, rgba(255,255,255,.96) 0%, rgba(248,251,255,.94) 100%);
  }

  .afi-feature-dot {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: #075df6;
    box-shadow: 0 0 0 6px rgba(7,93,246,.08);
  }

  @media (max-width: 1180px) {
    .afi-mobile-page {
      max-width: 430px;
    }

    .afi-mobile-hero {
      padding-top: 14px;
    }

    .afi-mobile-top-row {
      align-items: start;
      grid-template-columns: 1fr auto;
    }

    .afi-mobile-top-stats {
      min-width: 106px;
      gap: 7px;
    }

    .afi-mobile-top-stats div {
      min-height: 44px;
      padding: 7px 8px;
    }

    .afi-mobile-car-stage {
      min-height: 190px;
      margin-top: 2px;
    }

    .afi-mobile-car-stage .afi-car-image {
      width: 132%;
      max-height: 205px;
      transform: translateX(-4%) scale(1.03);
    }

    .afi-mobile-controls .afi-budget-bar {
      background: linear-gradient(135deg, #071631 0%, #143061 100%);
      border-color: rgba(255,255,255,.2);
    }

    .afi-mobile-controls .afi-variant-rail {
      display: flex;
      overflow-x: auto;
      padding: 1px 2px 6px;
      gap: 9px;
      scrollbar-width: none;
    }

    .afi-mobile-controls .afi-variant-rail::-webkit-scrollbar { display: none; }

    .afi-mobile-controls .afi-variant-rail button {
      flex: 0 0 146px;
      min-height: 60px;
    }

    .afi-category-tabs.mobile button {
      min-height: 44px;
      padding: 0 11px;
    }
  }


  /* V6 — light luxury feature explorer refinements */
  .afi-root {
    background:
      radial-gradient(circle at 12% 10%, rgba(255,255,255,.96), transparent 32%),
      radial-gradient(circle at 84% 12%, rgba(216,232,255,.76), transparent 30%),
      radial-gradient(circle at 50% 100%, rgba(239,244,255,.82), transparent 42%),
      linear-gradient(180deg, #f7faff 0%, #eef5ff 46%, #f9fbff 100%);
  }

  .afi-desktop-page {
    width: min(100%, 1340px);
    padding-top: 16px;
  }

  .afi-desktop-hero {
    min-height: 310px;
    padding: 26px 34px 24px;
    grid-template-columns: minmax(360px, .82fr) minmax(520px, 1.18fr);
    border-radius: 34px;
    background:
      radial-gradient(circle at 18% 18%, rgba(255,255,255,.98), transparent 30%),
      radial-gradient(circle at 77% 52%, rgba(204,225,255,.64), transparent 34%),
      linear-gradient(120deg, rgba(255,255,255,.94) 0%, rgba(245,249,255,.9) 47%, rgba(229,240,255,.92) 100%);
    border: 1px solid rgba(255,255,255,.86);
    box-shadow:
      0 38px 105px -76px rgba(22, 47, 88, .42),
      inset 0 1px 0 rgba(255,255,255,.98);
  }

  .afi-hero-ribbon {
    right: 2%;
    top: 12%;
    width: 48%;
    height: 58%;
    background:
      linear-gradient(135deg, rgba(255,255,255,.55), rgba(7,93,246,.045));
    border-color: rgba(7,93,246,.07);
  }

  .afi-hero-copy h1 {
    font-size: clamp(44px, 4.6vw, 68px);
    margin-top: 10px;
  }

  .afi-variant-title-row strong {
    display: block;
    max-width: 440px;
    font-size: 24px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .afi-hero-subtitle {
    max-width: 540px;
    font-size: 13.5px;
    margin-top: 12px;
  }

  .afi-hero-inline-stats {
    margin-top: 14px;
  }

  .afi-hero-stage {
    min-height: 250px;
  }

  .afi-hero-stage .afi-car-image {
    width: min(104%, 720px);
    max-height: 300px;
    transform: translateX(3%) scale(1.03);
  }

  .afi-control-deck {
    margin-top: 18px;
    display: grid;
    gap: 14px;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .afi-control-shell {
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(260px, .72fr) minmax(460px, 1.28fr);
    gap: 14px;
    align-items: start;
    padding: 18px;
    border-radius: 32px;
    border: 1px solid rgba(255,255,255,.82);
    background:
      radial-gradient(circle at 0% 0%, rgba(7,93,246,.10), transparent 35%),
      radial-gradient(circle at 100% 15%, rgba(255,255,255,.9), transparent 34%),
      linear-gradient(135deg, rgba(255,255,255,.92) 0%, rgba(244,249,255,.9) 52%, rgba(234,243,255,.92) 100%);
    box-shadow:
      0 30px 90px -72px rgba(15,23,42,.45),
      inset 0 1px 0 rgba(255,255,255,.98);
    backdrop-filter: blur(22px);
  }

  .afi-control-copy {
    grid-row: 1 / span 2;
    min-height: 132px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 10px 12px;
    color: #07102b;
  }

  .afi-control-copy span,
  .afi-filter-title span {
    color: #075df6;
    font-size: 10px;
    letter-spacing: .17em;
    text-transform: uppercase;
    font-weight: 900;
  }

  .afi-control-copy strong {
    display: block;
    margin-top: 8px;
    color: #061334;
    font-family: var(--afi-serif);
    font-size: 26px;
    line-height: .98;
    letter-spacing: -.055em;
    font-weight: 560;
  }

  .afi-control-copy p {
    margin: 10px 0 0;
    max-width: 330px;
    color: #64748b;
    font-size: 12.5px;
    line-height: 1.45;
  }

  .afi-control-shell .afi-search-box {
    grid-column: 2;
    width: 100%;
    height: 62px;
    border-radius: 22px;
    border: 1px solid rgba(7,93,246,.24);
    background: rgba(255,255,255,.98);
    box-shadow:
      0 18px 46px -36px rgba(7,93,246,.42),
      0 0 0 5px rgba(7,93,246,.055),
      inset 0 1px 0 rgba(255,255,255,.98);
  }

  .afi-control-shell .afi-search-box input {
    font-size: 14px;
    font-weight: 650;
  }

  .afi-search-preview {
    grid-column: 2;
    border-radius: 24px;
    padding: 13px;
    border: 1px solid rgba(219,227,239,.76);
    background: rgba(255,255,255,.84);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.96);
  }

  .afi-search-preview-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .afi-search-preview-head span {
    color: #075df6;
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: .16em;
    text-transform: uppercase;
  }

  .afi-search-preview-head strong {
    color: #0f172a;
    font-size: 12px;
    font-weight: 840;
  }

  .afi-search-preview-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .afi-search-preview-item {
    min-width: 0;
    min-height: 48px;
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) 20px;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 16px;
    background: rgba(248,251,255,.95);
    border: 1px solid rgba(226,232,240,.78);
  }

  .afi-search-preview-item > span {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: #075df6;
    background: #eff6ff;
  }

  .afi-search-preview-item strong {
    display: block;
    color: #07102b;
    font-size: 12px;
    line-height: 1.08;
    font-weight: 820;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .afi-search-preview-item small {
    display: block;
    margin-top: 3px;
    color: #64748b;
    font-size: 10px;
    font-weight: 680;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .afi-search-preview-empty {
    color: #64748b;
    font-size: 12px;
    line-height: 1.4;
    padding: 4px 2px;
  }

  .afi-budget-bar {
    grid-column: 1;
    border-radius: 24px;
    padding: 15px;
    background: rgba(255,255,255,.84);
    border: 1px solid rgba(226,232,240,.82);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.98);
  }

  .afi-budget-top span { color: #64748b; }
  .afi-budget-top strong { color: #07102b; }
  .afi-budget-top em { background: #eff6ff; color: #075df6; }
  .afi-budget-slider::before {
    background:
      linear-gradient(90deg, #9fc2ff 0%, #075df6 var(--afi-budget-fill), #dbe7fb var(--afi-budget-fill), #dbe7fb 100%);
  }
  .afi-budget-scale { color: #64748b; }

  .afi-control-shell .afi-variant-rail {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    overflow: visible;
    padding: 0;
  }

  .afi-variant-rail button {
    min-width: 0;
    min-height: 66px;
    border-radius: 20px;
    background: rgba(255,255,255,.9);
    border: 1px solid rgba(226,232,240,.82);
  }

  .afi-variant-rail button span { color: #07102b; }
  .afi-variant-rail button small { color: #075df6; }
  .afi-variant-rail button em { color: #059669; }
  .afi-variant-rail button.over-budget { opacity: .48; }
  .afi-variant-rail button.active {
    background: linear-gradient(135deg, #075df6 0%, #2d7dff 100%);
    border-color: rgba(7,93,246,.38);
  }
  .afi-variant-rail button.active span,
  .afi-variant-rail button.active small,
  .afi-variant-rail button.active em { color: #fff; }

  .afi-filter-panel {
    padding: 14px 16px;
    display: grid;
    grid-template-columns: 190px minmax(0, 1fr);
    gap: 12px;
    align-items: center;
    border-radius: 28px;
    border: 1px solid rgba(255,255,255,.82);
    background:
      linear-gradient(135deg, rgba(255,255,255,.9), rgba(240,247,255,.84));
    box-shadow: 0 26px 68px -58px rgba(15,23,42,.36), inset 0 1px 0 rgba(255,255,255,.98);
  }

  .afi-filter-title strong {
    color: #07102b;
    font-size: 16px;
    font-weight: 860;
  }

  .afi-category-tabs { gap: 9px; }
  .afi-category-tabs button {
    min-height: 44px;
    border-radius: 15px;
    border-color: rgba(226,232,240,.78);
    background: rgba(255,255,255,.88);
    box-shadow: 0 14px 36px -32px rgba(15,23,42,.28);
  }
  .afi-category-tabs button.active {
    background: #075df6;
    color: #fff;
    border-color: rgba(7,93,246,.45);
  }
  .afi-category-tabs button.active small { color: rgba(255,255,255,.82); }

  .afi-feature-section-card {
    border-radius: 30px;
  }

  .afi-feature-items-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 1180px) {
    .afi-mobile-page { max-width: 430px; }
    .afi-mobile-hero {
      min-height: auto;
      padding: 14px 14px 12px;
    }
    .afi-mobile-top-row {
      align-items: start;
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .afi-mobile-top-stats {
      min-width: 112px;
      gap: 7px;
    }
    .afi-mobile-top-stats div {
      min-height: 44px;
      padding: 7px 8px;
    }
    .afi-mobile-car-stage {
      min-height: 190px;
      margin-top: 2px;
    }
    .afi-mobile-car-stage .afi-car-image {
      width: 136%;
      max-height: 210px;
      transform: translateX(-4%) scale(1.03);
    }
    .afi-mobile-controls .afi-budget-bar {
      background: rgba(255,255,255,.9);
      border-color: rgba(226,232,240,.82);
    }
    .afi-mobile-controls .afi-variant-rail {
      display: flex;
      overflow-x: auto;
      padding: 1px 2px 6px;
      gap: 9px;
      scrollbar-width: none;
    }
    .afi-mobile-controls .afi-variant-rail::-webkit-scrollbar { display: none; }
    .afi-mobile-controls .afi-variant-rail button {
      flex: 0 0 150px;
      min-height: 62px;
    }
    .afi-search-preview.mobile {
      width: 100%;
      grid-column: auto;
      padding: 11px;
    }
    .afi-search-preview-list {
      grid-template-columns: 1fr;
    }
    .afi-category-tabs.mobile button {
      min-height: 44px;
      padding: 0 11px;
    }
    .afi-feature-items-grid {
      grid-template-columns: 1fr;
    }
  }


  /* ================= V7 LIGHT LUXURY FIXES ================= */
  .afi-root {
    background:
      radial-gradient(circle at 8% 2%, rgba(219,234,254,.78), transparent 28%),
      radial-gradient(circle at 88% 8%, rgba(191,219,254,.44), transparent 24%),
      linear-gradient(180deg, #f7fbff 0%, #ffffff 52%, #f4f8ff 100%);
  }

  .afi-desktop-page { width: min(100%, 1320px); padding-top: 18px; }
  .afi-desktop-hero {
    min-height: 365px !important;
    border-radius: 34px !important;
    padding: 30px 40px !important;
    grid-template-columns: 42% 58% !important;
    background:
      linear-gradient(115deg, rgba(255,255,255,.92) 0%, rgba(247,251,255,.96) 46%, rgba(228,240,255,.94) 100%) !important;
    box-shadow:
      0 38px 90px -68px rgba(15,23,42,.32),
      inset 0 1px 0 rgba(255,255,255,.98) !important;
  }
  .afi-hero-copy h1 { font-size: clamp(48px, 5.2vw, 78px) !important; }
  .afi-hero-subtitle { max-width: 440px !important; margin-top: 14px !important; }
  .afi-hero-inline-stats { display: none !important; }
  .afi-hero-stage .afi-car-image { max-height: 300px !important; width: min(108%, 680px) !important; }

  .afi-control-deck-compact {
    margin-top: 18px !important;
    display: grid !important;
    grid-template-columns: minmax(420px, .82fr) minmax(300px, .36fr) !important;
    gap: 14px !important;
    align-items: stretch !important;
    background: transparent !important;
    box-shadow: none !important;
    border: 0 !important;
    padding: 0 !important;
  }
  .afi-control-deck-compact .afi-budget-bar,
  .afi-variant-dropdown {
    min-height: 112px;
    border-radius: 26px;
    border: 1px solid rgba(203,213,225,.7);
    background: rgba(255,255,255,.88);
    box-shadow: 0 24px 60px -50px rgba(15,23,42,.26), inset 0 1px 0 rgba(255,255,255,.95);
    backdrop-filter: blur(18px);
  }
  .afi-variant-dropdown {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 22px;
    grid-template-rows: auto auto;
    align-content: center;
    row-gap: 7px;
    padding: 18px 18px 18px 20px;
  }
  .afi-variant-dropdown span {
    grid-column: 1 / -1;
    color: #64748b;
    font-size: 10px;
    line-height: 1;
    font-weight: 900;
    letter-spacing: .16em;
    text-transform: uppercase;
  }
  .afi-variant-dropdown select {
    min-width: 0;
    appearance: none;
    border: 0;
    outline: 0;
    background: transparent;
    color: #07102b;
    font-size: 17px;
    line-height: 1.1;
    font-weight: 850;
    letter-spacing: -.03em;
  }
  .afi-variant-dropdown svg { color: #075df6; align-self: center; justify-self: end; pointer-events: none; }

  .afi-feature-toolbar {
    position: sticky;
    top: 0;
    z-index: 12;
    display: grid;
    gap: 12px;
    padding: 12px 0 8px;
    background: linear-gradient(180deg, rgba(247,251,255,.96) 0%, rgba(247,251,255,.78) 76%, rgba(247,251,255,0) 100%);
    backdrop-filter: blur(16px);
  }
  .afi-feature-toolbar .afi-search-box {
    height: 58px !important;
    border-radius: 20px !important;
    border: 1px solid rgba(7,93,246,.24) !important;
    box-shadow: 0 18px 42px -34px rgba(7,93,246,.34), inset 0 1px 0 rgba(255,255,255,.98) !important;
    background: rgba(255,255,255,.95) !important;
  }
  .afi-feature-toolbar .afi-search-box input { font-size: 14px !important; font-weight: 680 !important; }

  .afi-category-tabs button small { display: none !important; }
  .afi-category-tabs { gap: 10px !important; }
  .afi-category-tabs button {
    height: 46px !important;
    padding: 0 15px !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.88) !important;
  }

  .afi-feature-sections {
    border-radius: 30px !important;
    padding: 20px !important;
    background: rgba(255,255,255,.90) !important;
    border: 1px solid rgba(226,232,240,.78) !important;
  }
  .afi-feature-sections-head {
    padding: 0 2px 12px !important;
  }
  .afi-availability-orb { display: none !important; }
  .afi-feature-section-card-head small { display: none !important; }
  .afi-feature-section-card {
    border-radius: 24px !important;
    padding: 16px !important;
    background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(249,252,255,.98)) !important;
  }
  .afi-feature-items-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
  }
  .afi-feature-item {
    min-height: 58px !important;
    border-radius: 18px !important;
    padding: 0 14px !important;
  }
  .afi-feature-dot {
    width: 10px !important;
    height: 10px !important;
    background: #075df6 !important;
  }

  @media (max-width: 1180px) {
    .afi-root { background: linear-gradient(180deg, #f7fbff 0%, #fff 48%, #f4f8ff 100%) !important; }
    .afi-mobile-page { max-width: 430px !important; padding-inline: 13px !important; gap: 11px !important; }
    .afi-mobile-hero {
      min-height: 248px !important;
      padding: 14px !important;
      border-radius: 28px !important;
    }
    .afi-mobile-top-row {
      display: grid !important;
      grid-template-columns: minmax(0,1fr) auto !important;
      align-items: start !important;
      gap: 10px !important;
    }
    .afi-mobile-title h1 { font-size: 30px !important; line-height: .94 !important; }
    .afi-mobile-title p { font-size: 15px !important; max-width: 205px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .afi-mobile-top-stats {
      display: grid !important;
      grid-template-columns: 1fr !important;
      gap: 6px !important;
      width: 118px !important;
    }
    .afi-mobile-top-stats div {
      min-height: 44px !important;
      padding: 8px 10px !important;
      border-radius: 15px !important;
    }
    .afi-mobile-top-stats small { font-size: 8px !important; }
    .afi-mobile-top-stats strong { font-size: 12px !important; margin-top: 4px !important; }
    .afi-mobile-car-stage { min-height: 142px !important; margin-top: 2px !important; }
    .afi-mobile-car-stage .afi-car-image { width: 130% !important; max-height: 170px !important; }
    .afi-mobile-hero-foot { display: none !important; }

    .afi-mobile-controls { gap: 9px !important; }
    .afi-mobile-controls .afi-budget-bar { padding: 14px !important; border-radius: 24px !important; }
    .afi-mobile-controls .afi-variant-rail { padding-bottom: 1px !important; }
    .afi-mobile-controls .afi-variant-rail button {
      min-width: 142px !important;
      max-width: 168px !important;
      min-height: 82px !important;
      border-radius: 22px !important;
    }
    .afi-mobile-controls .afi-search-box {
      height: 58px !important;
      border-radius: 20px !important;
      border-color: rgba(7,93,246,.28) !important;
      box-shadow: 0 18px 40px -34px rgba(7,93,246,.36), inset 0 1px 0 rgba(255,255,255,.96) !important;
    }
    .afi-search-preview.mobile { display: none !important; }

    .afi-category-tabs.mobile {
      gap: 8px !important;
      padding-bottom: 3px !important;
    }
    .afi-category-tabs.mobile button {
      height: 42px !important;
      padding: 0 13px !important;
      border-radius: 999px !important;
      flex: 0 0 auto !important;
      max-width: 170px !important;
    }
    .afi-category-tabs.mobile button span {
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .afi-feature-sections.mobile {
      padding: 14px !important;
      border-radius: 26px !important;
    }
    .afi-feature-sections-head h2 { font-size: 25px !important; }
    .afi-feature-sections-head p { font-size: 11px !important; }
    .afi-feature-items-grid { grid-template-columns: 1fr !important; }
    .afi-feature-section-card { padding: 13px !important; border-radius: 22px !important; }
    .afi-feature-section-card-head em { font-size: 24px !important; }
    .afi-feature-item { min-height: 62px !important; border-radius: 20px !important; }
  }



/* ===== Final V9 polish: rounded, light, floating, no sharp edges ===== */

.afi-root {
  background:
    radial-gradient(circle at 78% -6%, rgba(7,93,246,.055), transparent 30%),
    radial-gradient(circle at 8% 8%, rgba(226,240,255,.58), transparent 26%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%) !important;
}

.afi-root *,
.afi-root *::before,
.afi-root *::after {
  box-sizing: border-box;
}

.afi-root button,
.afi-root input,
.afi-root select,
.afi-root textarea {
  border-radius: 999px;
}

.afi-desktop-page,
.afi-mobile-page {
  isolation: isolate;
}

.afi-control-deck,
.afi-control-deck-compact {
  position: relative !important;
  z-index: 90 !important;
  overflow: visible !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, .85fr) !important;
  gap: 14px !important;
  align-items: stretch !important;
  margin-top: 16px !important;
  padding: 0 !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

.afi-control-card,
.afi-control-card.budget,
.afi-control-card.variant {
  position: relative !important;
  overflow: visible !important;
  z-index: 91 !important;
  border-radius: 30px !important;
  background:
    linear-gradient(180deg, rgba(255,255,255,.92), rgba(250,252,255,.96)) !important;
  border: 0 !important;
  box-shadow:
    0 28px 80px -64px rgba(15,23,42,.30),
    inset 0 1px 0 rgba(255,255,255,.96) !important;
}

.afi-control-card.budget {
  padding: 18px !important;
}

.afi-control-card.variant {
  padding: 0 !important;
}

.afi-main-grid {
  position: relative !important;
  z-index: 1 !important;
  overflow: visible !important;
}

.afi-main-left,
.afi-side-rail {
  position: relative !important;
  z-index: 1 !important;
}

.afi-side-rail {
  z-index: 0 !important;
}

/* Budget slider: visible draggable ball */
.afi-budget-bar {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  border-radius: 28px !important;
}

.afi-budget-top {
  display: flex !important;
  justify-content: space-between !important;
  align-items: flex-start !important;
  gap: 14px !important;
}

.afi-budget-top span {
  color: #64748b !important;
  font-size: 10.5px !important;
  font-weight: 880 !important;
  text-transform: uppercase !important;
  letter-spacing: .16em !important;
}

.afi-budget-top strong {
  display: block !important;
  margin-top: 6px !important;
  color: #07102b !important;
  font-size: clamp(20px, 2vw, 28px) !important;
  line-height: 1 !important;
  font-weight: 850 !important;
  letter-spacing: -.055em !important;
}

.afi-budget-top em {
  height: 32px !important;
  padding: 0 12px !important;
  display: inline-flex !important;
  align-items: center !important;
  border-radius: 999px !important;
  background: #f1f6ff !important;
  color: var(--afi-blue) !important;
  font-size: 11.5px !important;
  font-style: normal !important;
  font-weight: 850 !important;
  white-space: nowrap !important;
}

.afi-budget-slider {
  position: relative !important;
  display: block !important;
  height: 38px !important;
  margin-top: 16px !important;
  border-radius: 999px !important;
}

.afi-budget-slider::before {
  content: "" !important;
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  top: 15px !important;
  height: 8px !important;
  border-radius: 999px !important;
  background:
    linear-gradient(
      90deg,
      var(--afi-blue) 0%,
      var(--afi-blue) var(--afi-budget-fill),
      #dbeafe var(--afi-budget-fill),
      #dbeafe 100%
    ) !important;
}

.afi-budget-slider input {
  position: relative !important;
  z-index: 4 !important;
  width: 100% !important;
  height: 38px !important;
  margin: 0 !important;
  padding: 0 !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  background: transparent !important;
  cursor: pointer !important;
  outline: none !important;
}

.afi-budget-slider input::-webkit-slider-runnable-track {
  height: 38px !important;
  background: transparent !important;
  border: 0 !important;
}

.afi-budget-slider input::-webkit-slider-thumb {
  appearance: none !important;
  -webkit-appearance: none !important;
  width: 28px !important;
  height: 28px !important;
  margin-top: 5px !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  border: 7px solid var(--afi-blue) !important;
  box-shadow:
    0 16px 34px -18px rgba(7,93,246,.85),
    0 0 0 7px rgba(7,93,246,.12) !important;
  cursor: grab !important;
}

.afi-budget-slider input::-moz-range-track {
  height: 8px !important;
  border-radius: 999px !important;
  background: #dbeafe !important;
}

.afi-budget-slider input::-moz-range-progress {
  height: 8px !important;
  border-radius: 999px !important;
  background: var(--afi-blue) !important;
}

.afi-budget-slider input::-moz-range-thumb {
  width: 28px !important;
  height: 28px !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  border: 7px solid var(--afi-blue) !important;
  box-shadow:
    0 16px 34px -18px rgba(7,93,246,.85),
    0 0 0 7px rgba(7,93,246,.12) !important;
  cursor: grab !important;
}

.afi-budget-scale {
  display: flex !important;
  justify-content: space-between !important;
  margin-top: 3px !important;
}

.afi-budget-scale small {
  color: #64748b !important;
  font-size: 11px !important;
  font-weight: 760 !important;
}

/* Premium dropdown: starts right below trigger and stays above side rail */
.afi-premium-variant-dropdown {
  position: relative !important;
  z-index: 300 !important;
  overflow: visible !important;
}

.afi-premium-variant-trigger {
  width: 100% !important;
  min-height: 100% !important;
  height: 100% !important;
  padding: 18px 18px !important;
  border-radius: 30px !important;
  border: 0 !important;
  background:
    linear-gradient(180deg, rgba(255,255,255,.94), rgba(248,251,255,.96)) !important;
  box-shadow:
    0 24px 70px -60px rgba(15,23,42,.28),
    inset 0 1px 0 rgba(255,255,255,.96) !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  gap: 14px !important;
  text-align: left !important;
}

.afi-premium-variant-trigger span {
  display: block !important;
  color: #64748b !important;
  font-size: 10px !important;
  font-weight: 880 !important;
  text-transform: uppercase !important;
  letter-spacing: .14em !important;
}

.afi-premium-variant-trigger strong {
  display: block !important;
  margin-top: 6px !important;
  color: #07102b !important;
  font-size: 18px !important;
  line-height: 1.05 !important;
  font-weight: 850 !important;
  letter-spacing: -.035em !important;
}

.afi-premium-variant-trigger small {
  display: block !important;
  margin-top: 5px !important;
  color: var(--afi-blue) !important;
  font-size: 12px !important;
  font-weight: 820 !important;
}

.afi-premium-variant-trigger > svg {
  flex: 0 0 auto !important;
  color: #64748b !important;
  transition: transform .18s ease !important;
}

.afi-premium-variant-trigger > svg.open {
  transform: rotate(180deg) !important;
}

.afi-premium-variant-menu {
  position: absolute !important;
  top: calc(100% + 4px) !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 999 !important;
  max-height: 380px !important;
  overflow: auto !important;
  padding: 8px !important;
  border-radius: 28px !important;
  border: 0 !important;
  background: rgba(255,255,255,.98) !important;
  backdrop-filter: blur(22px) !important;
  box-shadow:
    0 36px 90px -52px rgba(15,23,42,.46),
    inset 0 1px 0 rgba(255,255,255,.96) !important;
}

.afi-premium-variant-menu button {
  width: 100% !important;
  min-height: 58px !important;
  padding: 10px 12px !important;
  border: 0 !important;
  border-radius: 22px !important;
  background: transparent !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  gap: 12px !important;
  text-align: left !important;
}

.afi-premium-variant-menu button:hover {
  background: #f8fbff !important;
}

.afi-premium-variant-menu button.active {
  background: #eff6ff !important;
}

.afi-premium-variant-menu strong {
  display: block !important;
  color: #07102b !important;
  font-size: 13px !important;
  font-weight: 840 !important;
}

.afi-premium-variant-menu small {
  display: block !important;
  margin-top: 3px !important;
  color: var(--afi-blue) !important;
  font-size: 11px !important;
  font-weight: 780 !important;
}

/* Category filters: fully rounded, no sharp corners, no white active state */
.afi-category-tabs,
.afi-category-tabs.mobile {
  position: relative !important;
  z-index: 2 !important;
  display: flex !important;
  gap: 10px !important;
  flex-wrap: wrap !important;
  padding: 0 !important;
  background: transparent !important;
}

.afi-category-tabs.mobile {
  flex-wrap: nowrap !important;
  overflow-x: auto !important;
  scrollbar-width: none !important;
}

.afi-category-tabs.mobile::-webkit-scrollbar {
  display: none !important;
}

.afi-category-tabs button,
.afi-category-tabs.mobile button {
  height: 48px !important;
  min-height: 48px !important;
  border-radius: 999px !important;
  border: 0 !important;
  background: rgba(255,255,255,.82) !important;
  color: #07102b !important;
  box-shadow:
    0 16px 44px -36px rgba(15,23,42,.26),
    inset 0 1px 0 rgba(255,255,255,.94) !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 9px !important;
  padding: 0 16px !important;
  white-space: nowrap !important;
}

.afi-category-tabs button.active,
.afi-category-tabs.mobile button.active {
  background: linear-gradient(180deg, #1673ff 0%, #075df6 100%) !important;
  border: 0 !important;
  color: #ffffff !important;
  box-shadow:
    0 22px 46px -28px rgba(7,93,246,.55),
    inset 0 1px 0 rgba(255,255,255,.24) !important;
}

.afi-category-tabs button.active span,
.afi-category-tabs button.active small,
.afi-category-tabs button.active strong,
.afi-category-tabs.mobile button.active span,
.afi-category-tabs.mobile button.active small,
.afi-category-tabs.mobile button.active strong {
  color: #ffffff !important;
}

.afi-category-tabs button.active svg,
.afi-category-tabs.mobile button.active svg {
  color: #ffffff !important;
  stroke: #ffffff !important;
}

/* Search below categories */
.afi-feature-toolbar {
  display: grid !important;
  gap: 12px !important;
  background: transparent !important;
}

.afi-feature-search-row {
  margin: 0 0 8px !important;
}

.afi-feature-search-row .afi-search-box,
.afi-search-box {
  height: 56px !important;
  border-radius: 999px !important;
  border-color: rgba(147,197,253,.80) !important;
  background: rgba(255,255,255,.96) !important;
  box-shadow:
    0 20px 54px -46px rgba(7,93,246,.34),
    0 0 0 4px rgba(7,93,246,.045),
    inset 0 1px 0 rgba(255,255,255,.98) !important;
}

.afi-feature-search-row.mobile {
  margin: 2px 0 12px !important;
}

/* Feature area: remove unnecessary bluish block, keep rounded */
.afi-feature-sections,
.afi-feature-sections.mobile {
  border-radius: 34px !important;
  background: rgba(255,255,255,.78) !important;
  border: 0 !important;
  box-shadow:
    0 30px 90px -72px rgba(15,23,42,.30),
    inset 0 1px 0 rgba(255,255,255,.95) !important;
}

.afi-feature-section-card,
.afi-feature-item,
.afi-card,
.afi-highlights-card,
.afi-questions-card,
.afi-specs-card,
.afi-inline-card {
  border-radius: 28px !important;
  border: 0 !important;
}

.afi-feature-item {
  background: rgba(255,255,255,.88) !important;
}

.afi-feature-section-card {
  background: rgba(255,255,255,.72) !important;
  box-shadow:
    0 20px 60px -50px rgba(15,23,42,.22),
    inset 0 1px 0 rgba(255,255,255,.92) !important;
}

/* Key specs: floating, icon-led, no boxed borders */
.afi-key-specs-strip {
  margin-top: 18px !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.afi-key-specs-label {
  display: inline-flex !important;
  color: var(--afi-blue) !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  text-transform: uppercase !important;
  letter-spacing: .18em !important;
}

.afi-key-specs-grid {
  margin-top: 11px !important;
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 10px !important;
}

.afi-key-specs-grid div {
  min-height: 42px !important;
  padding: 0 13px !important;
  border-radius: 999px !important;
  border: 0 !important;
  background: rgba(255,255,255,.62) !important;
  box-shadow:
    0 16px 42px -36px rgba(15,23,42,.22),
    inset 0 1px 0 rgba(255,255,255,.94) !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.afi-key-specs-grid div svg {
  color: var(--afi-blue) !important;
  flex: 0 0 auto !important;
}

.afi-key-specs-grid strong {
  color: #07102b !important;
  font-size: 13px !important;
  line-height: 1 !important;
  font-weight: 850 !important;
  white-space: nowrap !important;
}

.afi-key-specs-grid small {
  display: none !important;
}

.afi-key-specs-strip.mobile {
  margin: 0 !important;
  padding: 0 2px !important;
}

.afi-key-specs-strip.mobile .afi-key-specs-grid {
  display: flex !important;
  flex-wrap: nowrap !important;
  overflow-x: auto !important;
  gap: 9px !important;
  padding-bottom: 2px !important;
  scrollbar-width: none !important;
}

.afi-key-specs-strip.mobile .afi-key-specs-grid::-webkit-scrollbar {
  display: none !important;
}

.afi-key-specs-strip.mobile .afi-key-specs-grid div {
  flex: 0 0 auto !important;
  height: 40px !important;
  min-height: 40px !important;
}

/* Mobile chips: remove fit/upgrade label space completely */
.afi-variant-rail.mobile button em,
.afi-variant-rail button em {
  display: none !important;
}

.afi-variant-rail.mobile button,
.afi-variant-rail button {
  border-radius: 24px !important;
}

/* Ensure no sharp corners on common containers */
.afi-desktop-hero,
.afi-mobile-hero,
.afi-mobile-controls,
.afi-budget-bar,
.afi-car-placeholder,
.afi-back-button,
.afi-bell-button,
.afi-question-list button,
.afi-highlight-list p,
.afi-spec-grid div {
  border-radius: 28px !important;
}

.afi-back-button,
.afi-bell-button {
  border-radius: 999px !important;
}

@media (max-width: 1180px) {
  .afi-control-deck,
  .afi-control-deck-compact {
    display: none !important;
  }

  .afi-mobile-controls {
    overflow: visible !important;
    border-radius: 28px !important;
  }

  .afi-budget-top strong {
    font-size: 21px !important;
  }

  .afi-budget-top em {
    font-size: 10.5px !important;
    height: 29px !important;
  }

  .afi-category-tabs.mobile button {
    border-radius: 999px !important;
  }

  .afi-feature-sections.mobile {
    border-radius: 30px !important;
    background: rgba(255,255,255,.78) !important;
  }
}




/* ===== Final V10 requested corrections ===== */
.afi-root,
.afi-desktop-shell,
.afi-mobile-shell {
  background: #ffffff !important;
}

.afi-desktop-page,
.afi-mobile-page,
.afi-main-grid,
.afi-main-left,
.afi-feature-sections {
  background: transparent !important;
}

.afi-root *,
.afi-root *::before,
.afi-root *::after {
  border-radius: max(var(--afi-radius-safe, 18px), 0px);
}

.afi-control-deck,
.afi-control-deck-compact,
.afi-main-grid,
.afi-main-left,
.afi-side-rail,
.afi-premium-variant-dropdown {
  overflow: visible !important;
}

.afi-side-rail {
  z-index: 4 !important;
}

.afi-control-deck,
.afi-control-deck-compact {
  z-index: 80 !important;
  position: relative !important;
  background: linear-gradient(180deg, rgba(255,255,255,.94), rgba(250,252,255,.92)) !important;
  border: 1px solid rgba(226,232,240,.78) !important;
  box-shadow: 0 18px 54px -46px rgba(15,23,42,.22), inset 0 1px 0 rgba(255,255,255,.94) !important;
}

.afi-premium-variant-dropdown {
  z-index: 9999 !important;
}

.afi-premium-variant-menu {
  z-index: 10000 !important;
  top: calc(100% + 4px) !important;
  border-radius: 22px !important;
  overflow: auto !important;
}

.afi-premium-variant-meta em,
.afi-premium-variant-menu em,
.afi-variant-rail em {
  display: none !important;
}

.afi-budget-top strong {
  font-size: 13px !important;
  line-height: 1.05 !important;
  font-weight: 720 !important;
  letter-spacing: -.02em !important;
}

.afi-budget-top span {
  font-size: 9.8px !important;
}

.afi-budget-bar {
  overflow: visible !important;
  border-radius: 24px !important;
  background: linear-gradient(180deg, rgba(255,255,255,.94), rgba(250,252,255,.94)) !important;
}

.afi-budget-slider {
  --afi-budget-track-h: 8px;
  position: relative !important;
  display: block !important;
  height: 34px !important;
  overflow: visible !important;
  border-radius: 999px !important;
}

.afi-budget-slider::before {
  content: "" !important;
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  top: 13px !important;
  height: var(--afi-budget-track-h) !important;
  border-radius: 999px !important;
  background: linear-gradient(90deg, var(--afi-blue) 0%, var(--afi-blue) var(--afi-budget-fill), #dbeafe var(--afi-budget-fill), #dbeafe 100%) !important;
  pointer-events: none !important;
}

.afi-budget-slider input[type="range"] {
  -webkit-appearance: none !important;
  appearance: none !important;
  position: relative !important;
  z-index: 5 !important;
  width: 100% !important;
  height: 34px !important;
  margin: 0 !important;
  background: transparent !important;
  border: 0 !important;
  outline: none !important;
  cursor: pointer !important;
  overflow: visible !important;
}

.afi-budget-slider input[type="range"]::-webkit-slider-runnable-track {
  -webkit-appearance: none !important;
  height: 34px !important;
  background: transparent !important;
  border: 0 !important;
}

.afi-budget-slider input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none !important;
  appearance: none !important;
  width: 28px !important;
  height: 28px !important;
  margin-top: 3px !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  border: 7px solid var(--afi-blue) !important;
  box-shadow: 0 12px 28px -12px rgba(7,93,246,.86), 0 0 0 7px rgba(7,93,246,.12) !important;
  cursor: grab !important;
}

.afi-budget-slider input[type="range"]::-moz-range-track {
  height: 8px !important;
  border-radius: 999px !important;
  background: #dbeafe !important;
  border: 0 !important;
}

.afi-budget-slider input[type="range"]::-moz-range-progress {
  height: 8px !important;
  border-radius: 999px !important;
  background: var(--afi-blue) !important;
}

.afi-budget-slider input[type="range"]::-moz-range-thumb {
  width: 28px !important;
  height: 28px !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  border: 7px solid var(--afi-blue) !important;
  box-shadow: 0 12px 28px -12px rgba(7,93,246,.86), 0 0 0 7px rgba(7,93,246,.12) !important;
  cursor: grab !important;
}

.afi-feature-toolbar {
  width: 100% !important;
}

.afi-feature-search-row,
.afi-feature-search-row .afi-search-box {
  width: 100% !important;
}

.afi-feature-search-row .afi-search-box {
  height: 50px !important;
  border-radius: 18px !important;
}

.afi-category-tabs {
  gap: 7px !important;
}

.afi-category-tabs button,
.afi-category-tabs.mobile button {
  height: 38px !important;
  min-height: 38px !important;
  padding: 0 9px !important;
  gap: 5px !important;
  border-radius: 14px !important;
  font-size: 11px !important;
  font-weight: 760 !important;
  background: rgba(255,255,255,.94) !important;
  border: 1px solid rgba(226,232,240,.9) !important;
  box-shadow: 0 12px 30px -28px rgba(15,23,42,.22), inset 0 1px 0 rgba(255,255,255,.95) !important;
}

.afi-category-tabs button.active,
.afi-category-tabs.mobile button.active {
  background: linear-gradient(180deg, #1673ff 0%, #075df6 100%) !important;
  border-color: rgba(7,93,246,.95) !important;
  color: #fff !important;
}

.afi-feature-sections-head {
  margin-bottom: 10px !important;
}

.afi-feature-section-stack {
  gap: 12px !important;
}

.afi-feature-section-card {
  padding: 12px !important;
  border-radius: 22px !important;
  background: #fff !important;
  border: 1px solid rgba(147,197,253,.72) !important;
  box-shadow: 0 18px 44px -38px rgba(37,99,235,.18), inset 0 1px 0 rgba(255,255,255,.96) !important;
}

.afi-feature-section-card::after {
  content: "";
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 0;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(7,93,246,.78), rgba(147,197,253,.22));
}

.afi-feature-section-card-head {
  margin-bottom: 8px !important;
}

.afi-feature-section-title > span {
  border-radius: 14px !important;
}

.afi-feature-section-title strong {
  font-size: 13px !important;
}

.afi-feature-section-title small {
  display: block !important;
  margin-top: 3px !important;
  color: #94a3b8 !important;
  font-size: 10px !important;
  font-weight: 760 !important;
}

.afi-feature-items-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 7px !important;
}

.afi-feature-item {
  min-height: 46px !important;
  padding: 7px 10px !important;
  border-radius: 16px !important;
  align-items: center !important;
  background: rgba(255,255,255,.96) !important;
  border: 1px solid rgba(226,232,240,.72) !important;
}

.afi-feature-item-left {
  align-items: center !important;
  gap: 9px !important;
}

.afi-feature-dot {
  flex: 0 0 auto !important;
  align-self: center !important;
}

.afi-feature-check {
  flex: 0 0 auto !important;
  align-self: center !important;
  display: grid !important;
  place-items: center !important;
}

.afi-feature-item-copy strong {
  font-size: 12.2px !important;
  line-height: 1.22 !important;
  font-weight: 760 !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: initial !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
}

.afi-feature-item-copy small {
  font-size: 10px !important;
  line-height: 1.15 !important;
  white-space: normal !important;
}

.afi-view-all-features {
  margin-top: 10px !important;
  width: 100% !important;
  height: 38px !important;
  border: 0 !important;
  border-radius: 14px !important;
  background: #eff6ff !important;
  color: var(--afi-blue) !important;
  font-size: 12px !important;
  font-weight: 820 !important;
}

.afi-key-specs-strip {
  margin-top: 12px !important;
  padding: 0 !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

.afi-key-specs-label {
  display: block !important;
  margin-bottom: 9px !important;
  color: var(--afi-blue) !important;
  font-size: 10px !important;
  font-weight: 880 !important;
  text-transform: uppercase !important;
  letter-spacing: .15em !important;
}

.afi-key-specs-grid {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 12px !important;
  margin-top: 0 !important;
}

.afi-key-specs-grid div {
  min-height: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  width: auto !important;
}

.afi-key-specs-grid svg {
  color: var(--afi-blue) !important;
  flex: 0 0 auto !important;
}

.afi-key-specs-grid strong {
  margin: 0 !important;
  color: #07102b !important;
  font-size: 13px !important;
  line-height: 1 !important;
  font-weight: 820 !important;
}

.afi-key-specs-grid small {
  display: none !important;
}

@media (max-width: 1180px) {
  .afi-mobile-top-stats { display: none !important; }

  .afi-mobile-hero .afi-key-specs-strip {
    margin-top: 12px !important;
    margin-bottom: 8px !important;
  }

  .afi-mobile-hero .afi-key-specs-grid {
    gap: 10px 12px !important;
  }

  .afi-mobile-hero .afi-key-specs-grid div {
    flex: 0 1 calc(50% - 8px) !important;
  }

  .afi-mobile-hero .afi-key-specs-grid strong {
    font-size: 12px !important;
  }

  .afi-variant-rail.mobile {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 8px !important;
    overflow: visible !important;
    padding: 0 !important;
  }

  .afi-variant-rail.mobile button {
    width: 100% !important;
    min-height: 48px !important;
    border-radius: 16px !important;
  }

  .afi-category-tabs.mobile {
    gap: 7px !important;
    padding-bottom: 3px !important;
  }

  .afi-category-tabs.mobile button {
    flex: 0 0 auto !important;
    height: 36px !important;
    min-height: 36px !important;
    padding: 0 9px !important;
  }

  .afi-feature-items-grid {
    grid-template-columns: 1fr !important;
  }

  .afi-feature-section-card {
    padding: 11px !important;
    border-radius: 20px !important;
  }

  .afi-feature-item {
    min-height: 48px !important;
    padding: 8px 10px !important;
  }

  .afi-budget-top strong {
    font-size: 12px !important;
  }
}



/* ===== FINAL V11 POLISH — mobile dropdown, clean feature rows, visible slider, top-right key specs ===== */

/* Budget slider thumb — force visible in Safari/Chrome/Firefox */
.afi-budget-slider,
.afi-budget-slider.mobile {
  position: relative !important;
  display: block !important;
  height: 34px !important;
  padding: 0 !important;
  overflow: visible !important;
}

.afi-budget-slider::before {
  top: 13px !important;
  height: 8px !important;
  border-radius: 999px !important;
  background: linear-gradient(
    90deg,
    #075df6 0%,
    #075df6 var(--afi-budget-fill),
    #dbeafe var(--afi-budget-fill),
    #dbeafe 100%
  ) !important;
}

.afi-budget-slider input,
.afi-budget-slider input[type="range"] {
  -webkit-appearance: none !important;
  appearance: none !important;
  position: relative !important;
  z-index: 5 !important;
  display: block !important;
  width: 100% !important;
  height: 34px !important;
  margin: 0 !important;
  padding: 0 !important;
  opacity: 1 !important;
  background: transparent !important;
  cursor: pointer !important;
}

.afi-budget-slider input::-webkit-slider-runnable-track,
.afi-budget-slider input[type="range"]::-webkit-slider-runnable-track {
  -webkit-appearance: none !important;
  height: 34px !important;
  background: transparent !important;
  border: 0 !important;
}

.afi-budget-slider input::-webkit-slider-thumb,
.afi-budget-slider input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none !important;
  appearance: none !important;
  width: 28px !important;
  height: 28px !important;
  margin-top: 3px !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  border: 8px solid #075df6 !important;
  box-shadow:
    0 14px 30px -14px rgba(7,93,246,.9),
    0 0 0 7px rgba(7,93,246,.13) !important;
  cursor: grab !important;
}

.afi-budget-slider input::-moz-range-track,
.afi-budget-slider input[type="range"]::-moz-range-track {
  height: 8px !important;
  border-radius: 999px !important;
  background: #dbeafe !important;
  border: 0 !important;
}

.afi-budget-slider input::-moz-range-progress,
.afi-budget-slider input[type="range"]::-moz-range-progress {
  height: 8px !important;
  border-radius: 999px !important;
  background: #075df6 !important;
}

.afi-budget-slider input::-moz-range-thumb,
.afi-budget-slider input[type="range"]::-moz-range-thumb {
  width: 28px !important;
  height: 28px !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  border: 8px solid #075df6 !important;
  box-shadow:
    0 14px 30px -14px rgba(7,93,246,.9),
    0 0 0 7px rgba(7,93,246,.13) !important;
  cursor: grab !important;
}

/* Mobile variants should use the same dropdown language as laptop */
.afi-premium-variant-dropdown.mobile {
  width: 100% !important;
  position: relative !important;
  z-index: 80 !important;
}

.afi-premium-variant-dropdown.mobile .afi-premium-variant-trigger {
  min-height: 64px !important;
  border-radius: 22px !important;
  padding: 12px 14px !important;
}

.afi-premium-variant-dropdown.mobile .afi-premium-variant-trigger strong {
  font-size: 14px !important;
}

.afi-premium-variant-dropdown.mobile .afi-premium-variant-menu {
  top: calc(100% + 8px) !important;
  z-index: 120 !important;
  max-height: 310px !important;
}

/* Remove feature-item borders/backgrounds. Category card keeps the boundary. */
.afi-feature-section-card {
  border: 1.5px solid rgba(147,197,253,.82) !important;
  box-shadow:
    0 20px 52px -48px rgba(15,23,42,.22),
    0 0 0 4px rgba(7,93,246,.025),
    inset 0 1px 0 rgba(255,255,255,.96) !important;
}

.afi-feature-items-grid {
  gap: 0 !important;
}

.afi-feature-item,
.afi-feature-item.mobile {
  min-height: 54px !important;
  padding: 9px 2px !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 28px !important;
  align-items: center !important;
  column-gap: 12px !important;
}

.afi-feature-item + .afi-feature-item {
  border-top: 1px solid rgba(226,232,240,.58) !important;
}

.afi-feature-item:hover {
  transform: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

.afi-feature-item-left {
  min-width: 0 !important;
  display: grid !important;
  grid-template-columns: 22px minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 10px !important;
}

.afi-feature-dot {
  align-self: center !important;
  justify-self: center !important;
  width: 10px !important;
  height: 10px !important;
  border-radius: 999px !important;
  background: #075df6 !important;
  box-shadow: 0 0 0 6px rgba(7,93,246,.08) !important;
}

.afi-feature-item-copy {
  min-width: 0 !important;
  display: grid !important;
  align-content: center !important;
}

.afi-feature-item-copy strong {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  display: block !important;
  color: #07102b !important;
  font-size: 13px !important;
  line-height: 1.18 !important;
  font-weight: 800 !important;
}

.afi-feature-item-copy small {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  display: block !important;
  margin-top: 4px !important;
  color: #64748b !important;
  font-size: 11px !important;
  line-height: 1.18 !important;
  font-weight: 720 !important;
}

.afi-feature-check {
  align-self: center !important;
  justify-self: center !important;
  display: grid !important;
  place-items: center !important;
}

/* View-all button should feel like a text CTA, no filled background */
.afi-view-all-features {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 12px 4px 4px !important;
  color: #075df6 !important;
  font-size: 12px !important;
  font-weight: 850 !important;
  justify-content: center !important;
}

.afi-view-all-features:hover {
  background: transparent !important;
  text-decoration: underline !important;
}

/* Key specs: top-right on mobile, compact and visible */
@media (max-width: 1180px) {
  .afi-mobile-hero {
    min-height: 320px !important;
    padding: 15px !important;
  }

  .afi-mobile-top-row {
    position: relative !important;
    z-index: 5 !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 145px !important;
    align-items: start !important;
    gap: 10px !important;
  }

  .afi-mobile-top-row .afi-key-specs-strip.mobile {
    justify-self: end !important;
    width: 145px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .afi-mobile-top-row .afi-key-specs-label {
    display: none !important;
  }

  .afi-mobile-top-row .afi-key-specs-grid {
    margin: 0 !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 5px !important;
    overflow: visible !important;
  }

  .afi-mobile-top-row .afi-key-specs-grid div {
    min-height: auto !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 6px !important;
  }

  .afi-mobile-top-row .afi-key-specs-grid svg {
    width: 15px !important;
    height: 15px !important;
    flex: 0 0 auto !important;
    color: #075df6 !important;
  }

  .afi-mobile-top-row .afi-key-specs-grid strong {
    display: block !important;
    color: #07102b !important;
    font-size: 12px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
    white-space: nowrap !important;
    text-align: right !important;
  }

  .afi-mobile-top-row .afi-key-specs-grid small {
    display: none !important;
  }

  .afi-mobile-car-stage {
    min-height: 190px !important;
    margin-top: 6px !important;
  }

  .afi-mobile-car-stage .afi-car-image {
    width: 152% !important;
    max-height: 222px !important;
    transform: translateX(-5%) !important;
  }

  .afi-mobile-hero-foot {
    display: none !important;
  }

  .afi-mobile-controls {
    position: relative !important;
    z-index: 25 !important;
  }

  .afi-feature-section-card {
    border-color: rgba(147,197,253,.9) !important;
  }

  .afi-feature-item,
  .afi-feature-item.mobile {
    min-height: 55px !important;
  }
}

`;
