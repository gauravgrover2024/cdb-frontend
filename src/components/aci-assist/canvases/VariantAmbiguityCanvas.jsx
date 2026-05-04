import React from "react";
import { motion } from "framer-motion";
import { Layers3 } from "lucide-react";
import { formatCurrency, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";

export function VariantAmbiguityCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const options = asArray(data.options || widget?.options);
  const title = data.title || "Which variant do you mean?";
  const model = data.model || message?.entities?.model || "";

  return (
    <ModernCanvasShell title={title} subtitle="Multiple variants matched — select one to continue" icon={Layers3} footer={footer}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((opt, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl border border-slate-200/40 bg-white/70 p-4 backdrop-blur-sm cursor-pointer hover:border-violet-300 transition-all"
            onClick={() => onAction?.({ type: "ask", message: opt.followUpQuery || `${opt.model} ${opt.variant} pricelist` })}
          >
            <p className="font-black text-slate-900 mb-1 truncate">{opt.variant}</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {opt.fuelType && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{opt.fuelType}</span>}
              {opt.transmission && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">{opt.transmission}</span>}
            </div>
            <p className="text-sm font-bold text-emerald-700">{formatCurrency(opt.onRoad || opt.exShowroom)}</p>
            <p className="text-xs text-slate-500">{opt.city || "Delhi"}</p>
          </motion.div>
        ))}
      </div>
      {data.compareAllOption && options.length > 1 && (
        <button
          className="mt-2 px-5 py-2 rounded-xl border border-violet-300 text-violet-700 text-sm font-bold hover:bg-violet-50 transition"
          onClick={() => onAction?.({ type: "ask", message: `Compare ${model} variants` })}
        >
          Compare all {options.length} variants
        </button>
      )}
    </ModernCanvasShell>
  );
}
