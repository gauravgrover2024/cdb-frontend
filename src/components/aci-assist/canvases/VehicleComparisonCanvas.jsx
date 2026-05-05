import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Car,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Fuel,
  Gauge,
  Heart,
  Info,
  Layers3,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { formatCurrency, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";
import { valueFrom } from "../canvas-utils";

const cx = (...parts) => parts.filter(Boolean).join(" ");

const ALL_CATEGORY = "All Features";
const SNAPSHOT_CATEGORY = "Snapshot";

const CATEGORY_ORDER = [
  SNAPSHOT_CATEGORY,
  "Price Breakup",
  "Engine & Transmission",
  "Fuel & Performance",
  "Safety",
  "Comfort & Convenience",
  "Interior",
  "Exterior",
  "Entertainment & Communication",
  "ADAS Feature",
  "Dimensions & Capacity",
  "Ownership",
  "Features",
  "Other",
];

const IMAGE_KEYS = [
  "image",
  "imageUrl",
  "image_url",
  "img",
  "imgUrl",
  "heroImage",
  "heroImageUrl",
  "vehicleImage",
  "vehicleImageUrl",
  "carImage",
  "carImageUrl",
  "primaryImage",
  "primaryImageUrl",
  "mainImage",
  "mainImageUrl",
  "thumbnail",
  "thumbnailUrl",
  "photo",
  "photos",
  "images",
  "gallery",
  "media",
  "assets",
  "src",
  "url",
];

const NEGATIVE_VALUES = new Set([
  "",
  "-",
  "—",
  "no",
  "false",
  "0",
  "na",
  "n/a",
  "none",
  "nil",
  "not available",
  "unavailable",
  "not offered",
  "not found",
]);

const POSITIVE_VALUES = new Set([
  "yes",
  "true",
  "available",
  "included",
  "standard",
  "present",
  "offered",
]);

const CATEGORY_ICONS = {
  [SNAPSHOT_CATEGORY]: Sparkles,
  "Price Breakup": CircleDollarSign,
  "Engine & Transmission": Settings,
  "Fuel & Performance": Fuel,
  Safety: ShieldCheck,
  "Comfort & Convenience": BadgeCheck,
  Interior: Car,
  Exterior: Car,
  "Entertainment & Communication": Sparkles,
  "ADAS Feature": BadgeCheck,
  "Dimensions & Capacity": Gauge,
  Ownership: ShieldCheck,
  Features: Layers3,
  Other: Layers3,
};

const firstMeaningfulValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const primitiveText = (value, fallback = "—") => {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (Array.isArray(value)) {
    const joined = value
      .map((item) => primitiveText(item, ""))
      .filter(Boolean)
      .join(", ");
    return joined || fallback;
  }

  if (typeof value === "object") {
    return (
      primitiveText(
        value.displayValue ??
          value.label ??
          value.value ??
          value.name ??
          value.title ??
          value.variant ??
          value.model ??
          value.brand ??
          value.make,
        "",
      ) || fallback
    );
  }

  return fallback;
};

const normalizeText = (value = "") =>
  primitiveText(value, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/amp/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const prettyLabel = (value = "") =>
  String(value || "")
    .replace(/\|/g, " ")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeCategoryName = (value = "") => {
  const text = normalizeText(value);

  if (!text) return "Features";
  if (
    /engine|transmission|gearbox|clutch|drive type|displacement|cylinder/.test(
      text,
    )
  ) {
    return "Engine & Transmission";
  }
  if (
    /mileage|fuel|range|power|torque|performance|turbo|bhp|ps|nm|kmpl/.test(
      text,
    )
  ) {
    return "Fuel & Performance";
  }
  if (
    /airbag|safety|abs|esc|hill|brake|camera|sensor|adas|ncap|isofix|tpms/.test(
      text,
    )
  ) {
    return "Safety";
  }
  if (
    /seat|sunroof|ac|climate|comfort|ventilated|cruise|parking|steering/.test(
      text,
    )
  ) {
    return "Comfort & Convenience";
  }
  if (
    /screen|audio|speaker|connected|infotainment|bluetooth|android|apple|wireless|navigation/.test(
      text,
    )
  ) {
    return "Entertainment & Communication";
  }
  if (/adas|lane|blind|collision|adaptive|driver assistance/.test(text)) {
    return "ADAS Feature";
  }
  if (
    /length|width|height|wheelbase|ground|boot|dimension|seating|capacity/.test(
      text,
    )
  ) {
    return "Dimensions & Capacity";
  }
  if (/warranty|service|maintenance|ownership/.test(text)) return "Ownership";
  if (
    /exterior|headlamp|tail lamp|wheel|tyre|roof rail|fog|lamp|mirror/.test(
      text,
    )
  ) {
    return "Exterior";
  }
  if (/interior|dashboard|upholstery|cabin|ambient/.test(text))
    return "Interior";

  return "Features";
};

const canonicalFeatureLabel = (rawLabel = "") => {
  const source = normalizeText(rawLabel);
  if (!source) return "";

  if (/power steering/.test(source)) return "Power Steering";
  if (/engine type|engine$|engine /.test(source)) return "Engine";
  if (/displacement|engine displacement|cc/.test(source)) return "Displacement";
  if (/max power|power output|power$/.test(source)) return "Max Power";
  if (/max torque|torque$/.test(source)) return "Max Torque";
  if (/transmission type|transmission$|gearbox type/.test(source))
    return "Transmission";
  if (/gear box|gearbox|number of gears|speed gearbox/.test(source))
    return "Gearbox";
  if (/arai mileage|mileage|fuel efficiency|kmpl/.test(source))
    return "Mileage";
  if (/no of airbags|number of airbags|airbags/.test(source)) return "Airbags";
  if (/global ncap|ncap|safety rating/.test(source)) return "Global NCAP";
  if (/boot space|boot capacity|luggage space/.test(source))
    return "Boot Space";
  if (/sunroof|moonroof|voice assisted sunroof|panoramic sunroof/.test(source))
    return "Sunroof";
  if (/adas|advanced driver assistance/.test(source)) return "ADAS";
  if (
    /touchscreen|infotainment screen|infotainment system|display size/.test(
      source,
    )
  ) {
    return "Infotainment Screen";
  }
  if (/wireless charger|wireless charging/.test(source))
    return "Wireless Charger";
  if (/ventilated seats|ventilated front seats/.test(source))
    return "Ventilated Seats";
  if (/warranty|standard warranty/.test(source)) return "Warranty";
  if (/parking camera|rear camera|360 camera|360 degree camera/.test(source))
    return "Camera";
  if (/parking sensor|rear parking sensor|front parking sensor/.test(source)) {
    return "Parking Sensors";
  }
  if (/tyre pressure|tpms/.test(source)) return "TPMS";
  if (/isofix/.test(source)) return "ISOFIX Child Seat Mounts";
  if (/cruise control/.test(source)) return "Cruise Control";
  if (/climate control|automatic climate/.test(source))
    return "Climate Control";
  if (/apple carplay/.test(source)) return "Apple CarPlay";
  if (/android auto/.test(source)) return "Android Auto";
  if (/speakers|speaker count|audio system/.test(source)) return "Speakers";

  return prettyLabel(rawLabel);
};

const canonicalFeatureKey = (label = "") =>
  normalizeText(canonicalFeatureLabel(label) || label);

const categoryForCanonicalLabel = (label = "", sourceCategory = "") => {
  const category = normalizeCategoryName(label);
  if (category !== "Features") return category;

  const normalizedSource = normalizeText(sourceCategory);

  if (/engine|transmission/.test(normalizedSource))
    return "Engine & Transmission";
  if (/fuel|performance/.test(normalizedSource)) return "Fuel & Performance";
  if (/safety/.test(normalizedSource)) return "Safety";
  if (/comfort|convenience/.test(normalizedSource))
    return "Comfort & Convenience";
  if (/entertainment|communication|infotainment/.test(normalizedSource)) {
    return "Entertainment & Communication";
  }
  if (/adas/.test(normalizedSource)) return "ADAS Feature";
  if (/dimension|capacity/.test(normalizedSource))
    return "Dimensions & Capacity";
  if (/ownership|warranty/.test(normalizedSource)) return "Ownership";
  if (/interior/.test(normalizedSource)) return "Interior";
  if (/exterior/.test(normalizedSource)) return "Exterior";

  return "Features";
};

const categorySort = (a, b) => {
  const ai = CATEGORY_ORDER.indexOf(a);
  const bi = CATEGORY_ORDER.indexOf(b);

  if (ai !== -1 || bi !== -1) {
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  }

  return a.localeCompare(b);
};

const moneyNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return 0;

  const parsed = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed)) return 0;

  if (raw.includes("crore") || raw.includes(" cr")) return parsed * 10000000;
  if (raw.includes("lakh") || raw.includes(" lac")) return parsed * 100000;

  return parsed;
};

