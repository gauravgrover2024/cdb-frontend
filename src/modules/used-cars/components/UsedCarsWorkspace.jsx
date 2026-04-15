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
    accent: "from-sky-500 to-cyan-500",
    glow: "shadow-[0_12px_30px_rgba(14,165,233,0.22)]",
  },
  {
    key: "inspection",
    label: "Inspection",
    description:
      "Run field inspections, capture detailed findings, and generate evaluator-ready reports.",
    path: "/used-cars/inspection",
    icon: "ClipboardCheck",
    accent: "from-emerald-500 to-teal-500",
    glow: "shadow-[0_12px_30px_rgba(16,185,129,0.20)]",
  },
  {
    key: "background-check",
    label: "Background Check",
    description:
      "Run comprehensive Vahan and service history background checks for inspection-cleared cars.",
    path: "/used-cars/background-check",
    icon: "ShieldCheck",
    accent: "from-violet-500 to-fuchsia-500",
    glow: "shadow-[0_12px_30px_rgba(139,92,246,0.18)]",
  },
  {
    key: "negotiation",
    label: "Negotiation",
    description:
      "Capture vendor quotations, identify best offers, and bridge the gap with customer expectations.",
    path: "/used-cars/negotiation",
    icon: "Gavel",
    accent: "from-amber-500 to-orange-500",
    glow: "shadow-[0_12px_30px_rgba(245,158,11,0.18)]",
  },
  {
    key: "documentation",
    label: "Documentation",
    description:
      "Verify vehicle category, ownership, hypothecation, and KYC documents.",
    path: "/used-cars/documentation",
    icon: "FileSearch",
    accent: "from-rose-500 to-pink-500",
    glow: "shadow-[0_12px_30px_rgba(244,63,94,0.18)]",
  },
  {
    key: "procurement",
    label: "Procurement & Logistics",
    description:
      "Vehicle pickup, document collection, driver assignment, and yard onboarding.",
    path: "/used-cars/procurement",
    icon: "Truck",
    accent: "from-indigo-500 to-blue-500",
    glow: "shadow-[0_12px_30px_rgba(99,102,241,0.18)]",
  },
  {
    key: "stock",
    label: "Sales & Stock",
    description:
      "Manage yard inventory, track refurbishment costs, and set active selling prices.",
    path: "/used-cars/stock",
    icon: "Store",
    accent: "from-slate-600 to-slate-800",
    glow: "shadow-[0_12px_30px_rgba(51,65,85,0.20)]",
  },
];

function StageTab({ item, active, onClick, showConnector }) {
  return (
    <div className="relative flex min-w-[168px] flex-1 items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        title={item.description}
        className={`group relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-[22px] border px-3 py-2.5 text-left transition-all duration-200 ${
          active
            ? `border-transparent bg-gradient-to-r ${item.accent} text-white ${item.glow} dark:text-white`
            : "border-slate-200/90 bg-white/80 text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
        }`}
      >
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border ${
            active
              ? "border-white/25 bg-white/15 text-white"
              : "border-slate-200 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
          }`}
        >
          <Icon name={item.icon} size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[12px] font-black tracking-tight">
              {item.label}
            </span>
          </div>
        </div>
      </button>
      {showConnector ? (
        <div className="hidden xl:flex xl:w-7 xl:items-center">
          <div className="h-[2px] w-full rounded-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-white/10 dark:via-white/20 dark:to-white/10" />
        </div>
      ) : null}
    </div>
  );
}

export default function UsedCarsWorkspace({ stage = "lead-intake" }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <ModuleFrame>
      <div className="space-y-3 md:space-y-4 xl:space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(5,8,15,1),rgba(2,6,23,0.96))]">
          <div className="px-4 py-3 md:px-5 xl:px-6">
            <div className="rounded-[24px] border border-slate-200/90 bg-white/75 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
              <div className="flex flex-nowrap items-stretch gap-0 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {STAGES.map((item, index) => {
                  const isLeadIntakeActive =
                    item.key === "lead-intake" &&
                    (location.pathname === "/used-cars" ||
                      location.pathname === "/used-cars/");

                  return (
                    <StageTab
                      key={item.key}
                      item={item}
                      active={
                        location.pathname === item.path || isLeadIntakeActive
                      }
                      showConnector={index < STAGES.length - 1}
                      onClick={() => navigate(item.path)}
                    />
                  );
                })}
              </div>
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
