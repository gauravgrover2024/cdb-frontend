import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  Clock3,
  DollarSign,
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  FolderOpen,
  Search,
  X,
  Calendar,
  Car,
  Shield,
  Activity,
  Phone,
} from "lucide-react";
import { Alert, message, Modal, Pagination, Popconfirm, Tooltip } from "antd";
import InsuranceAntdProvider from "../../components/insurance/InsuranceAntdProvider";
import "../../components/insurance/insurance-forms.css";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { insuranceApi } from "../../api/insurance";
import InsurancePreview from "../../components/insurance/InsurancePreview";
import InsuranceDocumentsModal from "../../components/insurance/InsuranceDocumentsModal";
import PremiumBreakupCard from "../../components/insurance/PremiumBreakupCard";
import {
  resolveInsuranceReference,
  shouldShowInsuranceChannelBadge,
  parsePolicyIncludedAddons,
  resolveActivePolicySnapshot,
  getPolicyPulseExpiryDate,
  daysUntilExpiry,
  getCycleAdjustedExpiryDate,
  getPolicyOriginType,
} from "../../utils/insurancePolicyDisplay";

dayjs.extend(customParseFormat);

const FONT_VARS = {
  "--default-font-family":
    '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  "--default-mono-font-family":
    '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
};

// ============================================
// UTILITY FUNCTIONS (PRESERVED FROM ORIGINAL)
// ============================================

const cx = (...classes) => classes.filter(Boolean).join(" ");

const getCaseId = (item) => item?._id || item?.id || item?.caseId || "";

const hasDisplayValue = (value) => {
  if (value == null) return false;
  const text = String(value).trim();
  return text.length > 0 && text.toLowerCase() !== "n/a";
};

const resolveInsuranceCustomerDisplay = ({
  customerName = "",
  companyName = "",
  contactPersonName = "",
  sourceName = "",
  dealerChannelName = "",
} = {}) => {
  const name = String(customerName || "").trim();
  const company = String(companyName || "").trim();
  const contact = String(contactPersonName || "").trim();
  const channel = String(sourceName || dealerChannelName || "").trim();

  if (!name) return contact || company || "";

  const parenMatch = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!parenMatch) return name;

  const [, baseName, parenLabel] = parenMatch;
  const baseNorm = baseName.trim().toLowerCase();
  const parenNorm = parenLabel.trim().toLowerCase();
  const contactNorm = contact.toLowerCase();
  const companyNorm = company.toLowerCase();
  const channelNorm = channel.toLowerCase();

  if (contact && contactNorm === baseNorm) {
    if (!company || companyNorm !== parenNorm) return contact;
    if (channel && channelNorm !== parenNorm) return contact;
    return contact;
  }

  if (company && companyNorm !== parenNorm) return baseName.trim();
  if (channel && channelNorm !== parenNorm) return baseName.trim();

  return name;
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
  const ledgerRows = (
    Array.isArray(c?.paymentHistory)
      ? c.paymentHistory
      : Array.isArray(c?.payment_history)
        ? c.payment_history
        : []
  ).map(normalizeInsuranceLedgerRow);
  if (ledgerRows.length > 0) {
    const totals = computeInsurancePaymentTotals(ledgerRows, premiumNum(c));
    const ledgerTotal =
      Number(totals?.insurerPaidByAutocredits || 0) +
      Number(totals?.insurerPaidByCustomer || 0) +
      Number(totals?.customerRecovered || 0);
    if (Number.isFinite(ledgerTotal) && ledgerTotal > 0) return ledgerTotal;
  }

  const customer = Number(
    c?.customerPaymentReceived ?? c?.customer_payment_received ?? 0,
  );
  const inhouse = Number(
    c?.inhousePaymentReceived ?? c?.inhouse_payment_received ?? 0,
  );
  const total = customer + inhouse;
  return Number.isFinite(total) ? total : 0;
};

const hasPolicyNumber = (c) =>
  hasDisplayValue(
    c?.newPolicyNumber || c?.policyNumber || c?.new_policy_number,
  );

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

const parseInsuranceDate = (value) => {
  if (!hasDisplayValue(value)) return null;
  const parsed = dayjs(
    String(value).trim(),
    [
      "YYYY-MM-DD",
      "DD/MM/YYYY",
      "DD-MM-YYYY",
      "D/M/YYYY",
      "D-M-YYYY",
      "DD MMM YYYY",
      "D MMM YYYY",
    ],
    true,
  );
  if (parsed.isValid()) return parsed;
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback : null;
};

const isThirdPartyOnlyPolicy = (policyType) => {
  const value = String(policyType || "")
    .trim()
    .toLowerCase();
  return value.includes("third") || value === "tp";
};


const isExpiringSoonCase = (record = {}, renewedCaseIds = new Set()) => {
  const days = daysUntilExpiry(record);
  const caseId = String(getCaseId(record) || "");
  return (
    days !== null && days >= 0 && days <= 45 && !renewedCaseIds.has(caseId)
  );
};

