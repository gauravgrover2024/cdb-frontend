import React from "react";

const ACCENTS = {
  slate: {
    light: {
      bg: "linear-gradient(145deg, #ffffff 0%, #f3f7fb 100%)",
      edge: "#dbe3ef",
      value: "#0f172a",
      label: "#475569",
      chip: "#e2e8f0",
      glow: "rgba(15,23,42,0.08)",
      line: "#94a3b8",
    },
    dark: {
      bg: "linear-gradient(145deg, #111a2a 0%, #0f1727 100%)",
      edge: "#263244",
      value: "#e5e7eb",
      label: "#94a3b8",
      chip: "#1e293b",
      glow: "rgba(0,0,0,0.32)",
      line: "#64748b",
    },
  },
  blue: {
    light: {
      bg: "linear-gradient(145deg, #f4f9ff 0%, #e9f2ff 100%)",
      edge: "#bfdbfe",
      value: "#1d4ed8",
      label: "#1e3a8a",
      chip: "#dbeafe",
      glow: "rgba(29,78,216,0.12)",
      line: "#60a5fa",
    },
    dark: {
      bg: "linear-gradient(145deg, #101f38 0%, #0e1a30 100%)",
      edge: "#1f3a66",
      value: "#93c5fd",
      label: "#93c5fd",
      chip: "#13243f",
      glow: "rgba(56,189,248,0.16)",
      line: "#3b82f6",
    },
  },
  green: {
    light: {
      bg: "linear-gradient(145deg, #f5fef8 0%, #e9f8ef 100%)",
      edge: "#bbf7d0",
      value: "#166534",
      label: "#166534",
      chip: "#dcfce7",
      glow: "rgba(22,163,74,0.11)",
      line: "#34d399",
    },
    dark: {
      bg: "linear-gradient(145deg, #10271a 0%, #0d2015 100%)",
      edge: "#1b4d35",
      value: "#86efac",
      label: "#86efac",
      chip: "#11261b",
      glow: "rgba(16,185,129,0.14)",
      line: "#22c55e",
    },
  },
  amber: {
    light: {
      bg: "linear-gradient(145deg, #fffaf3 0%, #fff1df 100%)",
      edge: "#fed7aa",
      value: "#c2410c",
      label: "#9a3412",
      chip: "#ffedd5",
      glow: "rgba(245,158,11,0.12)",
      line: "#f59e0b",
    },
    dark: {
      bg: "linear-gradient(145deg, #332212 0%, #281a0e 100%)",
      edge: "#5a3a1a",
      value: "#fbbf24",
      label: "#fcd34d",
      chip: "#33220f",
      glow: "rgba(251,191,36,0.14)",
      line: "#f59e0b",
    },
  },
};

const ICONS = {
  NetPayableToShowroom: "NP",
  NetReceivableFromShowroom: "RS",
  NetReceivableFromCustomer: "RC",
  VerifyQueue: "VQ",
};

const PaymentsMetricCard = ({
  id,
  label,
  value,
  subtitle,
  accent = "slate",
  dark = false,
  loading = false,
}) => {
  const palette = ACCENTS[accent] || ACCENTS.slate;
  const colors = dark ? palette.dark : palette.light;
  const iconText = ICONS[id] || "PM";

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 12,
        background: colors.bg,
        border: `1px solid ${colors.edge}`,
        padding: "10px 12px",
        minHeight: 82,
        width: "100%",
        boxShadow: dark
          ? `0 12px 24px ${colors.glow}`
          : `0 10px 22px ${colors.glow}`,
        transition: "transform 220ms ease, box-shadow 220ms ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 90% -20%, rgba(255,255,255,0.38), rgba(255,255,255,0) 44%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${colors.line} 38%, transparent 100%)`,
          opacity: 0.85,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 9,
              lineHeight: 1.2,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 800,
              color: colors.label,
              marginBottom: 6,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 22,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              fontWeight: 900,
              color: colors.value,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "—" : value}
          </div>
          {subtitle ? (
            <div
              style={{
                marginTop: 6,
                fontSize: 10,
                color: colors.label,
                opacity: 0.9,
                whiteSpace: "nowrap",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            flexShrink: 0,
            minWidth: 26,
            height: 26,
            borderRadius: 7,
            background: colors.chip,
            border: `1px solid ${colors.edge}`,
            color: colors.value,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.08em",
          }}
        >
          {iconText}
        </div>
      </div>
    </div>
  );
};

export default PaymentsMetricCard;
