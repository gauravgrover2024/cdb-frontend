import React from "react";
import { Boxes } from "lucide-react";
import WidgetFrame from "./WidgetFrame";
import { asArray, humanize, pick } from "./utils";

export default function ModuleBreakdownCard({ widget = {}, items, onAction }) {
  const rows = asArray(items || widget.modules || widget.data?.modules || widget.breakdown || widget.data?.breakdown);
  return (
    <WidgetFrame title={widget.title || "Module breakdown"} subtitle={widget.subtitle} actions={widget.actions} onAction={onAction}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.length ? rows.map((item, index) => (
          <div key={`${pick(item, ["module", "label", "name"], index)}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {humanize(pick(item, ["module", "label", "name"], "Module"))}
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {pick(item, ["count", "total", "value"], 0)}
                </p>
              </div>
              <span className="rounded-lg bg-white p-2 text-indigo-600 shadow-sm">
                <Boxes size={16} />
              </span>
            </div>
            {pick(item, ["description", "status", "note"], "") ? (
              <p className="mt-2 text-xs font-medium text-slate-500">{pick(item, ["description", "status", "note"], "")}</p>
            ) : null}
          </div>
        )) : (
          <div className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">No module breakdown available.</div>
        )}
      </div>
    </WidgetFrame>
  );
}
