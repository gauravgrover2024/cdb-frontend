import React from "react";
import WidgetFrame from "./WidgetFrame";
import { asArray } from "./utils";

const colorToCss = (name = "") => {
  const value = String(name).toLowerCase();
  if (value.includes("white")) return "#f8fafc";
  if (value.includes("black")) return "#111827";
  if (value.includes("red")) return "#dc2626";
  if (value.includes("blue")) return "#2563eb";
  if (value.includes("green")) return "#16a34a";
  if (value.includes("silver")) return "#cbd5e1";
  if (value.includes("grey") || value.includes("gray")) return "#64748b";
  if (value.includes("brown")) return "#92400e";
  if (value.includes("gold")) return "#d97706";
  return "#e5e7eb";
};

export default function VehicleColorsInline({ widget = {}, onAction }) {
  const rows = asArray(widget.colors || widget.data?.colors || widget.rows || widget.records || widget.data?.rows);

  return (
    <WidgetFrame title={widget.title || "Vehicle colors"} subtitle={`${rows.length} color${rows.length === 1 ? "" : "s"}`} actions={widget.actions} onAction={onAction}>
      {!rows.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-600">
          No stored colors were returned.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row, index) => (
            <div key={`${row.colorName || row.name}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {row.imageUrl || row.image_url ? (
                <img
                  src={row.imageUrl || row.image_url}
                  alt={row.colorName || row.name || "Vehicle color"}
                  className="h-32 w-full bg-white object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="h-32 w-full" style={{ background: row.hex || colorToCss(row.colorName || row.name) }} />
              )}
              <div className="flex items-center gap-3 p-3">
                <span className="h-9 w-9 rounded-2xl border border-slate-300 shadow-inner" style={{ background: row.hex || colorToCss(row.colorName || row.name) }} />
                <div>
                  <p className="text-sm font-black text-slate-900">{row.colorName || row.name}</p>
                  {row.variant ? <p className="text-xs font-semibold text-slate-500">{row.variant}</p> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {asArray(widget.notices).map((notice) => (
        <p key={notice} className="mt-3 text-xs font-semibold text-slate-500">{notice}</p>
      ))}
    </WidgetFrame>
  );
}
