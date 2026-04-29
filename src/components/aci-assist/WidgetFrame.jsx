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
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
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
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.65)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_-38px_rgba(15,23,42,0.8)] ${className}`}>
      {(title || subtitle) && (
        <div className="mb-3">
          {title ? <h3 className="text-sm font-black text-slate-900">{title}</h3> : null}
          {subtitle ? <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p> : null}
        </div>
      )}
      {children}
      <InlineActions actions={actions} onAction={onAction} />
    </section>
  );
}

export { InlineActions };
