import React from "react";
import RecordsTableInline from "./RecordsTableInline";
import WidgetFrame from "./WidgetFrame";
import { asArray } from "./utils";

export default function FeatureAvailabilityInline({ widget = {}, onAction }) {
  const answer = widget.answer || widget.data?.answer || "Not found";
  const question = widget.question || widget.data?.question || widget.title || "Feature question";
  const evidenceRows = asArray(widget.evidenceRows || widget.data?.evidenceRows || widget.records || widget.rows);
  const summary = widget.summary || widget.data || {};
  const totalChecked = summary.totalVariantsChecked ?? summary.total ?? evidenceRows.length;

  return (
    <div className="space-y-3">
      <WidgetFrame title={widget.title || "Feature answer"} actions={widget.actions} onAction={onAction}>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-600">{question}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{answer}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Checked {totalChecked} variant{Number(totalChecked) === 1 ? "" : "s"}
            {summary.yesCount !== undefined ? ` • Yes ${summary.yesCount}` : ""}
            {summary.noCount !== undefined ? ` • No ${summary.noCount}` : ""}
            {summary.notFoundCount !== undefined ? ` • Not found ${summary.notFoundCount}` : ""}
          </p>
        </div>
      </WidgetFrame>
      <RecordsTableInline
        widget={{ title: "Evidence", actions: [] }}
        records={evidenceRows}
        columns={
          widget.columns || [
            { key: "brand", label: "Brand" },
            { key: "model", label: "Model" },
            { key: "variant", label: "Variant" },
            { key: "featureKey", label: "Feature" },
            { key: "featureValue", label: "Value" },
            { key: "answer", label: "Answer" },
          ]
        }
        onAction={onAction}
      />
    </div>
  );
}
