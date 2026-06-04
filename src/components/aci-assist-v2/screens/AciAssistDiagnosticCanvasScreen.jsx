import React from "react";

const isObject = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const safeText = (value, fallback = "") => String(value || fallback).trim();

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

const titleize = (value = "") =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const compactValue = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => compactValue(item))
      .filter(Boolean)
      .join(", ");
  }
  if (isObject(value)) {
    return safeText(value.displayName || value.name || value.label || value.score || value.value);
  }
  return "";
};

const pickArrays = (...values) => {
  for (const value of values) {
    const list = asArray(value);
    if (list.length) return list;
  }
  return [];
};

const pickRows = (payload = {}) =>
  pickArrays(
    payload.rows,
    payload.items,
    payload.variants,
    payload.similarModels,
    payload.recommendations,
    payload.data?.rows,
    payload.data?.items,
    payload.data?.variants,
    payload.data?.similarModels,
    payload.data?.recommendations,
  );

const pickModules = (payload = {}) => {
  const modules =
    payload.modules ||
    payload.scoreModules ||
    payload.data?.modules ||
    payload.data?.scoreModules ||
    payload.data?.profile?.modules ||
    {};

  if (!isObject(modules)) return [];

  return Object.entries(modules)
    .map(([key, value]) => {
      if (!isObject(value)) return null;
      const score = firstValue(value.score, value.value, value.rating, value.riskScore);
      const label = safeText(value.label || value.name || titleize(key));
      return {
        key,
        label,
        score,
        summary: safeText(value.summary || value.explanation || value.reason),
      };
    })
    .filter(Boolean);
};

const pickTextList = (...values) => {
  for (const value of values) {
    const list = asArray(value)
      .map((item) => compactValue(item))
      .filter(Boolean);
    if (list.length) return list;
  }
  return [];
};

