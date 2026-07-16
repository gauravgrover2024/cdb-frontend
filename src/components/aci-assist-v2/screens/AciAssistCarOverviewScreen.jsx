import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Armchair,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Fuel,
  Gauge,
  IndianRupee,
  Palette,
  Settings2,
  ShieldCheck,
  Sparkles,
  Scale,
  SlidersHorizontal,
  RefreshCw,
} from "lucide-react";

import { ACI_CANVAS_TYPES, ACI_INTENTS } from "../shared/aciV2Constants";
import { makeAciAction } from "../data/homeScreenData";
import {
  AciComposer,
  AciVehicleVisual,
  emitAciAction,
  fadeUp,
  stagger,
} from "../shared/AciAssistShared";
import { buildVehicleContextPatch } from "../context/aciV2ContextManager";
import {
  fetchAciSimilarVehicles,
  fetchAciVehicleHighlights,
  fetchAciVehicleLiveSnapshot,
} from "../services/aciAssistV2Api";

const compact = (value) => String(value || "").trim();
const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const firstList = (...values) =>
  values.map(toArray).find((value) => value.length) || [];
const firstPresent = (...values) =>
  values.find((value) => compact(value).length > 0) || "";
const hasValue = (value) => compact(value).length > 0;
const isObject = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const mergeVehicleSources = (...sources) => {
  const validSources = sources.filter(isObject);
  const merged = Object.assign({}, ...validSources);
  const arrayFromLastSource = (key) =>
    [...validSources]
      .reverse()
      .map((source) => source?.[key])
      .find((value) => Array.isArray(value) && value.length) || [];

  const variants = arrayFromLastSource("variants").map((variant) => ({
    ...variant,
    name: firstPresent(variant?.name, variant?.variant),
    variant: firstPresent(variant?.variant, variant?.name),
  }));
  const colors = arrayFromLastSource("colors").filter((color) => {
    const name = compact(
      color?.name || color?.colorName || color?.label || color?.title,
    ).toLowerCase();
    const image = firstPresent(
      color?.displayNormalizedImageUrl,
      color?.normalizedImageUrl,
      color?.imageUrl,
      color?.image,
    );

    return Boolean(
      name &&
      !/^(display|default|image|exterior|colour|color|gallery)$/i.test(name) &&
      image,
    );
  });
  const fuels = [
    ...new Set(
      variants.map((variant) => compact(variant.fuel)).filter(Boolean),
    ),
  ];
  const transmissions = [
    ...new Set(
      variants.map((variant) => compact(variant.transmission)).filter(Boolean),
    ),
  ];
  const make = firstPresent(merged.make, merged.brand);
  const model = firstPresent(merged.model, merged.name);
  const imageUrl = firstPresent(
    merged.heroImageUrl,
    merged.displayNormalizedImageUrl,
    merged.defaultNormalizedImageUrl,
    merged.normalizedImageUrl,
    merged.imageUrl,
    merged.image,
  );

  return {
    ...merged,
    make,
    brand: firstPresent(merged.brand, make),
    model,
    displayName: firstPresent(
      merged.displayName,
      merged.fullModel,
      [make, model].filter(Boolean).join(" "),
    ),
    fullModel: firstPresent(
      merged.fullModel,
      [make, model].filter(Boolean).join(" "),
    ),
    imageUrl,
    heroImageUrl: firstPresent(merged.heroImageUrl, imageUrl),
    variants,
    colors,
    variantCount: merged.variantCount || variants.length || undefined,
    fuelText: firstPresent(merged.fuelText, fuels.join(" / ")),
    transmissionText: firstPresent(
      merged.transmissionText,
      transmissions.join(" / "),
    ),
  };
};

const getVehicleModel = (vehicle = {}) =>
  firstPresent(vehicle.model, vehicle.name, vehicle.displayName, "this car");

const getVehicleDisplayName = (vehicle = {}) =>
  firstPresent(
    vehicle.displayName,
    [vehicle.make || vehicle.brand, vehicle.model].filter(Boolean).join(" "),
    vehicle.model,
    "Selected car",
  );

const getVehicleId = (vehicle = {}) =>
  firstPresent(
    vehicle.id,
    vehicle._id,
    vehicle.slug,
    getVehicleDisplayName(vehicle),
  );

const formatCityName = (value) =>
  compact(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getVariantDisplayName = (variant = {}, vehicle = {}) => {
  const rawName = firstPresent(variant.name, variant.variant, "Variant");
  const prefixes = [
    getVehicleDisplayName(vehicle),
    [vehicle.make || vehicle.brand, vehicle.model].filter(Boolean).join(" "),
    vehicle.model,
  ]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);

  return (
    prefixes.reduce((name, prefix) => {
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return name.replace(new RegExp(`^${escaped}\\s+`, "i"), "").trim();
    }, rawName) || rawName
  );
};

const getCanvas = (key, fallback) => ACI_CANVAS_TYPES?.[key] || fallback;
const getIntent = (key, fallback) => ACI_INTENTS?.[key] || fallback;
const researchTopicForCanvas = (canvasType = "") => {
  const value = compact(canvasType).toLowerCase();
  if (/price/.test(value)) return "prices";
  if (/color|colour/.test(value)) return "colors";
  if (/emi|finance/.test(value)) return "emi";
  if (/feature/.test(value)) return "features";
  if (/compare|comparison|recommendation|similar/.test(value)) {
    return "comparison";
  }
  if (/quotation|quote|lead/.test(value)) return "quotation";
  return "overview";
};

const buildContextPatch = (vehicle = {}, extra = {}) => ({
  ...buildVehicleContextPatch({
    vehicle,
    variant: Object.prototype.hasOwnProperty.call(extra, "anchorVariant")
      ? extra.anchorVariant
      : extra.variant,
  }),
  ...extra,
});

const actionFor = ({
  id,
  label,
  query,
  intent,
  canvasType,
  vehicle,
  type = "open_canvas",
  payload = {},
}) =>
  makeAciAction({
    id,
    label,
    query,
    type,
    intent,
    canvasType,
    vehicle,
    contextPatch: buildContextPatch(vehicle),
    payload: {
      ...payload,
      directCanvas: true,
      researchTopic:
        payload.researchTopic || researchTopicForCanvas(canvasType),
    },
  });

const priceListAction = (vehicle = {}) =>
  actionFor({
    id: `${getVehicleId(vehicle)}-pricelist`,
    label: "Price list",
    query: `${getVehicleModel(vehicle)} price list`,
    intent: getIntent("PRICELIST", "vehicle_pricelist"),
    canvasType: getCanvas("PRICELIST", "pricelist_canvas"),
    vehicle,
  });

const emiAction = (vehicle = {}) =>
  actionFor({
    id: `${getVehicleId(vehicle)}-emi`,
    label: "EMI",
    query: `${getVehicleModel(vehicle)} EMI calculator`,
    intent: getIntent("EMI", "vehicle_emi_calculator"),
    canvasType: getCanvas("EMI", "emi_calculator_canvas"),
    vehicle,
  });

const compareAction = (vehicle = {}) =>
  actionFor({
    id: `${getVehicleId(vehicle)}-compare`,
    label: "Compare",
    query: vehicle.compareWith
      ? `Compare ${getVehicleModel(vehicle)} with ${vehicle.compareWith.model || vehicle.compareWith.displayName}`
      : `Find cars similar to ${getVehicleModel(vehicle)}`,
    intent: vehicle.compareWith
      ? getIntent("COMPARISON", "vehicle_comparison")
      : getIntent("RECOMMENDATIONS", "vehicle_recommendations"),
    canvasType: vehicle.compareWith
      ? getCanvas("COMPARISON", "comparison_canvas")
      : getCanvas("RECOMMENDATION", "recommendation_results_canvas"),
    vehicle,
  });

const colorsAction = (vehicle = {}) =>
  actionFor({
    id: `${getVehicleId(vehicle)}-colors`,
    label: "Colors",
    query: `Show colors of ${getVehicleModel(vehicle)}`,
    intent: getIntent("COLORS", "vehicle_colors"),
    canvasType: getCanvas("COLORS", "color_studio_canvas"),
    vehicle,
  });

const featuresAction = (vehicle = {}) =>
  actionFor({
    id: `${getVehicleId(vehicle)}-features`,
    label: "Features",
    query: `Show features of ${getVehicleModel(vehicle)}`,
    intent: getIntent("FEATURES", "vehicle_feature_discovery"),
    canvasType: getCanvas("FEATURES", "features_canvas"),
    vehicle,
  });

const quotationAction = (vehicle = {}) =>
  actionFor({
    id: `${getVehicleId(vehicle)}-quotation`,
    label: "Get quotation",
    query: `Get best quotation for ${getVehicleModel(vehicle)}`,
    intent: getIntent("QUOTATION", "aci_new_car_quotation"),
    canvasType: getCanvas("QUOTATION", "aci_quotation_canvas"),
    vehicle,
  });

const rivalsAction = (vehicle = {}, rivals = []) =>
  actionFor({
    id: `${getVehicleId(vehicle)}-rivals`,
    label: "Find similar cars",
    query: `Suggest cars similar to ${getVehicleModel(vehicle)}`,
    intent: getIntent("RECOMMENDATIONS", "vehicle_recommendations"),
    canvasType: getCanvas("RECOMMENDATION", "recommendation_results_canvas"),
    vehicle,
    payload: rivals.length
      ? {
          rows: rivals,
          widget: {
            rows: rivals,
            resultMode: "rivals",
            anchorVehicle: vehicle,
            initialSortDirection: "relevance",
          },
        }
      : {},
  });

const getVehicleResearch = (researchByVehicle = {}, vehicle = {}) => {
  const directKeys = [
    getVehicleId(vehicle),
    [vehicle.make || vehicle.brand, vehicle.model].filter(Boolean).join(" "),
    vehicle.model,
  ]
    .map((value) =>
      compact(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
    )
    .filter(Boolean);

  for (const [key, record] of Object.entries(researchByVehicle || {})) {
    const normalizedKey = compact(key)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    if (directKeys.includes(normalizedKey)) return record;

    const storedVehicle = record?.vehicle || {};
    const sameModel =
      compact(storedVehicle.model).toLowerCase() ===
      compact(vehicle.model).toLowerCase();
    const sameMake =
      !compact(storedVehicle.make || storedVehicle.brand) ||
      compact(storedVehicle.make || storedVehicle.brand).toLowerCase() ===
        compact(vehicle.make || vehicle.brand).toLowerCase();
    if (sameModel && sameMake) return record;
  }

  return {};
};

const vehicleChips = (vehicle = {}) =>
  [
    vehicle.variantCount ? `${vehicle.variantCount} variants` : "",
    vehicle.fuelText,
    vehicle.transmissionText,
  ].filter(hasValue);

const formatVariantMeta = (variant = {}) =>
  [variant.fuel, variant.transmission].filter(hasValue).join(" · ");

const getVariantPrice = (variant = {}) =>
  firstPresent(
    variant.price,
    variant.onRoadPrice,
    variant.onRoad,
    variant.exShowroomPrice,
    variant.exShowroom,
    variant.priceText,
  );

const parseVariantPrice = (value) => {
  const text = compact(value).toLowerCase().replace(/,/g, "");
  const amount = Number.parseFloat(text.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount)) return Number.POSITIVE_INFINITY;
  if (/\bcr|crore/.test(text)) return amount * 10000000;
  if (/\bl|lakh/.test(text)) return amount * 100000;
  return amount;
};

const selectRangeVariants = (variants = []) => {
  const unique = [];
  const seen = new Set();

  toArray(variants).forEach((variant, sourceIndex) => {
    const identity = compact(
      firstPresent(variant.id, variant._id, variant.name, variant.variant),
    ).toLowerCase();
    if (!identity || seen.has(identity)) return;
    seen.add(identity);
    unique.push({
      variant,
      sourceIndex,
      sortPrice: parseVariantPrice(getVariantPrice(variant)),
    });
  });

  const priced = unique.filter((item) => Number.isFinite(item.sortPrice));
  const ordered = (
    priced.length >= Math.min(unique.length, 3) ? priced : unique
  )
    .slice()
    .sort((left, right) => {
      const leftHasPrice = Number.isFinite(left.sortPrice);
      const rightHasPrice = Number.isFinite(right.sortPrice);
      if (leftHasPrice && rightHasPrice && left.sortPrice !== right.sortPrice) {
        return left.sortPrice - right.sortPrice;
      }
      if (leftHasPrice !== rightHasPrice) return leftHasPrice ? -1 : 1;
      return left.sourceIndex - right.sourceIndex;
    });

  if (!ordered.length) return [];

  const selectedIndexes = [
    0,
    Math.floor((ordered.length - 1) / 2),
    ordered.length - 1,
  ];
  const tiers = ["Base", "Mid", "Top"];
  const selected = [];

  selectedIndexes.forEach((orderedIndex, tierIndex) => {
    const item = ordered[orderedIndex];
    if (!item || selected.some((entry) => entry.variant === item.variant))
      return;
    selected.push({ ...item.variant, _aciTier: tiers[tierIndex] });
  });

  return selected;
};

const getColorImage = (color = {}) =>
  firstPresent(
    color.displayNormalizedImageUrl,
    color.normalizedImageUrl,
    color.cleanImageUrl,
    color.carImageUrl,
    color.imageUrl,
    color.image,
  );

const flattenFeatureGroups = (groups = []) =>
  toArray(groups).flatMap((group) =>
    firstList(group?.features, group?.items, group?.specs, group?.values),
  );

const normalizeHighlight = (item, sourcePriority = 0) => {
  if (typeof item === "string") {
    const label = compact(item);
    return label ? { label, value: "", sourcePriority } : null;
  }
  if (!isObject(item)) return null;

  const availability = firstPresent(
    item.available,
    item.isAvailable,
    item.availability,
    item.status,
  );
  if (
    availability === false ||
    /^(no|false|not available|unavailable|not listed)$/i.test(
      compact(availability),
    )
  ) {
    return null;
  }

  const label = firstPresent(
    item.label,
    item.title,
    item.name,
    item.feature,
    item.featureName,
    item.spec,
    item.key,
  );
  const value = firstPresent(
    item.value,
    item.displayValue,
    item.text,
    item.detail,
    item.description,
    item.summary,
  );
  if (!label) return null;

  return {
    label,
    value: /^(yes|true|available)$/i.test(compact(value)) ? "" : value,
    category: firstPresent(item.category, item.group, item.section),
    sourcePriority,
  };
};

const highlightScore = ({ label = "", value = "", sourcePriority = 0 }) => {
  const text = `${label} ${value}`.toLowerCase();
  const weightedTerms = [
    [/(forward collision|blind spot|lane keep|adaptive cruise|adas)/, 95],
    [/(360 view camera|360 camera)/, 90],
    [/(no\. of airbags|\bairbags?\b)/, 86],
    [/(panoramic)/, 88],
    [/(sunroof)/, 82],
    [/(ventilated)/, 78],
    [
      /(touchscreen|wireless phone|apple carplay|android auto|bose|speakers?)/,
      72,
    ],
    [/(electronic stability|anti-lock|\babs\b|tpms|hill assist)/, 68],
    [/(cruise control|climate control)/, 60],
    [/(mileage|engine displacement|max power|max torque)/, 54],
    [/(boot space|ground clearance|seating capacity)/, 48],
  ];
  const relevance = weightedTerms.reduce(
    (score, [pattern, weight]) =>
      pattern.test(text) ? Math.max(score, weight) : score,
    0,
  );
  return sourcePriority * 100 + relevance;
};

const getVehicleHighlights = (vehicle = {}) => {
  const featureCandidates = [
    ...toArray(vehicle.highlights).map((item) => [item, 4]),
    ...toArray(vehicle.quickSpecs).map((item) => [item, 3]),
    ...flattenFeatureGroups(vehicle.featureGroups).map((item) => [item, 2]),
    ...toArray(vehicle.features).map((item) => [item, 1]),
  ]
    .map(([item, priority]) => normalizeHighlight(item, priority))
    .filter(Boolean)
    .sort((left, right) => highlightScore(right) - highlightScore(left));

  const facts = [
    vehicle.fuelText
      ? { label: "Fuel choices", value: vehicle.fuelText, sourcePriority: 0 }
      : null,
    vehicle.transmissionText
      ? {
          label: "Transmission",
          value: vehicle.transmissionText,
          sourcePriority: 0,
        }
      : null,
    vehicle.variantCount
      ? {
          label: "Variants",
          value: `${vehicle.variantCount} current options`,
          sourcePriority: 0,
        }
      : null,
    toArray(vehicle.colors).length
      ? {
          label: "Exterior colors",
          value: `${toArray(vehicle.colors).length} available`,
          sourcePriority: 0,
        }
      : null,
  ].filter(Boolean);

  const seen = new Set();
  const featureFamilies = new Set();
  const categoryCounts = new Map();
  return [...featureCandidates, ...facts]
    .filter((item) => {
      const key = compact(item.label).toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);

      const family = [
        ["sunroof", /sunroof|panoramic/],
        ["camera", /camera/],
        ["airbags", /airbags?/],
        ["touchscreen", /touchscreen/],
        ["cruise", /cruise/],
      ].find(([, pattern]) => pattern.test(`${key} ${item.value}`))?.[0];
      if (family && featureFamilies.has(family)) return false;
      if (family) featureFamilies.add(family);

      const category = compact(item.category).toLowerCase();
      if (category && categoryCounts.get(category)) return false;
      if (category) categoryCounts.set(category, 1);
      return true;
    })
    .slice(0, 6);
};

function SkeletonLine({ width = "100%" }) {
  return <span className="skeleton-line" style={{ width }} />;
}

function SkeletonCard({ variant = "default" }) {
  return (
    <article className={`skeleton-card ${variant}`}>
      <div className="skeleton-car" />
      <SkeletonLine width="68%" />
      <SkeletonLine width="48%" />
      <SkeletonLine width="76%" />
    </article>
  );
}

