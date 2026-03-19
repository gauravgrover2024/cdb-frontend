import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  Alert,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
  Table,
  Tabs,
} from "antd";
import {
  AlertTriangle,
  BarChart3,
  Database,
  BriefcaseBusiness,
  Building2,
  CarFront,
  ChartNoAxesCombined,
  CircleDot,
  Clock3,
  Filter,
  GitBranch,
  IndianRupee,
  RefreshCcw,
  SearchCode,
  ShieldAlert,
  TrendingUp,
  UsersRound,
  MoreVertical,
} from "lucide-react";
import { loansApi } from "../../api/loans";
import "./AnalyticsDashboard.css";

const { RangePicker } = DatePicker;
dayjs.extend(customParseFormat);

const RANGE_OPTIONS = [
  { label: "Month till date", value: "mtd" },
  { label: "Last 1 month", value: "1m" },
  { label: "Last 3 months", value: "3m" },
  { label: "Last 1 year", value: "1y" },
  { label: "Custom", value: "custom" },
];

const CUSTOM_WIDGET_METRICS = [
  { label: "Count", value: "count" },
  { label: "Sum", value: "sum" },
  { label: "Average", value: "avg" },
];

const CUSTOM_WIDGET_GROUP_BY = [
  { label: "Month", value: "month" },
  { label: "Bank", value: "bank" },
  { label: "Source", value: "source" },
  { label: "Loan Type", value: "loanType" },
  { label: "Status", value: "status" },
  { label: "Stage", value: "stage" },
  { label: "Dealer / Showroom", value: "dealer" },
  { label: "Vehicle Make", value: "vehicleMake" },
  { label: "Vehicle Model", value: "vehicleModel" },
];

const CUSTOM_WIDGET_FIELDS = [
  { label: "Loan Amount", value: "loanAmount" },
  { label: "Approved Amount", value: "approval_loanAmountApproved" },
  { label: "Disbursed Amount", value: "approval_loanAmountDisbursed" },
  { label: "Disburse Amount", value: "disburse_amount" },
  { label: "Finance Expectation", value: "financeExpectation" },
];

const REPORT_FIELDS = [
  "loanId",
  "customerName",
  "primaryMobile",
  "typeOfLoan",
  "currentStage",
  "status",
  "approval_status",
  "approval_bankName",
  "approval_brokerName",
  "recordSource",
  "dealerName",
  "showroomDealerName",
  "vehicleMake",
  "vehicleModel",
  "vehicleVariant",
  "loanAmount",
  "approval_loanAmountApproved",
  "approval_loanAmountDisbursed",
  "disburse_amount",
  "registrationNumber",
  "vehicleRegNo",
  "rc_redg_no",
  "invoice_number",
  "invoice_date",
  "insurance_policy_number",
  "createdAt",
  "updatedAt",
];

const formatINR = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

const pick = (obj, path) =>
  String(path || "")
    .split(".")
    .reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);

const getRangeParams = (preset, customRange) => {
  const params = { range: preset };
  if (preset === "custom" && customRange?.[0] && customRange?.[1]) {
    params.from = customRange[0].format("YYYY-MM-DD");
    params.to = customRange[1].format("YYYY-MM-DD");
  }
  return params;
};

const monthKey = (value) => {
  const d = dayjs(value);
  if (!d.isValid()) return null;
  return d.format("YYYY-MM");
};

const monthLabel = (key) => {
  const d = dayjs(`${key}-01`);
  return d.isValid() ? d.format("MMM YYYY") : key;
};

const stageKey = (stage) => {
  const s = String(stage || "").toLowerCase();
  if (s.includes("pre")) return "prefile";
  if (s.includes("approv")) return "approval";
  if (s.includes("post")) return "postfile";
  if (s.includes("deliver")) return "delivery";
  if (s.includes("payout")) return "payout";
  return "profile";
};

const normalizeTypeText = (value) => String(value || "").trim().toLowerCase();

const isCashDeliveryBasedCase = (loan) => {
  const t = normalizeTypeText(loan?.typeOfLoan || loan?.loanType || loan?.caseType);
  const financed = normalizeTypeText(loan?.isFinanced);
  const bankText = normalizeTypeText(
    loan?.approval_bankName || loan?.postfile_bankName || loan?.bankName,
  );
  if (bankText.includes("cash sale bank")) return true;
  if (t.includes("cash-in") || t.includes("cash in")) return false;
  if (financed === "no" && !t.includes("refinance")) return true;
  if (!t) return false;
  return t === "cash" || t.includes("cash car") || t.includes("cash sale");
};

const parseMaybeDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (dayjs.isDayjs(value)) return value.isValid() ? value : null;
  if (value instanceof Date) {
    const d = dayjs(value);
    return d.isValid() ? d : null;
  }
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    const d = dayjs(ms);
    return d.isValid() ? d : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;

  const native = dayjs(raw);
  if (native.isValid()) return native;

  const formats = [
    "DD/MM/YYYY",
    "D/M/YYYY",
    "DD-MM-YYYY",
    "D-M-YYYY",
    "DD/MM/YY",
    "D/M/YY",
    "DD-MM-YY",
    "D-M-YY",
    "YYYY/MM/DD",
    "YYYY-MM-DD",
    "DD MMM YYYY",
    "D MMM YYYY",
    "DD MMM YY",
    "D MMM YY",
    "DD-MMM-YYYY",
    "D-MMM-YYYY",
    "DD-MMM-YY",
    "D-MMM-YY",
    "DD.MM.YYYY",
    "D.M.YYYY",
  ];
  for (const fmt of formats) {
    const d = dayjs(raw, fmt, true);
    if (d.isValid()) return d;
  }
  return null;
};

const firstValidDate = (...values) => {
  for (const value of values) {
    const d = parseMaybeDate(value);
    if (d?.isValid()) return d;
  }
  return null;
};

const collectStatusHistoryDates = (loan, statusNeedle) => {
  const needle = String(statusNeedle || "").toLowerCase();
  const bankHistory = Array.isArray(loan?.approval_banksData)
    ? loan.approval_banksData.flatMap((b) =>
        Array.isArray(b?.statusHistory) ? b.statusHistory : [],
      )
    : [];
  const rootHistory = [
    ...(Array.isArray(loan?.approval_statusHistory) ? loan.approval_statusHistory : []),
    ...(Array.isArray(loan?.statusHistory) ? loan.statusHistory : []),
  ];
  const all = [...rootHistory, ...bankHistory];
  const hits = all
    .filter((entry) =>
      String(entry?.status || "").toLowerCase().includes(needle),
    )
    .map((entry) => entry?.changedAt || entry?.date || entry?.updatedAt)
    .filter(Boolean);
  return firstValidDate(...hits);
};

const getLifecycleDates = (loan) => ({
  createdAt: firstValidDate(loan?.createdAt),
  approvedAt: firstValidDate(
    loan?.approval_approvalDate,
    loan?.approvalDate,
    loan?.approvedDate,
    loan?.approval_date,
    collectStatusHistoryDates(loan, "approved"),
    Array.isArray(loan?.approval_banksData)
      ? loan.approval_banksData[0]?.approvalDate
      : null,
  ),
  disbursedAt: firstValidDate(
    loan?.disbursement_date,
    loan?.approval_disbursedDate,
    loan?.disbursementDate,
    loan?.disbursedDate,
    loan?.disburse_date,
    loan?.disburseDate,
    collectStatusHistoryDates(loan, "disbursed"),
    Array.isArray(loan?.approval_banksData)
      ? loan.approval_banksData[0]?.disbursedDate ||
          loan.approval_banksData[0]?.disbursalDate
      : null,
  ),
  deliveryAt: firstValidDate(
    loan?.delivery_done_at,
    loan?.delivery_date,
    loan?.deliveryDate,
    loan?.handoverDate,
  ),
  invoiceAt: firstValidDate(
    loan?.invoice_done_at,
    loan?.invoice_received_date,
    loan?.invoice_date,
    loan?.invoiceDate,
  ),
});

const getPrimaryBusinessDate = (loan) => {
  const { createdAt, approvedAt, disbursedAt, deliveryAt, invoiceAt } = getLifecycleDates(loan);
  if (isCashDeliveryBasedCase(loan)) return deliveryAt || invoiceAt || approvedAt || createdAt;
  return disbursedAt || approvedAt || createdAt;
};

