import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Tag,
  Select,
  Input,
  Button,
  Checkbox,
  Empty,
  Space,
  DatePicker,
  Modal,
  Form,
  message,
  Tooltip,
  Badge,
  InputNumber,
  Timeline,
  Progress,
  Popconfirm,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  DollarOutlined,
  AlertOutlined,
  DownloadOutlined,
  EditOutlined,
  HistoryOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  LeftOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { loansApi } from "../../../../../api/loans";
import { paymentsApi } from "../../../../../api/payments";
import { deliveryOrdersApi } from "../../../../../api/deliveryOrders";
import { buildPaymentCaseSnapshot } from "../../../../payments/utils/paymentCaseSnapshot";

const { Option } = Select;

/* ==============================
   Helpers
============================== */
const safeArray = (v) => (Array.isArray(v) ? v : []);

const normalizeDirection = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isLikelyReceivableFromLegacyRow = (row = {}) => {
  const direction = normalizeDirection(row?.payout_direction);
  if (direction) return direction === "receivable";

  const payoutId = String(row?.payoutId || row?.id || "")
    .trim()
    .toUpperCase();
  if (payoutId.startsWith("PR-")) return true;
  if (payoutId.startsWith("PP-")) return false;

  const payoutType = normalizeType(row?.payout_type);
  if (["bank", "insurance", "commission"].includes(payoutType)) return true;

  // Legacy fallback: if direction is not present, treat as receivable
  // in Collections dashboard to avoid hidden entries.
  return true;
};

