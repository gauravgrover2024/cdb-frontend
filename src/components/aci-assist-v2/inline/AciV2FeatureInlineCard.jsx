import React from "react";
import { Car, Check, ChevronRight, Grid2X2, Lightbulb, X } from "lucide-react";
import { buildChatImageFrameStyle } from "../chat/aciV2ChatWidgetUtils";
import {
  buildVehicleContextPatch,
  getVehicleModelKey,
} from "../context/aciV2ContextManager";
import { getDisplayCarImage, resolveCarImageUrl } from "../shared/aciV2Image";

const isObject = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const firstValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);

const normalizeText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const featureRowsFrom = (message = {}, widget = {}) => {
  const data = isObject(widget.data) ? widget.data : {};

  return toArray(
    widget.rows ||
      data.rows ||
      widget.items ||
      data.items ||
      widget.features ||
      data.features ||
      message.rows ||
      message.features,
  );
};

const rowValue = (row = {}) =>
  firstValue(
    row.value,
    row.displayValue,
    row.featureValue,
    row.status,
    row.available === false ? "Not available" : "Available",
  );

const rowVariantLabel = (row = {}, fallback = "") =>
  firstValue(
    row.variant,
    row.variantName,
    row.variantLabel,
    row.label,
    row.name,
    row.title,
    fallback,
  );

const rowLooksAvailable = (row = {}) => {
  const value = String(rowValue(row));
  return (
    row.available !== false && !/not available|no|absent|false/i.test(value)
  );
};

const countFrom = (...values) => {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return 0;
};

const scopedVariantFrom = ({
  message = {},
  widget = {},
  vehicle = {},
} = {}) => {
  const data = isObject(widget.data) ? widget.data : {};
  const patches = [
    message.contextPatch,
    widget.contextPatch,
    data.contextPatch,
  ].filter(isObject);

  const explicitVariantPatch = patches.find((patch) =>
    hasOwn(patch, "anchorVariant"),
  );
  if (explicitVariantPatch)
    return String(explicitVariantPatch.anchorVariant || "");

  const explicitSelectedVehiclePatch = patches.find(
    (patch) =>
      hasOwn(patch.selectedVehicle, "variant") ||
      hasOwn(patch.selectedVehicle, "variantName"),
  );

  if (explicitSelectedVehiclePatch) {
    return firstValue(
      explicitSelectedVehiclePatch.selectedVehicle?.variant,
      explicitSelectedVehiclePatch.selectedVehicle?.variantName,
    );
  }

  return firstValue(vehicle.variant, vehicle.variantName);
};

const cleanFeatureLabel = (feature = "") =>
  String(feature || "feature")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const prettyFeatureLabel = (feature = "") => {
  const raw = String(feature || "feature")
    .replace(/\s+/g, " ")
    .trim();
  const norm = normalizeText(raw);

  if (!raw) return "feature";
  if (norm === "adas" || /advanced driver assistance/.test(norm)) return "ADAS";
  if (norm === "tpms" || /tyre pressure|tire pressure/.test(norm))
    return "TPMS";
  if (/anti lock|anti-lock|abs/.test(norm)) return "ABS";
  if (/360/.test(norm)) return "360° camera";
  if (/6 airbags|six airbags/.test(norm)) return "6 airbags";
  if (/android auto/.test(norm)) return "Android Auto";
  if (/apple carplay|carplay/.test(norm)) return "Apple CarPlay";
  if (/led/.test(norm)) return raw.replace(/\bled\b/gi, "LED");

  return raw;
};

const pickImageFrame = (...sources) => {
  for (const source of sources) {
    if (!isObject(source)) continue;

    const frame = firstValue(
      source.displayFrameMeta,
      source.display_frame_meta,
      source.imageFrame,
      source.image_frame,
      source.frameMeta,
      source.frame_meta,
      source.carImageFrame,
      source.car_image_frame,
      source.frame,
    );

    if (isObject(frame)) return frame;
  }

  return null;
};

const safeDisplayCarImage = (source) => {
  if (!source) return "";

  try {
    if (isObject(source)) {
      const explicit = firstValue(
        source.displayImageUrl,
        source.normalizedImageUrl,
        source.stagedImageUrl,
        source.cleanImageUrl,
        source.heroImageUrl,
        source.imageUrl,
        source.image_url,
        source.url,
        source.src,
        source.thumbnail,
        source.photo,
        source.media?.displayImageUrl,
        source.media?.imageUrl,
      );

      const resolvedExplicit = resolveCarImageUrl(explicit);
      if (resolvedExplicit) return resolvedExplicit;
    }

    return getDisplayCarImage(source) || "";
  } catch {
    return "";
  }
};

