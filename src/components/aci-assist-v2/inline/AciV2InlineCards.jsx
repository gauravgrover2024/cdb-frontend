import React from "react";

const safe = (value, fallback = "") => String(value || fallback).trim();
const asArray = (value) => (Array.isArray(value) ? value : []);

function Card({ title, children }) {
  return (
    <section className="aci-v2-inline-card">
      {title ? <h4>{title}</h4> : null}
      {children}
    </section>
  );
}

export function FeatureAnswerCard({ payload = {} }) {
  const status = safe(payload.status || payload.answerType || "Check result");
  const confidence = payload.confidence ? `Confidence: ${payload.confidence}` : "";
  return (
    <Card title="Feature check">
      <p>{status}</p>
      {confidence ? <small>{confidence}</small> : null}
    </Card>
  );
}

export function VariantAmbiguityCard({ payload = {} }) {
  const list = asArray(payload.candidateVariants).slice(0, 5);
  return (
    <Card title="Choose exact variant">
      <p>Multiple close variants found. Pick one to continue.</p>
      {list.length ? (
        <ul>
          {list.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

export function ModelAmbiguityCard({ payload = {} }) {
  const list = asArray(payload.candidateModels).slice(0, 5);
  return (
    <Card title="Choose model">
      <p>I found multiple matching models.</p>
      {list.length ? (
        <ul>
          {list.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

export function PriceSummaryCard({ payload = {} }) {
  return (
    <Card title={safe(payload.title, "Price summary")}>
      <p>{safe(payload.priceRange || payload.summary || payload.answer, "Live price summary is available.")}</p>
    </Card>
  );
}

export function EmiAnswerCard({ payload = {} }) {
  return (
    <Card title="EMI estimate">
      <p>{safe(payload.emi || payload.summary || payload.answer, "EMI details are ready.")}</p>
    </Card>
  );
}

export function FinanceFaqCard({ payload = {}, onAction }) {
  const data = payload.data || {};
  const checklist = asArray(data.checklist || payload.checklist).slice(0, 8);
  const caveats = asArray(data.caveats || payload.caveats).slice(0, 3);
  const actions = asArray(payload.actions).slice(0, 3);

  return (
    <Card title={safe(payload.title, "Car loan guidance")}>
      {checklist.length ? (
        <ul className="aci-v2-finance-checklist">
          {checklist.map((item, index) => (
            <li key={`${item}-${index}`}>{safe(item)}</li>
          ))}
        </ul>
      ) : null}
      {caveats.length ? (
        <p className="aci-v2-finance-caveat">{safe(caveats[0])}</p>
      ) : null}
      {actions.length ? (
        <div className="aci-v2-finance-actions">
          {actions.map((action, index) => (
            <button
              type="button"
              key={action.id || action.query || index}
              onClick={() => onAction?.(action)}
            >
              {safe(action.label || action.query, `Next step ${index + 1}`)}
            </button>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function ClarificationCard({ payload = {}, onAction }) {
  const data = payload.data || {};
  const options = asArray(
    data.options || payload.options || payload.actions || payload.leadingQuestions,
  ).slice(0, 5);

  if (!options.length) return null;

  return (
    <div className="aci-v2-clarification-options" aria-label="Choose one option">
      {options.map((option, index) => {
        const normalized = typeof option === "string"
          ? { id: `clarification-${index}`, label: option, query: option, type: "ask" }
          : option;
        const label = safe(
          normalized.label || normalized.title || normalized.query,
          `Option ${index + 1}`,
        );

        return (
          <button
            type="button"
            key={normalized.id || normalized.query || label}
            onClick={() => onAction?.({ ...normalized, label, query: normalized.query || label })}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function QuotationLeadCard({ payload = {} }) {
  const missing = asArray(payload.missingFields);
  return (
    <Card title="Quotation details needed">
      <p>{safe(payload.message, "Share missing details to generate the best quote.")}</p>
      {missing.length ? <small>Missing: {missing.join(", ")}</small> : null}
    </Card>
  );
}

export function RecommendationMiniCard({ payload = {} }) {
  const rows = asArray(payload.rows || payload.items).slice(0, 3);
  return (
    <Card title="Top recommendations">
      {rows.length ? (
        <ul>
          {rows.map((item, index) => (
            <li key={item.id || index}>{safe(item.name || item.model || item.displayName)}</li>
          ))}
        </ul>
      ) : (
        <p>Recommendations are ready.</p>
      )}
    </Card>
  );
}

export function TextNoticeCard({ payload = {} }) {
  return (
    <Card title={safe(payload.title, "ACI Assist")}> 
      <p>{safe(payload.message || payload.answer || "No additional details.")}</p>
    </Card>
  );
}
