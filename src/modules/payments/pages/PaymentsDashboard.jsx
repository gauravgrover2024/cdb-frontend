import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  AutoComplete,
  Space,
  Button,
  Input,
  Modal,
  DatePicker,
  Empty,
  Pagination,
  message,
} from "antd";
import {
  ReloadOutlined,
  PlusOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { loansApi } from "../../../api/loans";
import { deliveryOrdersApi } from "../../../api/deliveryOrders";
import { paymentsApi } from "../../../api/payments";
import { useBankDirectoryOptions } from "../../../hooks/useBankDirectoryOptions";
import { useTheme } from "../../../context/ThemeContext";
import BreakdownSummaryCard from "../components/shared/BreakdownSummaryCard";
import DirectCreateModal from "../../shared/DirectCreateModal";
import PaymentsCaseCard from "../components/PaymentsCaseCard/PaymentCaseCard";
import PaymentsMetricCard from "../components/PaymentsMetricCard";
import PaymentsFilterBar from "../components/PaymentsFilterBar";
import { buildPaymentCaseSnapshot } from "../utils/paymentCaseSnapshot";

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

const RUPEE = "\u20B9";
const money = (n) => `${RUPEE} ${asInt(n).toLocaleString("en-IN")}`;

const normalizeLoanId = (value = "") => String(value || "").trim();

const listFromResponse = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const hasDisplayValue = (value) =>
  value !== undefined &&
  value !== null &&
  value !== "" &&
  Number.isFinite(Number(value));

const isManualShowroomRow = (row = {}) =>
  !row?._auto &&
  Boolean(
    asInt(row?.paymentAmount) > 0 ||
      String(row?.paymentType || "").trim() ||
      String(row?.paymentMadeBy || "").trim() ||
      String(row?.paymentMode || "").trim(),
  );

const isManualAcRow = (row = {}) =>
  !row?._auto &&
  Boolean(
    asInt(row?.receiptAmount) > 0 ||
      (Array.isArray(row?.receiptTypes) && row.receiptTypes.length > 0) ||
      String(row?.receiptMode || "").trim(),
  );

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
    const nextTs =
      new Date(row?.updatedAt || row?.createdAt || 0).getTime() || 0;
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
    const labels =
      Array.isArray(row?.receiptTypes) && row.receiptTypes.length
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

const buildShowroomSummarySections = (row = {}, { withLedger = true } = {}) => {
  const payment = row?.payment || {};
  const ss = row?.snapshot?.showroomSummary || {};
  const grouped = groupShowroomRowsByType(payment?.showroomRows || []);
  const sections = [
    {
      title: "Showroom payment ladder",
      rows: [
        {
          label: "Net on-road vehicle cost",
          value: asInt(ss?.netOnRoad),
          intent: "addition",
        },
        {
          label: "Adjustment — Insurance",
          value: asInt(ss?.insAdjApplied),
          intent: "discount",
        },
        {
          label: "Adjustment — Exchange",
          value: asInt(ss?.exAdjApplied),
          intent: "discount",
        },
        ...(asInt(ss?.crossAdjNet) !== 0
          ? [
              {
                label: "Cross adjustment net",
                value: asInt(ss?.crossAdjNet),
                intent: asInt(ss?.crossAdjNet) >= 0 ? "addition" : "discount",
              },
            ]
          : []),
        {
          label: "Net payable to showroom",
          value: asInt(ss?.netPayableToShowroom),
          intent: "total",
          strong: true,
        },
        {
          label: "Paid from Loan",
          value: asInt(ss?.loanPay),
          intent: "total",
        },
        {
          label: "Paid from Autocredits",
          value: asInt(ss?.autoPay),
          intent: "addition",
        },
        {
          label: "Paid from Customer",
          value: asInt(ss?.custPay),
          intent: "addition",
        },
        {
          label: "Balance payment",
          value: asInt(ss?.balancePayment),
          intent: asInt(ss?.balancePayment) > 0 ? "warning" : "positive",
        },
        ...(asInt(ss?.commissionReceived) > 0
          ? [
              {
                label: "Commission received",
                value: asInt(ss?.commissionReceived),
                intent: "addition",
              },
            ]
          : []),
        {
          label: "Closing balance",
          value: asInt(ss?.closingBalance),
          intent: asInt(ss?.closingBalance) > 0 ? "warning" : "total",
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
  ];
};

const buildAutocreditsSummarySections = (
  row = {},
  { withLedger = true } = {},
) => {
  const payment = row?.payment || {};
  const receiptTotals = payment?.autocreditsTotals || {};
  const grouped = groupReceiptRowsByType(payment?.autocreditsRows || []);
  const receiptBreakup = receiptTotals?.receiptBreakup || {};
  const ac = row?.snapshot?.autocreditsSummary || {};

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
          label: "Net receivable (Autocredits)",
          value: asInt(ac?.netReceivable),
          intent: "addition",
          strong: true,
        },
        {
          label: "Receipt total",
          value: asInt(receiptTotals?.receiptAmountTotal),
          intent: "addition",
          strong: true,
        },
        {
          label: "Closing balance",
          value: asInt(ac?.closingBalance),
          intent:
            asInt(ac?.closingBalance) === 0
              ? "total"
              : asInt(ac?.closingBalance) > 0
                ? "warning"
                : "danger",
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
          label: "Paid by Autocredits to showroom",
          value: asInt(ac?.showroomAutoPaid),
          intent: "addition",
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
      title: "Net receivable formula",
      rows: [
        {
          label: "Autocredits margin",
          value: asInt(ac?.autocreditsMargin),
          intent: "addition",
        },
        {
          label: "Paid by Autocredits to showroom",
          value: asInt(ac?.showroomAutoPaid),
          intent: "addition",
        },
        {
          label: "Insurance receivable",
          value: asInt(ac?.insuranceReceivable),
          intent: "addition",
        },
        {
          label: "Less: exchange adjustment",
          value: asInt(ac?.exchangeAdjustment),
          intent: "discount",
        },
        {
          label: "Less: insurance adjustment (customer-paid)",
          value: asInt(ac?.insuranceAdjustment),
          intent: "discount",
        },
        {
          label: "Less: receivable from showroom (negative balance)",
          value: asInt(ac?.receivableFromShowroom),
          intent: "discount",
        },
        {
          label: "Net receivable (Autocredits)",
          value: asInt(ac?.netReceivable),
          intent: "addition",
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

  return [...sections];
};

const buildPaymentDetailsSections = (row = {}) => {
  const payment = row?.payment || {};
  const doRec = row?.doRec || {};
  const ss = row?.snapshot?.showroomSummary || {};
  const ac = row?.snapshot?.autocreditsSummary || {};
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
        {
          label: "Loan ID",
          value: row?.loanId || "—",
          raw: true,
          strong: true,
        },
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
          label: "Net payable to showroom",
          value: asInt(ss?.netPayableToShowroom),
          intent: "addition",
        },
        {
          label: "Total paid to showroom",
          value: asInt(ss?.totalPaidToShowroom),
          intent: "addition",
        },
        {
          label: "Closing balance (showroom)",
          value: asInt(ss?.closingBalance),
          intent: asInt(ss?.closingBalance) > 0 ? "warning" : "total",
          strong: true,
        },
        {
          label: "Net receivable (Autocredits)",
          value: asInt(ac?.netReceivable),
          intent: "addition",
        },
        {
          label: "Receipts total",
          value: asInt(ac?.receiptTotal),
          intent: "addition",
        },
        {
          label: "Closing balance (Autocredits)",
          value: asInt(ac?.closingBalance),
          intent:
            asInt(ac?.closingBalance) === 0
              ? "total"
              : asInt(ac?.closingBalance) > 0
                ? "warning"
                : "danger",
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

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
  const [modalPaymentMode, setModalPaymentMode] = useState(
    "Online Transfer/UPI",
  );
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
  }, [statusFilter, typeFilter, searchQuery, pageSize]);

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
      const paymentRaw = paymentMap.get(loanId) || {};

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
        safeText(
          doRec?.do_vehicleMake || doRec?.vehicleMake || loan?.vehicleMake,
        ),
        safeText(
          doRec?.do_vehicleModel || doRec?.vehicleModel || loan?.vehicleModel,
        ),
        safeText(
          doRec?.do_vehicleVariant ||
            doRec?.vehicleVariant ||
            loan?.vehicleVariant,
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

      const doRef =
        safeText(doRec?.do_refNo) || safeText(doRec?.doNumber) || "";

      const netDO = asInt(doRec?.do_netDOAmount);
      const snapshot = buildPaymentCaseSnapshot(doRec, loan, paymentRaw);
      const payment = snapshot?.normalizedPayment || paymentRaw;
      const ss = snapshot.showroomSummary;
      const ac = snapshot.autocreditsSummary;
      const showroomRows = Array.isArray(payment?.showroomRows)
        ? payment.showroomRows
        : [];
      const acRows = Array.isArray(payment?.autocreditsRows)
        ? payment.autocreditsRows
        : [];
      const manualShowroomCount = showroomRows.filter(isManualShowroomRow).length;
      const manualAcCount = acRows.filter(isManualAcRow).length;
      const hasManualActivity = manualShowroomCount > 0 || manualAcCount > 0;

      const showroomSettled = Boolean(payment?.isVerified) && ss.canVerify;
      const autocreditsSettled =
        Boolean(payment?.isAutocreditsVerified) && ac.canVerify;

      let overallStatus = "DRAFT";
      if (showroomSettled && autocreditsSettled) overallStatus = "SETTLED";
      else if (showroomSettled || autocreditsSettled) overallStatus = "PARTIAL";
      else if (hasManualActivity && (ss.totalPaidToShowroom > 0 || ac.receiptTotal > 0))
        overallStatus = "IN_PROGRESS";

      const isFinanced =
        safeText(loan?.isFinanced || doRec?.isFinanced)
          .trim()
          .toLowerCase() === "yes";

      const outstandingShowroom = Math.max(0, asInt(ss.closingBalance));

      const lastActivityTs = Math.max(
        new Date(payment?.updatedAt || 0).getTime(),
        new Date(doRec?.updatedAt || 0).getTime(),
        new Date(doRec?.do_date || doRec?.doDate || 0).getTime(),
        0,
      );

      return {
        key: loanId,
        loanId,
        doRef,
        customerName,
        primaryMobile,
        dealerName,
        vehicle,
        netDO,
        paidShowroom: ss.totalPaidToShowroom,
        balanceToShowroom: asInt(ss.closingBalance),
        outstandingShowroom,
        receivedAutocredits: ac.receiptTotal,
        showroomSettled,
        autocreditsSettled,
        overallStatus,
        hasPayment: Boolean(payment?._id || payment?.loanId),
        payment,
        loan,
        doRec,
        isFinanced,
        hasManualActivity,
        manualShowroomCount,
        manualAcCount,
        snapshot,
        lastActivityTs,
      };
    });
  }, [savedDOs, loanMap, paymentMap]);

  const stats = useMemo(() => {
    const totalCases = rows.length;
    const grossNetPayableToShowroom = rows.reduce(
      (sum, row) => sum + asInt(row.snapshot?.showroomSummary?.netPayableToShowroom),
      0,
    );
    const grossPaymentsToShowroom = rows.reduce(
      (sum, row) => sum + asInt(row.snapshot?.showroomSummary?.totalPaidToShowroom),
      0,
    );
    const netPayableToShowroom = grossNetPayableToShowroom - grossPaymentsToShowroom;
    const netReceivableFromShowroom = rows.reduce(
      (sum, row) => sum + asInt(row.snapshot?.autocreditsSummary?.receivableFromShowroom),
      0,
    );
    const netReceivableFromCustomer = rows.reduce(
      (sum, row) => sum + Math.max(0, asInt(row.snapshot?.autocreditsSummary?.closingBalance)),
      0,
    );
    const verifyQueueCount = rows.filter((row) => {
      if (!row.hasManualActivity) return false;
      const ss = row.snapshot?.showroomSummary;
      const ac = row.snapshot?.autocreditsSummary;
      const p = row.payment;
      const zeroOutstanding =
        asInt(ss?.closingBalance) === 0 && asInt(ac?.closingBalance) === 0;
      if (!zeroOutstanding) return false;
      return (
        (ss?.canVerify && !p?.isVerified) ||
        (ac?.canVerify && !p?.isAutocreditsVerified)
      );
    }).length;

    return {
      totalCases,
      grossNetPayableToShowroom,
      grossPaymentsToShowroom,
      netPayableToShowroom,
      netReceivableFromShowroom,
      netReceivableFromCustomer,
      verifyQueueCount,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (typeFilter === "financed" && !row.isFinanced) return false;
      if (typeFilter === "cash" && row.isFinanced) return false;

      if (statusFilter === "nofile" && row.hasPayment) return false;

      if (statusFilter === "progress") {
        if (!row.hasManualActivity) return false;
        if (row.overallStatus !== "IN_PROGRESS" && row.overallStatus !== "PARTIAL") {
          return false;
        }
      }

      if (statusFilter === "acpending") {
        if (!row.hasManualActivity) return false;
        const ac = row.snapshot?.autocreditsSummary;
        const closingPending = asInt(ac?.closingBalance) > 0;
        const verificationPending =
          Boolean(ac?.canVerify) && !row?.payment?.isAutocreditsVerified;
        if (!closingPending && !verificationPending) return false;
      }

      if (statusFilter === "settled" && row.overallStatus !== "SETTLED")
        return false;

      if (statusFilter === "verify") {
        if (!row.hasManualActivity) return false;
        const ss = row.snapshot?.showroomSummary;
        const ac = row.snapshot?.autocreditsSummary;
        const p = row.payment;
        const needsVerify =
          (ss?.canVerify && !p?.isVerified) ||
          (ac?.canVerify && !p?.isAutocreditsVerified);
        if (!needsVerify) return false;
      }
      return true;
    });
  }, [rows, statusFilter, typeFilter]);

  const orderedRows = useMemo(() => {
    return [...filteredRows].sort(
      (a, b) => (b.lastActivityTs || 0) - (a.lastActivityTs || 0),
    );
  }, [filteredRows]);

  const totalCount = orderedRows.length;
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return orderedRows.slice(start, start + pageSize);
  }, [orderedRows, page, pageSize]);

  const handleQuickAddSubmit = async () => {
    if (!activeLoanForModal || !paymentModalMode) return;

    const loanId = activeLoanForModal.loanId;
    const latest = await paymentsApi.getByLoanId(loanId);
    const existingSafe = latest?.data || { loanId };

    try {
      const currentShowroomRows = Array.isArray(existingSafe?.showroomRows)
        ? existingSafe.showroomRows
        : [];
      const currentAutocreditsRows = Array.isArray(
        existingSafe?.autocreditsRows,
      )
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

  const exportPaymentsCsv = useCallback(() => {
    const esc = (v) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const headers = [
      "Loan ID",
      "DO Ref",
      "Customer",
      "Mobile",
      "Showroom",
      "Vehicle",
      "Financed",
      "Net DO (DO field)",
      "Net payable to showroom",
      "Total paid to showroom",
      "Closing balance showroom",
      "Net receivable Autocredits",
      "Receipts total",
      "Closing balance Autocredits",
      "Showroom verified",
      "Autocredits verified",
      "Status",
      "DO Date",
      "Payment Updated",
    ];
    const lines = [headers.join(",")];
    orderedRows.forEach((row) => {
      const ss = row?.snapshot?.showroomSummary || {};
      const ac = row?.snapshot?.autocreditsSummary || {};
      lines.push(
        [
          esc(row.loanId),
          esc(row.doRef),
          esc(row.customerName),
          esc(row.primaryMobile),
          esc(row.dealerName),
          esc(row.vehicle),
          esc(row.isFinanced ? "Yes" : "No"),
          esc(asInt(row.netDO)),
          esc(asInt(ss.netPayableToShowroom)),
          esc(asInt(ss.totalPaidToShowroom)),
          esc(asInt(ss.closingBalance)),
          esc(asInt(ac.netReceivable)),
          esc(asInt(ac.receiptTotal)),
          esc(asInt(ac.closingBalance)),
          esc(row.showroomSettled ? "Yes" : "No"),
          esc(row.autocreditsSettled ? "Yes" : "No"),
          esc(row.overallStatus),
          esc(row?.doRec?.do_date || row?.doRec?.doDate || ""),
          esc(row?.payment?.updatedAt || ""),
        ].join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-cases-${dayjs().format("YYYY-MM-DD-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(`Exported ${orderedRows.length} rows`);
  }, [orderedRows]);

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
        chipLabel: row.showroomSettled
          ? "Showroom verified"
          : "Showroom pending",
        chipTone: row.showroomSettled ? "green" : "blue",
        sections: buildShowroomSummarySections(row, { withLedger: true }),
      };
    }

    if (type === "ac") {
      return {
        eyebrow: "Autocredits receipts breakdown",
        title: row.customerName || "Autocredits account",
        subtitle: `${row.dealerName || "Showroom"} · ${row.loanId || "Loan ID"}`,
        chipLabel: row.autocreditsSettled ? "AC verified" : "AC pending",
        chipTone: row.autocreditsSettled ? "purple" : "blue",
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
    <div
      className={`min-h-screen ${
        isDarkMode
          ? "bg-gradient-to-b from-slate-950 via-zinc-950 to-zinc-900 text-zinc-100"
          : "bg-gradient-to-b from-slate-100 via-white to-slate-50 text-slate-900"
      }`}
    >
      <div
        className={`border-b ${
          isDarkMode
            ? "border-white/10 bg-black/20"
            : "border-slate-200/80 bg-white"
        }`}
      >
        <div className="mx-auto max-w-[1920px] px-4 py-6 md:px-8 md:py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p
                className={`text-[9px] font-semibold uppercase tracking-[0.24em] ${
                  isDarkMode ? "text-sky-300" : "text-sky-700"
                }`}
              >
                Finance · Payments Control
              </p>
              <div className="mt-1 inline-flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isDarkMode ? "bg-emerald-400" : "bg-emerald-500"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium ${
                    isDarkMode ? "text-zinc-400" : "text-slate-500"
                  }`}
                >
                  Live ledger sync
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
                Payments Dashboard
              </h1>
              <p
                className={`mt-2 max-w-xl text-xs leading-relaxed md:text-sm ${
                  isDarkMode ? "text-zinc-400" : "text-slate-600"
                }`}
              >
                Payment-form accurate settlement view for showroom and
                Autocredits ledgers, with fast verification and drilldowns.
              </p>
            </div>
            <Space wrap className="lg:pb-1">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={exportPaymentsCsv}
              >
                Export CSV
              </Button>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={loadData}
              >
                Refresh
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setShowCreateModal(true)}
              >
                New payment
              </Button>
            </Space>
          </div>

          <div
            className={`mt-6 rounded-2xl border p-3 md:p-4 ${
              isDarkMode
                ? "border-[#273141] bg-black/25"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <PaymentsMetricCard
                id="NetPayableToShowroom"
                label="Net Payable to Showroom"
                subtitle={`Net payable ${money(stats.grossNetPayableToShowroom)} - payments ${money(stats.grossPaymentsToShowroom)}`}
                value={money(stats.netPayableToShowroom)}
                accent="slate"
                dark={isDarkMode}
                loading={loading}
              />
              <PaymentsMetricCard
                id="NetReceivableFromShowroom"
                label="Net Receivable from Showroom"
                subtitle="Across all cases"
                value={money(stats.netReceivableFromShowroom)}
                accent="blue"
                dark={isDarkMode}
                loading={loading}
              />
              <PaymentsMetricCard
                id="NetReceivableFromCustomer"
                label="Net Receivable from Customer"
                subtitle="Customer side outstanding"
                value={money(stats.netReceivableFromCustomer)}
                accent="green"
                dark={isDarkMode}
                loading={loading}
              />
              <PaymentsMetricCard
                id="VerifyQueue"
                label="Pending Verification (0 Outstanding)"
                subtitle="Manual entry cases only"
                value={stats.verifyQueueCount}
                accent="amber"
                dark={isDarkMode}
                loading={loading}
              />
            </div>
          </div>

          <div className="mt-5">
            <PaymentsFilterBar
              searchQuery={searchInput}
              onSearchChange={setSearchInput}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              totalCount={rows.length}
              visibleCount={orderedRows.length}
              dark={isDarkMode}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1920px] space-y-5 px-4 py-8 md:px-8">
        {pagedRows.length === 0 ? (
          <div
            className={`rounded-[24px] border p-16 text-center ${
              isDarkMode
                ? "border-zinc-800 bg-zinc-900/30"
                : "border-slate-200 bg-white"
            }`}
          >
            <Empty
              description={
                loading
                  ? "Loading delivery orders and payment ledgers..."
                  : "No cases match these filters."
              }
            />
          </div>
        ) : (
          <>
            {pagedRows.map((row) => (
              <div key={row.loanId} className="mb-4">
                <PaymentsCaseCard
                  row={row}
                  isDarkMode={isDarkMode}
                  onOpenSummary={openSummaryModal}
                  navigate={navigate}
                  onQuickAdd={openQuickAddModal}
                />
              </div>
            ))}
            {totalCount > 0 ? (
              <div className="flex justify-end pt-2">
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={totalCount}
                  showSizeChanger
                  pageSizeOptions={["5", "10", "15", "25"]}
                  showTotal={(total, range) =>
                    `${range[0]}-${range[1]} of ${total} cases`
                  }
                  onChange={(nextPage, nextSize) => {
                    setPage(nextPage);
                    if (nextSize !== pageSize) setPageSize(nextSize);
                  }}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

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
                  <span className="font-semibold">
                    {activeLoanForModal.loanId}
                  </span>{" "}
                  · {activeLoanForModal.customerName || "Customer"} ·{" "}
                  {activeLoanForModal.doRef || "DO not mapped"}
                </>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            {activeLoanForModal && (
              <>
                Add this entry directly to the payment ledger. You can edit
                everything later in the full Payment form.
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