const formatMoney = (value) => {
  const amount = moneyNumber(value);
  return amount > 0 ? formatCurrency(amount) : primitiveText(value, "—");
};

const cleanFeatureValue = (value) => {
  if (value === null || value === undefined) return "";

  if (typeof value === "boolean") return value ? "Yes" : "—";

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? String(value) : "";
  }

  if (Array.isArray(value)) {
    return value.map(cleanFeatureValue).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    return cleanFeatureValue(
      value.value ??
        value.featureValue ??
        value.feature_value ??
        value.displayValue ??
        value.available ??
        value.status ??
        value.label ??
        value.name ??
        value.title ??
        "",
    );
  }

  const text = String(value).trim();
  if (!text) return "";

  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();

  if (NEGATIVE_VALUES.has(normalized)) return "—";
  if (POSITIVE_VALUES.has(normalized)) return "Yes";

  return text;
};

const isEmptyDisplayValue = (value) => {
  const text = primitiveText(value, "").trim().toLowerCase();
  return !text || NEGATIVE_VALUES.has(text);
};

const normalizeComparable = (value) =>
  primitiveText(value, "")
    .toLowerCase()
    .replace(/[₹,\s]/g, "")
    .trim();

const rowHasDifference = (row) => {
  const normalized = row.values
    .map((value) => normalizeComparable(value))
    .filter(Boolean);
  return new Set(normalized).size > 1;
};

const isUsableImageUrl = (value) => {
  if (!value || typeof value !== "string") return false;
  const text = value.trim();

  return (
    /^(data:image\/|blob:)/i.test(text) ||
    /^https?:\/\//i.test(text) ||
    /^(\/|\.\/|\.\.\/)/.test(text) ||
    /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(text)
  );
};

const findImageIn = (value, depth = 0) => {
  if (!value || depth > 6) return "";

  if (typeof value === "string") {
    return isUsableImageUrl(value) ? value.trim() : "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageIn(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof value === "object") {
    for (const key of IMAGE_KEYS) {
      const found = findImageIn(value[key], depth + 1);
      if (found) return found;
    }

    for (const nestedValue of Object.values(value)) {
      const found = findImageIn(nestedValue, depth + 1);
      if (found) return found;
    }
  }

  return "";
};

const modelBrand = (model) =>
  primitiveText(valueFrom(model, ["brand", "make"], ""), "");

const modelNameOnly = (model, index = 0) =>
  primitiveText(
    valueFrom(model, ["model", "name", "title"], ""),
    `Model ${index + 1}`,
  );

const modelCardKey = (model, index) =>
  primitiveText(
    valueFrom(model, ["id", "_id", "modelId"], ""),
    `${modelBrand(model)}-${modelNameOnly(model, index)}-${index}`,
  );

const vehicleLookupText = (vehicle = {}, model = {}) =>
  normalizeText(
    [
      vehicle.brand || vehicle.make || model.brand || model.make,
      vehicle.model || model.model || model.name,
      vehicle.variant ||
        vehicle.variantName ||
        vehicle.variant_name ||
        vehicle.name,
      vehicle.fuel || vehicle.fuelType,
      vehicle.transmission,
    ]
      .filter(Boolean)
      .join(" "),
  );

const isSameVehicleRecord = (candidate = {}, vehicle = {}, model = {}) => {
  const targetVariant = normalizeText(
    vehicle.variant ||
      vehicle.variantName ||
      vehicle.variant_name ||
      vehicle.name,
  );
  const candidateVariant = normalizeText(
    candidate.variant ||
      candidate.variantName ||
      candidate.variant_name ||
      candidate.VariantName ||
      candidate.name,
  );

  if (targetVariant && candidateVariant) {
    return (
      targetVariant === candidateVariant ||
      targetVariant.includes(candidateVariant) ||
      candidateVariant.includes(targetVariant)
    );
  }

  const targetModel = normalizeText(vehicle.model || model.model || model.name);
  const candidateModel = normalizeText(
    candidate.model || candidate.modelName || candidate.name,
  );

  return Boolean(
    targetModel && candidateModel && targetModel === candidateModel,
  );
};

const findVehicleImageFromData = (data = {}, vehicle = {}, model = {}) => {
  const rowBuckets = [
    data.selectedDefaultVariants,
    data.selectedVariantRows,
    data.variantRows,
    data.variants,
    data.models,
    data.options,
    data.records,
    data.rows,
  ];

  for (const bucket of rowBuckets) {
    for (const item of asArray(bucket)) {
      if (!item || typeof item !== "object") continue;

      if (isSameVehicleRecord(item, vehicle, model)) {
        const found = findImageIn(item);
        if (found) return found;
      }
    }
  }

  const lookupText = vehicleLookupText(vehicle, model);
  const mapBuckets = [
    data.vehicleImages,
    data.imagesByVariant,
    data.imagesByModel,
    data.modelImages,
    data.variantImages,
    data.media,
    data.imageMap,
  ];

  if (lookupText) {
    for (const bucket of mapBuckets) {
      if (!bucket || typeof bucket !== "object" || Array.isArray(bucket))
        continue;

      for (const [key, value] of Object.entries(bucket)) {
        const normalizedKey = normalizeText(key);

        if (
          normalizedKey === lookupText ||
          lookupText.includes(normalizedKey) ||
          normalizedKey.includes(lookupText)
        ) {
          const found = findImageIn(value);
          if (found) return found;
        }
      }
    }
  }

  for (const bucket of mapBuckets) {
    const found = findImageIn(bucket);
    if (found) return found;
  }

  return "";
};

const getVehicleImage = (data = {}, vehicle = {}, model = {}) =>
  findImageIn(vehicle) ||
  findImageIn(vehicle.raw) ||
  findImageIn(vehicle.data) ||
  findImageIn(model) ||
  findImageIn(model.raw) ||
  findImageIn(model.data) ||
  findVehicleImageFromData(data, vehicle, model);

const normalizeVariantOption = (variant, model, index = 0) => {
  const brand = modelBrand(model);
  const modelName = modelNameOnly(model, 0);

  if (typeof variant === "string") {
    return { brand, model: modelName, variant, raw: variant };
  }

  if (!variant || typeof variant !== "object") {
    return {
      brand,
      model: modelName,
      variant: `Variant ${index + 1}`,
      raw: variant,
    };
  }

  return {
    ...variant,
    brand: primitiveText(valueFrom(variant, ["brand", "make"], brand), brand),
    model: primitiveText(valueFrom(variant, ["model"], modelName), modelName),
    variant: primitiveText(
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
      `Variant ${index + 1}`,
    ),
    raw: variant,
  };
};

const getModelVariantOptions = (model) =>
  asArray(
    model?.variants ||
      model?.variantRows ||
      model?.variantOptions ||
      model?.options,
  )
    .map((variant, index) => normalizeVariantOption(variant, model, index))
    .filter((variant) => variant.variant);

