import React from "react";
import WidgetFrame from "./WidgetFrame";
import RecordsTableInline from "./RecordsTableInline";
import { asArray, formatDate, pick } from "./utils";

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
    <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-black text-slate-950">{value || "—"}</p>
  </div>
);

export default function Vehicle360Inline({ widget = {}, onAction }) {
  const data = widget.vehicle || widget.data || widget;
  const paymentsRestricted = Boolean(data.paymentsRestricted || data.access?.payments === false);
  const title = [pick(data, ["make"], ""), pick(data, ["model", "vehicle"], ""), pick(data, ["variant"], "")]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-3">
      <WidgetFrame
        title={widget.title || `Vehicle 360: ${title || pick(data, ["registrationNumber", "registration"], "Vehicle")}`}
        subtitle={pick(data, ["registrationNumber", "registration", "regNo"], "Linked vehicle activity")}
        actions={widget.actions || data.actions}
        onAction={onAction}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Registration" value={pick(data, ["registrationNumber", "registration", "regNo"])} />
          <Stat label="Customers" value={asArray(data.customers || data.linkedCustomers).length || pick(data, ["customerName", "customer"])} />
          <Stat label="Latest activity" value={formatDate(pick(data, ["latestActivity", "lastActivityDate", "updatedAt"]))} />
          <Stat label="Mismatches" value={asArray(data.mismatches || data.dataMismatches).length || "0"} />
        </div>
      </WidgetFrame>
      <div className="grid gap-3 xl:grid-cols-2">
        <RecordsTableInline widget={{ title: "Linked customers" }} records={data.customers || data.linkedCustomers} onAction={onAction} />
        <RecordsTableInline widget={{ title: "Loans" }} records={data.loans || data.loanRecords} onAction={onAction} />
        <RecordsTableInline widget={{ title: "Insurance" }} records={data.insurance || data.insuranceRecords} onAction={onAction} />
        {!paymentsRestricted ? (
          <RecordsTableInline widget={{ title: "Payments" }} records={data.payments || data.paymentRecords} onAction={onAction} />
        ) : null}
        <RecordsTableInline widget={{ title: "Delivery records" }} records={data.deliveryRecords || data.deliveries} onAction={onAction} />
        <RecordsTableInline widget={{ title: "RC / challan" }} records={data.rcChallanRecords || data.compliance} onAction={onAction} />
        <RecordsTableInline widget={{ title: "Used-car / inspection" }} records={data.usedCarRecords || data.inspections} onAction={onAction} />
        <RecordsTableInline widget={{ title: "Data mismatches" }} records={data.mismatches || data.dataMismatches} onAction={onAction} />
      </div>
    </div>
  );
}
