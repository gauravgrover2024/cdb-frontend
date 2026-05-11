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
