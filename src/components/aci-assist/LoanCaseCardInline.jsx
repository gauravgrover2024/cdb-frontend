import React from "react";
import WidgetFrame from "./WidgetFrame";
import { formatCurrency, pick } from "./utils";

const Field = ({ label, value }) =>
  value ? (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  ) : null;

export default function LoanCaseCardInline({ widget = {}, onAction }) {
  const item = widget.case || widget.record || widget.data || widget;
  return (
    <WidgetFrame
      title={widget.title || "Loan case"}
      subtitle={pick(item, ["bank", "loanBank", "module"], "Loans")}
      actions={widget.actions || item.actions}
      onAction={onAction}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Customer" value={pick(item, ["customer", "customerName", "name"])} />
        <Field label="Vehicle" value={pick(item, ["vehicle", "vehicleName", "model"])} />
        <Field label="Registration" value={pick(item, ["registrationNumber", "registration", "regNo"])} />
        <Field label="Loan bank" value={pick(item, ["loanBank", "bank", "financer"])} />
        <Field label="Loan amount" value={formatCurrency(pick(item, ["loanAmount", "amount"]))} />
        <Field label="Disbursed amount" value={formatCurrency(pick(item, ["disbursedAmount", "disbursementAmount"]))} />
        <Field label="EMI / Tenure" value={pick(item, ["emiTenure", "emi", "tenure"])} />
        <Field label="Loan status" value={pick(item, ["loanStatus", "status"])} />
        <Field label="Related payments" value={pick(item, ["relatedPayments", "paymentsSummary", "paymentStatus"])} />
      </div>
    </WidgetFrame>
  );
}
