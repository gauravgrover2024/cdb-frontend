// Step4InsuranceQuotes.jsx

import React from "react";
import {
  AutoComplete,
  Button,
  Checkbox,
  Divider,
  Input,
  InputNumber,
  Modal,
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
  EyeOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { addOnCatalog } from "./allSteps";
import { formatPolicyDuration } from "../../../utils/insurancePolicyDisplay";
import { IRDAI_INSURANCE_COMPANIES } from "../../../constants/irdaiInsuranceCompanies";
import { lenderHypothecationOptions } from "../../../constants/lenderHypothecationOptions";
import {
  escapeHtmlText,
  scheduleWindowPrint,
} from "../../../utils/scheduleWindowPrint";

const sectionHeaderLabel =
  "text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400";

const inrInputProps = {
  formatter: (value) => {
    const raw = `${value ?? ""}`.replace(/[^\d.-]/g, "");
    if (!raw) return "";
    const [whole, decimals] = raw.split(".");
    const formattedWhole = new Intl.NumberFormat("en-IN").format(
      Number(whole || 0),
    );
    return decimals !== undefined
      ? `${formattedWhole}.${decimals}`
      : formattedWhole;
  },
  parser: (value) => `${value ?? ""}`.replace(/[^\d.-]/g, ""),
};

const NCB_OPTIONS = [0, 20, 25, 35, 45, 50].map((value) => ({
  label: `${value}%`,
  value,
}));

const HYPOTHECATION_OPTIONS = [
  { label: "Not Applicable", value: "Not Applicable" },
  ...lenderHypothecationOptions.map((option) => ({
    label: option.value,
    value: option.value,
  })),
];

const INSURER_LOGO_DOMAIN_MAP = {
  "Acko General Insurance Limited": "acko.com",
  "Bajaj General Insurance Limited": "bajajallianz.com",
  "Cholamandalam MS General Insurance Company Limited": "cholainsurance.com",
  "Go Digit General Insurance Limited": "godigit.com",
  "HDFC ERGO General Insurance Company Limited": "hdfcergo.com",
  "ICICI Lombard General Insurance Company Limited": "icicilombard.com",
  "IFFCO TOKIO General Insurance Company Limited": "iffcotokio.co.in",
  "Zurich Kotak General Insurance Company (India) Limited": "kotakgeneral.com",
  "Liberty General Insurance Limited": "libertyinsurance.in",
  "Magma General Insurance Limited": "magmahdi.com",
  "Navi General Insurance Limited": "navi.com",
  "Royal Sundaram General Insurance Company Limited": "royalsundaram.in",
  "SBI General Insurance Company Limited": "sbigeneral.in",
  "Shriram General Insurance Company Limited": "shriramgi.com",
  "Tata AIG General Insurance Company Limited": "tataaig.com",
  "The New India Assurance Company Limited": "newindia.co.in",
  "The Oriental Insurance Company Limited": "orientalinsurance.org.in",
  "United India Insurance Company Limited": "uiic.co.in",
  "Universal Sompo General Insurance Company Limited": "universalsompo.com",
  "Zuno General Insurance Ltd.": "hizuno.com",
};

const getInsurerLogoCandidates = (companyName) => {
  const company = String(companyName || "").trim();
  if (!company) return [];
  const domain = INSURER_LOGO_DOMAIN_MAP[company];
  if (!domain) return [];
  return [
    `https://logo.clearbit.com/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
  ];
};

const normalizeInsurerName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const getIncludedAddonNames = (quote = {}) =>
  addOnCatalog.filter((name) => Boolean(quote?.addOnsIncluded?.[name]));

const buildQuoteSummaryText = ({
  quote = {},
  breakup = {},
  customerName = "",
  vehicleLabel = "",
}) => {
  const addOns = getIncludedAddonNames(quote);
  return [
    customerName ? `Customer: ${customerName}` : "",
    vehicleLabel ? `Vehicle: ${vehicleLabel}` : "",
    `Insurer: ${quote?.insuranceCompany || "—"}`,
    `Coverage: ${quote?.coverageType || "—"}`,
    `Duration: ${quote?.policyDuration || "—"}`,
    `Premium: ₹${Number(breakup?.totalPremium || quote?.totalPremium || 0).toLocaleString("en-IN")}`,
    addOns.length ? `Add-ons: ${addOns.join(", ")}` : "Add-ons: None",
  ]
    .filter(Boolean)
    .join("\n");
};

const openQuotePrintWindow = ({ title, content }) => {
  const nextWindow = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=960,height=720",
  );
  if (!nextWindow) return false;
  const safeTitle = escapeHtmlText(title);
  const safeBody = escapeHtmlText(content);
  nextWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${safeTitle}</title>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
      h1 { margin: 0 0 8px; font-size: 24px; }
      pre { white-space: pre-wrap; font: 14px/1.6 Arial, sans-serif; }
    </style>
  </head>
  <body>
    <h1>${safeTitle}</h1>
    <pre>${safeBody}</pre>
  </body>
</html>`);
  nextWindow.document.close();
  scheduleWindowPrint(nextWindow);
  return true;
};

const buildPremiumChangeInsight = ({
  quote = {},
  previousPolicyContext = {},
  computeQuoteBreakupFromRow,
  toINR,
}) => {
  const currentBreakup = computeQuoteBreakupFromRow(quote);
  const currentPremium = Number(currentBreakup?.totalPremium || 0);
  const currentOd = Number(currentBreakup?.odAmt || 0);
  const currentTp = Number(currentBreakup?.tpAmt || 0);
  const currentAddOns = Number(currentBreakup?.addOnsTotal || 0);
  const currentNcb = Number(quote?.ncbDiscount || 0);
  const currentIdv = Number(
    quote?.totalIdv ||
    Number(quote?.vehicleIdv || 0) +
    Number(quote?.cngIdv || 0) +
    Number(quote?.accessoriesIdv || 0),
  );
  const currentCoverageType = String(quote?.coverageType || "").trim();
  const currentInsurer = String(quote?.insuranceCompany || "").trim();

  const previousPremium = Number(
    previousPolicyContext?.previousTotalPremium || 0,
  );
  const previousOd = Number(
    previousPolicyContext?.previousOwnDamageAmount || 0,
  );
  const previousTp = Number(
    previousPolicyContext?.previousThirdPartyAmount || 0,
  );
  const previousAddOns = Number(
    previousPolicyContext?.previousAddOnsTotal || 0,
  );
  const previousNcb = Number(previousPolicyContext?.previousNcbDiscount || 0);
  const previousIdv = Number(previousPolicyContext?.previousIdvAmount || 0);
  const previousCoverageType = String(
    previousPolicyContext?.previousPolicyType || "",
  ).trim();
  const previousInsurer = String(
    previousPolicyContext?.previousInsuranceCompany || "",
  ).trim();
  const claimTaken = String(
    previousPolicyContext?.claimTakenLastYear || "",
  ).trim();
  const previousAddOnNames = Array.isArray(
    previousPolicyContext?.previousSelectedAddOns,
  )
    ? previousPolicyContext.previousSelectedAddOns
      .map((name) => String(name || "").trim())
      .filter(Boolean)
    : [];
  const currentAddOnNames = getIncludedAddonNames(quote);

  const hasPreviousBaseline =
    previousPremium > 0 ||
    previousOd > 0 ||
    previousTp > 0 ||
    previousAddOns > 0 ||
    previousNcb > 0 ||
    previousIdv > 0 ||
    Boolean(previousCoverageType) ||
    Boolean(previousInsurer) ||
    previousAddOnNames.length > 0;

  if (!hasPreviousBaseline) return null;

  const reasons = [];
  if (previousOd > 0 && Math.round(previousOd) !== Math.round(currentOd)) {
    reasons.push(`OD moved ${toINR(previousOd)} → ${toINR(currentOd)}`);
  }
  if (previousTp > 0 && Math.round(previousTp) !== Math.round(currentTp)) {
    reasons.push(
      `Third-party moved ${toINR(previousTp)} → ${toINR(currentTp)}`,
    );
  }
  if (
    previousAddOns > 0 ||
    currentAddOns > 0 ||
    previousAddOnNames.length > 0 ||
    currentAddOnNames.length > 0
  ) {
    const prevSet = new Set(
      previousAddOnNames.map((name) => name.toLowerCase()),
    );
    const currSet = new Set(
      currentAddOnNames.map((name) => name.toLowerCase()),
    );
    const added = currentAddOnNames.filter(
      (name) => !prevSet.has(name.toLowerCase()),
    );
    const removed = previousAddOnNames.filter(
      (name) => !currSet.has(name.toLowerCase()),
    );
    if (
      Math.round(previousAddOns) !== Math.round(currentAddOns) ||
      added.length ||
      removed.length
    ) {
      reasons.push(
        `Add-ons moved ${toINR(previousAddOns)} → ${toINR(currentAddOns)}${added.length || removed.length
          ? ` (${added.length ? `+${added.join(", ")}` : ""}${added.length && removed.length ? " | " : ""
          }${removed.length ? `-${removed.join(", ")}` : ""})`
          : ""
        }`,
      );
    }
  }
  if (Math.round(previousNcb) !== Math.round(currentNcb)) {
    reasons.push(`NCB changed ${previousNcb}% → ${currentNcb}%`);
  }
  if (
    previousIdv > 0 &&
    currentIdv > 0 &&
    Math.round(previousIdv) !== Math.round(currentIdv)
  ) {
    reasons.push(`IDV changed ${toINR(previousIdv)} → ${toINR(currentIdv)}`);
  }
  if (
    previousCoverageType &&
    currentCoverageType &&
    previousCoverageType !== currentCoverageType
  ) {
    reasons.push(
      `Policy type changed (${previousCoverageType} → ${currentCoverageType})`,
    );
  }
  if (
    previousInsurer &&
    currentInsurer &&
    normalizeInsurerName(previousInsurer) !==
    normalizeInsurerName(currentInsurer)
  ) {
    reasons.push(`Insurer changed (${previousInsurer} → ${currentInsurer})`);
  }
  if (claimTaken.toLowerCase() === "yes" && currentNcb === 0) {
    reasons.push("Claim was taken last year, so NCB likely reset.");
  }

  const diff =
    previousPremium > 0
      ? currentPremium - previousPremium
      : currentOd - previousOd || currentPremium;
  const baseValue = previousPremium > 0 ? previousPremium : previousOd || 0;
  const changePct =
    baseValue > 0 ? Math.round((Math.abs(diff) / baseValue) * 100) : null;
  const summary =
    diff === 0
      ? `Premium is unchanged vs previous baseline (${toINR(currentPremium)}).`
      : `Premium ${diff > 0 ? "increased" : "decreased"} by ${toINR(
        Math.abs(diff),
      )}${changePct != null ? ` (${changePct}%)` : ""} vs previous baseline.`;

  return {
    summary,
    reasons: reasons.length
      ? reasons
      : ["No specific factor delta captured from previous policy fields."],
  };
};

// ── FieldBlock ──
const FieldBlock = ({
  label,
  required,
  children,
  className = "",
  helper = null,
}) => (
  <div
    className={`flex flex-col gap-1.5 insurance-field-block ${className}`}
    data-ins-field="true"
  >
    <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
      {label}
      {required && <span className="ml-0.5 text-[#FF8EAD]">*</span>}
    </label>
    {children}
    <div className="min-h-[16px] pt-0.5 text-[11px] text-slate-500 leading-4">
      {helper || <span className="opacity-0">.</span>}
    </div>
  </div>
);

// ── TickerRow ──
const TickerRow = ({ label, value, valueClass = "text-slate-800", bold }) => (
  <div
    className={`flex items-center justify-between py-1 ${bold ? "border-t border-slate-100 pt-2" : ""
      }`}
  >
    <span className="text-xs text-slate-500">{label}</span>
    <span
      className={`text-sm tabular-nums font-semibold ${valueClass} ${bold ? "font-bold" : ""
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
      className={`text-[12px] ${bold
          ? "font-bold text-slate-800"
          : muted
            ? "text-slate-500"
            : "text-slate-500"
        }`}
    >
      {label}
    </span>
    <span
      className={`tabular-nums text-[12px] ${bold
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
    bg: "bg-[#9FC0FF]/35",
    ring: "ring-[#9FC0FF]",
    dot: "bg-slate-600",
    text: "text-slate-700",
    activeBg: "bg-[#9FC0FF]/70",
    activeRing: "ring-[#9FC0FF]",
  },
  {
    bg: "bg-[#DAF3FF]/40",
    ring: "ring-[#DAF3FF]",
    dot: "bg-slate-600",
    text: "text-slate-700",
    activeBg: "bg-[#DAF3FF]/75",
    activeRing: "ring-[#DAF3FF]",
  },
  {
    bg: "bg-[#FFE6C6]/55",
    ring: "ring-[#FFE6C6]",
    dot: "bg-slate-600",
    text: "text-slate-700",
    activeBg: "bg-[#FFE6C6]",
    activeRing: "ring-[#FFE6C6]",
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
  onStartEditQuote,
  onDelete,
  onShareQuote,
  onDownloadQuote,
  previousPolicyContext,
  isIssued,
  isSelected,
  onSelectQuote,
}) => {
  const [showAllAddons, setShowAllAddons] = React.useState(false);
  const [showInsightModal, setShowInsightModal] = React.useState(false);

  const rid = getQuoteRowId(row);
  const isAccepted = String(acceptedQuoteId) === String(rid);
  const breakup = computeQuoteBreakupFromRow(row);
  const palette = addonPalette[idx % addonPalette.length];
  const ncbPct = Number(row.ncbDiscount || 0);
  const isStandAloneRow = String(row.coverageType || "") === "Stand Alone OD";
  const odBeforeNcb = Number(breakup?.odAmt || 0);
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
  const logoCandidates = React.useMemo(
    () => getInsurerLogoCandidates(row.insuranceCompany),
    [row.insuranceCompany],
  );
  const [logoIdx, setLogoIdx] = React.useState(0);
  React.useEffect(() => setLogoIdx(0), [row.insuranceCompany]);
  const logoUrl = logoCandidates[logoIdx] || "";
  const premiumChangeInsight = React.useMemo(
    () =>
      buildPremiumChangeInsight({
        quote: row,
        previousPolicyContext,
        computeQuoteBreakupFromRow,
        toINR,
      }),
    [computeQuoteBreakupFromRow, previousPolicyContext, row, toINR],
  );

  return (
    <div
      className={`
        relative flex flex-col rounded-2xl bg-white transition-all duration-200
        ${isAccepted
          ? "shadow-[0_4px_24px_rgba(15,23,42,0.10)] ring-1 ring-[#9FC0FF]"
          : "shadow-[0_2px_16px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 hover:shadow-[0_6px_24px_rgba(15,23,42,0.11)]"
        }
      `}
    >
      {/* Accepted badge */}
      {isAccepted && (
        <div className="absolute -top-2.5 left-4 flex items-center gap-1">
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 shadow-sm ring-1 ring-emerald-300">
            <CheckCircleFilled className="text-[9px]" /> Accepted
          </span>
        </div>
      )}
      {!isAccepted && isCheapest && (
        <div className="absolute -top-2.5 left-4 flex items-center gap-1">
          <span className="rounded-full bg-[#FFE6C6] px-2.5 py-0.5 text-[10px] font-black text-slate-700 shadow-sm ring-1 ring-[#FFE6C6]">
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
                  ${isAccepted
                  ? "bg-[#9FC0FF]/70 text-slate-800 ring-[#9FC0FF]"
                  : `${palette.activeBg} ${palette.text} ${palette.activeRing}`
                }
                `}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={row.insuranceCompany || "Insurer"}
                  className="h-8 w-8 rounded-md object-contain bg-white"
                  onError={(e) => {
                    setLogoIdx((prev) => prev + 1);
                  }}
                />
              ) : (
                initial
              )}
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
                    {formatPolicyDuration(row.policyDuration)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <Checkbox
              checked={isSelected}
              onChange={(e) => onSelectQuote?.(rid, e.target.checked)}
              className="mb-1"
            />
            {String(row.coverageType || "") !== "Third Party" ? (
              <div>
                <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right">
                  IDV
                </p>
                <p className="m-0 text-sm font-black tabular-nums text-slate-800 text-right">
                  {formatStoredOrComputedIdv(row)}
                </p>
              </div>
            ) : null}
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

        {row.coverageType !== "Third Party" && (
          <>
            <BreakupRow label="Own Damage" value={toINR(odBeforeNcb)} bold />
            <BreakupRow
              label="Own Damage (Base)"
              value={toINR(odBeforeNcb)}
              indent
              muted
            />
            <BreakupRow label="NCB %" value={`${ncbPct}%`} indent muted />
          </>
        )}

        {row.coverageType !== "Stand Alone OD" && (
          <>
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
          </>
        )}

        {row.coverageType !== "Third Party" &&
          (includedAddons.length > 0 || Number(breakup?.addOnsTotal || 0) > 0) && (
            <>
              <BreakupRow
                label="Add Ons"
                value={toINR(breakup?.addOnsTotal ?? 0)}
                bold
              />
              {includedAddons.length > 0 ? (
                <>
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
              ) : (
                <BreakupRow
                  label="Add-ons Amount (Total)"
                  value={toINR(breakup?.addOnsTotal ?? 0)}
                  indent
                  muted
                />
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
            className={`text-xl font-black tabular-nums ${isAccepted ? "text-slate-800" : "text-slate-900"
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
      <div className="px-5 pb-5 space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => acceptQuote(rid)}
            disabled={isIssued || isAccepted}
            className={`
                flex-1 rounded-xl py-2.5 text-[13px] font-black tracking-wide
                transition-all border-0 shadow-sm
                ${isIssued
                ? "opacity-50 cursor-not-allowed bg-slate-300 text-white"
                : isAccepted
                  ? "opacity-80 cursor-not-allowed bg-emerald-500 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              }
              `}
          >
            {isAccepted ? "✓ Accepted" : "Accept"}
          </button>

          <button
            type="button"
            onClick={() => onStartEditQuote?.(row)}
            title="Edit quote"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <EditOutlined className="text-xs" />
          </button>

          {premiumChangeInsight ? (
            <button
              onClick={() => setShowInsightModal(true)}
              title="Why premium changed"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <EyeOutlined className="text-xs" />
            </button>
          ) : null}

          <Popconfirm
            title="Delete this quote?"
            description="This action cannot be undone."
            onConfirm={() => onDelete(rid)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{
              danger: true,
              className: "!bg-rose-500 !border-rose-500 !text-white",
            }}
          >
            <button
              title="Delete quote"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <DeleteOutlined className="text-xs" />
            </button>
          </Popconfirm>
        </div>
      </div>

      <Modal
        title={`${row.insuranceCompany || "Quote"} · Premium Insight`}
        open={showInsightModal}
        onCancel={() => setShowInsightModal(false)}
        footer={null}
        centered
        destroyOnHidden
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-[#DAF3FF]/45 px-3 py-3 ring-1 ring-[#9FC0FF]">
            <p className="m-0 text-[13px] font-semibold text-slate-800">
              {premiumChangeInsight?.summary}
            </p>
          </div>
          <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200">
            <p className="m-0 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Reason Factors
            </p>
            <div className="mt-2 space-y-1.5">
              {(premiumChangeInsight?.reasons || []).map((reason, idx) => (
                <div
                  key={`${reason}-${idx}`}
                  className="text-[12px] text-slate-700"
                >
                  {idx + 1}. {reason}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
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
  initialQuoteDraft,
  onStartEditQuote,
  deleteQuote,
  editingQuoteId = null,
  isNewCar = false,
  suggestedNcbDiscount = 0,
  suggestedIdv = 0,
  showStandaloneAgeWarning = false,
  toINR,
  getQuoteRowId,
  computeQuoteBreakupFromRow,
  formatStoredOrComputedIdv,
  formatStoredOrComputedPremium,
  onResetQuoteDraft,
  previousPolicyContext = {},
  isIssued = false,
}) => {
  const [acceptedQuoteModalOpen, setAcceptedQuoteModalOpen] =
    React.useState(false);
  const [selectedQuoteIds, setSelectedQuoteIds] = React.useState([]);
  const canAddQuote = Boolean(String(quoteDraft.insuranceCompany || "").trim());
  const odAmt = Number(quoteComputed?.odAmt || 0);
  const tpAmt = Number(quoteComputed?.tpAmt || 0);
  const addOnsTotal = Number(quoteComputed?.addOnsTotal || 0);
  const basePremium = odAmt + tpAmt + addOnsTotal;
  const taxableAmount = Number(quoteComputed?.taxableAmount || basePremium);
  const gstAmount = Number(quoteComputed?.gstAmount || 0);
  const totalPremium = taxableAmount + gstAmount;
  const ncbPct = Number(quoteDraft?.ncbDiscount || 0);
  const coverageType = String(quoteDraft?.coverageType || "Comprehensive");
  const previousSelectedAddOns = React.useMemo(() => {
    const fromPayload = Array.isArray(
      previousPolicyContext?.previousSelectedAddOns,
    )
      ? previousPolicyContext.previousSelectedAddOns
      : [];
    const normalized = fromPayload
      .map((name) => String(name || "").trim())
      .filter(Boolean);
    return addOnCatalog.filter((name) =>
      normalized.some(
        (n) => n.toLowerCase() === name.toLowerCase() || n.includes(name),
      ),
    );
  }, [previousPolicyContext?.previousSelectedAddOns]);
  const applyPreviousYearAddOns = React.useCallback(() => {
    if (!previousSelectedAddOns.length) return;
    setQuoteDraft((p) => {
      const nextIncluded = { ...(p.addOnsIncluded || {}) };
      const nextAddOns = { ...(p.addOns || {}) };
      previousSelectedAddOns.forEach((name) => {
        nextIncluded[name] = true;
        if (nextAddOns[name] === undefined || nextAddOns[name] === null) {
          nextAddOns[name] = 0;
        }
      });
      return {
        ...p,
        addOnsIncluded: nextIncluded,
        addOns: nextAddOns,
      };
    });
  }, [previousSelectedAddOns, setQuoteDraft]);
  const durationSelectOptions = React.useMemo(() => {
    if (coverageType === "Comprehensive") {
      return isNewCar
        ? ["1yr OD + 3yr TP", "2yr OD + 3yr TP", "3yr OD + 3yr TP"]
        : ["1yr OD + 1yr TP"];
    }
    if (coverageType === "Third Party") return ["1 Year", "2 Years", "3 Years"];
    return ["1 Year", "2 Years", "3 Years"];
  }, [coverageType, isNewCar]);

  React.useEffect(() => {
    const current = String(quoteDraft?.policyDuration || "").trim();
    if (durationSelectOptions.includes(current)) return;
    const fallback = durationSelectOptions[0] || "";
    setQuoteDraft((p) => ({ ...p, policyDuration: fallback }));
  }, [durationSelectOptions, quoteDraft?.policyDuration, setQuoteDraft]);

  const isStandAloneOd = coverageType === "Stand Alone OD";
  const includesOd = coverageType !== "Third Party";
  const includesTp =
    coverageType !== "Stand Alone OD" && coverageType !== "Own Damage";
  const allowsAddOns = includesOd;
  const addOnsSource = quoteComputed?.addOnsSource ?? "flat";
  const addOnsSourceHint = React.useMemo(() => {
    switch (addOnsSource) {
      case "selected":
        return "Sum of amounts for selected add-on pills.";
      case "flat_override":
        return "Flat add-ons total overrides the pill sum.";
      case "none":
        return "Add-ons are not part of this coverage type.";
      default:
        return "Uses aggregate add-ons when pills are off or sum is zero.";
    }
  }, [addOnsSource]);

  React.useEffect(() => {
    if (coverageType === "Stand Alone OD") {
      setQuoteDraft((p) => {
        if (Number(p.thirdPartyAmount || 0) === 0) return p;
        return {
          ...p,
          thirdPartyAmount: 0,
        };
      });
    } else if (coverageType === "Third Party") {
      setQuoteDraft((p) => {
        const needsReset =
          Number(p.vehicleIdv || 0) !== 0 ||
          Number(p.cngIdv || 0) !== 0 ||
          Number(p.accessoriesIdv || 0) !== 0 ||
          Number(p.payoutPercentage || 0) !== 0 ||
          Number(p.odAmount || 0) !== 0 ||
          Number(p.basicOwnDamage || 0) !== 0 ||
          Number(p.addOnsAmount || 0) !== 0 ||
          Object.values(p.addOnsIncluded || {}).some(Boolean);

        if (!needsReset) return p;
        return {
          ...p,
          vehicleIdv: 0,
          cngIdv: 0,
          accessoriesIdv: 0,
          payoutPercentage: 0,
          odAmount: 0,
          basicOwnDamage: 0,
          addOnsAmount: 0,
          addOnsIncluded: {},
          addOns: {},
        };
      });
    }
  }, [coverageType, setQuoteDraft]);
  const acceptedQuoteBreakup = React.useMemo(
    () => (acceptedQuote ? computeQuoteBreakupFromRow(acceptedQuote) : null),
    [acceptedQuote, computeQuoteBreakupFromRow],
  );
  const acceptedQuoteAddOns = React.useMemo(
    () => getIncludedAddonNames(acceptedQuote || {}),
    [acceptedQuote],
  );
  const acceptedQuoteSummary = React.useMemo(
    () =>
      buildQuoteSummaryText({
        quote: acceptedQuote || {},
        breakup: acceptedQuoteBreakup || {},
        customerName: previousPolicyContext?.customerName || "",
        vehicleLabel: [
          previousPolicyContext?.registrationNumber,
          previousPolicyContext?.vehicleMake,
          previousPolicyContext?.vehicleModel,
          previousPolicyContext?.vehicleVariant,
        ]
          .filter(Boolean)
          .join(" "),
      }),
    [acceptedQuote, acceptedQuoteBreakup, previousPolicyContext],
  );

  const buildQuoteShareContext = React.useCallback(
    (quote) => {
      const breakup = computeQuoteBreakupFromRow(quote);
      const summary = buildQuoteSummaryText({
        quote,
        breakup,
        customerName: previousPolicyContext?.customerName || "",
        vehicleLabel: [
          previousPolicyContext?.registrationNumber,
          previousPolicyContext?.vehicleMake,
          previousPolicyContext?.vehicleModel,
          previousPolicyContext?.vehicleVariant,
        ]
          .filter(Boolean)
          .join(" "),
      });
      return {
        title: `${quote?.insuranceCompany || "Insurance"} Quote`,
        summary,
      };
    },
    [computeQuoteBreakupFromRow, previousPolicyContext],
  );

  const buildShareUrl = React.useCallback(
    (quotesToShare) => {
      const validQuotes = quotesToShare.filter(Boolean);
      if (!validQuotes.length) return null;
      const payload = {
        customer: {
          name: previousPolicyContext?.customerName || "",
          mobile: previousPolicyContext?.mobile || "",
        },
        vehicle: {
          registration: previousPolicyContext?.registrationNumber || "",
          make: previousPolicyContext?.vehicleMake || "",
          model: previousPolicyContext?.vehicleModel || "",
          variant: previousPolicyContext?.vehicleVariant || "",
          fuelType: previousPolicyContext?.fuelType || "",
          year: previousPolicyContext?.manufactureYear || "",
          type: previousPolicyContext?.vehicleType || "",
        },
        quotes: validQuotes.map((q) => {
          const b = computeQuoteBreakupFromRow(q);
          return {
            insuranceCompany: q.insuranceCompany || "",
            coverageType: q.coverageType || "",
            policyDuration: q.policyDuration || "",
            idv: Number(b?.idv || q.totalIdv || q.vehicleIdv || 0),
            ncbDiscount: Number(q.ncbDiscount || 0),
            odAmount: Number(b?.odAmt || q.odAmount || 0),
            tpAmount: Number(b?.tpAmt || q.thirdPartyAmount || 0),
            addOnsTotal: Number(b?.addOnsTotal || q.addOnsTotal || 0),
            gstAmount: Number(b?.gstAmt || q.gstAmount || 0),
            totalPremium: Number(b?.totalPremium || q.totalPremium || 0),
            isAccepted: Boolean(q.isAccepted),
            addOns: Object.entries(q.addOns || {})
              .filter(([, v]) => Number(v) > 0)
              .map(([k, v]) => ({ name: k, amount: Number(v) })),
          };
        }),
      };
      const encoded = encodeURIComponent(JSON.stringify(payload));
      return `${window.location.origin}/quote-share?d=${encoded}`;
    },
    [previousPolicyContext, computeQuoteBreakupFromRow],
  );

  const handleShareQuote = React.useCallback(
    async (quote) => {
      if (!quote) return;
      const url = buildShareUrl([quote]);
      if (!url) return;
      const title = `Insurance Quote – ${previousPolicyContext?.customerName || "Customer"}`;
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        Modal.success({ title: "Link copied!", content: "Share this link with your customer to view the quote." });
        return;
      }
      Modal.info({ title: "Share Quote Link", content: url });
    },
    [buildShareUrl, previousPolicyContext],
  );

  const handleDownloadQuote = React.useCallback(
    (quote) => {
      if (!quote) return;
      const { title, summary } = buildQuoteShareContext(quote);
      const opened = openQuotePrintWindow({ title, content: summary });
      if (!opened) {
        Modal.warning({
          title: "Popup blocked",
          content: "Allow popups to print or save this quote as PDF.",
        });
      }
    },
    [buildQuoteShareContext],
  );

  const handleDownloadSelectedOrDraft = React.useCallback(() => {
    if (selectedQuoteIds.length > 0) {
      selectedQuoteIds.forEach((id) => {
        const quote = quoteRows.find((q) => String(getQuoteRowId(q)) === String(id));
        if (quote) {
          handleDownloadQuote(quote);
        }
      });
    } else if (canAddQuote) {
      handleDownloadQuote(quoteDraft);
    }
  }, [selectedQuoteIds, quoteRows, getQuoteRowId, handleDownloadQuote, quoteDraft, canAddQuote]);

  const handleShareSelectedOrDraft = React.useCallback(async () => {
    let quotesToShare = [];
    if (selectedQuoteIds.length > 0) {
      quotesToShare = selectedQuoteIds
        .map((id) => quoteRows.find((q) => String(getQuoteRowId(q)) === String(id)))
        .filter(Boolean);
    } else if (canAddQuote && quoteDraft) {
      quotesToShare = [quoteDraft];
    }
    if (!quotesToShare.length) return;

    const url = buildShareUrl(quotesToShare);
    if (!url) return;
    const title = `Insurance Quotes – ${previousPolicyContext?.customerName || "Customer"}`;
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      Modal.success({ title: "Link copied!", content: "Share this link with your customer to view the quotes." });
      return;
    }
    Modal.info({ title: "Share Quote Link", content: url });
  }, [
    selectedQuoteIds,
    quoteRows,
    getQuoteRowId,
    buildShareUrl,
    previousPolicyContext,
    quoteDraft,
    canAddQuote,
  ]);

  const handleShareAcceptedQuote = React.useCallback(async () => {
    if (!acceptedQuote) return;
    await handleShareQuote(acceptedQuote);
  }, [acceptedQuote, handleShareQuote]);

  const handleDownloadAcceptedQuote = React.useCallback(() => {
    if (!acceptedQuote) return;
    handleDownloadQuote(acceptedQuote);
  }, [acceptedQuote, handleDownloadQuote]);

  return (
    <div className="insurance-step4 min-h-screen bg-slate-100/60 px-4 pb-4 pt-3 md:px-6 md:pb-6 md:pt-4 font-sans">
      {/* Page Header */}
      <div className="mb-5 rounded-xl border border-slate-200/65 bg-gradient-to-r from-sky-50/90 via-white to-amber-50/50 p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={sectionHeaderLabel}>Policy information</div>
            <h2 className="m-0 mt-1 text-[24px] font-black tracking-tight text-slate-800">
              Insurance quotes
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Add, compare and accept the best quote
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-200">
              Quotes: {quotes.length}
            </span>
            {acceptedQuote && (
              <button
                type="button"
                onClick={() => setAcceptedQuoteModalOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
              >
                <CheckCircleFilled className="text-emerald-700 text-xs" />
                <span className="text-[11px] font-bold text-emerald-800">
                  {acceptedQuote.insuranceCompany} · Accepted
                </span>
              </button>
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
              <ThunderboltOutlined className="text-[#FF8EAD]" />
              Quote Details
            </p>
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldBlock
                label="Insurance Company"
                required
                className="sm:col-span-2 lg:col-span-2"
              >
                <AutoComplete
                  value={quoteDraft.insuranceCompany}
                  size="large"
                  style={{ width: "100%" }}
                  className="w-full"
                  allowClear
                  placeholder="e.g. HDFC ERGO"
                  options={IRDAI_INSURANCE_COMPANIES.map((name) => ({
                    value: name,
                  }))}
                  onChange={(value) =>
                    setQuoteDraft((p) => ({
                      ...p,
                      insuranceCompany: String(value || ""),
                    }))
                  }
                  filterOption={(inputValue, option) =>
                    String(option?.value || "")
                      .toLowerCase()
                      .includes(String(inputValue || "").toLowerCase())
                  }
                />
              </FieldBlock>

              <FieldBlock label="Coverage Type" required>
                <Select
                  allowClear
                  size="large"
                  value={quoteDraft.coverageType}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({ ...p, coverageType: v }))
                  }
                  placeholder="Select type"
                  className="w-full quote-control"
                  options={[
                    { label: "Comprehensive", value: "Comprehensive" },
                    { label: "Third Party", value: "Third Party" },
                    { label: "Stand Alone OD", value: "Stand Alone OD" },
                  ]}
                />
              </FieldBlock>

              <FieldBlock label="Policy Duration" required>
                <Select
                  allowClear
                  size="large"
                  value={quoteDraft.policyDuration}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({ ...p, policyDuration: v }))
                  }
                  placeholder="Duration"
                  className="w-full quote-control"
                  options={durationSelectOptions.map((d) => ({
                    label: formatPolicyDuration(d),
                    value: d,
                  }))}
                />
              </FieldBlock>

              {includesOd && (
                <FieldBlock
                  label="NCB Discount (%)"
                  helper={
                    <>
                      Suggested NCB:{" "}
                      <b className="text-slate-700">
                        {Number(suggestedNcbDiscount || 0)}%
                      </b>
                      {Number(quoteDraft.ncbDiscount || 0) !==
                        Number(suggestedNcbDiscount || 0) ? (
                        <button
                          type="button"
                          onClick={() =>
                            setQuoteDraft((p) => ({
                              ...p,
                              ncbDiscount: Number(suggestedNcbDiscount || 0),
                            }))
                          }
                          className="ml-2 rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 border-0"
                        >
                          Apply
                        </button>
                      ) : null}
                    </>
                  }
                >
                  <Select
                    allowClear
                    size="large"
                    value={Number(quoteDraft.ncbDiscount || 0)}
                    onChange={(v) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        ncbDiscount: Number(v || 0),
                      }))
                    }
                    className="w-full quote-control"
                    options={NCB_OPTIONS}
                  />
                </FieldBlock>
              )}

              <FieldBlock
                label="Hypothecation"
                helper={
                  <span>
                    Quote-level value. Defaults from previous policy and remains
                    editable.
                  </span>
                }
              >
                <Select
                  allowClear
                  size="large"
                  value={quoteDraft.hypothecation || "Not Applicable"}
                  onChange={(v) =>
                    setQuoteDraft((p) => ({
                      ...p,
                      hypothecation: v,
                    }))
                  }
                  className="w-full quote-control"
                  options={HYPOTHECATION_OPTIONS}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label || "")
                      .toLowerCase()
                      .includes(String(input || "").toLowerCase())
                  }
                />
              </FieldBlock>

              {includesOd ? (
                <>
                  <FieldBlock
                    label="Vehicle IDV (₹)"
                    className="sm:col-start-1 lg:col-start-1"
                    helper={
                      <>
                        Suggested IDV:{" "}
                        <b className="text-slate-700">
                          {toINR(Number(suggestedIdv || 0))}
                        </b>
                        {Number(suggestedIdv || 0) > 0 &&
                          Number(quoteDraft.vehicleIdv || 0) !==
                          Number(suggestedIdv || 0) ? (
                          <button
                            type="button"
                            onClick={() =>
                              setQuoteDraft((p) => ({
                                ...p,
                                vehicleIdv: Number(suggestedIdv || 0),
                              }))
                            }
                            className="ml-2 rounded-full border border-[#9FC0FF] bg-[#DAF3FF] px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                          >
                            Use suggested IDV
                          </button>
                        ) : null}
                      </>
                    }
                  >
                    <InputNumber
                      size="large"
                      min={0}
                      value={Number(quoteDraft.vehicleIdv || 0)}
                      onChange={(v) =>
                        setQuoteDraft((p) => ({
                          ...p,
                          vehicleIdv: Number(v || 0),
                        }))
                      }
                      className="w-full quote-control"
                      {...inrInputProps}
                    />
                  </FieldBlock>

                  <FieldBlock label="CNG IDV (₹)">
                    <InputNumber
                      size="large"
                      min={0}
                      value={Number(quoteDraft.cngIdv || 0)}
                      onChange={(v) =>
                        setQuoteDraft((p) => ({
                          ...p,
                          cngIdv: Number(v || 0),
                        }))
                      }
                      className="w-full quote-control"
                      {...inrInputProps}
                    />
                  </FieldBlock>

                  <FieldBlock label="Accessories IDV (₹)">
                    <InputNumber
                      size="large"
                      min={0}
                      value={Number(quoteDraft.accessoriesIdv || 0)}
                      onChange={(v) =>
                        setQuoteDraft((p) => ({
                          ...p,
                          accessoriesIdv: Number(v || 0),
                        }))
                      }
                      className="w-full quote-control"
                      {...inrInputProps}
                    />
                  </FieldBlock>
                </>
              ) : null}

              {includesOd && (
                <FieldBlock label="OD Amount (₹)">
                  <InputNumber
                    size="large"
                    min={0}
                    value={Number(quoteDraft.odAmount || 0)}
                    onChange={(v) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        odAmount: Number(v || 0),
                      }))
                    }
                    className="w-full quote-control"
                    {...inrInputProps}
                  />
                </FieldBlock>
              )}

              {includesTp ? (
                <FieldBlock label="3rd Party Amount (₹)">
                  <InputNumber
                    size="large"
                    min={0}
                    value={Number(quoteDraft.thirdPartyAmount || 0)}
                    onChange={(v) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        thirdPartyAmount: Number(v || 0),
                      }))
                    }
                    className="w-full quote-control"
                    {...inrInputProps}
                  />
                </FieldBlock>
              ) : null}

              {allowsAddOns && (
                <FieldBlock label="Add-ons Amount (₹)">
                  <InputNumber
                    size="large"
                    min={0}
                    value={Number(quoteDraft.addOnsAmount || 0)}
                    onChange={(v) =>
                      setQuoteDraft((p) => ({
                        ...p,
                        addOnsAmount: Number(v || 0),
                      }))
                    }
                    className="w-full quote-control"
                    {...inrInputProps}
                  />
                </FieldBlock>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
              {showStandaloneAgeWarning && coverageType === "Stand Alone OD" ? (
                <span className="text-red-500">
                  Stand Alone OD is generally for vehicles up to 3 years old.
                </span>
              ) : null}
            </div>
          </section>

          {/* Add-on Catalogue */}
          {allowsAddOns && (
            <section className="rounded-2xl bg-white px-5 pb-5 pt-4 md:px-6 md:pb-6 md:pt-5 ring-1 ring-slate-200 shadow-sm shadow-slate-900/5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="m-0 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Additional Add-ons
                  </p>
                  <Tooltip title="Select ₹0 to include without extra charges, or enter a custom amount.">
                    <InfoCircleOutlined className="cursor-help text-slate-300 text-[11px]" />
                  </Tooltip>
                  <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DAF3FF] px-1 text-[9px] font-bold text-slate-700">
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

              {previousSelectedAddOns.length ? (
                <div className="mb-4 rounded-2xl border border-[#9FC0FF] bg-gradient-to-r from-[#DAF3FF]/60 via-white to-[#DAF3FF]/35 px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="m-0 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Previous-year add-on preset
                    </p>
                    <button
                      onClick={applyPreviousYearAddOns}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 transition-colors cursor-pointer border-0"
                    >
                      One-click apply
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {previousSelectedAddOns.map((name) => (
                      <span
                        key={`prev-${name}`}
                        className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                  <p className="m-0 mt-2 text-[11px] text-slate-500">
                    Applies last-year add-ons only. Amounts remain editable below.
                  </p>
                </div>
              ) : null}

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
                        ${included
                          ? `${palette.activeBg} ${palette.activeRing} ${palette.text} shadow-sm`
                          : "bg-white ring-slate-200 text-slate-500 hover:bg-slate-50"
                        }
                      `}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${included ? palette.dot : "bg-slate-300"
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
          )}

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
                    background: "#FFE6C6",
                    color: "#6b7280",
                    borderColor: "#DAF3FF",
                    opacity: 1,
                  }
              }
              className={`h-10 px-6 font-bold !border-0 ${canAddQuote
                  ? "!bg-blue-600 hover:!bg-blue-700 !text-white shadow-sm"
                  : "!bg-slate-100 !text-slate-500 !border !border-slate-200 !shadow-none"
                }`}
            >
              {editingQuoteId ? "Update Quote" : "Add Quote"}
            </Button>
            <Button
              size="large"
              icon={<ReloadOutlined />}
              onClick={() =>
                onResetQuoteDraft
                  ? onResetQuoteDraft()
                  : setQuoteDraft({
                    ...initialQuoteDraft,
                    ncbDiscount: Number(suggestedNcbDiscount || 0),
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
            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="primary"
                ghost
                disabled={!canAddQuote && selectedQuoteIds.length === 0}
                onClick={handleDownloadSelectedOrDraft}
                className="h-10 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 font-bold text-xs"
              >
                Download PDF
              </Button>
              <Button
                type="primary"
                ghost
                disabled={!canAddQuote && selectedQuoteIds.length === 0}
                onClick={handleShareSelectedOrDraft}
                className="h-10 border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-700 hover:text-blue-800 font-bold text-xs"
              >
                Share Quote
              </Button>
            </div>
          </div>
        </div>
        {/* end LEFT column */}

        {/* RIGHT column — sticky ticker */}
        <div className="flex flex-col gap-5">
          <div className="sticky top-5 flex flex-col gap-3 rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 px-4 pb-4 pt-4 shadow-md shadow-indigo-900/5 sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-indigo-700">
                Live Premium Estimate
              </p>
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-300/70"
                title="Recalculates on every field change"
              >
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"
                  aria-hidden
                />
                Live
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-indigo-50/40 via-slate-50/90 to-white px-3.5 py-3.5 sm:px-4">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Total payable (incl. GST)
              </p>
              <p className="m-0 mt-1 text-3xl font-black tabular-nums tracking-tight text-slate-900">
                {toINR(totalPremium)}
              </p>
              <div className="mt-3 space-y-1.5 border-t border-slate-200/80 pt-3">
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="text-slate-500">Taxable premium</span>
                  <span className="font-semibold tabular-nums text-slate-800">
                    {toINR(taxableAmount)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="text-slate-500">GST (18% of taxable)</span>
                  <span className="font-semibold tabular-nums text-slate-800">
                    {toINR(gstAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Premium components
              </p>
              <div className="rounded-xl border border-sky-100/90 bg-gradient-to-br from-sky-50/70 to-slate-50/90 px-3 py-2">
                {includesOd ? (
                  <BreakupRow
                    label="Own damage (OD)"
                    value={toINR(odAmt)}
                    indent
                  />
                ) : null}
                {includesTp ? (
                  <BreakupRow
                    label="Third party (TP)"
                    value={toINR(tpAmt)}
                    indent
                  />
                ) : null}
                {allowsAddOns ? (
                  <>
                    <BreakupRow
                      label="Add-ons"
                      value={toINR(addOnsTotal)}
                      indent
                      muted={addOnsTotal <= 0}
                    />
                    <p className="m-0 px-1 pb-1 text-[10px] leading-snug text-slate-400">
                      {addOnsSourceHint}
                    </p>
                  </>
                ) : null}
                <BreakupRow
                  label="Subtotal (taxable)"
                  value={toINR(taxableAmount)}
                  bold
                />
              </div>
            </div>

            {includesOd && (
              <div
                className={`rounded-xl border px-4 py-3.5 ${ncbPct > 0
                    ? "border-amber-300/90 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm shadow-amber-200/40"
                    : "border-slate-200 bg-slate-50/90"
                  }`}
              >
                <p
                  className={`m-0 text-[10px] font-bold uppercase tracking-widest ${ncbPct > 0 ? "text-amber-800" : "text-slate-500"
                    }`}
                >
                  NCB (reference)
                </p>
                <p
                  className={`m-0 mt-2 text-2xl font-black tabular-nums tracking-tight ${ncbPct > 0 ? "text-amber-900" : "text-slate-400"
                    }`}
                >
                  {ncbPct}%
                </p>
              </div>
            )}

            {includesOd ? (
              <>
                <Divider className="!my-0 !border-slate-100" />

                <div>
                  <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    IDV breakdown
                  </p>
                  <div className="rounded-xl border border-violet-100/90 bg-gradient-to-br from-violet-50/50 to-white px-2.5 py-1">
                    <TickerRow
                      label="Vehicle"
                      value={toINR(quoteDraft.vehicleIdv || 0)}
                    />
                    <TickerRow
                      label="CNG"
                      value={toINR(quoteDraft.cngIdv || 0)}
                    />
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
                </div>
              </>
            ) : null}
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
            <span className="rounded-full bg-[#FF8EAD]/35 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-[#FF8EAD]">
              {quotes.length}
            </span>
          </div>
          {acceptedQuote && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#9FC0FF]/60 px-2.5 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-[#9FC0FF]">
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
              <span className="rounded-xl bg-[#FF8EAD]/28 px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-[#FF8EAD]">
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
                onStartEditQuote={onStartEditQuote}
                onDelete={deleteQuote}
                isSelected={selectedQuoteIds.includes(String(getQuoteRowId(row)))}
                onSelectQuote={(rid, checked) => {
                  setSelectedQuoteIds((prev) => {
                    const strId = String(rid);
                    if (checked) {
                      return prev.includes(strId) ? prev : [...prev, strId];
                    } else {
                      return prev.filter((id) => id !== strId);
                    }
                  });
                }}
              />
            ))}
          </div>
        )}
      </section>

      <Modal
        open={acceptedQuoteModalOpen}
        onCancel={() => setAcceptedQuoteModalOpen(false)}
        footer={null}
        title="Accepted Quote"
        width={720}
      >
        {acceptedQuote ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-lg font-black text-slate-900">
                {acceptedQuote.insuranceCompany || "Accepted Quote"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {acceptedQuote.coverageType || "—"} ·{" "}
                {formatPolicyDuration(acceptedQuote.policyDuration) || "—"}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Premium
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {toINR(
                    acceptedQuoteBreakup?.totalPremium ||
                    acceptedQuote?.totalPremium ||
                    0,
                  )}
                </div>
              </div>
              {acceptedQuote?.coverageType !== "Third Party" && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    IDV
                  </div>
                  <div className="mt-1 text-lg font-black text-slate-900">
                    {toINR(
                      acceptedQuoteBreakup?.totalIdv ||
                      acceptedQuote?.totalIdv ||
                      0,
                    )}
                  </div>
                </div>
              )}
            </div>
            {acceptedQuote?.coverageType !== "Third Party" && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Accepted Add-ons
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {acceptedQuoteAddOns.length ? (
                    acceptedQuoteAddOns.map((addon) => (
                      <span
                        key={addon}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {addon}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">
                      No add-ons selected.
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={handleShareAcceptedQuote}>Share Quote</Button>
              <Button type="primary" onClick={handleDownloadAcceptedQuote}>
                Download Quote PDF
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Step4InsuranceQuotes;
