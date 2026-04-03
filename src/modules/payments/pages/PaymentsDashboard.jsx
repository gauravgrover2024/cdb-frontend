import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  AutoComplete,
  Tag,
  Space,
  Button,
  Input,
  Modal,
  DatePicker,
  Select,
  Empty,
  Pagination,
  Tooltip,
  message,
} from "antd";
import {
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DownloadOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
  SearchOutlined,
  LinkOutlined,
  FileTextOutlined,
  BankOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { loansApi } from "../../../api/loans";
import { deliveryOrdersApi } from "../../../api/deliveryOrders";
import { paymentsApi } from "../../../api/payments";
import { useBankDirectoryOptions } from "../../../hooks/useBankDirectoryOptions";
import { useTheme } from "../../../context/ThemeContext";
import BreakdownSummaryCard from "../../delivery-orders/components/shared/BreakdownSummaryCard";
import DirectCreateModal from "../../shared/DirectCreateModal";

const { Option } = Select;
const PAYMENT_TYPE_OPTIONS = [
  "Margin Money",
  "Loan",
  "Exchange Vehicle",
  "Insurance",
  "Commission",
];
const PAYMENT_BY_OPTIONS = ["Customer", "Autocredits", "Bank", "Showroom"];
const MODE_OPTIONS = [
  "Online Transfer/UPI",
  "Cash",
  "Cheque",
  "DD",
  "Credit Card",
  "Adjustment",
];
const RECEIPT_TYPE_OPTIONS = [
  "Margin Money",
  "Insurance",
  "Exchange Vehicle",
  "Commission",
];

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹ ${asInt(n).toLocaleString("en-IN")}`;

const normalizeLoanId = (value = "") => String(value || "").trim();

const listFromResponse = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const hasDisplayValue = (value) =>
  value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value));

const chunkArray = (arr = [], size = 250) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const dedupeDOByLoanId = (rows = []) => {
  const byLoanId = new Map();
  (rows || []).forEach((row) => {
    const key = normalizeLoanId(row?.loanId || row?.do_loanId);
    if (!key) return;
    if (!byLoanId.has(key)) {
      byLoanId.set(key, row);
      return;
    }
    const prev = byLoanId.get(key);
    const prevTs =
      new Date(prev?.updatedAt || prev?.createdAt || 0).getTime() || 0;
    const nextTs = new Date(row?.updatedAt || row?.createdAt || 0).getTime() || 0;
    if (nextTs >= prevTs) byLoanId.set(key, row);
  });
  return Array.from(byLoanId.values());
};

const fetchAllByPagination = async (fetchPage, pageSize = 1000) => {
  let skip = 0;
  let hasMore = true;
  const all = [];

  while (hasMore) {
    const res = await fetchPage({ limit: pageSize, skip, noCount: true });
    const page = listFromResponse(res);
    all.push(...page);
    hasMore = Boolean(res?.hasMore);
    skip += pageSize;
  }

  return all;
};

const fetchLoansByIds = async (loanIds = []) => {
  const ids = Array.from(
    new Set((loanIds || []).map((id) => normalizeLoanId(id)).filter(Boolean)),
  );
  if (!ids.length) return [];

  const chunks = chunkArray(ids, 250);
  const payloads = await Promise.all(
    chunks.map((chunk) =>
      loansApi.getAll({
        loanIds: chunk.join(","),
        limit: 1000,
        noCount: true,
        view: "dashboard",
        sortBy: "leadDate",
        sortDir: "desc",
      }),
    ),
  );
  return payloads.flatMap((payload) => listFromResponse(payload));
};

const fetchPaymentsByLoanIds = async (loanIds = []) => {
  const ids = Array.from(
    new Set((loanIds || []).map((id) => normalizeLoanId(id)).filter(Boolean)),
  );
  if (!ids.length) return [];

  const chunks = chunkArray(ids, 250);
  const payloads = await Promise.all(
    chunks.map((chunk) =>
      paymentsApi.getAll({
        loanIds: chunk.join(","),
        limit: 1000,
        noCount: true,
      }),
    ),
  );

  return payloads.flatMap((payload) => listFromResponse(payload));
};

const StatCard = ({ id, label, value, subtext, icon, onClick }) => {
  const gradients = {
    total: "from-sky-500 to-indigo-600",
    nopayment: "from-slate-600 to-slate-800",
    outstanding: "from-amber-500 to-orange-600",
    acpending: "from-fuchsia-500 to-violet-600",
    settled: "from-emerald-500 to-green-600",
  };
  const gradient = gradients[id] || "from-slate-600 to-slate-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br ${gradient} p-4 shadow-lg shadow-slate-900/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none`}
    >
      <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/70">
            {label}
          </p>
          <p className="mt-1 text-2xl md:text-3xl font-black text-white tabular-nums leading-none">
            {value}
          </p>
          {subtext ? <p className="mt-1 text-xs text-white/80">{subtext}</p> : null}
        </div>
        <div className="mt-1 h-10 w-10 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shrink-0">
          <span className="text-lg">{icon}</span>
        </div>
      </div>
    </button>
  );
};

