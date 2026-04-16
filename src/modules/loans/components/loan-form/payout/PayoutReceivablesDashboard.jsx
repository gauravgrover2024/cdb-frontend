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
import { insuranceApi } from "../../../../../api/insurance";
import { paymentsApi } from "../../../../../api/payments";
import { deliveryOrdersApi } from "../../../../../api/deliveryOrders";
import { buildPaymentCaseSnapshot } from "../../../../payments/utils/paymentCaseSnapshot";
import billLetterheadImage from "./assets/bill-letterhead.png";

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
  String(row?.payoutId || row?.id || row?._id || "").trim();

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

const addActivityLog = (existingLog, action, details) => {
  const log = safeArray(existingLog);
  return [
    ...log,
    {
      timestamp: new Date().toISOString(),
      action,
      details,
      date: dayjs().format("DD MMM YYYY, hh:mm A"),
    },
  ];
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

const EMPTY_BILL_PATCH = {
  bill_number: "",
  bill_date: "",
  bill_status: "",
  bill_party_name: "",
  bill_notes: "",
  bill_generated_at: "",
  bill_received_date: "",
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

const formatMonthLabel = (value) => {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("MMMM-YYYY") : "Unknown Month";
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
          <td>${isBankReceivableRecord(row) ? "Disbursement" : "Delivery"} ${
            isBankReceivableRecord(row)
              ? formatShortDate(row.disbursementDate)
              : formatShortDate(row.deliveryDate)
          }</td>
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
          * { box-sizing:border-box; }
          body {
            font-family: Arial, sans-serif;
            color:#0f172a;
            margin:0;
            background:#f8f7f1;
          }
          .page {
            position:relative;
            min-height:100vh;
            padding:64px 46px 110px;
          }
          .page::before {
            content:"";
            position:absolute;
            inset:0;
            background:url('${billLetterheadImage}') center top / 100% 100% no-repeat;
            pointer-events:none;
            z-index:0;
          }
          .content {
            position:relative;
            z-index:1;
            margin-top:56px;
          }
          .eyebrow {
            display:inline-flex;
            align-items:center;
            gap:8px;
            padding:8px 14px;
            border-radius:999px;
            background:#fff3bf;
            border:1px solid #facc15;
            color:#7c5d00;
            font-size:11px;
            font-weight:700;
            letter-spacing:0.04em;
          }
          .hero {
            display:grid;
            grid-template-columns:1.2fr 0.8fr;
            gap:24px;
            margin-top:18px;
            align-items:start;
          }
          .hero-title {
            font-size:34px;
            font-weight:800;
            line-height:1.08;
            color:#2f6b45;
            letter-spacing:-0.04em;
            margin:0;
          }
          .hero-copy {
            margin-top:12px;
            max-width:520px;
            color:#51606d;
            font-size:13px;
            line-height:1.55;
          }
          .pill-row {
            display:flex;
            flex-wrap:wrap;
            gap:10px;
            margin-top:18px;
          }
          .pill {
            display:inline-flex;
            align-items:center;
            border:1px solid #d8c4f2;
            background:#fbf6ff;
            color:#6b36c7;
            border-radius:16px;
            padding:10px 14px;
            font-size:12px;
            font-weight:700;
          }
          .summary-card {
            border:1px solid #ddd6fe;
            background:rgba(255,255,255,0.92);
            border-radius:24px;
            padding:18px;
            box-shadow:0 18px 38px rgba(15,23,42,0.08);
          }
          .summary-grid {
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:14px;
            margin-top:16px;
          }
          .summary-block {
            border-radius:18px;
            background:#f8fafc;
            border:1px solid #e2e8f0;
            padding:14px 16px;
          }
          .summary-label {
            font-size:10px;
            text-transform:uppercase;
            letter-spacing:0.14em;
            color:#64748b;
            font-weight:700;
          }
          .summary-value {
            margin-top:6px;
            font-size:20px;
            font-weight:800;
          }
          .section {
            position:relative;
            z-index:1;
            margin-top:22px;
            background:rgba(255,255,255,0.94);
            border:1px solid #ece7d9;
            border-radius:28px;
            padding:22px 24px;
            box-shadow:0 16px 36px rgba(15,23,42,0.06);
          }
          .section-title {
            font-size:11px;
            text-transform:uppercase;
            letter-spacing:0.16em;
            color:#64748b;
            font-weight:800;
          }
          table {
            width:100%;
            border-collapse:separate;
            border-spacing:0;
            margin-top:16px;
          }
          th, td {
            border-bottom:1px solid #e5e7eb;
            padding:12px 10px;
            font-size:12px;
            text-align:left;
            vertical-align:top;
          }
          th {
            font-size:10px;
            text-transform:uppercase;
            letter-spacing:0.12em;
            color:#64748b;
            font-weight:800;
          }
          .amount {
            text-align:right;
            font-weight:800;
            font-variant-numeric:tabular-nums;
          }
          .notes {
            margin-top:18px;
            font-size:12px;
            color:#475569;
            white-space:pre-wrap;
          }
          @media print {
            body { background:#fff; }
            .page {
              min-height:auto;
              padding:52px 34px 86px;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="content">
            <div class="eyebrow">Finance collections bill</div>
            <div class="hero">
              <div>
                <h1 class="hero-title">Receivables Bill Summary</h1>
                <div class="hero-copy">
                  Generated from outstanding collections items so your finance and showroom follow-up stays aligned with the dashboard.
                </div>
                <div class="pill-row">
                  <div class="pill">No manual invoice stitching</div>
                  <div class="pill">Party-wise tracked bill</div>
                </div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Bill reference</div>
                <div class="summary-value">${billNumber}</div>
                <div class="summary-grid">
                  <div class="summary-block">
                    <div class="summary-label">Bill date</div>
                    <div class="summary-value" style="font-size:18px;">
                      ${dayjs(billDate).isValid() ? dayjs(billDate).format("DD MMM YYYY") : "—"}
                    </div>
                  </div>
                  <div class="summary-block">
                    <div class="summary-label">Cases</div>
                    <div class="summary-value" style="font-size:18px;">${rows.length}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Party</div>
              <div style="margin-top:10px; font-size:18px; font-weight:800;">
                ${String(partyName || "-")}
              </div>
            </div>

            <div class="section">
              <div class="section-title">Bill items</div>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>Loan ID</th>
                    <th>Receivable ID</th>
                    <th>Type</th>
                    <th>Trigger</th>
                    <th style="text-align:right;">Amount</th>
                  </tr>
                </thead>
                <tbody>${lineItems}</tbody>
              </table>
            </div>

            <div class="section" style="display:flex; justify-content:flex-end;">
              <div class="summary-card" style="min-width:300px;">
                <div class="summary-label">Total bill amount</div>
                <div class="summary-value">${formatCurrency(totalAmount)}</div>
              </div>
            </div>
            ${notes ? `<div class="section"><div class="section-title">Notes</div><div class="notes">${String(notes)}</div></div>` : ""}
          </div>
        </div>
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

const isFlattenedReceivable = (obj) => {
  if (!obj) return false;
  // A flattened receivable from the 'receivables' collection has payout_direction/payout_type at the top level
  // and NO 'loan_receivables' array.
  return (
    obj.payoutId &&
    obj.payout_direction &&
    !obj.loan_receivables &&
    !obj.insurance_receivables
  );
};

const PayoutReceivablesDashboard = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [loans, setLoans] = useState([]);
  const [insuranceCases, setInsuranceCases] = useState([]);
  const [moduleFilter, setModuleFilter] = useState("All"); // "All" | "Finance" | "Insurance"
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
  const [billComposerMode, setBillComposerMode] = useState("create");
  const [editingBill, setEditingBill] = useState(null);
  const [billManagerStatusFilter, setBillManagerStatusFilter] =
    useState(BILL_STATUS.OUTSTANDING);
  const [activeBillCollection, setActiveBillCollection] = useState(null);
  const [partySummaryCollapsed, setPartySummaryCollapsed] = useState(false);
  const [billingSuggestionsCollapsed, setBillingSuggestionsCollapsed] =
    useState(false);

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

  const resetBillComposer = useCallback(() => {
    setGenerateBillModalVisible(false);
    setSelectedBillRowKeys([]);
    setBillPartyFilter("");
    setBillComposerMode("create");
    setEditingBill(null);
    billForm.resetFields();
  }, [billForm]);

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
      setLoading(true);
      let allLoans = [];
      let allInsurance = [];
      let usedFastCollectionsEndpoint = false;

      // 1. Fetch Loans & Receivables
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
        // Fallback
      }

      if (!usedFastCollectionsEndpoint) {
        const pageSize = 300;
        let skip = 0;
        let hasMore = true;
        while (hasMore) {
          const res = await loansApi.getAll({ limit: pageSize, skip, noCount: true });
          const pageLoans = safeArray(res?.data);
          allLoans.push(...pageLoans);
          hasMore = Boolean(res?.hasMore);
          skip += pageSize;
        }
      }

      // 2. Fetch Insurance Cases
      try {
        const insuranceRes = await insuranceApi.getAll({ limit: 500 });
        allInsurance = safeArray(insuranceRes?.data);
      } catch (err) {
        console.error("Failed to load insurance cases:", err);
      }

      // 3. Process Loan Sources
      const loanReceivables = allLoans.flatMap((obj) => {
        if (isFlattenedReceivable(obj)) {
          // It's already a receivable from the 'receivables' collection
          return [obj];
        }
        // It's a full Loan object
        const list = collectReceivableRows(obj);
        const derived = buildMissingBankReceivableFromDisbursedBank(obj, list);
        return (derived ? [...list, derived] : list).map((p) => ({
          ...p,
          loanId: obj.loanId || obj.id || "-",
          loanMongoId: obj._id || obj.id,
          customerName: getCustomerNameFromLoan(obj),
          dealerName: obj.dealerName || obj.delivery_dealerName || "-",
        }));
      }).map(r => ({ ...r, __sourceModule: "Finance" }));

      // 4. Process Insurance Sources
      const insuranceReceivables = allInsurance.flatMap((ic) => {
        const list = safeArray(ic.insurance_receivables || ic.receivables);
        return list.map((r) => ({
          ...r,
          __sourceModule: "Insurance",
          loanId: ic.caseId || "-",
          insuranceMongoId: ic._id,
          customerName: ic.customerName || ic.customerSnapshot?.customerName || "-",
          dealerName: ic.newInsuranceCompany || "-",
          payment_history: safeArray(r.payment_history),
          activity_log: safeArray(r.activity_log),
          created_date: r.created_date || ic.createdAt,
        }));
      });

      const combined = [...loanReceivables, ...insuranceReceivables].map(p => ({
        ...p,
        payoutId: p?.payoutId || p?.id,
        id: p?.id || p?.payoutId,
        payment_history: safeArray(p.payment_history),
        activity_log: safeArray(p.activity_log),
      })).sort((a, b) => {
        const dateA = dayjs(getCreatedDate(a) || 0);
        const dateB = dayjs(getCreatedDate(b) || 0);
        return dateB.diff(dateA);
      });

      setLoans(allLoans);
      setInsuranceCases(allInsurance);
      setRows(combined);
    } catch (err) {
      console.error("Failed to load receivables:", err);
      messageApi.error("Failed to load receivables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivables();
  }, []);

  const updateReceivableInBackend = async (
    payoutId,
    patch,
    activityAction = null,
  ) => {
    const normalizedId = String(payoutId || "").trim();
    const sourceMatch = rows.find((r) => normalizePayoutId(r) === normalizedId);
    if (!sourceMatch) return;

    const isInsurance = sourceMatch.__sourceModule === "Insurance";

    if (isInsurance) {
      const targetIc = insuranceCases.find((ic) => ic._id === sourceMatch.insuranceMongoId);
      if (!targetIc) return;

      const updatedList = safeArray(targetIc.insurance_receivables).map((p) => {
        if (normalizePayoutId(p) !== normalizedId) return p;
        const updated = { ...p, ...patch };
        if (activityAction) {
          updated.activity_log = addActivityLog(
            p.activity_log,
            activityAction.action,
            activityAction.details,
          );
        }
        return updated;
      });

      try {
        await insuranceApi.update(targetIc._id, { insurance_receivables: updatedList });
        await loadReceivables();
        messageApi.success("Insurance receivable updated");
      } catch (err) {
        console.error("Failed to update insurance receivable:", err);
        messageApi.error("Failed to update receivable");
      }
      return;
    }

    // Existing Finance (Loan) logic
    const seedRow = stripReceivableRuntimeFields(sourceMatch);
    try {
      await loansApi.updateCollectionReceivable(
        normalizedId,
        {
          loanId: sourceMatch.loanId,
          patch,
          seedRow,
          activityAction,
        },
      );
      await loadReceivables();
      messageApi.success("Receivable updated");
    } catch (err) {
      console.error("Failed to update receivable:", err);
      messageApi.error("Failed to update receivable");
    }
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
    const parties = new Set(
      rows
        .filter(isUnbilledOutstandingReceivable)
        .map((row) => String(row?.payout_party_name || "").trim())
        .filter(Boolean),
    );
    if (editingBill?.partyName) {
      parties.add(String(editingBill.partyName).trim());
    }
    return Array.from(parties).sort((a, b) => a.localeCompare(b));
  }, [editingBill, rows]);

  const billComposerRows = useMemo(() => {
    const activeBillNumber = String(editingBill?.billNumber || "").trim();
    return rows.filter((row) => {
      const sameParty =
        !billPartyFilter ||
        normalizeBankName(row?.payout_party_name) ===
          normalizeBankName(billPartyFilter);
      if (!sameParty) return false;
      if (billComposerMode === "edit" && activeBillNumber) {
        return (
          getBillNumber(row) === activeBillNumber ||
          isUnbilledOutstandingReceivable(row)
        );
      }
      return isUnbilledOutstandingReceivable(row);
    });
  }, [billComposerMode, billPartyFilter, editingBill, rows]);

  const selectedBillRows = useMemo(() => {
    const keySet = new Set(
      selectedBillRowKeys.map((key) => String(key).trim()).filter(Boolean),
    );
    return billComposerRows.filter((row) =>
      keySet.has(normalizePayoutId(row)),
    );
  }, [billComposerRows, selectedBillRowKeys]);

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

  const billSuggestions = useMemo(() => {
    const bankGroups = new Map();
    const showroomGroups = new Map();

    rows.forEach((row) => {
      if (!isUnbilledOutstandingReceivable(row)) return;
      const paymentStatus = getPaymentStatus(row);
      const pendingAmount =
        paymentStatus.pendingAmount || paymentStatus.expectedAmount || 0;
      if (!(pendingAmount > 0)) return;

      if (isBankReceivableRecord(row)) {
        const monthKey = formatMonthLabel(
          row?.disbursementDate || row?.created_date,
        );
        const party = String(row?.payout_party_name || "Unknown").trim();
        const key = `${party}::${monthKey}`;
        if (!bankGroups.has(key)) {
          bankGroups.set(key, {
            kind: "bank",
            partyName: party,
            monthLabel: monthKey,
            rows: [],
            totalAmount: 0,
          });
        }
        const group = bankGroups.get(key);
        group.rows.push(row);
        group.totalAmount += pendingAmount;
      } else if (isShowroomCommissionRecord(row)) {
        const party = String(row?.payout_party_name || "Unknown").trim();
        if (!showroomGroups.has(party)) {
          showroomGroups.set(party, {
            kind: "showroom",
            partyName: party,
            rows: [],
            totalAmount: 0,
            latestDeliveryDate: row?.deliveryDate || row?.created_date,
          });
        }
        const group = showroomGroups.get(party);
        group.rows.push(row);
        group.totalAmount += pendingAmount;
        const candidateTs =
          new Date(row?.deliveryDate || row?.created_date || 0).getTime() || 0;
        const currentTs =
          new Date(group.latestDeliveryDate || 0).getTime() || 0;
        if (candidateTs > currentTs) {
          group.latestDeliveryDate = row?.deliveryDate || row?.created_date;
        }
      }
    });

    const bankSuggestions = Array.from(bankGroups.values())
      .sort((a, b) => {
        const aTs =
          new Date(a.rows[0]?.disbursementDate || a.rows[0]?.created_date || 0).getTime() || 0;
        const bTs =
          new Date(b.rows[0]?.disbursementDate || b.rows[0]?.created_date || 0).getTime() || 0;
        return aTs - bTs;
      })
      .map((group) => ({
        ...group,
        title: `Raise ${group.partyName} bill for the month of ${group.monthLabel}`,
        description: `${group.rows.length} case${group.rows.length === 1 ? "" : "s"} amounting to ${formatCurrency(group.totalAmount)}`,
        tone: "blue",
      }));

    const showroomSuggestions = Array.from(showroomGroups.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((group) => ({
        ...group,
        title: `Raise ${group.partyName} commission bill`,
        description: `Delivery completed${dayjs(group.latestDeliveryDate).isValid() ? ` on ${dayjs(group.latestDeliveryDate).format("DD MMM YYYY")}` : ""} · ${group.rows.length} case${group.rows.length === 1 ? "" : "s"} · ${formatCurrency(group.totalAmount)}`,
        tone: "green",
      }));

    return [...bankSuggestions, ...showroomSuggestions];
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
      const moduleOk = moduleFilter === "All" || r.__sourceModule === moduleFilter;
      if (!moduleOk) return false;

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
    setBillComposerMode("create");
    setEditingBill(null);
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

  const openSuggestedBillModal = (suggestion) => {
    setBillComposerMode("create");
    setEditingBill(null);
    const rowsForSuggestion = Array.isArray(suggestion?.rows)
      ? suggestion.rows
      : [];
    const partyName = String(suggestion?.partyName || "").trim();
    setBillPartyFilter(partyName);
    setSelectedBillRowKeys(
      rowsForSuggestion.map((row) => normalizePayoutId(row)).filter(Boolean),
    );
    billForm.setFieldsValue({
      billNumber: generateBillNumber(),
      billDate: dayjs(),
      billNotes:
        suggestion?.kind === "bank"
          ? `Suggested monthly bill for ${suggestion.monthLabel}`
          : "Suggested showroom commission bill",
    });
    setGenerateBillModalVisible(true);
  };

  const openEditBillModal = (bill) => {
    if (!bill) return;
    setBillComposerMode("edit");
    setEditingBill(bill);
    setBillPartyFilter(String(bill.partyName || "").trim());
    setSelectedBillRowKeys(
      safeArray(bill.rows)
        .map((row) => normalizePayoutId(row))
        .filter(Boolean),
    );
    billForm.setFieldsValue({
      billNumber: bill.billNumber,
      billDate: bill.billDate ? dayjs(bill.billDate) : dayjs(),
      billNotes: bill.notes || "",
    });
    setGenerateBillModalVisible(true);
    setBillManagerVisible(false);
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
    const previousBillNumber = String(editingBill?.billNumber || "").trim();
    const selectedKeySet = new Set(
      selectedBillRows.map((row) => normalizePayoutId(row)),
    );
    const rowsToClear =
      billComposerMode === "edit" && previousBillNumber
        ? rows.filter(
            (row) =>
              getBillNumber(row) === previousBillNumber &&
              !selectedKeySet.has(normalizePayoutId(row)),
          )
        : [];

    let updatedCount = 0;
    for (const row of rowsToClear) {
      await updateReceivableInBackend(
        normalizePayoutId(row),
        EMPTY_BILL_PATCH,
        {
          action: "Bill Updated",
          details: `Bill ${previousBillNumber} removed from receivable during edit`,
        },
        { reload: false },
      );
    }
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
    resetBillComposer();
    openBillPrintWindow({
      billNumber,
      billDate,
      partyName,
      rows: selectedBillRows,
      totalAmount: selectedBillTotal,
      notes: billNotes,
    });
    messageApi.success(
      billComposerMode === "edit"
        ? `Bill updated across ${updatedCount} receivable(s)`
        : `Bill generated for ${updatedCount} receivable(s)`,
    );
  };

  const handleDeleteBill = async (bill) => {
    if (!bill) return;
    let clearedCount = 0;
    for (const row of safeArray(bill.rows)) {
      const updated = await updateReceivableInBackend(
        normalizePayoutId(row),
        EMPTY_BILL_PATCH,
        {
          action: "Bill Deleted",
          details: `Bill ${bill.billNumber} deleted from collections bill manager`,
        },
        { reload: false },
      );
      if (updated) clearedCount += 1;
    }
    await loadReceivables();
    messageApi.success(`Removed bill from ${clearedCount} receivable(s)`);
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
          <div className="rounded-[28px] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(236,253,245,0.98),_rgba(255,255,255,0.96)_58%)] p-4 shadow-sm dark:border-emerald-900/30 dark:bg-[radial-gradient(circle_at_top_left,_rgba(6,78,59,0.34),_rgba(31,31,31,0.96)_58%)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-800/60 dark:bg-black/10 dark:text-emerald-300">
                  Party-wise pending summary
                </div>
                <p className="mt-2 max-w-2xl text-xs text-slate-600 dark:text-slate-300">
                  See which bank or showroom party is carrying the largest outstanding bucket before raising collections or bills.
                </p>
              </div>
              <Button
                size="small"
                onClick={() => setPartySummaryCollapsed((prev) => !prev)}
              >
                {partySummaryCollapsed ? "Expand" : "Collapse"}
              </Button>
            </div>
            {!partySummaryCollapsed ? (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {bankSummary.slice(0, 8).map((bank, idx) => {
                  const collectionPercent =
                    bank.total > 0
                      ? Math.min(100, Math.round((bank.collected / bank.total) * 100))
                      : 0;
                  return (
                    <div
                      key={idx}
                      className="rounded-[22px] border border-white/70 bg-white/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/5 dark:bg-[#1d1d1d]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {bank.bank}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {bank.count} receivable{bank.count === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          {collectionPercent}% collected
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Pending</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-300">
                            {formatCurrency(bank.pending)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Collected</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                            {formatCurrency(bank.collected)}
                          </span>
                        </div>
                        <Progress
                          percent={collectionPercent}
                          showInfo={false}
                          strokeColor="#16a34a"
                          trailColor="#dcfce7"
                          size="small"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}

        {billSuggestions.length > 0 && (
          <div className="rounded-[28px] border border-violet-100 bg-[radial-gradient(circle_at_top_left,_rgba(250,245,255,0.98),_rgba(255,255,255,0.96)_55%)] p-4 shadow-sm dark:border-violet-900/30 dark:bg-[radial-gradient(circle_at_top_left,_rgba(76,29,149,0.28),_rgba(31,31,31,0.96)_55%)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700 dark:border-violet-700/60 dark:bg-black/10 dark:text-violet-300">
                  AI billing suggestions
                </div>
                <p className="mt-2 max-w-2xl text-xs text-slate-600 dark:text-slate-300">
                  Monthly finance bill nudges and delivery-triggered showroom commission reminders, already filtered to unbilled outstanding receivables.
                </p>
              </div>
              <Button
                size="small"
                onClick={() => setBillingSuggestionsCollapsed((prev) => !prev)}
              >
                {billingSuggestionsCollapsed ? "Expand" : "Collapse"}
              </Button>
            </div>
            {!billingSuggestionsCollapsed ? (
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {billSuggestions.slice(0, 6).map((suggestion, index) => (
                  <div
                    key={`${suggestion.kind}-${suggestion.partyName}-${suggestion.monthLabel || index}`}
                    className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/5 dark:bg-[#1d1d1d]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:bg-[#262626] dark:text-slate-300">
                          {suggestion.kind === "bank"
                            ? "Monthly finance bill"
                            : "Showroom commission"}
                        </div>
                        <div className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
                          {suggestion.title}
                        </div>
                        <div className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                          {suggestion.description}
                        </div>
                      </div>
                      <Button
                        size="small"
                        type="primary"
                        style={{ background: "#7c3aed", borderColor: "#7c3aed" }}
                        onClick={() => openSuggestedBillModal(suggestion)}
                      >
                        Raise Bill
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-[#2b2b2b] dark:bg-[#1f1f1f]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-8">
            <div className="xl:col-span-1">
              <Select
                value={moduleFilter}
                onChange={(v) => setModuleFilter(v || "All")}
                size="large"
                className="w-full"
                placeholder="Source"
              >
                <Option value="All">All Sources</Option>
                <Option value="Finance">Finance</Option>
                <Option value="Insurance">Insurance</Option>
              </Select>
            </div>
            <div className="xl:col-span-2">
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search by Loan ID, Customer, Bank..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="middle"
                style={{ height: 40 }}
                className="[&.ant-input-affix-wrapper]:!items-center [&.ant-input-affix-wrapper]:!py-0 [&_.ant-input-prefix]:!flex [&_.ant-input-prefix]:!items-center [&_.ant-input-suffix]:!flex [&_.ant-input-suffix]:!items-center [&_.ant-input]:!h-[38px] [&_.ant-input]:!text-sm [&_.ant-input]:!leading-[38px]"
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
        title={billComposerMode === "edit" ? "Edit Bill" : "Generate Bill"}
        open={generateBillModalVisible}
        onOk={handleGenerateBill}
        onCancel={resetBillComposer}
        width="94vw"
        style={{ top: 20 }}
        bodyStyle={{ maxHeight: "calc(100vh - 150px)", overflowY: "auto" }}
        okText={
          billComposerMode === "edit" ? "Save & Download" : "Generate & Download"
        }
      >
        <Form form={billForm} layout="vertical">
          <div className="rounded-[28px] border border-amber-100 bg-[radial-gradient(circle_at_top_left,_rgba(254,252,232,0.98),_rgba(255,255,255,0.95)_60%)] p-5 dark:border-amber-900/30 dark:bg-[radial-gradient(circle_at_top_left,_rgba(120,53,15,0.22),_rgba(31,31,31,0.96)_60%)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:border-amber-800/60 dark:bg-black/10 dark:text-amber-300">
                  {billComposerMode === "edit"
                    ? "Bill edit workspace"
                    : "Bill generation workspace"}
                </div>
                <h3 className="mt-3 text-[28px] font-black leading-none tracking-tight text-emerald-800 dark:text-emerald-300">
                  {billComposerMode === "edit"
                    ? "Refine the bill before sending it again"
                    : "Build a clean party-wise bill in one pass"}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Select a party, lock the outstanding receivables that belong in this bill, and download a finance-ready PDF on your letterhead.
                </p>
              </div>
              <div className="grid min-w-[240px] gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-white/70 bg-white/90 px-4 py-4 shadow-sm dark:border-white/5 dark:bg-[#1d1d1d]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Selected cases
                  </div>
                  <div className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
                    {selectedBillRows.length}
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/70 bg-white/90 px-4 py-4 shadow-sm dark:border-white/5 dark:bg-[#1d1d1d]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Bill total
                  </div>
                  <div className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
                    {formatCurrency(selectedBillTotal)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.45fr]">
            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-[#333] dark:bg-[#1f1f1f]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Bill setup
                </div>
                <div className="mt-4 grid gap-4">
                  <Form.Item label="Party" required style={{ marginBottom: 0 }}>
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
                    style={{ marginBottom: 0 }}
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
                    style={{ marginBottom: 0 }}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      size="large"
                      format="DD MMM YYYY"
                    />
                  </Form.Item>

                  <Form.Item name="billNotes" label="Bill Notes" style={{ marginBottom: 0 }}>
                    <Input.TextArea
                      rows={3}
                      placeholder="Short note for the party or internal remark"
                    />
                  </Form.Item>
                </div>
              </div>

              <div className="rounded-[24px] border border-violet-100 bg-[linear-gradient(180deg,_rgba(248,245,255,0.96),_rgba(255,255,255,0.98))] p-5 shadow-sm dark:border-violet-900/30 dark:bg-[linear-gradient(180deg,_rgba(76,29,149,0.16),_rgba(31,31,31,0.95))]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">
                  Bill summary
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[22px] border border-white/80 bg-white/80 px-4 py-4 dark:border-white/5 dark:bg-black/10">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Selected cases
                    </div>
                    <div className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
                      {selectedBillRows.length}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/80 bg-white/80 px-4 py-4 dark:border-white/5 dark:bg-black/10">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Locked for this bill
                    </div>
                    <div className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
                      {formatCurrency(selectedBillTotal)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Billed receivables stay out of fresh bill suggestions until edited or deleted.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Outstanding receivables for billing
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Select multiple receivables under one party and generate a single bill.
                  </div>
                </div>
                <Button
                  size="small"
                  disabled={!billComposerRows.length}
                  onClick={() =>
                    setSelectedBillRowKeys(
                      billComposerRows.map((row) => normalizePayoutId(row)),
                    )
                  }
                >
                  Select All
                </Button>
              </div>

              <div className="space-y-3 pr-1">
            {!billPartyFilter ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-[#333] dark:bg-[#232323] dark:text-slate-400">
                Select a party to see outstanding receivables.
              </div>
            ) : billComposerRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-[#333] dark:bg-[#232323] dark:text-slate-400">
                No bill-ready receivables for this party.
              </div>
            ) : (
              billComposerRows.map((row) => {
                const rowKey = normalizePayoutId(row);
                const paymentStatus = getPaymentStatus(row);
                const checked = selectedBillRowKeys.includes(rowKey);
                const lockedToAnotherBill =
                  Boolean(getBillNumber(row)) &&
                  getBillNumber(row) !== String(editingBill?.billNumber || "");
                return (
                  <label
                    key={rowKey}
                    className={`flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 transition-all ${
                      checked
                        ? "border-sky-300 bg-sky-50/80 shadow-sm dark:border-sky-700 dark:bg-sky-950/20"
                        : "border-slate-200 bg-white dark:border-[#333] dark:bg-[#1f1f1f]"
                    }`}
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
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {isBankReceivableRecord(row)
                              ? `Disbursement ${formatShortDate(row.disbursementDate)}`
                              : `Delivery ${formatShortDate(row.deliveryDate)}`}
                          </div>
                          {lockedToAnotherBill ? (
                            <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-[#262626] dark:text-slate-300">
                              Locked in bill {getBillNumber(row)}
                            </div>
                          ) : null}
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
            </div>
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
        width="94vw"
        style={{ top: 20 }}
        bodyStyle={{ maxHeight: "calc(100vh - 150px)", overflowY: "auto" }}
      >
        <div className="rounded-[28px] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(254,252,232,0.98),_rgba(255,255,255,0.95)_58%)] p-5 dark:border-emerald-900/30 dark:bg-[radial-gradient(circle_at_top_left,_rgba(6,78,59,0.24),_rgba(31,31,31,0.96)_58%)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-800/60 dark:bg-black/10 dark:text-emerald-300">
                Bill management studio
              </div>
              <h3 className="mt-3 text-[28px] font-black leading-none tracking-tight text-emerald-800 dark:text-emerald-300">
                Track raised bills, receipts, and locks in one place
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Edit bill metadata, download the PDF again, delete the bill lock, or post a partial or full receipt straight into the linked receivables.
              </p>
            </div>
            <div className="grid min-w-[260px] gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/70 bg-white/90 px-4 py-4 shadow-sm dark:border-white/5 dark:bg-[#1d1d1d]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Outstanding bills
                </div>
                <div className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
                  {groupedBills.filter((bill) => bill.status === BILL_STATUS.OUTSTANDING).length}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/70 bg-white/90 px-4 py-4 shadow-sm dark:border-white/5 dark:bg-[#1d1d1d]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Collected bills
                </div>
                <div className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
                  {groupedBills.filter((bill) => bill.status === BILL_STATUS.COLLECTED).length}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 mt-5 flex flex-wrap gap-2">
          {["All", BILL_STATUS.OUTSTANDING, BILL_STATUS.COLLECTED].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setBillManagerStatusFilter(item)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                billManagerStatusFilter === item
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 dark:border-[#333] dark:bg-[#1f1f1f] dark:text-slate-300"
              }`}
            >
              {item === "All" ? "All Bills" : item}
            </button>
          ))}
        </div>

        <div className="space-y-4 pr-1">
          {filteredBills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500 dark:border-[#333] dark:bg-[#232323] dark:text-slate-400">
              No bills found for this filter.
            </div>
          ) : (
            filteredBills.map((bill) => {
              const percent =
                bill.expected > 0
                  ? Math.min(100, Math.round((bill.received / bill.expected) * 100))
                  : 0;
              return (
                <div
                  key={bill.billNumber}
                  className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm dark:border-[#333] dark:bg-[#1f1f1f]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-[#2a2a2a]">
                    <div>
                      <div className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:bg-[#262626] dark:text-slate-300">
                        {bill.status === BILL_STATUS.COLLECTED
                          ? "Collected bill"
                          : "Outstanding bill"}
                      </div>
                      <div className="mt-3 text-lg font-black text-slate-900 dark:text-slate-100">
                        {bill.billNumber}
                      </div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {bill.partyName}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {bill.caseCount} case{bill.caseCount === 1 ? "" : "s"} · Bill date{" "}
                        {bill.billDate ? dayjs(bill.billDate).format("DD MMM YYYY") : "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <Tag color={bill.status === BILL_STATUS.COLLECTED ? "success" : "processing"}>
                        {bill.status}
                      </Tag>
                      <div className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-100">
                        {formatCurrency(bill.expected)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Received {formatCurrency(bill.received)} · Pending {formatCurrency(bill.pending)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <div>
                      <div className="grid gap-2">
                        {bill.rows.slice(0, 4).map((row) => {
                          const paymentStatus = getPaymentStatus(row);
                          return (
                            <div
                              key={normalizePayoutId(row)}
                              className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-[#333] dark:bg-[#232323]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {row.customerName}
                                  </div>
                                  <div className="mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                                    {row.loanId} · {row.payoutId}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                    Pending
                                  </div>
                                  <div className="mt-1 text-sm font-bold text-amber-600 dark:text-amber-300">
                                    {formatCurrency(paymentStatus.pendingAmount)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {bill.rows.length > 4 ? (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            +{bill.rows.length - 4} more linked receivable
                            {bill.rows.length - 4 === 1 ? "" : "s"}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-[#333] dark:bg-[#202020]">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        Bill progress
                      </div>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Received</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                            {formatCurrency(bill.received)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Pending</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-300">
                            {formatCurrency(bill.pending)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Progress
                          percent={percent}
                          showInfo={false}
                          strokeColor={bill.status === BILL_STATUS.COLLECTED ? "#16a34a" : "#7c3aed"}
                          trailColor="#ede9fe"
                          size="small"
                        />
                      </div>
                      {bill.billReceivedDate ? (
                        <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-300">
                          Last fully received on {dayjs(bill.billReceivedDate).format("DD MMM YYYY")}
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                          Partial receipt is supported. Any uncollected balance keeps the bill open and locked.
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
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
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openEditBillModal(bill)}
                        >
                          Edit Bill
                        </Button>
                        {bill.status !== BILL_STATUS.COLLECTED ? (
                          <Button
                            size="small"
                            type="primary"
                            style={{ background: "#7c3aed", borderColor: "#7c3aed" }}
                            onClick={() => openBillReceiptFlow(bill)}
                          >
                            Add Receipt
                          </Button>
                        ) : null}
                        <Popconfirm
                          title={`Delete ${bill.billNumber}?`}
                          description="This clears the bill lock and bill metadata from linked receivables, but keeps collection history intact."
                          okText="Delete Bill"
                          cancelText="Cancel"
                          onConfirm={() => handleDeleteBill(bill)}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />}>
                            Delete Bill
                          </Button>
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>

      <Modal
        title={
          activeBillCollection
            ? `Record Partial / Full Receipt · ${activeBillCollection.billNumber}`
            : "Record Bulk Collections"
        }
        open={bulkCollectionModalVisible}
        onOk={handleBulkCollectionSave}
        onCancel={() => {
          setBulkCollectionModalVisible(false);
          setActiveBillCollection(null);
        }}
        width={700}
        okText={activeBillCollection ? "Post Receipt" : "Record Payments"}
      >
        <Form form={bulkForm} layout="vertical">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-[#333] dark:bg-[#202020] dark:text-slate-300">
            {activeBillCollection ? (
              <>
                Posting receipt for bill{" "}
                <strong>{activeBillCollection.billNumber}</strong> across{" "}
                <strong>{selectedRows.length}</strong> receivable(s). You can
                post a partial receipt amount per case and the bill will remain
                outstanding until the full amount is collected.
              </>
            ) : (
              <>
                Recording collections for <strong>{selectedRows.length}</strong>{" "}
                receivable(s).
              </>
            )}
          </div>

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
