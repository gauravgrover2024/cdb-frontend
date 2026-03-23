const hasOwn = (obj, key) =>
  !!obj && Object.prototype.hasOwnProperty.call(obj, key);

const normalizeText = (value) => String(value || "").trim().toLowerCase();

export const toPriceNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const clampPositive = (value) => {
  const num = toPriceNumber(value);
  return num > 0 ? num : 0;
};

const humanizeKey = (key) =>
  String(key || "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

export const normalizePricingLineItems = (items = []) => {
  const rows = Array.isArray(items) ? items : [];
  const out = [];
  const seen = new Set();

  rows.forEach((row) => {
    const label = String(row?.label || row?.name || "").trim();
    const amount = clampPositive(row?.amount ?? row?.value);
    if (!label || !amount) return;

    const key = normalizeText(label);
    if (seen.has(key)) return;
    seen.add(key);

    out.push({ label, amount });
  });

  return out;
};

export const PRICING_ADDITION_FIELDS = [
  {
    key: "exShowroom",
    label: "Ex-showroom",
    aliases: ["ex_showroom", "exShowroomPrice", "ex_showroom_price_cardekho"],
  },
  {
    key: "rto",
    label: "RTO / Road tax",
    aliases: ["roadTax", "rto_amount_cardekho"],
  },
  {
    key: "insurance",
    label: "Insurance",
    aliases: ["insuranceCost", "insurance_amount_cardekho"],
  },
  {
    key: "tcs",
    label: "TCS / Other",
    aliases: ["other_tcsCharges", "otherCharges", "other_totalOtherCharges"],
  },
  { key: "epc", label: "EPC", aliases: [] },
  {
    key: "accessories",
    label: "Accessories",
    aliases: [
      "accessoriesAmount",
      "optional_accessoriesCharges",
      "optional_totalAccessories",
      "optional_totalAccessoriesInRs",
    ],
  },
  { key: "fastag", label: "Fastag", aliases: ["fastTag"] },
  {
    key: "extendedWarranty",
    label: "Extended warranty",
    aliases: [
      "extended_warranty",
      "ew",
      "optional_extendedWarrantyCharges",
      "extendedWarrantyAmount",
    ],
  },
];

export const PRICING_DISCOUNT_FIELDS = [
  {
    key: "dealerDiscount",
    label: "Dealer discount",
    aliases: ["dealer_discount"],
  },
  {
    key: "schemeDiscount",
    label: "Scheme discount",
    aliases: ["scheme_discount"],
  },
  {
    key: "insuranceCashback",
    label: "Insurance cashback",
    aliases: ["insurance_cashback"],
  },
  {
    key: "exchange",
    label: "Exchange bonus",
    aliases: ["exchangeBonus", "exchange_bonus"],
  },
  {
    key: "exchangeVehiclePrice",
    label: "Exchange vehicle price",
    aliases: ["exchange_vehicle_price"],
  },
  { key: "loyalty", label: "Loyalty", aliases: [] },
  { key: "corporate", label: "Corporate", aliases: [] },
];

const KNOWN_TOP_LEVEL_KEYS = new Set([
  "_id",
  "id",
  "vehicleId",
  "make",
  "brand",
  "model",
  "variant",
  "name",
  "city",
  "fuel",
  "fuel_type",
  "status",
  "is_discontinued",
  "isDiscontinued",
  "IsDiscontinued",
  "discontinued_date",
  "discontinuedDate",
  "createdAt",
  "updatedAt",
  "LastSeenDate",
  "LastPriceChangeDate",
  "scrape_timestamp",
  "raw_price_json",
  "features",
  "variant_short",
  "rawVariant",
  "rawModel",
  "onRoadPrice",
  "on_road_price",
  "on_road_price_cardekho",
  "total_on_road_with_accessories",
  "netOnRoad",
  "onRoad",
  "orp_without_accessories",
  "additionsOthers",
  "discountsOthers",
  "pricingSnapshot",
]);

const SKIP_DYNAMIC_KEYS = new Set([
  "optional_total",
  "optional_totalAccessories",
  "optional_totalAccessoriesInRs",
  "other_totalOtherCharges",
  "other_totalOtherChargesInRsFormat",
]);

const isPricingLikeKey = (key) => {
  const token = normalizeText(key);
  return [
    "charge",
    "charges",
    "tax",
    "tcs",
    "rto",
    "insurance",
    "warranty",
    "accessories",
    "accessory",
    "amount",
    "total",
    "price",
    "fee",
    "fees",
    "card",
    "mcd",
    "optional",
    "other",
    "road",
  ].some((word) => token.includes(word));
};

const isDiscountLikeKey = (key) => {
  const token = normalizeText(key);
  return [
    "discount",
    "cashback",
    "rebate",
    "subsidy",
    "offer",
    "exchange",
    "loyalty",
    "corporate",
    "bonus",
    "concession",
  ].some((word) => token.includes(word));
};

const getCanonicalNumber = (vehicle, overrides, fieldDef) => {
  const candidates = [fieldDef.key, ...(fieldDef.aliases || [])];
  for (const key of candidates) {
    if (hasOwn(overrides, key)) return clampPositive(overrides[key]);
  }
  for (const key of candidates) {
    if (hasOwn(vehicle, key)) return clampPositive(vehicle[key]);
  }
  return 0;
};

const collectStructuredListItems = (record, listKey, prefixLabel) => {
  const raw = record?.[listKey];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (item && typeof item === "object") {
        const label = String(
          item.label || item.name || item.title || prefixLabel || "",
        ).trim();
        const amount = clampPositive(item.amount ?? item.value);
        return label && amount ? { label, amount } : null;
      }
      const amount = clampPositive(item);
      if (!amount) return null;
      return { label: prefixLabel, amount };
    })
    .filter(Boolean);
};