const SectionPanel = ({ title, chip, children, tone = "slate", onOpen }) => {
  const tones = {
    slate:
      "border-slate-200/80 bg-slate-50/80 dark:border-[#303030] dark:bg-[#202020]",
    blue: "border-sky-200/70 bg-sky-50/70 dark:border-sky-900/40 dark:bg-sky-950/20",
    green:
      "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20",
    purple:
      "border-violet-200/70 bg-violet-50/70 dark:border-violet-900/40 dark:bg-violet-950/20",
    amber:
      "border-amber-200/70 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20",
  };
  const Wrapper = onOpen ? "button" : "div";

  return (
    <Wrapper
      type={onOpen ? "button" : undefined}
      onClick={onOpen || undefined}
      className={`relative overflow-hidden rounded-2xl border p-3 text-left transition ${
        onOpen
          ? "cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          : ""
      } ${tones[tone] || tones.slate}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-600 dark:text-slate-300">
          {title}
        </p>
        <div className="flex items-center gap-1">{chip}</div>
      </div>
      <div className="space-y-1.5">{children}</div>
    </Wrapper>
  );
};

const KeyValue = ({ label, value, strong = false, subtle = false }) => (
  <div className="flex items-start justify-between gap-3 text-[12px]">
    <span className="text-slate-500 dark:text-slate-400">{label}</span>
    <span
      className={`text-right ${
        strong
          ? "font-semibold text-slate-900 dark:text-slate-50"
          : subtle
            ? "text-slate-500 dark:text-slate-400"
            : "text-slate-700 dark:text-slate-200"
      }`}
    >
      {value}
    </span>
  </div>
);

const QuickFieldLabel = ({ children }) => (
  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-1">
    {children}
  </div>
);

const QuickFieldBox = ({ children }) => (
  <div className="rounded-xl border border-slate-200 dark:border-[#323232] bg-white dark:bg-[#1f1f1f] px-2.5 py-1.5">
    {children}
  </div>
);

const QuickPill = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
      active
        ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-300"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-[#323232] dark:bg-[#1f1f1f] dark:text-slate-300 dark:hover:border-[#3b3b3b]"
    }`}
  >
    {label}
  </button>
);

const groupShowroomRowsByType = (rows = []) => {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const label = safeText(row?.paymentType) || "Other";
    const amount = asInt(row?.paymentAmount);
    if (!map.has(label)) {
      map.set(label, {
        label,
        amount: 0,
        count: 0,
      });
    }
    const curr = map.get(label);
    curr.amount += amount;
    curr.count += 1;
  });
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
};

const groupReceiptRowsByType = (rows = []) => {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const labels = Array.isArray(row?.receiptTypes) && row.receiptTypes.length
      ? row.receiptTypes
      : ["Other"];
    const amount = asInt(row?.receiptAmount);
    labels.forEach((labelRaw) => {
      const label = safeText(labelRaw) || "Other";
      if (!map.has(label)) {
        map.set(label, {
          label,
          amount: 0,
          count: 0,
        });
      }
      const curr = map.get(label);
      curr.amount += amount;
      curr.count += 1;
    });
  });
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "—";
  return parsed.format("DD-MM-YYYY HH:mm");
};

const resolveShowroomEntrySignedAmount = (entry = {}) => {
  const rawAmount = asInt(entry?.paymentAmount);
  if (safeText(entry?.paymentType) !== "Cross Adjustment") return rawAmount;
  return safeText(entry?.adjustmentDirection) === "outgoing"
    ? -Math.abs(rawAmount)
    : Math.abs(rawAmount);
};

const buildShowroomLedgerRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((entry, index) => {
      const signedAmount = resolveShowroomEntrySignedAmount(entry);
      const paymentType = safeText(entry?.paymentType) || "Other";
      const paidBy = safeText(entry?.paymentMadeBy) || "—";
      const paymentMode = safeText(entry?.paymentMode) || "—";
      const paymentDate = dayjs(entry?.paymentDate);
      const dateLabel = paymentDate.isValid()
        ? paymentDate.format("DD-MM-YY")
        : "No date";

      let intent = signedAmount < 0 ? "discount" : "addition";
      if (paymentType === "Commission") intent = "warning";
      if (paymentType === "Loan") intent = "total";

      return {
        label: `${index + 1}. ${paymentType} · ${paidBy} · ${paymentMode} · ${dateLabel}`,
        value: signedAmount,
        intent,
      };
    })
    .sort((a, b) => Math.abs(asInt(b.value)) - Math.abs(asInt(a.value)));

const buildShowroomTraceRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((entry, index) => {
      const bank = safeText(entry?.bankName) || "Bank not set";
      const txn = safeText(entry?.transactionDetails) || "Txn not set";
      const remarks = safeText(entry?.remarks) || "—";
      return {
        label: `${index + 1}. ${bank} · ${txn}`,
        value: remarks,
        raw: true,
      };
    })
    .filter((item) => safeText(item?.label).trim() || safeText(item?.value).trim());

const buildAutocreditsLedgerRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((entry, index) => {
      const types = Array.isArray(entry?.receiptTypes) && entry.receiptTypes.length
        ? entry.receiptTypes.join(", ")
        : "Other";
      const receiptMode = safeText(entry?.receiptMode) || "—";
      const receiptDate = dayjs(entry?.receiptDate);
      const dateLabel = receiptDate.isValid()
        ? receiptDate.format("DD-MM-YY")
        : "No date";

      return {
        label: `${index + 1}. ${types} · ${receiptMode} · ${dateLabel}`,
        value: asInt(entry?.receiptAmount),
        intent: "addition",
      };
    })
    .sort((a, b) => Math.abs(asInt(b.value)) - Math.abs(asInt(a.value)));

const buildAutocreditsTraceRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((entry, index) => {
      const bank = safeText(entry?.bankName) || "Bank not set";
      const txn = safeText(entry?.transactionDetails) || "Txn not set";
      const remarks = safeText(entry?.remarks) || "—";
      return {
        label: `${index + 1}. ${bank} · ${txn}`,
        value: remarks,
        raw: true,
      };
    })
    .filter((item) => safeText(item?.label).trim() || safeText(item?.value).trim());

