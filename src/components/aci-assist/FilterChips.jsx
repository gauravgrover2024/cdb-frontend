import React from "react";
import { X } from "lucide-react";
import { humanize, pick } from "./utils";

const normalizeFilters = (filters) => {
  if (Array.isArray(filters)) return filters;
  if (filters && typeof filters === "object") {
    return Object.entries(filters).map(([key, value]) => ({ key, label: humanize(key), value }));
  }
  return [];
};

export default function FilterChips({ intent, entities, filters, onRemove, onRerun }) {
  const chips = [];
  if (intent) chips.push({ key: "intent", label: "Intent", value: humanize(intent), locked: true });
  Object.entries(entities || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      chips.push({ key, label: humanize(key), value });
    }
  });
  normalizeFilters(filters).forEach((filter, index) => {
    chips.push({
      key: filter.key || filter.field || `filter-${index}`,
      label: filter.label || humanize(filter.key || filter.field || "Filter"),
      value: filter.value || filter.displayValue || filter.text,
    });
  });

  const seen = new Set();
  const uniqueChips = chips.filter((chip) => {
    const signature = `${String(chip.label || chip.key).toLowerCase()}:${String(chip.value).toLowerCase()}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });

  if (!uniqueChips.length) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {uniqueChips.map((chip, index) => (
        <span key={`${chip.key}-${index}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
          <span className="text-slate-600">{chip.label}:</span>
          {String(pick(chip, ["value"], "—"))}
          {!chip.locked && onRemove ? (
            <button type="button" onClick={() => onRemove(chip)} className="rounded-full p-0.5 text-slate-500 hover:bg-white hover:text-slate-900">
              <X size={12} />
            </button>
          ) : null}
        </span>
      ))}
      {onRerun ? (
        <button type="button" onClick={onRerun} className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700">
          Re-run
        </button>
      ) : null}
    </div>
  );
}

export { normalizeFilters };
