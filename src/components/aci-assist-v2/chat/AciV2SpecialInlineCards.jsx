import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CarFront,
  Check,
  IndianRupee,
  ListChecks,
  Palette,
  Sparkles,
  Trophy,
} from "lucide-react";
import { fetchAciVehicleLiveSnapshot } from "../services/aciAssistV2Api";

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
      fetchpriority="high"
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
        colorCount: colorBlock ? blockRows(colorBlock).length : null,
        availableCount: featureBlock ? Number(featureModel.availableCount || 0) : null,
        totalVariants: featureBlock
          ? Number(featureModel.totalVariants || featureModel.checkedVariants || 0)
          : null,
        featureLabel: featureBlock
          ? clean(featureRows[0]?.displayName || featureRows[0]?.feature || "Requested feature")
          : "",
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
                {model.exShowroom ? (
                  <span><IndianRupee size={14} /><b>{formatPrice(model.exShowroom)}</b><small>ex-showroom from</small></span>
                ) : null}
                {model.totalVariants ? (
                  <span><Sparkles size={14} /><b>{model.availableCount}/{model.totalVariants}</b><small>{model.featureLabel} variants</small></span>
                ) : null}
                {model.colorCount ? (
                  <span><Palette size={14} /><b>{model.colorCount}</b><small>colours</small></span>
                ) : null}
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

const recommendationRows = (message = {}, widget = {}) =>
  asArray(widget.rows || message.rows || widget.items || message.items)
    .filter((row) => clean(row.fullModel || row.displayName || row.model))
    .slice(0, 3);

const recommendationName = (row = {}) =>
  clean(
    row.fullModel ||
      row.displayName ||
      [row.make || row.brand, row.model].filter(Boolean).join(" ") ||
      row.model,
  );

export function AciV2RecommendationInlineCard({ message = {}, widget = {}, onAction }) {
  const rows = useMemo(() => recommendationRows(message, widget), [message, widget]);
  const [liveVehicles, setLiveVehicles] = useState({});

  useEffect(() => {
    let active = true;
    const missing = rows.filter(
      (row) => !row.imageUrl && !row.normalizedImageUrl && row.model,
    );
    if (!missing.length) return undefined;

    Promise.all(
      missing.map(async (row) => {
        const snapshot = await fetchAciVehicleLiveSnapshot({
          make: row.make || row.brand,
          model: row.model,
          city: row.city || widget.city || "New Delhi",
        }).catch(() => null);
        return [modelKey(recommendationName(row)), snapshot?.vehicle || null];
      }),
    ).then((entries) => {
      if (!active) return;
      setLiveVehicles(Object.fromEntries(entries.filter(([, vehicle]) => vehicle)));
    });

    return () => {
      active = false;
    };
  }, [rows, widget.city]);

  if (!rows.length) return null;
  const feature = clean(
    widget.featureName || widget.feature || widget.data?.featureName || "requested features",
  );

  return (
    <section className="aci-recommendation-card" aria-label="Recommended cars">
      <div className="aci-recommendation-grid">
        {rows.map((row, index) => {
          const name = recommendationName(row);
          const liveVehicle = liveVehicles[modelKey(name)] || {};
          const imageUrl =
            row.imageUrl || row.normalizedImageUrl || liveVehicle.imageUrl || liveVehicle.normalizedImageUrl;
          const price =
            row.startsFromPrice || row.bestUnderBudgetPrice || row.exShowroomPrice;
          const priceLabel = row.startsFromPriceLabel || formatPrice(price);
          const variant = clean(row.startsFromVariant || row.bestUnderBudgetVariant || row.variant);

          return (
            <article className="aci-recommendation-model" key={modelKey(name) || index}>
              <div className="aci-recommendation-visual">
                {imageUrl ? (
                  <CarVisual imageUrl={imageUrl} name={name} />
                ) : (
                  <CarFront size={34} strokeWidth={1.5} aria-hidden="true" />
                )}
              </div>
              <span className="aci-recommendation-rank">{index === 0 ? "Start here" : `Option ${index + 1}`}</span>
              <h4>{name}</h4>
              {priceLabel ? <strong>{priceLabel} <small>ex-showroom</small></strong> : null}
              {variant ? <p>{feature} starts from {variant}</p> : null}
              <button
                type="button"
                onClick={() => onAction?.({
                  id: `recommendation-variants-${modelKey(name)}`,
                  label: `See ${row.model || name} variants`,
                  query: `Show ${name} variants with ${feature}`,
                  type: "ask",
                  vehicle: {
                    ...liveVehicle,
                    make: row.make || row.brand,
                    model: row.model,
                    fullModel: name,
                  },
                })}
              >
                <span>See matching variants</span><ArrowRight size={14} />
              </button>
            </article>
          );
        })}
      </div>
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
