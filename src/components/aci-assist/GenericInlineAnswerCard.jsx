import React from "react";
import WidgetFrame from "./WidgetFrame";
import { asArray } from "./utils";
import { compactText, rowsFrom } from "./canvas-utils";
import AciActionPills from "./AciActionPills";
import AciEmptyState from "./AciEmptyState";

const normalizeFactRows = (widget = {}, message = {}) => {
  const rows = rowsFrom(widget);
  if (rows.length) return rows.slice(0, 4);

  const summary = widget.summary || widget.data || {};
  const facts = Object.entries(summary)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 4)
    .map(([key, value]) => ({ key, value }));

  return facts;
};

export default function GenericInlineAnswerCard({
  message,
  widget = {},
  onAction,
}) {
  const answer =
    message?.answer ||
    widget?.answer ||
    widget?.data?.answer ||
    message?.assistantMessage ||
    widget?.title ||
    "I have an update.";

  const title =
    widget?.title ||
    message?.title ||
    "ACI Assist";

  const evidenceLine =
    widget?.evidence ||
    widget?.data?.evidence ||
    asArray(widget?.notices)[0] ||
    "Based on matched catalog records.";

  const actions = asArray(message?.actions).length
    ? message.actions
    : widget?.actions || [];

  const leading = asArray(message?.leadingQuestions).map((item) => ({
    label: item?.label || item?.query,
    type: "ask",
    query: item?.query || item?.label,
    intent: item?.intent,
    displayMode: item?.displayMode,
    canvasType: item?.canvasType,
    inlineType: item?.inlineType,
  }));

  const factRows = normalizeFactRows(widget, message);

  return (
    <WidgetFrame title={title} actions={[]} onAction={onAction}>
      <div className="space-y-3 rounded-2xl border border-[#dbe3ef] bg-white p-4">
        <p className="text-sm font-black text-[#0f172a]">{compactText(answer)}</p>
        <p className="text-xs font-semibold text-[#64748b]">{compactText(evidenceLine)}</p>

        {factRows.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {factRows.map((row, idx) => (
              <div key={`fact-${idx}`} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2.5">
                <p className="text-[11px] font-black uppercase tracking-wide text-[#64748b]">
                  {compactText(row.key || row.label || "Fact").replace(/_/g, " ")}
                </p>
                <p className="text-xs font-semibold text-[#0f172a]">
                  {compactText(row.value || row.answer || row.featureValue || row.variant || "—")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <AciEmptyState title="No extra facts" message="No additional key facts were returned." />
        )}

        <AciActionPills actions={actions} onAction={onAction} />
        <AciActionPills actions={leading} onAction={onAction} />
      </div>
    </WidgetFrame>
  );
}
