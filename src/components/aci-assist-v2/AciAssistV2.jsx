import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import { ACI_ASSIST_HOME_DATA, ACI_HOME_IMAGES } from "./data/homeScreenData";
import {
  ACI_V2_SCREENS,
  ACI_V2_SCREEN_COMPONENTS,
  normalizeCanvasType as normalizeV2CanvasType,
  resolveScreenFromCanvasType,
} from "./canvas/aciV2CanvasRegistry";
import AciAssistStyles from "./shared/AciAssistStyles";
import {
  AciAssistantOrb,
  AciComposer,
  AciLogo,
  AciVehicleVisual,
  normalizeAciAction,
} from "./shared/AciAssistShared";
import { askAciAssistV2 } from "./services/aciAssistV2Api";
import AciAssistHomeScreen from "./screens/AciAssistHomeScreen";

const SCREEN = ACI_V2_SCREENS;

const isObject = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const firstValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const frameNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const cssPercent = (value, fallback = 0, min = -18, max = 18) => {
  const raw =
    typeof value === "string" && value.trim().endsWith("%")
      ? Number(value.trim().slice(0, -1))
      : frameNumber(value, fallback);

  if (!Number.isFinite(raw)) return `${fallback}%`;
  return `${clampNumber(raw, min, max)}%`;
};

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

