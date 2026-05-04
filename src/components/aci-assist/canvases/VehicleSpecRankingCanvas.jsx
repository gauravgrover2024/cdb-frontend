import React from "react";
import { motion } from "framer-motion";
import { Layers3 } from "lucide-react";
import { asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";

export function VehicleSpecRankingCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const rows = asArray(data.rows || data.records || widget?.rows);
  const title = widget?.title || "Vehicle Rankings";

  return (
    <ModernCanvasShell title={title} subtitle="Ranked by specific dimension or performance metrics" icon={Layers3} footer={footer}>
      <div className="space-y-4">
        {rows.map((r, i) => (
          <motion.div key={i} whileHover={{ scale: 1.01 }} className="flex items-center gap-4 rounded-2xl border border-slate-200/40 bg-white/70 p-4 backdrop-blur-sm cursor-pointer" onClick={() => onAction?.({ type: "ask", message: `${r.model} ${r.variant || ""} features`.trim() })}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white font-black">
              #{i + 1}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">{r.brand}</p>
              <h4 className="font-black text-slate-900">{r.model} <span className="text-sm font-bold text-slate-500">{r.variant}</span></h4>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">{r.featureKey || "Value"}</p>
              <p className="text-lg font-black text-violet-700">{r.featureValue}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </ModernCanvasShell>
  );
}
