import React from "react";

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
      <style>{`
        .aci-v2-diagnostic-inline-card ul {
          margin: 8px 0 0;
          padding-left: 18px;
        }
        .aci-v2-diagnostic-inline-card li {
          margin: 3px 0;
        }
        .aci-v2-diagnostic-inline-note {
          display: inline-flex;
          margin-top: 8px;
          border-radius: 999px;
          background: #eff6ff;
          color: #0758f8;
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 800;
        }
      `}</style>
      <h4>{title}</h4>
      {answer ? <p>{answer}</p> : null}
      {rows.length ? (
        <ul>
          {rows.map((row, index) => (
            <li key={row.id || row.key || index}>{rowLabel(row, index)}</li>
          ))}
        </ul>
      ) : null}
      {diagnosticOnly ? (
        <small className="aci-v2-diagnostic-inline-note">
          Diagnostic only · final recommendation blocked
        </small>
      ) : null}
    </section>
  );
}
