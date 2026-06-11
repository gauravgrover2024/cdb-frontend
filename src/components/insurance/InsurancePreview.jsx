import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Empty, Table } from "antd";
import {
  CheckCircleFilled,
  DeleteOutlined,
  EditOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  FieldTimeOutlined,
  WalletOutlined,
  BankOutlined,
  UserOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  FileOutlined,
} from "@ant-design/icons";
import {
  BadgeIndianRupee,
  CarFront,
  CreditCard,
  Download,
  FileText,
  Search,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import {
  escapeHtmlText,
  scheduleWindowPrint,
} from "../../utils/scheduleWindowPrint";
import { formatPolicyDuration } from "../../utils/insurancePolicyDisplay";
import { insuranceApi } from "../../api/insurance";
import API_BASE_URL from "../../config/apiBaseUrl";
import PremiumBreakupCard from "./PremiumBreakupCard";

const cx = (...classes) => classes.filter(Boolean).join(" ");
const EMPTY_LIST = Object.freeze([]);

const hasValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.some((item) => hasValue(item));
  if (typeof value === "object")
    return Object.values(value).some((item) => hasValue(item));
  return true;
};

const firstFilled = (...values) => values.find((value) => hasValue(value));

const asText = (value) => {
  if (!hasValue(value)) return "—";
  if (Array.isArray(value)) {
    const arr = value.map((item) => String(item ?? "").trim()).filter(Boolean);
    return arr.length ? arr.join(", ") : "—";
  }
  return String(value);
};

const toINR = (num) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(num) || 0);

const openPreviewPrintWindow = ({ title, lines = [] }) => {
  const popup = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=960,height=720",
  );
  if (!popup) return false;
  const safeTitle = escapeHtmlText(title);
  const safeBody = escapeHtmlText(lines.filter(Boolean).join("\n"));
  popup.document.write(`<!doctype html>
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
  popup.document.close();
  scheduleWindowPrint(popup);
  return true;
};

const asMoney = (value) => {
  if (!hasValue(value)) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return asText(value);
  return toINR(n);
};

const asPercent = (value) => {
  if (!hasValue(value)) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return asText(value);
  return `${n}%`;
};

const asDateInput = (value) => {
  if (!hasValue(value)) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const asDateTime = (value) => {
  if (!hasValue(value)) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isImageUrl = (url = "") =>
  /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(String(url));
const isVideoUrl = (url = "") =>
  /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(String(url));
const isPdfUrl = (url = "") =>
  /\.pdf(\?|#|$)/i.test(String(url)) ||
  String(url).toLowerCase().startsWith("data:application/pdf");

const getInitials = (value = "") =>
  String(value)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "IC";

const toneStyles = {
  mint: {
    card: "border-[#9FC0FF]/80 bg-[#9FC0FF]/28 dark:border-[#9FC0FF]/35 dark:bg-[#9FC0FF]/8",
    head: "text-slate-700 dark:text-slate-200",
  },
  sage: {
    card: "border-[#DAF3FF]/90 bg-[#DAF3FF]/35 dark:border-[#DAF3FF]/35 dark:bg-[#DAF3FF]/10",
    head: "text-slate-700 dark:text-slate-200",
  },
  cream: {
    card: "border-[#FFE6C6] bg-[#FFE6C6]/75 dark:border-[#FFE6C6]/30 dark:bg-[#FFE6C6]/10",
    head: "text-slate-700 dark:text-slate-200",
  },
  rose: {
    card: "border-[#FF8EAD]/80 bg-[#FF8EAD]/25 dark:border-[#FF8EAD]/35 dark:bg-[#FF8EAD]/10",
    head: "text-slate-700 dark:text-slate-200",
  },
};

const stagePillClass = (tone, active) => {
  const base =
    "group inline-flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition-colors";
  if (!active) {
    return `${base} border-border bg-background text-muted-foreground hover:border-slate-300 hover:bg-muted/35 hover:text-foreground dark:hover:border-slate-700`;
  }
  const map = {
    mint: "border-[#9FC0FF] bg-[#9FC0FF]/72 text-slate-900 dark:border-[#9FC0FF]/50 dark:bg-[#9FC0FF]/20 dark:text-slate-100",
    sage: "border-[#DAF3FF] bg-[#DAF3FF]/80 text-slate-900 dark:border-[#DAF3FF]/50 dark:bg-[#DAF3FF]/20 dark:text-slate-100",
    cream:
      "border-[#FFE6C6] bg-[#FFE6C6] text-slate-900 dark:border-[#FFE6C6]/45 dark:bg-[#FFE6C6]/16 dark:text-slate-100",
    rose: "border-[#FF8EAD] bg-[#FF8EAD]/72 text-slate-900 dark:border-[#FF8EAD]/50 dark:bg-[#FF8EAD]/20 dark:text-slate-100",
  };
  return `${base} ${map[tone] || map.mint}`;
};

const stageToneChipClass = (tone) => {
  const map = {
    mint: "bg-[#9FC0FF]/85 text-slate-800 dark:bg-[#9FC0FF]/30 dark:text-slate-100",
    sage: "bg-[#DAF3FF] text-slate-800 dark:bg-[#DAF3FF]/30 dark:text-slate-100",
    cream:
      "bg-[#FFE6C6] text-slate-800 dark:bg-[#FFE6C6]/30 dark:text-slate-100",
    rose: "bg-[#FF8EAD]/80 text-slate-800 dark:bg-[#FF8EAD]/30 dark:text-slate-100",
  };
  return map[tone] || map.mint;
};

const FieldRow = ({ label, value, highlight = false }) => (
  <div className="flex flex-col gap-1.5 border-b border-border60 py-2.5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
    <span className="max-w-full text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:max-w-[48%]">
      {label}
    </span>
    <span
      className={cx(
        "max-w-full break-words text-left text-sm font-semibold sm:max-w-[52%] sm:text-right",
        highlight
          ? "text-slate-900 dark:text-slate-100 font-bold"
          : "text-foreground",
      )}
    >
      {value}
    </span>
  </div>
);

const SectionCard = ({ title, tone = "mint", fields = [], query = "" }) => {
  const seenLabels = new Set();
  const visibleFields = fields
    .filter((field) => hasValue(field?.value))
    .filter((field) => {
      // Never render the same field label twice within one card
      const labelKey = String(field?.label || "").trim().toLowerCase();
      if (seenLabels.has(labelKey)) return false;
      seenLabels.add(labelKey);
      return true;
    })
    .filter((field) => {
      if (!query.trim()) return true;
      const hay =
        `${field.label} ${field.formatter ? field.formatter(field.value) : asText(field.value)}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });

  if (!visibleFields.length) return null;

  const ts = toneStyles[tone] || toneStyles.mint;

  return (
    <div className={cx("rounded-xl border p-3", ts.card)}>
      <p
        className={cx(
          "mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em]",
          ts.head,
        )}
      >
        {title}
      </p>
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {visibleFields.map((field) => (
          <FieldRow
            key={`${title}-${field.label}`}
            label={field.label}
            value={
              field.formatter
                ? field.formatter(field.value)
                : asText(field.value)
            }
            highlight={field.highlight}
          />
        ))}
      </div>
    </div>
  );
};

const InlineEmptyState = ({
  text = "No captured data found in this page yet.",
}) => (
  <div className="rounded-2xl border border-dashed border-border70 bg-muted/15 px-4 py-6 text-center">
    <p className="text-xs font-medium text-muted-foreground">{text}</p>
  </div>
);