const getDisbursalOrDeliveryDate = (loan) => {
  const { approvedAt, disbursedAt, deliveryAt, invoiceAt, createdAt } = getLifecycleDates(loan);
  if (isCashDeliveryBasedCase(loan)) return deliveryAt || invoiceAt || approvedAt || createdAt;
  return disbursedAt || approvedAt || deliveryAt || invoiceAt || createdAt;
};

const statusKey = (loan) => {
  const s = String(loan?.status || loan?.approval_status || "").toLowerCase();
  if (s.includes("disburs")) return "disbursed";
  if (s.includes("approv")) return "approved";
  if (s.includes("reject") || s.includes("declin") || s.includes("fail")) return "rejected";
  if (s.includes("complete") || s.includes("close")) return "completed";
  return "pending";
};

const num = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const isDisbursed = (loan) =>
  statusKey(loan) === "disbursed" ||
  num(loan?.disburse_amount) > 0 ||
  num(loan?.approval_loanAmountDisbursed) > 0 ||
  Boolean(loan?.disbursement_date || loan?.approval_disbursedDate || loan?.disburse_date);

const isBusinessCompletedCash = (loan) => {
  if (!isCashDeliveryBasedCase(loan)) return false;
  const { deliveryAt, invoiceAt } = getLifecycleDates(loan);
  return Boolean(deliveryAt || invoiceAt);
};

const amountValue = (loan) =>
  num(
    loan?.disburse_amount ||
      loan?.approval_loanAmountDisbursed ||
      loan?.approval_loanAmountApproved ||
      loan?.loanAmount ||
      loan?.financeExpectation ||
      0,
  );

const getRangeWindow = (rangePreset, customRange) => {
  const now = dayjs();
  let start = now.startOf("month");
  let end = now.endOf("day");
  if (rangePreset === "1m") start = now.subtract(1, "month").startOf("day");
  else if (rangePreset === "3m") start = now.subtract(3, "month").startOf("day");
  else if (rangePreset === "1y") start = now.subtract(1, "year").startOf("day");
  else if (rangePreset === "custom" && customRange?.[0] && customRange?.[1]) {
    start = customRange[0].startOf("day");
    end = customRange[1].endOf("day");
  }
  return { start, end };
};

const isWithinRange = (value, start, end) => {
  if (!value) return false;
  return (value.isAfter(start) || value.isSame(start)) && (value.isBefore(end) || value.isSame(end));
};

const filterLoansByRange = (loans, rangePreset, customRange) => {
  const { start, end } = getRangeWindow(rangePreset, customRange);
  const rows = loans.filter((loan) => {
    const businessDate = getPrimaryBusinessDate(loan);
    return isWithinRange(businessDate, start, end);
  });
  return { rows, start, end };
};

const keyLower = (value) => String(value || "").trim().toLowerCase();

