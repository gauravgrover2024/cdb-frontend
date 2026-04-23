import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  PencilLine,
  Trash2,
  Eye,
  RefreshCw,
  Zap,
  GalleryVertical,
  TrendingUp,
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
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { insuranceApi } from "../../api/insurance";
import InsurancePreview from "../../components/insurance/InsurancePreview";
import "../../components/insurance/insurance-lively.css";
import "./InsuranceDashboardPage.css";

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

const INSURANCE_STAT_THEMES = {
  total: {
    tone: "tone-total",
  },
  draft: {
    tone: "tone-draft",
  },
  completed: {
    tone: "tone-completed",
  },
  paymentDue: {
    tone: "tone-payment",
  },
  renewal: {
    tone: "tone-renewal",
  },
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
    _id: row._id || row.id || `ins-ledger-${Date.now()}-${index}`,
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
  const customerNetReceivableWhenAcPays = Math.max(
    0,
    insurerPaidByAutocredits - subventionNotRecoverable,
  );
  const customerOutstandingToAc = Math.max(
    0,
    customerNetReceivableWhenAcPays - customerRecovered,
  );

  return {
    insurerPaidByAutocredits,
    insurerPaidByCustomer,
    insurerPaidTotal,
    insurerOutstanding,
    customerRecovered,
    customerOutstandingToAc,
    subventionNotRecoverable,
    subventionRefundPaid,
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

  return {
    addOnsTotal,
    odAmt,
    tpAmt,
    totalIdv,
    ncbAmount,
    totalPremium,
  };
};

const MetricCard = ({
  id,
  title,
  subtitle,
  value,
  icon,
  onClick,
  isActive,
  loading,
}) => {
  const theme = INSURANCE_STAT_THEMES[id] || INSURANCE_STAT_THEMES.total;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`insdash-metric-card ${theme.tone} ${isActive ? "active" : ""}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="metric-title">{title}</p>
          <p className="metric-value">{loading ? "—" : value}</p>
          {subtitle && (
            <p className="metric-subtitle">{subtitle}</p>
          )}
        </div>

        <div className="metric-icon">{icon}</div>
      </div>
    </button>
  );
};

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
      renewal30,
      totalPremium,
      totalCollected,
      outstanding: Math.max(0, totalPremium - totalCollected),
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
      renewal30: rows.filter((c) => matchesPolicyFilter(c, "renewal30")).length,
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

  return (
    <div className="insurance-case-skin insurance-dashboard-shell insurance-dashboard-page h-full min-h-0 overflow-hidden rounded-3xl border p-4 md:p-6">
      <div className="flex h-full min-h-0 flex-col gap-5">
        <section className="insdash-dashboard-top">
          <h1 className="insdash-dashboard-title">
            Insurance Dashboard
          </h1>
          <p className="insdash-dashboard-subtitle">
            Real-time insurance operations & revenue tracking
          </p>

          <div className="insdash-headline-stats">
            <span className="insdash-headline-pill">
              Cases: <strong>{totalCount}</strong>
            </span>
            <span className="insdash-headline-pill">
              Collected:{" "}
              <strong>
                {formatInr(
                  filteredCases.reduce(
                    (sum, c) => sum + paymentReceivedNum(c),
                    0,
                  ),
                )}
              </strong>
            </span>
            <span className="insdash-headline-pill">
              Outstanding:{" "}
              <strong>
                {formatInr(
                  filteredCases.reduce((sum, c) => sum + dueNum(c), 0),
                )}
              </strong>
            </span>
          </div>
        </section>

        <section className="insdash-metric-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            id="total"
            title="Total Policies"
            subtitle="All insurance records"
            value={stats.total}
            icon={<Eye size={18} />}
            loading={loading}
            isActive={policyFilter === "all"}
            onClick={() => setPolicyFilter("all")}
          />
          <MetricCard
            id="draft"
            title="Draft"
            subtitle="Needs completion"
            value={stats.draft}
            icon={<PencilLine size={18} />}
            loading={loading}
            isActive={policyFilter === "draft"}
            onClick={() => setPolicyFilter("draft")}
          />
          <MetricCard
            id="completed"
            title="Completed"
            subtitle="Issued / submitted"
            value={stats.completed}
            icon={<Zap size={18} />}
            loading={loading}
            isActive={policyFilter === "completed"}
            onClick={() => setPolicyFilter("completed")}
          />
          <MetricCard
            id="paymentDue"
            title="Payment Due"
            subtitle="Pending receipts"
            value={stats.paymentDue}
            icon={<RefreshCw size={18} />}
            loading={loading}
            isActive={policyFilter === "paymentDue"}
            onClick={() => setPolicyFilter("paymentDue")}
          />
          <MetricCard
            id="renewal"
            title="Renewal 30 Days"
            subtitle="Upcoming expiries"
            value={stats.renewal30}
            icon={<Plus size={18} />}
            loading={loading}
            isActive={policyFilter === "renewal30"}
            onClick={() => setPolicyFilter("renewal30")}
          />
        </section>

        <div className="insdash-grid-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="insdash-filter-bar flex-shrink-0 p-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by case, customer, mobile, vehicle, policy number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="primary"
                    icon={<Plus size={16} />}
                    onClick={() => navigate("/insurance/new")}
                    className="insdash-primary-btn !h-10 !rounded-xl"
                  >
                    New Case
                  </Button>
                  <Button
                    icon={<RefreshCw size={16} />}
                    onClick={loadCases}
                    className="insdash-refresh-btn !h-10 !w-10 !rounded-xl !p-0"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {FILTER_CHIPS.map(({ key, label }) => {
                  const count = filterCounts[key] ?? 0;
                  const active = policyFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPolicyFilter(key)}
                      className={`insdash-filter-chip ${active ? "is-active" : ""}`}
                    >
                      {label} <span className="chip-count">{count}</span>
                    </button>
                  );
                })}

                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPolicyFilter("all");
                      setSearch("");
                    }}
                    className="insdash-clear-chip rounded-full border px-3 py-1.5 text-xs font-semibold"
                  >
                    Clear Filters
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {error && (
              <Alert
                type="error"
                showIcon
                message="Failed to load insurance cases"
                description={error}
                className="m-3"
              />
            )}

            {loading && cases.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center text-slate-500">
                Loading insurance cases…
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="p-6">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No insurance cases found"
                />
              </div>
            ) : (
              <div className="px-2 py-3">
                {paginatedCases.map((record) => {
                  const snap = record.customerSnapshot || {};
                  const id = getCaseId(record);
                  const caseRef = record.caseId || id;

                  const customerName =
                    snap.customerName || record.customerName || "—";
                  const companyName =
                    snap.companyName || record.companyName || "";
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
                    Boolean(sourceIdentity) &&
                    sourceIdentity === customerIdentity;
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

                  const vehicle = [
                    record.vehicleMake,
                    record.vehicleModel,
                    record.vehicleVariant,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
                  const vehicleLabel = vehicle || "—";
                  const reg =
                    record.registrationNumber || record.vehicleNumber || "—";
                  const regKey = normalizeVehicleRegKey(reg);
                  const vehicleHistory = regKey
                    ? historyByRegistration.get(regKey) || []
                    : [];
                  const vehicleTrend = buildTrendSeries(vehicleHistory);

                  const insurer = record.newInsuranceCompany || "—";
                  const policyNo = record.newPolicyNumber || "—";
                  const { acceptedQuote, acceptedBreakup } =
                    getAcceptedQuoteContext(record);
                  const premium = premiumNum(record);
                  const idv = Number(record.newIdvAmount || 0);
                  const ncb = hasDisplayValue(record.newNcbDiscount)
                    ? `${record.newNcbDiscount}%`
                    : "—";
                  const hypothecation = record.newHypothecation || "—";
                  const policyIssuedBy =
                    record.policyDoneBy || snap.policyDoneBy || "—";

                  const paid = paymentReceivedNum(record);
                  const paidByCustomer = Number(
                    record.customerPaymentReceived ||
                      record.customer_payment_received ||
                      0,
                  );
                  const due = Math.max(0, premium - paid);

                  const paymentLedger = Array.isArray(record?.paymentHistory)
                    ? record.paymentHistory
                    : Array.isArray(record?.payment_history)
                      ? record.payment_history
                      : [];
                  const normalizedLedger = paymentLedger.map(
                    normalizeInsuranceLedgerRow,
                  );
                  const ledgerTotals = computeInsurancePaymentTotals(
                    normalizedLedger,
                    premium,
                  );
                  const hasLedgerSnapshot = normalizedLedger.length > 0;

                  const snapshotSubventionRefund = hasLedgerSnapshot
                    ? ledgerTotals.subventionRefundPaid
                    : Number(record?.subventionAmount || 0);
                  const snapshotInsurerDue = hasLedgerSnapshot
                    ? ledgerTotals.insurerOutstanding
                    : due;
                  const fallbackAcPaidToInsurer = Number(
                    record.inhousePaymentReceived ||
                      record.inhouse_payment_received ||
                      0,
                  );
                  const fallbackOpenDues = Math.max(
                    0,
                    fallbackAcPaidToInsurer -
                      snapshotSubventionRefund -
                      paidByCustomer,
                  );
                  const openDuesFromAcRecovery = hasLedgerSnapshot
                    ? ledgerTotals.insurerPaidByAutocredits > 0
                      ? ledgerTotals.customerOutstandingToAc
                      : 0
                    : fallbackOpenDues;
                  const shouldShowOpenDues = openDuesFromAcRecovery > 0;

                  const hasAcceptedQuote = Boolean(acceptedQuote);
                  const ncbInline = hasAcceptedQuote
                    ? `${Number(acceptedQuote?.ncbDiscount || 0)}%`
                    : ncb;
                  const idvInline =
                    hasAcceptedQuote &&
                    Number(acceptedBreakup.totalIdv || 0) > 0
                      ? formatInr(acceptedBreakup.totalIdv)
                      : idv
                        ? formatInr(idv)
                        : "—";
                  const quotePremium = formatInr(premium);
                  const st = normalizeStatus(record.status);
                  const statusLabel =
                    STATUS_LABEL_MAP[st] || record.status || "Unknown";
                  const stepLabel = STEP_LABEL_MAP[record.currentStep] || "—";
                  const createdLabel = record.createdAt
                    ? dayjs(record.createdAt).format("DD MMM YYYY")
                    : "—";
                  const expiryDate =
                    record.newOdExpiryDate ||
                    record.newTpExpiryDate ||
                    record.policyExpiry;
                  const expiryLabel = expiryDate
                    ? dayjs(expiryDate).format("DD MMM YYYY")
                    : "—";
                  const daysLeft = daysUntilExpiry(record);
                  const showRenewalBadge =
                    !isDraftPolicy(record) &&
                    daysLeft !== null &&
                    daysLeft >= -30 &&
                    daysLeft <= 30;
                  const statusToneStyle = isDraftPolicy(record)
                    ? {
                        borderColor: "#d8c5e9",
                        background: "#f7efff",
                        color: "#6d4e8f",
                      }
                    : {
                        borderColor: "#b9e3d0",
                        background: "#eaf8f2",
                        color: "#1f7856",
                      };
                  const dueToneColor = shouldShowOpenDues
                    ? "#b8324b"
                    : "var(--ins-accent)";
                  const paymentMadeToInsurer = hasLedgerSnapshot
                    ? ledgerTotals.insurerPaidTotal
                    : Math.max(0, premium - snapshotInsurerDue);
                  const customerReceiptAmount = hasLedgerSnapshot
                    ? ledgerTotals.customerRecovered
                    : paidByCustomer;
                  const subventionTotal = hasLedgerSnapshot
                    ? ledgerTotals.subventionRefundPaid +
                      ledgerTotals.subventionNotRecoverable
                    : snapshotSubventionRefund;
                  const paymentPendingForInsurer = Math.max(
                    0,
                    premium - paymentMadeToInsurer,
                  );
                  const paymentFlowTimeline = [
                    {
                      key: "premium",
                      label: "Total Premium",
                      arrow: "↔",
                      amount: premium,
                      tone: "neutral",
                      note: "Policy payable amount",
                    },
                    {
                      key: "insurer",
                      label: "Paid to Insurer",
                      arrow: "↑",
                      amount: paymentMadeToInsurer,
                      tone: paymentPendingForInsurer > 0 ? "warning" : "good",
                      note:
                        paymentPendingForInsurer > 0
                          ? `Payment pending ${formatInr(paymentPendingForInsurer)}`
                          : "Fully paid",
                    },
                    {
                      key: "receipt",
                      label: "Recovered from Customer",
                      arrow: "↓",
                      amount: customerReceiptAmount,
                      tone: customerReceiptAmount > 0 ? "good" : "neutral",
                      note:
                        customerReceiptAmount > 0
                          ? "Recovered amount"
                          : "No receipt yet",
                    },
                    {
                      key: "subvention",
                      label: "Subvention",
                      arrow: "↔",
                      amount: subventionTotal,
                      tone: subventionTotal > 0 ? "accent" : "neutral",
                      note:
                        subventionTotal > 0
                          ? "Adjustment recorded"
                          : "No subvention yet",
                    },
                  ];

                  return (
                    <article
                      key={id}
                      className="insdash-case-card group mb-4 overflow-visible rounded-3xl shadow-sm transition-all duration-300 hover:-translate-y-[1px] hover:shadow-md"
                    >
                      <div className="insdash-case-head px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="insdash-case-id-chip rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                              {caseRef}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {displayName}
                            </span>
                            <span className="hidden text-xs text-slate-400 sm:inline">
                              •
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {source}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                              style={statusToneStyle}
                            >
                              {statusLabel}
                            </span>
                            <Tag
                              className="!m-0 !rounded-full !px-2 !py-0 !text-[10px]"
                              color="default"
                            >
                              {record.vehicleType || "NEW"}
                            </Tag>
                            <Tag
                              className="!m-0 !rounded-full !px-2 !py-0 !text-[10px]"
                              color="default"
                            >
                              {record.typesOfVehicle || "4W"}
                            </Tag>
                          </div>
                        </div>
                      </div>

                      <div className="insdash-case-body px-4 py-3">
                        <div className="insdash-flat-grid">
                          <section className="insdash-compact-panel">
                            <p className="insdash-field-label text-[10px] font-bold uppercase tracking-[0.12em]">
                              Customer & Vehicle
                            </p>
                            <p className="mt-1 truncate text-[15px] font-bold text-slate-900 dark:text-slate-100">
                              {displayName}
                            </p>
                            {companyName && contactPerson ? (
                              <p className="truncate text-[12px] text-slate-600 dark:text-slate-300">
                                {contactPerson}
                              </p>
                            ) : null}
                            <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">
                              {mobile}
                            </p>
                            <p className="mt-2 truncate text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                              {vehicleLabel}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              Reg: {reg}
                            </p>
                          </section>

                          <section className="insdash-compact-panel">
                            <p className="insdash-field-label text-[10px] font-bold uppercase tracking-[0.12em]">
                              Policy Details
                            </p>
                            <p className="mt-1 truncate text-[15px] font-bold text-slate-900 dark:text-slate-100">
                              {insurer}
                            </p>
                            <p className="mt-1 truncate text-[12px] text-slate-600 dark:text-slate-300">
                              Policy No:{" "}
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {policyNo}
                              </span>
                            </p>
                            <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">
                              Premium:{" "}
                              <span className="font-bold text-[color:var(--ins-accent)]">
                                {quotePremium}
                              </span>
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className="px-2 py-1 text-[10px] rounded-md bg-slate-100 text-slate-700 font-semibold">
                                IDV {idvInline}
                              </span>
                              <span className="px-2 py-1 text-[10px] rounded-md bg-amber-50 text-amber-700 font-semibold">
                                NCB {ncbInline}
                              </span>
                            </div>
                            <p
                              className="mt-0.5 truncate text-[12px] text-slate-600 dark:text-slate-300"
                              title={hypothecation}
                            >
                              Hypothecation:{" "}
                              <span className="font-semibold">
                                {hypothecation}
                              </span>
                            </p>
                            <p
                              className="mt-0.5 truncate text-[12px] text-slate-600 dark:text-slate-300"
                              title={policyIssuedBy}
                            >
                              Policy Issued By:{" "}
                              <span className="font-semibold">
                                {policyIssuedBy}
                              </span>
                            </p>
                          </section>

                          <section className="insdash-payments-panel">
                            <p className="insdash-field-label text-[10px] font-bold uppercase tracking-[0.11em]">
                              Payment Timeline
                            </p>
                            <div className="insdash-payment-flow">
                              {paymentFlowTimeline.map((item, idx) => (
                                <div
                                  key={item.key}
                                  className={`insdash-payment-flow-row tone-${item.tone}`}
                                >
                                  <div className="insdash-payment-flow-track">
                                    <span className="insdash-payment-flow-arrow">
                                      {item.arrow}
                                    </span>
                                    {idx < paymentFlowTimeline.length - 1 ? (
                                      <span className="insdash-payment-flow-line" />
                                    ) : null}
                                  </div>
                                  <div className="insdash-payment-flow-copy">
                                    <p className="insdash-payment-flow-label">
                                      {item.label}
                                    </p>
                                    <p className="insdash-payment-flow-note">
                                      {item.note}
                                    </p>
                                  </div>
                                  <p className="insdash-payment-flow-amount">
                                    {formatInr(item.amount)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </section>

                          <aside className="insdash-workflow-rail">
                            <p className="insdash-field-label text-[10px] font-bold uppercase tracking-[0.11em]">
                              Workflow
                            </p>
                            <div className="mt-1.5 space-y-1.5 text-[12px] text-slate-700 dark:text-slate-300">
                              <p>
                                Step:{" "}
                                <span className="font-semibold">
                                  {stepLabel}
                                </span>
                              </p>
                              <p>
                                Created:{" "}
                                <span className="font-semibold">
                                  {createdLabel}
                                </span>
                              </p>
                              <p>
                                Expiry:{" "}
                                <span className="font-semibold">
                                  {expiryLabel}
                                </span>
                              </p>
                            </div>

                            {shouldShowOpenDues ? (
                              <p
                                className="mt-3 text-[12px] font-bold"
                                style={{ color: dueToneColor }}
                              >
                                Open Dues: {formatInr(openDuesFromAcRecovery)}
                              </p>
                            ) : null}

                            {showRenewalBadge && (
                              <div
                                className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                  daysLeft < 0
                                    ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
                                    : daysLeft <= 7
                                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
                                      : "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300"
                                }`}
                              >
                                {daysLeft < 0
                                  ? `Expired ${Math.abs(daysLeft)}d ago`
                                  : `${daysLeft}d left`}
                              </div>
                            )}
                          </aside>
                        </div>
                      </div>

                      <div className="insdash-case-footer flex flex-col gap-2 border-t px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {record.caseId || id} · {displayName}
                        </p>
                        <Space size={6} wrap>
                          <Tooltip title="View">
                            <button
                              type="button"
                              className="insdash-action-btn tone-view flex h-8 w-8 items-center justify-center rounded-full border"
                              onClick={() => {
                                setSelectedCase(record);
                                setPreviewStageKey(null);
                                setPreviewVisible(true);
                              }}
                            >
                              <Eye size={14} />
                            </button>
                          </Tooltip>

                          <Tooltip title="Documents">
                            <button
                              type="button"
                              className="insdash-action-btn tone-docs flex h-8 w-8 items-center justify-center rounded-full border"
                              onClick={() => {
                                setSelectedCase(record);
                                setPreviewStageKey("documents");
                                setPreviewVisible(true);
                              }}
                            >
                              <GalleryVertical size={14} />
                            </button>
                          </Tooltip>

                          <Tooltip title="Trend">
                            <button
                              type="button"
                              disabled={!vehicleTrend}
                              onClick={() =>
                                setTrendModal({
                                  open: true,
                                  regKey,
                                  regLabel: reg,
                                  vehicleLabel,
                                })
                              }
                              className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                                vehicleTrend
                                  ? "insdash-action-btn tone-trend"
                                  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-[#2f3a36] dark:bg-[#1a211f] dark:text-slate-500"
                              }`}
                            >
                              <TrendingUp size={14} />
                            </button>
                          </Tooltip>

                          <Tooltip
                            title={isDraftPolicy(record) ? "Continue" : "Edit"}
                          >
                            <button
                              type="button"
                              className="insdash-action-btn tone-edit flex h-8 w-8 items-center justify-center rounded-full border"
                              onClick={() => navigate(`/insurance/edit/${id}`)}
                            >
                              <PencilLine size={14} />
                            </button>
                          </Tooltip>

                          <Tooltip title="Renew">
                            <button
                              type="button"
                              className="insdash-action-btn tone-renew flex h-8 w-8 items-center justify-center rounded-full border"
                              onClick={() => handleRenewCase(record)}
                            >
                              <RefreshCw size={14} />
                            </button>
                          </Tooltip>

                          <Tooltip title="Extend">
                            <button
                              type="button"
                              className="insdash-action-btn tone-extend flex h-8 w-8 items-center justify-center rounded-full border"
                              onClick={() => handleExtendCase(record)}
                            >
                              <Zap size={14} />
                            </button>
                          </Tooltip>

                          <Popconfirm
                            title="Delete case"
                            description={`Delete "${record.caseId || id}"? This cannot be undone.`}
                            onConfirm={() =>
                              handleDeleteCase(id, record.caseId || id)
                            }
                            okText="Delete"
                            okType="danger"
                            cancelText="Cancel"
                          >
                            <Tooltip title="Delete">
                              <button
                                type="button"
                                className="insdash-action-btn tone-delete flex h-8 w-8 items-center justify-center rounded-full border"
                              >
                                <Trash2 size={14} />
                              </button>
                            </Tooltip>
                          </Popconfirm>
                        </Space>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {filteredCases.length > 0 && (
            <div className="insdash-pagination flex-shrink-0 border-t bg-white px-4 py-3">
              <div className="flex justify-end">
                <Pagination
                  size="small"
                  current={page}
                  pageSize={pageSize}
                  total={filteredCases.length}
                  onChange={(p) => setPage(p)}
                  showSizeChanger={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>

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
            <div className="insdash-trend-shell rounded-xl border p-3">
              <svg
                viewBox="0 0 700 240"
                className="h-56 w-full overflow-visible"
                role="img"
                aria-label="Premium trend by year"
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
                  stroke="var(--ins-accent)"
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
                    <circle
                      cx={p.x}
                      cy={p.premiumY}
                      r="4.8"
                      fill="var(--ins-accent)"
                    >
                      <title>{`Year ${p.policyStartYear || "—"} | Premium ${formatInr(
                        p.premium,
                      )} | IDV ${formatInr(p.idv)} | ${p.insurer || "Insurer"} | ${p.policyNo || "No Policy No"}`}</title>
                    </circle>
                    {p.showXLabel ? (
                      <text
                        x={p.x}
                        y={trendModalSeries.axisY + 14}
                        textAnchor="middle"
                        className="fill-slate-500 text-[10px]"
                      >
                        {p.policyStartYear || "—"}
                      </text>
                    ) : null}
                  </g>
                ))}
              </svg>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--ins-accent)]" />
                  Premium (Y-axis)
                </span>
                <span className="text-slate-500">
                  Year on X-axis · Hover dots for Premium + IDV
                </span>
              </div>
            </div>
            <div className="insdash-trend-meta rounded-xl border px-3 py-2 text-xs text-slate-600">
              {trendModalHistory.length} policies found for this registration
              number.
            </div>
          </div>
        ) : (
          <div className="insdash-trend-empty rounded-xl border border-dashed px-4 py-10 text-center text-sm text-slate-500">
            No trend data available for this registration number.
          </div>
        )}
      </Modal>

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