function DesktopHero({ vehicle = {}, onAction }) {
  const chips = vehicleChips(vehicle);
  const title = getVehicleDisplayName(vehicle);
  const priceText = firstPresent(
    vehicle.startingOnRoadPrice,
    vehicle.priceRange,
  );
  const exShowroom = vehicle.exShowroomPrice;

  return (
    <motion.section
      className="overview-hero desktop-overview-hero"
      variants={fadeUp}
    >
      <div className="hero-copy">
        <span className="overview-kicker">New car overview</span>

        <h1>{title}</h1>

        <button
          type="button"
          className="hero-subtitle"
          onClick={() =>
            emitAciAction(
              {
                label: "Change city",
                query: `Change city for ${getVehicleModel(vehicle)}`,
                type: "change_city",
                vehicle,
                contextPatch: buildContextPatch(vehicle),
              },
              onAction,
            )
          }
        >
          {firstPresent(
            vehicle.subtitle,
            [
              vehicle.segment,
              vehicle.city ? `${formatCityName(vehicle.city)} prices` : "",
            ]
              .filter(Boolean)
              .join(" · "),
            "New-car overview",
          )}
          <ChevronDown size={16} />
        </button>

        {chips.length ? (
          <div className="hero-chips">
            {chips.map((chip) => (
              <button
                type="button"
                key={chip}
                onClick={() =>
                  emitAciAction(
                    {
                      ...priceListAction(vehicle),
                      label: chip,
                      query: `${getVehicleModel(vehicle)} ${chip}`,
                    },
                    onAction,
                  )
                }
              >
                {chip}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <motion.div
        className="hero-car-stage"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.24 }}
      >
        <AciVehicleVisual
          vehicle={vehicle}
          height={270}
          className="hero-car-photo"
          stage
          stageVariant="hero"
        />
      </motion.div>

      <aside className="price-card">
        <p>Starting on-road price</p>
        {priceText ? (
          <strong>{priceText}</strong>
        ) : (
          <strong className="pending-price">Price loading</strong>
        )}
        {exShowroom ? (
          <span>Ex-showroom: {exShowroom}</span>
        ) : vehicle.city ? (
          <span>{vehicle.city} price range</span>
        ) : null}

        <button
          type="button"
          onClick={() => emitAciAction(priceListAction(vehicle), onAction)}
        >
          View all variants <ChevronRight size={17} />
        </button>

        <div className="price-card-facts">
          {vehicle.variantCount ? (
            <span>
              <b>{vehicle.variantCount}</b> variants
            </span>
          ) : null}
          {vehicle.fuelText ? (
            <span>
              <b>{vehicle.fuelText}</b> fuel options
            </span>
          ) : null}
        </div>
      </aside>
    </motion.section>
  );
}

function OverviewActionBar({ vehicle = {}, onAction, mobile = false }) {
  const actions = [
    {
      icon: IndianRupee,
      label: "Price list",
      action: priceListAction(vehicle),
    },
    { icon: Calculator, label: "Calculate EMI", action: emiAction(vehicle) },
    { icon: Scale, label: "Compare", action: compareAction(vehicle) },
    { icon: Palette, label: "Colors", action: colorsAction(vehicle) },
    { icon: Sparkles, label: "Features", action: featuresAction(vehicle) },
    {
      icon: FileText,
      label: "Get quotation",
      action: quotationAction(vehicle),
    },
  ];

  return (
    <motion.nav
      className={`overview-action-bar ${mobile ? "is-mobile" : ""}`}
      aria-label={`${getVehicleModel(vehicle)} research actions`}
      variants={fadeUp}
    >
      <div className="overview-action-heading">
        <span>Explore</span>
        <strong>{getVehicleModel(vehicle)}</strong>
      </div>
      <div className="overview-action-list">
        {actions.map(({ icon: Icon, label, action }) => (
          <button
            type="button"
            key={action.id}
            onClick={() => emitAciAction(action, onAction)}
          >
            <Icon size={17} strokeWidth={2} />
            <span>{label}</span>
            <ChevronRight size={14} strokeWidth={2.25} />
          </button>
        ))}
      </div>
    </motion.nav>
  );
}

function PanelHead({
  title,
  sub,
  action = "View all",
  hideAction = false,
  onAction,
  actionOnClick = null,
}) {
  return (
    <div className="panel-head">
      <div>
        <h3>{title}</h3>
        {sub ? <p>{sub}</p> : null}
      </div>

      {!hideAction ? (
        <button
          type="button"
          onClick={() => {
            if (typeof actionOnClick === "function") {
              actionOnClick();
              return;
            }
            emitAciAction({ label: action }, onAction);
          }}
        >
          {action} <ChevronRight size={14} />
        </button>
      ) : null}
    </div>
  );
}

function EmptyState({ icon: Icon = Sparkles, title, text, action, onAction }) {
  return (
    <div className="overview-empty-state">
      <Icon size={20} />
      <h4>{title}</h4>
      {text ? <p>{text}</p> : null}
      {action ? (
        <button type="button" onClick={() => emitAciAction(action, onAction)}>
          {action.label} <ChevronRight size={14} />
        </button>
      ) : null}
    </div>
  );
}

function ResearchPathPanel({
  vehicle = {},
  onAction,
  mobile = false,
  researchTopics = {},
}) {
  const colors = toArray(vehicle.colors);
  const steps = [
    {
      icon: SlidersHorizontal,
      eyebrow: "Choose a variant",
      title: vehicle.variantCount
        ? `Explore ${vehicle.variantCount} current variants`
        : "Explore the current variants",
      text: "Compare prices, fuel and transmission options.",
      action: priceListAction(vehicle),
    },
    {
      icon: Calculator,
      eyebrow: "Plan the purchase",
      title: "See the monthly EMI",
      text: "Adjust down payment, tenure and interest rate.",
      action: emiAction(vehicle),
    },
    {
      icon: Scale,
      eyebrow: "Check alternatives",
      title: vehicle.compareWith
        ? `Compare with ${getVehicleModel(vehicle.compareWith)}`
        : "Find the closest rivals",
      text: "Compare equivalent choices before deciding.",
      action: vehicle.compareWith
        ? compareAction(vehicle)
        : rivalsAction(vehicle),
    },
    {
      icon: Palette,
      eyebrow: "Personalise it",
      title: `Explore ${colors.length || "available"} colors`,
      text: "See the real car image in each available shade.",
      action: colorsAction(vehicle),
    },
    {
      icon: Sparkles,
      eyebrow: "Check equipment",
      title: "See features that matter",
      text: "Understand what changes across variants.",
      action: featuresAction(vehicle),
    },
    {
      icon: FileText,
      eyebrow: "When you are ready",
      title: "Get a dealer quotation",
      text: "Confirm the exact city price and availability.",
      action: quotationAction(vehicle),
    },
  ];
  const decoratedSteps = steps.map((step) => ({
    ...step,
    topic:
      step.action.payload?.researchTopic ||
      researchTopicForCanvas(step.action.canvasType),
  }));
  const completed = decoratedSteps.filter(
    (step) => researchTopics?.[step.topic]?.completed,
  );
  const pending = decoratedSteps.filter(
    (step) => !researchTopics?.[step.topic]?.completed,
  );
  const visibleSteps = (pending.length ? pending : decoratedSteps).slice(
    0,
    mobile ? 4 : 5,
  );

  return (
    <motion.section
      className={`panel research-path-panel ${mobile ? "mobile-research-path" : ""}`}
      variants={fadeUp}
    >
      <PanelHead
        title={
          completed.length
            ? "Your next best steps"
            : "A clear path to your decision"
        }
        sub={
          completed.length
            ? `Based on ${completed.length} topic${completed.length === 1 ? "" : "s"} you already explored`
            : `Useful next steps for ${getVehicleModel(vehicle)}`
        }
        hideAction
      />

      <div
        className="research-step-list"
        data-count={visibleSteps.length}
        style={{ "--research-step-count": visibleSteps.length }}
      >
        {visibleSteps.map(
          ({ icon: Icon, eyebrow, title, text, action }, index) => (
            <button
              type="button"
              key={action.id}
              onClick={() => emitAciAction(action, onAction)}
            >
              <span className="research-step-index">{index + 1}</span>
              <span className="research-step-icon">
                <Icon size={18} />
              </span>
              <span className="research-step-copy">
                <small>{eyebrow}</small>
                <strong>{title}</strong>
                <em>{text}</em>
              </span>
              <ChevronRight size={17} />
            </button>
          ),
        )}
      </div>

      {completed.length ? (
        <div className="research-complete-row">
          <Check size={14} />
          <span>Researched:</span>
          <strong>{completed.map((step) => step.eyebrow).join(" · ")}</strong>
        </div>
      ) : null}
    </motion.section>
  );
}

function VariantCard({ variant = {}, vehicle = {}, onAction }) {
  const variantName = getVariantDisplayName(variant, vehicle);
  const price = getVariantPrice(variant);
  const meta = formatVariantMeta(variant);
  const priceNote = vehicle.city
    ? `On-road ${formatCityName(vehicle.city)}`
    : variant.sub;
  const tier = firstPresent(variant._aciTier, "Variant");

  return (
    <article className={`variant-card is-${tier.toLowerCase()}`}>
      <button
        type="button"
        className="variant-content"
        onClick={() =>
          emitAciAction(
            {
              label: variantName,
              query: `${getVehicleModel(vehicle)} ${variantName} price`,
              intent: getIntent("PRICELIST", "vehicle_pricelist"),
              canvasType: getCanvas("PRICELIST", "pricelist_canvas"),
              vehicle,
              contextPatch: buildContextPatch(vehicle, {
                anchorVariant: variantName,
              }),
            },
            onAction,
          )
        }
      >
        <span className="variant-tier">{tier}</span>
        <span className="variant-title-row">
          <h4>{variantName}</h4>
          <ChevronRight size={16} />
        </span>
        <span className="variant-detail-row">
          <span>
            {meta ? <p>{meta}</p> : null}
            {priceNote ? <small>{priceNote}</small> : null}
          </span>
          {price ? <strong>{price}</strong> : <strong>Price loading</strong>}
        </span>
      </button>
    </article>
  );
}

function PopularVariantsPanel({ vehicle = {}, onAction, mobile = false }) {
  const variants = toArray(vehicle.variants);
  const visible = selectRangeVariants(variants);
  const colors = useMemo(
    () => toArray(vehicle.colors).filter((color) => getColorImage(color)),
    [vehicle.colors],
  );
  const vehicleKey = getVehicleId(vehicle);
  const [selectedColorId, setSelectedColorId] = useState("");

  useEffect(() => {
    setSelectedColorId(
      firstPresent(colors[0]?.id, colors[0]?._id, colors[0]?.name),
    );
  }, [vehicleKey, colors]);

  const activeColor =
    colors.find(
      (color) =>
        firstPresent(color.id, color._id, color.name) === selectedColorId,
    ) || colors[0];
  const studioImage = firstPresent(
    getColorImage(activeColor),
    vehicle.heroImageUrl,
    vehicle.imageUrl,
  );
  const studioVehicle = {
    ...vehicle,
    imageUrl: studioImage,
    heroImageUrl: studioImage,
  };

  return (
    <motion.section
      className={`panel variants-panel ${mobile ? "mobile-variants-panel" : ""}`}
      variants={fadeUp}
    >
      <PanelHead
        title={`Find your ${getVehicleModel(vehicle)}`}
        action={`View all ${vehicle.variantCount || variants.length || ""}`.trim()}
        actionOnClick={() => emitAciAction(priceListAction(vehicle), onAction)}
        hideAction={!mobile && !variants.length}
        onAction={onAction}
      />

      {visible.length ? (
        <div className="variant-studio">
          <div className="variant-card-grid">
            {visible.map((variant) => (
              <VariantCard
                key={firstPresent(
                  variant.id,
                  variant._id,
                  variant.name,
                  variant.variant,
                )}
                variant={variant}
                vehicle={vehicle}
                onAction={onAction}
              />
            ))}
          </div>

          <div className="variant-studio-visual" aria-live="polite">
            <motion.div
              key={firstPresent(
                activeColor?.id,
                activeColor?.name,
                studioImage,
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <AciVehicleVisual
                vehicle={studioVehicle}
                height={mobile ? 184 : 258}
                className="variant-studio-photo"
                stage
                stageVariant="hero"
              />
            </motion.div>
          </div>

          {colors.length ? (
            <aside className="variant-color-rail">
              <span className="color-rail-kicker">Choose a color</span>
              <strong>
                {firstPresent(activeColor?.name, "Exterior color")}
              </strong>
              <div className="variant-color-swatches">
                {colors.map((color) => {
                  const colorId = firstPresent(color.id, color._id, color.name);
                  const isActive = colorId === selectedColorId;
                  return (
                    <button
                      type="button"
                      key={colorId}
                      className={isActive ? "is-active" : ""}
                      aria-label={`Show ${color.name}`}
                      aria-pressed={isActive}
                      title={color.name}
                      onClick={() => setSelectedColorId(colorId)}
                    >
                      <span
                        style={{ backgroundColor: color.hex || "#cbd5e1" }}
                      />
                      {isActive ? <Check size={12} /> : null}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="view-all-colors"
                onClick={() => emitAciAction(colorsAction(vehicle), onAction)}
              >
                All colors <ChevronRight size={14} />
              </button>
            </aside>
          ) : null}
        </div>
      ) : (
        <div className="variant-skeleton-grid">
          <SkeletonCard variant="vehicle" />
          <SkeletonCard variant="vehicle" />
          <SkeletonCard variant="vehicle" />

          <EmptyState
            title="Variants will appear here"
            text={`Open the price list to load live variants for ${getVehicleModel(vehicle)}.`}
            action={priceListAction(vehicle)}
            onAction={onAction}
          />
        </div>
      )}
    </motion.section>
  );
}

function HighlightsPanel({ vehicle = {}, onAction, mobile = false }) {
  const highlights = getVehicleHighlights(vehicle);
  const icons = [ShieldCheck, Sparkles, Gauge, Armchair, Fuel, Settings2];

  return (
    <motion.section
      className={`panel highlights-panel ${mobile ? "mobile-highlights-panel" : ""}`}
      variants={fadeUp}
    >
      <PanelHead
        title={`${getVehicleModel(vehicle)} highlights`}
        action="Explore features"
        actionOnClick={() => emitAciAction(featuresAction(vehicle), onAction)}
        onAction={onAction}
      />

      {highlights.length ? (
        <div className="highlight-card-grid">
          {highlights.map((highlight, index) => {
            const Icon = icons[index % icons.length];
            return (
              <button
                type="button"
                key={`${highlight.label}-${index}`}
                className={`highlight-card tone-${(index % 6) + 1}`}
                onClick={() => emitAciAction(featuresAction(vehicle), onAction)}
              >
                <span>
                  <Icon size={18} strokeWidth={2} />
                </span>
                <strong>{highlight.label}</strong>
                {highlight.value ? <small>{highlight.value}</small> : null}
                <ChevronRight size={14} />
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Explore the equipment"
          action={featuresAction(vehicle)}
          onAction={onAction}
        />
      )}
    </motion.section>
  );
}

function RivalCard({ vehicle = {}, rival = {}, onAction, priority = false }) {
  const rivalTitle = getVehicleDisplayName(rival);
  const compare = {
    id: `${getVehicleId(vehicle) || vehicle.model}-compare-${rival.model}`,
    label: `Compare with ${rivalTitle}`,
    query: `Compare ${getVehicleDisplayName(vehicle)} with ${rivalTitle}`,
    intent: ACI_INTENTS.COMPARISON,
    canvasType: ACI_CANVAS_TYPES.COMPARISON,
    vehicle: { ...vehicle, compareWith: rival },
    contextPatch: buildContextPatch(vehicle),
    payload: { directCanvas: true, researchTopic: "comparison" },
  };

  return (
    <article className="rival-card">
      <button
        type="button"
        className="rival-overview-button"
        onClick={() => emitAciAction(compare, onAction)}
      >
        <div className="rival-pair-visual">
          <div className="rival-visual is-anchor">
            <AciVehicleVisual
              vehicle={vehicle}
              height={96}
              stage
              stageVariant="compact"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          </div>
          <span className="rival-pair-vs">vs</span>
          <div className="rival-visual is-rival">
            <AciVehicleVisual
              vehicle={rival}
              height={96}
              stage
              stageVariant="compact"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          </div>
        </div>
        <small>Side-by-side</small>
        <strong>
          {getVehicleModel(vehicle)} <span>vs</span> {rival.model}
        </strong>
        <p>
          {rival.model} from{" "}
          <b>
            {rival.exShowroomPrice ||
              rival.startingOnRoadPrice ||
              "Price unavailable"}
          </b>
        </p>
      </button>
      <button
        type="button"
        className="rival-compare-button"
        onClick={() => emitAciAction(compare, onAction)}
      >
        Compare <Scale size={14} />
      </button>
    </article>
  );
}

function RivalsPanel({
  vehicle = {},
  rivals = [],
  rivalsStatus = "idle",
  onAction,
  mobile = false,
}) {
  const viewAllAction = rivalsAction(vehicle, rivals);
  const hasRivals = rivals.length > 0;

  return (
    <motion.section
      className={`panel rivals-panel ${mobile ? "mobile-rivals-panel" : ""}`}
      variants={fadeUp}
    >
      <PanelHead
        title={`Compare with ${getVehicleModel(vehicle)}`}
        action="More comparisons"
        actionOnClick={() => emitAciAction(viewAllAction, onAction)}
      />

      {rivalsStatus === "loading" && !hasRivals ? (
        <div
          className="rival-card-grid is-loading"
          aria-label="Loading similar cars"
        >
          {Array.from({ length: mobile ? 2 : 3 }).map((_, index) => (
            <SkeletonCard key={`rival-loading-${index}`} variant="rival" />
          ))}
        </div>
      ) : hasRivals ? (
        <div className="rival-card-grid" aria-live="polite">
          {rivals.slice(0, mobile ? 5 : 3).map((rival, index) => (
            <RivalCard
              key={`${rival.make}-${rival.model}`}
              vehicle={vehicle}
              rival={rival}
              onAction={onAction}
              priority={index < (mobile ? 2 : 3)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Scale}
          title="Live rivals are still loading"
          text="Open the full list to continue exploring similar cars."
          action={viewAllAction}
          onAction={onAction}
        />
      )}
    </motion.section>
  );
}

function DesktopPage({
  vehicle = {},
  rivals = [],
  rivalsStatus,
  onAction,
  snapshotStatus,
  onRetrySnapshot,
  researchTopics,
}) {
  return (
    <motion.main
      className="desktop-page"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <DesktopHero vehicle={vehicle} onAction={onAction} />
      <OverviewActionBar vehicle={vehicle} onAction={onAction} />
      {snapshotStatus === "error" ? (
        <button
          type="button"
          className="overview-refresh-notice"
          onClick={onRetrySnapshot}
        >
          <RefreshCw size={15} />
          Refresh live vehicle data
        </button>
      ) : null}

      <section className="desktop-grid">
        <PopularVariantsPanel vehicle={vehicle} onAction={onAction} />
        <HighlightsPanel vehicle={vehicle} onAction={onAction} />
        <ResearchPathPanel
          vehicle={vehicle}
          onAction={onAction}
          researchTopics={researchTopics}
        />
        <RivalsPanel
          vehicle={vehicle}
          rivals={rivals}
          rivalsStatus={rivalsStatus}
          onAction={onAction}
        />
      </section>

      <AciComposer
        onAction={onAction}
        selectedVehicle={vehicle}
        placeholder={`Ask about ${getVehicleModel(vehicle)}...`}
      />
    </motion.main>
  );
}

function MobileHero({ vehicle = {}, onAction }) {
  const chips = vehicleChips(vehicle);
  const priceText = firstPresent(
    vehicle.startingOnRoadPrice,
    vehicle.priceRange,
  );
  const exShowroom = vehicle.exShowroomPrice;

  return (
    <motion.section className="mobile-overview-hero" variants={fadeUp}>
      <span className="mobile-memory-chip overview-kicker">
        <ShieldCheck size={15} />
        New car overview
      </span>

      <div className="mobile-hero-grid">
        <div>
          <h1>{getVehicleDisplayName(vehicle)}</h1>
          <p>
            {firstPresent(
              vehicle.subtitle,
              vehicle.city
                ? `${formatCityName(vehicle.city)} prices`
                : "New-car overview",
            )}
          </p>

          {chips.length ? (
            <div className="mobile-hero-chips">
              {chips.map((chip) => (
                <button
                  type="button"
                  key={chip}
                  onClick={() =>
                    emitAciAction(
                      {
                        ...priceListAction(vehicle),
                        label: chip,
                        query: `${getVehicleModel(vehicle)} ${chip}`,
                      },
                      onAction,
                    )
                  }
                >
                  {chip}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mobile-hero-car">
          <AciVehicleVisual
            vehicle={vehicle}
            height={172}
            className="mobile-hero-car-photo"
            stage
            stageVariant="hero"
          />
        </div>
      </div>

      <div className="mobile-price-card">
        <div>
          <p>Starting on-road price</p>
          <strong>{priceText || "Price loading"}</strong>
          {exShowroom ? <span>Ex-showroom: {exShowroom}</span> : null}
        </div>

        <button
          type="button"
          onClick={() => emitAciAction(priceListAction(vehicle), onAction)}
        >
          View all variants <ChevronRight size={18} />
        </button>
      </div>
    </motion.section>
  );
}

function MobilePage({
  vehicle = {},
  rivals = [],
  rivalsStatus,
  onAction,
  snapshotStatus,
  onRetrySnapshot,
  researchTopics,
}) {
  return (
    <motion.main
      className="mobile-page"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <MobileHero vehicle={vehicle} onAction={onAction} />
      <OverviewActionBar vehicle={vehicle} onAction={onAction} mobile />
      {snapshotStatus === "error" ? (
        <button
          type="button"
          className="overview-refresh-notice"
          onClick={onRetrySnapshot}
        >
          <RefreshCw size={15} />
          Refresh live vehicle data
        </button>
      ) : null}
      <PopularVariantsPanel vehicle={vehicle} onAction={onAction} mobile />
      <HighlightsPanel vehicle={vehicle} onAction={onAction} mobile />
      <ResearchPathPanel
        vehicle={vehicle}
        onAction={onAction}
        mobile
        researchTopics={researchTopics}
      />
      <RivalsPanel
        vehicle={vehicle}
        rivals={rivals}
        rivalsStatus={rivalsStatus}
        onAction={onAction}
        mobile
      />

      <AciComposer
        mobile
        onAction={onAction}
        selectedVehicle={vehicle}
        placeholder={`Ask about ${getVehicleModel(vehicle)}...`}
      />
    </motion.main>
  );
}

export default function AciAssistCarOverviewScreen({
  data = {},
  vehicle,
  widget,
  onAction,
}) {
  const [liveSnapshot, setLiveSnapshot] = useState(null);
  const [snapshotStatus, setSnapshotStatus] = useState("idle");
  const [snapshotRequest, setSnapshotRequest] = useState(0);
  const [similarVehicles, setSimilarVehicles] = useState([]);
  const [similarStatus, setSimilarStatus] = useState("idle");
  const [liveFeatures, setLiveFeatures] = useState([]);

  const baseVehicle = useMemo(() => {
    const widgetData = isObject(widget?.data) ? widget.data : {};
    const widgetVehicle =
      widget?.vehicle ||
      widget?.selectedVehicle ||
      widgetData.vehicle ||
      widgetData.selectedVehicle ||
      null;
    const supplemental = {
      variants: toArray(
        widgetData.rows ||
          widget?.rows ||
          widgetData.variants ||
          widget?.variants,
      ),
      colors: toArray(widgetData.colors || widget?.colors),
      highlights: firstList(
        widgetData.highlights,
        widget?.highlights,
        data?.highlights,
      ),
      quickSpecs: firstList(
        widgetData.quickSpecs,
        widget?.quickSpecs,
        data?.quickSpecs,
      ),
      features: firstList(
        widgetData.features,
        widgetData.featureList,
        widget?.features,
        widget?.featureList,
        data?.features,
        data?.featureList,
      ),
      featureGroups: firstList(
        widgetData.featureGroups,
        widgetData.groups,
        widget?.featureGroups,
        widget?.groups,
        data?.featureGroups,
        data?.groups,
      ),
    };

    return mergeVehicleSources(
      data?.selectedVehicle,
      data?.vehicle,
      widgetVehicle,
      supplemental,
      vehicle,
    );
  }, [data, vehicle, widget]);

  const snapshotKey = [
    firstPresent(baseVehicle.make, baseVehicle.brand),
    baseVehicle.model,
    firstPresent(baseVehicle.citySlug, baseVehicle.city, data?.city, "Delhi"),
  ]
    .map(compact)
    .join("|");

  useEffect(() => {
    const make = firstPresent(baseVehicle.make, baseVehicle.brand);
    const model = baseVehicle.model;
    const city = firstPresent(
      baseVehicle.citySlug,
      baseVehicle.city,
      data?.city,
      "Delhi",
    );

    if (!make || !model) {
      setSnapshotStatus("error");
      setLiveSnapshot(null);
      return undefined;
    }

    const controller = new AbortController();
    setSnapshotStatus("loading");

    fetchAciVehicleLiveSnapshot({
      make,
      model,
      city,
      signal: controller.signal,
    })
      .then((snapshot) => {
        if (controller.signal.aborted) return;
        if (!snapshot?.ok || !snapshot.vehicle) {
          setSnapshotStatus("error");
          return;
        }
        setLiveSnapshot(snapshot);
        setSnapshotStatus("ready");
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setSnapshotStatus("error");
      });

    return () => controller.abort();
  }, [baseVehicle, data?.city, snapshotKey, snapshotRequest]);

  const selectedVehicle = useMemo(() => {
    const liveVehicle = liveSnapshot?.vehicle || {};
    const rows = toArray(liveSnapshot?.rows);
    const colors = toArray(liveSnapshot?.colors);
    const merged = mergeVehicleSources(baseVehicle, liveVehicle, {
      variants: rows.length ? rows : liveVehicle.variants,
      colors: colors.length ? colors : liveVehicle.colors,
    });
    return {
      ...merged,
      imageUrl: merged.imageUrl,
      heroImageUrl: firstPresent(merged.heroImageUrl, merged.imageUrl),
    };
  }, [baseVehicle, liveSnapshot]);

  const highlightVariant = useMemo(() => {
    const range = selectRangeVariants(selectedVehicle.variants);
    return range[range.length - 1] || selectedVehicle.variants?.[0] || null;
  }, [selectedVehicle.variants]);
  const highlightKey = [
    firstPresent(selectedVehicle.make, selectedVehicle.brand),
    selectedVehicle.model,
    firstPresent(highlightVariant?.variant, highlightVariant?.name),
  ]
    .map(compact)
    .join("|");

  useEffect(() => {
    const make = firstPresent(selectedVehicle.make, selectedVehicle.brand);
    const model = selectedVehicle.model;
    const variant = firstPresent(
      highlightVariant?.variant,
      highlightVariant?.name,
    );
    setLiveFeatures([]);
    if (!make || !model || !variant) return undefined;

    const controller = new AbortController();
    fetchAciVehicleHighlights({
      make,
      model,
      variant,
      signal: controller.signal,
    })
      .then((features) => {
        if (!controller.signal.aborted) setLiveFeatures(toArray(features));
      })
      .catch((error) => {
        if (error?.name !== "AbortError" && !controller.signal.aborted) {
          setLiveFeatures([]);
        }
      });

    return () => controller.abort();
  }, [highlightKey, highlightVariant, selectedVehicle]);

  const overviewVehicle = useMemo(
    () =>
      mergeVehicleSources(
        selectedVehicle,
        liveFeatures.length ? { features: liveFeatures } : {},
      ),
    [liveFeatures, selectedVehicle],
  );

  const similarVehiclesKey = [
    firstPresent(selectedVehicle.make, selectedVehicle.brand),
    selectedVehicle.model,
    firstPresent(
      selectedVehicle.citySlug,
      selectedVehicle.city,
      data?.city,
      "Delhi",
    ),
    selectedVehicle.exShowroomPrice,
    selectedVehicle.startingOnRoadPrice,
  ]
    .map(compact)
    .join("|");

  useEffect(() => {
    const make = firstPresent(selectedVehicle.make, selectedVehicle.brand);
    const model = selectedVehicle.model;
    const city = firstPresent(
      selectedVehicle.citySlug,
      selectedVehicle.city,
      data?.city,
      "Delhi",
    );

    if (!make || !model || snapshotStatus === "loading") {
      return undefined;
    }

    const controller = new AbortController();
    setSimilarStatus("loading");
    setSimilarVehicles([]);

    fetchAciSimilarVehicles({
      vehicle: selectedVehicle,
      city,
      limit: 8,
      signal: controller.signal,
    })
      .then((rows) => {
        if (controller.signal.aborted) return;
        setSimilarVehicles(toArray(rows));
        setSimilarStatus("ready");
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setSimilarVehicles([]);
        setSimilarStatus("error");
      });

    return () => controller.abort();
  }, [data?.city, selectedVehicle, similarVehiclesKey, snapshotStatus]);

  const researchRecord = useMemo(
    () => getVehicleResearch(data?.researchByVehicle, selectedVehicle),
    [data?.researchByVehicle, selectedVehicle],
  );
  const researchTopics = researchRecord?.topics || {};

  return (
    <div className="aci-page aci-car-overview-page">
      <CarOverviewScreenStyles />
      <CarOverviewRedesignStyles />

      <DesktopPage
        vehicle={overviewVehicle}
        rivals={similarVehicles}
        rivalsStatus={similarStatus}
        onAction={onAction}
        snapshotStatus={snapshotStatus}
        onRetrySnapshot={() => setSnapshotRequest((value) => value + 1)}
        researchTopics={researchTopics}
      />

      <MobilePage
        vehicle={overviewVehicle}
        rivals={similarVehicles}
        rivalsStatus={similarStatus}
        onAction={onAction}
        snapshotStatus={snapshotStatus}
        onRetrySnapshot={() => setSnapshotRequest((value) => value + 1)}
        researchTopics={researchTopics}
      />
    </div>
  );
}

function CarOverviewScreenStyles() {
  return (
    <style>{`
      .aci-car-overview-page {
        min-height: 100vh;
        color: var(--ink);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at 86% -6%, rgba(37,99,235,.08), transparent 28%),
          radial-gradient(circle at 10% 100%, rgba(37,99,235,.055), transparent 30%),
          linear-gradient(180deg, #fff 0%, #f8fbff 100%);
        -webkit-font-smoothing: antialiased;
        padding-bottom: 96px;
      }

      .desktop-page {
        width: min(100%, 1510px);
        margin-inline: auto;
        padding: 10px 40px 24px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .desktop-header {
        width: min(100%, 1510px);
        min-height: 78px;
        margin-inline: auto;
        padding: 16px 40px 10px;
        display: grid;
        grid-template-columns: 260px minmax(360px, 700px) 260px;
        align-items: center;
        gap: 20px;
      }

      .desktop-header-center {
        display: grid;
        place-items: center;
      }

      .desktop-search {
        width: min(100%, 690px);
        height: 58px;
        border: 1px solid #dbe3ef;
        border-radius: 20px;
        background: rgba(255,255,255,.92);
        box-shadow: 0 18px 50px -42px rgba(15,23,42,.35), inset 0 1px 0 #fff;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 14px 0 20px;
      }

      .desktop-search svg { color: #64748b; }

      .desktop-search input {
        min-width: 0;
        flex: 1;
        border: 0;
        outline: none;
        background: transparent;
        color: #0f172a;
        font-size: 14px;
        font-weight: 540;
      }

      .desktop-search button {
        width: 46px;
        height: 32px;
        border: 1px solid #dbe3ef;
        border-radius: 11px;
        background: #fff;
        color: #475569;
        font-size: 13px;
        font-weight: 700;
      }

      .desktop-header-right {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
      }

      .bell-button,
      .plain-button {
        border: 0;
        background: transparent;
        color: #536074;
        display: grid;
        place-items: center;
      }

      .bell-button {
        position: relative;
        width: 42px;
        height: 42px;
      }

      .bell-button i {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--blue);
        border: 2px solid #fff;
      }

      .avatar-button,
      .mobile-avatar {
        border: 1px solid #dbe3ef;
        background: #fff;
        border-radius: 999px;
        padding: 3px;
        overflow: hidden;
        box-shadow: 0 14px 30px -24px rgba(15,23,42,.34);
        display: grid;
        place-items: center;
      }

      .avatar-button { width: 48px; height: 48px; }

      .avatar-button img,
      .mobile-avatar img {
        width: 100%;
        height: 100%;
        border-radius: inherit;
        object-fit: cover;
      }

      .avatar-button span,
      .mobile-avatar span {
        width: 100%;
        height: 100%;
        border-radius: inherit;
        background: radial-gradient(circle at 30% 30%, #fff, #eef4ff 65%, #dbeafe);
      }

      .overview-hero,
      .desktop-action-strip,
      .panel,
      .mobile-overview-hero,
      .mobile-action-block button,
      .mobile-assistant-strip,
      .mobile-stat-strip,
      .mobile-compare-panel {
        border: 1px solid var(--line);
        background: rgba(255,255,255,.94);
        box-shadow: var(--shadow), inset 0 1px 0 #fff;
        backdrop-filter: blur(18px);
      }

      .desktop-overview-hero {
        min-height: 332px;
        border-radius: 30px;
        padding: 38px 42px;
        overflow: hidden;
        display: grid;
        grid-template-columns: minmax(440px, 1.05fr) minmax(430px, .98fr) 270px;
        align-items: center;
        gap: 22px;
        background:
          radial-gradient(circle at 73% 34%, rgba(37,99,235,.09), transparent 28%),
          linear-gradient(135deg, rgba(255,255,255,.98), rgba(242,247,255,.96));
      }

      .hero-copy h1 {
        margin: 0;
        color: #080d25;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(62px, 5.3vw, 90px);
        line-height: .9;
        letter-spacing: -.075em;
        font-weight: 700;
      }

      .hero-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 24px;
      }

      .soft-badge {
        min-height: 34px;
        padding: 0 14px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid #dbe3ef;
        background: #fff;
      }

      .soft-badge.blue { border-color: rgba(37,99,235,.20); background: #f5f8ff; color: var(--blue); }
      .soft-badge.gold { border-color: rgba(183,121,31,.20); background: #fff7ea; color: #b7791f; }
      .soft-badge.save-badge { color: #64748b; }
      .soft-badge.save-badge.is-saved { color: var(--blue); border-color: rgba(37,99,235,.20); background: #f5f8ff; }

      .hero-subtitle {
        margin-top: 20px;
        padding: 0;
        border: 0;
        background: transparent;
        color: #465063;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 17px;
        font-weight: 580;
      }

      .hero-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }

      .hero-chips button {
        height: 40px;
        padding: 0 17px;
        border-radius: 14px;
        border: 1px solid #dbe3ef;
        background: rgba(255,255,255,.88);
        color: #1e293b;
        font-size: 13px;
        font-weight: 700;
        box-shadow: 0 14px 28px -26px rgba(15,23,42,.22);
      }

      .hero-car-stage {
        display: grid;
        place-items: center;
        min-height: 270px;
      }

      .hero-car-photo {
        width: min(520px, 100%);
        height: 270px;
        object-fit: contain;
        filter: drop-shadow(0 22px 18px rgba(15,23,42,.15));
      }

      .price-card {
        padding: 24px 22px;
        border-radius: 24px;
        border: 1px solid #dfe7f2;
        background: linear-gradient(180deg, rgba(255,255,255,.92), rgba(244,248,255,.95));
        box-shadow: 0 18px 44px -34px rgba(15,23,42,.28);
      }

      .price-card p {
        margin: 0;
        color: #667085;
        text-transform: uppercase;
        letter-spacing: .15em;
        font-size: 12px;
        line-height: 1.5;
        font-weight: 750;
      }

      .price-card strong {
        display: block;
        margin-top: 11px;
        color: #07102b;
        font-size: 36px;
        line-height: 1;
        letter-spacing: -.05em;
        font-weight: 800;
      }

      .price-card strong.pending-price { font-size: 25px; letter-spacing: -.04em; }

      .price-card span {
        display: block;
        margin-top: 12px;
        color: #667085;
        font-size: 14px;
        font-weight: 560;
      }

      .price-card button {
        width: 100%;
        height: 48px;
        margin-top: 20px;
        border: 0;
        border-radius: 999px;
        color: #fff;
        background: linear-gradient(135deg, var(--blue), var(--blue-dark));
        box-shadow: 0 18px 36px -20px rgba(37,99,235,.48);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 750;
      }

      .desktop-action-strip {
        min-height: 78px;
        border-radius: 25px;
        padding: 16px 28px;
        display: grid;
        grid-template-columns: 290px 1fr;
        align-items: center;
        gap: 18px;
        background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(245,249,255,.94));
      }

      .desktop-action-strip h2 {
        margin: 0;
        color: #0f172a;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 22px;
        line-height: 1.08;
        letter-spacing: -.04em;
        font-weight: 560;
      }

      .desktop-action-strip > div {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 10px;
      }

      .action-pill {
        height: 42px;
        min-width: 118px;
        padding: 0 15px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 700;
        transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
      }

      .action-pill:hover { transform: translateY(-1px); box-shadow: 0 18px 30px -26px rgba(15,23,42,.28); }
      .action-pill.blue { border: 1px solid rgba(37,99,235,.18); background: rgba(255,255,255,.84); color: var(--blue); }
      .action-pill.gold { border: 1px solid rgba(183,121,31,.24); background: #fff7ea; color: #b7791f; }

      .desktop-grid {
        display: grid;
        grid-template-columns: minmax(340px, .94fr) minmax(470px, 1.22fr) minmax(350px, .92fr);
        gap: 14px;
        align-items: stretch;
      }

      .column {
        min-width: 0;
        display: grid;
        grid-template-rows: 218px 386px;
        gap: 14px;
      }

      .panel {
        border-radius: 24px;
        padding: 18px;
        min-width: 0;
        overflow: hidden;
      }

      .assistant-panel { min-height: 618px; background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(246,250,255,.95)); }
      .highlights-panel, .colors-panel { height: 218px; }
      .variants-panel, .compare-panel { height: 386px; }

      .assistant-title {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 24px;
      }

      .assistant-title svg { color: #c68a2a; fill: currentColor; }

      .assistant-title h3,
      .panel-head h3 {
        font-family: Georgia, "Times New Roman", serif;
        margin: 0;
        color: #10172f;
        font-size: 20px;
        line-height: 1;
        letter-spacing: -.04em;
        font-weight: 560;
      }

      .assistant-title p,
      .panel-head p {
        margin: 6px 0 0;
        color: #64748b;
        font-size: 12px;
        font-weight: 520;
      }

      .panel-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .panel-head button {
        border: 0;
        background: transparent;
        color: var(--blue);
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }

      .chat-row {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        margin-bottom: 14px;
      }

      .chat-bubble {
        border: 1px solid #e3e9f2;
        box-shadow: 0 16px 36px -34px rgba(15,23,42,.28);
        font-size: 12px;
        line-height: 1.55;
        font-weight: 520;
        padding: 14px 16px;
      }

      .chat-bubble.assistant { max-width: 300px; border-radius: 20px; background: rgba(255,255,255,.94); }
      .chat-bubble.assistant span { color: var(--blue); }
      .chat-bubble.user { max-width: 292px; margin: 0 16px 14px auto; border-radius: 20px; color: #1e40af; background: #eef5ff; }

      .assistant-suggestions {
        margin-top: 20px;
        display: flex;
        flex-wrap: nowrap;
        gap: 6px;
        overflow: hidden;
      }

      .assistant-suggestions button {
        height: 32px;
        flex: 1 1 0;
        min-width: 0;
        padding: 0 8px;
        border-radius: 999px;
        border: 1px solid #dce7f7;
        background: rgba(255,255,255,.88);
        color: #244a91;
        font-size: 9.5px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .stats-grid {
        margin-top: 16px;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 10px;
      }

      .stat-card {
        min-height: 98px;
        border-radius: 17px;
        border: 1px solid #ead9b9;
        background: #ffffff;
        color: var(--gold);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 6px;
        box-shadow: 0 14px 32px -28px rgba(15,23,42,.14);
      }

      .stat-card svg { color: var(--gold); }
      .stat-card strong { color: #0f172a; font-size: 15px; line-height: 1; font-weight: 740; }
      .stat-card span { color: #475569; font-size: 9.5px; line-height: 1.15; font-weight: 560; }

      .overview-empty-state {
        grid-column: 1 / -1;
        min-height: 98px;
        border: 1px dashed #dbe3ef;
        border-radius: 18px;
        background: rgba(255,255,255,.72);
        color: #64748b;
        display: grid;
        place-items: center;
        text-align: center;
        padding: 16px;
      }

      .overview-empty-state svg { color: var(--blue); margin-bottom: 6px; }
      .overview-empty-state h4 { margin: 0; color: #0f172a; font-size: 14px; font-weight: 750; }
      .overview-empty-state p { margin: 6px 0 0; font-size: 12px; line-height: 1.35; font-weight: 560; }

      .overview-empty-state button {
        height: 34px;
        margin-top: 7px;
        border: 0;
        border-radius: 999px;
        padding: 0 12px;
        color: #fff;
        background: linear-gradient(135deg, var(--blue), var(--blue-dark));
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        font-weight: 750;
      }

      .variant-card-grid {
        margin-top: 16px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .variant-card {
        min-width: 0;
        border-radius: 20px;
        border: 1px solid #dfe7f2;
        background: #fff;
        box-shadow: 0 16px 40px -38px rgba(15,23,42,.34);
        overflow: hidden;
      }

      .variant-image-zone {
        position: relative;
        height: 126px;
        margin: 10px 10px 0;
        border-radius: 17px;
        overflow: hidden;
        display: grid;
        place-items: end center;
        background: linear-gradient(135deg, #fff 0%, #eef4fb 100%);
      }

      .variant-badge {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 4;
        padding: 5px 8px;
        border-radius: 9px;
        background: #edf4ff;
        color: var(--blue);
        font-size: 8px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .04em;
      }

      .variant-heart {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 4;
        width: 31px;
        height: 31px;
        border-radius: 999px;
        border: 1px solid #d9e1ec;
        background: rgba(255,255,255,.94);
        color: #586579;
        display: grid;
        place-items: center;
      }

      .variant-heart.is-saved { color: var(--blue); background: #eef5ff; }

      .variant-car-photo {
        width: 118%;
        height: 98px;
        object-fit: contain;
        object-position: center bottom;
        filter: drop-shadow(0 12px 10px rgba(15,23,42,.10));
      }

      .variant-content {
        width: 100%;
        padding: 12px 14px 8px;
        border: 0;
        background: transparent;
        text-align: left;
      }

      .variant-content h4 { margin: 0; color: #0f172a; font-size: 15px; line-height: 1.12; font-weight: 740; }
      .variant-content p { margin: 5px 0 10px; color: #64748b; font-size: 11px; font-weight: 520; }
      .variant-content strong { display: block; color: #0f172a; font-size: 13px; line-height: 1; font-weight: 750; }
      .variant-content small { display: block; margin-top: 4px; color: #7c8aa0; font-size: 9.5px; font-weight: 520; }

      .variant-meta {
        padding: 0 14px 13px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .variant-meta button {
        border: 0;
        background: transparent;
        padding: 0;
        color: #475569;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 9.5px;
        font-weight: 560;
        white-space: nowrap;
      }

      .variant-skeleton-grid {
        margin-top: 16px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .skeleton-card {
        min-height: 210px;
        border-radius: 20px;
        border: 1px solid #dfe7f2;
        background: #fff;
        padding: 12px;
        overflow: hidden;
      }

      .skeleton-car,
      .skeleton-line {
        display: block;
        border-radius: 999px;
        background: linear-gradient(90deg, #eef4fb 0%, #f8fbff 50%, #eef4fb 100%);
        background-size: 220% 100%;
        animation: aciShimmer 1.55s linear infinite;
      }

      .skeleton-car { height: 100px; border-radius: 18px; margin-bottom: 14px; }
      .skeleton-line { height: 12px; margin-top: 7px; }

      @keyframes aciShimmer {
        from { background-position: 100% 0; }
        to { background-position: -120% 0; }
      }

      .colors-row {
        margin-top: 18px;
        display: flex;
        align-items: center;
        gap: 16px;
        justify-content: space-between;
      }

      .colors-row button { border: 0; background: transparent; padding: 0; }

      .color-orb {
        position: relative;
        width: 50px;
        height: 50px;
        border-radius: 999px;
        box-shadow:
          inset 0 8px 16px rgba(255,255,255,.34),
          inset 0 -12px 20px rgba(15,23,42,.22),
          0 14px 28px -20px rgba(15,23,42,.45);
      }

      .color-orb.light { border: 1px solid #dbe3ef; }
      .color-orb.dark { border: 1px solid rgba(255,255,255,.5); }

      .color-orb > span {
        position: absolute;
        left: 22%;
        top: 18%;
        width: 24%;
        height: 24%;
        border-radius: 999px;
        background: rgba(255,255,255,.70);
        filter: blur(2px);
      }

      .color-orb b {
        position: absolute;
        right: -2px;
        top: -2px;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: var(--blue);
        color: white;
        display: grid;
        place-items: center;
        border: 2px solid white;
        box-shadow: 0 6px 16px rgba(37,99,235,.35);
      }

      .selected-color {
        margin-top: 18px;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .selected-color strong { color: #1e293b; font-size: 13px; font-weight: 740; }

      .selected-color span {
        height: 24px;
        padding: 0 9px;
        border-radius: 999px;
        background: #eef5ff;
        color: var(--blue);
        display: inline-flex;
        align-items: center;
        font-size: 11px;
        font-weight: 750;
      }

      .compare-cars {
        margin-top: 16px;
        display: grid;
        grid-template-columns: 1fr 38px 1fr;
        gap: 10px;
        align-items: center;
      }

      .compare-cars > button {
        min-width: 0;
        padding: 11px;
        border-radius: 18px;
        border: 1px solid #e1e8f2;
        background: #fff;
        text-align: left;
      }

      .compare-cars > button > div {
        height: 86px;
        border-radius: 14px;
        background: linear-gradient(135deg, #fff 0%, #f5f8fc 100%);
        display: grid;
        place-items: center;
        overflow: hidden;
      }

      .compare-car-photo { width: 110%; height: 74px; object-fit: contain; object-position: center bottom; filter: drop-shadow(0 10px 8px rgba(15,23,42,.10)); }
      .compare-cars strong, .compare-cars b, .compare-cars small { display: block; }
      .compare-cars strong { margin-top: 6px; color: #1d4ed8; font-size: 11.5px; line-height: 1.15; font-weight: 750; }
      .compare-cars b { margin-top: 4px; color: #0f172a; font-size: 11.5px; font-weight: 750; }
      .compare-cars small { margin-top: 2px; color: #7c8aa0; font-size: 9px; font-weight: 520; }

      .compare-cars > span {
        width: 38px;
        height: 38px;
        border-radius: 999px;
        border: 1px solid #e1e8f2;
        background: #fff;
        color: #64748b;
        display: grid;
        place-items: center;
        font-size: 10px;
        font-weight: 750;
      }

      .compare-facts {
        margin-top: 11px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .compare-facts button {
        min-height: 46px;
        padding: 6px 7px;
        border-radius: 13px;
        border: 1px solid #e1e8f2;
        background: #fff;
        color: #475569;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        text-align: center;
      }

      .compare-facts button svg { color: var(--blue); flex: 0 0 auto; }
      .compare-facts button span { display: flex; flex-direction: column; align-items: center; gap: 2px; line-height: 1.05; }
      .compare-facts button span strong { color: #475569; font-size: 9.5px; font-weight: 700; }
      .compare-facts button span em { color: #0f172a; font-size: 10px; font-style: normal; font-weight: 780; }

      .compare-empty-panel { display: flex; flex-direction: column; }

      .compare-empty-state {
        margin-top: 18px;
        min-height: 252px;
        border-radius: 20px;
        border: 1px dashed #cbd5e1;
        background:
          radial-gradient(circle at 80% 0%, rgba(37,99,235,.08), transparent 30%),
          linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
        display: grid;
        grid-template-rows: auto 1fr auto;
        place-items: center;
        text-align: center;
        padding: 22px;
      }

      .compare-empty-state > span {
        width: 58px;
        height: 58px;
        border-radius: 20px;
        background: #eff6ff;
        color: var(--blue);
        display: grid;
        place-items: center;
        border: 1px solid #bfdbfe;
      }

      .compare-empty-state h4 { margin: 14px 0 7px; color: #0f172a; font-size: 17px; line-height: 1; font-weight: 780; }
      .compare-empty-state p { margin: 0; color: #64748b; font-size: 12px; line-height: 1.45; font-weight: 560; }

      .compare-empty-state button {
        height: 38px;
        margin-top: 18px;
        border: 0;
        border-radius: 999px;
        padding: 0 15px;
        background: linear-gradient(135deg, var(--blue), var(--blue-dark));
        color: #fff;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 750;
      }

      .compare-empty-specs {
        margin-top: 12px;
        min-height: 46px;
        border-radius: 15px;
        border: 1px dashed #dbe3ef;
        background: #f8fbff;
        color: #64748b;
        display: grid;
        place-items: center;
        padding: 10px;
        font-size: 11px;
        line-height: 1.3;
        font-weight: 650;
        text-align: center;
      }

      .compare-placeholder {
        width: 58px;
        height: 38px;
        border-radius: 14px;
        border: 1px dashed #bfdbfe;
        background: #f8fbff;
        color: var(--blue);
        display: grid;
        place-items: center;
        font-weight: 800;
      }

      .slider-dots {
        height: 16px;
        margin-top: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
      }

      .slider-dots span {
        width: 5px;
        height: 5px;
        border-radius: 999px;
        background: #c7d2fe;
        transition: width .25s ease, background .25s ease;
      }

      .slider-dots span.active { width: 18px; background: var(--blue); }

      .mobile-page { display: none; }

      @media (max-width: 1180px) {
        .desktop-header, .desktop-page { display: none; }

        .aci-car-overview-page {
          background:
            radial-gradient(circle at 50% 100%, rgba(37,99,235,.10), transparent 25%),
            linear-gradient(180deg, #fff 0%, #fbfcff 54%, #f8fbff 100%);
          padding-bottom: 0;
        }

        .mobile-page {
          width: min(430px, calc(100vw - 28px));
          max-width: 430px;
          min-height: 100vh;
          margin: 0 auto;
          padding: 14px 16px calc(88px + env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: #ffffff;
          box-shadow: 0 28px 90px -72px rgba(15,23,42,.55);
        }

        .mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px;
        }

        .mobile-header > div {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .mobile-bell {
          position: relative;
          width: 36px;
          height: 32px;
          border: 0;
          background: transparent;
          color: #596174;
          display: grid;
          place-items: center;
        }

        .mobile-bell i {
          position: absolute;
          top: 5px;
          right: 4px;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--blue);
          border: 2px solid #fff;
        }

        .mobile-avatar { width: 48px; height: 48px; }

        .mobile-overview-hero {
          border-radius: 28px;
          min-height: 396px;
          padding: 18px 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background:
            radial-gradient(circle at 78% 38%, rgba(37,99,235,.10), transparent 30%),
            linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%);
          box-shadow: 0 24px 70px -58px rgba(15,23,42,.50), inset 0 1px 0 #fff;
        }

        .mobile-memory-chip {
          width: max-content;
          max-width: 100%;
          height: 34px;
          padding: 0 13px;
          border-radius: 999px;
          border: 1px solid #dbeafe;
          background: rgba(255,255,255,.92);
          color: var(--blue);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 750;
          box-shadow: 0 16px 30px -28px rgba(15,23,42,.26);
        }

        .mobile-hero-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }

        .mobile-hero-grid h1 {
          margin: 0;
          color: #07102b;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 40px;
          line-height: .94;
          letter-spacing: -.075em;
          font-weight: 700;
        }

        .mobile-hero-grid p {
          margin: 8px 0 0;
          color: #475569;
          font-size: 14px;
          line-height: 1.3;
          font-weight: 560;
        }

        .mobile-hero-chips {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .mobile-hero-chips button {
          height: 32px;
          padding: 0 13px;
          border-radius: 999px;
          border: 1px solid #dbe3ef;
          background: rgba(255,255,255,.95);
          color: #1e293b;
          font-size: 11px;
          font-weight: 720;
          box-shadow: 0 12px 26px -24px rgba(15,23,42,.25);
        }

        .mobile-hero-car {
          min-height: 132px;
          margin-top: -4px;
          display: grid;
          place-items: end center;
        }

        .mobile-hero-car-photo {
          width: 120%;
          height: 138px;
          object-fit: contain;
          object-position: center bottom;
          filter: drop-shadow(0 22px 18px rgba(15,23,42,.14));
        }

        .mobile-price-card {
          min-height: 86px;
          border-radius: 20px;
          border: 1px solid #dfe7f2;
          background: rgba(255,255,255,.96);
          padding: 13px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 142px;
          gap: 12px;
          align-items: center;
          box-shadow: 0 18px 44px -38px rgba(15,23,42,.24);
        }

        .mobile-price-card p {
          margin: 0;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-size: 10px;
          line-height: 1;
          font-weight: 800;
        }

        .mobile-price-card strong {
          display: block;
          margin-top: 7px;
          color: #07102b;
          font-size: 29px;
          line-height: 1;
          letter-spacing: -.055em;
          font-weight: 820;
        }

        .mobile-price-card span {
          display: block;
          margin-top: 6px;
          color: #64748b;
          font-size: 12px;
          font-weight: 560;
        }

        .mobile-price-card button {
          height: 48px;
          border: 0;
          border-radius: 15px;
          background: linear-gradient(135deg, var(--blue), var(--blue-dark));
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 18px 34px -22px rgba(37,99,235,.60);
        }

        .mobile-action-block { display: flex; flex-direction: column; gap: 12px; }

        .mobile-action-block h2 {
          margin: 0;
          padding: 0 4px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 27px;
          font-weight: 600;
          letter-spacing: -.035em;
        }

        .mobile-action-block > div {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
        }

        .mobile-action-block button {
          height: 74px;
          border-radius: 20px;
          color: var(--blue);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 720;
          border: 1px solid var(--line);
          background: rgba(255,255,255,.94);
        }

        .mobile-action-block button.gold { color: #b7791f; background: #fffaf0; border-color: rgba(183,121,31,.22); }

        .mobile-assistant-strip {
          min-height: 112px;
          border-radius: 24px;
          padding: 14px;
          display: grid;
          grid-template-columns: 70px 1fr 18px;
          gap: 10px;
          align-items: center;
        }

        .mobile-assistant-strip h3 { margin: 0; color: #10172f; font-size: 16px; line-height: 1.25; font-weight: 720; }

        .mobile-assistant-strip div div {
          margin-top: 7px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .mobile-assistant-strip div div::-webkit-scrollbar { display: none; }

        .mobile-assistant-strip button {
          flex: 0 0 auto;
          height: 32px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid #dfe7f2;
          background: #fff;
          color: var(--blue);
          font-size: 11px;
          font-weight: 720;
        }

        .mobile-variants-panel,
        .mobile-colors-panel,
        .mobile-compare-panel { height: auto; border-radius: 24px; }

        .mobile-variants-panel .panel-head,
        .mobile-colors-panel .panel-head { align-items: center; }

        .mobile-slider {
          display: flex !important;
          grid-template-columns: none !important;
          gap: 12px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          padding: 1px 2px 4px;
        }

        .mobile-slider::-webkit-scrollbar,
        .mobile-color-slider::-webkit-scrollbar { display: none; }

        .mobile-slider .variant-card {
          flex: 0 0 78%;
          scroll-snap-align: start;
        }

        .mobile-slider .variant-image-zone { height: 126px; }
        .mobile-slider .variant-car-photo { height: 88px; }

        .mobile-stat-strip {
          min-height: 106px;
          border-radius: 24px;
          padding: 12px 10px;
          display: flex;
          align-items: stretch;
          gap: 0;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .mobile-stat-strip::-webkit-scrollbar { display: none; }

        .mobile-stat-strip > button {
          flex: 0 0 25%;
          min-width: 96px;
          border: 0;
          border-right: 1px solid #e2e8f0;
          background: transparent;
          color: #0f172a;
          display: grid;
          grid-template-rows: 28px auto auto;
          place-items: center;
          gap: 3px;
          text-align: center;
        }

        .mobile-stat-strip > button:last-child { border-right: 0; }
        .mobile-stat-strip svg { color: #64748b; }
        .mobile-stat-strip strong { font-size: 16px; line-height: 1; font-weight: 820; }
        .mobile-stat-strip span { color: #475569; font-size: 11px; line-height: 1.15; font-weight: 620; }

        .mobile-color-slider {
          justify-content: flex-start;
          gap: 16px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          padding-bottom: 2px;
        }

        .mobile-color-slider button { flex: 0 0 auto; scroll-snap-align: center; }
        .mobile-colors-panel .color-orb { width: 48px; height: 48px; }
        .mobile-colors-panel .selected-color { justify-content: space-between; padding-top: 2px; }

        .mobile-compare-panel { padding: 12px; }

        .mobile-compare-row {
          width: 100%;
          border: 0;
          background: transparent;
          display: grid;
          grid-template-columns: 54px 1fr 130px;
          gap: 10px;
          align-items: center;
          text-align: left;
        }

        .mobile-compare-row.no-rival { grid-template-columns: 54px 1fr 116px; }

        .mobile-compare-row > span {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: #f1f6ff;
          color: var(--blue);
          display: grid;
          place-items: center;
        }

        .mobile-compare-row h3 { margin: 0; color: #1e293b; font-size: 15px; line-height: 1.2; font-weight: 720; }
        .mobile-compare-row p { margin: 4px 0 0; color: #64748b; font-size: 11px; line-height: 1.25; font-weight: 560; }

        .mobile-compare-cars {
          display: grid;
          grid-template-columns: 1fr 28px 1fr;
          align-items: center;
          gap: 4px;
        }

        .mobile-compare-cars img { width: 58px; height: 38px; object-fit: contain; }

        .mobile-compare-cars b {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          border: 1px solid #dfe7f2;
          display: grid;
          place-items: center;
          font-size: 9px;
          color: #64748b;
        }
      }

      @media (max-width: 460px) {
        .mobile-page {
          width: 100%;
          max-width: none;
          box-shadow: none;
          padding-inline: 14px;
          padding-bottom: calc(82px + env(safe-area-inset-bottom));
        }

        .mobile-overview-hero { min-height: 374px; padding: 15px 14px; }
        .mobile-hero-grid h1 { font-size: 38px; }
        .mobile-hero-car-photo { height: 128px; }

        .mobile-price-card {
          grid-template-columns: 1fr;
          gap: 13px;
        }

        .mobile-price-card button { width: 100%; }

        .mobile-action-block > div {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .mobile-action-block button {
          height: 70px;
          border-radius: 20px;
          font-size: 11px;
        }

        .mobile-slider .variant-card { flex-basis: 82%; }

        .mobile-compare-row {
          grid-template-columns: 50px 1fr;
        }

        .mobile-compare-cars {
          grid-column: 1 / -1;
          margin-top: 6px;
        }
      }

/* ACI_CAR_OVERVIEW_FINAL_TIGHTEN_START */

      .mobile-action-block button svg,
      .action-pill svg,
      .stat-card svg,
      .mobile-stat-strip svg {
        stroke-width: 1.75;
      }

      .mobile-action-block button:nth-child(1) svg,
      .action-pill:nth-child(1) svg { color: var(--blue); }
      .mobile-action-block button:nth-child(2) svg,
      .action-pill:nth-child(2) svg { color: #2563eb; }
      .mobile-action-block button:nth-child(3) svg,
      .action-pill:nth-child(3) svg { color: #1d4ed8; }
      .mobile-action-block button:nth-child(4) svg,
      .action-pill:nth-child(4) svg { color: #0f766e; }
      .mobile-action-block button:nth-child(5) svg,
      .action-pill:nth-child(5) svg { color: #7c3aed; }
      .mobile-action-block button:nth-child(6) svg,
      .action-pill:nth-child(6) svg { color: #b7791f; }

      .variants-panel .variant-card-grid:not(.mobile-slider) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .mobile-slider .variant-card {
        flex: 0 0 78%;
      }

      .mobile-slider .variant-card:nth-child(n + 4) {
        display: none;
      }

      @media (max-width: 1180px) {
        .mobile-page {
          padding-bottom: calc(88px + env(safe-area-inset-bottom)) !important;
        }

        .mobile-overview-hero {
          min-height: 396px !important;
          gap: 12px !important;
        }

        .mobile-hero-grid h1 {
          font-size: 40px !important;
        }

        .mobile-hero-car {
          min-height: 132px !important;
        }

        .mobile-hero-car-photo {
          height: 138px !important;
        }

        .mobile-price-card {
          min-height: 86px !important;
          grid-template-columns: minmax(0, 1fr) 142px !important;
          padding: 13px !important;
        }
      }

      @media (max-width: 460px) {
        .mobile-page {
          padding-bottom: calc(82px + env(safe-area-inset-bottom)) !important;
        }

        .mobile-overview-hero {
          min-height: 374px !important;
        }

        .mobile-hero-grid h1 {
          font-size: 38px !important;
        }

        .mobile-hero-car-photo {
          height: 128px !important;
        }
      }

      /* ACI_CAR_OVERVIEW_FINAL_TIGHTEN_END */

      /* Focused car research workspace */
      .aci-car-overview-page,
      .aci-car-overview-page * {
        letter-spacing: 0 !important;
      }

      .aci-car-overview-page {
        padding-bottom: 0;
        background: #f7f9fc;
      }

      .desktop-header,
      .desktop-page {
        width: min(100%, 1280px);
      }

      .desktop-header {
        min-height: 68px;
        padding: 10px 28px 6px;
        grid-template-columns: 210px minmax(340px, 620px) 210px;
      }

      .desktop-search {
        height: 48px;
        border-radius: 16px;
        box-shadow: 0 12px 32px -28px rgba(15,23,42,.34);
      }

      .desktop-search button {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        color: #fff;
        background: #0f5ff1;
      }

      .desktop-search button:disabled {
        color: #94a3b8;
        background: #f1f5f9;
      }

      .desktop-page {
        padding: 10px 28px 38px;
        gap: 12px;
      }

      .desktop-overview-hero {
        min-height: 300px;
        border-radius: 24px;
        padding: 28px 30px;
        grid-template-columns: minmax(310px, 1fr) minmax(330px, .92fr) 238px;
        gap: 16px;
      }

      .hero-copy h1,
      .mobile-hero-grid h1,
      .desktop-action-strip h2,
      .panel-head h3 {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .hero-copy h1 {
        font-size: 52px;
        line-height: .98;
        font-weight: 780;
      }

      .hero-badges { margin-bottom: 17px; }
      .hero-subtitle { margin-top: 14px; font-size: 15px; }
      .hero-chips { margin-top: 17px; gap: 8px; }
      .hero-chips button { height: 34px; border-radius: 11px; padding-inline: 13px; }
      .hero-car-stage { min-height: 230px; }
      .hero-car-photo { height: 230px; }

      .price-card {
        padding: 20px 18px;
        border-radius: 18px;
        background: #fff;
      }

      .price-card strong { font-size: 31px; }
      .price-card button { height: 44px; border-radius: 13px; }

      .desktop-action-strip {
        min-height: 68px;
        border-radius: 20px;
        padding: 12px 20px;
        grid-template-columns: 210px 1fr;
      }

      .desktop-action-strip h2 { font-size: 17px; font-weight: 730; }
      .action-pill { height: 38px; min-width: 105px; border-radius: 12px; }
      .action-pill:hover { transform: none; border-color: #9fbff7; }

      .desktop-grid {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 12px;
        align-items: start;
      }

      .panel { border-radius: 20px; }
      .variants-panel,
      .highlights-panel,
      .colors-panel,
      .compare-panel,
      .research-path-panel {
        height: auto;
      }

      .desktop-grid > .variants-panel { grid-column: 1 / span 8; min-height: 374px; }
      .desktop-grid > .research-path-panel { grid-column: 9 / -1; min-height: 374px; }
      .desktop-grid > .highlights-panel { grid-column: 1 / span 8; min-height: 196px; }
      .desktop-grid > .colors-panel { grid-column: 9 / -1; min-height: 196px; }
      .desktop-grid > .compare-panel { grid-column: 1 / -1; min-height: 0; }

      .desktop-grid > .compare-empty-panel .compare-empty-state {
        min-height: 104px;
        margin-top: 14px;
        padding: 14px 16px;
        grid-template-columns: 58px minmax(0, 1fr) auto;
        grid-template-rows: 1fr;
        gap: 16px;
        text-align: left;
      }

      .desktop-grid > .compare-empty-panel .compare-empty-state > span {
        width: 48px;
        height: 48px;
        border-radius: 14px;
      }

      .desktop-grid > .compare-empty-panel .compare-empty-state h4 {
        margin: 0 0 5px;
        font-size: 15px;
      }

      .desktop-grid > .compare-empty-panel .compare-empty-state button {
        margin-top: 0;
      }

      .panel-head h3 { font-size: 18px; line-height: 1.15; font-weight: 750; }
      .panel-head p { margin-top: 4px; }

      .research-proof-row {
        margin-top: 16px;
        padding: 12px 0;
        border-top: 1px solid #e5eaf2;
        border-bottom: 1px solid #e5eaf2;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .research-proof-row span {
        min-width: 0;
        padding: 0 9px;
        border-right: 1px solid #e5eaf2;
        color: #64748b;
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: 10px;
        line-height: 1.2;
        text-transform: uppercase;
        font-weight: 700;
      }

      .research-proof-row span:first-child { padding-left: 0; }
      .research-proof-row span:last-child { border-right: 0; }
      .research-proof-row strong { color: #0f172a; font-size: 14px; text-transform: none; }

      .research-step-list {
        margin-top: 8px;
        display: grid;
      }

      .research-step-list > button {
        width: 100%;
        min-height: 72px;
        padding: 10px 0;
        border: 0;
        border-bottom: 1px solid #e8edf4;
        background: transparent;
        color: #64748b;
        display: grid;
        grid-template-columns: 22px 38px minmax(0, 1fr) 20px;
        align-items: center;
        gap: 9px;
        text-align: left;
      }

      .research-step-list > button:last-child { border-bottom: 0; }
      .research-step-list > button:hover .research-step-copy strong { color: #0f5ff1; }

      .research-step-index {
        color: #94a3b8;
        font-size: 10px;
        font-weight: 800;
      }

      .research-step-icon {
        width: 36px;
        height: 36px;
        border: 1px solid #dbe6f8;
        border-radius: 11px;
        background: #f6f9ff;
        color: #0f5ff1;
        display: grid;
        place-items: center;
      }

      .research-step-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .research-step-copy small { color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 750; }
      .research-step-copy strong { color: #0f172a; font-size: 12.5px; line-height: 1.2; font-weight: 750; }
      .research-step-copy em { color: #64748b; font-size: 10.5px; line-height: 1.25; font-style: normal; font-weight: 520; }

      .overview-refresh-notice {
        min-height: 40px;
        border: 1px solid #f5d0a8;
        border-radius: 12px;
        background: #fffaf3;
        color: #9a5d16;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        font-size: 12px;
        font-weight: 720;
      }

      .aci-car-overview-page button:focus-visible,
      .aci-car-overview-page input:focus-visible {
        outline: 3px solid rgba(37,99,235,.24);
        outline-offset: 2px;
      }

      @media (max-width: 1180px) {
        .mobile-page {
          gap: 14px;
          padding-bottom: calc(28px + env(safe-area-inset-bottom)) !important;
        }

        .mobile-overview-hero {
          min-height: 360px !important;
          border-radius: 22px;
        }

        .mobile-hero-grid h1 {
          font-size: 36px !important;
          line-height: 1;
          font-weight: 780;
        }

        .mobile-action-block h2 { font-size: 21px; font-weight: 750; }
        .mobile-action-block h2 {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .mobile-action-block button { border-radius: 16px; }
        .mobile-variants-panel,
        .mobile-colors-panel,
        .mobile-compare-panel,
        .mobile-research-path { border-radius: 20px; }

        .mobile-research-path { min-height: 0; }
        .mobile-research-path .research-proof-row { margin-top: 13px; }
        .mobile-research-path .research-step-list > button { min-height: 68px; }
        .mobile-research-path .research-step-copy em { display: none; }
      }

      @media (max-width: 460px) {
        .mobile-page {
          padding-bottom: calc(24px + env(safe-area-inset-bottom)) !important;
        }

        .mobile-overview-hero { min-height: 348px !important; }
        .mobile-price-card { grid-template-columns: minmax(0, 1fr) 126px !important; }
        .mobile-price-card strong { font-size: 25px; }
        .mobile-price-card button { width: auto; font-size: 12px; }
      }

      /* Product-detail refinement: fewer containers, clearer research progression. */
      .aci-car-overview-page {
        background: #fff;
      }

      .desktop-page {
        width: min(100%, 1240px);
        padding: 6px 28px 30px;
        gap: 0;
      }

      .overview-hero {
        min-height: 302px;
        border: 0;
        border-bottom: 1px solid #e4e9f1;
        border-radius: 0;
        padding: 28px 0 24px;
        background: #fff;
        box-shadow: none;
        grid-template-columns: minmax(280px, .9fr) minmax(380px, 1.15fr) 220px;
        gap: 28px;
      }

      .overview-hero::before,
      .overview-hero::after { display: none; }

      .hero-copy h1 {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: clamp(38px, 4vw, 55px);
        line-height: 1;
        letter-spacing: 0;
        font-weight: 780;
      }

      .hero-car-stage {
        min-height: 248px;
        border-radius: 18px;
        background: #f6f8fb;
        box-shadow: inset 0 0 0 1px #edf1f6;
      }

      .hero-car-photo {
        width: 110%;
        height: 248px;
      }

      .price-card {
        align-self: stretch;
        min-height: 0;
        border: 0;
        border-left: 1px solid #e4e9f1;
        border-radius: 0;
        padding: 28px 0 18px 24px;
        background: transparent;
        box-shadow: none;
      }

      .price-card button {
        border-radius: 10px;
        box-shadow: none;
      }

      .desktop-action-strip {
        min-height: 74px;
        margin: 0;
        padding: 14px 0;
        border: 0;
        border-bottom: 1px solid #e4e9f1;
        border-radius: 0;
        background: #fff;
        box-shadow: none;
      }

      .action-strip-heading {
        display: flex;
        flex-direction: column;
        gap: 4px;
        color: #0f172a;
        font-size: 15px;
        font-weight: 750;
      }

      .action-strip-heading small {
        color: #64748b;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 10px;
        font-weight: 650;
      }

      .desktop-action-strip .action-pill {
        height: 38px;
        border: 0;
        border-radius: 0;
        padding: 0 16px;
        background: transparent;
        box-shadow: none;
        color: #25324a;
      }

      .desktop-action-strip .action-pill + .action-pill {
        border-left: 1px solid #e4e9f1;
      }

      .desktop-action-strip .action-pill:hover {
        background: #f5f7fa;
        color: #0758f8;
      }

      .desktop-grid {
        margin-top: 0;
        gap: 0 28px;
      }

      .desktop-grid > .panel {
        min-height: 0;
        padding: 26px 0;
        border: 0;
        border-bottom: 1px solid #e4e9f1;
        border-radius: 0;
        background: #fff;
        box-shadow: none;
      }

      .desktop-grid > .research-path-panel {
        grid-column: 1 / -1;
        order: 1;
      }

      .desktop-grid > .variants-panel {
        grid-column: 1 / -1;
        order: 2;
      }

      .desktop-grid > .highlights-panel {
        grid-column: 1 / span 7;
        order: 3;
      }

      .desktop-grid > .colors-panel {
        grid-column: 8 / -1;
        order: 3;
      }

      .desktop-grid > .compare-panel {
        grid-column: 1 / -1;
        order: 4;
      }

      .research-path-panel .panel-head {
        align-items: end;
      }

      .research-path-panel .research-proof-row {
        margin-top: 18px;
        padding: 0;
        border: 0;
        width: min(100%, 430px);
      }

      .research-step-list {
        margin-top: 18px;
        display: grid;
        grid-template-columns: repeat(var(--research-step-count, 3), minmax(0, 1fr));
        gap: 12px;
      }

      .research-step-list[data-count="1"] {
        grid-template-columns: minmax(0, 390px);
      }

      .research-step-list > button {
        min-height: 96px;
        padding: 14px;
        border: 1px solid #dde4ee;
        border-radius: 14px;
        grid-template-columns: 36px minmax(0, 1fr) 20px;
        gap: 12px;
        background: #fff;
      }

      .research-step-list > button:hover {
        border-color: #b9c8df;
        background: #f8fafc;
      }

      .research-step-index { display: none; }
      .research-step-icon { border-radius: 10px; }
      .research-step-copy strong { font-size: 13px; }
      .research-step-copy em { font-size: 11px; }

      .research-complete-row {
        margin-top: 14px;
        color: #64748b;
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 11px;
      }

      .research-complete-row svg { color: #15803d; }
      .research-complete-row strong { color: #334155; font-weight: 650; }

      .variant-card {
        border-radius: 14px;
        box-shadow: none;
      }

      .variant-heart { display: none; }

      .stat-card {
        border: 0;
        border-right: 1px solid #e4e9f1;
        border-radius: 0;
        background: transparent;
      }

      .stat-card:last-child { border-right: 0; }

      .colors-row { justify-content: flex-start; gap: 14px; }
      .color-orb { width: 42px; height: 42px; }

      .desktop-grid > .rivals-panel {
        grid-column: 1 / -1;
        order: 4;
      }

      .rivals-panel .panel-head {
        align-items: end;
      }

      .rival-card-grid {
        margin-top: 16px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .rival-card {
        min-width: 0;
        min-height: 244px;
        border: 1px solid #dde4ee;
        border-radius: 14px;
        background: #fff;
        overflow: hidden;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-rows: minmax(0, 1fr) 42px;
        transition: border-color 180ms ease, box-shadow 180ms ease;
      }

      .rival-card:hover {
        border-color: #b9c8df;
        box-shadow: 0 14px 34px -30px rgba(15,23,42,.42);
      }

      .rival-overview-button {
        min-width: 0;
        grid-column: 1 / -1;
        border: 0;
        padding: 12px 12px 9px;
        background: transparent;
        color: #0f172a;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-rows: auto 116px auto auto;
        align-items: end;
        gap: 2px 10px;
        text-align: left;
        cursor: pointer;
      }

      .rival-match {
        grid-column: 1 / -1;
        justify-self: start;
        min-height: 24px;
        padding: 0 9px;
        border: 1px solid #dce7f8;
        border-radius: 999px;
        background: #f5f8fd;
        color: #3d5578;
        display: inline-flex;
        align-items: center;
        font-size: 9.5px;
        line-height: 1;
        font-weight: 720;
      }

      .rival-visual {
        grid-column: 1 / -1;
        width: 100%;
        height: 116px;
        border-radius: 11px;
        background: #f6f8fb;
        overflow: hidden;
        display: grid;
        place-items: center;
        box-shadow: inset 0 0 0 1px #edf1f6;
      }

      .rival-visual > * {
        width: 100%;
        max-width: 100%;
      }

      .rival-overview-button small {
        grid-column: 1;
        color: #64748b;
        font-size: 9.5px;
        line-height: 1.2;
        font-weight: 650;
      }

      .rival-overview-button strong {
        grid-column: 1;
        min-width: 0;
        color: #0f172a;
        font-size: 16px;
        line-height: 1.18;
        font-weight: 760;
        overflow-wrap: anywhere;
      }

      .rival-overview-button p {
        grid-column: 2;
        grid-row: 3 / span 2;
        align-self: end;
        margin: 0;
        color: #64748b;
        display: flex;
        flex-direction: column;
        align-items: end;
        gap: 2px;
        font-size: 9px;
        line-height: 1.2;
        font-weight: 600;
        white-space: nowrap;
      }

      .rival-overview-button p b {
        color: #0f172a;
        font-size: 13px;
        font-weight: 760;
      }

      .rival-compare-button {
        grid-column: 1 / -1;
        width: 100%;
        min-height: 42px;
        border: 0;
        border-top: 1px solid #edf1f6;
        padding: 0 12px;
        background: transparent;
        color: #334155;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 10.5px;
        font-weight: 720;
        cursor: pointer;
      }

      .rival-compare-button:hover {
        background: #f8fafc;
        color: #0758f8;
      }

      .rival-card-grid .skeleton-card.rival {
        min-height: 244px;
        border-radius: 14px;
      }

      @media (max-width: 1180px) {
        .aci-car-overview-page { background: #fff; }

        .mobile-page {
          width: min(100%, 430px);
          max-width: 430px;
          padding: 4px 18px calc(28px + env(safe-area-inset-bottom));
          gap: 0;
          background: #fff;
          box-shadow: none;
        }

        .mobile-overview-hero {
          min-height: 0 !important;
          padding: 22px 0 18px;
          border: 0;
          border-bottom: 1px solid #e4e9f1;
          border-radius: 0;
          background: #fff;
          box-shadow: none;
        }

        .mobile-memory-chip {
          height: auto;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          font-size: 10px;
          text-transform: uppercase;
        }

        .mobile-hero-grid h1 {
          font-size: 34px !important;
          letter-spacing: 0;
        }

        .mobile-hero-car {
          min-height: 154px;
          margin: 2px 0 0;
          border-radius: 16px;
          background: #f6f8fb;
          box-shadow: inset 0 0 0 1px #edf1f6;
          overflow: hidden;
        }

        .mobile-hero-car-photo { width: 110%; height: 154px; }

        .mobile-price-card {
          min-height: 74px;
          padding: 14px 0 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }

        .mobile-price-card button {
          height: 42px;
          border-radius: 10px;
          box-shadow: none;
        }

        .mobile-action-block {
          padding: 20px 0;
          border-bottom: 1px solid #e4e9f1;
          gap: 12px;
        }

        .mobile-action-block h2 { padding: 0; font-size: 17px; }
        .mobile-action-block > div { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; }

        .mobile-action-block button {
          height: 48px;
          border: 0;
          border-bottom: 1px solid #edf1f6;
          border-radius: 0;
          background: transparent;
          color: #25324a;
          flex-direction: row;
          justify-content: flex-start;
          padding: 0 6px;
          gap: 8px;
        }

        .mobile-action-block button:nth-child(odd) { border-right: 1px solid #edf1f6; }
        .mobile-action-block button svg { width: 17px; height: 17px; color: #0758f8; }

        .mobile-page > .panel,
        .mobile-page > .mobile-stat-strip {
          min-height: 0;
          padding: 22px 0;
          border: 0;
          border-bottom: 1px solid #e4e9f1;
          border-radius: 0;
          background: #fff;
          box-shadow: none;
        }

        .mobile-page > .mobile-stat-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .mobile-research-path .research-step-list {
          grid-template-columns: 1fr;
          gap: 0;
        }

        .mobile-research-path .research-step-list > button {
          min-height: 66px;
          padding: 10px 0;
          border: 0;
          border-bottom: 1px solid #edf1f6;
          border-radius: 0;
          background: transparent;
        }

        .mobile-research-path .research-step-list > button:last-child { border-bottom: 0; }
        .mobile-research-path .research-step-copy em { display: block; }

        .mobile-variants-panel .variant-card { border-radius: 12px; }
        .mobile-colors-panel .colors-row { overflow-x: auto; padding-bottom: 4px; }

        .mobile-rivals-panel .panel-head {
          align-items: end;
        }

        .rival-card-grid {
          width: 100%;
          margin-top: 14px;
          padding: 0 34px 4px 0;
          display: flex;
          gap: 10px;
          overflow-x: auto;
          overscroll-behavior-inline: contain;
          scroll-snap-type: x mandatory;
          scroll-padding-inline: 0;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .rival-card-grid::-webkit-scrollbar { display: none; }

        .rival-card {
          flex: 0 0 100%;
          min-height: 236px;
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }

        .rival-overview-button {
          grid-template-rows: auto 110px auto auto;
        }

        .rival-visual { height: 110px; }

        .rival-card-grid .skeleton-card.rival {
          flex: 0 0 100%;
          min-height: 236px;
          scroll-snap-align: start;
        }
      }
`}</style>
  );
}

function CarOverviewRedesignStyles() {
  return (
    <style>{`
      /* 2026 overview redesign: a single product-detail system. */
      .aci-page.aci-car-overview-page {
        --overview-ink: #111827;
        --overview-muted: #64748b;
        --overview-line: #dfe5ee;
        --overview-soft: #f3f6fa;
        --overview-blue: #075ee8;
        min-height: 100vh;
        padding-bottom: 112px;
        background: #f6f8fb;
        color: var(--overview-ink);
      }

      body:has(.aci-car-overview-page) .aci-v2-portal-header,
      body:has(.aci-car-overview-page) .aci-v2-portal-header.is-compact {
        width: min(calc(100% - 40px), 1240px);
      }

      .aci-page.aci-car-overview-page .desktop-page {
        width: min(calc(100% - 40px), 1240px);
        margin: 0 auto;
        padding: 18px 0 40px;
        gap: 14px;
      }

      .aci-page.aci-car-overview-page .mobile-page { display: none; }

      .aci-page.aci-car-overview-page .overview-hero {
        min-height: 344px;
        padding: 30px;
        border: 1px solid #e1e7ef;
        border-radius: 24px;
        background: #fff;
        box-shadow: 0 20px 55px -46px rgba(15, 23, 42, .55);
        display: grid;
        grid-template-columns: minmax(270px, .86fr) minmax(410px, 1.28fr) 246px;
        align-items: stretch;
        gap: 24px;
        overflow: hidden;
      }

      .aci-page.aci-car-overview-page .overview-hero::before,
      .aci-page.aci-car-overview-page .overview-hero::after { display: none; }

      .aci-page.aci-car-overview-page .hero-copy {
        min-width: 0;
        align-self: center;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }

      .aci-page.aci-car-overview-page .overview-kicker {
        margin: 0 0 14px;
        color: var(--overview-blue);
        font-size: 11px;
        line-height: 1;
        font-weight: 780;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .aci-page.aci-car-overview-page .hero-copy h1 {
        max-width: 330px;
        margin: 0;
        color: #0b1533;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 48px;
        line-height: .98;
        font-weight: 790;
        letter-spacing: 0;
        text-wrap: balance;
      }

      .aci-page.aci-car-overview-page .hero-subtitle {
        min-height: 34px;
        margin-top: 15px;
        padding: 0;
        border: 0;
        background: transparent;
        color: #526077;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 650;
        cursor: pointer;
      }

      .aci-page.aci-car-overview-page .hero-subtitle:hover { color: var(--overview-blue); }

      .aci-page.aci-car-overview-page .hero-chips {
        margin-top: 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .aci-page.aci-car-overview-page .hero-chips button,
      .aci-page.aci-car-overview-page .mobile-hero-chips button {
        min-height: 30px;
        padding: 0 10px;
        border: 1px solid #dce3ec;
        border-radius: 7px;
        background: #fff;
        color: #334155;
        font-size: 11px;
        font-weight: 650;
        cursor: pointer;
      }

      .aci-page.aci-car-overview-page .hero-chips button:hover {
        border-color: #aebfd9;
        background: #f7f9fc;
      }

      .aci-page.aci-car-overview-page .hero-car-stage {
        position: relative;
        min-height: 282px;
        border-radius: 18px;
        background: #f1f4f8;
        box-shadow: inset 0 0 0 1px #e7ebf1;
        overflow: hidden;
        display: grid;
        place-items: center;
      }

      .aci-page.aci-car-overview-page .hero-car-stage::after {
        content: "";
        position: absolute;
        left: 11%;
        right: 11%;
        bottom: 28px;
        height: 16px;
        border-radius: 50%;
        background: rgba(39, 55, 78, .1);
        filter: blur(9px);
      }

      .aci-page.aci-car-overview-page .hero-stage-label,
      .aci-page.aci-car-overview-page .hero-stage-caption {
        position: absolute;
        z-index: 2;
        color: #64748b;
        font-size: 10px;
        font-weight: 700;
      }

      .aci-page.aci-car-overview-page .hero-stage-label { top: 16px; left: 17px; text-transform: uppercase; }
      .aci-page.aci-car-overview-page .hero-stage-caption { right: 17px; bottom: 14px; }

      .aci-page.aci-car-overview-page .hero-car-photo {
        position: relative;
        z-index: 1;
        width: 112%;
        height: 266px;
      }

      .aci-page.aci-car-overview-page .price-card {
        align-self: stretch;
        min-height: 0;
        padding: 24px 0 4px 24px;
        border: 0;
        border-left: 1px solid #e3e8ef;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        display: flex;
        flex-direction: column;
        align-items: stretch;
      }

      .aci-page.aci-car-overview-page .price-card > p {
        margin: 0;
        color: #64748b;
        font-size: 10px;
        line-height: 1.2;
        font-weight: 760;
        text-transform: uppercase;
      }

      .aci-page.aci-car-overview-page .price-card > strong {
        margin-top: 9px;
        color: #0b1533;
        font-size: 31px;
        line-height: 1;
        font-weight: 790;
      }

      .aci-page.aci-car-overview-page .price-card > span {
        margin-top: 8px;
        color: #64748b;
        font-size: 11px;
        font-weight: 600;
      }

      .aci-page.aci-car-overview-page .price-card > button {
        width: 100%;
        min-height: 44px;
        margin-top: 22px;
        border: 0;
        border-radius: 8px;
        padding: 0 14px;
        background: var(--overview-blue);
        color: #fff;
        box-shadow: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 730;
        cursor: pointer;
      }

      .aci-page.aci-car-overview-page .price-card > button:hover { background: #064fc2; }

      .aci-page.aci-car-overview-page .price-card-facts {
        margin-top: auto;
        padding-top: 18px;
        display: grid;
        gap: 10px;
      }

      .aci-page.aci-car-overview-page .price-card-facts span {
        color: #64748b;
        font-size: 10px;
        font-weight: 600;
      }

      .aci-page.aci-car-overview-page .price-card-facts b {
        color: #25324a;
        font-weight: 750;
      }

      .aci-page.aci-car-overview-page .overview-action-bar {
        min-height: 70px;
        padding: 0 16px 0 22px;
        border: 1px solid #e1e7ef;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 16px 42px -40px rgba(15, 23, 42, .5);
        display: grid;
        grid-template-columns: 128px minmax(0, 1fr);
        align-items: center;
        gap: 10px;
      }

      .aci-page.aci-car-overview-page .overview-action-heading {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .aci-page.aci-car-overview-page .overview-action-heading span {
        color: #94a3b8;
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .aci-page.aci-car-overview-page .overview-action-heading strong {
        color: #16213d;
        font-size: 14px;
        font-weight: 750;
      }

      .aci-page.aci-car-overview-page .overview-action-list {
        min-width: 0;
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
      }

      .aci-page.aci-car-overview-page .overview-action-list button {
        min-width: 0;
        min-height: 40px;
        padding: 0 11px;
        border: 0;
        border-left: 1px solid #e8ecf2;
        background: transparent;
        color: #334155;
        display: grid;
        grid-template-columns: 19px minmax(0, 1fr) 14px;
        align-items: center;
        gap: 7px;
        text-align: left;
        cursor: pointer;
      }

      .aci-page.aci-car-overview-page .overview-action-list button svg:first-child { color: #46617f; }
      .aci-page.aci-car-overview-page .overview-action-list button svg:last-child { color: #94a3b8; }
      .aci-page.aci-car-overview-page .overview-action-list button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 680; }
      .aci-page.aci-car-overview-page .overview-action-list button:hover { background: #f7f9fc; color: var(--overview-blue); }

      .aci-page.aci-car-overview-page .desktop-grid {
        margin-top: 6px;
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 18px;
        align-items: start;
      }

      .aci-page.aci-car-overview-page .desktop-grid > .panel {
        min-height: 0;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
      }

      .aci-page.aci-car-overview-page .desktop-grid > .variants-panel { grid-column: 1 / span 8; order: 1; }
      .aci-page.aci-car-overview-page .desktop-grid > .research-path-panel { grid-column: 9 / -1; order: 1; }
      .aci-page.aci-car-overview-page .desktop-grid > .rivals-panel { grid-column: 1 / -1; order: 2; }

      .aci-page.aci-car-overview-page .panel-head {
        min-height: 48px;
        margin-bottom: 12px;
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 16px;
      }

      .aci-page.aci-car-overview-page .panel-head h3 { margin: 0; color: #111b36; font-size: 19px; line-height: 1.15; font-weight: 760; }
      .aci-page.aci-car-overview-page .panel-head p { margin: 4px 0 0; color: #7a879b; font-size: 11px; line-height: 1.3; font-weight: 550; }
      .aci-page.aci-car-overview-page .panel-head > button { min-height: 30px; padding: 0; border: 0; background: transparent; color: #3b526f; display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 700; cursor: pointer; }
      .aci-page.aci-car-overview-page .panel-head > button:hover { color: var(--overview-blue); }

      .aci-page.aci-car-overview-page .variant-card-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0;
        min-height: 228px;
        border: 1px solid #dee5ee;
        border-radius: 14px;
        background: #fff;
        overflow: hidden;
      }

      .aci-page.aci-car-overview-page .variant-card {
        min-width: 0;
        min-height: 228px;
        border: 0;
        border-right: 1px solid #e3e8ef;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        display: flex;
        flex-direction: column;
        transition: background 160ms ease;
      }

      .aci-page.aci-car-overview-page .variant-card:last-child { border-right: 0; }
      .aci-page.aci-car-overview-page .variant-card:hover { background: #f8fafc; }
      .aci-page.aci-car-overview-page .variant-card.is-mid { background: #f4f7fb; }
      .aci-page.aci-car-overview-page .variant-card.is-mid:hover { background: #eef3f9; }

      .aci-page.aci-car-overview-page .variant-content {
        min-width: 0;
        flex: 1;
        padding: 18px;
        border: 0;
        background: transparent;
        color: #111827;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
        cursor: pointer;
      }

      .aci-page.aci-car-overview-page .variant-tier {
        min-height: 24px;
        padding: 0 8px;
        border: 1px solid #d9e1eb;
        border-radius: 6px;
        color: #64748b;
        display: inline-flex;
        align-items: center;
        font-size: 9px;
        font-weight: 760;
        text-transform: uppercase;
      }

      .aci-page.aci-car-overview-page .variant-card.is-mid .variant-tier {
        border-color: #b9cae4;
        background: #fff;
        color: #315477;
      }

      .aci-page.aci-car-overview-page .variant-title-row {
        width: 100%;
        margin-top: 18px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 18px;
        align-items: start;
        gap: 8px;
      }

      .aci-page.aci-car-overview-page .variant-title-row svg { margin-top: 2px; color: #94a3b8; }
      .aci-page.aci-car-overview-page .variant-content h4 { width: 100%; margin: 0; color: #111b36; font-size: 16px; line-height: 1.2; font-weight: 760; overflow-wrap: anywhere; }

      .aci-page.aci-car-overview-page .variant-detail-row {
        width: 100%;
        margin-top: auto;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 10px;
      }

      .aci-page.aci-car-overview-page .variant-detail-row > span { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
      .aci-page.aci-car-overview-page .variant-content p { margin: 0; color: #66758a; font-size: 10px; line-height: 1.25; font-weight: 620; }
      .aci-page.aci-car-overview-page .variant-content strong { flex: 0 0 auto; margin: 0; padding: 0; color: var(--overview-blue); font-size: 17px; line-height: 1; font-weight: 790; white-space: nowrap; }
      .aci-page.aci-car-overview-page .variant-content small { margin: 0; color: #8a96a8; font-size: 9px; line-height: 1.2; font-weight: 550; }

      .aci-page.aci-car-overview-page .research-path-panel {
        min-height: 338px !important;
        padding: 18px !important;
        border: 1px solid #dee5ee !important;
        border-radius: 14px !important;
        background: #fff !important;
      }

      .aci-page.aci-car-overview-page .research-path-panel .panel-head { margin-bottom: 4px; }
      .aci-page.aci-car-overview-page .research-step-list { margin-top: 6px; display: grid; grid-template-columns: 1fr; gap: 0; }

      .aci-page.aci-car-overview-page .research-step-list > button {
        width: 100%;
        min-height: 54px;
        padding: 8px 0;
        border: 0;
        border-bottom: 1px solid #e8edf3;
        border-radius: 0;
        background: transparent;
        color: #778399;
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr) 17px;
        align-items: center;
        gap: 10px;
        text-align: left;
        cursor: pointer;
      }

      .aci-page.aci-car-overview-page .research-step-list > button:last-child { border-bottom: 0; }
      .aci-page.aci-car-overview-page .research-step-list > button:hover .research-step-copy strong { color: var(--overview-blue); }
      .aci-page.aci-car-overview-page .research-step-index { display: none; }
      .aci-page.aci-car-overview-page .research-step-icon { width: 32px; height: 32px; border: 1px solid #dce4ee; border-radius: 8px; background: #f5f7fa; color: #3f5876; display: grid; place-items: center; }
      .aci-page.aci-car-overview-page .research-step-icon svg { width: 15px; height: 15px; }
      .aci-page.aci-car-overview-page .research-step-copy { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
      .aci-page.aci-car-overview-page .research-step-copy small { color: #9aa5b5; font-size: 8px; line-height: 1.2; font-weight: 720; text-transform: uppercase; }
      .aci-page.aci-car-overview-page .research-step-copy strong { color: #26344d; font-size: 11.5px; line-height: 1.25; font-weight: 720; }
      .aci-page.aci-car-overview-page .research-step-copy em { display: none; }
      .aci-page.aci-car-overview-page .research-complete-row { margin-top: 8px; padding-top: 8px; border-top: 1px solid #e8edf3; color: #718096; display: flex; align-items: center; gap: 5px; font-size: 9px; }

      .aci-page.aci-car-overview-page .highlights-panel {
        min-height: 188px !important;
        padding: 18px !important;
        border: 1px solid #dee5ee !important;
        border-radius: 14px !important;
        background: #fff !important;
      }

      .aci-page.aci-car-overview-page .stats-grid {
        min-height: 88px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .aci-page.aci-car-overview-page .stat-card {
        min-width: 0;
        min-height: 82px;
        padding: 8px 10px;
        border: 0;
        border-right: 1px solid #e7ebf1;
        border-radius: 0;
        background: transparent;
        color: #526077;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        gap: 4px;
        text-align: left;
        cursor: pointer;
      }

      .aci-page.aci-car-overview-page .stat-card:last-child { border-right: 0; }
      .aci-page.aci-car-overview-page .stat-card svg { color: #506a89; }
      .aci-page.aci-car-overview-page .stat-card strong { max-width: 100%; color: #17233d; font-size: 13px; line-height: 1.15; font-weight: 750; overflow-wrap: anywhere; }
      .aci-page.aci-car-overview-page .stat-card span { color: #8a96a8; font-size: 9px; font-weight: 620; }

      .aci-page.aci-car-overview-page .colors-row {
        min-height: 62px;
        justify-content: flex-start;
        gap: 12px;
        overflow-x: auto;
        scrollbar-width: none;
      }

      .aci-page.aci-car-overview-page .colors-row::-webkit-scrollbar { display: none; }
      .aci-page.aci-car-overview-page .colors-row > button { border: 0; padding: 3px; background: transparent; cursor: pointer; }
      .aci-page.aci-car-overview-page .color-orb { width: 40px; height: 40px; }
      .aci-page.aci-car-overview-page .selected-color { margin-top: 9px; display: flex; align-items: center; gap: 8px; }
      .aci-page.aci-car-overview-page .selected-color strong { color: #27354f; font-size: 11px; font-weight: 720; }

      .aci-page.aci-car-overview-page .rivals-panel {
        margin-top: 0;
        padding: 18px !important;
        border: 1px solid #dee5ee !important;
        border-radius: 14px !important;
        background: #fff !important;
      }

      .aci-page.aci-car-overview-page .rival-card-grid {
        margin-top: 0;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .aci-page.aci-car-overview-page .rival-card {
        min-width: 0;
        min-height: 238px;
        border: 1px solid #dee5ee;
        border-radius: 12px;
        background: #fff;
        overflow: hidden;
        display: grid;
        grid-template-rows: minmax(0, 1fr) 42px;
        box-shadow: none;
        transition: border-color 160ms ease, box-shadow 160ms ease;
      }

      .aci-page.aci-car-overview-page .rival-card:hover { border-color: #b9c6d8; box-shadow: 0 18px 34px -30px rgba(15, 23, 42, .5); }
      .aci-page.aci-car-overview-page .rival-overview-button { min-width: 0; padding: 11px 12px 10px; border: 0; background: transparent; color: #111827; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto 112px auto auto; align-items: end; gap: 2px 10px; text-align: left; cursor: pointer; }
      .aci-page.aci-car-overview-page .rival-match { grid-column: 1 / -1; justify-self: start; min-height: 22px; padding: 0 8px; border: 1px solid #dce4ee; border-radius: 6px; background: #f6f8fa; color: #526077; display: inline-flex; align-items: center; font-size: 9px; font-weight: 680; }
      .aci-page.aci-car-overview-page .rival-visual { grid-column: 1 / -1; width: 100%; height: 112px; border-radius: 8px; background: #f1f4f8; overflow: hidden; display: grid; place-items: center; box-shadow: none; }
      .aci-page.aci-car-overview-page .rival-overview-button small { grid-column: 1; color: #7f8b9d; font-size: 9px; font-weight: 620; }
      .aci-page.aci-car-overview-page .rival-overview-button strong { grid-column: 1; min-width: 0; color: #14203b; font-size: 16px; line-height: 1.15; font-weight: 760; overflow-wrap: anywhere; }
      .aci-page.aci-car-overview-page .rival-overview-button p { grid-column: 2; grid-row: 3 / span 2; align-self: end; margin: 0; color: #8a96a8; display: flex; flex-direction: column; align-items: flex-end; gap: 1px; font-size: 9px; font-weight: 600; white-space: nowrap; }
      .aci-page.aci-car-overview-page .rival-overview-button p b { color: #17233d; font-size: 13px; font-weight: 750; }
      .aci-page.aci-car-overview-page .rival-compare-button { width: 100%; min-height: 42px; border: 0; border-top: 1px solid #e8edf3; padding: 0 12px; background: transparent; color: #3c4c65; display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; font-weight: 700; cursor: pointer; }
      .aci-page.aci-car-overview-page .rival-compare-button:hover { background: #f7f9fc; color: var(--overview-blue); }

      .aci-page.aci-car-overview-page .desktop-grid > .variants-panel {
        grid-column: 1 / -1;
        order: 1;
      }

      .aci-page.aci-car-overview-page .desktop-grid > .highlights-panel {
        grid-column: 1 / span 5;
        order: 2;
      }

      .aci-page.aci-car-overview-page .desktop-grid > .research-path-panel {
        grid-column: 6 / -1;
        order: 2;
      }

      .aci-page.aci-car-overview-page .desktop-grid > .rivals-panel {
        order: 3;
      }

      .aci-page.aci-car-overview-page .variant-studio {
        min-height: 316px;
        border: 1px solid #dce4ee;
        border-radius: 14px;
        background: #fff;
        overflow: hidden;
        display: grid;
        grid-template-columns: minmax(270px, .92fr) minmax(360px, 1.25fr) minmax(166px, .55fr);
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-card-grid {
        min-height: 0;
        padding: 13px;
        border: 0;
        border-radius: 0;
        background: #f7f9fc;
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: repeat(3, minmax(0, 1fr));
        gap: 8px;
        overflow: visible;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-card {
        min-height: 0;
        border: 1px solid #dde5ef;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 8px 20px -22px rgba(15, 23, 42, .7);
        overflow: hidden;
        transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-card:hover {
        border-color: #aebfd5;
        background: #fff;
        box-shadow: 0 14px 28px -24px rgba(28, 52, 84, .55);
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-card.is-mid {
        border-color: #9ebbe5;
        background: #eef5ff;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-card.is-mid:hover {
        background: #e8f1ff;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-content {
        padding: 10px 12px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        grid-template-rows: auto minmax(0, 1fr);
        align-items: center;
        gap: 5px 10px;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-tier {
        min-height: 20px;
        padding: 0 7px;
        border: 0;
        border-radius: 5px;
        background: #eef1f5;
        color: #59677c;
        font-size: 8px;
      }

      .aci-page.aci-car-overview-page .variant-studio .is-mid .variant-tier {
        border: 0;
        background: #d9e9ff;
        color: #174f9d;
      }

      .aci-page.aci-car-overview-page .variant-studio .is-top .variant-tier {
        background: #fff0d2;
        color: #845a09;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-title-row {
        margin: 0;
        grid-column: 2;
        grid-row: 1;
        align-items: center;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-title-row svg {
        margin: 0;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-content h4 {
        font-size: 13px;
        line-height: 1.15;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-detail-row {
        grid-column: 1 / -1;
        grid-row: 2;
        margin: 0;
        align-items: end;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-content p {
        font-size: 9px;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-content small {
        font-size: 8px;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-content strong {
        font-size: 14px;
      }

      .aci-page.aci-car-overview-page .variant-studio-visual {
        min-width: 0;
        min-height: 316px;
        padding: 18px;
        background: #edf5ff;
        display: grid;
        place-items: center;
        overflow: hidden;
      }

      .aci-page.aci-car-overview-page .variant-studio-visual > div {
        width: 100%;
      }

      .aci-page.aci-car-overview-page .variant-studio-photo {
        width: 112%;
        height: 258px;
        margin-left: -6%;
        border: 0;
        border-radius: 0;
        background: #edf5ff;
      }

      .aci-page.aci-car-overview-page .variant-studio-photo .aci-car-stage-image {
        transform: scale(1.32) translateY(2px);
        transform-origin: 50% 68%;
      }

      .aci-page.aci-car-overview-page .variant-color-rail {
        min-width: 0;
        padding: 22px 16px 16px;
        border-left: 1px solid #e7e0d2;
        background: #fff9ec;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }

      .aci-page.aci-car-overview-page .color-rail-kicker {
        color: #99712c;
        font-size: 8px;
        line-height: 1.2;
        font-weight: 780;
        text-transform: uppercase;
      }

      .aci-page.aci-car-overview-page .variant-color-rail > strong {
        min-height: 34px;
        margin-top: 5px;
        color: #17213a;
        font-size: 13px;
        line-height: 1.25;
        font-weight: 740;
        overflow-wrap: anywhere;
      }

      .aci-page.aci-car-overview-page .variant-color-swatches {
        width: 100%;
        margin-top: 16px;
        display: grid;
        grid-template-columns: repeat(3, 34px);
        gap: 10px;
      }

      .aci-page.aci-car-overview-page .variant-color-swatches button {
        position: relative;
        width: 34px;
        height: 34px;
        padding: 3px;
        border: 1px solid transparent;
        border-radius: 50%;
        background: transparent;
        color: #fff;
        cursor: pointer;
        transition: border-color 160ms ease, box-shadow 160ms ease;
      }

      .aci-page.aci-car-overview-page .variant-color-swatches button > span {
        width: 100%;
        height: 100%;
        border: 1px solid rgba(15, 23, 42, .14);
        border-radius: 50%;
        box-shadow: inset 0 1px 2px rgba(255,255,255,.55);
        display: block;
      }

      .aci-page.aci-car-overview-page .variant-color-swatches button > svg {
        position: absolute;
        right: -2px;
        bottom: -2px;
        width: 16px;
        height: 16px;
        padding: 2px;
        border-radius: 50%;
        background: var(--overview-blue);
        box-shadow: 0 0 0 2px #fff;
      }

      .aci-page.aci-car-overview-page .variant-color-swatches button.is-active {
        border-color: var(--overview-blue);
        box-shadow: 0 0 0 2px #fff, 0 0 0 3px var(--overview-blue);
      }

      .aci-page.aci-car-overview-page .view-all-colors {
        min-height: 32px;
        margin-top: auto;
        padding: 0;
        border: 0;
        background: transparent;
        color: #654b1c;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 10px;
        font-weight: 720;
        cursor: pointer;
      }

      .aci-page.aci-car-overview-page .highlights-panel {
        min-height: 326px !important;
        padding: 18px !important;
        border: 1px solid #dee5ee !important;
        border-radius: 14px !important;
        background: #fff !important;
      }

      .aci-page.aci-car-overview-page .highlight-card-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .aci-page.aci-car-overview-page .highlight-card {
        position: relative;
        min-width: 0;
        min-height: 72px;
        padding: 10px 26px 10px 10px;
        border: 1px solid transparent;
        border-radius: 8px;
        color: #1c2942;
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        grid-template-rows: auto auto;
        align-items: center;
        gap: 2px 8px;
        text-align: left;
        cursor: pointer;
        transition: border-color 160ms ease, filter 160ms ease;
      }

      .aci-page.aci-car-overview-page .highlight-card:hover {
        border-color: rgba(15, 23, 42, .16);
        filter: saturate(1.04);
      }

      .aci-page.aci-car-overview-page .highlight-card > span {
        grid-row: 1 / span 2;
        width: 28px;
        height: 28px;
        border-radius: 7px;
        background: rgba(255,255,255,.72);
        display: grid;
        place-items: center;
      }

      .aci-page.aci-car-overview-page .highlight-card > strong {
        min-width: 0;
        font-size: 10.5px;
        line-height: 1.2;
        font-weight: 740;
        overflow-wrap: anywhere;
      }

      .aci-page.aci-car-overview-page .highlight-card > small {
        min-width: 0;
        color: #5c687b;
        font-size: 8.5px;
        line-height: 1.2;
        font-weight: 580;
        overflow-wrap: anywhere;
      }

      .aci-page.aci-car-overview-page .highlight-card > svg {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        color: #7d8796;
      }

      .aci-page.aci-car-overview-page .highlight-card.tone-1 { background: #e9f6f1; color: #155e4b; }
      .aci-page.aci-car-overview-page .highlight-card.tone-2 { background: #fff3d8; color: #72510d; }
      .aci-page.aci-car-overview-page .highlight-card.tone-3 { background: #eaf2ff; color: #234f8a; }
      .aci-page.aci-car-overview-page .highlight-card.tone-4 { background: #fff0f2; color: #834153; }
      .aci-page.aci-car-overview-page .highlight-card.tone-5 { background: #eef6e8; color: #3d672d; }
      .aci-page.aci-car-overview-page .highlight-card.tone-6 { background: #f2efff; color: #5a4b8a; }

      .aci-page.aci-car-overview-page .research-path-panel {
        min-height: 326px !important;
      }

      .aci-page.aci-car-overview-page .rival-overview-button {
        grid-template-rows: 112px auto auto;
      }

      /* Product-stage refinement: white surfaces, colored type and tighter rhythm. */
      .aci-page.aci-car-overview-page .desktop-page {
        padding-top: 14px;
        gap: 10px;
      }

      .aci-page.aci-car-overview-page .overview-hero {
        min-height: 312px;
        padding: 22px 24px;
        border-color: #d9e2ee;
        border-radius: 18px;
        box-shadow: 0 18px 44px -38px rgba(15, 35, 68, .48);
        grid-template-columns: minmax(250px, .76fr) minmax(450px, 1.48fr) 220px;
        gap: 14px;
      }

      .aci-page.aci-car-overview-page .overview-kicker {
        color: #087767;
      }

      .aci-page.aci-car-overview-page .hero-copy h1 {
        color: #102c63;
        font-size: 46px;
      }

      .aci-page.aci-car-overview-page .hero-copy {
        position: relative;
        z-index: 2;
        padding-left: 14px;
      }

      .aci-page.aci-car-overview-page .hero-copy::before {
        content: "";
        position: absolute;
        top: 2px;
        bottom: 2px;
        left: 0;
        width: 3px;
        border-radius: 3px;
        background: #1766d8;
      }

      .aci-page.aci-car-overview-page .hero-chips button:nth-child(1) { color: #087767; }
      .aci-page.aci-car-overview-page .hero-chips button:nth-child(2) { color: #a34a10; }

      .aci-page.aci-car-overview-page .hero-car-stage {
        min-height: 268px;
        border-radius: 12px;
        background: #fff;
        box-shadow: none;
        overflow: visible;
      }

      .aci-page.aci-car-overview-page .hero-car-stage::before {
        display: none;
      }

      .aci-page.aci-car-overview-page .hero-car-stage::after {
        z-index: 2;
        left: 17%;
        right: 17%;
        bottom: 20px;
        height: 24px;
        border-radius: 50%;
        background: rgba(26, 43, 67, .14);
        filter: blur(10px);
        pointer-events: none;
      }

      .aci-page.aci-car-overview-page .hero-car-photo {
        width: 100%;
        height: 268px;
        border: 0;
        border-radius: 0;
        background: #fff;
        overflow: visible;
      }

      .aci-page.aci-car-overview-page .hero-car-photo .aci-car-image-stage {
        border: 0;
        background: transparent;
        overflow: visible;
      }

      .aci-page.aci-car-overview-page .hero-car-photo .aci-car-stage-glow,
      .aci-page.aci-car-overview-page .hero-car-photo .aci-car-stage-ground {
        display: none;
      }

      .aci-page.aci-car-overview-page .hero-car-photo .aci-car-stage-image {
        transform: scale(1.27) translateY(15px);
        transform-origin: 50% 78%;
      }

      .aci-page.aci-car-overview-page .price-card {
        padding: 20px 0 3px 20px;
      }

      .aci-page.aci-car-overview-page .price-card > p {
        color: #087767;
      }

      .aci-page.aci-car-overview-page .price-card > strong {
        color: var(--overview-blue);
      }

      .aci-page.aci-car-overview-page .price-card-facts b {
        color: #a34a10;
      }

      .aci-page.aci-car-overview-page .overview-action-bar {
        min-height: 62px;
        border-radius: 12px;
      }

      .aci-page.aci-car-overview-page .desktop-grid {
        margin-top: 2px;
        gap: 12px;
      }

      .aci-page.aci-car-overview-page .panel-head {
        min-height: 40px;
        margin-bottom: 8px;
      }

      .aci-page.aci-car-overview-page .desktop-grid > .variants-panel {
        padding: 16px !important;
        border: 1px solid #dce4ee !important;
        border-radius: 16px !important;
        background: #fff !important;
        box-shadow: 0 16px 38px -38px rgba(15, 35, 68, .42) !important;
      }

      .aci-page.aci-car-overview-page .variants-panel .panel-head h3 {
        color: #0d438f;
      }

      .aci-page.aci-car-overview-page .variants-panel .panel-head > button {
        color: #087767;
      }

      .aci-page.aci-car-overview-page .variant-studio {
        min-height: 342px;
        border: 0;
        border-top: 1px solid #e3e9f1;
        border-radius: 0;
        grid-template-columns: minmax(286px, .84fr) minmax(460px, 1.62fr) minmax(168px, .5fr);
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-card-grid {
        padding: 13px 13px 13px 0;
        background: #fff;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-card,
      .aci-page.aci-car-overview-page .variant-studio .variant-card.is-mid,
      .aci-page.aci-car-overview-page .variant-studio .variant-card.is-mid:hover {
        background: #fff;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-card.is-mid {
        border-color: #7fa9e6;
        box-shadow: inset 3px 0 0 #1766d8;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-tier,
      .aci-page.aci-car-overview-page .variant-studio .is-mid .variant-tier,
      .aci-page.aci-car-overview-page .variant-studio .is-top .variant-tier {
        background: transparent;
      }

      .aci-page.aci-car-overview-page .variant-studio .variant-tier { color: #087767; }
      .aci-page.aci-car-overview-page .variant-studio .is-mid .variant-tier { color: #1766d8; }
      .aci-page.aci-car-overview-page .variant-studio .is-top .variant-tier { color: #a34a10; }

      .aci-page.aci-car-overview-page .variant-studio-visual {
        min-height: 342px;
        padding: 0 8px;
        border-left: 1px solid #edf0f5;
        background: #fff;
      }

      .aci-page.aci-car-overview-page .variant-studio-photo {
        width: 100%;
        height: 330px;
        margin-left: 0;
        background: #fff;
        overflow: visible;
      }

      .aci-page.aci-car-overview-page .variant-studio-photo .aci-car-image-stage {
        border: 0;
        border-radius: 0;
        background: transparent;
        overflow: visible;
      }

      .aci-page.aci-car-overview-page .variant-studio-photo .aci-car-stage-glow {
        display: none;
      }

      .aci-page.aci-car-overview-page .variant-studio-photo .aci-car-stage-ground {
        bottom: 9%;
        width: 72%;
        opacity: .72;
      }

      .aci-page.aci-car-overview-page .variant-studio-photo .aci-car-stage-image {
        transform: scale(1.78) translateY(6px);
        transform-origin: 50% 72%;
      }

      .aci-page.aci-car-overview-page .variant-color-rail {
        padding: 20px 13px 14px;
        border-left-color: #e3e9f1;
        background: #fff;
      }

      .aci-page.aci-car-overview-page .color-rail-kicker,
      .aci-page.aci-car-overview-page .view-all-colors {
        color: #1766d8;
      }

      .aci-page.aci-car-overview-page .variant-color-rail > strong {
        color: #087767;
      }

      .aci-page.aci-car-overview-page .highlights-panel,
      .aci-page.aci-car-overview-page .research-path-panel {
        min-height: 302px !important;
        padding: 16px !important;
      }

      .aci-page.aci-car-overview-page .highlight-card-grid {
        gap: 6px;
      }

      .aci-page.aci-car-overview-page .highlight-card,
      .aci-page.aci-car-overview-page .highlight-card.tone-1,
      .aci-page.aci-car-overview-page .highlight-card.tone-2,
      .aci-page.aci-car-overview-page .highlight-card.tone-3,
      .aci-page.aci-car-overview-page .highlight-card.tone-4,
      .aci-page.aci-car-overview-page .highlight-card.tone-5,
      .aci-page.aci-car-overview-page .highlight-card.tone-6 {
        min-height: 68px;
        border-color: #e4e9f0;
        background: #fff;
      }

      .aci-page.aci-car-overview-page .highlight-card.tone-1 { color: #087767; }
      .aci-page.aci-car-overview-page .highlight-card.tone-2 { color: #a34a10; }
      .aci-page.aci-car-overview-page .highlight-card.tone-3 { color: #1766d8; }
      .aci-page.aci-car-overview-page .highlight-card.tone-4 { color: #a13f65; }
      .aci-page.aci-car-overview-page .highlight-card.tone-5 { color: #4f7a2e; }
      .aci-page.aci-car-overview-page .highlight-card.tone-6 { color: #6a51a3; }

      .aci-page.aci-car-overview-page .highlight-card > span {
        background: transparent;
      }

      .aci-page.aci-car-overview-page .rivals-panel {
        padding: 16px !important;
      }

      .aci-page.aci-car-overview-page .rivals-panel .panel-head h3 {
        color: #087767;
      }

      .aci-page.aci-car-overview-page .rival-card {
        min-height: 220px;
        border-radius: 10px;
        grid-template-rows: minmax(0, 1fr) 38px;
      }

      .aci-page.aci-car-overview-page .rival-overview-button {
        padding: 10px 12px 8px;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-rows: 104px auto auto;
        gap: 3px 10px;
      }

      .aci-page.aci-car-overview-page .rival-pair-visual {
        grid-column: 1 / -1;
        width: 100%;
        height: 104px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr);
        align-items: center;
        gap: 2px;
      }

      .aci-page.aci-car-overview-page .rival-pair-vs {
        width: 24px;
        height: 24px;
        border: 1px solid #d9e2ed;
        border-radius: 50%;
        background: #fff;
        color: #708096;
        display: grid;
        place-items: center;
        font-size: 8px;
        font-weight: 760;
        text-transform: uppercase;
      }

      .aci-page.aci-car-overview-page .rival-visual {
        grid-column: auto;
        width: 100%;
        height: 96px;
        border-radius: 0;
        background: #fff;
      }

      .aci-page.aci-car-overview-page .rival-visual .aci-car-image-stage {
        border: 0;
        border-radius: 0;
        background: #fff;
      }

      .aci-page.aci-car-overview-page .rival-visual .aci-car-stage-glow,
      .aci-page.aci-car-overview-page .rival-visual .aci-car-stage-skeleton {
        display: none;
      }

      .aci-page.aci-car-overview-page .rival-visual .aci-car-stage-image {
        transform: scale(1.15);
      }

      .aci-page.aci-car-overview-page .rival-overview-button small {
        grid-column: 1;
        grid-row: 2;
        color: #1766d8;
        text-transform: uppercase;
      }

      .aci-page.aci-car-overview-page .rival-overview-button strong {
        grid-column: 1 / -1;
        grid-row: 3;
        font-size: 15px;
      }

      .aci-page.aci-car-overview-page .rival-overview-button strong span {
        color: #8a96a8;
        font-size: 10px;
        font-weight: 650;
      }

      .aci-page.aci-car-overview-page .rival-overview-button p {
        grid-column: 2;
        grid-row: 2;
        align-self: center;
        color: #758296;
      }

      .aci-page.aci-car-overview-page .rival-compare-button {
        min-height: 38px;
        color: #1766d8;
      }

      .aci-page.aci-car-overview-page button:focus-visible {
        outline: 3px solid rgba(7, 94, 232, .22);
        outline-offset: 2px;
      }

      @media (max-width: 1180px) {
        body:has(.aci-car-overview-page) .aci-v2-portal-header,
        body:has(.aci-car-overview-page) .aci-v2-portal-header.is-compact {
          width: min(calc(100% - 20px), 430px);
        }

        .aci-page.aci-car-overview-page { padding-bottom: 98px; background: #fff; }
        .aci-page.aci-car-overview-page .desktop-page { display: none; }
        .aci-page.aci-car-overview-page .mobile-page {
          width: min(100%, 430px);
          max-width: 430px;
          margin: 0 auto;
          padding: 8px 16px 36px;
          background: #fff;
          box-shadow: none;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .aci-page.aci-car-overview-page .mobile-overview-hero {
          min-height: 0 !important;
          padding: 22px 0 18px;
          border: 0;
          border-bottom: 1px solid #e3e8ef;
          border-radius: 0;
          background: #fff;
          box-shadow: none;
        }

        .aci-page.aci-car-overview-page .mobile-memory-chip {
          height: auto;
          margin: 0 0 12px;
          padding: 0;
          border: 0;
          background: transparent;
          box-shadow: none;
          color: var(--overview-blue);
          font-size: 9px;
          font-weight: 760;
          text-transform: uppercase;
        }

        .aci-page.aci-car-overview-page .mobile-memory-chip svg { display: none; }
        .aci-page.aci-car-overview-page .mobile-hero-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .aci-page.aci-car-overview-page .mobile-hero-grid h1 { margin: 0; color: #0b1533; font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: 34px !important; line-height: 1; letter-spacing: 0; font-weight: 790; }
        .aci-page.aci-car-overview-page .mobile-hero-grid p { margin: 8px 0 0; color: #64748b; font-size: 12px; font-weight: 600; }
        .aci-page.aci-car-overview-page .mobile-hero-chips { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
        .aci-page.aci-car-overview-page .mobile-hero-car { min-height: 168px; margin: 0; border-radius: 14px; background: #fff; box-shadow: inset 0 0 0 1px #e7ebf1; overflow: hidden; }
        .aci-page.aci-car-overview-page .mobile-hero-car-photo { width: 108%; height: 168px; }
        .aci-page.aci-car-overview-page .mobile-hero-car-photo .aci-car-image-stage { border: 0; background: transparent; }
        .aci-page.aci-car-overview-page .mobile-hero-car-photo .aci-car-stage-glow { display: none; }
        .aci-page.aci-car-overview-page .mobile-hero-car-photo .aci-car-stage-image { transform: scale(1.32) translateY(5px); transform-origin: 50% 72%; }

        .aci-page.aci-car-overview-page .mobile-price-card {
          min-height: 76px;
          margin-top: 12px;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 128px;
          align-items: end;
          gap: 12px;
        }

        .aci-page.aci-car-overview-page .mobile-price-card p { margin: 0 0 4px; color: #8a96a8; font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .aci-page.aci-car-overview-page .mobile-price-card strong { color: #101b36; font-size: 24px; line-height: 1; font-weight: 790; }
        .aci-page.aci-car-overview-page .mobile-price-card span { margin-top: 4px; color: #7b8799; font-size: 9px; }
        .aci-page.aci-car-overview-page .mobile-price-card button { width: 100%; min-height: 42px; border: 0; border-radius: 8px; background: var(--overview-blue); color: #fff; display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 11px; font-weight: 700; }

        .aci-page.aci-car-overview-page .overview-action-bar.is-mobile {
          width: 100%;
          min-height: 0;
          padding: 18px 0;
          border: 0;
          border-bottom: 1px solid #e3e8ef;
          border-radius: 0;
          background: #fff;
          box-shadow: none;
          display: block;
        }

        .aci-page.aci-car-overview-page .overview-action-heading { margin-bottom: 10px; flex-direction: row; align-items: baseline; gap: 5px; }
        .aci-page.aci-car-overview-page .overview-action-heading span { font-size: 10px; }
        .aci-page.aci-car-overview-page .overview-action-heading strong { font-size: 16px; }
        .aci-page.aci-car-overview-page .overview-action-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
        .aci-page.aci-car-overview-page .overview-action-list button { min-height: 62px; padding: 9px; border: 1px solid #e0e6ee; border-radius: 9px; background: #fff; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 5px; }
        .aci-page.aci-car-overview-page .overview-action-list button span { width: 100%; font-size: 10px; white-space: normal; }
        .aci-page.aci-car-overview-page .overview-action-list button svg:last-child { display: none; }

        .aci-page.aci-car-overview-page .mobile-page > .panel,
        .aci-page.aci-car-overview-page .mobile-page > .mobile-stat-strip {
          min-height: 0;
          padding: 20px 0 !important;
          border: 0 !important;
          border-bottom: 1px solid #e3e8ef !important;
          border-radius: 0 !important;
          background: #fff !important;
          box-shadow: none !important;
        }

        .aci-page.aci-car-overview-page .panel-head { min-height: 42px; margin-bottom: 10px; }
        .aci-page.aci-car-overview-page .panel-head h3 { font-size: 17px; }
        .aci-page.aci-car-overview-page .panel-head p { display: none; }

        .aci-page.aci-car-overview-page .mobile-research-path .research-step-list { display: grid; grid-template-columns: 1fr; gap: 0; }
        .aci-page.aci-car-overview-page .mobile-research-path .research-step-list > button { min-height: 58px; }
        .aci-page.aci-car-overview-page .mobile-research-path .research-step-copy em { display: block; color: #8a96a8; font-size: 9px; font-style: normal; }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-card-grid {
          min-height: 0;
          grid-template-columns: 1fr;
          border-radius: 12px;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-card {
          min-height: 116px;
          border-right: 0;
          border-bottom: 1px solid #e3e8ef;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-card:last-child {
          border-bottom: 0;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-content {
          padding: 13px 14px;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-title-row {
          margin-top: 9px;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-content h4 {
          font-size: 14px;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-detail-row {
          margin-top: 12px;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-content strong {
          font-size: 15px;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-studio {
          min-height: 0;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-studio-visual {
          order: 1;
          min-height: 184px;
          padding: 8px 14px;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-studio-photo {
          width: 100%;
          height: 184px;
          margin-left: 0;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-studio-photo .aci-car-stage-image {
          transform: scale(1.7) translateY(2px);
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-color-rail {
          order: 2;
          min-height: 88px;
          padding: 12px 13px;
          border-top: 1px solid #eadfca;
          border-left: 0;
          display: grid;
          grid-template-columns: minmax(92px, 1fr) minmax(0, 2fr) auto;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 2px 10px;
        }

        .aci-page.aci-car-overview-page .variant-color-rail > strong {
          min-height: 0;
          margin: 0;
          grid-column: 1;
          grid-row: 2;
          font-size: 11px;
        }

        .aci-page.aci-car-overview-page .variant-color-swatches {
          margin: 0;
          grid-column: 2;
          grid-row: 1 / span 2;
          display: flex;
          gap: 7px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .aci-page.aci-car-overview-page .variant-color-swatches::-webkit-scrollbar {
          display: none;
        }

        .aci-page.aci-car-overview-page .variant-color-swatches button {
          flex: 0 0 30px;
          width: 30px;
          height: 30px;
        }

        .aci-page.aci-car-overview-page .view-all-colors {
          grid-column: 3;
          grid-row: 1 / span 2;
          margin: 0;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-card-grid {
          order: 3;
          min-height: 0;
          padding: 10px;
          border-top: 1px solid #e3e8ef;
          border-radius: 0;
          display: grid;
          gap: 7px;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-card {
          min-height: 86px;
          border: 1px solid #dde5ef;
          border-radius: 8px;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-content {
          padding: 9px 10px;
        }

        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-title-row,
        .aci-page.aci-car-overview-page .mobile-variants-panel .variant-detail-row {
          margin: 0;
        }

        .aci-page.aci-car-overview-page .mobile-highlights-panel .highlight-card-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px;
        }

        .aci-page.aci-car-overview-page .mobile-highlights-panel .highlight-card {
          min-height: 88px;
          padding: 10px 22px 10px 9px;
          grid-template-columns: 26px minmax(0, 1fr);
          gap: 3px 7px;
        }

        .aci-page.aci-car-overview-page .mobile-highlights-panel .highlight-card > span {
          width: 26px;
          height: 26px;
        }

        .aci-page.aci-car-overview-page .mobile-stat-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .aci-page.aci-car-overview-page .mobile-stat-strip button { min-width: 0; min-height: 82px; padding: 8px; border: 0; border-right: 1px solid #e7ebf1; background: transparent; color: #536177; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; }
        .aci-page.aci-car-overview-page .mobile-stat-strip button:last-child { border-right: 0; }
        .aci-page.aci-car-overview-page .mobile-stat-strip strong { max-width: 100%; color: #17233d; font-size: 12px; overflow-wrap: anywhere; }
        .aci-page.aci-car-overview-page .mobile-stat-strip span { color: #8a96a8; font-size: 9px; }
        .aci-page.aci-car-overview-page .rival-card-grid {
          width: 100%;
          padding: 0 30px 3px 0;
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }

        .aci-page.aci-car-overview-page .rival-card-grid::-webkit-scrollbar { display: none; }
        .aci-page.aci-car-overview-page .rival-card { flex: 0 0 88%; min-height: 236px; scroll-snap-align: start; scroll-snap-stop: always; }
      }

      @media (max-width: 390px) {
        .aci-page.aci-car-overview-page .mobile-page { padding-inline: 13px; }
        .aci-page.aci-car-overview-page .mobile-hero-grid h1 { font-size: 31px !important; }
        .aci-page.aci-car-overview-page .mobile-price-card { grid-template-columns: minmax(0, 1fr) 118px; }
        .aci-page.aci-car-overview-page .overview-action-list button { min-height: 58px; padding: 7px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .aci-page.aci-car-overview-page *,
        .aci-page.aci-car-overview-page *::before,
        .aci-page.aci-car-overview-page *::after {
          scroll-behavior: auto !important;
          transition-duration: .01ms !important;
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
        }
      }
    `}</style>
  );
}
