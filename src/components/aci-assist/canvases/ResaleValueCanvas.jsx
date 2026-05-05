import React from "react";
import {
  TrendingUp,
  History,
  ShieldCheck,
  CheckCircle2,
  Award,
  ChevronRight,
  Info,
} from "lucide-react";
import { formatAmount } from "../canvas-utils";
import { ModernCanvasShell } from "./BaseComponents";

export function ResaleValueCanvas({ message, widget, footer }) {
  const data = widget?.data || widget || {};
  const { model = "Vehicle", brand = "", retention3Year = 68 } = data;

  const titleModel = [brand, model].filter(Boolean).join(" ");

  return (
    <ModernCanvasShell
      title={`${titleModel} Resale`}
      subtitle="Projected value retention and market demand analysis."
      icon={TrendingUp}
      eyebrow="Value Expert"
      footer={footer}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[28px] border border-[#dbe3ef] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Award size={24} />
            </div>
            <h3 className="text-lg font-black text-[#0f172a]">Value Retention</h3>
          </div>
          <div className="mt-8">
            <p className="text-4xl font-black text-emerald-600">
              {retention3Year}%
            </p>
            <p className="mt-1 text-sm font-semibold text-[#64748b]">
              Retention after 3 years
            </p>
          </div>

          <div className="mt-10 space-y-6">
            <ValueMetric label="Market Demand" level="Very High" color="emerald" />
            <ValueMetric label="Brand Reliability" level="Strong" color="blue" />
            <ValueMetric label="Spare Parts Cost" level="Moderate" color="amber" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] bg-[#f8fafc] p-6 ring-1 ring-[#dbe3ef]">
            <h4 className="flex items-center gap-2 font-black text-[#0f172a]">
              <History size={18} className="text-[#2563eb]" />
              Depreciation Curve
            </h4>
            <div className="mt-6 space-y-4">
              <DepreciationRow year="Year 1" value="-15%" />
              <DepreciationRow year="Year 3" value="-32%" />
              <DepreciationRow year="Year 5" value="-48%" />
            </div>
          </div>

          <div className="rounded-[24px] bg-[#0f172a] p-6 text-white shadow-lg">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-blue-400">
                <Info size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black italic">Pro Tip</h4>
                <p className="mt-1 text-xs font-semibold leading-relaxed opacity-70">
                  White and Silver colors generally command 2-3% higher resale
                  value due to higher demand in the used car market.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernCanvasShell>
  );
}

function ValueMetric({ label, level, color }) {
  const colors = {
    emerald: "bg-emerald-500",
    blue: "bg-[#2563eb]",
    amber: "bg-amber-500",
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-black">
        <span className="text-[#64748b] uppercase tracking-wider">{label}</span>
        <span className={`text-${color}-600`}>{level}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#f1f5f9]">
        <div className={`h-full rounded-full ${colors[color]} w-[85%]`} />
      </div>
    </div>
  );
}

function DepreciationRow({ year, value }) {
  return (
    <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3 last:border-0 last:pb-0">
      <span className="text-sm font-semibold text-[#64748b]">{year}</span>
      <span className="text-sm font-black text-[#0f172a]">{value}</span>
    </div>
  );
}
