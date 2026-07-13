import React from "react";
import { Activity, Check, ShieldAlert } from "lucide-react";

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const safeText = (value, fallback = "") => String(value || fallback).trim();

const isObject = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const pickRows = (payload = {}) => {
  const data = isObject(payload.data) ? payload.data : {};
  const candidates = [
    payload.rows,
    payload.items,
    payload.variants,
    payload.similarModels,
    data.rows,
    data.items,
    data.variants,
    data.similarModels,
  ];

  for (const value of candidates) {
    const list = asArray(value);
    if (list.length) return list;
  }

  return [];
};

const rowLabel = (row = {}, index = 0) => {
  if (!isObject(row)) return safeText(row, `Item ${index + 1}`);
  return safeText(
    row.displayName ||
      row.name ||
      row.variantName ||
      row.variant ||
      row.model ||
      row.title ||
      row.matchLabel,
    `Item ${index + 1}`,
  );
};

export default function AciV2DiagnosticInlineCard({ payload = {} }) {
  const data = isObject(payload.data) ? payload.data : {};
  const title = safeText(payload.title || data.title, "Diagnostic result");
  const answer = safeText(payload.answer || data.answer || payload.summary || data.summary);
  const rows = pickRows(payload).slice(0, 4);
  const guardrail = payload.usageGuardrail || data.usageGuardrail || {};
  const diagnosticOnly = guardrail.canUseForFinalRecommendation === false;

  return (
    <section className="aci-v2-inline-card aci-v2-diagnostic-inline-card">
      <header className="aci-v2-inline-card-header">
        <span aria-hidden="true"><Activity size={16} strokeWidth={2} /></span>
        <div><small>Decision insight</small><h4>{title}</h4></div>
      </header>
      <div className="aci-v2-inline-card-body">
        {answer ? <p>{answer}</p> : null}
        {rows.length ? (
          <div className="aci-v2-inline-rows">
            {rows.map((row, index) => (
              <div className="aci-v2-inline-row" key={row.id || row.key || index}>
                <span>{rowLabel(row, index)}</span><Check size={14} aria-hidden="true" />
              </div>
            ))}
          </div>
        ) : null}
        {diagnosticOnly ? (
          <p className="aci-v2-inline-note">
            <ShieldAlert size={13} aria-hidden="true" /> Supporting insight only; it will not decide the recommendation by itself.
          </p>
        ) : null}
      </div>
    </section>
  );
}
