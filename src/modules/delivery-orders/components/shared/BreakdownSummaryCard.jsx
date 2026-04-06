import React from "react";
import { Tag } from "antd";

/* ─── helpers ─────────────────────────────────────────────────────────── */
const asInt = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const hasDisplayableNumber = (value) => {
  if (value === undefined || value === null || value === "") return false;
  return Number.isFinite(Number(value));
};

const formatMoney = (value) => `₹ ${asInt(value).toLocaleString("en-IN")}`;

const intentColor = (intent, dark) =>
  ({
    addition: dark ? "#86efac" : "#15803d",
    discount: dark ? "#93c5fd" : "#1d4ed8",
    total: dark ? "#5eead4" : "#0f766e",
    warning: dark ? "#fcd34d" : "#b45309",
    danger: dark ? "#fca5a5" : "#dc2626",
    positive: dark ? "#86efac" : "#15803d",
    accent: dark ? "#93c5fd" : "#1d4ed8",
  })[intent] || (dark ? "#e5e7eb" : "#111827");

const chipColors = {
  blue: "blue",
  purple: "purple",
  green: "green",
  amber: "gold",
  slate: "default",
};

/* ─── Section component ───────────────────────────────────────────────── */
const Section = ({ section, index, isDarkMode, compact }) => {
  const rows = Array.isArray(section?.rows) ? section.rows : [];
  const borderColor = isDarkMode ? "#2a2d34" : "#edf0f5";

  return (
    <div
      style={{
        borderTop: `1px solid ${borderColor}`,
        paddingTop: 16,
        marginTop: index === 0 ? 0 : 8,
      }}
    >
      {/* Section title */}
      <div
        style={{
          marginBottom: 10,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: isDarkMode ? "#6b7280" : "#94a3b8",
        }}
      >
        {section?.title}
      </div>

      {rows.length ? (
        <div style={{ display: "grid", gap: 6 }}>
          {rows.map((row, rowIndex) => {
            const item = Array.isArray(row)
              ? {
                  label: row[0],
                  value: row[1],
                  intent: row[2] || "neutral",
                  strong: Boolean(row[3]),
                  raw: typeof row[1] === "string",
                }
              : row || {};

            const displayValue = item.raw
              ? String(item.value ?? "—")
              : hasDisplayableNumber(item.value)
                ? formatMoney(item.value)
                : "—";

            const isTotal = item.strong;
            const rowBg = isTotal
              ? isDarkMode
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.02)"
              : "transparent";

            return (
              <div
                key={`${item.label || "row"}-${rowIndex}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: compact ? 12 : 13,
                  padding: isTotal ? "5px 8px" : "2px 0",
                  borderRadius: isTotal ? 8 : 0,
                  background: rowBg,
                  borderTop: isTotal
                    ? `1px solid ${isDarkMode ? "#2a2d34" : "#edf0f5"}`
                    : "none",
                  marginTop: isTotal ? 4 : 0,
                }}
              >
                <span
                  style={{
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                    lineHeight: 1.4,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontWeight: item.strong ? 800 : 600,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                    color: intentColor(item.intent, isDarkMode),
                  }}
                >
                  {displayValue}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{ fontSize: 12, color: isDarkMode ? "#6b7280" : "#94a3b8" }}
        >
          No values captured yet
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   BreakdownSummaryCard
════════════════════════════════════════════════════════════════════════ */
const BreakdownSummaryCard = ({
  isDarkMode = false,
  eyebrow = "",
  title = "",
  subtitle = "",
  chipLabel = "",
  chipContent = null,
  chipTone = "blue",
  sections = [],
  sticky = false,
  compact = false,
}) => {
  const shell = {
    position: sticky ? "sticky" : "relative",
    top: sticky ? 20 : "auto",
    zIndex: sticky ? 2 : "auto",
    borderRadius: 20,
    border: `1px solid ${isDarkMode ? "#242830" : "#e4e9f2"}`,
    background: isDarkMode ? "#16181d" : "#ffffff",
    boxShadow: isDarkMode
      ? "0 2px 8px rgba(0,0,0,0.35), 0 12px 40px rgba(0,0,0,0.25)"
      : "0 2px 8px rgba(15,23,42,0.06), 0 12px 40px rgba(15,23,42,0.06)",
    overflow: "hidden",
    maxHeight: sticky ? "calc(100vh - 44px)" : "none",
  };

  return (
    <div>
      {/* Eyebrow label above the card */}
      {eyebrow && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 10,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: isDarkMode ? "#9ca3af" : "#6b7280",
          }}
        >
          {eyebrow}
        </div>
      )}

      <div style={shell}>
        {/* Header */}
        <div
          style={{
            padding: compact ? "16px 20px 14px" : "20px 24px 18px",
            borderBottom: `1px solid ${isDarkMode ? "#242830" : "#edf0f5"}`,
            background: isDarkMode ? "#1a1d24" : "#f9fafb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: compact ? 18 : 22,
                  lineHeight: 1.15,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  color: isDarkMode ? "#f1f5f9" : "#0f172a",
                  wordBreak: "break-word",
                }}
              >
                {title || "Summary"}
              </div>
              {subtitle && (
                <div
                  style={{
                    marginTop: 5,
                    fontSize: compact ? 12 : 13,
                    color: isDarkMode ? "#6b7280" : "#94a3b8",
                    lineHeight: 1.4,
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>

            {chipContent ? (
              chipContent
            ) : chipLabel ? (
              <Tag
                color={chipColors[chipTone] || "blue"}
                style={{
                  borderRadius: 999,
                  paddingInline: 12,
                  paddingBlock: 4,
                  fontSize: compact ? 11 : 12,
                  fontWeight: 600,
                  marginInlineEnd: 0,
                  flexShrink: 0,
                }}
              >
                {chipLabel}
              </Tag>
            ) : null}
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: compact ? "12px 20px 20px" : "14px 24px 24px",
            overflowY: sticky ? "auto" : "visible",
            maxHeight: sticky ? "calc(100vh - 140px)" : "none",
          }}
        >
          {sections.map((section, index) => (
            <Section
              key={`${section?.title || "section"}-${index}`}
              section={section}
              index={index}
              isDarkMode={isDarkMode}
              compact={compact}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BreakdownSummaryCard;
