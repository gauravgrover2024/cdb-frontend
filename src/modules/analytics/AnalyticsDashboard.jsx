import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  DatePicker,
  InputNumber,
  Modal,
  Select,
  Spin,
  Table,
  Tag,
} from "antd";
import { loansApi } from "../../api/loans";

const { RangePicker } = DatePicker;

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

const amountValue = (loan) =>
  num(
    loan?.disburse_amount ||
      loan?.approval_loanAmountDisbursed ||
      loan?.approval_loanAmountApproved ||
      loan?.loanAmount ||
      loan?.financeExpectation ||
      0,
  );

const buildFallbackOverview = (loans = [], rangePreset, customRange) => {
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

  const rows = loans.filter((loan) => {
    const created = dayjs(loan?.createdAt);
    return created.isValid() && (created.isAfter(start) || created.isSame(start)) && (created.isBefore(end) || created.isSame(end));
  });

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

  rows.forEach((loan) => {
    const m = monthKey(loan?.createdAt);
    if (m && totalLoansTrendMap.has(m)) totalLoansTrendMap.set(m, (totalLoansTrendMap.get(m) || 0) + 1);

    const stg = stageKey(loan?.currentStage);
    stageMap.set(stg, (stageMap.get(stg) || 0) + 1);

    const st = statusKey(loan);
    statusMap.set(st, (statusMap.get(st) || 0) + 1);

    const lt = String(loan?.typeOfLoan || loan?.loanType || loan?.caseType || "Unknown");
    loanTypeMap.set(lt, (loanTypeMap.get(lt) || 0) + 1);

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
      (st === "approved" || num(loan?.approval_loanAmountApproved) > 0) && !isDisbursed(loan);
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

    if (isDisbursed(loan)) {
      const dm = monthKey(loan?.disbursement_date || loan?.approval_disbursedDate || loan?.disburse_date || loan?.createdAt);
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
      totalDisbursedAmount: rows.reduce((acc, loan) => acc + (isDisbursed(loan) ? num(loan?.disburse_amount || loan?.approval_loanAmountDisbursed || amountValue(loan)) : 0), 0),
    },
    widgets: {
      totalLoansTrend,
      disbursedAmountTrend,
      stageFunnel,
      approvalPendingDisbursal: { count: approvalPendingCount, amount: approvalPendingAmount },
      missingRegNumber: { count: missingRegCount },
      missingCriticalDeliveryFields: { count: missingDeliveryCount },
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
  const max = Math.max(...points.map((p) => Number(p[valueKey] || 0)), 1);

  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-2">
      {points.map((point) => {
        const value = Number(point[valueKey] || 0);
        const h = Math.max(8, Math.round((value / max) * 124));
        return (
          <button
            type="button"
            key={point.bucket}
            onClick={() => onSelect?.(point)}
            className="group flex min-w-[58px] flex-col items-center gap-2 rounded-xl p-2 transition hover:bg-slate-100"
          >
            <div
              className={`w-8 rounded-t-lg ${tone === "amber" ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ height: `${h}px` }}
            />
            <div className="text-[11px] font-semibold text-slate-600">{point.label}</div>
            <div className="text-[11px] font-bold text-slate-900">{value.toLocaleString("en-IN")}</div>
          </button>
        );
      })}
    </div>
  );
};

const CompactList = ({ rows = [], labelKey, valueKey, onClick, format = (v) => v }) => (
  <div className="space-y-2">
    {rows.map((row) => (
      <button
        key={`${row[labelKey]}-${row[valueKey]}`}
        type="button"
        onClick={() => onClick?.(row)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-sky-300 hover:bg-sky-50"
      >
        <span className="truncate text-sm font-medium text-slate-700">{row[labelKey]}</span>
        <span className="ml-3 text-sm font-bold text-slate-900">{format(row[valueKey])}</span>
      </button>
    ))}
  </div>
);

const AnalyticsDashboard = () => {
  const [rangePreset, setRangePreset] = useState("mtd");
  const [customRange, setCustomRange] = useState([dayjs().startOf("month"), dayjs()]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

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

  const queryParams = useMemo(
    () => getRangeParams(rangePreset, customRange),
    [rangePreset, customRange],
  );

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setUsingFallback(false);
      const res = await loansApi.getAnalyticsOverview(queryParams);
      setOverview(res?.data || null);
    } catch (err) {
      if (Number(err?.status) === 404) {
        try {
          const allLoans = await fetchAllLoansForFallback();
          const fallbackData = buildFallbackOverview(allLoans, rangePreset, customRange);
          setOverview(fallbackData);
          setUsingFallback(true);
          setError("");
        } catch (fallbackErr) {
          setError(fallbackErr?.message || "Failed to load analytics");
        }
      } else {
        setError(err?.message || "Failed to load analytics");
      }
    } finally {
      setLoading(false);
    }
  }, [customRange, queryParams, rangePreset]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const runCustomWidget = useCallback(async () => {
    try {
      setCustomWidgetLoading(true);
      const res = await loansApi.createCustomWidget({
        ...queryParams,
        ...customWidgetConfig,
      });
      setCustomWidgetData(Array.isArray(res?.data) ? res.data : []);
    } finally {
      setCustomWidgetLoading(false);
    }
  }, [customWidgetConfig, queryParams]);

  const runCustomReport = useCallback(async () => {
    try {
      setCustomReportLoading(true);
      const res = await loansApi.createCustomReport({
        ...queryParams,
        ...customReportConfig,
      });
      setCustomReportRows(Array.isArray(res?.data) ? res.data : []);
      setCustomReportMeta(res?.meta || null);
    } finally {
      setCustomReportLoading(false);
    }
  }, [customReportConfig, queryParams]);

  const openDrilldown = useCallback(
    async ({ title, widget, bucket, key }) => {
      try {
        setDrillTitle(title);
        setDrillOpen(true);
        setDrillLoading(true);
        const res = await loansApi.getAnalyticsDrilldown({
          ...queryParams,
          widget,
          bucket,
          key,
          limit: 1000,
          skip: 0,
        });
        setDrillRows(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        setDrillRows([]);
      } finally {
        setDrillLoading(false);
      }
    },
    [queryParams],
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
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 140,
      render: (v) => (v ? dayjs(v).format("DD MMM YYYY") : "-"),
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

  return (
    <main className="space-y-5 p-4 md:p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">Analytics</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Loans Intelligence Board</h1>
            <p className="mt-1 text-sm text-slate-600">
              Unified widgets + reports with click-through case drilldown.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                  rangePreset === option.value
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
                onClick={() => setRangePreset(option.value)}
              >
                {option.label}
              </button>
            ))}

            {rangePreset === "custom" && (
              <RangePicker
                value={customRange}
                onChange={(values) => setCustomRange(values || [])}
                allowClear={false}
                className="h-9"
              />
            )}

            <Button type="primary" className="h-9" onClick={fetchOverview}>
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {error ? <Alert type="error" message={error} showIcon /> : null}
      {usingFallback ? (
        <Alert
          type="warning"
          showIcon
          message="Running on fallback analytics engine"
          description="Backend analytics endpoints are not live yet, so this view is computed from full loan pages in frontend."
        />
      ) : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-sky-700">Total Cases</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{Number(totals.totalCases || 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">Total Loan Amount</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{formatINR(totals.totalLoanAmount || 0)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-amber-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-700">Disbursed Amount</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{formatINR(totals.totalDisbursedAmount || 0)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-violet-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-violet-700">Approval Pending Disbursal</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{Number(widgets.approvalPendingDisbursal?.count || 0).toLocaleString("en-IN")}</div>
        </div>
      </section>

      <Spin spinning={loading}>
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">1. Total Loans Trend</h2>
              <Tag color="blue">Month-wise</Tag>
            </div>
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
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">2. Disbursed Amount Trend</h2>
              <Tag color="green">Amount</Tag>
            </div>
            <TrendBars
              points={(widgets.disbursedAmountTrend || []).map((item) => ({ ...item, value: item.amount || 0 }))}
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
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">3. Stage Funnel</h2>
              <Tag color="purple">Pipeline</Tag>
            </div>
            <div className="space-y-2">
              {(widgets.stageFunnel || []).map((stage) => (
                <div key={stage.stage} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-semibold uppercase text-slate-600">{stage.stage}</div>
                  <div className="h-3 flex-1 rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-indigo-500"
                      style={{
                        width: `${Math.max(
                          3,
                          ((stage.count || 0) /
                            Math.max(...(widgets.stageFunnel || []).map((s) => s.count || 0), 1)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="w-14 text-right text-sm font-bold text-slate-900">{stage.count || 0}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">4 + 7 + 8 Quality Alerts</h2>
              <Tag color="red">Actionable</Tag>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <button
                type="button"
                onClick={() =>
                  openDrilldown({
                    title: "Approval Pending Disbursal",
                    widget: "approval_pending_disbursal",
                  })
                }
                className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-left"
              >
                <div className="text-xs font-bold uppercase text-amber-700">Pending Disbursal</div>
                <div className="text-xl font-black text-slate-900">{widgets.approvalPendingDisbursal?.count || 0}</div>
                <div className="text-xs text-slate-600">{formatINR(widgets.approvalPendingDisbursal?.amount || 0)}</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  openDrilldown({
                    title: "Missing RC Registration",
                    widget: "missing_reg_number",
                  })
                }
                className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-left"
              >
                <div className="text-xs font-bold uppercase text-rose-700">Missing Reg Number</div>
                <div className="text-xl font-black text-slate-900">{widgets.missingRegNumber?.count || 0}</div>
                <div className="text-xs text-slate-600">Cases</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  openDrilldown({
                    title: "Missing Critical Delivery Fields",
                    widget: "missing_delivery_fields",
                  })
                }
                className="rounded-xl border border-orange-300 bg-orange-50 p-3 text-left"
              >
                <div className="text-xs font-bold uppercase text-orange-700">Missing Delivery Data</div>
                <div className="text-xl font-black text-slate-900">{widgets.missingCriticalDeliveryFields?.count || 0}</div>
                <div className="text-xs text-slate-600">Cases</div>
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">10. Loan Type Mix</h2>
              <Tag color="cyan">Distribution</Tag>
            </div>
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
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">11 + Bank Amounts</h2>
              <Tag color="geekblue">Bank Pipeline</Tag>
            </div>
            <CompactList
              rows={(widgets.bankPipeline || []).slice(0, 10)}
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
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">13. Source Performance</h2>
              <Tag color="lime">Direct vs Indirect</Tag>
            </div>
            <div className="space-y-2">
              {(widgets.sourcePerformance || []).map((row) => (
                <button
                  type="button"
                  key={row.source}
                  onClick={() =>
                    openDrilldown({
                      title: `Source: ${row.source}`,
                      widget: "source_performance",
                      key: String(row.source || "").toLowerCase(),
                    })
                  }
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-800">{row.source}</div>
                    <div className="text-xs text-slate-600">Conversion {row.conversionRate || 0}%</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-bold text-slate-900">{row.total || 0}</div>
                    <div className="text-xs text-slate-600">Disbursed: {row.disbursed || 0}</div>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">14. Dealer / Showroom Performance</h2>
              <Tag color="magenta">Top Performers</Tag>
            </div>
            <CompactList
              rows={(widgets.dealerPerformance || []).slice(0, 10)}
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
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">21. Case Status Distribution</h2>
              <Tag color="gold">Status</Tag>
            </div>
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
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">23. Vehicle Segment Trends</h2>
              <Tag color="purple">Make / Model / Variant</Tag>
            </div>
            <div className="space-y-2">
              {(widgets.vehicleSegmentTrends || []).slice(0, 8).map((row) => (
                <button
                  type="button"
                  key={row.segment}
                  onClick={() =>
                    openDrilldown({
                      title: `Vehicle Segment: ${row.segment}`,
                      widget: "vehicle_segment",
                      key: String(row.segment || "").toLowerCase(),
                    })
                  }
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">{row.segment}</div>
                    <div className="text-xs text-slate-600">Avg loan: {formatINR(row.avgLoanAmount || 0)}</div>
                  </div>
                  <div className="ml-3 text-sm font-bold text-slate-900">{row.total || 0}</div>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Repeated Customers</h2>
              <Tag color="red">Deep Check</Tag>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                type="button"
                className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-left"
                onClick={() =>
                  openDrilldown({
                    title: "Repeated Customers (identity collisions)",
                    widget: "repeated_customers",
                  })
                }
              >
                <div className="text-xs font-bold uppercase text-rose-700">Repeated Identity Keys</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{widgets.repeatedCustomers?.repeatedIdentityCount || 0}</div>
              </button>

              <button
                type="button"
                className="rounded-xl border border-fuchsia-300 bg-fuchsia-50 p-4 text-left"
                onClick={() =>
                  openDrilldown({
                    title: "Repeated Customer Cases",
                    widget: "repeated_customers",
                  })
                }
              >
                <div className="text-xs font-bold uppercase text-fuchsia-700">Repeated Cases</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{widgets.repeatedCustomers?.repeatedCaseCount || 0}</div>
              </button>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-base font-bold text-slate-900">Custom Widget Builder</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select
                value={customWidgetConfig.metric}
                options={CUSTOM_WIDGET_METRICS}
                onChange={(v) => setCustomWidgetConfig((prev) => ({ ...prev, metric: v }))}
              />
              <Select
                value={customWidgetConfig.groupBy}
                options={CUSTOM_WIDGET_GROUP_BY}
                onChange={(v) => setCustomWidgetConfig((prev) => ({ ...prev, groupBy: v }))}
              />
              <Select
                value={customWidgetConfig.metricField}
                options={CUSTOM_WIDGET_FIELDS}
                onChange={(v) => setCustomWidgetConfig((prev) => ({ ...prev, metricField: v }))}
              />
              <InputNumber
                min={1}
                max={200}
                value={customWidgetConfig.topN}
                onChange={(v) => setCustomWidgetConfig((prev) => ({ ...prev, topN: Number(v || 12) }))}
                style={{ width: "100%" }}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button type="primary" loading={customWidgetLoading} onClick={runCustomWidget}>
                Generate Widget
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {customWidgetData.map((row) => (
                <div key={row.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div className="text-sm font-medium text-slate-700">{row.label}</div>
                  <div className="text-sm font-bold text-slate-900">{Number(row.value || 0).toLocaleString("en-IN")}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-base font-bold text-slate-900">Custom Report Builder</div>
            <div className="space-y-3">
              <Select
                mode="multiple"
                value={customReportConfig.fields}
                options={REPORT_FIELDS.map((f) => ({ label: f, value: f }))}
                onChange={(values) => setCustomReportConfig((prev) => ({ ...prev, fields: values }))}
                maxTagCount="responsive"
                placeholder="Select fields"
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Select
                  value={customReportConfig.sortBy}
                  options={REPORT_FIELDS.map((f) => ({ label: f, value: f }))}
                  onChange={(v) => setCustomReportConfig((prev) => ({ ...prev, sortBy: v }))}
                />
                <Select
                  value={customReportConfig.sortDir}
                  options={[
                    { label: "Descending", value: "desc" },
                    { label: "Ascending", value: "asc" },
                  ]}
                  onChange={(v) => setCustomReportConfig((prev) => ({ ...prev, sortDir: v }))}
                />
                <InputNumber
                  min={10}
                  max={10000}
                  value={customReportConfig.limit}
                  onChange={(v) => setCustomReportConfig((prev) => ({ ...prev, limit: Number(v || 300) }))}
                  style={{ width: "100%" }}
                />
              </div>

              <Button type="primary" loading={customReportLoading} onClick={runCustomReport}>
                Generate Report
              </Button>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Custom Report Output</h2>
            <div className="text-xs font-semibold text-slate-600">Rows: {customReportRows.length}</div>
          </div>
          <Table
            rowKey={(row, idx) => row.loanId || row._id || `r-${idx}`}
            columns={reportColumns}
            dataSource={customReportRows}
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: true }}
            scroll={{ x: 1400 }}
          />
        </section>
      </Spin>

      <Modal
        title={drillTitle}
        open={drillOpen}
        onCancel={() => setDrillOpen(false)}
        footer={null}
        width={1200}
      >
        <Spin spinning={drillLoading}>
          <Table
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