const variantOptionKey = (variant, index = 0) =>
  [
    variant?.id,
    variant?._id,
    variant?.variantId,
    variant?.brand,
    variant?.model,
    variant?.variant,
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase() || `variant-${index}`;

const variantOptionPrice = (variant) =>
  valueFrom(
    variant,
    [
      "exShowroomPrice",
      "exShowroom",
      "ex_showroom",
      "ex_showroom_price_cardekho",
      "price",
      "startingPrice",
    ],
    "",
  );

const variantOptionOnRoad = (variant) =>
  valueFrom(
    variant,
    [
      "onRoadPrice",
      "onRoad",
      "calculatedOnRoadPrice",
      "storedOnRoadPrice",
      "total_on_road_with_accessories",
      "on_road_price_cardekho",
    ],
    "",
  );

const variantOptionFuel = (variant) =>
  primitiveText(
    valueFrom(variant, ["fuel", "fuelType", "fuel_type", "FuelType"], ""),
    "",
  );

const variantOptionTransmission = (variant) =>
  primitiveText(
    valueFrom(
      variant,
      ["transmission", "transmissionType", "transmission_type"],
      "",
    ),
    "",
  );

const variantOptionSeating = (variant, model) =>
  primitiveText(
    valueFrom(
      variant,
      ["seatingCapacity", "seating_capacity", "seats"],
      valueFrom(model, ["seatingCapacity", "seating_capacity", "seats"], ""),
    ),
    "",
  );

const pickLowestPricedVariant = (options = []) => {
  if (!options.length) return null;

  const priced = options
    .map((variant, index) => ({
      variant,
      index,
      price: moneyNumber(variantOptionPrice(variant)),
    }))
    .filter((item) => item.price > 0)
    .sort((a, b) => a.price - b.price);

  return priced[0]?.variant || options[0];
};

const modelPriceRange = (model) => {
  const min = valueFrom(
    model,
    ["startingPrice", "startPrice", "minPrice", "price"],
    "",
  );
  const max = valueFrom(model, ["topPrice", "maxPrice"], "");

  const minText = formatMoney(min);
  const maxText = formatMoney(max);

  if (moneyNumber(min) > 0 && moneyNumber(max) > 0 && minText !== maxText) {
    return `${minText} – ${maxText}`;
  }

  if (moneyNumber(min) > 0) return minText;

  return "Price unavailable";
};

const featureSourceFields = (record = {}) => [
  record.features,
  record.featureGroups,
  record.feature_groups,
  record.specs,
  record.specifications,
  record.specification,
  record.details,
  record.featureData,
  record.featuresData,
  record.data?.features,
  record.data?.featureGroups,
  record.data?.feature_groups,
  record.data?.specs,
  record.data?.specifications,
];

const vehicleIdentityMatches = (candidate = {}, target = {}) => {
  const candidateVariant = normalizeText(
    candidate.variant ||
      candidate.variantName ||
      candidate.variant_name ||
      candidate.name,
  );
  const targetVariant = normalizeText(
    target.variant || target.variantName || target.variant_name || target.name,
  );

  if (candidateVariant && targetVariant) {
    return (
      candidateVariant === targetVariant ||
      candidateVariant.includes(targetVariant) ||
      targetVariant.includes(candidateVariant)
    );
  }

  const candidateModel = normalizeText(candidate.model || candidate.modelName);
  const targetModel = normalizeText(target.model);

  return Boolean(
    candidateModel && targetModel && candidateModel === targetModel,
  );
};

const vehicleFeatureSources = (vehicle = {}, data = {}) => {
  const sources = [
    ...featureSourceFields(vehicle),
    ...featureSourceFields(vehicle.raw || {}),
    ...featureSourceFields(vehicle.data || {}),
  ];

  const possibleRows = [
    ...asArray(data.selectedDefaultVariants),
    ...asArray(data.selectedVariantRows),
    ...asArray(data.variantRows),
    ...asArray(data.variants),
    ...asArray(data.options),
    ...asArray(data.rows),
    ...asArray(data.records),
    ...asArray(data.features),
    ...asArray(data.featureDocs),
  ];

  possibleRows.forEach((row) => {
    if (vehicleIdentityMatches(row, vehicle)) {
      sources.push(...featureSourceFields(row));
    }
  });

  const objectBuckets = [
    data.featuresByVariant,
    data.featureGroupsByVariant,
    data.variantFeatures,
    data.featuresMap,
  ];

  objectBuckets.forEach((bucket) => {
    if (!bucket || typeof bucket !== "object" || Array.isArray(bucket)) return;

    const vehicleText = vehicleLookupText(vehicle);

    Object.entries(bucket).forEach(([key, value]) => {
      const normalizedKey = normalizeText(key);

      if (
        normalizedKey === vehicleText ||
        vehicleText.includes(normalizedKey) ||
        normalizedKey.includes(vehicleText)
      ) {
        sources.push(value);
      }
    });
  });

  return sources.filter(Boolean);
};

const flattenFeatures = (input, fallbackGroup = "Features") => {
  const rows = [];

  const pushRow = (category, label, value) => {
    const finalLabel = canonicalFeatureLabel(label);
    if (!finalLabel || finalLabel === "Feature") return;

    const cleanValue = cleanFeatureValue(value);
    if (!cleanValue) return;

    rows.push({
      category: categoryForCanonicalLabel(
        finalLabel,
        category || fallbackGroup,
      ),
      label: finalLabel,
      value: cleanValue,
      sourceCategory: category || fallbackGroup,
    });
  };

  const walk = (value, path = []) => {
    if (value === null || value === undefined || value === "") return;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === "object") {
          pushRow(
            item.category ||
              item.group ||
              item.section ||
              path[0] ||
              fallbackGroup,
            item.label ||
              item.feature ||
              item.featureName ||
              item.name ||
              item.key ||
              path.slice(1).join(" ") ||
              `Feature ${index + 1}`,
            item.value ??
              item.featureValue ??
              item.feature_value ??
              item.displayValue ??
              item.answer ??
              item.available ??
              item.included ??
              "",
          );
          return;
        }

        pushRow(
          path[0] || fallbackGroup,
          path.slice(1).join(" ") || `Feature ${index + 1}`,
          item,
        );
      });

      return;
    }

    if (typeof value !== "object") {
      pushRow(
        path[0] || fallbackGroup,
        path.slice(1).join(" ") || path[0] || "Feature",
        value,
      );
      return;
    }

    if (
      value.label ||
      value.feature ||
      value.featureName ||
      value.name ||
      value.key
    ) {
      pushRow(
        value.category ||
          value.group ||
          value.section ||
          path[0] ||
          fallbackGroup,
        value.label ||
          value.feature ||
          value.featureName ||
          value.name ||
          value.key,
        value.value ??
          value.featureValue ??
          value.feature_value ??
          value.displayValue ??
          value.answer ??
          value.available ??
          value.included ??
          "",
      );

      return;
    }

    Object.entries(value).forEach(([key, nestedValue]) => {
      const keyText = String(key || "").trim();
      if (!keyText) return;

      if (keyText.includes("|")) {
        const [group, ...featureParts] = keyText
          .split("|")
          .map((part) => part.trim());
        walk(nestedValue, [
          group || fallbackGroup,
          featureParts.join(" ") || keyText,
        ]);
        return;
      }

      walk(nestedValue, [...path, keyText]);
    });
  };

  walk(input, []);
  return rows;
};

const mergeValuePreference = (current, next) => {
  if (isEmptyDisplayValue(current)) return next;
  if (isEmptyDisplayValue(next)) return current;

  const currentText = primitiveText(current, "");
  const nextText = primitiveText(next, "");

  if (currentText.length < nextText.length && currentText === "Yes")
    return next;
  return current;
};

