const isObject = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

export const firstValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

export const safeWidget = (widget) => (isObject(widget) ? widget : {});

const getStageFrame = (imageFrame, stageKey = "chatCard") => {
  if (!imageFrame || typeof imageFrame !== "object") return null;

  const stageFrames = imageFrame.stageFrames || {};
  const stages = imageFrame.stages || {};

  return (
    stageFrames?.[stageKey] ||
    stages?.[stageKey] ||
    imageFrame?.[stageKey] ||
    stageFrames?.colorChatCard ||
    stageFrames?.chatCard ||
    stageFrames?.colorStudio ||
    stageFrames?.overviewHero ||
    stageFrames?.mobileHero ||
    stageFrames?.homeCard ||
    stageFrames?.priceSide ||
    stageFrames?.default ||
    imageFrame
  );
};

export const buildChatImageFrameStyle = (imageFrame, stageKey = "chatCard") => {
  const isColorChat =
    stageKey === "colorChatCard" || stageKey === "colorStudio";
  const fallbackScale = isColorChat ? "1.42" : "1";

  const fallback = {
    "--chat-car-frame-scale": fallbackScale,
    "--chat-car-frame-x": "0%",
    "--chat-car-frame-y": "0%",
    "--chat-car-frame-origin": "center center",
    "--car-frame-scale": fallbackScale,
    "--car-frame-x": "0%",
    "--car-frame-y": "0%",
    "--car-frame-origin": "center center",
  };

  const frame = getStageFrame(imageFrame, stageKey);
  if (!frame || typeof frame !== "object") return fallback;

  const pickFirst = (...values) =>
    values.find(
      (value) => value !== undefined && value !== null && value !== "",
    );

  const readNumber = (...values) => {
    const value = pickFirst(...values);

    if (typeof value === "string" && value.trim().endsWith("%")) {
      const parsed = Number(value.trim().slice(0, -1));
      return Number.isFinite(parsed) ? parsed / 100 : null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, Number(value) || 0));

  const cssVars = {
    ...(imageFrame?.cssVars || {}),
    ...(frame?.cssVars || {}),
  };

  const canvasWidth = readNumber(
    frame.canvas_width,
    frame.canvasWidth,
    frame.naturalWidth,
    frame.imageWidth,
    frame.sourceWidth,
    imageFrame?.canvas_width,
    imageFrame?.canvasWidth,
    imageFrame?.naturalWidth,
    imageFrame?.imageWidth,
    imageFrame?.sourceWidth,
  );

  const canvasHeight = readNumber(
    frame.canvas_height,
    frame.canvasHeight,
    frame.naturalHeight,
    frame.imageHeight,
    frame.sourceHeight,
    imageFrame?.canvas_height,
    imageFrame?.canvasHeight,
    imageFrame?.naturalHeight,
    imageFrame?.imageHeight,
    imageFrame?.sourceHeight,
  );

  const bounds =
    frame.bounds ||
    frame.visibleBounds ||
    frame.visibleBox ||
    frame.contentBounds ||
    frame.contentBox ||
    frame.subjectBounds ||
    frame.subjectBox ||
    frame.carBounds ||
    frame.carBox ||
    frame.trimBounds ||
    frame.trimBox ||
    frame.bbox ||
    frame;

  const rawLeft = readNumber(bounds.left, bounds.x, bounds.minX);
  const rawTop = readNumber(bounds.top, bounds.y, bounds.minY);
  const rawWidth = readNumber(bounds.width, bounds.w);
  const rawHeight = readNumber(bounds.height, bounds.h);

  const looksNormalized =
    [rawLeft, rawTop, rawWidth, rawHeight].every((value) =>
      Number.isFinite(value),
    ) &&
    rawLeft >= 0 &&
    rawTop >= 0 &&
    rawWidth > 0 &&
    rawHeight > 0 &&
    rawLeft <= 1 &&
    rawTop <= 1 &&
    rawWidth <= 1 &&
    rawHeight <= 1;

  let centerX = null;
  let centerY = null;
  let widthRatio = null;
  let heightRatio = null;

  if (looksNormalized) {
    centerX = rawLeft + rawWidth / 2;
    centerY = rawTop + rawHeight / 2;
    widthRatio = rawWidth;
    heightRatio = rawHeight;
  } else if (
    Number.isFinite(canvasWidth) &&
    Number.isFinite(canvasHeight) &&
    canvasWidth > 0 &&
    canvasHeight > 0 &&
    Number.isFinite(rawLeft) &&
    Number.isFinite(rawTop) &&
    Number.isFinite(rawWidth) &&
    Number.isFinite(rawHeight) &&
    rawWidth > 0 &&
    rawHeight > 0
  ) {
    centerX = (rawLeft + rawWidth / 2) / canvasWidth;
    centerY = (rawTop + rawHeight / 2) / canvasHeight;
    widthRatio = rawWidth / canvasWidth;
    heightRatio = rawHeight / canvasHeight;
  }

  const hasBounds =
    Number.isFinite(centerX) &&
    Number.isFinite(centerY) &&
    Number.isFinite(widthRatio) &&
    Number.isFinite(heightRatio) &&
    widthRatio > 0 &&
    heightRatio > 0;

  if (!hasBounds) return fallback;

  const explicitScale = isColorChat
    ? null
    : readNumber(
        cssVars["--chat-car-frame-scale"],
        cssVars["--car-frame-scale"],
        frame.scale,
        frame.zoom,
      );

  const targetCenterX = 0.5;
  const targetCenterY = 0.65;
  const safeWidthFill = isColorChat ? 0.94 : 0.9;
  const safeHeightFill = isColorChat ? 0.86 : 0.72;
  const widthScale = safeWidthFill / Math.max(widthRatio, 0.01);
  const heightScale = safeHeightFill / Math.max(heightRatio, 0.01);
  const fittedScale = clamp(
    Math.min(widthScale, heightScale),
    isColorChat ? 0.95 : 0.9,
    isColorChat ? 2.85 : 2.05,
  );

  const scale = explicitScale || fittedScale;
  const computedX = (targetCenterX - 0.5 - scale * (centerX - 0.5)) * 100;
  const computedY = (targetCenterY - 0.5 - scale * (centerY - 0.5)) * 100;

  const x = isColorChat
    ? ""
    : pickFirst(
        cssVars["--chat-car-frame-x"],
        cssVars["--car-frame-x"],
        frame.translateXPct,
        frame.translateXPercent,
        frame.translateX,
      );

  const y = isColorChat
    ? ""
    : pickFirst(
        cssVars["--chat-car-frame-y"],
        cssVars["--car-frame-y"],
        frame.translateYPct,
        frame.translateYPercent,
        frame.translateY,
      );

  const origin =
    cssVars["--chat-car-frame-origin"] ||
    cssVars["--car-frame-origin"] ||
    frame.transformOrigin ||
    "center center";

  const xValue =
    typeof x === "number"
      ? `${x}%`
      : x ||
        `${clamp(computedX, isColorChat ? -28 : -34, isColorChat ? 28 : 34)}%`;

  const yValue =
    typeof y === "number"
      ? `${y}%`
      : y ||
        `${clamp(computedY, isColorChat ? -34 : -30, isColorChat ? 26 : 30)}%`;

  return {
    "--chat-car-frame-scale": String(Number(scale).toFixed(4)),
    "--chat-car-frame-x": xValue,
    "--chat-car-frame-y": yValue,
    "--chat-car-frame-origin": origin,
    "--car-frame-scale": String(Number(scale).toFixed(4)),
    "--car-frame-x": xValue,
    "--car-frame-y": yValue,
    "--car-frame-origin": origin,
  };
};

