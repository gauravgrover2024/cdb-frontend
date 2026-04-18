// Step4InsuranceQuotes.jsx

import React from "react";
import {
  Button,
  Divider,
  Input,
  InputNumber,
  Select,
  Space,
  Tooltip,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { addOnCatalog } from "./allSteps";

const inrInputProps = {
  formatter: (value) => {
    const raw = `${value ?? ""}`.replace(/,/g, "");
    if (!raw) return "";
    const [whole, decimals] = raw.split(".");
    const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decimals !== undefined
      ? `${formattedWhole}.${decimals}`
      : formattedWhole;
  },
  parser: (value) => `${value ?? ""}`.replace(/,/g, ""),
};

// ── FieldBlock ──
const FieldBlock = ({ label, required, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
      {label}
      {required && <span className="ml-0.5 text-[#D8B8B4]">*</span>}
    </label>
    {children}
  </div>
);

// ── TickerRow ──
const TickerRow = ({ label, value, valueClass = "text-slate-800", bold }) => (
  <div
    className={`flex items-center justify-between py-1 ${
      bold ? "border-t border-slate-100 pt-2" : ""
    }`}
  >
    <span className="text-xs text-slate-500">{label}</span>
    <span
      className={`text-sm tabular-nums font-semibold ${valueClass} ${
        bold ? "font-bold" : ""
      }`}
    >
      {value}
    </span>
  </div>
);

// ── BreakupRow ──
const BreakupRow = ({ label, value, bold, muted, indent }) => (
  <div
    className={`flex items-center justify-between py-1.5
      ${bold ? "border-t border-slate-100 mt-1 pt-2.5" : ""}
      ${indent ? "pl-3" : ""}
    `}
  >
    <span
      className={`text-[12px] ${
        bold
          ? "font-bold text-slate-800"
          : muted
            ? "text-slate-500"
            : "text-slate-500"
      }`}
    >
      {label}
    </span>
    <span
      className={`tabular-nums text-[12px] ${
        bold
          ? "font-black text-slate-900"
          : muted
            ? "text-slate-500"
            : "font-semibold text-slate-700"
      }`}
    >
      {value}
    </span>
  </div>
);

const addonPalette = [
  {
    bg: "bg-[#D6E6DF]/35",
    ring: "ring-[#D6E6DF]",
    dot: "bg-slate-600",
    text: "text-slate-700",
    activeBg: "bg-[#D6E6DF]/70",
    activeRing: "ring-[#D6E6DF]",
  },
  {
    bg: "bg-[#EEF3EF]/40",
    ring: "ring-[#EEF3EF]",
    dot: "bg-slate-600",
    text: "text-slate-700",
    activeBg: "bg-[#EEF3EF]/75",
    activeRing: "ring-[#EEF3EF]",
  },
  {
    bg: "bg-[#FAF8F1]/55",
    ring: "ring-[#FAF8F1]",
    dot: "bg-slate-600",
    text: "text-slate-700",
    activeBg: "bg-[#FAF8F1]",
    activeRing: "ring-[#FAF8F1]",
  },
];

// ── QuoteCard ──
const QuoteCard = ({
  row,
  idx,
  quoteRows,
  acceptedQuoteId,
  getQuoteRowId,
  computeQuoteBreakupFromRow,
  formatStoredOrComputedIdv,
  formatStoredOrComputedPremium,
  toINR,
  acceptQuote,
  setQuoteDraft,
  mapQuoteToDraft,
  onDelete,
}) => {
  const [showAllAddons, setShowAllAddons] = React.useState(false);

  const rid = getQuoteRowId(row);
  const isAccepted = String(acceptedQuoteId) === String(rid);
  const breakup = computeQuoteBreakupFromRow(row);
  const palette = addonPalette[idx % addonPalette.length];
  const ncbPct = Number(row.ncbDiscount || 0);
  const ncbAmount = Number(breakup?.ncbAmount || 0);
  const odBeforeNcb = Number(breakup?.odAmt || 0);
  const odAfterNcb = Math.max(odBeforeNcb - ncbAmount, 0);
  const allPremiums = quoteRows.map(
    (r) => computeQuoteBreakupFromRow(r)?.totalPremium ?? 0,
  );
  const minPremium = Math.min(...allPremiums);
  const isCheapest =
    quoteRows.length > 1 && Number(breakup?.totalPremium || 0) === minPremium;

  const includedAddons = Object.entries(row.addOnsIncluded || {})
    .filter(([, v]) => v)
    .map(([k]) => ({ name: k, amt: Number(row.addOns?.[k] || 0) }));

  const visibleAddons = showAllAddons
    ? includedAddons
    : includedAddons.slice(0, 4);

  const initial = (row.insuranceCompany || "?")
    .toString()
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`
        relative flex flex-col rounded-2xl bg-white transition-all duration-200
        ${
          isAccepted
            ? "shadow-[0_4px_24px_rgba(15,23,42,0.10)] ring-1 ring-[#D6E6DF]"
            : "shadow-[0_2px_16px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 hover:shadow-[0_6px_24px_rgba(15,23,42,0.11)]"
        }
      `}
    >
      {/* Accepted badge */}
      {isAccepted && (
        <div className="absolute -top-2.5 left-4 flex items-center gap-1">
          <span className="flex items-center gap-1 rounded-full bg-[#D6E6DF] px-2.5 py-0.5 text-[10px] font-black text-slate-800 shadow-sm">
            <CheckCircleFilled className="text-[9px]" /> Accepted
          </span>
        </div>
      )}
      {!isAccepted && isCheapest && (
        <div className="absolute -top-2.5 left-4 flex items-center gap-1">
          <span className="rounded-full bg-[#FAF8F1] px-2.5 py-0.5 text-[10px] font-black text-slate-700 shadow-sm ring-1 ring-[#FAF8F1]">
            Lowest Premium
          </span>
        </div>
      )}

      {/* In-card quote identity */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ring-1
                  ${
                    isAccepted
                      ? "bg-[#D6E6DF]/70 text-slate-800 ring-[#D6E6DF]"
                      : `${palette.activeBg} ${palette.text} ${palette.activeRing}`
                  }
                `}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-bold text-slate-800 leading-tight">
                {row.insuranceCompany || "—"}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                {row.coverageType && (
                  <span className="text-[11px] text-slate-500">
                    {row.coverageType}
                  </span>
                )}
                {row.coverageType && row.policyDuration && (
                  <span className="text-[10px] text-slate-300">·</span>
                )}
                {row.policyDuration && (
                  <span className="text-[11px] text-slate-500">
                    {row.policyDuration}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              IDV
            </p>
            <p className="m-0 text-sm font-black tabular-nums text-slate-800">
              {formatStoredOrComputedIdv(row)}
            </p>
          </div>
        </div>
      </div>

      {/* Section divider: identity -> pricing */}
      <div className="mx-5 border-t border-slate-100" />

      {/* Premium Breakup */}
      <div className="px-5 pt-5 pb-3">
        <p className="m-0 mb-3 text-sm font-black text-slate-800">
          Premium Breakup
        </p>

        <BreakupRow label="Own Damage" value={toINR(odAfterNcb)} bold />
        <BreakupRow
          label="Own Damage before NCB"
          value={toINR(odBeforeNcb)}
          indent
          muted
        />
        {ncbPct > 0 && (
          <BreakupRow
            label={`NCB Discount (${ncbPct}%)`}
            value={`-${toINR(ncbAmount)}`}
            indent
            muted
          />
        )}

        <BreakupRow
          label="Third Party"
          value={toINR(breakup?.tpAmt ?? 0)}
          bold
        />
        <BreakupRow
          label="Basic Third Party"
          value={toINR(breakup?.tpAmt ?? 0)}
          indent
          muted
        />

        {includedAddons.length > 0 && (
          <>
            <BreakupRow
              label="Add Ons"
              value={toINR(breakup?.addOnsTotal ?? 0)}
              bold
            />
            {visibleAddons.map(({ name, amt }) => (
              <BreakupRow
                key={name}
                label={name}
                value={amt > 0 ? toINR(amt) : "included"}
                indent
                muted
              />
            ))}
            {includedAddons.length > 4 && (
              <button
                onClick={() => setShowAllAddons((p) => !p)}
                className="mt-1 ml-3 flex items-center gap-1 border-0 bg-transparent cursor-pointer p-0 text-[11px] font-semibold text-slate-600 hover:text-slate-700 transition-colors"
              >
                <span
                  className={`inline-block transition-transform duration-200 ${
                    showAllAddons ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
                {showAllAddons
                  ? "Show Less"
                  : `+${includedAddons.length - 4} More Add-ons`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Dashed separator */}
      <div className="mx-5 border-t border-dashed border-slate-200" />

      {/* Total Amount */}
      <div className="px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-slate-800">
            Total Amount
          </span>
          <span
            className={`text-xl font-black tabular-nums ${
              isAccepted ? "text-slate-800" : "text-slate-900"
            }`}
          >
            {formatStoredOrComputedPremium(row)}
          </span>
        </div>
        <p className="m-0 mt-0.5 text-right text-[10px] text-slate-400">
          Prices are inclusive of GST
        </p>
      </div>

      {/* Action Buttons */}
      <div className="px-5 pb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => acceptQuote(rid)}
            className={`
                flex-1 rounded-xl py-2.5 text-[13px] font-black tracking-wide
                transition-all cursor-pointer border-0 shadow-sm
                ${
                  isAccepted
                    ? "bg-[#D6E6DF] text-slate-800 hover:opacity-90"
                    : "bg-[#D8B8B4] text-slate-800 hover:opacity-90"
                }
              `}
          >
            {isAccepted ? "✓ Accepted" : "Accept"}
          </button>

          <button
            onClick={() => setQuoteDraft(mapQuoteToDraft(row))}
            title="Edit quote"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <EditOutlined className="text-xs" />
          </button>

          <Popconfirm
            title="Delete this quote?"
            description="This action cannot be undone."
            onConfirm={() => onDelete(rid)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{
              danger: true,
              className: "!bg-[#D8B8B4] !border-[#D8B8B4] !text-slate-800",
            }}
          >
            <button
              title="Delete quote"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-[#D8B8B4]/30 text-slate-700 ring-1 ring-[#D8B8B4] hover:bg-[#D8B8B4]/45 transition-colors cursor-pointer"
            >
              <DeleteOutlined className="text-xs" />
            </button>
          </Popconfirm>
        </div>
      </div>
    </div>
  );
};

// ── Step4InsuranceQuotes ──
const Step4InsuranceQuotes = ({
  quoteDraft,
  setQuoteDraft,
  quoteComputed,
  quotes,
  quoteRows,
  acceptedQuoteId,
  acceptedQuote,
  showErrors,
  addQuote,
  acceptQuote,
  deleteQuote,
  initialQuoteDraft,
  mapQuoteToDraft,
  durationOptions,
  toINR,
  getQuoteRowId,
  computeQuoteBreakupFromRow,
  formatStoredOrComputedIdv,
  formatStoredOrComputedPremium,
}) => {
  const canAddQuote = Boolean(String(quoteDraft.insuranceCompany || "").trim());

  return (
    <div className="min-h-screen bg-slate-100/60 px-4 pb-4 pt-3 md:px-6 md:pb-6 md:pt-4 font-sans">
      {/* Page Header */}
      <div className="mb-5 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 shadow-sm md:px-5 md:py-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF3EF] ring-1 ring-[#D6E6DF]">
            <SafetyCertificateOutlined className="text-base text-slate-700" />
          </div>
          <div>
            <h2 className="m-0 text-lg font-black tracking-tight text-slate-800">
              Insurance Quotes
            </h2>
            <p className="m-0 text-xs text-slate-400">
              Add quotes, compare plans and accept the best one
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
              Quotes: {quotes.length}
            </span>
            {acceptedQuote && (
              <div className="flex items-center gap-1.5 rounded-full bg-[#D6E6DF]/65 px-3 py-1.5 ring-1 ring-[#D6E6DF]">
                <CheckCircleFilled className="text-slate-700 text-xs" />
                <span className="text-[11px] font-bold text-slate-800">
                  {acceptedQuote.insuranceCompany} · Accepted
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* LEFT column */}
        <div className="flex flex-col gap-5">
          {/* Quote Details */}
          <section className="rounded-2xl bg-white px-5 pb-5 pt-4 md:px-6 md:pb-6 md:pt-5 ring-1 ring-slate-200 shadow-sm shadow-slate-900/5">
            <p className="mb-5 m-0 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <ThunderboltOutlined className="text-[#D8B8B4]" />
              Quote Details
            </p>
            <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <FieldBlock label="Insurance Company" required>
                <Input
                  value={quoteDraft.insuranceCompany}
                  onChange={(e) =>
                    setQuoteDraft((p) => ({
                      ...p,
                      insuranceCompany: e.target.value,
                    }))
                  }
                  placeholder="e.g. HDFC ERGO"
                />
              </FieldBlock>

              <FieldBlock label="Coverage Type" required>
                <Select
                  value={quoteDraft.coverageType}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({ ...p, coverageType: v }))
                  }
                  placeholder="Select type"
                  className="w-full"
                  options={[
                    { label: "Comprehensive", value: "Comprehensive" },
                    { label: "Third Party", value: "Third Party" },
                    { label: "Own Damage", value: "Own Damage" },
                  ]}
                />
              </FieldBlock>

              <FieldBlock label="Policy Duration" required>
                <Select
                  value={quoteDraft.policyDuration}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({ ...p, policyDuration: v }))
                  }
                  placeholder="Duration"
                  className="w-full"
                  options={durationOptions.map((d) => ({
                    label: d,
                    value: d,
                  }))}
                />
              </FieldBlock>

              <FieldBlock label="Vehicle IDV (₹)">
                <InputNumber
                  min={0}
                  value={Number(quoteDraft.vehicleIdv || 0)}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({
                      ...p,
                      vehicleIdv: Number(v || 0),
                    }))
                  }
                  className="w-full"
                  addonBefore="₹"
                  {...inrInputProps}
                />
              </FieldBlock>

              <FieldBlock label="CNG IDV (₹)">
                <InputNumber
                  min={0}
                  value={Number(quoteDraft.cngIdv || 0)}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({ ...p, cngIdv: Number(v || 0) }))
                  }
                  className="w-full"
                  addonBefore="₹"
                  {...inrInputProps}
                />
              </FieldBlock>

              <FieldBlock label="Accessories IDV (₹)">
                <InputNumber
                  min={0}
                  value={Number(quoteDraft.accessoriesIdv || 0)}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({
                      ...p,
                      accessoriesIdv: Number(v || 0),
                    }))
                  }
                  className="w-full"
                  addonBefore="₹"
                  {...inrInputProps}
                />
              </FieldBlock>

              <FieldBlock label="OD Amount (₹)">
                <InputNumber
                  min={0}
                  value={Number(quoteDraft.odAmount || 0)}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({
                      ...p,
                      odAmount: Number(v || 0),
                    }))
                  }
                  className="w-full"
                  addonBefore="₹"
                  {...inrInputProps}
                />
              </FieldBlock>

              <FieldBlock label="3rd Party Amount (₹)">
                <InputNumber
                  min={0}
                  value={Number(quoteDraft.thirdPartyAmount || 0)}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({
                      ...p,
                      thirdPartyAmount: Number(v || 0),
                    }))
                  }
                  className="w-full"
                  addonBefore="₹"
                  {...inrInputProps}
                />
              </FieldBlock>

              <FieldBlock label="NCB Discount (%)">
                <InputNumber
                  min={0}
                  max={100}
                  value={Number(quoteDraft.ncbDiscount || 0)}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({
                      ...p,
                      ncbDiscount: Number(v || 0),
                    }))
                  }
                  className="w-full"
                  addonAfter="%"
                />
              </FieldBlock>

              <FieldBlock label="Add-ons Amount (₹)">
                <InputNumber
                  min={0}
                  value={Number(quoteDraft.addOnsAmount || 0)}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({
                      ...p,
                      addOnsAmount: Number(v || 0),
                    }))
                  }
                  className="w-full"
                  addonBefore="₹"
                  {...inrInputProps}
                />
              </FieldBlock>
            </div>
          </section>

          {/* Add-on Catalogue */}
          <section className="rounded-2xl bg-white px-5 pb-5 pt-4 md:px-6 md:pb-6 md:pt-5 ring-1 ring-slate-200 shadow-sm shadow-slate-900/5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="m-0 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Additional Add-ons
                </p>
                <Tooltip title="Select ₹0 to include without extra charges, or enter a custom amount.">
                  <InfoCircleOutlined className="cursor-help text-slate-300 text-[11px]" />
                </Tooltip>
                <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#EEF3EF] px-1 text-[9px] font-bold text-slate-700">
                  {
                    addOnCatalog.filter((n) => quoteDraft.addOnsIncluded?.[n])
                      .length
                  }
                  /{addOnCatalog.length}
                </span>
              </div>
              <Space size={6}>
                <button
                  onClick={() =>
                    setQuoteDraft((p) => ({
                      ...p,
                      addOns: addOnCatalog.reduce(
                        (a, n) => ({ ...a, [n]: 0 }),
                        {},
                      ),
                      addOnsIncluded: addOnCatalog.reduce(
                        (a, n) => ({ ...a, [n]: true }),
                        {},
                      ),
                    }))
                  }
                  className="rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-200 transition-colors cursor-pointer border-0"
                >
                  ✓ Select All
                </button>
                <button
                  onClick={() =>
                    setQuoteDraft((p) => ({
                      ...p,
                      addOns: addOnCatalog.reduce(
                        (a, n) => ({ ...a, [n]: 0 }),
                        {},
                      ),
                      addOnsIncluded: addOnCatalog.reduce(
                        (a, n) => ({ ...a, [n]: false }),
                        {},
                      ),
                    }))
                  }
                  className="rounded-lg bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100 transition-colors cursor-pointer border-0"
                >
                  ✕ Clear All
                </button>
              </Space>
            </div>

            {/* Pill strip */}
            <div className="flex flex-wrap gap-2 mb-5">
              {addOnCatalog.map((name, i) => {
                const palette = addonPalette[i % addonPalette.length];
                const included = Boolean(quoteDraft.addOnsIncluded?.[name]);
                return (
                  <button
                    key={name}
                    onClick={() => {
                      const on = !included;
                      setQuoteDraft((p) => ({
                        ...p,
                        addOnsIncluded: {
                          ...p.addOnsIncluded,
                          [name]: on,
                        },
                        addOns: {
                          ...p.addOns,
                          [name]: on ? Number(p.addOns?.[name] || 0) : 0,
                        },
                      }));
                    }}
                    className={`
                      flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold
                      ring-1 transition-all duration-150 cursor-pointer border-0
                      ${
                        included
                          ? `${palette.activeBg} ${palette.activeRing} ${palette.text} shadow-sm`
                          : "bg-white ring-slate-200 text-slate-500 hover:bg-slate-50"
                      }
                    `}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        included ? palette.dot : "bg-slate-300"
                      }`}
                    />
                    {name}
                    {included && (
                      <span className="ml-0.5 text-[10px] opacity-70">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Amount inputs for selected add-ons */}
            {addOnCatalog.some((n) => quoteDraft.addOnsIncluded?.[n]) ? (
              <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-4">
                <p className="m-0 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Set Amounts for Selected Add-ons
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {addOnCatalog.map((name, i) => {
                    const palette = addonPalette[i % addonPalette.length];
                    const included = Boolean(quoteDraft.addOnsIncluded?.[name]);
                    if (!included) return null;
                    const amt = Number(quoteDraft.addOns?.[name] || 0);
                    return (
                      <div
                        key={name}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ring-1 ${palette.bg} ${palette.ring}`}
                      >
                        <span
                          className={`shrink-0 text-[11px] font-semibold ${palette.text} flex-1 leading-snug`}
                        >
                          {name}
                        </span>
                        <InputNumber
                          min={0}
                          size="small"
                          value={amt}
                          addonBefore="₹"
                          controls={false}
                          placeholder="0"
                          {...inrInputProps}
                          onChange={(v) =>
                            setQuoteDraft((p) => ({
                              ...p,
                              addOns: {
                                ...p.addOns,
                                [name]: Number(v ?? 0),
                              },
                            }))
                          }
                          className="w-32 shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-4 py-5 text-center">
                <p className="m-0 text-xs text-slate-400">
                  No add-ons selected. Click any pill above to include it.
                </p>
              </div>
            )}
          </section>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-r from-white via-slate-50/50 to-white p-3 ring-1 ring-slate-200 shadow-sm shadow-slate-900/5">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={addQuote}
              disabled={!canAddQuote}
              style={
                canAddQuote
                  ? undefined
                  : {
                      background: "#FAF8F1",
                      color: "#6b7280",
                      borderColor: "#EEF3EF",
                      opacity: 1,
                    }
              }
              className={`h-10 px-6 font-bold !border-0 ${
                canAddQuote
                  ? "!bg-[#D8B8B4] hover:!opacity-90 !text-slate-800 shadow-sm"
                  : "!bg-[#FAF8F1] !text-slate-500 !border !border-[#EEF3EF] !shadow-none"
              }`}
            >
              Add Quote
            </Button>
            <Button
              size="large"
              icon={<ReloadOutlined />}
              onClick={() =>
                setQuoteDraft({
                  ...initialQuoteDraft,
                  addOns: { ...initialQuoteDraft.addOns },
                  addOnsIncluded: { ...initialQuoteDraft.addOnsIncluded },
                })
              }
              className="h-10 !border-slate-200 !text-slate-500 hover:!text-slate-700"
            >
              Reset
            </Button>
            <span className="text-[11px] text-slate-400 italic">
              💡 Fill premiums & IDV, configure add-ons, then click{" "}
              <b className="text-slate-600">Add Quote</b>.
            </span>
          </div>
        </div>
        {/* end LEFT column */}

        {/* RIGHT column — sticky ticker */}
        <div className="flex flex-col gap-5">
          <div className="sticky top-5 flex flex-col gap-4 rounded-2xl bg-white px-5 pb-5 pt-4 ring-1 ring-slate-200 shadow-sm shadow-slate-900/5">
            <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Live Premium Estimate
            </p>

            {/* Hero total */}
            <div className="rounded-xl bg-gradient-to-r from-[#EEF3EF] to-[#D6E6DF] px-4 py-4 ring-1 ring-[#D6E6DF]">
              <div className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold">
                Total Premium
              </div>
              <div className="mt-1 text-3xl font-black tabular-nums text-slate-800">
                {toINR(quoteComputed.totalPremium)}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-600">
                Taxable + 18% GST
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Base Premium",
                  value: toINR(quoteComputed.basePremium),
                  sub: `OD ${toINR(quoteComputed.odAmt)} · 3P ${toINR(quoteComputed.tpAmt)}`,
                  bg: "bg-slate-50",
                  ring: "ring-slate-200",
                  val: "text-slate-800",
                },
                {
                  label: "Add-ons",
                  value: toINR(quoteComputed.addOnsTotal),
                  sub: "Bulk + selected",
                  bg: "bg-[#EEF3EF]/70",
                  ring: "ring-[#EEF3EF]",
                  val: "text-slate-800",
                },
                {
                  label: "NCB Discount",
                  value: `-${toINR(quoteComputed.ncbAmount)}`,
                  sub: `${Number(quoteDraft.ncbDiscount || 0)}% on OD`,
                  bg: "bg-[#D6E6DF]/60",
                  ring: "ring-[#D6E6DF]",
                  val: "text-slate-800",
                },
                {
                  label: "GST 18%",
                  value: toINR(quoteComputed.gstAmount),
                  sub: `On ${toINR(quoteComputed.taxableAmount)}`,
                  bg: "bg-[#FAF8F1]",
                  ring: "ring-[#FAF8F1]",
                  val: "text-slate-800",
                },
              ].map(({ label, value, sub, bg, ring, val }) => (
                <div
                  key={label}
                  className={`rounded-lg px-3 py-2.5 ring-1 ${bg} ${ring}`}
                >
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                    {label}
                  </div>
                  <div
                    className={`text-base font-black tabular-nums mt-0.5 ${val}`}
                  >
                    {value}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-snug mt-0.5">
                    {sub}
                  </div>
                </div>
              ))}
            </div>

            <Divider className="!border-slate-100 !my-0" />

            {/* IDV Breakdown */}
            <div>
              <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                IDV Breakdown
              </p>
              <TickerRow
                label="Vehicle"
                value={toINR(quoteDraft.vehicleIdv || 0)}
              />
              <TickerRow label="CNG" value={toINR(quoteDraft.cngIdv || 0)} />
              <TickerRow
                label="Accessories"
                value={toINR(quoteDraft.accessoriesIdv || 0)}
              />
              <TickerRow
                label="Total IDV"
                value={toINR(quoteComputed.totalIdv)}
                bold
                valueClass="text-slate-900"
              />
            </div>

            <Divider className="!border-slate-100 !my-0" />

            {/* Taxable Breakdown */}
            <div>
              <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Taxable Breakdown
              </p>
              <TickerRow label="OD Amount" value={toINR(quoteComputed.odAmt)} />
              <TickerRow label="3rd Party" value={toINR(quoteComputed.tpAmt)} />
              <TickerRow
                label="Add-ons"
                value={toINR(quoteComputed.addOnsTotal)}
              />
              <TickerRow
                label="Taxable Total"
                value={toINR(quoteComputed.taxableAmount)}
                bold
                valueClass="text-slate-900"
              />
            </div>
          </div>
        </div>
        {/* end RIGHT column */}
      </div>
      {/* end two-column grid */}

      {/* Generated Quotes */}
      <section className="mt-8 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">
              Quotes List
            </span>
            <span className="rounded-full bg-[#D8B8B4]/35 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-[#D8B8B4]">
              {quotes.length}
            </span>
          </div>
          {acceptedQuote && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D6E6DF]/60 px-2.5 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-[#D6E6DF]">
              <CheckCircleFilled className="text-[10px]" />
              {acceptedQuote.insuranceCompany} · Accepted
            </span>
          )}
        </div>

        {quoteRows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-14">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
              <SafetyCertificateOutlined className="text-2xl text-slate-300" />
            </div>
            <div className="text-center">
              <p className="m-0 text-sm font-semibold text-slate-500">
                No quotes generated yet
              </p>
              <p className="m-0 mt-1 text-xs text-slate-400">
                Fill the form above and click{" "}
                <b className="text-slate-600">Add Quote</b> to get started.
              </p>
            </div>
            {showErrors && (
              <span className="rounded-xl bg-[#D8B8B4]/28 px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-[#D8B8B4]">
                ⚠ At least 1 quote is required to proceed.
              </span>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {quoteRows.map((row, idx) => (
              <QuoteCard
                key={String(getQuoteRowId(row))}
                row={row}
                idx={idx}
                quoteRows={quoteRows}
                acceptedQuoteId={acceptedQuoteId}
                getQuoteRowId={getQuoteRowId}
                computeQuoteBreakupFromRow={computeQuoteBreakupFromRow}
                formatStoredOrComputedIdv={formatStoredOrComputedIdv}
                formatStoredOrComputedPremium={formatStoredOrComputedPremium}
                toINR={toINR}
                acceptQuote={acceptQuote}
                setQuoteDraft={setQuoteDraft}
                mapQuoteToDraft={mapQuoteToDraft}
                onDelete={deleteQuote}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Step4InsuranceQuotes;
