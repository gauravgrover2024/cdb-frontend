import React from "react";
import WidgetFrame from "./WidgetFrame";
import { asArray, formatCurrency, humanize, pick } from "./utils";

export default function ChartSummaryInline({ widget = {}, title, data, onAction }) {
  const points = asArray(data || widget.chartData || widget.data?.chartData || widget.data || widget.items);
  const max = Math.max(...points.map((item) => Number(pick(item, ["value", "count", "total", "amount"], 0))), 1);

  return (
    <WidgetFrame title={title || widget.title || "Breakdown"} subtitle={widget.subtitle} actions={widget.actions} onAction={onAction}>
      <div className="space-y-3">
        {points.length ? (
          points.map((item, index) => {
            const label = pick(item, ["label", "name", "module", "status", "category"], `Item ${index + 1}`);
            const value = Number(pick(item, ["value", "count", "total", "amount"], 0));
            const display = /amount|payout|premium|price/i.test(Object.keys(item || {}).join(" ")) ? formatCurrency(value) : value;
            return (
              <div key={`${label}-${index}`}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-700">{humanize(label)}</span>
                  <span className="font-black text-slate-900">{display}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${Math.max(5, Math.min(100, (value / max) * 100))}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">No chart data provided.</div>
        )}
      </div>
    </WidgetFrame>
  );
}
