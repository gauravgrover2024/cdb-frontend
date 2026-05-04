import React from "react";
import { Sparkles, Zap, CheckCircle2 } from "lucide-react";
import { formatCurrency, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";

export function VehicleVariantRecommendationCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const top = data.topRecommendation || {};
  const rows = asArray(data.rows);
  const title = widget?.title || `Best ${data.model || "Vehicle"} Variant`;

  return (
    <ModernCanvasShell title={title} subtitle="Value-for-money recommendation based on feature spread" icon={Sparkles} footer={footer}>
      {top.variant && (
        <div className="rounded-3xl border-2 border-violet-400 bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white mb-8 shadow-xl shadow-violet-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Zap size={16} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Expert Recommendation</span>
          </div>
          <h3 className="text-3xl font-black mb-1">{top.variant}</h3>
          <p className="text-violet-100 font-bold mb-6">{top.brand} {top.model} · {formatCurrency(top.onRoad || top.exShowroom)}</p>
          
          <div className="space-y-2">
            {asArray(top.matchedReasons).map((reason, i) => (
              <div key={i} className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 size={16} className="text-emerald-400" /> {reason}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Other Considerations</p>
      <div className="space-y-3">
        {rows.filter(r => r.variant !== top.variant).slice(0, 5).map((r, i) => (
          <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-4 cursor-pointer hover:border-violet-200 transition-all" onClick={() => onAction?.({ type: "ask", message: `${r.model} ${r.variant} pricelist` })}>
            <div>
              <p className="font-bold text-slate-900">{r.variant}</p>
              <p className="text-xs text-slate-500">{r.fuelType} · {r.transmission}</p>
            </div>
            <p className="font-black text-slate-900">{formatCurrency(r.onRoad || r.exShowroom)}</p>
          </div>
        ))}
      </div>
    </ModernCanvasShell>
  );
}