const buildChatImageFrameStyle = (imageFrame, stageKey = "chatCard") => {
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

  /*
  Same principle as Color Studio:
  center the detected car frame and scale until it fills
  the padded stage without cropping.
*/
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

const getVehicleId = (vehicle = {}) =>
  firstValue(vehicle?.id, vehicle?._id, vehicle?.vehicleId, vehicle?.modelId);

const getVehicleModelKey = (vehicle = {}) =>
  String(firstValue(vehicle?.model, vehicle?.modelName) || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getVehicleTitle = (vehicle = {}) =>
  firstValue(
    vehicle?.displayName,
    vehicle?.name,
    [vehicle?.brand || vehicle?.make, vehicle?.model].filter(Boolean).join(" "),
    vehicle?.model,
  );

const hasVehicleIdentity = (vehicle = {}) =>
  Boolean(
    getVehicleId(vehicle) ||
    vehicle?.model ||
    vehicle?.name ||
    vehicle?.displayName,
  );

const normalizeVehicle = (vehicle) => {
  if (!isObject(vehicle) || !hasVehicleIdentity(vehicle)) return null;

  const make = firstValue(vehicle.make, vehicle.brand);
  const brand = firstValue(vehicle.brand, vehicle.make);
  const model = firstValue(vehicle.model, vehicle.modelName);
  const displayName = getVehicleTitle({ ...vehicle, make, brand, model });

  return {
    ...vehicle,
    id: firstValue(vehicle.id, vehicle._id, vehicle.vehicleId, vehicle.modelId),
    _id: vehicle._id,
    make,
    brand,
    model,
    displayName,
  };
};

const mergeVehicle = (base, incoming) => {
  const normalizedBase = normalizeVehicle(base);
  const normalizedIncoming = normalizeVehicle(incoming);

  if (!normalizedIncoming) return normalizedBase;
  if (!normalizedBase) return normalizedIncoming;

  const baseId = getVehicleId(normalizedBase);
  const incomingId = getVehicleId(normalizedIncoming);
  const baseModel = getVehicleModelKey(normalizedBase);
  const incomingModel = getVehicleModelKey(normalizedIncoming);

  const isSameVehicle =
    (baseId && incomingId && String(baseId) === String(incomingId)) ||
    (baseModel && incomingModel && baseModel === incomingModel);

  return {
    ...(isSameVehicle ? normalizedBase : {}),
    ...normalizedIncoming,
    id: firstValue(
      normalizedIncoming.id,
      normalizedIncoming._id,
      isSameVehicle ? normalizedBase.id : "",
    ),
    make: firstValue(
      normalizedIncoming.make,
      normalizedIncoming.brand,
      isSameVehicle ? normalizedBase.make : "",
    ),
    brand: firstValue(
      normalizedIncoming.brand,
      normalizedIncoming.make,
      isSameVehicle ? normalizedBase.brand : "",
    ),
    model: firstValue(
      normalizedIncoming.model,
      isSameVehicle ? normalizedBase.model : "",
    ),
    displayName: firstValue(
      normalizedIncoming.displayName,
      normalizedIncoming.name,
      isSameVehicle ? normalizedBase.displayName : "",
      isSameVehicle ? normalizedBase.name : "",
    ),
    imageUrl: firstValue(
      normalizedIncoming.imageUrl,
      normalizedIncoming.normalizedImageUrl,
      normalizedIncoming.cleanImageUrl,
      normalizedIncoming.heroImageUrl,
      normalizedIncoming.vehicleImageUrl,
      isSameVehicle ? normalizedBase.imageUrl : "",
    ),
    normalizedImageUrl: firstValue(
      normalizedIncoming.normalizedImageUrl,
      normalizedIncoming.cleanImageUrl,
      isSameVehicle ? normalizedBase.normalizedImageUrl : "",
    ),
  };
};

const mergeSessionContext = (previous = {}, patch = {}) => {
  const incomingVehicle =
    patch.selectedVehicle || patch.vehicle || patch.activeVehicle;
  const selectedVehicle = mergeVehicle(
    previous.selectedVehicle,
    incomingVehicle,
  );
  const previousVehicleKey = getVehicleModelKey(
    previous.selectedVehicle || { model: previous.anchorModel },
  );
  const selectedVehicleKey = getVehicleModelKey(selectedVehicle);
  const vehicleChanged =
    Boolean(incomingVehicle) &&
    previousVehicleKey &&
    selectedVehicleKey &&
    previousVehicleKey !== selectedVehicleKey;
  const canReusePreviousVehicleAnchors = !vehicleChanged;

  return {
    ...previous,
    ...patch,
    selectedVehicle: selectedVehicle || previous.selectedVehicle || null,
    anchorMake: firstValue(
      patch.anchorMake,
      selectedVehicle?.make,
      selectedVehicle?.brand,
      canReusePreviousVehicleAnchors ? previous.anchorMake : "",
    ),
    anchorModel: firstValue(
      patch.anchorModel,
      selectedVehicle?.model,
      previous.anchorModel,
    ),
    anchorVariant: firstValue(
      patch.anchorVariant,
      selectedVehicle?.variant,
      selectedVehicle?.variantName,
      canReusePreviousVehicleAnchors ? previous.anchorVariant : "",
    ),
    anchorCity: firstValue(
      patch.anchorCity,
      selectedVehicle?.city,
      previous.anchorCity,
      "Delhi",
    ),
  };
};

const normalizeBackendWidget = (backend = {}) => {
  const widget =
    (isObject(backend.widget) && backend.widget) ||
    (isObject(backend.canvas) && backend.canvas) ||
    (isObject(backend.payload?.widget) && backend.payload.widget) ||
    (isObject(backend.data?.widget) && backend.data.widget) ||
    {};

  return {
    ...widget,
    canvasType: firstValue(backend.canvasType, widget.canvasType),
    title: firstValue(backend.title, widget.title),
    subtitle: firstValue(backend.subtitle, widget.subtitle),
    answer: firstValue(backend.answer, widget.answer),
    rows: toArray(firstValue(backend.rows, widget.rows)),
    colors: toArray(firstValue(backend.colors, widget.colors)),
    variants: toArray(firstValue(backend.variants, widget.variants)),
    actions: toArray(firstValue(backend.actions, widget.actions)),
    leadingQuestions: toArray(
      firstValue(backend.leadingQuestions, widget.leadingQuestions),
    ),
    contextPatch: {
      ...(widget.contextPatch || {}),
      ...(backend.contextPatch || {}),
    },
    raw: backend.raw || widget.raw || null,
  };
};

const safeWidget = (widget) => (isObject(widget) ? widget : {});

const buildContextPatchFromBackend = (backend = {}, widget = {}) => ({
  ...(widget.contextPatch || {}),
  ...(backend.contextPatch || {}),
  selectedVehicle:
    backend.contextPatch?.selectedVehicle ||
    widget.contextPatch?.selectedVehicle ||
    backend.vehicle ||
    widget.vehicle ||
    null,
});

const firstVehicle = (...values) => {
  for (const value of values) {
    const vehicle = normalizeVehicle(value);
    if (vehicle) return vehicle;
  }

  return null;
};

const getCanvasScopedVehicle = (message = {}, widget = {}) =>
  firstVehicle(
    message.vehicle,
    message.selectedVehicle,
    message.contextPatch?.selectedVehicle,
    widget.contextPatch?.selectedVehicle,
    widget.vehicle,
    widget.selectedVehicle,
    widget.data?.vehicle,
    widget.data?.selectedVehicle,
    message.data?.vehicle,
    message.data?.selectedVehicle,
  );

const withCanvasVehicleContext = (widget = {}, vehicle = null) => {
  const safe = safeWidget(widget);
  if (!vehicle) return safe;

  return {
    ...safe,
    vehicle: safe.vehicle || vehicle,
    contextPatch: {
      ...(safe.contextPatch || {}),
      selectedVehicle: vehicle,
    },
  };
};

const CROSS_CANVAS_INTENTS = new Set([
  "vehicle_pricelist",
  "vehicle_price",
  "vehicle_variant_price",
  "vehicle_price_breakup",

  "vehicle_emi",
  "vehicle_emi_calculator",

  "aci_lead_capture",
  "aci_new_car_quotation",
  "quotation_lead",

  "vehicle_overview",
  "open_vehicle",
]);

const CROSS_CANVAS_TYPES = new Set([
  "pricelist_canvas",
  "price_breakup_canvas",
  "emi_calculator_canvas",
  "aci_quotation_canvas",
  "lead_capture_canvas",
  "car_overview_canvas",
  "vehicle_overview_canvas",
]);

const isCanvasInteractionOnly = (action = {}) => {
  const intent = action.intent || action.payload?.intent || "";
  const canvasType = normalizeV2CanvasType(
    action.canvasType || action.payload?.canvasType || "",
  );

  if (CROSS_CANVAS_INTENTS.has(intent) || CROSS_CANVAS_TYPES.has(canvasType)) {
    return false;
  }

  return Boolean(
    action.payload?.color ||
    action.payload?.selectedColor ||
    action.selectedColor ||
    action.type === "color_selected" ||
    action.type === "select_color_mood" ||
    action.type === "save_color" ||
    action.type === "save_color_insight",
  );
};

const getActionMessage = (action = {}, targetVehicle = null) => {
  const direct = firstValue(
    action.query,
    action.prompt,
    action.payload?.query,
    action.label,
  );

  if (direct) return String(direct).trim();

  const title = getVehicleTitle(targetVehicle || action.vehicle);
  if (title) return `Open ${title}`;

  return "";
};

const MAX_CONTEXT_ITEMS = 20;
const MAX_CONTEXT_TEXT = 700;

const trimContextText = (value) => {
  if (typeof value !== "string") return value;
  return value.length > MAX_CONTEXT_TEXT
    ? `${value.slice(0, MAX_CONTEXT_TEXT)}…`
    : value;
};

const sanitizeRecordForBackendContext = (record) => {
  if (!isObject(record)) return trimContextText(record);

  const blockedKeys = new Set([
    "raw",
    "backendRaw",
    "html",
    "descriptionHtml",
    "imageBase64",
    "base64",
    "blob",
    "file",
  ]);

  return Object.entries(record).reduce((acc, [key, value]) => {
    if (blockedKeys.has(key)) return acc;

    if (Array.isArray(value)) {
      acc[key] = value
        .slice(0, MAX_CONTEXT_ITEMS)
        .map(sanitizeRecordForBackendContext);
      return acc;
    }

    if (isObject(value)) {
      acc[key] = sanitizeRecordForBackendContext(value);
      return acc;
    }

    acc[key] = trimContextText(value);
    return acc;
  }, {});
};

const sanitizeWidgetForBackendContext = (widget) => {
  if (!isObject(widget)) return null;

  const allowedScalarKeys = [
    "canvasType",
    "__rawCanvasType",
    "title",
    "subtitle",
    "answer",
    "summary",
    "selectedVariant",
    "selectedColor",
    "model",
    "make",
    "brand",
    "city",
  ];

  const allowedArrayKeys = [
    "rows",
    "items",
    "variants",
    "colors",
    "actions",
    "leadingQuestions",
    "suggestions",
  ];

  const clean = {};

  allowedScalarKeys.forEach((key) => {
    if (
      widget[key] !== undefined &&
      widget[key] !== null &&
      widget[key] !== ""
    ) {
      clean[key] = trimContextText(widget[key]);
    }
  });

  allowedArrayKeys.forEach((key) => {
    const list = toArray(widget[key]);
    if (list.length) {
      clean[key] = list
        .slice(0, MAX_CONTEXT_ITEMS)
        .map(sanitizeRecordForBackendContext);
    }
  });

  return Object.keys(clean).length ? clean : null;
};

const sanitizeActionForBackendContext = (action) => {
  if (!isObject(action)) return null;

  return {
    id: action.id || "",
    label: action.label || "",
    query: action.query || "",
    type: action.type || "",
    intent: action.intent || "",
    canvasType: action.canvasType || "",
    vehicle: normalizeVehicle(action.vehicle),
    contextPatch: {
      ...(action.contextPatch || {}),
      selectedVehicle: normalizeVehicle(action.contextPatch?.selectedVehicle),
    },
  };
};

const buildChatMessageId = (prefix = "msg") =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const canvasTypeLabel = (canvasType = "") =>
  String(canvasType || "")
    .replace(/_/g, " ")
    .replace(/\bcanvas\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "Result";

const getWidgetTitle = (widget = {}, canvasType = "", vehicle = null) => {
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

const getWidgetSubtitle = (widget = {}, vehicle = null) => {
  const item = safeWidget(widget);

  return firstValue(
    item.subtitle,
    item.summary,
    item.answer,
    item.city ? `Live ${item.city} data` : "",
    vehicle?.city ? `Using ${vehicle.city} as city context` : "",
  );
};

const getWidgetRows = (widget = {}) => {
  const item = safeWidget(widget);

  return toArray(item.rows || item.variants || item.items || item.colors).slice(
    0,
    3,
  );
};

const getWidgetCountText = (widget = {}) => {
  const item = safeWidget(widget);
  const rows = toArray(item.rows);
  const variants = toArray(item.variants);
  const colors = toArray(item.colors);
  const items = toArray(item.items);

  if (rows.length) return `${rows.length} results`;
  if (variants.length) return `${variants.length} variants`;
  if (colors.length) return `${colors.length} colors`;
  if (items.length) return `${items.length} items`;
  return "Live result";
};

const formatIndianPrice = (value) => {
  if (value === null || value === undefined || value === "") return "";

  const originalText = String(value).trim();
  if (!originalText) return "";

  const normalizeNumber = (input) => {
    const clean = String(input).replace(/[₹,\s]/g, "");
    const number = Number(clean.replace(/[^\d.]/g, ""));
    return Number.isFinite(number) ? number : null;
  };

  const formatSinglePrice = (input, inheritedUnit = "") => {
    let text = String(input || "").trim();
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
    .replace(/\s+to\s+/gi, " – ")
    .split(/\s*(?:–|—|-)\s*/)
    .filter(Boolean);

  if (parts.length > 1) {
    return parts
      .map((part) => formatSinglePrice(part, inheritedUnit))
      .join(" – ");
  }

  return formatSinglePrice(originalText, inheritedUnit);
};

const getQuestionIconType = (label = "", index = 0) => {
  const text = String(label).toLowerCase();

  if (/automatic|manual|imt|ivt|dct|transmission/.test(text)) return "gear";
  if (
    /pricelist|price list|price breakup|breakup|on-road|road tax|insurance|fee/.test(
      text,
    )
  )
    return "receipt";
  if (/charge|on-road|road tax|insurance|fee/.test(text)) return "receipt";
  if (/best value|value|emi|loan|finance|budget|price/.test(text))
    return "money";
  if (/compare|comparison|versus|vs/.test(text)) return "compare";
  if (/petrol|diesel|fuel|cng|ev|electric/.test(text)) return "fuel";
  if (/city|highway|road|drive|traffic/.test(text)) return "road";
  if (/seat|seater|family|space/.test(text)) return "people";
  if (/feature|sunroof|safety|variant/.test(text)) return "spark";

  return ["spark", "gear", "money", "road", "compare"][index % 5];
};

function AciQuestionIcon({ label = "", index = 0 }) {
  const type = getQuestionIconType(label, index);

  return (
    <span className="aci-chat-chip-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        {type === "gear" ? (
          <>
            <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
            <path d="M12 2.8v2.4" />
            <path d="M12 18.8v2.4" />
            <path d="M4.2 6.1l1.7 1.7" />
            <path d="M18.1 16.2l1.7 1.7" />
            <path d="M2.8 12h2.4" />
            <path d="M18.8 12h2.4" />
            <path d="M4.2 17.9l1.7-1.7" />
            <path d="M18.1 7.8l1.7-1.7" />
          </>
        ) : type === "receipt" ? (
          <>
            <path d="M7 3h10v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V3Z" />
            <path d="M9 8h6" />
            <path d="M9 12h6" />
            <path d="M9 16h4" />
          </>
        ) : type === "money" ? (
          <>
            <path d="M7 5h10" />
            <path d="M7 9h10" />
            <path d="M9 5c5 0 5 8 0 8H8l7 6" />
          </>
        ) : type === "compare" ? (
          <>
            <path d="M7 5v14" />
            <path d="M17 5v14" />
            <path d="M4 9h6l-3 5-3-5Z" />
            <path d="M14 9h6l-3 5-3-5Z" />
          </>
        ) : type === "fuel" ? (
          <>
            <path d="M6 20V5.8C6 4.8 6.8 4 7.8 4h5.4c1 0 1.8.8 1.8 1.8V20" />
            <path d="M5 20h11" />
            <path d="M8 8h5" />
            <path d="M15 7l3 3v7a1.6 1.6 0 0 0 3.2 0v-4.5L18 9" />
          </>
        ) : type === "road" ? (
          <>
            <path d="M8 21 11 3" />
            <path d="M16 21 13 3" />
            <path d="M12 7v2" />
            <path d="M12 13v2" />
            <path d="M12 19v1" />
          </>
        ) : type === "people" ? (
          <>
            <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            <path d="M17 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
            <path d="M14 17.5a4.5 4.5 0 0 1 6.5 2.5" />
          </>
        ) : (
          <>
            <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
            <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
          </>
        )}
      </svg>
    </span>
  );
}

const normalizeSuggestionKey = (item = {}) =>
  String(item.label || item.title || item.query || item.id || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const buildChatSuggestions = ({
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

function buildInlineColorFrameStyle(imageFrame = {}) {
  return buildChatImageFrameStyle(imageFrame, "colorStudio");
}

function AciV2CanvasPreviewCard({
  message = {},
  selectedVehicle,
  onAction,
  onOpen,
}) {
  const widget = message.widget || {};

  const canvasType =
    message.canvasType || widget.canvasType || widget.__rawCanvasType || "";

  const isColorResult =
    widget?.type === "vehicle_colors" ||
    widget?.tool === "vehicle_colors" ||
    widget?.toolName === "vehicle_colors" ||
    widget?.tool_name === "vehicle_colors" ||
    widget?.canvasType === "color_studio_canvas" ||
    widget?.canvasType === "colors_canvas" ||
    widget?.canvasType === "vehicle_colors" ||
    canvasType === "color_studio_canvas" ||
    canvasType === "colors_canvas" ||
    canvasType === "vehicle_colors";

  const rows = isColorResult
    ? toArray(
        widget.colors || widget.rows || widget.items || widget.records,
      ).slice(0, 3)
    : getWidgetRows(widget);

  const hasCanvas = Boolean(canvasType);

  const openCanvasLabel =
    canvasType === "pricelist_canvas" || canvasType === "price_breakup_canvas"
      ? "Open Pricelist"
      : `Open ${canvasTypeLabel(canvasType)}`;

  const actions = buildChatSuggestions
    ? buildChatSuggestions({ widget, message, limit: 4 })
    : toArray(
        widget.leadingQuestions || widget.actions || message.actions,
      ).slice(0, 4);

  const carouselRef = useRef(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const maxCarouselIndex = Math.max(0, rows.length - 1);
  const carouselProgress =
    maxCarouselIndex > 0 ? carouselIndex / maxCarouselIndex : 0;

  const pickText = (...values) => {
    for (const value of values) {
      const text = String(value || "").trim();
      if (text) return text;
    }
    return "";
  };

  const pickAny = (...values) =>
    values.find((value) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim() !== "";
      if (typeof value === "object") return Object.keys(value).length > 0;
      return true;
    }) || null;

  const getCarouselStep = () => {
    const scroller = carouselRef.current;
    if (!scroller) return 0;

    const firstCard = scroller.querySelector(".aci-chat-preview-card");
    if (!firstCard) return 0;

    const styles = window.getComputedStyle(scroller);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;

    return firstCard.getBoundingClientRect().width + gap;
  };

  const handleCarouselScroll = () => {
    const scroller = carouselRef.current;
    if (!scroller) return;

    const step = getCarouselStep();
    if (!step) return;

    const nextIndex = Math.max(
      0,
      Math.min(maxCarouselIndex, Math.round(scroller.scrollLeft / step)),
    );

    setCarouselIndex(nextIndex);
  };

  const snapCarouselToNearest = () => {
    const scroller = carouselRef.current;
    if (!scroller) return;

    const step = getCarouselStep();
    if (!step) return;

    const nextIndex = Math.max(
      0,
      Math.min(maxCarouselIndex, Math.round(scroller.scrollLeft / step)),
    );

    scroller.scrollTo({
      left: step * nextIndex,
      behavior: "smooth",
    });

    setCarouselIndex(nextIndex);
  };

  const handleCarouselIndicatorClick = () => {
    const scroller = carouselRef.current;
    if (!scroller || maxCarouselIndex <= 0) return;

    const step = getCarouselStep();
    if (!step) return;

    const nextIndex = carouselIndex >= maxCarouselIndex ? 0 : carouselIndex + 1;

    scroller.scrollTo({
      left: step * nextIndex,
      behavior: "smooth",
    });

    setCarouselIndex(nextIndex);
  };

  const handleOpenCanvas = () => {
    if (!hasCanvas || typeof onOpen !== "function") return;
    onOpen(message);
  };

  return (
    <article
      className={`aci-chat-result-card ${isColorResult ? "aci-chat-color-result-card" : ""}`}
    >
      {rows.length ? (
        <>
          <div
            className="aci-chat-result-rows"
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            onTouchEnd={snapCarouselToNearest}
            onMouseUp={snapCarouselToNearest}
          >
            {rows.map((row, index) => {
              const rowTitle = isColorResult
                ? pickText(
                    row.colorName,
                    row.name,
                    row.desktopName,
                    row.mobileName,
                    row.title,
                    row.label,
                    `Color ${index + 1}`,
                  )
                : pickText(
                    row.variant,
                    row.name,
                    row.title,
                    row.label,
                    row.model,
                    `Option ${index + 1}`,
                  );

              const rowSub = isColorResult
                ? ""
                : pickText(
                    row.subtitle,
                    row.fuelTransmission,
                    [row.fuel, row.transmission].filter(Boolean).join(" · "),
                  );

              const rowPrice = isColorResult
                ? ""
                : pickText(
                    row.price,
                    row.priceRange,
                    row.onRoadPrice,
                    row.exShowroomPrice,
                    row.value,
                  );

              const rowImageFrame = isColorResult
                ? pickAny(
                    row.displayFrameMeta,
                    row.display_frame_meta,
                    row.imageFrame,
                    row.frameMeta,
                    row.frame_meta,
                    row.image_frame,
                    row.carImageFrame,
                    row.car_image_frame,
                    row.frame,
                    row.vehicle?.displayFrameMeta,
                    row.vehicle?.display_frame_meta,
                    row.vehicle?.imageFrame,
                    row.vehicle?.frameMeta,
                    row.vehicle?.frame_meta,
                    row.vehicle?.carImageFrame,
                    row.vehicle?.frame,
                    selectedVehicle?.displayFrameMeta,
                    selectedVehicle?.imageFrame,
                    selectedVehicle?.frameMeta,
                  )
                : pickAny(
                    row.vehicle?.imageFrame,
                    row.vehicle?.frameMeta,
                    row.vehicle?.frame_meta,
                    row.imageFrame,
                    row.frameMeta,
                    row.frame_meta,
                    row.frame,
                    selectedVehicle?.imageFrame,
                    selectedVehicle?.frameMeta,
                    selectedVehicle?.displayFrameMeta,
                  );

              const rowImageUrl = isColorResult
                ? pickText(
                    row.displayNormalizedImageUrl,
                    row.display_normalized_image_url,
                    row.vehicle?.displayNormalizedImageUrl,
                    row.vehicle?.display_normalized_image_url,

                    row.normalizedImageUrl,
                    row.cleanImageUrl,
                    row.normalizedImagePngUrl,
                    row.stagedImageUrl,
                    row.imageUrl,
                    row.carImageUrl,
                    row.sourceImageUrl,

                    row.vehicle?.normalizedImageUrl,
                    row.vehicle?.cleanImageUrl,
                    row.vehicle?.normalizedImagePngUrl,
                    row.vehicle?.stagedImageUrl,
                    row.vehicle?.imageUrl,

                    selectedVehicle?.displayNormalizedImageUrl,
                    selectedVehicle?.normalizedImageUrl,
                    selectedVehicle?.imageUrl,
                  )
                : "";

              const frameStyle = isColorResult
                ? buildInlineColorFrameStyle(rowImageFrame || {})
                : rowImageFrame
                  ? buildChatImageFrameStyle(rowImageFrame, "chatCard")
                  : {};

              const priceContext =
                row.exShowroomPrice &&
                !row.onRoadPrice &&
                !row.price &&
                !row.priceRange &&
                !row.value
                  ? "Ex-showroom"
                  : "On-road";

              return (
                <motion.button
                  type="button"
                  className={`aci-chat-preview-card ${isColorResult ? "is-color-card" : ""}`}
                  key={row.id || row._id || rowTitle || index}
                  aria-label={`View ${rowTitle}`}
                  initial={{ opacity: 0, y: 12, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ y: -3, scale: 1.012 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{
                    duration: 0.38,
                    ease: [0.22, 1, 0.36, 1],
                    delay: Math.min(index * 0.045, 0.12),
                  }}
                  onClick={() => {
                    if (hasCanvas && typeof onOpen === "function") {
                      onOpen({
                        ...message,
                        widget: {
                          ...widget,
                          selectedRow: row,
                          selectedRowIndex: index,
                        },
                      });
                      return;
                    }

                    const nextVehicle = isColorResult
                      ? {
                          ...(selectedVehicle || {}),
                          selectedColor: row,
                          colorName: rowTitle,
                          imageUrl: rowImageUrl,
                          normalizedImageUrl: rowImageUrl,
                          imageFrame: rowImageFrame,
                        }
                      : row.vehicle || selectedVehicle;

                    onAction?.({
                      id: `chat-preview-row-${index}`,
                      label: rowTitle,
                      query: row.query || rowTitle,
                      vehicle: nextVehicle,
                      contextPatch: {
                        selectedVehicle: nextVehicle,
                        selectedColor: isColorResult ? row : undefined,
                        anchorModel: selectedVehicle?.model,
                        anchorCity: selectedVehicle?.city || "Delhi",
                      },
                    });
                  }}
                >
                  <div className="aci-chat-row-visual" style={frameStyle}>
                    <motion.div
                      className="aci-chat-row-car-motion"
                      initial={{ opacity: 0, y: 10, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.52,
                        ease: [0.19, 1, 0.22, 1],
                        delay: Math.min(index * 0.055, 0.16),
                      }}
                    >
                      {isColorResult && rowImageUrl ? (
                        <img
                          className="aci-chat-color-card-image"
                          src={rowImageUrl}
                          alt={rowTitle}
                          loading="lazy"
                          draggable="false"
                        />
                      ) : (
                        <AciVehicleVisual
                          vehicle={row.vehicle || row}
                          height={112}
                          stage
                          stageVariant="compact"
                        />
                      )}
                    </motion.div>
                  </div>

                  <div className="aci-chat-row-copy">
                    <strong>{rowTitle}</strong>
                    {!isColorResult && rowSub ? <span>{rowSub}</span> : null}
                    {!isColorResult && rowPrice ? (
                      <b className="aci-chat-row-price">
                        <span className="aci-chat-price-context">
                          {priceContext}
                        </span>
                        <span className="aci-chat-price-amount">
                          {formatIndianPrice(rowPrice)}
                        </span>
                      </b>
                    ) : null}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {rows.length > 2 ? (
            <button
              type="button"
              className="aci-chat-carousel-indicator"
              style={{ "--aci-carousel-progress": carouselProgress }}
              onClick={handleCarouselIndicatorClick}
              aria-label="Show more car options"
            >
              <span />
              <i />
            </button>
          ) : null}
        </>
      ) : (
        <div className="aci-chat-result-skeleton">
          <i />
          <i />
          <i />
        </div>
      )}

      {hasCanvas || actions.length ? (
        <footer>
          {hasCanvas ? (
            <button
              type="button"
              className="aci-chat-open-canvas-pill"
              onClick={handleOpenCanvas}
            >
              <AciQuestionIcon label={openCanvasLabel} index={0} />
              <span>{openCanvasLabel}</span>
            </button>
          ) : null}

          {actions.map((item, index) => {
            const label =
              item.label || item.title || item.query || `Next ${index + 1}`;

            return (
              <button
                type="button"
                key={item.id || item.label || item.query || index}
                onClick={() => onAction?.(item)}
              >
                <AciQuestionIcon label={label} index={index + 1} />
                <span>{label}</span>
              </button>
            );
          })}
        </footer>
      ) : null}
    </article>
  );
}

function AciV2ChatMessage({
  message = {},
  selectedVehicle,
  onAction,
  onOpenCanvas,
}) {
  const isUser = message.role === "user";
  const hasCanvas = Boolean(
    message.canvasType ||
    message.widget?.canvasType ||
    message.widget?.__rawCanvasType,
  );

  const followups = buildChatSuggestions({
    widget: message.widget || {},
    message,
    limit: 4,
  });

  if (isUser) {
    return (
      <article className="aci-chat-message is-user">
        <div className="aci-chat-bubble">
          {message.text ? <p>{message.text}</p> : null}
        </div>
      </article>
    );
  }

  return (
    <article className="aci-chat-message is-assistant">
      <div className="aci-chat-orb">
        <AciAssistantOrb small />
      </div>

      <div className="aci-chat-assistant-stack">
        {message.text ? (
          <div className="aci-chat-bubble">
            <p>{message.text}</p>
          </div>
        ) : null}

        {hasCanvas ? (
          <AciV2CanvasPreviewCard
            message={message}
            selectedVehicle={selectedVehicle}
            onOpen={onOpenCanvas}
            onAction={onAction}
          />
        ) : null}

        {message.error ? (
          <div className="aci-chat-error-note">
            Live backend not reached. Please try again.
          </div>
        ) : null}

        {followups.length && !hasCanvas ? (
          <div className="aci-chat-followups">
            {followups.map((item, index) => {
              const label =
                item.label ||
                item.title ||
                item.query ||
                `Suggestion ${index + 1}`;

              return (
                <button
                  type="button"
                  key={item.id || item.label || item.query || index}
                  onClick={() => onAction?.(item)}
                >
                  <AciQuestionIcon label={label} index={index} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function AciV2ThinkingMessage() {
  return (
    <article className="aci-chat-message is-assistant">
      <div className="aci-chat-orb">
        <AciAssistantOrb small />
      </div>

      <div className="aci-chat-bubble aci-chat-thinking">
        <span />
        <span />
        <span />
        <p>Checking live ACI data…</p>
      </div>
    </article>
  );
}

function AciV2ContextPill({ selectedVehicle, sessionContext, onAction }) {
  const model =
    selectedVehicle?.displayName ||
    selectedVehicle?.model ||
    sessionContext?.anchorModel ||
    "";

  const city = selectedVehicle?.city || sessionContext?.anchorCity || "Delhi";

  return (
    <section className="aci-chat-context-pill">
      <div>
        <span>{model ? `Working on ${model}` : "Looking for a new car"}</span>
        <em>{city}</em>
      </div>

      <button
        type="button"
        onClick={() =>
          onAction?.({
            id: "change-chat-context",
            label: "Change",
            query: "Change my car search context",
            type: "change_context",
            contextPatch: selectedVehicle ? { selectedVehicle } : {},
          })
        }
      >
        Change
      </button>
    </section>
  );
}

function AciV2ChatFirstShell({
  homeData,
  messages,
  isLoading,
  error,
  selectedVehicle,
  sessionContext,
  onAction,
  onOpenCanvas,
  onGoHome,
}) {
  const hasMessages = Array.isArray(messages) && messages.length > 0;
  const activeVehicle = selectedVehicle || homeData?.selectedVehicle || null;
  const threadRef = useRef(null);
  const threadEndRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  const scrollToLatest = useCallback((behavior = "auto") => {
    const thread = threadRef.current;
    const anchor = threadEndRef.current;
    if (!thread || !anchor) return;

    anchor.scrollIntoView({
      block: "end",
      inline: "nearest",
      behavior,
    });
  }, []);

  const handleThreadScroll = useCallback(() => {
    const thread = threadRef.current;
    if (!thread) return;

    const distanceFromBottom =
      thread.scrollHeight - thread.scrollTop - thread.clientHeight;

    shouldStickToBottomRef.current = distanceFromBottom < 140;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    shouldStickToBottomRef.current = true;
    scrollToLatest("auto");

    const frame = window.requestAnimationFrame(() => {
      scrollToLatest("smooth");
    });

    const timers = [80, 220, 520].map((delay) =>
      window.setTimeout(() => scrollToLatest("auto"), delay),
    );

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [messages.length, scrollToLatest]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const thread = threadRef.current;
    if (!thread) return undefined;

    const keepBottomIfNeeded = () => {
      if (shouldStickToBottomRef.current) {
        scrollToLatest("auto");
      }
    };

    const images = Array.from(thread.querySelectorAll("img"));
    images.forEach((img) => {
      if (!img.complete) {
        img.addEventListener("load", keepBottomIfNeeded, { once: true });
      }
    });

    const observer = new MutationObserver(keepBottomIfNeeded);
    observer.observe(thread, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      images.forEach((img) =>
        img.removeEventListener("load", keepBottomIfNeeded),
      );
    };
  }, [messages.length, isLoading, error, scrollToLatest]);

  return (
    <main className="aci-chat-shell">
      <section className="aci-chat-app-frame">
        <header className="aci-chat-header">
          <button
            type="button"
            className="aci-chat-back"
            onClick={onGoHome}
            aria-label="Back home"
          >
            <span>‹</span>
          </button>

          <AciLogo compact onAction={onAction} />

          <div className="aci-chat-header-actions">
            <button
              type="button"
              className="aci-chat-bell"
              aria-label="Notifications"
            >
              <span />
            </button>

            <button
              type="button"
              className="aci-chat-avatar"
              aria-label="Profile"
            >
              {homeData?.avatarUrl ? (
                <img src={homeData.avatarUrl} alt="Profile" />
              ) : null}
            </button>
          </div>
        </header>

        <AciV2ContextPill
          selectedVehicle={activeVehicle}
          sessionContext={sessionContext}
          onAction={onAction}
        />

        <section
          ref={threadRef}
          className="aci-chat-thread"
          aria-label="ACI Assist conversation"
          onScroll={handleThreadScroll}
        >
          {!hasMessages ? (
            <AciV2ChatMessage
              message={{
                id: "welcome",
                role: "assistant",
                text: "Ask me about price, EMI, colors, features, comparison or quotation. I’ll keep the car and city context while answering.",
              }}
              selectedVehicle={activeVehicle}
              onAction={onAction}
              onOpenCanvas={onOpenCanvas}
            />
          ) : null}

          {messages.map((message, index) => (
            <AciV2ChatMessage
              key={message.id || `${message.role || "assistant"}-${index}`}
              message={message}
              selectedVehicle={activeVehicle}
              onAction={onAction}
              onOpenCanvas={onOpenCanvas}
            />
          ))}

          {isLoading ? <AciV2ThinkingMessage /> : null}

          {error && !isLoading ? (
            <AciV2ChatMessage
              message={{
                id: "backend-error",
                role: "assistant",
                text: error,
                error: true,
              }}
              selectedVehicle={activeVehicle}
              onAction={onAction}
              onOpenCanvas={onOpenCanvas}
            />
          ) : null}

          <div
            ref={threadEndRef}
            className="aci-chat-scroll-anchor"
            aria-hidden="true"
          />
        </section>
      </section>

      <AciComposer
        onAction={onAction}
        selectedVehicle={activeVehicle}
        placeholder="Ask ACI Assist anything…"
        disabled={isLoading}
        showDisclaimer
      />
    </main>
  );
}

function AciV2FullCanvasShell({
  screen,
  data,
  vehicle,
  widget,
  onAction,
  savedIds,
  onToggleSaved,
  onBack,
}) {
  const safeCanvasWidget = safeWidget(widget);
  const canvasType =
    safeCanvasWidget.canvasType || safeCanvasWidget.__rawCanvasType || "";
  const scopedVehicle = useMemo(
    () =>
      mergeVehicle(vehicle, getCanvasScopedVehicle({ data }, safeCanvasWidget)),
    [data, safeCanvasWidget, vehicle],
  );

  const ScreenComponent =
    ACI_V2_SCREEN_COMPONENTS[screen] ||
    ACI_V2_SCREEN_COMPONENTS[SCREEN.CAR_OVERVIEW];

  return (
    <main className="aci-full-canvas-shell">
      <header className="aci-full-canvas-header">
        <button type="button" onClick={onBack}>
          Back to chat
        </button>

        <div>
          <strong>{canvasTypeLabel(canvasType)}</strong>
          <span>
            {getWidgetTitle(safeCanvasWidget, canvasType, scopedVehicle)}
          </span>
        </div>
      </header>

      <ScreenComponent
        data={data}
        vehicle={scopedVehicle}
        widget={safeCanvasWidget}
        onAction={onAction}
        savedIds={savedIds}
        onToggleSaved={onToggleSaved}
      />
    </main>
  );
}

const compactColorForBackend = (color = {}) => {
  if (!isObject(color)) return null;

  const name = firstValue(
    color.colorName,
    color.name,
    color.desktopName,
    color.mobileName,
  );

  if (!name && !color.hex) return null;

  return {
    id: firstValue(color.id, color._id),
    colorName: name,
    name,
    hex: color.hex || "",
  };
};

const compactVehicleForBackend = (vehicle = {}) => {
  const normalized = normalizeVehicle(vehicle);
  if (!normalized) return null;

  const selectedColor = compactColorForBackend(
    normalized.selectedColor || vehicle.selectedColor,
  );

  return {
    id: firstValue(
      normalized.id,
      normalized._id,
      normalized.vehicleId,
      normalized.modelId,
    ),
    make: firstValue(normalized.make, normalized.brand),
    brand: firstValue(normalized.brand, normalized.make),
    model: normalized.model || "",
    displayName: normalized.displayName || "",
    variant: firstValue(normalized.variant, normalized.variantName),
    variantName: firstValue(normalized.variantName, normalized.variant),
    city: firstValue(normalized.city, normalized.cityName),
    citySlug: normalized.citySlug || "",
    colorName: firstValue(normalized.colorName, selectedColor?.colorName),
    selectedColor,
  };
};

const compactContextForBackend = ({
  effectiveContext = {},
  action = {},
  screen = "",
  activeCanvasPayload = null,
  lastAction = null,
} = {}) => {
  const selectedVehicle = compactVehicleForBackend(
    effectiveContext.selectedVehicle,
  );

  const selectedColor = compactColorForBackend(
    effectiveContext.selectedColor ||
      selectedVehicle?.selectedColor ||
      action.selectedColor ||
      action.contextPatch?.selectedColor,
  );

  return {
    selectedVehicle,
    anchorMake: firstValue(
      effectiveContext.anchorMake,
      selectedVehicle?.make,
      selectedVehicle?.brand,
    ),
    anchorModel: firstValue(
      effectiveContext.anchorModel,
      selectedVehicle?.model,
    ),
    anchorVariant: firstValue(
      effectiveContext.anchorVariant,
      selectedVehicle?.variant,
      selectedVehicle?.variantName,
    ),
    anchorCity: firstValue(
      effectiveContext.anchorCity,
      selectedVehicle?.citySlug,
      selectedVehicle?.city,
      "new-delhi",
    ),
    selectedColor,
    activeScreen: screen,
    activeCanvasType: firstValue(
      activeCanvasPayload?.canvasType,
      activeCanvasPayload?.__rawCanvasType,
      effectiveContext.lastCanvasType,
    ),
    lastIntent: firstValue(action.intent, lastAction?.intent),
    lastActionLabel: firstValue(action.label, lastAction?.label),
    lastActionQuery: firstValue(action.query, lastAction?.query),
  };
};

export default function AciAssistV2() {
  const requestSeqRef = useRef(0);
  const requestAbortRef = useRef(null);

  const [screen, setScreen] = useState(SCREEN.HOME);
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [lastAction, setLastAction] = useState(null);
  const [activeCanvasPayload, setActiveCanvasPayload] = useState(null);
  const [isBackendLoading, setIsBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [sessionContext, setSessionContext] = useState({
    selectedVehicle: null,
    anchorMake: "",
    anchorModel: "",
    anchorVariant: "",
    anchorCity: "Delhi",
    selectedColor: null,
    lastCanvasType: "",
  });

  const homeData = useMemo(
    () => ({
      ...ACI_ASSIST_HOME_DATA,
      avatarUrl: ACI_HOME_IMAGES.avatar,
    }),
    [],
  );

  const selectedVehicle = useMemo(
    () => sessionContext.selectedVehicle || null,
    [sessionContext.selectedVehicle],
  );

  useEffect(
    () => () => {
      requestAbortRef.current?.abort();
      requestAbortRef.current = null;
    },
    [],
  );

  const dispatchBrowserEvent = useCallback((action) => {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("aci-assist-click", {
        detail: action,
      }),
    );
  }, []);

  const cancelActiveBackendRequest = useCallback(() => {
    requestSeqRef.current += 1;
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    setIsBackendLoading(false);
  }, []);

  const rememberAction = useCallback(
    (action) => {
      setLastAction(action);

      if (process.env.NODE_ENV === "development") {
        console.log("ACI Assist V2 action:", action);
      }

      dispatchBrowserEvent(action);
    },
    [dispatchBrowserEvent],
  );

  const setSelectedVehicle = useCallback(
    (vehicle, extraContext = {}) => {
      const nextVehicle = mergeVehicle(selectedVehicle, vehicle);
      if (!nextVehicle) return null;

      setSessionContext((previous) =>
        mergeSessionContext(previous, {
          ...extraContext,
          selectedVehicle: nextVehicle,
        }),
      );

      return nextVehicle;
    },
    [selectedVehicle],
  );

  const buildContextForBackend = useCallback(
    (action, targetVehicle) => {
      const effectiveContext = mergeSessionContext(sessionContext, {
        ...(action.contextPatch || {}),
        selectedVehicle:
          targetVehicle ||
          action.vehicle ||
          action.contextPatch?.selectedVehicle ||
          sessionContext.selectedVehicle,
      });

      const compactContext = compactContextForBackend({
        effectiveContext,
        action,
        screen,
        activeCanvasPayload,
        lastAction,
      });

      if (process.env.NODE_ENV === "development") {
        const size = JSON.stringify(compactContext).length;
        console.log("[ACI COMPACT CONTEXT SIZE]", size, compactContext);
      }

      return compactContext;
    },
    [activeCanvasPayload, lastAction, screen, sessionContext],
  );

  const routeBackendResponse = useCallback(
    (action, backend = {}, targetVehicle = null) => {
      const widget = normalizeBackendWidget(backend);
      const canvasType = normalizeV2CanvasType(
        firstValue(
          backend.canvasType,
          backend.canvas_type,
          widget.canvasType,
          widget.canvas_type,
          widget.__rawCanvasType,
          action.canvasType,
          action.canvas_type,
        ),
      );

      const contextPatch = buildContextPatchFromBackend(backend, widget);
      const backendVehicle = mergeVehicle(
        targetVehicle || selectedVehicle,
        contextPatch.selectedVehicle || backend.vehicle || widget.vehicle,
      );

      setSessionContext((previous) =>
        mergeSessionContext(previous, {
          ...contextPatch,
          selectedVehicle:
            backendVehicle ||
            contextPatch.selectedVehicle ||
            previous.selectedVehicle,
          lastCanvasType: canvasType || previous.lastCanvasType,
        }),
      );

      const enrichedAction = {
        ...action,
        answer: firstValue(backend.answer, widget.answer),
        canvasType,
        widget,
        payload: {
          ...(action.payload || {}),
          widget,
          backendRaw: backend.raw,
        },
        vehicle: backendVehicle || targetVehicle || selectedVehicle,
        contextPatch: {
          ...(action.contextPatch || {}),
          ...contextPatch,
          selectedVehicle:
            backendVehicle ||
            contextPatch.selectedVehicle ||
            targetVehicle ||
            selectedVehicle,
        },
      };

      const assistantText =
        firstValue(
          backend.answer,
          widget.answer,
          widget.summary,
          widget.subtitle,
        ) ||
        (canvasType
          ? `I found ${canvasTypeLabel(canvasType)} for you.`
          : "I found a result for you.");

      setHasStartedChat(true);
      setChatMessages((previous) => [
        ...previous,
        {
          id: buildChatMessageId("assistant"),
          role: "assistant",
          text: assistantText,
          answer: assistantText,
          canvasType,
          widget,
          actions: toArray(widget.actions),
          leadingQuestions: toArray(widget.leadingQuestions),
          vehicle: backendVehicle || targetVehicle || selectedVehicle,
        },
      ]);

      if (canvasType) {
        const routedScreen = resolveScreenFromCanvasType(canvasType);
        if (routedScreen && routedScreen !== SCREEN.HOME) {
          setScreen(routedScreen);
          setActiveCanvasPayload(widget);
          setIsCanvasOpen(false);
          rememberAction(enrichedAction);
          return true;
        }
      }

      rememberAction(enrichedAction);
      return false;
    },
    [rememberAction, selectedVehicle],
  );

  const sendActionToBackend = useCallback(
    async (action, targetVehicle = null) => {
      const message = getActionMessage(action, targetVehicle);
      if (!message) {
        rememberAction(action);
        return;
      }

      requestAbortRef.current?.abort();

      const controller = new AbortController();
      requestAbortRef.current = controller;

      const requestId = requestSeqRef.current + 1;
      requestSeqRef.current = requestId;

      setHasStartedChat(true);
      setIsCanvasOpen(false);
      setChatMessages((previous) => [
        ...previous,
        {
          id: buildChatMessageId("user"),
          role: "user",
          text: message,
          action,
        },
      ]);

      setIsBackendLoading(true);
      setBackendError("");

      try {
        const backend = await askAciAssistV2({
          message,
          context: buildContextForBackend(action, targetVehicle),
          signal: controller.signal,
        });

        if (requestSeqRef.current !== requestId) return;

        if (requestAbortRef.current === controller) {
          requestAbortRef.current = null;
        }

        setIsBackendLoading(false);
        routeBackendResponse(action, backend, targetVehicle);
      } catch (error) {
        if (error?.name === "AbortError") {
          if (requestAbortRef.current === controller) {
            requestAbortRef.current = null;
          }
          return;
        }

        if (requestSeqRef.current !== requestId) return;

        if (requestAbortRef.current === controller) {
          requestAbortRef.current = null;
        }

        console.error("ACI Assist V2 backend failed:", error);
        setIsBackendLoading(false);
        const readableError =
          error?.message || "Unable to fetch live ACI data right now.";

        setBackendError(readableError);
        setChatMessages((previous) => [
          ...previous,
          {
            id: buildChatMessageId("error"),
            role: "assistant",
            text: readableError,
            error: true,
          },
        ]);

        rememberAction({
          ...action,
          type: action.type || "backend_error",
          error: error?.message || "Backend request failed",
          contextPatch: {
            ...(action.contextPatch || {}),
            selectedVehicle: targetVehicle || selectedVehicle,
          },
        });
      }
    },
    [
      buildContextForBackend,
      rememberAction,
      routeBackendResponse,
      selectedVehicle,
    ],
  );

  const openBackendWidgetFromAction = useCallback(
    (action, targetVehicle = null) => {
      const explicitWidget =
        action.widget ||
        action.payload?.widget ||
        (action.payload?.__fromBackend ? action.payload : null);

      if (!action.canvasType || !explicitWidget) return false;

      return routeBackendResponse(
        action,
        {
          canvasType: action.canvasType,
          widget: explicitWidget,
          contextPatch: action.contextPatch || {},
          vehicle:
            action.vehicle ||
            action.contextPatch?.selectedVehicle ||
            targetVehicle ||
            selectedVehicle,
        },
        targetVehicle || action.vehicle || selectedVehicle,
      );
    },
    [routeBackendResponse, selectedVehicle],
  );

  const toggleSaved = useCallback(
    (vehicle) => {
      const id = getVehicleId(vehicle);
      if (!id) return;

      setSavedIds((previous) => {
        const next = new Set(previous);
        const saved = next.has(id);

        if (saved) next.delete(id);
        else next.add(id);

        rememberAction(
          normalizeAciAction({
            id: `${saved ? "unsave" : "save"}-${id}`,
            label: saved
              ? `Removed ${getVehicleTitle(vehicle)}`
              : `Saved ${getVehicleTitle(vehicle)}`,
            query: saved
              ? `Remove saved car ${getVehicleTitle(vehicle)}`
              : `Save car ${getVehicleTitle(vehicle)}`,
            type: "toggle_saved",
            vehicle,
            payload: {
              saved: !saved,
            },
          }),
        );

        return next;
      });
    },
    [rememberAction],
  );

  const handleAciAction = useCallback(
    async (rawAction) => {
      const action = normalizeAciAction(rawAction);
      const actionText =
        `${action.label || ""} ${action.query || ""}`.toLowerCase();

      if (action.type === "go_home" || action.label === "Home") {
        cancelActiveBackendRequest();
        setScreen(SCREEN.HOME);
        setActiveCanvasPayload(null);
        setBackendError("");
        setHasStartedChat(false);
        setIsCanvasOpen(false);
        setChatMessages([]);
        rememberAction(action);
        return;
      }

      if (action.type === "back_to_car" || actionText.startsWith("back to")) {
        cancelActiveBackendRequest();

        const nextVehicle = setSelectedVehicle(
          action.vehicle ||
            action.contextPatch?.selectedVehicle ||
            selectedVehicle,
          action.contextPatch || {},
        );

        if (nextVehicle || selectedVehicle) {
          setScreen(SCREEN.CAR_OVERVIEW);
          setActiveCanvasPayload(null);
          setBackendError("");
        }

        rememberAction(action);
        return;
      }

      if (action.type === "toggle_saved") {
        toggleSaved(action.vehicle || action.payload?.vehicle);
        return;
      }

      const targetVehicle =
        action.vehicle ||
        action.contextPatch?.selectedVehicle ||
        selectedVehicle ||
        null;

      if (isCanvasInteractionOnly(action)) {
        setSessionContext((previous) =>
          mergeSessionContext(previous, {
            ...(action.contextPatch || {}),
            selectedVehicle: targetVehicle || previous.selectedVehicle,
            selectedColor:
              action.selectedColor ||
              action.payload?.selectedColor ||
              action.payload?.color ||
              previous.selectedColor,
          }),
        );

        rememberAction({
          ...action,
          contextPatch: {
            selectedVehicle: targetVehicle || selectedVehicle,
            anchorModel: targetVehicle?.model || sessionContext.anchorModel,
            anchorMake:
              targetVehicle?.make ||
              targetVehicle?.brand ||
              sessionContext.anchorMake,
            anchorCity: targetVehicle?.city || sessionContext.anchorCity,
            ...(action.contextPatch || {}),
          },
        });

        return;
      }

      if (openBackendWidgetFromAction(action, targetVehicle)) {
        return;
      }

      if (targetVehicle || action.contextPatch) {
        setSessionContext((previous) =>
          mergeSessionContext(previous, {
            ...(action.contextPatch || {}),
            selectedVehicle: targetVehicle || previous.selectedVehicle,
          }),
        );
      }

      await sendActionToBackend(action, targetVehicle);
    },
    [
      cancelActiveBackendRequest,
      openBackendWidgetFromAction,
      rememberAction,
      selectedVehicle,
      sendActionToBackend,
      sessionContext.anchorCity,
      sessionContext.anchorMake,
      sessionContext.anchorModel,
      setSelectedVehicle,
      toggleSaved,
    ],
  );

  const shellHomeData = homeData;

  const openCanvasFromMessage = useCallback(
    (message = {}) => {
      const widget = safeWidget(message.widget || activeCanvasPayload || {});
      const canvasType =
        message.canvasType ||
        widget.canvasType ||
        widget.__rawCanvasType ||
        sessionContext.lastCanvasType ||
        "";
      const scopedVehicle = getCanvasScopedVehicle(message, widget);
      const scopedWidget = withCanvasVehicleContext(widget, scopedVehicle);
      const normalizedCanvasType = normalizeV2CanvasType(canvasType);

      const routedScreen = resolveScreenFromCanvasType(canvasType);
      if (routedScreen && routedScreen !== SCREEN.HOME) {
        setScreen(routedScreen);
      }

      if (scopedVehicle || normalizedCanvasType) {
        setSessionContext((previous) =>
          mergeSessionContext(previous, {
            selectedVehicle: scopedVehicle || previous.selectedVehicle,
            selectedColor:
              scopedVehicle?.selectedColor ||
              scopedWidget.selectedColor ||
              scopedWidget.contextPatch?.selectedColor ||
              previous.selectedColor,
            lastCanvasType: normalizedCanvasType || previous.lastCanvasType,
          }),
        );
      }

      setActiveCanvasPayload(scopedWidget);
      setIsCanvasOpen(true);
    },
    [activeCanvasPayload, sessionContext.lastCanvasType],
  );

  const goHomeFromChat = useCallback(() => {
    cancelActiveBackendRequest();
    setScreen(SCREEN.HOME);
    setActiveCanvasPayload(null);
    setBackendError("");
    setHasStartedChat(false);
    setIsCanvasOpen(false);
    setChatMessages([]);
  }, [cancelActiveBackendRequest]);

  return (
    <>
      <AciAssistStyles />

      <style>{`/* ACI_CHAT_REFERENCE_SHELL_START */

.heart-button.is-saved,
.mobile-heart.is-saved,
.saved-heart-button.is-saved,
.variant-heart.is-saved,
.soft-badge.save-badge.is-saved {
  color: var(--blue) !important;
}

.saved-heart-button {
  width: 30px;
  height: 30px;
}

.aci-action-toast {
  display: none;
}

/* =========================================================
   ACI ASSIST CHAT SHELL
   Clean replacement: no duplicate overrides, no composer styling
   ========================================================= */

.aci-chat-shell {
  --aci-blue: #0758f8;
  --aci-blue-dark: #034ad9;
  --aci-ink: #071126;
  --aci-text: #111827;
  --aci-muted: #667085;
  --aci-gold: #bd8420;
  --aci-line: rgba(208, 220, 239, 0.78);

  position: relative;
  min-height: 100svh;
  isolation: isolate;
  overflow-x: hidden;
  padding: 18px 18px 120px;
  color: var(--aci-text);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Display",
    "Segoe UI",
    sans-serif;
  background:
    radial-gradient(circle at 5% 16%, rgba(7, 88, 248, 0.07), transparent 32%),
    radial-gradient(circle at 96% 8%, rgba(189, 132, 32, 0.055), transparent 24%),
    radial-gradient(circle at 88% 92%, rgba(7, 88, 248, 0.065), transparent 36%),
    linear-gradient(180deg, #ffffff 0%, #fbfdff 48%, #f6f9ff 100%);
}

.aci-chat-shell::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  opacity: 0.56;
  background:
    linear-gradient(118deg, transparent 0 12%, rgba(7, 88, 248, 0.03) 12.1% 12.28%, transparent 12.44%),
    linear-gradient(123deg, transparent 0 16%, rgba(189, 132, 32, 0.035) 16.1% 16.28%, transparent 16.44%),
    radial-gradient(circle at 1px 1px, rgba(7, 17, 38, 0.024) 1px, transparent 0);
  background-size: auto, auto, 30px 30px;
  mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 82%, transparent 100%);
}

.aci-chat-app-frame {
  width: min(800px, calc(100vw - 44px));
  min-height: calc(100svh - 142px);
  margin: 0 auto;
  padding: 0 0 24px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

/* Header */

.aci-chat-header {
  height: 64px;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px;
  margin: 0 auto 16px;
  border: 1px solid rgba(207, 219, 238, 0.76);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow:
    0 16px 44px -38px rgba(15, 23, 42, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  backdrop-filter: blur(18px) saturate(1.1);
  -webkit-backdrop-filter: blur(18px) saturate(1.1);
}

.aci-chat-header .aci-logo {
  justify-self: center;
  transform: translateY(-1px) scale(0.9);
  transform-origin: center;
}

.aci-chat-back,
.aci-chat-header-actions > button {
  appearance: none;
  width: 44px;
  height: 44px;
  min-width: 44px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(203, 216, 236, 0.86);
  border-radius: 999px;
  background: #fff;
  color: #24324a;
  box-shadow:
    0 12px 30px -26px rgba(15, 23, 42, 0.48),
    inset 0 1px 0 #fff;
  transition:
    transform 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.aci-chat-back span {
  display: block;
  transform: translateY(-1px);
  font-size: 30px;
  line-height: 1;
  font-weight: 420;
}

.aci-chat-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.aci-chat-header-actions > button {
  color: var(--aci-gold);
  font-size: 20px;
  font-weight: 850;
}

.aci-chat-avatar {
  overflow: hidden;
  padding: 2px;
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(135deg, rgba(189, 132, 32, 0.86), rgba(7, 88, 248, 0.22)) border-box !important;
  border-color: transparent !important;
}

.aci-chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

/* Context */

.aci-chat-context-pill {
  min-height: 48px;
  margin: 0 auto 22px;
  padding: 7px 8px 7px 13px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(208, 221, 240, 0.76);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow:
    0 14px 38px -34px rgba(15, 23, 42, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.94);
}

.aci-chat-context-pill > div {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
}

.aci-chat-context-pill > div::before {
  content: "";
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
}

.aci-chat-context-pill span {
  min-width: 0;
  color: #111827;
  font-size: 13.5px;
  line-height: 1.15;
  font-weight: 760;
  letter-spacing: -0.018em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.aci-chat-context-pill em {
  color: #7b8496;
  font-size: 12px;
  line-height: 1;
  font-style: normal;
  font-weight: 680;
}

.aci-chat-context-pill button {
  appearance: none;
  min-height: 32px;
  border: 1px solid rgba(190, 211, 244, 0.74);
  border-radius: 999px;
  padding: 0 13px;
  background: #f4f8ff;
  color: var(--aci-blue);
  font-size: 12px;
  font-weight: 820;
}

/* Messages */

.aci-chat-thread {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.aci-chat-message {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  animation: aciAnswerReveal 360ms cubic-bezier(0.19, 1, 0.22, 1) both;
}

.aci-chat-message.is-user {
  justify-content: flex-end;
}

.aci-chat-message.is-assistant {
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
}

.aci-chat-orb {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  align-self: flex-start;
  position: relative;
  display: grid;
  place-items: center;
  margin-top: 2px;
  margin-bottom: 0;
}

.aci-chat-orb::before {
  content: "";
  position: absolute;
  inset: -5px;
  z-index: -1;
  border-radius: 999px;
  background:
    radial-gradient(circle, rgba(7, 88, 248, 0.12), transparent 62%),
    conic-gradient(
      from 140deg,
      rgba(7, 88, 248, 0),
      rgba(7, 88, 248, 0.14),
      rgba(189, 132, 32, 0.12),
      rgba(7, 88, 248, 0)
    );
}

.aci-chat-assistant-stack {
  flex: 1 1 0;
  min-width: 0;
  max-width: calc(100% - 50px);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.aci-chat-bubble {
  position: relative;
  max-width: min(560px, 100%);
  padding: 12px 15px;
  border-radius: 22px;
  color: var(--aci-text);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(218, 228, 242, 0.94);
  box-shadow:
    0 16px 42px -36px rgba(15, 23, 42, 0.36),
    inset 0 1px 0 rgba(255, 255, 255, 0.98);
}

.aci-chat-message.is-assistant .aci-chat-bubble {
  width: fit-content;
  max-width: 100%;
  margin: 0;
  border-bottom-left-radius: 7px;
  transform-origin: left top;
  animation: aciAssistantBubblePop 360ms cubic-bezier(0.19, 1, 0.22, 1) both;
}

.aci-chat-message.is-assistant .aci-chat-bubble::before {
  content: "";
  position: absolute;
  left: -5px;
  top: 18px;
  width: 12px;
  height: 12px;
  background: rgba(255, 255, 255, 0.96);
  border-left: 1px solid rgba(218, 228, 242, 0.9);
  border-bottom: 1px solid rgba(218, 228, 242, 0.9);
  border-bottom-left-radius: 4px;
  transform: rotate(45deg);
}

.aci-chat-message.is-user .aci-chat-bubble {
  max-width: min(430px, 76%);
  border: 0;
  border-bottom-right-radius: 7px;
  color: #fff;
  background: var(--aci-blue);
  box-shadow:
    0 18px 44px -30px rgba(7, 88, 248, 0.58),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
  transform-origin: right bottom;
  animation: aciUserBubblePop 320ms cubic-bezier(0.19, 1, 0.22, 1) both;
}

.aci-chat-message.is-user .aci-chat-bubble::after {
  content: "";
  position: absolute;
  right: -5px;
  bottom: 14px;
  width: 12px;
  height: 12px;
  background: var(--aci-blue);
  border-bottom-right-radius: 4px;
  transform: rotate(45deg);
}

.aci-chat-bubble > p {
  margin: 0;
  color: inherit;
  font-size: 15px;
  line-height: 1.5;
  letter-spacing: -0.017em;
  font-weight: 500;
}

/* Result cards */

.aci-chat-result-card {
  width: calc(100% + 50px);
  max-width: min(800px, calc(100vw - 44px));
  margin-left: -50px;
  margin-right: 0;
  margin-top: 0;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.aci-chat-result-card::before,
.aci-chat-result-card::after,
.aci-chat-result-card header,
.aci-chat-result-card h3,
.aci-chat-result-card p,
.aci-chat-result-card header > button,
.aci-chat-result-card header span {
  display: none !important;
  content: none !important;
}

.aci-chat-result-rows {
  width: 100%;
  max-width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 0;
  margin: 0;
  overflow: visible;
}

.aci-chat-result-rows > button {
  appearance: none;
  min-width: 0;
  min-height: 250px;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  padding: 0;
  border: 1px solid rgba(203, 216, 234, 0.92);
  border-radius: 28px;
  text-align: left;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 78% 18%, rgba(37, 99, 235, 0.18), transparent 34%),
    radial-gradient(ellipse at 60% 62%, rgba(15, 23, 42, 0.075), transparent 47%),
    linear-gradient(145deg, #ffffff 0%, #f7fbff 46%, #edf5ff 100%);
  box-shadow:
    0 28px 70px -50px rgba(15, 23, 42, 0.48),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  opacity: 0;
  transform-origin: center bottom;
  animation: aciPremiumCardIn 560ms cubic-bezier(0.19, 1, 0.22, 1) both;
  transition:
    transform 180ms cubic-bezier(0.19, 1, 0.22, 1),
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.aci-chat-result-rows > button::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0) 38%),
    radial-gradient(ellipse at 50% 78%, rgba(37, 99, 235, 0.1), transparent 44%);
}

.aci-chat-result-rows > button:hover {
  border-color: rgba(37, 99, 235, 0.28);
  box-shadow:
    0 34px 78px -48px rgba(37, 99, 235, 0.36),
    0 18px 44px -42px rgba(15, 23, 42, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  transform: translateY(-2px);
}

.aci-chat-result-rows > button:nth-child(1) {
  animation-delay: 90ms;
}

.aci-chat-result-rows > button:nth-child(2) {
  animation-delay: 165ms;
}

.aci-chat-result-rows > button:nth-child(3) {
  animation-delay: 240ms;
}

.aci-chat-row-visual {
  position: relative;
  z-index: 1;
  height: 150px;
  margin: 0;
  padding: 10px 6px 0;
  border: 0;
  border-radius: 0;
  overflow: visible;
  display: grid;
  place-items: center;
  background: transparent;
}

.aci-chat-row-visual::after {
  content: "";
  position: absolute;
  left: 18%;
  right: 18%;
  bottom: 15px;
  height: 13px;
  border-radius: 999px;
  background: radial-gradient(ellipse, rgba(15, 23, 42, 0.24), transparent 72%);
  filter: blur(9px);
  pointer-events: none;
}

.aci-chat-row-visual .aci-car-image-stage {
  min-height: 0;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  overflow: visible !important;
  transform: translateY(10px);
}

.aci-chat-row-visual .aci-car-stage-glow,
.aci-chat-row-visual .aci-car-stage-ground {
  display: none !important;
}

.aci-chat-row-visual img,
.aci-chat-row-visual svg {
  position: relative;
  z-index: 2;
  width: 118%;
  max-width: none;
  height: 106%;
  max-height: none;
  object-fit: contain;
  object-position: center bottom;
  mix-blend-mode: multiply;
  transform:
    translate(var(--chat-car-frame-x, 0%), var(--chat-car-frame-y, 0%))
    scale(var(--chat-car-frame-scale, 1));
  transform-origin: var(--chat-car-frame-origin, center center);
  filter: drop-shadow(0 24px 18px rgba(15, 23, 42, 0.2));
  animation: aciVehicleSettle 680ms cubic-bezier(0.19, 1, 0.22, 1) both;
}

.aci-chat-row-copy {
  position: relative;
  z-index: 1;
  min-height: 96px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 4px 16px 16px;
}

.aci-chat-result-rows strong,
.aci-chat-result-rows span,
.aci-chat-result-rows b {
  position: relative;
  z-index: 1;
  display: block;
}

.aci-chat-result-rows strong {
  width: 100%;
  max-width: 100%;
  min-height: 0;
  padding: 0;
  color: #07102b;
  font-size: 16px;
  line-height: 1.05;
  font-weight: 880;
  letter-spacing: -0.035em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aci-chat-result-rows span {
  margin-top: 7px;
  color: #64748b;
  font-size: 11.7px;
  line-height: 1.28;
  font-weight: 720;
  letter-spacing: -0.012em;
}

.aci-chat-result-rows b {
  margin-top: 9px;
  padding-top: 0;
  border-top: 0;
  color: var(--aci-blue);
  font-size: 18px;
  line-height: 1;
  letter-spacing: -0.04em;
  font-weight: 900;
}

.aci-chat-result-rows b::before {
  content: none !important;
}

/* Functional carousel indicator */

.aci-chat-carousel-indicator {
  display: none;
}

/* Follow-up chips */

.aci-chat-result-card footer,
.aci-chat-followups {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 14px 0 0;
  margin: 0;
  overflow: visible;
}

.aci-chat-result-card footer button,
.aci-chat-followups button {
  appearance: none;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 999px;
  border: 1.3px solid rgba(7, 88, 248, 0.56);
  background: rgba(255, 255, 255, 0.94);
  color: #111827;
  padding: 0 15px 0 11px;
  font-size: 13px;
  line-height: 1;
  font-weight: 520;
  letter-spacing: -0.018em;
  white-space: nowrap;
  box-shadow:
    0 16px 34px -30px rgba(7, 88, 248, 0.36),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  opacity: 0;
  animation: aciChipReveal 420ms cubic-bezier(0.19, 1, 0.22, 1) both;
}

.aci-chat-result-card footer button > span:not(.aci-chat-chip-icon),
.aci-chat-followups button > span:not(.aci-chat-chip-icon) {
  font-weight: 520;
}

.aci-chat-chip-icon {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  color: var(--aci-blue);
  background: #f2f7ff;
  border: 1px solid rgba(161, 190, 244, 0.56);
}

.aci-chat-chip-icon svg {
  width: 15px;
  height: 15px;
  stroke: currentColor;
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Loading / error */

.aci-chat-thinking {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.aci-chat-thinking span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #9aa4b2;
  animation: aciTyping 1s ease-in-out infinite;
}

.aci-chat-thinking span:nth-child(2) {
  animation-delay: 0.14s;
}

.aci-chat-thinking span:nth-child(3) {
  animation-delay: 0.28s;
}

.aci-chat-thinking p {
  margin-left: 6px !important;
  color: #667085 !important;
  font-size: 12.5px !important;
  font-weight: 560 !important;
}

.aci-chat-error-note {
  margin-top: 10px;
  border-radius: 13px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #a44a08;
  padding: 9px 11px;
  font-size: 12px;
  line-height: 1.3;
  font-weight: 690;
}

.aci-chat-result-skeleton {
  position: relative;
  z-index: 1;
  padding: 0;
  display: grid;
  gap: 9px;
}

.aci-chat-result-skeleton i {
  height: 32px;
  border-radius: 999px;
  background: linear-gradient(90deg, #edf4ff, #ffffff, #e8f1ff);
  background-size: 220% 100%;
  animation: aciSkeleton 1.25s ease-in-out infinite;
}

/* Full canvas */

.aci-full-canvas-shell {
  min-height: 100dvh;
  background:
    radial-gradient(circle at 0% 0%, rgba(7, 88, 248, 0.06), transparent 28%),
    linear-gradient(180deg, #fff 0%, #f8fbff 100%);
}

.aci-full-canvas-header {
  position: sticky;
  top: 0;
  z-index: 250;
  min-height: 62px;
  padding: 10px 18px;
  border-bottom: 1px solid rgba(222, 231, 244, 0.9);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  display: flex;
  align-items: center;
  gap: 13px;
}

.aci-full-canvas-header button {
  height: 36px;
  border-radius: 999px;
  border: 1px solid #dbe3ef;
  background: #fff;
  color: var(--aci-blue);
  padding: 0 13px;
  font-size: 12px;
  font-weight: 780;
}

.aci-full-canvas-header div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.aci-full-canvas-header strong {
  color: var(--aci-blue);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.aci-full-canvas-header span {
  color: #0f172a;
  font-size: 14px;
  font-weight: 820;
}

/* Hover */

@media (hover: hover) {
  .aci-chat-back:hover,
  .aci-chat-header-actions > button:hover,
  .aci-chat-context-pill button:hover,
  .aci-chat-result-rows > button:hover,
  .aci-chat-result-card footer button:hover,
  .aci-chat-followups button:hover {
    transform: translateY(-1px);
  }

  .aci-chat-result-rows > button:hover {
    transform: translateY(-3px) scale(1.012);
    border-color: rgba(7, 88, 248, 0.26);
    box-shadow:
      0 26px 58px -38px rgba(7, 88, 248, 0.28),
      inset 0 1px 0 #fff;
  }

  .aci-chat-result-card footer button:hover,
  .aci-chat-followups button:hover {
    transform: translateY(-2px);
    border-color: rgba(7, 88, 248, 0.78);
    box-shadow:
      0 20px 42px -30px rgba(7, 88, 248, 0.44),
      inset 0 1px 0 rgba(255, 255, 255, 1);
  }
}

/* Mobile */

@media (max-width: 760px) {
  .aci-chat-shell {
    padding: 0 0 116px;
    overflow-x: hidden;
    background:
      radial-gradient(circle at -8% 18%, rgba(7, 88, 248, 0.064), transparent 34%),
      radial-gradient(circle at 110% 94%, rgba(7, 88, 248, 0.05), transparent 36%),
      linear-gradient(180deg, #ffffff 0%, #ffffff 46%, #f8fbff 100%);
  }

  .aci-chat-shell::before {
    opacity: 0.48;
    background-size: auto, auto, 28px 28px;
  }

  .aci-chat-app-frame {
    width: min(430px, calc(100vw - 28px));
    max-width: calc(100vw - 28px);
    min-height: calc(100svh - 116px);
    margin: 0 auto;
    padding: 0 0 22px;
  }

  .aci-chat-header {
    height: 78px;
    margin: 0 calc((100vw - min(430px, calc(100vw - 28px))) / -2) 18px;
    padding: 12px max(14px, calc((100vw - min(430px, calc(100vw - 28px))) / 2));
    grid-template-columns: 44px 1fr auto;
    border: 0;
    border-radius: 0;
    background: rgba(255, 255, 255, 0.94);
    box-shadow:
      0 1px 0 rgba(222, 230, 242, 0.72),
      0 14px 36px -34px rgba(15, 23, 42, 0.32);
  }

  .aci-chat-header .aci-logo {
    transform: translateY(-1px) scale(0.86);
  }

  .aci-chat-back,
  .aci-chat-header-actions > button {
    width: 42px;
    height: 42px;
    min-width: 42px;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .aci-chat-avatar {
    border: 1px solid rgba(189, 132, 32, 0.7) !important;
    background: #fff !important;
    box-shadow: 0 10px 26px -22px rgba(15, 23, 42, 0.48);
  }

  .aci-chat-context-pill {
    min-height: 44px;
    margin: 0 0 18px;
    padding: 7px 8px 7px 12px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.76);
  }

  .aci-chat-context-pill span {
    font-size: 13px;
  }

  .aci-chat-context-pill em {
    display: none;
  }

  .aci-chat-context-pill button {
    min-height: 30px;
    padding: 0 11px;
    font-size: 11.5px;
  }

  .aci-chat-message.is-assistant {
    gap: 9px;
  }

  .aci-chat-orb {
    width: 38px;
    height: 38px;
    flex-basis: 38px;
    margin-top: 2px;
  }

  .aci-chat-assistant-stack {
    max-width: calc(100% - 47px);
  }

  .aci-chat-bubble {
    max-width: 100%;
    padding: 12px 14px;
    border-radius: 21px;
    border-bottom-left-radius: 7px;
  }

  .aci-chat-message.is-user .aci-chat-bubble {
    max-width: min(330px, 82vw);
    padding: 13px 15px;
    border-radius: 22px;
    border-bottom-right-radius: 7px;
  }

  .aci-chat-bubble > p {
    font-size: 14.75px;
    line-height: 1.5;
    letter-spacing: -0.016em;
    font-weight: 500;
  }

  .aci-chat-result-card {
    width: calc(100% + 47px);
    max-width: calc(100vw - 28px);
    margin-left: -47px;
    overflow: hidden;
  }

  .aci-chat-result-rows {
    width: 100%;
    max-width: 100%;
    display: flex;
    grid-template-columns: none;
    gap: 11px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    padding: 0 0 4px;
    margin: 0;
    box-sizing: border-box;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .aci-chat-result-rows::-webkit-scrollbar {
    display: none;
  }

  .aci-chat-result-rows > button {
    flex: 0 0 min(330px, calc((100% - 58px) / 2));
    max-width: min(330px, calc((100% - 58px) / 2));
    min-height: 220px;
    scroll-snap-align: start;
    padding: 0;
    border-radius: 24px;
    box-sizing: border-box;
  }

  .aci-chat-result-rows > button:active {
    transform: scale(0.985);
  }

  .aci-chat-row-visual {
    height: clamp(118px, 30vw, 132px);
    padding: 6px 4px 0;
  }

  .aci-chat-row-copy {
    min-height: 88px;
    padding: 1px 12px 13px;
  }

  .aci-chat-result-rows strong {
    min-height: 0;
    padding: 0;
    font-size: 13.3px;
    letter-spacing: -0.03em;
  }

  .aci-chat-result-rows span {
    margin-top: 5px;
    font-size: 10.5px;
    line-height: 1.24;
  }

  .aci-chat-result-rows b {
    margin-top: 7px;
    padding-top: 0;
    font-size: 14.7px;
    font-weight: 900;
  }

  .aci-chat-carousel-indicator {
    appearance: none;
    border: 0;
    width: 54px;
    height: 12px;
    margin: 11px auto 0;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    background: transparent;
    cursor: pointer;
  }

  .aci-chat-carousel-indicator span {
    width: 6px;
    height: 6px;
    flex: 0 0 6px;
    border-radius: 999px;
    background: var(--aci-blue);
    box-shadow: 0 6px 16px -8px rgba(7, 88, 248, 0.9);
  }

  .aci-chat-carousel-indicator i {
    position: relative;
    width: 31px;
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(7, 88, 248, 0.18);
  }

  .aci-chat-carousel-indicator i::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(7, 88, 248, 0.72);
    transform-origin: left center;
    transform: scaleX(var(--aci-carousel-progress, 0.5));
    transition: transform 220ms cubic-bezier(0.19, 1, 0.22, 1);
  }

  .aci-chat-result-card footer,
  .aci-chat-followups {
    flex-wrap: wrap;
    overflow: visible;
    gap: 9px;
    padding-top: 14px;
  }

  .aci-chat-result-card footer button,
  .aci-chat-followups button {
    min-height: 39px;
    padding: 0 13px 0 10px;
    font-size: 12.5px;
    font-weight: 520;
  }

  .aci-chat-chip-icon {
    width: 23px;
    height: 23px;
    flex-basis: 23px;
  }
}

@media (max-width: 390px) {
  .aci-chat-result-rows {
    gap: 9px;
  }

  .aci-chat-result-rows > button {
    flex-basis: calc((100% - 38px) / 2);
    max-width: calc((100% - 38px) / 2);
    padding: 0;
  }

  .aci-chat-row-visual {
    height: 112px;
  }
}

/* Animations */

@keyframes aciAnswerReveal {
  from {
    opacity: 0;
    transform: translateY(8px);
    filter: blur(3px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes aciUserBubblePop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.965);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes aciAssistantBubblePop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.975);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes aciPremiumCardIn {
  0% {
    opacity: 0;
    transform: translateY(16px) scale(0.955);
    filter: blur(6px);
  }

  68% {
    opacity: 1;
    transform: translateY(-2px) scale(1.008);
    filter: blur(0);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes aciVehicleSettle {
  from {
    opacity: 0;
    filter:
      blur(3px)
      drop-shadow(0 10px 8px rgba(15, 23, 42, 0.1));
  }

  to {
    opacity: 1;
    filter:
      blur(0)
      drop-shadow(0 16px 14px rgba(15, 23, 42, 0.16));
  }
}

@keyframes aciChipReveal {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes aciTyping {
  0%,
  100% {
    opacity: 0.32;
    transform: translateY(1px);
  }

  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

@keyframes aciSkeleton {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -120% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aci-chat-message,
  .aci-chat-message.is-user .aci-chat-bubble,
  .aci-chat-message.is-assistant .aci-chat-bubble,
  .aci-chat-result-rows > button,
  .aci-chat-row-visual img,
  .aci-chat-row-visual svg,
  .aci-chat-followups button,
  .aci-chat-result-card footer button,
  .aci-chat-thinking span,
  .aci-chat-result-skeleton i {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    animation: none !important;
  }

  .aci-chat-back,
  .aci-chat-header-actions > button,
  .aci-chat-context-pill button,
  .aci-chat-result-rows > button,
  .aci-chat-result-card footer button,
  .aci-chat-followups button {
    transition: none !important;
  }
}

.aci-chat-open-canvas-pill {
  border-color: rgba(7, 88, 248, 0.82) !important;
  box-shadow:
    0 18px 38px -28px rgba(7, 88, 248, 0.46),
    inset 0 1px 0 rgba(255, 255, 255, 1) !important;
}

.aci-chat-open-canvas-pill .aci-chat-chip-icon {
  background: #0758f8 !important;
  color: #fff !important;
  border-color: rgba(7, 88, 248, 0.28) !important;
}
/* ACI_CHAT_REFERENCE_SHELL_END */


/* ACI_CHAT_SCROLL_AND_WIDGET_FINAL_START */

/* Chat should behave like ChatGPT: fixed shell, only the thread scrolls. */
.aci-chat-shell {
  height: 100dvh !important;
  min-height: 100dvh !important;
  max-height: 100dvh !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 10px 12px 0 !important;
}

.aci-chat-app-frame {
  width: min(430px, calc(100vw - 24px)) !important;
  height: 100% !important;
  min-height: 0 !important;
  flex: 1 1 auto !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  padding-bottom: 0 !important;
}

.aci-chat-header,
.aci-chat-context-pill {
  flex: 0 0 auto !important;
}

.aci-chat-thread {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  overscroll-behavior: contain !important;
  scroll-behavior: smooth !important;
  padding: 0 0 calc(132px + env(safe-area-inset-bottom)) !important;
  scroll-padding-bottom: calc(132px + env(safe-area-inset-bottom)) !important;
  scrollbar-width: none !important;
}

.aci-chat-thread::-webkit-scrollbar {
  display: none !important;
}

.aci-chat-scroll-anchor {
  width: 100% !important;
  height: calc(132px + env(safe-area-inset-bottom)) !important;
  min-height: calc(132px + env(safe-area-inset-bottom)) !important;
  flex: 0 0 calc(132px + env(safe-area-inset-bottom)) !important;
  pointer-events: none !important;
}

.aci-chat-orb {
  width: 42px !important;
  height: 42px !important;
  min-width: 42px !important;
  flex: 0 0 42px !important;
  border: 0 !important;
  outline: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  display: grid !important;
  place-items: center !important;
  overflow: visible !important;
}

.aci-chat-orb::before,
.aci-chat-orb::after {
  display: none !important;
}

.aci-chat-orb .orb.small,
.aci-chat-orb .orb.small .orb-shell {
  width: 42px !important;
  height: 42px !important;
}

/* Full-width assistant result cards without left clipping. */
.aci-chat-result-card {
  overflow: visible !important;
}

@media (max-width: 760px) {
  .aci-chat-message.is-assistant:has(.aci-chat-result-card) {
    width: 100% !important;
  }

  .aci-chat-message.is-assistant:has(.aci-chat-result-card) .aci-chat-assistant-stack {
    flex: 1 1 auto !important;
    max-width: calc(100% - 50px) !important;
    min-width: 0 !important;
  }

  .aci-chat-result-card {
    width: calc(100vw - 28px) !important;
    max-width: 402px !important;
    margin-left: -50px !important;
    margin-right: 0 !important;
    padding-left: 4px !important;
    padding-right: 4px !important;
  }

  .aci-chat-result-rows {
    width: 100% !important;
    max-width: 100% !important;
    padding-left: 4px !important;
    padding-right: 8px !important;
    scroll-padding-left: 4px !important;
  }
}

@media (min-width: 761px) {
  .aci-chat-shell {
    padding: 18px 18px 0 !important;
  }

  .aci-chat-app-frame {
    width: min(800px, calc(100vw - 44px)) !important;
  }
}

/* Price/variant cards: keep the good size, but stop left/right image cropping. */
.aci-chat-preview-card:not(.is-color-card) .aci-chat-row-visual {
  overflow: hidden !important;
  padding-inline: 4px !important;
}

.aci-chat-preview-card:not(.is-color-card) .aci-chat-row-visual img,
.aci-chat-preview-card:not(.is-color-card) .aci-chat-row-visual svg {
  width: 106% !important;
  max-width: 106% !important;
  height: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
  object-position: center center !important;
  mix-blend-mode: normal !important;
  filter: none !important;
  transform-origin: var(--chat-car-frame-origin, center center) !important;
  transform:
    translate(var(--chat-car-frame-x, 0%), var(--chat-car-frame-y, 0%))
    scale(var(--chat-car-frame-scale, 1.28)) !important;
}




/* ACI_CHAT_SAFE_RESTORE_COMPACT_START
   Safe restore notes:
   - Keep the older stable renderer: price cards use AciVehicleVisual, colors use direct color images.
   - Do not use absolute text overlays for pricelist cards.
   - Hide swipe indicator on laptop/desktop where three cards are visible.
   - Keep mobile indicator centered only.
*/

@media (min-width: 761px) {
  .aci-chat-carousel-indicator {
    display: none !important;
  }
}

@media (max-width: 760px) {
  .aci-chat-carousel-indicator {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 54px !important;
    height: 12px !important;
    margin: 11px auto 0 !important;
    padding: 0 !important;
    align-self: center !important;
    position: relative !important;
    left: auto !important;
    right: auto !important;
    transform: none !important;
    border: 0 !important;
    background: transparent !important;
  }
}

.aci-chat-preview-card:not(.is-color-card) {
  display: flex !important;
  flex-direction: column !important;
  justify-content: stretch !important;
  overflow: hidden !important;
}

.aci-chat-preview-card:not(.is-color-card) .aci-chat-row-visual {
  flex: 1 1 auto !important;
  height: auto !important;
  min-height: 154px !important;
  margin: 0 !important;
  padding: 8px 6px 0 !important;
  display: grid !important;
  place-items: center !important;
  overflow: hidden !important;
}

.aci-chat-preview-card:not(.is-color-card) .aci-chat-row-copy {
  flex: 0 0 auto !important;
  min-height: 70px !important;
  padding: 4px 14px 12px !important;
  display: grid !important;
  align-content: end !important;
  gap: 3px !important;
  background: transparent !important;
  box-shadow: none !important;
}

.aci-chat-preview-card:not(.is-color-card) .aci-chat-row-copy strong {
  display: block !important;
  min-height: 0 !important;
  max-width: 100% !important;
  color: #07112e !important;
  font-size: 14px !important;
  line-height: 1.05 !important;
  font-weight: 850 !important;
  letter-spacing: -0.032em !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.aci-chat-preview-card:not(.is-color-card) .aci-chat-row-copy > span {
  display: block !important;
  margin: 0 !important;
  color: #64748b !important;
  font-size: 10.7px !important;
  line-height: 1.18 !important;
  font-weight: 720 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.aci-chat-preview-card:not(.is-color-card) .aci-chat-row-price {
  display: flex !important;
  align-items: baseline !important;
  justify-content: flex-start !important;
  gap: 5px !important;
  margin: 2px 0 0 !important;
  padding: 0 !important;
  border: 0 !important;
  color: var(--aci-blue) !important;
  font-size: 12px !important;
  line-height: 1 !important;
  letter-spacing: -0.015em !important;
  font-weight: 800 !important;
  white-space: nowrap !important;
}

.aci-chat-preview-card:not(.is-color-card) .aci-chat-price-context {
  display: inline !important;
  margin: 0 !important;
  color: #64748b !important;
  font-size: 10.6px !important;
  line-height: 1 !important;
  font-weight: 760 !important;
}

.aci-chat-preview-card:not(.is-color-card) .aci-chat-price-amount {
  display: inline !important;
  margin: 0 !important;
  color: var(--aci-blue) !important;
  font-size: 12px !important;
  line-height: 1 !important;
  font-weight: 900 !important;
}

@media (max-width: 760px) {
  .aci-chat-preview-card:not(.is-color-card) {
    min-height: 214px !important;
  }

  .aci-chat-preview-card:not(.is-color-card) .aci-chat-row-visual {
    min-height: 134px !important;
    padding: 6px 4px 0 !important;
  }

  .aci-chat-preview-card:not(.is-color-card) .aci-chat-row-copy {
    min-height: 72px !important;
    padding: 3px 11px 11px !important;
    gap: 3px !important;
  }

  .aci-chat-preview-card:not(.is-color-card) .aci-chat-row-copy strong {
    font-size: 12.6px !important;
    line-height: 1.05 !important;
  }

  .aci-chat-preview-card:not(.is-color-card) .aci-chat-row-copy > span {
    font-size: 10px !important;
  }

  .aci-chat-preview-card:not(.is-color-card) .aci-chat-row-price,
  .aci-chat-preview-card:not(.is-color-card) .aci-chat-price-amount {
    font-size: 11.3px !important;
  }

  .aci-chat-preview-card:not(.is-color-card) .aci-chat-price-context {
    font-size: 9.9px !important;
  }
}

@media (max-width: 390px) {
  .aci-chat-preview-card:not(.is-color-card) .aci-chat-row-visual {
    min-height: 126px !important;
  }

  .aci-chat-preview-card:not(.is-color-card) .aci-chat-row-copy {
    min-height: 70px !important;
  }
}

/* ACI_CHAT_SAFE_RESTORE_COMPACT_END */

/* ACI_CHAT_SCROLL_AND_WIDGET_FINAL_END */

/* ACI_PRICE_CARD_PADDING_TEXT_ALIGN_FIX_START */

/*
  Pricelist / variant cards only.
  Adds internal left-right breathing space for the car image
  and forces all text below the car to stay left-aligned.
*/
.aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-preview-card {
  text-align: left !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  overflow: hidden !important;
}

/* Add safe inner padding so car does not touch card borders */
.aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-row-visual {
  padding-left: 18px !important;
  padding-right: 18px !important;
  padding-top: 12px !important;
  padding-bottom: 4px !important;

  overflow: hidden !important;
  display: grid !important;
  place-items: center !important;
}

/* Ensure the car visual respects the padded area */
.aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-row-car-motion {
  width: 100% !important;
  height: 100% !important;

  display: grid !important;
  place-items: center !important;

  overflow: visible !important;
}

/* Text block below image: left aligned */
.aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-row-copy {
  width: 100% !important;

  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;

  text-align: left !important;

  padding-left: 16px !important;
  padding-right: 16px !important;
  padding-bottom: 13px !important;

  margin: 0 !important;
}

/* Variant title */
.aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-row-copy strong {
  width: 100% !important;

  display: block !important;

  text-align: left !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;

  margin: 0 0 2px !important;
}

/* Fuel / transmission */
.aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-row-copy > span {
  width: 100% !important;

  display: block !important;

  text-align: left !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;

  margin: 0 0 0px !important;
}

/* On-road + price row: both left aligned, same line */
.aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-row-price {
  width: 100% !important;

  display: flex !important;
  align-items: baseline !important;
  justify-content: flex-start !important;
  gap: 5px !important;

  text-align: left !important;

  margin: 0 !important;
}

.aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-price-context,
.aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-price-amount {
  display: inline-flex !important;
  text-align: left !important;
  white-space: nowrap !important;
}

/* Laptop / desktop: slightly more generous padding */
@media (min-width: 901px) {
  .aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-row-visual {
    padding-left: 10px !important;
    padding-right: 10px !important;
    padding-top: 14px !important;
  }

  .aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-row-copy {
    padding-left: 10px !important;
    padding-right: 10px !important;
  }
}

/* Mobile: keep padding enough but not wasteful */
@media (max-width: 900px) {
  .aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-row-visual {
    padding-left: 6px !important;
    padding-right: 6px !important;
    padding-top: 11px !important;
  }

  .aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-row-copy {
    padding-left: 4px !important;
    padding-right: 4px !important;
    padding-bottom: 12px !important;
  }
}

/* ACI_PRICE_CARD_PADDING_TEXT_ALIGN_FIX_END */
/* ACI_COLOR_CARD_RESPONSIVE_REBUILD_START */

/*
  Final responsive rebuild:
  - Laptop color cards stay exactly like the good version.
  - Mobile price + color cards show exactly 2 cards.
  - Third card appears only on horizontal swipe.
  - Mobile color cards use the same merged background/overlay approach as laptop.
*/

/* -----------------------------
   LAPTOP COLOR CARDS ONLY
   ----------------------------- */
@media (min-width: 761px) {
  .aci-chat-color-result-card {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    overflow: visible !important;
  }

  .aci-chat-color-result-card .aci-chat-result-rows {
    width: 100% !important;
    max-width: 100% !important;

    display: flex !important;
    flex-wrap: nowrap !important;
    align-items: stretch !important;
    justify-content: center !important;

    gap: 12px !important;

    overflow-x: hidden !important;
    overflow-y: visible !important;

    padding: 0 !important;
    margin: 0 !important;

    scroll-snap-type: none !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card {
    flex: 0 0 calc((100% - 24px) / 3) !important;
    width: calc((100% - 24px) / 3) !important;
    min-width: calc((100% - 24px) / 3) !important;
    max-width: calc((100% - 24px) / 3) !important;

    height: 226px !important;
    min-height: 226px !important;

    position: relative !important;
    display: block !important;

    overflow: hidden !important;

    border-radius: 24px !important;
    border: 1px solid rgba(191, 212, 239, .95) !important;

    background:
      radial-gradient(circle at 50% 38%, rgba(255,255,255,.98), transparent 42%),
      linear-gradient(180deg, #ffffff 0%, #fbfdff 58%, #eef6ff 100%) !important;

    box-shadow:
      0 22px 54px -42px rgba(15, 23, 42, .34),
      inset 0 1px 0 rgba(255,255,255,1) !important;

    text-align: left !important;
    scroll-snap-align: none !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card::before,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card::after,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-visual::before,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-visual::after,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-car-motion::before,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-car-motion::after {
    content: none !important;
    display: none !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-visual {
    position: absolute !important;

    inset: 0 !important;

    width: auto !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;

    display: grid !important;
    place-items: center !important;

    padding: 4px 2px 30px !important;
    margin: 0 !important;

    overflow: hidden !important;

    background: transparent !important;
    box-shadow: none !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-car-motion {
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;

    display: grid !important;
    place-items: center !important;

    padding: 0 !important;
    margin: 0 !important;

    overflow: visible !important;

    background: transparent !important;
    box-shadow: none !important;
  }

  .aci-chat-color-result-card .aci-chat-color-card-image {
    display: block !important;

    width: 112% !important;
    height: 112% !important;

    max-width: none !important;
    max-height: none !important;

    object-fit: contain !important;
    object-position: center center !important;

    opacity: 1 !important;
    filter: none !important;
    mix-blend-mode: normal !important;
    image-rendering: auto !important;

    transform-origin: var(--chat-car-frame-origin, center center) !important;

    transform:
      translate(var(--chat-car-frame-x, 0%), var(--chat-car-frame-y, 0%))
      scale(calc(var(--chat-car-frame-scale, 1) * 1.28)) !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-copy {
    position: absolute !important;

    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;

    height: 34px !important;
    min-height: 34px !important;

    z-index: 4 !important;

    display: flex !important;
    align-items: flex-end !important;
    justify-content: flex-start !important;

    padding: 0 14px 9px !important;
    margin: 0 !important;

    background:
      linear-gradient(
        180deg,
        rgba(238, 246, 255, 0) 0%,
        rgba(238, 246, 255, .72) 34%,
        rgba(238, 246, 255, .98) 100%
      ) !important;

    box-shadow: none !important;

    text-align: left !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-copy strong {
    width: 100% !important;

    display: block !important;

    color: #07112e !important;

    font-size: 12.2px !important;
    line-height: 1.12 !important;
    font-weight: 640 !important;
    letter-spacing: -.01em !important;

    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;

    text-align: left !important;

    margin: 0 !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-copy > span,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-price,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-price-context,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-price-amount {
    display: none !important;
  }

  .aci-chat-color-result-card .aci-chat-carousel-indicator {
    display: none !important;
  }
}

/* -----------------------------
   MOBILE: PRICE + COLOR CARDS
   ----------------------------- */
@media (max-width: 760px) {
  /*
    This is the key fix:
    exactly two cards fit inside the row.
    The third card will exist, but it will be clipped until swipe.
  */
  .aci-chat-result-card .aci-chat-result-rows {
    width: 100% !important;
    max-width: 100% !important;

    display: flex !important;
    flex-wrap: nowrap !important;
    align-items: stretch !important;
    justify-content: flex-start !important;

    gap: 12px !important;

    overflow-x: auto !important;
    overflow-y: hidden !important;

    scroll-snap-type: x mandatory !important;
    scroll-behavior: smooth !important;
    scrollbar-width: none !important;
    -webkit-overflow-scrolling: touch !important;

    padding-left: 0 !important;
    padding-right: 0 !important;
    margin: 0 !important;

    scroll-padding-left: 0 !important;
  }

  .aci-chat-result-card .aci-chat-result-rows::-webkit-scrollbar {
    display: none !important;
  }

  .aci-chat-result-card .aci-chat-preview-card {
    flex: 0 0 calc((100% - 12px) / 2) !important;
    width: calc((100% - 12px) / 2) !important;
    min-width: calc((100% - 12px) / 2) !important;
    max-width: calc((100% - 12px) / 2) !important;

    scroll-snap-align: start !important;
    scroll-snap-stop: always !important;
  }

  /*
    Mobile color cards:
    same premium single-background approach as laptop,
    but shorter and tuned for two cards.
  */
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card {
    height: 202px !important;
    min-height: 202px !important;

    position: relative !important;
    display: block !important;

    overflow: hidden !important;

    border-radius: 22px !important;
    border: 1px solid rgba(191, 212, 239, .95) !important;

    background:
      radial-gradient(circle at 50% 36%, rgba(255,255,255,.98), transparent 42%),
      linear-gradient(180deg, #ffffff 0%, #fbfdff 58%, #eef6ff 100%) !important;

    box-shadow:
      0 18px 44px -36px rgba(15, 23, 42, .32),
      inset 0 1px 0 rgba(255,255,255,1) !important;

    text-align: left !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card::before,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card::after,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-visual::before,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-visual::after,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-car-motion::before,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-car-motion::after {
    content: none !important;
    display: none !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-visual {
    position: absolute !important;

    inset: 0 !important;

    width: auto !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;

    display: grid !important;
    place-items: center !important;

    padding: 4px 4px 32px !important;
    margin: 0 !important;

    overflow: hidden !important;

    background: transparent !important;
    box-shadow: none !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-car-motion {
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;

    display: grid !important;
    place-items: center !important;

    padding: 0 !important;
    margin: 0 !important;

    overflow: visible !important;

    background: transparent !important;
    box-shadow: none !important;
  }

  .aci-chat-color-result-card .aci-chat-color-card-image {
    display: block !important;

    width: 114% !important;
    height: 114% !important;

    max-width: none !important;
    max-height: none !important;

    object-fit: contain !important;
    object-position: center center !important;

    opacity: 1 !important;
    filter: none !important;
    mix-blend-mode: normal !important;
    image-rendering: auto !important;

    transform-origin: var(--chat-car-frame-origin, center center) !important;

    transform:
      translate(var(--chat-car-frame-x, 0%), var(--chat-car-frame-y, 0%))
      scale(calc(var(--chat-car-frame-scale, 1) * 1.3)) !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-copy {
    position: absolute !important;

    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;

    height: 36px !important;
    min-height: 36px !important;

    z-index: 4 !important;

    display: flex !important;
    align-items: flex-end !important;
    justify-content: flex-start !important;

    padding: 0 11px 9px !important;
    margin: 0 !important;

    background:
      linear-gradient(
        180deg,
        rgba(238, 246, 255, 0) 0%,
        rgba(238, 246, 255, .74) 34%,
        rgba(238, 246, 255, .98) 100%
      ) !important;

    box-shadow: none !important;

    text-align: left !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-copy strong {
    width: 100% !important;

    display: block !important;

    color: #07112e !important;

    font-size: 11.9px !important;
    line-height: 1.1 !important;
    font-weight: 650 !important;
    letter-spacing: -.01em !important;

    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;

    text-align: left !important;

    margin: 0 !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-copy > span,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-price,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-price-context,
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-price-amount {
    display: none !important;
  }

  /*
    Price mobile cards:
    only width behavior is changed here.
    Existing price styling remains intact.
  */
  .aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-preview-card:not(.is-color-card) {
    flex: 0 0 calc((100% - 12px) / 2) !important;
    width: calc((100% - 12px) / 2) !important;
    min-width: calc((100% - 12px) / 2) !important;
    max-width: calc((100% - 12px) / 2) !important;
  }

  /*
    Indicator: same for price and color, centered.
  */
  .aci-chat-carousel-indicator {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;

    width: 54px !important;
    height: 12px !important;

    margin: 11px auto 0 !important;
    padding: 0 !important;

    align-self: center !important;

    position: relative !important;
    left: auto !important;
    right: auto !important;
    transform: none !important;

    border: 0 !important;
    background: transparent !important;
  }
}

/* Smaller mobile */
@media (max-width: 390px) {
  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card {
    height: 194px !important;
    min-height: 194px !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-color-card-image {
    width: 112% !important;
    height: 112% !important;

    transform:
      translate(var(--chat-car-frame-x, 0%), var(--chat-car-frame-y, 0%))
      scale(calc(var(--chat-car-frame-scale, 1) * 1.18)) !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-copy {
    height: 34px !important;
    min-height: 34px !important;
    padding: 0 10px 8px !important;
  }

  .aci-chat-color-result-card .aci-chat-preview-card.is-color-card .aci-chat-row-copy strong {
    font-size: 11.5px !important;
  }
}

/* ACI_COLOR_CARD_RESPONSIVE_REBUILD_END */

/* ACI_PRICE_CARD_STAGE_FLATTEN_FIX_START */

/*
  Price cards only.
  Removes the inner AciVehicleVisual stage/shell background that looks like a skeleton box.
  Does not touch color cards.
*/
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-chat-row-visual,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-chat-row-car-motion,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-car-image-stage,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-car-stage-shell,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-car-stage-inner,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-vehicle-visual,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .vehicle-visual-stage {
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  border: 0 !important;
}

/* Remove any inner glow/ground/floor pseudo layers from AciVehicleVisual */
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-chat-row-visual::before,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-chat-row-visual::after,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-car-image-stage::before,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-car-image-stage::after,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-car-stage-shell::before,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-car-stage-shell::after,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-car-stage-glow,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-car-stage-ground {
  content: none !important;
  display: none !important;
}

/* Keep the actual car image clean */
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-chat-row-visual img,
.aci-chat-result-card:not(.aci-chat-color-result-card)
  .aci-chat-preview-card:not(.is-color-card)
  .aci-chat-row-visual svg {
  background: transparent !important;
}

/* ACI_PRICE_CARD_STAGE_FLATTEN_FIX_END */
`}</style>

      {!hasStartedChat ? (
        <AciAssistHomeScreen
          data={shellHomeData}
          onAction={handleAciAction}
          savedIds={savedIds}
          onToggleSaved={toggleSaved}
        />
      ) : isCanvasOpen ? (
        <AciV2FullCanvasShell
          screen={screen}
          data={shellHomeData}
          vehicle={selectedVehicle}
          widget={activeCanvasPayload}
          onAction={handleAciAction}
          savedIds={savedIds}
          onToggleSaved={toggleSaved}
          onBack={() => setIsCanvasOpen(false)}
        />
      ) : (
        <AciV2ChatFirstShell
          homeData={shellHomeData}
          messages={chatMessages}
          isLoading={isBackendLoading}
          error={backendError}
          selectedVehicle={selectedVehicle}
          sessionContext={sessionContext}
          onAction={handleAciAction}
          onOpenCanvas={openCanvasFromMessage}
          onGoHome={goHomeFromChat}
        />
      )}

      {lastAction ? (
        <div className="aci-action-toast">
          <strong>{lastAction.label}</strong>
          {lastAction.query || lastAction.intent || "Action captured"}
        </div>
      ) : null}
    </>
  );
}
