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

export default function Customer360Inline({ widget = {}, onAction }) {
  const data = widget.customer || widget.data || widget;
  const paymentsRestricted = Boolean(data.paymentsRestricted || data.access?.payments === false);
  return (
    <div className="space-y-3">
      <WidgetFrame
        title={widget.title || `Customer 360: ${pick(data, ["name", "customerName"], "Customer")}`}
        subtitle={pick(data, ["phone", "email", "city"], "Linked CDrive activity")}
        actions={widget.actions || data.actions}
        onAction={onAction}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Customer" value={pick(data, ["name", "customerName"])} />
          <Stat label="Linked vehicles" value={asArray(data.vehicles || data.linkedVehicles).length || pick(data, ["vehicleCount"])} />
          <Stat label="Linked loans" value={asArray(data.loans || data.linkedLoans).length || pick(data, ["loanCount"])} />
          <Stat label="Latest activity" value={formatDate(pick(data, ["latestActivity", "lastActivityDate", "updatedAt"]))} />
        </div>
      </WidgetFrame>
      <div className="grid gap-3 xl:grid-cols-2">
        <RecordsTableInline widget={{ title: "Vehicles" }} records={data.vehicles || data.linkedVehicles} onAction={onAction} />
        <RecordsTableInline widget={{ title: "Loans" }} records={data.loans || data.linkedLoans} onAction={onAction} />
        <RecordsTableInline widget={{ title: "Insurance" }} records={data.insurance || data.insuranceCases || data.linkedInsurance} onAction={onAction} />
        {!paymentsRestricted ? (
          <RecordsTableInline widget={{ title: "Payments" }} records={data.payments || data.linkedPayments} onAction={onAction} />
        ) : null}
        <RecordsTableInline widget={{ title: "Used-car leads" }} records={data.usedCarLeads || data.usedCars} onAction={onAction} />
        <RecordsTableInline widget={{ title: "Compliance" }} records={data.compliance || data.rcChallanRecords || data.rcRecords} onAction={onAction} />
      </div>
    </div>
  );
}