const pickHeroImage = (...sources) => {
  for (const source of sources) {
    const image = safeDisplayCarImage(source);
    if (image) return image;
  }

  return "";
};

const directionHintsFrom = (source, depth = 0) => {
  if (!source || depth > 2) return "";

  if (typeof source === "string") {
    return source;
  }

  if (!isObject(source)) return "";

  const direct = firstValue(
    source.facing,
    source.direction,
    source.orientation,
    source.vehicleFacing,
    source.carFacing,
    source.heroFacing,
    source.heroDirection,
    source.imageFacing,
    source.imageDirection,
    source.side,
    source.pose,
    source.angle,
  );

  const nested = [
    source.imageFrame,
    source.displayFrameMeta,
    source.frameMeta,
    source.frame,
    source.media,
    source.heroImage,
    source.stageFrames?.featureInlineHero,
    source.stageFrames?.chatCard,
    source.stageFrames?.default,
    source.stages?.featureInlineHero,
    source.stages?.chatCard,
    source.stages?.default,
  ]
    .map((item) => directionHintsFrom(item, depth + 1))
    .filter(Boolean)
    .join(" ");

  return [direct, nested].filter(Boolean).join(" ");
};

const shouldPlaceHeroImageFirst = (...sources) => {
  const hint = normalizeText(
    sources.map((item) => directionHintsFrom(item)).join(" "),
  );

  if (!hint) return false;
  if (
    /right to left|rtl|facing left|left facing|front left|left front|rear right|right rear/.test(
      hint,
    )
  ) {
    return true;
  }

  if (
    /left to right|ltr|facing right|right facing|front right|right front|rear left|left rear/.test(
      hint,
    )
  ) {
    return false;
  }

  return false;
};

const whyItMattersText = ({ widget = {}, data = {}, feature = "" }) => {
  const explicit = firstValue(
    widget.whyItMatters,
    data.whyItMatters,
    widget.why,
    data.why,
    widget.insight,
    data.insight,
  );

  if (explicit) return explicit;

  const label = cleanFeatureLabel(feature);

  if (/sunroof/.test(label))
    return "Sunroofs make the cabin feel more open and premium.";
  if (/airbag|abs|safety|esc|stability|brak/.test(label)) {
    return "Safety features help you compare variants more confidently.";
  }
  if (/camera|parking/.test(label))
    return "Camera features make tight parking and city driving easier.";
  if (/speaker|audio|music|infotainment|touchscreen/.test(label)) {
    return "Infotainment features improve the daily cabin experience.";
  }
  if (/climate|ac|vent/.test(label)) {
    return "Comfort features can make daily drives feel more relaxed.";
  }

  return `${prettyFeatureLabel(feature)} helps separate must-have variants from optional upgrades.`;
};