export const buildInlineColorFrameStyle = (imageFrame = {}) =>
  buildChatImageFrameStyle(imageFrame, "colorStudio");

export const canvasTypeLabel = (canvasType = "") =>
  String(canvasType || "")
    .replace(/_/g, " ")
    .replace(/\bcanvas\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "Result";

export const getWidgetTitle = (widget = {}, canvasType = "", vehicle = null) => {
  const item = safeWidget(widget);

  return firstValue(
    item.title,
    item.heading,
    item.model,
    item.displayName,
    vehicle?.displayName,
    canvasTypeLabel(canvasType),
  );
};

export const getWidgetRows = (widget = {}) => {
  const item = safeWidget(widget);

  return toArray(item.rows || item.variants || item.items || item.colors).slice(
    0,
    3,
  );
};

export const formatIndianPrice = (value) => {
  if (value === null || value === undefined || value === "") return "";

  const originalText = String(value).trim();
  if (!originalText) return "";

  const normalizeNumber = (input) => {
    const clean = String(input).replace(/[₹,\s]/g, "");
    const number = Number(clean.replace(/[^\d.]/g, ""));
    return Number.isFinite(number) ? number : null;
  };

  const formatSinglePrice = (input, inheritedUnit = "") => {
    const text = String(input || "").trim();
    if (!text) return "";

    const explicitUnit =
      text.match(/lakh|crore/i)?.[0]?.toLowerCase() || inheritedUnit;
    const number = normalizeNumber(text);

    if (number === null) {
      return text.startsWith("₹") ? text : `₹${text}`;
    }

    let rupeeValue = number;

    if (explicitUnit === "crore") {
      rupeeValue = number * 10000000;
    } else if (explicitUnit === "lakh") {
      rupeeValue = number * 100000;
    } else if (number > 0 && number < 1000 && String(text).includes(".")) {
      rupeeValue = number * 100000;
    }

    return `₹${Math.round(rupeeValue).toLocaleString("en-IN")}`;
  };

  const inheritedUnit = /crore/i.test(originalText)
    ? "crore"
    : /lakh/i.test(originalText)
      ? "lakh"
      : "";

  const parts = originalText
    .replace(/\s+to\s+/gi, " - ")
    .split(/\s*(?:-|–|—)\s*/)
    .filter(Boolean);

  if (parts.length > 1) {
    return parts.map((part) => formatSinglePrice(part, inheritedUnit)).join(" - ");
  }

  return formatSinglePrice(originalText, inheritedUnit);
};

const normalizeSuggestionKey = (item = {}) =>
  String(item.label || item.title || item.query || item.id || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const buildChatSuggestions = ({
  widget = {},
  message = {},
  limit = 4,
} = {}) => {
  const merged = [];
  const seen = new Set();

  [
    ...toArray(widget.leadingQuestions),
    ...toArray(message.leadingQuestions),
    ...toArray(widget.actions),
    ...toArray(message.actions),
  ].forEach((item) => {
    const key = normalizeSuggestionKey(item);
    if (!key || seen.has(key)) return;

    seen.add(key);
    merged.push(item);
  });

  return merged.slice(0, limit);
};

export const isFeatureCanvasWidget = (widget = {}, canvasType = "") => {
  const type = canvasType || widget.canvasType || "";
  const intent = widget.intent || "";
  return (
    type === "features_explorer_canvas" ||
    type === "feature_match_builder_canvas" ||
    intent === "vehicle_model_features_explorer" ||
    intent === "vehicle_feature_discovery"
  );
};

export const isFeatureAnswerWidget = (message = {}, widget = {}) =>
  message.inlineType === "feature_answer_card" ||
  widget.inlineType === "feature_answer_card" ||
  message.intent === "vehicle_feature_answer" ||
  widget.intent === "vehicle_feature_answer";

export const getFeaturePreviewRows = (widget = {}, canvasType = "") => {
  if (
    canvasType === "feature_match_builder_canvas" ||
    widget.intent === "vehicle_feature_discovery"
  ) {
    return toArray(widget.rows || widget.matchedVariants || widget.items).slice(0, 3);
  }

  const variants = toArray(widget.variantOptions || widget.variants);
  const selectedVariantId = String(widget.selectedVariantId || "");
  const selectedVariant = String(widget.selectedVariant || "").toLowerCase();

  const selected = variants.find((variant) => {
    const id = String(variant.id || variant._id || "");
    const label = String(variant.label || variant.variant || variant.variantName || "").toLowerCase();
    return (selectedVariantId && id === selectedVariantId) || (selectedVariant && label === selectedVariant);
  });

  const ordered = selected
    ? [selected, ...variants.filter((variant) => variant !== selected)]
    : variants;

  return ordered.slice(0, 3);
};

export const formatFeaturePreviewPrice = (row = {}) =>
  firstValue(
    row.priceLabel,
    row.exShowroomPriceLabel,
    row.onRoadPriceLabel,
    row.priceRange,
    row.price,
    row.exShowroomPrice,
    row.onRoadPrice,
  );