const buildFallbackOverview = (loans = [], rangePreset, customRange) => {
  const { rows, start, end } = filterLoansByRange(loans, rangePreset, customRange);

  const monthBuckets = [];
  let cursor = start.startOf("month");
  const endMonth = end.startOf("month");
  while (cursor.isBefore(endMonth) || cursor.isSame(endMonth)) {
    monthBuckets.push(cursor.format("YYYY-MM"));
    cursor = cursor.add(1, "month");
  }

  const totalLoansTrendMap = new Map(monthBuckets.map((m) => [m, 0]));
  const disbursedTrendMap = new Map(monthBuckets.map((m) => [m, { amount: 0, count: 0 }]));
  const stageMap = new Map([["profile", 0], ["prefile", 0], ["approval", 0], ["postfile", 0], ["delivery", 0], ["payout", 0]]);
  const loanTypeMap = new Map();
  const bankMap = new Map();
  const sourceMap = new Map();
  const dealerMap = new Map();
  const statusMap = new Map();
  const vehicleMap = new Map();

  let approvalPendingCount = 0;
  let approvalPendingAmount = 0;
  let missingRegCount = 0;
  let missingDeliveryCount = 0;
  let cashCarCases = 0;
  let cashCarDelivered = 0;
  let cashCarPending = 0;
  let cashCarAmount = 0;

  rows.forEach((loan) => {
    const isCashCar = isCashDeliveryBasedCase(loan);
    const m = monthKey(getPrimaryBusinessDate(loan));
    if (m && totalLoansTrendMap.has(m)) totalLoansTrendMap.set(m, (totalLoansTrendMap.get(m) || 0) + 1);

    const stg = stageKey(loan?.currentStage);
    stageMap.set(stg, (stageMap.get(stg) || 0) + 1);

    const st = statusKey(loan);
    statusMap.set(st, (statusMap.get(st) || 0) + 1);

    const lt = String(loan?.typeOfLoan || loan?.loanType || loan?.caseType || "Unknown").trim() || "Unknown";
    loanTypeMap.set(lt, (loanTypeMap.get(lt) || 0) + 1);

    if (!isCashCar) {
      const bank = String(
        loan?.approval_bankName ||
          loan?.postfile_bankName ||
          loan?.bankName ||
          (Array.isArray(loan?.approval_banksData) ? loan.approval_banksData[0]?.bankName : "") ||
          "Unknown",
      ).trim() || "Unknown";
      if (!bankMap.has(bank)) bankMap.set(bank, { bankName: bank, total: 0, approved: 0, disbursed: 0, pending: 0, totalLoanAmount: 0 });
      const bankNode = bankMap.get(bank);
      bankNode.total += 1;
      bankNode.totalLoanAmount += amountValue(loan);
      if (st === "approved") bankNode.approved += 1;
      if (st === "pending") bankNode.pending += 1;
      if (isDisbursed(loan)) bankNode.disbursed += 1;
    } else {
      cashCarCases += 1;
      cashCarAmount += amountValue(loan);
      if (isBusinessCompletedCash(loan)) cashCarDelivered += 1;
      else cashCarPending += 1;
    }

    const srcRaw = String(loan?.approval_loanBookedIn || loan?.recordSource || loan?.source || "").toLowerCase();
    const src = srcRaw.includes("indirect") ? "Indirect" : srcRaw.includes("direct") ? "Direct" : "Unknown";
    if (!sourceMap.has(src)) sourceMap.set(src, { source: src, total: 0, approved: 0, disbursed: 0, pending: 0, conversionRate: 0 });
    const sourceNode = sourceMap.get(src);
    sourceNode.total += 1;
    if (st === "approved") sourceNode.approved += 1;
    if (st === "pending") sourceNode.pending += 1;
    if (isDisbursed(loan)) sourceNode.disbursed += 1;

    const dealer = String(loan?.dealerName || loan?.showroomDealerName || loan?.showroomName || "Unknown").trim() || "Unknown";
    if (!dealerMap.has(dealer)) dealerMap.set(dealer, { dealerName: dealer, total: 0, disbursed: 0, totalLoanAmount: 0 });
    const dealerNode = dealerMap.get(dealer);
    dealerNode.total += 1;
    dealerNode.totalLoanAmount += amountValue(loan);
    if (isDisbursed(loan)) dealerNode.disbursed += 1;

    const vehicle = `${String(loan?.vehicleMake || "Unknown")} | ${String(loan?.vehicleModel || "Unknown")} | ${String(loan?.vehicleVariant || "Unknown")}`;
    if (!vehicleMap.has(vehicle)) vehicleMap.set(vehicle, { segment: vehicle, total: 0, totalLoanAmount: 0 });
    const vehicleNode = vehicleMap.get(vehicle);
    vehicleNode.total += 1;
    vehicleNode.totalLoanAmount += amountValue(loan);

    const approvedPending =
      (st === "approved" || num(loan?.approval_loanAmountApproved) > 0) &&
      !isDisbursed(loan) &&
      !isBusinessCompletedCash(loan);
    if (approvedPending) {
      approvalPendingCount += 1;
      approvalPendingAmount += amountValue(loan);
    }

    const regNo = String(loan?.rc_redg_no || loan?.registrationNumber || loan?.vehicleRegNo || "").trim();
    if (!regNo) missingRegCount += 1;

    const hasMissingDelivery = [
      loan?.invoice_number,
      loan?.invoice_date,
      loan?.insurance_policy_number,
      loan?.insurance_policy_start_date,
      loan?.insurance_company_name,
      loan?.rc_redg_no,
    ].some((v) => v === null || v === undefined || String(v).trim() === "");
    if ((stg === "delivery" || stg === "payout" || isDisbursed(loan)) && hasMissingDelivery) {
      missingDeliveryCount += 1;
    }

    if (isDisbursed(loan) || isBusinessCompletedCash(loan)) {
      const dm = monthKey(getDisbursalOrDeliveryDate(loan));
      if (dm && disbursedTrendMap.has(dm)) {
        const node = disbursedTrendMap.get(dm);
        node.amount += num(loan?.disburse_amount || loan?.approval_loanAmountDisbursed || amountValue(loan));
        node.count += 1;
      }
    }
  });

  const totalLoansTrend = monthBuckets.map((bucket) => ({ bucket, label: monthLabel(bucket), value: totalLoansTrendMap.get(bucket) || 0 }));
  const disbursedAmountTrend = monthBuckets.map((bucket) => ({ bucket, label: monthLabel(bucket), amount: disbursedTrendMap.get(bucket)?.amount || 0, count: disbursedTrendMap.get(bucket)?.count || 0 }));
  const stageFunnel = Array.from(stageMap.entries()).map(([stage, count]) => ({ stage, count }));
  const loanTypeMix = Array.from(loanTypeMap.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  const bankPipeline = Array.from(bankMap.values()).sort((a, b) => b.total - a.total);
  const sourcePerformance = Array.from(sourceMap.values()).map((item) => ({ ...item, conversionRate: item.total > 0 ? Number(((item.disbursed / item.total) * 100).toFixed(1)) : 0 })).sort((a, b) => b.total - a.total);
  const dealerPerformance = Array.from(dealerMap.values()).sort((a, b) => b.total - a.total);
  const caseStatusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
  const vehicleSegmentTrends = Array.from(vehicleMap.values()).map((item) => ({ ...item, avgLoanAmount: item.total > 0 ? item.totalLoanAmount / item.total : 0 })).sort((a, b) => b.total - a.total);

  const mobileCount = new Map();
  rows.forEach((loan) => {
    const m = String(loan?.primaryMobile || "").replace(/\D/g, "");
    if (m.length >= 10) mobileCount.set(m, (mobileCount.get(m) || 0) + 1);
  });
  const repeatedCaseCount = rows.filter((loan) => mobileCount.get(String(loan?.primaryMobile || "").replace(/\D/g, "")) > 1).length;
  const repeatedIdentityCount = Array.from(mobileCount.values()).filter((count) => count > 1).length;

  return {
    timeframe: { range: rangePreset, start: start.toISOString(), end: end.toISOString() },
    totals: {
      totalCases: rows.length,
      totalLoanAmount: rows.reduce((acc, loan) => acc + amountValue(loan), 0),
      totalDisbursedAmount: rows.reduce(
        (acc, loan) =>
          acc +
          (isDisbursed(loan) || isBusinessCompletedCash(loan)
            ? num(loan?.disburse_amount || loan?.approval_loanAmountDisbursed || amountValue(loan))
            : 0),
        0,
      ),
    },
    widgets: {
      totalLoansTrend,
      disbursedAmountTrend,
      stageFunnel,
      approvalPendingDisbursal: { count: approvalPendingCount, amount: approvalPendingAmount },
      missingRegNumber: { count: missingRegCount },
      missingCriticalDeliveryFields: { count: missingDeliveryCount },
      cashCarSummary: {
        total: cashCarCases,
        delivered: cashCarDelivered,
        pending: cashCarPending,
        amount: cashCarAmount,
      },
      loanTypeMix,
      bankPipeline,
      sourcePerformance,
      dealerPerformance,
      caseStatusDistribution,
      vehicleSegmentTrends,
      repeatedCustomers: { repeatedIdentityCount, repeatedCaseCount },
      bankWiseTotalLoanAmount: bankPipeline
        .map((row) => ({ bankName: row.bankName, totalLoanAmount: row.totalLoanAmount }))
        .sort((a, b) => b.totalLoanAmount - a.totalLoanAmount),
    },
  };
};

const buildLocalDrillRows = (loans = [], rangePreset, customRange, { widget, bucket, key }) => {
  const { rows } = filterLoansByRange(loans, rangePreset, customRange);

  if (!widget) return rows.slice(0, 1000);

  if (widget === "total_loan_trend" && bucket) {
    return rows.filter((loan) => monthKey(getPrimaryBusinessDate(loan)) === bucket).slice(0, 1000);
  }

  if (widget === "disbursed_amount_trend" && bucket) {
    return rows
      .filter(
        (loan) =>
          (isDisbursed(loan) || isBusinessCompletedCash(loan)) &&
          monthKey(getDisbursalOrDeliveryDate(loan)) === bucket,
      )
      .slice(0, 1000);
  }

  if (widget === "approval_pending_disbursal") {
    return rows
      .filter(
        (loan) =>
          (statusKey(loan) === "approved" || num(loan?.approval_loanAmountApproved) > 0) &&
          !isDisbursed(loan) &&
          !isBusinessCompletedCash(loan),
      )
      .slice(0, 1000);
  }

  if (widget === "missing_reg_number") {
    return rows
      .filter((loan) => !String(loan?.rc_redg_no || loan?.registrationNumber || loan?.vehicleRegNo || "").trim())
      .slice(0, 1000);
  }

  if (widget === "missing_delivery_fields") {
    return rows
      .filter((loan) => {
        const stg = stageKey(loan?.currentStage);
        const hasMissingDelivery = [
          loan?.invoice_number,
          loan?.invoice_date,
          loan?.insurance_policy_number,
          loan?.insurance_policy_start_date,
          loan?.insurance_company_name,
          loan?.rc_redg_no,
        ].some((v) => v === null || v === undefined || String(v).trim() === "");
        return (stg === "delivery" || stg === "payout" || isDisbursed(loan) || isBusinessCompletedCash(loan)) && hasMissingDelivery;
      })
      .slice(0, 1000);
  }

  if (widget === "loan_type_mix" && key) {
    return rows
      .filter((loan) => keyLower(loan?.typeOfLoan || loan?.loanType || loan?.caseType) === keyLower(key))
      .slice(0, 1000);
  }

  if (widget === "bank_pipeline" && key) {
    return rows
      .filter((loan) => {
        if (isCashDeliveryBasedCase(loan)) return false;
        const bank = String(
          loan?.approval_bankName ||
            loan?.postfile_bankName ||
            loan?.bankName ||
            (Array.isArray(loan?.approval_banksData) ? loan.approval_banksData[0]?.bankName : "") ||
            "Unknown",
        ).trim();
        return keyLower(bank) === keyLower(key);
      })
      .slice(0, 1000);
  }

  if (widget === "cash_car_all") {
    return rows.filter((loan) => isCashDeliveryBasedCase(loan)).slice(0, 1000);
  }

  if (widget === "cash_car_delivered") {
    return rows
      .filter((loan) => isCashDeliveryBasedCase(loan) && isBusinessCompletedCash(loan))
      .slice(0, 1000);
  }

  if (widget === "cash_car_pending_delivery") {
    return rows
      .filter((loan) => isCashDeliveryBasedCase(loan) && !isBusinessCompletedCash(loan))
      .slice(0, 1000);
  }

  if (widget === "source_performance" && key) {
    return rows
      .filter((loan) => {
        const srcRaw = String(loan?.approval_loanBookedIn || loan?.recordSource || loan?.source || "").toLowerCase();
        const src = srcRaw.includes("indirect") ? "indirect" : srcRaw.includes("direct") ? "direct" : "unknown";
        return src === keyLower(key);
      })
      .slice(0, 1000);
  }

  if (widget === "dealer_performance" && key) {
    return rows
      .filter((loan) => keyLower(loan?.dealerName || loan?.showroomDealerName || loan?.showroomName || "unknown") === keyLower(key))
      .slice(0, 1000);
  }

  if (widget === "case_status_distribution" && key) {
    return rows.filter((loan) => keyLower(statusKey(loan)) === keyLower(key)).slice(0, 1000);
  }

  if (widget === "vehicle_segment" && key) {
    return rows
      .filter((loan) => {
        const segment = `${String(loan?.vehicleMake || "Unknown")} | ${String(loan?.vehicleModel || "Unknown")} | ${String(loan?.vehicleVariant || "Unknown")}`;
        return keyLower(segment) === keyLower(key);
      })
      .slice(0, 1000);
  }

  if (widget === "stage_funnel" && key) {
    return rows.filter((loan) => stageKey(loan?.currentStage) === keyLower(key)).slice(0, 1000);
  }

  if (widget === "repeated_customers") {
    const mobileCount = new Map();
    rows.forEach((loan) => {
      const m = String(loan?.primaryMobile || "").replace(/\D/g, "");
      if (m.length >= 10) mobileCount.set(m, (mobileCount.get(m) || 0) + 1);
    });
    return rows
      .filter((loan) => {
        const m = String(loan?.primaryMobile || "").replace(/\D/g, "");
        return mobileCount.get(m) > 1;
      })
      .slice(0, 1000);
  }

  return rows.slice(0, 1000);
};

const FALLBACK_MAX_LOANS = 5000;

const fetchAllLoansForFallback = async () => {
  const all = [];
  let skip = 0;
  const limit = 1000;
  while (all.length < FALLBACK_MAX_LOANS) {
    const res = await loansApi.getAll({ limit, skip });
    const rows = Array.isArray(res?.data) ? res.data : [];
    all.push(...rows);
    if (!res?.hasMore || rows.length === 0) break;
    skip += rows.length;
  }
  return all;
};

const CHART_PALETTE = [
  "#1d9bf0",
  "#3B82F6",
  "#06B6D4",
  "#10B981",
  "#22C55E",
  "#F59E0B",
  "#F97316",
  "#EF4444",
];

const ChartNoData = ({ text = "No data for selected timeframe" }) => (
  <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm font-medium text-muted-foreground">
    {text}
  </div>
);

const compactNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const VerticalBarChart = ({
  points = [],
  valueKey = "value",
  color = "#4F46E5",
  onSelect,
}) => {
  if (!points.length) return <ChartNoData />;

  const values = points.map((p) => Number(p[valueKey] || 0));
  const max = Math.max(...values, 1);

  const width = Math.max(620, points.length * 48 + 90);
  const height = 240;
  const m = { top: 14, right: 20, bottom: 36, left: 44 };
  const chartW = width - m.left - m.right;
  const chartH = height - m.top - m.bottom;
  const slot = chartW / points.length;
  const barW = Math.max(8, Math.min(20, slot * 0.58));
  const ticks = 4;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card px-2 py-2">
      <svg width={width} height={height} role="img" aria-label="bar chart">
        {Array.from({ length: ticks + 1 }).map((_, idx) => {
          const y = m.top + (idx / ticks) * chartH;
          const tickValue = Math.round(((ticks - idx) / ticks) * max);
          return (
            <g key={`tick-${idx}`}>
              <line
                x1={m.left}
                x2={width - m.right}
                y1={y}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <text x={m.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#64748B">
                {compactNumber(tickValue)}
              </text>
            </g>
          );
        })}
        {points.map((point, idx) => {
          const v = Number(point[valueKey] || 0);
          const h = (v / max) * chartH;
          const x = m.left + idx * slot + (slot - barW) / 2;
          const y = m.top + (chartH - h);
          return (
            <g key={point.bucket || point.label || idx}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(2, h)}
                rx="6"
                fill={color}
                opacity="0.9"
                style={{ cursor: onSelect ? "pointer" : "default" }}
                onClick={() => onSelect?.(point)}
              />
              <text
                x={x + barW / 2}
                y={height - 14}
                textAnchor="middle"
                fontSize="10"
                fill="#64748B"
              >
                {String(point.label || "").slice(0, 3)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const AreaLineChart = ({
  points = [],
  valueKey = "value",
  color = "#10B981",
  onSelect,
  id = "area-chart",
}) => {
  if (!points.length) return <ChartNoData />;

  const values = points.map((p) => Number(p[valueKey] || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);

  const width = Math.max(620, points.length * 44 + 90);
  const height = 240;
  const m = { top: 14, right: 20, bottom: 36, left: 44 };
  const chartW = width - m.left - m.right;
  const chartH = height - m.top - m.bottom;
  const x = (idx) =>
    points.length <= 1 ? m.left + chartW / 2 : m.left + (idx / (points.length - 1)) * chartW;
  const y = (v) => m.top + ((max - v) / Math.max(max - min, 1)) * chartH;
  const linePath = points
    .map((point, idx) => `${idx === 0 ? "M" : "L"} ${x(idx)} ${y(Number(point[valueKey] || 0))}`)
    .join(" ");
  const areaPath = `${linePath} L ${x(points.length - 1)} ${m.top + chartH} L ${x(0)} ${m.top + chartH} Z`;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card px-2 py-2">
      <svg width={width} height={height} role="img" aria-label="area line chart">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.30" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {Array.from({ length: 5 }).map((_, idx) => {
          const gy = m.top + (idx / 4) * chartH;
          return (
            <line
              key={`grid-${idx}`}
              x1={m.left}
              x2={width - m.right}
              y1={gy}
              y2={gy}
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          );
        })}
        <path d={areaPath} fill={`url(#grad-${id})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {points.map((point, idx) => (
          <circle
            key={point.bucket || point.label || idx}
            cx={x(idx)}
            cy={y(Number(point[valueKey] || 0))}
            r="3.2"
            fill={color}
            style={{ cursor: onSelect ? "pointer" : "default" }}
            onClick={() => onSelect?.(point)}
          />
        ))}
        {points.map((point, idx) => (
          <text
            key={`lbl-${point.bucket || idx}`}
            x={x(idx)}
            y={height - 14}
            textAnchor="middle"
            fontSize="10"
            fill="#64748B"
          >
            {String(point.label || "").slice(0, 3)}
          </text>
        ))}
      </svg>
    </div>
  );
};

const FunnelChart = ({ rows = [], onSelect }) => {
  if (!rows.length) return <ChartNoData />;
  const stageOrder = ["profile", "prefile", "approval", "postfile", "delivery", "payout"];
  const ordered = [...rows].sort(
    (a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage),
  );
  const max = Math.max(...ordered.map((r) => Number(r.count || 0)), 1);
  const width = 520;
  const rowH = 52;
  const gap = 6;
  const height = ordered.length * (rowH + gap) + 8;
  const centerX = width / 2;
  const maxW = 420;
  const minW = 150;

  const toW = (v) => minW + (Number(v || 0) / max) * (maxW - minW);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card px-2 py-2">
      <svg width={width} height={height} role="img" aria-label="funnel chart">
        {ordered.map((row, idx) => {
          const topW = toW(row.count);
          const next = ordered[idx + 1];
          const bottomW = next ? toW(next.count) : Math.max(minW * 0.8, topW * 0.72);
          const y = 4 + idx * (rowH + gap);
          const color = CHART_PALETTE[idx % CHART_PALETTE.length];
          const x1 = centerX - topW / 2;
          const x2 = centerX + topW / 2;
          const x3 = centerX + bottomW / 2;
          const x4 = centerX - bottomW / 2;
          const points = `${x1},${y} ${x2},${y} ${x3},${y + rowH} ${x4},${y + rowH}`;
          return (
            <g key={row.stage}>
              <polygon
                points={points}
                fill={color}
                opacity="0.88"
                stroke="#ffffff"
                strokeWidth="1"
                style={{ cursor: onSelect ? "pointer" : "default" }}
                onClick={() => onSelect?.(row)}
              />
              <text x={centerX} y={y + rowH / 2 - 3} textAnchor="middle" fontSize="11" fill="#ffffff" fontWeight="700">
                {String(row.stage || "").toUpperCase()}
              </text>
              <text x={centerX} y={y + rowH / 2 + 12} textAnchor="middle" fontSize="11" fill="#ffffff" fontWeight="700">
                {Number(row.count || 0).toLocaleString("en-IN")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const donutArcPath = (cx, cy, rOuter, rInner, start, end) => {
  const rad = Math.PI / 180;
  const sx = cx + rOuter * Math.cos(start * rad);
  const sy = cy + rOuter * Math.sin(start * rad);
  const ex = cx + rOuter * Math.cos(end * rad);
  const ey = cy + rOuter * Math.sin(end * rad);
  const six = cx + rInner * Math.cos(end * rad);
  const siy = cy + rInner * Math.sin(end * rad);
  const eix = cx + rInner * Math.cos(start * rad);
  const eiy = cy + rInner * Math.sin(start * rad);
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${sx} ${sy}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${ex} ${ey}`,
    `L ${six} ${siy}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${eix} ${eiy}`,
    "Z",
  ].join(" ");
};

const DonutBreakdown = ({
  rows = [],
  labelKey = "label",
  valueKey = "count",
  onClick,
}) => {
  if (!rows.length) return <ChartNoData text="No segments available" />;
  const data = rows.slice(0, 6);
  const total = data.reduce((sum, row) => sum + Number(row[valueKey] || 0), 0) || 1;
  const cx = 86;
  const cy = 86;
  const rOuter = 70;
  const rInner = 42;
  let start = -90;
  const arcs = data.map((row, idx) => {
    const ratio = Number(row[valueKey] || 0) / total;
    const sweep = ratio * 360;
    const end = start + sweep;
    const arc = {
      row,
      path: donutArcPath(cx, cy, rOuter, rInner, start, end),
      color: CHART_PALETTE[idx % CHART_PALETTE.length],
      pct: ratio * 100,
    };
    start = end;
    return arc;
  });

  return (
    <div className="grid grid-cols-1 gap-2 text-foreground md:grid-cols-[180px_minmax(0,1fr)]">
      <div className="flex items-center justify-center">
        <svg width="180" height="180" role="img" aria-label="donut chart">
          {arcs.map((arc, idx) => (
            <path
              key={`arc-${idx}`}
              d={arc.path}
              fill={arc.color}
              opacity="0.9"
              style={{ cursor: onClick ? "pointer" : "default" }}
              onClick={() => onClick?.(arc.row)}
            />
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="#64748B">Total</text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="18" fill="currentColor" fontWeight="700">
            {Number(total).toLocaleString("en-IN")}
          </text>
        </svg>
      </div>
      <div className="space-y-2">
        {arcs.map((arc, idx) => (
          <button
            key={`legend-${idx}`}
            type="button"
            onClick={() => onClick?.(arc.row)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-2.5 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: arc.color }} />
              <span className="truncate text-xs font-semibold text-foreground">
                {arc.row[labelKey]}
              </span>
            </div>
            <span className="text-xs font-bold text-foreground">
              {arc.pct.toFixed(1)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const HorizontalBarChart = ({
  rows = [],
  labelKey,
  valueKey,
  onClick,
  formatValue = (v) => Number(v || 0).toLocaleString("en-IN"),
}) => {
  if (!rows.length) return <ChartNoData text="No rows available" />;
  const top = rows.slice(0, 8);
  const max = Math.max(...top.map((row) => Number(row[valueKey] || 0)), 1);
  return (
    <div className="space-y-2">
      {top.map((row, idx) => {
        const value = Number(row[valueKey] || 0);
        const widthPct = (value / max) * 100;
        return (
          <button
            key={`${row[labelKey]}-${idx}`}
            type="button"
            onClick={() => onClick?.(row)}
            className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold text-foreground">{row[labelKey]}</span>
              <span className="text-xs font-bold text-foreground">{formatValue(value)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.max(5, widthPct)}%`,
                  background: CHART_PALETTE[idx % CHART_PALETTE.length],
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
};

const polarToCartesian = (cx, cy, r, angleDeg) => {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const describeArc = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

const SemiGauge = ({ value = 0, title = "Completion", subtitle }) => {
  const pct = Math.max(0, Math.min(100, Number(value || 0)));
  const start = -180;
  const end = 0;
  const fillEnd = start + (pct / 100) * (end - start);
  const basePath = describeArc(120, 120, 82, start, end);
  const fillPath = describeArc(120, 120, 82, start, fillEnd);
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <svg width="240" height="150" viewBox="0 0 240 150" className="mx-auto block text-foreground">
        <path d={basePath} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="14" strokeLinecap="round" />
        <path d={fillPath} fill="none" stroke="#1d9bf0" strokeWidth="14" strokeLinecap="round" />
        <text x="120" y="100" textAnchor="middle" fontSize="32" fontWeight="700" fill="currentColor" className="text-foreground">
          {pct.toFixed(1)}%
        </text>
      </svg>
      {subtitle ? (
        <div className="mt-2 text-center text-xs font-medium text-muted-foreground">{subtitle}</div>
      ) : null}
    </div>
  );
};

const WidgetShell = ({ title, subtitle, icon: Icon, color = "slate", children }) => {
  const tones = {
    slate: "border-border bg-card",
    blue: "border-primary/30 bg-card",
    emerald: "border-emerald-500/30 bg-card dark:border-emerald-500/20",
    amber: "border-amber-500/30 bg-card dark:border-amber-500/20",
    rose: "border-rose-500/30 bg-card dark:border-rose-500/20",
    indigo: "border-primary/30 bg-card",
  };
  const iconTones = {
    slate: "bg-muted text-muted-foreground",
    blue: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    indigo: "bg-primary/10 text-primary",
  };

  return (
    <article className={`analytics-widget analytics-widget-${color} relative overflow-hidden rounded-xl border p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/20 ${tones[color] || tones.slate}`}>
      <div className="mb-5 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {Icon ? (
              <span className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${iconTones[color] || iconTones.slate}`}>
                <Icon size={18} strokeWidth={2} />
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-foreground">{title}</h2>
              {subtitle ? <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          aria-label="Widget actions"
        >
          <MoreVertical size={16} />
        </button>
      </div>
      <div className="rounded-lg">{children}</div>
    </article>
  );
};

const KpiTile = ({ label, value, subLabel, icon: Icon, tone = "slate", loading = false }) => {
  const tones = {
    slate: "border-border bg-card",
    blue: "border-primary/30 bg-card",
    emerald: "border-emerald-500/30 bg-card dark:border-emerald-500/20",
    amber: "border-amber-500/30 bg-card dark:border-amber-500/20",
    rose: "border-rose-500/30 bg-card dark:border-rose-500/20",
  };
  const iconTones = {
    slate: "bg-muted text-muted-foreground",
    blue: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  return (
    <div className={`analytics-kpi analytics-kpi-${tone} group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:shadow-lg hover:border-primary/20 ${tones[tone] || tones.slate}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 flex flex-col gap-0.5">
            <div className="text-xl font-bold tracking-tight text-foreground tabular-nums md:text-2xl">
              {loading ? "—" : value}
            </div>
            {subLabel && !loading ? <div className="text-[11px] font-medium text-muted-foreground line-clamp-2">{subLabel}</div> : null}
          </div>
        </div>
        {Icon ? (
          <span className={`flex-shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-105 ${iconTones[tone] || iconTones.slate}`}>
            <Icon size={18} strokeWidth={2} />
          </span>
        ) : null}
      </div>
    </div>
  );
};

const AnalyticsDashboard = () => {
  const [rangePreset, setRangePreset] = useState("mtd");
  const [customRange, setCustomRange] = useState([dayjs().startOf("month"), dayjs()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);

  const [drillOpen, setDrillOpen] = useState(false);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillRows, setDrillRows] = useState([]);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillSearch, setDrillSearch] = useState("");

  const [customWidgetLoading, setCustomWidgetLoading] = useState(false);
  const [customWidgetData, setCustomWidgetData] = useState([]);
  const [customWidgetConfig, setCustomWidgetConfig] = useState({
    metric: "count",
    metricField: "loanAmount",
    groupBy: "bank",
    topN: 12,
  });

  const [customReportLoading, setCustomReportLoading] = useState(false);
  const [customReportRows, setCustomReportRows] = useState([]);
  const [customReportMeta, setCustomReportMeta] = useState(null);
  const [customReportSearch, setCustomReportSearch] = useState("");
  const [customReportConfig, setCustomReportConfig] = useState({
    fields: [
      "loanId",
      "customerName",
      "primaryMobile",
      "typeOfLoan",
      "currentStage",
      "approval_bankName",
      "loanAmount",
      "approval_loanAmountApproved",
      "approval_loanAmountDisbursed",
      "createdAt",
    ],
    sortBy: "updatedAt",
    sortDir: "desc",
    limit: 300,
  });

  const queryParams = useMemo(() => getRangeParams(rangePreset, customRange), [rangePreset, customRange]);

  const ANALYTICS_TIMEOUT_MS = 20000;

  const isConnectionError = (e) => {
    const msg = String(e?.message || "").toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("connection refused") ||
      msg.includes("connection reset")
    );
  };

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), ANALYTICS_TIMEOUT_MS),
      );
      const res = await Promise.race([
        loansApi.getAnalyticsOverview(queryParams),
        timeoutPromise,
      ]);
      setOverview(res?.data || null);
    } catch (err) {
      const connectionDown = isConnectionError(err);
      if (connectionDown) {
        setError(
          "Backend server is not running. Start it with: cd cdb-api && npm run dev",
        );
        setOverview(null);
      } else {
        console.warn("[AnalyticsDashboard] API failed, using fallback:", err?.message);
        setError("");
        try {
          const loans = await fetchAllLoansForFallback();
          const fallback = buildFallbackOverview(loans, rangePreset, customRange);
          setOverview(fallback);
        } catch (fallbackErr) {
          console.error("[AnalyticsDashboard] Fallback also failed:", fallbackErr);
          setError(
            err?.message ||
              "Failed to load analytics. Ensure the backend is running (npm run dev in cdb-api).",
          );
          setOverview(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [queryParams, rangePreset, customRange]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const runCustomWidget = useCallback(async () => {
    try {
      setCustomWidgetLoading(true);
      setError("");
      const res = await loansApi.createCustomWidget({
        ...queryParams,
        ...customWidgetConfig,
      });
      setCustomWidgetData(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("[Analytics] Custom widget error:", err);
      setError(err?.message || "Failed to generate custom widget");
      setCustomWidgetData([]);
    } finally {
      setCustomWidgetLoading(false);
    }
  }, [queryParams, customWidgetConfig]);

  const runCustomReport = useCallback(async () => {
    try {
      setCustomReportLoading(true);
      setError("");
      const res = await loansApi.createCustomReport({
        ...queryParams,
        ...customReportConfig,
      });
      setCustomReportRows(Array.isArray(res?.data) ? res.data : []);
      setCustomReportMeta(res?.meta || null);
    } catch (err) {
      console.error("[Analytics] Custom report error:", err);
      setError(err?.message || "Failed to generate custom report");
      setCustomReportRows([]);
      setCustomReportMeta(null);
    } finally {
      setCustomReportLoading(false);
    }
  }, [queryParams, customReportConfig]);

  const openDrilldown = useCallback(
    async ({ title, widget, bucket, key }) => {
      setDrillTitle(title);
      setDrillOpen(true);
      setDrillLoading(true);
      try {
        const res = await loansApi.getAnalyticsDrilldown({
          ...queryParams,
          widget,
          bucket,
          key,
        });
        setDrillRows(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error("[Analytics] Drilldown error:", err);
        setError(err?.message || "Failed to load drilldown");
        setDrillRows([]);
      } finally {
        setDrillLoading(false);
      }
    },
    [queryParams],
  );

  const widgets = overview?.widgets || {};
  const totals = overview?.totals || {};
  const completionPct = useMemo(() => {
    const done = (widgets.caseStatusDistribution || [])
      .filter((row) =>
        /(disburs|deliver|paid|closed|complete)/i.test(String(row?.status || "")),
      )
      .reduce((sum, row) => sum + Number(row?.count || 0), 0);
    const total = Number(totals.totalCases || 0);
    return total > 0 ? (done / total) * 100 : 0;
  }, [totals.totalCases, widgets.caseStatusDistribution]);

  const drillColumns = [
    { title: "Loan ID", dataIndex: "loanId", key: "loanId", width: 140, fixed: "left" },
    { title: "Customer", dataIndex: "customerName", key: "customerName", width: 220 },
    { title: "Mobile", dataIndex: "primaryMobile", key: "primaryMobile", width: 130 },
    { title: "Loan Type", dataIndex: "typeOfLoan", key: "typeOfLoan", width: 140 },
    { title: "Stage", dataIndex: "currentStage", key: "currentStage", width: 120 },
    { title: "Status", dataIndex: "status", key: "status", width: 130 },
    {
      title: "Bank",
      key: "bank",
      width: 220,
      render: (_, row) => row.approval_bankName || row.postfile_bankName || "-",
    },
    {
      title: "Loan Amount",
      key: "amount",
      width: 140,
      render: (_, row) =>
        formatINR(
          row.disburse_amount ||
            row.approval_loanAmountDisbursed ||
            row.approval_loanAmountApproved ||
            row.loanAmount ||
            0,
        ),
    },
    {
      title: "Business Date",
      key: "businessDate",
      width: 140,
      render: (_, row) => {
        const d = getPrimaryBusinessDate(row);
        return d?.isValid() ? d.format("DD MMM YYYY") : "-";
      },
    },
  ];

  const reportColumns = useMemo(
    () =>
      (customReportMeta?.fields || customReportConfig.fields).map((field) => ({
        title: field,
        dataIndex: field,
        key: field,
        width: 180,
        render: (value) => {
          if (value === null || value === undefined || value === "") return "-";
          if (String(field).toLowerCase().includes("date")) {
            const d = dayjs(value);
            return d.isValid() ? d.format("DD MMM YYYY") : String(value);
          }
          return String(value);
        },
      })),
    [customReportConfig.fields, customReportMeta?.fields],
  );

  const filteredReportRows = useMemo(() => {
    const q = String(customReportSearch || "").trim().toLowerCase();
    if (!q) return customReportRows;
    const fields = customReportMeta?.fields || customReportConfig.fields || [];
    return customReportRows.filter((row) =>
      fields.some((field) => String(row?.[field] ?? "").toLowerCase().includes(q)),
    );
  }, [customReportConfig.fields, customReportMeta?.fields, customReportRows, customReportSearch]);

  const filteredDrillRows = useMemo(() => {
    const q = String(drillSearch || "").trim().toLowerCase();
    if (!q) return drillRows;
    return drillRows.filter((row) =>
      [
        row.loanId,
        row.customerName,
        row.primaryMobile,
        row.typeOfLoan,
        row.currentStage,
        row.status,
        row.approval_bankName,
        row.postfile_bankName,
        row.vehicleMake,
        row.vehicleModel,
        row.vehicleVariant,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [drillRows, drillSearch]);

  return (
    <main className="analytics-dashboard analytics-tail min-h-screen bg-background overflow-x-hidden">
      <div className="app-max-wrap w-full max-w-[100%] py-6 space-y-6">
        {/* Hero: Company-branded header */}
        <section className="analytics-hero relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4)]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/[0.03] pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ChartNoAxesCombined size={22} strokeWidth={2} />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      AutoCredits India LLP
                    </span>
                  </div>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl lg:text-[1.75rem]">
                  Analytics Dashboard
                </h1>
                <p className="max-w-xl text-sm font-medium text-muted-foreground leading-relaxed">
                  Real-time loan performance insights, pipeline analytics, and custom reporting — all in one command center.
                </p>
              </div>

              <div className="analytics-range-wrap flex flex-wrap items-center gap-2">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRangePreset(option.value)}
                    className={`analytics-range-btn rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all duration-200 ${
                      rangePreset === option.value
                        ? "is-active border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}

                {rangePreset === "custom" ? (
                  <RangePicker
                    value={customRange}
                    allowClear={false}
                    onChange={(values) => setCustomRange(values || [])}
                    className="analytics-date-picker h-10 rounded-xl"
                  />
                ) : null}

                <Button
                  type="primary"
                  icon={<RefreshCcw size={14} />}
                  className="analytics-refresh-btn h-10 rounded-xl !border-primary !bg-primary !text-primary-foreground shadow-md hover:!opacity-90"
                  onClick={fetchOverview}
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <Alert
            type="error"
            message={error}
            showIcon
            className="analytics-alert rounded-xl border-border"
          />
        ) : null}

        <div>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Key Metrics</h2>
          <section className="analytics-kpi-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Total Cases"
          value={Number(totals.totalCases || 0).toLocaleString("en-IN")}
          subLabel="In selected timeframe"
          tone="blue"
          icon={BriefcaseBusiness}
          loading={loading}
        />
        <KpiTile
          label="Total Loan Amount"
          value={formatINR(totals.totalLoanAmount || 0)}
          subLabel="Sum across filtered loans"
          tone="emerald"
          icon={IndianRupee}
          loading={loading}
        />
        <KpiTile
          label="Disbursed / Delivered"
          value={formatINR(totals.totalDisbursedAmount || 0)}
          subLabel="Business-event amount volume"
          tone="amber"
          icon={TrendingUp}
          loading={loading}
        />
        <KpiTile
          label="Pending Disbursal"
          value={Number(widgets.approvalPendingDisbursal?.count || 0).toLocaleString("en-IN")}
          subLabel={formatINR(widgets.approvalPendingDisbursal?.amount || 0)}
          tone="rose"
          icon={Clock3}
          loading={loading}
        />
      </section>
        </div>

      <div>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Charts & Insights</h2>
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          {loading ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              Loading analytics...
            </div>
          ) : (
            <>
          <div className="xl:col-span-5">
            <WidgetShell
              title="Total Loans Trend"
              subtitle="Click any month to open case-level detail"
              icon={BarChart3}
              color="blue"
            >
              <VerticalBarChart
                points={widgets.totalLoansTrend || []}
                valueKey="value"
                color="#1d9bf0"
                onSelect={(p) =>
                  openDrilldown({
                    title: `Loans in ${p.label}`,
                    widget: "total_loan_trend",
                    bucket: p.bucket,
                  })
                }
              />
            </WidgetShell>
          </div>

          <div className="xl:col-span-4">
            <WidgetShell
              title="Disbursed Amount Trend"
              subtitle="Month-wise disbursal movement"
              icon={IndianRupee}
              color="emerald"
            >
              <AreaLineChart
                points={(widgets.disbursedAmountTrend || []).map((item) => ({
                  ...item,
                  value: item.amount || 0,
                }))}
                valueKey="value"
                color="#059669"
                id="disbursed-trend"
                onSelect={(p) =>
                  openDrilldown({
                    title: `Disbursed in ${p.label}`,
                    widget: "disbursed_amount_trend",
                    bucket: p.bucket,
                  })
                }
              />
            </WidgetShell>
          </div>

          <div className="xl:col-span-3">
            <WidgetShell
              title="Business Target"
              subtitle="Disbursed/Delivered share in selected range"
              icon={TrendingUp}
              color="indigo"
            >
              <SemiGauge
                value={completionPct}
                title="Execution Progress"
                subtitle={`${Number(totals.totalCases || 0).toLocaleString("en-IN")} total cases in range`}
              />
            </WidgetShell>
          </div>

          <div className="xl:col-span-5">
            <WidgetShell
              title="Stage Funnel"
              subtitle="Pipeline concentration by stage"
              icon={GitBranch}
              color="indigo"
            >
              <FunnelChart
                rows={widgets.stageFunnel || []}
                onSelect={(stage) =>
                  openDrilldown({
                    title: `Stage: ${stage.stage}`,
                    widget: "stage_funnel",
                    key: stage.stage,
                  })
                }
              />
            </WidgetShell>
          </div>

          <div className="xl:col-span-4">
            <WidgetShell
              title="Loan Type Mix"
              subtitle="Distribution by case type"
              icon={CircleDot}
              color="slate"
            >
              <DonutBreakdown
                rows={widgets.loanTypeMix || []}
                labelKey="label"
                valueKey="count"
                onClick={(row) =>
                  openDrilldown({
                    title: `Loan Type: ${row.label}`,
                    widget: "loan_type_mix",
                    key: String(row.label || "").toLowerCase(),
                  })
                }
              />
            </WidgetShell>
          </div>

          <div className="xl:col-span-3">
            <WidgetShell
              title="Status Distribution"
              subtitle="Current lifecycle status split"
              icon={ShieldAlert}
              color="slate"
            >
              <DonutBreakdown
                rows={widgets.caseStatusDistribution || []}
                labelKey="status"
                valueKey="count"
                onClick={(row) =>
                  openDrilldown({
                    title: `Status: ${row.status}`,
                    widget: "case_status_distribution",
                    key: String(row.status || "").toLowerCase(),
                  })
                }
              />
            </WidgetShell>
          </div>

          <div className="xl:col-span-6">
            <WidgetShell
              title="Bank Pipeline + Amounts"
              subtitle="Top financed banks by case volume"
              icon={Building2}
              color="slate"
            >
              <HorizontalBarChart
                rows={(widgets.bankPipeline || []).slice(0, 6)}
                labelKey="bankName"
                valueKey="total"
                onClick={(row) =>
                  openDrilldown({
                    title: `Bank: ${row.bankName}`,
                    widget: "bank_pipeline",
                    key: String(row.bankName || "").toLowerCase(),
                  })
                }
              />
            </WidgetShell>
          </div>

          <div className="xl:col-span-3">
            <WidgetShell
              title="Source Performance"
              subtitle="Direct vs indirect efficiency"
              icon={SearchCode}
              color="slate"
            >
              <HorizontalBarChart
                rows={(widgets.sourcePerformance || []).slice(0, 6).map((row) => ({
                  ...row,
                  label: `${row.source} (${row.conversionRate || 0}%)`,
                  total: row.total || 0,
                }))}
                labelKey="label"
                valueKey="total"
                onClick={(row) =>
                  openDrilldown({
                    title: `Source: ${row.source}`,
                    widget: "source_performance",
                    key: String(row.source || "").toLowerCase(),
                  })
                }
              />
            </WidgetShell>
          </div>

          <div className="xl:col-span-3">
            <WidgetShell
              title="Dealer Performance"
              subtitle="Top dealer contribution"
              icon={BriefcaseBusiness}
              color="slate"
            >
              <HorizontalBarChart
                rows={(widgets.dealerPerformance || []).slice(0, 6)}
                labelKey="dealerName"
                valueKey="total"
                onClick={(row) =>
                  openDrilldown({
                    title: `Dealer: ${row.dealerName}`,
                    widget: "dealer_performance",
                    key: String(row.dealerName || "").toLowerCase(),
                  })
                }
              />
            </WidgetShell>
          </div>

          <div className="xl:col-span-5">
            <WidgetShell
              title="Vehicle Segment Trends"
              subtitle="Model/variant concentration"
              icon={CarFront}
              color="slate"
            >
              <HorizontalBarChart
                rows={(widgets.vehicleSegmentTrends || []).slice(0, 6).map((row) => ({
                  ...row,
                  label: `${row.segment} | Avg ${formatINR(row.avgLoanAmount || 0)}`,
                }))}
                labelKey="label"
                valueKey="total"
                onClick={(row) =>
                  openDrilldown({
                    title: `Vehicle Segment: ${row.segment}`,
                    widget: "vehicle_segment",
                    key: String(row.segment || "").toLowerCase(),
                  })
                }
              />
            </WidgetShell>
          </div>

          <div className="xl:col-span-4">
            <WidgetShell
              title="Cash Car Pipeline"
              subtitle="Cash-car cases tracked separately from banks"
              icon={IndianRupee}
              color="amber"
            >
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openDrilldown({
                      title: "Cash Car Cases",
                      widget: "cash_car_all",
                    })
                  }
                  className="rounded-xl border border-amber-500/30 bg-card px-3 py-2 text-left transition hover:border-amber-500/50 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400">Total</div>
                      <div className="text-xs text-muted-foreground">
                        {formatINR(widgets.cashCarSummary?.amount || 0)}
                      </div>
                    </div>
                    <div className="text-lg font-black text-foreground">
                      {Number(widgets.cashCarSummary?.total || 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openDrilldown({
                        title: "Cash Car Delivered",
                        widget: "cash_car_delivered",
                      })
                    }
                    className="rounded-xl border border-emerald-500/30 bg-card px-3 py-2 text-left transition hover:border-emerald-500/50 hover:shadow-sm"
                  >
                    <div className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Delivered</div>
                    <div className="text-base font-black text-foreground">
                      {Number(widgets.cashCarSummary?.delivered || 0).toLocaleString("en-IN")}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openDrilldown({
                        title: "Cash Car Pending Delivery",
                        widget: "cash_car_pending_delivery",
                      })
                    }
                    className="rounded-xl border border-rose-500/30 bg-card px-3 py-2 text-left transition hover:border-rose-500/50 hover:shadow-sm"
                  >
                    <div className="text-[11px] font-bold uppercase text-rose-600 dark:text-rose-400">Pending</div>
                    <div className="text-base font-black text-foreground">
                      {Number(widgets.cashCarSummary?.pending || 0).toLocaleString("en-IN")}
                    </div>
                  </button>
                </div>
              </div>
            </WidgetShell>
          </div>

          <div className="xl:col-span-3">
            <WidgetShell
              title="Repeated Customers"
              subtitle="Identity collision and repeat case flags"
              icon={UsersRound}
              color="rose"
            >
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-rose-500/30 bg-card p-3 text-left transition hover:border-rose-500/50 hover:shadow-sm"
                  onClick={() =>
                    openDrilldown({
                      title: "Repeated Customers (identity collisions)",
                      widget: "repeated_customers",
                    })
                  }
                >
                  <div className="text-[11px] font-bold uppercase text-rose-600 dark:text-rose-400">Identities</div>
                  <div className="text-xl font-black text-foreground">
                    {widgets.repeatedCustomers?.repeatedIdentityCount || 0}
                  </div>
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-fuchsia-500/30 bg-card p-3 text-left transition hover:border-fuchsia-500/50 hover:shadow-sm"
                  onClick={() =>
                    openDrilldown({
                      title: "Repeated Customer Cases",
                      widget: "repeated_customers",
                    })
                  }
                >
                  <div className="text-[11px] font-bold uppercase text-fuchsia-600 dark:text-fuchsia-400">Cases</div>
                  <div className="text-xl font-black text-foreground">
                    {widgets.repeatedCustomers?.repeatedCaseCount || 0}
                  </div>
                </button>
              </div>
            </WidgetShell>
          </div>

          <div className="xl:col-span-12">
            <WidgetShell
              title="Quality Alerts"
              subtitle="Approval pending and critical missing data"
              icon={AlertTriangle}
              color="amber"
            >
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() =>
                    openDrilldown({
                      title: "Approval Pending Disbursal",
                      widget: "approval_pending_disbursal",
                    })
                  }
                  className="rounded-xl border border-amber-500/30 bg-card px-3 py-2 text-left transition hover:border-amber-500/50 hover:shadow-sm"
                >
                  <div className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400">Pending</div>
                  <div className="text-base font-black text-foreground">
                    {widgets.approvalPendingDisbursal?.count || 0}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openDrilldown({
                      title: "Missing RC Registration",
                      widget: "missing_reg_number",
                    })
                  }
                  className="rounded-xl border border-rose-500/30 bg-card px-3 py-2 text-left transition hover:border-rose-500/50 hover:shadow-sm"
                >
                  <div className="text-[11px] font-bold uppercase text-rose-600 dark:text-rose-400">Missing RC</div>
                  <div className="text-base font-black text-foreground">
                    {widgets.missingRegNumber?.count || 0}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openDrilldown({
                      title: "Missing Critical Delivery Fields",
                      widget: "missing_delivery_fields",
                    })
                  }
                  className="rounded-xl border border-orange-500/30 bg-card px-3 py-2 text-left transition hover:border-orange-500/50 hover:shadow-sm"
                >
                  <div className="text-[11px] font-bold uppercase text-orange-600 dark:text-orange-400">Delivery Gaps</div>
                  <div className="text-base font-black text-foreground">
                    {widgets.missingCriticalDeliveryFields?.count || 0}
                  </div>
                </button>
              </div>
            </WidgetShell>
          </div>
            </>
          )}
        </section>

        <section className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm">
          <Tabs
            className="analytics-tabs"
            defaultActiveKey="customWidget"
            items={[
              {
                key: "customWidget",
                label: (
                  <span className="flex items-center gap-2">
                    <Filter size={14} />
                    Custom Widget
                  </span>
                ),
                children: (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      <Select
                        value={customWidgetConfig.metric}
                        options={CUSTOM_WIDGET_METRICS}
                        onChange={(v) =>
                          setCustomWidgetConfig((prev) => ({ ...prev, metric: v }))
                        }
                      />
                      <Select
                        value={customWidgetConfig.groupBy}
                        options={CUSTOM_WIDGET_GROUP_BY}
                        onChange={(v) =>
                          setCustomWidgetConfig((prev) => ({ ...prev, groupBy: v }))
                        }
                      />
                      <Select
                        value={customWidgetConfig.metricField}
                        options={CUSTOM_WIDGET_FIELDS}
                        onChange={(v) =>
                          setCustomWidgetConfig((prev) => ({ ...prev, metricField: v }))
                        }
                      />
                      <InputNumber
                        min={1}
                        max={200}
                        value={customWidgetConfig.topN}
                        onChange={(v) =>
                          setCustomWidgetConfig((prev) => ({
                            ...prev,
                            topN: Number(v || 12),
                          }))
                        }
                        style={{ width: "100%" }}
                      />
                    </div>
                    <Button
                      type="primary"
                      className="rounded-xl !border-primary !bg-primary !text-primary-foreground hover:!opacity-90"
                      loading={customWidgetLoading}
                      onClick={runCustomWidget}
                    >
                      Build Widget
                    </Button>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      {customWidgetData.map((row) => (
                        <div
                          key={row.key}
                          className="rounded-xl border border-border bg-muted/50 px-3 py-2"
                        >
                          <div className="truncate text-xs font-semibold text-muted-foreground">
                            {row.label}
                          </div>
                          <div className="text-lg font-black text-foreground">
                            {Number(row.value || 0).toLocaleString("en-IN")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                key: "customReport",
                label: (
                  <span className="flex items-center gap-2">
                    <Database size={14} />
                    Custom Report
                  </span>
                ),
                children: (
                  <div className="space-y-3">
                    <Select
                      mode="multiple"
                      value={customReportConfig.fields}
                      options={REPORT_FIELDS.map((f) => ({ label: f, value: f }))}
                      onChange={(values) =>
                        setCustomReportConfig((prev) => ({ ...prev, fields: values }))
                      }
                      maxTagCount="responsive"
                      placeholder="Select fields for report output"
                    />
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <Select
                        value={customReportConfig.sortBy}
                        options={REPORT_FIELDS.map((f) => ({ label: f, value: f }))}
                        onChange={(v) =>
                          setCustomReportConfig((prev) => ({ ...prev, sortBy: v }))
                        }
                      />
                      <Select
                        value={customReportConfig.sortDir}
                        options={[
                          { label: "Descending", value: "desc" },
                          { label: "Ascending", value: "asc" },
                        ]}
                        onChange={(v) =>
                          setCustomReportConfig((prev) => ({ ...prev, sortDir: v }))
                        }
                      />
                      <InputNumber
                        min={10}
                        max={10000}
                        value={customReportConfig.limit}
                        onChange={(v) =>
                          setCustomReportConfig((prev) => ({
                            ...prev,
                            limit: Number(v || 300),
                          }))
                        }
                        style={{ width: "100%" }}
                      />
                    </div>
                    <Button
                      type="primary"
                      className="rounded-xl !border-primary !bg-primary !text-primary-foreground hover:!opacity-90"
                      loading={customReportLoading}
                      onClick={runCustomReport}
                    >
                      Generate Report
                    </Button>
                    <div className="analytics-report-panel rounded-xl border border-border bg-card p-3">
                      <div className="analytics-report-toolbar mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm font-bold text-foreground">Report Output</div>
                        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
                          <Input
                            allowClear
                            value={customReportSearch}
                            onChange={(e) => setCustomReportSearch(e.target.value)}
                            placeholder="Search across generated report rows"
                            className="analytics-report-search w-full md:w-80"
                          />
                          <div className="analytics-report-stats inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-foreground">
                            <span>Rows: {filteredReportRows.length}</span>
                            <span className="text-muted-foreground">•</span>
                            <span>Cols: {(customReportMeta?.fields || customReportConfig.fields || []).length}</span>
                          </div>
                        </div>
                      </div>
                      <Table
                        className="analytics-table"
                        rowKey={(row, idx) => row.loanId || row._id || `r-${idx}`}
                        columns={reportColumns}
                        dataSource={filteredReportRows}
                        size="small"
                        pagination={{ pageSize: 20, showSizeChanger: true }}
                        rowClassName={(_, index) => (index % 2 ? "analytics-report-row-alt" : "")}
                        scroll={{ x: 1400 }}
                      />
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </section>
      </div>
      </div>

      <Modal
        className="analytics-modal"
        wrapClassName="analytics-modal-wrap"
        title={drillTitle}
        open={drillOpen}
        onCancel={() => setDrillOpen(false)}
        footer={null}
        width={1200}
      >
        <Spin spinning={drillLoading}>
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Input
              allowClear
              value={drillSearch}
              onChange={(e) => setDrillSearch(e.target.value)}
              placeholder="Search in this drilldown (Loan ID, customer, bank, stage...)"
              className="w-full md:w-96"
            />
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-foreground">
              <span>Rows: {filteredDrillRows.length}</span>
              <span className="text-muted-foreground">•</span>
              <span>Total: {drillRows.length}</span>
            </div>
          </div>
          <Table
            className="analytics-table"
            rowKey={(row) => row._id || row.loanId}
            columns={drillColumns}
            dataSource={filteredDrillRows}
            size="small"
            pagination={{ pageSize: 15, showSizeChanger: true }}
            scroll={{ x: 1300, y: 460 }}
          />
        </Spin>
      </Modal>
    </main>
  );
};

export default AnalyticsDashboard;
