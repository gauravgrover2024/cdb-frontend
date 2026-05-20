import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Fuel,
  Gauge,
  IndianRupee,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
  Scale,
} from "lucide-react";

import { ACI_CANVAS_TYPES, ACI_INTENTS } from "../shared/aciV2Constants";
import {
  buildVehicleQuickActions,
  makeAciAction,
} from "../data/homeScreenData";
import {
  AciAssistantOrb,
  AciComposer,
  AciLogo,
  AciSavedButton,
  AciVehicleVisual,
  emitAciAction,
  fadeUp,
  stagger,
} from "../shared/AciAssistShared";
import { buildVehicleContextPatch } from "../context/aciV2ContextManager";

const compact = (value) => String(value || "").trim();
const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const firstPresent = (...values) =>
  values.find((value) => compact(value).length > 0) || "";
const hasValue = (value) => compact(value).length > 0;

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

const getCanvas = (key, fallback) => ACI_CANVAS_TYPES?.[key] || fallback;
const getIntent = (key, fallback) => ACI_INTENTS?.[key] || fallback;

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
    payload,
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

const rivalsAction = (vehicle = {}) =>
  actionFor({
    id: `${getVehicleId(vehicle)}-rivals`,
    label: "Find similar cars",
    query: `Suggest cars similar to ${getVehicleModel(vehicle)}`,
    intent: getIntent("RECOMMENDATIONS", "vehicle_recommendations"),
    canvasType: getCanvas("RECOMMENDATION", "recommendation_results_canvas"),
    vehicle,
  });

const buildOverviewActions = (vehicle = {}) => {
  const knownActions = toArray(buildVehicleQuickActions(vehicle));
  const byLabel = new Map(
    knownActions.map((action) => [compact(action.label).toLowerCase(), action]),
  );
  const resolve = (label, fallback) =>
    byLabel.get(label.toLowerCase()) || fallback(vehicle);

  return [
    {
      id: "price",
      icon: IndianRupee,
      tone: "blue",
      ...resolve("Price list", priceListAction),
      label: "Price list",
    },
    {
      id: "emi",
      icon: Calculator,
      tone: "blue",
      ...resolve("Calculate EMI", emiAction),
      label: "EMI",
    },
    {
      id: "compare",
      icon: Scale,
      tone: "blue",
      ...resolve("Compare", compareAction),
      label: "Compare",
    },
    {
      id: "colors",
      icon: Palette,
      tone: "blue",
      ...resolve("Colors", colorsAction),
      label: "Colors",
    },
    {
      id: "features",
      icon: Sparkles,
      tone: "blue",
      ...resolve("Features", featuresAction),
      label: "Features",
    },
    {
      id: "quote",
      icon: FileText,
      tone: "gold",
      ...resolve("Get quotation", quotationAction),
      label: "Get quotation",
    },
  ];
};

const vehicleChips = (vehicle = {}) =>
  [
    vehicle.variantCount ? `${vehicle.variantCount} variants` : "",
    vehicle.fuelText,
    vehicle.transmissionText,
  ].filter(hasValue);

const vehicleHighlights = (vehicle = {}) => {
  if (Array.isArray(vehicle.highlights) && vehicle.highlights.length) {
    return vehicle.highlights
      .filter(Boolean)
      .map((item) => ({
        icon: resolveOverviewIcon(item.label, item.icon),
        value: item.value,
        label: item.label,
      }))
      .filter((item) => hasValue(item.value) || hasValue(item.label));
  }

  return [
    vehicle.variantCount
      ? { icon: Star, value: vehicle.variantCount, label: "Variants" }
      : null,
    vehicle.fuelText
      ? { icon: Fuel, value: vehicle.fuelText, label: "Fuel options" }
      : null,
    vehicle.transmissionText
      ? { icon: Scale, value: vehicle.transmissionText, label: "Transmissions" }
      : null,
    vehicle.mileage
      ? { icon: Gauge, value: vehicle.mileage, label: "Mileage" }
      : null,
    vehicle.safetyRating
      ? { icon: Star, value: vehicle.safetyRating, label: "Safety" }
      : null,
    vehicle.bootSpace
      ? { icon: Wallet, value: vehicle.bootSpace, label: "Boot space" }
      : null,
  ].filter(Boolean);
};

