import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";

import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Car,
  CheckCircle2,
  CircleAlert,
  Clock3,
  DatabaseZap,
  FileQuestion,
  Info,
  Layers3,
  MapPin,
  Palette,
  SearchCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  XCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import FollowUpSuggestions from "./FollowUpSuggestions";
import SourceTransparencyBar from "./SourceTransparencyBar";
import { asArray, formatCurrency, formatDate, humanize, pick } from "./utils";
import {
  normalizePricingLineItems,
  toPriceNumber,
} from "../../utils/vehiclePricingBreakup";

// ============================================================================
// NEW DESIGN SYSTEM - MODERN AESTHETIC
// ============================================================================

const MODERN_COLORS = {
  // Gradient backgrounds
  gradients: {
    primary: "from-violet-600 via-blue-500 to-cyan-500",
    success: "from-emerald-500 via-teal-500 to-cyan-500",
    warning: "from-amber-500 via-orange-500 to-red-500",
    info: "from-blue-500 via-purple-500 to-pink-500",
  },
  // Soft UI colors
  backgrounds: {
    card: "bg-white/70 backdrop-blur-xl",
    section: "bg-gradient-to-br from-slate-900/5 to-slate-900/10",
    hover:
      "hover:bg-gradient-to-br hover:from-violet-500/10 hover:to-blue-500/10",
  },
  // Text colors
  text: {
    primary: "text-slate-900",
    secondary: "text-slate-600",
    tertiary: "text-slate-500",
    light: "text-white",
  },
  // Border colors
  borders: {
    light: "border-slate-200/50",
    medium: "border-slate-300/60",
    dark: "border-slate-400/70",
  },
};

