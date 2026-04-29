import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import WidgetFrame from "./WidgetFrame";
import { asArray, humanize } from "./utils";

const groupedFeatures = (features = {}) => {
  const groups = new Map();
  Object.entries(features || {}).forEach(([key, value]) => {
    const [groupName, featureName] = String(key).split("|").map((part) => part.trim());
    const group = featureName ? groupName : "Features";
    const label = featureName || groupName;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ label, value });
  });
  return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
};

export default function VehicleFeaturesInline({ widget = {}, onAction }) {
  const rows = asArray(widget.rows || widget.records || widget.data?.rows);
  const [openVariant, setOpenVariant] = useState(rows[0]?.id || rows[0]?.variant || "");

  return (
    <WidgetFrame title={widget.title || "Vehicle features"} subtitle={`${rows.length} variant${rows.length === 1 ? "" : "s"}`} actions={widget.actions} onAction={onAction}>
      <div className="space-y-3">
        {rows.map((row, index) => {
          const key = row.id || row.variant || index;
          const open = openVariant === key;
          const groups = groupedFeatures(row.features);
          return (
            <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setOpenVariant(open ? "" : key)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-black text-slate-900">{row.variant || row.model}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {[row.make, row.model, row.bodyType, row.seatingCapacity ? `${row.seatingCapacity} seats` : ""].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {open ? (
                <div className="border-t border-slate-200 p-4">
                  {groups.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {groups.slice(0, 8).map((group) => (
                        <div key={group.group} className="rounded-xl bg-white p-3 shadow-sm">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{humanize(group.group)}</p>
                          <div className="mt-2 space-y-1.5">
                            {group.items.slice(0, 10).map((item) => (
                              <div key={item.label} className="flex items-start justify-between gap-3 text-xs">
                                <span className="font-semibold text-slate-600">{item.label}</span>
                                <span className="text-right font-black text-slate-900">{String(item.value || "—")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-slate-500">No feature fields were stored for this variant.</p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {asArray(widget.notices).map((notice) => (
        <p key={notice} className="mt-3 text-xs font-semibold text-slate-500">{notice}</p>
      ))}
    </WidgetFrame>
  );
}
