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
  Layers3,
  ListFilter,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { formatCurrency, asArray, humanize } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";
import { valueFrom } from "../canvas-utils";

const cx = (...parts) => parts.filter(Boolean).join(" ");

const ALL_CATEGORY = "All Features";

const CATEGORY_ORDER = [
  ALL_CATEGORY,
  "Price Breakup",
  "Snapshot",
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
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const titleFromKey = (value = "") =>
  humanize(String(value || "").replace(/\|/g, " "));

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

const categorySort = (a, b) => {
  const ai = CATEGORY_ORDER.indexOf(a);
  const bi = CATEGORY_ORDER.indexOf(b);

  if (ai !== -1 || bi !== -1) {
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  }

  return a.localeCompare(b);
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

const getPriceBreakupRows = (vehicles = []) => {
  const rowDefs = [
    {
      key: "exShowroom",
      category: "Price Breakup",
      label: "Ex-showroom price",
      get: (vehicle) =>
        valueFrom(
          vehicle,
          ["exShowroomPrice", "exShowroom", "ex_showroom", "price"],
          "",
        ),
    },
    {
      key: "rto",
      category: "Price Breakup",
      label: "RTO / Road tax",
      get: (vehicle) =>
        valueFrom(vehicle, ["rto", "rtoCharges", "rto_charges"], ""),
    },
    {
      key: "insurance",
      category: "Price Breakup",
      label: "Insurance",
      get: (vehicle) =>
        valueFrom(
          vehicle,
          ["insurance", "insuranceCharges", "insurance_charges"],
          "",
        ),
    },
    {
      key: "tcs",
      category: "Price Breakup",
      label: "TCS",
      get: (vehicle) =>
        valueFrom(vehicle, ["tcs", "tcsCharges", "other_tcsCharges"], ""),
    },
    {
      key: "handling",
      category: "Price Breakup",
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
    },
    {
      key: "optional",
      category: "Price Breakup",
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
    },
    {
      key: "onRoad",
      category: "Price Breakup",
      label: "Total on-road price",
      get: (vehicle) => variantOptionOnRoad(vehicle),
    },
  ];

  return rowDefs
    .map((definition) => ({
      id: `price-${definition.key}`,
      category: definition.category,
      label: definition.label,
      values: vehicles.map(definition.get),
      valueType: "money",
      priority: 0,
    }))
    .filter((row) => row.values.some((value) => moneyNumber(value) > 0));
};

const featureGroupForLabel = (label, fallback = "Features") => {
  const text = normalizeText(label);

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

  if (/exterior|headlamp|tail lamp|wheel|tyre|roof rail|fog/.test(text))
    return "Exterior";

  if (/interior|dashboard|upholstery|cabin/.test(text)) return "Interior";

  return fallback || "Features";
};

const cleanFeatureValue = (value) => {
  if (value === null || value === undefined) return "";

  if (typeof value === "boolean") return value ? "Yes" : "No";

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

const flattenFeatures = (input, fallbackGroup = "Features") => {
  const rows = [];

  const pushRow = (category, label, value) => {
    const cleanLabel = titleFromKey(label);
    if (!cleanLabel || cleanLabel === "Feature") return;

    const cleanValue = cleanFeatureValue(value);
    if (!cleanValue) return;

    rows.push({
      category: humanize(
        category || featureGroupForLabel(cleanLabel, fallbackGroup),
      ),
      label: cleanLabel,
      value: cleanValue,
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

const featureRowsFromVehicles = (vehicles, data = {}) => {
  const maps = vehicles.map((vehicle) => {
    const map = new Map();

    vehicleFeatureSources(vehicle, data).forEach((source) => {
      flattenFeatures(source).forEach((item) => {
        const label = primitiveText(item.label, "");
        if (!label) return;

        const category = humanize(item.category || featureGroupForLabel(label));
        const key = `${category}__${label}`.toLowerCase();

        if (!map.has(key)) {
          map.set(key, {
            category,
            label,
            value: item.value,
          });
        }
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
      category: sample?.category || "Features",
      label: sample?.label || "Feature",
      values: maps.map((map) => map.get(key)?.value || "—"),
      valueType: "feature",
      priority: 10,
    };
  });
};

const getSuppliedComparisonRows = (comparisonRows = [], vehicles = []) =>
  asArray(comparisonRows)
    .map((row, index) => {
      const label = primitiveText(
        row?.label || row?.name || row?.feature || row?.key,
        "",
      );
      if (!label) return null;

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
        category: humanize(
          row.category ||
            row.group ||
            row.section ||
            featureGroupForLabel(label),
        ),
        label,
        values: values.map(cleanFeatureValue),
        valueType: row.valueType || "feature",
        priority: 20,
      };
    })
    .filter(Boolean)
    .filter(
      (row) =>
        !["variants", "variant count"].includes(row.label.toLowerCase().trim()),
    );

const coreRowsFromVehicles = (vehicles, models) =>
  [
    {
      id: "core-fuel",
      category: "Fuel & Performance",
      label: "Fuel type",
      values: vehicles.map((vehicle) => variantOptionFuel(vehicle)),
    },
    {
      id: "core-transmission",
      category: "Engine & Transmission",
      label: "Transmission",
      values: vehicles.map((vehicle) => variantOptionTransmission(vehicle)),
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
    },
    {
      id: "core-power",
      category: "Fuel & Performance",
      label: "Power",
      values: vehicles.map((vehicle) =>
        valueFrom(vehicle, ["power", "maxPower", "max_power", "ps"], ""),
      ),
    },
    {
      id: "core-torque",
      category: "Fuel & Performance",
      label: "Torque",
      values: vehicles.map((vehicle) =>
        valueFrom(vehicle, ["torque", "maxTorque", "max_torque"], ""),
      ),
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
    },
    {
      id: "core-seats",
      category: "Dimensions & Capacity",
      label: "Seating capacity",
      values: vehicles.map((vehicle, index) =>
        variantOptionSeating(vehicle, models[index]),
      ),
    },
    {
      id: "core-warranty",
      category: "Ownership",
      label: "Warranty",
      values: vehicles.map((vehicle) =>
        valueFrom(vehicle, ["warranty", "standardWarranty"], ""),
      ),
    },
  ].filter((row) => row.values.some((value) => !isEmptyDisplayValue(value)));

const mergeRows = (rows = [], vehicleCount = 0) => {
  const map = new Map();

  rows.forEach((row, index) => {
    const key = `${row.category}__${row.label}`.toLowerCase();
    const values = asArray(row.values).slice(0, vehicleCount);

    while (values.length < vehicleCount) values.push("—");

    const normalized = {
      ...row,
      id: row.id || `${key}-${index}`,
      values: values.map((value) => cleanFeatureValue(value) || "—"),
      order: index,
    };

    if (!map.has(key)) {
      map.set(key, normalized);
      return;
    }

    const existing = map.get(key);

    map.set(key, {
      ...existing,
      values: existing.values.map((value, valueIndex) =>
        isEmptyDisplayValue(value) ? normalized.values[valueIndex] : value,
      ),
    });
  });

  return Array.from(map.values()).sort((a, b) => {
    const categoryDelta = categorySort(a.category, b.category);
    if (categoryDelta !== 0) return categoryDelta;

    if ((a.priority || 0) !== (b.priority || 0)) {
      return (a.priority || 0) - (b.priority || 0);
    }

    return a.order - b.order;
  });
};

const buildComparisonRows = ({ vehicles, models, comparisonRows, data }) =>
  mergeRows(
    [
      ...getPriceBreakupRows(vehicles),
      ...coreRowsFromVehicles(vehicles, models),
      ...getSuppliedComparisonRows(comparisonRows, vehicles),
      ...featureRowsFromVehicles(vehicles, data),
    ],
    vehicles.length,
  );

const findBestRow = (rows, needles = []) => {
  const normalizedNeedles = needles.map(normalizeText).filter(Boolean);

  return rows.find((row) => {
    const haystack = normalizeText(`${row.category} ${row.label}`);
    return normalizedNeedles.some((needle) => haystack.includes(needle));
  });
};

const buildSnapshotRows = (allRows) => {
  const definitions = [
    {
      id: "snapshot-price",
      icon: CircleDollarSign,
      label: "Ex-showroom price",
      needles: ["ex showroom price", "ex-showroom price"],
      fallbackCategory: "Price Breakup",
    },
    {
      id: "snapshot-engine",
      icon: Gauge,
      label: "Engine",
      needles: ["engine", "displacement"],
    },
    {
      id: "snapshot-transmission",
      icon: Settings,
      label: "Transmission",
      needles: ["transmission", "gearbox"],
    },
    {
      id: "snapshot-mileage",
      icon: Fuel,
      label: "Mileage",
      needles: ["mileage", "arai mileage", "fuel efficiency"],
    },
    {
      id: "snapshot-safety",
      icon: ShieldCheck,
      label: "Safety",
      needles: ["safety rating", "global ncap", "airbags", "no of airbags"],
    },
    {
      id: "snapshot-boot",
      icon: Car,
      label: "Boot space",
      needles: ["boot space", "boot"],
    },
    {
      id: "snapshot-sunroof",
      icon: Sparkles,
      label: "Sunroof",
      needles: ["sunroof", "voice assisted sunroof", "panoramic sunroof"],
    },
    {
      id: "snapshot-adas",
      icon: BadgeCheck,
      label: "ADAS",
      needles: [
        "adas",
        "advanced driver assistance",
        "lane keep",
        "blind spot",
      ],
    },
    {
      id: "snapshot-infotainment",
      icon: ListFilter,
      label: "Infotainment",
      needles: ["touchscreen", "infotainment", "audio", "speakers"],
    },
    {
      id: "snapshot-warranty",
      icon: ShieldCheck,
      label: "Warranty",
      needles: ["warranty", "standard warranty"],
    },
  ];

  const usedRowIds = new Set();

  return definitions
    .map((definition) => {
      const match = findBestRow(allRows, definition.needles);
      if (!match || usedRowIds.has(match.id)) return null;

      usedRowIds.add(match.id);

      return {
        ...match,
        id: definition.id,
        label: definition.label,
        icon: definition.icon,
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

const formatList = (items = []) => {
  const clean = items.map((item) => primitiveText(item, "")).filter(Boolean);

  if (clean.length <= 2) return clean.join(" & ");
  return `${clean.slice(0, -1).join(", ")} & ${clean[clean.length - 1]}`;
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
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
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
    <div className="relative mx-auto h-32 w-full overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_50%_38%,#ffffff_0%,#f8fafc_42%,#eaf2ff_100%)] sm:h-36">
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
        "relative overflow-hidden rounded-[28px] border bg-white/88 p-4 text-center shadow-[0_24px_76px_-64px_rgba(15,23,42,0.48)] backdrop-blur-2xl transition duration-200 hover:-translate-y-0.5",
        winner
          ? "border-[#f7c66f] ring-2 ring-[#fde68a]"
          : "border-[#dbe3ef] hover:border-[#93c5fd]",
      )}
    >
      {winner ? (
        <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#fffbeb] px-3 py-1.5 text-[11px] font-black text-[#b45309] ring-1 ring-[#fde68a]">
          <Trophy size={13} />
          Winner
        </span>
      ) : null}

      <button
        type="button"
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/88 text-[#64748b] ring-1 ring-[#dbe3ef] transition hover:text-rose-500"
        aria-label="Shortlist"
      >
        <Heart size={17} />
      </button>

      <div className="mx-auto max-w-[280px]">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563eb]">
          {brand || `Option ${index + 1}`}
        </p>

        <h3 className="mt-1 font-serif text-[26px] font-semibold leading-tight tracking-[-0.055em] text-[#0f172a]">
          {modelName}
        </h3>

        <p className="mt-1 min-h-[20px] text-xs font-semibold leading-5 text-[#64748b]">
          {variantName}
        </p>
      </div>

      <div className="mt-3">
        <VehicleArt
          data={data}
          vehicle={vehicle}
          model={model}
          name={`${modelName} ${variantName}`}
        />
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        <SpecPill icon={Fuel} label={fuel} />
        <SpecPill icon={Settings} label={transmission} />
        <SpecPill icon={Car} label={seating ? `${seating} Seater` : ""} />
      </div>

      <div className="mt-4 rounded-[20px] bg-[#f8fafc] px-3 py-3 ring-1 ring-[#e2e8f0]">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94a3b8]">
          Ex-showroom
        </p>
        <p className="mt-1 text-base font-black text-[#0f172a]">
          {displayPrice}
        </p>
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

function SnapshotTable({ rows, vehicles, winnerIndex }) {
  if (!rows.length) return null;

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#dbe3ef] bg-white/90 shadow-[0_24px_80px_-68px_rgba(15,23,42,0.5)] backdrop-blur-2xl">
      <div className="border-b border-[#e2e8f0] bg-[linear-gradient(135deg,#ffffff,#f8fafc)] px-4 py-4">
        <div className="flex items-center gap-2">
          <Sparkles size={17} className="text-[#2563eb]" />
          <h3 className="text-sm font-black text-[#0f172a]">
            At-a-glance comparison
          </h3>
        </div>
        <p className="mt-1 text-xs font-semibold text-[#64748b]">
          Key buying details extracted from price and feature catalogue.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table
          className="w-full border-separate border-spacing-0 text-sm"
          style={{
            minWidth: `${Math.max(760, 250 + vehicles.length * 220)}px`,
          }}
        >
          <thead className="bg-[#f8fafc]">
            <tr>
              <th className="w-[250px] border-b border-[#e2e8f0] px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-[#64748b]">
                Detail
              </th>
              {vehicles.map((vehicle, index) => (
                <th
                  key={`${vehicle.model}-${vehicle.variant}-snapshot-head-${index}`}
                  className={cx(
                    "border-b border-l border-[#e2e8f0] px-4 py-3 text-center text-[12px] font-black",
                    winnerIndex === index
                      ? "bg-[#fffbeb] text-[#92400e]"
                      : "text-[#1e3a8a]",
                  )}
                >
                  <span className="mx-auto block max-w-[190px] whitespace-normal break-words leading-5">
                    {[vehicle.model, vehicle.variant].filter(Boolean).join(" ")}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const Icon = row.icon || BadgeCheck;

              return (
                <tr key={row.id} className="transition hover:bg-[#eff6ff]/45">
                  <td className="border-b border-[#eef2f7] px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe]">
                        <Icon size={15} />
                      </span>
                      <span className="font-black text-[#334155]">
                        {row.label}
                      </span>
                    </span>
                  </td>

                  {row.values.map((value, index) => (
                    <td
                      key={`${row.id}-snapshot-${index}`}
                      className={cx(
                        "border-b border-l border-[#eef2f7] px-4 py-3 text-center",
                        winnerIndex === index ? "bg-[#fffbeb]/45" : "",
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
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CategoryButton({ category, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-center justify-between gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-black ring-1 transition",
        active
          ? "bg-[#eff6ff] text-[#1e40af] ring-[#93c5fd]"
          : "bg-white/86 text-[#475569] ring-[#dbe3ef] hover:bg-[#eff6ff]/70 hover:text-[#1e40af]",
      )}
    >
      <span className="truncate">{category}</span>
      <span
        className={cx(
          "rounded-full px-2 py-0.5 text-[11px]",
          active ? "bg-white text-[#2563eb]" : "bg-[#f8fafc] text-[#94a3b8]",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function InsightRail({ vehicles, insights, onAction }) {
  const winner = insights.winner;
  const winnerName = winner
    ? [winner.model, winner.variant].filter(Boolean).join(" ")
    : "—";

  return (
    <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
      <section className="rounded-[28px] border border-[#dbe3ef] bg-white/88 p-4 shadow-[0_24px_80px_-64px_rgba(15,23,42,0.5)] backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <Sparkles size={17} className="text-[#d97706]" />
          <h3 className="text-sm font-black text-[#0f172a]">Quick verdict</h3>
        </div>

        <div className="mt-4 rounded-[22px] bg-[#fffbeb] p-4 ring-1 ring-[#fde68a]">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b45309]">
            Overall winner
          </p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black leading-6 text-[#0f172a]">
                {winnerName}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#64748b]">
                Best balance based on visible price, mileage and feature
                strengths.
              </p>
            </div>
            <Trophy size={34} className="shrink-0 text-[#d97706]" />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#dbe3ef] bg-white/88 p-4 shadow-[0_24px_80px_-64px_rgba(15,23,42,0.5)] backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <BadgeCheck size={17} className="text-[#2563eb]" />
          <h3 className="text-sm font-black text-[#0f172a]">
            Best by category
          </h3>
        </div>

        <div className="mt-4 space-y-2">
          {insights.winners.slice(0, 5).map((item) => {
            const vehicle = vehicles[item.index];

            return (
              <div
                key={`${item.label}-${item.index}`}
                className="flex items-center justify-between gap-3 rounded-[18px] border border-[#e2e8f0] bg-[#f8fafc] p-3"
              >
                <div>
                  <p className="text-xs font-black text-[#0f172a]">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#64748b]">
                    {item.reason}
                  </p>
                </div>
                <p className="max-w-[130px] text-right text-xs font-black leading-5 text-[#1e40af]">
                  {[vehicle?.model, vehicle?.variant].filter(Boolean).join(" ")}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#dbe3ef] bg-white/88 p-4 shadow-[0_24px_80px_-64px_rgba(15,23,42,0.5)] backdrop-blur-2xl">
        <h3 className="text-sm font-black text-[#0f172a]">
          Take the next step
        </h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#64748b]">
          Ask ACI Assist to explain the differences in simple buying language.
        </p>

        <button
          type="button"
          onClick={() =>
            onAction?.({
              type: "ask",
              message: "Which one should I choose from this comparison?",
            })
          }
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[16px] bg-[#0f172a] px-4 text-sm font-black text-white transition hover:bg-[#1e293b]"
        >
          <Trophy size={16} />
          Help me decide
        </button>
      </section>
    </aside>
  );
}

export function VehicleComparisonCanvas({ widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const isModelComparison = widget?.type === "vehicle_model_comparison";

  const models = asArray(data.models || widget?.models);
  const rawVariants = asArray(data.variants || widget?.variants);
  const comparisonRows = asArray(
    data.comparisonRows || widget?.comparisonRows || data.rows || widget?.rows,
  );

  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
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

  const categoryStats = useMemo(() => {
    const source = hideCommon ? allRows.filter(rowHasDifference) : allRows;
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
  }, [allRows, hideCommon]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allRows.filter((row) => {
      const searchable =
        `${row.category} ${row.label} ${row.values.join(" ")}`.toLowerCase();

      const matchesSearch = !q || searchable.includes(q);
      const matchesCategory =
        selectedCategory === ALL_CATEGORY || row.category === selectedCategory;
      const matchesCommon = !hideCommon || rowHasDifference(row);

      return matchesSearch && matchesCategory && matchesCommon;
    });
  }, [allRows, search, selectedCategory, hideCommon]);

  const insights = useMemo(
    () => computeInsights(comparisonVehicles, allRows),
    [comparisonVehicles, allRows],
  );

  const title =
    widget?.title ||
    data?.title ||
    (isModelComparison
      ? `Compare ${formatList(models.map((model, index) => modelNameOnly(model, index)))}`
      : "Variant comparison");

  const differentRowsCount = allRows.filter(rowHasDifference).length;
  const tableMinWidth = Math.max(820, 280 + comparisonVehicles.length * 240);

  return (
    <ModernCanvasShell
      title={title}
      subtitle={
        isModelComparison
          ? "Lowest-priced variants are selected automatically. Change any variant from the dropdown."
          : "Side-by-side comparison with category filters and difference view."
      }
      icon={Layers3}
      footer={footer}
      eyebrow="Compare"
      fullBleed
      className="w-full max-w-none"
      bodyClassName="space-y-5"
    >
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[30px] border border-[#dbe3ef] bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_54%,#eff6ff_100%)] p-5 shadow-[0_30px_90px_-72px_rgba(15,23,42,0.55)]"
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#dbeafe]/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[30%] h-64 w-64 rounded-full bg-[#e0e7ff]/50 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/86 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#1e40af] ring-1 ring-[#bfdbfe]">
              <Sparkles size={13} />
              Smart comparison
            </p>

            <h2 className="font-serif text-[34px] font-semibold leading-[1.03] tracking-[-0.065em] text-[#0f172a] sm:text-[44px]">
              {title}
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#64748b] sm:text-base">
              Compare selected variants across price breakup, engine, mileage,
              safety, comfort, ADAS, infotainment and full feature categories.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatPill
                icon={isModelComparison ? Car : BadgeCheck}
                value={comparisonVehicles.length}
                label={isModelComparison ? "models" : "variants"}
              />

              <StatPill
                icon={ListFilter}
                value={allRows.length}
                label="comparison rows"
              />

              <StatPill
                icon={Sparkles}
                value={differentRowsCount}
                label="differences"
              />
            </div>
          </div>

          <div className="hidden rounded-[24px] border border-[#dbe3ef] bg-white/76 p-4 shadow-sm backdrop-blur-xl lg:block lg:min-w-[280px]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">
              Current winner
            </p>
            <p className="mt-1 text-lg font-black text-[#0f172a]">
              {insights.winner
                ? [insights.winner.model, insights.winner.variant]
                    .filter(Boolean)
                    .join(" ")
                : "—"}
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-[#64748b]">
              Based on visible price, mileage and feature strengths.
            </p>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {comparisonVehicles.map((vehicle, index) => {
              const selection = isModelComparison
                ? modelSelections[index]
                : null;

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

          <SnapshotTable
            rows={snapshotRows}
            vehicles={comparisonVehicles}
            winnerIndex={insights.winnerIndex}
          />

          <section className="rounded-[26px] border border-[#dbe3ef] bg-white/82 p-4 shadow-[0_20px_70px_-62px_rgba(15,23,42,0.42)] backdrop-blur-2xl">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-center">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search price breakup, safety, sunroof, ADAS, boot space..."
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

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
              {categoryStats.map((item) => {
                const active = item.category === selectedCategory;

                return (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => setSelectedCategory(item.category)}
                    className={cx(
                      "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-black ring-1 transition",
                      active
                        ? "bg-[#2563eb] text-white ring-[#2563eb]"
                        : "bg-white text-[#475569] ring-[#dbe3ef] hover:bg-[#eff6ff] hover:text-[#1e40af]",
                    )}
                  >
                    {item.category}
                    <span
                      className={active ? "text-white/75" : "text-[#94a3b8]"}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
            <aside className="hidden rounded-[26px] border border-[#dbe3ef] bg-white/82 p-3 shadow-[0_20px_70px_-62px_rgba(15,23,42,0.42)] backdrop-blur-2xl xl:block">
              <p className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#64748b]">
                Categories
              </p>

              <div className="space-y-2">
                {categoryStats.map((item) => (
                  <CategoryButton
                    key={item.category}
                    category={item.category}
                    count={item.count}
                    active={item.category === selectedCategory}
                    onClick={() => setSelectedCategory(item.category)}
                  />
                ))}
              </div>
            </aside>

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
                        style={{ width: 280 }}
                      >
                        Feature
                      </th>

                      {comparisonVehicles.map((vehicle, index) => (
                        <th
                          key={`${vehicle.model}-${vehicle.variant}-${index}`}
                          className={cx(
                            "border-b border-l border-[#e2e8f0] px-4 py-4 text-center text-[12px] font-black",
                            insights.winnerIndex === index
                              ? "bg-[#fffbeb] text-[#92400e]"
                              : "text-[#1e3a8a]",
                          )}
                          style={{ width: 240 }}
                        >
                          <span className="mx-auto block max-w-[210px] whitespace-normal break-words leading-5">
                            {[vehicle.model, vehicle.variant]
                              .filter(Boolean)
                              .join(" ")}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className="group transition duration-150 hover:bg-[#eff6ff]/45"
                      >
                        <td className="sticky left-0 z-20 border-b border-[#eef2f7] bg-white px-4 py-3 shadow-[6px_0_12px_-12px_rgba(15,23,42,0.28)] group-hover:bg-[#eff6ff]">
                          <p
                            className={cx(
                              "text-[10px] font-black uppercase tracking-[0.14em]",
                              row.category === "Price Breakup"
                                ? "text-[#2563eb]"
                                : "text-[#94a3b8]",
                            )}
                          >
                            {row.category}
                          </p>

                          <p className="mt-1 whitespace-normal break-words text-sm font-black leading-5 text-[#334155]">
                            {row.label}
                          </p>
                        </td>

                        {row.values.map((value, index) => (
                          <td
                            key={`${row.id}-${index}`}
                            className={cx(
                              "border-b border-l border-[#eef2f7] px-4 py-3 text-center",
                              insights.winnerIndex === index
                                ? "bg-[#fffbeb]/45"
                                : "",
                            )}
                          >
                            <ValueCell
                              value={value}
                              row={row}
                              winner={
                                rowHasDifference(row) &&
                                insights.winnerIndex === index
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3 lg:hidden">
              {filteredRows.map((row) => (
                <article
                  key={`${row.id}-mobile`}
                  className="rounded-[24px] border border-[#dbe3ef] bg-white/88 p-4 shadow-[0_20px_70px_-62px_rgba(15,23,42,0.42)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563eb]">
                    {row.category}
                  </p>

                  <h3 className="mt-1 text-base font-black text-[#0f172a]">
                    {row.label}
                  </h3>

                  <div className="mt-4 space-y-2">
                    {comparisonVehicles.map((vehicle, index) => (
                      <div
                        key={`${row.id}-mobile-${index}`}
                        className={cx(
                          "rounded-[18px] border p-3",
                          insights.winnerIndex === index
                            ? "border-[#fde68a] bg-[#fffbeb]"
                            : "border-[#e2e8f0] bg-[#f8fafc]",
                        )}
                      >
                        <p className="text-xs font-black text-[#64748b]">
                          {[vehicle.model, vehicle.variant]
                            .filter(Boolean)
                            .join(" ")}
                        </p>

                        <div className="mt-1">
                          <ValueCell
                            value={row.values[index]}
                            row={row}
                            winner={
                              rowHasDifference(row) &&
                              insights.winnerIndex === index
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>

            {!filteredRows.length ? (
              <div className="rounded-[26px] border border-[#dbe3ef] bg-white/88 p-10 text-center shadow-[0_20px_70px_-62px_rgba(15,23,42,0.42)]">
                <CircleDollarSign
                  size={34}
                  className="mx-auto text-[#cbd5e1]"
                />

                <p className="mt-4 text-base font-black text-[#0f172a]">
                  No comparison rows found
                </p>

                <p className="mt-1 text-sm font-semibold text-[#64748b]">
                  Try clearing search or showing common features again.
                </p>
              </div>
            ) : null}
          </div>

          <section className="rounded-[28px] border border-[#dbe3ef] bg-[linear-gradient(135deg,#ffffff,#f8fafc_58%,#fffbeb)] p-5 shadow-[0_24px_80px_-64px_rgba(15,23,42,0.45)]">
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
                      looks like the strongest all-rounder. Use the variant
                      dropdowns above and the comparison will update instantly.
                    </>
                  ) : (
                    "Use the table to compare price breakup, features, dimensions and ownership details side by side."
                  )}
                </p>
              </div>
            </div>
          </section>
        </div>

        <InsightRail
          vehicles={comparisonVehicles}
          insights={insights}
          onAction={onAction}
        />
      </div>
    </ModernCanvasShell>
  );
}
