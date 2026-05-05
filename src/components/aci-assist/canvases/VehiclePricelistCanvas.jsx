import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ModernCanvasShell } from "./BaseComponents";
import {
  Banknote,
  Car,
  CheckCircle2,
  ChevronRight,
  DatabaseZap,
  Info,
  MapPin,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { formatDate, humanize, asArray } from "../utils";

import {
  rowsFrom,
  valueFrom,
  compactText,
  getRowKey,
  getVariantName,
  getFuelTransmission,
  getPriceParts,
  calculateEmi,
  formatAmount,
} from "../canvas-utils";

const IMAGE_KEYS = [
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
  "colorImage",
  "color_image",
  "swatchImage",
  "photo",
  "url",
  "src",
];

const MODEL_IMAGE_MAP = {
  "hyundai verna": "/aci-cars/hyundai-verna.png",
  "tata safari": "/aci-cars/tata-safari.png",
  "kia seltos": "/aci-cars/kia-seltos.png",
  "hyundai creta": "/aci-cars/hyundai-creta.png",
  "honda city": "/aci-cars/honda-city.png",
  "skoda slavia": "/aci-cars/skoda-slavia.png",
};

const featureHeading = (index) => {
  if (index === 0) return "Perfect balance";
  if (index === 1) return "Premium comfort";
  if (index === 2) return "Advanced safety";
  return "Smart convenience";
};

const isUsableImageUrl = (value, loose = false) => {
  if (!value || typeof value !== "string") return false;

  const text = value.trim();

  if (/^(data:image\/|blob:)/i.test(text)) return true;

  if (/^https?:\/\//i.test(text)) {
    return (
      loose ||
      /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(text) ||
      /\/(image|images|img|photo|photos|media|cdn|upload|uploads)\//i.test(
        text,
      ) ||
      /cloudinary|imgix|unsplash|googleusercontent|cardekho|carwale|acko|spinny|cars24/i.test(
        text,
      )
    );
  }

  if (/^(\/|\.\/|\.\.\/)/.test(text)) {
    return loose || /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(text);
  }

  return false;
};

const extractKnownImage = (value, depth = 0) => {
  if (!value || depth > 6) return "";

  if (typeof value === "string") {
    return isUsableImageUrl(value, true) ? value.trim() : "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractKnownImage(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof value === "object") {
    for (const key of IMAGE_KEYS) {
      const found = extractKnownImage(value[key], depth + 1);
      if (found) return found;
    }
  }

  return "";
};

const extractImageLikeUrl = (value, depth = 0) => {
  if (!value || depth > 6) return "";

  if (typeof value === "string") {
    return isUsableImageUrl(value, false) ? value.trim() : "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractImageLikeUrl(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof value === "object") {
    for (const nestedValue of Object.values(value)) {
      const found = extractImageLikeUrl(nestedValue, depth + 1);
      if (found) return found;
    }
  }

  return "";
};

const widgetTypeOf = (item = {}) =>
  String(item.type || item.widgetType || item.name || "").toLowerCase();

function PremiumCarFallback({ title }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="absolute inset-x-8 bottom-5 h-8 rounded-full bg-slate-500/20 blur-xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="relative flex h-20 w-44 items-center justify-center rounded-[36px] bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#020617] text-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.8)] sm:h-24 sm:w-52 sm:rounded-[42px]"
      >
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#93c5fd]/20 blur-2xl" />
        <Car size={62} strokeWidth={1.25} />
        <span className="sr-only">{title}</span>
      </motion.div>
    </div>
  );
}

function PremiumCarMedia({
  image,
  imageFailed,
  onImageError,
  title,
  mode = "hero",
}) {
  const isRail = mode === "rail";

  const frameClass = isRail
    ? "h-52 sm:h-56 xl:h-60"
    : "h-44 min-h-[190px] sm:min-h-[230px] md:min-h-[260px]";

  return (
    <div className="h-full overflow-hidden rounded-[24px] border border-[#dbe3ef] bg-[radial-gradient(circle_at_50%_42%,#ffffff_0%,#f8fafc_38%,#eaf2ff_100%)]">
      <div className={`relative ${frameClass}`}>
        <div className="absolute inset-x-8 bottom-5 h-8 rounded-full bg-slate-500/20 blur-xl" />

        {image && !imageFailed ? (
          <motion.img
            key={image}
            src={image}
            alt={title}
            onError={onImageError}
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="
              absolute inset-0
              h-full w-full
              object-contain object-center
              p-2
              mix-blend-multiply
              drop-shadow-[0_22px_26px_rgba(15,23,42,0.22)]
              sm:p-3
              xl:p-2
            "
          />
        ) : (
          <PremiumCarFallback title={title} />
        )}

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent_44%,rgba(255,255,255,0.08))]" />
      </div>
    </div>
  );
}

