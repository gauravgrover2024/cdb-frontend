import React from "react";
import {
  AlertCircle,
  Calculator,
  CarFront,
  GitCompareArrows,
  IndianRupee,
  Palette,
  Sparkles,
} from "lucide-react";

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const text = (...values) => {
  for (const value of values) {
    const candidate = String(value || "").replace(/\s+/g, " ").trim();
    if (candidate) return candidate;
  }
  return "";
};

const number = (...values) => {
  for (const value of values) {
    const candidate = Number(value || 0);
    if (Number.isFinite(candidate) && candidate > 0) return candidate;
  }
  return 0;
};

const formatPrice = (value) => {
  const amount = Number(value || 0);
  if (!amount) return "";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getRows = (message = {}, widget = {}) => {
  const candidates = [
    message.rows,
    widget.rows,
    widget.data?.rows,
    message.items,
    widget.items,
    widget.colors,
    widget.data?.colors,
  ];

  for (const candidate of candidates) {
    const rows = asArray(candidate);
    if (rows.length) return rows;
  }
  return [];
};

const getVehicleName = (message = {}, widget = {}, rows = []) =>
  text(
    widget.vehicle?.displayName,
    widget.vehicle?.fullModel,
    widget.displayName,
    rows[0]?.displayName,
    rows[0]?.modelDisplayName,
    message.vehicle?.displayName,
    message.vehicle?.fullModel,
    message.contextPatch?.selectedVehicle?.displayName,
    message.contextPatch?.anchorFullModel,
    [rows[0]?.make || rows[0]?.brand, rows[0]?.model].filter(Boolean).join(" "),
    widget.title,
  );

const splitAnswer = (value = "") =>
  String(value || "")
    .replace(/([.!?])\s+/g, "$1\n")
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

const pricePresentation = ({ message, widget, rows }) => {
  const ordered = rows
    .map((row) => ({
      row,
      ex: number(row.exShowroomPrice, row.exShowroomPriceValue),
      onRoad: number(row.onRoadPrice, row.onRoadPriceWithoutOptional),
    }))
    .filter((item) => item.ex)
    .sort((left, right) => left.ex - right.ex);
  const entry = ordered[0] || {};
  const top = ordered[ordered.length - 1] || {};
  const model = getVehicleName(message, widget, rows) || "This car";
  const city = text(
    widget.city,
    widget.selectedCity,
    message.contextPatch?.anchorCity,
    message.contextPatch?.selectedVehicle?.city,
    "New Delhi",
  );

  return {
    tone: "price",
    icon: IndianRupee,
    eyebrow: `${city} · Price guide`,
    title: entry.ex ? `${model} starts at ${formatPrice(entry.ex)}` : text(widget.title, message.title),
    metrics: [
      entry.onRoad
        ? { value: formatPrice(entry.onRoad), label: "on-road from" }
        : null,
      rows.length ? { value: String(rows.length), label: "current variants" } : null,
      top.ex && top.ex !== entry.ex
        ? { value: formatPrice(top.ex), label: "top ex-showroom" }
        : null,
    ].filter(Boolean),
    note: "Optional add-ons stay separate, so the comparison remains clean.",
  };
};

const colorPresentation = ({ message, widget, rows }) => {
  const model = getVehicleName(message, widget, rows) || "This car";
  const firstColor = text(rows[0]?.colorName, rows[0]?.name);
  return {
    tone: "color",
    icon: Palette,
    eyebrow: "Colour studio",
    title: `${model} has ${rows.length} colour option${rows.length === 1 ? "" : "s"}`,
    metrics: firstColor ? [{ value: firstColor, label: "shown first" }] : [],
    note: "Availability can vary by variant.",
  };
};

const comparisonPresentation = ({ message, widget, rows }) => {
  const left = rows[0] || {};
  const right = rows[1] || {};
  const leftName = text(left.displayName, left.modelDisplayName, left.model, "First car");
  const rightName = text(right.displayName, right.modelDisplayName, right.model, "Second car");
  const leftVariant = text(left.variantName, left.variant);
  const rightVariant = text(right.variantName, right.variant);
  const leftPrice = number(left.onRoadPrice, left.exShowroomPrice);
  const rightPrice = number(right.onRoadPrice, right.exShowroomPrice);
  const difference = leftPrice && rightPrice ? Math.abs(leftPrice - rightPrice) : 0;
  const fuel = text(left.fuelType, left.fuel);
  const transmission = text(left.transmission);

  return {
    tone: "compare",
    icon: GitCompareArrows,
    eyebrow: "Like-for-like comparison",
    title: `${leftName}${leftVariant ? ` ${leftVariant}` : ""} vs ${rightName}${rightVariant ? ` ${rightVariant}` : ""}`,
    metrics: [
      difference ? { value: formatPrice(difference), label: "price gap" } : null,
      fuel ? { value: fuel, label: "matched fuel" } : null,
      transmission ? { value: transmission, label: "matched gearbox" } : null,
    ].filter(Boolean),
    note: text(widget.subtitle, "Matched as closely as the current variants allow."),
  };
};

const featurePresentation = ({ message, widget, rows }) => {
  const model = getVehicleName(message, widget, rows) || "Feature check";
  const metrics = rows.slice(0, 3).map((row) => {
    const available = number(row.availableCount);
    const total = number(row.totalVariants, row.checkedVariants);
    return {
      value: total && available === total ? "All variants" : available ? `${available} variants` : "Not listed",
      label: text(row.displayName, row.feature, row.name, "Feature"),
    };
  });

  return {
    tone: "feature",
    icon: Sparkles,
    eyebrow: "Feature check",
    title: `${model}: ${rows.length} feature${rows.length === 1 ? "" : "s"} checked`,
    metrics,
    note: "The card below shows the exact variant-level availability.",
  };
};

const compoundPresentation = ({ message }) => {
  const blocks = asArray(message.answerBlocks);
  const featureBlock = blocks.find((block) => /feature/.test(block.intent || block.canvasType));
  const featureRow = asArray(featureBlock?.widget?.rows)[0] || {};
  const featureModels = asArray(featureRow.models);
  const priceBlocks = blocks.filter((block) => /price|pricelist/.test(block.intent || block.canvasType));
  const colorBlocks = blocks.filter((block) => /color|colour/.test(block.intent || block.canvasType));
  const names = featureModels
    .map((item) => text(item.fullModel, [item.make, item.model].filter(Boolean).join(" ")))
    .filter(Boolean);
  const entryPrices = priceBlocks.map((block) => {
    const prices = asArray(block.widget?.rows)
      .map((row) => number(row.exShowroomPrice, row.exShowroomPriceValue))
      .filter(Boolean)
      .sort((left, right) => left - right);
    return prices[0] || 0;
  });
  const availability = featureModels
    .map((item) => `${number(item.availableCount)}/${number(item.totalVariants, item.checkedVariants)}`)
    .filter((item) => !item.includes("0/0"));
  const colorCounts = colorBlocks.map((block) => asArray(block.widget?.rows).length).filter(Boolean);

  return {
    tone: "compare",
    icon: GitCompareArrows,
    eyebrow: "Complete comparison",
    title: names.length >= 2
      ? `${names[0]} vs ${names[1]}, answered in one view`
      : "Your complete comparison is ready",
    metrics: [
      availability.length >= 2
        ? { value: availability.join(" vs "), label: text(featureRow.displayName, featureRow.feature, "feature availability") }
        : null,
      colorCounts.length >= 2
        ? { value: colorCounts.join(" vs "), label: "colour options" }
        : null,
      entryPrices.length >= 2
        ? { value: entryPrices.map(formatPrice).join(" vs "), label: "starting ex-showroom" }
        : null,
    ].filter(Boolean),
    note: "Everything you asked for is grouped by car below.",
  };
};

const scorePresentation = ({ message, widget, rows }) => {
  const winner = rows[0] || {};
  const runnerUp = rows[1] || {};
  const winnerName = text(winner.variantFullName, winner.variantName, widget.title, "Best-value pick");
  const valueScore = number(winner.modules?.value?.score);
  return {
    tone: "score",
    icon: Sparkles,
    eyebrow: "Best-value pick",
    title: `${winnerName} leads this value shortlist`,
    metrics: [
      winner.referenceExShowroomPrice
        ? { value: formatPrice(winner.referenceExShowroomPrice), label: "ex-showroom" }
        : null,
      valueScore ? { value: `${Math.round(valueScore)}/100`, label: "same-model value" } : null,
      runnerUp.variantFullName
        ? { value: text(runnerUp.variantFullName).replace(/^Hyundai\s+Creta\s+/i, ""), label: "next closest" }
        : null,
    ].filter(Boolean),
    note: "This ranks value within the current model range; your usage priorities can change the final pick.",
  };
};

const defaultPresentation = ({ message, widget, hasRichContent }) => {
  const parts = splitAnswer(message.text || message.answer);
  const title = text(widget.title, message.title, parts[0], "Here’s what matters");
  const remaining = parts[0] === title ? parts.slice(1) : parts;
  const intent = text(message.intent, widget.intent).toLowerCase();
  const isEmi = /emi|finance|loan/.test(intent);
  return {
    tone: message.error ? "error" : isEmi ? "finance" : "default",
    icon: message.error ? AlertCircle : isEmi ? Calculator : CarFront,
    eyebrow: message.error ? "Couldn’t complete that" : isEmi ? "Finance answer" : "ACI Assist",
    title,
    details: hasRichContent ? [] : remaining,
  };
};

const buildPresentation = ({ message = {}, widget = {}, hasRichContent = false }) => {
  const rows = getRows(message, widget);
  const canvasType = text(message.canvasType, widget.canvasType, widget.__rawCanvasType).toLowerCase();
  const intent = text(message.intent, widget.intent).toLowerCase();
  const inlineType = text(message.inlineType, widget.inlineType).toLowerCase();

  if (asArray(message.answerBlocks).length > 1) {
    return compoundPresentation({ message, widget });
  }

  if (/score_insight/.test(`${canvasType} ${intent} ${inlineType}`) && rows.length) {
    return scorePresentation({ message, widget, rows });
  }

  if (/price|pricelist/.test(`${canvasType} ${intent}`) && rows.length) {
    return pricePresentation({ message, widget, rows });
  }
  if (/color|colour/.test(`${canvasType} ${intent}`) && rows.length) {
    return colorPresentation({ message, widget, rows });
  }
  if (/comparison|compare/.test(`${canvasType} ${intent}`) && rows.length >= 2) {
    return comparisonPresentation({ message, widget, rows });
  }
  if (/feature/.test(`${canvasType} ${intent} ${inlineType}`) && rows.length) {
    return featurePresentation({ message, widget, rows });
  }
  return defaultPresentation({ message, widget, hasRichContent });
};

function AciV2AnswerLead({ message = {}, widget = {}, hasRichContent = false }) {
  if (!message.text && !message.answer && !widget.title) return null;
  const presentation = buildPresentation({ message, widget, hasRichContent });
  const Icon = presentation.icon || CarFront;

  return (
    <section className={`aci-answer-lead is-${presentation.tone}`} aria-label={presentation.eyebrow}>
      <span className="aci-answer-lead-icon" aria-hidden="true">
        <Icon size={17} strokeWidth={2} />
      </span>
      <div className="aci-answer-lead-copy">
        <span className="aci-answer-lead-eyebrow">{presentation.eyebrow}</span>
        <h3>{presentation.title}</h3>
        {presentation.metrics?.length ? (
          <div className="aci-answer-lead-metrics">
            {presentation.metrics.slice(0, 3).map((metric) => (
              <span key={`${metric.label}-${metric.value}`}>
                <strong>{metric.value}</strong>
                <small>{metric.label}</small>
              </span>
            ))}
          </div>
        ) : null}
        {presentation.details?.length ? (
          <div className="aci-answer-lead-details">
            {presentation.details.map((detail) => <p key={detail}>{detail}</p>)}
          </div>
        ) : null}
        {presentation.note ? <p className="aci-answer-lead-note">{presentation.note}</p> : null}
      </div>
    </section>
  );
}

export default React.memo(AciV2AnswerLead);
export { buildPresentation as buildAciAnswerPresentation };
