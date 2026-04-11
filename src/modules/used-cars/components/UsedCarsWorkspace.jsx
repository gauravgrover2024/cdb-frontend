import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ModuleFrame from "../../../components/ui/ModuleFrame";
import Icon from "../../../components/AppIcon";
import UsedCarLeadIntakeDesk from "./UsedCarLeadIntakeDesk";
import UsedCarInspectionDesk from "./UsedCarInspectionDesk";

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

function StageTab({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-w-[168px] flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-950"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
            active ? "bg-white/15 dark:bg-slate-200/70" : "bg-slate-100 dark:bg-white/10"
          }`}
        >
          <Icon name={item.icon} size={16} />
        </span>
        <span className="text-sm font-bold tracking-tight">{item.label}</span>
      </div>
      <p
        className={`line-clamp-2 text-[11px] font-medium ${
          active ? "text-white/75 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"
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
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0e1014]">
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
                  We’ve intentionally reduced this module to the two live operating surfaces we’re building together right now:
                  lead intake and inspection. Everything else has been taken out of the active flow so the team works from one
                  clear source of truth.
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

          <div className="overflow-x-auto px-4 py-4 md:px-5 xl:px-6">
            <div className="flex min-w-max gap-3">
              {STAGES.map((item) => (
                <StageTab
                  key={item.key}
                  item={item}
                  active={location.pathname === item.path || (item.key === "lead-intake" && location.pathname === "/used-cars/procurement")}
                  onClick={() => navigate(item.path)}
                />
              ))}
            </div>
          </div>
        </section>

        <section>
          {stage === "inspection" ? <UsedCarInspectionDesk /> : <UsedCarLeadIntakeDesk />}
        </section>
      </div>
    </ModuleFrame>
  );
}