const buildShowroomSummarySections = (row = {}, { withLedger = true } = {}) => {
  const payment = row?.payment || {};
  const entryTotals = payment?.entryTotals || {};
  const grouped = groupShowroomRowsByType(payment?.showroomRows || []);
  const sections = [
    {
      title: "Showroom payment ladder",
      rows: [
        { label: "Net DO amount", value: row?.netDO || 0, intent: "addition" },
        {
          label: "Paid by bank (loan)",
          value: asInt(entryTotals?.paymentAmountLoan),
          intent: "total",
        },
        {
          label: "Paid by customer",
          value: asInt(entryTotals?.paymentAmountCustomer),
          intent: "addition",
        },
        {
          label: "Paid by Autocredits",
          value: asInt(entryTotals?.paymentAmountAutocredits),
          intent: "addition",
        },
        {
          label: "Exchange adjustment",
          value: asInt(entryTotals?.paymentAdjustmentExchangeApplied),
          intent: "discount",
        },
        {
          label: "Insurance adjustment",
          value: asInt(entryTotals?.paymentAdjustmentInsuranceApplied),
          intent: "discount",
        },
        {
          label: "Cross adjustment net",
          value: asInt(row?.crossAdjustmentNet),
          intent: asInt(row?.crossAdjustmentNet) >= 0 ? "addition" : "discount",
        },
        {
          label: "Current balance to showroom",
          value: asInt(row?.balanceToShowroom),
          intent: asInt(row?.balanceToShowroom) > 0 ? "warning" : "total",
          strong: true,
        },
      ],
    },
    {
      title: "Payment type breakup",
      rows: grouped.length
        ? grouped.map((item) => ({
            label: `${item.label} (${item.count})`,
            value: item.amount,
            intent: item.label === "Commission" ? "warning" : "addition",
          }))
        : [],
    },
    {
      title: "Verification",
      rows: [
        {
          label: "Showroom verification",
          value: row?.showroomSettled ? "Verified" : "Pending",
          raw: true,
          intent: row?.showroomSettled ? "total" : "warning",
          strong: true,
        },
        {
          label: "Last updated",
          value: formatDateTime(payment?.updatedAt),
          raw: true,
        },
      ],
    },
  ];

  if (!withLedger) return sections;

  return [
    ...sections,
    {
      title: "Payment ledger entries",
      rows: buildShowroomLedgerRows(payment?.showroomRows || []),
    },
    {
      title: "Bank / transaction trace",
      rows: buildShowroomTraceRows(payment?.showroomRows || []),
    },
  ];
};

const buildAutocreditsSummarySections = (row = {}, { withLedger = true } = {}) => {
  const payment = row?.payment || {};
  const receiptTotals = payment?.autocreditsTotals || {};
  const grouped = groupReceiptRowsByType(payment?.autocreditsRows || []);
  const receiptBreakup = receiptTotals?.receiptBreakup || {};

  const breakupRows = Object.entries(receiptBreakup)
    .filter(([, value]) => hasDisplayValue(value) && asInt(value) !== 0)
    .map(([label, value]) => ({
      label,
      value: asInt(value),
      intent: "addition",
    }));

  const sections = [
    {
      title: "Autocredits receipts",
      rows: [
        {
          label: "Receipt total",
          value: asInt(receiptTotals?.receiptAmountTotal),
          intent: "addition",
          strong: true,
        },
        {
          label: "Receipts captured",
          value: Array.isArray(payment?.autocreditsRows)
            ? payment.autocreditsRows.length
            : 0,
          raw: true,
        },
        {
          label: "Moved to showroom",
          value: asInt(payment?.entryTotals?.paymentAmountAutocredits),
          intent: "addition",
        },
        {
          label: "In transit at AC",
          value: asInt(row?.acInTransit),
          intent: asInt(row?.acInTransit) > 0 ? "warning" : "total",
          strong: asInt(row?.acInTransit) > 0,
        },
        {
          label: "Verification",
          value: row?.autocreditsSettled ? "Verified" : "Pending",
          raw: true,
          intent: row?.autocreditsSettled ? "total" : "warning",
          strong: true,
        },
      ],
    },
    {
      title: "Receipt breakup (saved totals)",
      rows: breakupRows,
    },
    {
      title: "Receipt type contribution",
      rows: grouped.length
        ? grouped.map((item) => ({
            label: `${item.label} (${item.count})`,
            value: item.amount,
            intent: "addition",
          }))
        : [],
    },
  ];

  if (!withLedger) return sections;

  return [
    ...sections,
    {
      title: "Receipt ledger entries",
      rows: buildAutocreditsLedgerRows(payment?.autocreditsRows || []),
    },
    {
      title: "Bank / transaction trace",
      rows: buildAutocreditsTraceRows(payment?.autocreditsRows || []),
    },
  ];
};

const buildPaymentDetailsSections = (row = {}) => {
  const payment = row?.payment || {};
  const doRec = row?.doRec || {};
  const showroomRowsCount = Array.isArray(payment?.showroomRows)
    ? payment.showroomRows.length
    : 0;
  const autocreditsRowsCount = Array.isArray(payment?.autocreditsRows)
    ? payment.autocreditsRows.length
    : 0;

  return [
    {
      title: "Case header",
      rows: [
        { label: "Loan ID", value: row?.loanId || "—", raw: true, strong: true },
        { label: "DO Ref", value: row?.doRef || "—", raw: true },
        {
          label: "DO Date",
          value: formatDateTime(doRec?.do_date || doRec?.doDate),
          raw: true,
        },
        { label: "Customer", value: row?.customerName || "—", raw: true },
        { label: "Mobile", value: row?.primaryMobile || "—", raw: true },
        { label: "Showroom", value: row?.dealerName || "—", raw: true },
        { label: "Vehicle", value: row?.vehicle || "—", raw: true },
      ],
    },
    {
      title: "Payment progress",
      rows: [
        {
          label: "Overall status",
          value:
            row?.overallStatus === "SETTLED"
              ? "Fully settled"
              : row?.overallStatus === "PARTIAL"
                ? "Partially settled"
                : row?.overallStatus === "IN_PROGRESS"
                  ? "In progress"
                  : "Draft",
          raw: true,
          strong: true,
        },
        {
          label: "Net DO",
          value: row?.netDO || 0,
          intent: "addition",
        },
        {
          label: "Paid to showroom",
          value: row?.paidShowroom || 0,
          intent: "addition",
        },
        {
          label: "Balance to showroom",
          value: row?.balanceToShowroom || 0,
          intent: row?.balanceToShowroom > 0 ? "warning" : "total",
          strong: true,
        },
        {
          label: "Showroom entries",
          value: showroomRowsCount,
          raw: true,
        },
        {
          label: "Autocredits entries",
          value: autocreditsRowsCount,
          raw: true,
        },
      ],
    },
    {
      title: "Record metadata",
      rows: [
        {
          label: "Payment created",
          value: formatDateTime(payment?.createdAt),
          raw: true,
        },
        {
          label: "Payment updated",
          value: formatDateTime(payment?.updatedAt),
          raw: true,
        },
        {
          label: "DO updated",
          value: formatDateTime(doRec?.updatedAt),
          raw: true,
        },
        {
          label: "Has payment file",
          value: row?.hasPayment ? "Yes" : "No",
          raw: true,
        },
      ],
    },
  ];
};