function RangePointCard({
  label,
  variant,
  price,
  active,
  align = "left",
  onClick,
}) {
  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";

  return (
    <motion.button
      type="button"
      layout
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`min-w-0 rounded-[18px] border px-3 py-3 ${alignClass} transition ${
        active
          ? "border-[#bfdbfe] bg-[#eff6ff] ring-1 ring-[#bfdbfe] shadow-[0_18px_40px_-28px_rgba(37,99,235,0.45)]"
          : "border-[#dbe3ef] bg-[#f8fafc] hover:border-[#2563eb] hover:bg-[#eff6ff]"
      }`}
    >
      <p
        className={`truncate text-xs font-black sm:text-sm ${
          active ? "text-[#2563eb]" : "text-[#64748b]"
        }`}
      >
        {price}
      </p>

      <p
        className={`mt-1 truncate text-[11px] font-semibold sm:text-xs ${
          active ? "text-[#2563eb]" : "text-[#64748b]"
        }`}
        title={variant}
      >
        {variant}
      </p>

      <p
        className={`mt-1 text-[10px] font-black uppercase tracking-wide ${
          active ? "text-[#1e40af]" : "text-[#94a3b8]"
        }`}
      >
        {label}
      </p>
    </motion.button>
  );
}

function SelectedVariantCard({
  titleModel,
  selectedVariantName,
  selectedRow,
  selectedParts,
  city,
  stableCarImage,
  imageFailed,
  setImageFailed,
}) {
  return (
    <div className="rounded-[24px] border border-[#dbe3ef] bg-white/94 p-4 shadow-[0_22px_70px_-58px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:rounded-[26px] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-black text-[#0f172a] sm:text-base">
          Selected variant
        </h3>

        <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live
        </span>
      </div>

      <h4 className="mt-4 text-lg font-black text-[#0f172a] sm:mt-5 sm:text-xl">
        {selectedVariantName}
      </h4>

      <p className="mt-1 text-sm font-semibold text-[#64748b]">
        {getFuelTransmission(selectedRow) || "Fuel / transmission details"}
      </p>

      <div className="mt-4">
        <PremiumCarMedia
          image={stableCarImage}
          imageFailed={imageFailed}
          onImageError={() => setImageFailed(true)}
          title={titleModel}
          mode="rail"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${selectedVariantName}-${selectedParts.onRoad}`}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mt-5 border-t border-[#e2e8f0] pt-5"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#64748b]">
            Est. on-road price ({humanize(city)})
          </p>

          <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#2563eb] sm:text-3xl">
            {formatAmount(selectedParts.onRoad)}
            <Info size={16} className="ml-2 inline text-[#94a3b8]" />
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function EmiCard({
  selectedRowKey,
  selectedEmi,
  onAction,
  brand,
  model,
  selectedVariantName,
}) {
  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="rounded-[24px] border border-[#dbe3ef] bg-white/94 p-4 shadow-[0_22px_70px_-58px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:rounded-[26px] sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-[#0f172a] sm:text-base">
            Estimated EMI
          </h3>
          <p className="mt-1 text-xs font-semibold text-[#64748b]">
            90% loan · 8.75% · 3 years
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe]">
          <Banknote size={19} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedRowKey}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <p className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#0f172a] sm:text-3xl">
            {formatAmount(selectedEmi.emi)}
            <span className="ml-1 text-sm font-bold text-[#64748b]">
              /month
            </span>
          </p>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-semibold text-[#64748b]">Loan amount</span>
              <span className="font-black text-[#0f172a]">
                {formatAmount(selectedEmi.principal)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-semibold text-[#64748b]">
                Total interest
              </span>
              <span className="font-black text-[#0f172a]">
                {formatAmount(selectedEmi.totalInterest)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-semibold text-[#64748b]">
                Total payable
              </span>
              <span className="font-black text-[#0f172a]">
                {formatAmount(selectedEmi.totalPayable)}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={() =>
          onAction?.({
            type: "show_more_inline",
            message: `Calculate EMI for ${[brand, model, selectedVariantName]
              .filter(Boolean)
              .join(" ")}`,
            label: "View EMI options",
          })
        }
        className="mt-4 inline-flex items-center gap-1 text-xs font-black text-[#2563eb] hover:text-[#1d4ed8]"
      >
        View EMI options <ChevronRight size={14} />
      </button>
    </motion.div>
  );
}

function WhyVariantCard({
  selectedRowKey,
  selectedFeatures,
  onAction,
  brand,
  model,
  selectedVariantName,
}) {
  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="rounded-[24px] border border-[#dbe3ef] bg-white/94 p-4 shadow-[0_22px_70px_-58px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:rounded-[26px] sm:p-5"
    >
      <h3 className="text-sm font-black text-[#0f172a] sm:text-base">
        Why this variant stands out
      </h3>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedRowKey}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mt-4 space-y-4 sm:mt-5 sm:space-y-5"
        >
          {selectedFeatures.map((feature, index) => {
            const icons = [Sparkles, Car, ShieldCheck, CheckCircle2];
            const Icon = icons[index % icons.length];

            return (
              <motion.div
                key={`${feature}-${index}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: index * 0.04,
                  type: "spring",
                  stiffness: 260,
                  damping: 24,
                }}
                className="flex gap-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe]">
                  <Icon size={18} />
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-black text-[#0f172a]">
                    {featureHeading(index)}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[#64748b]">
                    {feature}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={() =>
          onAction?.({
            type: "show_more_inline",
            message: `Show full features for ${[
              brand,
              model,
              selectedVariantName,
            ]
              .filter(Boolean)
              .join(" ")}`,
            label: "View full features",
          })
        }
        className="mt-5 inline-flex items-center gap-1 text-sm font-black text-[#2563eb] hover:text-[#1d4ed8] sm:mt-6"
      >
        View full features <ChevronRight size={15} />
      </button>
    </motion.div>
  );
}

