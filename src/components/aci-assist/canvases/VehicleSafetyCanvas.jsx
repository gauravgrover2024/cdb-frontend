import React from "react";
import { BadgeCheck, Check } from "lucide-react";
import { formatCurrency, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";

export function VehicleSafetyCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const rows = asArray(data.rows || data.records || widget?.rows);
  const title = widget?.title || "Safety Expert Recommendations";

  return (
    <ModernCanvasShell title={title} subtitle="Ranked by safety features and captured safety equipment" icon={BadgeCheck} footer={footer}>
      <div className="grid gap-4">
        {rows.map((r, i) => (
          <div key={i} className="rounded-2xl border border-emerald-200/50 bg-emerald-50/30 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">{r.brand} {r.model}</p>
                <h4 className="text-xl font-black text-slate-900">{r.variant}</h4>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 font-black text-xs">
                <BadgeCheck size={14} /> SAFETY PICK
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {asArray(r.keyFeatures || r.safetyFeatures).map((f, fi) => (
                <span key={fi} className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-emerald-100 text-[10px] font-bold text-slate-600">
                  <Check size={10} className="text-emerald-500" /> {f}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-emerald-100 pt-3">
              <p className="text-sm font-bold text-slate-700">{formatCurrency(r.onRoad || r.exShowroom)}</p>
              <button className="text-xs font-black text-emerald-700 uppercase tracking-widest" onClick={() => onAction?.({ type: "ask", message: `${r.model} ${r.variant} safety features` })}>
                View Safety Kit →
              </button>
            </div>
          </div>
        ))}
      </div>
    </ModernCanvasShell>
  );
}
