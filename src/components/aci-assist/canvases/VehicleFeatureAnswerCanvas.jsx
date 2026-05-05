import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  Car,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileQuestion,
  ListChecks,
  Sparkles,
  XCircle,
} from "lucide-react";
import { asArray, humanize } from "../utils";
import {
  rowsFrom,
  valueFrom,
  compactText,
  getPriceParts,
  formatAmount,
} from "../canvas-utils";

const cx = (...parts) => parts.filter(Boolean).join(" ");

const IMAGE_KEYS = [
  "heroImage",
  "heroImageUrl",
  "vehicleImage",
  "vehicleImageUrl",
  "imageUrl",
  "image_url",
  "image",
  "thumbnail",
  "thumbnailUrl",
  "carImage",
  "car_image",
  "colorImage",
  "color_image",
  "swatchImage",
  "photo",
  "url",
  "src",
];

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

const widgetTypeOf = (item = {}) =>
  String(item.type || item.widgetType || item.name || "").toLowerCase();

const answerConfigFor = (answer) => {
  const normalized = String(answer || "").toLowerCase();

  if (/^yes\b|available|included|true/.test(normalized)) {
    return {
      tone: "yes",
      label: "Yes",
      shortLabel: "Available",
      icon: CheckCircle2,
      eyebrow: "Verified answer",
      accent: "text-emerald-700",
      dot: "bg-emerald-500",
      glow: "bg-emerald-400/16",
      iconBox:
        "bg-[linear-gradient(135deg,#10b981,#14b8a6)] text-white shadow-[0_18px_44px_-24px_rgba(16,185,129,0.75)]",
      pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      panel: "bg-emerald-50/64 ring-emerald-100",
      panelBorder: "border-emerald-200/70",
    };
  }

  if (/^no\b|not available|missing|false/.test(normalized)) {
    return {
      tone: "no",
      label: "No",
      shortLabel: "Not available",
      icon: XCircle,
      eyebrow: "Feature not found",
      accent: "text-red-700",
      dot: "bg-red-500",
      glow: "bg-red-400/16",
      iconBox:
        "bg-[linear-gradient(135deg,#ef4444,#e11d48)] text-white shadow-[0_18px_44px_-24px_rgba(239,68,68,0.72)]",
      pill: "bg-red-50 text-red-700 ring-red-200",
      panel: "bg-red-50/64 ring-red-100",
      panelBorder: "border-red-200/70",
    };
  }

  if (/mixed|partial|some|variant|depends/.test(normalized)) {
    return {
      tone: "mixed",
      label: "Depends",
      shortLabel: "Variant dependent",
      icon: CircleAlert,
      eyebrow: "Variant dependent",
      accent: "text-amber-700",
      dot: "bg-amber-500",
      glow: "bg-amber-400/16",
      iconBox:
        "bg-[linear-gradient(135deg,#f59e0b,#f97316)] text-white shadow-[0_18px_44px_-24px_rgba(245,158,11,0.72)]",
      pill: "bg-amber-50 text-amber-700 ring-amber-200",
      panel: "bg-amber-50/64 ring-amber-100",
      panelBorder: "border-amber-200/70",
    };
  }

  return {
    tone: "unknown",
    label: answer || "Not found",
    shortLabel: "Needs confirmation",
    icon: FileQuestion,
    eyebrow: "Needs confirmation",
    accent: "text-slate-700",
    dot: "bg-slate-500",
    glow: "bg-slate-400/14",
    iconBox:
      "bg-[linear-gradient(135deg,#64748b,#0f172a)] text-white shadow-[0_18px_44px_-24px_rgba(15,23,42,0.62)]",
    pill: "bg-slate-50 text-slate-700 ring-slate-200",
    panel: "bg-slate-50/72 ring-slate-100",
    panelBorder: "border-slate-200/70",
  };
};

const rowAnswer = (row) =>
  compactText(valueFrom(row, ["answer", "found", "available", "status"], "—"));

const emptyLike = new Set(["", "-", "—", "na", "n/a", "null", "undefined"]);

const cleanTextValue = (value) => {
  const text = compactText(value, "").trim();
  return emptyLike.has(text.toLowerCase()) ? "" : text;
};

const moneyNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (value && typeof value === "object") {
    return moneyNumber(
      value.amount ||
        value.value ||
        value.price ||
        value.exShowroomPrice ||
        value.onRoadPrice,
    );
  }

  const raw = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!raw) return 0;

  const parsed = Number(raw.replace(/[^\d.]/g, ""));

  if (!Number.isFinite(parsed)) return 0;

  if (raw.includes("crore") || raw.includes("cr")) {
    return parsed * 10000000;
  }

  if (raw.includes("lakh") || raw.includes("lac")) {
    return parsed * 100000;
  }

  return parsed;
};

const firstMoney = (...values) => {
  for (const value of values) {
    const amount = moneyNumber(value);
    if (amount > 0) return amount;
  }

  return 0;
};

const moneyLabel = (value) => {
  const amount = moneyNumber(value);
  return amount > 0 ? formatAmount(amount) : "—";
};

const normalizeChargeLabel = (label) =>
  compactText(label, "").toLowerCase().replace(/\s+/g, " ").trim();

const uniqueChargeItems = (items = []) => {
  const seen = new Set();

  return items.filter((item) => {
    const amount = moneyNumber(item.amount);
    const label = compactText(item.label, "");

    if (!label || amount <= 0) return false;

    const key = `${normalizeChargeLabel(label)}:${amount}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const collectRawChargeItems = (source = {}) => {
  return [
    ...asArray(source.optionalItems),
    ...asArray(source.otherItems),
    ...asArray(source.optionalOtherItems),
    ...asArray(source.charges),
  ].map((item, index) => {
    if (Array.isArray(item)) {
      return {
        label: compactText(item[0], `Charge ${index + 1}`),
        amount: moneyNumber(item[1]),
      };
    }

    if (item && typeof item === "object") {
      return {
        label: compactText(
          item.label || item.name || item.key || item.title,
          `Charge ${index + 1}`,
        ),
        amount: moneyNumber(
          item.amount || item.value || item.price || item.charge || item.total,
        ),
      };
    }

    return {
      label: `Charge ${index + 1}`,
      amount: moneyNumber(item),
    };
  });
};

const collectChargeItems = (source = {}, parts = {}) => {
  const fromParts = asArray(parts.listItems).map((item) => ({
    label: item.label,
    amount: moneyNumber(item.amount),
  }));

  const cleanFromParts = uniqueChargeItems(fromParts);

  if (cleanFromParts.length) {
    return cleanFromParts;
  }

  return uniqueChargeItems(collectRawChargeItems(source));
};

const rowVariant = (row, index) =>
  compactText(
    valueFrom(
      row,
      [
        "variant",
        "variantName",
        "variant_name",
        "VariantName",
        "variantDisplayName",
        "name",
      ],
      `Variant ${index + 1}`,
    ),
  );

const rowValue = (row) =>
  compactText(
    valueFrom(
      row,
      ["featureValue", "feature_value", "value", "details", "description"],
      "",
    ),
  );

const rowFuelTransmission = (row) => {
  const fuel = cleanTextValue(
    valueFrom(row, ["fuel", "fuelType", "fuel_type", "FuelType"], ""),
  );

  const transmission = cleanTextValue(
    valueFrom(
      row,
      [
        "transmission",
        "transmissionType",
        "transmission_type",
        "TransmissionType",
      ],
      "",
    ),
  );

  const combined = cleanTextValue(
    valueFrom(row, ["fuelTransmission", "fuel_transmission"], ""),
  );

  if (combined && !combined.includes("- / -")) return combined;

  return [fuel, transmission].filter(Boolean).join(" / ");
};

const featureValueText = (value) => {
  if (value === true) return "yes";
  if (value === false) return "no";

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? String(value) : "";
  }

  if (Array.isArray(value)) {
    return value.map(featureValueText).filter(Boolean).join(", ");
  }

  if (value && typeof value === "object") {
    return featureValueText(
      value.value ??
        value.featureValue ??
        value.feature_value ??
        value.available ??
        value.status ??
        value.label ??
        value.name ??
        value.title ??
        "",
    );
  }

  return compactText(value, "").trim();
};

const featureValueMeansAvailable = (value) => {
  const text = featureValueText(value).trim().toLowerCase();

  if (!text) return false;

  if (
    [
      "-",
      "—",
      "no",
      "false",
      "0",
      "na",
      "n/a",
      "not found",
      "none",
      "nil",
    ].includes(text)
  ) {
    return false;
  }

  if (
    text.includes("not available") ||
    text.includes("not offered") ||
    text.includes("unavailable") ||
    text.includes("without ")
  ) {
    return false;
  }

  return true;
};

const rowFeatureValue = (row) =>
  row?.featureValue ??
  row?.feature_value ??
  row?.value ??
  row?.details ??
  row?.description ??
  "";

const isYesAnswer = (value, row) => {
  const answer = compactText(value, "").trim().toLowerCase();

  const availableFromFeatureValue = featureValueMeansAvailable(
    rowFeatureValue(row),
  );

  if (availableFromFeatureValue) return true;

  return (
    answer === "yes" ||
    answer === "true" ||
    answer === "available" ||
    answer === "included" ||
    answer === "standard"
  );
};

const isNoAnswer = (value, row) => {
  const answer = compactText(value, "").trim().toLowerCase();

  const availableFromFeatureValue = featureValueMeansAvailable(
    rowFeatureValue(row),
  );

  if (availableFromFeatureValue) return false;

  if (
    answer === "no" ||
    answer === "false" ||
    answer === "not found" ||
    answer === "not available" ||
    answer === "unavailable"
  ) {
    return true;
  }

  return !featureValueMeansAvailable(value);
};

const collectWidgetsDeep = (value, depth = 0) => {
  if (!value || depth > 5) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectWidgetsDeep(item, depth + 1));
  }

  if (typeof value !== "object") return [];

  const type = widgetTypeOf(value);

  const looksLikeWidget =
    type ||
    value.rows ||
    value.records ||
    value.data?.rows ||
    value.data?.records ||
    value.data?.variants ||
    value.variants;

  const nested = [
    ...collectWidgetsDeep(value.widgets, depth + 1),
    ...collectWidgetsDeep(value.data?.widgets, depth + 1),
    ...collectWidgetsDeep(value.result?.widgets, depth + 1),
  ];

  return looksLikeWidget ? [value, ...nested] : nested;
};

const isPricelistWidget = (item) => {
  const type = widgetTypeOf(item);

  return [
    "vehicle_pricelist",
    "vehicle_price_list",
    "vehicle_prices",
    "pricelist",
    "price_list",
  ].includes(type);
};

const isColorWidget = (item) => {
  const type = widgetTypeOf(item);

  return [
    "vehicle_colors",
    "vehicle_colors_gallery",
    "vehicle_color_search",
    "colors",
    "color_gallery",
  ].includes(type);
};

const getPricelistRowsFromSources = ({ message, widget, data }) => {
  const allWidgets = [
    ...collectWidgetsDeep(message),
    ...collectWidgetsDeep(widget),
    ...collectWidgetsDeep(data),
  ];

  const pricelistWidget = allWidgets.find(isPricelistWidget);

  const rowsFromPricelistWidget = pricelistWidget
    ? rowsFrom(pricelistWidget)
    : [];

  const directPriceRows = [
    ...asArray(widget?.priceRows),
    ...asArray(widget?.pricelistRows),
    ...asArray(widget?.prices),
    ...asArray(widget?.pricelist),
    ...asArray(widget?.data?.priceRows),
    ...asArray(widget?.data?.pricelistRows),
    ...asArray(widget?.data?.prices),
    ...asArray(widget?.data?.pricelist),
    ...asArray(data?.priceRows),
    ...asArray(data?.pricelistRows),
    ...asArray(data?.prices),
    ...asArray(data?.pricelist),
  ];

  const priceRows = rowsFromPricelistWidget.length
    ? rowsFromPricelistWidget
    : directPriceRows;

  return {
    pricelistWidget,
    priceRows,
  };
};

const normalizeVariantForPriceMatch = (value, brand, model) => {
  const removeTokens = new Set(
    [
      ...String(brand || "")
        .toLowerCase()
        .split(/\s+/),
      ...String(model || "")
        .toLowerCase()
        .split(/\s+/),
      "hyundai",
      "tata",
      "kia",
      "maruti",
      "honda",
      "skoda",
      "toyota",
      "mahindra",
      "india",
      "llp",
    ].filter(Boolean),
  );

  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !removeTokens.has(token))
    .join(" ");
};

const priceMatchScore = (target, candidate) => {
  if (!target || !candidate) return 0;

  if (target === candidate) return 100;

  const targetTokens = target.split(/\s+/).filter(Boolean);
  const candidateTokens = candidate.split(/\s+/).filter(Boolean);

  if (!targetTokens.length || !candidateTokens.length) return 0;

  const candidateSet = new Set(candidateTokens);
  const common = targetTokens.filter((token) => candidateSet.has(token)).length;
  const missing = targetTokens.length - common;
  const extra = Math.max(0, candidateTokens.length - common);

  return (common / targetTokens.length) * 100 - missing * 20 - extra * 12;
};

const matchPriceRow = ({ variant, priceRows, brand, model }) => {
  const target = normalizeVariantForPriceMatch(variant, brand, model);

  if (!target) return null;

  const rows = asArray(priceRows);

  const exact = rows.find((row, index) => {
    const candidate = normalizeVariantForPriceMatch(
      rowVariant(row, index),
      brand,
      model,
    );

    return candidate === target;
  });

  if (exact) return exact;

  let best = null;
  let bestScore = 0;

  rows.forEach((row, index) => {
    const candidate = normalizeVariantForPriceMatch(
      rowVariant(row, index),
      brand,
      model,
    );

    const score = priceMatchScore(target, candidate);

    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  });

  return bestScore >= 86 ? best : null;
};

function PremiumActionButton({ action, onAction, primary = false }) {
  if (!action) return null;

  return (
    <button
      type="button"
      onClick={() => onAction?.(action)}
      disabled={action.disabled || action.unavailable}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50",
        primary
          ? "bg-[#0f172a] text-white shadow-[0_20px_48px_-28px_rgba(15,23,42,0.78)] hover:-translate-y-0.5 hover:bg-[#111827]"
          : "border border-[#dbe3ef] bg-white/82 text-[#1e293b] shadow-sm hover:-translate-y-0.5 hover:border-[#93c5fd] hover:bg-[#eff6ff] hover:text-[#1e40af]",
      )}
    >
      {action.label || "Open"}
      <ChevronRight size={15} />
    </button>
  );
}

function VariantToken({ item, index, selected, onSelect }) {
  const Icon = item.positive
    ? CheckCircle2
    : item.negative
      ? XCircle
      : CircleAlert;

  const baseClass = item.positive
    ? "text-emerald-800 ring-emerald-200 hover:bg-emerald-50"
    : item.negative
      ? "text-red-700 ring-red-200 hover:bg-red-50"
      : "text-amber-700 ring-amber-200 hover:bg-amber-50";

  const selectedClass = item.positive
    ? "bg-emerald-600 text-white ring-emerald-600 shadow-[0_16px_36px_-24px_rgba(16,185,129,0.8)]"
    : item.negative
      ? "bg-red-600 text-white ring-red-600 shadow-[0_16px_36px_-24px_rgba(239,68,68,0.72)]"
      : "bg-amber-500 text-white ring-amber-500 shadow-[0_16px_36px_-24px_rgba(245,158,11,0.72)]";

  const iconClassName = selected
    ? "text-white"
    : item.positive
      ? "text-emerald-600"
      : item.negative
        ? "text-red-600"
        : "text-amber-600";

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.012, 0.12), duration: 0.16 }}
      onClick={() => onSelect?.(item)}
      className={cx(
        "inline-flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ring-1 transition",
        selected ? selectedClass : "bg-white/92 shadow-sm",
        !selected ? baseClass : "",
      )}
      title={`${item.variant}${item.value ? ` · ${item.value}` : ""}`}
    >
      <Icon size={13} className={cx("shrink-0", iconClassName)} />
      <span className="truncate">{item.variant}</span>
    </motion.button>
  );
}

function SelectedVariantCard({
  item,
  image,
  model,
  brand,
  city,
  featureLabel,
  onAction,
}) {
  if (!item) return null;

  const priceSourceRow = {
    ...(item.row || {}),
    ...(item.row?.priceRow || {}),
    ...(item.row?.price_row || {}),
    ...(item.row?.priceBreakup || {}),
    ...(item.row?.price_breakup || {}),
    ...(item.row?.pricing || {}),
    ...(item.priceRow || {}),
  };

  const parts = getPriceParts(priceSourceRow);

  const exShowroom = firstMoney(
    parts.exShowroom,
    priceSourceRow.exShowroomPrice,
    priceSourceRow.exShowroom,
    priceSourceRow.ex_showroom,
    priceSourceRow.ExShowRoomPrice,
    priceSourceRow.price,
  );

  const rto = firstMoney(
    parts.rto,
    priceSourceRow.rto,
    priceSourceRow.rtoCharges,
    priceSourceRow.rto_charges,
  );

  const insurance = firstMoney(
    parts.insurance,
    priceSourceRow.insurance,
    priceSourceRow.insurancePrice,
    priceSourceRow.insurance_price,
  );

  const otherCharges = collectChargeItems(priceSourceRow, parts);

  const computedOnRoad =
    exShowroom +
    rto +
    insurance +
    otherCharges.reduce((sum, charge) => sum + moneyNumber(charge.amount), 0);

  const totalPrice = firstMoney(
    parts.onRoad,
    priceSourceRow.onRoadPrice,
    priceSourceRow.onRoad,
    priceSourceRow.calculatedOnRoadPrice,
    priceSourceRow.storedOnRoadPrice,
    computedOnRoad,
  );

  const priceRows = [
    ["Ex-showroom", exShowroom],
    ["RTO charges", rto],
    ["Insurance", insurance],
    ...otherCharges.map((charge) => [charge.label, charge.amount]),
  ].filter(([, value]) => moneyNumber(value) > 0);

  const hasPrice = priceRows.length > 0 || totalPrice > 0;

  const statusLabel = item.positive
    ? "Feature included"
    : item.negative
      ? "Feature missing"
      : "Feature unconfirmed";

  const statusClass = item.positive
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : item.negative
      ? "bg-red-50 text-red-700 ring-red-200"
      : "bg-amber-50 text-amber-700 ring-amber-200";

  const StatusIcon = item.positive
    ? CheckCircle2
    : item.negative
      ? XCircle
      : CircleAlert;

  return (
    <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
      <section className="overflow-hidden rounded-[30px] bg-white/76 p-4 shadow-[0_28px_86px_-66px_rgba(15,23,42,0.62)] ring-1 ring-[#dbe3ef]/80 backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2563eb]">
              Selected variant
            </p>
            <h4 className="mt-1 truncate text-xl font-black tracking-[-0.04em] text-[#0f172a]">
              {item.variant}
            </h4>
            <p className="mt-1 text-sm font-semibold text-[#64748b]">
              {rowFuelTransmission(priceSourceRow) ||
                [brand, model].filter(Boolean).join(" ")}
            </p>
          </div>

          <span
            className={cx(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ring-1",
              statusClass,
            )}
          >
            <StatusIcon size={13} />
            {item.positive ? "Yes" : item.negative ? "No" : "—"}
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_50%_42%,#ffffff_0%,#f8fafc_38%,#eaf2ff_100%)] ring-1 ring-[#dbe3ef]">
          <div className="relative h-48 sm:h-52">
            <div className="absolute inset-x-8 bottom-6 h-8 rounded-full bg-slate-500/20 blur-xl" />

            {image ? (
              <motion.img
                key={image}
                src={image}
                alt={`${item.variant}`}
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute inset-0 h-full w-full object-contain object-center p-3 mix-blend-multiply drop-shadow-[0_22px_26px_rgba(15,23,42,0.22)]"
              />
            ) : (
              <div className="absolute left-1/2 top-1/2 flex h-24 w-48 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[40px] bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#020617] text-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.8)]">
                <Car size={60} strokeWidth={1.35} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-[#e2e8f0]/80 pt-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748b]">
            {humanize(featureLabel || "Feature")}
          </p>
          <p
            className={cx(
              "mt-1 text-lg font-black",
              item.positive
                ? "text-emerald-700"
                : item.negative
                  ? "text-red-700"
                  : "text-amber-700",
            )}
          >
            {item.value || item.answer || statusLabel}
          </p>
        </div>

        {hasPrice ? (
          <div className="mt-4 border-t border-[#e2e8f0]/80 pt-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748b]">
              Est. on-road price {city ? `(${humanize(city)})` : ""}
            </p>
            <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#2563eb]">
              {moneyLabel(totalPrice)}
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-[30px] bg-white/76 p-4 shadow-[0_28px_86px_-66px_rgba(15,23,42,0.62)] ring-1 ring-[#dbe3ef]/80 backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2563eb]">
              Price breakup
            </p>
            <h4 className="mt-1 text-lg font-black text-[#0f172a]">
              {item.variant}
            </h4>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe]">
            <Banknote size={18} />
          </div>
        </div>

        {hasPrice ? (
          <div className="mt-4 space-y-3">
            {priceRows.map(([label, value]) => (
              <div
                key={`${label}-${value}`}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="font-semibold text-[#64748b]">{label}</span>
                <span className="font-black text-[#0f172a]">
                  {moneyLabel(value)}
                </span>
              </div>
            ))}

            <div className="border-t border-[#e2e8f0]/80 pt-3">
              <div className="flex items-center justify-between gap-4">
                <span className="font-black text-[#0f172a]">Total on-road</span>
                <span className="text-lg font-black text-[#2563eb]">
                  {moneyLabel(totalPrice)}
                </span>
              </div>
            </div>

            <p className="rounded-[18px] bg-[#eff6ff] px-3 py-2 text-xs font-semibold leading-5 text-[#475569] ring-1 ring-[#bfdbfe]">
              On-road price is an estimate and may vary by city, dealer and
              selected insurance package.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-[20px] border border-[#dbe3ef] bg-[#f8fafc] p-4">
            <p className="text-sm font-semibold leading-6 text-[#64748b]">
              Price data was not sent with this feature answer. Open the
              pricelist to view ex-showroom, RTO, insurance and on-road details.
            </p>

            <button
              type="button"
              onClick={() =>
                onAction?.({
                  type: "show_more_inline",
                  label: "Open pricelist",
                  message: `Show ${[brand, model, item.variant]
                    .filter(Boolean)
                    .join(" ")} price list`,
                })
              }
              className="mt-3 inline-flex items-center gap-1 text-sm font-black text-[#2563eb] hover:text-[#1d4ed8]"
            >
              Open pricelist <ChevronRight size={15} />
            </button>
          </div>
        )}
      </section>
    </aside>
  );
}

export function VehicleFeatureAnswerCanvas({
  message,
  widget,
  onAction,
  footer,
}) {
  const [showAllVariants, setShowAllVariants] = useState(false);
  const [selectedVariantKey, setSelectedVariantKey] = useState("");

  const rows = rowsFrom(widget);
  const data = widget.data || {};
  const { pricelistWidget, priceRows } = getPricelistRowsFromSources({
    message,
    widget,
    data,
  });

  const backendAnswer = compactText(widget.answer || data.answer, "Not found");

  const actions = asArray(widget.actions || data.actions);
  const primary =
    actions.find((action) =>
      /feature|variant|compare|overview/i.test(
        action.type || action.label || "",
      ),
    ) || actions[0];

  const secondary = actions.find((action) => action !== primary);

  const featureLabel =
    widget.feature ||
    data.feature ||
    data.featureLabel ||
    valueFrom(rows[0], ["featureLabel", "feature", "featureKey", "key"], "");

  const model =
    widget.model ||
    data.model ||
    pricelistWidget?.model ||
    pricelistWidget?.data?.model ||
    valueFrom(rows[0], ["model"], message?.entities?.model || "");

  const brand =
    widget.brand ||
    data.brand ||
    pricelistWidget?.brand ||
    pricelistWidget?.data?.brand ||
    valueFrom(rows[0], ["brand", "make"], message?.entities?.brand || "");

  const city =
    widget.city ||
    data.city ||
    pricelistWidget?.city ||
    pricelistWidget?.data?.city ||
    valueFrom(rows[0], ["city", "citySlug"], message?.entities?.city || "");

  const variant =
    widget.variant ||
    data.variant ||
    message?.entities?.variant ||
    valueFrom(
      rows.find(
        (row) =>
          isYesAnswer(rowAnswer(row), row) || isYesAnswer(rowValue(row), row),
      ),
      ["variant", "variantName"],
      "",
    );

  const featureTags = asArray(
    widget.tags ||
      data.tags ||
      data.featureTags ||
      data.highlights ||
      (String(featureLabel).toLowerCase().includes("sunroof")
        ? [
            "Electric sunroof",
            "One-touch open",
            "Anti-pinch",
            "Premium comfort",
          ]
        : [humanize(featureLabel || "Feature")]),
  )
    .map((item) => compactText(item))
    .filter(Boolean)
    .slice(0, 5);

  const variantItems = useMemo(() => {
    return rows
      .map((row, index) => {
        const answerValue = rowAnswer(row);
        const value = rowValue(row);

        const positive =
          isYesAnswer(answerValue, row) || isYesAnswer(value, row);

        const negative =
          !positive && (isNoAnswer(answerValue, row) || isNoAnswer(value, row));

        const variantName = rowVariant(row, index);

        const attachedPriceRow =
          row.priceRow ||
          row.price_row ||
          row.priceBreakup ||
          row.price_breakup ||
          row.pricing ||
          null;

        const matchedPriceRow = matchPriceRow({
          variant: variantName,
          priceRows,
          brand,
          model,
        });

        const priceRow = attachedPriceRow || matchedPriceRow;

        return {
          key: valueFrom(
            row,
            ["id", "_id", "variantId"],
            `${variantName}-${index}`,
          ),
          row,
          priceRow,
          index,
          answer: answerValue,
          value,
          variant: variantName,
          positive,
          negative,
          sortWeight: positive ? 0 : negative ? 1 : 2,
        };
      })
      .sort((a, b) => {
        if (a.sortWeight !== b.sortWeight) return a.sortWeight - b.sortWeight;
        return a.variant.localeCompare(b.variant);
      });
  }, [rows, priceRows, brand, model]);

  const preferredInitialKey =
    variantItems.find((item) =>
      variant
        ? item.variant.toLowerCase().includes(String(variant).toLowerCase())
        : false,
    )?.key ||
    variantItems.find((item) => item.positive)?.key ||
    variantItems[0]?.key ||
    "";

  useEffect(() => {
    if (!selectedVariantKey && preferredInitialKey) {
      setSelectedVariantKey(preferredInitialKey);
    }
  }, [preferredInitialKey, selectedVariantKey]);

  const selectedItem =
    variantItems.find((item) => item.key === selectedVariantKey) ||
    variantItems.find((item) => item.key === preferredInitialKey) ||
    variantItems[0];

  const stableVehicleImage = useMemo(() => {
    const allWidgets = [
      ...collectWidgetsDeep(message),
      ...collectWidgetsDeep(widget),
      ...collectWidgetsDeep(data),
    ];

    const colorWidget = allWidgets.find(isColorWidget);

    const modelImageMap = {
      "hyundai verna": "/aci-cars/hyundai-verna.png",
      "tata safari": "/aci-cars/tata-safari.png",
      "kia seltos": "/aci-cars/kia-seltos.png",
      "hyundai creta": "/aci-cars/hyundai-creta.png",
    };

    const modelKey = [brand, model].filter(Boolean).join(" ").toLowerCase();

    return (
      findImageIn(selectedItem?.priceRow) ||
      findImageIn(selectedItem?.row) ||
      findImageIn(colorWidget) ||
      findImageIn(pricelistWidget) ||
      findImageIn(priceRows) ||
      findImageIn(message?.widgets) ||
      findImageIn(widget) ||
      findImageIn(data) ||
      modelImageMap[modelKey] ||
      ""
    );
  }, [
    selectedItem,
    pricelistWidget,
    priceRows,
    message,
    widget,
    data,
    brand,
    model,
  ]);

  const positiveCount = variantItems.filter((item) => item.positive).length;
  const negativeCount = variantItems.filter((item) => item.negative).length;
  const unknownCount = Math.max(
    0,
    variantItems.length - positiveCount - negativeCount,
  );

  const answer =
    positiveCount > 0 && negativeCount === 0 && unknownCount === 0
      ? "Yes"
      : positiveCount === 0 && negativeCount > 0 && unknownCount === 0
        ? "No"
        : positiveCount > 0 && (negativeCount > 0 || unknownCount > 0)
          ? "Mixed"
          : backendAnswer;

  const config = answerConfigFor(answer);
  const AnswerIcon = config.icon;

  const visibleVariantItems = showAllVariants
    ? variantItems
    : variantItems.slice(0, 14);

  const vehicleName =
    [brand, model].filter(Boolean).join(" ") || "This vehicle";
  const featureText = humanize(featureLabel || "this feature").toLowerCase();
  const subject = variant || vehicleName;

  const answerTitle =
    config.tone === "yes"
      ? `${subject} includes ${featureText}.`
      : config.tone === "no"
        ? `${subject} does not include ${featureText}.`
        : config.tone === "mixed"
          ? `${humanize(featureLabel || "This feature")} depends on the variant.`
          : `I could not confirm ${featureText}.`;

  const answerLine =
    widget.explanation ||
    data.explanation ||
    data.reason ||
    data.summaryText ||
    (config.tone === "yes"
      ? `The ${featureText} is listed as available in the checked feature catalogue.`
      : config.tone === "no"
        ? `The ${featureText} was not found in the checked variant records.`
        : config.tone === "mixed"
          ? "Availability changes by variant. Green variants include it, red variants do not."
          : "I could not confidently verify this feature from the available records.");

  const totalChecked = rows.length;
  const hasVariantEvidence = variantItems.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="w-full max-w-none"
    >
      <article className="relative overflow-visible rounded-[34px] bg-white/70 p-5 shadow-[0_32px_100px_-72px_rgba(15,23,42,0.72)] ring-1 ring-white/75 backdrop-blur-2xl sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute inset-0 rounded-[34px] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.68)_50%,rgba(239,246,255,0.76))]" />
        <div
          className={cx(
            "pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full blur-3xl",
            config.glow,
          )}
        />
        <div className="pointer-events-none absolute -bottom-32 left-[18%] h-72 w-72 rounded-full bg-[#dbeafe]/42 blur-3xl" />

        <div className="relative">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_410px] xl:items-start">
            <section className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ring-1",
                    config.pill,
                  )}
                >
                  <span className={cx("h-2 w-2 rounded-full", config.dot)} />
                  {config.eyebrow}
                </span>

                {totalChecked ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/86 px-3 py-1.5 text-xs font-black text-[#64748b] ring-1 ring-[#dbe3ef]">
                    <ListChecks size={13} />
                    {totalChecked} variants checked
                  </span>
                ) : null}
              </div>

              <div className="mt-5 flex gap-4">
                <motion.div
                  initial={{ rotate: -8, scale: 0.94 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cx(
                    "hidden h-16 w-16 shrink-0 items-center justify-center rounded-[24px] sm:flex",
                    config.iconBox,
                  )}
                >
                  <AnswerIcon size={30} strokeWidth={2.4} />
                </motion.div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-[34px] font-semibold leading-[1.04] tracking-[-0.065em] text-[#0f172a] sm:text-[48px] xl:text-[56px]">
                    <span className={config.accent}>{config.label}</span>
                    <span className="text-[#0f172a]"> — {answerTitle}</span>
                  </h3>

                  <p className="mt-4 max-w-4xl text-[15px] font-semibold leading-7 text-[#64748b] sm:text-base">
                    {answerLine}
                  </p>
                </div>
              </div>

              {featureTags.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {featureTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe3ef] bg-white/82 px-3 py-2 text-xs font-black text-[#334155] shadow-sm"
                    >
                      <Sparkles size={13} className="text-[#2563eb]" />
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {hasVariantEvidence ? (
                <section
                  className={cx(
                    "mt-6 rounded-[28px] border p-4 ring-1 sm:p-5",
                    config.panel,
                    config.panelBorder,
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[#0f172a]">
                        Variant availability
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-[#64748b]">
                        {positiveCount} available
                        {negativeCount
                          ? ` · ${negativeCount} not available`
                          : ""}
                        {unknownCount ? ` · ${unknownCount} unconfirmed` : ""}
                      </p>
                    </div>

                    {variantItems.length > 14 ? (
                      <button
                        type="button"
                        onClick={() => setShowAllVariants((prev) => !prev)}
                        className="rounded-full bg-white/86 px-3 py-1.5 text-xs font-black text-[#2563eb] ring-1 ring-[#bfdbfe] transition hover:bg-white"
                      >
                        {showAllVariants
                          ? "Show less"
                          : `Show all ${variantItems.length}`}
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {visibleVariantItems.map((item, index) => (
                      <VariantToken
                        key={`${item.variant}-${item.index}`}
                        item={item}
                        index={index}
                        selected={selectedItem?.key === item.key}
                        onSelect={(nextItem) =>
                          setSelectedVariantKey(nextItem.key)
                        }
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <PremiumActionButton
                  action={primary}
                  onAction={onAction}
                  primary
                />
                <PremiumActionButton action={secondary} onAction={onAction} />
              </div>

              <div className="mt-5 border-t border-[#e2e8f0]/80 pt-4">
                <p className="text-xs font-semibold leading-5 text-[#94a3b8]">
                  Feature availability may vary by engine, transmission, city
                  stock and model year. Confirm the exact variant before
                  booking.
                </p>
              </div>
            </section>

            <SelectedVariantCard
              item={selectedItem}
              image={stableVehicleImage}
              model={model}
              brand={brand}
              city={city}
              featureLabel={featureLabel}
              onAction={onAction}
            />
          </div>
        </div>
      </article>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </motion.div>
  );
}