const vehicleFacts = (vehicle = {}) =>
  [
    vehicle.mileage
      ? { icon: Gauge, label: "Mileage", value: vehicle.mileage }
      : null,
    vehicle.bootSpace
      ? { icon: Wallet, label: "Boot Space", value: vehicle.bootSpace }
      : null,
    vehicle.safetyRating
      ? { icon: ShieldCheck, label: "Safety", value: vehicle.safetyRating }
      : null,
  ].filter(Boolean);

const resolveOverviewIcon = (label = "", provided) => {
  if (typeof provided === "function") return provided;

  const text = String(label || "").toLowerCase();
  if (/price|rupee|ex-showroom|on-road/.test(text)) return IndianRupee;
  if (/emi|loan|finance/.test(text)) return Calculator;
  if (/compare|rival|similar/.test(text)) return Scale;
  if (/color|colour|shade/.test(text)) return Palette;
  if (/feature|spec|highlight/.test(text)) return Star;
  if (/quote|quotation|document/.test(text)) return FileText;
  if (/fuel|petrol|diesel|cng|electric|hybrid/.test(text)) return Fuel;
  if (/transmission|manual|automatic|gear|dct|cvt|ivt|amt/.test(text))
    return Scale;
  if (/mileage|range|km/.test(text)) return Gauge;
  if (/safety|airbag|ncap|rating/.test(text)) return ShieldCheck;
  if (/boot|space|storage/.test(text)) return Wallet;
  if (/variant|version|trim/.test(text)) return Star;

  return Sparkles;
};

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

function SliderDots({ count = 0, active = 0, max = 5 }) {
  const visible = Math.min(Math.max(count, 0), max);
  if (visible <= 1) return null;

  return (
    <div className="slider-dots" aria-hidden="true">
      {Array.from({ length: visible }).map((_, index) => (
        <span
          key={index}
          className={index === Math.min(active, visible - 1) ? "active" : ""}
        />
      ))}
    </div>
  );
}

function useSliderIndex(count) {
  const ref = useRef(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const node = ref.current;
    if (!node || count <= 1) return;

    const maxScroll = Math.max(node.scrollWidth - node.clientWidth, 1);
    const ratio = node.scrollLeft / maxScroll;
    const next = Math.round(ratio * (Math.min(count, 5) - 1));
    setActive(Math.max(0, Math.min(Math.min(count, 5) - 1, next)));
  };

  return { ref, active, onScroll };
}

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

function ColorOrb({ hex, name, selected }) {
  const isLight = useMemo(() => {
    const clean = String(hex || "#ffffff").replace("#", "");
    const r = parseInt(clean.slice(0, 2), 16) || 255;
    const g = parseInt(clean.slice(2, 4), 16) || 255;
    const b = parseInt(clean.slice(4, 6), 16) || 255;
    return (r * 299 + g * 587 + b * 114) / 1000 > 170;
  }, [hex]);

  return (
    <div
      className={`color-orb ${selected ? "selected" : ""} ${isLight ? "light" : "dark"}`}
      style={{
        background: `radial-gradient(circle at 32% 26%, rgba(255,255,255,.94), ${hex || "#ffffff"} 34%, ${hex || "#ffffff"} 62%, rgba(15,23,42,.38) 140%)`,
      }}
      title={name}
    >
      <span />
      {selected ? (
        <b>
          <Check size={11} strokeWidth={3} />
        </b>
      ) : null}
    </div>
  );
}

