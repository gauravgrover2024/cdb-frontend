import React from "react";
import { Layers3 } from "lucide-react";
import { formatCurrency, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";

export function VariantDifferenceCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const variants = asArray(data.variants);
  const diffs = asArray(data.featureDifferences);

  return (
    <ModernCanvasShell title="Variant Difference" subtitle="Highlighting what you get for the extra price" icon={Layers3} footer={footer}>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {variants.map((v, i) => (
          <div key={i} className={`rounded-2xl p-5 border ${i === 1 ? "border-violet-200 bg-violet-50/30" : "border-slate-200 bg-white"}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{i === 0 ? "Base" : "Upgrade"}</p>
            <h4 className="font-black text-slate-900 truncate">{v.variant}</h4>
            <p className="text-xs text-slate-500 mb-3">{v.brand} {v.model}</p>
            <p className="text-lg font-black text-slate-900">{formatCurrency(v.onRoad || v.exShowroom)}</p>
          </div>
        ))}
      </div>

      {data.priceDifference > 0 && (
        <div className="rounded-2xl bg-slate-900 p-4 text-center text-white mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Price Difference</p>
          <p className="text-xl font-black text-emerald-400">{formatCurrency(data.priceDifference)}</p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600 mb-4">Feature Differences</p>
          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-3 font-bold text-slate-500">Feature</th>
                  <th className="p-3 font-bold text-slate-500">{variants[0]?.variant}</th>
                  <th className="p-3 font-bold text-slate-500">{variants[1]?.variant}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {diffs.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/30">
                    <td className="p-3 font-medium text-slate-600">{d.feature}</td>
                    <td className="p-3 text-slate-400">{d.values[0]}</td>
                    <td className="p-3 font-black text-emerald-600">{d.values[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModernCanvasShell>
  );
}