const RowCard = ({ row = {}, index = 0 }) => {
  const title = safeText(
    row.displayName ||
      row.name ||
      row.variantName ||
      row.variant ||
      row.model ||
      row.title ||
      `Item ${index + 1}`,
  );
  const subtitle = safeText(row.summary || row.reason || row.matchLabel || row.relationType || row.description);
  const fields = [
    ["Score", firstValue(row.score, row.valueScore, row.similarityScore)],
    ["Feature", row.featureScore?.score || row.featureScore],
    ["Value", row.valueScore?.score || row.valueScore],
    ["Safety", row.safetyScore?.score || row.safetyScore],
    ["Price", row.price || row.priceRange || row.exShowroomPrice || row.minExShowroomPrice],
  ].filter(([, value]) => compactValue(value));

  return (
    <article className="adiag-row-card">
      <div>
        <strong>{title}</strong>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {fields.length ? (
        <dl>
          {fields.slice(0, 4).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{compactValue(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
};

export default function AciAssistDiagnosticCanvasScreen({
  data = {},
  widget = {},
  vehicle = null,
}) {
  const payload = {
    ...data,
    ...widget,
    data: {
      ...(data.data || {}),
      ...(widget.data || {}),
    },
  };
  const nested = payload.data || {};
  const title = safeText(
    payload.title ||
      nested.title ||
      vehicle?.displayName ||
      vehicle?.model ||
      "Diagnostic result",
  );
  const answer = safeText(payload.answer || nested.answer || payload.summary || nested.summary);
  const rows = pickRows(payload).slice(0, 12);
  const modules = pickModules(payload).slice(0, 12);
  const strengths = pickTextList(payload.strengths, nested.strengths, payload.highlights, nested.highlights);
  const watchouts = pickTextList(payload.watchouts, nested.watchouts, payload.weaknesses, nested.weaknesses);
  const sourceTransparency = payload.sourceTransparency || nested.sourceTransparency || {};
  const guardrail = payload.usageGuardrail || nested.usageGuardrail || payload.guardrail || nested.guardrail || {};
  const diagnosticOnly = guardrail.canUseForFinalRecommendation === false;

  return (
    <section className="aci-diagnostic-screen">
      <style>{`
        .aci-diagnostic-screen {
          min-height: 100%;
          padding: 22px;
          color: #0f172a;
        }
        .aci-diagnostic-panel {
          max-width: 1040px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }
        .aci-diagnostic-hero,
        .aci-diagnostic-section,
        .adiag-row-card {
          border: 1px solid #dbe3ef;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 16px 40px -36px rgba(15, 23, 42, 0.35);
        }
        .aci-diagnostic-hero {
          padding: 18px;
        }
        .aci-diagnostic-eyebrow {
          margin: 0 0 6px;
          color: #0758f8;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .aci-diagnostic-hero h2 {
          margin: 0;
          font-size: clamp(22px, 3vw, 34px);
          line-height: 1.05;
          letter-spacing: 0;
        }
        .aci-diagnostic-hero p,
        .aci-diagnostic-section p,
        .adiag-row-card p {
          color: #475569;
          line-height: 1.5;
        }
        .aci-diagnostic-guardrail {
          display: inline-flex;
          align-items: center;
          margin-top: 12px;
          padding: 7px 10px;
          border-radius: 999px;
          background: #eff6ff;
          color: #0758f8;
          font-size: 12px;
          font-weight: 800;
        }
        .aci-diagnostic-section {
          padding: 16px;
        }
        .aci-diagnostic-section h3 {
          margin: 0 0 12px;
          font-size: 15px;
        }
        .aci-diagnostic-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }
        .adiag-row-card {
          padding: 13px;
          display: grid;
          gap: 10px;
        }
        .adiag-row-card strong {
          display: block;
          font-size: 14px;
        }
        .adiag-row-card p {
          margin: 4px 0 0;
          font-size: 12px;
        }
        .adiag-row-card dl {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin: 0;
        }
        .adiag-row-card dt {
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .adiag-row-card dd {
          margin: 2px 0 0;
          font-size: 13px;
          font-weight: 850;
        }
        .aci-diagnostic-list {
          margin: 0;
          padding-left: 18px;
          color: #334155;
          line-height: 1.55;
        }
        .aci-diagnostic-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .aci-diagnostic-meta span {
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          padding: 6px 9px;
          font-size: 12px;
          font-weight: 760;
        }
      `}</style>

      <div className="aci-diagnostic-panel">
        <header className="aci-diagnostic-hero">
          <p className="aci-diagnostic-eyebrow">Diagnostic canvas</p>
          <h2>{title}</h2>
          {answer ? <p>{answer}</p> : null}
          {diagnosticOnly ? (
            <span className="aci-diagnostic-guardrail">
              Diagnostic only · final recommendation blocked
            </span>
          ) : null}
        </header>

        {modules.length ? (
          <section className="aci-diagnostic-section">
            <h3>Score modules</h3>
            <div className="aci-diagnostic-grid">
              {modules.map((module) => (
                <article className="adiag-row-card" key={module.key}>
                  <strong>{module.label}</strong>
                  {compactValue(module.score) ? <p>Score: {compactValue(module.score)}</p> : null}
                  {module.summary ? <p>{module.summary}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {rows.length ? (
          <section className="aci-diagnostic-section">
            <h3>Result rows</h3>
            <div className="aci-diagnostic-grid">
              {rows.map((row, index) => (
                <RowCard row={isObject(row) ? row : { title: row }} index={index} key={row.id || row.key || index} />
              ))}
            </div>
          </section>
        ) : null}

        {strengths.length || watchouts.length ? (
          <section className="aci-diagnostic-section">
            <h3>Strengths and watchouts</h3>
            <div className="aci-diagnostic-grid">
              {strengths.length ? (
                <div>
                  <strong>Strengths</strong>
                  <ul className="aci-diagnostic-list">
                    {strengths.slice(0, 6).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {watchouts.length ? (
                <div>
                  <strong>Watchouts</strong>
                  <ul className="aci-diagnostic-list">
                    {watchouts.slice(0, 6).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {isObject(sourceTransparency) && Object.keys(sourceTransparency).length ? (
          <section className="aci-diagnostic-section">
            <h3>Source transparency</h3>
            <div className="aci-diagnostic-meta">
              {Object.entries(sourceTransparency).slice(0, 8).map(([key, value]) => (
                <span key={key}>{titleize(key)}: {compactValue(value) || "available"}</span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
