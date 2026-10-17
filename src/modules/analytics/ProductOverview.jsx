import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Card, Col, Drawer, Empty, Input, Progress, Row, Space, Statistic, Table, Tooltip, Typography } from "antd";
import { AlertOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, FundOutlined, WalletOutlined } from "@ant-design/icons";
import { homeLoansApi } from "../../api/homeLoans";
import { insuranceApi } from "../../api/insurance";
import { ColumnChart, CompositionBar, SERIES_COLORS } from "./overviewCharts";
import { BarList, KpiCard, StatusTag, STATUS_META, formatCount, formatDate, formatINR, toNumber } from "./overviewWidgets";

// Home Loan and Insurance tabs of the Business Overview page. Both backends
// return the same overview shape (see cdb-api productOverviewService.js), so
// one component renders either product with the car-loan tab's widgets.

const { Text } = Typography;

const DRILL_LIMIT = 1000;
const CACHE_PREFIX = "product_overview_v1_";

const PRODUCTS = {
  home: {
    api: homeLoansApi,
    unit: "files",
    idTitle: "Application no.",
    typeTitle: "Loan type",
    stageTitle: "Stage",
    partnerTitle: "Bank",
    valueTitle: "Loan value",
    editPath: (row) => `/home-loans/edit/${row._id}`,
  },
  insurance: {
    api: insuranceApi,
    unit: "cases",
    idTitle: "Case ID",
    typeTitle: "Case type",
    stageTitle: "Policy type",
    partnerTitle: "Insurer",
    valueTitle: "Premium",
    editPath: (row) => `/insurance/edit/${row.id || row._id}`,
  },
};

const KPI_ICONS = {
  files: <FileTextOutlined />,
  cases: <FileTextOutlined />,
  value: <FundOutlined />,
  premium: <FundOutlined />,
  disbursed: <CheckCircleOutlined />,
  issued: <CheckCircleOutlined />,
  conversion: <FundOutlined />,
  approved_pending: <ClockCircleOutlined />,
  pending: <ClockCircleOutlined />,
  open: <ClockCircleOutlined />,
  payment_due: <WalletOutlined />,
};

const formatKpi = (format) =>
  format === "inr" ? formatINR : format === "percent" ? undefined : formatCount;

// Fixed status order per product → each status keeps its color in the mix bar.
const STATUS_ORDER = {
  home: ["disbursed", "approved", "pending", "completed", "rejected"],
  insurance: ["issued", "submitted", "draft", "cancelled"],
};

// The first breakdown(s) that read as a pipeline/status render as bar lists
// next to the trend; the rest render as tables below.
const BAR_BREAKDOWNS = new Set(["stage", "status"]);

