import React from "react";
import { motion } from "framer-motion";
import { Car } from "lucide-react";
import { formatCurrency, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";

export function SimilarCarsCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const rows = asArray(data.rows || data.records || widget?.rows);
  const base = data.base || data.data?.base || {};
  const title = widget?.title || `Similar cars to ${base.model || message?.entities?.model || "this car"}`;

  return (
    <ModernCanvasShell title={title} subtitle="Same segment · similar price band · matched from catalogue" icon={Car} footer={footer}>
      {base.model && (
        <div className="rounded-2xl border border-violet-200/40 bg-gradient-to-r from-violet-50 to-blue-50 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600 mb-1">Reference Model</p>
          <p className="font-black text-xl text-slate-900">{base.brand} {base.model}</p>
          <p className="text-sm text-slate-600">{base.bodyType} · {formatCurrency(base.priceRange?.min)} – {formatCurrency(base.priceRange?.max)}</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.slice(0, 12).map((r, i) => (
          <motion.div key={i} whileHover={{ scale: 1.02 }}
            className="rounded-2xl border border-slate-200/40 bg-white/70 p-5 cursor-pointer hover:border-violet-300 transition-all"
            onClick={() => onAction?.({ type: "ask", message: `${r.brand} ${r.model} pricelist` })}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-600 mb-1">{r.brand}</p>
                <h3 className="text-lg font-black text-slate-900">{r.model}</h3>
              </div>
              <span className="px-2 py-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{r.bodyType || "Car"}</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <div>
                <p className="text-xs text-slate-500">Price range</p>
                <p className="font-bold text-emerald-700">{formatCurrency(r.startingPrice)} – {formatCurrency(r.topPrice)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Variants</p>
                <p className="font-bold text-slate-800">{r.variantCount || "—"}</p>
              </div>
            </div>
            {r.matchedReason && <p className="text-xs text-violet-600 font-semibold">↳ {r.matchedReason}</p>}
            {r.reason && <p className="text-xs text-violet-600 font-semibold">↳ {r.reason}</p>}
          </motion.div>
        ))}
      </div>
    </ModernCanvasShell>
  );
}
