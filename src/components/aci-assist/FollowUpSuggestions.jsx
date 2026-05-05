import React from "react";
import {
  ArrowRight,
  Calculator,
  CarFront,
  CornerDownRight,
  FileText,
  HelpCircle,
  Palette,
  Phone,
  Scale,
  Sparkles,
  Tag,
} from "lucide-react";
import { asArray } from "./utils";
import { compactText } from "./canvas-utils";

export default function FollowUpSuggestions({ suggestions, onSelect, title = "Follow-ups" }) {
  const iconByKey = {
    calculator: Calculator,
    car: CarFront,
    "file-text": FileText,
    phone: Phone,
    palette: Palette,
    scale: Scale,
    tag: Tag,
    help: HelpCircle,
    sparkles: Sparkles,
  };
  const items = asArray(suggestions)
    .map((item) =>
      typeof item === "string"
        ? {
            title: item,
            query: item,
            kind: "question",
            type: "ask",
            icon: "sparkles",
          }
        : item,
    )
    .map((item) => ({
      ...item,
      title: item.title || item.label || item.message || item.query || item.text,
      query: item.query || item.message || item.title || item.label || item.text,
      subtitle: item.subtitle || "",
      icon: item.icon || "sparkles",
      tone: item.tone || "neutral",
    }))
    .filter((item) => item?.title && item?.query)
    .slice(0, 5);
  if (!items.length) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-600">
        <CornerDownRight size={13} />
        {title}
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((suggestion) => {
          const Icon = iconByKey[suggestion.icon] || Sparkles;
          const safeLabel = compactText(suggestion.title);
          const safeSubtitle = compactText(suggestion.subtitle);
          const toneClass =
            suggestion.tone === "primary"
              ? "border-blue-300 bg-blue-50 text-blue-800 hover:border-blue-400 hover:bg-blue-100"
              : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50";

          return (
            <button
              key={suggestion.id || `${safeLabel}-${suggestion.query}`}
              type="button"
              onClick={() => onSelect?.(suggestion)}
              className={`group rounded-2xl border px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 ${toneClass}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-blue-700 ring-1 ring-blue-100">
                  <Icon size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold">{safeLabel}</span>
                  {safeSubtitle ? (
                    <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                      {safeSubtitle}
                    </span>
                  ) : null}
                </span>
                <ArrowRight
                  size={14}
                  className="mt-1 shrink-0 text-slate-400 transition group-hover:text-blue-600"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
