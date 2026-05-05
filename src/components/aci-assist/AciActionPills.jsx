import React from "react";
import { asArray } from "./utils";

const normalizeAction = (item = {}) => ({
  label: item.label || item.text || item.title || item.query || item.message,
  type: item.type || item.action || item.kind || "ask",
  query: item.query || item.message || item.followUpQuery,
  canvasType: item.canvasType,
  leadType: item.leadType,
  route: item.route,
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
          className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1.5 text-xs font-bold text-[#1d4ed8] transition hover:border-[#93c5fd] hover:bg-[#dbeafe]"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
