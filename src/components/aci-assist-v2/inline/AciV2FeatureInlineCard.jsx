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

const rowIdentity = (row = {}) => {
  if (!isObject(row)) return "";
  return normalizeText(
    firstValue(
      row.id,
      row._id,
      row.variantId,
      row.variant_id,
      rowVariantLabel(row),
    ),
  );
};

const mergeRowsByVariant = (...sources) => {
  const keys = [];
  const byKey = new Map();

  sources.flatMap(toArray).forEach((row) => {
    if (!isObject(row)) return;
    const key = rowIdentity(row) || `row-${keys.length}`;
    if (!byKey.has(key)) {
      byKey.set(key, row);
      keys.push(key);
      return;
    }

    byKey.set(key, {
      ...byKey.get(key),
      ...row,
    });
  });

  return keys.map((key) => byKey.get(key)).filter(Boolean);
};

const featureRowsFrom = (message = {}, widget = {}) => {
  const data = isObject(widget.data) ? widget.data : {};

  // IMPORTANT:
  // rows/items should be treated as the ordered master list.
  // availableRows/unavailableRows should only be fallback data.
  const orderedRows = mergeRowsByVariant(
    data.rows,
    widget.rows,
    message.rows,
    data.items,
    widget.items,
    message.items,
  );

  if (orderedRows.length) return orderedRows;

  // Fallback only if backend did not send a full ordered rows array.
  // Putting unavailable before available helps feature-start questions,
  // but this is still less reliable than proper ordered rows.
  return mergeRowsByVariant(
    data.unavailableRows,
    widget.unavailableRows,
    message.unavailableRows,
    data.availableRows,
    widget.availableRows,
    message.availableRows,
  );
};

const featureAvailabilityRowsFrom = ({
  allRows = [],
  dataRows,
  widgetRows,
  fallback,
  available = true,
} = {}) => {
  const explicitRows = mergeRowsByVariant(dataRows, widgetRows, fallback);
  if (explicitRows.length) return explicitRows;

  return allRows.filter((row) =>
    available ? rowLooksAvailable(row) : !rowLooksAvailable(row),
  );
};

