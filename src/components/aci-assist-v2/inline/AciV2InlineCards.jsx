import React from "react";
import {
  ArrowRight,
  Calculator,
  Check,
  FileText,
  HelpCircle,
  IndianRupee,
  Info,
  Landmark,
  ListChecks,
  Sparkles,
  Trophy,
} from "lucide-react";

const safe = (value, fallback = "") => String(value || fallback).trim();
const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

function Card({ title, eyebrow = "ACI Assist", icon: Icon = Info, children }) {
  return (
    <section className="aci-v2-inline-card">
      <header className="aci-v2-inline-card-header">
        <span aria-hidden="true"><Icon size={16} strokeWidth={2} /></span>
        <div>
          <small>{eyebrow}</small>
          {title ? <h4>{title}</h4> : null}
        </div>
      </header>
      <div className="aci-v2-inline-card-body">{children}</div>
    </section>
  );
}

const InlineRows = ({ items = [], renderLabel = (item) => safe(item) }) => (
  <div className="aci-v2-inline-rows">
    {items.map((item, index) => (
      <div className="aci-v2-inline-row" key={item?.id || item?.key || `${renderLabel(item)}-${index}`}>
        <span>{renderLabel(item, index)}</span>
        <Check size={14} strokeWidth={2.2} aria-hidden="true" />
      </div>
    ))}
  </div>
);

export function FeatureAnswerCard({ payload = {} }) {
  const status = safe(payload.status || payload.answerType || payload.summary, "Feature details are ready.");
  return (
    <Card title="Feature check" eyebrow="Variant evidence" icon={Sparkles}>
      <p>{status}</p>
      {payload.confidence ? <p className="aci-v2-inline-note">Confidence: {payload.confidence}</p> : null}
    </Card>
  );
}

export function VariantAmbiguityCard({ payload = {}, onAction }) {
  const list = asArray(payload.candidateVariants).slice(0, 5);
  return (
    <Card title="Which variant did you mean?" eyebrow="One quick choice" icon={HelpCircle}>
      <div className="aci-v2-inline-rows">
        {list.map((item, index) => {
          const label = safe(item?.label || item?.variantName || item?.variant || item);
          return (
            <button
              type="button"
              className="aci-v2-inline-row"
              key={item?.id || `${label}-${index}`}
              onClick={() => onAction?.(typeof item === "string" ? { label, query: label, type: "ask" } : item)}
            >
              <span>{label}</span><ArrowRight size={14} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function ModelAmbiguityCard({ payload = {}, onAction }) {
  const list = asArray(payload.candidateModels).slice(0, 5);
  return (
    <Card title="Choose the exact model" eyebrow="One quick choice" icon={HelpCircle}>
      <div className="aci-v2-inline-rows">
        {list.map((item, index) => {
          const label = safe(item?.label || item?.displayName || item?.model || item);
          return (
            <button
              type="button"
              className="aci-v2-inline-row"
              key={item?.id || `${label}-${index}`}
              onClick={() => onAction?.(typeof item === "string" ? { label, query: label, type: "ask" } : item)}
            >
              <span>{label}</span><ArrowRight size={14} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function PriceSummaryCard({ payload = {} }) {
  return (
    <Card title={safe(payload.title, "Price summary")} eyebrow="Current pricing" icon={IndianRupee}>
      <p>{safe(payload.priceRange || payload.summary || payload.answer, "Live price details are available.")}</p>
    </Card>
  );
}

export function EmiAnswerCard({ payload = {} }) {
  return (
    <Card title="EMI estimate" eyebrow="Monthly plan" icon={Calculator}>
      <p>{safe(payload.emi || payload.summary || payload.answer, "EMI details are ready.")}</p>
    </Card>
  );
}

export function FinanceFaqCard({ payload = {} }) {
  const data = payload.data || {};
  const checklist = asArray(data.checklist || payload.checklist).slice(0, 8);
  const caveats = asArray(data.caveats || payload.caveats).slice(0, 3);

  return (
    <Card title={safe(payload.title, "Car loan guidance")} eyebrow="Finance checklist" icon={Landmark}>
      {checklist.length ? <InlineRows items={checklist} /> : null}
      {caveats.length ? <p className="aci-v2-inline-note">{safe(caveats[0])}</p> : null}
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
    <Card title={safe(payload.title, "Help me narrow that down")} eyebrow="One quick choice" icon={HelpCircle}>
      <div className="aci-v2-inline-rows" aria-label="Choose one option">
        {options.map((option, index) => {
          const normalized = typeof option === "string"
            ? { id: `clarification-${index}`, label: option, query: option, type: "ask" }
            : option;
          const label = safe(normalized.label || normalized.title || normalized.query, `Option ${index + 1}`);
          return (
            <button
              type="button"
              className="aci-v2-inline-row"
              key={normalized.id || normalized.query || label}
              onClick={() => onAction?.({ ...normalized, label, query: normalized.query || label })}
            >
              <span>{label}</span><ArrowRight size={14} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function QuotationLeadCard({ payload = {} }) {
  const missing = asArray(payload.missingFields);
  return (
    <Card title="Quotation details" eyebrow="Only when you’re ready" icon={FileText}>
      <p>{safe(payload.message, "A few details will help prepare an accurate quotation.")}</p>
      {missing.length ? <p className="aci-v2-inline-note">Still needed: {missing.join(", ")}</p> : null}
    </Card>
  );
}

export function RecommendationMiniCard({ payload = {} }) {
  const rows = asArray(payload.rows || payload.items).slice(0, 3);
  return (
    <Card title="Best fits so far" eyebrow="Shortlist" icon={Trophy}>
      {rows.length ? (
        <InlineRows items={rows} renderLabel={(item) => safe(item.name || item.model || item.displayName)} />
      ) : <p>Your recommendations are ready.</p>}
    </Card>
  );
}

export function TextNoticeCard({ payload = {} }) {
  return (
    <Card title={safe(payload.title, "Good to know")} eyebrow="Helpful context" icon={ListChecks}>
      <p>{safe(payload.message || payload.answer || "No additional details.")}</p>
    </Card>
  );
}
