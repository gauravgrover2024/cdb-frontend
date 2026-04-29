import React from "react";
import WidgetFrame from "./WidgetFrame";
import { formatCurrency, formatDate, pick } from "./utils";

const Field = ({ label, value }) =>
  value ? (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  ) : null;

export default function InsuranceCaseCardInline({ widget = {}, onAction }) {
  const item = widget.case || widget.record || widget.data || widget;
  return (
    <WidgetFrame
      title={widget.title || "Insurance case"}
      subtitle={pick(item, ["source", "caseType", "module"], "Insurance")}
      actions={widget.actions || item.actions}
      onAction={onAction}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Customer" value={pick(item, ["customer", "customerName", "name"])} />
        <Field label="Vehicle" value={pick(item, ["vehicle", "vehicleName", "model"])} />
        <Field label="Registration" value={pick(item, ["registrationNumber", "registration", "regNo", "vehicleNumber"])} />
        <Field label="Policy number" value={pick(item, ["policyNumber", "policyNo"])} />
        <Field label="Insurer" value={pick(item, ["insurer", "insuranceCompany", "company"])} />
        <Field label="Policy type" value={pick(item, ["policyType", "type"])} />
        <Field label="Premium" value={formatCurrency(pick(item, ["premium", "premiumAmount"]))} />
        <Field label="Start date" value={formatDate(pick(item, ["startDate", "policyStartDate"]))} />
        <Field label="Expiry date" value={formatDate(pick(item, ["expiryDate", "policyExpiryDate", "endDate"]))} />
        <Field label="Status" value={pick(item, ["status", "policyStatus"])} />
        <Field label="Payment status" value={pick(item, ["paymentStatus", "payment"])} />
        <Field label="Source" value={pick(item, ["source", "origin", "renewalType"])} />
      </div>
    </WidgetFrame>
  );
}
