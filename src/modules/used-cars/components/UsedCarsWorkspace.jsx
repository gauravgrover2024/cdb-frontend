import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "../../../components/AppIcon";
import UsedCarLeadIntakeDesk from "./UsedCarLeadIntakeDesk";
import UsedCarInspectionDesk from "./UsedCarInspectionDesk";
import { useTheme } from "../../../context/ThemeContext";

const STAGES = [
  {
    key: "lead-intake",
    label: "Lead Intake",
    description: "Capture seller leads, manage calls, assign queues, and move inspection-ready cars ahead.",
    path: "/used-cars",
    icon: "PhoneCall",
  },
  {
    key: "inspection",
    label: "Inspection",
    description: "Run field inspections, capture detailed findings, and generate evaluator-ready reports.",
    path: "/used-cars/inspection",
    icon: "ClipboardCheck",
  },
];

export default function UsedCarsWorkspace({ stage = "lead-intake" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const currentStage = STAGES.find((s) => s.key === stage) || STAGES[0];
  const currentIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100vh - 4rem)",
        width: "100%",
        background: isDarkMode ? "#050c1a" : "#f1f5f9",
      }}
    >
      {/* ── Slim workspace header ── */}
      <div
        style={{
          width: "100%",
          background: isDarkMode ? "#0a1628" : "#ffffff",
          border: `1px solid ${isDarkMode ? "#1e3a5f" : "#e2e8f0"}`,
          borderRadius: 16,
          position: "sticky",
          top: 64,   /* below app header (xl:h-16 = 64px) */
          zIndex: 48,
          boxShadow: isDarkMode
            ? "0 2px 12px rgba(5,12,26,0.35)"
            : "0 1px 6px rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "10px 12px",
            flexWrap: "wrap",
          }}
        >
          {/* Left — icon + breadcrumb + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg,#2563eb,#7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="CarFront" size={16} style={{ color: "#fff" }} />
            </div>
            <div>
              <nav
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  color: isDarkMode ? "#64748b" : "#94a3b8",
                  lineHeight: 1,
                  marginBottom: 3,
                }}
              >
                <span>Inventory</span>
                <span style={{ opacity: 0.5 }}>/</span>
                <span style={{ color: isDarkMode ? "#cbd5e1" : "#475569" }}>Used Cars</span>
                <span style={{ opacity: 0.5 }}>/</span>
                <span style={{ color: isDarkMode ? "#93c5fd" : "#2563eb", fontWeight: 700 }}>
                  {currentStage.label}
                </span>
              </nav>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  color: isDarkMode ? "#f1f5f9" : "#0f172a",
                  lineHeight: 1,
                }}
              >
                Used Cars Procurement
              </p>
            </div>
          </div>

          {/* Right — live badge + stage switcher tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Live pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                borderRadius: 999,
                border: `1px solid ${isDarkMode ? "rgba(16,185,129,0.25)" : "#a7f3d0"}`,
                background: isDarkMode ? "rgba(16,185,129,0.08)" : "#f0fdf4",
                padding: "4px 10px",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 5px rgba(16,185,129,0.7)",
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: isDarkMode ? "#34d399" : "#059669",
                }}
              >
                Live
              </span>
            </div>

            {/* Stage tabs */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: isDarkMode ? "#050c1a" : "#f1f5f9",
                borderRadius: 12,
                padding: 3,
                border: `1px solid ${isDarkMode ? "#1e3a5f" : "#e2e8f0"}`,
              }}
            >
              {STAGES.map((item, i) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.key === "lead-intake" &&
                    location.pathname === "/used-cars/procurement");
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.path)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      borderRadius: 9,
                      border: "none",
                      background: isActive
                        ? "#2563eb"
                        : "transparent",
                      color: isActive
                        ? "#fff"
                        : isDarkMode
                        ? "#94a3b8"
                        : "#64748b",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      boxShadow: isActive ? "0 2px 8px rgba(37,99,235,0.30)" : "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Icon name={item.icon} size={13} />
                    <span>{item.label}</span>
                    {isActive && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          background: "rgba(255,255,255,0.20)",
                          borderRadius: 999,
                          padding: "1px 5px",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Step counter */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isDarkMode ? "#475569" : "#94a3b8",
                paddingLeft: 4,
              }}
            >
              {currentIndex + 1}/{STAGES.length}
            </div>
          </div>
        </div>
      </div>

      {/* ── Desk content — fills remaining screen ── */}
      <div style={{ flex: 1, width: "100%", overflow: "hidden", marginTop: 10 }}>
        {stage === "inspection" ? <UsedCarInspectionDesk /> : <UsedCarLeadIntakeDesk />}
      </div>
    </div>
  );
}
