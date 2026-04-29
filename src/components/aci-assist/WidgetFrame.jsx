import React from "react";
import { ArrowUpRight } from "lucide-react";
import { asArray, normalizeActionType } from "./utils";

const InlineActions = ({ actions, onAction }) => {
  const list = asArray(actions);
  if (!list.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {list.map((action, index) => (
        <button
          key={`${normalizeActionType(action)}-${action.label || index}`}
          type="button"
          onClick={() => onAction?.(action)}
          disabled={action.disabled}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {action.label || action.title || "Open"}
          <ArrowUpRight size={13} />
        </button>
      ))}
    </div>
  );
};

export default function WidgetFrame({ title, subtitle, children, actions, onAction, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.78)] ring-1 ring-slate-100 transition duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-[0_26px_60px_-40px_rgba(15,23,42,0.86)] ${className}`}>
      {(title || subtitle) && (
        <div className="mb-3">
          {title ? <h3 className="text-sm font-black text-slate-900">{title}</h3> : null}
          {subtitle ? <p className="mt-0.5 text-xs font-semibold text-slate-600">{subtitle}</p> : null}
        </div>
      )}
      {children}
      <InlineActions actions={actions} onAction={onAction} />
    </section>
  );
}

export { InlineActions };
