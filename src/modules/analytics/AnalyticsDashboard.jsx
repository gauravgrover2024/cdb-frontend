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

const fetchAllLoansForFallback = async () => {
  const all = [];
  let skip = 0;
  const limit = 1000;
  while (true) {
    const res = await loansApi.getAll({ limit, skip });
    const rows = Array.isArray(res?.data) ? res.data : [];
    all.push(...rows);
    if (!res?.hasMore || rows.length === 0) break;
    skip += rows.length;
  }
  return all;
};

const TrendBars = ({ points = [], valueKey = "value", tone = "emerald", onSelect }) => {
  if (!points.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        No data for selected timeframe
      </div>
    );
  }

  const values = points.map((p) => Number(p[valueKey] || 0));
  const min = Math.min(...values);
  const max = Math.max(...values, 1);
  const width = Math.max(260, points.length * 38);
  const height = 92;
  const pad = 10;
  const y = (v) =>
    max === min
      ? height / 2
      : pad + ((max - v) / (max - min)) * (height - pad * 2);
  const x = (idx) =>
    points.length <= 1
      ? width / 2
      : pad + (idx * (width - pad * 2)) / (points.length - 1);
  const polyline = points
    .map((point, idx) => `${x(idx)},${y(Number(point[valueKey] || 0))}`)
    .join(" ");
  const toneClass =
    tone === "amber"
      ? "text-amber-500"
      : tone === "indigo"
        ? "text-indigo-500"
        : "text-emerald-500";
  const stroke = tone === "amber" ? "#f59e0b" : tone === "indigo" ? "#6366f1" : "#10b981";

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900">
        <svg width={width} height={height} role="img" aria-label="trend chart">
          <polyline
            fill="none"
            stroke={stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polyline}
          />
          {points.map((point, idx) => (
            <circle
              key={point.bucket}
              cx={x(idx)}
              cy={y(Number(point[valueKey] || 0))}
              r="3.2"
              fill={stroke}
            />
          ))}
        </svg>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {points.slice(-10).map((point) => (
          <button
            key={point.bucket}
            type="button"
            onClick={() => onSelect?.(point)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{point.label}</div>
            <div className={`text-xs font-bold ${toneClass}`}>{Number(point[valueKey] || 0).toLocaleString("en-IN")}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

const CompactList = ({ rows = [], labelKey, valueKey, onClick, format = (v) => v }) => {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        No records
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <button
          key={`${row[labelKey]}-${row[valueKey]}`}
          type="button"
          onClick={() => onClick?.(row)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-500/60 dark:hover:bg-sky-950/30"
        >
          <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{row[labelKey]}</span>
          <span className="ml-3 text-sm font-bold text-slate-900 dark:text-slate-100">{format(row[valueKey])}</span>
        </button>
      ))}
    </div>
  );
};

const WidgetShell = ({ title, subtitle, icon: Icon, color = "slate", children }) => {
  const tones = {
    slate: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    blue: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    emerald: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    amber: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    rose: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    indigo: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
  };
  const iconTones = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300",
  };

  return (
    <article className={`analytics-widget analytics-widget-${color} rounded-2xl border p-3 shadow-sm transition hover:shadow-md ${tones[color] || tones.slate}`}>
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon ? (
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg ${iconTones[color] || iconTones.slate}`}>
                <Icon size={14} />
              </span>
            ) : null}
            <h2 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          </div>
          {subtitle ? <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </article>
  );
};

const KpiTile = ({ label, value, subLabel, icon: Icon, tone = "slate" }) => {
  const tones = {
    slate: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    blue: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    emerald: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    amber: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    rose: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
  };

  return (
    <div className={`analytics-kpi analytics-kpi-${tone} rounded-2xl border p-3 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">{label}</div>
        {Icon ? <Icon size={16} className="text-slate-600 dark:text-slate-300" /> : null}
      </div>
      <div className="text-[1.35rem] font-black tracking-tight text-slate-900 dark:text-slate-100">{value}</div>
      {subLabel ? <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">{subLabel}</div> : null}
    </div>
  );
};

const AnalyticsDashboard = () => {
  const [rangePreset, setRangePreset] = useState("mtd");
  const [customRange, setCustomRange] = useState([dayjs().startOf("month"), dayjs()]);
  const [allLoans, setAllLoans] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [usingFallback] = useState(true);

  const [drillOpen, setDrillOpen] = useState(false);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillRows, setDrillRows] = useState([]);
  const [drillTitle, setDrillTitle] = useState("");

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

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const loans = await fetchAllLoansForFallback();
      setAllLoans(loans);
    } catch (err) {
      setError(err?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (!allLoans.length) return;
    setOverview(buildFallbackOverview(allLoans, rangePreset, customRange));
  }, [allLoans, customRange, rangePreset]);

  const runCustomWidget = useCallback(async () => {
    try {
      setCustomWidgetLoading(true);
      try {
        const res = await loansApi.createCustomWidget({
          ...queryParams,
          ...customWidgetConfig,
        });
        setCustomWidgetData(Array.isArray(res?.data) ? res.data : []);
      } catch {
        const { rows } = filterLoansByRange(allLoans, rangePreset, customRange);
        const grouped = new Map();
        rows.forEach((row) => {
          let label = "Unknown";
          if (customWidgetConfig.groupBy === "month") {
            label = monthLabel(monthKey(getPrimaryBusinessDate(row)) || "");
          } else if (customWidgetConfig.groupBy === "bank") {
            label = String(row?.approval_bankName || row?.postfile_bankName || row?.bankName || "Unknown");
          } else if (customWidgetConfig.groupBy === "source") {
            const srcRaw = String(row?.approval_loanBookedIn || row?.recordSource || row?.source || "").toLowerCase();
            label = srcRaw.includes("indirect") ? "Indirect" : srcRaw.includes("direct") ? "Direct" : "Unknown";
          } else if (customWidgetConfig.groupBy === "loanType") {
            label = String(row?.typeOfLoan || row?.loanType || row?.caseType || "Unknown");
          } else if (customWidgetConfig.groupBy === "status") {
            label = statusKey(row);
          } else if (customWidgetConfig.groupBy === "stage") {
            label = stageKey(row?.currentStage);
          } else if (customWidgetConfig.groupBy === "dealer") {
            label = String(row?.dealerName || row?.showroomDealerName || row?.showroomName || "Unknown");
          } else if (customWidgetConfig.groupBy === "vehicleMake") {
            label = String(row?.vehicleMake || "Unknown");
          } else if (customWidgetConfig.groupBy === "vehicleModel") {
            label = String(row?.vehicleModel || "Unknown");
          }

          if (!grouped.has(label)) grouped.set(label, []);
          grouped.get(label).push(row);
        });

        const field = customWidgetConfig.metricField;
        const metric = customWidgetConfig.metric;
        const data = Array.from(grouped.entries()).map(([label, list]) => {
          const values = list.map((r) => num(pick(r, field)));
          let value = list.length;
          if (metric === "sum") value = values.reduce((a, b) => a + b, 0);
          if (metric === "avg") value = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          return { key: label, label, value };
        });
        data.sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
        setCustomWidgetData(data.slice(0, Number(customWidgetConfig.topN || 12)));
      }
    } finally {
      setCustomWidgetLoading(false);
    }
  }, [allLoans, customRange, customWidgetConfig, queryParams, rangePreset]);

  const runCustomReport = useCallback(async () => {
    try {
      setCustomReportLoading(true);
      try {
        const res = await loansApi.createCustomReport({
          ...queryParams,
          ...customReportConfig,
        });
        setCustomReportRows(Array.isArray(res?.data) ? res.data : []);
        setCustomReportMeta(res?.meta || null);
      } catch {
        const { rows } = filterLoansByRange(allLoans, rangePreset, customRange);
        const sortField = customReportConfig.sortBy || "updatedAt";
        const dir = customReportConfig.sortDir === "asc" ? 1 : -1;
        const normalized = [...rows].sort((a, b) => {
          const va = pick(a, sortField);
          const vb = pick(b, sortField);
          if (va === vb) return 0;
          if (va === undefined || va === null) return 1;
          if (vb === undefined || vb === null) return -1;
          if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
          const da = dayjs(va);
          const db = dayjs(vb);
          if (da.isValid() && db.isValid()) return (da.valueOf() - db.valueOf()) * dir;
          return String(va).localeCompare(String(vb)) * dir;
        });
        const limited = normalized.slice(0, Number(customReportConfig.limit || 300));
        const projected = limited.map((row) => {
          const obj = {};
          (customReportConfig.fields || []).forEach((f) => {
            obj[f] = pick(row, f);
          });
          obj.loanId = row.loanId || obj.loanId;
          obj._id = row._id || obj._id;
          return obj;
        });
        setCustomReportRows(projected);
        setCustomReportMeta({
          fields: customReportConfig.fields || [],
          source: "local-fallback",
          total: projected.length,
        });
      }
    } finally {
      setCustomReportLoading(false);
    }
  }, [allLoans, customRange, customReportConfig, queryParams, rangePreset]);

  const openDrilldown = useCallback(
    ({ title, widget, bucket, key }) => {
      setDrillTitle(title);
      setDrillOpen(true);
      setDrillLoading(true);
      const rows = buildLocalDrillRows(allLoans, rangePreset, customRange, {
        widget,
        bucket,
        key,
      });
      setDrillRows(rows);
      setDrillLoading(false);
    },
    [allLoans, customRange, rangePreset],
  );

  const widgets = overview?.widgets || {};
  const totals = overview?.totals || {};

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

  return (
    <main className="analytics-dashboard analytics-tail space-y-4 bg-[#f5f7fb] p-4 md:p-6 dark:bg-[#0b1220]">
      <section className="analytics-hero rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
              <ChartNoAxesCombined size={14} />
              Loans Analytics
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
              Performance Command Center
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Interactive widgets, drill-down cases and custom reporting in one place.
            </p>
          </div>

          <div className="analytics-range-wrap flex flex-wrap items-center gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRangePreset(option.value)}
                className={`analytics-range-btn rounded-xl border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                  rangePreset === option.value
                    ? "is-active border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/60"
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
                className="h-9 rounded-xl"
              />
            ) : null}

            <Button type="primary" icon={<RefreshCcw size={14} />} className="analytics-refresh-btn h-9 rounded-xl !border-blue-600 !bg-blue-600 !text-white hover:!border-blue-700 hover:!bg-blue-700 dark:!border-blue-500 dark:!bg-blue-500 dark:hover:!border-blue-400 dark:hover:!bg-blue-400" onClick={fetchOverview}>
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {error ? <Alert type="error" message={error} showIcon /> : null}
      {usingFallback && allLoans.length ? (
        <Alert
          type="info"
          showIcon
          message={`Live analytics from full dataset (${allLoans.length.toLocaleString("en-IN")} cases)`}
          description="Date basis: disbursement date for finance cases, delivery date for cash-car cases."
        />
      ) : null}

      <section className="analytics-kpi-grid grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          label="Total Cases"
          value={Number(totals.totalCases || 0).toLocaleString("en-IN")}
          subLabel="In selected timeframe"
          tone="blue"
          icon={BriefcaseBusiness}
        />
        <KpiTile
          label="Total Loan Amount"
          value={formatINR(totals.totalLoanAmount || 0)}
          subLabel="Sum across filtered loans"
          tone="emerald"
          icon={IndianRupee}
        />
        <KpiTile
          label="Disbursed / Delivered"
          value={formatINR(totals.totalDisbursedAmount || 0)}
          subLabel="Business-event amount volume"
          tone="amber"
          icon={TrendingUp}
        />
        <KpiTile
          label="Pending Disbursal"
          value={Number(widgets.approvalPendingDisbursal?.count || 0).toLocaleString("en-IN")}
          subLabel={formatINR(widgets.approvalPendingDisbursal?.amount || 0)}
          tone="rose"
          icon={Clock3}
        />
      </section>

      <Spin spinning={loading}>
        <section className="grid grid-cols-1 gap-3 2xl:grid-cols-3">
          <div className="space-y-3 2xl:col-span-2">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <WidgetShell
                title="Total Loans Trend"
                subtitle="Click any month to open case-level detail"
                icon={BarChart3}
                color="blue"
              >
                <TrendBars
                  points={widgets.totalLoansTrend || []}
                  valueKey="value"
                  tone="emerald"
                  onSelect={(p) =>
                    openDrilldown({
                      title: `Loans in ${p.label}`,
                      widget: "total_loan_trend",
                      bucket: p.bucket,
                    })
                  }
                />
              </WidgetShell>

              <WidgetShell
                title="Disbursed Amount Trend"
                subtitle="Month-wise disbursal movement"
                icon={IndianRupee}
                color="emerald"
              >
                <TrendBars
                  points={(widgets.disbursedAmountTrend || []).map((item) => ({
                    ...item,
                    value: item.amount || 0,
                  }))}
                  valueKey="value"
                  tone="amber"
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

            <WidgetShell
              title="Stage Funnel"
              subtitle="Pipeline concentration by stage"
              icon={GitBranch}
              color="indigo"
            >
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {(widgets.stageFunnel || []).map((stage) => (
                  <button
                    key={stage.stage}
                    type="button"
                    onClick={() =>
                      openDrilldown({
                        title: `Stage: ${stage.stage}`,
                        widget: "stage_funnel",
                        key: stage.stage,
                      })
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-left transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500/60 dark:hover:bg-indigo-950/30"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {stage.stage}
                    </div>
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {(stage.count || 0).toLocaleString("en-IN")}
                    </div>
                  </button>
                ))}
              </div>
            </WidgetShell>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
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
                    className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-left dark:border-amber-900/60 dark:bg-slate-900"
                  >
                    <div className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-300">Pending</div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">
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
                    className="rounded-xl border border-rose-300 bg-white px-3 py-2 text-left dark:border-rose-900/60 dark:bg-slate-900"
                  >
                    <div className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-300">Missing RC</div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">
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
                    className="rounded-xl border border-orange-300 bg-white px-3 py-2 text-left dark:border-orange-900/60 dark:bg-slate-900"
                  >
                    <div className="text-[11px] font-bold uppercase text-orange-700 dark:text-orange-300">Delivery Gaps</div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">
                      {widgets.missingCriticalDeliveryFields?.count || 0}
                    </div>
                  </button>
                </div>
              </WidgetShell>

              <WidgetShell
                title="Repeated Customers"
                subtitle="Identity collision and repeat case flags"
                icon={UsersRound}
                color="rose"
              >
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-rose-300 bg-white p-3 text-left dark:border-rose-900/60 dark:bg-slate-900"
                    onClick={() =>
                      openDrilldown({
                        title: "Repeated Customers (identity collisions)",
                        widget: "repeated_customers",
                      })
                    }
                  >
                    <div className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-300">Identities</div>
                    <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                      {widgets.repeatedCustomers?.repeatedIdentityCount || 0}
                    </div>
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-fuchsia-300 bg-white p-3 text-left dark:border-fuchsia-900/60 dark:bg-slate-900"
                    onClick={() =>
                      openDrilldown({
                        title: "Repeated Customer Cases",
                        widget: "repeated_customers",
                      })
                    }
                  >
                    <div className="text-[11px] font-bold uppercase text-fuchsia-700 dark:text-fuchsia-300">Cases</div>
                    <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                      {widgets.repeatedCustomers?.repeatedCaseCount || 0}
                    </div>
                  </button>
                </div>
              </WidgetShell>
            </div>
          </div>

          <div className="space-y-4">
            <WidgetShell
              title="Loan Type Mix"
              subtitle="Distribution by case type"
              icon={CircleDot}
              color="slate"
            >
              <CompactList
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

            <WidgetShell
              title="Bank Pipeline + Amounts"
              subtitle="Top financed banks by case volume"
              icon={Building2}
              color="slate"
            >
              <CompactList
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
                  className="flex items-center justify-between rounded-xl border border-amber-300 bg-white px-3 py-2 text-left dark:border-amber-900/60 dark:bg-slate-900"
                >
                  <div>
                    <div className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-300">Total</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {formatINR(widgets.cashCarSummary?.amount || 0)}
                    </div>
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                    {Number(widgets.cashCarSummary?.total || 0).toLocaleString("en-IN")}
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
                    className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-left dark:border-emerald-900/60 dark:bg-slate-900"
                  >
                    <div className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300">Delivered</div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">
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
                    className="rounded-xl border border-rose-300 bg-white px-3 py-2 text-left dark:border-rose-900/60 dark:bg-slate-900"
                  >
                    <div className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-300">Pending</div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">
                      {Number(widgets.cashCarSummary?.pending || 0).toLocaleString("en-IN")}
                    </div>
                  </button>
                </div>
              </div>
            </WidgetShell>

            <WidgetShell
              title="Source Performance"
              subtitle="Direct vs indirect efficiency"
              icon={SearchCode}
              color="slate"
            >
              <div className="space-y-2">
                {(widgets.sourcePerformance || []).slice(0, 6).map((row) => (
                  <button
                    key={row.source}
                    type="button"
                    onClick={() =>
                      openDrilldown({
                        title: `Source: ${row.source}`,
                        widget: "source_performance",
                        key: String(row.source || "").toLowerCase(),
                      })
                    }
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{row.source}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Conversion {row.conversionRate || 0}%</div>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{row.total || 0}</div>
                  </button>
                ))}
              </div>
            </WidgetShell>

            <WidgetShell
              title="Dealer Performance"
              subtitle="Top dealer contribution"
              icon={BriefcaseBusiness}
              color="slate"
            >
              <CompactList
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

            <WidgetShell
              title="Status Distribution"
              subtitle="Current lifecycle status split"
              icon={ShieldAlert}
              color="slate"
            >
              <CompactList
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

            <WidgetShell
              title="Vehicle Segment Trends"
              subtitle="Model/variant concentration"
              icon={CarFront}
              color="slate"
            >
              <div className="space-y-2">
                {(widgets.vehicleSegmentTrends || []).slice(0, 6).map((row) => (
                  <button
                    key={row.segment}
                    type="button"
                    onClick={() =>
                      openDrilldown({
                        title: `Vehicle Segment: ${row.segment}`,
                        widget: "vehicle_segment",
                        key: String(row.segment || "").toLowerCase(),
                      })
                    }
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{row.segment}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Avg {formatINR(row.avgLoanAmount || 0)}</div>
                    </div>
                    <div className="ml-3 text-sm font-bold text-slate-900 dark:text-slate-100">{row.total || 0}</div>
                  </button>
                ))}
              </div>
            </WidgetShell>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                      className="rounded-xl !border-blue-600 !bg-blue-600 !text-white hover:!border-blue-700 hover:!bg-blue-700 dark:!border-blue-500 dark:!bg-blue-500 dark:hover:!border-blue-400 dark:hover:!bg-blue-400"
                      loading={customWidgetLoading}
                      onClick={runCustomWidget}
                    >
                      Build Widget
                    </Button>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      {customWidgetData.map((row) => (
                        <div
                          key={row.key}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                        >
                          <div className="truncate text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {row.label}
                          </div>
                          <div className="text-lg font-black text-slate-900 dark:text-slate-100">
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
                      className="rounded-xl !border-blue-600 !bg-blue-600 !text-white hover:!border-blue-700 hover:!bg-blue-700 dark:!border-blue-500 dark:!bg-blue-500 dark:hover:!border-blue-400 dark:hover:!bg-blue-400"
                      loading={customReportLoading}
                      onClick={runCustomReport}
                    >
                      Generate Report
                    </Button>
                    <div className="analytics-report-panel rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                      <div className="analytics-report-toolbar mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Report Output</div>
                        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
                          <Input
                            allowClear
                            value={customReportSearch}
                            onChange={(e) => setCustomReportSearch(e.target.value)}
                            placeholder="Search across generated report rows"
                            className="analytics-report-search w-full md:w-80"
                          />
                          <div className="analytics-report-stats inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <span>Rows: {filteredReportRows.length}</span>
                            <span className="text-slate-400 dark:text-slate-500">•</span>
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
      </Spin>

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
          <Table
            className="analytics-table"
            rowKey={(row) => row._id || row.loanId}
            columns={drillColumns}
            dataSource={drillRows}
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
