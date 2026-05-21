import React from "react";
import { Check, ChevronRight, X } from "lucide-react";
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

const rowValue = (row = {}) => {
  const safeRow = isObject(row) ? row : {};
  return firstValue(
    safeRow.value,
    safeRow.displayValue,
    safeRow.featureValue,
    safeRow.status,
    safeRow.available === false ? "Not available" : "Available",
  );
};

const rowVariantLabel = (row = {}, fallback = "") => {
  const safeRow = isObject(row) ? row : {};
  return firstValue(
    safeRow.variant,
    safeRow.variantName,
    safeRow.variantLabel,
    safeRow.label,
    safeRow.name,
    safeRow.title,
    fallback,
  );
};

const rowLooksAvailable = (row = {}) => {
  const safeRow = isObject(row) ? row : {};
  const value = String(rowValue(row));
  return (
    safeRow.available !== false && !/not available|no|absent|false/i.test(value)
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
        source.vehicle?.displayImageUrl,
        source.vehicle?.normalizedImageUrl,
        source.vehicle?.heroImageUrl,
        source.vehicle?.imageUrl,
        source.selectedVehicle?.displayImageUrl,
        source.selectedVehicle?.normalizedImageUrl,
        source.selectedVehicle?.heroImageUrl,
        source.selectedVehicle?.imageUrl,
        source.car?.displayImageUrl,
        source.car?.normalizedImageUrl,
        source.car?.heroImageUrl,
        source.car?.imageUrl,
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

const clampNumber = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const readFrameNumber = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "string" && value.trim().endsWith("%")) {
      const parsed = Number(value.trim().slice(0, -1));
      if (Number.isFinite(parsed)) return parsed / 100;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const normalizedFrameBounds = (frame = {}) => {
  if (!isObject(frame)) return null;

  const stageFrame =
    frame.stageFrames?.featureInlineHero ||
    frame.stages?.featureInlineHero ||
    frame.featureInlineHero ||
    frame.stageFrames?.chatCard ||
    frame.stages?.chatCard ||
    frame.chatCard ||
    frame;

  const bounds =
    stageFrame.bounds ||
    stageFrame.visibleBounds ||
    stageFrame.contentBounds ||
    stageFrame.subjectBounds ||
    stageFrame.carBounds ||
    stageFrame.trimBounds ||
    stageFrame.bbox ||
    stageFrame;

  const canvasWidth = readFrameNumber(
    stageFrame.canvas_width,
    stageFrame.canvasWidth,
    stageFrame.naturalWidth,
    stageFrame.imageWidth,
    frame.canvas_width,
    frame.canvasWidth,
    frame.naturalWidth,
    frame.imageWidth,
  );
  const canvasHeight = readFrameNumber(
    stageFrame.canvas_height,
    stageFrame.canvasHeight,
    stageFrame.naturalHeight,
    stageFrame.imageHeight,
    frame.canvas_height,
    frame.canvasHeight,
    frame.naturalHeight,
    frame.imageHeight,
  );

  const rawLeft = readFrameNumber(bounds.left, bounds.x, bounds.minX);
  const rawTop = readFrameNumber(bounds.top, bounds.y, bounds.minY);
  const rawWidth = readFrameNumber(bounds.width, bounds.w);
  const rawHeight = readFrameNumber(bounds.height, bounds.h);

  if (![rawLeft, rawTop, rawWidth, rawHeight].every(Number.isFinite)) {
    return null;
  }

  if (
    rawLeft >= 0 &&
    rawTop >= 0 &&
    rawWidth > 0 &&
    rawHeight > 0 &&
    rawLeft <= 1 &&
    rawTop <= 1 &&
    rawWidth <= 1 &&
    rawHeight <= 1
  ) {
    return {
      left: rawLeft,
      top: rawTop,
      width: rawWidth,
      height: rawHeight,
    };
  }

  if (
    Number.isFinite(canvasWidth) &&
    Number.isFinite(canvasHeight) &&
    canvasWidth > 0 &&
    canvasHeight > 0 &&
    rawWidth > 0 &&
    rawHeight > 0
  ) {
    return {
      left: rawLeft / canvasWidth,
      top: rawTop / canvasHeight,
      width: rawWidth / canvasWidth,
      height: rawHeight / canvasHeight,
    };
  }

  return null;
};

const buildFeatureHeroFrameStyle = (frame) => {
  const bounds = normalizedFrameBounds(frame);

  if (!bounds) return {};

  const width = clampNumber(bounds.width, 0.01, 1, 1);
  const height = clampNumber(bounds.height, 0.01, 1, 1);
  const left = clampNumber(bounds.left, 0, 1, 0);
  const top = clampNumber(bounds.top, 0, 1, 0);
  const centerX = left + width / 2;
  const centerY = top + height / 2;

  return {
    "--feature-car-position-x": `${clampNumber(centerX * 100, 38, 62, 50).toFixed(1)}%`,
    "--feature-car-position-y": `${clampNumber(centerY * 100, 42, 60, 50).toFixed(1)}%`,
  };
};

const FeatureSuggestionIcon = ({ type = "spark" }) => {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": "true",
  };

  if (type === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3.5 18 6v5.2c0 3.9-2.4 7.3-6 9.1-3.6-1.8-6-5.2-6-9.1V6l6-2.5Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "price") {
    return (
      <svg {...common}>
        <path d="M7 5h10M7 9h10M8 5c4 0 6 1.3 6 4.1S11.9 13 8 13h-.7L15 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "palette") {
    return (
      <svg {...common}>
        <path d="M12 4.2c-4.3 0-7.8 3-7.8 6.8 0 3.1 2.4 5.8 5.7 6.5.9.2 1.6-.5 1.6-1.4 0-.8.7-1.5 1.5-1.5h1.2c3.1 0 5.6-2.1 5.6-4.8 0-3.1-3.5-5.6-7.8-5.6Z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8.2 10.2h.1M11.1 8.1h.1M14.6 8.7h.1M16.1 11.6h.1" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18l-1.8-5.4-5.7-1.8L10.2 9 12 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M18.2 16.2v3.2M16.6 17.8h3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

const buildPremiumFeatureSuggestions = ({
  model = "",
  featureLabel = "",
} = {}) => {
  const car = model || "this car";
  const feature = featureLabel || "this feature";
  const suggestions = [];

  if (/sunroof/.test(feature)) {
    suggestions.push(
      {
        label: "Compare sunroof variants by price",
        query: `Compare ${car} sunroof variants by on-road price`,
        icon: "price",
      },
      {
        label: "Check panoramic sunroof options",
        query: `Which ${car} variants have panoramic sunroof?`,
        icon: "spark",
      },
    );
  } else if (/abs|airbag|adas|safety|brak/.test(feature)) {
    suggestions.push(
      {
        label: "Compare safety across variants",
        query: `Compare ${car} variants by safety features`,
        icon: "shield",
      },
      {
        label: "Find the best safety value",
        query: `Which ${car} variant gives the best safety value?`,
        icon: "price",
      },
    );
  } else if (/mileage|kmpl|arai/.test(feature)) {
    suggestions.push(
      {
        label: "Find the best mileage variant",
        query: `Which ${car} variant has the best mileage?`,
        icon: "spark",
      },
      {
        label: "Compare mileage with price",
        query: `Compare ${car} mileage with on-road price`,
        icon: "price",
      },
    );
  } else {
    suggestions.push(
      {
        label: "Compare better-equipped variants",
        query: `Compare ${car} variants with ${feature}`,
        icon: "spark",
      },
      {
        label: "Find the best value upgrade",
        query: `Which ${car} variant is the best value upgrade?`,
        icon: "price",
      },
    );
  }

  suggestions.push({
    label: `Open ${car} colours`,
    query: `Show ${car} colours`,
    icon: "palette",
  });

  const seen = new Set();
  return suggestions.filter((item) => {
    const key = normalizeText(item.query || item.label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
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

const rowAt = (rows = [], index = 0) =>
  index >= 0 && index < rows.length ? rows[index] : null;

const buildDecisionRows = ({
  rows = [],
  variant = "",
  answerTone = "",
} = {}) => {
  const selectedNorm = normalizeText(variant);
  const targetIndex = selectedNorm
    ? rows.findIndex((row) => {
        const label = normalizeText(rowVariantLabel(row));
        return (
          label === selectedNorm ||
          label.includes(selectedNorm) ||
          selectedNorm.includes(label)
        );
      })
    : -1;

  const firstAvailableIndex = rows.findIndex(rowLooksAvailable);
  const centerIndex =
    targetIndex >= 0
      ? targetIndex
      : firstAvailableIndex >= 0
        ? firstAvailableIndex
        : 0;

  const picked = [rowAt(rows, centerIndex - 1), rowAt(rows, centerIndex), rowAt(rows, centerIndex + 1)]
    .filter(Boolean);

  if (!picked.length && variant) {
    picked.push({
      id: `selected-${variant}`,
      variant,
      available: answerTone === "yes",
      value: answerTone === "yes" ? "Yes" : "Not Available",
    });
  }

  const seen = new Set();
  return picked.filter((row) => {
    const key = normalizeText(rowVariantLabel(row) || JSON.stringify(row));
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildDecisionCopy = ({
  rows = [],
  decisionRows = [],
  availableRows = [],
  unavailableRows = [],
  availableCount = 0,
  skippedCount = 0,
  variant = "",
  featureLabel = "",
} = {}) => {
  const selectedNorm = normalizeText(variant);
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
  const targetAvailable = targetRow ? rowLooksAvailable(targetRow) : null;
  const startRow = availableRows[0] || null;
  const startLabel = rowVariantLabel(startRow);
  const featureName = featureLabel || "this feature";

  if (targetRow) {
    return {
      headline: targetAvailable ? "This variant includes it" : "This variant skips it",
      subline: targetAvailable
        ? `${rowVariantLabel(targetRow)} has ${featureName}.`
        : startLabel
          ? `${featureName} starts from ${startLabel}.`
          : `${featureName} is not listed on the checked variants.`,
    };
  }

  if (availableRows.length && !unavailableRows.length) {
    return {
      headline: "Available from the start",
      subline: `Every checked variant includes ${featureName}.`,
    };
  }

  if (availableRows.length && unavailableRows.length) {
    return {
      headline: startLabel ? `Starts at ${startLabel}` : "Available on select variants",
      subline: decisionRows.length
        ? "The trim ladder below shows the choice point clearly."
        : `${availableRows.length} variants include ${featureName}.`,
    };
  }

  if (!availableRows.length && availableCount > 0 && unavailableRows.length) {
    return {
      headline: "Available above these trims",
      subline:
        skippedCount > 0
          ? `${skippedCount} checked trim${skippedCount === 1 ? "" : "s"} skip ${featureName}; higher variants include it.`
          : `The checked trims skip ${featureName}; higher variants include it.`,
    };
  }

  return {
    headline: "Not listed right now",
    subline: `${featureName} is not showing on the checked variants.`,
  };
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

  const featureLabel = cleanFeatureLabel(feature || title);

  const displayRows = buildDisplayRows({
    rows: allRows,
    variant,
    answerTone,
  });

  const decisionRows = buildDecisionRows({
    rows: allRows,
    variant,
    answerTone,
  });

  const decisionCopy = buildDecisionCopy({
    rows: allRows,
    decisionRows,
    availableRows,
    unavailableRows,
    availableCount,
    skippedCount,
    variant,
    featureLabel,
  });

  const heroFrame = pickImageFrame(
    vehicle,
    data.vehicle,
    widget.vehicle,
    scopedSelectedVehicle,
    data,
    widget,
    message.contextPatch?.selectedVehicle,
    widget.contextPatch?.selectedVehicle,
    data.contextPatch?.selectedVehicle,
    displayRows[0],
    displayRows[0]?.vehicle,
    availableRows[0],
    availableRows[0]?.vehicle,
    allRows[0],
    allRows[0]?.vehicle,
  );

  const heroImage = pickHeroImage(
    vehicle,
    data.vehicle,
    widget.vehicle,
    scopedSelectedVehicle,
    data.selectedVehicle,
    data,
    widget,
    message.contextPatch?.selectedVehicle,
    widget.contextPatch?.selectedVehicle,
    data.contextPatch?.selectedVehicle,
    displayRows[0],
    displayRows[0]?.vehicle,
    availableRows[0],
    availableRows[0]?.vehicle,
    allRows[0],
    allRows[0]?.vehicle,
  );

  const heroFrameStyle = buildFeatureHeroFrameStyle(heroFrame);

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
  });

  const hasImage = Boolean(heroImage);
  const heroCar = heroImage ? (
    <div className="aci-feature-v4-car" style={heroFrameStyle}>
      <img src={heroImage} alt={vehicleName} loading="lazy" draggable="false" />
    </div>
  ) : null;

  return (
    <article
      className={`aci-feature-inline-card-v4 is-${answerTone} ${hasImage ? "has-image" : "no-image"}`}
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
          border: 1px solid rgba(213, 223, 239, 0.86);
          border-radius: 30px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.99), rgba(247,250,255,0.97));
          box-shadow:
            0 30px 88px -60px rgba(8, 26, 66, 0.58),
            0 14px 36px -34px rgba(7, 88, 248, 0.38),
            inset 0 1px 0 rgba(255,255,255,0.98);
          padding: 18px;
        }

        .aci-feature-v4-hero {
          margin: 8px 0 16px;
        }

        .aci-feature-v4-car {
          position: relative;
          height: clamp(180px, 28vw, 230px);
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 24px;
          background: transparent;
        }

        .aci-feature-v4-car::before {
          content: none;
        }

        .aci-feature-v4-car::after {
          content: "";
          position: absolute;
          left: 18%;
          right: 18%;
          bottom: 3%;
          height: 12px;
          border-radius: 999px;
          background: radial-gradient(ellipse, rgba(15, 23, 42, 0.13), transparent 72%);
          filter: blur(6px);
        }

        .aci-feature-v4-car img {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position:
            var(--feature-car-position-x, 50%)
            var(--feature-car-position-y, 50%);
          transform: none;
          filter: drop-shadow(0 18px 16px rgba(15, 23, 42, 0.14));
          max-width: 100%;
          min-width: 0;
        }

        .aci-feature-v4-answer {
          position: relative;
          z-index: 2;
          margin: 0 0 4px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }

        .aci-feature-v4-answer strong {
          display: block;
          color: #071142;
          font-size: clamp(28px, 4.4vw, 40px);
          line-height: 0.96;
          font-weight: 790;
          letter-spacing: 0;
        }

        .aci-feature-v4-answer p {
          margin: 7px 0 0;
          max-width: 420px;
          color: #52607f;
          font-size: 13.5px;
          line-height: 1.42;
          font-weight: 590;
          letter-spacing: 0;
        }

        .aci-feature-v4-status {
          flex: 0 0 auto;
          min-width: 44px;
          height: 44px;
          border-radius: 999px;
          display: inline-grid;
          place-items: center;
          color: ${answerTone === "no" ? "#eb3b50" : "#08a95d"};
          background: ${answerTone === "no" ? "rgba(255,238,240,0.98)" : "rgba(235,253,244,0.98)"};
          box-shadow:
            inset 0 0 0 1px ${answerTone === "no" ? "rgba(235,59,80,0.1)" : "rgba(8,169,93,0.1)"},
            0 14px 28px -24px ${answerTone === "no" ? "rgba(235,59,80,0.42)" : "rgba(8,169,93,0.42)"};
        }

        .aci-feature-v4-status svg {
          width: 19px;
          height: 19px;
        }

        .aci-feature-v4-table {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
          margin: 0;
        }

        .aci-feature-v4-row {
          min-width: 0;
          min-height: 76px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 9px;
          padding: 12px;
          border: 1px solid rgba(216, 226, 241, 0.92);
          border-radius: 20px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,251,255,0.92));
          backdrop-filter: blur(16px);
          box-shadow:
            0 12px 28px -26px rgba(8, 26, 66, 0.48),
            inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .aci-feature-v4-row.is-available {
          border-color: rgba(89, 205, 147, 0.34);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(239,253,246,0.88));
        }

        .aci-feature-v4-row.is-unavailable {
          border-color: rgba(238, 166, 176, 0.34);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,246,247,0.88));
        }

        .aci-feature-v4-row em {
          display: block;
          color: #6c7895;
          font-size: 10.4px;
          line-height: 1;
          font-weight: 760;
          letter-spacing: 0.02em;
          font-style: normal;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .aci-feature-v4-row strong {
          min-width: 0;
          color: #071142;
          font-size: 13.4px;
          line-height: 1.18;
          font-weight: 740;
          letter-spacing: 0;
          overflow: hidden;
          white-space: normal;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .aci-feature-v4-pill {
          flex: 0 0 auto;
          min-width: 28px;
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          align-self: flex-start;
          padding: 0;
          font-size: 0;
        }

        .aci-feature-v4-pill.is-yes {
          color: #08a95d;
          background: rgba(235, 253, 244, 0.98);
          box-shadow: inset 0 0 0 1px rgba(8, 169, 93, 0.08);
        }

        .aci-feature-v4-pill.is-no {
          color: #eb3b50;
          background: rgba(255, 238, 240, 0.98);
          box-shadow: inset 0 0 0 1px rgba(235, 59, 80, 0.08);
        }

        .aci-feature-v4-pill svg {
          width: 14px;
          height: 14px;
        }

        .aci-feature-v4-suggestions {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          overflow: visible;
        }

        .aci-feature-v4-suggestion {
          width: 100%;
          min-width: 0;
          min-height: 42px;
          border: 1px solid rgba(210, 222, 242, 0.96);
          border-radius: 16px;
          padding: 7px 10px 7px 7px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,251,255,0.95));
          color: #071142;
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 8px;
          font-size: 11.8px;
          line-height: 1.15;
          font-weight: 690;
          letter-spacing: 0;
          cursor: pointer;
          white-space: normal;
          text-align: left;
          box-shadow: 0 12px 30px -28px rgba(7, 88, 248, 0.5);
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .aci-feature-v4-suggestion:hover,
        .aci-feature-v4-suggestion:focus-visible {
          border-color: rgba(92, 136, 255, 0.62);
          background: #fff;
          box-shadow: 0 18px 36px -30px rgba(7, 88, 248, 0.62);
          outline: none;
        }

        .aci-feature-v4-suggestion-icon {
          flex: 0 0 auto;
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          color: #0758f8;
          background:
            radial-gradient(circle at 32% 22%, #ffffff 0 12%, transparent 34%),
            #eef5ff;
        }

        .aci-feature-v4-suggestion-icon svg {
          width: 16px;
          height: 16px;
        }

        .aci-feature-v4-suggestion > span:last-child {
          min-width: 0;
        }

        .aci-feature-v4-suggestion > svg {
          flex: 0 0 auto;
          width: 14px;
          height: 14px;
          margin-left: auto;
          color: #6e7a99;
        }

        @media (max-width: 720px) {
          .aci-feature-inline-card-v4 {
            width: 100%;
          }

          .aci-feature-v4-main {
            border-radius: 28px;
            padding: 16px;
          }

          .aci-feature-v4-hero {
            margin: 6px 0 14px;
          }

          .aci-feature-v4-car {
            height: 178px;
          }

          .aci-feature-v4-table {
            gap: 7px;
          }

          .aci-feature-v4-answer {
            margin-bottom: 4px;
          }

          .aci-feature-v4-answer strong {
            font-size: 32px;
          }

          .aci-feature-v4-answer p {
            font-size: 13px;
          }

          .aci-feature-v4-row {
            min-height: 72px;
            padding: 10px;
            border-radius: 18px;
          }

          .aci-feature-v4-row strong {
            font-size: 12.4px;
          }

          .aci-feature-v4-pill {
            min-width: 27px;
            width: 27px;
            height: 26px;
          }

          .aci-feature-v4-suggestions {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 420px) {
          .aci-feature-v4-main {
            padding: 15px;
          }

          .aci-feature-v4-car {
            height: 166px;
          }

          .aci-feature-v4-answer {
            grid-template-columns: minmax(0, 1fr) 40px;
            gap: 8px;
          }

          .aci-feature-v4-answer strong {
            font-size: 30px;
          }

          .aci-feature-v4-status {
            min-width: 40px;
            height: 40px;
          }

          .aci-feature-v4-table {
            margin-left: 0;
            margin-right: 0;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .aci-feature-v4-suggestions {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>

      <section className="aci-feature-v4-main">
        {heroCar ? <div className="aci-feature-v4-hero">{heroCar}</div> : null}

        <div className="aci-feature-v4-answer">
          <div>
            <strong>{decisionCopy.headline}</strong>
            <p>{decisionCopy.subline}</p>
          </div>
          <span
            className="aci-feature-v4-status"
            aria-label={answerTone === "no" ? "Not available" : "Available"}
          >
            {answerTone === "no" ? (
              <X aria-hidden="true" strokeWidth={2.5} />
            ) : (
              <Check aria-hidden="true" strokeWidth={2.5} />
            )}
          </span>
        </div>

        {decisionRows.length ? (
          <div className="aci-feature-v4-table">
            {decisionRows.map((row, index) => {
              const rowVariant = rowVariantLabel(row, `Variant ${index + 1}`);
              const available = rowLooksAvailable(row);
              const firstAvailable = availableRows[0] === row;
              const rowTag = firstAvailable
                ? "Starts here"
                : available
                  ? "Includes it"
                  : "Skips it";

              return (
                <div
                  className={`aci-feature-v4-row ${available ? "is-available" : "is-unavailable"}`}
                  key={row.id || row._id || rowVariant || index}
                >
                  <div>
                    <em>{rowTag}</em>
                    <strong>{rowVariant}</strong>
                  </div>
                  <span
                    className={`aci-feature-v4-pill ${available ? "is-yes" : "is-no"}`}
                    aria-label={available ? "Yes" : "No"}
                  >
                    {available ? (
                      <Check aria-hidden="true" strokeWidth={2.5} />
                    ) : (
                      <X aria-hidden="true" strokeWidth={2.5} />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <div className="aci-feature-v4-suggestions">
        {suggestions.map((suggestion) => (
          <button
            className="aci-feature-v4-suggestion"
            type="button"
            key={suggestion.query || suggestion.label}
            onClick={() => askSuggestion(suggestion)}
          >
            <span className="aci-feature-v4-suggestion-icon">
              <FeatureSuggestionIcon type={suggestion.icon} />
            </span>
            <span>{suggestion.label || suggestion.query}</span>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
      </div>
    </article>
  );
}
