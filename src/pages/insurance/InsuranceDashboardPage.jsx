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
    card: "from-[#6d9484] to-[#5f9770]",
    iconBg: "bg-white/20",
    accent: "text-[#eef3ef]",
  },
  draft: {
    card: "from-[#c48d96] to-[#b97f88]",
    iconBg: "bg-white/20",
    accent: "text-[#fbf1f3]",
  },
  completed: {
    card: "from-[#7c9c90] to-[#6f8f84]",
    iconBg: "bg-white/20",
    accent: "text-[#eef3ef]",
  },
  paymentDue: {
    card: "from-[#b39672] to-[#9f8465]",
    iconBg: "bg-white/20",
    accent: "text-[#faf8f1]",
  },
  renewal: {
    card: "from-[#8ea0b6] to-[#74879f]",
    iconBg: "bg-white/20",
    accent: "text-[#f4f7fa]",
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

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const premiumNum = (c) => {
  const n = Number(c?.newTotalPremium);
  return Number.isFinite(n) ? n : 0;
};

const paymentReceivedNum = (c) => {
  const customer = Number(c?.customerPaymentReceived || c?.customer_payment_received || 0);
  const inhouse = Number(c?.inhousePaymentReceived || c?.inhouse_payment_received || 0);
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

const vehicleTypeLower = (c) => String(c?.typesOfVehicle || "").trim().toLowerCase();

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
  const expiryDate = c?.newOdExpiryDate || c?.newTpExpiryDate || c?.policyExpiry;
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
  if (st === "submitted" && (!hasPolicyNumber(c) || premiumNum(c) <= 0)) return true;
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
  if (row.paymentType === "inhouse") return INSURANCE_ENTRY_TYPES.INSURER_PAYMENT;
  if (row.paymentType === "customer") return INSURANCE_ENTRY_TYPES.CUSTOMER_RECEIPT;
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
    .filter((r) => r.entryType === INSURANCE_ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE)
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

  const addOns = quote.addOns && typeof quote.addOns === "object" ? quote.addOns : {};
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

  const rawAddOnsTotal = Number(quote.addOnsAmount || 0) + selectedAddOnsTotal;
  const addOnsTotal = allowsAddOns ? rawAddOnsTotal : 0;

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
  const totalPremium = taxableAmount + gstAmount;

  const idvParts =
    Number(quote.vehicleIdv || 0) +
    Number(quote.cngIdv || 0) +
    Number(quote.accessoriesIdv || 0);
  const storedIdv = Number(quote.totalIdv);
  const totalIdv = Number.isFinite(storedIdv) && storedIdv > 0 ? storedIdv : idvParts;

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
      className={`group relative text-left w-full overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br ${theme.card} p-4 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
    >
      <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] uppercase tracking-[0.18em] font-semibold ${theme.accent}`}>
            {title}
          </p>
          <p className="mt-1 text-2xl md:text-3xl font-black text-white tabular-nums">
            {loading ? "—" : value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-white/80">{subtitle}</p>}
        </div>

        <div
          className={`mt-1 h-10 w-10 rounded-xl ${theme.iconBg} text-white flex items-center justify-center backdrop-blur-sm`}
        >
          {icon}
        </div>
      </div>

      {isActive && (
        <div className="absolute right-2 top-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white" />
      )}
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
  const [expandedLedgerCaseId, setExpandedLedgerCaseId] = useState(null);
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
    const totalCollected = cases.reduce((sum, c) => sum + paymentReceivedNum(c), 0);

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
      paymentDue: rows.filter((c) => matchesPolicyFilter(c, "paymentDue")).length,
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
    setExpandedLedgerCaseId(null);
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
    <div className="h-full min-h-0 overflow-hidden rounded-3xl border border-[#d6e6df]/70 bg-gradient-to-b from-[#eef3ef]/55 via-white to-white p-4 md:p-6 dark:border-[#2c3833] dark:from-[#101514] dark:via-slate-950 dark:to-slate-950">
      <div className="flex h-full min-h-0 flex-col gap-5">
        <section className="rounded-2xl border border-[#d6e6df]/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-[#2a3531] dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#5f9770] dark:text-[#9dc4ae]">
                Insurance Module
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl dark:text-slate-100">
                Dashboard Command Center
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-[#d6e6df] bg-[#eef3ef] px-3 py-2 dark:border-[#3c4d46] dark:bg-[#1a2421]">
                <p className="text-slate-500 dark:text-slate-400">Cases in view</p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">{totalCount}</p>
              </div>
              <div className="rounded-xl border border-[#d8b8b4] bg-[#fbf1f3] px-3 py-2 dark:border-[#584349] dark:bg-[#2a1f24]">
                <p className="text-slate-500 dark:text-slate-400">Premium collected</p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {formatInr(filteredCases.reduce((sum, c) => sum + paymentReceivedNum(c), 0))}
                </p>
              </div>
              <div className="rounded-xl border border-[#eadfcc] bg-[#faf8f1] px-3 py-2 dark:border-[#5a4c39] dark:bg-[#2a241c]">
                <p className="text-slate-500 dark:text-slate-400">Outstanding</p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {formatInr(
                    filteredCases.reduce((sum, c) => sum + dueNum(c), 0),
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
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

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#d6e6df]/70 bg-white shadow-sm dark:border-[#2a3531] dark:bg-slate-950">
          <div className="flex-shrink-0 border-b border-[#d6e6df]/70 bg-[#eef3ef]/35 p-3 dark:border-[#2a3531] dark:bg-[#151f1b]">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by case, customer, mobile, vehicle, policy number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#d6e6df] bg-white pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-[#5f9770] focus:outline-none focus:ring-1 focus:ring-[#5f9770] dark:border-[#364742] dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="primary"
                    icon={<Plus size={16} />}
                    onClick={() => navigate("/insurance/new")}
                    className="!h-10 !rounded-xl !border-[#5f9770] !bg-[#5f9770] hover:!border-[#4f835f] hover:!bg-[#4f835f]"
                  >
                    New Case
                  </Button>
                  <Button
                    icon={<RefreshCw size={16} />}
                    onClick={loadCases}
                    className="!h-10 !w-10 !rounded-xl !p-0"
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
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? "border-[#5f9770] bg-[#5f9770] text-white"
                          : "border-[#d6e6df] bg-white text-slate-700 hover:border-[#b6cfc4] hover:bg-[#eef3ef]/60 dark:border-[#364742] dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      {label} <span className="opacity-80">{count}</span>
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
                    className="rounded-full border border-[#d8b8b4] bg-[#fbf1f3] px-3 py-1.5 text-xs font-semibold text-[#8b5965] hover:bg-[#f6e6e9] dark:border-[#5b4349] dark:bg-[#2a1f24] dark:text-[#d9b0b8]"
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
                  const contactPerson =
                    snap.contactPersonName || record.contactPersonName || "";
                  const displayName = companyName || customerName || "—";

                  const mobile = snap.primaryMobile || record.mobile || "—";
                  const source =
                    record.source ||
                    record.sourceOrigin ||
                    (record.sourceName ? "Direct" : "—");

                  const vehicle = [record.vehicleMake, record.vehicleModel, record.vehicleVariant]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
                  const vehicleLabel = vehicle || "—";
                  const reg = record.registrationNumber || record.vehicleNumber || "—";
                  const regKey = normalizeVehicleRegKey(reg);
                  const vehicleHistory = regKey
                    ? historyByRegistration.get(regKey) || []
                    : [];
                  const vehicleTrend = buildTrendSeries(vehicleHistory);

                  const insurer = record.newInsuranceCompany || "—";
                  const policyNo = record.newPolicyNumber || "—";
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
                  const snapshotRecoveryDue = hasLedgerSnapshot
                    ? ledgerTotals.customerOutstandingToAc
                    : Math.max(0, premium - paidByCustomer);
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
                  const paymentLedgerRows = normalizedLedger
                    .slice(-5)
                    .reverse()
                    .map((entry) => {
                      const title =
                        entry.entryType === INSURANCE_ENTRY_TYPES.INSURER_PAYMENT
                          ? "Paid to Insurer"
                          : entry.entryType ===
                              INSURANCE_ENTRY_TYPES.CUSTOMER_RECEIPT
                            ? "Recovered from Customer"
                            : entry.entryType ===
                                INSURANCE_ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE
                              ? "Subvention (Not Recoverable)"
                              : "Subvention Refund to Customer";
                      const subtitle = `by ${entry.paidBy || "System"}`;
                      const isInflow =
                        entry.entryType ===
                        INSURANCE_ENTRY_TYPES.CUSTOMER_RECEIPT;
                      const isSubventionNR =
                        entry.entryType ===
                        INSURANCE_ENTRY_TYPES.SUBVENTION_NON_RECOVERABLE;
                      const amountClass = isInflow
                        ? "text-[#5f9770]"
                        : isSubventionNR
                          ? "text-[#9f8465]"
                          : "text-[#c48d96]";
                      const amountPrefix = isInflow ? "+" : "-";
                      const amountArrow = isInflow ? "↓" : "↑";

                      return {
                        key: entry._id,
                        date: entry.date
                          ? dayjs(entry.date).isValid()
                            ? dayjs(entry.date).format("DD MMM")
                            : "—"
                          : "—",
                        title,
                        subtitle,
                        amount: `${amountPrefix}${formatInr(entry.amount)}`,
                        amountClass,
                        amountArrow,
                      };
                    });
                  const leadLedgerEntry = paymentLedgerRows[0] || null;
                  const overflowLedgerEntries = paymentLedgerRows.slice(1);
                  const isLedgerExpanded = expandedLedgerCaseId === id;

                  const quotes = Array.isArray(record?.quotes) ? record.quotes : [];
                  const acceptedQuoteId =
                    record?.acceptedQuoteId || record?.accepted_quote_id || null;
                  const acceptedQuote =
                    record?.acceptedQuote ||
                    quotes.find(
                      (q, idx) =>
                        String(getInsuranceQuoteRowId(q, idx)) ===
                        String(acceptedQuoteId),
                    ) ||
                    null;
                  const acceptedBreakup = computeInsuranceQuoteBreakup(acceptedQuote);
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
                  const quotePremium = hasAcceptedQuote
                    ? formatInr(acceptedBreakup.totalPremium || premium)
                    : formatInr(premium);
                  const st = normalizeStatus(record.status);
                  const statusLabel = STATUS_LABEL_MAP[st] || record.status || "Unknown";
                  const stepLabel = STEP_LABEL_MAP[record.currentStep] || "—";
                  const createdLabel = record.createdAt
                    ? dayjs(record.createdAt).format("DD MMM YYYY")
                    : "—";
                  const expiryDate = record.newOdExpiryDate || record.newTpExpiryDate || record.policyExpiry;
                  const expiryLabel = expiryDate ? dayjs(expiryDate).format("DD MMM YYYY") : "—";
                  const docCount = Array.isArray(record.documents) ? record.documents.length : 0;

                  const daysLeft = daysUntilExpiry(record);
                  const showRenewalBadge = !isDraftPolicy(record) && daysLeft !== null && daysLeft >= -30 && daysLeft <= 30;
                  const statusTone = isDraftPolicy(record)
                    ? "border-[#c7cfd8] bg-[#f4f7fa] text-[#5f6b79] dark:border-[#39434f] dark:bg-[#17202a] dark:text-[#b5c1cf]"
                    : "border-[#b7d7c8] bg-[#eef7f1] text-[#4c7a63] dark:border-[#2f4e41] dark:bg-[#13211a] dark:text-[#9cc9b3]";
                  const dueTone =
                    shouldShowOpenDues
                      ? "text-[#b97f88]"
                      : "text-[#5f9770]";

                  return (
                    <article
                      key={id}
                      className="group mb-4 overflow-visible rounded-3xl border border-[#d6e6df]/75 bg-gradient-to-b from-white to-[#faf8f1]/35 shadow-sm transition-all duration-300 hover:-translate-y-[1px] hover:border-[#b6cfc4] hover:shadow-md dark:border-[#26342f] dark:from-[#0f1614] dark:to-[#111a17] dark:hover:border-[#3b4d45]"
                    >
                      <div className="border-b border-[#e5eee4]/90 px-4 py-3 dark:border-[#26342f]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[#d6e6df] bg-[#eef3ef]/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5f9770] dark:border-[#30413b] dark:bg-[#13221c] dark:text-[#9dc4ae]">
                              {caseRef}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {displayName}
                            </span>
                            <span className="hidden text-xs text-slate-400 sm:inline">•</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {source}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone}`}
                            >
                              {statusLabel}
                            </span>
                            <Tag className="!m-0 !rounded-full !px-2 !py-0 !text-[10px]" color="blue">
                              {record.vehicleType || "NEW"}
                            </Tag>
                            <Tag className="!m-0 !rounded-full !px-2 !py-0 !text-[10px]" color="default">
                              {record.typesOfVehicle || "4W"}
                            </Tag>
                          </div>
                        </div>

                      </div>

                      <div className="grid grid-cols-1 gap-3 px-4 py-3 xl:grid-cols-[1.15fr_1fr_1.55fr_0.9fr]">
                        <section className="rounded-xl border border-[#d6e6df]/70 bg-[#eef3ef]/45 p-3 dark:border-[#2b3b35] dark:bg-[#131d1a]">
                          <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#587f6f]">
                            Customer & Vehicle
                          </p>
                          <p className="mt-1 text-[15px] font-bold text-slate-900 dark:text-slate-100">
                            {displayName}
                          </p>
                          {companyName && contactPerson ? (
                            <p className="text-[12px] text-slate-600 dark:text-slate-300">
                              {contactPerson}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">
                            {mobile}
                          </p>
                          <p className="mt-2 text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                            {vehicleLabel}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">Reg: {reg}</p>
                        </section>

                        <section className="rounded-xl border border-[#e6dcc8]/70 bg-[#faf8f1]/75 p-3 dark:border-[#453a2b] dark:bg-[#1a1712]">
                          <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#8d7559]">
                            Policy Details
                          </p>
                          <p className="mt-1 text-[14px] font-bold text-slate-900 dark:text-slate-100">
                            {insurer}
                          </p>
                          <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">
                            Policy No:{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {policyNo}
                            </span>
                          </p>
                          <div className="mt-2 space-y-0.5 text-[12px]">
                            <p className="text-slate-600 dark:text-slate-300">
                              Premium: <span className="font-bold text-[#5f9770]">{quotePremium}</span>
                            </p>
                            <p className="text-slate-600 dark:text-slate-300">
                              IDV / NCB:{" "}
                              <span className="font-bold text-[#6b7b8f]">{idvInline}</span>
                              <span className="mx-1.5 text-slate-400">·</span>
                              <span className="font-bold text-[#b39672]">{ncbInline}</span>
                            </p>
                            <p className="truncate text-slate-600 dark:text-slate-300" title={hypothecation}>
                              Hypothecation: <span className="font-semibold">{hypothecation}</span>
                            </p>
                            <p className="truncate text-slate-600 dark:text-slate-300" title={policyIssuedBy}>
                              Policy Issued By: <span className="font-semibold">{policyIssuedBy}</span>
                            </p>
                          </div>
                        </section>

                        <section className="rounded-xl border border-[#d5e3ef]/70 bg-[#f4f8fc]/55 p-3 dark:border-[#2e3f4c] dark:bg-[#111a20]">
                        <div className="rounded-xl border border-[#d6e6df]/80 bg-gradient-to-br from-[#eef3ef]/55 via-white to-[#faf8f1]/60 p-2.5 dark:border-[#30413b] dark:from-[#111a17] dark:via-[#101917] dark:to-[#1b1913]">
                          <div className="grid grid-cols-4 gap-1.5">
                            <div className="rounded-md border border-[#d6e6df]/80 bg-white/90 px-2 py-1 dark:border-[#30413b] dark:bg-[#101917]">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                Total Premium
                              </p>
                              <p className="mt-0.5 text-[11px] font-black text-slate-900 dark:text-slate-100">
                                {formatInr(premium)}
                              </p>
                            </div>
                            <div className="rounded-md border border-[#d6e6df]/80 bg-white/90 px-2 py-1 dark:border-[#30413b] dark:bg-[#101917]">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                Insurer Outstanding
                              </p>
                              <p
                                className={`mt-0.5 text-[11px] font-black ${
                                  snapshotInsurerDue > 0
                                    ? "text-[#b97f88]"
                                    : "text-[#5f9770]"
                                }`}
                              >
                                {formatInr(snapshotInsurerDue)}
                              </p>
                            </div>
                            <div className="rounded-md border border-[#d6e6df]/80 bg-white/90 px-2 py-1 dark:border-[#30413b] dark:bg-[#101917]">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                Customer Outstanding
                              </p>
                              <p
                                className={`mt-0.5 text-[11px] font-black ${
                                  snapshotRecoveryDue > 0
                                    ? "text-[#9f8465]"
                                    : "text-[#5f9770]"
                                }`}
                              >
                                {formatInr(snapshotRecoveryDue)}
                              </p>
                            </div>
                            <div className="rounded-md border border-[#d6e6df]/80 bg-white/90 px-2 py-1 dark:border-[#30413b] dark:bg-[#101917]">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                Subvention (Refund)
                              </p>
                              <p className="mt-0.5 text-[11px] font-black text-[#8ea0b6]">
                                {formatInr(snapshotSubventionRefund)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2 rounded-lg border border-[#d6e6df]/80 bg-white/90 p-2 dark:border-[#30413b] dark:bg-[#101917]">
                            <div className="grid grid-cols-[62px_minmax(0,1fr)_112px] gap-x-2 border-b border-[#e5eee4] px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-[#30413b]">
                              <span>Date</span>
                              <span>Ledger Entry</span>
                              <span className="text-right">Amount</span>
                            </div>
                            {paymentLedgerRows.length ? (
                              <div className="relative mt-1.5">
                                {leadLedgerEntry ? (
                                  <div
                                    key={leadLedgerEntry.key}
                                    className="grid grid-cols-[62px_minmax(0,1fr)_112px] items-start gap-x-2 border-b border-[#edf3ef] px-2 py-2 text-[12px] dark:border-[#24312c]"
                                  >
                                    <span className="text-slate-600 dark:text-slate-300">
                                      {leadLedgerEntry.date}
                                    </span>
                                    <div className="min-w-0">
                                      <p
                                        className="break-words text-[13px] font-semibold leading-tight text-slate-800 dark:text-slate-100"
                                        title={leadLedgerEntry.title}
                                      >
                                        <span className="mr-1.5 text-[#5f9770]">●</span>
                                        {leadLedgerEntry.title}
                                      </p>
                                      <p className="break-words text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                                        {leadLedgerEntry.subtitle}
                                      </p>
                                    </div>
                                    <span className={`text-right text-[13px] font-black ${leadLedgerEntry.amountClass}`}>
                                      {leadLedgerEntry.amountArrow} {leadLedgerEntry.amount}
                                    </span>
                                  </div>
                                ) : null}

                                {overflowLedgerEntries.length > 0 ? (
                                  <div className="mt-1 px-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedLedgerCaseId((prev) =>
                                          prev === id ? null : id,
                                        )
                                      }
                                      className="rounded-full border border-[#d6e6df] bg-[#eef3ef]/60 px-2.5 py-0.5 text-[10px] font-semibold text-[#5f9770] hover:bg-[#e5eee4] dark:border-[#30413b] dark:bg-[#13221c] dark:text-[#9dc4ae]"
                                    >
                                      {isLedgerExpanded
                                        ? "Hide entries"
                                        : `Show ${overflowLedgerEntries.length} more`}
                                    </button>
                                  </div>
                                ) : null}

                                {isLedgerExpanded && overflowLedgerEntries.length > 0 ? (
                                  <div className="mt-1 rounded-lg border border-[#d6e6df]/90 bg-white p-2 shadow-xl dark:border-[#30413b] dark:bg-[#101917] lg:absolute lg:left-0 lg:right-0 lg:z-30">
                                    <div className="space-y-0">
                                      {overflowLedgerEntries.map((entry) => (
                                        <div
                                          key={entry.key}
                                          className="grid grid-cols-[62px_minmax(0,1fr)_112px] items-start gap-x-2 border-b border-[#edf3ef] px-2 py-2 text-[12px] last:border-b-0 dark:border-[#24312c]"
                                        >
                                          <span className="text-slate-600 dark:text-slate-300">
                                            {entry.date}
                                          </span>
                                          <div className="min-w-0">
                                            <p
                                              className="break-words text-[13px] font-semibold leading-tight text-slate-800 dark:text-slate-100"
                                              title={entry.title}
                                            >
                                              <span className="mr-1.5 text-[#5f9770]">●</span>
                                              {entry.title}
                                            </p>
                                            <p className="break-words text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                                              {entry.subtitle}
                                            </p>
                                          </div>
                                          <span className={`text-right text-[13px] font-black ${entry.amountClass}`}>
                                            {entry.amountArrow} {entry.amount}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="flex h-[78px] items-center justify-center rounded-md border border-dashed border-[#d6e6df] text-[11px] text-slate-500 dark:border-[#30413b]">
                                No payment ledger entries
                              </div>
                            )}
                          </div>
                        </div>
                        </section>

                        <section className="rounded-xl border border-[#e8d8dd]/70 bg-[#fbf1f3]/45 p-3 dark:border-[#47333a] dark:bg-[#1c1518]">
                          <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#8f5f6b]">
                            Workflow
                          </p>
                          <p className="mt-1 text-[12px] text-slate-700 dark:text-slate-300">
                            Step: <span className="font-semibold">{stepLabel}</span>
                          </p>
                          <p className="text-[12px] text-slate-700 dark:text-slate-300">
                            Created: <span className="font-semibold">{createdLabel}</span>
                          </p>
                          <p className="text-[12px] text-slate-700 dark:text-slate-300">
                            Expiry: <span className="font-semibold">{expiryLabel}</span>
                          </p>
                          <p className="text-[12px] text-slate-700 dark:text-slate-300">
                            Documents: <span className="font-semibold">{docCount}</span>
                          </p>
                          {shouldShowOpenDues ? (
                            <p className={`mt-2 text-[12px] font-bold ${dueTone}`}>
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
                        </section>
                      </div>

                      <div className="flex flex-col gap-2 border-t border-[#e5eee4] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-[#2b3934]">
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {record.caseId || id} · {displayName}
                        </p>
                        <Space size={6} wrap>
                          <Tooltip title="View">
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#b6cfc4] bg-[#eef3ef] text-[#5f9770] hover:bg-[#e0ebe5]"
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
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#eadfcc] bg-[#faf8f1] text-[#9f8465] hover:bg-[#f3eddc] dark:border-[#5a4c39] dark:bg-[#2a241c] dark:text-[#dfc8a7]"
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
                                  ? "border-[#cfdbe8] bg-[#f3f7fb] text-[#60788f] hover:bg-[#e6eef7] dark:border-[#2e3f4c] dark:bg-[#121c24] dark:text-[#a6bdd1]"
                                  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-[#2f3a36] dark:bg-[#1a211f] dark:text-slate-500"
                              }`}
                            >
                              <TrendingUp size={14} />
                            </button>
                          </Tooltip>

                          <Tooltip title={isDraftPolicy(record) ? "Continue" : "Edit"}>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300"
                              onClick={() => navigate(`/insurance/edit/${id}`)}
                            >
                              <PencilLine size={14} />
                            </button>
                          </Tooltip>

                          <Tooltip title="Renew">
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                              onClick={() => handleRenewCase(record)}
                            >
                              <RefreshCw size={14} />
                            </button>
                          </Tooltip>

                          <Tooltip title="Extend">
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
                              onClick={() => handleExtendCase(record)}
                            >
                              <Zap size={14} />
                            </button>
                          </Tooltip>

                          <Popconfirm
                            title="Delete case"
                            description={`Delete "${record.caseId || id}"? This cannot be undone.`}
                            onConfirm={() => handleDeleteCase(id, record.caseId || id)}
                            okText="Delete"
                            okType="danger"
                            cancelText="Cancel"
                          >
                            <Tooltip title="Delete">
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
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
            <div className="flex-shrink-0 border-t border-[#d6e6df]/70 bg-white px-4 py-3 dark:border-[#2a3531] dark:bg-slate-950">
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
              {trendModal.vehicleLabel || "Vehicle"} · {trendModal.regLabel || "Reg not set"}
            </p>
          </div>
        }
      >
        {trendModalSeries ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-[#d6e6df]/80 bg-[#faf8f1]/60 p-3">
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
                  className="text-[#d6e6df]"
                  strokeWidth="1"
                />
                <line
                  x1="16"
                  y1={trendModalSeries.axisY}
                  x2="684"
                  y2={trendModalSeries.axisY}
                  stroke="currentColor"
                  className="text-[#d6e6df]"
                  strokeWidth="1"
                />
                <path
                  d={trendModalSeries.premiumPath}
                  fill="none"
                  stroke="#5f9770"
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
                      className="text-[#edf3ef]"
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
                    <circle cx={p.x} cy={p.premiumY} r="4.8" fill="#5f9770">
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
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5f9770]" />
                  Premium (Y-axis)
                </span>
                <span className="text-slate-500">Year on X-axis · Hover dots for Premium + IDV</span>
              </div>
            </div>
            <div className="rounded-xl border border-[#d6e6df]/80 bg-white px-3 py-2 text-xs text-slate-600">
              {trendModalHistory.length} policies found for this registration number.
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#d6e6df] bg-white px-4 py-10 text-center text-sm text-slate-500">
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
