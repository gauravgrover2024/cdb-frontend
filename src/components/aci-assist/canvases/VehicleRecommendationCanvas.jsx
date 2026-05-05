import React from "react";
import { motion } from "framer-motion";
import { Sparkles, BadgeCheck } from "lucide-react";
import { formatCurrency, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";
import { compactText } from "../canvas-utils";

export function VehicleRecommendationCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const rows = asArray(data.rows || data.records || widget?.rows);
  const filters = data.filters || {};
  const title = widget?.title || "Recommended Vehicles";
  const city = data.city || "Delhi";

  return (
    <ModernCanvasShell title={title} subtitle={`Top matches in ${city} based on your requirements`} icon={Sparkles} footer={footer}>
      <div className="flex flex-wrap gap-2 mb-2">
        {filters.budgetMax && <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">Under {formatCurrency(filters.budgetMax)}</span>}
        {filters.bodyType && <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold uppercase">{filters.bodyType}</span>}
        {filters.fuelType && <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">{filters.fuelType}</span>}
        {filters.transmission && <span className="px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold">{filters.transmission}</span>}
      </div>

      <div className="grid gap-6">
        {rows.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group rounded-3xl border border-slate-200/40 bg-white/70 p-6 backdrop-blur-sm hover:border-violet-300 transition-all cursor-pointer"
            onClick={() => onAction?.({ type: "ask", message: `${r.model} ${r.variant || ""} pricelist`.trim() })}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">{compactText(r.brand)}</span>
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="text-xs font-bold text-slate-500 uppercase">{compactText(r.bodyType)}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-violet-700 transition-colors">{compactText(r.model)} <span className="text-base font-bold text-slate-500">{compactText(r.variant)}</span></h3>
                
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5"><BadgeCheck size={14} className="text-emerald-500" /> {compactText(r.fuelType)}</span>
                  <span className="flex items-center gap-1.5"><BadgeCheck size={14} className="text-emerald-500" /> {compactText(r.transmission)}</span>
                </div>
              </div>

              <div className="md:text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">On-road Price</p>
                <p className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{formatCurrency(r.onRoad || r.exShowroom)}</p>
                <div className="mt-2 flex flex-wrap md:justify-end gap-1.5">
                  {asArray(r.matchedReasons).map((reason, ri) => (
                    <span key={ri} className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-600 text-[10px] font-black uppercase">{compactText(reason)}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </ModernCanvasShell>
  );
}
