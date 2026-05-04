import React from "react";
import { Layers3 } from "lucide-react";
import { formatCurrency, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";

export function VehicleComparisonCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const isModelComparison = widget?.type === "vehicle_model_comparison";
  const models = asArray(data.models);
  const variants = asArray(data.variants);
  const comparisonRows = asArray(data.comparisonRows);
  const title = widget?.title || (isModelComparison ? "Model Comparison" : "Variant Comparison");

  return (
    <ModernCanvasShell title={title} subtitle="Side-by-side comparison from stored catalogue" icon={Layers3} footer={footer}>
      {isModelComparison ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/40 bg-white/70 p-5 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-violet-600 mb-1">{m.brand}</p>
              <h3 className="text-xl font-black text-slate-900 mb-2">{m.model}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Price Range</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(m.startingPrice)} – {formatCurrency(m.topPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Variants</span>
                  <span className="font-bold text-slate-800">{m.variantCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Body Type</span>
                  <span className="font-bold text-slate-800">{m.bodyType}</span>
                </div>
              </div>
              <button
                className="mt-4 w-full py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                onClick={() => onAction?.({ type: "ask", message: `${m.brand} ${m.model} variants` })}
              >
                Select Variant
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/40 bg-white/70 backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400 min-w-[150px]">Feature</th>
                {variants.map((v, i) => (
                  <th key={i} className="p-4 min-w-[200px]">
                    <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">{v.brand}</p>
                    <p className="font-black text-slate-900">{v.model}</p>
                    <p className="text-xs text-slate-500">{v.variant}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {comparisonRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-sm font-bold text-slate-600">{row.label}</td>
                  {row.values.map((val, vi) => (
                    <td key={vi} className="p-4 text-sm font-black text-slate-900">
                      {typeof val === "number" ? formatCurrency(val) : val || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModernCanvasShell>
  );
}