const buildPremiumFeatureSuggestions = ({
  model = "",
  featureLabel = "",
  displayFeatureLabel = "",
  answerTone = "mixed",
} = {}) => {
  const car = model || "this car";
  const feature = featureLabel || "this feature";
  const displayFeature = displayFeatureLabel || feature;
  const suggestions = [];

  if (answerTone === "no") {
    suggestions.push({
      label: `Show variants that add ${displayFeature}`,
      query: `Which variants of ${car} have ${feature}?`,
    });
  } else {
    suggestions.push({
      label: `See every variant with ${displayFeature}`,
      query: `Which variants of ${car} have ${feature}?`,
    });
  }

  if (/sunroof/.test(feature)) {
    suggestions.push({
      label: "Find the most premium sunroof variant",
      query: `Which ${car} variant with sunroof is the best value?`,
    });
  } else if (/abs|airbag|adas|safety|brak/.test(feature)) {
    suggestions.push({
      label: "Compare the safest variants",
      query: `Compare ${car} variants by safety features`,
    });
  } else if (/mileage|kmpl|arai/.test(feature)) {
    suggestions.push({
      label: "Find the best mileage variant",
      query: `Which ${car} variant has the best mileage?`,
    });
  } else {
    suggestions.push({
      label: "Compare the better-equipped variants",
      query: `Compare ${car} variants with ${feature}`,
    });
  }

  suggestions.push(
    {
      label: "Pair features with on-road price",
      query: `Show ${car} price with key features`,
    },
    {
      label: "Build a shortlist worth test-driving",
      query: `Which ${car} variant should I shortlist?`,
    },
  );

  const seen = new Set();
  return suggestions.filter((item) => {
    const key = normalizeText(item.query || item.label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
};

const buildDisplayRows = ({
  rows = [],
  variant = "",
  answerTone = "",
} = {}) => {
  const seen = new Set();
  const selectedNorm = normalizeText(variant);
  const result = [];

  const pushUnique = (row) => {
    if (!row) return;
    const label = rowVariantLabel(row);
    const key = normalizeText(label || JSON.stringify(row));
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(row);
  };

  const targetRow =
    selectedNorm &&
    rows.find((row) => {
      const label = normalizeText(rowVariantLabel(row));
      return (
        label === selectedNorm ||
        label.includes(selectedNorm) ||
        selectedNorm.includes(label)
      );
    });

  if (targetRow) {
    pushUnique(targetRow);
  } else if (variant) {
    pushUnique({
      id: `selected-${variant}`,
      variant,
      available: answerTone === "yes",
      value: answerTone === "yes" ? "Yes" : "Not Available",
    });
  }

  rows.filter(rowLooksAvailable).forEach(pushUnique);
  rows.filter((row) => !rowLooksAvailable(row)).forEach(pushUnique);
  rows.forEach(pushUnique);

  return result.slice(0, 4);
};

export default function AciV2FeatureInlineCard({
  message = {},
  selectedVehicle,
  onAction,
}) {
  const widget = isObject(message.widget) ? message.widget : {};
  const data = isObject(widget.data) ? widget.data : {};
  const allRows = featureRowsFrom(message, widget);
  const availableRows = allRows.filter(rowLooksAvailable);
  const unavailableRows = allRows.filter((row) => !availableRows.includes(row));
  const contextVehicle =
    message.contextPatch?.selectedVehicle ||
    widget.contextPatch?.selectedVehicle ||
    data.contextPatch?.selectedVehicle ||
    (firstValue(
      message.contextPatch?.anchorModel,
      widget.contextPatch?.anchorModel,
      data.contextPatch?.anchorModel,
    )
      ? {
          make: firstValue(
            message.contextPatch?.anchorMake,
            widget.contextPatch?.anchorMake,
            data.contextPatch?.anchorMake,
          ),
          model: firstValue(
            message.contextPatch?.anchorModel,
            widget.contextPatch?.anchorModel,
            data.contextPatch?.anchorModel,
          ),
          displayName: firstValue(
            message.contextPatch?.anchorModel,
            widget.contextPatch?.anchorModel,
            data.contextPatch?.anchorModel,
          ),
        }
      : null);
  const vehicle =
    widget.vehicle ||
    data.vehicle ||
    message.vehicle ||
    contextVehicle ||
    selectedVehicle ||
    {};
  const vehicleModelKey = getVehicleModelKey(vehicle);
  const selectedVehicleMatches =
    !selectedVehicle ||
    !vehicleModelKey ||
    getVehicleModelKey(selectedVehicle) === vehicleModelKey;
  const scopedSelectedVehicle = selectedVehicleMatches ? selectedVehicle : null;
  const variant = scopedVariantFrom({ message, widget, vehicle });

  const title = firstValue(
    widget.title,
    data.title,
    message.title,
    "Feature answer",
  );
  const answer = firstValue(
    widget.answer,
    data.answer,
    message.answer,
    message.text,
  );
  const feature = firstValue(
    widget.feature,
    data.feature,
    widget.matchedFeature,
    data.matchedFeature,
    widget.featureName,
    data.featureName,
    data.resolvedFeature?.displayName,
    message.feature,
    message.meta?.detectedFeature,
    title,
  );

  const vehicleName = firstValue(
    vehicle.displayName,
    vehicle.fullModel,
    vehicle.model,
    message.contextPatch?.anchorModel,
    widget.contextPatch?.anchorModel,
    data.contextPatch?.anchorModel,
    "Selected car",
  );

  const model = firstValue(
    vehicle.model,
    message.contextPatch?.anchorModel,
    vehicleName,
  );

  const availableCount = countFrom(
    widget.availableCount,
    data.availableCount,
    widget.availableVariants,
    data.availableVariants,
    availableRows.length,
  );

  const skippedCount = countFrom(
    widget.unavailableCount,
    data.unavailableCount,
    widget.skippedCount,
    data.skippedCount,
    unavailableRows.length,
  );

  const answerText = String(answer || "");
  const answerTone =
    availableCount > 0 && skippedCount === 0
      ? "yes"
      : availableCount > 0 && skippedCount > 0
        ? "mixed"
        : /yes|good news|available|gets|offers/i.test(answerText) &&
            !/not available|does not|doesn't|no current|^no\b/i.test(answerText)
          ? "yes"
          : /not available|does not|doesn't|no current|^no\b/i.test(answerText)
            ? "no"
            : "mixed";

  const displayFeatureLabel = prettyFeatureLabel(feature || title);
  const featureLabel = cleanFeatureLabel(feature || title);

  const displayRows = buildDisplayRows({
    rows: allRows,
    variant,
    answerTone,
  });

  const heroFrame = pickImageFrame(
    vehicle,
    data.vehicle,
    widget.vehicle,
    scopedSelectedVehicle,
    data,
    widget,
    displayRows[0],
    availableRows[0],
    allRows[0],
  );

  const heroImage = pickHeroImage(
    vehicle,
    data.vehicle,
    widget.vehicle,
    scopedSelectedVehicle,
    data.selectedVehicle,
    data,
    widget,
    displayRows[0],
    availableRows[0],
    allRows[0],
  );

  const heroFrameStyle = heroFrame
    ? buildChatImageFrameStyle(heroFrame, "featureInlineHero")
    : {};

  const openExplorer = () => {
    onAction?.({
      id: "feature-inline-open-explorer",
      label: "Open features explorer",
      query: `Show features of ${model}`,
      intent: "vehicle_model_features_explorer",
      canvasType: "features_explorer_canvas",
      vehicle,
      contextPatch: {
        ...buildVehicleContextPatch({ vehicle, variant }),
        ...(message.contextPatch || {}),
      },
    });
  };

  const askAboutFeatureVariants = () => {
    onAction?.({
      id: "feature-inline-see-variants",
      label: `See ${displayFeatureLabel} variants`,
      query: `Which variants of ${model} have ${featureLabel}?`,
      vehicle,
      contextPatch: {
        ...buildVehicleContextPatch({
          vehicle,
          variant: "",
        }),
        ...(message.contextPatch || {}),
        anchorVariant: "",
      },
    });
  };

  const askSuggestion = (suggestion) => {
    const query = typeof suggestion === "string" ? suggestion : suggestion?.query;
    const label = typeof suggestion === "string" ? suggestion : suggestion?.label;

    if (!query) return;

    onAction?.({
      id: `feature-inline-suggestion-${query}`,
      label: label || query,
      query,
      vehicle,
      contextPatch: {
        ...buildVehicleContextPatch({ vehicle, variant }),
        ...(message.contextPatch || {}),
      },
    });
  };

  const suggestions = buildPremiumFeatureSuggestions({
    model,
    featureLabel,
    displayFeatureLabel,
    answerTone,
  });

  const hasImage = Boolean(heroImage);
  const imageFirst =
    hasImage &&
    shouldPlaceHeroImageFirst(
      heroImage,
      heroFrame,
      vehicle,
      data.vehicle,
      widget.vehicle,
      scopedSelectedVehicle,
      data,
      widget,
      displayRows[0],
    );
  const statusLabel =
    answerTone === "mixed"
      ? "Varies by variant"
      : answerTone === "no"
        ? "Not available"
        : "Available";
  const previewCount = displayRows.length;
  const previewLabel = previewCount
    ? `${previewCount} key variant${previewCount === 1 ? "" : "s"} previewed`
    : availableCount
      ? `${availableCount} available variant${availableCount === 1 ? "" : "s"}`
      : "Variant availability";
  const heroCopy = (
    <div className="aci-feature-v4-copy">
      <div className="aci-feature-v4-kicker">{displayFeatureLabel}</div>
      <strong>{vehicleName}</strong>
      <span>{statusLabel}</span>
      <small>{previewLabel}</small>
    </div>
  );
  const heroCar = heroImage ? (
    <div className="aci-feature-v4-car" style={heroFrameStyle}>
      <img src={heroImage} alt={vehicleName} loading="lazy" draggable="false" />
    </div>
  ) : null;

  return (
    <article
      className={`aci-feature-inline-card-v4 is-${answerTone} ${hasImage ? "has-image" : "no-image"} ${imageFirst ? "is-image-first" : "is-copy-first"}`}
    >
      <style>{`
        .aci-feature-inline-card-v4 {
          width: min(100%, 560px);
          color: #071142;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .aci-feature-v4-main {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(211, 222, 240, 0.96);
          border-radius: 24px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.99), rgba(250,253,255,0.98));
          box-shadow:
            0 30px 80px -60px rgba(8, 26, 66, 0.58),
            0 10px 34px -28px rgba(7, 88, 248, 0.32),
            inset 0 1px 0 rgba(255,255,255,0.98);
          padding: 18px 18px 17px;
        }

        .aci-feature-v4-hero {
          display: grid;
          grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
          align-items: center;
          gap: 14px;
          min-height: 188px;
          margin-bottom: 18px;
          padding: 0;
        }

        .aci-feature-inline-card-v4.is-image-first .aci-feature-v4-hero {
          grid-template-columns: minmax(0, 1.18fr) minmax(0, 0.82fr);
        }

        .aci-feature-inline-card-v4.no-image .aci-feature-v4-hero {
          grid-template-columns: minmax(0, 1fr);
          margin-bottom: 11px;
        }

        .aci-feature-v4-copy {
          min-width: 0;
          align-self: center;
        }

        .aci-feature-v4-kicker {
          display: inline-flex;
          align-items: center;
          max-width: 100%;
          margin: 0 0 10px;
          border: 1px solid rgba(210, 222, 242, 0.9);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          padding: 5px 10px;
          color: #0758f8;
          font-size: 11.5px;
          line-height: 1;
          font-weight: 720;
          letter-spacing: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .aci-feature-v4-copy strong {
          display: block;
          margin: 0;
          max-width: 13em;
          color: #071142;
          font-size: clamp(23px, 2.1vw, 31px);
          line-height: 0.98;
          font-weight: 780;
          letter-spacing: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: normal;
        }

        .aci-feature-v4-copy span {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          margin-top: 13px;
          border-radius: 999px;
          padding: 0 12px;
          color: ${answerTone === "no" ? "#dc2639" : answerTone === "mixed" ? "#b45309" : "#08a95d"};
          background: ${answerTone === "no" ? "rgba(255, 238, 240, 0.96)" : answerTone === "mixed" ? "rgba(255, 251, 235, 0.98)" : "rgba(236, 253, 245, 0.96)"};
          font-size: 12.5px;
          line-height: 1;
          font-weight: 710;
          letter-spacing: 0;
        }

        .aci-feature-v4-copy small {
          display: block;
          margin-top: 8px;
          color: #5d6988;
          font-size: 13px;
          line-height: 1.25;
          font-weight: 620;
          letter-spacing: 0;
        }

        .aci-feature-v4-car {
          position: relative;
          min-height: 188px;
          display: grid;
          place-items: center;
          overflow: visible;
        }

        .aci-feature-v4-car::before {
          content: none;
        }

        .aci-feature-v4-car::after {
          content: "";
          position: absolute;
          left: 12%;
          right: 9%;
          bottom: 9%;
          height: 14px;
          border-radius: 999px;
          background: radial-gradient(ellipse, rgba(15, 23, 42, 0.15), transparent 72%);
          filter: blur(6px);
        }

        .aci-feature-v4-car img {
          position: relative;
          z-index: 1;
          width: min(218%, 390px);
          max-width: none;
          height: auto;
          object-fit: contain;
          transform:
            translate(var(--chat-car-frame-x, 0%), var(--chat-car-frame-y, 0%))
            scale(calc(var(--chat-car-frame-scale, 1) * 1.08));
          transform-origin: var(--chat-car-frame-origin, center center);
          filter: drop-shadow(0 18px 16px rgba(15, 23, 42, 0.15));
        }

        .aci-feature-v4-table {
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(214, 224, 241, 0.96);
          background: rgba(255, 255, 255, 0.94);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.95);
        }

        .aci-feature-v4-row {
          min-height: 50px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 0 15px;
          border-top: 1px solid rgba(222, 230, 244, 0.88);
        }

        .aci-feature-v4-row:first-child {
          border-top: 0;
        }

        .aci-feature-v4-row strong {
          min-width: 0;
          color: #071142;
          font-size: 14.5px;
          line-height: 1.1;
          font-weight: 680;
          letter-spacing: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .aci-feature-v4-pill {
          min-width: 66px;
          min-height: 29px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 999px;
          padding: 0 10px;
          font-size: 12.5px;
          font-weight: 680;
          letter-spacing: 0;
        }

        .aci-feature-v4-pill.is-yes {
          color: #08a95d;
          background: rgba(236, 253, 245, 0.96);
        }

        .aci-feature-v4-pill.is-no {
          color: #eb3b50;
          background: rgba(255, 238, 240, 0.96);
        }

        .aci-feature-v4-pill svg {
          width: 14px;
          height: 14px;
        }

        .aci-feature-v4-actions {
          margin-top: 15px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .aci-feature-v4-action {
          min-height: 46px;
          border: 1px solid rgba(210, 222, 242, 0.96);
          border-radius: 16px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: #071142;
          background: linear-gradient(145deg, rgba(255,255,255,0.99), rgba(246,250,255,0.98));
          box-shadow: 0 18px 42px -34px rgba(37, 99, 235, 0.5);
          font-size: 13px;
          font-weight: 720;
          letter-spacing: 0;
          cursor: pointer;
          transition:
            transform 170ms ease,
            border-color 170ms ease,
            box-shadow 170ms ease;
        }

        .aci-feature-v4-action:hover {
          transform: translateY(-1px);
          border-color: rgba(7, 88, 248, 0.24);
          box-shadow: 0 18px 42px -34px rgba(37, 99, 235, 0.55);
        }

        .aci-feature-v4-action span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          text-align: left;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .aci-feature-v4-action svg {
          flex: 0 0 auto;
          width: 16px;
          height: 16px;
          color: #0758f8;
        }

        .aci-feature-v4-action > svg:last-child {
          width: 15px;
          height: 15px;
          color: #071142;
        }

        .aci-feature-v4-why {
          margin-top: 13px;
          min-height: 64px;
          border: 1px solid rgba(219, 228, 244, 0.94);
          border-radius: 19px;
          background: rgba(255,255,255,0.96);
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
        }

        .aci-feature-v4-why-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          color: #0758f8;
          background: #eef5ff;
        }

        .aci-feature-v4-why-icon svg {
          width: 18px;
          height: 18px;
        }

        .aci-feature-v4-why strong {
          display: block;
          color: #071142;
          font-size: 13px;
          font-weight: 730;
          letter-spacing: 0;
        }

        .aci-feature-v4-why p {
          margin: 3px 0 0;
          color: #667292;
          font-size: 12.5px;
          line-height: 1.32;
          font-weight: 520;
          letter-spacing: 0;
        }

        .aci-feature-v4-why > svg {
          width: 16px;
          height: 16px;
          color: #667292;
        }

        .aci-feature-v4-suggestions {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          overflow: visible;
        }

        .aci-feature-v4-suggestion {
          width: 100%;
          min-width: 0;
          min-height: 32px;
          border: 1px solid rgba(210, 222, 242, 0.96);
          border-radius: 999px;
          padding: 7px 12px;
          background: rgba(248, 251, 255, 0.96);
          color: #002caa;
          font-size: 12px;
          line-height: 1.15;
          font-weight: 620;
          letter-spacing: 0;
          cursor: pointer;
          white-space: normal;
          text-align: center;
        }

        .aci-feature-v4-suggestion:last-child:nth-child(odd) {
          grid-column: 1 / -1;
        }

        @media (max-width: 720px) {
          .aci-feature-inline-card-v4 {
            width: 100%;
          }

          .aci-feature-v4-main {
            border-radius: 22px;
            padding: 15px;
          }

          .aci-feature-v4-hero {
            grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
            min-height: 164px;
            gap: 10px;
            margin-bottom: 14px;
          }

          .aci-feature-inline-card-v4.is-image-first .aci-feature-v4-hero {
            grid-template-columns: minmax(0, 1.18fr) minmax(0, 0.82fr);
          }

          .aci-feature-v4-kicker {
            margin-bottom: 7px;
            padding: 5px 9px;
            font-size: 11px;
          }

          .aci-feature-v4-copy strong {
            font-size: clamp(21px, 6.1vw, 28px);
          }

          .aci-feature-v4-copy span {
            min-height: 26px;
            margin-top: 8px;
            padding: 0 10px;
          }

          .aci-feature-v4-copy small {
            margin-top: 6px;
          }

          .aci-feature-v4-car {
            min-height: 164px;
          }

          .aci-feature-v4-car img {
            width: min(238%, 315px);
            transform:
              translate(var(--chat-car-frame-x, 0%), var(--chat-car-frame-y, 0%))
              scale(calc(var(--chat-car-frame-scale, 1) * 1.03));
          }

          .aci-feature-v4-table {
            margin-top: 0;
            border-radius: 14px;
          }

          .aci-feature-v4-row {
            min-height: 43px;
            padding: 0 12px;
          }

          .aci-feature-v4-row strong {
            font-size: 13.5px;
          }

          .aci-feature-v4-pill {
            min-width: 60px;
            min-height: 27px;
            font-size: 12px;
          }

          .aci-feature-v4-actions {
            grid-template-columns: minmax(0, 1fr);
            gap: 9px;
          }

          .aci-feature-v4-action {
            min-height: 41px;
          }
        }

        @media (max-width: 420px) {
          .aci-feature-v4-main {
            padding: 14px;
          }

          .aci-feature-v4-hero {
            grid-template-columns: minmax(0, 0.76fr) minmax(0, 1.24fr);
          }

          .aci-feature-inline-card-v4.is-image-first .aci-feature-v4-hero {
            grid-template-columns: minmax(0, 1.24fr) minmax(0, 0.76fr);
          }

          .aci-feature-v4-copy strong {
            font-size: 22px;
          }

          .aci-feature-v4-car {
            min-height: 152px;
          }

          .aci-feature-v4-car img {
            width: 292px;
          }

          .aci-feature-v4-why {
            grid-template-columns: 32px minmax(0, 1fr) auto;
            padding: 11px 12px;
          }

          .aci-feature-v4-why-icon {
            width: 31px;
            height: 31px;
          }

          .aci-feature-v4-suggestions {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>

      <section className="aci-feature-v4-main">
        <div className="aci-feature-v4-hero">
          {imageFirst ? heroCar : heroCopy}
          {imageFirst ? heroCopy : heroCar}
        </div>

        {displayRows.length ? (
          <div className="aci-feature-v4-table">
            {displayRows.map((row, index) => {
              const rowVariant = rowVariantLabel(row, `Variant ${index + 1}`);
              const available = rowLooksAvailable(row);

              return (
                <div
                  className="aci-feature-v4-row"
                  key={row.id || row._id || rowVariant || index}
                >
                  <strong>{rowVariant}</strong>
                  <span
                    className={`aci-feature-v4-pill ${available ? "is-yes" : "is-no"}`}
                  >
                    {available ? (
                      <Check aria-hidden="true" strokeWidth={2.5} />
                    ) : (
                      <X aria-hidden="true" strokeWidth={2.5} />
                    )}
                    {available ? "Yes" : "No"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="aci-feature-v4-actions">
          <button
            className="aci-feature-v4-action"
            type="button"
            onClick={askAboutFeatureVariants}
          >
            <span>
              <Car aria-hidden="true" />
              See {displayFeatureLabel} variants
            </span>
            <ChevronRight aria-hidden="true" />
          </button>

          <button
            className="aci-feature-v4-action"
            type="button"
            onClick={openExplorer}
          >
            <span>
              <Grid2X2 aria-hidden="true" />
              Open Features Explorer
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="aci-feature-v4-why">
        <span className="aci-feature-v4-why-icon">
          <Lightbulb aria-hidden="true" />
        </span>
        <div>
          <strong>Why it matters</strong>
          <p>{whyItMattersText({ widget, data, feature })}</p>
        </div>
        <ChevronRight aria-hidden="true" />
      </section>

      <div className="aci-feature-v4-suggestions">
        {suggestions.map((suggestion) => (
          <button
            className="aci-feature-v4-suggestion"
            type="button"
            key={suggestion.query || suggestion.label}
            onClick={() => askSuggestion(suggestion)}
          >
            {suggestion.label || suggestion.query}
          </button>
        ))}
      </div>
    </article>
  );
}
