import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Empty, Row, Space, Spin, Table, Tag, Typography } from "antd";
import { PlayCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { vehicleScraperApi } from "../../api/vehicleScraper";

const { Title, Text } = Typography;

const statusColor = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "green";
  if (s === "failed") return "red";
  if (s === "running") return "blue";
  return "default";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
};

const formatMs = (value) => {
  const ms = Number(value || 0);
  if (!ms) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
};

const VehicleScraperDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [startingScript, setStartingScript] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [summary, setSummary] = useState(null);
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [selectedRun, setSelectedRun] = useState(null);
  const [error, setError] = useState("");

  const refreshAll = useCallback(async () => {
    const [catalogData, summaryData, runsData] = await Promise.all([
      vehicleScraperApi.getCatalog(),
      vehicleScraperApi.getSummary(),
      vehicleScraperApi.getRuns(),
    ]);
    setCatalog(catalogData || []);
    setSummary(summaryData || null);
    setRuns(runsData || []);
  }, []);

  const refreshRun = useCallback(async (runId, includeLogs = true) => {
    if (!runId) {
      setSelectedRun(null);
      return;
    }
    const run = await vehicleScraperApi.getRunById(runId, includeLogs);
    setSelectedRun(run || null);
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await refreshAll();
    } catch (err) {
      setError(err?.message || "Failed to load vehicle script dashboard.");
    } finally {
      setLoading(false);
    }
  }, [refreshAll]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (selectedRunId) {
      refreshRun(selectedRunId, true).catch(() => {});
    }
  }, [selectedRunId, refreshRun]);

  const hasRunning = useMemo(
    () => runs.some((item) => String(item.status).toLowerCase() === "running"),
    [runs],
  );

  useEffect(() => {
    if (!hasRunning) return undefined;
    const timer = setInterval(async () => {
      try {
        await refreshAll();
        if (selectedRunId) {
          await refreshRun(selectedRunId, true);
        }
      } catch {
        // keep polling silently; top refresh will still work
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [hasRunning, refreshAll, refreshRun, selectedRunId]);

  const handleStart = async (scriptKey) => {
    setStartingScript(scriptKey);
    setError("");
    try {
      const run = await vehicleScraperApi.startRun(scriptKey);
      setSelectedRunId(run?.id || "");
      await refreshAll();
      if (run?.id) {
        await refreshRun(run.id, true);
      }
    } catch (err) {
      setError(err?.message || "Failed to start scraper script.");
    } finally {
      setStartingScript("");
    }
  };

  const collectionRows = useMemo(() => {
    const collections = summary?.snapshot?.collections || {};
    return Object.entries(collections).map(([name, value]) => ({
      key: name,
      collection: name,
      count: Number(value?.count || 0),
      scrapeTimestamp: value?.latest?.scrapeTimestamp || "-",
      lastUpdated: value?.latest?.lastUpdated || value?.latest?.updatedAt || "-",
      latestId: value?.latest?.id || "-",
    }));
  }, [summary]);

  const runRows = useMemo(
    () =>
      runs.map((run) => ({
        key: run.id,
        id: run.id,
        script: run.label,
        status: run.status,
        startedAt: run.startedAt,
        endedAt: run.endedAt,
        durationMs: run.durationMs,
        exitCode: run.exitCode,
        vehiclesDelta: run?.delta?.collections?.vehicles?.delta ?? 0,
        colorsDelta: run?.delta?.collections?.vehicle_colors?.delta ?? 0,
        featuresDelta: run?.delta?.collections?.vehicle_features?.delta ?? 0,
      })),
    [runs],
  );

  if (loading) {
    return (
      <div className="p-6">
        <Spin />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>
            Vehicle Data Sync
          </Title>
          <Text type="secondary">
            Run vehicle scraping scripts and review collection-level changes.
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadInitial}>
          Refresh
        </Button>
      </div>

      {error ? (
        <Alert type="error" showIcon message={error} />
      ) : null}

      {summary?.executionSupported === false ? (
        <Alert
          type="warning"
          showIcon
          message="Script execution is not supported on this backend environment."
          description="Run this dashboard against your local backend where Python scripts are available."
        />
      ) : null}

      <Card size="small">
        <Space direction="vertical" size={2}>
          <Text>
            <b>Scripts folder:</b> {summary?.scriptsDir || "-"}
          </Text>
          <Text>
            <b>Python:</b> {summary?.pythonBin || "-"}
          </Text>
          <Text>
            <b>Auto polling:</b> {hasRunning ? "ON (every 3s)" : "OFF"}
          </Text>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {catalog.map((script) => {
          const active = runs.find(
            (item) =>
              item.scriptKey === script.key &&
              String(item.status || "").toLowerCase() === "running",
          );
          const disabled =
            !script.runnable ||
            (hasRunning && !active) ||
            startingScript === script.key;
          return (
            <Col xs={24} md={8} key={script.key}>
              <Card
                size="small"
                title={script.label}
                extra={<Tag color={script.runnable ? "green" : "default"}>{script.runnable ? "Ready" : "Unavailable"}</Tag>}
              >
                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                  <Text type="secondary">{script.description}</Text>
                  <Text>
                    <b>File:</b> {script.filename}
                  </Text>
                  <Text>
                    <b>Collections:</b> {(script.targetCollections || []).join(", ")}
                  </Text>
                  {active ? (
                    <Tag color="blue">Running: {active.id}</Tag>
                  ) : null}
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    disabled={disabled}
                    loading={startingScript === script.key}
                    onClick={() => handleStart(script.key)}
                  >
                    Run Script
                  </Button>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={11}>
          <Card title="Current Collections Snapshot" size="small">
            <Table
              size="small"
              pagination={false}
              rowKey="collection"
              dataSource={collectionRows}
              columns={[
                { title: "Collection", dataIndex: "collection", key: "collection" },
                { title: "Count", dataIndex: "count", key: "count", width: 100 },
                {
                  title: "Scrape TS",
                  dataIndex: "scrapeTimestamp",
                  key: "scrapeTimestamp",
                  render: (value) => formatDateTime(value),
                },
                {
                  title: "Last Updated",
                  dataIndex: "lastUpdated",
                  key: "lastUpdated",
                  render: (value) => formatDateTime(value),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={13}>
          <Card title="Recent Script Runs" size="small">
            <Table
              size="small"
              rowKey="id"
              dataSource={runRows}
              pagination={{ pageSize: 6 }}
              onRow={(record) => ({
                onClick: () => setSelectedRunId(record.id),
                style: { cursor: "pointer" },
              })}
              columns={[
                { title: "Script", dataIndex: "script", key: "script" },
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  width: 110,
                  render: (value) => <Tag color={statusColor(value)}>{String(value || "").toUpperCase()}</Tag>,
                },
                {
                  title: "Duration",
                  dataIndex: "durationMs",
                  key: "durationMs",
                  width: 110,
                  render: (value) => formatMs(value),
                },
                { title: "Δ Vehicles", dataIndex: "vehiclesDelta", key: "vehiclesDelta", width: 110 },
                { title: "Δ Colors", dataIndex: "colorsDelta", key: "colorsDelta", width: 100 },
                { title: "Δ Features", dataIndex: "featuresDelta", key: "featuresDelta", width: 110 },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          selectedRun
            ? `Run Logs: ${selectedRun.label} (${selectedRun.id})`
            : "Run Logs"
        }
        size="small"
      >
        {!selectedRun ? (
          <Empty description="Select a run from the table to view logs." />
        ) : (
          <div className="space-y-2">
            <Space size="middle" wrap>
              <Tag color={statusColor(selectedRun.status)}>
                {String(selectedRun.status || "").toUpperCase()}
              </Tag>
              <Text>Started: {formatDateTime(selectedRun.startedAt)}</Text>
              <Text>Ended: {formatDateTime(selectedRun.endedAt)}</Text>
              <Text>Duration: {formatMs(selectedRun.durationMs)}</Text>
              <Text>Exit: {selectedRun.exitCode ?? "-"}</Text>
            </Space>
            <div
              style={{
                maxHeight: 380,
                overflow: "auto",
                border: "1px solid var(--ant-color-border-secondary, #e5e7eb)",
                borderRadius: 8,
                padding: 10,
                background: "var(--ant-color-bg-container, #fff)",
              }}
            >
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>
                {(selectedRun.logs || selectedRun.logsTail || []).join("\n") || "No logs yet."}
              </pre>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default VehicleScraperDashboard;

