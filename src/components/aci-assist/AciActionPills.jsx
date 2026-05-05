import React from "react";
import { ArrowRight } from "lucide-react";
import { asArray } from "./utils";

const normalizeAction = (item = {}) => ({
  label: item.label || item.text || item.title || item.query || item.message,
  subtitle: item.subtitle || "",
  type: item.type || item.action || item.kind || "ask",
  query: item.query || item.message || item.followUpQuery,
  canvasType: item.canvasType,
  leadType: item.leadType,
  route: item.route,
  tone: item.tone || "neutral",
  raw: item,
});

export default function AciActionPills({
  actions = [],
  onAction,
  className = "",
}) {
  const list = asArray(actions)
    .map(normalizeAction)
    .filter((item) => item.label);

  if (!list.length) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {list.map((item, index) => (
        <button
          key={`${item.label}-${item.type}-${index}`}
          type="button"
          onClick={() => onAction?.(item.raw || item)}
          className={`group rounded-2xl border px-3 py-2 text-left text-xs font-bold transition ${
            item.tone === "primary"
              ? "border-[#93c5fd] bg-[#dbeafe] text-[#1e40af] hover:border-[#60a5fa] hover:bg-[#bfdbfe]"
              : "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8] hover:border-[#93c5fd] hover:bg-[#dbeafe]"
          }`}
        >
          <span className="flex items-center gap-2">
            <span>{item.label}</span>
            <ArrowRight
              size={12}
              className="text-blue-500 transition group-hover:translate-x-0.5"
            />
          </span>
          {item.subtitle ? (
            <span className="mt-0.5 block text-[10px] font-medium text-blue-700/80">
              {item.subtitle}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
