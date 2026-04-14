import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "../../../components/AppIcon";
import ModuleFrame from "../../../components/ui/ModuleFrame";
import UsedCarBackgroundCheckDesk from "./BackgroundCheckDesk";
import DocumentationDesk from "./DocumentationDesk";
import UsedCarLeadIntakeDesk from "./UsedCarLeadIntakeDesk";
import UsedCarInspectionDesk from "./UsedCarInspectionDesk";
import UsedCarNegotiationDesk from "./NegotiationDesk";
import ProcurementLogisticsDesk from "./ProcurementLogisticsDesk";
import UsedCarStockDesk from "./StockDesk";

const STAGES = [
  {
    key: "lead-intake",
    label: "Lead Intake",
    description:
      "Capture seller leads, manage calls, assign queues, and move inspection-ready cars ahead.",
    path: "/used-cars",
    icon: "PhoneCall",
  },
  {
    key: "inspection",
    label: "Inspection",
    description:
      "Run field inspections, capture detailed findings, and generate evaluator-ready reports.",
    path: "/used-cars/inspection",
    icon: "ClipboardCheck",
  },
  {
    key: "background-check",
    label: "Background Check",
    description:
      "Run comprehensive Vahan and service history background checks for inspection-cleared cars.",
    path: "/used-cars/background-check",
    icon: "ShieldCheck",
  },
  {
    key: "negotiation",
    label: "Negotiation",
    description:
      "Capture vendor quotations, identify best offers, and bridge the gap with customer expectations.",
    path: "/used-cars/negotiation",
    icon: "Gavel",
  },
  {
    key: "documentation",
    label: "Documentation",
    description:
      "Verify vehicle category, ownership, hypothecation, and KYC documents.",
    path: "/used-cars/documentation",
    icon: "FileSearch",
  },
  {
    key: "procurement",
    label: "Procurement & Logistics",
    description:
      "Vehicle pickup, document collection, driver assignment, and yard onboarding.",
    path: "/used-cars/procurement",
    icon: "Truck",
  },
  {
    key: "stock",
    label: "Sales & Stock",
    description:
      "Manage yard inventory, track refurbishment costs, and set active selling prices.",
    path: "/used-cars/stock",
    icon: "Store",
  },
];

function StageTab({ item, active, index, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-w-0 flex-col gap-1 rounded-[18px] border px-3.5 py-3 text-left transition-all duration-200 ${
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-700 dark:bg-black dark:text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
            active
              ? "bg-white/15 dark:bg-white/10"
              : "bg-slate-100 dark:bg-white/10"
          }`}
        >
          <Icon name={item.icon} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold tracking-tight">
              {item.label}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${
                active
                  ? "bg-white/15 text-white dark:bg-white/10 dark:text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
              }`}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
      <p
        className={`line-clamp-2 text-[10px] font-medium leading-4 ${
          active
            ? "text-white/75 dark:text-white/70"
            : "text-slate-500 dark:text-slate-400"
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
  const currentStage = STAGES.find((item) => item.key === stage) || STAGES[0];

  return (
    <ModuleFrame>
      <div className="space-y-4 md:space-y-5 xl:space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white dark:border-white/10 dark:bg-black">
          <div className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.08),_transparent_34%)] px-4 py-4 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.05),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.10),_transparent_28%)] md:px-5 md:py-4 xl:px-6 xl:py-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  Used Cars Operations
                </div>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white md:text-[28px] xl:text-[32px]">
                  Build The Used-Car Journey
                </h2>
                <p className="mt-1.5 max-w-2xl text-[13px] font-medium leading-5 text-slate-600 dark:text-slate-300 md:text-sm">
                  One compact operating shell for intake, inspection, checks,
                  negotiation, documentation, pickup, and stock handoff.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[360px] xl:max-w-[420px] xl:flex-none">
                <div className="rounded-[18px] border border-slate-200 bg-white/85 px-3.5 py-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Current desk
                  </p>
                  <p className="mt-1.5 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {currentStage.label}
                  </p>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-white/85 px-3.5 py-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Working style
                  </p>
                  <p className="mt-1.5 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Fast ops, clean handoffs, no clutter.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 md:px-5 xl:px-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Journey Stages
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  The full used-car workflow stays visible here without horizontal
                  scrolling.
                </p>
              </div>
              <span className="hidden rounded-full border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:text-slate-400 xl:inline-flex">
                {STAGES.length} live desks
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
              {STAGES.map((item, index) => {
                const isLeadIntakeActive =
                  item.key === "lead-intake" &&
                  (location.pathname === "/used-cars" ||
                    location.pathname === "/used-cars/");

                return (
                  <StageTab
                    key={item.key}
                    item={item}
                    index={index}
                    active={location.pathname === item.path || isLeadIntakeActive}
                    onClick={() => navigate(item.path)}
                  />
                );
              })}
            </div>
          </div>
        </section>

        <section>
          {stage === "inspection" ? (
            <UsedCarInspectionDesk />
          ) : stage === "background-check" ? (
            <UsedCarBackgroundCheckDesk />
          ) : stage === "negotiation" ? (
            <UsedCarNegotiationDesk />
          ) : stage === "documentation" ? (
            <DocumentationDesk />
          ) : stage === "procurement" ? (
            <ProcurementLogisticsDesk />
          ) : stage === "stock" ? (
            <UsedCarStockDesk />
          ) : (
            <UsedCarLeadIntakeDesk />
          )}
        </section>
      </div>
    </ModuleFrame>
  );
}