function DesktopHeader({ data = {}, onAction }) {
  return (
    <motion.header
      className="desktop-header"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="desktop-header-left">
        <AciLogo compact onAction={onAction} />
      </div>

      <div className="desktop-header-center">
        <label className="desktop-search">
          <Search size={18} />
          <input placeholder="Search cars, prices, features, EMI, compare..." />
          <button
            type="button"
            onClick={() => emitAciAction({ label: "Command search" }, onAction)}
          >
            ⌘ K
          </button>
        </label>
      </div>

      <div className="desktop-header-right">
        <button
          type="button"
          className="bell-button"
          onClick={() => emitAciAction({ label: "Notifications" }, onAction)}
          aria-label="Notifications"
        >
          <Bell size={22} />
          <i />
        </button>

        <button
          type="button"
          className="avatar-button"
          onClick={() => emitAciAction({ label: "Profile" }, onAction)}
          aria-label="Profile"
        >
          {data?.avatarUrl ? (
            <img src={data.avatarUrl} alt="Profile" />
          ) : (
            <span />
          )}
        </button>

        <button
          type="button"
          className="plain-button"
          onClick={() => emitAciAction({ label: "Profile menu" }, onAction)}
          aria-label="Profile menu"
        >
          <ChevronDown size={16} />
        </button>
      </div>
    </motion.header>
  );
}

function DesktopHero({ vehicle = {}, onAction, savedIds, onToggleSaved }) {
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
        <div className="hero-badges">
          <button
            type="button"
            className="soft-badge blue"
            onClick={() =>
              emitAciAction(
                {
                  label: "Selected car hub",
                  query: title,
                  intent: getIntent("OPEN_VEHICLE", "open_vehicle"),
                  canvasType: getCanvas("CAR_OVERVIEW", "car_overview_canvas"),
                  vehicle,
                  contextPatch: buildContextPatch(vehicle),
                },
                onAction,
              )
            }
          >
            <ShieldCheck size={14} />
            Selected car hub
          </button>

          <button
            type="button"
            className="soft-badge gold"
            onClick={() =>
              emitAciAction(
                {
                  label: "ACI Assist remembers this car",
                  query: title,
                  type: "context_info",
                  vehicle,
                  contextPatch: buildContextPatch(vehicle),
                },
                onAction,
              )
            }
          >
            <Sparkles size={14} />
            ACI Assist remembers this car
          </button>

          <AciSavedButton
            vehicle={vehicle}
            saved={savedIds?.has?.(getVehicleId(vehicle))}
            onToggleSaved={onToggleSaved}
            className="soft-badge save-badge"
            size={15}
          />
        </div>

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
            [vehicle.segment, vehicle.city ? `${vehicle.city} prices` : ""]
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
                      label: chip,
                      query: `${getVehicleModel(vehicle)} ${chip}`,
                      vehicle,
                      contextPatch: buildContextPatch(vehicle),
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
        initial={{ opacity: 0, x: 22 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65 }}
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
      </aside>
    </motion.section>
  );
}

