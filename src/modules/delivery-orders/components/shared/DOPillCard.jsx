import React from "react";

const DOPillCard = ({
  isDarkMode = false,
  label = "",
  value = "",
  accent = "blue",
  minWidth = 190,
  compact = false,
}) => {
  const accents = {
    blue: {
      border: isDarkMode ? "rgba(96,165,250,0.32)" : "rgba(59,130,246,0.24)",
      bg: isDarkMode
        ? "linear-gradient(135deg, rgba(29,78,216,0.18) 0%, rgba(15,23,42,0.28) 100%)"
        : "linear-gradient(135deg, rgba(219,234,254,0.92) 0%, rgba(255,255,255,0.98) 100%)",
      glow: isDarkMode ? "rgba(59,130,246,0.22)" : "rgba(59,130,246,0.10)",
      text: isDarkMode ? "#dbeafe" : "#1d4ed8",
    },
    emerald: {
      border: isDarkMode ? "rgba(52,211,153,0.32)" : "rgba(16,185,129,0.24)",
      bg: isDarkMode
        ? "linear-gradient(135deg, rgba(5,150,105,0.18) 0%, rgba(15,23,42,0.28) 100%)"
        : "linear-gradient(135deg, rgba(209,250,229,0.92) 0%, rgba(255,255,255,0.98) 100%)",
      glow: isDarkMode ? "rgba(16,185,129,0.22)" : "rgba(16,185,129,0.10)",
      text: isDarkMode ? "#d1fae5" : "#047857",
    },
    violet: {
      border: isDarkMode ? "rgba(167,139,250,0.32)" : "rgba(124,58,237,0.20)",
      bg: isDarkMode
        ? "linear-gradient(135deg, rgba(91,33,182,0.20) 0%, rgba(15,23,42,0.28) 100%)"
        : "linear-gradient(135deg, rgba(237,233,254,0.94) 0%, rgba(255,255,255,0.98) 100%)",
      glow: isDarkMode ? "rgba(124,58,237,0.24)" : "rgba(124,58,237,0.10)",
      text: isDarkMode ? "#ede9fe" : "#6d28d9",
    },
  };

  const theme = accents[accent] || accents.blue;

  return (
    <div
      style={{
        minWidth,
        borderRadius: 22,
        padding: compact ? "10px 14px" : "12px 16px",
        border: `1px solid ${theme.border}`,
        background: theme.bg,
        boxShadow: `0 16px 34px ${theme.glow}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isDarkMode
            ? "radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent 34%)"
            : "radial-gradient(circle at top right, rgba(255,255,255,0.9), transparent 34%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: isDarkMode ? "#9ca3af" : "#64748b",
          marginBottom: 4,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: "relative",
          fontSize: compact ? 15 : 18,
          fontWeight: 800,
          color: theme.text,
          lineHeight: 1.15,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
};

export default DOPillCard;