const makeAvailabilityResolver = ({
  availableRows = [],
  unavailableRows = [],
} = {}) => {
  const availableKeys = new Set(availableRows.map(rowIdentity).filter(Boolean));
  const unavailableKeys = new Set(unavailableRows.map(rowIdentity).filter(Boolean));

  return (row) => {
    const key = rowIdentity(row);
    if (key && availableKeys.has(key)) return true;
    if (key && unavailableKeys.has(key)) return false;
    return rowLooksAvailable(row);
  };
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

const formatIndianPrice = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/₹|rs\.?|lakh|lac|cr|crore/i.test(trimmed)) return trimmed;
  }

  const number = Number(String(value || "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(number) || number <= 0) return "";

  if (number >= 10000000) {
    return `₹${(number / 10000000).toFixed(2)}Cr`;
  }

  if (number >= 100000) {
    return `₹${(number / 100000).toFixed(2)}L`;
  }

  return `₹${number.toLocaleString("en-IN")}`;
};

const rowExShowroomPrice = (row = {}) => {
  const safeRow = isObject(row) ? row : {};
  const priceObject = isObject(safeRow.price) ? safeRow.price : {};

  return formatIndianPrice(
    firstValue(
      safeRow.exShowroomPriceLabel,
      safeRow.exShowroomPriceText,
      safeRow.exShowroomLabel,
      safeRow.ex_showroom_price_label,
      safeRow.exShowroomPrice,
      safeRow.ex_showroom_price,
      safeRow.exShowroom,
      safeRow.ex_showroom,
      safeRow.exshowroom,
      priceObject.exShowroomPriceLabel,
      priceObject.exShowroomPrice,
      priceObject.ex_showroom_price,
      priceObject.exShowroom,
      priceObject.ex_showroom,
    ),
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

const rowFuelCategory = (row = {}) => {
  const safeRow = isObject(row) ? row : {};
  const text = normalizeText(
    firstValue(
      safeRow.fuel,
      safeRow.fuelType,
      safeRow.fuel_type,
      safeRow.engineType,
      safeRow.engine_type,
      safeRow.powertrain,
      safeRow.fuelTransmission,
      rowVariantLabel(safeRow),
    ),
  );

  if (/diesel/.test(text)) return "diesel";
  if (/cng/.test(text)) return "cng";
  if (/electric| ev |bev/.test(` ${text} `)) return "electric";
  if (/hybrid|strong hybrid|mhev/.test(text)) return "hybrid";
  if (/lpg/.test(text)) return "lpg";
  if (/petrol|gasoline/.test(text)) return "petrol";

  // Most Indian variant lists omit "Petrol" in the label and only suffix
  // alternate fuels like Diesel/CNG. Keep the comparison family useful.
  return "petrol";
};

const fuelCategoryFromValue = (value = "") =>
  value ? rowFuelCategory({ fuel: value }) : "";

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

  if (type === "car") {
    return (
      <svg {...common}>
        <path d="M5.2 14.2h13.6l-1.1-3.4c-.3-.9-1.1-1.4-2-1.4H8.3c-.9 0-1.7.5-2 1.4l-1.1 3.4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M7 14.2v2.2M17 14.2v2.2M8.2 17.2h.1M15.7 17.2h.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "grid") {
    return (
      <svg {...common}>
        <path d="M5 5.5h5.2v5.2H5V5.5ZM13.8 5.5H19v5.2h-5.2V5.5ZM5 14h5.2v4.5H5V14ZM13.8 14H19v4.5h-5.2V14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "compare") {
    return (
      <svg {...common}>
        <path d="M7 5v14M17 5v14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M10 8H4l2-2M4 8l2 2M14 16h6l-2-2M20 16l-2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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

const inferSuggestionIcon = (suggestion = {}) => {
  const explicit = typeof suggestion === "string" ? "" : suggestion.icon;
  const text = normalizeText(
    typeof suggestion === "string"
      ? suggestion
      : [
          suggestion.label,
          suggestion.title,
          suggestion.query,
          suggestion.prompt,
          suggestion.intent,
          suggestion.canvasType,
        ].filter(Boolean).join(" "),
  );

  if (/price|on road|emi|finance|cost|budget|value/.test(text)) return "price";
  if (/colour|color|paint|shade/.test(text)) return "palette";
  if (/profile|overview|open car|view car/.test(text)) return "car";
  if (/feature|explore|equipment|spec/.test(text)) return "grid";
  if (/compare|versus|difference| vs /.test(text)) return "compare";
  if (/safety|airbag|abs|adas|brake|braking/.test(text)) return "shield";

  return explicit || "spark";
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
        label: "Sunroof prices",
        query: `Compare ${car} sunroof variants by on-road price`,
        icon: "price",
      },
      {
        label: "Panoramic options",
        query: `Which ${car} variants have panoramic sunroof?`,
        icon: "spark",
      },
    );
  } else if (/abs|airbag|adas|safety|brak/.test(feature)) {
    suggestions.push(
      {
        label: "Safety variants",
        query: `Compare ${car} variants by safety features`,
        icon: "shield",
      },
      {
        label: "Best safety value",
        query: `Which ${car} variant gives the best safety value?`,
        icon: "price",
      },
    );
  } else if (/mileage|kmpl|arai/.test(feature)) {
    suggestions.push(
      {
        label: "Best mileage",
        query: `Which ${car} variant has the best mileage?`,
        icon: "spark",
      },
      {
        label: "Mileage vs price",
        query: `Compare ${car} mileage with on-road price`,
        icon: "price",
      },
    );
  } else {
    suggestions.push(
      {
        label: "Compare trims",
        query: `Compare ${car} variants with ${feature}`,
        icon: "spark",
      },
      {
        label: "Best upgrade",
        query: `Which ${car} variant is the best value upgrade?`,
        icon: "price",
      },
    );
  }

  suggestions.push({
    label: "Colours",
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

const buildDecisionCards = ({
  rows = [],
  availableRows = [],
  unavailableRows = [],
  variant = "",
  answerTone = "",
  preferredFuel = "",
  isAvailable = rowLooksAvailable,
} = {}) => {
  const preferredFuelRows = preferredFuel
    ? rows.filter((row) => rowFuelCategory(row) === preferredFuel)
    : [];
  const scopedRows = preferredFuelRows.length ? preferredFuelRows : rows;
  const startIndex = scopedRows.findIndex(isAvailable);

  if (startIndex < 0) {
    if (variant) {
      return [
        {
          role: "selected",
          label: "Selected variant",
          row: {
            id: `selected-${variant}`,
            variant,
            available: answerTone === "yes",
            value: answerTone === "yes" ? "Yes" : "Not Available",
          },
        },
      ];
    }

    return [];
  }

  const startRow = rowAt(scopedRows, startIndex) || availableRows[0] || null;
  const startKey = rowIdentity(startRow);
  const resolvedFuel = preferredFuel || rowFuelCategory(startRow);
  const sameFuelRows = scopedRows.filter(
    (row) => rowFuelCategory(row) === resolvedFuel,
  );
  const sameFuelStartIndex = sameFuelRows.findIndex(
    (row) => rowIdentity(row) === startKey,
  );

  const beforeRow =
    rowAt(sameFuelRows, sameFuelStartIndex - 1) ||
    [...unavailableRows]
      .reverse()
      .find((row) => rowFuelCategory(row) === resolvedFuel) ||
    null;

  const nextRow =
    scopedRows.find(
      (row, index) =>
        index > startIndex &&
        rowFuelCategory(row) === resolvedFuel &&
        isAvailable(row) &&
        rowIdentity(row) !== startKey,
    ) ||
    availableRows.find(
      (row) =>
        rowFuelCategory(row) === resolvedFuel && rowIdentity(row) !== startKey,
    ) ||
    null;

  const cards = [
    beforeRow
      ? {
          role: "before",
          label: "Last without it",
          row: beforeRow,
        }
      : null,

    startRow
      ? {
          role: "start",
          label: "Recommended start",
          row: startRow,
        }
      : null,

    nextRow
      ? {
          role: "upgrade",
          label: "Next upgrade",
          row: nextRow,
        }
      : null,
  ].filter(Boolean);

  const seen = new Set();

  return cards.filter((card) => {
    const key = normalizeText(
      rowVariantLabel(card.row) || JSON.stringify(card.row),
    );

    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const cleanDisplayText = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const buildFeatureAnswerCopy = ({
  feature = "",
  vehicleName = "",
  variant = "",
  selectedRow = null,
  selectedAvailable = null,
  firstAvailableRow = null,
  availableCount = 0,
  skippedCount = 0,
  answer = "",
} = {}) => {
  const featureText = cleanDisplayText(feature || "This feature");
  const car = cleanDisplayText(vehicleName || "This car");
  const selectedVariantLabel = cleanDisplayText(
    selectedRow ? rowVariantLabel(selectedRow, variant) : variant,
  );
  const firstAvailableLabel = cleanDisplayText(
    firstAvailableRow ? rowVariantLabel(firstAvailableRow) : "",
  );

  let headline = "";

  if (selectedVariantLabel) {
    if (selectedAvailable === true) {
      headline = `${selectedVariantLabel} includes ${featureText}`;
    } else if (selectedAvailable === false && firstAvailableLabel) {
      headline = `${selectedVariantLabel} does not include ${featureText}`;
    } else if (selectedAvailable === false) {
      headline = `${selectedVariantLabel} does not include ${featureText}`;
    }
  }

  if (!headline && firstAvailableLabel) {
    headline = pickCopyVariant(
      [
        `${featureText} starts at ${firstAvailableLabel}`,
        `${featureText} begins at ${firstAvailableLabel}`,
        `${firstAvailableLabel} is the first trim with ${featureText}`,
        `Move to ${firstAvailableLabel} for ${featureText}`,
        `${firstAvailableLabel} unlocks ${featureText}`,
      ],
      `${vehicleName}-${featureText}-${firstAvailableLabel}`,
    );
  }

  if (!headline) {
    headline = `${featureText} is not available`;
  }

  let subline = cleanDisplayText(answer);

  if (!subline) {
    if (availableCount > 0 && skippedCount > 0) {
      subline = `${car} offers ${featureText.toLowerCase()} on ${availableCount} current variants. ${skippedCount} variants skip it.`;
    } else if (availableCount > 0) {
      subline = `${car} offers ${featureText.toLowerCase()} on ${availableCount} current variants.`;
    } else {
      subline = `${car} does not offer ${featureText.toLowerCase()} on the current variants shown.`;
    }
  }

  return {
    headline,
    subline,
  };
};

const stableHash = (value = "") => {
  const text = String(value || "");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const pickCopyVariant = (variants = [], seed = "") => {
  if (!variants.length) return "";
  return variants[stableHash(seed) % variants.length];
};

const buildVariedFeatureFactText = ({
  vehicleName = "",
  feature = "",
  availableCount = 0,
  skippedCount = 0,
  totalCount = 0,
  selectedVariant = "",
  selectedAvailable = null,
} = {}) => {
  const car = cleanDisplayText(vehicleName || "This car");
  const featureText = cleanDisplayText(feature || "this feature");
  const featureLower = featureText.toLowerCase();
  const total =
    Number(totalCount) > 0 ? Number(totalCount) : availableCount + skippedCount;

  const seed = `${car}-${featureText}-${availableCount}-${skippedCount}-${selectedVariant}-${selectedAvailable}`;

  if (selectedVariant && selectedAvailable === true) {
    return pickCopyVariant(
      [
        `${selectedVariant} gets ${featureText}.`,
        `Yes, ${selectedVariant} includes ${featureText}.`,
        `${featureText} is available in ${selectedVariant}.`,
        `${selectedVariant} comes equipped with ${featureText}.`,
        `Good news — ${selectedVariant} has ${featureText}.`,
      ],
      seed,
    );
  }

  if (selectedVariant && selectedAvailable === false && availableCount > 0) {
    return pickCopyVariant(
      [
        `${selectedVariant} skips ${featureText}, but ${availableCount} current ${car} variants offer it.`,
        `${featureText} is not available in ${selectedVariant}; ${availableCount} other current variants include it.`,
        `${selectedVariant} does not get ${featureText}. You will need to move up to a variant that includes it.`,
        `Not on ${selectedVariant}. ${car} offers ${featureLower} on ${availableCount} current variants.`,
        `${selectedVariant} misses out on ${featureText}, while ${availableCount} current variants have it.`,
      ],
      seed,
    );
  }

  if (availableCount > 0 && skippedCount > 0) {
    return pickCopyVariant(
      [
        `${car} offers ${featureLower} on ${availableCount} of ${total} current variants. ${skippedCount} variants skip it.`,
        `${availableCount} out of ${total} current ${car} variants include ${featureLower}; ${skippedCount} do not.`,
        `${featureText} is available on ${availableCount} current ${car} variants, while ${skippedCount} variants miss it.`,
        `Most ${car} variants get ${featureLower}: ${availableCount} include it and ${skippedCount} skip it.`,
        `${car} includes ${featureLower} across ${availableCount} current variants. Only ${skippedCount} variants do not get it.`,
      ],
      seed,
    );
  }

  if (availableCount > 0 && skippedCount === 0) {
    return pickCopyVariant(
      [
        `All ${availableCount} current ${car} variants get ${featureText}.`,
        `${featureText} is standard across all ${availableCount} current ${car} variants.`,
        `Every current ${car} variant includes ${featureText}.`,
        `${car} offers ${featureLower} across the full current variant range.`,
        `No need to upgrade for this — all current ${car} variants include ${featureText}.`,
      ],
      seed,
    );
  }

  return pickCopyVariant(
    [
      `${car} does not offer ${featureLower} on the current variants shown.`,
      `${featureText} is not available on the current ${car} variant range.`,
      `None of the current ${car} variants shown include ${featureText}.`,
      `${car} currently skips ${featureLower} across the variants shown.`,
      `This feature is not available in the current ${car} variants shown.`,
    ],
    seed,
  );
};

export default function AciV2FeatureInlineCard({
  message = {},
  selectedVehicle,
  onAction,
}) {
  const widget = isObject(message.widget) ? message.widget : {};
  const data = isObject(widget.data) ? widget.data : {};
  const allRows = featureRowsFrom(message, widget);
  const availableRows = featureAvailabilityRowsFrom({
    allRows,
    dataRows: data.availableRows,
    widgetRows: widget.availableRows,
    fallback: message.availableRows,
    available: true,
  });
  const unavailableRows = featureAvailabilityRowsFrom({
    allRows,
    dataRows: data.unavailableRows,
    widgetRows: widget.unavailableRows,
    fallback: message.unavailableRows,
    available: false,
  });
  const isRowAvailable = makeAvailabilityResolver({
    availableRows,
    unavailableRows,
  });
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

  const selectedVariantNorm = normalizeText(variant);

  const selectedFeatureRow = selectedVariantNorm
    ? allRows.find((row) => {
        const label = normalizeText(rowVariantLabel(row));
        return (
          label === selectedVariantNorm ||
          label.includes(selectedVariantNorm) ||
          selectedVariantNorm.includes(label)
        );
      })
    : null;

  const selectedFeatureAvailable = selectedFeatureRow
    ? isRowAvailable(selectedFeatureRow)
    : null;
  const requestedFuelCategory = fuelCategoryFromValue(
    firstValue(
      widget.selectedFuel,
      data.selectedFuel,
      widget.fuel,
      data.fuel,
      widget.filters?.fuel,
      data.filters?.fuel,
      message.filters?.fuel,
      widget.entities?.fuel,
      data.entities?.fuel,
    ),
  );
  const decisionFuelCategory =
    requestedFuelCategory ||
    (selectedFeatureRow ? rowFuelCategory(selectedFeatureRow) : "");

  const firstAvailableRow =
    allRows.find(
      (row) =>
        (!decisionFuelCategory ||
          rowFuelCategory(row) === decisionFuelCategory) &&
        isRowAvailable(row),
    ) ||
    availableRows.find(
      (row) =>
        !decisionFuelCategory || rowFuelCategory(row) === decisionFuelCategory,
    ) ||
    null;

  const firstAvailableKey = rowIdentity(firstAvailableRow);

  const answerCopy = buildFeatureAnswerCopy({
    feature,
    vehicleName,
    variant,
    selectedRow: selectedFeatureRow,
    selectedAvailable: selectedFeatureAvailable,
    firstAvailableRow,
    availableCount,
    skippedCount,
    answer:
      answer ||
      buildVariedFeatureFactText({
        vehicleName,
        feature,
        availableCount,
        skippedCount,
        totalCount: allRows.length,
        selectedVariant: variant,
        selectedAvailable: selectedFeatureAvailable,
      }),
  });

  const displayRows = buildDisplayRows({
    rows: allRows,
    variant,
    answerTone,
  });

  const decisionCards = buildDecisionCards({
    rows: allRows,
    availableRows,
    unavailableRows,
    variant,
    answerTone,
    preferredFuel: decisionFuelCategory,
    isAvailable: isRowAvailable,
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
    const query =
      typeof suggestion === "string"
        ? suggestion
        : firstValue(
            suggestion?.query,
            suggestion?.prompt,
            suggestion?.text,
            suggestion?.value,
            suggestion?.label,
          );

    const label =
      typeof suggestion === "string"
        ? suggestion
        : firstValue(
            suggestion?.label,
            suggestion?.title,
            suggestion?.text,
            suggestion?.query,
            suggestion?.prompt,
          );

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

  const explicitSuggestions = toArray(
    widget.suggestions ||
      data.suggestions ||
      message.suggestions ||
      widget.leadingQuestions ||
      data.leadingQuestions ||
      message.leadingQuestions ||
      widget.quickReplies ||
      data.quickReplies ||
      message.quickReplies,
  );

  const suggestions = explicitSuggestions.length
    ? explicitSuggestions.slice(0, 3)
    : buildPremiumFeatureSuggestions({
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
      className={`aci-feature-inline-card-v4 is-${answerTone} ${hasImage ? "has-image" : "no-image"} cards-${Math.min(decisionCards.length, 3)}`}
    >
      <style>{`
        .aci-feature-inline-card-v4 {
          width: min(100%, 720px);
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
          overflow: clip;
          border: 1px solid rgba(213, 223, 239, 0.86);
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.99), rgba(247,250,255,0.97));
          box-shadow:
            0 30px 88px -60px rgba(8, 26, 66, 0.58),
            0 14px 36px -34px rgba(7, 88, 248, 0.38),
            inset 0 1px 0 rgba(255,255,255,0.98);
          padding: 17px;
        }

        .aci-feature-v4-hero {
          margin: 6px 0 15px;
        }

        .aci-feature-v4-car {
          position: relative;
          height: clamp(196px, 26vw, 260px);
          display: grid;
          place-items: center;
          overflow: visible;
          border-radius: 24px;
          background: transparent;
          isolation: isolate;
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
          width: min(92%, 430px);
          height: auto;
          max-height: 92%;
          object-fit: contain;
          object-position:
  var(--feature-car-position-x, center)
  var(--feature-car-position-y, center);
          transform: none;
          filter: drop-shadow(0 18px 16px rgba(15, 23, 42, 0.14));
          max-width: 100%;
          min-width: 0;
        }

        .aci-feature-v4-answer {
  position: relative;
  z-index: 2;
  margin: 0 0 12px;
  display: block;
}

.aci-feature-v4-kicker {
  display: inline-flex;
  margin-bottom: 7px;
  color: #0758f8;
  font-size: 10px;
  line-height: 1;
  font-weight: 780;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.aci-feature-v4-answer strong {
  display: block;
  max-width: 560px;
  color: #071142;
  font-size: clamp(19px, 2.1vw, 25px);
  line-height: 1.08;
  font-weight: 780;
  letter-spacing: -0.035em;
}

.aci-feature-v4-answer p {
  margin: 8px 0 0;
  max-width: 560px;
  color: #53627f;
  font-size: 13.2px;
  line-height: 1.45;
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
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  margin: 0;
}

.aci-feature-v4-row {
  min-width: 0;
  min-height: 58px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  border: 1px solid rgba(217, 226, 241, 0.86);
  border-radius: 17px;
  background:
    linear-gradient(
      180deg,
      rgba(255,255,255,0.97),
      rgba(248,251,255,0.94)
    );
  box-shadow:
    0 12px 28px -30px rgba(8, 26, 66, 0.34),
    inset 0 1px 0 rgba(255,255,255,0.92);
}

.aci-feature-v4-row.is-before {
  opacity: 0.9;
}

.aci-feature-v4-row.is-start {
  border-color: rgba(7, 88, 248, 0.28);
  background:
    radial-gradient(
      circle at top right,
      rgba(7,88,248,0.08),
      transparent 46%
    ),
    linear-gradient(
      180deg,
      rgba(255,255,255,0.99),
      rgba(244,248,255,0.98)
    );
  box-shadow:
    0 20px 46px -38px rgba(7, 88, 248, 0.36),
    inset 0 1px 0 rgba(255,255,255,0.96);
}

.aci-feature-v4-row-copy {
  min-width: 0;
}

.aci-feature-v4-row-label {
  display: block;
  margin-bottom: 5px;
  color: #0758f8;
  font-size: 9.5px;
  line-height: 1;
  font-weight: 780;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aci-feature-v4-row strong {
  display: block;
  min-width: 0;
  color: #071142;
  font-size: 13.2px;
  line-height: 1.18;
  font-weight: 760;
  letter-spacing: -0.01em;
  overflow: visible;
  white-space: normal;
  word-break: normal;
}

.aci-feature-v4-row small {
  display: block;
  margin-top: 5px;
  color: #687694;
  font-size: 10.8px;
  line-height: 1.22;
  font-weight: 620;
}

.aci-feature-v4-row-price {
  display: block;
  margin-top: 4px;
  color: #0758f8;
  font-size: 11px;
  line-height: 1.15;
  font-weight: 780;
  letter-spacing: -0.01em;
}

.aci-feature-v4-row.is-available small {
  color: #3a6a5a;
}

.aci-feature-v4-row.is-unavailable small {
  color: #7b7180;
}

.aci-feature-v4-pill {
  flex: 0 0 auto;
  min-width: 29px;
  width: 29px;
  height: 29px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0;
  font-size: 0;
}

.aci-feature-v4-pill.is-yes {
  color: #0758f8;
  background: rgba(238, 245, 255, 0.98);
  box-shadow: inset 0 0 0 1px rgba(7, 88, 248, 0.1);
}

.aci-feature-v4-pill.is-no {
  color: #8a94aa;
  background: rgba(244, 247, 251, 0.98);
  box-shadow: inset 0 0 0 1px rgba(138, 148, 170, 0.1);
}

.aci-feature-v4-pill svg {
  width: 14px;
  height: 14px;
}

        .aci-feature-v4-suggestions {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  overflow: visible;
}

.aci-feature-v4-suggestion {
  width: auto;
  max-width: 100%;
  min-width: 0;
  min-height: 36px;
  flex: 0 0 auto;
  border: 1px solid rgba(214, 224, 240, 0.82);
  border-radius: 999px;
  padding: 6px 10px 6px 6px;
  background:
    linear-gradient(
      180deg,
      rgba(255,255,255,0.98),
      rgba(248,251,255,0.96)
    );
  color: #071142;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 7px;
  font-size: 12px;
  line-height: 1;
  font-weight: 710;
  letter-spacing: -0.01em;
  cursor: pointer;
  white-space: nowrap;
  text-align: left;
  box-shadow:
    0 12px 28px -28px rgba(7, 88, 248, 0.38);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease;
}

.aci-feature-v4-suggestion:hover,
.aci-feature-v4-suggestion:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(7, 88, 248, 0.22);
  background: #fff;
  box-shadow:
    0 18px 38px -32px rgba(7, 88, 248, 0.52);
  outline: none;
}

.aci-feature-v4-suggestion-icon {
  flex: 0 0 auto;
  width: 23px;
  height: 23px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #0758f8;
  background:
    radial-gradient(circle at 32% 22%, #ffffff 0 12%, transparent 34%),
    #eef5ff;
}

.aci-feature-v4-suggestion-icon svg {
  width: 13px;
  height: 13px;
}

.aci-feature-v4-suggestion > span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aci-feature-v4-suggestion > svg {
  flex: 0 0 auto;
  width: 13px;
  height: 13px;
  margin-left: 2px;
  color: #71809d;
}
.aci-feature-v4-suggestion > span:last-child {
  min-width: 0;
}

.aci-feature-v4-suggestion > svg {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  margin-left: auto;
  color: #71809d;
}

        @media (min-width: 900px) {
          .aci-feature-inline-card-v4 {
            width: min(100%, 760px);
          }

          .aci-feature-v4-main {
  display: grid;
  grid-template-columns: minmax(270px, 0.9fr) minmax(300px, 1.1fr);
  grid-template-areas:
    "answer answer"
    "rows hero";
  column-gap: 18px;
  row-gap: 8px;
  align-items: center;
  padding: 18px 22px;
}

          .aci-feature-v4-answer {
            grid-area: answer;
            margin-bottom: 0;
          }

          .aci-feature-v4-answer strong {
            font-size: 20px;
          }

          .aci-feature-v4-hero {
            grid-area: hero;
            margin: 0;
          }

          .aci-feature-v4-car {
  height: 232px;
}

.aci-feature-v4-car img {
  width: min(98%, 455px);
  max-height: 94%;
}

          .aci-feature-v4-table {
            grid-area: rows;
            grid-template-columns: minmax(0, 1fr);
            align-self: center;
            gap: 7px;
          }

          .aci-feature-v4-row {
  min-height: 51px;
  padding: 8px 11px;
}

          .aci-feature-v4-pill {
            align-self: center;
          }
        }

        @media (max-width: 720px) {
          .aci-feature-inline-card-v4 {
            width: 100%;
          }

          .aci-feature-v4-main {
  border-radius: 26px;
  padding: 14px;
}

          .aci-feature-v4-hero {
            margin: 6px 0 14px;
          }

          .aci-feature-v4-car {
            height: 200px;
          }

          .aci-feature-v4-table {
            gap: 6px;
            grid-template-columns: minmax(0, 1fr);
          }

          .aci-feature-inline-card-v4.cards-2 .aci-feature-v4-table {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .aci-feature-inline-card-v4.cards-3 .aci-feature-v4-table {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .aci-feature-v4-answer {
            margin-bottom: 4px;
          }

          .aci-feature-v4-answer strong {
  font-size: 23px;
  line-height: 1.08;
  letter-spacing: -0.04em;
}

          .aci-feature-v4-answer p {
            font-size: 13px;
          }

          .aci-feature-v4-row {
            min-height: 74px;
            grid-template-columns: minmax(0, 1fr);
            align-items: start;
            padding: 10px 9px;
            border-color: rgba(217, 226, 241, 0.86);
            border-radius: 17px;
            background:
              linear-gradient(
                180deg,
                rgba(255,255,255,0.97),
                rgba(248,251,255,0.94)
              );
            box-shadow:
              0 12px 28px -30px rgba(8, 26, 66, 0.34),
              inset 0 1px 0 rgba(255,255,255,0.92);
          }

          .aci-feature-v4-row.is-start {
            grid-column: auto;
            border-color: rgba(7, 88, 248, 0.28);
            background:
              radial-gradient(
                circle at top right,
                rgba(7,88,248,0.08),
                transparent 46%
              ),
              linear-gradient(
                180deg,
                rgba(255,255,255,0.99),
                rgba(244,248,255,0.98)
              );
            box-shadow:
              0 20px 46px -38px rgba(7, 88, 248, 0.36),
              inset 0 1px 0 rgba(255,255,255,0.96);
          }

          .aci-feature-v4-row-label {
            margin-bottom: 6px;
            color: #0758f8;
            font-size: 8.4px;
            letter-spacing: 0.105em;
          }

          .aci-feature-v4-row.is-start .aci-feature-v4-row-label {
            color: #0758f8;
          }

          .aci-feature-v4-row strong {
            color: #071142;
            font-size: 11.7px;
            line-height: 1.14;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .aci-feature-v4-row small {
            display: none;
          }

          .aci-feature-v4-row-price {
            margin-top: 5px;
            font-size: 10.4px;
            line-height: 1.1;
            color: #0758f8;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .aci-feature-v4-pill {
            display: none;
          }

          .aci-feature-v4-suggestions {
            gap: 6px;
          }
        }

        @media (max-width: 420px) {
          .aci-feature-v4-main {
            padding: 13px;
          }

          .aci-feature-v4-car {
            height: 178px;
          }

          .aci-feature-v4-answer {
            grid-template-columns: minmax(0, 1fr) 40px;
            gap: 8px;
          }

          .aci-feature-v4-answer strong {
  font-size: 21px;
  line-height: 1.1;
}

          .aci-feature-v4-status {
            min-width: 40px;
            height: 40px;
          }

          .aci-feature-v4-table {
            margin-left: 0;
            margin-right: 0;
          }

          .aci-feature-inline-card-v4.cards-3 .aci-feature-v4-table {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .aci-feature-v4-row {
            min-height: 66px;
            padding: 9px 7px;
          }

          .aci-feature-v4-row strong {
            font-size: 11.2px;
          }

          .aci-feature-v4-suggestions {
            display: flex;
          }
        }
      `}</style>

      <section className="aci-feature-v4-main">
        <div className="aci-feature-v4-answer">
          <span className="aci-feature-v4-kicker">{vehicleName}</span>

          <strong>{answerCopy.headline}</strong>
        </div>

        {heroCar ? <div className="aci-feature-v4-hero">{heroCar}</div> : null}

        {decisionCards.length ? (
          <div className="aci-feature-v4-table">
            {decisionCards.map((card, index) => {
              const row = card.row;
              const rowVariant = rowVariantLabel(row, `Variant ${index + 1}`);
              const exShowroomPrice = rowExShowroomPrice(row);
              const available = isRowAvailable(row);
              const key = rowIdentity(row);
              const startsHere = firstAvailableKey && key === firstAvailableKey;

              return (
                <div
                  className={`aci-feature-v4-row is-${card.role} ${
                    available ? "is-available" : "is-unavailable"
                  } ${startsHere ? "is-start" : ""}`}
                  key={row.id || row._id || rowVariant || index}
                >
                  <div className="aci-feature-v4-row-copy">
                    <span className="aci-feature-v4-row-label">
                      {card.role === "before"
                        ? "Before"
                        : card.role === "start"
                          ? "Starts here"
                        : card.role === "upgrade"
                            ? "Next with it"
                            : card.label}
                    </span>

                    <strong>{rowVariant}</strong>

                    <small>
                      {available ? "Included" : "Not included"}
                    </small>

                    {exShowroomPrice ? (
                      <span className="aci-feature-v4-row-price">
                        Ex-showroom {exShowroomPrice}
                      </span>
                    ) : null}
                  </div>

                  <span
                    className={`aci-feature-v4-pill ${
                      available ? "is-yes" : "is-no"
                    }`}
                    aria-label={available ? "Available" : "Not available"}
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
        {suggestions.map((suggestion) => {
          const suggestionLabel =
            typeof suggestion === "string"
              ? suggestion
              : suggestion.label || suggestion.title || suggestion.query;

          return (
            <button
              className="aci-feature-v4-suggestion"
              type="button"
              key={
                typeof suggestion === "string"
                  ? suggestion
                  : suggestion.query || suggestion.label || suggestion.title
              }
              onClick={() => askSuggestion(suggestion)}
            >
              <span className="aci-feature-v4-suggestion-icon">
                <FeatureSuggestionIcon type={inferSuggestionIcon(suggestion)} />
              </span>
              <span>{suggestionLabel}</span>
              <ChevronRight aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </article>
  );
}
