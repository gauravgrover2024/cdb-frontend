import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "../../../components/AppIcon";
import UsedCarLeadIntakeDesk from "./UsedCarLeadIntakeDesk";
import UsedCarInspectionDesk from "./UsedCarInspectionDesk";
import UsedCarBackgroundCheckDesk from "./BackgroundCheckDesk";
import UsedCarNegotiationDesk from "./NegotiationDesk";

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
  {
    key: "background-check",
    label: "Background Check",
    description: "Run comprehensive Vahan and service history background checks for inspection-cleared cars.",
    path: "/used-cars/background-check",
    icon: "ShieldCheck",
  },
  {
    key: "negotiation",
    label: "Negotiation",
    description: "Capture vendor quotations, identify best offers, and bridge the gap with customer expectations.",
    path: "/used-cars/negotiation",
    icon: "Gavel",
  },
];

function StageTab({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-w-[168px] flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-700 dark:bg-black dark:text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
            active ? "bg-white/15 dark:bg-white/10" : "bg-slate-100 dark:bg-white/10"
          }`}
        >
          <Icon name={item.icon} size={16} />
        </span>
        <span className="text-sm font-bold tracking-tight">{item.label}</span>
      </div>
      <p
        className={`line-clamp-2 text-[11px] font-medium ${
          active ? "text-white/75 dark:text-white/70" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {item.description}
      </p>
    </button>
  );
}

export default function UsedCarsWorkspace({ stage = "lead-intake" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const currentStage = STAGES.find((s) => s.key === stage) || STAGES[0];
  const currentIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <ModuleFrame>
      <div className="space-y-4 md:space-y-5 xl:space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white dark:border-white/10 dark:bg-black">
          <div className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.08),_transparent_34%)] px-4 py-5 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.05),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.10),_transparent_28%)] md:px-5 md:py-6 xl:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  Used Cars Procurement
                </div>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-[32px] xl:text-[38px]">
                  Build The Used-Car Journey One Strong Stage At A Time
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300 md:text-[15px]">
                  Take total control of the procurement lifecycle—from the first seller call to deep field inspection and
                  comprehensive background verification. One clear source of truth for every car.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[360px] xl:max-w-[420px] xl:flex-none">
                <div className="rounded-[22px] border border-slate-200 bg-white/85 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Current desk
                  </p>
                  <p className="mt-2 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {currentStage.label}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-white/85 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Working style
                  </p>
                  <p className="mt-2 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Focused operations, evaluator speed, and clean handoffs.
                  </p>
                </div>
              </div>
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

        <section>
          {stage === "negotiation" ? (
            <UsedCarNegotiationDesk />
          ) : stage === "background-check" ? (
            <UsedCarBackgroundCheckDesk />
          ) : stage === "inspection" ? (
            <UsedCarInspectionDesk />
          ) : (
            <UsedCarLeadIntakeDesk />
          )}
        </section>
      </div>
    </div>
  );
}
