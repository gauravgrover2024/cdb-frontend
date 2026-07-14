import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
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
  const compact = (number) => Number(number.toFixed(2)).toString();
  if (amount >= 10000000) return `₹${compact(amount / 10000000)}Cr`;
  if (amount >= 100000) return `₹${compact(amount / 100000)}L`;
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

    const capabilityCount = [featureBlock, priceBlocks.length, colorBlocks.length].filter(Boolean).length;
    return {
      models,
      featureBlock,
      title: models.length >= 2 ? `${models[0].name} vs ${models[1].name}` : "Compare cars",
      subtitle: capabilityCount > 1
        ? "Prices, features and colours together."
        : "Current prices shown side by side.",
    };
  }, [blocks]);

  if (presentation.models.length < 2) return null;

  return (
    <section className="aci-compound-card" aria-label="Complete comparison answer">
      <header className="aci-vehicle-card-header">
        <div>
          <span>Side-by-side</span>
          <h3>{presentation.title}</h3>
          <p>{presentation.subtitle}</p>
        </div>
      </header>
      <div className="aci-compound-grid">
        {presentation.models.map((model, index) => (
          <article className="aci-compound-model aci-vehicle-choice-card" key={modelKey(model.name)}>
            <div className="aci-compound-model-visual">
              <CarVisual imageUrl={model.imageUrl} name={model.name} />
            </div>
            <div className="aci-compound-model-copy">
              <span className="aci-vehicle-choice-rank">Option {index + 1}</span>
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
    .slice(0, 8);

const recommendationName = (row = {}) =>
  clean(
    row.fullModel ||
      row.displayName ||
      [row.make || row.brand, row.model].filter(Boolean).join(" ") ||
      row.model,
  );

const vehicleSource = (row = {}) => row.vehicle || row.selectedVehicle || row;

const useLiveVehicleMap = (rows = [], city = "New Delhi") => {
  const [liveVehicles, setLiveVehicles] = useState({});

  useEffect(() => {
    let active = true;
    const missing = rows.filter((row) => {
      const source = vehicleSource(row);
      return !row.imageUrl && !row.normalizedImageUrl && !source.imageUrl && !source.normalizedImageUrl && source.model;
    });
    if (!missing.length) return undefined;

    Promise.all(
      missing.map(async (row) => {
        const source = vehicleSource(row);
        const snapshot = await fetchAciVehicleLiveSnapshot({
          make: source.make || source.brand || row.make || row.brand,
          model: source.model || row.model,
          city: source.city || row.city || city,
        }).catch(() => null);
        return [modelKey(recommendationName(source) || recommendationName(row)), snapshot?.vehicle || null];
      }),
    ).then((entries) => {
      if (!active) return;
      setLiveVehicles((current) => ({
        ...current,
        ...Object.fromEntries(entries.filter(([, vehicle]) => vehicle)),
      }));
    });

    return () => {
      active = false;
    };
  }, [city, rows]);

  return liveVehicles;
};

export function AciV2RecommendationInlineCard({ message = {}, widget = {}, onAction }) {
  const rows = useMemo(() => recommendationRows(message, widget), [message, widget]);
  const trackRef = useRef(null);
  const [carousel, setCarousel] = useState({ index: 0, visible: 3, max: 0 });
  const liveVehicles = useLiveVehicleMap(rows, widget.city || "New Delhi");

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const update = () => {
      const first = track.querySelector(".aci-recommendation-model");
      if (!first) return;
      const styles = window.getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
      const step = first.getBoundingClientRect().width + gap;
      if (!step) return;
      const visible = Math.max(1, Math.round((track.clientWidth + gap) / step));
      const max = Math.max(0, rows.length - visible);
      setCarousel((current) => ({ ...current, visible, max, index: Math.min(current.index, max) }));
    };
    update();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(track);
    return () => observer?.disconnect();
  }, [rows.length]);

  if (!rows.length) return null;
  const filters = widget.filters || widget.data?.filters || message.filters || {};
  const feature = clean(widget.featureName || widget.feature || widget.data?.featureName);
  const budget = Number(filters.budgetMax || filters.maxBudget || filters.maxPrice || 0);
  const bodyLabel = /suv/i.test(filters.bodyType || filters.bodyStyle || "") ? "SUVs" : "cars";
  const title = `${rows.length} ${bodyLabel}${feature ? ` with ${feature}` : ""}${budget ? ` under ${formatPrice(budget)}` : ""}`;

  const measureCarousel = () => {
    const track = trackRef.current;
    const first = track?.querySelector(".aci-recommendation-model");
    if (!track || !first) return { step: 0, visible: 1, max: 0 };
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const step = first.getBoundingClientRect().width + gap;
    const visible = Math.max(1, Math.round((track.clientWidth + gap) / step));
    return { step, visible, max: Math.max(0, rows.length - visible) };
  };

  const syncCarousel = () => {
    const track = trackRef.current;
    const metrics = measureCarousel();
    if (!track || !metrics.step) return;
    setCarousel({
      index: Math.min(metrics.max, Math.max(0, Math.round(track.scrollLeft / metrics.step))),
      visible: metrics.visible,
      max: metrics.max,
    });
  };

  const moveCarousel = (direction) => {
    const track = trackRef.current;
    const metrics = measureCarousel();
    if (!track || !metrics.step) return;
    const next = Math.min(metrics.max, Math.max(0, carousel.index + direction));
    track.scrollTo({ left: next * metrics.step, behavior: "smooth" });
    setCarousel({ index: next, visible: metrics.visible, max: metrics.max });
  };

  return (
    <section className="aci-recommendation-card" aria-label="Recommended cars">
      <header className="aci-vehicle-card-header">
        <div>
          <span>Shortlist</span>
          <h3>{title}</h3>
          <p>{feature ? `Each price starts at the first variant with ${feature}.` : "Current new-car options, sorted by starting price."}</p>
        </div>
        {rows.length > carousel.visible ? (
          <div className="aci-carousel-controls">
            <small>{carousel.index + 1}–{Math.min(rows.length, carousel.index + carousel.visible)} of {rows.length}</small>
            <button type="button" onClick={() => moveCarousel(-1)} disabled={carousel.index === 0} aria-label="Previous car">
              <ChevronLeft size={17} />
            </button>
            <button type="button" onClick={() => moveCarousel(1)} disabled={carousel.index >= carousel.max} aria-label="Next car">
              <ChevronRight size={17} />
            </button>
          </div>
        ) : null}
      </header>
      <div
        className="aci-recommendation-grid"
        ref={trackRef}
        onScroll={syncCarousel}
        onTouchEnd={syncCarousel}
      >
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
            <article className="aci-recommendation-model aci-vehicle-choice-card" key={modelKey(name) || index}>
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
              {variant ? <p>{feature ? `${feature} starts from ${variant}` : `Starts with ${variant}`}</p> : null}
              <button
                type="button"
                onClick={() => onAction?.({
                  id: `recommendation-variants-${modelKey(name)}`,
                  label: `See ${row.model || name} variants`,
                  query: feature
                    ? `Show ${name} variants with ${feature}`
                    : `Show ${name} variants${budget ? ` under ${formatPrice(budget)}` : ""}`,
                  type: "ask",
                  vehicle: {
                    ...liveVehicle,
                    make: row.make || row.brand,
                    model: row.model,
                    fullModel: name,
                  },
                })}
              >
                <span>{feature ? "See matching variants" : "View variants"}</span><ArrowRight size={14} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const comparisonName = (row = {}) => {
  const source = vehicleSource(row);
  return clean(
    source.fullModel ||
      source.displayName ||
      row.fullModel ||
      row.displayName ||
      [source.make || source.brand || row.make || row.brand, source.model || row.model].filter(Boolean).join(" ") ||
      source.model ||
      row.model,
  );
};

export function AciV2ComparisonInlineCard({ message = {}, widget = {}, onOpen, onAction }) {
  const rows = useMemo(
    () => asArray(widget.rows || message.rows || widget.items || message.items).slice(0, 2),
    [message, widget],
  );
  const liveVehicles = useLiveVehicleMap(rows, widget.city || "New Delhi");
  if (rows.length < 2) return null;

  const names = rows.map(comparisonName);
  return (
    <section className="aci-comparison-card" aria-label={`${names[0]} and ${names[1]} comparison`}>
      <header className="aci-vehicle-card-header">
        <div>
          <span>Like-for-like</span>
          <h3>{names[0]} vs {names[1]}</h3>
          <p>Matched fuel and gearbox wherever the current variants allow.</p>
        </div>
      </header>
      <div className="aci-comparison-grid">
        {rows.map((row, index) => {
          const source = vehicleSource(row);
          const name = names[index];
          const liveVehicle = liveVehicles[modelKey(name)] || {};
          const imageUrl = source.imageUrl || source.normalizedImageUrl || row.imageUrl || row.normalizedImageUrl || liveVehicle.imageUrl || liveVehicle.normalizedImageUrl;
          const variant = clean(row.variantName || row.variant || source.variant || source.variantName);
          const fuel = clean(row.fuelType || row.fuel || source.fuelType || source.fuel);
          const transmission = clean(row.transmission || source.transmission);
          const price = Number(row.onRoadPrice || row.exShowroomPrice || row.price || 0);
          return (
            <article className="aci-comparison-model aci-vehicle-choice-card" key={modelKey(name) || index}>
              <div className="aci-comparison-model-visual">
                <CarVisual imageUrl={imageUrl} name={name} />
              </div>
              <span className="aci-vehicle-choice-rank">Option {index + 1}</span>
              <h4>{name}</h4>
              {variant ? <p className="aci-comparison-variant">{variant}</p> : null}
              <div className="aci-comparison-facts">
                {price ? <strong>{formatPrice(price)} <small>{row.onRoadPrice ? "on-road" : "ex-showroom"}</small></strong> : null}
                {[fuel, transmission].filter(Boolean).length ? <span>{[fuel, transmission].filter(Boolean).join(" · ")}</span> : null}
              </div>
              <button type="button" onClick={() => onAction?.({
                id: `comparison-variants-${modelKey(name)}`,
                label: `View ${source.model || row.model || name} variants`,
                query: `Show ${name} variants`,
                type: "ask",
                vehicle: { ...liveVehicle, ...source, fullModel: name },
              })}>
                <span>View variants</span><ArrowRight size={14} />
              </button>
            </article>
          );
        })}
      </div>
      <button type="button" className="aci-comparison-open" onClick={() => onOpen?.(message)}>
        <span>Open full comparison</span><ArrowRight size={15} />
      </button>
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
