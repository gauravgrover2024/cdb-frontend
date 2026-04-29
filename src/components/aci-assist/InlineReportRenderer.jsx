import React from "react";
import ChartSummaryInline from "./ChartSummaryInline";
import ModuleBreakdownCard from "./ModuleBreakdownCard";
import RecordsTableInline from "./RecordsTableInline";
import WidgetFrame from "./WidgetFrame";
import { asArray, formatCurrency, pick } from "./utils";

const SummaryCard = ({ label, value, note }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    {note ? <p className="mt-1 text-xs font-medium text-slate-500">{note}</p> : null}
  </div>
);

export default function InlineReportRenderer({ widget = {}, onAction }) {
  const data = widget.data || widget;
  const summaries = asArray(data.summaryCards || data.summaries || widget.summaryCards);
  const records = data.records || data.rows || widget.records;
  const moduleTables = data.moduleTables || data.tables || widget.tables;

  return (
    <div className="space-y-3">
      <WidgetFrame title={widget.title || "Report"} subtitle={widget.subtitle} actions={widget.actions} onAction={onAction}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total" value={pick(data, ["total", "totalCount", "count"], 0)} />
          {summaries.map((item, index) => (
            <SummaryCard
              key={index}
              label={pick(item, ["label", "title"], `Metric ${index + 1}`)}
              value={pick(item, ["value", "count", "total", "amount"], "—")}
              note={pick(item, ["note", "description"], "")}
            />
          ))}
          {pick(data, ["amount", "totalAmount"], "") ? (
            <SummaryCard label="Amount" value={formatCurrency(pick(data, ["amount", "totalAmount"], 0))} />
          ) : null}
        </div>
      </WidgetFrame>
      <ModuleBreakdownCard widget={{ title: "Module-wise counts", modules: data.modules || data.moduleBreakdown }} onAction={onAction} />
      <ChartSummaryInline widget={{ title: "Visual breakdown", chartData: data.chartData || data.breakdown }} onAction={onAction} />
      {Array.isArray(moduleTables) ? (
        moduleTables.map((table, index) => (
          <RecordsTableInline key={index} widget={{ title: table.title || table.module || `Table ${index + 1}`, actions: table.actions }} records={table.records || table.rows} columns={table.columns} onAction={onAction} />
        ))
      ) : (
        <RecordsTableInline widget={{ title: "Records" }} records={records} columns={data.columns} onAction={onAction} />
      )}
    </div>
  );
}
