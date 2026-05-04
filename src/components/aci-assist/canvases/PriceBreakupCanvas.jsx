import React from "react";
import { motion } from "framer-motion";
import { WalletCards } from "lucide-react";
import { formatCurrency, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";

export function PriceBreakupCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const rows = asArray(data.rows || data.records || widget?.rows);
  const row = rows[0] || {};
  const components = asArray(data.components || row.components || []);
  const totals = data.totals || row.totals || {};
  const model = data.model || row.model || message?.entities?.model || "Vehicle";
  const variant = data.variant || row.variant || "";
  const city = data.city || row.city || "Delhi";
  const brand = data.brand || row.brand || "";

  const fmtVal = (v) => (v > 0 ? formatCurrency(v) : <span className="text-slate-400 text-xs">Not captured</span>);

  return (
    <ModernCanvasShell
      title={`${[brand, model, variant].filter(Boolean).join(" ")} — Price Breakup`}
      subtitle={`On-road cost breakdown · ${city}`}
      icon={WalletCards}
      footer={footer}
    >
      <div className="space-y-3">
        {components.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between rounded-2xl border border-slate-200/40 bg-white/60 px-5 py-4 backdrop-blur-sm"
          >
            <span className="font-semibold text-slate-700">{c.label}</span>
            <span className="font-bold text-slate-900">{fmtVal(c.value)}</span>
          </motion.div>
        ))}
        {(totals.onRoadWithoutAccessories > 0 || totals.onRoadWithAccessories > 0) && (
          <div className="mt-4 rounded-2xl border-2 border-emerald-400/40 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-5">
            {totals.onRoadWithoutAccessories > 0 && (
              <div className="flex justify-between mb-2">
                <span className="font-semibold text-slate-600">On-road (without accessories)</span>
                <span className="font-bold text-slate-800">{formatCurrency(totals.onRoadWithoutAccessories)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-black text-lg text-emerald-800">Total On-road</span>
              <span className="font-black text-xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                {formatCurrency(totals.onRoadWithAccessories || totals.onRoadWithoutAccessories)}
              </span>
            </div>
          </div>
        )}
      </div>
      {asArray(widget?.notices).map((n, i) => (
        <p key={i} className="text-xs text-slate-500 mt-2">{n}</p>
      ))}
    </ModernCanvasShell>
  );
}