const SHADOWS = {
  sm: "shadow-sm",
  md: "shadow-md backdrop-blur-lg",
  lg: "shadow-xl backdrop-blur-2xl",
  glow: "shadow-[0_0_20px_rgba(168,85,247,0.15)]",
  neon: "shadow-[0_0_30px_rgba(59,130,246,0.2)]",
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getWidgetType = (widget = {}) =>
  widget.type || widget.widgetType || widget.name || "";

const widgetMatches = (widget, type) =>
  String(getWidgetType(widget)).toLowerCase() === String(type).toLowerCase();

const findWidget = (message, type) =>
  asArray(message?.widgets).find((widget) => widgetMatches(widget, type));

const findAnyWidget = (message, types = []) =>
  asArray(message?.widgets).find((widget) =>
    types.some((type) => widgetMatches(widget, type)),
  );

const rowsFrom = (widget = {}) =>
  asArray(
    widget.rows ||
      widget.records ||
      widget.colors ||
      widget.evidenceRows ||
      widget.data?.rows ||
      widget.data?.records ||
      widget.data?.variants ||
      widget.data?.colors ||
      widget.data?.evidenceRows,
  );

const valueFrom = (source, keys, fallback = "—") =>
  pick(source, keys, fallback);

const numberFrom = (value) => {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const compactText = (value, fallback = "—") => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

// ============================================================================
// REDESIGNED BASE COMPONENTS
// ============================================================================

function ActionButton({ action, onAction, children, primary = false }) {
  if (!action && !children) return null;
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => action && onAction?.(action)}
      disabled={action?.disabled || action?.unavailable}
      className={`
        group relative inline-flex items-center gap-2 rounded-xl font-semibold
        transition-all duration-300 px-4 py-2.5 text-sm overflow-hidden
        ${
          primary
            ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg hover:shadow-xl hover:shadow-violet-500/50"
            : "bg-white/50 border border-slate-200/50 text-slate-700 hover:bg-white hover:border-violet-300/50 hover:text-violet-700"
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      <span className="relative z-10">
        {children || action.label || "Open"}
      </span>
      {primary && (
        <ArrowUpRight
          size={16}
          className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
        />
      )}
      {primary && (
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600 opacity-0 group-hover:opacity-20 transition-opacity" />
      )}
    </motion.button>
  );
}

function ModernStatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  subtext,
}) {
  const gradientMap = {
    default: "from-blue-500/10 to-cyan-500/10 border-blue-200/30",
    success: "from-emerald-500/10 to-teal-500/10 border-emerald-200/30",
    warning: "from-amber-500/10 to-orange-500/10 border-amber-200/30",
    danger: "from-red-500/10 to-rose-500/10 border-red-200/30",
    purple: "from-violet-500/10 to-purple-500/10 border-violet-200/30",
  };

  const iconColorMap = {
    default: "text-blue-600",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-red-600",
    purple: "text-violet-600",
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className={`
        group relative rounded-2xl border ${gradientMap[tone] || gradientMap.default}
        bg-gradient-to-br p-5 ${SHADOWS.md} overflow-hidden
      `}
    >
      {/* Animated background blur */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">
            {label}
          </p>
          <p className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
            {value ?? "—"}
          </p>
          {subtext && (
            <p className="text-xs text-slate-500 mt-2 font-medium">{subtext}</p>
          )}
        </div>

        {Icon && (
          <div
            className={`
            flex h-12 w-12 items-center justify-center rounded-xl
            bg-gradient-to-br from-white/80 to-white/40 ${SHADOWS.sm}
            group-hover:scale-110 transition-transform ${iconColorMap[tone] || iconColorMap.default}
          `}
          >
            <Icon size={20} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Border glow effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -mr-16 -mt-16" />
    </motion.div>
  );
}

function ModernTable({
  columns,
  rows,
  emptyText = "No data available",
  maxHeight = "max-h-[480px]",
}) {
  const safeRows = asArray(rows);
  return (
    <div
      className={`${maxHeight} rounded-2xl border border-slate-200/30 overflow-auto ${MODERN_COLORS.backgrounds.card}`}
    >
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-gradient-to-r from-slate-50/80 to-slate-100/80 backdrop-blur-sm border-b border-slate-200/30">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider text-slate-700"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/50">
          {safeRows.length ? (
            safeRows.map((row, index) => (
              <motion.tr
                key={row.id || `${index}`}
                whileHover={{ backgroundColor: "rgba(245, 247, 250, 0.5)" }}
                className="transition-colors"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-6 py-4 text-slate-700 font-medium"
                  >
                    {column.render
                      ? column.render(row, index)
                      : compactText(
                          valueFrom(row, column.keys || [column.key]),
                        )}
                  </td>
                ))}
              </motion.tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-slate-500"
              >
                <div className="flex flex-col items-center gap-3">
                  <DatabaseZap size={32} className="opacity-30" />
                  <p className="font-medium">{emptyText}</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ModernCanvasShell({
  title,
  subtitle,
  icon: Icon = Sparkles,
  children,
  actions,
  onAction,
  footer,
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`
        rounded-3xl border border-slate-200/30 ${MODERN_COLORS.backgrounds.card}
        p-8 ${SHADOWS.lg} relative overflow-hidden
      `}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-500/5 via-transparent to-blue-500/5" />

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex gap-4 items-start">
          {/* Icon with gradient */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl blur-xl opacity-20" />
            <div
              className={`
              relative flex h-16 w-16 items-center justify-center rounded-2xl
              bg-gradient-to-br from-violet-600 to-blue-600 text-white ${SHADOWS.md}
            `}
            >
              <Icon size={28} strokeWidth={2} />
            </div>
          </div>

          {/* Title section */}
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-600 mb-2">
              Live Results
            </p>
            <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 mb-2">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-slate-600 font-medium max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions?.length ? (
          <div className="flex flex-wrap gap-3">
            {actions.map((action, index) => (
              <ActionButton
                key={`${action.label || action.type}-${index}`}
                action={action}
                onAction={onAction}
                primary={index === 0}
              >
                {action.label}
              </ActionButton>
            ))}
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="space-y-6">{children}</div>

      {/* Footer */}
      {footer}
    </motion.article>
  );
}

function ModernCanvasFooter({ message, showQueryPlan, onFollowUp }) {
  return (
    <div className="mt-8 space-y-4">
      <SourceTransparencyBar sourceTransparency={message?.sourceTransparency} />

      {showQueryPlan &&
      (message?.queryPlan || message?.intent || message?.entities) ? (
        <details className="group rounded-xl border border-violet-200/30 bg-gradient-to-r from-violet-50/50 to-purple-50/50 p-4 backdrop-blur-sm">
          <summary className="cursor-pointer font-bold text-violet-700 flex items-center gap-2">
            <Zap size={16} />
            View Query Plan
            <span className="ml-auto group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <pre className="mt-4 rounded-lg bg-slate-900 p-4 text-xs text-slate-100 overflow-auto max-h-60">
            {JSON.stringify(
              {
                intent: message?.intent,
                entities: message?.entities,
                queryPlan: message?.queryPlan,
              },
              null,
              2,
            )}
          </pre>
        </details>
      ) : null}

      <FollowUpSuggestions
        suggestions={message?.followUpSuggestions}
        onSelect={onFollowUp}
      />
    </div>
  );
}

// ============================================================================
// REDESIGNED VEHICLE CANVASES
// ============================================================================

function VehiclePricelistCanvas({ message, widget, onAction, footer }) {
  const rows = rowsFrom(widget);
  const [openBreakupKey, setOpenBreakupKey] = useState(null);
  const readAmount = (row, keys = []) => {
    for (const key of keys) {
      const amount = toPriceNumber(row?.[key]);
      if (amount > 0) return amount;
    }
    return 0;
  };
  const listItemsFrom = (value, fallbackLabel = "Item") => {
    const amountKeys = [
      "amount",
      "value",
      "price",
      "cost",
      "charge",
      "charges",
      "amountInRs",
      "amount_in_rs",
      "priceInRs",
      "price_in_rs",
      "inr",
      "rs",
    ];
    const labelKeys = [
      "label",
      "name",
      "title",
      "text",
      "description",
      "chargeName",
      "charge_name",
      "key",
      "type",
    ];
    const readLooseAmount = (item) => {
      if (item === null || item === undefined) return 0;
      if (typeof item === "number" || typeof item === "string")
        return toPriceNumber(item);
      if (typeof item !== "object") return 0;
      for (const key of amountKeys) {
        const amount = toPriceNumber(item[key]);
        if (amount > 0) return amount;
      }
      for (const val of Object.values(item)) {
        const amount = toPriceNumber(val);
        if (amount > 0) return amount;
      }
      return 0;
    };
    const readLooseLabel = (item, index) => {
      if (typeof item === "string") {
        return (
          item
            .replace(/₹\s*[\d,]+(?:\.\d+)?/g, "")
            .replace(/(?:rs\.?|inr)\s*[\d,]+(?:\.\d+)?/gi, "")
            .replace(/[\d,]+(?:\.\d+)?\s*$/g, "")
            .replace(/[:=-]+\s*$/g, "")
            .trim() || `${fallbackLabel} ${index + 1}`
        );
      }
      if (!item || typeof item !== "object")
        return `${fallbackLabel} ${index + 1}`;
      for (const key of labelKeys) {
        if (item[key]) return humanize(item[key]);
      }
      const nonAmountEntry = Object.entries(item).find(
        ([key]) => !amountKeys.includes(key),
      );
      if (nonAmountEntry) return humanize(nonAmountEntry[0]);
      return `${fallbackLabel} ${index + 1}`;
    };

    if (Array.isArray(value)) {
      const parsed = value
        .map((item, index) => ({
          label: readLooseLabel(item, index),
          amount: readLooseAmount(item),
        }))
        .filter((item) => item.label && item.amount > 0);
      return parsed.length ? parsed : normalizePricingLineItems(value);
    }
    if (value && typeof value === "object") {
      return normalizePricingLineItems(
        Object.entries(value).map(([label, amount]) => ({
          label: humanize(label),
          amount,
        })),
      );
    }
    return [];
  };
  const getPriceParts = (row = {}) => {
    const exShowroom = readAmount(row, [
      "ex_showroom",
      "exShowroom",
      "exShowroomPrice",
      "ex_showroom_price_cardekho",
    ]);
    const rto = readAmount(row, ["rto", "roadTax", "rto_amount_cardekho"]);
    const insurance = readAmount(row, [
      "insurance",
      "insuranceCost",
      "insuranceAmount",
      "insurance_amount_cardekho",
    ]);
    const combinedItems = listItemsFrom(
      row.optionalOtherItems || row.optional_other_items,
      "Optional / other item",
    );
    const optionalItems = combinedItems.length
      ? []
      : listItemsFrom(row.optional_list, "Optional item");
    const otherItems = combinedItems.length
      ? []
      : listItemsFrom(row.other_list, "Other charge");
    const listItems = combinedItems.length
      ? combinedItems
      : [...optionalItems, ...otherItems];
    const visibleListItems = listItems;
    const listTotal = visibleListItems.reduce(
      (sum, item) => sum + toPriceNumber(item.amount),
      0,
    );
    const backendCalculatedOnRoad = toPriceNumber(
      row.calculatedOnRoadPrice || row.priceFormula?.calculatedOnRoadPrice,
    );
    const calculatedOnRoad =
      backendCalculatedOnRoad || exShowroom + rto + insurance + listTotal;
    const storedOnRoad = readAmount(row, [
      "onRoadPrice",
      "on_road_price",
      "on_road_price_cardekho",
      "total_on_road_with_accessories",
      "netOnRoad",
      "onRoad",
    ]);

    return {
      exShowroom,
      rto,
      insurance,
      optionalItems,
      otherItems,
      listItems: visibleListItems,
      listTotal,
      calculatedOnRoad,
      storedOnRoad,
      onRoad: calculatedOnRoad || storedOnRoad,
      mismatch:
        calculatedOnRoad > 0 && storedOnRoad > 0
          ? Math.abs(calculatedOnRoad - storedOnRoad)
          : 0,
    };
  };
  const sortedRows = [...rows].sort((a, b) => {
    const aPrice = getPriceParts(a).exShowroom || Number.MAX_SAFE_INTEGER;
    const bPrice = getPriceParts(b).exShowroom || Number.MAX_SAFE_INTEGER;
    return aPrice - bPrice;
  });
  const total =
    widget.total ||
    widget.totalCount ||
    widget.data?.total ||
    sortedRows.length;
  const city =
    widget.city ||
    widget.data?.city ||
    valueFrom(sortedRows[0], ["city", "citySlug"], "Delhi");
  const model =
    widget.model ||
    widget.data?.model ||
    valueFrom(sortedRows[0], ["model"], message?.entities?.model || "Vehicle");
  const brand =
    widget.brand ||
    widget.data?.brand ||
    valueFrom(sortedRows[0], ["brand", "make"], "");
  const lastUpdated =
    widget.lastUpdated ||
    widget.data?.lastUpdated ||
    valueFrom(sortedRows[0], ["LastSeenDate", "updatedAt"], "");
  const cities = asArray(
    widget.availableCities ||
      widget.data?.availableCities ||
      widget.cityOptions,
  );
  const openAction = asArray(widget.actions).find((action) =>
    /pricelist|price/i.test(action.label || action.type || ""),
  );

  const columns = [
    {
      key: "variant",
      label: "Variant",
      keys: ["variant", "variant_short", "name"],
    },
    { key: "fuel", label: "Fuel", keys: ["fuel_type", "fuel", "fuelType"] },
    {
      key: "ex",
      label: "Ex-showroom",
      render: (row) => formatCurrency(getPriceParts(row).exShowroom),
    },
    {
      key: "rto",
      label: "RTO",
      render: (row) => formatCurrency(getPriceParts(row).rto),
    },
    {
      key: "insurance",
      label: "Insurance",
      render: (row) => formatCurrency(getPriceParts(row).insurance),
    },
    {
      key: "lists",
      label: "Optional / Other items",
      render: (row) => {
        const parts = getPriceParts(row);
        if (!parts.listItems.length)
          return <span className="font-semibold text-slate-400">—</span>;
        const rowKey =
          row.id || row._id || `${row.variant}-${row.city}-${row.fuel}`;
        const isOpen = openBreakupKey === rowKey;
        return (
          <div className="relative inline-flex min-w-[140px] items-center gap-2">
            <span className="font-medium text-slate-700">
              {formatCurrency(parts.listTotal)}
            </span>
            <button
              type="button"
              aria-label="Show optional and other item breakup"
              onMouseEnter={() => setOpenBreakupKey(rowKey)}
              onFocus={() => setOpenBreakupKey(rowKey)}
              onClick={(event) => {
                event.stopPropagation();
                setOpenBreakupKey(isOpen ? null : rowKey);
              }}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 focus:bg-slate-100 focus:text-slate-800 focus:outline-none"
            >
              <Info size={15} />
            </button>
            {isOpen && (
              <div
                onMouseLeave={() => setOpenBreakupKey(null)}
                className="absolute left-0 top-8 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-[0_18px_50px_-20px_rgba(15,23,42,0.35)]"
              >
                <div className="mb-2 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <span className="font-black uppercase tracking-wide text-slate-500">
                    Breakup
                  </span>
                  <span className="font-black text-slate-900">
                    {formatCurrency(parts.listTotal)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {parts.listItems.map((item, index) => (
                    <div
                      key={`${item.label}-${index}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="font-semibold text-slate-600">
                        {item.label}
                      </span>
                      <span className="font-black text-slate-900">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "onRoad",
      label: "On-road Price",
      render: (row) => {
        const parts = getPriceParts(row);
        return (
          <div className="min-w-[150px]">
            <span className="font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {formatCurrency(parts.onRoad)}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const discontinued = valueFrom(
          row,
          ["is_discontinued", "discontinued"],
          false,
        );
        return (
          <span
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
              ${discontinued ? "bg-red-100/50 text-red-700" : "bg-emerald-100/50 text-emerald-700"}
            `}
          >
            {discontinued ? "Discontinued" : "Active"}
          </span>
        );
      },
    },
  ];

  return (
    <ModernCanvasShell
      title={[brand, model].filter(Boolean).join(" ") || "Vehicle Pricelist"}
      subtitle={`${total} variants available across ${cities.length || 1} cities`}
      icon={Car}
      actions={openAction ? [openAction] : []}
      onAction={onAction}
      footer={footer}
    >
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ModernStatCard
          icon={Car}
          label="Model"
          value={model}
          tone="default"
          subtext={brand || "Vehicle"}
        />
        <ModernStatCard
          icon={MapPin}
          label="Location"
          value={city}
          tone="success"
          subtext={`${cities.length} cities`}
        />
        <ModernStatCard
          icon={TrendingUp}
          label="Variants"
          value={total}
          tone="purple"
          subtext={`${sortedRows.length} listed · ex-showroom ascending`}
        />
        <ModernStatCard
          icon={Clock3}
          label="Updated"
          value={formatDate(lastUpdated).split(" ")[0]}
          tone="warning"
          subtext="Recently updated"
        />
      </div>

      {/* City tags */}
      {cities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cities.slice(0, 8).map((item) => (
            <motion.span
              key={String(item)}
              whileHover={{ scale: 1.05 }}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-100/70 to-cyan-100/70 text-blue-700 border border-blue-200/30"
            >
              {humanize(item)}
            </motion.span>
          ))}
        </div>
      )}

      {/* Table */}
      <ModernTable columns={columns} rows={sortedRows} />
    </ModernCanvasShell>
  );
}

function VehicleColorsCanvas({ message, widget, footer }) {
  const colors = rowsFrom(widget);
  const model =
    widget.model ||
    widget.data?.model ||
    valueFrom(colors[0], ["model"], message?.entities?.model || "Vehicle");
  const brand =
    widget.brand || widget.data?.brand || valueFrom(colors[0], ["brand"], "");

  const [selectedColorIndex, setSelectedColorIndex] = React.useState(0);
  const [isAutoPlay, setIsAutoPlay] = React.useState(false);

  const selectedColor = colors[selectedColorIndex];

  const colorName = selectedColor
    ? valueFrom(
        selectedColor,
        ["colorName", "color_name", "name"],
        `Color ${selectedColorIndex + 1}`,
      )
    : "";
  const colorHex = selectedColor
    ? valueFrom(selectedColor, ["hex", "hexCode"], "")
    : "";
  const colorImageUrl = selectedColor
    ? valueFrom(selectedColor, ["imageUrl", "image_url", "image"], "")
    : "";
  const colorUpdated = selectedColor
    ? valueFrom(selectedColor, ["lastUpdated", "last_updated", "updatedAt"], "")
    : "";

  // Navigation handlers
  const goToColor = (index) => {
    setSelectedColorIndex(index);
    setIsAutoPlay(false);
  };

  const nextColor = () => {
    setSelectedColorIndex((prev) => (prev + 1) % colors.length);
    setIsAutoPlay(false);
  };

  const prevColor = () => {
    setSelectedColorIndex((prev) => (prev - 1 + colors.length) % colors.length);
    setIsAutoPlay(false);
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") nextColor();
      if (e.key === "ArrowLeft") prevColor();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [colors.length]);

  return (
    <ModernCanvasShell
      title={[brand, model].filter(Boolean).join(" ") || "Vehicle Colors"}
      subtitle="Explore all available color options"
      icon={Palette}
      footer={footer}
    >
      {colors.length > 0 ? (
        <div className="space-y-10">
          {/* Premium Gallery */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Large Featured Preview - Takes most space */}
            <div className="lg:col-span-3">
              {/* Main Image Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-lg"
              >
                {/* Background accent */}
                <div className="absolute inset-0 opacity-50">
                  <div
                    className="absolute inset-0 mix-blend-multiply"
                    style={{
                      background: colorHex
                        ? `linear-gradient(135deg, ${colorHex}20, transparent)`
                        : "linear-gradient(135deg, #3b82f620, transparent)",
                    }}
                  />
                </div>

                {/* Image */}
                <motion.div
                  key={selectedColorIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="aspect-video w-full flex items-center justify-center relative z-10"
                >
                  {colorImageUrl ? (
                    <img
                      src={colorImageUrl}
                      alt={colorName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-6">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="h-48 w-48 rounded-2xl shadow-xl border-4 border-white"
                        style={{
                          background: colorHex || "#f1f5f9",
                          boxShadow: colorHex
                            ? `0 20px 60px ${colorHex}40`
                            : "0 20px 60px rgba(0,0,0,0.1)",
                        }}
                      />
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-slate-600 font-semibold"
                      >
                        {colorName}
                      </motion.p>
                    </div>
                  )}
                </motion.div>

                {/* Navigation Arrows */}
                <button
                  onClick={prevColor}
                  className="absolute left-6 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all hover:scale-110 group"
                >
                  <ChevronLeft
                    size={24}
                    className="text-slate-900 group-hover:text-blue-600"
                  />
                </button>
                <button
                  onClick={nextColor}
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all hover:scale-110 group"
                >
                  <ChevronRight
                    size={24}
                    className="text-slate-900 group-hover:text-blue-600"
                  />
                </button>

                {/* Progress indicator */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                  <span className="text-sm font-semibold text-white drop-shadow">
                    {selectedColorIndex + 1} / {colors.length}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Right Sidebar - Color Details */}
            <div className="space-y-6">
              {/* Color Name */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">
                  Selected Color
                </p>
                <h2 className="text-3xl font-bold text-slate-900 leading-tight">
                  {colorName}
                </h2>
              </motion.div>

              {/* Large Color Swatch */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative rounded-xl overflow-hidden border-2 border-slate-300 shadow-md h-32"
                style={{
                  background: colorHex || "#f1f5f9",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10" />
              </motion.div>

              {/* Hex Code */}
              {colorHex && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                >
                  <p className="text-xs text-slate-600 font-semibold mb-2">
                    HEX Code
                  </p>
                  <p className="font-mono text-lg font-bold text-slate-900 tracking-wide">
                    {colorHex}
                  </p>
                </motion.div>
              )}

              {/* Info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-sm text-slate-700 space-y-2 border-t border-slate-200 pt-4"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">
                    Updated
                  </p>
                  <p className="text-slate-700">
                    {formatDate(colorUpdated) || "Recently"}
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Premium Thumbnail Carousel */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
                  All Colors
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  {colors.length} options available
                </p>
              </div>
            </div>

            {/* Horizontal scroll carousel */}
            <div className="overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex gap-3 pb-2 min-w-min px-1">
                {colors.map((color, index) => {
                  const thumbName = valueFrom(
                    color,
                    ["colorName", "color_name", "name"],
                    `Color ${index + 1}`,
                  );
                  const thumbHex = valueFrom(color, ["hex", "hexCode"], "");
                  const thumbImageUrl = valueFrom(
                    color,
                    ["imageUrl", "image_url", "image"],
                    "",
                  );
                  const isSelected = selectedColorIndex === index;

                  return (
                    <motion.button
                      key={`thumb-${index}`}
                      onClick={() => goToColor(index)}
                      whileHover={{ scale: 1.08, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className={`relative flex-shrink-0 rounded-xl overflow-hidden transition-all duration-300 ${
                        isSelected
                          ? "ring-3 ring-blue-600 shadow-xl"
                          : "border-2 border-slate-200 shadow-md hover:shadow-lg hover:border-slate-300"
                      }`}
                    >
                      {/* Thumbnail */}
                      <div
                        className="w-28 h-28 flex items-center justify-center bg-gradient-to-br"
                        style={{
                          background: thumbImageUrl
                            ? "transparent"
                            : `linear-gradient(135deg, ${thumbHex || "#f1f5f9"}, ${thumbHex ? thumbHex + "80" : "#e2e8f0"})`,
                        }}
                      >
                        {thumbImageUrl ? (
                          <img
                            src={thumbImageUrl}
                            alt={thumbName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="w-20 h-20 rounded-lg shadow-md border border-white/30"
                            style={{
                              background: thumbHex || "#f1f5f9",
                            }}
                          />
                        )}
                      </div>

                      {/* Hover Label */}
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center">
                        <p className="text-white text-xs font-bold text-center drop-shadow opacity-0 hover:opacity-100 transition-opacity px-2">
                          {thumbName}
                        </p>
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <motion.div
                          layoutId="selected-indicator"
                          className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1.5 shadow-lg"
                        >
                          <Check size={14} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-8"
          >
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">
                {colors.length}
              </p>
              <p className="text-xs text-slate-600 font-semibold uppercase mt-2">
                Total Colors
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {selectedColorIndex + 1}
              </p>
              <p className="text-xs text-slate-600 font-semibold uppercase mt-2">
                Selected
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">{brand}</p>
              <p className="text-xs text-slate-600 font-semibold uppercase mt-2">
                Brand
              </p>
            </div>
          </motion.div>

          {/* Usage hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs text-slate-500 font-medium"
          >
            Use arrow buttons or keyboard arrows (← →) to navigate
          </motion.p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-slate-200 bg-slate-50 p-16 text-center"
        >
          <Palette size={48} className="mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600 font-semibold text-lg">
            No colors available
          </p>
        </motion.div>
      )}
    </ModernCanvasShell>
  );
}

function VehicleFeatureAnswerCanvas({ message, widget, onAction, footer }) {
  const rows = rowsFrom(widget);
  const data = widget.data || {};
  const answer = compactText(widget.answer || data.answer, "Not found");

  const answerConfig = {
    Yes: {
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-500",
      bg: "from-emerald-50/50 to-teal-50/50",
      border: "border-emerald-200/30",
    },
    No: {
      icon: XCircle,
      gradient: "from-red-500 to-rose-500",
      bg: "from-red-50/50 to-rose-50/50",
      border: "border-red-200/30",
    },
    Mixed: {
      icon: CircleAlert,
      gradient: "from-amber-500 to-orange-500",
      bg: "from-amber-50/50 to-orange-50/50",
      border: "border-amber-200/30",
    },
    "Not found": {
      icon: FileQuestion,
      gradient: "from-slate-400 to-slate-500",
      bg: "from-slate-50/50 to-slate-100/50",
      border: "border-slate-200/30",
    },
  }[answer] || {
    icon: FileQuestion,
    gradient: "from-slate-400 to-slate-500",
    bg: "from-slate-50/50 to-slate-100/50",
    border: "border-slate-200/30",
  };

  const AnswerIcon = answerConfig.icon;
  const summary = widget.summary || data.summary || {};
  const actions = asArray(widget.actions || data.actions);
  const primary =
    actions.find((action) =>
      /feature/i.test(action.type || action.label || ""),
    ) || actions[0];

  const columns = [
    { key: "variant", label: "Variant", keys: ["variant", "variantName"] },
    { key: "feature", label: "Feature", keys: ["featureKey", "key"] },
    { key: "value", label: "Value", keys: ["featureValue", "value"] },
    {
      key: "answer",
      label: "Found",
      render: (row) => {
        const val = valueFrom(row, ["answer"], "—");
        const isYes = /yes/i.test(val);
        const isNo = /^no$/i.test(val);
        return (
          <span
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold
              ${isYes ? "bg-emerald-100/50 text-emerald-700" : isNo ? "bg-red-100/50 text-red-700" : "bg-slate-100/50 text-slate-700"}
            `}
          >
            {isYes ? "✓" : isNo ? "✕" : "—"} {val}
          </span>
        );
      },
    },
  ];

  return (
    <ModernCanvasShell
      title={widget.question || "Feature Check"}
      subtitle="Direct answer based on vehicle feature catalogue"
      icon={BadgeCheck}
      actions={primary ? [primary] : []}
      onAction={onAction}
      footer={footer}
    >
      {/* Answer card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`
          relative rounded-3xl border ${answerConfig.border}
          bg-gradient-to-br ${answerConfig.bg} p-8 overflow-hidden
        `}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex items-center gap-6">
          <div
            className={`flex-shrink-0 p-4 rounded-2xl bg-gradient-to-br ${answerConfig.gradient} text-white`}
          >
            <AnswerIcon size={32} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Direct Answer
            </p>
            <p className="text-4xl font-black">{answer}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ModernStatCard
          label="Total Checked"
          value={summary.totalVariantsChecked ?? rows.length}
          tone="default"
        />
        <ModernStatCard
          label="Yes"
          value={summary.yesCount ?? 0}
          tone="success"
        />
        <ModernStatCard label="No" value={summary.noCount ?? 0} tone="danger" />
        <ModernStatCard
          label="Not Found"
          value={summary.notFoundCount ?? 0}
          tone="warning"
        />
      </div>

      {/* Table */}
      <ModernTable columns={columns} rows={rows} />
    </ModernCanvasShell>
  );
}