const featureRowsFromVehicles = (vehicles, data = {}) => {
  const maps = vehicles.map((vehicle) => {
    const map = new Map();

    vehicleFeatureSources(vehicle, data).forEach((source) => {
      flattenFeatures(source).forEach((item) => {
        const key = canonicalFeatureKey(item.label);
        if (!key) return;

        const existing = map.get(key);

        map.set(key, {
          category: item.category,
          label: item.label,
          value: existing
            ? mergeValuePreference(existing.value, item.value)
            : item.value,
        });
      });
    });

    return map;
  });

  const allKeys = Array.from(
    new Set(maps.flatMap((map) => Array.from(map.keys()))),
  );

  return allKeys.map((key, index) => {
    const sample = maps.find((map) => map.has(key))?.get(key);

    return {
      id: `feature-${key}-${index}`,
      key,
      category: sample?.category || "Features",
      label: sample?.label || prettyLabel(key),
      values: maps.map((map) => map.get(key)?.value || "—"),
      valueType: "feature",
      priority: 300 + index,
    };
  });
};

const getOptionalBreakdownColumns = (vehicles = []) =>
  vehicles.map((vehicle, index) => ({
    id: `optional-breakdown-${index}`,
    title: [vehicle.model, vehicle.variant].filter(Boolean).join(" "),
    items: asArray(vehicle.optionalItems)
      .map((item, itemIndex) => ({
        id: `${index}-${itemIndex}`,
        label: primitiveText(
          item?.label || item?.name || item?.title,
          `Item ${itemIndex + 1}`,
        ),
        amount: formatMoney(item?.amount),
      }))
      .filter((item) => item.amount !== "—"),
  }));

const getPriceBreakupRows = (vehicles = []) => {
  const optionalBreakdowns = getOptionalBreakdownColumns(vehicles);

  const rowDefs = [
    {
      key: "exShowroom",
      label: "Ex-showroom price",
      get: (vehicle) =>
        valueFrom(
          vehicle,
          ["exShowroomPrice", "exShowroom", "ex_showroom", "price"],
          "",
        ),
      priority: 0,
    },
    {
      key: "rto",
      label: "RTO / Road tax",
      get: (vehicle) =>
        valueFrom(vehicle, ["rto", "rtoCharges", "rto_charges"], ""),
      priority: 1,
    },
    {
      key: "insurance",
      label: "Insurance",
      get: (vehicle) =>
        valueFrom(
          vehicle,
          ["insurance", "insuranceCharges", "insurance_charges"],
          "",
        ),
      priority: 2,
    },
    {
      key: "tcs",
      label: "TCS",
      get: (vehicle) =>
        valueFrom(vehicle, ["tcs", "tcsCharges", "other_tcsCharges"], ""),
      priority: 3,
    },
    {
      key: "other",
      label: "Handling / Other charges",
      get: (vehicle) =>
        valueFrom(
          vehicle,
          [
            "handlingOtherCharges",
            "handlingCharges",
            "otherCharges",
            "other_totalOtherCharges",
          ],
          "",
        ),
      priority: 4,
    },
    {
      key: "optional",
      label: "Optional accessories",
      get: (vehicle) =>
        valueFrom(
          vehicle,
          [
            "optionalOtherTotal",
            "optionalTotal",
            "optional_total",
            "optional_totalAccessories",
            "optional_totalAccessoriesInRs",
          ],
          "",
        ) ||
        asArray(vehicle.optionalItems).reduce(
          (sum, item) => sum + moneyNumber(item.amount),
          0,
        ),
      priority: 5,
      meta: {
        tooltipTitle: "Optional accessories breakup",
        tooltipColumns: optionalBreakdowns,
      },
    },
    {
      key: "onRoad",
      label: "Total on-road price",
      get: (vehicle) => variantOptionOnRoad(vehicle),
      priority: 6,
    },
  ];

  return rowDefs
    .map((definition) => ({
      id: `price-${definition.key}`,
      key: canonicalFeatureKey(definition.label),
      category: "Price Breakup",
      label: definition.label,
      values: vehicles.map(definition.get),
      valueType: "money",
      priority: definition.priority,
      meta: definition.meta,
    }))
    .filter((row) => {
      if (row.key === canonicalFeatureKey("Optional accessories")) {
        const hasBreakdown = row.meta?.tooltipColumns?.some(
          (col) => col.items?.length,
        );
        return (
          hasBreakdown || row.values.some((value) => moneyNumber(value) > 0)
        );
      }

      return row.values.some((value) => moneyNumber(value) > 0);
    });
};

const coreRowsFromVehicles = (vehicles, models) =>
  [
    {
      id: "core-fuel",
      category: "Fuel & Performance",
      label: "Fuel type",
      values: vehicles.map((vehicle) => variantOptionFuel(vehicle)),
      priority: 100,
    },
    {
      id: "core-transmission",
      category: "Engine & Transmission",
      label: "Transmission",
      values: vehicles.map((vehicle) => variantOptionTransmission(vehicle)),
      priority: 101,
    },
    {
      id: "core-engine",
      category: "Engine & Transmission",
      label: "Engine",
      values: vehicles.map((vehicle) =>
        valueFrom(
          vehicle,
          ["engine", "engineType", "engine_type", "displacement", "cc"],
          "",
        ),
      ),
      priority: 102,
    },
    {
      id: "core-power",
      category: "Fuel & Performance",
      label: "Max Power",
      values: vehicles.map((vehicle) =>
        valueFrom(vehicle, ["power", "maxPower", "max_power", "ps"], ""),
      ),
      priority: 103,
    },
    {
      id: "core-torque",
      category: "Fuel & Performance",
      label: "Max Torque",
      values: vehicles.map((vehicle) =>
        valueFrom(vehicle, ["torque", "maxTorque", "max_torque"], ""),
      ),
      priority: 104,
    },
    {
      id: "core-mileage",
      category: "Fuel & Performance",
      label: "Mileage",
      values: vehicles.map((vehicle) =>
        valueFrom(
          vehicle,
          ["mileage", "araiMileage", "arai_mileage", "fuelEfficiency"],
          "",
        ),
      ),
      priority: 105,
    },
    {
      id: "core-body-type",
      category: "Dimensions & Capacity",
      label: "Body type",
      values: vehicles.map((vehicle, index) =>
        valueFrom(
          vehicle,
          ["bodyType", "body_type", "body_type_bucket", "segment"],
          valueFrom(models[index], ["bodyType", "body_type", "segment"], ""),
        ),
      ),
      priority: 106,
    },
    {
      id: "core-seats",
      category: "Dimensions & Capacity",
      label: "Seating capacity",
      values: vehicles.map((vehicle, index) =>
        variantOptionSeating(vehicle, models[index]),
      ),
      priority: 107,
    },
    {
      id: "core-warranty",
      category: "Ownership",
      label: "Warranty",
      values: vehicles.map((vehicle) =>
        valueFrom(vehicle, ["warranty", "standardWarranty"], ""),
      ),
      priority: 108,
    },
  ]
    .map((row) => ({
      ...row,
      key: canonicalFeatureKey(row.label),
      valueType: "feature",
    }))
    .filter((row) => row.values.some((value) => !isEmptyDisplayValue(value)));

const getSuppliedComparisonRows = (comparisonRows = [], vehicles = []) =>
  asArray(comparisonRows)
    .map((row, index) => {
      const label = primitiveText(
        row?.label || row?.name || row?.feature || row?.key,
        "",
      );
      if (!label) return null;

      const finalLabel = canonicalFeatureLabel(label);
      const values = Array.isArray(row?.values)
        ? row.values.slice(0, vehicles.length)
        : vehicles.map((vehicle, vehicleIndex) => {
            const keys = [
              vehicle?.id,
              vehicle?._id,
              vehicle?.variantId,
              vehicle?.variant,
              vehicle?.variantName,
              vehicle?.name,
              vehicle?.model,
              `value${vehicleIndex + 1}`,
              vehicleIndex,
            ].filter((key) => key !== undefined && key !== null);

            for (const key of keys) {
              if (row?.[key] !== undefined) return row[key];
            }

            return "—";
          });

      while (values.length < vehicles.length) values.push("—");

      return {
        id: row.id || row.key || `supplied-${index}`,
        key: canonicalFeatureKey(finalLabel),
        category: categoryForCanonicalLabel(
          finalLabel,
          row.category || row.group || row.section,
        ),
        label: finalLabel,
        values: values.map(cleanFeatureValue),
        valueType: row.valueType || "feature",
        priority: 500 + index,
        meta: row.meta,
      };
    })
    .filter(Boolean)
    .filter(
      (row) =>
        !["variants", "variant count"].includes(row.label.toLowerCase().trim()),
    );

