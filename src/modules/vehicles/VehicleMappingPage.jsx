import React, { useState, useMemo, useCallback } from "react";
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Empty,
  message,
} from "antd";
import {
  ArrowRightOutlined,
  DeleteOutlined,
  DownloadOutlined,
  LinkOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

import leftVehicles from "../../data/left_vehicles_2026.json";
import rightVehicles from "../../data/right_vehicles_current.json";

const { Text, Title } = Typography;

const norm = (s = "") => String(s).toLowerCase().trim();

const fuzzyScore = (left, right) => {
  const lModel = norm(left.model);
  const rModel = norm(right.model);
  const lVariant = norm(left.variant);
  const rVariant = norm(right.variant_short);
  const lFuel = norm(left.fuel);
  const rFuel = norm(right.fuel_type);

  let score = 0;
  if (lModel === rModel || lModel.includes(rModel) || rModel.includes(lModel))
    score += 50;
  if (lVariant === rVariant) score += 40;
  else if (lVariant.includes(rVariant) || rVariant.includes(lVariant))
    score += 20;
  if (lFuel === rFuel.toLowerCase()) score += 10;
  return score;
};

const listStyle = {
  border: "1px solid #f0f0f0",
  borderRadius: 10,
  height: 520,
  overflowY: "auto",
  background: "#fff",
};

const itemStyle = (selected, mapped, suggested) => ({
  padding: "9px 12px",
  borderBottom: "1px solid #f5f5f5",
  cursor: "pointer",
  background: selected
    ? "#e6f4ff"
    : mapped
      ? "#f6ffed"
      : suggested
        ? "#fffbe6"
        : "#fff",
  borderLeft: selected
    ? "3px solid #1677ff"
    : mapped
      ? "3px solid #52c41a"
      : "3px solid transparent",
});

const VehicleMappingPage = () => {
  const [leftMakeFilter, setLeftMakeFilter] = useState("");
  const [leftModelFilter, setLeftModelFilter] = useState("");
  const [leftSearch, setLeftSearch] = useState("");
  const [hideMappedLeft, setHideMappedLeft] = useState(false);

  const [rightBrandFilter, setRightBrandFilter] = useState("");
  const [rightModelFilter, setRightModelFilter] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [hideMappedRight, setHideMappedRight] = useState(false);

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [mappings, setMappings] = useState({});

  const leftMakes = useMemo(
    () => [...new Set(leftVehicles.map((v) => v.make))].sort(),
    [],
  );

  const leftModels = useMemo(() => {
    const filtered = leftMakeFilter
      ? leftVehicles.filter((v) => v.make === leftMakeFilter)
      : leftVehicles;
    return [...new Set(filtered.map((v) => v.model))].sort();
  }, [leftMakeFilter]);

  const rightBrands = useMemo(
    () => [...new Set(rightVehicles.map((v) => v.brand))].sort(),
    [],
  );

  const rightModels = useMemo(() => {
    const filtered = rightBrandFilter
      ? rightVehicles.filter((v) => v.brand === rightBrandFilter)
      : rightVehicles;
    return [...new Set(filtered.map((v) => v.model))].sort();
  }, [rightBrandFilter]);

  const mappedLeftIds = useMemo(
    () => new Set(Object.keys(mappings).map(Number)),
    [mappings],
  );

  const mappedRightIds = useMemo(
    () => new Set(Object.values(mappings).map(Number)),
    [mappings],
  );

  const filteredLeft = useMemo(() => {
    let list = leftVehicles;
    if (leftMakeFilter) list = list.filter((v) => v.make === leftMakeFilter);
    if (leftModelFilter) list = list.filter((v) => v.model === leftModelFilter);
    if (hideMappedLeft) list = list.filter((v) => !mappedLeftIds.has(v.id));
    const q = norm(leftSearch);
    if (q)
      list = list.filter(
        (v) =>
          norm(v.make).includes(q) ||
          norm(v.model).includes(q) ||
          norm(v.variant).includes(q),
      );
    return list;
  }, [
    leftMakeFilter,
    leftModelFilter,
    leftSearch,
    hideMappedLeft,
    mappedLeftIds,
  ]);

  const filteredRight = useMemo(() => {
    let list = rightVehicles;
    if (rightBrandFilter)
      list = list.filter((v) => v.brand === rightBrandFilter);
    if (rightModelFilter)
      list = list.filter((v) => v.model === rightModelFilter);
    if (hideMappedRight) list = list.filter((v) => !mappedRightIds.has(v.id));
    const q = norm(rightSearch);
    if (q)
      list = list.filter(
        (v) =>
          norm(v.brand).includes(q) ||
          norm(v.model).includes(q) ||
          norm(v.variant_short).includes(q) ||
          norm(v.variant).includes(q),
      );
    return list;
  }, [
    rightBrandFilter,
    rightModelFilter,
    rightSearch,
    hideMappedRight,
    mappedRightIds,
  ]);

  const suggestions = useMemo(() => {
    if (!selectedLeft) return [];
    return rightVehicles
      .map((r) => ({ ...r, score: fuzzyScore(selectedLeft, r) }))
      .filter((r) => r.score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [selectedLeft]);

  const onMap = useCallback(() => {
    if (!selectedLeft || !selectedRight) {
      message.warning("Select a vehicle from both sides first.");
      return;
    }
    setMappings((prev) => ({ ...prev, [selectedLeft.id]: selectedRight.id }));
    message.success(
      `Mapped: ${selectedLeft.make} ${selectedLeft.model} ${selectedLeft.variant} → ${selectedRight.brand} ${selectedRight.model} ${selectedRight.variant_short}`,
    );
    setSelectedLeft(null);
    setSelectedRight(null);
  }, [selectedLeft, selectedRight]);

  const onUnmap = useCallback((leftId) => {
    setMappings((prev) => {
      const next = { ...prev };
      delete next[leftId];
      return next;
    });
  }, []);

  const onAutoMap = useCallback(() => {
    if (!selectedLeft || suggestions.length === 0) return;
    const best = suggestions[0];
    if (best.score < 80) {
      message.warning(
        `Best match score is ${best.score}. Please verify before auto-mapping.`,
      );
    }
    setMappings((prev) => ({ ...prev, [selectedLeft.id]: best.id }));
    message.success(
      `Auto-mapped: ${selectedLeft.variant} → ${best.variant_short} (score: ${best.score})`,
    );
    setSelectedLeft(null);
    setSelectedRight(null);
  }, [selectedLeft, suggestions]);

  const exportMappings = useCallback(() => {
    const output = Object.entries(mappings).map(([leftId, rightId]) => {
      const left = leftVehicles.find((v) => v.id === Number(leftId));
      const right = rightVehicles.find((v) => v.id === Number(rightId));
      return {
        source_make: left?.make,
        source_model: left?.model,
        source_variant: left?.variant,
        source_fuel: left?.fuel,
        source_transmission: left?.transmission,
        target_brand: right?.brand,
        target_model: right?.model,
        target_variant_short: right?.variant_short,
        target_variant_full: right?.variant,
        target_fuel_type: right?.fuel_type,
        mapped: true,
      };
    });

    const unmapped = leftVehicles
      .filter((v) => !mappings[v.id])
      .map((v) => ({
        source_make: v.make,
        source_model: v.model,
        source_variant: v.variant,
        source_fuel: v.fuel,
        source_transmission: v.transmission,
        target_brand: null,
        target_model: null,
        target_variant_short: null,
        target_variant_full: null,
        target_fuel_type: null,
        mapped: false,
      }));

    const full = {
      mappedCount: output.length,
      unmappedCount: unmapped.length,
      mappings: output,
      unmapped,
    };

    const blob = new Blob([JSON.stringify(full, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vehicle_mapping_2026.json";
    a.click();
    URL.revokeObjectURL(url);
    message.success(
      `Exported ${output.length} mappings + ${unmapped.length} unmapped.`,
    );
  }, [mappings]);

  const mappedEntries = useMemo(
    () =>
      Object.entries(mappings)
        .map(([leftId, rightId]) => ({
          left: leftVehicles.find((v) => v.id === Number(leftId)),
          right: rightVehicles.find((v) => v.id === Number(rightId)),
          leftId: Number(leftId),
          rightId: Number(rightId),
        }))
        .filter((e) => e.left && e.right),
    [mappings],
  );

  return (
    <div style={{ padding: 24, background: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Vehicle Mapping — 2026 Active Cars
          </Title>
          <Text type="secondary">
            Map 2026 JSON variants ({leftVehicles.length}) → Current DB variants
            ({rightVehicles.length})
          </Text>
        </div>
        <Space wrap>
          <Tag color="green">Mapped: {Object.keys(mappings).length}</Tag>
          <Tag color="orange">
            Unmapped: {leftVehicles.length - Object.keys(mappings).length}
          </Tag>
          <Button
            icon={<DownloadOutlined />}
            onClick={exportMappings}
            type="primary"
          >
            Export Mappings
          </Button>
        </Space>
      </div>

      {/* 3-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 220px 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* LEFT PANEL */}
        <Card
          size="small"
          title={
            <span>
              <Tag color="blue">JSON 2026</Tag>
              <Text strong>Cars Dataset — Active 2026</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({filteredLeft.length} shown)
              </Text>
            </span>
          }
        >
          <Space
            direction="vertical"
            style={{ width: "100%", marginBottom: 10 }}
            size={6}
          >
            <Select
              showSearch
              allowClear
              placeholder="Filter by Make"
              style={{ width: "100%" }}
              value={leftMakeFilter || undefined}
              onChange={(v) => {
                setLeftMakeFilter(v || "");
                setLeftModelFilter("");
              }}
              options={leftMakes.map((m) => ({ label: m, value: m }))}
              filterOption={(i, o) => norm(o.label).includes(norm(i))}
            />
            <Select
              showSearch
              allowClear
              placeholder="Filter by Model"
              style={{ width: "100%" }}
              value={leftModelFilter || undefined}
              onChange={(v) => setLeftModelFilter(v || "")}
              options={leftModels.map((m) => ({ label: m, value: m }))}
              filterOption={(i, o) => norm(o.label).includes(norm(i))}
              disabled={!leftMakeFilter}
            />
            <Input
              placeholder="Search variant / make / model..."
              value={leftSearch}
              onChange={(e) => setLeftSearch(e.target.value)}
              allowClear
            />
            <label style={{ fontSize: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={hideMappedLeft}
                onChange={(e) => setHideMappedLeft(e.target.checked)}
              />{" "}
              Hide mapped
            </label>
          </Space>

          <div style={listStyle}>
            {filteredLeft.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No vehicles match filters"
                style={{ padding: 32 }}
              />
            ) : (
              filteredLeft.map((v) => {
                const isMapped = mappedLeftIds.has(v.id);
                const isSelected = selectedLeft?.id === v.id;
                const mappedRightId = mappings[v.id];
                const mappedRight =
                  mappedRightId !== undefined
                    ? rightVehicles.find((r) => r.id === mappedRightId)
                    : null;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedLeft(isSelected ? null : v)}
                    style={itemStyle(isSelected, isMapped, false)}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {v.make} — {v.model}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#374151", marginTop: 2 }}
                    >
                      {v.variant}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        display: "flex",
                        gap: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      <Tag color="blue" style={{ fontSize: 10 }}>
                        {v.fuel}
                      </Tag>
                      <Tag color="purple" style={{ fontSize: 10 }}>
                        {v.transmission}
                      </Tag>
                      {isMapped && (
                        <Tag
                          color="green"
                          icon={<CheckCircleOutlined />}
                          style={{ fontSize: 10 }}
                        >
                          Mapped
                        </Tag>
                      )}
                    </div>
                    {isMapped && mappedRight && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#059669",
                          marginTop: 4,
                        }}
                      >
                        → {mappedRight.brand} {mappedRight.model}{" "}
                        {mappedRight.variant_short}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* CENTER PANEL */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            paddingTop: 40,
          }}
        >
          <Card size="small" style={{ textAlign: "center" }}>
            <Text
              strong
              style={{ fontSize: 12, display: "block", marginBottom: 8 }}
            >
              Selected
            </Text>
            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
                marginBottom: 4,
                minHeight: 32,
                wordBreak: "break-word",
              }}
            >
              {selectedLeft ? (
                <Tag color="blue">
                  {selectedLeft.make} {selectedLeft.model} —{" "}
                  {selectedLeft.variant}
                </Tag>
              ) : (
                <span style={{ color: "#9ca3af" }}>None</span>
              )}
            </div>
            <div style={{ fontSize: 20, color: "#9ca3af", margin: "4px 0" }}>
              ↕
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
                marginBottom: 8,
                minHeight: 32,
                wordBreak: "break-word",
              }}
            >
              {selectedRight ? (
                <Tag color="green">
                  {selectedRight.brand} {selectedRight.model} —{" "}
                  {selectedRight.variant_short}
                </Tag>
              ) : (
                <span style={{ color: "#9ca3af" }}>None</span>
              )}
            </div>

            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={onMap}
              block
              disabled={!selectedLeft || !selectedRight}
              style={{ marginBottom: 6 }}
            >
              Map
            </Button>

            {suggestions.length > 0 && (
              <Button
                icon={<LinkOutlined />}
                onClick={onAutoMap}
                block
                style={{
                  marginBottom: 6,
                  borderColor: "#f59e0b",
                  color: "#f59e0b",
                }}
              >
                Auto (score: {suggestions[0]?.score})
              </Button>
            )}
          </Card>

          {/* Suggestions */}
          {selectedLeft && suggestions.length > 0 && (
            <Card
              size="small"
              title={<Text style={{ fontSize: 11 }}>Top Suggestions</Text>}
            >
              {suggestions.slice(0, 3).map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedRight(s)}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                    marginBottom: 4,
                    border:
                      selectedRight?.id === s.id
                        ? "1px solid #1677ff"
                        : "1px solid #f0f0f0",
                    background:
                      selectedRight?.id === s.id ? "#e6f4ff" : "#fafafa",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600 }}>
                    {s.brand} — {s.variant_short}
                  </div>
                  <Tag
                    color={s.score >= 80 ? "green" : "orange"}
                    style={{ fontSize: 10 }}
                  >
                    score: {s.score}
                  </Tag>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* RIGHT PANEL */}
        <Card
          size="small"
          title={
            <span>
              <Tag color="green">Current DB</Tag>
              <Text strong>Active Vehicles — cdrive.vehicles</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({filteredRight.length} shown)
              </Text>
            </span>
          }
        >
          <Space
            direction="vertical"
            style={{ width: "100%", marginBottom: 10 }}
            size={6}
          >
            <Select
              showSearch
              allowClear
              placeholder="Filter by Brand"
              style={{ width: "100%" }}
              value={rightBrandFilter || undefined}
              onChange={(v) => {
                setRightBrandFilter(v || "");
                setRightModelFilter("");
              }}
              options={rightBrands.map((m) => ({ label: m, value: m }))}
              filterOption={(i, o) => norm(o.label).includes(norm(i))}
            />
            <Select
              showSearch
              allowClear
              placeholder="Filter by Model"
              style={{ width: "100%" }}
              value={rightModelFilter || undefined}
              onChange={(v) => setRightModelFilter(v || "")}
              options={rightModels.map((m) => ({ label: m, value: m }))}
              filterOption={(i, o) => norm(o.label).includes(norm(i))}
              disabled={!rightBrandFilter}
            />
            <Input
              placeholder="Search variant / brand / model..."
              value={rightSearch}
              onChange={(e) => setRightSearch(e.target.value)}
              allowClear
            />
            <label style={{ fontSize: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={hideMappedRight}
                onChange={(e) => setHideMappedRight(e.target.checked)}
              />{" "}
              Hide mapped
            </label>
          </Space>

          <div style={listStyle}>
            {filteredRight.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No vehicles match filters"
                style={{ padding: 32 }}
              />
            ) : (
              filteredRight.map((v) => {
                const isMapped = mappedRightIds.has(v.id);
                const isSelected = selectedRight?.id === v.id;
                const isSuggested = suggestions.some((s) => s.id === v.id);
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedRight(isSelected ? null : v)}
                    style={itemStyle(isSelected, isMapped, isSuggested)}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {v.brand} — {v.model}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#374151", marginTop: 2 }}
                    >
                      {v.variant_short}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}
                    >
                      {v.variant}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        display: "flex",
                        gap: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      <Tag color="cyan" style={{ fontSize: 10 }}>
                        {v.fuel_type}
                      </Tag>
                      {isMapped && (
                        <Tag
                          color="green"
                          icon={<CheckCircleOutlined />}
                          style={{ fontSize: 10 }}
                        >
                          Mapped
                        </Tag>
                      )}
                      {isSuggested && !isMapped && (
                        <Tag color="gold" style={{ fontSize: 10 }}>
                          Suggested
                        </Tag>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* MAPPED PAIRS */}
      {mappedEntries.length > 0 && (
        <Card
          size="small"
          title={<Text strong>Mapped Pairs ({mappedEntries.length})</Text>}
          style={{ marginTop: 16 }}
        >
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {mappedEntries.map(({ left, right, leftId }) => (
              <div
                key={leftId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 32px 1fr 40px",
                  gap: 8,
                  padding: "8px 12px",
                  borderBottom: "1px solid #f5f5f5",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>
                    {left.make} — {left.model}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    {left.variant}
                  </div>
                  <Tag color="blue" style={{ fontSize: 10 }}>
                    {left.fuel}
                  </Tag>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: 18,
                  }}
                >
                  →
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>
                    {right.brand} — {right.model}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    {right.variant_short}
                  </div>
                  <Tag color="green" style={{ fontSize: 10 }}>
                    {right.fuel_type}
                  </Tag>
                </div>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={() => onUnmap(leftId)}
                />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default VehicleMappingPage;