function VehicleFeaturesCanvas({ message, widget, footer }) {
  const rows = rowsFrom(widget);
  const variants = rows.length ? rows : asArray(widget.data?.variants);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [variantSearch, setVariantSearch] = useState("");
  const [featureSearch, setFeatureSearch] = useState("");
  const selected = variants[selectedIndex] || variants[0] || {};
  const rawFeatures =
    selected.features || selected.featureGroups || widget.data?.features || {};

  const groups = useMemo(() => {
    if (!rawFeatures || typeof rawFeatures !== "object") return {};
    return Object.entries(rawFeatures).reduce((acc, [key, value]) => {
      const [group, feature] = String(key).includes("|")
        ? String(key)
            .split("|")
            .map((part) => part.trim())
        : ["Features", key];
      if (!acc[group]) acc[group] = [];
      acc[group].push({ feature, value });
      return acc;
    }, {});
  }, [rawFeatures]);

  const filteredVariants = useMemo(() => {
    if (!variantSearch.trim()) return variants;
    const q = variantSearch.toLowerCase();
    return variants.filter((v) =>
      valueFrom(v, ["variant", "variantName", "name"], "")
        .toLowerCase()
        .includes(q),
    );
  }, [variants, variantSearch]);

  const filteredGroups = useMemo(() => {
    if (!featureSearch.trim()) return Object.entries(groups);
    const q = featureSearch.toLowerCase();
    return Object.entries(groups).reduce((acc, [group, items]) => {
      const groupMatch = group.toLowerCase().includes(q);
      const matchedItems = items.filter(
        (item) =>
          item.feature.toLowerCase().includes(q) ||
          String(item.value).toLowerCase().includes(q),
      );
      if (groupMatch && matchedItems.length === 0) {
        acc.push([group, items]);
      } else if (matchedItems.length > 0) {
        acc.push([group, matchedItems]);
      }
      return acc;
    }, []);
  }, [groups, featureSearch]);

  const totalFeatures = Object.values(groups).reduce(
    (sum, items) => sum + items.length,
    0,
  );
  const visibleFeatures = filteredGroups.reduce(
    (sum, [, items]) => sum + items.length,
    0,
  );

  return (
    <ModernCanvasShell
      title={widget.title || "Vehicle Features"}
      subtitle={`${variants.length} variants`}
      icon={Layers3}
      footer={footer}
    >
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* LEFT SIDEBAR — macOS Settings style */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-[18px] border border-slate-200/60 bg-white overflow-hidden">
            {/* Search */}
            <div className="p-3">
              <div className="relative">
                <Search
                  size={14}
                  strokeWidth={2}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={variantSearch}
                  onChange={(e) => setVariantSearch(e.target.value)}
                  placeholder="Search variants"
                  className="w-full rounded-[10px] bg-slate-100/80 py-2 pl-8 pr-7 text-[13px] font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-slate-100 transition-colors"
                />
                {variantSearch && (
                  <button
                    onClick={() => setVariantSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500"
                  >
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Variant List */}
            <div className="px-2 pb-2 space-y-0.5">
              {filteredVariants.map((variant) => {
                const globalIndex = variants.findIndex(
                  (v) => (v.id || v) === (variant.id || variant),
                );
                const isActive = globalIndex === selectedIndex;
                return (
                  <button
                    key={variant.id || globalIndex}
                    onClick={() => setSelectedIndex(globalIndex)}
                    className={`
                      w-full text-left rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors
                      ${isActive ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-50"}
                    `}
                  >
                    <span className="truncate block">
                      {valueFrom(
                        variant,
                        ["variant", "variantName", "name"],
                        `Variant ${globalIndex + 1}`,
                      )}
                    </span>
                  </button>
                );
              })}
              {filteredVariants.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-[13px] text-slate-400 font-medium">
                    No matches
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT — iOS Settings Grouped List Style */}
        <section className="min-w-0 space-y-6">
          {/* Header */}
          <div className="px-1">
            <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">
              {valueFrom(
                selected,
                ["variant", "variantName", "name"],
                "Unknown",
              )}
            </h2>
            <p className="mt-1 text-[15px] text-slate-500 font-normal">
              {visibleFeatures} features
              {featureSearch ? ` matching "${featureSearch}"` : ""}
            </p>
          </div>

          {/* Feature Search */}
          <div className="px-1">
            <div className="relative max-w-xs">
              <Search
                size={15}
                strokeWidth={2}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={featureSearch}
                onChange={(e) => setFeatureSearch(e.target.value)}
                placeholder="Search features"
                className="w-full rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-[14px] font-normal text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
              />
              {featureSearch && (
                <button
                  onClick={() => setFeatureSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500"
                >
                  <XCircle size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Groups */}
          {filteredGroups.length ? (
            filteredGroups.map(([group, items]) => (
              <div key={group} className="space-y-1.5">
                {/* Section Label */}
                <div className="px-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {group}
                  </p>
                </div>

                {/* Group Card */}
                <div className="rounded-[14px] border border-slate-200/70 bg-white overflow-hidden">
                  {items.map((item, i) => {
                    const isLast = i === items.length - 1;
                    const q = featureSearch.toLowerCase();
                    const isMatch =
                      q &&
                      (item.feature.toLowerCase().includes(q) ||
                        String(item.value).toLowerCase().includes(q));
                    return (
                      <div
                        key={`${group}-${item.feature}`}
                        className={`
                          flex items-center justify-between px-4 py-3.5 mx-4
                          ${!isLast ? "border-b border-slate-100" : ""}
                          ${isMatch ? "bg-indigo-50/30 -mx-4 px-8" : ""}
                          transition-colors
                        `}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-normal text-slate-900">
                            {featureSearch
                              ? highlightMatch(item.feature, featureSearch)
                              : item.feature}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0 max-w-[50%]">
                          <p
                            className={`text-[13px] font-medium text-right ${isMatch ? "text-indigo-700" : "text-slate-500"}`}
                          >
                            {featureSearch
                              ? highlightMatch(
                                  compactText(item.value),
                                  featureSearch,
                                )
                              : compactText(item.value)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center py-20">
              <Search size={32} strokeWidth={1.5} className="text-slate-300" />
              <p className="mt-3 text-[15px] text-slate-500 font-normal">
                No features match "{featureSearch}"
              </p>
              <button
                onClick={() => setFeatureSearch("")}
                className="mt-3 text-[13px] font-medium text-indigo-600 hover:text-indigo-700"
              >
                Clear Search
              </button>
            </div>
          )}
        </section>
      </div>
    </ModernCanvasShell>
  );
}

function highlightMatch(text, query) {
  if (!query.trim()) return text;
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${q})`, "gi");
  const parts = String(text).split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span
        key={i}
        className="rounded bg-indigo-100 px-0.5 font-black text-indigo-700"
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// ============================================================================
// REDESIGNED LOAN CANVASES
// ============================================================================

function LoanDisbursalReportCanvas({
  message,
  reportWidget,
  countWidget,
  onAction,
  footer,
}) {
  const rows = rowsFrom(reportWidget);
  const total =
    reportWidget.total ||
    reportWidget.summary?.total ||
    reportWidget.data?.total ||
    countWidget?.total ||
    countWidget?.summary?.total ||
    rows.length;
  const buckets = asArray(
    reportWidget.buckets ||
      reportWidget.data?.buckets ||
      reportWidget.summary?.buckets,
  );
  const shown = reportWidget.shown || reportWidget.data?.shown || rows.length;

  const columns = [
    { key: "customer", label: "Customer", keys: ["customerName", "customer"] },
    {
      key: "vehicle",
      label: "Vehicle",
      render: (row) =>
        [row.vehicleMake, row.vehicleModel, row.vehicleVariant]
          .filter(Boolean)
          .join(" ") || valueFrom(row, ["vehicle"], "—"),
    },
    {
      key: "bank",
      label: "Bank",
      keys: ["approval_bankName", "bankName", "bank"],
    },
    {
      key: "approved",
      label: "Approved",
      render: (row) =>
        formatCurrency(
          valueFrom(row, [
            "approval_loanAmountApproved",
            "approvedAmount",
            "loanAmount",
          ]),
        ),
    },
    {
      key: "disbursed",
      label: "Disbursed",
      render: (row) =>
        formatCurrency(
          valueFrom(row, ["approval_loanAmountDisbursed", "disbursedAmount"]),
        ),
    },
    {
      key: "status",
      label: "Status",
      keys: ["approval_status", "status", "currentStage"],
    },
  ];

  return (
    <ModernCanvasShell
      title="Loan Disbursals"
      subtitle="Approved but not yet disbursed loans"
      icon={Banknote}
      footer={footer}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ModernStatCard
          icon={Banknote}
          label="Total Pending"
          value={total}
          tone="warning"
          subtext="Awaiting disbursal"
        />
        <ModernStatCard
          icon={TrendingUp}
          label="Shown"
          value={shown}
          tone="default"
          subtext={`of ${total} total`}
        />
        <ModernStatCard
          label="Complete"
          value={`${Math.round((shown / total) * 100)}%`}
          tone="success"
        />
        <ModernStatCard
          label="Actions Needed"
          value={total - shown}
          tone="danger"
        />
      </div>

      {buckets.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {buckets.slice(0, 3).map((bucket) => (
            <motion.div
              key={bucket.key || bucket.label}
              whileHover={{ y: -4 }}
              className="rounded-xl border border-slate-200/30 bg-gradient-to-br from-slate-50/50 to-slate-100/50 p-4"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {humanize(bucket.label || bucket.name || bucket.key)}
              </p>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {bucket.count ?? bucket.total ?? 0}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      <ModernTable columns={columns} rows={rows} />
    </ModernCanvasShell>
  );
}

function LoanBusinessReportCanvas({ message, widget, footer }) {
  const summary = widget.summary || widget.data?.summary || {};
  const sections = asArray(widget.sections || widget.data?.sections);
  const recordsBySection =
    widget.recordsBySection || widget.data?.recordsBySection || {};
  const [activeSection, setActiveSection] = useState(
    sections[0]?.key || sections[0]?.id || Object.keys(recordsBySection)[0],
  );

  const totalBusiness =
    summary.totalBusinessAmount ??
    numberFrom(summary.loanDisbursedAmount) +
      numberFrom(summary.cashCarBookValue) +
      numberFrom(summary.insurancePremiumAmount);

  const activeRecords = asArray(
    recordsBySection[activeSection] ||
      sections.find((section) => (section.key || section.id) === activeSection)
        ?.records ||
      widget.records ||
      widget.rows,
  );

  const columns = [
    { key: "customer", label: "Customer", keys: ["customerName", "customer"] },
    {
      key: "vehicle",
      label: "Vehicle",
      render: (row) =>
        [
          row.vehicleMake,
          row.vehicleModel,
          row.vehicleVariant,
          row.make,
          row.model,
        ]
          .filter(Boolean)
          .join(" ") || "—",
    },
    {
      key: "date",
      label: "Date",
      render: (row) =>
        formatDate(
          valueFrom(row, [
            "businessDate",
            "disbursedDate",
            "deliveryDate",
            "newIssueDate",
            "updatedAt",
          ]),
        ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) =>
        formatCurrency(
          valueFrom(row, [
            "amount",
            "businessAmount",
            "loanAmount",
            "premium",
            "bookValue",
          ]),
        ),
    },
  ];

  return (
    <ModernCanvasShell
      title="Business Report"
      subtitle="Summary of all business transactions this month"
      icon={WalletCards}
      footer={footer}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ModernStatCard
          icon={WalletCards}
          label="Total Business"
          value={formatCurrency(totalBusiness)}
          tone="success"
        />
        <ModernStatCard
          icon={Banknote}
          label="Loans"
          value={formatCurrency(summary.loanDisbursedAmount || 0)}
          tone="default"
        />
        <ModernStatCard
          icon={Car}
          label="Cash Cars"
          value={formatCurrency(summary.cashCarBookValue || 0)}
          tone="warning"
        />
        <ModernStatCard
          icon={BadgeCheck}
          label="Insurance"
          value={formatCurrency(summary.insurancePremiumAmount || 0)}
          tone="purple"
        />
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => {
          const key = section.key || section.id;
          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.05 }}
              onClick={() => setActiveSection(key)}
              className={`
                px-6 py-2.5 rounded-xl font-bold transition-all
                ${
                  activeSection === key
                    ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/50"
                    : "bg-white/50 border border-slate-200/30 text-slate-700 hover:bg-white"
                }
              `}
            >
              {section.title || section.label}
            </motion.button>
          );
        })}
      </div>

      <ModernTable columns={columns} rows={activeRecords} />
    </ModernCanvasShell>
  );
}

function LoanClosureCanvas({ widget, onAction, footer }) {
  const data = widget.data || widget.summary || widget;
  const approx = valueFrom(
    data,
    ["approxClosure", "approxClosureAmount", "principalOutstanding"],
    "—",
  );
  const actions = asArray(widget.actions || data.actions);

  const fields = [
    ["Customer", valueFrom(data, ["customerName", "customer"])],
    ["Vehicle", valueFrom(data, ["vehicle", "vehicleName", "model"])],
    ["Registration", valueFrom(data, ["registrationNumber", "registration"])],
    ["Bank", valueFrom(data, ["bank", "loanBank", "bankName"])],
    [
      "Disbursed",
      formatCurrency(valueFrom(data, ["disbursedAmount", "principal"])),
    ],
    ["ROI", valueFrom(data, ["roi", "annualRate"], "—")],
    ["Tenure", valueFrom(data, ["tenureMonths", "tenure"], "—")],
    ["EMI", formatCurrency(valueFrom(data, ["emi"]))],
  ];

  return (
    <ModernCanvasShell
      title="Loan Closure"
      subtitle="Estimated closure amount based on current EMI schedule"
      icon={Banknote}
      actions={actions}
      onAction={onAction}
      footer={footer}
    >
      {/* Main amount */}
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="relative rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white overflow-hidden"
      >
        <div className="absolute -right-16 -top-16 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <p className="text-sm font-bold uppercase tracking-widest opacity-90">
            Outstanding Amount
          </p>
          <p className="text-5xl font-black mt-2">{formatCurrency(approx)}</p>
          <p className="text-sm opacity-80 mt-3">
            Calculated assuming all EMIs paid on time
          </p>
        </div>
      </motion.div>

      {/* Details grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <motion.div
            key={label}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-slate-200/30 bg-gradient-to-br from-slate-50/50 to-slate-100/50 p-4"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {label}
            </p>
            <p className="text-lg font-black text-slate-900 mt-2">{value}</p>
          </motion.div>
        ))}
      </div>
    </ModernCanvasShell>
  );
}

// ============================================================================
// MISC CANVASES
// ============================================================================

function AmbiguityCanvas({ message, onAmbiguitySelect, footer }) {
  const ambiguity =
    message?.ambiguity ||
    findWidget(message, "ambiguity")?.data ||
    findWidget(message, "ambiguity");
  const options = asArray(ambiguity?.options);

  return (
    <ModernCanvasShell
      title="Multiple Matches Found"
      subtitle="Please clarify which one you meant"
      icon={SearchCheck}
      footer={footer}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {options.map((option, index) => (
          <motion.button
            key={option.id || index}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAmbiguitySelect?.(option, message)}
            className={`
              text-left rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-50/70 to-orange-50/70
              p-6 transition-all ${SHADOWS.md} hover:border-amber-300/70 hover:shadow-lg
            `}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <p className="font-bold text-slate-900">
                {option.displayName ||
                  option.customerName ||
                  option.name ||
                  "Option"}
              </p>
              <Zap size={20} className="text-amber-600" />
            </div>

            <p className="text-sm text-slate-600 mb-3">
              {option.vehicle ||
                [option.make, option.model, option.variant]
                  .filter(Boolean)
                  .join(" ") ||
                "Vehicle not listed"}
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                option.registrationNumber && {
                  label: option.registrationNumber,
                },
                option.module && { label: option.module },
                option.status && { label: option.status },
              ]
                .filter(Boolean)
                .map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-lg bg-white/60 text-xs font-bold text-slate-700"
                  >
                    {tag.label}
                  </span>
                ))}
            </div>
          </motion.button>
        ))}
      </div>
    </ModernCanvasShell>
  );
}

function EmptyWorkspace({ onAsk }) {
  const prompts = [
    "Verna pricelist",
    "Show colors of Verna",
    "Approved loans this month",
    "Total business",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border border-slate-200/30 ${MODERN_COLORS.backgrounds.card} p-12 text-center ${SHADOWS.lg}`}
    >
      <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white mb-6">
        <Sparkles size={40} strokeWidth={1.5} />
      </div>

      <h2 className="text-3xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
        ACI Assist Ready
      </h2>
      <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
        Ask any question about vehicles, loans, or business metrics. Results
        will appear here instantly.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 max-w-xl mx-auto">
        {prompts.map((prompt) => (
          <motion.button
            key={prompt}
            whileHover={{ scale: 1.05, y: -2 }}
            onClick={() => onAsk?.(prompt)}
            className={`
              rounded-xl border border-slate-200/30 bg-white/50 px-4 py-3 text-sm font-bold
              text-slate-700 transition-all hover:bg-white hover:border-violet-300/50 hover:text-violet-700
            `}
          >
            {prompt}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function LoadingWorkspace() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-3xl border border-slate-200/30 ${MODERN_COLORS.backgrounds.card} p-12 ${SHADOWS.lg}`}
    >
      <div className="flex items-center gap-4 mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white"
        >
          <Sparkles size={24} />
        </motion.div>
        <div>
          <p className="font-bold text-slate-900">Fetching Results...</p>
          <p className="text-sm text-slate-600">Processing your query</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            className="h-32 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200"
          />
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AgentWorkspaceCanvas({
  message,
  loading,
  onAsk,
  onAction,
  onFollowUp,
  onAmbiguitySelect,
  showQueryPlan,
}) {
  const footerProps = useMemo(
    () => ({
      message,
      showQueryPlan,
      onFollowUp,
    }),
    [message, showQueryPlan, onFollowUp],
  );

  const widgets = useMemo(() => asArray(message?.widgets), [message?.widgets]);

  if (loading) {
    return <LoadingWorkspace />;
  }

  if (!message) {
    return <EmptyWorkspace onAsk={onAsk} />;
  }

  if (message.ambiguity || findWidget(message, "ambiguity")) {
    return (
      <AmbiguityCanvas
        message={message}
        onAmbiguitySelect={onAmbiguitySelect}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const pricelist = findWidget(message, "vehicle_pricelist");
  if (pricelist) {
    return (
      <VehiclePricelistCanvas
        message={message}
        widget={pricelist}
        onAction={onAction}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const colors = findAnyWidget(message, [
    "vehicle_colors",
    "vehicle_colors_gallery",
  ]);
  if (colors) {
    return (
      <VehicleColorsCanvas
        message={message}
        widget={colors}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const featureAnswer = findAnyWidget(message, [
    "vehicle_feature_answer",
    "feature_answer",
  ]);
  if (featureAnswer) {
    return (
      <VehicleFeatureAnswerCanvas
        message={message}
        widget={featureAnswer}
        onAction={onAction}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const features = findWidget(message, "vehicle_features");
  if (features) {
    return (
      <VehicleFeaturesCanvas
        message={message}
        widget={features}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const disbursal = findWidget(message, "loan_disbursal_report");
  if (disbursal || message.intent === "loan_disbursal_report") {
    return (
      <LoanDisbursalReportCanvas
        message={message}
        reportWidget={disbursal}
        countWidget={findWidget(message, "count_summary")}
        onAction={onAction}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const business = findWidget(message, "loan_business_report");
  if (business) {
    return (
      <LoanBusinessReportCanvas
        message={message}
        widget={business}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  const closure = findWidget(message, "loan_closure_card");
  if (closure) {
    return (
      <LoanClosureCanvas
        widget={closure}
        onAction={onAction}
        footer={<ModernCanvasFooter {...footerProps} />}
      />
    );
  }

  // Fallback
  const generic = widgets.find((widget) => rowsFrom(widget).length) ||
    widgets[0] || { type: message.intent, title: message.intent, rows: [] };

  return (
    <AnimatePresence mode="wait">
      <ModernCanvasShell
        key={`${message.id}-${widgets.length}`}
        title={generic.title || "Results"}
        subtitle="Here are your results"
        footer={<ModernCanvasFooter {...footerProps} />}
      >
        <p className="text-slate-600">
          No specific renderer for this widget type.
        </p>
      </ModernCanvasShell>
    </AnimatePresence>
  );
}
