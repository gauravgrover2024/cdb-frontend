import React from "react";
import dayjs from "dayjs";
import { Card, Empty, List, Progress, Statistic, Tag, Tooltip, Typography } from "antd";

// Building blocks shared by every Business Overview tab (Car Loan, Home Loan,
// Insurance) so each product renders with the same widgets.

const { Text } = Typography;

export const toNumber = (value) => {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
export const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(toNumber(value));
export const formatCount = (value) => new Intl.NumberFormat("en-IN").format(toNumber(value));
export const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

export const formatDate = (value) => {
  const date = dayjs(value);
  return value && date.isValid() ? date.format("DD MMM YYYY") : "—";
};

export const STATUS_META = {
  disbursed: { label: "Disbursed", color: "green" },
  approved: { label: "Approved", color: "blue" },
  pending: { label: "Pending", color: "gold" },
  completed: { label: "Completed", color: "cyan" },
  rejected: { label: "Rejected", color: "red" },
  cancelled: { label: "Cancelled", color: "default" },
  // Insurance
  issued: { label: "Issued", color: "green" },
  submitted: { label: "Submitted", color: "blue" },
  draft: { label: "Draft", color: "gold" },
};

export const StatusTag = ({ status }) => {
  const meta = STATUS_META[status] || { label: status || "—", color: "default" };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

// Clickable KPI card built from antd Card + Statistic, with an icon chip.
export const KpiCard = ({ title, value, suffix, precision, formatter, footer, icon, loading, onClick, tooltip }) => (
  <Card
    hoverable={Boolean(onClick)}
    onClick={onClick}
    loading={loading}
    size="small"
    className="h-full overflow-hidden transition-shadow"
    styles={{ body: { padding: 16 } }}
  >
    <div className="flex items-start justify-between gap-2">
      <Text type="secondary" className="text-xs font-medium">
        {tooltip ? <Tooltip title={tooltip}>{title}</Tooltip> : title}
      </Text>
      {icon ? (
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2a78d6]/10 text-[15px] text-[#2a78d6]">
          {icon}
        </span>
      ) : null}
    </div>
    <Statistic
      value={value}
      suffix={suffix}
      precision={precision}
      formatter={formatter}
      valueStyle={{ fontSize: 22, fontWeight: 600, lineHeight: 1.25 }}
    />
    {footer ? <Text type="secondary" className="mt-1 block text-xs">{footer}</Text> : null}
  </Card>
);

// A ranked list of values with an antd Progress bar per row.
export const BarList = ({ rows, total, onSelect, renderLabel, emptyText = "No data for this period" }) => {
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
