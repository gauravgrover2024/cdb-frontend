import React from "react";
import { Tag } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

const asInt = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.trunc(parsed);
};

const hasNumericValue = (value) => asInt(value) > 0;

const formatMoney = (value) => `₹ ${asInt(value).toLocaleString("en-IN")}`;

const resolveTextColor = (intent, isDarkMode) => {
  if (intent === "addition") return isDarkMode ? "#86efac" : "#15803d";
  if (intent === "discount") return isDarkMode ? "#93c5fd" : "#1d4ed8";
  if (intent === "total") return isDarkMode ? "#5eead4" : "#0f766e";
  if (intent === "warning") return isDarkMode ? "#fcd34d" : "#b45309";
  return isDarkMode ? "#e5e7eb" : "#111827";
};

const chipColorMap = {
  blue: "blue",
  purple: "purple",
  green: "green",
  amber: "gold",
  slate: "default",
};

const BreakdownSummaryCard = ({
  isDarkMode = false,
  eyebrow = "",
  title = "",
  subtitle = "",
  chipLabel = "",
  chipTone = "blue",
  sections = [],
  sticky = false,
  compact = false,
}) => {
  const shellStyle = {
    position: sticky ? "sticky" : "relative",
    top: sticky ? 20 : "auto",
    zIndex: sticky ? 2 : "auto",
    borderRadius: 24,
    border: `1px solid ${isDarkMode ? "#2f3640" : "#dbe3ef"}`,
    background: isDarkMode
      ? "linear-gradient(180deg, rgba(30,34,40,0.98) 0%, rgba(20,22,27,0.98) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,249,253,0.98) 100%)",
    boxShadow: isDarkMode
      ? "0 24px 60px rgba(0,0,0,0.35)"
      : "0 24px 60px rgba(15,23,42,0.08)",
    overflow: "hidden",
    maxHeight: sticky ? "calc(100vh - 44px)" : "none",
  };

  const sectionDivider = `1px solid ${isDarkMode ? "#313844" : "#e7edf5"}`;

  return (
    <div>
      {eyebrow ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: isDarkMode ? "#cbd5e1" : "#5b6472",
          }}
        >
          <InfoCircleOutlined
            style={{ color: isDarkMode ? "#a78bfa" : "#7c3aed" }}
          />
          <span>{eyebrow}</span>
        </div>
      ) : null}

      <div style={shellStyle}>
        <div
          style={{
            padding: compact ? 20 : 24,
            background: isDarkMode
              ? "linear-gradient(135deg, rgba(82,100,255,0.08) 0%, rgba(34,197,94,0.04) 100%)"
              : "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(16,185,129,0.04) 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: compact ? 22 : 28,
                  lineHeight: 1.1,
                  fontWeight: 800,
                  color: isDarkMode ? "#f8fafc" : "#202938",
                  wordBreak: "break-word",
                }}
              >
                {title || "Summary"}
              </div>
              {subtitle ? (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: compact ? 15 : 18,
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                  }}
                >
                  {subtitle}
                </div>
              ) : null}
            </div>

            {chipLabel ? (
              <Tag
                color={chipColorMap[chipTone] || "blue"}
                style={{
                  borderRadius: 999,
                  paddingInline: 16,
                  paddingBlock: 8,
                  fontSize: compact ? 12 : 15,
                  fontWeight: 600,
                  marginInlineEnd: 0,
                }}
              >
                {chipLabel}
              </Tag>
            ) : null}
          </div>
        </div>

        <div
          style={{
            padding: compact ? "4px 20px 20px" : "6px 24px 24px",
            overflowY: sticky ? "auto" : "visible",
          }}
        >
          {sections.map((section, index) => {
            const rows = Array.isArray(section?.rows) ? section.rows : [];
            return (
              <div
                key={`${section?.title || "section"}-${index}`}
                style={{
                  borderTop: sectionDivider,
                  paddingTop: 18,
                  marginTop: index === 0 ? 0 : 8,
                }}
              >
                <div
                  style={{
                    marginBottom: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                  }}
                >
                  {section?.title}
                </div>

                {rows.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
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
                        : hasNumericValue(item.value) || Number(item.value) === 0
                          ? formatMoney(item.value)
                          : "—";

                      return (
                        <div
                          key={`${item.label || "row"}-${rowIndex}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 16,
                            fontSize: compact ? 13 : 14,
                            color: isDarkMode ? "#cbd5e1" : "#475569",
                          }}
                        >
                          <span>{item.label}</span>
                          <span
                            style={{
                              fontWeight: item.strong ? 800 : 700,
                              color: resolveTextColor(item.intent, isDarkMode),
                              whiteSpace: "nowrap",
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
                    style={{
                      fontSize: 13,
                      color: isDarkMode ? "#6b7280" : "#94a3b8",
                    }}
                  >
                    No values captured yet
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BreakdownSummaryCard;