const ContinuousPageSection = React.forwardRef(
  (
    { icon: IconComp, title, page, active = false, tone = "mint", children },
    ref,
  ) => (
    <section
      ref={ref}
      className={cx(
        "scroll-mt-6 rounded-[26px] border px-4 py-4 md:px-5 md:py-5",
        active
          ? "border-[#9FC0FF] bg-[#DAF3FF]/45 dark:border-[#9FC0FF]/40 dark:bg-[#DAF3FF]/10"
          : "border-border70 bg-card",
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border60 pb-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cx(
                "inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-800",
                stageToneChipClass(tone),
              )}
            >
              <IconComp size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {page}
              </p>
              <h3 className="truncate text-sm font-bold text-foreground md:text-[15px]">
                {title}
              </h3>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-3 pt-4">{children}</div>
    </section>
  ),
);

const ADDON_CATALOG = [
  "Zero Depreciation",
  "Consumables",
  "Engine Protection",
  "Roadside Assistance",
  "No Claim Bonus (NCB) Protection",
  "Key Replacement",
  "Tyre Protection",
  "Return to Invoice",
  "Driver Cover",
  "Personal Accident Cover for Passengers",
  "Loss of Personal Belongings",
  "Outstation Emergency Cover",
  "Battery Cover",
];

const API_BASE_PREVIEW = String(API_BASE_URL || "").replace(/\/+$/, "");

const looksLikeR2HostPreview = (value = "") => {
  try {
    const parsed = new URL(String(value || ""));
    const host = String(parsed.hostname || "").toLowerCase();
    return host.includes("r2.dev") || host.includes("cloudflarestorage.com");
  } catch {
    return false;
  }
};

const buildAccessibleDocumentUrlPreview = (value = "") => {
  const url = String(value || "").trim();
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  const isR2Path =
    looksLikeR2HostPreview(url) ||
    url.startsWith("/uploads/") ||
    url.startsWith("uploads/");
  if (!isR2Path || !API_BASE_PREVIEW) return url;
  return `${API_BASE_PREVIEW}/api/upload/file?url=${encodeURIComponent(url)}`;
};

const normalizePreviewDocuments = (raw = {}) => {
  const candidates = [
    raw?.documents,
    raw?.document_library,
    raw?.docs,
    raw?.attachments,
  ];
  const firstArray = candidates.find((entry) => Array.isArray(entry));
  if (!Array.isArray(firstArray)) return [];
  return firstArray
    .map((doc, index) => {
      if (!doc || typeof doc !== "object") return null;
      const rawUrl = String(
        firstFilled(
          doc?.previewUrl,
          doc?.url,
          doc?.fileUrl,
          doc?.secure_url,
          doc?.downloadUrl,
        ) || "",
      ).trim();
      if (!rawUrl) return null;
      return {
        ...doc,
        id:
          doc?.id ||
          doc?._id ||
          doc?.public_id ||
          doc?.storageKey ||
          `doc-${index}`,
        name: firstFilled(doc?.name, doc?.originalName, doc?.original_name, ""),
        previewUrl: buildAccessibleDocumentUrlPreview(rawUrl),
        url: buildAccessibleDocumentUrlPreview(rawUrl),
        rawUrl,
      };
    })
    .filter(Boolean);
};

/** Merge list-row / partial API payloads into the shape the preview UI expects */
const normalizeCaseForPreview = (raw = {}) => {
  if (!raw || typeof raw !== "object") return {};
  const snap =
    raw.customerSnapshot && typeof raw.customerSnapshot === "object"
      ? raw.customerSnapshot
      : {};
  const coalesce = (...vals) => vals.find((v) => hasValue(v));

  const docs = normalizePreviewDocuments(raw);

  const ledger = Array.isArray(raw.paymentHistory)
    ? raw.paymentHistory
    : Array.isArray(raw.payment_history)
      ? raw.payment_history
      : [];

  return {
    ...raw,
    customerName: coalesce(raw.customerName, snap.customerName, raw.companyName),
    companyName: coalesce(raw.companyName, snap.companyName),
    contactPersonName: coalesce(raw.contactPersonName, snap.contactPersonName),
    mobile: coalesce(raw.mobile, snap.primaryMobile, raw.primaryMobile),
    alternatePhone: coalesce(
      raw.alternatePhone,
      raw.alternate_phone,
      raw.altMobile,
      raw.alternateMobile,
      Array.isArray(raw.extraMobiles) ? raw.extraMobiles[0] : "",
    ),
    email: coalesce(raw.email, snap.email, raw.emailAddress),
    panNumber: coalesce(raw.panNumber, snap.panNumber),
    aadhaarNumber: coalesce(raw.aadhaarNumber, raw.aadharNumber, raw.aadhaar),
    residenceAddress: coalesce(raw.residenceAddress, snap.residenceAddress),
    pincode: coalesce(raw.pincode, snap.pincode),
    city: coalesce(raw.city, snap.city),
    documents: docs,
    quotes: Array.isArray(raw.quotes) ? raw.quotes : [],
    paymentHistory: ledger,
    payoutPercent:
      raw.payoutPercent ?? raw.payoutPercentage ?? raw.payout_percent,
    dealerChannelNo: coalesce(
      raw.channelDealerNo,
      raw.dealerChannelNo,
      raw.channel_dealer_no,
      raw.dealerChannelNumber,
      raw.dealer_channel_number,
    ),
    dealerChannelName: coalesce(raw.dealerChannelName, raw.dealerName),
    dealerMobile: coalesce(raw.dealerMobile, raw.dealer_mobile),
    assignedTo: coalesce(
      raw.assignedTo,
      raw.employeeUserId,
      raw.employeeUserID,
    ),
    acceptedQuoteId: coalesce(raw.acceptedQuoteId, raw.accepted_quote_id),
    nomineeAge: coalesce(raw.nomineeAge, raw.nominee_age),
    nomineeRelationship: coalesce(
      raw.nomineeRelationship,
      raw.nominee_relation,
    ),
    registrationAllotted: coalesce(
      raw.registrationAllotted,
      raw.registration_allotted,
    ),
    vehicleMake: coalesce(raw.vehicleMake, raw.make),
    vehicleModel: coalesce(raw.vehicleModel, raw.model),
    vehicleVariant: coalesce(raw.vehicleVariant, raw.variant),
    fuelType: coalesce(raw.fuelType, raw.vehicleFuelType),
  };
};

const daysUntilDate = (value) => {
  if (!hasValue(value)) return null;
  const end = new Date(value);
  if (Number.isNaN(end.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
};

const pickSoonestExpiry = (data = {}) => {
  const od = data.newOdExpiryDate;
  const tp = data.newTpExpiryDate;
  const ew = data.ewExpiryDate;
  const candidates = [od, tp, ew].filter(Boolean);
  if (!candidates.length) return { raw: null, days: null };
  let best = candidates[0];
  let bestDays = daysUntilDate(best);
  candidates.slice(1).forEach((d) => {
    const dd = daysUntilDate(d);
    if (bestDays === null || (dd !== null && dd < bestDays)) {
      best = d;
      bestDays = dd;
    }
  });
  return { raw: best, days: bestDays };
};

const getQuoteRowId = (q, index = 0) =>
  q?.id ?? q?._id ?? q?.quoteId ?? `quote-${index}`;

const computeQuoteBreakupFromRow = (q) => {
  if (!q || typeof q !== "object") {
    return {
      addOnsTotal: 0,
      odAmt: 0,
      tpAmt: 0,
      totalIdv: 0,
      ncbAmount: 0,
      taxableAmount: 0,
      gstAmount: 0,
      totalPremium: 0,
      addOnLines: [],
    };
  }

  const addOns = q.addOns && typeof q.addOns === "object" ? q.addOns : {};
  const coverageType = String(q.coverageType || "Comprehensive");
  const isThirdPartyOnly = coverageType === "Third Party";
  const isOdOnly =
    coverageType === "Own Damage" || coverageType === "Stand Alone OD";
  const includesOd = !isThirdPartyOnly;
  const includesTp = !isOdOnly;
  const allowsAddOns = includesOd;

  const included =
    q.addOnsIncluded && typeof q.addOnsIncluded === "object"
      ? q.addOnsIncluded
      : {};

  const selectedAddOnsTotal = ADDON_CATALOG.reduce((sum, name) => {
    if (!included[name]) return sum;
    return sum + Number(addOns[name] || 0);
  }, 0);

  const rawAddOnsTotal = Number(q.addOnsAmount || 0) + selectedAddOnsTotal;
  const addOnsTotal = allowsAddOns ? rawAddOnsTotal : 0;

  const normalizedOdAmount = Number(
    q.odAmount ?? q.ownDamage ?? q.basicOwnDamage ?? q.odPremium ?? 0,
  );
  const normalizedTpAmount = Number(
    q.thirdPartyAmount ?? q.thirdParty ?? q.basicThirdParty ?? q.tpPremium ?? 0,
  );
  const normalizedNcbDiscount = Number(
    q.ncbDiscount ?? q.newNcbDiscount ?? q.ncb_percentage ?? 0,
  );

  const odAmt = includesOd ? normalizedOdAmount : 0;
  const tpAmt = includesTp ? normalizedTpAmount : 0;

  const idvParts =
    Number(q.vehicleIdv || 0) +
    Number(q.cngIdv || 0) +
    Number(q.accessoriesIdv || 0);
  const storedIdv = Number(q.totalIdv);
  const totalIdv =
    Number.isFinite(storedIdv) && storedIdv > 0 ? storedIdv : idvParts;

  const basePremium = odAmt + tpAmt + addOnsTotal;
  const ncbAmount = Math.round((odAmt * normalizedNcbDiscount) / 100);
  const taxableAmount = Math.max(basePremium - ncbAmount, 0);
  const gstAmount = Math.round(taxableAmount * 0.18);
  const totalPremium = taxableAmount + gstAmount;

  const addOnLines = ADDON_CATALOG.filter((name) => included[name]).map(
    (name) => ({
      name,
      amount: Number(addOns[name] || 0),
    }),
  );

  return {
    addOnsTotal,
    odAmt,
    tpAmt,
    totalIdv,
    ncbAmount,
    taxableAmount,
    gstAmount,
    totalPremium,
    addOnLines,
  };
};

const formatStoredOrComputedIdv = (row) => {
  const s = Number(row?.totalIdv);
  if (Number.isFinite(s) && s > 0) return toINR(s);
  return toINR(computeQuoteBreakupFromRow(row).totalIdv);
};

const formatStoredOrComputedPremium = (row) =>
  toINR(computeQuoteBreakupFromRow(row).totalPremium);

const addonPalette = [
  {
    bg: "bg-[#9FC0FF]/35",
    ring: "ring-[#9FC0FF]",
    text: "text-slate-700",
    activeBg: "bg-[#9FC0FF]/70",
    activeRing: "ring-[#9FC0FF]",
  },
  {
    bg: "bg-[#DAF3FF]/40",
    ring: "ring-[#DAF3FF]",
    text: "text-slate-700",
    activeBg: "bg-[#DAF3FF]/75",
    activeRing: "ring-[#DAF3FF]",
  },
  {
    bg: "bg-[#FFE6C6]/55",
    ring: "ring-[#FFE6C6]",
    text: "text-slate-700",
    activeBg: "bg-[#FFE6C6]",
    activeRing: "ring-[#FFE6C6]",
  },
];

const QuotePreviewCard = ({
  row,
  idx,
  isAccepted = false,
  isCheapest = false,
}) => {
  const [showAllAddons, setShowAllAddons] = useState(false);
  const breakup = computeQuoteBreakupFromRow(row);
  const palette = addonPalette[idx % addonPalette.length];

  const ncbPct = Number(row?.ncbDiscount || 0);
  const ncbAmount = Number(breakup?.ncbAmount || 0);
  const odBeforeNcb = Number(breakup?.odAmt || 0);
  const odAfterNcb = Math.max(odBeforeNcb - ncbAmount, 0);

  const includedAddons = Object.entries(row?.addOnsIncluded || {})
    .filter(([, v]) => v)
    .map(([k]) => ({ name: k, amt: Number(row?.addOns?.[k] || 0) }));

  const initial = (row?.insuranceCompany || "?")
    .toString()
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cx(
        "relative flex flex-col rounded-2xl bg-white dark:bg-[#151515] transition-all duration-200",
        isAccepted
          ? "shadow-[0_4px_24px_rgba(15,23,42,0.10)] ring-1 ring-[#9FC0FF]"
          : "shadow-[0_2px_16px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 hover:shadow-[0_6px_24px_rgba(15,23,42,0.11)] dark:ring-slate-800",
      )}
    >
      {isAccepted && (
        <div className="absolute -top-2.5 left-4 flex items-center gap-1">
          <span className="flex items-center gap-1 rounded-full bg-[#9FC0FF] px-2.5 py-0.5 text-[10px] font-black text-slate-800 shadow-sm">
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

      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className={cx(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ring-1",
                isAccepted
                  ? "bg-[#9FC0FF]/70 text-slate-800 ring-[#9FC0FF]"
                  : `${palette.activeBg} ${palette.text} ${palette.activeRing}`,
              )}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {row?.insuranceCompany || "—"}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                {row?.coverageType && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {row.coverageType}
                  </span>
                )}
                {row?.coverageType && row?.policyDuration && (
                  <span className="text-[10px] text-slate-300">·</span>
                )}
                {row?.policyDuration && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatPolicyDuration(row.policyDuration)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              IDV
            </p>
            <p className="m-0 text-sm font-black tabular-nums text-slate-800 dark:text-slate-100">
              {formatStoredOrComputedIdv(row)}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-5 border-t border-slate-100 dark:border-slate-800" />

      <PremiumBreakupCard
        breakup={{
          ownDamage: odAfterNcb,
          ownDamageBeforeNcb: odBeforeNcb,
          ncbPercent: ncbPct,
          ncbAmount: ncbAmount,
          thirdParty: breakup?.tpAmt ?? 0,
          basicThirdParty: breakup?.tpAmt ?? 0,
          addOnsTotal: breakup?.addOnsTotal ?? 0,
          coverageType: row.coverageType || breakup?.coverageType,
        }}
        formatCurrency={toINR}
        includedAddons={includedAddons}
        showAllAddons={showAllAddons}
        onToggleAddons={() => setShowAllAddons((p) => !p)}
        totalAmount={formatStoredOrComputedPremium(row)}
        isAccepted={isAccepted}
        coverageType={row.coverageType || breakup?.coverageType}
      />

      <div className="px-5 pb-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cx(
              "flex-1 rounded-xl py-2.5 text-[13px] font-black tracking-wide border-0 shadow-sm",
              isAccepted
                ? "bg-[#9FC0FF] text-slate-800"
                : "bg-[#FF8EAD] text-slate-800",
            )}
          >
            {isAccepted ? "✓ Accepted" : "Accept"}
          </button>

          <button
            type="button"
            disabled
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-slate-50 text-slate-400 ring-1 ring-slate-200 cursor-not-allowed"
            title="Edit"
          >
            <EditOutlined className="text-xs" />
          </button>

          <button
            type="button"
            disabled
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-[#FF8EAD]/30 text-slate-500 ring-1 ring-[#FF8EAD] cursor-not-allowed"
            title="Delete"
          >
            <DeleteOutlined className="text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ENTRY_TYPES = {
  INSURER_PAYMENT: "INSURER_PAYMENT",
  CUSTOMER_RECEIPT: "CUSTOMER_RECEIPT",
  SUBVENTION_NON_RECOVERABLE: "SUBVENTION_NON_RECOVERABLE",
  SUBVENTION_REFUND: "SUBVENTION_REFUND",
};

const toAmount = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

const inferEntryType = (row = {}) => {
  if (row.entryType) return row.entryType;
  if (row.paymentType === "inhouse") return ENTRY_TYPES.INSURER_PAYMENT;
  if (row.paymentType === "customer") return ENTRY_TYPES.CUSTOMER_RECEIPT;
  if (row.paymentType === "subvention_nr")
    return ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE;
  if (row.paymentType === "adjustment") return ENTRY_TYPES.SUBVENTION_REFUND;
  return ENTRY_TYPES.INSURER_PAYMENT;
};

const normalizeLedgerRow = (row = {}, index = 0) => {
  const entryType = inferEntryType(row);
  const amount = toAmount(row.amount);
  const paidByRaw = String(
    row.paidBy || row.paymentBy || row.paymentMadeBy || "",
  ).trim();

  let paidBy = paidByRaw;
  if (entryType === ENTRY_TYPES.CUSTOMER_RECEIPT) paidBy = "Customer";
  if (
    entryType === ENTRY_TYPES.SUBVENTION_REFUND ||
    entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
  ) {
    paidBy = "Autocredits";
  }
  if (entryType === ENTRY_TYPES.INSURER_PAYMENT && !paidBy) {
    paidBy =
      String(row.paymentType || "").toLowerCase() === "customer"
        ? "Customer"
        : "Autocredits";
  }

  return {
    _id: row._id || row.id || `ins-pay-${Date.now()}-${index}`,
    entryType,
    paidBy,
    amount,
    date: row.date ?? row.paymentDate ?? row.receiptDate ?? null,
    paymentMode:
      row.paymentMode ||
      row.mode ||
      (entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
        ? ""
        : "Online Transfer/UPI"),
    transactionRef: row.transactionRef || row.reference || row.utr || "",
    bankName: row.bankName || "",
    remarks: row.remarks || "",
  };
};

const computePaymentTotals = (rows = [], premium = 0) => {
  const insurerPaidByAutocredits = rows
    .filter(
      (r) =>
        r.entryType === ENTRY_TYPES.INSURER_PAYMENT &&
        String(r.paidBy || "").toLowerCase() === "autocredits",
    )
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const insurerPaidByCustomer = rows
    .filter(
      (r) =>
        r.entryType === ENTRY_TYPES.INSURER_PAYMENT &&
        String(r.paidBy || "").toLowerCase() === "customer",
    )
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const customerRecovered = rows
    .filter((r) => r.entryType === ENTRY_TYPES.CUSTOMER_RECEIPT)
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const subventionNotRecoverable = rows
    .filter((r) => r.entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE)
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const subventionRefundPaid = rows
    .filter((r) => r.entryType === ENTRY_TYPES.SUBVENTION_REFUND)
    .reduce((sum, r) => sum + toAmount(r.amount), 0);

  const insurerPaidTotal = insurerPaidByAutocredits + insurerPaidByCustomer;
  const insurerOutstanding = Math.max(0, premium - insurerPaidTotal);

  const customerNetReceivableWhenAcPays = Math.max(
    0,
    insurerPaidByAutocredits - subventionNotRecoverable,
  );

  const customerOutstandingToAc = Math.max(
    0,
    customerNetReceivableWhenAcPays - customerRecovered,
  );

  const subventionRefundExpected = Math.max(0, premium - insurerPaidByCustomer);
  const subventionRefundOutstanding = Math.max(
    0,
    subventionRefundExpected - subventionRefundPaid,
  );

  return {
    insurerPaidByAutocredits,
    insurerPaidByCustomer,
    insurerPaidTotal,
    insurerOutstanding,
    customerRecovered,
    customerNetReceivableWhenAcPays,
    customerOutstandingToAc,
    subventionNotRecoverable,
    subventionRefundExpected,
    subventionRefundPaid,
    subventionRefundOutstanding,
  };
};

const ProgressBar = ({ value, total, color = "#7a978e" }) => {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
};

const PaymentMetricCard = ({
  title,
  value,
  sub,
  icon,
  accent = "#7a978e",
  accentBg = "#eef3ef",
  progress,
  progressTotal,
  tooltip,
}) => (
  <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#151515] p-4 shadow-sm transition-shadow hover:shadow-md">
    <div
      className="absolute right-0 top-0 h-20 w-20 rounded-bl-[60px] opacity-40"
      style={{ backgroundColor: accentBg }}
    />
    <div className="relative z-10 mb-3 flex items-start justify-between">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
        style={{ backgroundColor: accent }}
      >
        {icon}
      </div>
      {tooltip && (
        <div title={tooltip}>
          <InfoCircleOutlined className="cursor-help text-slate-300 hover:text-slate-500" />
        </div>
      )}
    </div>

    <div className="relative z-10">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </div>
      <div className="mt-0.5 text-2xl font-black tabular-nums text-slate-800 dark:text-slate-100">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-[11px] leading-tight text-slate-500 dark:text-slate-400">
          {sub}
        </div>
      ) : null}
      {progress !== undefined ? (
        <ProgressBar value={progress} total={progressTotal} color={accent} />
      ) : null}
    </div>
  </div>
);

const renderEntryIcon = (row) => {
  if (row.entryType === ENTRY_TYPES.CUSTOMER_RECEIPT) {
    return <ArrowDownOutlined className="text-emerald-600" />;
  }

  if (
    row.entryType === ENTRY_TYPES.INSURER_PAYMENT &&
    String(row.paidBy || "").toLowerCase() === "customer"
  ) {
    return <SwapOutlined className="text-sky-600" />;
  }

  if (row.entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE) {
    return <SwapOutlined className="text-amber-600" />;
  }

  if (row.entryType === ENTRY_TYPES.SUBVENTION_REFUND) {
    return <ArrowUpOutlined className="text-orange-600" />;
  }

  return <ArrowUpOutlined className="text-rose-600" />;
};

const renderEntryLabel = (row) => {
  if (row.entryType === ENTRY_TYPES.INSURER_PAYMENT)
    return "Paid to Insurance Co.";
  if (row.entryType === ENTRY_TYPES.CUSTOMER_RECEIPT)
    return "Receipt from Customer";
  if (row.entryType === ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE)
    return "Subvention (Not Recoverable)";
  return "Subvention refund to Customer";
};

const STAGE_CATALOG = [
  {
    originalStep: 1,
    key: "customer",
    title: "Customer Information",
    icon: UserRound,
    tone: "mint",
  },
  {
    originalStep: 2,
    key: "vehicle",
    title: "Vehicle Details",
    icon: CarFront,
    tone: "sage",
  },
  {
    originalStep: 3,
    key: "previous",
    title: "Previous Policy",
    icon: FileText,
    tone: "cream",
  },
  {
    originalStep: 4,
    key: "quotes",
    title: "Insurance Quotes",
    icon: BadgeIndianRupee,
    tone: "rose",
  },
  {
    originalStep: 6,
    key: "policy",
    title: "New Policy Details",
    icon: Shield,
    tone: "mint",
  },
  {
    originalStep: 7,
    key: "documents",
    title: "Documents",
    icon: FileText,
    tone: "sage",
  },
  {
    originalStep: 8,
    key: "payment",
    title: "Payment",
    icon: CreditCard,
    tone: "cream",
  },
];

// Temporarily disable documents stage in insurance preview modal.
const SHOW_INSURANCE_PREVIEW_DOCUMENTS = false;

const InsurancePreview = ({
  visible,
  onClose,
  data: incomingData,
  initialStageKey = null,
}) => {
  const [activeStage, setActiveStage] = useState("customer");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [detailPayload, setDetailPayload] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const sectionRefs = useRef({});
  const contentScrollRef = useRef(null);
  const suppressScrollSyncUntilRef = useRef(0);

  useEffect(() => {
    if (!visible || !incomingData) {
      setDetailPayload(null);
      setDetailLoading(false);
      return undefined;
    }
    const caseRef = String(
      incomingData._id || incomingData.id || incomingData.caseId || "",
    ).trim();
    setDetailPayload(null);
    if (!caseRef) {
      setDetailLoading(false);
      return undefined;
    }
    let cancelled = false;
    setDetailLoading(true);
    insuranceApi
      .getById(caseRef)
      .then((res) => {
        if (cancelled) return;
        const body = res?.data?.data ?? res?.data ?? null;
        if (body && typeof body === "object") setDetailPayload(body);
      })
      .catch((err) => {
        console.error("[InsurancePreview] Failed to load full case:", err);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, incomingData?._id, incomingData?.id, incomingData?.caseId]);

  const data = useMemo(() => {
    if (!incomingData) return {};
    const merged =
      detailPayload && typeof detailPayload === "object"
        ? { ...incomingData, ...detailPayload }
        : incomingData;
    return normalizeCaseForPreview(merged);
  }, [incomingData, detailPayload]);

  const isMobileViewport = viewportWidth < 768;
  const isNewCar = String(data?.vehicleType || "").trim() === "New Car";

  const visibleStages = useMemo(() => {
    return STAGE_CATALOG.filter((stage) => {
      if (isNewCar && stage.originalStep === 3) return false;
      if (!SHOW_INSURANCE_PREVIEW_DOCUMENTS && stage.key === "documents")
        return false;
      return true;
    }).map((stage, idx) => ({
      ...stage,
      displayStep: idx + 1,
      displayLabel: `Step ${idx + 1}`,
    }));
  }, [isNewCar]);

  const stageByKey = useMemo(() => {
    const m = new Map();
    visibleStages.forEach((stage) => m.set(stage.key, stage));
    return m;
  }, [visibleStages]);

  const stageKeys = useMemo(
    () => visibleStages.map((stage) => stage.key),
    [visibleStages],
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const fallbackStage = visibleStages[0]?.key || "customer";
    const preferredStage = stageByKey.has(initialStageKey)
      ? initialStageKey
      : fallbackStage;
    setActiveStage(preferredStage);
    setSearchQuery("");
    const timer = window.setTimeout(() => {
      const container = contentScrollRef.current;
      const section = sectionRefs.current[preferredStage];
      if (!container) return;
      container.scrollTo({
        top: Math.max(0, (section?.offsetTop || 0) - 16),
        behavior: "auto",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [visible, visibleStages, stageByKey, initialStageKey]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!visible) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll =
      document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior =
        previousHtmlOverscroll;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const container = contentScrollRef.current;
    if (!container || !stageKeys.length) return undefined;

    let frame = null;

    const syncActiveFromScroll = () => {
      if (Date.now() < suppressScrollSyncUntilRef.current) return;
      const scrollTop = container.scrollTop;
      const activationLine = scrollTop + 140;

      const candidate = stageKeys.reduce((current, key) => {
        const node = sectionRefs.current[key];
        if (!node) return current;
        if (node.offsetTop - 96 <= activationLine) return key;
        return current;
      }, stageKeys[0] || "customer");

      if (candidate && candidate !== activeStage) setActiveStage(candidate);
    };

    const onScroll = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncActiveFromScroll);
    };

    syncActiveFromScroll();
    container.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      container.removeEventListener("scroll", onScroll);
    };
  }, [visible, stageKeys, activeStage]);

  const suppressScrollSync = (duration = 500) => {
    suppressScrollSyncUntilRef.current = Date.now() + duration;
  };

  const scrollToStage = (key) => {
    suppressScrollSync();
    setActiveStage(key);
    const container = contentScrollRef.current;
    const section = sectionRefs.current[key];
    if (!container || !section) return;
    container.scrollTo({
      top: Math.max(0, section.offsetTop - 16),
      behavior: "smooth",
    });
  };

  const quotes = useMemo(() => {
    const rows = Array.isArray(data?.quotes) ? data.quotes : EMPTY_LIST;
    const seen = new Set();
    return rows.filter((row, idx) => {
      // Drop duplicate quote rows (same quote id)
      const key = String(getQuoteRowId(row, idx) || "").trim();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data?.quotes]);
  const acceptedQuoteId = firstFilled(
    data?.acceptedQuoteId,
    data?.accepted_quote_id,
  );
  const acceptedQuote =
    data?.acceptedQuote ||
    quotes.find(
      (q, idx) => String(getQuoteRowId(q, idx)) === String(acceptedQuoteId),
    ) ||
    null;

  const documents = useMemo(
    () => (Array.isArray(data?.documents) ? data.documents : EMPTY_LIST),
    [data?.documents],
  );

  const paymentHistoryRaw = useMemo(() => {
    if (Array.isArray(data?.paymentHistory)) return data.paymentHistory;
    if (Array.isArray(data?.payment_history)) return data.payment_history;
    return EMPTY_LIST;
  }, [data?.paymentHistory, data?.payment_history]);

  const paymentHistory = useMemo(() => {
    const seen = new Set();
    return paymentHistoryRaw
      .filter((row) => {
        // Drop duplicate ledger entries (same id / idempotency key)
        const key = String(
          row?.idempotencyKey || row?.idempotency_key || row?._id || row?.id || "",
        ).trim();
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((row, idx) => normalizeLedgerRow(row, idx));
  }, [paymentHistoryRaw]);

  const premiumAmount = Number(
    firstFilled(
      data?.newTotalPremium,
      acceptedQuote?.totalPremium,
      computeQuoteBreakupFromRow(acceptedQuote).totalPremium,
      0,
    ),
  );

  const paymentTotals = useMemo(
    () => computePaymentTotals(paymentHistory, premiumAmount),
    [paymentHistory, premiumAmount],
  );

  const caseStatus = asText(
    firstFilled(data?.status, data?.newPolicyNumber ? "active" : "draft"),
  );
  const caseId = asText(firstFilled(data?.caseId, data?.id));
  const customerName = firstFilled(
    data?.customerName,
    data?.companyName,
    "Insurance Case",
  );
  const vehicleLabel = [
    data?.vehicleMake,
    data?.vehicleModel,
    data?.vehicleVariant,
  ]
    .filter(Boolean)
    .join(" ");
  const initials = getInitials(customerName);
  const handleDownloadPreview = () => {
    const exp = pickSoonestExpiry(data || {});
    const opened = openPreviewPrintWindow({
      title: `${customerName} Insurance Summary`,
      lines: [
        caseId ? `Case ID: ${caseId}` : "",
        `Customer: ${customerName}`,
        vehicleLabel ? `Vehicle: ${vehicleLabel}` : "",
        data?.registrationNumber
          ? `Registration: ${data.registrationNumber}`
          : "",
        acceptedQuote?.insuranceCompany
          ? `Accepted Quote: ${acceptedQuote.insuranceCompany}`
          : "",
        `Premium: ${toINR(premiumAmount)}`,
        `Status: ${caseStatus}`,
        exp.raw
          ? `Next expiry: ${asDateInput(exp.raw)} (${exp.days ?? "—"} days)`
          : "",
        data?.policyDoneBy ? `Policy issued via: ${data.policyDoneBy}` : "",
        data?.brokerName ? `Broker: ${data.brokerName}` : "",
        data?.showroomName ? `Showroom: ${data.showroomName}` : "",
      ],
    });
    if (!opened) {
      window.alert("Popup blocked. Allow popups to save the preview as PDF.");
    }
  };

  const galleryItems = useMemo(() => {
    return (documents || [])
      .map((doc, idx) => {
        const url = String(
          firstFilled(doc?.previewUrl, doc?.url, doc?.fileUrl, doc?.secure_url),
        ).trim();
        if (!url) return null;
        const kind = isImageUrl(url)
          ? "image"
          : isVideoUrl(url)
            ? "video"
            : null; // Don't show non-media in the gallery grid

        if (!kind) return null;
        return {
          key: String(doc?.id || idx),
          name: asText(firstFilled(doc?.name, doc?.tag, `Media ${idx + 1}`)),
          tag: asText(firstFilled(doc?.tag, doc?.type, "")),
          url,
          kind,
        };
      })
      .filter(Boolean);
  }, [documents]);

  const quotePremiums = useMemo(
    () =>
      quotes.map((q) =>
        Number(computeQuoteBreakupFromRow(q).totalPremium || 0),
      ),
    [quotes],
  );
  const lowestPremium = quotePremiums.length
    ? Math.min(...quotePremiums)
    : null;

  const expiryInfo = useMemo(() => pickSoonestExpiry(data || {}), [data]);

  const fileDocuments = useMemo(() => {
    const docs = Array.isArray(data?.documents) ? data.documents : [];
    return docs
      .map((doc, idx) => {
        const rawUrl = String(
          firstFilled(
            doc?.previewUrl,
            doc?.url,
            doc?.fileUrl,
            doc?.secure_url,
          ) || "",
        ).trim();
        if (!rawUrl) return null;
        if (isImageUrl(rawUrl) || isVideoUrl(rawUrl)) return null;
        const proxied = buildAccessibleDocumentUrlPreview(rawUrl);
        return {
          key: String(doc?.id || doc?.public_id || doc?.storageKey || idx),
          name: asText(
            firstFilled(
              doc?.originalName,
              doc?.original_name,
              doc?.name,
              doc?.tag,
              `Document ${idx + 1}`,
            ),
          ),
          tag: asText(doc?.tag || ""),
          url: proxied,
        };
      })
      .filter(Boolean);
  }, [data?.documents]);

  const paymentColumns = [
    {
      title: "Date",
      key: "date",
      width: 140,
      render: (_, row) => asDateInput(row.date),
    },
    {
      title: "Entry",
      key: "entry",
      width: 240,
      render: (_, row) => (
        <div className="flex items-start gap-2.5">
          <span className="mt-[2px]">{renderEntryIcon(row)}</span>
          <div className="min-w-0">
            <p className="m-0 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
              {renderEntryLabel(row)}
            </p>
            <p className="m-0 text-[11px] text-slate-500 dark:text-slate-400">
              by {row.paidBy || "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Amount",
      key: "amount",
      width: 140,
      render: (_, row) => (
        <span className="font-bold tabular-nums text-slate-800 dark:text-slate-100">
          {asMoney(row.amount)}
        </span>
      ),
    },
    {
      title: "Mode",
      key: "mode",
      width: 150,
      render: (_, row) => asText(row.paymentMode),
    },
    {
      title: "Ref",
      key: "ref",
      width: 160,
      render: (_, row) => asText(row.transactionRef),
    },
    {
      title: "Remarks",
      key: "remarks",
      width: 240,
      render: (_, row) => asText(row.remarks),
    },
  ];

  const renderStepLabel = (key) => stageByKey.get(key)?.displayLabel || "Step";
  const hasStage = (key) => stageByKey.has(key);

  if (!visible || !incomingData) return null;

  const subventionCardIsNR = paymentTotals.subventionNotRecoverable > 0;
  const subventionCardValue = subventionCardIsNR
    ? paymentTotals.subventionNotRecoverable
    : paymentTotals.subventionRefundPaid;
  const subventionCardTotal = subventionCardIsNR
    ? Math.max(1, paymentTotals.subventionNotRecoverable)
    : Math.max(1, paymentTotals.subventionRefundExpected);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <div
        className="fixed z-50 flex flex-col overflow-hidden border border-border bg-background shadow-2xl"
        style={{
          top: isMobileViewport ? "0" : "calc(50% + 18px)",
          left: isMobileViewport ? "0" : "50%",
          transform: isMobileViewport ? "none" : "translate(-50%, -50%)",
          width: isMobileViewport ? "100vw" : "min(1120px, 96vw)",
          height: isMobileViewport ? "100dvh" : "min(90vh, 840px)",
          borderRadius: isMobileViewport ? "0" : "18px",
        }}
      >
        <div className="flex-shrink-0 border-b border-border bg-card">
          <div className="bg-gradient-to-r from-[#DAF3FF]/75 via-[#FFE6C6]/75 to-[#9FC0FF]/55 px-3 py-3 md:px-5 md:py-4 dark:from-[#DAF3FF]/10 dark:via-[#FFE6C6]/10 dark:to-[#9FC0FF]/10">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#FF8EAD] text-sm font-bold text-slate-900 dark:bg-[#FF8EAD]/60 dark:text-slate-100">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-bold tracking-[-0.01em] text-foreground md:text-base">
                        {asText(customerName)}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-[#9FC0FF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-800 dark:bg-[#9FC0FF]/35 dark:text-slate-100">
                        {caseStatus}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full border border-[#9FC0FF] bg-[#DAF3FF] px-2.5 py-1 font-mono font-semibold text-slate-700 dark:border-[#9FC0FF]/40 dark:bg-[#DAF3FF]/15 dark:text-slate-200">
                        {caseId}
                      </span>
                      {hasValue(data.registrationNumber) ? (
                        <span className="rounded-full border border-border70 px-2.5 py-1 font-medium">
                          {data.registrationNumber}
                        </span>
                      ) : null}
                      {hasValue(vehicleLabel) ? (
                        <span className="truncate rounded-full border border-border70 px-2.5 py-1 font-medium">
                          {vehicleLabel}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-border70 px-2.5 py-1 font-medium">
                        {premiumAmount
                          ? asMoney(premiumAmount)
                          : "Premium Pending"}
                      </span>
                      {expiryInfo.raw ? (
                        <span
                          className={`rounded-full border px-2.5 py-1 font-medium ${expiryInfo.days !== null &&
                              expiryInfo.days <= 30 &&
                              expiryInfo.days >= 0
                              ? "border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-500/60 dark:bg-amber-950/40 dark:text-amber-100"
                              : expiryInfo.days !== null && expiryInfo.days < 0
                                ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/50 dark:bg-rose-950/35 dark:text-rose-100"
                                : "border-border70"
                            }`}
                        >
                          Expiry {asDateInput(expiryInfo.raw)}
                          {expiryInfo.days !== null
                            ? ` · ${expiryInfo.days}d`
                            : ""}
                          {expiryInfo.days !== null &&
                            expiryInfo.days <= 30 &&
                            expiryInfo.days >= 0
                            ? " · Renew soon"
                            : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start lg:ml-4">
                {detailLoading ? (
                  <span
                    className="inline-flex h-9 items-center gap-2 rounded-2xl border border-border bg-background/80 px-3 text-[11px] font-semibold text-muted-foreground"
                    title="Loading latest case details"
                  >
                    <LoadingOutlined spin />
                    Syncing…
                  </span>
                ) : null}
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={onClose}
                  title="Close"
                  type="button"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="relative mt-3 min-w-0">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any field or value"
                className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[#FF8EAD]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {visibleStages.map((stage) => {
                const IconComp = stage.icon;
                return (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => scrollToStage(stage.key)}
                    className={stagePillClass(
                      stage.tone,
                      activeStage === stage.key,
                    )}
                  >
                    <IconComp size={14} />
                    <span>{stage.displayLabel}</span>
                    <span className="hidden opacity-80 sm:inline">
                      · {stage.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          ref={contentScrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5"
        >
          <div className="space-y-4">
            {hasStage("customer") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.customer = node;
                }}
                icon={UserRound}
                title="Customer Information"
                page={renderStepLabel("customer")}
                tone={stageByKey.get("customer")?.tone || "mint"}
                active={activeStage === "customer"}
              >
                <SectionCard
                  title="Customer + Basic Setup"
                  tone="mint"
                  query={searchQuery}
                  fields={[
                    { label: "Customer Name", value: data.customerName, highlight: true },
                    { label: "Company Name", value: data.companyName },
                    {
                      label: "Contact Person Name",
                      value: data.contactPersonName,
                    },
                    {
                      label: "Customer Mobile",
                      value: data.mobile,
                      highlight: true,
                    },
                    { label: "Alternate Phone", value: data.alternatePhone },
                    { label: "Email", value: data.email },
                    { label: "Gender", value: data.gender },
                    { label: "PAN Number", value: data.panNumber },
                    { label: "GST Number", value: data.gstNumber },
                    { label: "Aadhaar Number", value: data.aadhaarNumber },
                    {
                      label: "Residence Address",
                      value: data.residenceAddress,
                    },
                    { label: "Pincode", value: data.pincode },
                    { label: "City", value: data.city },
                    { label: "Nominee Name", value: data.nomineeName },
                    {
                      label: "Nominee Relationship",
                      value: data.nomineeRelationship,
                    },
                    { label: "Nominee DOB", value: data.nomineeDob },
                    {
                      label: "Nominee Age",
                      value: firstFilled(data.nomineeAge, data.nominee_age),
                    },
                    { label: "Buyer Type", value: data.buyerType },
                    { label: "Vehicle Type", value: data.vehicleType },
                    {
                      label: "Used-car flow",
                      value: data.usedCarFlowType,
                    },
                    {
                      label: "Policy journey",
                      value: data.policyJourneyClassification,
                    },
                    {
                      label: "Policy Type",
                      value: data.policyCategory || data.policyTypeSelector,
                    },
                    { label: "Employee (Staff)", value: data.employeeName },
                    { label: "Policy Done By", value: data.policyDoneBy },
                    { label: "Broker Name", value: data.brokerName },
                    { label: "Showroom Name", value: data.showroomName },
                    {
                      label: "Source",
                      value: data.sourceOrigin || data.source
                        ? `${data.sourceOrigin || data.source}${data.sourceName ? ` - ${data.sourceName}` : ""}`
                        : data.sourceName,
                    },
                    {
                      label: "Dealer / Channel",
                      value: data.dealerChannelName,
                    },
                    {
                      label: "Channel / Dealer No.",
                      value: data.dealerChannelNo,
                    },
                    {
                      label: "Dealer Mobile",
                      value: data.dealerMobile,
                    },
                    {
                      label: "Dealer / Channel Address",
                      value: data.dealerChannelAddress,
                    },
                    {
                      label: "Payout Applicable",
                      value: data.payoutApplicable,
                    },
                    {
                      label: "Payout %",
                      value: data.payoutPercent,
                      formatter: asPercent,
                    },
                    {
                      label: "Assigned To (User ID)",
                      value: data.assignedTo,
                    },
                    { label: "Reference Name", value: data.referenceName },
                    { label: "Reference Phone", value: data.referencePhone },
                  ]}
                />
              </ContinuousPageSection>
            )}

            {hasStage("vehicle") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.vehicle = node;
                }}
                icon={CarFront}
                title="Vehicle Details"
                page={renderStepLabel("vehicle")}
                tone={stageByKey.get("vehicle")?.tone || "sage"}
                active={activeStage === "vehicle"}
              >
                <SectionCard
                  title="Vehicle Profile + Identity"
                  tone="sage"
                  query={searchQuery}
                  fields={[
                    {
                      label: "Registration Number",
                      value: data.registrationNumber,
                      highlight: true,
                    },
                    {
                      label: "Registration Allotted",
                      value: firstFilled(data.registrationAllotted, "Yes"),
                    },
                    {
                      label: "Manufacture Month",
                      value: data.manufactureMonth,
                    },
                    { label: "Manufacture Year", value: data.manufactureYear },
                    {
                      label: "Date of Reg",
                      value: data.dateOfReg,
                      formatter: asDateInput,
                    },
                    { label: "Brand", value: data.vehicleMake },
                    { label: "Model", value: data.vehicleModel },
                    { label: "Vehicle Variant", value: data.vehicleVariant },
                    {
                      label: "Fuel Type",
                      value: firstFilled(data.fuelType, data.vehicleFuelType),
                    },
                    { label: "Cubic Capacity (cc)", value: data.cubicCapacity },
                    { label: "Types of Vehicle", value: data.typesOfVehicle },
                    { label: "Engine Number", value: data.engineNumber },
                    { label: "Chassis Number", value: data.chassisNumber },
                    { label: "Reg Authority", value: data.regAuthority },
                    {
                      label: "Manufacture Date",
                      value: data.manufactureDate,
                      formatter: asDateInput,
                    },
                    { label: "Hypothecation", value: data.hypothecation },
                    { label: "Battery Number", value: data.batteryNumber },
                    { label: "Charger Number", value: data.chargerNumber },
                  ]}
                />
              </ContinuousPageSection>
            )}

            {hasStage("previous") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.previous = node;
                }}
                icon={FileText}
                title="Previous Policy"
                page={renderStepLabel("previous")}
                tone={stageByKey.get("previous")?.tone || "cream"}
                active={activeStage === "previous"}
              >
                <SectionCard
                  title="Previous Policy Details"
                  tone="cream"
                  query={searchQuery}
                  fields={[
                    {
                      label: "Insurance Company",
                      value: data.previousInsuranceCompany,
                    },
                    {
                      label: "Policy Number",
                      value: data.previousPolicyNumber,
                    },
                    { label: "Policy Type", value: data.previousPolicyType },
                    {
                      label: "Policy Start Date",
                      value: data.previousPolicyStartDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "Policy Duration",
                      value: data.previousPolicyDuration,
                      formatter: formatPolicyDuration,
                    },
                    {
                      label: "NCB Discount",
                      value: data.previousNcbDiscount,
                      formatter: asPercent,
                    },
                    {
                      label: "Claim Taken Last Year",
                      value: data.claimTakenLastYear,
                    },
                    {
                      label: "OD Expiry Date",
                      value: data.previousPolicyType !== "Third Party" ? data.previousOdExpiryDate : null,
                      formatter: asDateInput,
                    },
                    {
                      label: "TP Expiry Date",
                      value: data.previousPolicyType === "Stand Alone OD" ? null : data.previousTpExpiryDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "Previous Hypothecation",
                      value: data.previousHypothecation,
                    },
                    { label: "Remarks", value: data.previousRemarks },
                    {
                      label: "Previous IDV",
                      value: data.previousIdvAmount,
                      formatter: asMoney,
                    },
                    {
                      label: "Previous premium",
                      value: data.previousTotalPremium,
                      formatter: asMoney,
                    },
                    {
                      label: "Prev OD Amount",
                      value: firstFilled(data.previousOwnDamageAmount, data.previousBasicOwnDamageAmount),
                      formatter: asMoney,
                    },
                    {
                      label: "Prev TP Amount",
                      value: firstFilled(data.previousThirdPartyAmount, data.previousBasicThirdPartyAmount),
                      formatter: asMoney,
                    },
                    {
                      label: "Prev Add-ons Total",
                      value: data.previousAddOnsTotal,
                      formatter: asMoney,
                    },
                    {
                      label: "Prev Selected Add-ons",
                      value: Array.isArray(data.previousSelectedAddOns) && data.previousSelectedAddOns.length
                        ? data.previousSelectedAddOns.join(", ")
                        : null,
                    },
                  ]}
                />
              </ContinuousPageSection>
            )}

            {hasStage("quotes") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.quotes = node;
                }}
                icon={BadgeIndianRupee}
                title="Insurance Quotes"
                page={renderStepLabel("quotes")}
                tone={stageByKey.get("quotes")?.tone || "rose"}
                active={activeStage === "quotes"}
              >
                {quotes.length ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border70 bg-card px-4 py-3">
                      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Quote List
                      </p>
                      {acceptedQuote ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#9FC0FF] px-3 py-1 text-[11px] font-black text-slate-800">
                          <CheckCircleFilled className="text-[10px]" />
                          {asText(acceptedQuote.insuranceCompany)} · Accepted
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {(acceptedQuote ? [acceptedQuote] : quotes)
                        .filter((row) => {
                          if (!searchQuery.trim()) return true;
                          const breakup = computeQuoteBreakupFromRow(row);
                          const text = [
                            row?.insuranceCompany,
                            row?.coverageType,
                            row?.policyDuration,
                            breakup?.totalPremium,
                            breakup?.totalIdv,
                          ]
                            .map((v) => asText(v))
                            .join(" ")
                            .toLowerCase();
                          return text.includes(
                            searchQuery.trim().toLowerCase(),
                          );
                        })
                        .map((row, idx) => {
                          const rid = getQuoteRowId(row, idx);
                          const thisPremium = Number(
                            computeQuoteBreakupFromRow(row).totalPremium || 0,
                          );
                          const acceptedById =
                            hasValue(acceptedQuoteId) &&
                            String(rid) === String(acceptedQuoteId);
                          const acceptedByData =
                            !acceptedById &&
                            acceptedQuote &&
                            String(row?.insuranceCompany || "") ===
                            String(acceptedQuote?.insuranceCompany || "") &&
                            thisPremium ===
                            Number(
                              computeQuoteBreakupFromRow(acceptedQuote)
                                .totalPremium || 0,
                            );

                          return (
                            <QuotePreviewCard
                              key={String(rid)}
                              row={row}
                              idx={idx}
                              isAccepted={acceptedById || acceptedByData}
                              isCheapest={
                                lowestPremium !== null &&
                                thisPremium === lowestPremium
                              }
                            />
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <InlineEmptyState text="No quotes available." />
                )}
              </ContinuousPageSection>
            )}

            {hasStage("policy") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.policy = node;
                }}
                icon={Shield}
                title="New Policy Details"
                page={renderStepLabel("policy")}
                tone={stageByKey.get("policy")?.tone || "mint"}
                active={activeStage === "policy"}
              >
                <SectionCard
                  title="Vehicle Pricing"
                  tone="mint"
                  query={searchQuery}
                  fields={[
                    {
                      label: "Ex-Showroom Price",
                      value: data.exShowroomPrice,
                      formatter: asMoney,
                    },
                    {
                      label: "Date of Sale",
                      value: data.dateOfSale,
                      formatter: asDateInput,
                    },
                    {
                      label: "Date of Purchase",
                      value: data.dateOfPurchase,
                      formatter: asDateInput,
                    },
                    {
                      label: "Current Odometer Reading",
                      value: data.odometerReading,
                    },
                  ]}
                />

                <SectionCard
                  title="Policy Details"
                  tone="cream"
                  query={searchQuery}
                  fields={[
                    {
                      label: "Insurance Company",
                      value: data.newInsuranceCompany,
                    },
                    { label: "Policy Type", value: data.newPolicyType },
                    { label: "Policy Number", value: data.newPolicyNumber },
                    {
                      label: "Issue Date",
                      value: data.newIssueDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "Start Date",
                      value: data.newPolicyStartDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "Insurance Duration",
                      value: data.newInsuranceDuration,
                      formatter: formatPolicyDuration,
                    },
                    {
                      label: "OD Expiry Date",
                      value: data.newPolicyType !== "Third Party" ? data.newOdExpiryDate : null,
                      formatter: asDateInput,
                    },
                    {
                      label: "TP Expiry Date",
                      value: data.newPolicyType === "Stand Alone OD" ? null : data.newTpExpiryDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "NCB Discount",
                      value: data.newNcbDiscount,
                      formatter: asPercent,
                    },
                    {
                      label: "IDV Amount",
                      value: firstFilled(
                        data.newIdvAmount,
                        acceptedQuote?.totalIdv,
                        computeQuoteBreakupFromRow(acceptedQuote).totalIdv,
                      ),
                      formatter: asMoney,
                    },
                    {
                      label: "Vehicle IDV",
                      value: data.newVehicleIdv,
                      formatter: asMoney,
                    },
                    {
                      label: "CNG IDV",
                      value: data.newCngIdv,
                      formatter: asMoney,
                    },
                    {
                      label: "Accessories IDV",
                      value: data.newAccessoriesIdv,
                      formatter: asMoney,
                    },
                    {
                      label: "Policy Purchase Date",
                      value: data.policyPurchaseDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "Total Premium",
                      value: data.newTotalPremium,
                      formatter: asMoney,
                      highlight: true,
                    },
                    { label: "Hypothecation", value: data.newHypothecation },
                    { label: "Remarks", value: data.newRemarks },
                  ]}
                />

                <SectionCard
                  title="Extended Warranty"
                  tone="sage"
                  query={searchQuery}
                  fields={[
                    {
                      label: "EW Commencement Date",
                      value: data.ewCommencementDate,
                      formatter: asDateInput,
                    },
                    {
                      label: "EW Expiry Date",
                      value: data.ewExpiryDate,
                      formatter: asDateInput,
                    },
                    { label: "Kms Coverage", value: data.kmsCoverage },
                  ]}
                />
              </ContinuousPageSection>
            )}

            {hasStage("policy") && (data.isRenewal || hasValue(data.renewalLeadStatus) || hasValue(data.renewalFollowUpStatus)) && (
              <ContinuousPageSection
                ref={(node) => { sectionRefs.current.renewal = node; }}
                icon={Shield}
                title="Renewal Tracking"
                page="Renewal"
                tone="rose"
                active={activeStage === "renewal"}
              >
                <SectionCard
                  title="Renewal Info"
                  tone="rose"
                  query={searchQuery}
                  fields={[
                    { label: "Is Renewal", value: data.isRenewal ? "Yes" : null },
                    { label: "Renewal Lead Status", value: data.renewalLeadStatus },
                    { label: "Follow-up Status", value: data.renewalFollowUpStatus },
                    { label: "Follow-up Date", value: data.renewalFollowUpDate },
                    { label: "Next Follow-up", value: data.renewalNextFollowUpDate, formatter: asDateInput },
                    { label: "Last Contacted", value: data.renewalLastContactedAt, formatter: asDateInput },
                    { label: "Assigned To", value: data.renewalAssignedToName },
                    { label: "Assigned By", value: data.renewalAssignedBy },
                    { label: "Assigned At", value: data.renewalAssignedAt, formatter: asDateInput },
                    { label: "Renewal Outcome", value: data.renewalOutcome !== "NONE" ? data.renewalOutcome : null },
                    { label: "Closed Reason", value: data.renewalClosedReason },
                    { label: "Comment", value: data.renewalComment },
                    { label: "Follow-up Notes", value: data.renewalFollowUpNotes },
                  ]}
                />
              </ContinuousPageSection>
            )}

            {/* {hasStage("documents") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.documents = node;
                }}
                icon={FileText}
                title="Documents & media"
                page={renderStepLabel("documents")}
                tone={stageByKey.get("documents")?.tone || "sage"}
                active={activeStage === "documents"}
              >
                {fileDocuments.length ? (
                  <div className="mb-4 overflow-hidden rounded-2xl border border-border70 bg-card">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border60 bg-[#DAF3FF]/65 px-4 py-3 dark:bg-[#DAF3FF]/10">
                      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        PDF and files
                      </p>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {fileDocuments.length} file
                        {fileDocuments.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="overflow-x-auto p-2 md:p-3">
                      <Table
                        columns={[
                          {
                            title: "Name",
                            dataIndex: "name",
                            key: "name",
                            ellipsis: true,
                          },
                          {
                            title: "Tag",
                            dataIndex: "tag",
                            key: "tag",
                            width: 160,
                            ellipsis: true,
                          },
                          {
                            title: "Open",
                            key: "open",
                            width: 88,
                            render: (_, row) => (
                              <a
                                href={row.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[12px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                              >
                                <FileOutlined />
                                View
                              </a>
                            ),
                          },
                        ]}
                        dataSource={fileDocuments.map((row) => ({
                          ...row,
                          key: row.key,
                        }))}
                        pagination={{ pageSize: 8, hideOnSinglePage: true }}
                        size="small"
                        scroll={{ x: 520 }}
                      />
                    </div>
                  </div>
                ) : null}
                {galleryItems.length ? (
                  <div className="overflow-hidden rounded-2xl border border-border70 bg-card">
                    <div className="border-b border-border60 bg-[#9FC0FF]/60 px-4 py-3 dark:bg-[#9FC0FF]/10">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Gallery
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {galleryItems
                        .filter((item) => {
                          if (!searchQuery.trim()) return true;
                          return `${item.name} ${item.tag}`
                            .toLowerCase()
                            .includes(searchQuery.trim().toLowerCase());
                        })
                        .map((item) => (
                          <div
                            key={item.key}
                            className="overflow-hidden rounded-xl border border-border70 bg-background"
                          >
                            <div className="flex h-40 items-center justify-center bg-[#FFE6C6]/50 p-2 dark:bg-[#FFE6C6]/8">
                              {item.kind === "image" ? (
                                <img
                                  src={item.url}
                                  alt={item.name}
                                  className="h-full w-full rounded-lg object-contain"
                                />
                              ) : item.kind === "video" ? (
                                <video
                                  src={item.url}
                                  controls
                                  className="h-full w-full rounded-lg object-contain"
                                />
                              ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                  <FileOutlined className="text-2xl" />
                                  <span className="mt-2 text-xs font-bold uppercase tracking-wider">
                                    {item.kind === "pdf" ? "PDF" : "Document"}
                                  </span>
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-slate-50 dark:border-slate-600 dark:text-indigo-400 dark:hover:bg-slate-800"
                                  >
                                    Open
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="border-t border-border60 px-3 py-2">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {item.name}
                              </p>
                              {item.tag && item.tag !== "—" ? (
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {item.tag}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}
                {!fileDocuments.length && !galleryItems.length ? (
                  <InlineEmptyState text="No documents uploaded yet." />
                ) : null}
              </ContinuousPageSection>
            )} */}

            {hasStage("payment") && (
              <ContinuousPageSection
                ref={(node) => {
                  sectionRefs.current.payment = node;
                }}
                icon={CreditCard}
                title="Payment"
                page={renderStepLabel("payment")}
                tone={stageByKey.get("payment")?.tone || "cream"}
                active={activeStage === "payment"}
              >
                {(hasValue(data.customerPaymentExpected) || hasValue(data.inhousePaymentExpected)) && (
                  <SectionCard
                    title="Payment Setup"
                    tone="mint"
                    query={searchQuery}
                    fields={[
                      { label: "Customer Payment Expected", value: data.customerPaymentExpected, formatter: asMoney },
                      { label: "Customer Payment Received", value: data.customerPaymentReceived, formatter: asMoney },
                      { label: "Inhouse Payment Expected", value: data.inhousePaymentExpected, formatter: asMoney },
                      { label: "Inhouse Payment Received", value: data.inhousePaymentReceived, formatter: asMoney },
                    ]}
                  />
                )}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <PaymentMetricCard
                    title="Total Premium"
                    value={asMoney(premiumAmount)}
                    sub="Payable to insurance company"
                    icon={<WalletOutlined />}
                    accent="#6b7ee6"
                    accentBg="#eef1ff"
                    progress={premiumAmount}
                    progressTotal={premiumAmount || 1}
                  />

                  <PaymentMetricCard
                    title="Insurer Outstanding"
                    value={asMoney(
                      Math.max(0, paymentTotals.insurerOutstanding),
                    )}
                    sub={`${asMoney(paymentTotals.insurerPaidTotal)} paid of ${asMoney(premiumAmount)}`}
                    icon={<BankOutlined />}
                    accent={
                      paymentTotals.insurerOutstanding <= 0
                        ? "#7a978e"
                        : "#c48d96"
                    }
                    accentBg={
                      paymentTotals.insurerOutstanding <= 0
                        ? "#eef3ef"
                        : "#fbf1f3"
                    }
                    progress={paymentTotals.insurerPaidTotal}
                    progressTotal={premiumAmount || 1}
                  />

                  <PaymentMetricCard
                    title="Customer Outstanding"
                    value={asMoney(
                      Math.max(0, paymentTotals.customerOutstandingToAc),
                    )}
                    sub={`${asMoney(paymentTotals.customerRecovered)} recovered`}
                    icon={<UserOutlined />}
                    accent={
                      paymentTotals.customerOutstandingToAc <= 0
                        ? "#78a087"
                        : "#b39672"
                    }
                    accentBg={
                      paymentTotals.customerOutstandingToAc <= 0
                        ? "#f2f7f3"
                        : "#faf8f1"
                    }
                    progress={paymentTotals.customerRecovered}
                    progressTotal={Math.max(
                      1,
                      paymentTotals.customerNetReceivableWhenAcPays,
                    )}
                  />

                  <PaymentMetricCard
                    title={
                      subventionCardIsNR
                        ? "Subvention (NR)"
                        : "Subvention (Refund)"
                    }
                    value={asMoney(subventionCardValue)}
                    sub={
                      subventionCardIsNR
                        ? `${asMoney(subventionCardValue)} adjusted as non-recoverable`
                        : `${asMoney(subventionCardValue)} refunded to customer`
                    }
                    icon={<SwapOutlined />}
                    accent={subventionCardIsNR ? "#b39672" : "#c48d96"}
                    accentBg={subventionCardIsNR ? "#faf8f1" : "#fbf1f3"}
                    progress={subventionCardValue}
                    progressTotal={subventionCardTotal}
                  />
                </div>

                {paymentHistory.length ? (
                  <div className="overflow-hidden rounded-2xl border border-border70 bg-card">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border60 bg-[#FFE6C6]/70 px-4 py-3 dark:bg-[#FFE6C6]/10">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Payment Ledger
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#9FC0FF] bg-[#DAF3FF] px-2.5 py-1 text-[10px] font-bold text-slate-700">
                          <CheckCircleOutlined />
                          Insurer paid {asMoney(paymentTotals.insurerPaidTotal)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#FFE6C6] bg-[#FFE6C6] px-2.5 py-1 text-[10px] font-bold text-slate-700">
                          <FieldTimeOutlined />
                          Recovered {asMoney(paymentTotals.customerRecovered)}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table
                        columns={paymentColumns}
                        dataSource={paymentHistory
                          .filter((row) => {
                            if (!searchQuery.trim()) return true;
                            const hay = [
                              renderEntryLabel(row),
                              row.paidBy,
                              row.paymentMode,
                              row.transactionRef,
                              row.remarks,
                              row.amount,
                              row.date,
                            ]
                              .map((v) => asText(v))
                              .join(" ")
                              .toLowerCase();
                            return hay.includes(
                              searchQuery.trim().toLowerCase(),
                            );
                          })
                          .map((row, idx) => ({
                            ...row,
                            key: `${row._id}-${idx}`,
                          }))}
                        pagination={false}
                        size="small"
                        scroll={{ x: 980 }}
                      />
                    </div>
                  </div>
                ) : (
                  <InlineEmptyState text="No payment ledger entries available." />
                )}
              </ContinuousPageSection>
            )}

            {!visibleStages.length ? (
              <div className="rounded-2xl border border-border70 bg-card px-6 py-10 text-center">
                <Empty description="No preview stages available for this case." />
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-border bg-card px-3 py-2.5 md:px-5">
          <span className="text-[11px] text-muted-foreground">
            {data?.updatedAt
              ? `Updated ${asDateTime(data.updatedAt)}`
              : caseId
                ? `Case ID: ${caseId}`
                : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button onClick={onClose}>Close</Button>
            <Button
              type="primary"
              icon={<Download size={14} />}
              className="!border-[#FF8EAD] !bg-[#FF8EAD] !text-slate-900 hover:!opacity-90"
              onClick={handleDownloadPreview}
            >
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default InsurancePreview;
