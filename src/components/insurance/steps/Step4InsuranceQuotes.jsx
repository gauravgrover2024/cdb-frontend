// Step4InsuranceQuotes.jsx

import React from "react";
import {
  Button,
  Divider,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Typography,
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
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import PlanFeaturesModalBody from "../PlanFeaturesModalBody";
import { addOnCatalog } from "./allSteps";

const { Text } = Typography;

// ── FieldBlock ──
const FieldBlock = ({ label, required, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
      {label}
      {required && <span className="ml-0.5 text-rose-400">*</span>}
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
    <span className="text-xs text-slate-400">{label}</span>
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
            ? "text-slate-400"
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
            ? "text-slate-400"
            : "font-semibold text-slate-700"
      }`}
    >
      {value}
    </span>
  </div>
);

// ── addonPalette ──
const addonPalette = [
  {
    bg: "bg-sky-50",
    ring: "ring-sky-200",
    dot: "bg-sky-400",
    text: "text-sky-700",
    activeBg: "bg-sky-100",
    activeRing: "ring-sky-400",
  },
  {
    bg: "bg-violet-50",
    ring: "ring-violet-200",
    dot: "bg-violet-400",
    text: "text-violet-700",
    activeBg: "bg-violet-100",
    activeRing: "ring-violet-400",
  },
  {
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    dot: "bg-emerald-400",
    text: "text-emerald-700",
    activeBg: "bg-emerald-100",
    activeRing: "ring-emerald-400",
  },
  {
    bg: "bg-amber-50",
    ring: "ring-amber-200",
    dot: "bg-amber-400",
    text: "text-amber-700",
    activeBg: "bg-amber-100",
    activeRing: "ring-amber-400",
  },
  {
    bg: "bg-rose-50",
    ring: "ring-rose-200",
    dot: "bg-rose-400",
    text: "text-rose-700",
    activeBg: "bg-rose-100",
    activeRing: "ring-rose-400",
  },
  {
    bg: "bg-teal-50",
    ring: "ring-teal-200",
    dot: "bg-teal-400",
    text: "text-teal-700",
    activeBg: "bg-teal-100",
    activeRing: "ring-teal-400",
  },
];

// ── QuoteCard ──
const QuoteCard = ({
  row,
  idx,
  acceptedQuoteId,
  getQuoteRowId,
  computeQuoteBreakupFromRow,
  formatStoredOrComputedIdv,
  formatStoredOrComputedPremium,
  toINR,
  quoteRows,
  acceptQuote,
  setQuoteDraft,
  mapQuoteToDraft,
  setPlanFeaturesModal,
  onDelete,
}) => {
  const [showAllAddons, setShowAllAddons] = React.useState(false);

  const rid = getQuoteRowId(row);
  const isAccepted = String(acceptedQuoteId) === String(rid);
  const breakup = computeQuoteBreakupFromRow(row);
  const palette = addonPalette[idx % addonPalette.length];

  const allPremiums = quoteRows.map(
    (r) => computeQuoteBreakupFromRow(r)?.totalPremium ?? 0,
  );
  const minPremium = Math.min(...allPremiums);
  const thisPremium = breakup?.totalPremium ?? 0;
  const isCheapest = thisPremium === minPremium && quoteRows.length > 1;

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
    <div className="flex flex-col">
      {/* Above-card: Logo + Company + IDV */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ring-1
              ${
                isAccepted
                  ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                  : `${palette.activeBg} ${palette.text} ${palette.activeRing}`
              }
            `}
          >
            {initial}
          </div>
          <div>
            <p className="m-0 text-sm font-bold text-slate-800 leading-tight">
              {row.insuranceCompany || "—"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {row.coverageType && (
                <span className="text-[11px] text-slate-400">
                  {row.coverageType}
                </span>
              )}
              {row.coverageType && row.policyDuration && (
                <span className="text-[10px] text-slate-300">·</span>
              )}
              {row.policyDuration && (
                <span className="text-[11px] text-slate-400">
                  {row.policyDuration}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            IDV – Cover Value
          </p>
          <p className="m-0 text-sm font-black tabular-nums text-slate-800">
            {formatStoredOrComputedIdv(row)}
          </p>
        </div>
      </div>

      {/* Card Body */}
      <div
        className={`
          relative flex flex-col rounded-2xl bg-white transition-all duration-200
          ${
            isAccepted
              ? "shadow-[0_4px_24px_rgba(52,211,153,0.13)] ring-1 ring-emerald-300"
              : "shadow-[0_2px_16px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 hover:shadow-[0_6px_24px_rgba(15,23,42,0.11)]"
          }
        `}
      >
        {/* Accepted */}
        {(isAccepted || isCheapest) && (
          <div className="absolute -top-2.5 left-4 flex items-center gap-1">
            {isAccepted && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-sm">
                <CheckCircleFilled className="text-[9px]" /> Accepted
              </span>
            )}
          </div>
        )}

        {/* Premium Breakup */}
        <div className="px-5 pt-5 pb-3">
          <p className="m-0 mb-3 text-sm font-black text-slate-800">
            Premium Breakup
          </p>

          <BreakupRow
            label="Own Damage"
            value={toINR(breakup?.odAmt ?? 0)}
            bold
          />
          <BreakupRow
            label="Basic Own Damage"
            value={toINR(breakup?.odAmt ?? 0)}
            indent
            muted
          />
          {Number(row.ncbDiscount || 0) > 0 && (
            <BreakupRow
              label={`NCB Discount (${Number(row.ncbDiscount || 0)}%)`}
              value={`-${toINR(breakup?.ncbAmount ?? 0)}`}
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
                  className="mt-1 ml-3 flex items-center gap-1 border-0 bg-transparent cursor-pointer p-0 text-[11px] font-semibold text-[#E8192C] hover:text-[#c91525] transition-colors"
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
                isAccepted ? "text-emerald-600" : "text-slate-900"
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
        <div className="flex flex-col gap-2 px-5 pb-5">
          <button
            onClick={() => acceptQuote(rid)}
            className={`
              w-full rounded-xl py-2.5 text-[13px] font-black tracking-wide
              transition-all cursor-pointer border-0 shadow-sm
              ${
                isAccepted
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-[#E8192C] text-white hover:bg-[#c91525]"
              }
            `}
          >
            {isAccepted ? "✓ Accepted Plan" : "Accept This Plan"}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuoteDraft(mapQuoteToDraft(row))}
              title="Edit quote"
              className="flex h-8 w-8 items-center justify-center rounded-xl border-0 bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
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
                className: "!bg-[#E8192C] !border-[#E8192C]",
              }}
            >
              <button
                title="Delete quote"
                className="flex h-8 w-8 items-center justify-center rounded-xl border-0 bg-rose-50 text-[#E8192C] ring-1 ring-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <DeleteOutlined className="text-xs" />
              </button>
            </Popconfirm>
          </div>
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
  planFeaturesModal,
  setPlanFeaturesModal,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      {/* Page Header */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 ring-1 ring-violet-200">
          <SafetyCertificateOutlined className="text-base text-violet-600" />
        </div>
        <div>
          <h2 className="m-0 text-lg font-black tracking-tight text-slate-800">
            Insurance Quotes
          </h2>
          <p className="m-0 text-xs text-slate-400">
            Add quotes, compare plans and accept the best one
          </p>
        </div>
        {acceptedQuote && (
          <div className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 ring-1 ring-emerald-200">
            <CheckCircleFilled className="text-emerald-500 text-xs" />
            <span className="text-[11px] font-bold text-emerald-700">
              {acceptedQuote.insuranceCompany} · Accepted
            </span>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* LEFT column */}
        <div className="flex flex-col gap-5">
          {/* Quote Details */}
          <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-sm">
            <p className="mb-5 m-0 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <ThunderboltOutlined className="text-amber-400" />
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
                  formatter={(v) =>
                    `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
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
                />
              </FieldBlock>
            </div>
          </section>

          {/* Add-on Catalogue */}
          <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="m-0 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Additional Add-ons
                </p>
                <Tooltip title="Select ₹0 to include without extra charges, or enter a custom amount.">
                  <InfoCircleOutlined className="cursor-help text-slate-300 text-[11px]" />
                </Tooltip>
                <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-100 px-1 text-[9px] font-bold text-violet-600">
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
                  className="rounded-lg bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer border-0"
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
                  className="rounded-lg bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 transition-colors cursor-pointer border-0"
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
                          : "bg-slate-50 ring-slate-200 text-slate-500 hover:bg-slate-100"
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
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={addQuote}
              disabled={!quoteDraft.insuranceCompany.trim()}
              className="h-10 px-6 font-bold !bg-violet-600 hover:!bg-violet-700 !border-0 shadow-sm"
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
          <div className="sticky top-6 flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
            <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Live Premium Estimate
            </p>

            {/* Hero total */}
            <div className="rounded-xl bg-violet-50 px-4 py-4 ring-1 ring-violet-100">
              <div className="text-[10px] uppercase tracking-widest text-violet-500 font-semibold">
                Total Premium
              </div>
              <div className="mt-1 text-3xl font-black tabular-nums text-violet-700">
                {toINR(quoteComputed.totalPremium)}
              </div>
              <div className="mt-0.5 text-[11px] text-violet-400">
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
                  ring: "ring-slate-100",
                  val: "text-slate-800",
                },
                {
                  label: "Add-ons",
                  value: toINR(quoteComputed.addOnsTotal),
                  sub: "Bulk + selected",
                  bg: "bg-violet-50",
                  ring: "ring-violet-100",
                  val: "text-violet-700",
                },
                {
                  label: "NCB Discount",
                  value: `-${toINR(quoteComputed.ncbAmount)}`,
                  sub: `${Number(quoteDraft.ncbDiscount || 0)}% on base`,
                  bg: "bg-emerald-50",
                  ring: "ring-emerald-100",
                  val: "text-emerald-700",
                },
                {
                  label: "GST 18%",
                  value: toINR(quoteComputed.gstAmount),
                  sub: `On ${toINR(quoteComputed.taxableAmount)}`,
                  bg: "bg-sky-50",
                  ring: "ring-sky-100",
                  val: "text-sky-700",
                },
              ].map(({ label, value, sub, bg, ring, val }) => (
                <div
                  key={label}
                  className={`rounded-lg px-3 py-2.5 ring-1 ${bg} ${ring}`}
                >
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                    {label}
                  </div>
                  <div
                    className={`text-base font-black tabular-nums mt-0.5 ${val}`}
                  >
                    {value}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-snug mt-0.5">
                    {sub}
                  </div>
                </div>
              ))}
            </div>

            <Divider className="!border-slate-100 !my-0" />

            {/* IDV Breakdown */}
            <div>
              <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
              <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {quotes.length}
            </span>
          </div>
          {acceptedQuote && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
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
              <span className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-500 ring-1 ring-rose-200">
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
                acceptedQuoteId={acceptedQuoteId}
                getQuoteRowId={getQuoteRowId}
                computeQuoteBreakupFromRow={computeQuoteBreakupFromRow}
                formatStoredOrComputedIdv={formatStoredOrComputedIdv}
                formatStoredOrComputedPremium={formatStoredOrComputedPremium}
                toINR={toINR}
                quoteRows={quoteRows}
                acceptQuote={acceptQuote}
                setQuoteDraft={setQuoteDraft}
                mapQuoteToDraft={mapQuoteToDraft}
                setPlanFeaturesModal={setPlanFeaturesModal}
                onDelete={deleteQuote}
              />
            ))}
          </div>
        )}
      </section>

      {/* Plan Features Modal */}
      <Modal
        title={
          <span className="text-base font-bold text-slate-800">
            Plan Features
          </span>
        }
        open={planFeaturesModal.open}
        onCancel={() => setPlanFeaturesModal({ open: false, row: null })}
        footer={null}
        width={960}
        centered
        destroyOnClose
        zIndex={1100}
        getContainer={() => document.body}
        className="[&_.ant-modal-content]:rounded-2xl"
        styles={{
          body: {
            padding: 0,
            maxHeight: "min(85vh, 900px)",
            overflowY: "auto",
          },
          header: { marginBottom: 0 },
          content: { padding: 0 },
        }}
      >
        {planFeaturesModal.row ? (
          <PlanFeaturesModalBody
            key={String(getQuoteRowId(planFeaturesModal.row))}
            row={planFeaturesModal.row}
            acceptedQuoteId={acceptedQuoteId}
            onAcceptAndClose={(rid) => {
              acceptQuote(rid);
              setPlanFeaturesModal({ open: false, row: null });
            }}
            getQuoteRowId={getQuoteRowId}
            computeQuoteBreakupFromRow={computeQuoteBreakupFromRow}
            toINR={toINR}
          />
        ) : (
          <div className="px-8 py-10 text-center">
            <Text type="secondary">No quote selected.</Text>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Step4InsuranceQuotes;