function DesktopActionStrip({ vehicle = {}, onAction }) {
  const actions = buildOverviewActions(vehicle);

  return (
    <motion.section className="desktop-action-strip" variants={fadeUp}>
      <h2>What do you want to do?</h2>

      <div>
        {actions.map((item) => {
          const Icon = resolveOverviewIcon(item.label, item.icon);

          return (
            <button
              type="button"
              key={item.id}
              className={`action-pill ${item.tone || "blue"}`}
              onClick={() => emitAciAction(item, onAction)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              <ChevronRight size={14} />
            </button>
          );
        })}
      </div>
    </motion.section>
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

function AssistantPanel({ vehicle = {}, onAction, mobile = false }) {
  const suggestions = [
    actionFor({
      id: `${getVehicleId(vehicle)}-best-automatic`,
      label: "Best automatic",
      query: `Best automatic variants of ${getVehicleModel(vehicle)}`,
      intent: getIntent("RECOMMENDATIONS", "vehicle_recommendations"),
      canvasType: getCanvas("RECOMMENDATION", "recommendation_results_canvas"),
      vehicle,
    }),
    vehicle.compareWith ? compareAction(vehicle) : rivalsAction(vehicle),
    actionFor({
      id: `${getVehicleId(vehicle)}-emi-under-20`,
      label: "EMI under ₹20k",
      query: `EMI options for ${getVehicleModel(vehicle)} under ₹20k`,
      intent: getIntent("EMI", "vehicle_emi_calculator"),
      canvasType: getCanvas("EMI", "emi_calculator_canvas"),
      vehicle,
    }),
  ];

  if (mobile) {
    return (
      <motion.section className="mobile-assistant-strip" variants={fadeUp}>
        <AciAssistantOrb small />

        <div>
          <h3>
            Need help choosing the right {getVehicleModel(vehicle)} variant?
          </h3>

          <div>
            {suggestions.map((item) => (
              <button
                type="button"
                key={item.id || item.label}
                onClick={() => emitAciAction(item, onAction)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <ChevronRight size={19} />
      </motion.section>
    );
  }

  return (
    <motion.section className="panel assistant-panel" variants={fadeUp}>
      <div className="assistant-title">
        <Sparkles size={17} />
        <div>
          <h3>ACI Assistant</h3>
          <p>Your intelligent co-pilot</p>
        </div>
      </div>

      <div className="assistant-dialogue">
        <div className="chat-row">
          <AciAssistantOrb small />
          <div className="chat-bubble assistant">
            <strong>
              Hi! I’m <span>ACI Assist.</span>
            </strong>
            <br />
            Ask me about price, EMI, features, colors or quotation for{" "}
            {getVehicleModel(vehicle)}.
          </div>
        </div>

        <div className="chat-bubble user">Help me choose the right variant</div>

        <div className="chat-row">
          <AciAssistantOrb small />
          <div className="chat-bubble assistant">
            Tell me your budget, city and driving use. I’ll shortlist the best
            variants using live data.
          </div>
        </div>
      </div>

      <div className="assistant-suggestions">
        {suggestions.map((item) => (
          <button
            type="button"
            key={item.id || item.label}
            onClick={() => emitAciAction(item, onAction)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </motion.section>
  );
}

function HighlightsPanel({ vehicle = {}, onAction, mobile = false }) {
  const items = vehicleHighlights(vehicle);

  if (mobile) {
    return (
      <motion.section className="mobile-stat-strip" variants={fadeUp}>
        {items.length ? (
          items.slice(0, 5).map((item) => {
            const Icon = resolveOverviewIcon(item.label, item.icon);

            return (
              <button
                type="button"
                key={`${item.label}-${item.value}`}
                onClick={() =>
                  emitAciAction(
                    {
                      label: item.label,
                      query: `${getVehicleModel(vehicle)} ${item.label}`,
                      vehicle,
                      contextPatch: buildContextPatch(vehicle),
                    },
                    onAction,
                  )
                }
              >
                <Icon size={24} />
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </button>
            );
          })
        ) : (
          <EmptyState
            title="Highlights will appear here"
            text="Ask ACI Assist to fetch live model specs."
            action={featuresAction(vehicle)}
            onAction={onAction}
          />
        )}
      </motion.section>
    );
  }

  return (
    <motion.section className="panel highlights-panel" variants={fadeUp}>
      <PanelHead
        title="Variant highlights"
        sub={`Key highlights across the ${getVehicleModel(vehicle)} range`}
        action="View features"
        actionOnClick={() => emitAciAction(featuresAction(vehicle), onAction)}
      />

      <div className="stats-grid">
        {items.length ? (
          items.slice(0, 6).map((item) => {
            const Icon = resolveOverviewIcon(item.label, item.icon);

            return (
              <button
                type="button"
                className="stat-card"
                key={`${item.label}-${item.value}`}
                onClick={() =>
                  emitAciAction(
                    {
                      label: item.label,
                      query: `${getVehicleModel(vehicle)} ${item.label}`,
                      vehicle,
                      contextPatch: buildContextPatch(vehicle),
                    },
                    onAction,
                  )
                }
              >
                <Icon size={17} />
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </button>
            );
          })
        ) : (
          <EmptyState
            title="Live highlights pending"
            text="Specs will appear here once the backend sends model data."
            action={featuresAction(vehicle)}
            onAction={onAction}
          />
        )}
      </div>
    </motion.section>
  );
}

function VariantCard({
  variant = {},
  vehicle = {},
  onAction,
  savedIds,
  onToggleSaved,
  mobile = false,
}) {
  const variantId = firstPresent(
    variant.id,
    variant._id,
    variant.name,
    variant.variant,
    "variant",
  );
  const variantName = firstPresent(variant.name, variant.variant, "Variant");
  const variantVehicle = {
    ...vehicle,
    id: `${getVehicleId(vehicle)}-${variantId}`,
    displayName: `${getVehicleDisplayName(vehicle)} ${variantName}`,
    variant: variantName,
  };
  const price = getVariantPrice(variant);
  const meta = formatVariantMeta(variant);

  return (
    <article className={`variant-card ${mobile ? "mobile-card" : ""}`}>
      <div className="variant-image-zone">
        {variant.tag ? (
          <span className="variant-badge">{variant.tag}</span>
        ) : null}

        <AciSavedButton
          vehicle={variantVehicle}
          saved={savedIds?.has?.(getVehicleId(variantVehicle))}
          onToggleSaved={onToggleSaved}
          className="variant-heart"
          size={17}
        />

        <AciVehicleVisual
          vehicle={vehicle}
          height={mobile ? 86 : 98}
          className="variant-car-photo"
          stage
          stageVariant="compact"
        />
      </div>

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
        <h4>{variantName}</h4>
        {meta ? <p>{meta}</p> : null}
        {price ? <strong>{price}</strong> : <strong>Price loading</strong>}
        {variant.sub ? <small>{variant.sub}</small> : null}
      </button>

      {toArray(variant.meta).length ? (
        <div className="variant-meta">
          {toArray(variant.meta)
            .slice(0, 2)
            .map((item) => (
              <button
                type="button"
                key={item}
                onClick={() =>
                  emitAciAction(
                    {
                      label: `${variantName} ${item}`,
                      query: `${getVehicleModel(vehicle)} ${variantName} ${item}`,
                      vehicle,
                      contextPatch: buildContextPatch(vehicle, {
                        anchorVariant: variantName,
                      }),
                    },
                    onAction,
                  )
                }
              >
                <Gauge size={12} /> {item}
              </button>
            ))}
        </div>
      ) : null}
    </article>
  );
}

function PopularVariantsPanel({
  vehicle = {},
  onAction,
  savedIds,
  onToggleSaved,
  mobile = false,
}) {
  const variants = toArray(vehicle.variants);
  const visible = variants.slice(0, 3);
  const slider = useSliderIndex(visible.length);

  return (
    <motion.section
      className={`panel variants-panel ${mobile ? "mobile-variants-panel" : ""}`}
      variants={fadeUp}
    >
      <PanelHead
        title="Popular variants"
        sub={mobile ? "" : "Top picks from live variant data"}
        action="View all"
        actionOnClick={() => emitAciAction(priceListAction(vehicle), onAction)}
        hideAction={!mobile && !variants.length}
        onAction={onAction}
      />

      {visible.length ? (
        <>
          <div
            className={`variant-card-grid ${mobile ? "mobile-slider" : ""}`}
            ref={mobile ? slider.ref : null}
            onScroll={mobile ? slider.onScroll : undefined}
          >
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
                savedIds={savedIds}
                onToggleSaved={onToggleSaved}
                mobile={mobile}
              />
            ))}
          </div>

          {mobile ? (
            <SliderDots count={visible.length} active={slider.active} />
          ) : null}
        </>
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

function ColorsPanel({ vehicle = {}, onAction, mobile = false }) {
  const colors = toArray(vehicle.colors);
  const [selected, setSelected] = useState(0);
  const active = colors[selected] || colors[0] || null;
  const slider = useSliderIndex(colors.length);

  return (
    <motion.section
      className={`panel colors-panel ${mobile ? "mobile-colors-panel" : ""}`}
      variants={fadeUp}
    >
      <PanelHead
        title="Colors"
        sub={mobile ? "" : "Choose your perfect shade"}
        action="View all"
        actionOnClick={() => emitAciAction(colorsAction(vehicle), onAction)}
        hideAction={!colors.length}
        onAction={onAction}
      />

      {colors.length ? (
        <>
          <div
            className={`colors-row ${mobile ? "mobile-color-slider" : ""}`}
            ref={mobile ? slider.ref : null}
            onScroll={mobile ? slider.onScroll : undefined}
          >
            {colors.map((color, index) => (
              <button
                type="button"
                key={`${color.name}-${color.hex || index}`}
                onClick={() => {
                  setSelected(index);
                  emitAciAction(
                    {
                      label: color.name,
                      query: `${getVehicleModel(vehicle)} ${color.name} color`,
                      intent: getIntent("COLORS", "vehicle_colors"),
                      canvasType: getCanvas("COLORS", "color_studio_canvas"),
                      vehicle,
                      payload: { color },
                      contextPatch: buildContextPatch(vehicle),
                    },
                    onAction,
                  );
                }}
                aria-label={color.name}
              >
                <ColorOrb
                  hex={color.hex}
                  name={color.name}
                  selected={color.name === active?.name}
                />
              </button>
            ))}
          </div>

          <div className="selected-color">
            <strong>{active?.name}</strong>
            {active?.tag ? <span>{active.tag}</span> : null}
          </div>

          {mobile ? (
            <SliderDots count={colors.length} active={slider.active} />
          ) : null}
        </>
      ) : (
        <EmptyState
          title="Color gallery pending"
          text="Load live colour options and images for this model."
          action={colorsAction(vehicle)}
          onAction={onAction}
        />
      )}
    </motion.section>
  );
}

function ComparePanel({ vehicle = {}, onAction, mobile = false }) {
  const compareWith = vehicle?.compareWith || null;
  const rivalName =
    compareWith?.model ||
    compareWith?.displayName ||
    compareWith?.name ||
    "";

  const findRivalsAction = {
    id: `${vehicle?.id || vehicle?.model || "vehicle"}-find-rivals`,
    label: `Find rivals for ${vehicle?.model || "this car"}`,
    query: `Suggest cars similar to ${vehicle?.model || vehicle?.displayName || "this car"}`,
    intent: ACI_INTENTS.RECOMMENDATIONS,
    canvasType: ACI_CANVAS_TYPES.RECOMMENDATIONS || "recommendation_results_canvas",
    vehicle,
    contextPatch: buildVehicleContextPatch({ vehicle }),
  };

  const compareAction = compareWith
    ? {
        id: `${vehicle?.id || vehicle?.model || "vehicle"}-compare-${rivalName}`,
        label: `Compare with ${rivalName}`,
        query: `Compare ${vehicle?.model || vehicle?.displayName || "this car"} with ${rivalName}`,
        intent: ACI_INTENTS.COMPARISON,
        canvasType: ACI_CANVAS_TYPES.COMPARISON,
        vehicle,
        contextPatch: buildVehicleContextPatch({ vehicle }),
      }
    : findRivalsAction;

  const facts = [
    vehicle?.mileage ? { icon: Gauge, top: "Mileage", bottom: vehicle.mileage } : null,
    vehicle?.bootSpace ? { icon: Wallet, top: "Boot Space", bottom: vehicle.bootSpace } : null,
    vehicle?.safetyRating ? { icon: ShieldCheck, top: "Safety", bottom: vehicle.safetyRating } : null,
  ].filter(Boolean);

  if (mobile) {
    return (
      <motion.section className="panel mobile-compare-panel" variants={fadeUp}>
        <button
          type="button"
          className={`mobile-compare-row ${!compareWith ? "no-rival" : ""}`}
          onClick={() => emitAciAction(compareAction, onAction)}
        >
          <span>
            <Scale size={26} />
          </span>

          <div>
            <h3>
              {compareWith
                ? `Compare ${vehicle?.model || "Car"} with ${rivalName}`
                : `Find rivals for ${vehicle?.model || "this car"}`}
            </h3>
            <p>
              {compareWith
                ? "Price, features, mileage and EMI side-by-side"
                : "Let ACI Assist suggest similar cars from live data"}
            </p>
          </div>

          <div className="mobile-compare-cars">
            <AciVehicleVisual vehicle={vehicle} height={48} stage stageVariant="compact" />
            <b>{compareWith ? "VS" : "AI"}</b>
            {compareWith ? (
              <AciVehicleVisual vehicle={compareWith} height={48} stage stageVariant="compact" />
            ) : (
              <span className="compare-placeholder">?</span>
            )}
          </div>
        </button>
      </motion.section>
    );
  }

  if (!compareWith) {
    return (
      <motion.section className="panel compare-panel compare-empty-panel" variants={fadeUp}>
        <PanelHead
          title={`Find rivals for ${vehicle?.model || "this car"}`}
          sub="Segment rivals, budget matches and feature alternatives"
          action="Find rivals"
          actionOnClick={() => emitAciAction(findRivalsAction, onAction)}
        />

        <div className="compare-empty-state">
          <span>
            <Scale size={28} />
          </span>

          <div>
            <h4>No rival selected yet</h4>
            <p>
              ACI Assist can find similar cars using body type, price band,
              fuel, transmission and features once live rival data is available.
            </p>
          </div>

          <button
            type="button"
            onClick={() => emitAciAction(findRivalsAction, onAction)}
          >
            Find similar cars <ChevronRight size={15} />
          </button>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section className="panel compare-panel" variants={fadeUp}>
      <PanelHead
        title={`Compare with ${rivalName}`}
        sub={`See how ${vehicle?.model || "this car"} compares`}
        action="View comparison"
        actionOnClick={() => emitAciAction(compareAction, onAction)}
      />

      <div className="compare-cars">
        <button
          type="button"
          onClick={() =>
            emitAciAction(
              {
                label: vehicle?.displayName || vehicle?.model,
                query: vehicle?.displayName || vehicle?.model,
                vehicle,
              },
              onAction,
            )
          }
        >
          <div>
            <AciVehicleVisual
              vehicle={vehicle}
              height={74}
              className="compare-creta-photo"
            />
          </div>
          <strong>{vehicle?.model || "Selected car"} {vehicle?.selectedVariant || ""}</strong>
          <b>{vehicle?.startingOnRoadPrice || vehicle?.priceRange || "—"}</b>
          <small>On-road {vehicle?.city || "Delhi"}</small>
        </button>

        <span>VS</span>

        <button
          type="button"
          onClick={() =>
            emitAciAction(
              {
                label: compareWith?.displayName || rivalName,
                query: compareWith?.displayName || rivalName,
                vehicle: compareWith,
              },
              onAction,
            )
          }
        >
          <div>
            <AciVehicleVisual vehicle={compareWith} height={74} />
          </div>
          <strong>{rivalName} {compareWith?.variant || ""}</strong>
          <b>{compareWith?.price || "—"}</b>
          <small>On-road {vehicle?.city || "Delhi"}</small>
        </button>
      </div>

      {facts.length ? (
        <div className="compare-facts">
          {facts.map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.top}
                onClick={() =>
                  emitAciAction(
                    {
                      label: `${item.top} ${item.bottom}`,
                      query: `${compareAction.query} ${item.top}`,
                      intent: ACI_INTENTS.COMPARISON,
                      canvasType: ACI_CANVAS_TYPES.COMPARISON,
                      vehicle,
                    },
                    onAction,
                  )
                }
              >
                <Icon size={13} />
                <span>
                  <strong>{item.top}</strong>
                  <em>{item.bottom}</em>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="compare-empty-specs">
          Live comparison facts will appear when backend sends specs.
        </div>
      )}
    </motion.section>
  );
}

function DesktopPage({
  data = {},
  vehicle = {},
  onAction,
  savedIds,
  onToggleSaved,
}) {
  return (
    <>
      <DesktopHeader data={data} onAction={onAction} />

      <motion.main
        className="desktop-page"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <DesktopHero
          vehicle={vehicle}
          onAction={onAction}
          savedIds={savedIds}
          onToggleSaved={onToggleSaved}
        />
        <DesktopActionStrip vehicle={vehicle} onAction={onAction} />

        <section className="desktop-grid">
          <AssistantPanel vehicle={vehicle} onAction={onAction} />

          <div className="column">
            <HighlightsPanel vehicle={vehicle} onAction={onAction} />
            <PopularVariantsPanel
              vehicle={vehicle}
              onAction={onAction}
              savedIds={savedIds}
              onToggleSaved={onToggleSaved}
            />
          </div>

          <div className="column">
            <ColorsPanel vehicle={vehicle} onAction={onAction} />
            <ComparePanel vehicle={vehicle} onAction={onAction} />
          </div>
        </section>

        <AciComposer
          onAction={onAction}
          selectedVehicle={vehicle}
          placeholder={`Type ${getVehicleModel(vehicle)}, price, EMI, compare, quote...`}
        />
      </motion.main>
    </>
  );
}

function MobileHeader({ data = {}, onAction }) {
  return (
    <header className="mobile-header">
      <AciLogo mobile compact onAction={onAction} />

      <div>
        <button
          type="button"
          className="mobile-bell"
          onClick={() => emitAciAction({ label: "Notifications" }, onAction)}
          aria-label="Notifications"
        >
          <Bell size={27} />
          <i />
        </button>

        <button
          type="button"
          className="mobile-avatar"
          onClick={() => emitAciAction({ label: "Profile" }, onAction)}
          aria-label="Profile"
        >
          {data?.avatarUrl ? (
            <img src={data.avatarUrl} alt="Profile" />
          ) : (
            <span />
          )}
        </button>
      </div>
    </header>
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
      <button
        type="button"
        className="mobile-memory-chip"
        onClick={() =>
          emitAciAction(
            {
              label: "ACI Assist remembers this car",
              query: getVehicleDisplayName(vehicle),
              vehicle,
              contextPatch: buildContextPatch(vehicle),
            },
            onAction,
          )
        }
      >
        <Sparkles size={16} />
        ACI Assist remembers this car
      </button>

      <div className="mobile-hero-grid">
        <div>
          <h1>{getVehicleDisplayName(vehicle)}</h1>
          <p>
            {firstPresent(
              vehicle.subtitle,
              vehicle.city ? `${vehicle.city} prices` : "New-car overview",
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
                        label: chip,
                        query: `${getVehicleModel(vehicle)} ${chip}`,
                        vehicle,
                        contextPatch: buildContextPatch(vehicle),
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

function MobileActions({ vehicle = {}, onAction }) {
  const actions = buildOverviewActions(vehicle);

  return (
    <motion.section className="mobile-action-block" variants={fadeUp}>
      <h2>What would you like to do?</h2>

      <div>
        {actions.map((item) => {
          const Icon = resolveOverviewIcon(item.label, item.icon);

          return (
            <button
              type="button"
              key={item.id}
              className={item.tone || "blue"}
              onClick={() => emitAciAction(item, onAction)}
            >
              <Icon size={23} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}

function MobilePage({
  data = {},
  vehicle = {},
  onAction,
  savedIds,
  onToggleSaved,
}) {
  return (
    <motion.main
      className="mobile-page"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <MobileHeader data={data} onAction={onAction} />
      <MobileHero vehicle={vehicle} onAction={onAction} />
      <MobileActions vehicle={vehicle} onAction={onAction} />
      <AssistantPanel vehicle={vehicle} onAction={onAction} mobile />
      <PopularVariantsPanel
        vehicle={vehicle}
        onAction={onAction}
        savedIds={savedIds}
        onToggleSaved={onToggleSaved}
        mobile
      />
      <HighlightsPanel vehicle={vehicle} onAction={onAction} mobile />
      <ColorsPanel vehicle={vehicle} onAction={onAction} mobile />
      <ComparePanel vehicle={vehicle} onAction={onAction} mobile />

      <AciComposer
        mobile
        onAction={onAction}
        selectedVehicle={vehicle}
        placeholder={`Ask ACI Assist about ${getVehicleModel(vehicle)}...`}
      />
    </motion.main>
  );
}

export default function AciAssistCarOverviewScreen({
  data = {},
  vehicle,
  onAction,
  savedIds = new Set(),
  onToggleSaved,
}) {
  const selectedVehicle = vehicle || data?.selectedVehicle || {};

  return (
    <div className="aci-page aci-car-overview-page">
      <CarOverviewScreenStyles />

      <DesktopPage
        data={data}
        vehicle={selectedVehicle}
        onAction={onAction}
        savedIds={savedIds}
        onToggleSaved={onToggleSaved}
      />

      <MobilePage
        data={data}
        vehicle={selectedVehicle}
        onAction={onAction}
        savedIds={savedIds}
        onToggleSaved={onToggleSaved}
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
`}</style>
  );
}
