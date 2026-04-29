import React from "react";
import RecordsTableInline from "./RecordsTableInline";
import WidgetFrame from "./WidgetFrame";
import { asArray, pick } from "./utils";

export default function PriceHistoryReportInline({ widget = {}, onAction }) {
  const data = widget.data || widget;
  const variants = asArray(data.variants || data.records || widget.records);
  const columns = [
    { key: "make", label: "Make" },
    { key: "model", label: "Model" },
    { key: "variant", label: "Variant" },
    { key: "fuel", label: "Fuel" },
    { key: "transmission", label: "Transmission" },
    { key: "price", label: "Price" },
    { key: "createdAt", label: "Created" },
    { key: "updatedAt", label: "Updated" },
  ];
  return (
    <div className="space-y-3">
      <WidgetFrame title={widget.title || "Price history report"} subtitle={widget.subtitle} actions={widget.actions} onAction={onAction}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Variants added this month</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{pick(data, ["variantsAddedThisMonth", "addedThisMonth", "count"], variants.length)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-3 sm:col-span-2">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Scope</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{[pick(data, ["make"], ""), pick(data, ["model"], "")].filter(Boolean).join(" ") || "All returned variants"}</p>
          </div>
        </div>
        {data.inferred || data.priceHistoryInferred ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Price history is inferred from the available catalog timestamps.
          </div>
        ) : null}
      </WidgetFrame>
      <RecordsTableInline widget={{ title: "Variants" }} records={variants} columns={columns} onAction={onAction} />
    </div>
  );
}