const mergeRows = (rows = [], vehicleCount = 0) => {
  const map = new Map();

  rows.forEach((row, index) => {
    const key = row.key || canonicalFeatureKey(row.label);
    if (!key) return;

    const values = asArray(row.values).slice(0, vehicleCount);
    while (values.length < vehicleCount) values.push("—");

    const normalized = {
      ...row,
      id: row.id || `${key}-${index}`,
      key,
      values: values.map((value) =>
        row.valueType === "money" ? value : cleanFeatureValue(value) || "—",
      ),
      order: index,
    };

    if (!map.has(key)) {
      map.set(key, normalized);
      return;
    }

    const existing = map.get(key);

    map.set(key, {
      ...existing,
      category:
        existing.category === "Features" && normalized.category !== "Features"
          ? normalized.category
          : existing.category,
      values: existing.values.map((value, valueIndex) =>
        mergeValuePreference(value, normalized.values[valueIndex]),
      ),
      valueType:
        existing.valueType === "money" ? "money" : normalized.valueType,
      priority: Math.min(
        existing.priority || 9999,
        normalized.priority || 9999,
      ),
      meta: existing.meta || normalized.meta,
    });
  });

  return Array.from(map.values())
    .filter((row) => row.values.some((value) => !isEmptyDisplayValue(value)))
    .sort((a, b) => {
      const categoryDelta = categorySort(a.category, b.category);
      if (categoryDelta !== 0) return categoryDelta;

      if ((a.priority || 0) !== (b.priority || 0)) {
        return (a.priority || 0) - (b.priority || 0);
      }

      return a.label.localeCompare(b.label);
    });
};

const buildComparisonRows = ({ vehicles, models, comparisonRows, data }) =>
  mergeRows(
    [
      ...getPriceBreakupRows(vehicles),
      ...coreRowsFromVehicles(vehicles, models),
      ...featureRowsFromVehicles(vehicles, data),
      ...getSuppliedComparisonRows(comparisonRows, vehicles),
    ],
    vehicles.length,
  );

const findBestRow = (rows, aliases = []) => {
  const keys = aliases.map(canonicalFeatureKey).filter(Boolean);
  const texts = aliases.map(normalizeText).filter(Boolean);

  return (
    rows.find((row) => keys.includes(row.key)) ||
    rows.find((row) => {
      const haystack = normalizeText(`${row.label} ${row.category}`);
      return texts.some((text) => haystack.includes(text));
    })
  );
};

const buildSnapshotRows = (allRows) => {
  const definitions = [
    {
      id: "snapshot-ex-showroom",
      label: "Ex-showroom price",
      aliases: ["ex showroom price", "ex-showroom price"],
      icon: CircleDollarSign,
    },
    {
      id: "snapshot-on-road",
      label: "On-road price",
      aliases: ["total on road price", "on road price"],
      icon: CircleDollarSign,
    },
    {
      id: "snapshot-engine",
      label: "Engine",
      aliases: ["engine", "engine type"],
      icon: Gauge,
    },
    {
      id: "snapshot-transmission",
      label: "Transmission",
      aliases: ["transmission", "transmission type"],
      icon: Settings,
    },
    {
      id: "snapshot-mileage",
      label: "Mileage",
      aliases: ["mileage", "arai mileage"],
      icon: Fuel,
    },
    {
      id: "snapshot-airbags",
      label: "Airbags",
      aliases: ["airbags", "number of airbags", "no of airbags"],
      icon: ShieldCheck,
    },
    {
      id: "snapshot-safety",
      label: "Global NCAP",
      aliases: ["global ncap", "safety rating"],
      icon: ShieldCheck,
    },
    {
      id: "snapshot-boot",
      label: "Boot space",
      aliases: ["boot space", "boot capacity"],
      icon: Car,
    },
    {
      id: "snapshot-sunroof",
      label: "Sunroof",
      aliases: ["sunroof", "panoramic sunroof"],
      icon: Sparkles,
    },
    {
      id: "snapshot-adas",
      label: "ADAS",
      aliases: ["adas", "advanced driver assistance"],
      icon: BadgeCheck,
    },
    {
      id: "snapshot-infotainment",
      label: "Infotainment screen",
      aliases: ["infotainment screen", "touchscreen"],
      icon: Sparkles,
    },
    {
      id: "snapshot-warranty",
      label: "Warranty",
      aliases: ["warranty", "standard warranty"],
      icon: ShieldCheck,
    },
  ];

  const used = new Set();

  return definitions
    .map((definition) => {
      const row = findBestRow(allRows, definition.aliases);
      if (!row || used.has(row.key)) return null;

      used.add(row.key);

      return {
        ...row,
        id: definition.id,
        label: definition.label,
        category: SNAPSHOT_CATEGORY,
        icon: definition.icon,
        snapshot: true,
      };
    })
    .filter(Boolean);
};