const extractDynamicLineItems = (vehicle, blockedKeys) => {
  const additions = [];
  const discounts = [];

  const source = vehicle && typeof vehicle === "object" ? vehicle : {};
  const usedLabels = new Set();

  const pushUnique = (target, row) => {
    const labelKey = normalizeText(row.label);
    if (!labelKey || usedLabels.has(labelKey)) return;
    usedLabels.add(labelKey);
    target.push(row);
  };

  Object.entries(source).forEach(([key, value]) => {
    if (!key || KNOWN_TOP_LEVEL_KEYS.has(key) || blockedKeys.has(key)) return;
    if (key.endsWith("_list")) return;
    if (!isPricingLikeKey(key)) return;

    const amount = clampPositive(value);
    if (!amount) return;

    const label = humanizeKey(
      key.replace(/^optional_/, "").replace(/^other_/, ""),
    );
    if (!label) return;

    const row = { label, amount };
    if (isDiscountLikeKey(key)) pushUnique(discounts, row);
    else pushUnique(additions, row);
  });

  collectStructuredListItems(source, "optional_list", "Optional charge").forEach(
    (row) => pushUnique(additions, row),
  );
  collectStructuredListItems(source, "other_list", "Other charge").forEach((row) =>
    pushUnique(additions, row),
  );

  return { additions, discounts };
};

const readOnRoadFallback = (vehicle, overrides) => {
  const keys = [
    "netOnRoad",
    "onRoadPrice",
    "on_road_price",
    "on_road_price_cardekho",
    "total_on_road_with_accessories",
    "onRoad",
    "price",
  ];
  for (const key of keys) {
    if (hasOwn(overrides, key)) {
      const val = clampPositive(overrides[key]);
      if (val > 0) return val;
    }
  }
  for (const key of keys) {
    if (hasOwn(vehicle, key)) {
      const val = clampPositive(vehicle[key]);
      if (val > 0) return val;
    }
  }
  return 0;
};

export const buildVehiclePricingSnapshot = (vehicle = {}, overrides = {}) => {
  const baseVehicle = vehicle && typeof vehicle === "object" ? vehicle : {};
  const patch = overrides && typeof overrides === "object" ? overrides : {};

  const additions = {};
  PRICING_ADDITION_FIELDS.forEach((field) => {
    additions[field.key] = getCanonicalNumber(baseVehicle, patch, field);
  });

  const discounts = {};
  PRICING_DISCOUNT_FIELDS.forEach((field) => {
    discounts[field.key] = getCanonicalNumber(baseVehicle, patch, field);
  });

  const blockedKeys = new Set();
  [...PRICING_ADDITION_FIELDS, ...PRICING_DISCOUNT_FIELDS].forEach((field) => {
    blockedKeys.add(field.key);
    (field.aliases || []).forEach((alias) => blockedKeys.add(alias));
  });
  SKIP_DYNAMIC_KEYS.forEach((key) => blockedKeys.add(key));

  const dynamicFromVehicle = extractDynamicLineItems(baseVehicle, blockedKeys);

  const hasOverrideAdditions = hasOwn(patch, "additionsOthers");
  const hasOverrideDiscounts = hasOwn(patch, "discountsOthers");

  const additionsOthers = hasOverrideAdditions
    ? normalizePricingLineItems(patch.additionsOthers)
    : normalizePricingLineItems([
        ...(Array.isArray(baseVehicle.additionsOthers)
          ? baseVehicle.additionsOthers
          : []),
        ...dynamicFromVehicle.additions,
      ]);

  const discountsOthers = hasOverrideDiscounts
    ? normalizePricingLineItems(patch.discountsOthers)
    : normalizePricingLineItems([
        ...(Array.isArray(baseVehicle.discountsOthers)
          ? baseVehicle.discountsOthers
          : []),
        ...dynamicFromVehicle.discounts,
      ]);

  const additionsTotal =
    PRICING_ADDITION_FIELDS.reduce(
      (sum, field) => sum + (Number(additions[field.key]) || 0),
      0,
    ) +
    additionsOthers.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const discountsTotal =
    PRICING_DISCOUNT_FIELDS.reduce(
      (sum, field) => sum + (Number(discounts[field.key]) || 0),
      0,
    ) +
    discountsOthers.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const onRoadFallback = readOnRoadFallback(baseVehicle, patch);
  const hasFormulaInputs = additionsTotal > 0 || discountsTotal > 0;
  const netOnRoad = hasFormulaInputs
    ? additionsTotal - discountsTotal
    : onRoadFallback;
  const onRoadBeforeDiscount = hasFormulaInputs ? additionsTotal : onRoadFallback;

  const additionLines = [
    ...PRICING_ADDITION_FIELDS.map((field) => ({
      key: field.key,
      label: field.label,
      amount: Number(additions[field.key]) || 0,
    })).filter((row) => row.amount > 0),
    ...additionsOthers.map((row, index) => ({
      key: `addition-other-${index}`,
      label: row.label,
      amount: Number(row.amount) || 0,
    })),
  ];

  const discountLines = [
    ...PRICING_DISCOUNT_FIELDS.map((field) => ({
      key: field.key,
      label: field.label,
      amount: Number(discounts[field.key]) || 0,
    })).filter((row) => row.amount > 0),
    ...discountsOthers.map((row, index) => ({
      key: `discount-other-${index}`,
      label: row.label,
      amount: Number(row.amount) || 0,
    })),
  ];

  return {
    ...additions,
    ...discounts,
    additionsOthers,
    discountsOthers,
    onRoadBeforeDiscount,
    totalDiscount: discountsTotal,
    netOnRoad,
    additionLines,
    discountLines,
    onRoadFallback,
  };
};