const ProductOverview = ({ product, params, reloadToken }) => {
  const config = PRODUCTS[product];
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drill, setDrill] = useState({ open: false, title: "", loading: false, rows: [], total: 0, error: "" });
  const [drillSearch, setDrillSearch] = useState("");
  const requestRef = useRef(null);

  const fetchOverview = useCallback(async () => {
    const cacheKey = CACHE_PREFIX + product + JSON.stringify(params);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    let cached = null;
    try {
      cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
    } catch {
      cached = null;
    }
    // Show the cached numbers instantly on tab change, then refresh.
    setOverview(cached);
    setLoading(!cached);
    setError("");

    try {
      const res = await config.api.getAnalyticsOverview(params, { signal: controller.signal });
      if (requestRef.current !== controller) return;
      const data = res?.data || null;
      setOverview(data);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        /* storage full — ignore */
      }
    } catch (err) {
      if (requestRef.current !== controller || err?.name === "AbortError") return;
      setError(err?.message || "Could not load the overview.");
    } finally {
      if (requestRef.current === controller) setLoading(false);
    }
  }, [config, params, product]);

  useEffect(() => {
    fetchOverview();
    return () => requestRef.current?.abort();
  }, [fetchOverview, reloadToken]);

  const openDrill = useCallback(
    async (title, query) => {
      if (!query) return;
      setDrillSearch("");
      setDrill({ open: true, title, loading: true, rows: [], total: 0, error: "" });
      try {
        const res = await config.api.getAnalyticsDrilldown({ ...params, ...query, limit: DRILL_LIMIT });
        const rows = Array.isArray(res?.data) ? res.data : [];
        setDrill((prev) => ({ ...prev, loading: false, rows, total: Number(res?.total ?? rows.length) }));
      } catch (err) {
        setDrill((prev) => ({ ...prev, loading: false, error: err?.message || `Could not load ${config.unit}.` }));
      }
    },
    [config, params],
  );

  const kpis = overview?.kpis || [];
  const breakdowns = overview?.breakdowns || [];
  const attention = overview?.attention || [];
  const totalCount = toNumber(kpis[0]?.value);
  const labels = overview?.trendLabels || { created: "Created", completed: "Completed" };

  const trendRows = useMemo(() => [...(overview?.trend || [])].reverse(), [overview]);
  const trendMax = useMemo(
    () => ({
      created: Math.max(...trendRows.map((row) => row.created), 1),
      amount: Math.max(...trendRows.map((row) => row.amount), 1),
    }),
    [trendRows],
  );

  const barBreakdowns = breakdowns.filter((b) => BAR_BREAKDOWNS.has(b.key));
  const tableBreakdowns = breakdowns.filter((b) => !BAR_BREAKDOWNS.has(b.key));

  const filteredDrillRows = useMemo(() => {
    const q = drillSearch.trim().toLowerCase();
    if (!q) return drill.rows;
    return drill.rows.filter((row) =>
      [row.id, row.customerName, row.mobile, row.bank, row.type, row.vehicle, row.registrationNumber]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [drill.rows, drillSearch]);
  const drillValue = filteredDrillRows.reduce((sum, row) => sum + toNumber(row.value), 0);

  const trendColumns = [
    { title: "Month", dataIndex: "label", key: "label", width: 110 },
    {
      title: labels.created,
      key: "created",
      render: (_, row) => (
        <button type="button" className="w-full cursor-pointer bg-transparent p-0 text-left"
          onClick={() => row.created && openDrill(`${labels.created} in ${row.label}`, { widget: "trend_created", bucket: row.bucket })}>
          <Progress status="normal" percent={(row.created / trendMax.created) * 100} format={() => formatCount(row.created)} size="small" className="!m-0" />
        </button>
      ),
    },
    {
      title: labels.completed,
      key: "amount",
      render: (_, row) => (
        <button type="button" className="w-full cursor-pointer bg-transparent p-0 text-left"
          onClick={() => row.completed && openDrill(`${labels.completed} in ${row.label}`, { widget: "trend_completed", bucket: row.bucket })}>
          <Progress status="normal" percent={(row.amount / trendMax.amount) * 100} strokeColor="#16a34a"
            format={() => `${formatINR(row.amount)} · ${formatCount(row.completed)}`} size="small" className="!m-0" />
        </button>
      ),
    },
  ];

  const breakdownColumns = (title) => [
    { title, dataIndex: "label", key: "label", ellipsis: true, render: (value) => STATUS_META[value]?.label || value },
    { title: config.unit === "cases" ? "Cases" : "Files", dataIndex: "count", key: "count", align: "right", width: 80,
      sorter: (a, b) => a.count - b.count, defaultSortOrder: "descend" },
    { title: config.valueTitle, dataIndex: "amount", key: "amount", align: "right", width: 140, render: formatINR,
      sorter: (a, b) => a.amount - b.amount },
  ];

  const drillColumns = [
    {
      title: config.idTitle,
      dataIndex: "id",
      key: "id",
      width: 140,
      fixed: "left",
      render: (value, row) => <Link to={config.editPath(row)} className="font-medium text-blue-600 hover:underline">{value || "—"}</Link>,
    },
    { title: "Customer", dataIndex: "customerName", key: "customerName", width: 170, ellipsis: true },
    { title: "Mobile", dataIndex: "mobile", key: "mobile", width: 120 },
    { title: config.typeTitle, dataIndex: "type", key: "type", width: 130, render: (v) => v || "—" },
    { title: config.stageTitle, dataIndex: "stage", key: "stage", width: 130, render: (v) => v || "—" },
    { title: "Status", dataIndex: "status", key: "status", width: 110, render: (status) => <StatusTag status={status} /> },
    { title: config.partnerTitle, dataIndex: "bank", key: "bank", width: 150, ellipsis: true, render: (v) => v || "—" },
    ...(product === "insurance"
      ? [{ title: "Vehicle", key: "vehicle", width: 170, ellipsis: true,
          render: (_, row) => [row.vehicle, row.registrationNumber].filter(Boolean).join(" · ") || "—" }]
      : []),
    { title: config.valueTitle, dataIndex: "value", key: "value", width: 130, align: "right", render: formatINR },
    { title: "Created", dataIndex: "createdAt", key: "createdAt", width: 120, render: formatDate },
  ];

  const cardProps = { size: "small", className: "h-full", loading };

  return (
    <div className="space-y-4">
      {error ? (
        <Alert type="error" showIcon message={error} action={<Button size="small" onClick={fetchOverview}>Retry</Button>} closable onClose={() => setError("")} />
      ) : null}

      <Row gutter={[16, 16]}>
        {(kpis.length ? kpis : Array.from({ length: 6 }, (_, i) => ({ key: `placeholder-${i}` }))).map((kpi) => (
          <Col key={kpi.key} xs={12} md={8} xl={4}>
            <KpiCard
              loading={loading}
              icon={KPI_ICONS[kpi.key]}
              title={kpi.title}
              tooltip={kpi.tooltip}
              value={kpi.format === "percent" ? toNumber(kpi.value) : kpi.value}
              precision={kpi.format === "percent" ? 1 : undefined}
              suffix={kpi.format === "percent" ? "%" : undefined}
              formatter={formatKpi(kpi.format)}
              footer={kpi.footer}
              onClick={kpi.drill ? () => openDrill(kpi.title, kpi.drill) : undefined}
            />
          </Col>
        ))}
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card {...cardProps} title={`${labels.created} vs ${labels.completed.toLowerCase()}`}
            extra={<Text type="secondary" className="text-xs">By month created · last 24 months</Text>}>
            <ColumnChart
              data={overview?.trend || []}
              xKey="label"
              series={[
                { key: "created", label: labels.created, color: SERIES_COLORS[0] },
                { key: "completed", label: labels.completed, color: SERIES_COLORS[1] },
              ]}
              onSelect={(row) => row.created && openDrill(`${labels.created} in ${row.label}`, { widget: "trend_created", bucket: row.bucket })}
              emptyText={`No ${config.unit} in this period`}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card {...cardProps} title={`${labels.completed} ${config.valueTitle.toLowerCase()}`}
            extra={<Text type="secondary" className="text-xs">Last 24 months</Text>}>
            <ColumnChart
              data={overview?.trend || []}
              xKey="label"
              currency
              series={[{ key: "amount", label: config.valueTitle, color: SERIES_COLORS[1], format: formatINR }]}
              onSelect={(row) => row.completed && openDrill(`${labels.completed} in ${row.label}`, { widget: "trend_completed", bucket: row.bucket })}
              emptyText={`Nothing ${labels.completed.toLowerCase()} in this period`}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={barBreakdowns.length ? 14 : 24}>
          <Card {...cardProps} title="Monthly trend" extra={<Text type="secondary" className="text-xs">Newest first</Text>}>
            <Table size="small" rowKey="bucket" columns={trendColumns} dataSource={trendRows}
              pagination={trendRows.length > 12 ? { pageSize: 12, size: "small" } : false}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${config.unit} in this period`} /> }} />
          </Card>
        </Col>
        {barBreakdowns.map((breakdown) => (
          <Col key={breakdown.key} xs={24} md={12} xl={barBreakdowns.length > 1 ? 5 : 10}>
            <Card {...cardProps} title={breakdown.title}>
              {breakdown.key === "status" ? (
                <div className="mb-3">
                  <CompositionBar
                    rows={breakdown.rows}
                    order={STATUS_ORDER[product]}
                    labelOf={(row) => STATUS_META[row.key]?.label || row.label}
                    onSelect={(row) => openDrill(`${breakdown.title}: ${STATUS_META[row.key]?.label || row.label}`, { widget: breakdown.key, key: row.key })}
                  />
                </div>
              ) : null}
              <BarList
                rows={breakdown.rows}
                total={totalCount}
                renderLabel={(row) => (breakdown.key === "status" ? <StatusTag status={row.key} /> : row.label)}
                onSelect={(row) => row.count && openDrill(`${breakdown.title}: ${STATUS_META[row.key]?.label || row.label}`, { widget: breakdown.key, key: row.key })}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {attention.length ? (
        <Card size="small" title={<Space><AlertOutlined />Needs attention</Space>}>
          <Row gutter={[16, 16]}>
            {attention.map((item) => (
              <Col key={item.key} xs={12} lg={8}>
                <Card size="small" hoverable onClick={() => openDrill(item.title, item.drill)} loading={loading}>
                  <Statistic title={<Tooltip title={item.hint}>{item.title}</Tooltip>} value={toNumber(item.value)} formatter={formatCount}
                    valueStyle={toNumber(item.value) ? { color: "#d97706" } : undefined} />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      ) : null}

      <Row gutter={[16, 16]}>
        {tableBreakdowns.map((breakdown) => (
          <Col key={breakdown.key} xs={24} xl={12}>
            <Card {...cardProps} title={breakdown.title}>
              <Table size="small" rowKey="key" columns={breakdownColumns(breakdown.title.replace(/s$/, ""))} dataSource={breakdown.rows}
                pagination={{ pageSize: 8, size: "small", hideOnSinglePage: true }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data for this period" /> }}
                onRow={(row) => ({ onClick: () => openDrill(`${breakdown.title}: ${row.label}`, { widget: breakdown.key, key: row.key }), className: "cursor-pointer" })} />
            </Card>
          </Col>
        ))}
      </Row>

      <Drawer title={drill.title} open={drill.open} width="min(1200px, 100vw)" onClose={() => setDrill((prev) => ({ ...prev, open: false }))} destroyOnHidden>
        <Space direction="vertical" size="middle" className="w-full">
          {drill.error ? <Alert type="error" showIcon message={drill.error} /> : null}
          <Row gutter={16}>
            <Col xs={12} md={6}><Statistic title={`Matching ${config.unit}`} value={drill.total} formatter={formatCount} loading={drill.loading} /></Col>
            <Col xs={12} md={6}><Statistic title="Shown" value={filteredDrillRows.length} formatter={formatCount} loading={drill.loading} /></Col>
            <Col xs={12} md={6}><Statistic title={`${config.valueTitle} (shown)`} value={drillValue} formatter={formatINR} loading={drill.loading} /></Col>
            <Col xs={12} md={6}><Statistic title="Average" value={filteredDrillRows.length ? drillValue / filteredDrillRows.length : 0} formatter={formatINR} loading={drill.loading} /></Col>
          </Row>
          {drill.total > drill.rows.length ? (
            <Alert type="info" showIcon message={`Showing the ${formatCount(drill.rows.length)} most recently updated of ${formatCount(drill.total)} ${config.unit}.`} />
          ) : null}
          <Input.Search allowClear placeholder={`Search ${config.idTitle.toLowerCase()}, customer, mobile or ${config.partnerTitle.toLowerCase()}`}
            value={drillSearch} onChange={(e) => setDrillSearch(e.target.value)} className="md:!w-[28rem]" />
          <Table size="small" rowKey={(row) => row._id || row.id} loading={drill.loading} columns={drillColumns} dataSource={filteredDrillRows}
            pagination={{ pageSize: 20, showSizeChanger: true }} scroll={{ x: "max-content" }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${config.unit} match`} /> }} />
        </Space>
      </Drawer>
    </div>
  );
};

export default ProductOverview;
