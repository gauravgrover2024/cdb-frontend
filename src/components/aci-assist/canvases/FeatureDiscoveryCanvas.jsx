import React from "react";
import { motion } from "framer-motion";
import { SearchCheck } from "lucide-react";
import { formatCurrency, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";

export function FeatureDiscoveryCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const rows = asArray(data.rows || data.records || widget?.rows);
  const grouped = data.grouped || {};
  const filters = data.filters || {};
  const title = data.title || widget?.title || "Feature Search Results";

  const badge = (label, color) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{label}</span>
  );

  return (
    <ModernCanvasShell title={title} subtitle="Based on stored catalogue and feature data" icon={SearchCheck} footer={footer}>
      <div className="flex flex-wrap gap-2">
        {filters.feature && badge(filters.feature, "bg-violet-100 text-violet-700")}
        {filters.bodyType && badge(filters.bodyType, "bg-blue-100 text-blue-700")}
        {filters.budgetMax && badge(`Under ${formatCurrency(filters.budgetMax)}`, "bg-emerald-100 text-emerald-700")}
        {filters.fuelType && badge(filters.fuelType, "bg-amber-100 text-amber-700")}
      </div>

      {(grouped.yes?.length > 0 || grouped.no?.length > 0) && (
        <div className="space-y-4">
          {grouped.yes?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">✓ Has feature ({grouped.yes.length})</p>
              <div className="space-y-2">
                {grouped.yes.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200/40 px-4 py-3">
                    <div>
                      <p className="font-bold text-slate-900">{r.variant || r.model}</p>
                      <p className="text-xs text-slate-500">{r.featureKey}: <span className="font-semibold text-slate-700">{r.featureValue}</span></p>
                    </div>
                    <p className="font-bold text-emerald-700">{formatCurrency(r.onRoad || r.exShowroom)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {grouped.no?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">✗ No feature ({grouped.no.length})</p>
              <div className="space-y-2">
                {grouped.no.slice(0, 4).map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-red-50 border border-red-200/40 px-4 py-3">
                    <p className="font-semibold text-slate-700">{r.variant || r.model}</p>
                    <p className="text-sm text-slate-500">{formatCurrency(r.onRoad || r.exShowroom)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!grouped.yes && rows.length > 0 && (
        <div className="space-y-3">
          {rows.slice(0, 30).map((r, i) => (
            <motion.div key={i} whileHover={{ scale: 1.01 }}
              className="flex items-center justify-between rounded-2xl border border-slate-200/40 bg-white/70 px-4 py-4 backdrop-blur-sm cursor-pointer hover:border-violet-300 transition-all"
              onClick={() => onAction?.({ type: "ask", message: `${r.model} ${r.variant || ""} pricelist`.trim() })}
            >
              <div>
                <p className="font-bold text-slate-900">{r.brand} {r.model}</p>
                <p className="text-sm text-slate-600">{r.variant}</p>
                <p className="text-xs text-slate-500 mt-1">{r.featureKey}: <span className="font-semibold">{r.featureValue}</span></p>
              </div>
              <div className="text-right">
                <p className="font-black text-emerald-700">{formatCurrency(r.onRoad || r.exShowroom)}</p>
                {r.matchedReason && <p className="text-xs text-violet-600 mt-1">{r.matchedReason}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </ModernCanvasShell>
  );
}
