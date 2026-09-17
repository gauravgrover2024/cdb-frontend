import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  AlertOutlined,
  BankOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  FundOutlined,
  ReloadOutlined,
  ShopOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { loansApi } from "../../api/loans";
import { useAuth } from "../../context/AuthContext";

const { Title, Text } = Typography;

// ─── Constants ──────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { label: "All time", value: "all" },
  { label: "This month", value: "mtd" },
  { label: "Last month", value: "1m" },
  { label: "Last 3 months", value: "3m" },
  { label: "Last year", value: "1y" },
  { label: "Custom", value: "custom" },
];

const STAGES = [
  { key: "profile", label: "Customer profile" },
  { key: "prefile", label: "Pre-file" },
  { key: "approval", label: "Approval" },
  { key: "postfile", label: "Post-file" },
  { key: "delivery", label: "Delivery" },
  { key: "payout", label: "Payout" },
];

const STATUS_META = {
  disbursed: { label: "Disbursed", color: "green" },
  approved: { label: "Approved", color: "blue" },
  pending: { label: "Pending", color: "gold" },
  completed: { label: "Completed", color: "cyan" },
  rejected: { label: "Rejected", color: "red" },
  cancelled: { label: "Cancelled", color: "default" },
};

const CUSTOM_WIDGET_METRICS = [
  { label: "Count of files", value: "count" },
  { label: "Sum of amount", value: "sum" },
  { label: "Average amount", value: "avg" },
];

const CUSTOM_WIDGET_GROUP_BY = [
  { label: "Month", value: "month" },
  { label: "Bank", value: "bank" },
  { label: "Source", value: "source" },
  { label: "Loan type", value: "loanType" },
  { label: "Status", value: "status" },
  { label: "Stage", value: "stage" },
  { label: "Dealer / showroom", value: "dealer" },
  { label: "Vehicle make", value: "vehicleMake" },
  { label: "Vehicle model", value: "vehicleModel" },
];

const AMOUNT_FIELDS = [
  { label: "Loan amount", value: "loanAmount" },
  { label: "Approved amount", value: "approval_loanAmountApproved" },
  { label: "Disbursed amount (approval)", value: "approval_loanAmountDisbursed" },
  { label: "Disbursed amount (disbursal)", value: "disburse_amount" },
  { label: "Finance expectation", value: "financeExpectation" },
];

const REPORT_FIELDS = {
  loanId: "Loan ID",
  customerName: "Customer",
  primaryMobile: "Mobile",
  typeOfLoan: "Loan type",
  currentStage: "Stage",
  status: "Status",
  approval_status: "Approval status",
  approval_bankName: "Bank",
  approval_brokerName: "Broker",
  recordSource: "Source",
  dealerName: "Dealer",
  showroomDealerName: "Showroom",
  vehicleMake: "Make",
  vehicleModel: "Model",
  vehicleVariant: "Variant",
  loanAmount: "Loan amount",
  approval_loanAmountApproved: "Approved amount",
  approval_loanAmountDisbursed: "Disbursed amount",
  disburse_amount: "Disburse amount",
  registrationNumber: "Registration no.",
  vehicleRegNo: "Vehicle reg. no.",
  rc_redg_no: "RC no.",
  invoice_number: "Invoice no.",
  invoice_date: "Invoice date",
  insurance_policy_number: "Insurance policy no.",
  createdAt: "Created",
  updatedAt: "Updated",
};

const AMOUNT_REPORT_FIELDS = new Set(["loanAmount", "approval_loanAmountApproved", "approval_loanAmountDisbursed", "disburse_amount"]);
const DRILL_LIMIT = 1000;
const CACHE_PREFIX = "analytics_cache_v2_";

// ─── Helpers (mirror the backend analytics rules) ───────────────────────────

