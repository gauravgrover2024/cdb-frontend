import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  IndianRupee,
  ListChecks,
  Palette,
  Sparkles,
  Trophy,
} from "lucide-react";

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

const modelKey = (value = "") =>
  clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");

const formatPrice = (value) => {
  const amount = Number(value || 0);
  if (!amount) return "—";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
};

const blockRows = (block = {}) =>
  asArray(block.widget?.rows || block.widget?.items || block.rows);

const blockVehicleName = (block = {}) => {
  const vehicle = block.widget?.vehicle || block.vehicle || {};
  return clean(
    vehicle.displayName ||
      vehicle.fullModel ||
      [vehicle.make || vehicle.brand, vehicle.model].filter(Boolean).join(" ") ||
      block.title?.replace(/\s+(colors?|colours?|price list)$/i, ""),
  );
};

const openBlockMessage = (block = {}) => ({
  ...block,
  role: "assistant",
  text: block.answer || block.widget?.answer || "",
  answer: block.answer || block.widget?.answer || "",
  widget: block.widget || {},
  rows: blockRows(block),
  vehicle: block.widget?.vehicle || block.vehicle || null,
  contextPatch: block.widget?.contextPatch || block.contextPatch || {},
});

function CarVisual({ imageUrl, name }) {
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return (
      <div className="aci-compound-car-fallback" aria-hidden="true">
        <span>{clean(name).slice(0, 1) || "C"}</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      loading="eager"
      fetchPriority="high"
      onError={() => setFailed(true)}
    />
  );
}

