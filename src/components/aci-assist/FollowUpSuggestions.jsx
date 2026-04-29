import React from "react";
import { CornerDownRight } from "lucide-react";
import { asArray } from "./utils";

export default function FollowUpSuggestions({ suggestions, onSelect, title = "Follow-ups" }) {
  const items = asArray(suggestions).map((item) => (typeof item === "string" ? item : item.label || item.message || item.text)).filter(Boolean);
  if (!items.length) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500">
        <CornerDownRight size={13} />
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect?.(suggestion)}
            className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-100"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