const toNumber = (value) => {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(toNumber(value));
const formatCount = (value) => new Intl.NumberFormat("en-IN").format(toNumber(value));
const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const firstPositive = (...values) => values.map(toNumber).find((n) => n > 0) || 0;

const loanValue = (loan) =>
  firstPositive(
    loan?.disburse_amount,
    loan?.approval_loanAmountDisbursed,
    loan?.postfile_loanAmountDisbursed,
    loan?.approval_loanAmountApproved,
    loan?.loanAmount,
    loan?.financeExpectation,
  );

const classifyStatus = (value) => {
  const text = String(value || "").toLowerCase();
  if (!text) return null;
  if (text.includes("disburs")) return "disbursed";
  if (text.includes("cancel")) return "cancelled";
  if (/reject|declin|fail/.test(text)) return "rejected";
  if (/complete|close/.test(text)) return "completed";
  if (/approv|accept|sanction/.test(text)) return "approved";
  return null;
};
const loanStatus = (loan) =>
  (classifyStatus(loan?.disburse_status || loan?.disbursementStatus) === "disbursed" && "disbursed") ||
  classifyStatus(loan?.approval_status) ||
  classifyStatus(loan?.status) ||
  "pending";

const formatDate = (value) => {
  const date = dayjs(value);
  return value && date.isValid() ? date.format("DD MMM YYYY") : "—";
};

const rangeParams = (preset, customRange) =>
  preset === "custom" && customRange?.[0] && customRange?.[1]
    ? { range: preset, from: customRange[0].format("YYYY-MM-DD"), to: customRange[1].format("YYYY-MM-DD") }
    : { range: preset };

const StatusTag = ({ status }) => {
  const meta = STATUS_META[status] || { label: status || "—", color: "default" };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

// Clickable KPI card built from antd Card + Statistic.
const KpiCard = ({ title, value, suffix, precision, formatter, footer, icon, loading, onClick, tooltip }) => (
  <Card hoverable={Boolean(onClick)} onClick={onClick} loading={loading} size="small" className="h-full">
    <Statistic
      title={
        <Space size={6}>
          {icon}
          {tooltip ? <Tooltip title={tooltip}>{title}</Tooltip> : title}
        </Space>
      }
      value={value}
      suffix={suffix}
      precision={precision}
      formatter={formatter}
    />
    {footer ? <Text type="secondary" className="mt-1 block text-xs">{footer}</Text> : null}
  </Card>
);

// A ranked list of values with an antd Progress bar per row.
const BarList = ({ rows, total, onSelect, renderLabel, emptyText = "No data for this period" }) => {
  if (!rows?.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />;
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <List
      size="small"
      split={false}
      dataSource={rows}
      renderItem={(row) => (
        <List.Item className="!px-0 !py-1.5">
          <button type="button" onClick={() => onSelect?.(row)} className="w-full cursor-pointer bg-transparent p-0 text-left">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{renderLabel(row)}</span>
              <Text strong className="tabular-nums">
                {formatCount(row.count)}
                {total ? <Text type="secondary" className="ml-1 text-xs font-normal">({percent(row.count, total)}%)</Text> : null}
              </Text>
            </div>
            <Progress status="normal" percent={(row.count / max) * 100} showInfo={false} size="small" className="!m-0" />
          </button>
        </List.Item>
      )}
    />
  );
};

// ─── Page ───────────────────────────────────────────────────────────────────

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [rangePreset, setRangePreset] = useState("all");
  const [customRange, setCustomRange] = useState([dayjs().startOf("month"), dayjs()]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [drill, setDrill] = useState({ open: false, title: "", loading: false, rows: [], total: 0, error: "" });
  const [drillSearch, setDrillSearch] = useState("");

  const [widgetForm] = Form.useForm();
  const [widgetRows, setWidgetRows] = useState(null);
  const [widgetLoading, setWidgetLoading] = useState(false);

  const [reportForm] = Form.useForm();
  const [report, setReport] = useState({ rows: [], fields: [] });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState("");

  const params = useMemo(() => rangeParams(rangePreset, customRange), [rangePreset, customRange]);
  const requestRef = useRef(null);

  const fetchOverview = useCallback(async () => {
    const cacheKey = CACHE_PREFIX + JSON.stringify(params);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    let cached = null;
    try {
      cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
    } catch {
      cached = null;
    }
    if (cached) setOverview(cached);
    setLoading(!cached);
    setRefreshing(Boolean(cached));
    setError("");

    const timeoutId = setTimeout(() => controller.abort(), 120000);
    try {
      const res = await loansApi.getAnalyticsOverview(params, { signal: controller.signal });
      if (requestRef.current !== controller) return;
      const data = res?.data || null;
      setOverview(data);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        /* storage full — ignore */
      }
    } catch (err) {
      if (requestRef.current !== controller) return;
      const timedOut = err?.name === "AbortError" || /abort|timeout/i.test(String(err?.message));
      setError(timedOut ? "Analytics took too long to load. Please retry." : err?.message || "Could not load analytics.");
      if (!cached) setOverview(null);
    } finally {
      clearTimeout(timeoutId);
      if (requestRef.current === controller) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [params]);

  useEffect(() => {
    fetchOverview();
    return () => requestRef.current?.abort();
  }, [fetchOverview]);

  const openDrill = useCallback(
    async (title, query) => {
      setDrillSearch("");
      setDrill({ open: true, title, loading: true, rows: [], total: 0, error: "" });
      try {
        const res = await loansApi.getAnalyticsDrilldown({ ...params, ...query, limit: DRILL_LIMIT });
        const rows = Array.isArray(res?.data) ? res.data : [];
        setDrill((prev) => ({ ...prev, loading: false, rows, total: Number(res?.total ?? rows.length) }));
      } catch (err) {
        setDrill((prev) => ({ ...prev, loading: false, error: err?.payload?.message || err?.message || "Could not load files." }));
      }
    },
    [params],
  );

  const runWidget = async (values) => {
    setWidgetLoading(true);
    try {
      const res = await loansApi.createCustomWidget({ ...params, ...values });
      setWidgetRows({ metric: values.metric, rows: Array.isArray(res?.data) ? res.data : [] });
    } catch (err) {
      setWidgetRows({ metric: values.metric, rows: [] });
      setError(err?.message || "Could not build the widget.");
    } finally {
      setWidgetLoading(false);
    }
  };

  const runReport = async (values) => {
    setReportLoading(true);
    try {
      const res = await loansApi.createCustomReport({ ...params, ...values });
      setReport({ rows: Array.isArray(res?.data) ? res.data : [], fields: res?.meta?.fields || values.fields });
    } catch (err) {
      setReport({ rows: [], fields: values.fields });
      setError(err?.message || "Could not generate the report.");
    } finally {
      setReportLoading(false);
    }
  };

  // ─── Derived data ─────────────────────────────────────────────────────────

  const totals = overview?.totals || {};
  const widgets = overview?.widgets || {};
  const totalCases = toNumber(totals.totalCases);
  const financedCases = toNumber(totals.financedCases);
  const disbursedCases = toNumber(totals.disbursedCases);
  const cash = widgets.cashCarSummary || {};

  const monthlyRows = useMemo(() => {
    const disbursedByMonth = new Map((widgets.disbursedAmountTrend || []).map((row) => [row.bucket, row]));
    return (widgets.totalLoansTrend || [])
      .map((row) => ({
        key: row.bucket,
        label: row.label,
        created: toNumber(row.value),
        completed: toNumber(disbursedByMonth.get(row.bucket)?.count),
        amount: toNumber(disbursedByMonth.get(row.bucket)?.amount),
      }))
      .reverse();
  }, [widgets.totalLoansTrend, widgets.disbursedAmountTrend]);
  const monthlyMax = useMemo(
    () => ({
      created: Math.max(...monthlyRows.map((row) => row.created), 1),
      amount: Math.max(...monthlyRows.map((row) => row.amount), 1),
    }),
    [monthlyRows],
  );

  const stageRows = useMemo(() => {
    const counts = new Map((widgets.stageFunnel || []).map((row) => [row.stage, toNumber(row.count)]));
    return STAGES.map((stage) => ({ ...stage, count: counts.get(stage.key) || 0 }));
  }, [widgets.stageFunnel]);

  const statusRows = (widgets.caseStatusDistribution || []).map((row) => ({ key: row.status, count: toNumber(row.count) }));
  const loanTypeRows = (widgets.loanTypeMix || []).slice(0, 8).map((row) => ({ key: row.label, count: toNumber(row.count) }));

  const filteredDrillRows = useMemo(() => {
    const q = drillSearch.trim().toLowerCase();
    if (!q) return drill.rows;
    return drill.rows.filter((row) =>
      [row.loanId, row.customerName, row.primaryMobile, row.approval_bankName, row.vehicleMake, row.vehicleModel, row.dealerName]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [drill.rows, drillSearch]);

  const filteredReportRows = useMemo(() => {
    const q = reportSearch.trim().toLowerCase();
    if (!q) return report.rows;
    return report.rows.filter((row) => report.fields.some((field) => String(row?.[field] ?? "").toLowerCase().includes(q)));
  }, [report, reportSearch]);

  // ─── Table columns ────────────────────────────────────────────────────────

  const monthlyColumns = [
    { title: "Month", dataIndex: "label", key: "label", width: 110 },
    {
      title: "Files created",
      key: "created",
      render: (_, row) => (
        <button type="button" className="w-full cursor-pointer bg-transparent p-0 text-left" onClick={() => row.created && openDrill(`Files created in ${row.label}`, { widget: "total_loan_trend", bucket: row.key })}>
          <Progress status="normal" percent={(row.created / monthlyMax.created) * 100} format={() => formatCount(row.created)} size="small" className="!m-0" />
        </button>
      ),
    },
    {
      title: <Tooltip title="Financed files disbursed plus cash cars delivered, for files created in this period">Disbursed / delivered</Tooltip>,
      key: "amount",
      render: (_, row) => (
        <button type="button" className="w-full cursor-pointer bg-transparent p-0 text-left" onClick={() => row.completed && openDrill(`Disbursed or delivered in ${row.label}`, { widget: "disbursed_amount_trend", bucket: row.key })}>
          <Progress status="normal" percent={(row.amount / monthlyMax.amount) * 100} strokeColor="#16a34a" format={() => `${formatINR(row.amount)} · ${formatCount(row.completed)}`} size="small" className="!m-0" />
        </button>
      ),
    },
  ];

  const bankColumns = [
    { title: "Bank", dataIndex: "bankName", key: "bankName", ellipsis: true },
    { title: "Files", dataIndex: "total", key: "total", align: "right", width: 80, sorter: (a, b) => a.total - b.total, defaultSortOrder: "descend" },
    { title: "Approved", dataIndex: "approved", key: "approved", align: "right", width: 90 },
    { title: "Disbursed", dataIndex: "disbursed", key: "disbursed", align: "right", width: 110, sorter: (a, b) => a.disbursed - b.disbursed },
    { title: "Conversion", key: "conversion", width: 150, render: (_, row) => <Progress status="normal" percent={percent(row.disbursed, row.total)} size="small" className="!m-0" /> },
    { title: "Loan value", dataIndex: "totalLoanAmount", key: "value", align: "right", width: 140, render: formatINR, sorter: (a, b) => a.totalLoanAmount - b.totalLoanAmount },
  ];

  const dealerColumns = [
    { title: "Dealer / showroom", dataIndex: "dealerName", key: "dealerName", ellipsis: true },
    { title: "Files", dataIndex: "total", key: "total", align: "right", width: 70, sorter: (a, b) => a.total - b.total, defaultSortOrder: "descend" },
    { title: "Completed", dataIndex: "disbursed", key: "disbursed", align: "right", width: 95 },
    {
      title: <Tooltip title="Average days from file creation to disbursal">Avg TAT</Tooltip>,
      dataIndex: "avgTatDays",
      key: "tat",
      align: "right",
      width: 85,
      render: (value) => (value === null || value === undefined ? "—" : `${value}d`),
    },
    { title: "Loan value", dataIndex: "totalLoanAmount", key: "value", align: "right", width: 130, render: formatINR },
  ];

  const sourceColumns = [
    { title: "Source", dataIndex: "source", key: "source" },
    { title: "Files", dataIndex: "total", key: "total", align: "right", width: 70 },
    { title: "Completed", dataIndex: "disbursed", key: "disbursed", align: "right", width: 95 },
    { title: "Conversion", key: "conversion", width: 140, render: (_, row) => <Progress status="normal" percent={percent(row.disbursed, row.total)} size="small" className="!m-0" /> },
  ];

  const vehicleColumns = [
    { title: "Make", dataIndex: "make", key: "make", ellipsis: true },
    { title: "Model", dataIndex: "model", key: "model", ellipsis: true },
    { title: "Variant", dataIndex: "variant", key: "variant", ellipsis: true },
    { title: "Files", dataIndex: "total", key: "total", align: "right", width: 70 },
    { title: "Avg loan", dataIndex: "avgLoanAmount", key: "avg", align: "right", width: 120, render: formatINR },
  ];

  const drillColumns = [
    {
      title: "Loan ID",
      dataIndex: "loanId",
      key: "loanId",
      width: 130,
      fixed: "left",
      render: (value, row) => <Link to={`/loans/edit/${row._id || value}`} className="font-medium text-blue-600 hover:underline">{value || "—"}</Link>,
    },
    { title: "Customer", dataIndex: "customerName", key: "customerName", width: 160, ellipsis: true },
    { title: "Mobile", dataIndex: "primaryMobile", key: "primaryMobile", width: 120 },
    { title: "Loan type", key: "type", width: 120, render: (_, row) => row.typeOfLoan || row.loanType || "—" },
    { title: "Stage", dataIndex: "currentStage", key: "stage", width: 110, render: (value) => STAGES.find((stage) => stage.key === String(value || "").toLowerCase())?.label || value || "—" },
    { title: "Status", key: "status", width: 110, render: (_, row) => <StatusTag status={loanStatus(row)} /> },
    { title: "Bank", key: "bank", width: 140, ellipsis: true, render: (_, row) => row.approval_bankName || row.postfile_bankName || row.bankName || "—" },
    { title: "Loan value", key: "value", width: 130, align: "right", render: (_, row) => formatINR(loanValue(row)) },
    { title: "Created", dataIndex: "createdAt", key: "createdAt", width: 120, render: formatDate },
  ];

  const reportColumns = report.fields.map((field) => ({
    title: REPORT_FIELDS[field] || field,
    dataIndex: field,
    key: field,
    width: 160,
    ellipsis: true,
    align: AMOUNT_REPORT_FIELDS.has(field) ? "right" : "left",
    render: (value) => {
      if (value === null || value === undefined || value === "") return "—";
      if (AMOUNT_REPORT_FIELDS.has(field)) return formatINR(value);
      if (/date|At$/.test(field)) return formatDate(value);
      return String(value);
    },
  }));

  const drillValue = filteredDrillRows.reduce((sum, row) => sum + loanValue(row), 0);
  const timeframe = overview?.timeframe;
  const periodLabel = timeframe ? `${formatDate(timeframe.start)} – ${formatDate(timeframe.end)}` : "";
  const cardProps = { size: "small", className: "h-full", loading };

  return (
    <div className="w-full space-y-4 pb-10">
      {/* Header */}
      <Card size="small">
        <Row gutter={[16, 12]} align="middle" justify="space-between">
          <Col flex="auto">
            <Space direction="vertical" size={0}>
              <Space size={8} wrap>
                <Title level={3} className="!mb-0">Business overview</Title>
                {user?.role ? <Tag>{String(user.role).replaceAll("_", " ")}</Tag> : null}
              </Space>
              <Text type="secondary">
                Loan files created {periodLabel ? `between ${periodLabel}` : "in the selected period"}. Click any number to see the files behind it.
              </Text>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Segmented options={RANGE_OPTIONS} value={rangePreset} onChange={setRangePreset} />
              {rangePreset === "custom" ? (
                <DatePicker.RangePicker value={customRange} allowClear={false} onChange={(values) => values && setCustomRange(values)} disabledDate={(date) => date.isAfter(dayjs(), "day")} />
              ) : null}
              <Button icon={<ReloadOutlined spin={refreshing} />} onClick={fetchOverview} loading={loading && !overview}>
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {error ? (
        <Alert type="error" showIcon message={error} action={<Button size="small" onClick={fetchOverview}>Retry</Button>} closable onClose={() => setError("")} />
      ) : null}

      {/* KPIs */}
      <Row gutter={[16, 16]}>
        <Col xs={12} md={8} xl={4}>
          <KpiCard loading={loading} icon={<FileTextOutlined />} title="Files created" value={totalCases} formatter={formatCount}
            footer={`${formatCount(financedCases)} financed · ${formatCount(cash.total)} cash`} onClick={() => openDrill("All files", {})} />
        </Col>
        <Col xs={12} md={8} xl={4}>
          <KpiCard loading={loading} icon={<FundOutlined />} title="Loan value" tooltip="Disbursed amount if disbursed, otherwise approved, requested or expected amount" value={totals.totalLoanAmount} formatter={formatINR}
            footer="Across all files in the period" />
        </Col>
        <Col xs={12} md={8} xl={4}>
          <KpiCard loading={loading} icon={<CheckCircleOutlined />} title="Disbursed" value={totals.disbursedLoanAmount} formatter={formatINR}
            footer={`${formatCount(disbursedCases)} financed files`} onClick={() => openDrill("Disbursed files", { widget: "disbursed_loans" })} />
        </Col>
        <Col xs={12} md={8} xl={4}>
          <KpiCard loading={loading} icon={<FundOutlined />} title="Disbursal conversion" tooltip="Disbursed financed files ÷ all financed files" value={percent(disbursedCases, financedCases)} precision={1} suffix="%"
            footer={`${formatCount(disbursedCases)} of ${formatCount(financedCases)} financed files`} />
        </Col>
        <Col xs={12} md={8} xl={4}>
          <KpiCard loading={loading} icon={<ClockCircleOutlined />} title="Approved, not disbursed" value={widgets.approvalPendingDisbursal?.count} formatter={formatCount}
            footer={formatINR(widgets.approvalPendingDisbursal?.amount)} onClick={() => openDrill("Approved, not yet disbursed", { widget: "approval_pending_disbursal" })} />
        </Col>
        <Col xs={12} md={8} xl={4}>
          <KpiCard loading={loading} icon={<CarOutlined />} title="Cash cars delivered" value={cash.delivered} formatter={formatCount}
            footer={`${formatCount(cash.pending)} pending of ${formatCount(cash.total)}`} onClick={() => openDrill("Cash cars delivered", { widget: "cash_car_delivered" })} />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card {...cardProps} title="Monthly trend" extra={<Text type="secondary" className="text-xs">Newest first</Text>}>
            <Table size="small" rowKey="key" columns={monthlyColumns} dataSource={monthlyRows} pagination={monthlyRows.length > 12 ? { pageSize: 12, size: "small" } : false}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No files in this period" /> }} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={5}>
          <Card {...cardProps} title="Pipeline by stage">
            <BarList rows={stageRows} total={totalCases} renderLabel={(row) => row.label} onSelect={(row) => row.count && openDrill(`Stage: ${row.label}`, { widget: "stage_funnel", key: row.key })} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={5}>
          <Card {...cardProps} title="Status">
            <BarList rows={statusRows} total={totalCases} renderLabel={(row) => <StatusTag status={row.key} />} onSelect={(row) => openDrill(`Status: ${STATUS_META[row.key]?.label || row.key}`, { widget: "case_status_distribution", key: row.key })} />
          </Card>
        </Col>
      </Row>

      {/* Data quality */}
      <Card {...cardProps} loading={false} title={<Space><AlertOutlined />Needs attention</Space>}>
        <Row gutter={[16, 16]}>
          {[
            { title: "Approved, not disbursed", value: widgets.approvalPendingDisbursal?.count, hint: "Financed files approved by a bank but not yet disbursed", widget: "approval_pending_disbursal" },
            { title: "Missing registration no.", value: widgets.missingRegNumber?.count, hint: "Disbursed or delivered files without an RC / registration number", widget: "missing_reg_number" },
            { title: "Delivery paperwork gaps", value: widgets.missingCriticalDeliveryFields?.count, hint: "Disbursed or delivered files missing invoice, insurance or RC details", widget: "missing_delivery_fields" },
            { title: "Repeat customers", value: widgets.repeatedCustomers?.repeatedCaseCount, hint: `${formatCount(widgets.repeatedCustomers?.repeatedIdentityCount)} customers (same mobile, PAN or GST) with more than one file`, widget: "repeated_customers" },
          ].map((item) => (
            <Col key={item.widget} xs={12} lg={6}>
              <Card size="small" hoverable onClick={() => openDrill(item.title, { widget: item.widget })} loading={loading}>
                <Statistic title={<Tooltip title={item.hint}>{item.title}</Tooltip>} value={toNumber(item.value)} formatter={formatCount}
                  valueStyle={toNumber(item.value) ? { color: "#d97706" } : undefined} />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card {...cardProps} title={<Space><BankOutlined />Banks</Space>} extra={<Text type="secondary" className="text-xs">Financed files only</Text>}>
            <Table size="small" rowKey="bankName" columns={bankColumns} dataSource={widgets.bankPipeline || []} pagination={{ pageSize: 8, size: "small", hideOnSinglePage: true }} scroll={{ x: 700 }}
              onRow={(row) => ({ onClick: () => openDrill(`Bank: ${row.bankName}`, { widget: "bank_pipeline", key: row.bankName.toLowerCase() }), className: "cursor-pointer" })} />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Space direction="vertical" size={16} className="w-full">
          <Card size="small" loading={loading} title="Loan types">
            <BarList rows={loanTypeRows} total={totalCases} renderLabel={(row) => row.key} onSelect={(row) => openDrill(`Loan type: ${row.key}`, { widget: "loan_type_mix", key: row.key.toLowerCase() })} />
          </Card>
          <Card size="small" loading={loading} title={<Space><TeamOutlined />Sources</Space>}>
            <Table size="small" rowKey="source" columns={sourceColumns} dataSource={widgets.sourcePerformance || []} pagination={false}
              onRow={(row) => ({ onClick: () => openDrill(`Source: ${row.source}`, { widget: "source_performance", key: row.source.toLowerCase() }), className: "cursor-pointer" })} />
          </Card>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card {...cardProps} title={<Space><ShopOutlined />Dealers</Space>}>
            <Table size="small" rowKey="dealerName" columns={dealerColumns} dataSource={widgets.dealerPerformance || []} pagination={{ pageSize: 8, size: "small", hideOnSinglePage: true }} scroll={{ x: 520 }}
              onRow={(row) => ({ onClick: () => openDrill(`Dealer: ${row.dealerName}`, { widget: "dealer_performance", key: row.dealerName.toLowerCase() }), className: "cursor-pointer" })} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card {...cardProps} title={<Space><CarOutlined />Top vehicles</Space>}>
            <Table size="small" rowKey="segment" columns={vehicleColumns} dataSource={widgets.vehicleSegmentTrends || []} pagination={{ pageSize: 8, size: "small", hideOnSinglePage: true }} scroll={{ x: 460 }}
              onRow={(row) => ({ onClick: () => openDrill(`Vehicle: ${row.make} ${row.model} ${row.variant}`, { widget: "vehicle_segment", key: row.segment.toLowerCase() }), className: "cursor-pointer" })} />
          </Card>
        </Col>
      </Row>

      {/* Builders */}
      <Card size="small">
        <Tabs
          items={[
            {
              key: "widget",
              label: "Custom widget",
              children: (
                <Space direction="vertical" size="middle" className="w-full">
                  <Form form={widgetForm} layout="inline" initialValues={{ metric: "count", groupBy: "bank", metricField: "loanAmount", topN: 12 }} onFinish={runWidget} className="gap-y-3">
                    <Form.Item name="metric" label="Measure"><Select options={CUSTOM_WIDGET_METRICS} className="!w-44" /></Form.Item>
                    <Form.Item noStyle shouldUpdate={(prev, next) => prev.metric !== next.metric}>
                      {({ getFieldValue }) =>
                        getFieldValue("metric") !== "count" ? (
                          <Form.Item name="metricField" label="Amount"><Select options={AMOUNT_FIELDS} className="!w-56" /></Form.Item>
                        ) : null
                      }
                    </Form.Item>
                    <Form.Item name="groupBy" label="Group by"><Select options={CUSTOM_WIDGET_GROUP_BY} className="!w-44" /></Form.Item>
                    <Form.Item name="topN" label="Top"><InputNumber min={1} max={200} /></Form.Item>
                    <Form.Item><Button type="primary" htmlType="submit" loading={widgetLoading}>Build</Button></Form.Item>
                  </Form>
                  {widgetRows === null ? null : widgetRows.rows.length ? (
                    <Table size="small" rowKey="key" pagination={false} dataSource={widgetRows.rows}
                      columns={[
                        { title: "Group", dataIndex: "label", key: "label" },
                        {
                          title: "Value",
                          dataIndex: "value",
                          key: "value",
                          align: "right",
                          render: (value) => (widgetRows.metric === "count" ? formatCount(value) : formatINR(value)),
                        },
                      ]} />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data for this period" />
                  )}
                </Space>
              ),
            },
            {
              key: "report",
              label: "Custom report",
              children: (
                <Space direction="vertical" size="middle" className="w-full">
                  <Form form={reportForm} layout="vertical" onFinish={runReport}
                    initialValues={{ fields: ["loanId", "customerName", "primaryMobile", "typeOfLoan", "currentStage", "approval_bankName", "loanAmount", "approval_loanAmountDisbursed", "createdAt"], sortBy: "updatedAt", sortDir: "desc", limit: 300 }}>
                    <Form.Item name="fields" label="Columns" rules={[{ required: true, message: "Pick at least one column" }]}>
                      <Select mode="multiple" maxTagCount="responsive" options={Object.entries(REPORT_FIELDS).map(([value, label]) => ({ value, label }))} />
                    </Form.Item>
                    <Row gutter={16}>
                      <Col xs={24} md={8}><Form.Item name="sortBy" label="Sort by"><Select options={Object.entries(REPORT_FIELDS).map(([value, label]) => ({ value, label }))} /></Form.Item></Col>
                      <Col xs={12} md={8}><Form.Item name="sortDir" label="Order"><Select options={[{ label: "Newest / highest first", value: "desc" }, { label: "Oldest / lowest first", value: "asc" }]} /></Form.Item></Col>
                      <Col xs={12} md={8}><Form.Item name="limit" label="Max rows"><InputNumber min={10} max={10000} className="!w-full" /></Form.Item></Col>
                    </Row>
                    <Button type="primary" htmlType="submit" loading={reportLoading}>Generate report</Button>
                  </Form>
                  {report.fields.length ? (
                    <Table size="small" rowKey={(row, index) => row._id || row.loanId || index} columns={reportColumns} dataSource={filteredReportRows}
                      title={() => (
                        <Space wrap>
                          <Input.Search allowClear placeholder="Search report rows" value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} className="!w-72" />
                          <Text type="secondary">{formatCount(filteredReportRows.length)} rows</Text>
                        </Space>
                      )}
                      pagination={{ pageSize: 20, showSizeChanger: true }} scroll={{ x: report.fields.length * 160 }} />
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Drilldown */}
      <Drawer title={drill.title} open={drill.open} width="min(1200px, 100vw)" onClose={() => setDrill((prev) => ({ ...prev, open: false }))} destroyOnHidden>
        <Space direction="vertical" size="middle" className="w-full">
          {drill.error ? <Alert type="error" showIcon message={drill.error} /> : null}
          <Row gutter={16}>
            <Col xs={12} md={6}><Statistic title="Matching files" value={drill.total} formatter={formatCount} loading={drill.loading} /></Col>
            <Col xs={12} md={6}><Statistic title="Shown" value={filteredDrillRows.length} formatter={formatCount} loading={drill.loading} /></Col>
            <Col xs={12} md={6}><Statistic title="Loan value (shown)" value={drillValue} formatter={formatINR} loading={drill.loading} /></Col>
            <Col xs={12} md={6}><Statistic title="Average per file" value={filteredDrillRows.length ? drillValue / filteredDrillRows.length : 0} formatter={formatINR} loading={drill.loading} /></Col>
          </Row>
          {drill.total > drill.rows.length ? (
            <Alert type="info" showIcon message={`Showing the ${formatCount(drill.rows.length)} most recently updated of ${formatCount(drill.total)} files.`} />
          ) : null}
          <Input.Search allowClear placeholder="Search loan ID, customer, mobile, bank, vehicle or dealer" value={drillSearch} onChange={(e) => setDrillSearch(e.target.value)} className="md:!w-[28rem]" />
          <Table size="small" rowKey={(row) => row._id || row.loanId} loading={drill.loading} columns={drillColumns} dataSource={filteredDrillRows}
            pagination={{ pageSize: 20, showSizeChanger: true }} scroll={{ x: "max-content" }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No files match" /> }} />
        </Space>
      </Drawer>
    </div>
  );
};

export default AnalyticsDashboard;
