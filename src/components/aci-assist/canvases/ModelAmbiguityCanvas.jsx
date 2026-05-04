import React from "react";
import { motion } from "framer-motion";
import { SearchCheck } from "lucide-react";
import { formatCurrency, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";

export function ModelAmbiguityCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const options = asArray(data.options || widget?.options);
  const title = data.title || "Which model do you mean?";

  return (
    <ModernCanvasShell title={title} subtitle="Multiple models matched — please select one" icon={SearchCheck} footer={footer}>
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((opt, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl border border-slate-200/40 bg-white/70 p-5 backdrop-blur-sm cursor-pointer hover:border-violet-300 transition-all"
            onClick={() => onAction?.({ type: "ask", message: opt.followUpQuery || `${opt.brand} ${opt.model} pricelist` })}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-600 mb-1">{opt.brand}</p>
                <h3 className="text-xl font-black text-slate-900">{opt.model}</h3>
              </div>
              <span className="px-2 py-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{opt.bodyType || "Car"}</span>
            </div>
            <div className="flex gap-4 text-sm mb-4">
              <div>
                <p className="text-xs text-slate-500">Starting</p>
                <p className="font-bold text-emerald-700">{formatCurrency(opt.startingPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Top</p>
                <p className="font-bold text-slate-800">{formatCurrency(opt.topPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Variants</p>
                <p className="font-bold text-slate-800">{opt.variantCount || "—"}</p>
              </div>
            </div>
            <button
              className="w-full py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-bold hover:opacity-90 transition"
              onClick={(e) => { e.stopPropagation(); onAction?.({ type: "ask", message: opt.followUpQuery || `${opt.brand} ${opt.model} pricelist` }); }}
            >
              Select →
            </button>
          </motion.div>
        ))}
      </div>
      {data.allowShowAll && (
        <button
          className="mt-2 px-5 py-2 rounded-xl border border-violet-300 text-violet-700 text-sm font-bold hover:bg-violet-50 transition"
          onClick={() => onAction?.({ type: "ask", message: `Show all ${message?.entities?.model || "models"}` })}
        >
          Show all models
        </button>
      )}
    </ModernCanvasShell>
  );
}
