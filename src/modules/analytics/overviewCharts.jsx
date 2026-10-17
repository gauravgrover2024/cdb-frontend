import React, { useMemo } from "react";
import { Empty, Tooltip, Typography } from "antd";

// Lightweight charts for the Business Overview tabs, built from plain HTML +
// antd Tooltip (no chart dependency). They sit above the existing tables,
// which stay as the accessible table view of the same numbers.
//
// Colors: validated categorical order (dataviz reference palette, light
// surface #fcfcfb) - all hard checks pass; slots 3-5 are below 3:1 contrast,
// so every chart pairs color with a labelled legend and per-mark tooltip.

const { Text } = Typography;

export const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const GRID = "#e1e0d9";
const BASELINE = "#c3c2b7";

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const compactCount = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
export const formatCompact = (value, { currency = false } = {}) =>
  `${currency ? "₹" : ""}${compactCount.format(toNumber(value))}`;

// 0 / half / max ticks on a "nice" max so gridlines land on round numbers.
const niceMax = (value) => {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value) || 10;
  return step * power;
};

const Swatch = ({ color }) => (
  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
);

export const ChartLegend = ({ items }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
    {items.map((item) => (
      <span key={item.key} className="inline-flex items-center gap-1.5">
        <Swatch color={item.color} />
        <Text type="secondary" className="text-xs">{item.label}</Text>
        {item.value !== undefined ? <Text strong className="text-xs tabular-nums">{item.value}</Text> : null}
      </span>
    ))}
  </div>
);

/**
 * Column chart over months. `series` share one unit/axis (never two scales):
 * e.g. files created vs files disbursed, or a single value series.
 */
export const ColumnChart = ({
  data,
  xKey = "label",
  series,
  height = 180,
  currency = false,
  maxColumns = 24,
  onSelect,
  emptyText = "No data for this period",
}) => {
  // Oldest → newest, capped to the most recent months so columns stay readable.
  const rows = useMemo(() => (data || []).slice(-maxColumns), [data, maxColumns]);
  const max = useMemo(
    () => niceMax(Math.max(0, ...rows.flatMap((row) => series.map((s) => toNumber(row[s.key]))))),
    [rows, series],
  );

  if (!rows.length || rows.every((row) => series.every((s) => !toNumber(row[s.key])))) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />;
  }

  const labelEvery = Math.ceil(rows.length / 8);
  const ticks = [max, max / 2, 0];

  return (
    <div className="space-y-2">
      {series.length > 1 ? (
        <ChartLegend items={series.map((s) => ({ key: s.key, label: s.label, color: s.color }))} />
      ) : null}
      <div className="flex gap-2">
        {/* y-axis */}
        <div className="flex flex-col justify-between text-right text-[10px] tabular-nums text-[#898781]" style={{ height }}>
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
              {formatCompact(tick, { currency })}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            {/* gridlines */}
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              <div className="h-px" style={{ background: GRID }} />
              <div className="h-px" style={{ background: GRID }} />
              <div className="h-px" style={{ background: BASELINE }} />
            </div>
            <div className="absolute inset-0 flex items-end gap-1">
              {rows.map((row) => (
                <Tooltip
                  key={row[xKey]}
                  title={
                    <div className="space-y-0.5 text-xs">
                      <div className="font-semibold">{row[xKey]}</div>
                      {series.map((s) => (
                        <div key={s.key} className="flex items-center gap-1.5">
                          <Swatch color={s.color} />
                          <span>{s.label}:</span>
                          <span className="font-semibold tabular-nums">
                            {s.format ? s.format(row[s.key]) : toNumber(row[s.key]).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  }
                >
                  {/* The whole column group is the hit target, not just the bar. */}
                  <button
                    type="button"
                    onClick={() => onSelect?.(row)}
                    className="group flex h-full min-w-0 flex-1 cursor-pointer items-end justify-center gap-[2px] rounded-sm bg-transparent p-0 hover:bg-black/[0.03]"
                    aria-label={`${row[xKey]}: ${series.map((s) => `${s.label} ${toNumber(row[s.key])}`).join(", ")}`}
                  >
                    {series.map((s) => {
                      const value = toNumber(row[s.key]);
                      return (
                        <span
                          key={s.key}
                          className="block max-w-[28px] flex-1 rounded-t transition-opacity group-hover:opacity-85"
                          style={{
                            height: value > 0 ? `max(2px, ${(value / max) * 100}%)` : 0,
                            background: s.color,
                          }}
                        />
                      );
                    })}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
          {/* x-axis */}
          <div className="mt-1 flex gap-1 text-[10px] text-[#898781]">
            {rows.map((row, index) => (
              <span key={row[xKey]} className="min-w-0 flex-1 truncate text-center">
                {index % labelEvery === 0 || index === rows.length - 1 ? String(row[xKey]).replace(/ (\d{2})(\d{2})$/, " '$2") : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Part-to-whole as one 100% stacked bar + labelled legend (instead of a
 * donut). Colors follow the entity via `order`, never its rank, so a key keeps
 * its color whatever the counts are.
 */
export const CompositionBar = ({ rows, order, labelOf = (row) => row.label, onSelect }) => {
  const visible = (rows || []).filter((row) => toNumber(row.count) > 0);
  const total = visible.reduce((sum, row) => sum + toNumber(row.count), 0);
  if (!total) return null;

  const colorOf = (row) => {
    const index = order ? order.indexOf(row.key) : -1;
    return SERIES_COLORS[index >= 0 ? index % SERIES_COLORS.length : SERIES_COLORS.length - 1];
  };
  // Keys outside `order` go last.
  const rank = (row) => {
    const index = order ? order.indexOf(row.key) : -1;
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  const sorted = [...visible].sort((a, b) => rank(a) - rank(b));

  return (
    <div className="space-y-2">
      <div className="flex h-3.5 w-full gap-[2px] overflow-hidden rounded">
        {sorted.map((row) => {
          const share = (toNumber(row.count) / total) * 100;
          return (
            <Tooltip key={row.key} title={`${labelOf(row)}: ${toNumber(row.count).toLocaleString("en-IN")} (${share.toFixed(1)}%)`}>
              <button
                type="button"
                onClick={() => onSelect?.(row)}
                className="h-full cursor-pointer border-0 p-0 transition-opacity hover:opacity-85"
                style={{ width: `${share}%`, minWidth: 4, background: colorOf(row) }}
                aria-label={`${labelOf(row)} ${toNumber(row.count)}`}
              />
            </Tooltip>
          );
        })}
      </div>
      <ChartLegend
        items={sorted.map((row) => ({
          key: row.key,
          label: labelOf(row),
          color: colorOf(row),
          value: `${Math.round((toNumber(row.count) / total) * 100)}%`,
        }))}
      />
    </div>
  );
};