const isExpiredCase = (record = {}, renewedCaseIds = new Set()) => {
  const days = daysUntilExpiry(record);
  const caseId = String(getCaseId(record) || "");
  return days !== null && days < 0 && !renewedCaseIds.has(caseId);
};

const getPolicyIssueDate = (c) =>
  c?.newIssueDate ||
  c?.newPolicyIssueDate ||
  c?.policyIssueDate ||
  c?.issueDate ||
  c?.newPolicyStartDate ||
  c?.createdAt ||
  "";

const getVehicleDisplayYear = (record = {}) => {
  const regDate =
    record.dateOfReg ||
    record.registrationDate ||
    record.regDate ||
    record.rc_redg_date ||
    record.vehicleRegistrationDate ||
    "";
  const parsed = parseInsuranceDate(regDate);
  if (parsed) return parsed.format("YYYY");
  return (
    record.mfgYear ||
    record.manufactureYear ||
    record.manufacturingYear ||
    record.vehicleYear ||
    record.registrationYear ||
    ""
  );
};



const getRenewedFromId = (record = {}) =>
  record.renewedFromCaseId ||
  record.renewFromCaseId ||
  record.renewedFrom ||
  record.renewFrom ||
  record.previousInsuranceCaseId ||
  record.parentCaseId ||
  record.sourceCaseId ||
  "";