const parseMileage = (value) => {
  const match = primitiveText(value, "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

const computeInsights = (vehicles, rows) => {
  if (!vehicles.length) return { winner: null, winnerIndex: 0, winners: [] };

  const scores = vehicles.map(() => 0);
  const winners = [];

  const exShowroomPrices = vehicles.map((vehicle) =>
    moneyNumber(variantOptionPrice(vehicle)),
  );

  const validPrices = exShowroomPrices
    .map((price, index) => ({ price, index }))
    .filter((item) => item.price > 0)
    .sort((a, b) => a.price - b.price);

  if (validPrices.length) {
    scores[validPrices[0].index] += 2;
    winners.push({
      label: "Best value",
      index: validPrices[0].index,
      reason: "Lowest ex-showroom price",
    });
  }

  const mileageRow = findBestRow(rows, ["mileage", "arai mileage"]);
  if (mileageRow) {
    const bestMileage = mileageRow.values
      .map((value, index) => ({ value: parseMileage(value), index }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)[0];

    if (bestMileage) {
      scores[bestMileage.index] += 1;
      winners.push({
        label: "Best mileage",
        index: bestMileage.index,
        reason: `${bestMileage.value} km/l`,
      });
    }
  }

  const featureScores = vehicles.map((_, vehicleIndex) =>
    rows.reduce((sum, row) => {
      if (row.category === "Price Breakup") return sum;

      const value = row.values[vehicleIndex];
      const text = primitiveText(value, "").toLowerCase();

      if (isEmptyDisplayValue(value)) return sum;
      if (NEGATIVE_VALUES.has(text)) return sum;

      return sum + 1;
    }, 0),
  );

  const mostFeatures = featureScores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score)[0];

  if (mostFeatures && mostFeatures.score > 0) {
    scores[mostFeatures.index] += 1;
    winners.push({
      label: "Most equipped",
      index: mostFeatures.index,
      reason: `${mostFeatures.score} visible strengths`,
    });
  }

  const bestIndex =
    scores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score)[0]?.index || 0;

  return {
    winner: vehicles[bestIndex],
    winnerIndex: bestIndex,
    winners,
  };
};

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-[16px] border border-[#dbe3ef] bg-white/90 pl-10 pr-10 text-sm font-semibold text-[#0f172a] outline-none shadow-sm transition placeholder:text-[#94a3b8] focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-[#dbeafe]/70"
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

function InlineInfoTooltip({ title, columns = [] }) {
  const [open, setOpen] = useState(false);

  const hasAnyItems = columns.some((column) => column.items?.length);

  if (!hasAnyItems) return null;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb] transition hover:bg-[#dbeafe]"
        aria-label={title || "More information"}
      >
        <Info size={12} />
      </button>

      {open ? (
        <div className="absolute left-0 top-7 z-50 w-[340px] max-w-[80vw] rounded-[18px] border border-[#dbe3ef] bg-white p-3 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.55)]">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[#1e40af]">
            {title || "Breakup"}
          </p>

          <div className="space-y-3">
            {columns.map((column) => (
              <div
                key={column.id || column.title}
                className="rounded-[14px] border border-[#eef2f7] bg-[#f8fafc] p-2.5"
              >
                <p className="text-xs font-black text-[#0f172a]">
                  {column.title}
                </p>

                {column.items?.length ? (
                  <div className="mt-2 space-y-1.5">
                    {column.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-2 text-xs"
                      >
                        <span className="font-semibold text-[#475569]">
                          {item.label}
                        </span>
                        <span className="font-black text-[#0f172a]">
                          {item.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-[#94a3b8]">
                    No optional accessories captured.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ValueCell({ value, row, winner = false }) {
  const safeLabel =
    row?.valueType === "money" ? formatMoney(value) : primitiveText(value, "—");
  const normalized = safeLabel.toLowerCase().trim();

  if (POSITIVE_VALUES.has(normalized)) {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 size={13} />
        Yes
      </span>
    );
  }

  if (NEGATIVE_VALUES.has(normalized)) {
    return <span className="font-black text-[#94a3b8]">—</span>;
  }

  return (
    <span
      className={cx(
        "inline-flex max-w-full whitespace-normal break-words rounded-full px-2.5 py-1 text-sm font-black leading-5",
        winner
          ? "bg-[#eff6ff] text-[#1d4ed8] ring-1 ring-[#bfdbfe]"
          : row?.valueType === "money"
            ? "text-[#2563eb]"
            : "text-[#0f172a]",
      )}
    >
      {safeLabel}
    </span>
  );
}

function StatPill({ icon: Icon, value, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe3ef] bg-white/86 px-3.5 py-2 text-xs font-black text-[#1e40af] shadow-sm">
      <Icon size={15} className="text-[#2563eb]" />
      <span>{primitiveText(value)}</span>
      <span className="text-[#64748b]">{primitiveText(label)}</span>
    </span>
  );
}

function SpecPill({ icon: Icon, label }) {
  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe3ef] bg-white/88 px-2.5 py-1.5 text-[11px] font-black text-[#475569] shadow-sm">
      <Icon size={12.5} className="text-[#2563eb]" />
      {label}
    </span>
  );
}

function VehicleArt({ data, vehicle, model, name }) {
  const image = getVehicleImage(data, vehicle, model);

  return (
    <div className="relative mx-auto h-28 w-full overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_50%_38%,#ffffff_0%,#f8fafc_42%,#eaf2ff_100%)] sm:h-32">
      <div className="absolute inset-x-10 bottom-5 h-7 rounded-full bg-[#334155]/18 blur-xl" />

      {image ? (
        <img
          src={image}
          alt={name}
          className="absolute inset-0 h-full w-full object-contain object-center p-3 drop-shadow-[0_20px_20px_rgba(15,23,42,0.18)]"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="absolute left-1/2 top-1/2 flex h-20 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[34px] bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#020617] text-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.8)]">
          <Car size={54} strokeWidth={1.35} />
        </div>
      )}

      <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-white/70 blur-lg" />
      <div className="absolute left-5 top-5 h-14 w-14 rounded-full bg-[#bfdbfe]/35 blur-xl" />
    </div>
  );
}

function VehicleCompareCard({
  data,
  model,
  vehicle,
  options,
  selectedKey,
  onSelect,
  index,
  winner,
  modelComparison,
}) {
  const brand = primitiveText(vehicle.brand || modelBrand(model), "");
  const modelName = primitiveText(
    vehicle.model || modelNameOnly(model, index),
    "",
  );
  const variantName = primitiveText(vehicle.variant, "");
  const fuel = variantOptionFuel(vehicle);
  const transmission = variantOptionTransmission(vehicle);
  const seating = variantOptionSeating(vehicle, model);
  const price = variantOptionPrice(vehicle);
  const displayPrice =
    moneyNumber(price) > 0
      ? formatMoney(price)
      : modelPriceRange(model || vehicle);

  return (
    <article
      className={cx(
        "relative min-w-[270px] overflow-hidden rounded-[28px] border bg-white/88 p-4 text-left shadow-[0_24px_76px_-64px_rgba(15,23,42,0.48)] backdrop-blur-2xl transition duration-200 hover:-translate-y-0.5",
        winner
          ? "border-[#93c5fd] ring-2 ring-[#dbeafe]"
          : "border-[#dbe3ef] hover:border-[#93c5fd]",
      )}
    >
      {winner ? (
        <span className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#eff6ff] px-3 py-1.5 text-[11px] font-black text-[#1d4ed8] ring-1 ring-[#bfdbfe]">
          <Trophy size={13} />
          Best balance
        </span>
      ) : (
        <button
          type="button"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/88 text-[#64748b] ring-1 ring-[#dbe3ef] transition hover:text-rose-500"
          aria-label="Shortlist"
        >
          <Heart size={17} />
        </button>
      )}

      <div className="flex items-start gap-3 pr-24">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe]">
          <Car size={19} />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563eb]">
            {brand || `Option ${index + 1}`}
          </p>

          <h3 className="mt-0.5 truncate font-serif text-[24px] font-semibold leading-tight tracking-[-0.055em] text-[#0f172a]">
            {modelName}
          </h3>

          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#64748b]">
            {variantName}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <VehicleArt
          data={data}
          vehicle={vehicle}
          model={model}
          name={`${modelName} ${variantName}`}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <SpecPill icon={Fuel} label={fuel} />
        <SpecPill icon={Settings} label={transmission} />
        <SpecPill icon={Car} label={seating ? `${seating} Seater` : ""} />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 rounded-[20px] bg-[#f8fafc] px-3 py-3 ring-1 ring-[#e2e8f0]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94a3b8]">
            Ex-showroom
          </p>
          <p className="mt-1 text-base font-black text-[#0f172a]">
            {displayPrice}
          </p>
        </div>
      </div>

      {modelComparison && options.length ? (
        <label className="relative mt-3 block">
          <span className="sr-only">Select variant</span>
          <select
            value={selectedKey}
            onChange={(event) => onSelect?.(event.target.value)}
            className="h-11 w-full appearance-none rounded-[16px] border border-[#dbe3ef] bg-white px-3 pr-10 text-xs font-black text-[#0f172a] outline-none transition hover:border-[#93c5fd] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]/70"
          >
            {options.map((option, optionIndex) => {
              const optionPrice = variantOptionPrice(option);
              const optionLabel = `${option.variant}${
                moneyNumber(optionPrice) > 0
                  ? ` · ${formatMoney(optionPrice)}`
                  : ""
              }`;

              return (
                <option
                  key={variantOptionKey(option, optionIndex)}
                  value={variantOptionKey(option, optionIndex)}
                >
                  {optionLabel}
                </option>
              );
            })}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b]"
          />
        </label>
      ) : null}
    </article>
  );
}

function CategorySidebar({ categories, selectedCategory, onSelect }) {
  return (
    <aside className="rounded-[24px] border border-[#dbe3ef] bg-white/86 p-3 shadow-[0_20px_70px_-62px_rgba(15,23,42,0.42)] backdrop-blur-2xl">
      <p className="mb-3 px-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#64748b]">
        Categories
      </p>

      <div className="space-y-2">
        {categories.map((item) => {
          const active = item.category === selectedCategory;
          const Icon = CATEGORY_ICONS[item.category] || Layers3;

          return (
            <button
              key={item.category}
              type="button"
              onClick={() => onSelect(item.category)}
              className={cx(
                "flex w-full items-center justify-between gap-3 rounded-[16px] px-3 py-3 text-left text-sm font-black transition ring-1",
                active
                  ? "bg-[#eff6ff] text-[#1d4ed8] ring-[#93c5fd]"
                  : "bg-white text-[#475569] ring-[#e2e8f0] hover:bg-[#f8fbff] hover:text-[#1e40af]",
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    active
                      ? "bg-white text-[#2563eb]"
                      : "bg-[#f8fafc] text-[#64748b]",
                  )}
                >
                  <Icon size={14} />
                </span>
                <span className="truncate">{item.category}</span>
              </span>

              <span
                className={cx(
                  "rounded-full px-2 py-0.5 text-xs font-black",
                  active
                    ? "bg-white text-[#2563eb]"
                    : "bg-[#f8fafc] text-[#94a3b8]",
                )}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function MobileCategorySelector({ categories, selectedCategory, onSelect }) {
  return (
    <div className="space-y-2 lg:hidden">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748b]">
        Categories
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((item) => {
          const active = item.category === selectedCategory;

          return (
            <button
              key={item.category}
              type="button"
              onClick={() => onSelect(item.category)}
              className={cx(
                "inline-flex shrink-0 items-center gap-2 rounded-[14px] px-3 py-2 text-xs font-black ring-1 transition",
                active
                  ? "bg-[#2563eb] text-white ring-[#2563eb]"
                  : "bg-white text-[#475569] ring-[#dbe3ef]",
              )}
            >
              {item.category}
              <span className={active ? "text-white/75" : "text-[#94a3b8]"}>
                {item.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FeatureLabelCell({ row }) {
  return (
    <div className="flex items-start gap-2">
      <p className="whitespace-normal break-words text-sm font-black leading-5 text-[#334155]">
        {row.label}
      </p>

      {row.meta?.tooltipColumns?.some((column) => column.items?.length) ? (
        <InlineInfoTooltip
          title={row.meta?.tooltipTitle}
          columns={row.meta?.tooltipColumns}
        />
      ) : null}
    </div>
  );
}

function ComparisonTable({ rows, vehicles, winnerIndex }) {
  const tableMinWidth = Math.max(860, 250 + vehicles.length * 250);

  return (
    <section className="hidden overflow-hidden rounded-[26px] border border-[#dbe3ef] bg-white/88 shadow-[0_26px_86px_-68px_rgba(15,23,42,0.58)] backdrop-blur-2xl lg:block">
      <div className="max-h-[760px] overflow-auto">
        <table
          className="w-full border-separate border-spacing-0 text-sm"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <thead className="sticky top-0 z-30 bg-[#f8fafc]">
            <tr>
              <th
                className="sticky left-0 z-40 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.14em] text-[#64748b] shadow-[6px_0_12px_-12px_rgba(15,23,42,0.35)]"
                style={{ width: 250 }}
              >
                Feature
              </th>

              {vehicles.map((vehicle, index) => (
                <th
                  key={`${vehicle.model}-${vehicle.variant}-${index}`}
                  className={cx(
                    "border-b border-l border-[#e2e8f0] px-4 py-4 text-center text-[12px] font-black",
                    winnerIndex === index
                      ? "bg-[#eff6ff] text-[#1d4ed8]"
                      : "text-[#1e3a8a]",
                  )}
                  style={{ width: 250 }}
                >
                  <span className="mx-auto block max-w-[220px] whitespace-normal break-words leading-5">
                    {vehicle.model}
                  </span>
                  <span className="mx-auto mt-0.5 block max-w-[220px] whitespace-normal break-words text-[11px] font-semibold leading-4 text-[#64748b]">
                    {vehicle.variant}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="group transition duration-150 hover:bg-[#eff6ff]/45"
              >
                <td className="sticky left-0 z-20 border-b border-[#eef2f7] bg-white px-4 py-3 shadow-[6px_0_12px_-12px_rgba(15,23,42,0.28)] group-hover:bg-[#eff6ff]">
                  <FeatureLabelCell row={row} />
                </td>

                {row.values.map((value, index) => (
                  <td
                    key={`${row.id}-${index}`}
                    className={cx(
                      "border-b border-l border-[#eef2f7] px-4 py-3 text-center",
                      winnerIndex === index ? "bg-[#eff6ff]/35" : "",
                    )}
                  >
                    <ValueCell
                      value={value}
                      row={row}
                      winner={rowHasDifference(row) && winnerIndex === index}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MobileRows({ rows, vehicles, winnerIndex }) {
  return (
    <section className="space-y-3 lg:hidden">
      {rows.map((row) => (
        <article
          key={`${row.id}-mobile`}
          className="rounded-[24px] border border-[#dbe3ef] bg-white/88 p-4 shadow-[0_20px_70px_-62px_rgba(15,23,42,0.42)]"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-black text-[#0f172a]">{row.label}</h3>

            {row.meta?.tooltipColumns?.some(
              (column) => column.items?.length,
            ) ? (
              <InlineInfoTooltip
                title={row.meta?.tooltipTitle}
                columns={row.meta?.tooltipColumns}
              />
            ) : null}
          </div>

          <div className="mt-4 space-y-2">
            {vehicles.map((vehicle, index) => (
              <div
                key={`${row.id}-mobile-${index}`}
                className={cx(
                  "rounded-[18px] border p-3",
                  winnerIndex === index
                    ? "border-[#bfdbfe] bg-[#eff6ff]"
                    : "border-[#e2e8f0] bg-[#f8fafc]",
                )}
              >
                <p className="text-xs font-black text-[#64748b]">
                  {[vehicle.model, vehicle.variant].filter(Boolean).join(" ")}
                </p>

                <div className="mt-1">
                  <ValueCell
                    value={row.values[index]}
                    row={row}
                    winner={rowHasDifference(row) && winnerIndex === index}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

export function VehicleComparisonCanvas({ widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const isModelComparison = widget?.type === "vehicle_model_comparison";

  const models = asArray(data.models || widget?.models);
  const rawVariants = asArray(
    data.selectedDefaultVariants ||
      data.selectedVariantRows ||
      data.variants ||
      widget?.variants ||
      data.variantRows,
  );
  const comparisonRows = asArray(data.comparisonRows || widget?.comparisonRows);

  const [selectedCategory, setSelectedCategory] = useState(SNAPSHOT_CATEGORY);
  const [search, setSearch] = useState("");
  const [hideCommon, setHideCommon] = useState(false);
  const [selectedVariantsByModel, setSelectedVariantsByModel] = useState({});

  const modelSelections = useMemo(() => {
    if (!isModelComparison) return [];

    return models.map((model, index) => {
      const key = modelCardKey(model, index);
      const options = getModelVariantOptions(model);
      const defaultVariant =
        pickLowestPricedVariant(options) ||
        normalizeVariantOption(
          {
            ...model,
            variant:
              valueFrom(model, ["baseVariant", "variant"], "") ||
              `${modelNameOnly(model, index)} Base`,
          },
          model,
          index,
        );

      const selectedKey = selectedVariantsByModel[key];

      const selected =
        options.find(
          (option, optionIndex) =>
            variantOptionKey(option, optionIndex) === selectedKey,
        ) || defaultVariant;

      return {
        key,
        model,
        options,
        selected,
        selectedKey: variantOptionKey(selected),
      };
    });
  }, [isModelComparison, models, selectedVariantsByModel]);

  const comparisonVehicles = useMemo(() => {
    if (isModelComparison) {
      return modelSelections.map((item) => item.selected);
    }

    return rawVariants.map((variant, index) =>
      normalizeVariantOption(
        variant,
        {
          brand: variant?.brand || variant?.make,
          model: variant?.model,
        },
        index,
      ),
    );
  }, [isModelComparison, modelSelections, rawVariants]);

  const modelsForRows = useMemo(() => {
    if (isModelComparison) return modelSelections.map((item) => item.model);

    return comparisonVehicles.map((vehicle) => ({
      brand: vehicle.brand,
      model: vehicle.model,
    }));
  }, [comparisonVehicles, isModelComparison, modelSelections]);

  const allRows = useMemo(
    () =>
      buildComparisonRows({
        vehicles: comparisonVehicles,
        models: modelsForRows,
        comparisonRows,
        data,
      }),
    [comparisonVehicles, modelsForRows, comparisonRows, data],
  );

  const snapshotRows = useMemo(() => buildSnapshotRows(allRows), [allRows]);

  const rowsWithSnapshot = useMemo(
    () => [
      ...snapshotRows,
      ...allRows.filter((row) => row.category !== SNAPSHOT_CATEGORY),
    ],
    [snapshotRows, allRows],
  );

  const categoryStats = useMemo(() => {
    const source = hideCommon
      ? rowsWithSnapshot.filter(rowHasDifference)
      : rowsWithSnapshot;
    const map = new Map();

    source.forEach((row) => {
      map.set(row.category, (map.get(row.category) || 0) + 1);
    });

    return [
      { category: ALL_CATEGORY, count: source.length },
      ...Array.from(map.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => categorySort(a.category, b.category)),
    ];
  }, [rowsWithSnapshot, hideCommon]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rowsWithSnapshot.filter((row) => {
      const searchable =
        `${row.category} ${row.label} ${row.values.join(" ")}`.toLowerCase();

      const matchesSearch = !q || searchable.includes(q);
      const matchesCategory =
        selectedCategory === ALL_CATEGORY || row.category === selectedCategory;
      const matchesCommon = !hideCommon || rowHasDifference(row);

      return matchesSearch && matchesCategory && matchesCommon;
    });
  }, [rowsWithSnapshot, search, selectedCategory, hideCommon]);

  const insights = useMemo(
    () => computeInsights(comparisonVehicles, allRows),
    [comparisonVehicles, allRows],
  );

  const title =
    widget?.title ||
    data?.title ||
    (isModelComparison
      ? `Compare ${models.map((model, index) => modelNameOnly(model, index)).join(", ")}`
      : "Variant comparison");

  const differentRowsCount = rowsWithSnapshot.filter(rowHasDifference).length;

  return (
    <ModernCanvasShell
      title={title}
      subtitle="Compare exact variants across price breakup, key specs and full feature catalogue."
      icon={Layers3}
      footer={footer}
      eyebrow="Compare"
      fullBleed
      className="w-full max-w-none"
      bodyClassName="space-y-5"
    >
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[24px] border border-[#dbe3ef] bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eff6ff_100%)] px-4 py-3 shadow-[0_20px_70px_-60px_rgba(15,23,42,0.45)]"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#dbeafe]/70 blur-3xl" />

        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/86 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#1e40af] ring-1 ring-[#bfdbfe]">
                <Sparkles size={13} />
                Smart comparison
              </p>

              <StatPill
                icon={isModelComparison ? Car : BadgeCheck}
                value={comparisonVehicles.length}
                label={isModelComparison ? "models" : "variants"}
              />

              <StatPill
                icon={Layers3}
                value={rowsWithSnapshot.length}
                label="matched rows"
              />

              <StatPill
                icon={Sparkles}
                value={differentRowsCount}
                label="differences"
              />
            </div>

            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-[#64748b]">
              Lowest-priced variants are selected automatically. Change any
              variant from the dropdown and the price breakup plus feature table
              updates instantly.
            </p>
          </div>

          {insights.winner ? (
            <div className="shrink-0 rounded-[20px] border border-[#bfdbfe] bg-white/82 px-4 py-3 shadow-sm backdrop-blur-xl lg:min-w-[280px]">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2563eb]">
                Suggested pick
              </p>

              <p className="mt-1 text-sm font-black leading-5 text-[#0f172a]">
                {[insights.winner.model, insights.winner.variant]
                  .filter(Boolean)
                  .join(" ")}
              </p>

              <p className="mt-1 text-[11px] font-semibold leading-4 text-[#64748b]">
                Based on visible price, mileage and feature strengths.
              </p>
            </div>
          ) : null}
        </div>
      </motion.section>

      <section className="grid gap-4 xl:grid-cols-3">
        {comparisonVehicles.map((vehicle, index) => {
          const selection = isModelComparison ? modelSelections[index] : null;

          return (
            <VehicleCompareCard
              key={`${vehicle.brand}-${vehicle.model}-${vehicle.variant}-${index}`}
              data={data}
              model={selection?.model || modelsForRows[index]}
              vehicle={vehicle}
              options={selection?.options || []}
              selectedKey={
                selection?.selectedKey || variantOptionKey(vehicle, index)
              }
              onSelect={(nextKey) => {
                if (!selection) return;

                setSelectedVariantsByModel((current) => ({
                  ...current,
                  [selection.key]: nextKey,
                }));
              }}
              index={index}
              winner={insights.winnerIndex === index}
              modelComparison={isModelComparison}
            />
          );
        })}
      </section>

      <section className="rounded-[26px] border border-[#dbe3ef] bg-white/82 p-4 shadow-[0_20px_70px_-62px_rgba(15,23,42,0.42)] backdrop-blur-2xl">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search features, price breakup, sunroof, ADAS, boot space..."
          />

          <button
            type="button"
            onClick={() => setHideCommon((value) => !value)}
            className={cx(
              "flex h-11 items-center justify-between gap-3 rounded-[16px] border px-4 text-left text-sm font-black transition",
              hideCommon
                ? "border-[#2563eb] bg-[#eff6ff] text-[#1e40af]"
                : "border-[#dbe3ef] bg-white text-[#334155] hover:border-[#93c5fd] hover:bg-[#eff6ff]/65",
            )}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal size={16} />
              Hide common features
            </span>

            <span
              className={cx(
                "relative h-5 w-9 rounded-full transition",
                hideCommon ? "bg-[#2563eb]" : "bg-[#cbd5e1]",
              )}
            >
              <span
                className={cx(
                  "absolute top-1 h-3 w-3 rounded-full bg-white transition",
                  hideCommon ? "left-5" : "left-1",
                )}
              />
            </span>
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <CategorySidebar
            categories={categoryStats}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <MobileCategorySelector
            categories={categoryStats}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />

          <ComparisonTable
            rows={filteredRows}
            vehicles={comparisonVehicles}
            winnerIndex={insights.winnerIndex}
          />

          <MobileRows
            rows={filteredRows}
            vehicles={comparisonVehicles}
            winnerIndex={insights.winnerIndex}
          />
        </div>
      </section>

      {!filteredRows.length ? (
        <div className="rounded-[26px] border border-[#dbe3ef] bg-white/88 p-10 text-center shadow-[0_20px_70px_-62px_rgba(15,23,42,0.42)]">
          <CircleDollarSign size={34} className="mx-auto text-[#cbd5e1]" />
          <p className="mt-4 text-base font-black text-[#0f172a]">
            No comparison rows found
          </p>
          <p className="mt-1 text-sm font-semibold text-[#64748b]">
            Clear search or turn off “Hide common features”.
          </p>
        </div>
      ) : null}

      <section className="rounded-[28px] border border-[#dbe3ef] bg-[linear-gradient(135deg,#ffffff,#f8fafc_58%,#eff6ff)] p-5 shadow-[0_24px_80px_-64px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-[radial-gradient(circle_at_34%_25%,#1e3a8a_0,#0f172a_48%,#020617_100%)] text-[#93c5fd] shadow-[inset_0_0_30px_rgba(147,197,253,0.28)]">
            <Sparkles size={28} />
          </div>

          <div>
            <h3 className="font-serif text-2xl font-semibold tracking-[-0.05em] text-[#0f172a]">
              ACI Assist summary
            </h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-[#475569]">
              {insights.winner ? (
                <>
                  Based on the visible price breakup and feature catalogue,{" "}
                  <span className="font-black text-[#0f172a]">
                    {[insights.winner.model, insights.winner.variant]
                      .filter(Boolean)
                      .join(" ")}
                  </span>{" "}
                  looks like the strongest all-rounder.
                </>
              ) : (
                "Use the table to compare price breakup, features, dimensions and ownership details side by side."
              )}
            </p>

            <button
              type="button"
              onClick={() =>
                onAction?.({
                  type: "ask",
                  message: "Which one should I choose from this comparison?",
                })
              }
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-[#0f172a] px-5 text-sm font-black text-white transition hover:bg-[#1e293b]"
            >
              <Trophy size={16} />
              Help me decide
            </button>
          </div>
        </div>
      </section>
    </ModernCanvasShell>
  );
}
