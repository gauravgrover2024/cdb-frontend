import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  DollarSign,
  FileText,
  Plus,
  PencilLine,
  Trash2,
  Eye,
  RefreshCw,
  Zap,
  GalleryVertical,
  TrendingUp,
  Search,
  Clock,
  X,
  Calendar,
  Car,
  Shield,
  Activity,
  Layers,
  Phone,
} from "lucide-react";
import {
  Alert,
  Button,
  Empty,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { insuranceApi } from "../../api/insurance";
import InsurancePreview from "../../components/insurance/InsurancePreview";

const STATUS_LABEL_MAP = {
  draft: "Draft",
  submitted: "Completed",
  issued: "Completed",
};

const STEP_LABEL_MAP = {
  1: "Customer",
  2: "Vehicle",
  3: "Prev. Policy",
  4: "Quotes",
  5: "Policy",
  6: "Documents",
  7: "Payment",
};

const FILTER_CHIPS = [
  { key: "all", label: "All Policies" },
  { key: "completed", label: "Completed" },
  { key: "draft", label: "Draft" },
  { key: "paymentDue", label: "Payment Due" },
  { key: "renewal30", label: "Expiring in 30 days" },
  { key: "expired", label: "Expired" },
  { key: "2w", label: "2W" },
  { key: "4w", label: "4W" },
  { key: "comm", label: "Commercial" },
];

const FONT_VARS = {
  "--default-font-family":
    '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  "--default-mono-font-family":
    '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
};

// ============================================
// UTILITY FUNCTIONS (PRESERVED FROM ORIGINAL)
// ============================================

const getCaseId = (item) => item?._id || item?.id || item?.caseId || "";

const hasDisplayValue = (value) => {
  if (value == null) return false;
  const text = String(value).trim();
  return text.length > 0 && text.toLowerCase() !== "n/a";
};

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getAcceptedQuoteContext = (record) => {
  const quotes = Array.isArray(record?.quotes) ? record.quotes : [];
  const acceptedQuoteId =
    record?.acceptedQuoteId || record?.accepted_quote_id || null;
  const acceptedQuote =
    record?.acceptedQuote ||
    quotes.find(
      (q, idx) =>
        String(getInsuranceQuoteRowId(q, idx)) === String(acceptedQuoteId),
    ) ||
    null;
  const acceptedBreakup = computeInsuranceQuoteBreakup(acceptedQuote);
  return { acceptedQuote, acceptedBreakup };
};

const premiumNum = (c) => {
  const { acceptedQuote, acceptedBreakup } = getAcceptedQuoteContext(c);
  const acceptedPremium = Number(
    acceptedQuote?.totalPremium ??
      acceptedQuote?.grossPremium ??
      acceptedQuote?.finalPremium ??
      acceptedBreakup?.totalPremium ??
      0,
  );
  if (Number.isFinite(acceptedPremium) && acceptedPremium > 0)
    return acceptedPremium;
  const fallback = Number(
    c?.newTotalPremium ?? c?.new_total_premium ?? c?.totalPremium ?? 0,
  );
  return Number.isFinite(fallback) ? fallback : 0;
};

const paymentReceivedNum = (c) => {
  const customer = Number(
    c?.customerPaymentReceived || c?.customer_payment_received || 0,
  );
  const inhouse = Number(
    c?.inhousePaymentReceived || c?.inhouse_payment_received || 0,
  );
  const total = customer + inhouse;
  return Number.isFinite(total) ? total : 0;
};

const dueNum = (c) => Math.max(0, premiumNum(c) - paymentReceivedNum(c));

const hasPolicyNumber = (c) => hasDisplayValue(c?.newPolicyNumber);

const hasIncompletePaymentChase = (c) => {
  if (!c || typeof c !== "object") return false;
  const pairs = [
    [c.customerPaymentExpected, c.customerPaymentReceived],
    [c.inhousePaymentExpected, c.inhousePaymentReceived],
    [c.customer_payment_expected, c.customer_payment_received],
    [c.inhouse_payment_expected, c.inhouse_payment_received],
  ];
  const active = pairs.filter(([exp]) => Number(exp) > 0);
  if (active.length === 0) return false;
  return active.some(([exp, rec]) => Number(rec || 0) < Number(exp));
};

const vehicleTypeLower = (c) =>
  String(c?.typesOfVehicle || "")
    .trim()
    .toLowerCase();

const isTwoWheeler = (c) => {
  const v = vehicleTypeLower(c);
  return (
    v.includes("two") ||
    v.includes("2w") ||
    v.includes("2 wheel") ||
    v.includes("bike") ||
    v.includes("scooter")
  );
};

const isCommercial = (c) => {
  const v = vehicleTypeLower(c);
  return v.includes("commercial") || /\bcomm\b/.test(v) || v.includes("goods");
};

const isFourWheeler = (c) => {
  if (isTwoWheeler(c) || isCommercial(c)) return false;
  const v = vehicleTypeLower(c);
  return (
    v.includes("four") ||
    v.includes("4w") ||
    v.includes("4 wheel") ||
    v === "" ||
    v.includes("car") ||
    v.includes("suv")
  );
};

const daysUntilExpiry = (c) => {
  const expiryDate =
    c?.newOdExpiryDate || c?.newTpExpiryDate || c?.policyExpiry;
  if (!expiryDate) return null;
  const expiry = dayjs(expiryDate);
  if (!expiry.isValid()) return null;
  return expiry.diff(dayjs(), "day");
};

const isCompletedPolicy = (c) => {
  const st = normalizeStatus(c?.status);
  return st === "submitted" || st === "issued";
};

const isDraftPolicy = (c) => normalizeStatus(c?.status) === "draft";

const isPaymentDuePolicy = (c) => {
  if (hasIncompletePaymentChase(c)) return true;
  const st = normalizeStatus(c?.status);
  if (st === "submitted" && (!hasPolicyNumber(c) || premiumNum(c) <= 0))
    return true;
  return dueNum(c) > 0;
};

const matchesPolicyFilter = (c, key) => {
  const days = daysUntilExpiry(c);
  switch (key) {
    case "all":
      return true;
    case "completed":
      return isCompletedPolicy(c);
    case "draft":
      return isDraftPolicy(c);
    case "paymentDue":
      return isPaymentDuePolicy(c);
    case "renewal30":
      return days !== null && days >= 0 && days <= 30;
    case "expired":
      return days !== null && days < 0;
    case "2w":
      return isTwoWheeler(c);
    case "4w":
      return isFourWheeler(c);
    case "comm":
      return isCommercial(c);
    default:
      return true;
  }
};

const formatInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const normalizeVehicleRegKey = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const buildTrendSeries = (history = [], width = 220, height = 56, pad = 6) => {
  const rows = Array.isArray(history) ? history : [];
  if (!rows.length) return null;
  const chartW = Math.max(1, width - pad * 2);
  const chartH = Math.max(1, height - pad * 2);
  const minX = pad;
  const minY = pad;
  const maxY = pad + chartH;
  const premiumValues = rows.map((r) => Number(r?.premium || 0));
  const pMin = Math.min(...premiumValues);
  const pMax = Math.max(...premiumValues);
  const pMid = pMin + (pMax - pMin) / 2;
  const scaleY = (value, min, max) => {
    if (!Number.isFinite(value)) return maxY;
    if (max === min) return (minY + maxY) / 2;
    return minY + ((max - value) / (max - min)) * chartH;
  };
  const points = rows.map((row, idx) => {
    const x =
      rows.length === 1
        ? minX + chartW / 2
        : minX + (idx / (rows.length - 1)) * chartW;
    return {
      ...row,
      x,
      premiumY: scaleY(Number(row?.premium || 0), pMin, pMax),
      showXLabel:
        idx === 0 ||
        idx === rows.length - 1 ||
        String(row?.policyStartYear || "") !==
          String(rows[idx - 1]?.policyStartYear || ""),
    };
  });
  const premiumPath = points
    .map(
      (p, idx) =>
        `${idx === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.premiumY.toFixed(2)}`,
    )
    .join(" ");
  return {
    points,
    premiumPath,
    axisY: maxY,
    yAxisTicks: [
      { label: formatInr(pMax), y: scaleY(pMax, pMin, pMax) },
      { label: formatInr(pMid), y: scaleY(pMid, pMin, pMax) },
      { label: formatInr(pMin), y: scaleY(pMin, pMin, pMax) },
    ],
  };
};

const INSURANCE_ENTRY_TYPES = {
  INSURER_PAYMENT: "INSURER_PAYMENT",
  CUSTOMER_RECEIPT: "CUSTOMER_RECEIPT",
  SUBVENTION_NON_RECOVERABLE: "SUBVENTION_NON_RECOVERABLE",
  SUBVENTION_REFUND: "SUBVENTION_REFUND",
};

const INSURER_SETTLEMENT_MODE = {
  NONE: "NONE",
  AUTOCREDITS: "AUTOCREDITS",
  CUSTOMER: "CUSTOMER",
  MIXED: "MIXED",
};

const toAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

const inferInsuranceEntryType = (row = {}) => {
  if (row.entryType) return row.entryType;
  if (row.paymentType === "inhouse")
    return INSURANCE_ENTRY_TYPES.INSURER_PAYMENT;
  if (row.paymentType === "customer")
    return INSURANCE_ENTRY_TYPES.CUSTOMER_RECEIPT;
  if (row.paymentType === "subvention_nr")
    return INSURANCE_ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE;
  if (row.paymentType === "adjustment")
    return INSURANCE_ENTRY_TYPES.SUBVENTION_REFUND;
  return INSURANCE_ENTRY_TYPES.INSURER_PAYMENT;
};

const normalizeInsuranceLedgerRow = (row = {}, index = 0) => {
  const entryType = inferInsuranceEntryType(row);
  const paidByRaw = String(
    row.paidBy || row.paymentBy || row.paymentMadeBy || "",
  ).trim();
  let paidBy = paidByRaw;
  if (entryType === INSURANCE_ENTRY_TYPES.CUSTOMER_RECEIPT) paidBy = "Customer";
  if (
    entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_REFUND ||
    entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
  ) {
    paidBy = "Autocredits";
  }
  if (entryType === INSURANCE_ENTRY_TYPES.INSURER_PAYMENT && !paidBy) {
    paidBy =
      String(row.paymentType || "").toLowerCase() === "customer"
        ? "Customer"
        : "Autocredits";
  }
  return {
    _id:
      row._id ||
      row.id ||
      `${entryType}-${row.date || row.paymentDate || row.createdAt || "row"}-${index}`,
    entryType,
    paidBy,
    date:
      row.date ??
      row.paymentDate ??
      row.receiptDate ??
      row.recordedAt ??
      row.createdAt ??
      null,
    amount: toAmount(row.amount),
  };
};

const sortLedgerByDate = (rows = []) =>
  [...rows].sort((a, b) => {
    const aDate = dayjs(a.date);
    const bDate = dayjs(b.date);
    if (!aDate.isValid() && !bDate.isValid()) return 0;
    if (!aDate.isValid()) return 1;
    if (!bDate.isValid()) return -1;
    return aDate.valueOf() - bDate.valueOf();
  });

const getLedgerTimelineMeta = (row = {}, index = 0) => {
  const amount = toAmount(row.amount);
  const paidBy = String(row.paidBy || "").toLowerCase();
  const dateLabel = dayjs(row.date).isValid()
    ? dayjs(row.date).format("DD MMM")
    : "—";
  const fullDateLabel = dayjs(row.date).isValid()
    ? dayjs(row.date).format("DD MMM YYYY")
    : "—";
  const base = {
    key: row._id || `ledger-${index}`,
    amount,
    dateLabel,
    fullDateLabel,
  };
  if (row.entryType === INSURANCE_ENTRY_TYPES.CUSTOMER_RECEIPT) {
    return {
      ...base,
      label: "Receipt from customer",
      note: "Customer to Autocredits",
      arrow: "↓",
      tone: "good",
    };
  }
  if (row.entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_REFUND) {
    return {
      ...base,
      label: "Subvention paid back",
      note: "Autocredits to customer",
      arrow: "↑",
      tone: "accent",
    };
  }
  if (row.entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE) {
    return {
      ...base,
      label: "Subvention not recoverable",
      note: "Short receipt / adjustment",
      arrow: "↔",
      tone: "accent",
    };
  }
  if (row.entryType === INSURANCE_ENTRY_TYPES.INSURER_PAYMENT) {
    const paidDirectlyByCustomer = paidBy === "customer";
    return {
      ...base,
      label: paidDirectlyByCustomer
        ? "Customer paid insurer"
        : "Autocredits paid insurer",
      note: paidDirectlyByCustomer
        ? "Customer to insurance company"
        : "Autocredits to insurance company",
      arrow: paidDirectlyByCustomer ? "↑" : "↔",
      tone: amount > 0 ? "good" : "warning",
    };
  }
  return {
    ...base,
    label: "Ledger entry",
    note: "Recorded payment movement",
    arrow: "↔",
    tone: "warning",
  };
};

const computeInsurancePaymentTotals = (rows = [], premium = 0) => {
  const insurerPaidByAutocredits = rows
    .filter(
      (r) =>
        r.entryType === INSURANCE_ENTRY_TYPES.INSURER_PAYMENT &&
        String(r.paidBy || "").toLowerCase() === "autocredits",
    )
    .reduce((sum, r) => sum + toAmount(r.amount), 0);
  const insurerPaidByCustomer = rows
    .filter(
      (r) =>
        r.entryType === INSURANCE_ENTRY_TYPES.INSURER_PAYMENT &&
        String(r.paidBy || "").toLowerCase() === "customer",
    )
    .reduce((sum, r) => sum + toAmount(r.amount), 0);
  const customerRecovered = rows
    .filter((r) => r.entryType === INSURANCE_ENTRY_TYPES.CUSTOMER_RECEIPT)
    .reduce((sum, r) => sum + toAmount(r.amount), 0);
  const subventionNotRecoverable = rows
    .filter(
      (r) => r.entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE,
    )
    .reduce((sum, r) => sum + toAmount(r.amount), 0);
  const subventionRefundPaid = rows
    .filter((r) => r.entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_REFUND)
    .reduce((sum, r) => sum + toAmount(r.amount), 0);
  const insurerPaidTotal = insurerPaidByAutocredits + insurerPaidByCustomer;
  const insurerOutstanding = Math.max(0, premium - insurerPaidTotal);
  const insurerSettlementMode =
    insurerPaidByCustomer > 0 && insurerPaidByAutocredits === 0
      ? INSURER_SETTLEMENT_MODE.CUSTOMER
      : insurerPaidByAutocredits > 0 && insurerPaidByCustomer === 0
        ? INSURER_SETTLEMENT_MODE.AUTOCREDITS
        : insurerPaidByAutocredits > 0 && insurerPaidByCustomer > 0
          ? INSURER_SETTLEMENT_MODE.MIXED
          : INSURER_SETTLEMENT_MODE.NONE;
  const receiptEntryVisible =
    insurerSettlementMode === INSURER_SETTLEMENT_MODE.NONE ||
    insurerSettlementMode === INSURER_SETTLEMENT_MODE.AUTOCREDITS;
  const customerNetReceivableWhenAcPays = receiptEntryVisible
    ? Math.max(0, premium - subventionNotRecoverable)
    : 0;
  const customerOutstandingToAc = receiptEntryVisible
    ? Math.max(0, customerNetReceivableWhenAcPays - customerRecovered)
    : 0;
  return {
    insurerPaidByAutocredits,
    insurerPaidByCustomer,
    insurerPaidTotal,
    insurerOutstanding,
    customerRecovered,
    customerOutstandingToAc,
    subventionNotRecoverable,
    subventionRefundPaid,
    insurerSettlementMode,
    receiptEntryVisible,
  };
};

const INSURANCE_ADDON_CATALOG = [
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

const getInsuranceQuoteRowId = (quote, index = 0) =>
  quote?.id ?? quote?._id ?? quote?.quoteId ?? `quote-${index}`;

const computeInsuranceQuoteBreakup = (quote) => {
  if (!quote || typeof quote !== "object") {
    return {
      addOnsTotal: 0,
      odAmt: 0,
      tpAmt: 0,
      totalIdv: 0,
      ncbAmount: 0,
      totalPremium: 0,
    };
  }
  const addOns =
    quote.addOns && typeof quote.addOns === "object" ? quote.addOns : {};
  const included =
    quote.addOnsIncluded && typeof quote.addOnsIncluded === "object"
      ? quote.addOnsIncluded
      : {};
  const coverageType = String(quote.coverageType || "Comprehensive");
  const isThirdPartyOnly = coverageType === "Third Party";
  const isOdOnly =
    coverageType === "Own Damage" || coverageType === "Stand Alone OD";
  const includesOd = !isThirdPartyOnly;
  const includesTp = !isOdOnly;
  const allowsAddOns = includesOd;
  const selectedAddOnsTotal = INSURANCE_ADDON_CATALOG.reduce((sum, name) => {
    if (!included[name]) return sum;
    return sum + Number(addOns[name] || 0);
  }, 0);
  const hasAnySelectedAddOn = INSURANCE_ADDON_CATALOG.some((name) =>
    Boolean(included[name]),
  );
  const flatAddOnsAmount = Number(quote.addOnsAmount || 0);
  const hasFlatOverride =
    flatAddOnsAmount > 0 &&
    hasAnySelectedAddOn &&
    Math.round(flatAddOnsAmount) !== Math.round(selectedAddOnsTotal);
  const addOnsTotal = allowsAddOns
    ? hasAnySelectedAddOn
      ? hasFlatOverride
        ? flatAddOnsAmount
        : selectedAddOnsTotal
      : flatAddOnsAmount
    : 0;
  const odAmt = includesOd
    ? Number(
        quote.odAmount ??
          quote.ownDamage ??
          quote.basicOwnDamage ??
          quote.odPremium ??
          0,
      )
    : 0;
  const tpAmt = includesTp
    ? Number(
        quote.thirdPartyAmount ??
          quote.thirdParty ??
          quote.basicThirdParty ??
          quote.tpPremium ??
          0,
      )
    : 0;
  const ncbPct = Number(
    quote.ncbDiscount ?? quote.newNcbDiscount ?? quote.ncb_percentage ?? 0,
  );
  const ncbAmount = Math.round((odAmt * ncbPct) / 100);
  const taxableAmount = Math.max(odAmt + tpAmt + addOnsTotal - ncbAmount, 0);
  const gstAmount = Math.round(taxableAmount * 0.18);
  const computedTotalPremium = taxableAmount + gstAmount;
  const storedTotalPremium = Number(
    quote.totalPremium ??
      quote.newTotalPremium ??
      quote.grossPremium ??
      quote.finalPremium ??
      0,
  );
  const totalPremium =
    Number.isFinite(storedTotalPremium) && storedTotalPremium > 0
      ? storedTotalPremium
      : computedTotalPremium;
  const idvParts =
    Number(quote.vehicleIdv || 0) +
    Number(quote.cngIdv || 0) +
    Number(quote.accessoriesIdv || 0);
  const storedIdv = Number(quote.totalIdv);
  const totalIdv =
    Number.isFinite(storedIdv) && storedIdv > 0 ? storedIdv : idvParts;
  return { addOnsTotal, odAmt, tpAmt, totalIdv, ncbAmount, totalPremium };
};

// ============================================
// UI COMPONENTS (FROM SAMPLE)
// ============================================

const MetricCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  color,
  isActive,
  onClick,
}) => {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-xl cursor-pointer border-2 transition-all"
      style={{
        background: isActive ? color : "#ffffff",
        borderColor: isActive ? color : "#e2e8f0",
        boxShadow: isActive
          ? `0 4px 12px ${color}30`
          : "0 1px 3px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div className="p-3">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{
              background: isActive ? "rgba(255, 255, 255, 0.2)" : `${color}15`,
            }}
          >
            <Icon size={18} style={{ color: isActive ? "#ffffff" : color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-semibold uppercase tracking-wide truncate"
              style={{
                color: isActive ? "rgba(255, 255, 255, 0.9)" : "#64748b",
              }}
            >
              {title}
            </p>
            <p
              className="text-2xl font-black"
              style={{ color: isActive ? "#ffffff" : "#0f172a" }}
            >
              {value}
            </p>
            {subtitle && (
              <p
                className="text-xs truncate"
                style={{
                  color: isActive ? "rgba(255,255,255,0.8)" : "#64748b",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FilterChip = ({ label, count, isActive, onClick, icon: Icon }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="rounded-lg border-2 transition-all"
      style={{
        background: isActive ? "#0f172a" : "#ffffff",
        borderColor: isActive ? "#0f172a" : "#e2e8f0",
        boxShadow: isActive ? "0 2px 8px rgba(15, 23, 42, 0.2)" : "none",
      }}
    >
      <div className="px-3 py-1.5 flex items-center gap-2">
        {Icon && (
          <Icon size={13} style={{ color: isActive ? "#ffffff" : "#64748b" }} />
        )}
        <span
          className="text-sm font-semibold"
          style={{ color: isActive ? "#ffffff" : "#0f172a" }}
        >
          {label}
        </span>
        <span
          className="px-1.5 py-0.5 rounded text-xs font-bold"
          style={{
            background: isActive ? "rgba(255, 255, 255, 0.2)" : "#f1f5f9",
            color: isActive ? "#ffffff" : "#64748b",
          }}
        >
          {count}
        </span>
      </div>
    </motion.button>
  );
};

// ============================================
// POLICY CARD (4-COLUMN LAYOUT LIKE ORIGINAL)
// ============================================

const PolicyCard = ({
  policy,
  onView,
  onEdit,
  onDelete,
  onRenew,
  onTrend,
  onExtend,
  onDocs,
}) => {
  const isDraft = policy.status === "draft";
  const isExpiringSoon = policy.expiryDays <= 30 && policy.expiryDays >= 0;
  const isExpired = policy.expiryDays < 0;
  const hasPaymentDue = policy.paid < policy.premium;
  const openDues = policy.openDues || 0;

  const statusConfig = {
    draft: { color: "#f43f5e", bg: "#fff1f2", label: "Draft" },
    submitted: { color: "#f59e0b", bg: "#fffbeb", label: "Submitted" },
    completed: { color: "#10b981", bg: "#ecfdf5", label: "Completed" },
  };

  const config = statusConfig[policy.status] || statusConfig.draft;

  const accentColor = isDraft
    ? "#f43f5e"
    : isCompletedPolicy({ status: policy.status })
      ? "#10b981"
      : "#3b82f6";

  const stepLabels = {
    1: "Customer",
    2: "Vehicle",
    3: "Prev. Policy",
    4: "Quotes",
    5: "Policy",
    6: "Documents",
    7: "Payment",
  };

  const paymentRowStyles = {
    neutral: { bg: "#ffffff", border: "#e2e8f0", color: "#64748b" },
    good: { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
    warning: { bg: "#fef3c7", border: "#fde047", color: "#a16207" },
    accent: { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af" },
  };

  const paymentRows = Array.isArray(policy.paymentTimeline)
    ? policy.paymentTimeline
    : [];

  const primaryPaymentRow = paymentRows[0] || {
    label: "Total Premium",
    amount: 0,
    type: "neutral",
  };

  const secondaryPaymentRows = paymentRows.slice(1);

  const paymentBaseAmount = Math.max(1, Number(primaryPaymentRow.amount || 0));

  const paymentSignalMeta = {
    neutral: {
      color: "#64748b",
      soft: "rgba(148, 163, 184, 0.10)",
      icon: DollarSign,
    },
    good: {
      color: "#16a34a",
      soft: "rgba(22, 163, 74, 0.10)",
      icon: CheckCircle,
    },
    warning: {
      color: "#d97706",
      soft: "rgba(217, 119, 6, 0.10)",
      icon: AlertCircle,
    },
    accent: {
      color: "#2563eb",
      soft: "rgba(37, 99, 235, 0.10)",
      icon: RefreshCw,
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow"
      style={{
        borderColor: "#dbe3ee",
        fontFamily: "var(--default-font-family)",
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ background: accentColor }}
      />

      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: "#f1f5f9" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide"
                style={{ background: config.bg, color: config.color }}
              >
                {policy.caseId}
              </span>

              <span
                className="px-2 py-0.5 rounded-md text-xs font-semibold"
                style={{
                  background: config.bg,
                  color: config.color,
                  border: `1px solid ${config.color}40`,
                }}
              >
                {config.label}
              </span>

              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                {policy.vehicleType}
              </span>

              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600">
                {policy.typesOfVehicle || "4W"}
              </span>

              {(isExpiringSoon ||
                isExpired ||
                hasPaymentDue ||
                openDues > 0) && (
                <div className="flex flex-wrap gap-2 mt-0">
                  {isExpiringSoon && (
                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-700 flex items-center gap-1">
                      <Clock size={11} />
                      Expires in {policy.expiryDays}d
                    </span>
                  )}

                  {isExpired && (
                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1">
                      <AlertCircle size={11} />
                      Expired {Math.abs(policy.expiryDays)}d ago
                    </span>
                  )}

                  {openDues > 0 && (
                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                      <DollarSign size={11} />
                      Open Dues {formatInr(openDues)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            <Tooltip title="View">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                onClick={onView}
                className="h-8 w-8 rounded-full inline-flex items-center justify-center"
                style={{ background: "#eef2ff", color: "#4f46e5" }}
              >
                <Eye size={14} />
              </motion.button>
            </Tooltip>

            <Tooltip title={isDraft ? "Continue" : "Edit"}>
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                onClick={onEdit}
                className="h-8 w-8 rounded-full inline-flex items-center justify-center"
                style={{ background: "#eef2ff", color: "#4f46e5" }}
              >
                <PencilLine size={14} />
              </motion.button>
            </Tooltip>

            <Tooltip title="Documents">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                onClick={onDocs}
                className="h-8 w-8 rounded-full inline-flex items-center justify-center"
                style={{ background: "#eff6ff", color: "#2563eb" }}
              >
                <GalleryVertical size={14} />
              </motion.button>
            </Tooltip>

            <Tooltip title="Trend">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                onClick={onTrend}
                className="h-8 w-8 rounded-full inline-flex items-center justify-center"
                style={{ background: "#f0f9ff", color: "#0284c7" }}
              >
                <TrendingUp size={14} />
              </motion.button>
            </Tooltip>

            <Tooltip title="Renew">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                onClick={onRenew}
                className="h-8 w-8 rounded-full inline-flex items-center justify-center"
                style={{ background: "#ecfdf5", color: "#059669" }}
              >
                <RefreshCw size={14} />
              </motion.button>
            </Tooltip>

            <Popconfirm
              title="Delete case"
              description={`Delete policy ${policy.caseId}? This cannot be undone.`}
              onConfirm={onDelete}
              okText="Delete"
              okType="danger"
              cancelText="Cancel"
            >
              <Tooltip title="Delete">
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                  className="h-8 w-8 rounded-full inline-flex items-center justify-center"
                  style={{ background: "#fff1f2", color: "#e11d48" }}
                >
                  <Trash2 size={14} />
                </motion.button>
              </Tooltip>
            </Popconfirm>
          </div>
        </div>
      </div>

      {/* 4-Column Grid */}
      <div className="grid grid-cols-4 gap-0">
        {/* Column 1 Customer & Vehicle */}
        <div className="p-3 border-r " style={{ borderColor: "#f1f5f9" }}>
          <div
            className="rounded-2xl"
            style={{
              borderColor: "#e2e8f0",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
            }}
          >
            {/* Header */}
            <div
              className="px-3 py-3 border-b"
              style={{ borderColor: "#e2e8f0" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 flex items-center gap-1">
                    <Car size={11} />
                    Customer &amp; Vehicle
                  </p>
                  <p className="text-[13px] font-semibold text-slate-900 mt-1 truncate">
                    {policy.displayName || "—"}
                  </p>
                  {policy.contactPerson &&
                    policy.contactPerson !== policy.displayName && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {policy.contactPerson}
                      </p>
                    )}
                </div>

                {/* Small avatar chip with initials */}
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-slate-700">
                    {(policy.displayName || "C")
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-3 space-y-3">
              {/* Customer block */}
              <div>
                <p className="text-[11px] font-semibold text-slate-600 mb-1">
                  Customer
                </p>

                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                  <Phone size={11} className="shrink-0" />
                  <span className="truncate">{policy.mobile || "—"}</span>
                </div>

                <p className="mt-1 text-[11px] text-slate-500 truncate">
                  Source: {policy.source || "—"}
                </p>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-100" />

              {/* Vehicle block */}
              <div>
                <p className="text-[11px] font-semibold text-slate-600 mb-1">
                  Vehicle
                </p>

                <p
                  className="text-[13px] font-semibold text-slate-900 truncate"
                  title={policy.vehicle}
                >
                  {policy.vehicle || "—"}
                </p>

                <p
                  className="text-[11px] text-slate-600 mt-0.5"
                  style={{ fontFamily: "var(--default-mono-font-family)" }}
                >
                  {policy.registration || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2 Policy */}
        <div className="p-3 border-r" style={{ borderColor: "#f1f5f9" }}>
          <div
            className="rounded-2xl "
            style={{
              borderColor: "#e2e8f0",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
            }}
          >
            {/* Header */}
            <div
              className="px-3 py-3 border-b"
              style={{ borderColor: "#e2e8f0" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 flex items-center gap-1">
                    <Shield size={11} />
                    Policy
                  </p>
                  <p
                    className="text-[13px] font-semibold text-slate-900 mt-1 truncate"
                    title={policy.insurer}
                  >
                    {policy.insurer || "—"}
                  </p>
                  <p
                    className="text-[11px] text-slate-500 truncate"
                    title={policy.policyNumber}
                    style={{ fontFamily: "var(--default-mono-font-family)" }}
                  >
                    {policy.policyNumber || "Not issued"}
                  </p>
                </div>

                {/* Small badge for status / type */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {policy.status && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                      {STATUS_LABEL_MAP?.[policy.status] || policy.status}
                    </span>
                  )}
                  {policy.typesOfVehicle && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {policy.typesOfVehicle}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-3 space-y-3">
              {/* IDV / NCB row */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  IDV {policy.idvInline}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                  NCB {policy.ncb}
                </span>
              </div>

              {/* Hypothecation and expiry */}
              <div className="space-y-1">
                <p
                  className="text-[11px] text-slate-500 truncate"
                  title={policy.hypothecation}
                >
                  Hypothecation: {policy.hypothecation || "—"}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Expiry: {policy.expiryLabel || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3 Payment Flow */}
        <div className="p-3 border-r" style={{ borderColor: "#f1f5f9" }}>
          <div
            className="rounded-2xl "
            style={{
              borderColor: "#e2e8f0",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
            }}
          >
            {/* Header / Primary Payment */}
            <div
              className="px-3 py-3 border-b"
              style={{ borderColor: "#e2e8f0" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Payment Engine
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    {primaryPaymentRow.label}
                  </p>
                </div>

                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                  <DollarSign size={14} />
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-[22px] leading-6 font-black text-slate-900">
                  {formatInr(primaryPaymentRow.amount)}
                </p>
              </div>

              <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "100%",
                    background:
                      "linear-gradient(90deg, #38bdf8 0%, #818cf8 55%, #22c55e 100%)",
                  }}
                />
              </div>
            </div>

            {/* Signals / Secondary Payments */}
            <div className="p-3 space-y-3">
              {secondaryPaymentRows.length > 0 ? (
                secondaryPaymentRows.map((item, idx) => {
                  const meta =
                    paymentSignalMeta[item.type] || paymentSignalMeta.neutral;
                  const Icon = meta.icon;
                  const isSubventionRow = String(item.label || "")
                    .toLowerCase()
                    .includes("subvention");
                  const rowBase = Number(item.progressBase || paymentBaseAmount || 0);
                  const rawRatio =
                    rowBase > 0
                      ? (Number(item.amount || 0) / rowBase) * 100
                      : 0;
                  const ratio =
                    isSubventionRow && Number(item.amount || 0) > 0
                      ? 100
                      : Math.max(0, Math.min(100, Math.round(rawRatio)));

                  return (
                    <motion.div
                      key={`${item.label}-${idx}`}
                      whileHover={{ x: 2, y: -1 }}
                      transition={{ duration: 0.16 }}
                      className="relative"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="relative pt-0.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center border"
                            style={{
                              background: meta.soft,
                              borderColor: `${meta.color}33`,
                              color: meta.color,
                            }}
                          >
                            <Icon size={13} />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-slate-900 leading-4 truncate">
                                {item.label}
                              </p>
                            </div>

                            <div className="shrink-0">
                              <span
                                className="text-[12px] font-black whitespace-nowrap"
                                style={{ color: meta.color }}
                              >
                                {formatInr(item.amount)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${ratio}%` }}
                                transition={{
                                  duration: 0.45,
                                  ease: "easeOut",
                                }}
                                className="h-full rounded-full"
                                style={{
                                  background: `linear-gradient(90deg, ${meta.color} 0%, ${meta.color}cc 100%)`,
                                }}
                              />
                            </div>

                            {item.date ? (
                              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                {dayjs(item.date).isValid()
                                  ? dayjs(item.date).format("DD MMM")
                                  : ""}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-4 text-center">
                  <p className="text-[12px] font-medium text-slate-500">
                    No payment activity
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column 4 Workflow */}
        <div className="p-3">
          <div
            className="rounded-2xl"
            style={{
              borderColor: "#e2e8f0",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
            }}
          >
            {/* Header */}
            <div
              className="px-3 py-3 border-b"
              style={{ borderColor: "#e2e8f0" }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Activity size={11} className="text-slate-500" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Workflow
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                  Step {policy.currentStep}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-3 space-y-3">
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Stage</span>
                  <span className="font-semibold text-slate-900 text-right truncate">
                    {stepLabels[policy.currentStep]}
                  </span>
                </div>

                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Created</span>
                  <span className="font-semibold text-slate-900 text-right truncate">
                    {policy.createdLabel}
                  </span>
                </div>

                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Expiry</span>
                  <span className="font-semibold text-slate-900 text-right truncate">
                    {policy.expiryLabel}
                  </span>
                </div>
              </div>

              {/* Premium pill */}
              <div
                className="p-2 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border flex items-center justify-between gap-2"
                style={{ borderColor: "#e2e8f0" }}
              >
                <div>
                  <p className="text-[11px] text-slate-600">Premium</p>
                  <p className="text-base font-black text-slate-900">
                    {formatInr(policy.premium)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

const InsuranceDashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState("");
  const [policyFilter, setPolicyFilter] = useState("all");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [previewStageKey, setPreviewStageKey] = useState(null);
  const [trendModal, setTrendModal] = useState({
    open: false,
    regKey: "",
    regLabel: "",
    vehicleLabel: "",
  });
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    const existing = document.getElementById("insurance-dashboard-inter-font");
    if (existing) return;

    const link = document.createElement("link");
    link.id = "insurance-dashboard-inter-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  // ============================================
  // API CALLBACKS (PRESERVED)
  // ============================================

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await insuranceApi.getAll();
      const rows = Array.isArray(res?.data) ? res.data : res?.items || [];
      setCases(rows);
    } catch (err) {
      console.error("[InsuranceDashboard] load error:", err);
      setError(err?.message || "Failed to load insurance cases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleDeleteCase = useCallback(async (id, caseName) => {
    try {
      if (!id) {
        message.error("Invalid case ID");
        return;
      }
      await insuranceApi.delete(id);
      message.success(`Case ${caseName} deleted successfully`);
      setCases((prev) => prev.filter((c) => getCaseId(c) !== id));
    } catch (err) {
      console.error("[InsuranceDashboard] delete error:", err);
      if (err.status === 404) {
        message.warning("Case no longer exists on server, removed from list");
        setCases((prev) => prev.filter((c) => getCaseId(c) !== id));
      } else {
        message.error(err?.message || "Failed to delete case");
      }
    }
  }, []);

  const handleRenewCase = useCallback(
    (record) => {
      const id = getCaseId(record);
      if (!id) {
        message.error("Invalid case ID");
        return;
      }
      navigate(`/insurance/new?renewFrom=${id}`);
    },
    [navigate],
  );

  const handleExtendCase = useCallback(
    (record) => {
      const id = getCaseId(record);
      if (!id) {
        message.error("Invalid case ID");
        return;
      }
      navigate(`/insurance/new?renewFrom=${id}&extend=true`);
    },
    [navigate],
  );

  // ============================================
  // COMPUTATIONS (PRESERVED)
  // ============================================

  const stats = useMemo(() => {
    const total = cases.length;
    const draft = cases.filter(isDraftPolicy).length;
    const completed = cases.filter(isCompletedPolicy).length;
    const paymentDue = cases.filter(isPaymentDuePolicy).length;
    const renewal30 = cases.filter((c) => {
      const days = daysUntilExpiry(c);
      return days !== null && days >= 0 && days <= 30;
    }).length;
    const totalPremium = cases.reduce((sum, c) => sum + premiumNum(c), 0);
    const totalCollected = cases.reduce(
      (sum, c) => sum + paymentReceivedNum(c),
      0,
    );
    return {
      total,
      draft,
      completed,
      paymentDue,
      expiringSoon: renewal30,
      totalPremium,
      totalCollected,
      totalOutstanding: Math.max(0, totalPremium - totalCollected),
    };
  }, [cases]);

  const filterCounts = useMemo(() => {
    const rows = Array.isArray(cases) ? cases : [];
    return {
      all: rows.length,
      completed: rows.filter((c) => matchesPolicyFilter(c, "completed")).length,
      draft: rows.filter((c) => matchesPolicyFilter(c, "draft")).length,
      paymentDue: rows.filter((c) => matchesPolicyFilter(c, "paymentDue"))
        .length,
      expiring: rows.filter((c) => matchesPolicyFilter(c, "renewal30")).length,
      expired: rows.filter((c) => matchesPolicyFilter(c, "expired")).length,
      "2w": rows.filter((c) => matchesPolicyFilter(c, "2w")).length,
      "4w": rows.filter((c) => matchesPolicyFilter(c, "4w")).length,
      comm: rows.filter((c) => matchesPolicyFilter(c, "comm")).length,
    };
  }, [cases]);

  const filteredCases = useMemo(() => {
    return (cases || []).filter((c) => {
      if (!matchesPolicyFilter(c, policyFilter)) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const snap = c.customerSnapshot || {};
      const haystack = [
        c.caseId,
        c._id,
        snap.customerName,
        snap.companyName,
        snap.contactPersonName,
        snap.primaryMobile,
        c.registrationNumber,
        c.vehicleNumber,
        c.vehicleMake,
        c.vehicleModel,
        c.vehicleVariant,
        c.newInsuranceCompany,
        c.newPolicyNumber,
        c.source,
        c.sourceOrigin,
        c.sourceName,
        c.dealerChannelName,
        c.referenceName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [cases, search, policyFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, policyFilter, cases.length]);

  const paginatedCases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, page]);

  const totalCount = filteredCases.length;
  const hasActiveFilters = policyFilter !== "all" || search.trim().length > 0;

  const historyByRegistration = useMemo(() => {
    const map = new Map();
    (cases || []).forEach((row) => {
      const regKey = normalizeVehicleRegKey(
        row?.registrationNumber || row?.vehicleNumber,
      );
      if (!regKey) return;
      const policyStartDate =
        row?.newPolicyStartDate ||
        row?.newOdStartDate ||
        row?.newOdPolicyStartDate ||
        row?.policyStartDate ||
        row?.currentPolicyStartDate ||
        row?.createdAt ||
        row?.updatedAt ||
        null;
      const parsedDate = dayjs(policyStartDate);
      const point = {
        id: getCaseId(row),
        caseId: row?.caseId || "",
        premium: premiumNum(row),
        idv: Number(row?.newIdvAmount || 0),
        insurer: row?.newInsuranceCompany || "",
        policyNo: row?.newPolicyNumber || "",
        policyStartDate,
        sortTs: parsedDate.isValid() ? parsedDate.valueOf() : 0,
        dateLabel: parsedDate.isValid() ? parsedDate.format("DD MMM YY") : "—",
        policyStartYear: parsedDate.isValid() ? parsedDate.format("YYYY") : "—",
      };
      if (!map.has(regKey)) map.set(regKey, []);
      map.get(regKey).push(point);
    });
    map.forEach((rows, key) => {
      const sorted = [...rows].sort((a, b) => {
        if (a.sortTs !== b.sortTs) return a.sortTs - b.sortTs;
        return String(a.caseId || a.id).localeCompare(String(b.caseId || b.id));
      });
      map.set(key, sorted);
    });
    return map;
  }, [cases]);

  const trendModalHistory = useMemo(() => {
    if (!trendModal.regKey) return [];
    return historyByRegistration.get(trendModal.regKey) || [];
  }, [trendModal.regKey, historyByRegistration]);

  const trendModalSeries = useMemo(
    () => buildTrendSeries(trendModalHistory, 700, 240, 16),
    [trendModalHistory],
  );

  // ============================================
  // TRANSFORM DATA FOR UI
  // ============================================

  const transformedPolicies = useMemo(() => {
    return paginatedCases.map((record) => {
      const snap = record.customerSnapshot || {};
      const id = getCaseId(record);
      const caseRef = record.caseId || id;

      // Customer
      const customerName = snap.customerName || record.customerName || "—";
      const companyName = snap.companyName || record.companyName || "";
      const buyerType = String(
        snap.buyerType || record.buyerType || "Individual",
      )
        .trim()
        .toLowerCase();
      const contactPerson =
        snap.contactPersonName || record.contactPersonName || "";
      const sourceIdentity = String(
        record.sourceName ||
          record.dealerChannelName ||
          record.referenceName ||
          "",
      )
        .trim()
        .toLowerCase();
      const customerIdentity = String(customerName || "")
        .trim()
        .toLowerCase();
      const customerLooksLikeSource =
        Boolean(sourceIdentity) && sourceIdentity === customerIdentity;
      const customerLooksLikeChannelAlias =
        /(broker|broking|dealer|agency|channel|dsa|pos|crm)/i.test(
          String(customerName || ""),
        );
      const displayName =
        buyerType === "company"
          ? companyName || contactPerson || customerName || "—"
          : customerLooksLikeSource || customerLooksLikeChannelAlias
            ? contactPerson || customerName || companyName || "—"
            : customerName || contactPerson || companyName || "—";

      const mobile = snap.primaryMobile || record.mobile || "—";
      const source =
        record.source ||
        record.sourceOrigin ||
        (record.sourceName ? "Direct" : "—");

      // Vehicle
      const vehicle = [
        record.vehicleMake,
        record.vehicleModel,
        record.vehicleVariant,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      const vehicleLabel = vehicle || "—";
      const reg = record.registrationNumber || record.vehicleNumber || "—";
      const regKey = normalizeVehicleRegKey(reg);

      // Policy
      const insurer = record.newInsuranceCompany || "—";
      const policyNo = record.newPolicyNumber || "—";
      const premium = premiumNum(record);
      const idv = Number(record.newIdvAmount || 0);
      const ncb = hasDisplayValue(record.newNcbDiscount)
        ? `${record.newNcbDiscount}%`
        : "—";
      const hypothecation = record.newHypothecation || "—";

      // Payment
      const paid = paymentReceivedNum(record);

      // Ledger calculations
      const paymentLedger = Array.isArray(record?.paymentHistory)
        ? record.paymentHistory
        : Array.isArray(record?.payment_history)
          ? record.payment_history
          : [];
      const normalizedLedger = paymentLedger.map(normalizeInsuranceLedgerRow);
      const ledgerTotals = computeInsurancePaymentTotals(
        normalizedLedger,
        premium,
      );
      const hasLedgerSnapshot = normalizedLedger.length > 0;
      const paidByCustomer = Number(
        record.customerPaymentReceived || record.customer_payment_received || 0,
      );
      const snapshotSubventionRefund = hasLedgerSnapshot
        ? ledgerTotals.subventionRefundPaid
        : Number(record?.subventionAmount || 0);
      const fallbackAcPaidToInsurer = Number(
        record.inhousePaymentReceived || record.inhouse_payment_received || 0,
      );
      const fallbackOpenDues = Math.max(
        0,
        fallbackAcPaidToInsurer - snapshotSubventionRefund - paidByCustomer,
      );
      const openDuesFromAcRecovery = hasLedgerSnapshot
        ? ledgerTotals.insurerPaidByAutocredits > 0
          ? ledgerTotals.customerOutstandingToAc
          : 0
        : fallbackOpenDues;

      // IDV inline
      const { acceptedQuote, acceptedBreakup } =
        getAcceptedQuoteContext(record);
      const hasAcceptedQuote = Boolean(acceptedQuote);
      const ncbInline = hasAcceptedQuote
        ? `${Number(acceptedQuote?.ncbDiscount || 0)}%`
        : ncb;
      const idvInline =
        hasAcceptedQuote && Number(acceptedBreakup.totalIdv || 0) > 0
          ? formatInr(acceptedBreakup.totalIdv)
          : idv
            ? formatInr(idv)
            : "—";

      // Status & dates
      const st = normalizeStatus(record.status);
      const createdLabel = record.createdAt
        ? dayjs(record.createdAt).format("DD MMM YYYY")
        : "—";
      const expiryDate =
        record.newOdExpiryDate || record.newTpExpiryDate || record.policyExpiry;
      const expiryLabel = expiryDate
        ? dayjs(expiryDate).format("DD MMM YYYY")
        : "—";
      const daysLeft = daysUntilExpiry(record);

      // Payment timeline for UI - business rule aligned.
      const sortedLedgerRows = sortLedgerByDate(normalizedLedger);
      const latestRowBy = (predicate) =>
        [...sortedLedgerRows].reverse().find(predicate) || null;

      const latestInsurerRow = latestRowBy(
        (row) => row.entryType === INSURANCE_ENTRY_TYPES.INSURER_PAYMENT,
      );
      const latestReceiptRow = latestRowBy(
        (row) => row.entryType === INSURANCE_ENTRY_TYPES.CUSTOMER_RECEIPT,
      );
      const latestSubventionRefundRow = latestRowBy(
        (row) => row.entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_REFUND,
      );
      const latestSubventionNrRow = latestRowBy(
        (row) =>
          row.entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE,
      );

      const fallbackInsurerPaidByCustomer = Number(
        record.customerPaymentToInsurer ||
          record.customer_payment_to_insurer ||
          0,
      );
      const fallbackInsurerPaidByAc = Math.max(
        0,
        fallbackAcPaidToInsurer - fallbackInsurerPaidByCustomer,
      );
      const effectiveInsurerPaidByCustomer =
        ledgerTotals.insurerPaidByCustomer || fallbackInsurerPaidByCustomer;
      const effectiveInsurerPaidByAc =
        ledgerTotals.insurerPaidByAutocredits || fallbackInsurerPaidByAc;
      const effectiveInsurerPaidTotal =
        effectiveInsurerPaidByCustomer + effectiveInsurerPaidByAc;
      const effectiveInsurerMode =
        effectiveInsurerPaidByCustomer > 0 && effectiveInsurerPaidByAc === 0
          ? INSURER_SETTLEMENT_MODE.CUSTOMER
          : effectiveInsurerPaidByAc > 0 && effectiveInsurerPaidByCustomer === 0
            ? INSURER_SETTLEMENT_MODE.AUTOCREDITS
            : effectiveInsurerPaidByAc > 0 && effectiveInsurerPaidByCustomer > 0
              ? INSURER_SETTLEMENT_MODE.MIXED
              : INSURER_SETTLEMENT_MODE.NONE;

      const insurerFlowRow =
        effectiveInsurerPaidTotal > 0
          ? effectiveInsurerMode === INSURER_SETTLEMENT_MODE.CUSTOMER
            ? {
                label: "Customer paid insurer",
                amount: effectiveInsurerPaidByCustomer,
                type: "good",
                date: latestInsurerRow?.date || null,
              }
            : {
                label: "Autocredits paid insurer",
                amount: effectiveInsurerPaidByAc || effectiveInsurerPaidTotal,
                type: "good",
                date: latestInsurerRow?.date || null,
              }
          : {
              label: "Insurer payment pending",
              amount: Math.max(0, premium - effectiveInsurerPaidTotal),
              type: premium > 0 ? "warning" : "neutral",
              date: null,
            };

      const effectiveSubventionNr = ledgerTotals.subventionNotRecoverable;
      const effectiveSubventionRefund = Math.max(
        ledgerTotals.subventionRefundPaid,
        snapshotSubventionRefund,
      );
      const receiptVisible =
        effectiveInsurerMode === INSURER_SETTLEMENT_MODE.NONE ||
        effectiveInsurerMode === INSURER_SETTLEMENT_MODE.AUTOCREDITS;
      const receiptBase = receiptVisible
        ? Math.max(0, premium - effectiveSubventionNr)
        : 0;
      const effectiveCustomerRecovered =
        ledgerTotals.customerRecovered || paidByCustomer;
      const customerOutstanding = receiptVisible
        ? Math.max(0, receiptBase - effectiveCustomerRecovered)
        : 0;

      const receiptFlowRow = receiptVisible
        ? effectiveCustomerRecovered > 0
          ? {
              label: "Receipt from customer",
              amount: effectiveCustomerRecovered,
              type: "good",
              date: latestReceiptRow?.date || null,
              progressBase: receiptBase,
            }
          : {
              label: "Customer outstanding",
              amount: customerOutstanding,
              type: customerOutstanding > 0 ? "warning" : "neutral",
              date: null,
              progressBase: receiptBase,
            }
        : null;

      const subventionRows = [];
      if (effectiveSubventionNr > 0) {
        subventionRows.push({
          label: "Subvention",
          amount: effectiveSubventionNr,
          type: "accent",
          date: latestSubventionNrRow?.date || null,
        });
      }
      if (effectiveSubventionRefund > 0) {
        subventionRows.push({
          label: "Subvention",
          amount: effectiveSubventionRefund,
          type: "accent",
          date: latestSubventionRefundRow?.date || null,
        });
      }

      const paymentTimelineRows = [
        {
          label: "Total Premium",
          amount: premium,
          type: "neutral",
          date: null,
        },
        insurerFlowRow,
        receiptFlowRow,
        ...subventionRows,
      ].filter(Boolean);

      const paymentPercent =
        premium > 0 ? Math.min(100, Math.round((paid / premium) * 100)) : 0;

      return {
        id,
        caseId: caseRef,
        displayName,
        companyName,
        contactPerson,
        mobile,
        source,
        vehicle: vehicleLabel,
        registration: reg,
        regKey,
        insurer,
        policyNumber: policyNo,
        premium,
        paid,
        idv,
        idvInline,
        ncb: ncbInline,
        hypothecation,
        status: st,
        currentStep: record.currentStep,
        expiryDays: daysLeft,
        expiryLabel,
        createdLabel,
        vehicleType: record.vehicleType || "4W",
        typesOfVehicle: record.typesOfVehicle || "4W",
        paymentTimeline: paymentTimelineRows,
        paymentPercent,
        openDues: openDuesFromAcRecovery,
        record,
      };
    });
  }, [paginatedCases]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      className="min-h-screen p-4 overflow-auto bg-slate-50"
      style={{
        ...FONT_VARS,
        fontFamily: "var(--default-font-family)",
      }}
    >
      <div className="max-w-[1920px] mx-auto space-y-4">
        {/* Header - Sample Style */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Insurance Workspace
              </p>
              <h1 className="text-2xl font-black text-slate-900">
                Policy Dashboard
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Cases, revenue, renewals and payment movement in one operating
                view.
              </p>
            </div>

            {/* Inline stats */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-slate-500">Total Premium</p>
                <p className="text-lg font-black text-slate-900">
                  {formatInr(stats.totalPremium)}
                </p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-right">
                <p className="text-xs text-slate-500">Collected</p>
                <p className="text-lg font-black text-emerald-600">
                  {formatInr(stats.totalCollected)}
                </p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-right">
                <p className="text-xs text-slate-500">Outstanding</p>
                <p className="text-lg font-black text-amber-600">
                  {formatInr(stats.totalOutstanding)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Cards - Sample Style */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard
            icon={BarChart3}
            title="Total"
            value={stats.total}
            color="#3b82f6"
            isActive={policyFilter === "all"}
            onClick={() => setPolicyFilter("all")}
          />
          <MetricCard
            icon={FileText}
            title="Draft"
            value={stats.draft}
            color="#f43f5e"
            isActive={policyFilter === "draft"}
            onClick={() => setPolicyFilter("draft")}
          />
          <MetricCard
            icon={CheckCircle}
            title="Completed"
            value={stats.completed}
            color="#10b981"
            isActive={policyFilter === "completed"}
            onClick={() => setPolicyFilter("completed")}
          />
          <MetricCard
            icon={DollarSign}
            title="Payment Due"
            value={stats.paymentDue}
            color="#f59e0b"
            isActive={policyFilter === "paymentDue"}
            onClick={() => setPolicyFilter("paymentDue")}
          />
          <MetricCard
            icon={AlertCircle}
            title="Expiring"
            value={stats.expiringSoon}
            color="#ef4444"
            isActive={policyFilter === "renewal30"}
            onClick={() => setPolicyFilter("renewal30")}
          />
        </div>

        {/* Search and Filters - Sample Style */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3 mb-3">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by customer, policy, vehicle, registration..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-slate-900 placeholder-slate-400 font-medium transition-all"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/insurance/new")}
              className="px-5 py-2.5 rounded-lg font-bold text-white flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus size={18} />
              New Policy
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={loadCases}
              className="px-4 py-2.5 rounded-lg font-semibold text-slate-700 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <RefreshCw size={18} />
            </motion.button>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="All"
              count={filterCounts.all}
              isActive={policyFilter === "all"}
              onClick={() => setPolicyFilter("all")}
            />
            <FilterChip
              label="Draft"
              count={filterCounts.draft}
              isActive={policyFilter === "draft"}
              onClick={() => setPolicyFilter("draft")}
              icon={FileText}
            />
            <FilterChip
              label="Completed"
              count={filterCounts.completed}
              isActive={policyFilter === "completed"}
              onClick={() => setPolicyFilter("completed")}
              icon={CheckCircle}
            />
            <FilterChip
              label="Payment Due"
              count={filterCounts.paymentDue}
              isActive={policyFilter === "paymentDue"}
              onClick={() => setPolicyFilter("paymentDue")}
              icon={DollarSign}
            />
            <FilterChip
              label="Expiring"
              count={filterCounts.expiring}
              isActive={policyFilter === "renewal30"}
              onClick={() => setPolicyFilter("renewal30")}
              icon={Calendar}
            />
            <FilterChip
              label="Expired"
              count={filterCounts.expired}
              isActive={policyFilter === "expired"}
              onClick={() => setPolicyFilter("expired")}
            />
            <FilterChip
              label="2W"
              count={filterCounts["2w"]}
              isActive={policyFilter === "2w"}
              onClick={() => setPolicyFilter("2w")}
            />
            <FilterChip
              label="4W"
              count={filterCounts["4w"]}
              isActive={policyFilter === "4w"}
              onClick={() => setPolicyFilter("4w")}
            />
            <FilterChip
              label="Commercial"
              count={filterCounts.comm}
              isActive={policyFilter === "comm"}
              onClick={() => setPolicyFilter("comm")}
            />

            {hasActiveFilters && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSearch("");
                  setPolicyFilter("all");
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-semibold text-sm flex items-center gap-1.5 hover:bg-slate-300 transition-colors"
              >
                <X size={13} />
                Clear
              </motion.button>
            )}
          </div>
        </div>

        {/* Error/Loading/Empty States */}
        {error && (
          <Alert
            type="error"
            showIcon
            message="Failed to load insurance cases"
            description={error}
          />
        )}
        {loading && cases.length === 0 && (
          <div className="flex min-h-[220px] items-center justify-center text-slate-500 bg-white rounded-xl border-2 border-slate-200">
            Loading insurance cases…
          </div>
        )}
        {!loading && filteredCases.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-xl border-2 border-slate-200"
          >
            <div className="inline-block p-6 rounded-2xl mb-4 bg-slate-50">
              <Search size={48} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              No policies found
            </h3>
            <p className="text-slate-600">
              Try adjusting your filters or search query
            </p>
          </motion.div>
        )}

        {/* Policies */}
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {transformedPolicies.map((policy) => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                onView={() => {
                  setSelectedCase(policy.record);
                  setPreviewStageKey(null);
                  setPreviewVisible(true);
                }}
                onEdit={() => navigate(`/insurance/edit/${policy.id}`)}
                onRenew={() => handleRenewCase(policy.record)}
                onExtend={() => handleExtendCase(policy.record)}
                onDelete={() => handleDeleteCase(policy.id, policy.caseId)}
                onTrend={() =>
                  setTrendModal({
                    open: true,
                    regKey: policy.regKey,
                    regLabel: policy.registration,
                    vehicleLabel: policy.vehicle,
                  })
                }
                onDocs={() => {
                  setSelectedCase(policy.record);
                  setPreviewStageKey("documents");
                  setPreviewVisible(true);
                }}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!loading && filteredCases.length > 0 && (
          <div className="text-center text-sm text-slate-500 pb-4">
            Showing {filteredCases.length} of {totalCount} policies
          </div>
        )}

        {/* Pagination */}
        {filteredCases.length > 0 && (
          <div className="flex justify-center pb-4">
            <Pagination
              size="small"
              current={page}
              pageSize={pageSize}
              total={filteredCases.length}
              onChange={(p) => setPage(p)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      {/* Trend Modal */}
      <Modal
        open={trendModal.open}
        centered
        width={860}
        footer={null}
        onCancel={() =>
          setTrendModal({
            open: false,
            regKey: "",
            regLabel: "",
            vehicleLabel: "",
          })
        }
        title={
          <div className="pr-6">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
              Vehicle Premium & IDV Trend
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {trendModal.vehicleLabel || "Vehicle"} ·{" "}
              {trendModal.regLabel || "Reg not set"}
            </p>
          </div>
        }
      >
        {trendModalSeries ? (
          <div className="space-y-3">
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: "#e2e8f0", background: "#fbfdff" }}
            >
              <svg
                viewBox="0 0 700 240"
                className="h-56 w-full overflow-visible"
                role="img"
              >
                <line
                  x1="16"
                  y1="16"
                  x2="16"
                  y2={trendModalSeries.axisY}
                  stroke="currentColor"
                  className="text-[#cfdaeb]"
                  strokeWidth="1"
                />
                <line
                  x1="16"
                  y1={trendModalSeries.axisY}
                  x2="684"
                  y2={trendModalSeries.axisY}
                  stroke="currentColor"
                  className="text-[#cfdaeb]"
                  strokeWidth="1"
                />
                <path
                  d={trendModalSeries.premiumPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {trendModalSeries.yAxisTicks.map((tick) => (
                  <g key={`y-tick-${tick.y}`}>
                    <line
                      x1="16"
                      y1={tick.y}
                      x2="684"
                      y2={tick.y}
                      stroke="currentColor"
                      className="text-[#e2eef8]"
                      strokeWidth="1"
                    />
                    <text
                      x="10"
                      y={tick.y + 3}
                      textAnchor="end"
                      className="fill-slate-500 text-[10px]"
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}
                {trendModalSeries.points.map((p) => (
                  <g key={`trend-modal-${p.id || p.caseId}-${p.x}`}>
                    <circle cx={p.x} cy={p.premiumY} r="4.8" fill="#10b981">
                      <title>{`Year ${p.policyStartYear || "—"} | Premium ${formatInr(p.premium)} | IDV ${formatInr(p.idv)}`}</title>
                    </circle>
                    {p.showXLabel && (
                      <text
                        x={p.x}
                        y={trendModalSeries.axisY + 14}
                        textAnchor="middle"
                        className="fill-slate-500 text-[10px]"
                      >
                        {p.policyStartYear || "—"}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Premium
                </span>
                <span>Year on X-axis</span>
              </div>
            </div>
            <div
              className="rounded-xl border px-3 py-2 text-xs"
              style={{
                borderColor: "#e2e8f0",
                background: "#f1f5f9",
                color: "#64748b",
              }}
            >
              {trendModalHistory.length} policies found for this registration.
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl border border-dashed px-4 py-10 text-center"
            style={{
              borderColor: "#e2e8f0",
              background: "#f1f5f9",
              color: "#64748b",
            }}
          >
            No trend data available for this registration number.
          </div>
        )}
      </Modal>

      {/* Preview Modal */}
      <InsurancePreview
        visible={previewVisible}
        onClose={() => {
          setPreviewVisible(false);
          setSelectedCase(null);
          setPreviewStageKey(null);
        }}
        data={selectedCase}
        initialStageKey={previewStageKey}
      />
    </div>
  );
};

export default InsuranceDashboardPage;
