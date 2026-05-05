import React from "react";
import { asArray, compactObject } from "./utils";
import { compactText, rowsFrom } from "./canvas-utils";
import { ModernCanvasShell } from "./canvases/BaseComponents";
import AciActionPills from "./AciActionPills";
import AciEmptyState from "./AciEmptyState";

const toSummaryCards = (widget = {}, message = {}) => {
  const data = widget?.data || {};
  const candidates = [
    { label: "Total", value: data.total ?? widget.total },
    { label: "Models", value: data.totalMatchedModels ?? data.modelsCount },
    {
      label: "Variants",
      value: data.totalVariants ?? data.totalMatchedVariants ?? data.total,
    },
    { label: "City", value: data.showingCity || data.city || widget.city },
  ];

  return candidates
    .map((item) => compactObject(item))
    .filter((item) => item.label && item.value !== undefined && item.value !== null && item.value !== "")
    .slice(0, 4);
};

const rowEntries = (row = {}) =>
  Object.entries(row)
    .filter(([key, value]) => {
      if (key === "id" || key === "_id") return false;
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === "object" && !Array.isArray(value)) return false;
      return true;
    })
    .slice(0, 6);

export default function GenericAciCanvas({
  message,
  widget,
  onAction,
  footer,
}) {
  const primary = widget || asArray(message?.widgets)[0] || {};
  const rows = rowsFrom(primary);
  const title =
    message?.title ||
    primary?.title ||
    compactText(message?.intent, "ACI Assist").replace(/_/g, " ");
  const subtitle =
    message?.answer ||
    message?.assistantMessage ||
    primary?.subtitle ||
    asArray(primary?.notices)[0] ||
    "";

  const actions = asArray(message?.actions).length
    ? message.actions
    : primary?.actions || [];

  const leadingQuestions = asArray(message?.leadingQuestions).map((item) => ({
    label: item?.label || item?.query,
    type: "ask",
    query: item?.query || item?.label,
    intent: item?.intent,
    displayMode: item?.displayMode,
    canvasType: item?.canvasType,
    inlineType: item?.inlineType,
  }));

  const summaryCards = toSummaryCards(primary, message);

  return (
    <ModernCanvasShell
      title={title}
      subtitle={subtitle}
      footer={footer}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {summaryCards.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-[#dbe3ef] bg-white px-4 py-3"
                >
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#64748b]">
                    {card.label}
                  </p>
                  <p className="mt-1 text-base font-black text-[#0f172a]">
                    {compactText(card.value)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {rows.length ? (
            <div className="space-y-3">
              {rows.slice(0, 12).map((row, index) => (
                <div
                  key={row.id || row._id || `row-${index}`}
                  className="rounded-2xl border border-[#dbe3ef] bg-white p-4"
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    {rowEntries(row).map(([key, value]) => (
                      <div key={`${index}-${key}`}>
                        <p className="text-[11px] font-black uppercase tracking-wide text-[#64748b]">
                          {compactText(key).replace(/_/g, " ")}
                        </p>
                        <p className="text-sm font-semibold text-[#0f172a]">
                          {Array.isArray(value)
                            ? value.map((item) => compactText(item)).join(", ")
                            : compactText(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AciEmptyState
              title={primary?.title || "Data unavailable"}
              message={
                primary?.data?.message ||
                asArray(primary?.notices)[0] ||
                "No rows were returned for this response."
              }
            />
          )}

          {asArray(primary?.notices).length ? (
            <div className="space-y-2">
              {asArray(primary?.notices).map((notice, idx) => (
                <p key={`${idx}-${notice}`} className="text-xs font-semibold text-[#64748b]">
                  {compactText(notice)}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#dbe3ef] bg-white p-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#64748b]">
              Actions
            </p>
            <AciActionPills actions={actions} onAction={onAction} />
          </div>

          <div className="rounded-2xl border border-[#dbe3ef] bg-white p-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#64748b]">
              Leading Questions
            </p>
            <AciActionPills actions={leadingQuestions} onAction={onAction} />
          </div>
        </aside>
      </div>
    </ModernCanvasShell>
  );
}