const normalizeVehicleKey = (record = {}) => {
  const reg = String(record.registrationNumber || record.vehicleNumber || "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  if (reg) return `REG:${reg}`;
  const chassis = String(record.chassisNumber || "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  if (chassis) return `CH:${chassis}`;
  return "";
};

const getPolicySortStamp = (record = {}) => {
  const expiry = parseInsuranceDate(getPolicyPulseExpiryDate(record));
  if (expiry && expiry.isValid()) return expiry.valueOf();
  const start = parseInsuranceDate(
    record.newPolicyStartDate || record.newIssueDate || record.createdAt || "",
  );
  return start && start.isValid() ? start.valueOf() : 0;
};

/**
 * Case ids that are "renewed" for dashboard purposes: either another case
 * points at them via renewedFrom linkage, or the same vehicle (reg/chassis
 * number) has a case with a later policy expiry — old policy cycles of a
 * vehicle should not keep showing as expired/overdue here.
 */
const collectRenewedCaseIds = (cases = []) => {
  const ids = new Set(
    (cases || []).map((c) => String(getRenewedFromId(c) || "")).filter(Boolean),
  );

  const groups = new Map();
  (cases || []).forEach((c) => {
    const key = normalizeVehicleKey(c);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  });

  groups.forEach((rows) => {
    if (rows.length < 2) return;
    const latest = rows.reduce((a, b) =>
      getPolicySortStamp(b) > getPolicySortStamp(a) ? b : a,
    );
    const latestId = String(getCaseId(latest) || "");
    const latestStamp = getPolicySortStamp(latest);
    rows.forEach((c) => {
      const id = String(getCaseId(c) || "");
      if (!id || id === latestId) return;
      // Only supersede cases with their own expiry older than the latest
      // policy — drafts without an expiry yet are left untouched.
      const expiry = parseInsuranceDate(getPolicyPulseExpiryDate(c));
      if (expiry && expiry.isValid() && expiry.valueOf() < latestStamp) {
        ids.add(id);
      }
    });
  });

  return ids;
};

const getPolicyPulseMeta = (days, alreadyRenewed = false) => {
  if (alreadyRenewed) {
    return {
      label: "Already Renewed",
      detail: "Newer policy exists",
      color: "#2563eb",
      bg: "#eff6ff",
    };
  }
  if (days === null || !Number.isFinite(Number(days))) {
    return {
      label: "Pending",
      detail: "Expiry not captured",
      color: "#64748b",
      bg: "#f8fafc",
    };
  }
  if (days < 0) {
    return {
      label: "Expired",
      detail: `${Math.abs(days)}d overdue`,
      color: "#dc2626",
      bg: "#fef2f2",
    };
  }
  if (days <= 45) {
    return {
      label: "Expiring Soon",
      detail: `${days} days remaining`,
      color: "#b45309",
      bg: "#fffbeb",
    };
  }
  return {
    label: "Active",
    detail: `${days} days remaining`,
    color: "#047857",
    bg: "#ecfdf5",
  };
};

const getInsurancePaymentDueSnapshot = (record = {}) => {
  const premium = premiumNum(record);
  const rows = (
    Array.isArray(record?.paymentHistory)
      ? record.paymentHistory
      : Array.isArray(record?.payment_history)
        ? record.payment_history
        : []
  ).map(normalizeInsuranceLedgerRow);
  const ledgerTotals = computeInsurancePaymentTotals(rows, premium);
  const fallbackAcPaid = Number(
    record.inhousePaymentReceived || record.inhouse_payment_received || 0,
  );
  const fallbackCustomerPaidInsurer = Number(
    record.customerPaymentToInsurer || record.customer_payment_to_insurer || 0,
  );
  const fallbackCustomerReceipt = Number(
    record.customerPaymentReceived || record.customer_payment_received || 0,
  );
  const fallbackSubvention = Number(
    record.subventionNotRecoverable || record.subventionAmount || 0,
  );

  const acPaid =
    ledgerTotals.insurerPaidByAutocredits ||
    Math.max(0, fallbackAcPaid - fallbackCustomerPaidInsurer);
  const customerPaidInsurer =
    ledgerTotals.insurerPaidByCustomer || fallbackCustomerPaidInsurer;
  const customerReceipt =
    ledgerTotals.customerRecovered || fallbackCustomerReceipt;
  const subvention =
    ledgerTotals.subventionNotRecoverable || fallbackSubvention;
  const amount =
    acPaid > 0 && customerPaidInsurer <= 0
      ? Math.max(0, premium - subvention - customerReceipt)
      : 0;

  return {
    isDue: acPaid > 0 && customerPaidInsurer <= 0 && amount > 0,
    amount,
  };
};

const isCompletedPolicy = (c) => {
  const st = normalizeStatus(c?.status);

  // 1. Explicit completion statuses
  if (st === "submitted" || st === "issued" || st === "completed") return true;

  // 2. All 5 New Policy fields are filled
  const hasNewInsuranceCompany = String(c?.newInsuranceCompany || "").trim() !== "";
  const hasNewPolicyType = String(c?.newPolicyType || "").trim() !== "";
  const hasNewPolicyNumber = String(c?.newPolicyNumber || c?.policyNumber || c?.new_policy_number || "").trim() !== "";
  const hasNewIssueDate = String(c?.newIssueDate || "").trim() !== "";
  const hasNewPolicyStartDate = String(c?.newPolicyStartDate || "").trim() !== "";

  return hasNewInsuranceCompany && hasNewPolicyType && hasNewPolicyNumber && hasNewIssueDate && hasNewPolicyStartDate;
};

const isDraftPolicy = (c) => !isCompletedPolicy(c);

const isPaymentDuePolicy = (c) => getInsurancePaymentDueSnapshot(c).isDue;

const matchesPolicyFilter = (c, key, renewedCaseIds = new Set()) => {
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
      return isExpiringSoonCase(c, renewedCaseIds);
    case "expired":
      return isExpiredCase(c, renewedCaseIds);
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
  const titleColor = isActive ? "rgba(255,255,255,0.88)" : "#64748b";
  const valueColor = isActive ? "#ffffff" : color;
  const iconColor = isActive ? "#ffffff" : color;
  const iconBg = isActive ? "rgba(255,255,255,0.16)" : `${color}12`;
  const iconBorder = isActive ? "rgba(255,255,255,0.25)" : `${color}30`;

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative cursor-pointer overflow-hidden rounded-xl border transition-all"
      style={{
        background: isActive ? color : "#ffffff",
        borderColor: isActive ? color : "#e2e8f0",
        boxShadow: isActive
          ? `0 4px 12px ${color}30`
          : "0 1px 3px rgba(0, 0, 0, 0.05)",
        fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "optimizeLegibility",
        fontFeatureSettings: '"tnum" 1, "cv05" 1, "cv08" 1',
      }}
    >
      <div className="p-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0"
            style={{
              background: iconBg,
              borderColor: iconBorder,
            }}
          >
            <Icon size={18} style={{ color: iconColor }} />
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[11px] font-semibold uppercase tracking-[0.05em]"
              style={{ color: titleColor }}
            >
              {title}
            </p>

            <div className="mt-1.5 flex items-baseline gap-1.5">
              <p
                className="text-[17px] font-extrabold leading-none tracking-[-0.045em] tabular-nums"
                style={{ color: valueColor }}
              >
                {subtitle != null ? subtitle : value}
              </p>

              {subtitle != null && (
                <span
                  className="text-[9px] font-semibold leading-none tabular-nums"
                  style={{
                    color: isActive ? "rgba(255,255,255,0.88)" : valueColor,
                  }}
                >
                  ({value})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CHIP_COLORS = {
  All: { active: "#6366f1", shadow: "#6366f140" },
  Draft: { active: "#f43f5e", shadow: "#f43f5e40" },
  Completed: { active: "#10b981", shadow: "#10b98140" },
  "Payment Due": { active: "#f59e0b", shadow: "#f59e0b40" },
  "Expiring Soon": { active: "#ef4444", shadow: "#ef444440" },
  Expired: { active: "#6b7280", shadow: "#6b728040" },
  "2W": { active: "#0ea5e9", shadow: "#0ea5e940" },
  "4W": { active: "#8b5cf6", shadow: "#8b5cf640" },
  Commercial: { active: "#f97316", shadow: "#f9731640" },
};

const FilterChip = ({ label, count, isActive, onClick, icon: Icon }) => {
  const c = CHIP_COLORS[label] || { active: "#475569", shadow: "#47556940" };
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="rounded-lg border-2 transition-all"
      style={{
        background: isActive ? "#0f172a" : "#ffffff",
        borderColor: isActive ? "#0f172a" : "#e2e8f0",
        boxShadow: isActive ? "0 2px 8px rgba(15, 23, 42, 0.2)" : "none",
      }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5">
        {Icon && (
          <Icon size={13} style={{ color: isActive ? "#fff" : c.active }} />
        )}
        <span
          className="text-[13px] font-semibold"
          style={{ color: isActive ? "#fff" : "#374151" }}
        >
          {label}
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[11px] font-bold"
          style={{
            background: isActive ? "rgba(255,255,255,0.22)" : `${c.active}15`,
            color: isActive ? "#fff" : c.active,
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
  onExtend,
  onDocs,
  onPolicyBreakup,
}) => {
  // Use pre-computed isCompleted from transformedPolicies to ensure exact sync with filters,
  // falling back to isCompletedPolicy if called with a raw record
  const isCompleted = policy.isCompleted ?? isCompletedPolicy(policy);
  const isDraft = !isCompleted;
  const openDues = policy.openDues || 0;


  const statusConfig = {
    draft: { color: "#f43f5e", bg: "#fff1f2", label: "Draft" },
    submitted: { color: "#f59e0b", bg: "#fffbeb", label: "Submitted" },
    issued: { color: "#10b981", bg: "#ecfdf5", label: "Issued" },
    cancelled: { color: "#dc2626", bg: "#fef2f2", label: "Cancelled" },
    completed: { color: "#10b981", bg: "#ecfdf5", label: "Completed" },
  };

  const config = isCompleted
    ? statusConfig.completed
    : policy.status === "cancelled"
      ? statusConfig.cancelled
      : statusConfig.draft;

  const accentColor = isDraft ? "#f43f5e" : isCompleted ? "#10b981" : "#3b82f6";

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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow"
      style={{
        borderColor: "#dbe3ee",
        fontFamily: "var(--default-font-family)",
      }}
    >
      {/* Accent left bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: accentColor }}
      />

      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: "#f1f5f9" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide bg-slate-100 text-slate-700">
                {policy.caseId}
              </span>

              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                {["extended warranty", "ew policy"].includes(String(policy.policyCategory || policy.policyTypeSelector || "").trim().toLowerCase())
                  ? "EW Policy"
                  : (String(policy.policyCategory || policy.policyTypeSelector || "Insurance").replace(" Policy", ""))}
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


              {openDues > 0 && (
                <div className="flex flex-wrap gap-2 mt-0">
                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                    <DollarSign size={11} />
                    Customer outstanding {formatInr(openDues)}
                  </span>
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
                <Edit size={14} />
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
                <FolderOpen size={14} />
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
      <div className="grid grid-cols-1 gap-0 md:grid-cols-2 xl:grid-cols-4">
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
              </div>
            </div>

            {/* Body */}
            <div className="p-3 space-y-3">
              {/* Customer block */}
              <div>
                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                  <Phone size={11} className="shrink-0" />
                  <span className="truncate">{policy.mobile || "—"}</span>
                </div>

                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">
                      Source:
                    </span>
                    <span className="text-slate-700 font-bold">
                      {policy.source || "Direct"}
                    </span>
                  </div>
                  {policy.isIndirectSource && policy.sourceDetailsName ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="font-bold uppercase tracking-wider text-slate-400">
                        Channel Partner:
                      </span>
                      <span className="truncate font-semibold text-slate-700">
                        {[policy.sourceDetailsName, policy.sourceDetailsContact].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  ) : null}
                  {policy.referenceName || policy.referencePhone ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="font-bold uppercase tracking-wider text-slate-400">
                        Reference:
                      </span>
                      <span className="truncate font-semibold text-slate-700">
                        {[policy.referenceName, policy.referencePhone].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  ) : null}
                  {shouldShowInsuranceChannelBadge(policy) &&
                    !policy.isIndirectSource &&
                    policy.channelPartnerName ? (
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit max-w-full border ${policy.policyDoneByLabel?.toLowerCase() === "broker"
                        ? "bg-amber-50 border-amber-100"
                        : "bg-blue-50 border-blue-100"
                        }`}
                    >
                      <span
                        className={`text-[10px] font-bold truncate ${policy.policyDoneByLabel?.toLowerCase() === "broker"
                          ? "text-amber-700"
                          : "text-blue-700"
                          }`}
                        title={`${policy.policyDoneByLabel}: ${policy.channelPartnerName}${policy.channelDealerNo ? ` (#${policy.channelDealerNo})` : ""}`}
                      >
                        {policy.policyDoneByLabel}: {policy.channelPartnerName}
                        {policy.channelDealerNo ? (
                          <span className="ml-1 opacity-60">
                            #{policy.channelDealerNo}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  ) : null}
                </div>
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
                  {policy.vehicleYear ? (
                    <span className="text-slate-500">
                      {" "}
                      · {policy.vehicleYear}
                    </span>
                  ) : null}
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
            className="rounded-2xl cursor-pointer transition-transform duration-150 hover:scale-[1.01]"
            style={{
              borderColor: "#e2e8f0",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
            }}
            onClick={onPolicyBreakup}
          >
            {/* Header */}
            <div
              className="px-3 py-3 border-b"
              style={{ borderColor: "#e2e8f0" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 flex items-center gap-1">
                      <Shield size={11} />
                      Policy
                    </p>
                  </div>
                  <p
                    className="text-[13px] font-semibold text-slate-900 mt-1 truncate"
                    title={policy.insurer}
                  >
                    {policy.insurer === "—" && isDraft
                      ? "Draft Policy"
                      : policy.insurer || "—"}
                  </p>
                  <p
                    className="text-[11px] text-slate-500 truncate"
                    title={policy.policyNumber}
                    style={{ fontFamily: "var(--default-mono-font-family)" }}
                  >
                    {policy.insurer === "—" && isDraft
                      ? "Details pending"
                      : policy.policyNumber || "Not issued"}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-3 space-y-3">
              {policy.insurer === "—" && isDraft ? (
                <div className="flex items-center py-2">
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                    Draft • Complete form to generate
                  </span>
                </div>
              ) : (
                <>
                  {/* IDV / NCB row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      IDV {policy.idvInline}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                      NCB {policy.ncb}
                    </span>
                    {(() => {
                      const isEW = ["extended warranty", "ew policy"].includes(
                        String(policy.policyCategory || policy.policyTypeSelector || "").trim().toLowerCase()
                      );
                      return (
                        <>
                          {policy.policyOriginType && !policy.isNewCarCase && !isEW ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600">
                              {policy.policyOriginType}
                            </span>
                          ) : null}
                          {policy.policyType && !isEW ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              {policy.policyType}
                            </span>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>

                  {/* Hypothecation */}
                  <div className="space-y-1">
                    <p
                      className="text-[11px] text-slate-500 truncate"
                      title={policy.hypothecation}
                    >
                      Hypothecation: {policy.hypothecation || "—"}
                    </p>
                    {policy.policyIssuedByDetail &&
                      policy.policyIssuedByDetail !== "—" ? (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Issued via:
                        </span>
                        <span
                          className={cx(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold truncate max-w-[120px]",
                            String(policy.policyIssuedByDetail)
                              .toLowerCase()
                              .includes("broker")
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : String(policy.policyIssuedByDetail)
                                .toLowerCase()
                                .includes("showroom")
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200",
                          )}
                          title={policy.policyIssuedByDetail}
                        >
                          {policy.policyIssuedByDetail}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 truncate mt-1">
                        Issued by: —
                      </p>
                    )}

                  </div>
                </>
              )}
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
                  const rowBase = Number(
                    item.progressBase || paymentBaseAmount || 0,
                  );
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

              </div>
            </div>

            {/* Body */}
            <div className="p-3 space-y-3">
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Created</span>
                  <span className="font-semibold text-slate-900 text-right truncate">
                    {policy.createdLabel}
                  </span>
                </div>

                {policy.expiryLabel && policy.expiryLabel !== "—" && (
                  <div className="flex justify-between gap-2 items-center">
                    <span className="text-slate-600 shrink-0">Expiry</span>
                    <span className="font-semibold text-slate-900 text-right truncate">
                      {policy.expiryLabel}
                    </span>
                  </div>
                )}
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [policyFilter, setPolicyFilter] = useState("all");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [previewStageKey, setPreviewStageKey] = useState(null);

  const [policyModal, setPolicyModal] = useState({
    open: false,
    policy: null,
  });
  const [docsModal, setDocsModal] = useState({
    open: false,
    caseId: null,
    record: null,
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

  useEffect(() => {
    const trimmed = search.trim();
    // Skip firing a backend search for 1-char queries — they match nearly
    // every record and were the main cause of the dashboard hanging on load.
    if (trimmed.length === 1) return undefined;
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // ============================================
  // API CALLBACKS (PRESERVED)
  // ============================================

  const loadCases = useCallback(async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      const res = await insuranceApi.getAll({ search: query, limit: 200 });
      const raw = Array.isArray(res?.data) ? res.data : res?.items || [];
      const seen = new Set();
      const rows = raw.filter((row) => {
        const id = getCaseId(row);
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      setCases(rows);
    } catch (err) {
      console.error("[InsuranceDashboard] load error:", err);
      setError(err?.message || "Failed to load insurance cases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases(debouncedSearch);
  }, [loadCases, debouncedSearch]);

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


  // ============================================
  // COMPUTATIONS (PRESERVED)
  // ============================================

  const renewedCaseIds = useMemo(() => collectRenewedCaseIds(cases), [cases]);

  const stats = useMemo(() => {
    const total = cases.length;
    const draft = cases.filter(isDraftPolicy).length;
    const completed = cases.filter(isCompletedPolicy).length;
    const paymentDueRows = cases
      .map((c) => ({ record: c, due: getInsurancePaymentDueSnapshot(c) }))
      .filter((row) => row.due.isDue);
    const paymentDue = paymentDueRows.length;
    const paymentDueAmount = paymentDueRows.reduce(
      (sum, row) => sum + row.due.amount,
      0,
    );
    return {
      total,
      draft,
      completed,
      paymentDue,
      paymentDueAmount,
    };
  }, [cases]);


  const filterCounts = useMemo(() => {
    const rows = Array.isArray(cases) ? cases : [];
    return {
      all: rows.length,
      completed: rows.filter((c) =>
        matchesPolicyFilter(c, "completed", renewedCaseIds),
      ).length,
      draft: rows.filter((c) => matchesPolicyFilter(c, "draft", renewedCaseIds))
        .length,
      paymentDue: rows.filter((c) =>
        matchesPolicyFilter(c, "paymentDue", renewedCaseIds),
      ).length,
      expiring: rows.filter((c) => isExpiringSoonCase(c, renewedCaseIds))
        .length,
      expired: rows.filter((c) => isExpiredCase(c, renewedCaseIds)).length,
      "2w": rows.filter((c) => matchesPolicyFilter(c, "2w", renewedCaseIds))
        .length,
      "4w": rows.filter((c) => matchesPolicyFilter(c, "4w", renewedCaseIds))
        .length,
      comm: rows.filter((c) => matchesPolicyFilter(c, "comm", renewedCaseIds))
        .length,
    };
  }, [cases, renewedCaseIds]);

  const filteredCases = useMemo(() => {
    return (cases || []).filter((c) => {
      if (policyFilter === "renewal30") {
        if (!isExpiringSoonCase(c, renewedCaseIds)) return false;
      } else if (policyFilter === "expired") {
        if (!isExpiredCase(c, renewedCaseIds)) return false;
      } else if (!matchesPolicyFilter(c, policyFilter, renewedCaseIds)) {
        return false;
      }
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const snap = c.customerSnapshot || {};
      const haystack = [
        c.caseId,
        c._id,
        c.customerId,
        snap.customerName,
        snap.companyName,
        snap.contactPersonName,
        snap.primaryMobile,
        c.customerName,
        c.companyName,
        c.contactPersonName,
        c.mobile,
        c.primaryMobile,
        c.email,
        c.referencePhone,
        c.registrationNumber,
        c.vehicleNumber,
        c.vehicleMake,
        c.vehicleModel,
        c.vehicleVariant,
        c.newInsuranceCompany,
        c.newPolicyNumber,
        c.previousPolicyNumber,
        c.newPolicyType,
        c.previousPolicyType,
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
  }, [cases, search, policyFilter, renewedCaseIds]);

  useEffect(() => {
    setPage(1);
  }, [search, policyFilter, cases.length]);

  const paginatedCases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, page]);

  const totalCount = filteredCases.length;
  const hasActiveFilters = policyFilter !== "all" || search.trim().length > 0;



  // ============================================
  // TRANSFORM DATA FOR UI
  // ============================================

  const transformedPolicies = useMemo(() => {
    return paginatedCases.map((record) => {
      const snap = record.customerSnapshot || {};
      const id = getCaseId(record);
      const caseRef = record.caseId || id;

      // Customer
      const buyerType = String(
        record.buyerType || snap.buyerType || "Individual",
      )
        .trim()
        .toLowerCase();
      const isCompany = buyerType === "company";

      const companyName = isCompany
        ? (record.companyName || snap.companyName || "")
        : "";
      const contactPerson = isCompany
        ? (record.contactPersonName || snap.contactPersonName || "")
        : "";
      const customerName =
        resolveInsuranceCustomerDisplay({
          customerName: record.customerName || snap.customerName || "",
          companyName,
          contactPersonName: contactPerson,
          sourceName: record.sourceName,
          dealerChannelName: record.dealerChannelName,
        }) ||
        record.customerName ||
        snap.customerName ||
        "—";
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
      const baseName =
        buyerType === "company"
          ? companyName || contactPerson || customerName || "—"
          : customerLooksLikeSource || customerLooksLikeChannelAlias
            ? contactPerson || customerName || companyName || "—"
            : customerName || contactPerson || companyName || "—";

      const vehicle = [
        record.vehicleMake,
        record.vehicleModel,
        record.vehicleVariant,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      const vehicleLabel = vehicle || "—";
      const reg = record.registrationNumber || record.vehicleNumber || "";
      const displayName = baseName;

      const mobile = snap.primaryMobile || record.mobile || "—";
      const sourceRaw = String(
        record.source || record.sourceOrigin || "",
      ).trim();
      const source = sourceRaw || (record.sourceName ? "Indirect" : "Direct");
      const isIndirectSource = source.toLowerCase() === "indirect";
      const policyDoneByRaw = String(
        record.policyDoneBy || record.policy_done_by || "",
      ).trim();
      const policyDoneByLower = policyDoneByRaw.toLowerCase();
      const brokerName = String(record.brokerName || "").trim();
      const showroomName = String(record.showroomName || "").trim();
      const dealerChannelName = String(record.dealerChannelName || "").trim();
      const { referenceName, referencePhone } = resolveInsuranceReference(record);

      const regKey = normalizeVehicleRegKey(reg || "—");
      const vehicleYear = getVehicleDisplayYear(record);

      // Policy
      const insurer = record.newInsuranceCompany || "—";
      const policyNo = record.newPolicyNumber || "—";
      const premium = premiumNum(record);
      const idv = Number(record.newIdvAmount || 0);
      const ncb = hasDisplayValue(record.newNcbDiscount)
        ? `${record.newNcbDiscount}%`
        : "—";
      const hypothecation = record.newHypothecation || "—";
      const policyOriginType = getPolicyOriginType(record);
      const isNewCarCase =
        String(record.vehicleType || "")
          .trim()
          .toLowerCase() === "new car";
      const policyIssuedBy =
        record.policyIssuedBy ||
        record.policyDoneBy ||
        record.policy_done_by ||
        record.insuranceIssuedBy ||
        record.sourceOrigin ||
        "—";
      const channelPartnerName =
        policyDoneByLower === "broker"
          ? brokerName
          : policyDoneByLower === "showroom"
            ? showroomName
            : "";
      const policyIssuedByDetail =
        policyDoneByLower.includes("autocredit")
          ? "Autocredits India LLP"
          : channelPartnerName ||
          (policyDoneByLower === "broker"
            ? "Broker"
            : policyDoneByLower === "showroom"
              ? "Showroom"
              : policyIssuedBy);
      const sourceDetailsName = isIndirectSource
        ? dealerChannelName || referenceName
        : "";
      const channelDealerNo =
        record.channelDealerNo ||
        record.channel_dealer_no ||
        record.channelDealerNumber ||
        record.dealerChannelNumber ||
        record.dealer_channel_number ||
        "";

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
      const activePolicy = resolveActivePolicySnapshot(record);
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
      const includedAddOns = parsePolicyIncludedAddons(record);
      const policyCategoryKey = String(
        record.policyCategory || record.policyTypeSelector || "",
      ).trim().toLowerCase();
      const isExtendedWarranty =
        policyCategoryKey === "extended warranty" ||
        policyCategoryKey === "ew policy";
      const policyType = String(
        record.newPolicyType ||
        record.coverageType ||
        acceptedQuote?.coverageType ||
        record.previousPolicyType ||
        record.policyType ||
        "",
      ).trim();

      // Status & dates
      const st = normalizeStatus(record.status);
      const createdLabel = record.createdAt
        ? dayjs(record.createdAt).format("DD MMM YYYY")
        : "—";
      const expiryDate = getPolicyPulseExpiryDate(record);
      const parsedExpiryDate = parseInsuranceDate(expiryDate);
      const expiryLabel = parsedExpiryDate
        ? parsedExpiryDate.format("DD MMM YYYY")
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
      const insurerPaymentPending =
        effectiveInsurerPaidTotal <= 0 && premium > 0;
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
          : insurerPaymentPending
            ? null
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
          label: "Subvention (Non-recoverable)",
          amount: effectiveSubventionNr,
          type: "accent",
          date: latestSubventionNrRow?.date || null,
        });
      }
      if (effectiveSubventionRefund > 0 && effectiveSubventionRefund !== effectiveSubventionNr) {
        subventionRows.push({
          label: "Subvention Refund",
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
        isIndirectSource,
        policyDoneByLabel: policyDoneByRaw || "—",
        channelPartnerName,
        sourceDetailsName: isIndirectSource ? dealerChannelName || referenceName : "",
        sourceDetailsContact: isIndirectSource
          ? String(
            record.dealerChannelMobile ||
            record.dealerChannelContact ||
            record.sourceContactNumber ||
            "",
          ).trim()
          : "",
        referenceName,
        referencePhone,
        referenceContact: referencePhone,
        channelDealerNo,
        vehicle: vehicleLabel,
        vehicleYear,
        registration: reg,
        regKey,
        insurer,
        policyNumber: policyNo,
        policyIssuedBy,
        policyIssuedByDetail,
        policyOriginType,
        isNewCarCase,
        premium,
        paid,
        idv,
        idvInline,
        ncb: ncbInline,
        hypothecation,
        status: st,
        currentStep: record.currentStep,
        renewalFollowUpStatus: record.renewalFollowUpStatus || "",
        expiryDays: daysLeft,
        expiryLabel,
        canRenewNow:
          daysLeft !== null &&
          daysLeft >= 0 &&
          daysLeft <= 30 &&
          !renewedCaseIds.has(String(id)),
        createdLabel,
        vehicleType: record.vehicleType || "4W",
        policyCategory: record.policyCategory || "",
        policyTypeSelector: record.policyTypeSelector || "",
        typesOfVehicle: record.typesOfVehicle || "",
        policyType,
        paymentTimeline: paymentTimelineRows,
        isCompleted: isCompletedPolicy(record),
        paymentPercent,
        openDues: openDuesFromAcRecovery,
        alreadyRenewed: renewedCaseIds.has(String(id)),
        quoteCoverageType:
          isExtendedWarranty
            ? (acceptedQuote?.coverageType || record?.newPolicyType || "")
            : (acceptedQuote?.coverageType || record?.newPolicyType || "Comprehensive"),
        quoteDuration:
          acceptedQuote?.policyDuration ||
          record?.newInsuranceDuration ||
          "1 Year",
        breakup: {
          ownDamage: Number(activePolicy.ownDamage || 0),
          ownDamageBeforeNcb: Number(activePolicy.ownDamageBeforeNcb || activePolicy.ownDamage || 0),
          basicOwnDamage: Number(activePolicy.ownDamage || 0),
          ncbPercent: Number(activePolicy.ncbDiscount || 0),
          ncbAmount: Math.round((Number(activePolicy.ownDamage || 0) * Number(activePolicy.ncbDiscount || 0)) / 100),
          thirdParty: Number(activePolicy.thirdParty || 0),
          basicThirdParty: Number(activePolicy.thirdParty || 0),
          addOnsTotal: Number(activePolicy.addOnsTotal || 0),
          totalAmount: Number(activePolicy.totalPremium || premium || 0),
          includedAddOns,
        },
        record,
      };
    });
  }, [paginatedCases, renewedCaseIds]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <InsuranceAntdProvider>
      <div
        className="insurance-antd-page h-[calc(100vh-5rem)] overflow-y-auto overflow-x-hidden p-4 bg-slate-50"
        style={{
          ...FONT_VARS,
          fontFamily: "var(--default-font-family)",
          background: "linear-gradient(160deg, #f0f4ff 0%, #fafafa 60%)",
        }}
      >
        <div className="max-w-[1920px] mx-auto space-y-4">


          {/* Header */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Insurance Workspace
              </p>
              <h1 className="mt-0.5 text-2xl font-black text-slate-900">
                Policy Dashboard
              </h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Cases, revenue, renewals &amp; payments — one view.
              </p>
            </div>
          </div>

          {/* Metric Cards - Sample Style */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              icon={FileText}
              title="Total"
              value={stats.total}
              color="#3b82f6"
              isActive={policyFilter === "all"}
              onClick={() => setPolicyFilter("all")}
            />
            <MetricCard
              icon={Clock3}
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
              subtitle={formatInr(stats.paymentDueAmount)}
              color="#f59e0b"
              isActive={policyFilter === "paymentDue"}
              onClick={() => setPolicyFilter("paymentDue")}
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
                  placeholder="Search by customer, policy, vehicle, registration…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-slate-900 placeholder-slate-400 font-medium transition-all"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/insurance/new")}
                className="px-5 py-2.5 rounded-lg font-bold text-white flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Plus size={16} />
                New Policy
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => loadCases(debouncedSearch)}
                className="px-4 py-2.5 rounded-lg font-semibold text-slate-700 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <RefreshCw size={16} />
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
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin text-indigo-400" />
                Loading insurance cases…
              </div>
            </div>
          )}
          {!loading && filteredCases.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-slate-200 bg-white py-16 text-center"
            >
              <div
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
                style={{
                  background: "linear-gradient(135deg,#4f46e520,#0ea5e920)",
                }}
              >
                <Search size={36} className="text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                No policies found
              </h3>
              <p className="text-sm text-slate-500">
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
                  onDelete={() => handleDeleteCase(policy.id, policy.caseId)}
                  onDocs={() => {
                    setDocsModal({
                      open: true,
                      caseId: getCaseId(policy.record),
                      record: policy.record,
                    });
                  }}
                  onPolicyBreakup={() =>
                    setPolicyModal({
                      open: true,
                      policy,
                    })
                  }
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {!loading && filteredCases.length > 0 && (
            <div className="text-center text-sm text-slate-500 pb-4">
              Showing {Math.min(page * pageSize, filteredCases.length)} of {filteredCases.length} policies
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

        {/* Premium Breakup Modal */}
        <Modal
          open={policyModal.open}
          centered
          width={480}
          footer={null}
          onCancel={() => setPolicyModal({ open: false, policy: null })}
          title={null}
          styles={{
            content: { padding: 0, borderRadius: "16px", overflow: "hidden" },
            body: { padding: 0 }
          }}
        >
          {policyModal.policy ? (
            <div className="max-h-[85vh] overflow-y-auto bg-slate-50/50 px-5 py-8 sm:px-6 sm:py-10">
              <PremiumBreakupCard
                breakup={policyModal.policy.breakup}
                formatCurrency={formatInr}
                includedAddons={policyModal.policy.breakup?.includedAddOns || []}
                totalAmount={policyModal.policy.breakup.totalAmount}
                title="Premium Breakup"
                insurerName={policyModal.policy.insurer}
                idx={0}
                coverageType={policyModal.policy.quoteCoverageType}
                policyDuration={policyModal.policy.quoteDuration}
                idv={policyModal.policy.idvInline}
                isAccepted={policyModal.policy.isCompleted}
              />
            </div>
          ) : null}
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

        {docsModal.open && (
          <InsuranceDocumentsModal
            open={docsModal.open}
            caseId={docsModal.caseId}
            insuranceCase={docsModal.record}
            onClose={() => setDocsModal((p) => ({ ...p, open: false }))}
          />
        )}
      </div>
    </InsuranceAntdProvider>
  );
};

export default InsuranceDashboardPage;
