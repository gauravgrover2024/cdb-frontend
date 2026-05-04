import React from "react";
import { TrendingUp } from "lucide-react";
import { formatCurrency, formatDate, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";

export function PriceHistoryCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const rows = asArray(data.rows || widget?.rows);
  const summary = data.summary || {};
  const title = widget?.title || "Price History";

  return (
    <ModernCanvasShell title={title} subtitle="Historical price changes from stored data" icon={TrendingUp} footer={footer}>
      {summary.changeAmount !== undefined && (
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <div className="rounded-2xl border border-slate-200/40 bg-white/70 p-5 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Latest Price</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(summary.latestPrice)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/40 bg-white/70 p-5 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Last Change</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-black ${summary.changeAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {summary.changeAmount > 0 ? "+" : ""}{formatCurrency(summary.changeAmount)}
              </p>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${summary.changeAmount > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                {summary.changePercent?.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 px-4 py-3">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{formatDate(r.date).split(" ")[0]}</p>
              <p className="font-bold text-slate-900">{r.variant}</p>
              <p className="text-xs text-slate-500">{r.city}</p>
            </div>
            <div className="text-right">
              <p className="font-black text-slate-900">{formatCurrency(r.price)}</p>
              {r.changeAmount && (
                <p className={`text-[10px] font-bold ${r.changeAmount > 0 ? "text-red-500" : "text-emerald-500"}`}>
                  {r.changeAmount > 0 ? "▲" : "▼"} {formatCurrency(Math.abs(r.changeAmount))}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ModernCanvasShell>
  );
}