const PaymentsDashboard = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { options: bankDirectoryOptions } = useBankDirectoryOptions();

  const [loans, setLoans] = useState([]);
  const [savedPayments, setSavedPayments] = useState([]);
  const [savedDOs, setSavedDOs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [financeFilter, setFinanceFilter] = useState("All");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [summaryModal, setSummaryModal] = useState({
    open: false,
    type: "showroom",
    row: null,
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalMode, setPaymentModalMode] = useState(null); // "SHOWROOM" | "AC"
  const [activeLoanForModal, setActiveLoanForModal] = useState(null);

  const [modalPaymentType, setModalPaymentType] = useState("Margin Money");
  const [modalReceiptType, setModalReceiptType] = useState("Margin Money");
  const [modalPaymentMadeBy, setModalPaymentMadeBy] = useState("Customer");
  const [modalPaymentMode, setModalPaymentMode] = useState("Online Transfer/UPI");
  const [modalAmount, setModalAmount] = useState("");
  const [modalDate, setModalDate] = useState(dayjs());
  const [modalBank, setModalBank] = useState("");
  const [modalTxn, setModalTxn] = useState("");
  const [modalRemarks, setModalRemarks] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchQuery(String(searchInput || "").trim());
    }, 220);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const resetModalState = () => {
    setPaymentModalMode(null);
    setActiveLoanForModal(null);
    setModalPaymentType("Margin Money");
    setModalReceiptType("Margin Money");
    setModalPaymentMadeBy("Customer");
    setModalPaymentMode("Online Transfer/UPI");
    setModalAmount("");
    setModalDate(dayjs());
    setModalBank("");
    setModalTxn("");
    setModalRemarks("");
  };

  const openQuickAddModal = (loan, mode) => {
    setActiveLoanForModal(loan);
    setPaymentModalMode(mode);
    setShowPaymentModal(true);
  };

  const closeQuickAddModal = () => {
    setShowPaymentModal(false);
    resetModalState();
  };

  const openSummaryModal = useCallback((type, row) => {
    setSummaryModal({
      open: true,
      type,
      row,
    });
  }, []);

  const closeSummaryModal = useCallback(() => {
    setSummaryModal({
      open: false,
      type: "showroom",
      row: null,
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const docs = dedupeDOByLoanId(
        await fetchAllByPagination((params) =>
          deliveryOrdersApi.getAll({
            ...params,
            ...(searchQuery ? { search: searchQuery } : {}),
          }),
        ),
      );

      const loanIds = docs
        .map((row) => normalizeLoanId(row?.loanId || row?.do_loanId))
        .filter(Boolean);

      const [loanRows, paymentRows] = await Promise.all([
        fetchLoansByIds(loanIds),
        fetchPaymentsByLoanIds(loanIds),
      ]);

      setSavedDOs(docs);
      setLoans(Array.isArray(loanRows) ? loanRows : []);
      setSavedPayments(Array.isArray(paymentRows) ? paymentRows : []);
    } catch (err) {
      console.error("Failed to load payments dashboard data:", err);
      message.error("Failed to load payments dashboard");
      setSavedDOs([]);
      setLoans([]);
      setSavedPayments([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, financeFilter, searchQuery, pageSize]);

  const loanMap = useMemo(() => {
    const map = new Map();
    (loans || []).forEach((loan) => {
      const key = normalizeLoanId(loan?.loanId || loan?._id);
      if (!key) return;
      map.set(key, loan);
    });
    return map;
  }, [loans]);

  const paymentMap = useMemo(() => {
    const map = new Map();
    (savedPayments || []).forEach((p) => {
      const key = normalizeLoanId(p?.loanId);
      if (!key) return;
      map.set(key, p);
    });
    return map;
  }, [savedPayments]);

  const rows = useMemo(() => {
    return (savedDOs || []).map((doRec) => {
      const loanId = normalizeLoanId(doRec?.loanId || doRec?.do_loanId);
      const loan = loanMap.get(loanId) || {};
      const payment = paymentMap.get(loanId) || {};

      const customerName =
        safeText(doRec?.do_customerName) ||
        safeText(doRec?.customerName) ||
        safeText(loan?.customerName) ||
        "Unknown";
      const primaryMobile =
        safeText(doRec?.do_primaryMobile) ||
        safeText(doRec?.primaryMobile) ||
        safeText(loan?.primaryMobile) ||
        "";

      const vehicle = [
        safeText(doRec?.do_vehicleMake || doRec?.vehicleMake || loan?.vehicleMake),
        safeText(doRec?.do_vehicleModel || doRec?.vehicleModel || loan?.vehicleModel),
        safeText(
          doRec?.do_vehicleVariant || doRec?.vehicleVariant || loan?.vehicleVariant,
        ),
      ]
        .filter(Boolean)
        .join(" ");

      const dealerName =
        safeText(doRec?.do_dealerName) ||
        safeText(doRec?.dealerName) ||
        safeText(loan?.showroomDealerName) ||
        safeText(loan?.delivery_dealerName) ||
        "Showroom not set";

      const doRef = safeText(doRec?.do_refNo) || safeText(doRec?.doNumber) || "";

      const netDO = asInt(doRec?.do_netDOAmount);
      const entryTotals = payment?.entryTotals || {};

      const paidByBank = asInt(entryTotals?.paymentAmountLoan);
      const paidByCustomer = asInt(entryTotals?.paymentAmountCustomer);
      const paidByAutocredits = asInt(entryTotals?.paymentAmountAutocredits);
      const exchangeAdjustment = asInt(entryTotals?.paymentAdjustmentExchangeApplied);
      const insuranceAdjustment = asInt(entryTotals?.paymentAdjustmentInsuranceApplied);
      const commissionReceived = asInt(entryTotals?.paymentCommissionReceived);

      const crossAdjustmentNet = (Array.isArray(payment?.showroomRows) ? payment.showroomRows : [])
        .filter((entry) => safeText(entry?.paymentType) === "Cross Adjustment")
        .reduce((sum, entry) => sum + resolveShowroomEntrySignedAmount(entry), 0);

      const paidShowroom = paidByBank + paidByAutocredits + paidByCustomer;
      const balanceToShowroom = netDO - paidShowroom;
      const outstandingShowroom = Math.max(0, balanceToShowroom);
      const advanceWithShowroom = Math.max(0, -balanceToShowroom);
      const receivedAutocredits = asInt(payment?.autocreditsTotals?.receiptAmountTotal);
      const acInTransit = receivedAutocredits - paidByAutocredits;

      const showroomSettled = Boolean(payment?.isVerified) && outstandingShowroom === 0;
      const autocreditsSettled = Boolean(payment?.isAutocreditsVerified);

      let overallStatus = "DRAFT";
      if (showroomSettled && autocreditsSettled) overallStatus = "SETTLED";
      else if (showroomSettled || autocreditsSettled) overallStatus = "PARTIAL";
      else if (paidShowroom > 0 || receivedAutocredits > 0) overallStatus = "IN_PROGRESS";

      const isFinanced =
        safeText(loan?.isFinanced || doRec?.isFinanced).trim().toLowerCase() === "yes";

      return {
        key: loanId,
        loanId,
        doRef,
        customerName,
        primaryMobile,
        dealerName,
        vehicle,
        netDO,
        paidShowroom,
        paidByBank,
        paidByCustomer,
        paidByAutocredits,
        exchangeAdjustment,
        insuranceAdjustment,
        commissionReceived,
        crossAdjustmentNet,
        balanceToShowroom,
        outstandingShowroom,
        advanceWithShowroom,
        receivedAutocredits,
        acInTransit,
        showroomSettled,
        autocreditsSettled,
        overallStatus,
        hasPayment: Boolean(payment?._id || payment?.loanId),
        payment,
        doRec,
        isFinanced,
      };
    });
  }, [savedDOs, loanMap, paymentMap]);

  const stats = useMemo(() => {
    const totalCases = rows.length;
    const noPayment = rows.filter((row) => !row.hasPayment).length;
    const outstandingCases = rows.filter((row) => row.outstandingShowroom > 0).length;
    const acPending = rows.filter((row) => !row.autocreditsSettled).length;
    const settled = rows.filter(
      (row) => row.showroomSettled && row.autocreditsSettled,
    ).length;
    const outstandingAmount = rows.reduce(
      (sum, row) => sum + asInt(row.outstandingShowroom),
      0,
    );

    return {
      totalCases,
      noPayment,
      outstandingCases,
      acPending,
      settled,
      outstandingAmount,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter === "NoPayment" && row.hasPayment) return false;
      if (statusFilter === "Draft" && row.overallStatus !== "DRAFT") return false;
      if (statusFilter === "InProgress" && row.overallStatus !== "IN_PROGRESS") return false;
      if (statusFilter === "Partial" && row.overallStatus !== "PARTIAL") return false;
      if (statusFilter === "Settled" && row.overallStatus !== "SETTLED") return false;
      if (statusFilter === "Outstanding" && row.outstandingShowroom <= 0) return false;

      if (financeFilter === "Financed" && !row.isFinanced) return false;
      if (financeFilter === "Cash" && row.isFinanced) return false;

      return true;
    });
  }, [rows, statusFilter, financeFilter]);

  const totalCount = filteredRows.length;
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const handleQuickAddSubmit = async () => {
    if (!activeLoanForModal || !paymentModalMode) return;

    const loanId = activeLoanForModal.loanId;
    const latest = await paymentsApi.getByLoanId(loanId);
    const existingSafe = latest?.data || { loanId };

    try {
      const currentShowroomRows = Array.isArray(existingSafe?.showroomRows)
        ? existingSafe.showroomRows
        : [];
      const currentAutocreditsRows = Array.isArray(existingSafe?.autocreditsRows)
        ? existingSafe.autocreditsRows
        : [];

      const isoDate = modalDate ? modalDate.toISOString() : null;

      const payload = {
        ...existingSafe,
        loanId,
      };

      if (paymentModalMode === "SHOWROOM") {
        const newRow = {
          id: `dash-showroom-${Date.now()}`,
          paymentType: modalPaymentType,
          paymentMadeBy: modalPaymentMadeBy,
          paymentMode: modalPaymentMode,
          paymentAmount: modalAmount,
          paymentDate: isoDate,
          transactionDetails: modalTxn,
          bankName: modalBank,
          remarks: modalRemarks || "Dashboard added payment",
          _auto: false,
        };

        payload.showroomRows = [...currentShowroomRows, newRow];
      } else if (paymentModalMode === "AC") {
        const newRow = {
          id: `dash-ac-${Date.now()}`,
          receiptTypes: [modalReceiptType || "Margin Money"],
          receiptMode: modalPaymentMode,
          receiptAmount: modalAmount,
          receiptDate: isoDate,
          transactionDetails: modalTxn,
          bankName: modalBank,
          remarks: modalRemarks || "Dashboard added receipt",
        };

        payload.autocreditsRows = [...currentAutocreditsRows, newRow];
      }

      await paymentsApi.update(loanId, payload);
      message.success("Payment updated");
      await loadData();
      closeQuickAddModal();
    } catch (err) {
      console.error("Quick add payment error:", err);
      message.error("Unable to save payment update");
    }
  };

  const summaryModalConfig = useMemo(() => {
    const row = summaryModal?.row;
    const type = summaryModal?.type;

    if (!row) {
      return {
        eyebrow: "Payment Summary",
        title: "Payment Summary",
        subtitle: "",
        chipLabel: "",
        chipTone: "slate",
        sections: [],
      };
    }

    if (type === "showroom") {
      return {
        eyebrow: "Showroom settlement breakdown",
        title: row.dealerName || "Showroom account",
        subtitle: `${row.customerName || "Customer"} · ${row.loanId || "Loan ID"}`,
        chipLabel: row.showroomSettled ? "Showroom verified" : "Showroom pending",
        chipTone: row.showroomSettled ? "green" : "amber",
        sections: buildShowroomSummarySections(row, { withLedger: true }),
      };
    }

    if (type === "ac") {
      return {
        eyebrow: "Autocredits receipts breakdown",
        title: row.customerName || "Autocredits account",
        subtitle: `${row.dealerName || "Showroom"} · ${row.loanId || "Loan ID"}`,
        chipLabel: row.autocreditsSettled ? "AC verified" : "AC pending",
        chipTone: row.autocreditsSettled ? "purple" : "amber",
        sections: buildAutocreditsSummarySections(row, { withLedger: true }),
      };
    }

    return {
      eyebrow: "Payment control summary",
      title: row.loanId || "Payment details",
      subtitle: row.vehicle || "Payment case details",
      chipLabel: row.overallStatus || "Draft",
      chipTone: row.overallStatus === "SETTLED" ? "green" : "blue",
      sections: [
        ...buildPaymentDetailsSections(row),
        ...buildShowroomSummarySections(row, { withLedger: true }),
        ...buildAutocreditsSummarySections(row, { withLedger: true }),
      ],
    };
  }, [summaryModal]);

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen">
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Payments Command Center
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Showroom settlements, Autocredits receipts and payment status in one place.
            </p>
          </div>
          <Space>
            <Button icon={<DownloadOutlined />}>Export</Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadData}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
              New Payment
            </Button>
          </Space>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
          <StatCard
            id="total"
            label="Total Cases"
            value={stats.totalCases}
            subtext="DO-linked payment universe"
            icon={<FileTextOutlined />}
            onClick={() => setStatusFilter("All")}
          />
          <StatCard
            id="nopayment"
            label="No Payment File"
            value={stats.noPayment}
            subtext="Needs payment creation"
            icon={<WarningOutlined />}
            onClick={() => setStatusFilter("NoPayment")}
          />
          <StatCard
            id="outstanding"
            label="Outstanding"
            value={money(stats.outstandingAmount)}
            subtext={`${stats.outstandingCases} cases`}
            icon={<HourglassOutlined />}
            onClick={() => setStatusFilter("Outstanding")}
          />
          <StatCard
            id="acpending"
            label="AC Pending"
            value={stats.acPending}
            subtext="Autocredits verification pending"
            icon={<BankOutlined />}
            onClick={() => setStatusFilter("InProgress")}
          />
          <StatCard
            id="settled"
            label="Fully Settled"
            value={stats.settled}
            subtext="Showroom + AC verified"
            icon={<CheckCircleOutlined />}
            onClick={() => setStatusFilter("Settled")}
          />
        </div>

        <div className="bg-white dark:bg-[#1f1f1f] border border-slate-100 dark:border-[#262626] rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="xl:col-span-2">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-sky-300 focus-within:bg-white">
                <SearchOutlined className="text-slate-400" />
                <Input
                  bordered={false}
                  placeholder="Search Loan ID, DO Ref, customer, mobile, showroom or vehicle..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  allowClear
                  className="bg-transparent"
                />
              </div>
            </div>

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              size="large"
              className="w-full"
            >
              <Option value="All">All Payment Status</Option>
              <Option value="NoPayment">No Payment File</Option>
              <Option value="Draft">Draft</Option>
              <Option value="InProgress">In Progress</Option>
              <Option value="Partial">Partial</Option>
              <Option value="Outstanding">Outstanding</Option>
              <Option value="Settled">Settled</Option>
            </Select>

            <Select
              value={financeFilter}
              onChange={setFinanceFilter}
              size="large"
              className="w-full"
            >
              <Option value="All">All Types</Option>
              <Option value="Financed">Financed</Option>
              <Option value="Cash">Cash</Option>
            </Select>
          </div>

          {(statusFilter !== "All" || financeFilter !== "All" || searchInput) && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#262626]">
              <Button
                onClick={() => {
                  setStatusFilter("All");
                  setFinanceFilter("All");
                  setSearchInput("");
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {pagedRows.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 dark:border-[#2a2a2a] dark:bg-[#1b1b1b]">
            <Empty description={loading ? "Loading payment entries..." : "No payment entries found"} />
          </div>
        )}

        {pagedRows.map((row) => {
          const statusTone =
            row.overallStatus === "SETTLED"
              ? "success"
              : row.overallStatus === "PARTIAL"
                ? "gold"
                : row.overallStatus === "IN_PROGRESS"
                  ? "processing"
                  : "default";

          return (
            <div
              key={row.loanId}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-[#2a2a2a] dark:bg-[#1b1b1b]"
            >
              <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-2">
                <Tag color={row.hasPayment ? "success" : "default"}>
                  {row.hasPayment ? "Payment Created" : "Payment Pending"}
                </Tag>
                <Tag color={row.isFinanced ? "blue" : "green"}>
                  {row.isFinanced ? "Financed" : "Cash"}
                </Tag>
                <Tag color={statusTone}>
                  {row.overallStatus === "SETTLED"
                    ? "Settled"
                    : row.overallStatus === "PARTIAL"
                      ? "Partial"
                      : row.overallStatus === "IN_PROGRESS"
                        ? "In Progress"
                        : "Draft"}
                </Tag>
                {row.doRef ? <Tag>{row.doRef}</Tag> : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 px-4 pb-4">
                <SectionPanel title="Loan Details" tone="slate">
                  <KeyValue label="Customer" value={row.customerName || "—"} strong />
                  <KeyValue label="Mobile" value={row.primaryMobile || "—"} />
                  <KeyValue label="Loan ID" value={row.loanId || "—"} />
                  <KeyValue label="Type" value={row.isFinanced ? "Financed" : "Cash"} />
                </SectionPanel>

                <SectionPanel title="Vehicle & Showroom" tone="blue">
                  <KeyValue label="Vehicle" value={row.vehicle || "—"} strong />
                  <KeyValue label="Showroom" value={row.dealerName || "—"} />
                  <KeyValue label="DO Ref" value={row.doRef || "—"} />
                </SectionPanel>

                <SectionPanel
                  title="Showroom Account"
                  tone="green"
                  onOpen={() => openSummaryModal("showroom", row)}
                >
                  <KeyValue label="Net DO" value={money(row.netDO)} strong />
                  <KeyValue label="Paid by bank" value={money(row.paidByBank)} />
                  <KeyValue label="Paid by customer" value={money(row.paidByCustomer)} />
                  <KeyValue label="Paid by AC" value={money(row.paidByAutocredits)} />
                  <KeyValue label="Balance" value={money(row.balanceToShowroom)} />
                  <KeyValue
                    label="Verification"
                    value={row.showroomSettled ? "Verified" : "Pending"}
                    strong
                  />
                </SectionPanel>

                <SectionPanel
                  title="Autocredits Account"
                  tone="purple"
                  onOpen={() => openSummaryModal("ac", row)}
                >
                  <KeyValue
                    label="Receipts total"
                    value={money(row.receivedAutocredits)}
                    strong
                  />
                  <KeyValue label="Moved to showroom" value={money(row.paidByAutocredits)} />
                  <KeyValue label="In transit" value={money(row.acInTransit)} />
                  <KeyValue
                    label="Rows"
                    value={Array.isArray(row?.payment?.autocreditsRows)
                      ? row.payment.autocreditsRows.length
                      : 0}
                  />
                  <KeyValue
                    label="Verification"
                    value={row.autocreditsSettled ? "Verified" : "Pending"}
                    strong
                  />
                </SectionPanel>

                <SectionPanel
                  title="Payment Details"
                  tone="amber"
                  onOpen={() => openSummaryModal("details", row)}
                >
                  <KeyValue
                    label="Payment file"
                    value={row.hasPayment ? "Available" : "Not created"}
                    strong
                  />
                  <KeyValue
                    label="Status"
                    value={
                      row.overallStatus === "SETTLED"
                        ? "Settled"
                        : row.overallStatus === "PARTIAL"
                          ? "Partial"
                          : row.overallStatus === "IN_PROGRESS"
                            ? "In Progress"
                            : "Draft"
                    }
                  />
                  <KeyValue
                    label="DO Date"
                    value={formatDateTime(row?.doRec?.do_date || row?.doRec?.doDate)}
                    subtle
                  />
                  <KeyValue
                    label="Updated"
                    value={
                      row?.payment?.updatedAt
                        ? dayjs(row.payment.updatedAt).format("DD MMM, HH:mm")
                        : "—"
                    }
                    subtle
                  />
                </SectionPanel>
              </div>

              <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3 flex flex-wrap items-center justify-between gap-3 dark:border-[#2a2a2a] dark:bg-[#202020]">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {row.customerName || "Customer"} · {row.loanId || "Loan"}
                </div>
                <Space wrap>
                  <Tooltip title="Quick full summary">
                    <Button
                      icon={<EyeOutlined />}
                      onClick={() => openSummaryModal("details", row)}
                    >
                      Quick View
                    </Button>
                  </Tooltip>

                  <Tooltip title="Open loan file">
                    <Button
                      icon={<LinkOutlined />}
                      onClick={() => navigate(`/loans/edit/${row.loanId}`)}
                    >
                      Open Loan
                    </Button>
                  </Tooltip>
                  <Tooltip title="Open delivery order">
                    <Button
                      icon={<LinkOutlined />}
                      onClick={() => navigate(`/delivery-orders/${row.loanId}`)}
                    >
                      Open DO
                    </Button>
                  </Tooltip>

                  {row.hasPayment ? (
                    <>
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/payments/${row.loanId}`)}
                      >
                        Open Payment
                      </Button>
                      <Button
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/payments/${row.loanId}?view=1`)}
                      >
                        Open View Page
                      </Button>
                      <Button
                        icon={<DollarOutlined />}
                        onClick={() => openQuickAddModal(row, "SHOWROOM")}
                      >
                        Add Payment
                      </Button>
                      <Button
                        icon={<CheckCircleOutlined />}
                        onClick={() => openQuickAddModal(row, "AC")}
                      >
                        Add Receipt
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => navigate(`/payments/${row.loanId}`)}
                    >
                      Create Payment
                    </Button>
                  )}
                </Space>
              </div>
            </div>
          );
        })}
      </div>

      {totalCount > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 flex justify-end dark:border-[#2a2a2a] dark:bg-[#1b1b1b]">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={totalCount}
            showSizeChanger
            pageSizeOptions={["10", "15", "25", "50"]}
            showTotal={(total) => `Total ${total} payment entries`}
            onChange={(nextPage, nextSize) => {
              setPage(nextPage);
              if (nextSize !== pageSize) setPageSize(nextSize);
            }}
          />
        </div>
      )}

      <Modal
        open={summaryModal.open}
        onCancel={closeSummaryModal}
        footer={null}
        width={760}
        destroyOnHidden
        centered
        title={null}
      >
        <BreakdownSummaryCard
          isDarkMode={isDarkMode}
          eyebrow={summaryModalConfig.eyebrow || "Payment Summary"}
          title={summaryModalConfig.title}
          subtitle={summaryModalConfig.subtitle}
          chipLabel={summaryModalConfig.chipLabel}
          chipTone={summaryModalConfig.chipTone}
          sections={summaryModalConfig.sections}
          compact
          sticky={false}
        />
      </Modal>

      <Modal
        open={showPaymentModal}
        title={
          paymentModalMode === "SHOWROOM"
            ? "Add payment to showroom"
            : "Add receipt at Autocredits"
        }
        onCancel={closeQuickAddModal}
        footer={[
          <Button key="cancel" onClick={closeQuickAddModal}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={handleQuickAddSubmit}>
            Save Entry
          </Button>,
        ]}
        centered
        destroyOnHidden
        width={860}
      >
        <div className="rounded-2xl border border-slate-200 dark:border-[#2f2f2f] bg-slate-50/80 dark:bg-[#191919] p-3 md:p-4 space-y-4">
          <div className="rounded-xl border border-sky-200/80 dark:border-sky-800/40 bg-sky-50/80 dark:bg-sky-950/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-sky-700 dark:text-sky-300">
              Active Case
            </div>
            <div className="mt-1 text-xs text-slate-700 dark:text-slate-200">
              {activeLoanForModal && (
                <>
                  Loan{" "}
                  <span className="font-semibold">{activeLoanForModal.loanId}</span> ·{" "}
                  {activeLoanForModal.customerName || "Customer"} ·{" "}
                  {activeLoanForModal.doRef || "DO not mapped"}
                </>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            {activeLoanForModal && (
              <>
                Add this entry directly to the payment ledger. You can edit everything later in the full Payment form.
              </>
            )}
          </div>

          {paymentModalMode === "SHOWROOM" && (
            <>
              <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 space-y-3">
                <QuickFieldLabel>Payment Type</QuickFieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_TYPE_OPTIONS.map((option) => (
                    <QuickPill
                      key={option}
                      label={option}
                      active={modalPaymentType === option}
                      onClick={() => setModalPaymentType(option)}
                    />
                  ))}
                </div>

                <QuickFieldLabel>Payment Made By</QuickFieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_BY_OPTIONS.map((option) => (
                    <QuickPill
                      key={option}
                      label={option}
                      active={modalPaymentMadeBy === option}
                      onClick={() => setModalPaymentMadeBy(option)}
                    />
                  ))}
                </div>

                <QuickFieldLabel>Payment Mode</QuickFieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {MODE_OPTIONS.map((option) => (
                    <QuickPill
                      key={option}
                      label={option}
                      active={modalPaymentMode === option}
                      onClick={() => setModalPaymentMode(option)}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <QuickFieldLabel>Payment Amount</QuickFieldLabel>
                  <QuickFieldBox>
                    <Input
                      value={modalAmount}
                      onChange={(e) => setModalAmount(e.target.value)}
                      placeholder="Amount"
                      bordered={false}
                      prefix="₹"
                    />
                  </QuickFieldBox>
                </div>

                <div>
                  <QuickFieldLabel>Payment Date</QuickFieldLabel>
                  <QuickFieldBox>
                    <DatePicker
                      value={modalDate}
                      onChange={(d) => setModalDate(d || dayjs())}
                      style={{ width: "100%" }}
                      bordered={false}
                      format="DD-MM-YYYY"
                    />
                  </QuickFieldBox>
                </div>

                <div>
                  <QuickFieldLabel>Transaction Details</QuickFieldLabel>
                  <QuickFieldBox>
                    <Input
                      value={modalTxn}
                      onChange={(e) => setModalTxn(e.target.value)}
                      placeholder="Txn / UTR / Ref"
                      bordered={false}
                    />
                  </QuickFieldBox>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <QuickFieldLabel>Bank Name</QuickFieldLabel>
                  <QuickFieldBox>
                    <AutoComplete
                      value={modalBank}
                      options={bankDirectoryOptions}
                      onChange={(value) => setModalBank(value)}
                      filterOption={(inputValue, option) =>
                        String(option?.value || "")
                          .toUpperCase()
                          .includes(String(inputValue || "").toUpperCase())
                      }
                      placeholder="Bank"
                      className="w-full"
                    />
                  </QuickFieldBox>
                </div>

                <div>
                  <QuickFieldLabel>Remarks</QuickFieldLabel>
                  <QuickFieldBox>
                    <Input
                      value={modalRemarks}
                      onChange={(e) => setModalRemarks(e.target.value)}
                      placeholder="Remarks"
                      bordered={false}
                    />
                  </QuickFieldBox>
                </div>
              </div>
            </>
          )}

          {paymentModalMode === "AC" && (
            <>
              <div className="rounded-2xl border border-violet-200/80 dark:border-violet-900/40 bg-violet-50/60 dark:bg-violet-950/20 p-3 space-y-3">
                <QuickFieldLabel>Receipt Type</QuickFieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {RECEIPT_TYPE_OPTIONS.map((option) => (
                    <QuickPill
                      key={option}
                      label={option}
                      active={modalReceiptType === option}
                      onClick={() => setModalReceiptType(option)}
                    />
                  ))}
                </div>

                <QuickFieldLabel>Receipt Mode</QuickFieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {MODE_OPTIONS.map((option) => (
                    <QuickPill
                      key={option}
                      label={option}
                      active={modalPaymentMode === option}
                      onClick={() => setModalPaymentMode(option)}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <QuickFieldLabel>Receipt Amount</QuickFieldLabel>
                  <QuickFieldBox>
                    <Input
                      value={modalAmount}
                      onChange={(e) => setModalAmount(e.target.value)}
                      placeholder="Amount"
                      bordered={false}
                      prefix="₹"
                    />
                  </QuickFieldBox>
                </div>

                <div>
                  <QuickFieldLabel>Receipt Date</QuickFieldLabel>
                  <QuickFieldBox>
                    <DatePicker
                      value={modalDate}
                      onChange={(d) => setModalDate(d || dayjs())}
                      style={{ width: "100%" }}
                      bordered={false}
                      format="DD-MM-YYYY"
                    />
                  </QuickFieldBox>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <QuickFieldLabel>Transaction Details</QuickFieldLabel>
                  <QuickFieldBox>
                    <Input
                      value={modalTxn}
                      onChange={(e) => setModalTxn(e.target.value)}
                      placeholder="Txn / UTR / Ref"
                      bordered={false}
                    />
                  </QuickFieldBox>
                </div>
                <div>
                  <QuickFieldLabel>Bank Name</QuickFieldLabel>
                  <QuickFieldBox>
                    <AutoComplete
                      value={modalBank}
                      options={bankDirectoryOptions}
                      onChange={(value) => setModalBank(value)}
                      filterOption={(inputValue, option) =>
                        String(option?.value || "")
                          .toUpperCase()
                          .includes(String(inputValue || "").toUpperCase())
                      }
                      placeholder="Bank"
                      className="w-full"
                    />
                  </QuickFieldBox>
                </div>
              </div>

              <div>
                <QuickFieldLabel>Remarks</QuickFieldLabel>
                <QuickFieldBox>
                    <Input
                      value={modalRemarks}
                      onChange={(e) => setModalRemarks(e.target.value)}
                      placeholder="Remarks"
                      bordered={false}
                    />
                </QuickFieldBox>
              </div>
            </>
          )}
        </div>
      </Modal>

      <DirectCreateModal
        open={showCreateModal}
        mode="PAYMENT"
        onClose={() => setShowCreateModal(false)}
        onCreated={() => loadData()}
      />
    </div>
  );
};

export default PaymentsDashboard;