const collectReceivableRows = (loan = {}) => {
  const strictKeys = ["loan_receivables", "loanReceivables", "receivables"];
  const legacyKeys = ["loan_payouts"];
  const rows = [];

  strictKeys.forEach((key) => {
    safeArray(loan?.[key]).forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return;
      rows.push({
        ...entry,
        __receivableSourceKey: key,
        __receivableSourceIndex: index,
      });
    });
  });

  legacyKeys.forEach((key) => {
    safeArray(loan?.[key]).forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return;
      if (!isLikelyReceivableFromLegacyRow(entry)) return;
      rows.push({
        ...entry,
        __receivableSourceKey: key,
        __receivableSourceIndex: index,
      });
    });
  });

  // De-dupe by payout id per loan while preserving first source priority.
  const seen = new Set();
  return rows.filter((entry) => {
    const key = String(entry?.payoutId || entry?.id || "")
      .trim()
      .toLowerCase();
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getCustomerNameFromLoan = (loan) => {
  return (
    loan?.customerName ||
    loan?.profile_customerName ||
    loan?.profile_applicantName ||
    loan?.profile_applicant_name ||
    loan?.applicantName ||
    loan?.applicant_name ||
    loan?.leadName ||
    loan?.customer ||
    loan?.fullName ||
    loan?.name ||
    "-"
  );
};

const normalizeBankName = (v) =>
  String(v || "")
    .trim()
    .toLowerCase();

const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;
const getInitials = (value) =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "NA";
const formatShortDate = (value) =>
  dayjs(value).isValid() ? dayjs(value).format("DD MMM YYYY") : "—";
const AUTO_COMMISSION_META_SOURCE = "payments_negative_balance_commission_auto";
const COLLECTIONS_AUTO_PAYMENT_KEY_PREFIX =
  "collections_commission_receivable:";
const normalizePayoutId = (row = {}) =>
  String(row?.payoutId || row?.id || "").trim();

const stripReceivableRuntimeFields = (row = {}) => {
  const {
    __receivableSourceKey,
    __receivableSourceIndex,
    loanId,
    loanMongoId,
    customerName,
    ...rest
  } = row || {};
  return rest;
};

const firstValidDate = (...values) => {
  for (const value of values) {
    if (!value) continue;
    const parsed = dayjs(value);
    if (parsed.isValid()) return parsed.toISOString();
  }
  return null;
};

const getCreatedDate = (record) =>
  record?.created_date ||
  record?.payout_createdAt ||
  record?.payout_created_date ||
  record?.createdAt ||
  null;

const parsePercent = (value) => {
  const cleaned = String(value ?? "")
    .replace("%", "")
    .trim();
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
};

const buildMissingBankReceivableFromDisbursedBank = (
  loan = {},
  existingRows = [],
) => {
  const hasBankReceivableAlready = safeArray(existingRows).some((row) => {
    const type = normalizeType(row?.payout_type);
    const direction = normalizeDirection(row?.payout_direction || "receivable");
    return type === "bank" && direction === "receivable";
  });
  if (hasBankReceivableAlready) return null;

  const disbursedBank = safeArray(loan?.approval_banksData).find((bank) => {
    const status = String(bank?.status || "")
      .trim()
      .toLowerCase();
    return status === "disbursed";
  });
  if (!disbursedBank) return null;

  const payoutPercent = parsePercent(disbursedBank?.payoutPercent);
  if (!(payoutPercent > 0)) return null;

  const disbursedAmount = Number(
    disbursedBank?.disbursedAmount || disbursedBank?.loanAmount || 0,
  );
  if (!(Number.isFinite(disbursedAmount) && disbursedAmount > 0)) return null;

  const payoutAmount = Number(
    ((disbursedAmount * payoutPercent) / 100).toFixed(2),
  );
  if (!(payoutAmount > 0)) return null;

  const tdsPercentage = 5;
  const tdsAmount = Number(((payoutAmount * tdsPercentage) / 100).toFixed(2));
  const payoutId = `PR-BANK-${String(loan?.loanId || loan?._id || "")
    .trim()
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()}`;
  const createdAt = firstValidDate(
    disbursedBank?.disbursedDate,
    loan?.disbursement_date,
    loan?.approval_disbursedDate,
    loan?.updatedAt,
    loan?.createdAt,
  );

  return {
    id: payoutId,
    payoutId,
    payout_createdAt: createdAt,
    created_date: createdAt,
    payout_applicable: "Yes",
    payout_type: "Bank",
    payout_party_name:
      disbursedBank?.bankName ||
      loan?.disburse_bankName ||
      loan?.approval_bankName ||
      "Bank",
    payout_percentage: String(disbursedBank?.payoutPercent || payoutPercent),
    payout_amount: payoutAmount,
    payout_direction: "Receivable",
    tds_applicable: "Yes",
    tds_percentage: tdsPercentage,
    tds_amount: tdsAmount,
    net_payout_amount: Number((payoutAmount - tdsAmount).toFixed(2)),
    payout_status: "Expected",
    payout_expected_date: null,
    payout_received_date: null,
    payment_history: [],
    activity_log: [],
    payout_remarks: "Auto-generated from disbursed bank payoutPercent.",
    meta_source: "loan_disbursed_bank_payout_percent",
    __receivableSourceKey: "loan_receivables",
    __receivableSourceIndex: -1,
  };
};

const resolvePaymentDocFromResponse = (response) => {
  if (!response) return null;
  if (response?.data && typeof response.data === "object") {
    return response.data;
  }
  return response;
};

const buildAutoCommissionNarration = ({
  payoutId,
  amount,
  isoDate,
  remarks,
}) => {
  const explicitRemarks = String(remarks || "").trim();
  if (explicitRemarks) return explicitRemarks;
  const labelDate = isoDate
    ? dayjs(isoDate).format("DD MMM YYYY")
    : dayjs().format("DD MMM YYYY");
  const amountLabel = `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  return `Auto receipt sync from Collections (${labelDate}) • ${amountLabel} • Payout ${payoutId}`;
};

const buildCommissionRowsForShowroomPayments = ({
  payoutId,
  partyName,
  paymentHistory,
}) => {
  const autoKey = `${COLLECTIONS_AUTO_PAYMENT_KEY_PREFIX}${payoutId}`;
  return safeArray(paymentHistory)
    .map((payment, index) => {
      const amount = Number(payment?.amount || 0);
      if (!(amount > 0)) return null;
      const paymentDateIso = firstValidDate(payment?.date, payment?.timestamp);
      return {
        id: `COLL-COMM-${String(payoutId || "")
          .replace(/[^A-Za-z0-9]/g, "")
          .toUpperCase()}-${index + 1}`,
        paymentType: "Commission",
        paymentMadeBy: "Showroom",
        paymentMode: "Collections Dashboard",
        paymentAmount: String(amount),
        paymentDate: paymentDateIso,
        transactionDetails: "",
        bankName: String(partyName || "").trim(),
        remarks: buildAutoCommissionNarration({
          payoutId,
          amount,
          isoDate: paymentDateIso,
          remarks: payment?.remarks,
        }),
        adjustmentDirection: null,
        crossCaseId: null,
        crossCaseLabel: "",
        _auto: true,
        _autoKey: autoKey,
      };
    })
    .filter(Boolean);
};

const getExpectedAmount = (record) => {
  const net = Number(record?.net_payout_amount);
  if (Number.isFinite(net) && net > 0) return net;
  return Number(record?.payout_amount || 0) - Number(record?.tds_amount || 0);
};

const calculateDaysPending = (receivedDate, createdDate) => {
  if (receivedDate) return null;
  const start = createdDate ? dayjs(createdDate) : dayjs();
  const today = dayjs();
  return today.diff(start, "day");
};

const toUiStatus = (rawStatus, paymentStatus) => {
  if (paymentStatus.isFullyPaid) return "Received";
  if (paymentStatus.isPartial) return "Partial";
  if (rawStatus === "Received") return "Received";
  return "Pending";
};

const toBackendStatus = (uiStatus) => {
  if (uiStatus === "Received") return "Received";
  if (uiStatus === "Partial") return "Partial";
  return "Expected";
};

const getPaymentStatus = (record) => {
  const expectedAmount = getExpectedAmount(record);
  const paymentHistory = safeArray(record?.payment_history);
  const totalReceived = paymentHistory.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );

  return {
    expectedAmount,
    totalReceived,
    pendingAmount: Math.max(0, expectedAmount - totalReceived),
    percentageReceived:
      expectedAmount > 0 ? (totalReceived / expectedAmount) * 100 : 0,
    isPartial: totalReceived > 0 && totalReceived < expectedAmount,
    isFullyPaid: totalReceived >= expectedAmount && totalReceived > 0,
  };
};

const BILL_STATUS = {
  OUTSTANDING: "Outstanding",
  COLLECTED: "Collected",
};

const getBillNumber = (record = {}) =>
  String(record?.bill_number || record?.billNumber || "").trim();

const getBillDate = (record = {}) =>
  firstValidDate(
    record?.bill_date,
    record?.billDate,
    record?.bill_generated_at,
    record?.billGeneratedAt,
  );

const getBillStatus = (record = {}) =>
  String(record?.bill_status || record?.billStatus || "").trim();

const isBillCollected = (record = {}) => {
  const billNumber = getBillNumber(record);
  if (!billNumber) return false;
  const status = getBillStatus(record).toLowerCase();
  if (status === "collected") return true;
  return getPaymentStatus(record).pendingAmount <= 0;
};

const isBillOutstanding = (record = {}) =>
  Boolean(getBillNumber(record)) && !isBillCollected(record);

const isUnbilledOutstandingReceivable = (record = {}) => {
  const paymentStatus = getPaymentStatus(record);
  return !getBillNumber(record) && paymentStatus.pendingAmount > 0;
};

const generateBillNumber = () => {
  const stamp = dayjs().format("YYYYMMDD-HHmm");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RCB-${stamp}-${random}`;
};

const openBillPrintWindow = ({
  billNumber,
  billDate,
  partyName,
  rows = [],
  totalAmount = 0,
  notes = "",
}) => {
  const lineItems = rows
    .map((row, index) => {
      const paymentStatus = getPaymentStatus(row);
      const lineAmount = paymentStatus.pendingAmount || paymentStatus.expectedAmount;
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${String(row.customerName || "-")}</td>
          <td>${String(row.loanId || "-")}</td>
          <td>${String(row.payoutId || "-")}</td>
          <td>${String(row.payout_type || "-")}</td>
          <td style="text-align:right;">${formatCurrency(lineAmount)}</td>
        </tr>
      `;
    })
    .join("");

  const printWindow = window.open("", "_blank", "width=1080,height=820");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${billNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; color:#0f172a; margin:32px; }
          .top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
          .brand { font-size:28px; font-weight:800; letter-spacing:-0.03em; }
          .muted { color:#64748b; font-size:12px; }
          .title { font-size:18px; font-weight:700; margin-bottom:8px; }
          .box { border:1px solid #dbe3ef; border-radius:14px; padding:16px; background:#f8fbff; }
          table { width:100%; border-collapse:collapse; margin-top:18px; }
          th, td { border-bottom:1px solid #e2e8f0; padding:10px 8px; font-size:12px; text-align:left; }
          th { font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#475569; }
          .total { margin-top:18px; display:flex; justify-content:flex-end; }
          .total-card { min-width:260px; border:1px solid #cbd5e1; border-radius:14px; padding:14px 16px; background:#ffffff; }
          .total-label { font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#64748b; }
          .total-value { margin-top:6px; font-size:24px; font-weight:800; }
          .notes { margin-top:18px; font-size:12px; color:#475569; white-space:pre-wrap; }
          @media print { body { margin:18px; } }
        </style>
      </head>
      <body>
        <div class="top">
          <div>
            <div class="brand">Auto Credits India LLP</div>
            <div class="muted">Collections bill summary</div>
          </div>
          <div class="box">
            <div class="title">Bill</div>
            <div class="muted">Bill No</div>
            <div>${billNumber}</div>
            <div class="muted" style="margin-top:10px;">Bill Date</div>
            <div>${dayjs(billDate).isValid() ? dayjs(billDate).format("DD MMM YYYY") : "—"}</div>
          </div>
        </div>
        <div class="box">
          <div class="muted">Party</div>
          <div style="font-size:16px; font-weight:700; margin-top:4px;">${String(partyName || "-")}</div>
          <div class="muted" style="margin-top:10px;">Cases</div>
          <div>${rows.length}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Loan ID</th>
              <th>Receivable ID</th>
              <th>Type</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>${lineItems}</tbody>
        </table>
        <div class="total">
          <div class="total-card">
            <div class="total-label">Total bill amount</div>
            <div class="total-value">${formatCurrency(totalAmount)}</div>
          </div>
        </div>
        ${notes ? `<div class="notes"><strong>Notes:</strong><br/>${String(notes)}</div>` : ""}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const interactiveArrow = (
  <ArrowUpOutlined style={{ transform: "rotate(15deg)", fontSize: 10 }} />
);

const isBankReceivableRecord = (record = {}) =>
  normalizeType(record?.payout_type) === "bank";

const isShowroomCommissionRecord = (record = {}) =>
  String(record?.meta_source || "").trim() === AUTO_COMMISSION_META_SOURCE ||
  normalizeType(record?.payout_type) === "commission";

const buildOnRoadBreakup = (doRec = {}) => {
  const additions = [
    { label: "Ex-showroom", value: Number(doRec?.do_exShowroomPrice || 0) },
    { label: "TCS", value: Number(doRec?.do_tcs || 0) },
    { label: "Road Tax", value: Number(doRec?.do_roadTax || 0) },
    { label: "Insurance", value: Number(doRec?.do_insuranceCost || 0) },
    { label: "Accessories", value: Number(doRec?.do_accessoriesAmount || 0) },
    { label: "EPC", value: Number(doRec?.do_epc || 0) },
    { label: "Fastag", value: Number(doRec?.do_fastag || 0) },
    { label: "Extended Warranty", value: Number(doRec?.do_extendedWarranty || 0) },
  ].filter((row) => row.value > 0);

  const discounts = [
    { label: "Dealer Discount", value: Number(doRec?.do_dealerDiscount || 0) },
    { label: "Scheme Discount", value: Number(doRec?.do_schemeDiscount || 0) },
    {
      label: "Insurance Cashback",
      value: Number(doRec?.do_insuranceCashback || 0),
    },
    { label: "Exchange Bonus", value: Number(doRec?.do_exchange || 0) },
    {
      label: "Exchange Vehicle Price",
      value: Number(doRec?.do_exchangeVehiclePrice || 0),
    },
    { label: "Loyalty", value: Number(doRec?.do_loyalty || 0) },
    { label: "Corporate", value: Number(doRec?.do_corporate || 0) },
    {
      label: "Other Discounts",
      value: Number(doRec?.do_discounts_othersTotal || 0),
    },
  ].filter((row) => row.value > 0);

  const additionsTotal = additions.reduce(
    (sum, row) => sum + Number(row.value || 0),
    0,
  );
  const discountTotal = discounts.reduce(
    (sum, row) => sum + Number(row.value || 0),
    0,
  );
  const net = Number(
    doRec?.do_netOnRoadVehicleCost ||
      doRec?.do_customer_netOnRoadVehicleCost ||
      Math.max(0, additionsTotal - discountTotal),
  );

  return { additions, discounts, additionsTotal, discountTotal, net };
};

const PopupFrame = ({
  title,
  subtitle = "",
  width = 360,
  onClose = null,
  onBack = null,
  children,
}) => (
  <div
    className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fbff] shadow-[0_18px_44px_rgba(15,23,42,0.18)] dark:border-[#2a3340] dark:bg-[#111923]"
    style={{ width, maxWidth: `min(84vw, ${width}px)` }}
    onMouseDown={(event) => event.stopPropagation()}
    onClick={(event) => event.stopPropagation()}
  >
    <div className="flex items-start gap-3 border-b border-slate-200 bg-[#f4f8fd] px-3 py-2.5 dark:border-[#293140] dark:bg-[#16202d]">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 border-0 bg-transparent p-0 text-slate-500 dark:text-[#b5c2d6]"
          aria-label="Back"
        >
          <LeftOutlined style={{ fontSize: 10 }} />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 dark:text-[#c8d5e8]">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-1 text-[10.5px] text-slate-500 dark:text-[#96a4b9]">
            {subtitle}
          </div>
        ) : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 border-0 bg-transparent p-0 text-slate-500 dark:text-[#b5c2d6]"
          aria-label="Close"
        >
          <CloseOutlined style={{ fontSize: 10 }} />
        </button>
      ) : null}
    </div>
    <div className="grid gap-1 bg-[#f8fbff] px-3 py-2.5 dark:bg-[#111923]">
      {children}
    </div>
  </div>
);

const PopupSection = ({ title, children, tone = "slate" }) => {
  const toneMap = {
    slate: "text-slate-500 dark:text-[#9fb0c8]",
    blue: "text-sky-700 dark:text-sky-300",
    green: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    rose: "text-rose-700 dark:text-rose-300",
  };

  return (
    <div className="grid gap-1 py-1">
      <div
        className={`pt-1 text-[9px] font-extrabold uppercase tracking-[0.16em] ${
          toneMap[tone] || toneMap.slate
        }`}
      >
        {title}
      </div>
      {children}
    </div>
  );
};

const PopupRow = ({ label, value, tone = "default", valueAction = null }) => {
  const toneMap = {
    default: "text-slate-700 dark:text-slate-200",
    accent: "text-sky-700 dark:text-sky-300",
    positive: "text-emerald-700 dark:text-emerald-300",
    danger: "text-rose-700 dark:text-rose-300",
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-200 py-2 text-[11px] last:border-b-0 dark:border-[#253041]">
      <span className="truncate text-slate-600 dark:text-[#c0cbdd]">{label}</span>
      <span
        onClick={
          valueAction
            ? (event) => {
                event.stopPropagation();
                valueAction();
              }
            : undefined
        }
        onKeyDown={
          valueAction
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  valueAction();
                }
              }
            : undefined
        }
        role={valueAction ? "button" : undefined}
        tabIndex={valueAction ? 0 : undefined}
        className={`inline-flex items-center gap-1 whitespace-nowrap text-right font-bold ${toneMap[tone] || toneMap.default}`}
        style={{ cursor: valueAction ? "pointer" : "default" }}
      >
        {value}
        {valueAction ? interactiveArrow : null}
      </span>
    </div>
  );
};

const PopupLedgerEntry = ({ index, label, date, amount }) => (
  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-200 py-2 text-[11px] last:border-b-0 dark:border-[#253041]">
    <span className="truncate text-slate-700 dark:text-[#becbde]">
      {`${index + 1}. ${label} · ${date}`}
    </span>
    <span className="whitespace-nowrap font-extrabold text-emerald-700 dark:text-emerald-300">
      {formatCurrency(amount)}
    </span>
  </div>
);

const PopupEmptyState = ({ label }) => (
  <div className="py-3 text-[10.5px] text-slate-500 dark:text-slate-400">
    {label}
  </div>
);

const MiniMetric = ({
  label,
  value,
  helpText = "",
  tone = "slate",
  popupContent = null,
  popupTitle = "",
  popupSubtitle = "",
  popupOpen = false,
  onPopupOpenChange = null,
  onPopupClose = null,
  popupBackAction = null,
  popupWidth = 360,
}) => {
  const wrapperRef = useRef(null);
  const toneMap = {
    slate: "text-slate-900 dark:text-slate-100",
    blue: "text-blue-700 dark:text-blue-300",
    green: "text-emerald-700 dark:text-emerald-300",
    red: "text-rose-700 dark:text-rose-300",
  };

  useEffect(() => {
    if (!popupOpen || !onPopupOpenChange) return undefined;
    const handleOutside = (event) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target)) return;
      onPopupOpenChange(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onPopupOpenChange, popupOpen]);

  const togglePopup = (event) => {
    event.stopPropagation();
    if (!popupContent || !onPopupOpenChange) return;
    onPopupOpenChange(!popupOpen);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        className="w-full border-0 bg-transparent p-0 text-left"
        style={{ cursor: popupContent ? "pointer" : "default" }}
        onClick={togglePopup}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {label}
            </div>
            {helpText ? (
              <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                {helpText}
              </div>
            ) : null}
          </div>
          <div
            className={`inline-flex items-center gap-1 whitespace-nowrap text-[14px] font-black ${toneMap[tone] || toneMap.slate}`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {value}
            {popupContent ? interactiveArrow : null}
          </div>
        </div>
      </button>

      {popupContent && popupOpen ? (
        <div
          className="absolute right-0 top-full z-[1200] mt-2"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <PopupFrame
            title={popupTitle || label}
            subtitle={popupSubtitle}
            width={popupWidth}
            onClose={onPopupClose}
            onBack={popupBackAction}
          >
            {popupContent}
          </PopupFrame>
        </div>
      ) : null}
    </div>
  );
};

/* ==============================
   Component
============================== */
const PayoutReceivablesDashboard = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [bankFilter, setBankFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [ageFilter, setAgeFilter] = useState("All");
  const [amountRangeFilter, setAmountRangeFilter] = useState("All");

  const handleStatusFilterChange = useCallback(
    (value) => setStatusFilter(value || "All"),
    [],
  );
  const handleAgeFilterChange = useCallback(
    (value) => setAgeFilter(value || "All"),
    [],
  );
  const handleBankFilterChange = useCallback(
    (value) => setBankFilter(value || "All"),
    [],
  );
  const handleAmountRangeFilterChange = useCallback(
    (value) => setAmountRangeFilter(value || "All"),
    [],
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  const [bulkCollectionModalVisible, setBulkCollectionModalVisible] =
    useState(false);
  const [generateBillModalVisible, setGenerateBillModalVisible] =
    useState(false);
  const [billManagerVisible, setBillManagerVisible] = useState(false);
  const [timelineModalVisible, setTimelineModalVisible] = useState(false);
  const [partialPaymentModalVisible, setPartialPaymentModalVisible] =
    useState(false);
  const [editPaymentModalVisible, setEditPaymentModalVisible] = useState(false);
  const [paymentHistoryModalVisible, setPaymentHistoryModalVisible] =
    useState(false);
  const [desktopPage, setDesktopPage] = useState(1);
  const [desktopPageSize, setDesktopPageSize] = useState(15);
  const [billFilter, setBillFilter] = useState("All");
  const [billPartyFilter, setBillPartyFilter] = useState("");
  const [selectedBillRowKeys, setSelectedBillRowKeys] = useState([]);
  const [billManagerStatusFilter, setBillManagerStatusFilter] =
    useState(BILL_STATUS.OUTSTANDING);
  const [activeBillCollection, setActiveBillCollection] = useState(null);

  const [currentRecord, setCurrentRecord] = useState(null);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState(null);

  const [bulkForm] = Form.useForm();
  const [billForm] = Form.useForm();
  const [partialPaymentForm] = Form.useForm();
  const [editPaymentForm] = Form.useForm();
  const [openInsightPopupKey, setOpenInsightPopupKey] = useState(null);
  const [showroomPopupViewByRow, setShowroomPopupViewByRow] = useState({});
  const [ledgerDetailsByRow, setLedgerDetailsByRow] = useState({});
  const [ledgerLoadingByRow, setLedgerLoadingByRow] = useState({});
  const [ledgerErrorByRow, setLedgerErrorByRow] = useState({});

  const closeInsightPopups = useCallback(() => {
    setOpenInsightPopupKey(null);
  }, []);

  const loadLedgerDetailsForRow = useCallback(
    async (record) => {
      const rowKey = normalizePayoutId(record);
      if (!rowKey) return null;
      if (ledgerDetailsByRow[rowKey]) return ledgerDetailsByRow[rowKey];
      if (ledgerLoadingByRow[rowKey]) return null;

      setLedgerLoadingByRow((prev) => ({ ...prev, [rowKey]: true }));
      setLedgerErrorByRow((prev) => ({ ...prev, [rowKey]: null }));

      try {
        const loanRef = record?.loanMongoId || record?.loanId;
        const [loanResult, paymentResult, doResult] = await Promise.allSettled([
          loanRef ? loansApi.getById(loanRef) : Promise.resolve(null),
          record?.loanId ? paymentsApi.getByLoanId(record.loanId) : Promise.resolve(null),
          record?.loanId ? deliveryOrdersApi.getByLoanId(record.loanId) : Promise.resolve(null),
        ]);

        const loanData =
          loanResult.status === "fulfilled"
            ? loanResult.value?.data || loanResult.value || {}
            : {};
        const paymentDocRaw =
          paymentResult.status === "fulfilled"
            ? resolvePaymentDocFromResponse(paymentResult.value) || {}
            : {};
        const doRecRaw =
          doResult.status === "fulfilled"
            ? doResult.value?.data || doResult.value || {}
            : {};
        const savedPayments = (() => {
          try {
            return JSON.parse(sessionStorage.getItem("savedPayments") || "[]");
          } catch {
            return [];
          }
        })();
        const savedDOs = (() => {
          try {
            return JSON.parse(sessionStorage.getItem("savedDOs") || "[]");
          } catch {
            return [];
          }
        })();
        const paymentDoc =
          paymentDocRaw && Object.keys(paymentDocRaw).length
            ? paymentDocRaw
            : savedPayments.find((entry) => entry?.loanId === record?.loanId) ||
              {};
        const doRec =
          doRecRaw && Object.keys(doRecRaw).length
            ? doRecRaw
            : savedDOs.find((entry) => entry?.loanId === record?.loanId) ||
              savedDOs.find((entry) => entry?.do_loanId === record?.loanId) ||
              loanData?.doRec ||
              {};

        const snapshot = buildPaymentCaseSnapshot(
          doRec,
          loanData,
          paymentDoc,
        );

        const nextDetails = {
          loan: loanData,
          doRec,
          payment: paymentDoc,
          snapshot,
        };

        setLedgerDetailsByRow((prev) => ({ ...prev, [rowKey]: nextDetails }));
        return nextDetails;
      } catch (error) {
        console.error("Failed to load ledger details for collections row:", error);
        setLedgerErrorByRow((prev) => ({
          ...prev,
          [rowKey]: "Unable to load showroom ledger.",
        }));
        return null;
      } finally {
        setLedgerLoadingByRow((prev) => ({ ...prev, [rowKey]: false }));
      }
    },
    [ledgerDetailsByRow, ledgerLoadingByRow],
  );

  const syncAutoCommissionReceivableIntoPayments = async ({
    loanId,
    receivableRow,
  }) => {
    if (!loanId || !receivableRow) return;
    if (
      String(receivableRow?.meta_source || "").trim() !==
      AUTO_COMMISSION_META_SOURCE
    ) {
      return;
    }
    const payoutId = String(
      receivableRow?.payoutId || receivableRow?.id || "",
    ).trim();
    if (!payoutId) return;

    const paymentResponse = await paymentsApi.getByLoanId(loanId);
    const paymentDoc = resolvePaymentDocFromResponse(paymentResponse) || {};
    const showroomRows = safeArray(paymentDoc?.showroomRows);
    const autoKey = `${COLLECTIONS_AUTO_PAYMENT_KEY_PREFIX}${payoutId}`;
    const keptRows = showroomRows.filter(
      (row) => String(row?._autoKey || "").trim() !== autoKey,
    );
    const generatedRows = buildCommissionRowsForShowroomPayments({
      payoutId,
      partyName: receivableRow?.payout_party_name,
      paymentHistory: safeArray(receivableRow?.payment_history),
    });

    const nextRows = [...keptRows, ...generatedRows];
    const previousSerialized = JSON.stringify(showroomRows);
    const nextSerialized = JSON.stringify(nextRows);
    if (previousSerialized === nextSerialized) return;

    await paymentsApi.update(loanId, { showroomRows: nextRows });
  };

  const loadReceivables = async () => {
    try {
      let allLoans = [];
      let usedFastCollectionsEndpoint = false;
      try {
        const fastRes = await loansApi.getCollectionsReceivables({
          limit: 12000,
          skip: 0,
        });
        const fastRows = safeArray(fastRes?.data);
        if (fastRows.length > 0 || Number(fastRes?.total || 0) === 0) {
          allLoans = fastRows;
          usedFastCollectionsEndpoint = true;
        }
      } catch (_) {
        // Graceful fallback for older backend deployments that don't have
        // /api/loans/collections/receivables yet.
      }

      if (!usedFastCollectionsEndpoint) {
        const pageSize = 300;
        let skip = 0;
        let hasMore = true;

        while (hasMore) {
          const res = await loansApi.getAll({
            limit: pageSize,
            skip,
            noCount: true,
            sortBy: "leadDate",
            sortDir: "desc",
          });
          const pageLoans = safeArray(res?.data);
          allLoans.push(...pageLoans);
          hasMore = Boolean(res?.hasMore);
          skip += pageSize;
        }
      }

      const receivables = allLoans.flatMap((loan) => {
        const receivableList = collectReceivableRows(loan);
        const derivedBankReceivable =
          buildMissingBankReceivableFromDisbursedBank(loan, receivableList);
        const mergedRows = derivedBankReceivable
          ? [...receivableList, derivedBankReceivable]
          : receivableList;

        return mergedRows.map((p) => ({
          ...p,
          payoutId: p?.payoutId || p?.id,
          id: p?.id || p?.payoutId,
          loanId: loan.loanId || loan.id || "-",
          loanMongoId: loan._id || loan.id,
          disbursementDate: firstValidDate(
            loan?.disbursement_date,
            loan?.approval_disbursedDate,
            loan?.disbursedDate,
            loan?.disbursementDate,
            loan?.approval_banksData?.[0]?.disbursedDate,
          ),
          deliveryDate: firstValidDate(
            loan?.delivery_date,
            loan?.deliveryDate,
            loan?.vehicleDeliveryDate,
            loan?.postfile_delivery_date,
            loan?.postfile_deliveryDate,
          ),
          customerName: getCustomerNameFromLoan(loan),
          payment_history: safeArray(p.payment_history),
          activity_log: safeArray(p.activity_log),
          created_date:
            String(p?.meta_source || "").trim() === AUTO_COMMISSION_META_SOURCE
              ? firstValidDate(
                  loan?.delivery_date,
                  loan?.deliveryDate,
                  loan?.vehicleDeliveryDate,
                  loan?.approval_disbursedDate,
                  getCreatedDate(p),
                )
              : getCreatedDate(p),
        }));
      });
      setRows(receivables);
    } catch (err) {
      console.error("Failed to load receivables:", err);
      messageApi.error("Failed to load receivables");
    }
  };

  useEffect(() => {
    loadReceivables();
  }, []);

  const updateReceivableInBackend = async (
    payoutId,
    patch,
    activityAction = null,
    options = {},
  ) => {
    const shouldReload = options?.reload !== false;
    const normalizedPayoutId = String(payoutId || "").trim();
    if (!normalizedPayoutId) return;
    const sourceMatch = rows.find(
      (row) => normalizePayoutId(row) === normalizedPayoutId,
    );
    if (!sourceMatch?.loanId) return;

    const seedRow = stripReceivableRuntimeFields(sourceMatch);
    const nextPatch = { ...patch };

    let updatedRow = null;
    try {
      const saveRes = await loansApi.updateCollectionReceivable(
        normalizedPayoutId,
        {
          loanId: sourceMatch.loanId,
          patch: nextPatch,
          seedRow,
          activityAction,
        },
      );

      const savedDoc = saveRes?.data || null;
      updatedRow = savedDoc
        ? {
            ...(savedDoc?.payload && typeof savedDoc.payload === "object"
              ? savedDoc.payload
              : {}),
            id:
              savedDoc?.payload?.id || savedDoc?.payoutId || normalizedPayoutId,
            payoutId: savedDoc?.payoutId || normalizedPayoutId,
            payout_type: savedDoc?.payout_type,
            payout_party_name: savedDoc?.payout_party_name,
            payout_direction: savedDoc?.payout_direction,
            payout_status: savedDoc?.payout_status,
            payout_percentage: savedDoc?.payout_percentage,
            payout_amount: savedDoc?.payout_amount,
            net_payout_amount: savedDoc?.net_payout_amount,
            tds_amount: savedDoc?.tds_amount,
            tds_percentage: savedDoc?.tds_percentage,
            payout_received_date: savedDoc?.payout_received_date,
            created_date: savedDoc?.created_date,
            payout_createdAt: savedDoc?.payout_createdAt,
            payment_history: safeArray(savedDoc?.payment_history),
            activity_log: safeArray(savedDoc?.activity_log),
            meta_source: savedDoc?.meta_source,
          }
        : null;
    } catch (err) {
      console.error("Failed to update receivable:", err);
      messageApi.error("Failed to update receivable");
      return null;
    }

    if (updatedRow) {
      try {
        // Keep frontend sync best-effort only; backend now owns canonical sync.
        await syncAutoCommissionReceivableIntoPayments({
          loanId: sourceMatch.loanId,
          receivableRow: updatedRow,
        });
      } catch (syncError) {
        console.warn(
          "Auto sync into Payments failed (non-blocking):",
          syncError,
        );
      }
    }

    if (shouldReload) {
      try {
        await loadReceivables();
      } catch (reloadErr) {
        console.warn("Receivables reload failed after save:", reloadErr);
      }
    }
    return updatedRow;
  };

  /* ==============================
     Stats & Bank Summary
  ============================== */
  const bankOptions = useMemo(() => {
    const banks = Array.from(
      new Set(
        rows
          .map((r) => r.payout_party_name)
          .filter(Boolean)
          .map((b) => String(b).trim()),
      ),
    );
    return banks.sort();
  }, [rows]);

  const bankSummary = useMemo(() => {
    const summary = {};
    rows.forEach((r) => {
      const bank = r.payout_party_name || "Unknown";
      if (!summary[bank]) {
        summary[bank] = { total: 0, count: 0, pending: 0, collected: 0 };
      }

      const paymentStatus = getPaymentStatus(r);
      summary[bank].total += paymentStatus.expectedAmount;
      summary[bank].count += 1;
      summary[bank].collected += paymentStatus.totalReceived;
      summary[bank].pending += paymentStatus.pendingAmount;
    });

    return Object.entries(summary)
      .map(([bank, data]) => ({ bank, ...data }))
      .sort((a, b) => b.pending - a.pending);
  }, [rows]);

  const billPartyOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .filter(isUnbilledOutstandingReceivable)
          .map((row) => String(row?.payout_party_name || "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const availableBillRows = useMemo(() => {
    return rows.filter((row) => {
      if (!isUnbilledOutstandingReceivable(row)) return false;
      if (!billPartyFilter) return true;
      return (
        normalizeBankName(row?.payout_party_name) ===
        normalizeBankName(billPartyFilter)
      );
    });
  }, [billPartyFilter, rows]);

  const selectedBillRows = useMemo(() => {
    const keySet = new Set(
      selectedBillRowKeys.map((key) => String(key).trim()).filter(Boolean),
    );
    return availableBillRows.filter((row) =>
      keySet.has(normalizePayoutId(row)),
    );
  }, [availableBillRows, selectedBillRowKeys]);

  const selectedBillTotal = useMemo(() => {
    return selectedBillRows.reduce((sum, row) => {
      const paymentStatus = getPaymentStatus(row);
      return sum + (paymentStatus.pendingAmount || paymentStatus.expectedAmount);
    }, 0);
  }, [selectedBillRows]);

  const groupedBills = useMemo(() => {
    const grouped = new Map();
    rows.forEach((row) => {
      const billNumber = getBillNumber(row);
      if (!billNumber) return;
      if (!grouped.has(billNumber)) {
        grouped.set(billNumber, {
          billNumber,
          partyName: row?.bill_party_name || row?.payout_party_name || "Unknown",
          billDate: getBillDate(row),
          billReceivedDate: firstValidDate(
            row?.bill_received_date,
            row?.billReceivedDate,
          ),
          notes: String(row?.bill_notes || row?.billNotes || "").trim(),
          rows: [],
        });
      }
      grouped.get(billNumber).rows.push(row);
    });

    return Array.from(grouped.values())
      .map((bill) => {
        const summary = bill.rows.reduce(
          (acc, row) => {
            const paymentStatus = getPaymentStatus(row);
            acc.expected += paymentStatus.expectedAmount;
            acc.received += paymentStatus.totalReceived;
            acc.pending += paymentStatus.pendingAmount;
            return acc;
          },
          { expected: 0, received: 0, pending: 0 },
        );
        const status =
          summary.pending <= 0 ? BILL_STATUS.COLLECTED : BILL_STATUS.OUTSTANDING;
        return {
          ...bill,
          ...summary,
          caseCount: bill.rows.length,
          status,
        };
      })
      .sort((a, b) => {
        const aTs = new Date(a.billDate || 0).getTime() || 0;
        const bTs = new Date(b.billDate || 0).getTime() || 0;
        return bTs - aTs;
      });
  }, [rows]);

  const stats = useMemo(() => {
    let totalAmount = 0;
    let collectedAmount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    rows.forEach((r) => {
      const paymentStatus = getPaymentStatus(r);
      totalAmount += paymentStatus.expectedAmount;
      collectedAmount += paymentStatus.totalReceived;

      if (!paymentStatus.isFullyPaid) {
        pendingAmount += paymentStatus.pendingAmount;
        pendingCount += 1;

        const days = calculateDaysPending(
          r.payout_received_date,
          r.created_date,
        );
        if (days !== null && days > 15) {
          overdueCount += 1;
        }
      }
    });

    return [
      {
        id: "total",
        label: "Total Receivables",
        value: formatCurrency(totalAmount),
        icon: <DollarOutlined />,
      },
      {
        id: "collected",
        label: "Collected",
        value: formatCurrency(collectedAmount),
        icon: <CheckCircleOutlined />,
      },
      {
        id: "pending",
        label: "Pending",
        value: formatCurrency(pendingAmount),
        subtext: `${pendingCount} items`,
        icon: <ClockCircleOutlined />,
      },
      {
        id: "overdue",
        label: "Overdue (15+ days)",
        value: overdueCount,
        icon: <AlertOutlined />,
      },
    ];
  }, [rows]);

  /* ==============================
     Filtering
  ============================== */
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const paymentStatus = getPaymentStatus(r);
      const uiStatus = toUiStatus(r.payout_status, paymentStatus);

      const statusOk =
        statusFilter === "All" ? true : uiStatus === statusFilter;

      const bankOk =
        bankFilter === "All"
          ? true
          : normalizeBankName(r.payout_party_name) ===
            normalizeBankName(bankFilter);

      const searchOk = searchText
        ? `${r.loanId} ${r.customerName} ${r.payout_party_name} ${r.payoutId}`
            .toLowerCase()
            .includes(searchText.toLowerCase())
        : true;

      let ageOk = true;
      if (ageFilter !== "All") {
        if (!paymentStatus.isFullyPaid) {
          const days = calculateDaysPending(
            r.payout_received_date,
            r.created_date,
          );
          if (days !== null) {
            if (ageFilter === "0-7") ageOk = days <= 7;
            else if (ageFilter === "8-15") ageOk = days >= 8 && days <= 15;
            else if (ageFilter === "16-30") ageOk = days >= 16 && days <= 30;
            else if (ageFilter === "30+") ageOk = days > 30;
          }
        }
      }

      let amountOk = true;
      if (amountRangeFilter !== "All") {
        const amount = Number(r.payout_amount || 0);
        if (amountRangeFilter === "0-50k") amountOk = amount <= 50000;
        else if (amountRangeFilter === "50k-1L")
          amountOk = amount > 50000 && amount <= 100000;
        else if (amountRangeFilter === "1L-5L")
          amountOk = amount > 100000 && amount <= 500000;
        else if (amountRangeFilter === "5L+") amountOk = amount > 500000;
      }

      let billOk = true;
      if (billFilter === "Outstanding Bills") billOk = isBillOutstanding(r);
      else if (billFilter === "Collected Bills") billOk = isBillCollected(r);
      else if (billFilter === "Unbilled") billOk = !getBillNumber(r);

      return statusOk && bankOk && searchOk && ageOk && amountOk && billOk;
    });
  }, [
    rows,
    statusFilter,
    bankFilter,
    searchText,
    ageFilter,
    amountRangeFilter,
    billFilter,
  ]);

  const filteredSubtotals = useMemo(() => {
    const totals = {
      expected: 0,
      received: 0,
      pending: 0,
      parties: new Set(),
    };
    filteredRows.forEach((row) => {
      const paymentStatus = getPaymentStatus(row);
      totals.expected += paymentStatus.expectedAmount;
      totals.received += paymentStatus.totalReceived;
      totals.pending += paymentStatus.pendingAmount;
      const party = String(row?.payout_party_name || "")
        .trim()
        .toLowerCase();
      if (party) totals.parties.add(party);
    });
    return {
      expected: totals.expected,
      received: totals.received,
      pending: totals.pending,
      partyCount: totals.parties.size,
      rowCount: filteredRows.length,
    };
  }, [filteredRows]);

  const filteredBills = useMemo(() => {
    return groupedBills.filter((bill) => {
      if (
        billManagerStatusFilter === BILL_STATUS.OUTSTANDING &&
        bill.status !== BILL_STATUS.OUTSTANDING
      ) {
        return false;
      }
      if (
        billManagerStatusFilter === BILL_STATUS.COLLECTED &&
        bill.status !== BILL_STATUS.COLLECTED
      ) {
        return false;
      }
      return true;
    });
  }, [billManagerStatusFilter, groupedBills]);

  useEffect(() => {
    setDesktopPage(1);
  }, [
    statusFilter,
    bankFilter,
    searchText,
    ageFilter,
    amountRangeFilter,
    billFilter,
    desktopPageSize,
  ]);

  const desktopTotalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / desktopPageSize),
  );

  useEffect(() => {
    if (desktopPage > desktopTotalPages) {
      setDesktopPage(desktopTotalPages);
    }
  }, [desktopPage, desktopTotalPages]);

  const pagedDesktopRows = useMemo(() => {
    const start = (desktopPage - 1) * desktopPageSize;
    return filteredRows.slice(start, start + desktopPageSize);
  }, [desktopPage, desktopPageSize, filteredRows]);

  /* ==============================
     Payment History Management
  ============================== */
  const openPaymentHistoryModal = (record) => {
    setCurrentRecord(record);
    setPaymentHistoryModalVisible(true);
  };

  const handleEditPayment = (payment, index) => {
    setEditingPaymentIndex(index);
    editPaymentForm.setFieldsValue({
      payment_amount: payment.amount,
      payment_date: dayjs(payment.date),
      payment_remarks: payment.remarks || "",
    });
    setEditPaymentModalVisible(true);
  };

  const handleEditPaymentSave = async () => {
    const values = await editPaymentForm.validateFields();
    const updatedHistory = [...safeArray(currentRecord.payment_history)];
    updatedHistory[editingPaymentIndex] = {
      ...updatedHistory[editingPaymentIndex],
      amount: values.payment_amount,
      date: values.payment_date.format("YYYY-MM-DD"),
      remarks: values.payment_remarks || "",
      edited_at: new Date().toISOString(),
    };

    const totalReceived = updatedHistory.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    const expectedAmount = getExpectedAmount(currentRecord);
    const isFullyPaid = totalReceived >= expectedAmount;

    const updated = await updateReceivableInBackend(
      normalizePayoutId(currentRecord),
      {
        payment_history: updatedHistory,
        payout_status: toBackendStatus(
          isFullyPaid ? "Received" : totalReceived > 0 ? "Partial" : "Pending",
        ),
        payout_received_date: isFullyPaid
          ? values.payment_date.format("YYYY-MM-DD")
          : currentRecord.payout_received_date,
      },
      {
        action: "Payment Edited",
        details: `Updated payment: ${formatCurrency(values.payment_amount)} on ${values.payment_date.format("DD MMM YYYY")}`,
      },
    );
    if (!updated) return;

    setEditPaymentModalVisible(false);
    messageApi.success("Payment updated successfully");
  };

  const handleDeletePayment = async (index) => {
    const updatedHistory = [...safeArray(currentRecord.payment_history)];
    const deletedPayment = updatedHistory[index];
    updatedHistory.splice(index, 1);

    const totalReceived = updatedHistory.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    const expectedAmount = getExpectedAmount(currentRecord);
    const isFullyPaid = totalReceived >= expectedAmount;

    const updated = await updateReceivableInBackend(
      normalizePayoutId(currentRecord),
      {
        payment_history: updatedHistory,
        payout_status: toBackendStatus(
          isFullyPaid ? "Received" : totalReceived > 0 ? "Partial" : "Pending",
        ),
        payout_received_date: isFullyPaid
          ? currentRecord.payout_received_date
          : "",
      },
      {
        action: "Payment Deleted",
        details: `Deleted payment: ${formatCurrency(deletedPayment.amount)} dated ${dayjs(deletedPayment.date).format("DD MMM YYYY")}`,
      },
    );
    if (!updated) return;

    messageApi.success("Payment deleted successfully");
  };

  /* ==============================
     Bulk Collection with Individual Amounts
  ============================== */
  const openBulkCollectionModal = () => {
    if (!selectedRows.length) {
      messageApi.warning("Please select at least 1 receivable");
      return;
    }

    const initialValues = {
      received_date: dayjs(),
    };

    selectedRows.forEach((r) => {
      const paymentStatus = getPaymentStatus(r);
      initialValues[`amount_${normalizePayoutId(r)}`] =
        paymentStatus.pendingAmount;
    });

    bulkForm.setFieldsValue(initialValues);
    setBulkCollectionModalVisible(true);
  };

  const openGenerateBillModal = () => {
    const selectedOutstanding = selectedRows.filter(isUnbilledOutstandingReceivable);
    const sameParty =
      selectedOutstanding.length > 0
        ? Array.from(
            new Set(
              selectedOutstanding
                .map((row) => String(row?.payout_party_name || "").trim())
                .filter(Boolean),
            ),
          )
        : [];
    const initialParty = sameParty.length === 1 ? sameParty[0] : "";
    const initialRows =
      initialParty && selectedOutstanding.length
        ? selectedOutstanding
            .filter(
              (row) =>
                normalizeBankName(row?.payout_party_name) ===
                normalizeBankName(initialParty),
            )
            .map((row) => normalizePayoutId(row))
        : [];

    setBillPartyFilter(initialParty);
    setSelectedBillRowKeys(initialRows);
    billForm.setFieldsValue({
      billNumber: generateBillNumber(),
      billDate: dayjs(),
      billNotes: "",
    });
    setGenerateBillModalVisible(true);
  };

  const handleGenerateBill = async () => {
    const values = await billForm.validateFields();
    const partyName = String(billPartyFilter || "").trim();
    if (!partyName) {
      messageApi.warning("Please select a party first");
      return;
    }
    if (!selectedBillRows.length) {
      messageApi.warning("Please select at least one receivable for the bill");
      return;
    }

    const billNumber = String(values.billNumber || "").trim();
    const billDate = values.billDate?.toISOString?.() || values.billDate;
    const billNotes = String(values.billNotes || "").trim();

    let updatedCount = 0;
    for (const row of selectedBillRows) {
      const updated = await updateReceivableInBackend(
        normalizePayoutId(row),
        {
          bill_number: billNumber,
          bill_date: billDate,
          bill_status: BILL_STATUS.OUTSTANDING,
          bill_party_name: partyName,
          bill_notes: billNotes,
          bill_generated_at: new Date().toISOString(),
        },
        {
          action: "Bill Generated",
          details: `Bill ${billNumber} generated for ${partyName} on ${dayjs(billDate).format("DD MMM YYYY")}`,
        },
        { reload: false },
      );
      if (updated) updatedCount += 1;
    }

    await loadReceivables();
    setGenerateBillModalVisible(false);
    setSelectedBillRowKeys([]);
    openBillPrintWindow({
      billNumber,
      billDate,
      partyName,
      rows: selectedBillRows,
      totalAmount: selectedBillTotal,
      notes: billNotes,
    });
    messageApi.success(`Bill generated for ${updatedCount} receivable(s)`);
  };

  const openBillReceiptFlow = (bill) => {
    const openRows = bill.rows.filter(
      (row) => getPaymentStatus(row).pendingAmount > 0,
    );
    if (!openRows.length) {
      messageApi.warning("This bill is already fully collected");
      return;
    }
    setActiveBillCollection(bill);
    setSelectedRowKeys(openRows.map((row) => normalizePayoutId(row)));
    setSelectedRows(openRows);
    const initialValues = { received_date: dayjs() };
    openRows.forEach((row) => {
      const paymentStatus = getPaymentStatus(row);
      initialValues[`amount_${normalizePayoutId(row)}`] = paymentStatus.pendingAmount;
    });
    bulkForm.setFieldsValue(initialValues);
    setBulkCollectionModalVisible(true);
    setBillManagerVisible(false);
  };

  const handleBulkCollectionSave = async () => {
    const values = await bulkForm.validateFields();
    const receivedDate = values.received_date.format("YYYY-MM-DD");
    let updatedCount = 0;
    for (const row of selectedRows) {
      const rowId = normalizePayoutId(row);
      const amountReceived = Number(values[`amount_${rowId}`] || 0);
      if (amountReceived <= 0) continue;

      const existingHistory = safeArray(row.payment_history);
      const newHistory = [
        ...existingHistory,
        {
          amount: amountReceived,
          date: receivedDate,
          remarks: "Bulk collection",
          timestamp: new Date().toISOString(),
        },
      ];
      const totalReceived = newHistory.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      );
      const expectedAmount = getExpectedAmount(row);
      const isFullyPaid = totalReceived >= expectedAmount;

      const updated = await updateReceivableInBackend(
        rowId,
        {
          payment_history: newHistory,
          payout_status: toBackendStatus(isFullyPaid ? "Received" : "Partial"),
          payout_received_date: isFullyPaid
            ? receivedDate
            : row.payout_received_date,
          ...(activeBillCollection
            ? {
                bill_status: isFullyPaid
                  ? BILL_STATUS.COLLECTED
                  : BILL_STATUS.OUTSTANDING,
                bill_received_date: isFullyPaid
                  ? receivedDate
                  : row?.bill_received_date || "",
              }
            : {}),
        },
        {
          action: isFullyPaid
            ? "Full Payment Received"
            : "Partial Payment Recorded",
          details: `Received ${formatCurrency(amountReceived)} on ${receivedDate}. Total: ${formatCurrency(totalReceived)} of ${formatCurrency(expectedAmount)}`,
        },
        { reload: false },
      );
      if (updated) updatedCount += 1;
    }

    await loadReceivables();
    setSelectedRowKeys([]);
    setSelectedRows([]);
    setBulkCollectionModalVisible(false);
    setActiveBillCollection(null);
    if (updatedCount > 0) {
      messageApi.success(`${updatedCount} receivables updated`);
    } else {
      messageApi.error("Failed to update selected receivables");
    }
  };

  /* ==============================
     Single Partial Payment
  ============================== */
  const openPartialPaymentModal = (record) => {
    setCurrentRecord(record);
    const paymentStatus = getPaymentStatus(record);

    partialPaymentForm.setFieldsValue({
      payment_amount: paymentStatus.pendingAmount,
      payment_date: dayjs(),
    });

    setPartialPaymentModalVisible(true);
  };

  const handlePartialPaymentSave = async () => {
    const values = await partialPaymentForm.validateFields();
    const payment = {
      amount: values.payment_amount,
      date: values.payment_date.format("YYYY-MM-DD"),
      remarks: values.payment_remarks || "",
      timestamp: new Date().toISOString(),
    };

    const existingHistory = safeArray(currentRecord.payment_history);
    const newHistory = [...existingHistory, payment];

    const totalReceived = newHistory.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    const expectedAmount = getExpectedAmount(currentRecord);
    const isFullyPaid = totalReceived >= expectedAmount;

    const updated = await updateReceivableInBackend(
      normalizePayoutId(currentRecord),
      {
        payment_history: newHistory,
        payout_status: toBackendStatus(isFullyPaid ? "Received" : "Partial"),
        payout_received_date: isFullyPaid
          ? values.payment_date.format("YYYY-MM-DD")
          : currentRecord.payout_received_date,
      },
      {
        action: isFullyPaid
          ? "Full Payment Received"
          : "Partial Payment Recorded",
        details: `Received ${formatCurrency(payment.amount)} on ${payment.date}. Total: ${formatCurrency(totalReceived)} of ${formatCurrency(expectedAmount)}`,
      },
    );
    if (!updated) return;

    setPartialPaymentModalVisible(false);
    messageApi.success(
      isFullyPaid
        ? "Payment complete!"
        : "Partial payment recorded successfully",
    );
  };

  const openTimelineModal = (record) => {
    setCurrentRecord(record);
    setTimelineModalVisible(true);
  };

  const handleExport = () => {
    if (!filteredRows.length) {
      messageApi.warning("No rows to export");
      return;
    }

    const exportData = filteredRows.map((r) => {
      const paymentStatus = getPaymentStatus(r);
      return {
        "Payout ID": r.payoutId,
        "Loan ID": r.loanId,
        "Customer Name": r.customerName,
        "Bank/Party": r.payout_party_name,
        Type: r.payout_type,
        "Expected Amount": paymentStatus.expectedAmount,
        "Amount Received": paymentStatus.totalReceived,
        "Pending Amount": paymentStatus.pendingAmount,
        Status: toUiStatus(r.payout_status, paymentStatus),
        "Bill Number": getBillNumber(r) || "-",
        "Bill Status": getBillNumber(r)
          ? isBillCollected(r)
            ? BILL_STATUS.COLLECTED
            : BILL_STATUS.OUTSTANDING
          : "-",
        "Days Pending":
          calculateDaysPending(r.payout_received_date, r.created_date) || "-",
        "Received Date": r.payout_received_date || "-",
      };
    });

    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(","),
      ...exportData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Collections_${dayjs().format("YYYY-MM-DD")}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    messageApi.success("Data exported to CSV successfully");
  };

  const getRowKey = (record) =>
    String(record?.payoutId || record?.id || "").trim();

  const rowMap = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = getRowKey(row);
      if (key) map.set(key, row);
    });
    return map;
  }, [rows]);

  const applySelection = useCallback(
    (keys = []) => {
      const normalizedKeys = Array.from(
        new Set(keys.map((key) => String(key).trim()).filter(Boolean)),
      );
      setSelectedRowKeys(normalizedKeys);
      setSelectedRows(
        normalizedKeys.map((key) => rowMap.get(key)).filter(Boolean),
      );
    },
    [rowMap],
  );

  const toggleRowSelection = useCallback(
    (record, checked) => {
      const key = getRowKey(record);
      if (!key) return;
      if (checked) {
        applySelection([...selectedRowKeys, key]);
      } else {
        applySelection(selectedRowKeys.filter((item) => String(item) !== key));
      }
    },
    [applySelection, selectedRowKeys],
  );

  useEffect(() => {
    if (!selectedRowKeys.length && selectedRows.length) {
      setSelectedRows([]);
      return;
    }
    if (!selectedRowKeys.length) return;
    const hydrated = selectedRowKeys
      .map((key) => rowMap.get(String(key)))
      .filter(Boolean);
    if (hydrated.length !== selectedRows.length) {
      setSelectedRows(hydrated);
    }
  }, [rowMap, selectedRowKeys, selectedRows.length]);

  const selectedKeySet = useMemo(
    () => new Set(selectedRowKeys.map((key) => String(key).trim())),
    [selectedRowKeys],
  );

  // icon theme map for stat cards
  const STAT_ICON_THEMES = {
    total: {
      bg: "bg-sky-50 dark:bg-sky-950/40",
      text: "text-sky-600 dark:text-sky-400",
      value: "text-sky-700 dark:text-sky-300",
    },
    collected: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-600 dark:text-emerald-400",
      value: "text-emerald-700 dark:text-emerald-300",
    },
    pending: {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-600 dark:text-amber-400",
      value: "text-amber-700 dark:text-amber-300",
    },
    overdue: {
      bg: "bg-rose-50 dark:bg-rose-950/40",
      text: "text-rose-600 dark:text-rose-400",
      value: "text-rose-700 dark:text-rose-300",
    },
  };

  const renderBankBreakupContent = useCallback((record) => {
    const payoutPercent = parsePercent(record?.payout_percentage);
    const grossPayout = Number(record?.payout_amount || 0);
    const tdsAmount = Number(record?.tds_amount || 0);
    const netReceivable = getExpectedAmount(record);
    const inferredLoanAmount =
      payoutPercent > 0
        ? Number(((grossPayout * 100) / payoutPercent).toFixed(2))
        : 0;

    return (
      <>
        <PopupSection title="Bank Payout Formula" tone="blue">
          <PopupRow
            label="Loan Amount"
            value={formatCurrency(inferredLoanAmount)}
            tone="accent"
          />
          <PopupRow
            label="Payout %"
            value={`${payoutPercent.toFixed(payoutPercent % 1 ? 2 : 0)}%`}
          />
          <PopupRow
            label="Total Payout"
            value={formatCurrency(grossPayout)}
          />
          <PopupRow label="TDS Amount" value={formatCurrency(tdsAmount)} />
          <PopupRow
            label="Net Receivable"
            value={formatCurrency(netReceivable)}
            tone="positive"
          />
        </PopupSection>
      </>
    );
  }, []);

  const renderShowroomLedgerPopupContent = useCallback(
    (record) => {
      const rowKey = normalizePayoutId(record);
      const loading = Boolean(ledgerLoadingByRow[rowKey]);
      const error = ledgerErrorByRow[rowKey];
      const detail = ledgerDetailsByRow[rowKey];
      const activeView = showroomPopupViewByRow[rowKey] || "summary";

      if (loading) {
        return <PopupEmptyState label="Loading showroom ledger..." />;
      }

      if (error) {
        return <PopupEmptyState label={error} />;
      }

      const snapshot = detail?.snapshot;
      const ss = snapshot?.showroomSummary || {};
      const payment = snapshot?.normalizedPayment || detail?.payment || {};
      const showroomRows = safeArray(payment?.showroomRows);
      const payments = showroomRows
        .filter((entry) => Number(entry?.paymentAmount || 0) > 0)
        .map((entry, index) => ({
          key: `${rowKey}-showroom-${index}`,
          date: dayjs(
            entry?.paymentDate || entry?.updatedAt || entry?.createdAt,
          ).isValid()
            ? dayjs(
                entry?.paymentDate || entry?.updatedAt || entry?.createdAt,
              ).format("DD-MM-YY")
            : "—",
          label:
            `${entry?.paymentType || "Payment"} · ` +
            `${entry?.paymentMadeBy || "NA"} · ` +
            `${entry?.paymentMode || "NA"}`,
          amount: Number(entry?.paymentAmount || 0),
          ts:
            new Date(
              entry?.paymentDate || entry?.updatedAt || entry?.createdAt || 0,
            ).getTime() || 0,
        }))
        .sort((a, b) => a.ts - b.ts);
      const doRec = detail?.doRec || {};
      const onRoadBreakup = buildOnRoadBreakup(doRec);
      if (activeView === "onRoad") {
        return (
          <>
            <PopupSection title="Additions" tone="blue">
              {onRoadBreakup.additions.map((item) => (
                <PopupRow
                  key={`${rowKey}-add-${item.label}`}
                  label={item.label}
                  value={formatCurrency(item.value)}
                />
              ))}
              <PopupRow
                label="Total Additions"
                value={formatCurrency(onRoadBreakup.additionsTotal)}
                tone="positive"
              />
            </PopupSection>
            <PopupSection title="Discounts" tone="rose">
              {onRoadBreakup.discounts.map((item) => (
                <PopupRow
                  key={`${rowKey}-disc-${item.label}`}
                  label={item.label}
                  value={formatCurrency(item.value)}
                />
              ))}
              <PopupRow
                label="Total Discounts"
                value={formatCurrency(onRoadBreakup.discountTotal)}
                tone="danger"
              />
            </PopupSection>
            <PopupRow
              label="Net On-road (DO)"
              value={formatCurrency(onRoadBreakup.net)}
              tone="accent"
            />
          </>
        );
      }

      if (activeView === "payments") {
        return (
          <>
            {payments.length ? (
              payments.map((event, index) => (
                <PopupLedgerEntry
                  key={event.key}
                  index={index}
                  label={event.label}
                  date={event.date}
                  amount={event.amount}
                />
              ))
            ) : (
              <PopupEmptyState label="No payment entries yet." />
            )}
            <PopupRow
              label="Total Payments"
              value={formatCurrency(ss.totalPaidToShowroom)}
              tone="positive"
            />
          </>
        );
      }

      if (activeView === "netPayable") {
        return (
          <>
            <PopupRow
              label="On-road vehicle cost"
              value={formatCurrency(ss.netOnRoad)}
              tone="accent"
              valueAction={() =>
                setShowroomPopupViewByRow((prev) => ({
                  ...prev,
                  [rowKey]: "onRoad",
                }))
              }
            />
            <PopupRow
              label="Less: Insurance adjustment"
              value={formatCurrency(ss.insAdjApplied)}
            />
            <PopupRow
              label="Less: Exchange adjustment"
              value={formatCurrency(ss.exAdjApplied)}
            />
            <PopupRow
              label="Cross adjustment net"
              value={formatCurrency(ss.crossAdjNet)}
            />
            <PopupRow
              label="Net Payable to Showroom"
              value={formatCurrency(ss.netPayableToShowroom)}
              tone="positive"
            />
          </>
        );
      }

      return (
        <div className="grid gap-4 py-1">
          <button
            type="button"
            className="w-full border-0 bg-transparent p-0 text-left"
            onClick={(event) => {
              event.stopPropagation();
              setShowroomPopupViewByRow((prev) => ({
                ...prev,
                [rowKey]: "netPayable",
              }));
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Net Payable
                </div>
              </div>
              <div
                className="inline-flex items-center gap-1 whitespace-nowrap text-[14px] font-black text-blue-700 dark:text-blue-300"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatCurrency(ss.netPayableToShowroom)}
                {interactiveArrow}
              </div>
            </div>
          </button>

          <button
            type="button"
            className="w-full border-0 bg-transparent p-0 text-left"
            onClick={(event) => {
              event.stopPropagation();
              setShowroomPopupViewByRow((prev) => ({
                ...prev,
                [rowKey]: "payments",
              }));
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Payments
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {payments.length} entries
                </div>
              </div>
              <div
                className="inline-flex items-center gap-1 whitespace-nowrap text-[14px] font-black text-emerald-700 dark:text-emerald-300"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatCurrency(ss.totalPaidToShowroom)}
                {interactiveArrow}
              </div>
            </div>
          </button>

        </div>
      );
    },
    [ledgerDetailsByRow, ledgerErrorByRow, ledgerLoadingByRow, showroomPopupViewByRow],
  );

  const renderReceivableInsight = useCallback(
    (record, { mobile = false } = {}) => {
      const paymentStatus = getPaymentStatus(record);
      const rowKey = normalizePayoutId(record);
      const bankPopupKey = `${rowKey}:bankBreakup`;
      const ledgerPopupKey = `${rowKey}:showroomLedger`;

      if (isBankReceivableRecord(record)) {
        const payoutPercent = parsePercent(record?.payout_percentage);

        return (
          <div className={mobile ? "space-y-1.5" : "space-y-1"}>
            <MiniMetric
              label="Net Receivable"
              value={formatCurrency(paymentStatus.expectedAmount)}
              tone="blue"
              helpText={
                payoutPercent > 0
                  ? `${payoutPercent.toFixed(payoutPercent % 1 ? 2 : 0)}% payout`
                  : "Bank payout"
              }
              popupTitle="Bank Payout Calculation"
              popupSubtitle={record?.payout_party_name || "Receivable formula"}
              popupContent={renderBankBreakupContent(record)}
              popupOpen={openInsightPopupKey === bankPopupKey}
              onPopupOpenChange={(nextOpen) =>
                setOpenInsightPopupKey(nextOpen ? bankPopupKey : null)
              }
              onPopupClose={closeInsightPopups}
              popupWidth={mobile ? 320 : 360}
            />

            {paymentStatus.isFullyPaid && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                Fully Collected
              </div>
            )}
            <Progress
              percent={Math.round(paymentStatus.percentageReceived)}
              size="small"
              strokeColor={
                paymentStatus.isFullyPaid ? "#16a34a" : "#2563eb"
              }
              showInfo={false}
            />
          </div>
        );
      }

      if (isShowroomCommissionRecord(record)) {
        const activeView = showroomPopupViewByRow[rowKey] || "summary";
        const popupTitle =
          activeView === "onRoad"
            ? "On-road Cost Breakup"
            : activeView === "netPayable"
              ? "Net Payable Calculation"
              : activeView === "payments"
                ? "Payments Breakup"
                : "Showroom Ledger";
        const popupSubtitle =
          activeView === "onRoad"
            ? "Additions, discounts and net on-road"
            : activeView === "netPayable"
              ? "Showroom account formula"
              : activeView === "payments"
                ? "Oldest entry shown first"
                : record?.payout_party_name || "Commission collections";
        const popupBackAction =
          activeView === "onRoad"
            ? () =>
                setShowroomPopupViewByRow((prev) => ({
                  ...prev,
                  [rowKey]: "netPayable",
                }))
            : activeView === "netPayable" || activeView === "payments"
              ? () =>
                  setShowroomPopupViewByRow((prev) => ({
                    ...prev,
                    [rowKey]: "summary",
                  }))
              : null;

        return (
          <div className={mobile ? "space-y-1.5" : "space-y-1"}>
            <MiniMetric
              label="Net Receivable"
              value={formatCurrency(paymentStatus.expectedAmount)}
              tone="green"
              helpText="Showroom ledger"
              popupTitle={popupTitle}
              popupSubtitle={popupSubtitle}
              popupContent={renderShowroomLedgerPopupContent(record)}
              popupOpen={openInsightPopupKey === ledgerPopupKey}
              onPopupOpenChange={(nextOpen) => {
                if (nextOpen) {
                  setOpenInsightPopupKey(ledgerPopupKey);
                  setShowroomPopupViewByRow((prev) => ({
                    ...prev,
                    [rowKey]: "summary",
                  }));
                  loadLedgerDetailsForRow(record);
                } else {
                  setOpenInsightPopupKey(null);
                }
              }}
              onPopupClose={closeInsightPopups}
              popupBackAction={popupBackAction}
              popupWidth={mobile ? 336 : 410}
            />
            <Progress
              percent={Math.round(paymentStatus.percentageReceived)}
              size="small"
              strokeColor={
                paymentStatus.isFullyPaid ? "#16a34a" : "#2563eb"
              }
              showInfo={false}
            />
          </div>
        );
      }

      return (
        <div className={mobile ? "space-y-1.5" : "space-y-1"}>
          <div
            className={`font-bold text-slate-900 dark:text-slate-100 ${
              mobile ? "text-sm" : "text-base"
            }`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatCurrency(paymentStatus.expectedAmount)}
          </div>
          {Number(record.tds_amount || 0) > 0 && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              TDS: {formatCurrency(record.tds_amount)}
            </div>
          )}
          <Progress
            percent={Math.round(paymentStatus.percentageReceived)}
            size="small"
            strokeColor={
              paymentStatus.isFullyPaid ? "#16a34a" : "#2563eb"
            }
            showInfo={false}
          />
        </div>
      );
    },
    [
      closeInsightPopups,
      loadLedgerDetailsForRow,
      openInsightPopupKey,
      renderBankBreakupContent,
      renderShowroomLedgerPopupContent,
    ],
  );

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 dark:bg-[#171717] md:px-6 md:py-6">
      {messageContextHolder}
      <div className="mx-auto w-full max-w-[1700px] space-y-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-[#2a2a2a] dark:bg-[#1f1f1f] md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-[#262626] dark:text-slate-300">
                <DollarOutlined style={{ fontSize: 11 }} />
                Unified Receivables
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50 md:text-2xl">
                Collections Dashboard
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 md:text-sm">
                Loan, commission, and insurance receivables with full payment
                tracking.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={openGenerateBillModal}>Generate Bill</Button>
              <Button onClick={() => setBillManagerVisible(true)}>
                Manage Bills
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                Export
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadReceivables}>
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => {
            const theme = STAT_ICON_THEMES[stat.id] || STAT_ICON_THEMES.total;
            return (
              <div
                key={stat.id}
                className="relative rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-[#2b2b2b] dark:bg-[#1f1f1f]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                      {stat.label}
                    </p>
                    <p
                      className={`text-2xl font-black leading-none tabular-nums md:text-3xl ${theme.value}`}
                    >
                      {stat.value}
                    </p>
                    {stat.subtext && (
                      <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                        {stat.subtext}
                      </p>
                    )}
                  </div>
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.bg}`}
                  >
                    <span className={`text-lg ${theme.text}`}>{stat.icon}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {bankSummary.length > 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#1f1f1f]">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Party-wise Pending Summary
            </h3>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              {bankSummary.slice(0, 8).map((bank, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-[#303030] dark:bg-[#262626]"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {bank.bank}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {bank.count} items
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(bank.pending)}
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(bank.collected)} ✓
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#1f1f1f]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            <div className="xl:col-span-2">
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search by Loan ID, Customer, Bank..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="middle"
                className="[&.ant-input-affix-wrapper]:!h-10 [&_.ant-input]:!text-sm"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              size="large"
              className="w-full"
              allowClear
            >
              <Option value="All">All Status</Option>
              <Option value="Pending">Pending</Option>
              <Option value="Partial">Partial</Option>
              <Option value="Received">Received</Option>
            </Select>
            <Select
              value={ageFilter}
              onChange={handleAgeFilterChange}
              size="large"
              className="w-full"
              allowClear
            >
              <Option value="All">All Ages</Option>
              <Option value="0-7">0-7 days</Option>
              <Option value="8-15">8-15 days</Option>
              <Option value="16-30">16-30 days</Option>
              <Option value="30+">30+ days</Option>
            </Select>
            <Select
              value={bankFilter}
              onChange={handleBankFilterChange}
              size="large"
              className="w-full"
              showSearch
              allowClear
            >
              <Option value="All">All Parties</Option>
              {bankOptions.map((b) => (
                <Option key={b} value={b}>
                  {b}
                </Option>
              ))}
            </Select>
            <Select
              value={amountRangeFilter}
              onChange={handleAmountRangeFilterChange}
              size="large"
              className="w-full"
              allowClear
            >
              <Option value="All">All Amounts</Option>
              <Option value="0-50k">0 - 50K</Option>
              <Option value="50k-1L">50K - 1L</Option>
              <Option value="1L-5L">1L - 5L</Option>
              <Option value="5L+">5L+</Option>
            </Select>
            <Select
              value={billFilter}
              onChange={(value) => setBillFilter(value || "All")}
              size="large"
              className="w-full"
              allowClear
            >
              <Option value="All">All Billing</Option>
              <Option value="Outstanding Bills">Outstanding Bills</Option>
              <Option value="Collected Bills">Collected Bills</Option>
              <Option value="Unbilled">Unbilled</Option>
            </Select>
          </div>
          {(statusFilter !== "All" ||
            bankFilter !== "All" ||
            searchText ||
            ageFilter !== "All" ||
            amountRangeFilter !== "All" ||
            billFilter !== "All") && (
            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-[#262626]">
              <Button
                onClick={() => {
                  setStatusFilter("All");
                  setBankFilter("All");
                  setSearchText("");
                  setAgeFilter("All");
                  setAmountRangeFilter("All");
                  setBillFilter("All");
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>

        {selectedRows.length > 0 && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-800/40 dark:bg-teal-950/20">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">
                {selectedRows.length} receivable
                {selectedRows.length > 1 ? "s" : ""} selected
              </span>
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    setSelectedRowKeys([]);
                    setSelectedRows([]);
                  }}
                >
                  Clear Selection
                </Button>
                <Button size="small" onClick={openGenerateBillModal}>
                  Generate Bill
                </Button>
                <Button
                  type="primary"
                  size="small"
                  icon={<DollarOutlined />}
                  style={{ background: "#0d9488", borderColor: "#0d9488" }}
                  onClick={openBulkCollectionModal}
                >
                  Record Collections
                </Button>
              </Space>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-[#2b2b2b] dark:bg-[#1f1f1f]">
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-[#262626] dark:bg-[#1a1a1a]">
            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
              <span className="mr-1 font-medium text-slate-500 dark:text-slate-400">
                Showing:
              </span>
              <Tag color="blue" style={{ margin: 0 }}>
                {filteredSubtotals.rowCount} rows
              </Tag>
              <Tag color="geekblue" style={{ margin: 0 }}>
                {filteredSubtotals.partyCount} parties
              </Tag>
              <Tag color="green">
                Received: {formatCurrency(filteredSubtotals.received)}
              </Tag>
              <Tag color="orange">
                Pending: {formatCurrency(filteredSubtotals.pending)}
              </Tag>
              <Tag color="purple">
                Expected: {formatCurrency(filteredSubtotals.expected)}
              </Tag>
            </div>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {filteredRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-[#343434] dark:bg-[#232323]">
                <Empty description="No receivables found for current filters" />
              </div>
            ) : (
              filteredRows.map((record) => {
                const rowKey = getRowKey(record);
                const paymentStatus = getPaymentStatus(record);
                const uiStatus = toUiStatus(
                  record.payout_status,
                  paymentStatus,
                );
                const days = calculateDaysPending(
                  record.payout_received_date,
                  record.created_date,
                );
                const agingColor =
                  days === null
                    ? "default"
                    : days <= 7
                      ? "blue"
                      : days <= 15
                        ? "orange"
                        : "red";
                return (
                  <div
                    key={rowKey}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-[#343434] dark:bg-[#232323]"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selectedKeySet.has(rowKey)}
                          disabled={paymentStatus.isFullyPaid}
                          onChange={(e) =>
                            toggleRowSelection(record, e.target.checked)
                          }
                        />
                        <div className="flex items-start gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-[#27272a] dark:text-slate-200">
                            {getInitials(record.customerName)}
                          </div>
                          <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {record.customerName}
                          </div>
                          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            {record.loanId}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {isBankReceivableRecord(record)
                              ? `Disbursement ${formatShortDate(record.disbursementDate)}`
                              : isShowroomCommissionRecord(record)
                                ? `Delivery ${formatShortDate(record.deliveryDate)}`
                                : "—"}
                          </div>
                          <div className="mt-0.5 inline-block rounded bg-slate-100/40 px-1 py-0.5 text-[10px] font-mono text-slate-400 dark:bg-[#2a2a2a] dark:text-slate-500">
                            {record.payoutId}
                          </div>
                          {getBillNumber(record) ? (
                            <div className="mt-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              Bill {getBillNumber(record)}
                            </div>
                          ) : null}
                          </div>
                        </div>
                      </div>
                      <Tag
                        color={
                          uiStatus === "Received"
                            ? "success"
                            : uiStatus === "Partial"
                              ? "warning"
                              : "default"
                        }
                      >
                        {uiStatus}
                      </Tag>
                      {getBillNumber(record) ? (
                        <Tag
                          color={
                            isBillCollected(record) ? "success" : "processing"
                          }
                        >
                          {isBillCollected(record)
                            ? "Bill Collected"
                            : "Bill Generated"}
                        </Tag>
                      ) : null}
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-[#1b1b1b]">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Party
                        </div>
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                          {record.payout_party_name || "-"}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-[#1b1b1b]">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Amount
                        </div>
                        <div className="pt-1">
                          {renderReceivableInsight(record, { mobile: true })}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-[#1b1b1b]">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Received
                        </div>
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(paymentStatus.totalReceived)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-[#1b1b1b]">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Pending
                        </div>
                        <div className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                          {formatCurrency(paymentStatus.pendingAmount)}
                        </div>
                      </div>
                    </div>

                    <div className="mb-2 flex items-center justify-between">
                      <Tag color={agingColor}>
                        {days === null ? "Collected" : `${days} days`}
                      </Tag>
                      {safeArray(record.activity_log).length > 0 && (
                        <Tag color="geekblue">
                          Activity {safeArray(record.activity_log).length}
                        </Tag>
                      )}
                    </div>

                    <DatePicker
                      size="small"
                      value={
                        record.payout_received_date
                          ? dayjs(record.payout_received_date)
                          : null
                      }
                      onChange={(_date, dateString) =>
                        updateReceivableInBackend(
                          normalizePayoutId(record),
                          {
                            payout_received_date: dateString,
                            payout_status: dateString ? "Received" : "Expected",
                          },
                          dateString
                            ? {
                                action: "Received Date Set",
                                details: `Date: ${dateString}`,
                              }
                            : null,
                        )
                      }
                      style={{
                        width: "100%",
                        marginBottom: 8,
                        ...(record.payout_received_date
                          ? {
                              borderColor: "#16a34a",
                              background: "#f0fdf4",
                              color: "#16a34a",
                            }
                          : {}),
                      }}
                      format="DD-MM-YYYY"
                      placeholder="Not received"
                      disabled={paymentStatus.isFullyPaid}
                    />

                    <div className="flex flex-wrap gap-2">
                      {safeArray(record.payment_history).length > 0 && (
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openPaymentHistoryModal(record)}
                        >
                          Payments ({safeArray(record.payment_history).length})
                        </Button>
                      )}
                      <Button
                        size="small"
                        icon={<HistoryOutlined />}
                        onClick={() => openTimelineModal(record)}
                      >
                        Timeline
                      </Button>
                      {!paymentStatus.isFullyPaid && (
                        <Button
                          size="small"
                          type="default"
                          icon={<DollarOutlined />}
                          onClick={() => openPartialPaymentModal(record)}
                          style={{
                            background: "#f0fdfa",
                            borderColor: "#99f6e4",
                            color: "#0f766e",
                          }}
                        >
                          Record
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden md:block">
            {filteredRows.length === 0 ? (
              <div className="m-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center dark:border-[#343434] dark:bg-[#232323]">
                <Empty description="No receivables found for current filters" />
              </div>
            ) : (
              <div className="space-y-3 p-3">
                {pagedDesktopRows.map((record) => {
                  const rowKey = getRowKey(record);
                  const paymentStatus = getPaymentStatus(record);
                  const uiStatus = toUiStatus(
                    record.payout_status,
                    paymentStatus,
                  );
                  const days = calculateDaysPending(
                    record.payout_received_date,
                    record.created_date,
                  );
                  const agingColor =
                    days === null
                      ? "default"
                      : days <= 7
                        ? "blue"
                        : days <= 15
                          ? "orange"
                          : "red";

                  return (
                    <div
                      key={rowKey}
                    className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-[#2b2b2b] dark:bg-[#1f1f1f]"
                    >
                      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-[#2a2a2a]">
                        <Checkbox
                          checked={selectedKeySet.has(rowKey)}
                          disabled={paymentStatus.isFullyPaid}
                          onChange={(e) =>
                            toggleRowSelection(record, e.target.checked)
                          }
                        />
                        <Tag
                          color={
                            uiStatus === "Received"
                              ? "success"
                              : uiStatus === "Partial"
                                ? "warning"
                                : "default"
                          }
                        >
                          {uiStatus}
                        </Tag>
                        {getBillNumber(record) ? (
                          <Tag
                            color={
                              isBillCollected(record) ? "success" : "processing"
                            }
                          >
                            {isBillCollected(record)
                              ? "Bill Collected"
                              : "Bill Generated"}
                          </Tag>
                        ) : null}
                        <Tag color={agingColor}>
                          {days === null ? "Collected" : `${days} days`}
                        </Tag>
                        <Tag
                          color={
                            isBankReceivableRecord(record)
                              ? "blue"
                              : isShowroomCommissionRecord(record)
                                ? "green"
                                : "default"
                          }
                        >
                          {isShowroomCommissionRecord(record)
                            ? "Showroom Commission"
                            : record.payout_type || "Receivable"}
                        </Tag>
                        <div className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
                          Created {dayjs(record.created_date).isValid()
                            ? dayjs(record.created_date).format("DD MMM YYYY")
                            : "—"}
                        </div>
                      </div>

                      <div className="grid gap-4 px-4 py-4 xl:grid-cols-[1.7fr_0.78fr_0.72fr]">
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 dark:bg-[#27272a] dark:text-slate-200">
                              {getInitials(record.customerName)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                {record.customerName}
                              </div>
                              <div className="mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                                {record.loanId}
                              </div>
                              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                {isBankReceivableRecord(record)
                                  ? `Disbursement ${formatShortDate(record.disbursementDate)}`
                                  : isShowroomCommissionRecord(record)
                                    ? `Delivery ${formatShortDate(record.deliveryDate)}`
                                    : "—"}
                              </div>
                              <div className="mt-1 inline-block rounded bg-slate-100/40 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:bg-[#2a2a2a] dark:text-slate-500">
                                {record.payoutId}
                              </div>
                              {getBillNumber(record) ? (
                                <div className="mt-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                  Bill {getBillNumber(record)}
                                </div>
                              ) : null}
                            </div>
                            </div>

                            <div className="min-w-[180px] text-right">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                Party
                              </div>
                              <div className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                                {record.payout_party_name || "-"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {isBankReceivableRecord(record)
                                  ? "Bank payout receivable"
                                  : isShowroomCommissionRecord(record)
                                    ? "Showroom commission ledger"
                                    : "Receivable ledger"}
                              </div>
                            </div>
                          </div>

                        </div>

                        <div className="min-w-0 border-t border-slate-100 pt-4 dark:border-[#2a2a2a] xl:border-t-0 xl:border-l xl:pl-5 xl:pt-0">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                            Collections Insight
                          </div>
                          <div className="mt-3">{renderReceivableInsight(record)}</div>
                        </div>

                        <div className="min-w-0 border-t border-slate-100 pt-4 dark:border-[#2a2a2a] xl:border-t-0 xl:border-l xl:pl-5 xl:pt-0">
                          <div className="grid gap-4">
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                Received Date
                              </div>
                              <DatePicker
                                size="small"
                                value={
                                  record.payout_received_date
                                    ? dayjs(record.payout_received_date)
                                    : null
                                }
                                onChange={(_date, dateString) =>
                                  updateReceivableInBackend(
                                    normalizePayoutId(record),
                                    {
                                      payout_received_date: dateString,
                                      payout_status: dateString
                                        ? "Received"
                                        : "Expected",
                                    },
                                    dateString
                                      ? {
                                          action: "Received Date Set",
                                          details: `Date: ${dateString}`,
                                        }
                                      : null,
                                  )
                                }
                                style={{
                                  width: "100%",
                                  marginTop: 8,
                                  ...(record.payout_received_date
                                    ? {
                                        borderColor: "#16a34a",
                                        background: "#f0fdf4",
                                        color: "#16a34a",
                                      }
                                    : {}),
                                }}
                                format="DD-MM-YYYY"
                                placeholder="Not received"
                                disabled={paymentStatus.isFullyPaid}
                              />
                            </div>

                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                Quick Actions
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {safeArray(record.payment_history).length > 0 && (
                                  <Button
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => openPaymentHistoryModal(record)}
                                  >
                                    Payments ({safeArray(record.payment_history).length})
                                  </Button>
                                )}
                                <Button
                                  size="small"
                                  icon={<HistoryOutlined />}
                                  onClick={() => openTimelineModal(record)}
                                >
                                  Timeline
                                </Button>
                                {!paymentStatus.isFullyPaid && (
                                  <Button
                                    size="small"
                                    type="default"
                                    icon={<DollarOutlined />}
                                    onClick={() => openPartialPaymentModal(record)}
                                    style={{
                                      background: "#f0fdfa",
                                      borderColor: "#99f6e4",
                                      color: "#0f766e",
                                    }}
                                  >
                                    Record
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-[#2a2a2a] dark:bg-[#181818] md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    Showing{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {pagedDesktopRows.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {filteredRows.length}
                    </span>{" "}
                    receivables
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Select
                      value={String(desktopPageSize)}
                      size="middle"
                      style={{ width: 100 }}
                      onChange={(value) => setDesktopPageSize(Number(value))}
                    >
                      {["10", "15", "25", "50"].map((opt) => (
                        <Option key={opt} value={opt}>
                          {opt} / page
                        </Option>
                      ))}
                    </Select>

                    <div className="flex items-center gap-2">
                      <Button
                        size="small"
                        disabled={desktopPage <= 1}
                        onClick={() =>
                          setDesktopPage((prev) => Math.max(1, prev - 1))
                        }
                      >
                        Previous
                      </Button>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {desktopPage} / {desktopTotalPages}
                      </div>
                      <Button
                        size="small"
                        disabled={desktopPage >= desktopTotalPages}
                        onClick={() =>
                          setDesktopPage((prev) =>
                            Math.min(desktopTotalPages, prev + 1),
                          )
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        title="Generate Bill"
        open={generateBillModalVisible}
        onOk={handleGenerateBill}
        onCancel={() => {
          setGenerateBillModalVisible(false);
          setSelectedBillRowKeys([]);
          setBillPartyFilter("");
        }}
        width={880}
        okText="Generate & Download"
      >
        <Form form={billForm} layout="vertical">
          <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr_0.8fr]">
            <Form.Item label="Party" required>
              <Select
                value={billPartyFilter || undefined}
                onChange={(value) => {
                  setBillPartyFilter(value || "");
                  setSelectedBillRowKeys([]);
                }}
                placeholder="Select party"
                showSearch
                allowClear
                size="large"
              >
                {billPartyOptions.map((party) => (
                  <Option key={party} value={party}>
                    {party}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="billNumber"
              label="Bill Number"
              rules={[{ required: true, message: "Please enter bill number" }]}
            >
              <Input
                size="large"
                addonAfter={
                  <Button
                    type="text"
                    size="small"
                    onClick={() =>
                      billForm.setFieldValue("billNumber", generateBillNumber())
                    }
                  >
                    Refresh
                  </Button>
                }
              />
            </Form.Item>

            <Form.Item
              name="billDate"
              label="Bill Date"
              rules={[{ required: true, message: "Please select bill date" }]}
            >
              <DatePicker style={{ width: "100%" }} size="large" format="DD MMM YYYY" />
            </Form.Item>
          </div>

          <Form.Item name="billNotes" label="Bill Notes (optional)">
            <Input.TextArea
              rows={2}
              placeholder="Short note for the party or internal remark"
            />
          </Form.Item>

          <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#333] dark:bg-[#262626]">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Selected Receivables
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                {selectedBillRows.length} case{selectedBillRows.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Bill Total
              </div>
              <div className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(selectedBillTotal)}
              </div>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Outstanding receivables for billing
            </div>
            <Button
              size="small"
              disabled={!availableBillRows.length}
              onClick={() =>
                setSelectedBillRowKeys(
                  availableBillRows.map((row) => normalizePayoutId(row)),
                )
              }
            >
              Select All
            </Button>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {!billPartyFilter ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-[#333] dark:bg-[#232323] dark:text-slate-400">
                Select a party to see outstanding receivables.
              </div>
            ) : availableBillRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-[#333] dark:bg-[#232323] dark:text-slate-400">
                No unbilled outstanding receivables for this party.
              </div>
            ) : (
              availableBillRows.map((row) => {
                const rowKey = normalizePayoutId(row);
                const paymentStatus = getPaymentStatus(row);
                const checked = selectedBillRowKeys.includes(rowKey);
                return (
                  <label
                    key={rowKey}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#333] dark:bg-[#1f1f1f]"
                  >
                    <Checkbox
                      checked={checked}
                      onChange={(event) => {
                        setSelectedBillRowKeys((prev) => {
                          const next = new Set(prev);
                          if (event.target.checked) next.add(rowKey);
                          else next.delete(rowKey);
                          return Array.from(next);
                        });
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {row.customerName}
                          </div>
                          <div className="mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                            {row.loanId} · {row.payoutId}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                            Pending
                          </div>
                          <div className="mt-1 text-base font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(paymentStatus.pendingAmount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </Form>
      </Modal>

      <Modal
        title="Manage Bills"
        open={billManagerVisible}
        onCancel={() => setBillManagerVisible(false)}
        footer={[
          <Button key="close" onClick={() => setBillManagerVisible(false)}>
            Close
          </Button>,
        ]}
        width={920}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {["All", BILL_STATUS.OUTSTANDING, BILL_STATUS.COLLECTED].map((item) => (
            <Button
              key={item}
              type={billManagerStatusFilter === item ? "primary" : "default"}
              onClick={() => setBillManagerStatusFilter(item)}
            >
              {item === "All" ? "All Bills" : item}
            </Button>
          ))}
        </div>

        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
          {filteredBills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500 dark:border-[#333] dark:bg-[#232323] dark:text-slate-400">
              No bills found for this filter.
            </div>
          ) : (
            filteredBills.map((bill) => (
              <div
                key={bill.billNumber}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#333] dark:bg-[#1f1f1f]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {bill.billNumber}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {bill.partyName} · {bill.caseCount} case{bill.caseCount === 1 ? "" : "s"} ·{" "}
                      {bill.billDate ? dayjs(bill.billDate).format("DD MMM YYYY") : "—"}
                    </div>
                    {bill.billReceivedDate ? (
                      <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        Received on {dayjs(bill.billReceivedDate).format("DD MMM YYYY")}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <Tag color={bill.status === BILL_STATUS.COLLECTED ? "success" : "processing"}>
                      {bill.status}
                    </Tag>
                    <div className="mt-2 text-lg font-black text-slate-900 dark:text-slate-100">
                      {formatCurrency(bill.expected)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Received {formatCurrency(bill.received)} · Pending {formatCurrency(bill.pending)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="small"
                    onClick={() =>
                      openBillPrintWindow({
                        billNumber: bill.billNumber,
                        billDate: bill.billDate,
                        partyName: bill.partyName,
                        rows: bill.rows,
                        totalAmount: bill.expected,
                        notes: bill.notes,
                      })
                    }
                  >
                    Download Bill
                  </Button>
                  {bill.status !== BILL_STATUS.COLLECTED ? (
                    <Button size="small" type="primary" onClick={() => openBillReceiptFlow(bill)}>
                      Record Receipt
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        title={
          activeBillCollection
            ? `Record Bill Receipt · ${activeBillCollection.billNumber}`
            : "Record Bulk Collections"
        }
        open={bulkCollectionModalVisible}
        onOk={handleBulkCollectionSave}
        onCancel={() => {
          setBulkCollectionModalVisible(false);
          setActiveBillCollection(null);
        }}
        width={700}
        okText={activeBillCollection ? "Post Bill Receipt" : "Record Payments"}
      >
        <Form form={bulkForm} layout="vertical">
          <p className="mb-4 text-gray-600">
            {activeBillCollection ? (
              <>
                Posting receipt for bill{" "}
                <strong>{activeBillCollection.billNumber}</strong> across{" "}
                <strong>{selectedRows.length}</strong> receivable(s).
              </>
            ) : (
              <>
                Recording collections for <strong>{selectedRows.length}</strong>{" "}
                receivable(s).
              </>
            )}
          </p>

          <Form.Item
            name="received_date"
            label="Collection Date"
            rules={[
              { required: true, message: "Please select collection date" },
            ]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD MMM YYYY"
              size="large"
            />
          </Form.Item>

          <Space style={{ marginBottom: 16 }} wrap>
            <Button
              size="small"
              onClick={() => bulkForm.setFieldValue("received_date", dayjs())}
            >
              Today
            </Button>
            <Button
              size="small"
              onClick={() =>
                bulkForm.setFieldValue(
                  "received_date",
                  dayjs().subtract(1, "day"),
                )
              }
            >
              Yesterday
            </Button>
            <Button
              size="small"
              onClick={() =>
                bulkForm.setFieldValue("received_date", dayjs().day(5))
              }
            >
              Last Friday
            </Button>
          </Space>

          <div className="mt-4 mb-2 font-medium text-sm">
            Enter amount received for each item:
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedRows.map((row) => {
              const paymentStatus = getPaymentStatus(row);
              const payoutRowId = normalizePayoutId(row);
              return (
                <div
                  key={payoutRowId}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#333] dark:bg-[#262626]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-sm">
                        {row.customerName}
                      </div>
                      <div className="text-xs text-gray-500">
                        Loan: {row.loanId}
                      </div>
                      <div className="text-xs text-gray-500">
                        Expected: {formatCurrency(paymentStatus.expectedAmount)}
                      </div>
                      {paymentStatus.totalReceived > 0 && (
                        <div className="text-xs text-green-600">
                          Already Received:{" "}
                          {formatCurrency(paymentStatus.totalReceived)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-orange-600">
                        Pending: {formatCurrency(paymentStatus.pendingAmount)}
                      </div>
                    </div>
                  </div>
                  <Form.Item
                    name={`amount_${payoutRowId}`}
                    rules={[
                      { required: true, message: "Required" },
                      {
                        validator: (_, value) => {
                          if (
                            value > 0 &&
                            value <= paymentStatus.pendingAmount + 100
                          ) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            new Error(
                              `Amount should not exceed ${formatCurrency(paymentStatus.pendingAmount)}`,
                            ),
                          );
                        },
                      },
                    ]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      prefix="₹"
                      placeholder="Enter amount received"
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                      min={0}
                      max={paymentStatus.pendingAmount}
                    />
                  </Form.Item>
                </div>
              );
            })}
          </div>
        </Form>
      </Modal>

      <Modal
        title="Record Payment"
        open={partialPaymentModalVisible}
        onOk={handlePartialPaymentSave}
        onCancel={() => setPartialPaymentModalVisible(false)}
        width={500}
        okText="Record Payment"
      >
        {currentRecord && (
          <Form form={partialPaymentForm} layout="vertical">
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#333] dark:bg-[#262626]">
              <div className="mb-0.5 text-xs text-slate-500">Expected Amount</div>
              <div className="text-xl font-bold tabular-nums">
                {formatCurrency(getExpectedAmount(currentRecord))}
              </div>
              {(() => {
                const paymentStatus = getPaymentStatus(currentRecord);
                if (paymentStatus.totalReceived > 0) {
                  return (
                    <>
                      <div className="text-sm text-green-600 mt-2">
                        Already Received:{" "}
                        {formatCurrency(paymentStatus.totalReceived)}
                      </div>
                      <div className="text-sm text-orange-600 font-medium">
                        Remaining: {formatCurrency(paymentStatus.pendingAmount)}
                      </div>
                    </>
                  );
                }
                return null;
              })()}
            </div>

            <Form.Item
              name="payment_amount"
              label="Payment Amount"
              rules={[
                { required: true, message: "Please enter payment amount" },
                {
                  validator: (_, value) => {
                    const paymentStatus = getPaymentStatus(currentRecord);
                    if (
                      value > 0 &&
                      value <= paymentStatus.pendingAmount + 100
                    ) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error(
                        `Amount should not exceed ${formatCurrency(paymentStatus.pendingAmount)}`,
                      ),
                    );
                  },
                },
              ]}
            >
              <InputNumber
                style={{ width: "100%" }}
                prefix="₹"
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
                size="large"
                min={0}
              />
            </Form.Item>

            <Form.Item
              name="payment_date"
              label="Payment Date"
              rules={[
                { required: true, message: "Please select payment date" },
              ]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="DD MMM YYYY"
                size="large"
              />
            </Form.Item>

            <Form.Item name="payment_remarks" label="Remarks (optional)">
              <Input.TextArea
                rows={2}
                placeholder="Payment method, reference number, etc."
              />
            </Form.Item>

            {safeArray(currentRecord.payment_history).length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">
                  Previous Payments:
                </div>
                <div className="space-y-1">
                  {currentRecord.payment_history.map((p, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-gray-600 p-2 bg-gray-50 rounded"
                    >
                      • {formatCurrency(p.amount)} on{" "}
                      {dayjs(p.date).format("DD MMM YYYY")}
                      {p.remarks && ` - ${p.remarks}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Form>
        )}
      </Modal>

      <Modal
        title="Payment History"
        open={paymentHistoryModalVisible}
        onCancel={() => setPaymentHistoryModalVisible(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setPaymentHistoryModalVisible(false)}
          >
            Close
          </Button>,
        ]}
        width={700}
      >
        {currentRecord && (
          <div>
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#333] dark:bg-[#262626]">
              <div className="font-semibold">{currentRecord.customerName}</div>
              <div className="text-sm font-mono text-slate-500">
                {currentRecord.payoutId}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Expected: {formatCurrency(getExpectedAmount(currentRecord))}
              </div>
              {(() => {
                const paymentStatus = getPaymentStatus(currentRecord);
                return (
                  <>
                    <div className="text-sm text-green-600">
                      Total Received:{" "}
                      {formatCurrency(paymentStatus.totalReceived)}
                    </div>
                    {!paymentStatus.isFullyPaid && (
                      <div className="text-sm text-orange-600 font-medium">
                        Pending: {formatCurrency(paymentStatus.pendingAmount)}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {safeArray(currentRecord.payment_history).length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No payments recorded yet
              </div>
            ) : (
              <div className="space-y-2">
                {currentRecord.payment_history.map((payment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-[#333] dark:bg-[#1f1f1f]"
                  >
                    <div>
                      <div className="font-medium">
                        {formatCurrency(payment.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Date: {dayjs(payment.date).format("DD MMM YYYY")}
                      </div>
                      {payment.remarks && (
                        <div className="text-xs text-gray-500 mt-1">
                          Remarks: {payment.remarks}
                        </div>
                      )}
                      {payment.edited_at && (
                        <div className="text-xs text-blue-500 mt-1">
                          Edited on{" "}
                          {dayjs(payment.edited_at).format("DD MMM YYYY")}
                        </div>
                      )}
                    </div>
                    <Space>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditPayment(payment, idx)}
                      />
                      <Popconfirm
                        title="Delete this payment?"
                        description="This action cannot be undone."
                        onConfirm={() => handleDeletePayment(idx)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </Space>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="Edit Payment"
        open={editPaymentModalVisible}
        onOk={handleEditPaymentSave}
        onCancel={() => setEditPaymentModalVisible(false)}
        okText="Save Changes"
      >
        <Form form={editPaymentForm} layout="vertical">
          <Form.Item
            name="payment_amount"
            label="Payment Amount"
            rules={[{ required: true, message: "Please enter payment amount" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              prefix="₹"
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
              size="large"
              min={0}
            />
          </Form.Item>

          <Form.Item
            name="payment_date"
            label="Payment Date"
            rules={[{ required: true, message: "Please select payment date" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD MMM YYYY"
              size="large"
            />
          </Form.Item>

          <Form.Item name="payment_remarks" label="Remarks">
            <Input.TextArea
              rows={2}
              placeholder="Payment method, reference number, etc."
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Activity Timeline"
        open={timelineModalVisible}
        onCancel={() => setTimelineModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTimelineModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={600}
      >
        {currentRecord && (
          <div>
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#333] dark:bg-[#262626]">
              <div className="font-semibold">{currentRecord.customerName}</div>
              <div className="text-sm font-mono text-slate-500">
                {currentRecord.payoutId}
              </div>
            </div>

            {safeArray(currentRecord.activity_log).length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No activity recorded yet
              </div>
            ) : (
              <Timeline
                items={safeArray(currentRecord.activity_log)
                  .reverse()
                  .map((log, idx) => ({
                    children: (
                      <div key={idx}>
                        <div className="font-medium text-sm">{log.action}</div>
                        <div className="text-xs text-gray-500">
                          {log.details}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {log.date}
                        </div>
                      </div>
                    ),
                    color: idx === 0 ? "blue" : "gray",
                  }))}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PayoutReceivablesDashboard;