export function AciV2CompoundInlineCard({ blocks = [], onOpen }) {
  const [showFeatureExamples, setShowFeatureExamples] = useState(false);
  const presentation = useMemo(() => {
    const list = asArray(blocks);
    const featureBlock = list.find((block) => /feature/.test(block.intent || block.canvasType));
    const priceBlocks = list.filter((block) => /price|pricelist/.test(block.intent || block.canvasType));
    const colorBlocks = list.filter((block) => /color|colour/.test(block.intent || block.canvasType));
    const featureRows = blockRows(featureBlock);
    const featureModels = asArray(featureRows[0]?.models);
    const modelNames = [
      ...featureModels.map((item) => clean(item.fullModel || [item.make, item.model].filter(Boolean).join(" "))),
      ...priceBlocks.map(blockVehicleName),
      ...colorBlocks.map(blockVehicleName),
    ].filter((item, index, all) => item && all.findIndex((candidate) => modelKey(candidate) === modelKey(item)) === index);

    const models = modelNames.slice(0, 2).map((name) => {
      const key = modelKey(name);
      const priceBlock = priceBlocks.find((block) => modelKey(blockVehicleName(block)).includes(key) || key.includes(modelKey(blockVehicleName(block))));
      const colorBlock = colorBlocks.find((block) => modelKey(blockVehicleName(block)).includes(key) || key.includes(modelKey(blockVehicleName(block))));
      const featureModel = featureModels.find((item) => {
        const label = item.fullModel || [item.make, item.model].filter(Boolean).join(" ");
        return modelKey(label).includes(key) || key.includes(modelKey(label));
      }) || {};
      const priceRows = blockRows(priceBlock)
        .filter((row) => Number(row.exShowroomPrice || row.exShowroomPriceValue || 0) > 0)
        .sort((left, right) => Number(left.exShowroomPrice || left.exShowroomPriceValue) - Number(right.exShowroomPrice || right.exShowroomPriceValue));
      const entry = priceRows[0] || {};
      const vehicle = priceBlock?.widget?.vehicle || colorBlock?.widget?.vehicle || {};
      return {
        name,
        imageUrl: vehicle.imageUrl || vehicle.normalizedImageUrl || blockRows(colorBlock)[0]?.imageUrl || "",
        priceBlock,
        colorBlock,
        exShowroom: Number(entry.exShowroomPrice || entry.exShowroomPriceValue || 0),
        onRoad: Number(entry.onRoadPrice || entry.onRoadPriceWithoutOptional || 0),
        colorCount: blockRows(colorBlock).length,
        availableCount: Number(featureModel.availableCount || 0),
        totalVariants: Number(featureModel.totalVariants || featureModel.checkedVariants || 0),
        featureLabel: clean(featureRows[0]?.displayName || featureRows[0]?.feature || "Sunroof"),
        previewVariants: asArray(featureModel.previewVariants).slice(0, 4),
      };
    });

    return { models, featureBlock };
  }, [blocks]);

  if (presentation.models.length < 2) return null;

  return (
    <section className="aci-compound-card" aria-label="Complete comparison answer">
      <div className="aci-compound-grid">
        {presentation.models.map((model) => (
          <article className="aci-compound-model" key={modelKey(model.name)}>
            <div className="aci-compound-model-visual">
              <CarVisual imageUrl={model.imageUrl} name={model.name} />
            </div>
            <div className="aci-compound-model-copy">
              <h4>{model.name}</h4>
              <div className="aci-compound-facts">
                <span><IndianRupee size={14} /><b>{formatPrice(model.exShowroom)}</b><small>ex-showroom from</small></span>
                <span><Sparkles size={14} /><b>{model.availableCount}/{model.totalVariants}</b><small>{model.featureLabel} variants</small></span>
                <span><Palette size={14} /><b>{model.colorCount}</b><small>colours</small></span>
              </div>
              <div className="aci-compound-model-actions">
                {model.priceBlock ? (
                  <button type="button" onClick={() => onOpen?.(openBlockMessage(model.priceBlock))}>
                    <ListChecks size={14} /><span>Price list</span><ArrowRight size={13} />
                  </button>
                ) : null}
                {model.colorBlock ? (
                  <button type="button" onClick={() => onOpen?.(openBlockMessage(model.colorBlock))}>
                    <Palette size={14} /><span>Colours</span><ArrowRight size={13} />
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
      {presentation.featureBlock ? (
        <>
          {showFeatureExamples ? (
            <div className="aci-compound-feature-examples">
              {presentation.models.map((model) => (
                <div key={`feature-${modelKey(model.name)}`}>
                  <strong>{model.name}</strong>
                  <span>{model.previewVariants.join(" · ") || "Open the model feature list for variant details."}</span>
                </div>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="aci-compound-feature-action"
            aria-expanded={showFeatureExamples}
            onClick={() => setShowFeatureExamples((visible) => !visible)}
          >
            <span><Check size={15} /> {showFeatureExamples ? "Hide" : "Show"} {presentation.models[0].featureLabel} variant examples</span>
            <ArrowRight size={15} />
          </button>
        </>
      ) : null}
    </section>
  );
}

export function AciV2ScoreInsightInlineCard({ message = {}, widget = {} }) {
  const [expanded, setExpanded] = useState(false);
  const rows = asArray(widget.rows || message.rows).slice(0, 5);
  if (!rows.length) return null;
  const topRows = rows.slice(0, expanded ? 5 : 3);

  return (
    <section className="aci-score-inline-card" aria-label="Best value variants">
      <header>
        <span><Trophy size={16} /></span>
        <div>
          <small>Value shortlist</small>
          <h4>Strongest picks in this model range</h4>
        </div>
      </header>
      <div className="aci-score-inline-list">
        {topRows.map((row, index) => {
          const valueScore = Number(row.modules?.value?.score || 0);
          return (
            <article key={row.variantProfileKey || row.variantFullName || index}>
              <b>{index + 1}</b>
              <span>
                <strong>{row.variantFullName || row.variantName || `Option ${index + 1}`}</strong>
                <small>{asArray(row.strengths).slice(0, 2).join(" · ") || "Balanced value signal"}</small>
              </span>
              <em>
                {formatPrice(row.referenceExShowroomPrice)}
                {valueScore ? <small>{Math.round(valueScore)} value</small> : null}
              </em>
            </article>
          );
        })}
      </div>
      <button
        type="button"
        className="aci-score-inline-open"
        aria-expanded={expanded}
        onClick={() => setExpanded((visible) => !visible)}
      >
        <span>{expanded ? "Show the top three" : `Show ${Math.max(0, rows.length - 3)} more value picks`}</span>
        <ArrowRight size={15} />
      </button>
    </section>
  );
}