function PriceRangeCard({
  total,
  model,
  baseRow,
  selectedRow,
  topRow,
  selectedIndex,
  selectedVariantName,
  selectedParts,
  basePercent,
  selectedPercent,
  topPercent,
  sortedRows,
  setSelectedRowKey,
  onAction,
}) {
  const baseParts = getPriceParts(baseRow);
  const topParts = getPriceParts(topRow);

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="rounded-[24px] border border-[#dbe3ef] bg-white/92 p-4 shadow-[0_22px_70px_-58px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:rounded-[26px] sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-[#0f172a]">Price range</h3>
          <p className="mt-1 text-sm font-semibold text-[#64748b]">
            Base, selected and top variant price context.
          </p>
        </div>

        <span className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1 text-[11px] font-black text-[#1e40af]">
          {total} variants
        </span>
      </div>

      <div className="mt-6 rounded-[22px] border border-[#e2e8f0] bg-[#f8fafc] p-4 sm:rounded-[24px] sm:p-5">
        <div className="relative h-3 rounded-full bg-[#dbe3ef]">
          <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-[linear-gradient(90deg,#94a3b8_0%,#2563eb_50%,#1e293b_100%)] opacity-90" />

          <button
            type="button"
            onClick={() => setSelectedRowKey(getRowKey(baseRow, 0))}
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#64748b] shadow"
            style={{ left: `${basePercent}%` }}
            title={getVariantName(baseRow)}
          />

          <motion.button
            type="button"
            onClick={() =>
              setSelectedRowKey(getRowKey(selectedRow, selectedIndex))
            }
            className="absolute top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[7px] border-white bg-[#2563eb] shadow-[0_14px_34px_-14px_rgba(37,99,235,0.95)]"
            animate={{ left: `${selectedPercent}%` }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            title={selectedVariantName}
          />

          <button
            type="button"
            onClick={() =>
              setSelectedRowKey(getRowKey(topRow, sortedRows.length - 1))
            }
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#1e293b] shadow"
            style={{ left: `${topPercent}%` }}
            title={getVariantName(topRow)}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
        <RangePointCard
          label="Base"
          variant={getVariantName(baseRow)}
          price={formatAmount(baseParts.onRoad || baseParts.exShowroom)}
          onClick={() => setSelectedRowKey(getRowKey(baseRow, 0))}
          align="left"
        />

        <RangePointCard
          label="Selected"
          variant={selectedVariantName}
          price={formatAmount(selectedParts.onRoad || selectedParts.exShowroom)}
          active
          onClick={() =>
            setSelectedRowKey(getRowKey(selectedRow, selectedIndex))
          }
          align="center"
        />

        <RangePointCard
          label="Top"
          variant={getVariantName(topRow)}
          price={formatAmount(topParts.onRoad || topParts.exShowroom)}
          onClick={() =>
            setSelectedRowKey(getRowKey(topRow, sortedRows.length - 1))
          }
          align="right"
        />
      </div>

      <div className="mt-6 flex items-center justify-center">
        <button
          type="button"
          onClick={() =>
            onAction?.({
              type: "show_more_inline",
              message: `Compare ${model} variants`,
              label: "Compare all variants",
            })
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-black text-[#2563eb] transition hover:border-[#2563eb] hover:bg-[#eff6ff] sm:w-auto sm:min-w-[240px]"
        >
          Compare all variants <ChevronRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function MobileHeroCard({
  titleModel,
  model,
  city,
  formattedUpdatedDate,
  selectedVariantName,
  selectedRow,
  selectedParts,
  stableCarImage,
  imageFailed,
  setImageFailed,
}) {
  return (
    <div className="rounded-[28px] border border-[#dbe3ef] bg-white/94 p-4 shadow-[0_22px_70px_-58px_rgba(15,23,42,0.38)] backdrop-blur-xl xl:hidden">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,0.95fr)_minmax(210px,0.68fr)] sm:items-stretch">
        <PremiumCarMedia
          image={stableCarImage}
          imageFailed={imageFailed}
          onImageError={() => setImageFailed(true)}
          title={titleModel}
          mode="hero"
        />

        <div className="rounded-[22px] border border-[#dbe3ef] bg-[#f8fafc]/90 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748b]">
              Selected variant
            </p>

            <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>

          <p className="mt-3 text-lg font-black leading-tight text-[#0f172a]">
            {selectedVariantName}
          </p>

          <p className="mt-1 text-sm font-semibold text-[#64748b]">
            {getFuelTransmission(selectedRow) || "Fuel / transmission details"}
          </p>

          <div className="mt-5 border-t border-[#e2e8f0] pt-5">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#64748b]">
              Est. on-road price
            </p>

            <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#2563eb]">
              {formatAmount(selectedParts.onRoad)}
            </p>

            <p className="mt-1 text-xs font-semibold text-[#94a3b8]">
              {humanize(city)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2563eb]">
            Pricelist
          </p>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1 text-[11px] font-black text-[#1e40af]">
            <MapPin size={12} />
            {humanize(city)}
          </span>
        </div>

        <h3 className="mt-2 font-serif text-3xl font-semibold leading-tight tracking-[-0.055em] text-[#0f172a]">
          {compactText(model) || "Vehicle"} pricelist
        </h3>

        <p className="mt-1 text-sm font-semibold leading-6 text-[#64748b]">
          Estimated on-road prices in {compactText(city || "Delhi")}.
        </p>

        <p className="mt-1 text-sm font-semibold leading-6 text-[#64748b]">
          Updated {compactText(formattedUpdatedDate)}. Tap any variant card to update EMI,
          range and recommendation details.
        </p>
      </div>
    </div>
  );
}

function MobileVariantBreakupCard({
  row,
  index,
  selectedRowKey,
  setSelectedRowKey,
  openBreakupKey,
  setOpenBreakupKey,
}) {
  const rowKey = getRowKey(row, index);
  const parts = getPriceParts(row);
  const isSelected = rowKey === selectedRowKey;

  const lines = [
    ["Ex-showroom", parts.exShowroom],
    ["RTO", parts.rto],
    ["Insurance", parts.insurance],
    ["Other", parts.listTotal],
  ];

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.985 }}
      onClick={() => setSelectedRowKey(rowKey)}
      className={`rounded-[24px] border p-4 transition ${
        isSelected
          ? "border-[#93c5fd] bg-[#eff6ff] shadow-[0_18px_45px_-34px_rgba(37,99,235,0.45)]"
          : "border-[#dbe3ef] bg-white hover:border-[#93c5fd] hover:bg-[#eff6ff]/55"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            isSelected
              ? "border-[#2563eb] bg-[#2563eb]"
              : "border-[#94a3b8] bg-white"
          }`}
        >
          {isSelected ? (
            <span className="h-2 w-2 rounded-full bg-white" />
          ) : null}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-black ${
              isSelected ? "text-[#2563eb]" : "text-[#0f172a]"
            }`}
          >
            {compactText(getVariantName(row))}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-[#64748b]">
            {getFuelTransmission(row) || "Fuel / transmission"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-[#e2e8f0] bg-white/80 p-3">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-[#64748b]">
          Price breakup
        </p>

        <div className="space-y-2">
          {lines.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span className="font-semibold text-[#64748b]">{label}</span>
              <span className="font-black text-[#0f172a]">
                {value ? formatAmount(value) : "—"}
              </span>
            </div>
          ))}
        </div>

        {parts.listItems.length ? (
          <div className="mt-3 border-t border-[#e2e8f0] pt-3">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpenBreakupKey(openBreakupKey === rowKey ? null : rowKey);
              }}
              className="flex w-full items-center justify-between gap-3 text-xs"
            >
              <span className="font-bold text-[#2563eb]">
                {openBreakupKey === rowKey
                  ? "Hide other charges"
                  : "View other charges"}
              </span>
              <ChevronRight
                size={14}
                className={`text-[#2563eb] transition ${
                  openBreakupKey === rowKey ? "rotate-90" : ""
                }`}
              />
            </button>

            {openBreakupKey === rowKey ? (
              <div className="mt-3 space-y-1.5">
                {parts.listItems.map((item, itemIndex) => (
                  <div
                    key={`${item.label}-${itemIndex}`}
                    className="flex justify-between gap-3 text-xs"
                  >
                    <span className="font-semibold text-[#64748b]">
                      {item.label}
                    </span>
                    <span className="font-black text-[#0f172a]">
                      {formatAmount(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-[18px] bg-[#eff6ff] px-4 py-3">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-[#1e40af]">
          Est. on-road
        </span>
        <span className="text-lg font-black text-[#2563eb]">
          {formatAmount(parts.onRoad)}
        </span>
      </div>
    </motion.div>
  );
}

export function VehiclePricelistCanvas({ message, widget, onAction, footer }) {
  const rows = rowsFrom(widget);
  const [openBreakupKey, setOpenBreakupKey] = useState(null);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aPrice = getPriceParts(a).exShowroom || Number.MAX_SAFE_INTEGER;
      const bPrice = getPriceParts(b).exShowroom || Number.MAX_SAFE_INTEGER;
      return aPrice - bPrice;
    });
  }, [rows]);

  const suggestedIndex = Math.max(
    0,
    sortedRows.findIndex((row) => {
      const name = getVariantName(row).toLowerCase();
      return (
        row.recommended ||
        row.bestValue ||
        name.includes("sx turbo") ||
        name.includes("best") ||
        name.includes("s 1.5")
      );
    }),
  );

  const defaultSelectedKey = getRowKey(
    sortedRows[suggestedIndex] || sortedRows[0] || {},
    suggestedIndex,
  );

  const [selectedRowKey, setSelectedRowKey] = useState(defaultSelectedKey);

  useEffect(() => {
    if (!sortedRows.length) return;

    const stillExists = sortedRows.some(
      (row, index) => getRowKey(row, index) === selectedRowKey,
    );

    if (!stillExists) setSelectedRowKey(defaultSelectedKey);
  }, [sortedRows, selectedRowKey, defaultSelectedKey]);

  const selectedIndex = Math.max(
    0,
    sortedRows.findIndex(
      (row, index) => getRowKey(row, index) === selectedRowKey,
    ),
  );

  const selectedRow = sortedRows[selectedIndex] || sortedRows[0] || {};
  const baseRow = sortedRows[0] || {};
  const topRow = sortedRows[sortedRows.length - 1] || {};

  const selectedParts = getPriceParts(selectedRow);
  const selectedEmi = calculateEmi(selectedRow);

  const total =
    widget.total ||
    widget.totalCount ||
    widget.data?.total ||
    sortedRows.length;

  const city =
    widget.city ||
    widget.data?.city ||
    valueFrom(selectedRow, ["city", "citySlug"], "Delhi");

  const model =
    widget.model ||
    widget.data?.model ||
    valueFrom(selectedRow, ["model"], message?.entities?.model || "Vehicle");

  const brand =
    widget.brand ||
    widget.data?.brand ||
    valueFrom(selectedRow, ["brand", "make"], "");

  const lastUpdated =
    widget.lastUpdated ||
    widget.data?.lastUpdated ||
    valueFrom(selectedRow, ["LastSeenDate", "updatedAt"], "");

  const openAction = asArray(widget.actions).find((action) =>
    /pricelist|price/i.test(action.label || action.type || ""),
  );

  const stableCarImage = useMemo(() => {
    const readImage = (item) =>
      valueFrom(
        item,
        [
          "imageUrl",
          "image_url",
          "image",
          "heroImage",
          "heroImageUrl",
          "vehicleImage",
          "vehicleImageUrl",
          "thumbnail",
          "thumbnailUrl",
          "carImage",
          "car_image",
          "colorImage",
          "color_image",
          "photo",
          "url",
          "src",
        ],
        "",
      );

    const looksLikeImage = (url) => {
      if (!url || typeof url !== "string") return false;

      const text = url.trim();

      return (
        /^(data:image\/|blob:)/i.test(text) ||
        /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i.test(text) ||
        /cloudinary|imgix|googleusercontent|cardekho|carwale|acko|spinny|cars24|cdn|uploads|images/i.test(
          text,
        )
      );
    };

    const findImageIn = (value, depth = 0) => {
      if (!value || depth > 6) return "";

      if (typeof value === "string") {
        return looksLikeImage(value) ? value.trim() : "";
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          const found = findImageIn(item, depth + 1);
          if (found) return found;
        }
        return "";
      }

      if (typeof value === "object") {
        const direct = readImage(value);
        if (looksLikeImage(direct)) return direct.trim();

        for (const nestedValue of Object.values(value)) {
          const found = findImageIn(nestedValue, depth + 1);
          if (found) return found;
        }
      }

      return "";
    };

    const allWidgets = asArray(message?.widgets);

    const colorsWidget = allWidgets.find((item) => {
      const type = String(
        item?.type || item?.widgetType || item?.name || "",
      ).toLowerCase();
      return [
        "vehicle_colors",
        "vehicle_colors_gallery",
        "vehicle_color_search",
      ].includes(type);
    });

    const colorRows = rowsFrom(colorsWidget);

    for (const color of colorRows) {
      const image = findImageIn(color);
      if (image) return image;
    }

    const imageFromColorsWidget = findImageIn(colorsWidget);
    if (imageFromColorsWidget) return imageFromColorsWidget;

    const imageFromPricelist = findImageIn(widget);
    if (imageFromPricelist) return imageFromPricelist;

    for (const row of sortedRows) {
      const image = findImageIn(row);
      if (image) return image;
    }

    const modelKey = [brand, model].filter(Boolean).join(" ").toLowerCase();

    const slug = [brand, model]
      .filter(Boolean)
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return MODEL_IMAGE_MAP[modelKey] || (slug ? `/aci-cars/${slug}.png` : "");
  }, [message?.widgets, widget, sortedRows, brand, model]);

  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [stableCarImage]);

  const rangeValues = sortedRows
    .map((row) => getPriceParts(row).onRoad || getPriceParts(row).exShowroom)
    .filter((value) => value > 0);

  const minRange = rangeValues.length ? Math.min(...rangeValues) : 0;
  const maxRange = rangeValues.length ? Math.max(...rangeValues) : 0;

  const getRangePercent = (row) => {
    const value = getPriceParts(row).onRoad || getPriceParts(row).exShowroom;

    if (!minRange || !maxRange || maxRange === minRange) return 50;

    return Math.min(
      94,
      Math.max(6, ((value - minRange) / (maxRange - minRange)) * 100),
    );
  };

  const selectedPercent = getRangePercent(selectedRow);
  const basePercent = getRangePercent(baseRow);
  const topPercent = getRangePercent(topRow);

  const selectedFeaturesRaw =
    selectedRow.keyFeatures ||
    selectedRow.features ||
    selectedRow.topFeatures ||
    selectedRow.highlights ||
    selectedRow.featureHighlights ||
    selectedRow.usp ||
    selectedRow.reason ||
    selectedRow.matchedReason;

  const selectedFeatures = useMemo(() => {
    const fallback = [
      "Balanced performance, features and efficiency for daily use.",
      "Premium comfort and convenience features for city and highway drives.",
      "Strong safety package with confidence-focused ownership value.",
      "Smart feature mix that keeps this variant practical and premium.",
    ];

    let parsed = [];

    if (Array.isArray(selectedFeaturesRaw)) {
      parsed = selectedFeaturesRaw
        .map((item) => compactText(item))
        .filter(Boolean);
    } else if (selectedFeaturesRaw && typeof selectedFeaturesRaw === "object") {
      parsed = Object.entries(selectedFeaturesRaw)
        .filter(
          ([, value]) =>
            value !== false &&
            value !== null &&
            value !== undefined &&
            value !== "",
        )
        .map(([key, value]) =>
          value === true
            ? humanize(key)
            : `${humanize(key)}: ${compactText(value)}`,
        );
    } else if (typeof selectedFeaturesRaw === "string") {
      parsed = selectedFeaturesRaw
        .split(/[\n•;,|]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    const unique = [...parsed, ...fallback].filter(
      (item, index, arr) =>
        item &&
        arr.findIndex(
          (existing) => existing.toLowerCase() === item.toLowerCase(),
        ) === index,
    );

    return unique.slice(0, 4);
  }, [selectedFeaturesRaw]);

  const priceBreakupItems = [
    ["Ex-showroom price", selectedParts.exShowroom],
    ["RTO charges", selectedParts.rto],
    ["Insurance", selectedParts.insurance],
    ...selectedParts.listItems.map((item) => [item.label, item.amount]),
  ].filter(([, value]) => value !== undefined && value !== null);

  const titleModel = [brand, model].filter(Boolean).join(" ") || "Vehicle";
  const selectedVariantName = getVariantName(selectedRow);
  const formattedUpdatedDate = lastUpdated
    ? formatDate(lastUpdated)
    : "Recently";

  return (
    <ModernCanvasShell
      title={`${model || "Vehicle"} pricelist`}
      subtitle={`Prices updated on ${formattedUpdatedDate}. Select any variant to update the price breakup, range and side summary.`}
      icon={WalletCards}
      actions={openAction ? [openAction] : []}
      onAction={onAction}
      footer={footer}
      eyebrow="Prices"
      fullBleed
      className="!overflow-visible w-full max-w-none"
      bodyClassName="space-y-4 !overflow-visible sm:space-y-5"
      headerClassName="hidden xl:flex"
    >
      <div className="grid w-full items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_410px]">
        <section className="min-w-0 space-y-4">
          <MobileHeroCard
            titleModel={titleModel}
            model={model}
            city={city}
            formattedUpdatedDate={formattedUpdatedDate}
            selectedVariantName={selectedVariantName}
            selectedRow={selectedRow}
            selectedParts={selectedParts}
            stableCarImage={stableCarImage}
            imageFailed={imageFailed}
            setImageFailed={setImageFailed}
          />

          <div className="hidden flex-wrap items-center justify-between gap-3 xl:flex">
            <button
              type="button"
              onClick={() =>
                onAction?.({
                  type: "show_more_inline",
                  message: "Back to prices",
                  label: "Back to prices",
                })
              }
              className="inline-flex items-center gap-2 text-sm font-black text-[#2563eb] transition hover:text-[#1d4ed8]"
            >
              ‹ Back to prices
            </button>

            <span className="inline-flex items-center gap-2 rounded-[16px] border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-black text-[#334155] shadow-sm">
              <MapPin size={14} />
              {humanize(city)}
              <ChevronRight size={13} className="rotate-90 text-[#94a3b8]" />
            </span>
          </div>

          <div className="rounded-[24px] border border-[#dbe3ef] bg-white/92 p-3 shadow-[0_22px_70px_-58px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:rounded-[28px] md:p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="grid overflow-hidden rounded-[18px] border border-[#dbe3ef] bg-white text-center text-xs font-black text-[#64748b] sm:min-w-[340px] sm:grid-cols-3 sm:text-sm">
                {["Ex-showroom", "On-road", "EMI"].map((tab, index) => (
                  <span
                    key={tab}
                    className={`relative px-4 py-3 sm:px-6 ${
                      index === 0 ? "text-[#2563eb]" : "hover:bg-[#eff6ff]"
                    }`}
                  >
                    {tab}
                    {index === 0 ? (
                      <motion.span
                        layoutId="active-price-tab"
                        className="absolute inset-x-0 bottom-0 h-[3px] bg-[#2563eb]"
                      />
                    ) : null}
                  </span>
                ))}
              </div>

              <p className="text-xs font-bold text-[#94a3b8]">
                {total} variants · prices are indicative
              </p>
            </div>

            <div className="hidden overflow-visible rounded-[22px] border border-[#dbe3ef] bg-white lg:block">
              <table className="w-full table-fixed text-[12px] 2xl:text-[12.5px]">
                <colgroup>
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "15%" }} />
                </colgroup>

                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th className="border-b border-[#e2e8f0] px-2 py-4" />
                    {[
                      "Variant",
                      "Fuel",
                      "Ex-showroom",
                      "RTO",
                      "Insurance",
                      "Other",
                      "On-road",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="border-b border-[#e2e8f0] px-2.5 py-4 text-left text-[10px] font-black uppercase tracking-[0.08em] text-[#64748b] 2xl:tracking-[0.11em]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="relative divide-y divide-[#eef2f7] overflow-visible">
                  {sortedRows.length ? (
                    sortedRows.map((row, index) => {
                      const rowKey = getRowKey(row, index);
                      const parts = getPriceParts(row);
                      const isSelected = rowKey === selectedRowKey;

                      return (
                        <motion.tr
                          key={rowKey}
                          onClick={() => setSelectedRowKey(rowKey)}
                          whileHover={{
                            backgroundColor: "rgba(239,246,255,0.72)",
                          }}
                          whileTap={{ scale: 0.995 }}
                          transition={{
                            type: "spring",
                            stiffness: 360,
                            damping: 28,
                          }}
                          className={`group relative cursor-pointer transition ${
                            isSelected
                              ? "bg-[#eff6ff] shadow-[inset_0_0_0_1px_#93c5fd]"
                              : "hover:bg-[#eff6ff]/45"
                          }`}
                        >
                          <td className="px-2 py-4">
                            <span
                              className={`relative flex h-4 w-4 items-center justify-center rounded-full border ${
                                isSelected
                                  ? "border-[#2563eb] bg-[#2563eb]"
                                  : "border-[#94a3b8] bg-white group-hover:border-[#2563eb]"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <motion.span
                                    layoutId="selected-price-row-dot"
                                    className="h-1.5 w-1.5 rounded-full bg-white"
                                  />
                                  <motion.span
                                    initial={{ scale: 0.8, opacity: 0.8 }}
                                    animate={{ scale: 2.2, opacity: 0 }}
                                    transition={{
                                      duration: 1.2,
                                      repeat: Infinity,
                                      ease: "easeOut",
                                    }}
                                    className="absolute inset-0 rounded-full border border-[#2563eb]"
                                  />
                                </>
                              ) : null}
                            </span>
                          </td>

                          <td className="px-2.5 py-4">
                            <span
                              className={`block truncate font-black ${
                                isSelected ? "text-[#2563eb]" : "text-[#0f172a]"
                              }`}
                              title={getVariantName(row)}
                            >
                              {getVariantName(row)}
                            </span>
                          </td>

                          <td className="px-2.5 py-4">
                            <span
                              className="block truncate font-semibold text-[#475569]"
                              title={getFuelTransmission(row)}
                            >
                              {getFuelTransmission(row) || "—"}
                            </span>
                          </td>

                          <td className="px-2.5 py-4 font-black text-[#0f172a]">
                            {formatAmount(parts.exShowroom)}
                          </td>

                          <td className="px-2.5 py-4 font-semibold text-[#475569]">
                            {formatAmount(parts.rto)}
                          </td>

                          <td className="px-2.5 py-4 font-semibold text-[#475569]">
                            {formatAmount(parts.insurance)}
                          </td>

                          <td className="px-2.5 py-4">
                            {parts.listItems.length ? (
                              <div className="relative inline-flex items-center gap-1">
                                <span className="max-w-[62px] truncate font-semibold text-[#475569]">
                                  {formatAmount(parts.listTotal)}
                                </span>

                                <button
                                  type="button"
                                  aria-label="Show optional and other item breakup"
                                  onMouseEnter={() => setOpenBreakupKey(rowKey)}
                                  onFocus={() => setOpenBreakupKey(rowKey)}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenBreakupKey(
                                      openBreakupKey === rowKey ? null : rowKey,
                                    );
                                  }}
                                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#94a3b8] transition hover:bg-[#eff6ff] hover:text-[#2563eb]"
                                >
                                  <Info size={13} />
                                </button>

                                {openBreakupKey === rowKey ? (
                                  <div
                                    onMouseLeave={() => setOpenBreakupKey(null)}
                                    className={`absolute left-0 z-[999] w-72 rounded-[18px] border border-[#dbe3ef] bg-white p-3 text-xs shadow-[0_18px_50px_-20px_rgba(15,23,42,0.35)] ${
                                      index >= sortedRows.length - 3
                                        ? "bottom-8"
                                        : "top-8"
                                    }`}
                                  >
                                    <div className="mb-2 flex items-center justify-between gap-3 border-b border-[#e2e8f0] pb-2">
                                      <span className="font-black uppercase tracking-wide text-[#64748b]">
                                        Breakup
                                      </span>
                                      <span className="font-black text-[#0f172a]">
                                        {formatAmount(parts.listTotal)}
                                      </span>
                                    </div>

                                    <div className="space-y-1.5">
                                      {parts.listItems.map(
                                        (item, itemIndex) => (
                                          <div
                                            key={`${item.label}-${itemIndex}`}
                                            className="flex items-center justify-between gap-3"
                                          >
                                            <span className="font-semibold text-[#64748b]">
                                              {item.label}
                                            </span>
                                            <span className="font-black text-[#0f172a]">
                                              {formatAmount(item.amount)}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span className="font-semibold text-[#94a3b8]">
                                —
                              </span>
                            )}
                          </td>

                          <td className="px-2.5 py-4 font-black text-[#2563eb]">
                            {formatAmount(parts.onRoad)}
                          </td>
                        </motion.tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <DatabaseZap
                          size={30}
                          className="mx-auto mb-2 text-[#cbd5e1]"
                        />
                        <p className="text-sm font-semibold text-[#64748b]">
                          No price rows available.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 lg:hidden">
              {sortedRows.length ? (
                sortedRows.map((row, index) => (
                  <MobileVariantBreakupCard
                    key={getRowKey(row, index)}
                    row={row}
                    index={index}
                    selectedRowKey={selectedRowKey}
                    setSelectedRowKey={setSelectedRowKey}
                    openBreakupKey={openBreakupKey}
                    setOpenBreakupKey={setOpenBreakupKey}
                  />
                ))
              ) : (
                <div className="rounded-[22px] border border-[#dbe3ef] bg-white px-4 py-12 text-center">
                  <DatabaseZap
                    size={30}
                    className="mx-auto mb-2 text-[#cbd5e1]"
                  />
                  <p className="text-sm font-semibold text-[#64748b]">
                    No price rows available.
                  </p>
                </div>
              )}
            </div>

            <p className="mt-3 text-xs font-semibold leading-5 text-[#94a3b8]">
              *On-road price includes RTO, insurance and other applicable
              charges. Prices may vary based on offers, dealer and city.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="hidden rounded-[24px] border border-[#dbe3ef] bg-white/92 p-4 shadow-[0_22px_70px_-58px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:rounded-[26px] sm:p-5 lg:block"
            >
              <h3 className="text-base font-black text-[#0f172a]">
                Price breakup{" "}
                <span className="font-semibold text-[#64748b]">
                  ({selectedVariantName})
                </span>
              </h3>
              <p className="mt-1 text-xs font-bold text-[#64748b]">
                {humanize(city)}
              </p>

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedRowKey}
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="mt-5 space-y-3"
                >
                  {priceBreakupItems.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <span className="font-semibold text-[#64748b]">
                        {label}
                      </span>
                      <span className="font-black text-[#0f172a]">
                        {formatAmount(value)}
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-[#e2e8f0] pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-black text-[#0f172a]">
                        Est. on-road price
                      </span>
                      <motion.span
                        key={selectedParts.onRoad}
                        initial={{ opacity: 0, y: 5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 280,
                          damping: 22,
                        }}
                        className="text-lg font-black text-[#2563eb]"
                      >
                        {formatAmount(selectedParts.onRoad)}
                      </motion.span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[16px] border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
                    <p className="flex items-start gap-2 text-xs font-semibold leading-5 text-[#475569]">
                      <Info
                        size={15}
                        className="mt-0.5 shrink-0 text-[#2563eb]"
                      />
                      On-road price is an estimate and may vary at the time of
                      purchase.
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            <PriceRangeCard
              total={total}
              model={model}
              baseRow={baseRow}
              selectedRow={selectedRow}
              topRow={topRow}
              selectedIndex={selectedIndex}
              selectedVariantName={selectedVariantName}
              selectedParts={selectedParts}
              basePercent={basePercent}
              selectedPercent={selectedPercent}
              topPercent={topPercent}
              sortedRows={sortedRows}
              setSelectedRowKey={setSelectedRowKey}
              onAction={onAction}
            />
          </div>

          <div className="grid gap-4 lg:hidden">
            <EmiCard
              selectedRowKey={selectedRowKey}
              selectedEmi={selectedEmi}
              onAction={onAction}
              brand={brand}
              model={model}
              selectedVariantName={selectedVariantName}
            />

            <WhyVariantCard
              selectedRowKey={selectedRowKey}
              selectedFeatures={selectedFeatures}
              onAction={onAction}
              brand={brand}
              model={model}
              selectedVariantName={selectedVariantName}
            />
          </div>
        </section>

        <aside className="hidden space-y-4 xl:sticky xl:top-4 xl:block xl:self-start xl:pb-8">
          <SelectedVariantCard
            titleModel={titleModel}
            selectedVariantName={selectedVariantName}
            selectedRow={selectedRow}
            selectedParts={selectedParts}
            city={city}
            stableCarImage={stableCarImage}
            imageFailed={imageFailed}
            setImageFailed={setImageFailed}
          />

          <EmiCard
            selectedRowKey={selectedRowKey}
            selectedEmi={selectedEmi}
            onAction={onAction}
            brand={brand}
            model={model}
            selectedVariantName={selectedVariantName}
          />

          <WhyVariantCard
            selectedRowKey={selectedRowKey}
            selectedFeatures={selectedFeatures}
            onAction={onAction}
            brand={brand}
            model={model}
            selectedVariantName={selectedVariantName}
          />
        </aside>
      </div>
    </ModernCanvasShell>
  );
}
