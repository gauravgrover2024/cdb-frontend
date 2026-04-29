import React from "react";
import WidgetFrame from "./WidgetFrame";
import { asArray, formatCurrency, pick } from "./utils";

const Field = ({ label, value }) =>
  value ? (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  ) : null;

export default function LoanClosureCardInline({ widget = {}, onAction }) {
  const item = widget.case || widget.record || widget.data || widget;
  const breakdown = asArray(item.breakdown || item.calculationBreakdown || widget.breakdown);
  const missing = asArray(item.missingFields || widget.missingFields);
  return (
    <WidgetFrame
      title={widget.title || "Loan closure estimate"}
      subtitle={pick(item, ["loanBank", "bank", "status"], "Approximate closure")}
      actions={widget.actions || item.actions}
      onAction={onAction}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Customer" value={pick(item, ["customer", "customerName", "name"])} />
        <Field label="Vehicle" value={pick(item, ["vehicle", "vehicleName", "model"])} />
        <Field label="Registration" value={pick(item, ["registrationNumber", "registration", "regNo"])} />
        <Field label="Loan bank" value={pick(item, ["loanBank", "bank", "financer"])} />
        <Field label="Loan status" value={pick(item, ["loanStatus", "status"])} />
        <Field label="Approx closure" value={formatCurrency(pick(item, ["approxClosure", "closureAmount", "estimatedClosure"]))} />
      </div>
      {breakdown.length ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Calculation breakdown</p>
          <div className="mt-2 space-y-1">
            {breakdown.map((row, index) => (
              <div key={index} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-600">{pick(row, ["label", "name", "description"], `Line ${index + 1}`)}</span>
                <span className="font-black text-slate-900">{formatCurrency(pick(row, ["value", "amount"], ""))}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {missing.length ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Missing fields: {missing.join(", ")}
        </div>
      ) : null}
    </WidgetFrame>
  );
}
