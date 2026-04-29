import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import WidgetFrame from "./WidgetFrame";
import { asArray, formatCurrency, formatDate, humanize, pick } from "./utils";

const DEFAULT_COLUMNS = ["customer", "vehicle", "registration", "status", "module", "lastActivity"];

const renderCell = (value, key) => {
  if (value && typeof value === "object" && (value.hidden || value.restricted)) return "Restricted";
  const resolved = value && typeof value === "object" && "value" in value ? value.value : value;
  if (resolved === undefined || resolved === null || resolved === "") return "—";
  if (/amount|price|premium|payout|emi/i.test(key)) return formatCurrency(resolved);
  if (/date|at|expiry|start/i.test(key)) return formatDate(resolved);
  if (Array.isArray(resolved)) return resolved.join(", ");
  if (typeof resolved === "object") return pick(resolved, ["name", "label", "title", "value"], "—");
  return String(resolved);
};

export default function RecordsTableInline({ widget = {}, title, records, columns, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const rows = asArray(records || widget.records || widget.rows || widget.data?.records || widget.data?.rows);
  const resolvedColumns = useMemo(() => {
    const incoming = asArray(columns || widget.columns || widget.data?.columns);
    if (incoming.length) {
      return incoming.map((col) =>
        typeof col === "string" ? { key: col, label: humanize(col) } : { key: col.key || col.field, label: col.label || humanize(col.key || col.field) },
      );
    }
    const keys = new Set(DEFAULT_COLUMNS);
    rows.slice(0, 5).forEach((row) => Object.keys(row || {}).slice(0, 8).forEach((key) => keys.add(key)));
    return Array.from(keys).slice(0, 8).map((key) => ({ key, label: humanize(key) }));
  }, [columns, rows, widget.columns, widget.data?.columns]);

  const visibleRows = expanded ? rows : rows.slice(0, 8);

  return (
    <WidgetFrame
      title={title || widget.title || "Records"}
      subtitle={widget.subtitle || `${rows.length} record${rows.length === 1 ? "" : "s"}`}
      actions={widget.actions}
      onAction={onAction}
    >
      {!rows.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
          No records were returned for this view.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="max-h-[520px] overflow-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  {resolvedColumns.map((column) => (
                    <th key={column.key} className="whitespace-nowrap px-3 py-2 font-black">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visibleRows.map((row, rowIndex) => (
                  <tr key={row.id || row._id || rowIndex} className="transition hover:bg-indigo-50/40">
                    {resolvedColumns.map((column) => (
                      <td key={column.key} className="max-w-[240px] truncate px-3 py-2 font-medium text-slate-700">
                        {renderCell(row?.[column.key], column.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 8 ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="flex w-full items-center justify-center gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? "Show fewer" : `Show all ${rows.length}`}
            </button>
          ) : null}
        </div>
      )}
    </WidgetFrame>
  );
}
