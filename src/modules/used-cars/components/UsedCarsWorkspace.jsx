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
    tone: "sky",
  },
  {
    key: "inspection",
    label: "Inspection",
    description:
      "Run field inspections, capture detailed findings, and generate evaluator-ready reports.",
    path: "/used-cars/inspection",
    icon: "ClipboardCheck",
    tone: "emerald",
  },
  {
    key: "background-check",
    label: "Background Check",
    description:
      "Run comprehensive Vahan and service history background checks for inspection-cleared cars.",
    path: "/used-cars/background-check",
    icon: "ShieldCheck",
    tone: "violet",
  },
  {
    key: "negotiation",
    label: "Negotiation",
    description:
      "Capture vendor quotations, identify best offers, and bridge the gap with customer expectations.",
    path: "/used-cars/negotiation",
    icon: "Gavel",
    tone: "amber",
  },
  {
    key: "documentation",
    label: "Documentation",
    description:
      "Verify vehicle category, ownership, hypothecation, and KYC documents.",
    path: "/used-cars/documentation",
    icon: "FileSearch",
    tone: "rose",
  },
  {
    key: "procurement",
    label: "Procurement & Logistics",
    description:
      "Vehicle pickup, document collection, driver assignment, and yard onboarding.",
    path: "/used-cars/procurement",
    icon: "Truck",
    tone: "indigo",
  },
  {
    key: "stock",
    label: "Sales & Stock",
    description:
      "Manage yard inventory, track refurbishment costs, and set active selling prices.",
    path: "/used-cars/stock",
    icon: "Store",
    tone: "slate",
  },
];

function StageTab({ item, active, onClick, showConnector }) {
  const toneClasses = {
    sky: {
      active: "border-sky-300 bg-sky-50 text-sky-800 shadow-[0_6px_20px_-16px_rgba(14,165,233,0.55)]",
      icon: "bg-sky-100 text-sky-700 border-sky-200",
      dot: "bg-sky-500",
    },
    emerald: {
      active:
        "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-[0_6px_20px_-16px_rgba(16,185,129,0.55)]",
      icon: "bg-emerald-100 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    },
    violet: {
      active:
        "border-violet-300 bg-violet-50 text-violet-800 shadow-[0_6px_20px_-16px_rgba(139,92,246,0.55)]",
      icon: "bg-violet-100 text-violet-700 border-violet-200",
      dot: "bg-violet-500",
    },
    amber: {
      active:
        "border-amber-300 bg-amber-50 text-amber-800 shadow-[0_6px_20px_-16px_rgba(245,158,11,0.55)]",
      icon: "bg-amber-100 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    },
    rose: {
      active:
        "border-rose-300 bg-rose-50 text-rose-800 shadow-[0_6px_20px_-16px_rgba(244,63,94,0.5)]",
      icon: "bg-rose-100 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    },
    indigo: {
      active:
        "border-indigo-300 bg-indigo-50 text-indigo-800 shadow-[0_6px_20px_-16px_rgba(99,102,241,0.5)]",
      icon: "bg-indigo-100 text-indigo-700 border-indigo-200",
      dot: "bg-indigo-500",
    },
    slate: {
      active:
        "border-slate-300 bg-slate-100 text-slate-800 shadow-[0_6px_20px_-16px_rgba(71,85,105,0.45)]",
      icon: "bg-slate-200 text-slate-700 border-slate-300",
      dot: "bg-slate-500",
    },
  };
  const tone = toneClasses[item.tone] || toneClasses.slate;

  return (
    <div className="relative flex min-w-[168px] flex-1 items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        title={item.description}
        className={`group relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ${
          active
            ? tone.active
            : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <span
          className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl transition-opacity ${active ? "opacity-100" : "opacity-0"} ${tone.dot}`}
        />
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border ${
            active
              ? tone.icon
              : "border-slate-200 bg-slate-100 text-slate-500"
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
          <div className="h-[2px] w-full rounded-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
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
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          <div className="px-4 py-3 md:px-5 xl:px-6">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
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
