import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const getVehicleId = (vehicle = {}) =>
  firstValue(vehicle?.id, vehicle?._id, vehicle?.vehicleId, vehicle?.modelId);

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
  const baseModel = String(normalizedBase.model || "").toLowerCase();
  const incomingModel = String(normalizedIncoming.model || "").toLowerCase();

  const isSameVehicle =
    (baseId && incomingId && String(baseId) === String(incomingId)) ||
    (baseModel && incomingModel && baseModel === incomingModel);

  return {
    ...(isSameVehicle ? normalizedBase : {}),
    ...normalizedIncoming,
    id: firstValue(
      normalizedIncoming.id,
      normalizedIncoming._id,
      normalizedBase.id,
    ),
    make: firstValue(
      normalizedIncoming.make,
      normalizedIncoming.brand,
      normalizedBase.make,
    ),
    brand: firstValue(
      normalizedIncoming.brand,
      normalizedIncoming.make,
      normalizedBase.brand,
    ),
    model: firstValue(normalizedIncoming.model, normalizedBase.model),
    displayName: firstValue(
      normalizedIncoming.displayName,
      normalizedIncoming.name,
      normalizedBase.displayName,
      normalizedBase.name,
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
  const selectedVehicle = mergeVehicle(
    previous.selectedVehicle,
    patch.selectedVehicle || patch.vehicle || patch.activeVehicle,
  );

  return {
    ...previous,
    ...patch,
    selectedVehicle: selectedVehicle || previous.selectedVehicle || null,
    anchorMake: firstValue(
      patch.anchorMake,
      selectedVehicle?.make,
      selectedVehicle?.brand,
      previous.anchorMake,
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
      previous.anchorVariant,
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

const isCanvasInteractionOnly = (action = {}) =>
  Boolean(
    action.payload?.color ||
    action.payload?.selectedColor ||
    action.selectedColor ||
    action.type === "color_selected" ||
    action.type === "select_color_mood" ||
    action.type === "save_color" ||
    action.type === "save_color_insight" ||
    action.type === "tab_change" ||
    action.type === "accordion_toggle" ||
    action.type === "sort_change",
  );

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

const safeWidget = (widget) => (isObject(widget) ? widget : {});

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

  return toArray(
    item.rows || item.variants || item.items || item.colors,
  ).slice(0, 3);
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

function AciV2CanvasPreviewCard({
  message = {},
  selectedVehicle,
  onAction,
  onOpen,
}) {
  const widget = message.widget || {};
  const rows = getWidgetRows(widget);

  const canvasType =
    message.canvasType || widget.canvasType || widget.__rawCanvasType || "";

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

  const maxCarouselIndex = Math.max(0, rows.length - 2);
  const carouselProgress =
    maxCarouselIndex > 0 ? (carouselIndex + 1) / (maxCarouselIndex + 1) : 1;

  const getCarouselStep = () => {
    const scroller = carouselRef.current;
    if (!scroller) return 0;

    const firstCard = scroller.querySelector("button");
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
    <article className="aci-chat-result-card">
      {rows.length ? (
        <>
          <div
            className="aci-chat-result-rows"
            ref={carouselRef}
            onScroll={handleCarouselScroll}
          >
            {rows.map((row, index) => {
              const rowTitle =
                row.variant ||
                row.name ||
                row.title ||
                row.label ||
                row.model ||
                `Option ${index + 1}`;

              const rowSub =
                row.subtitle ||
                row.fuelTransmission ||
                [row.fuel, row.transmission].filter(Boolean).join(" · ");

              const rowPrice =
                row.price ||
                row.priceRange ||
                row.onRoadPrice ||
                row.exShowroomPrice ||
                row.value ||
                "";

              return (
                <button
                  type="button"
                  key={row.id || row._id || rowTitle || index}
                  aria-label={`View ${rowTitle}`}
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

                    onAction?.({
                      id: `chat-preview-row-${index}`,
                      label: rowTitle,
                      query: row.query || rowTitle,
                      vehicle: row.vehicle || selectedVehicle,
                      contextPatch: {
                        selectedVehicle: row.vehicle || selectedVehicle,
                        anchorModel: selectedVehicle?.model,
                        anchorCity: selectedVehicle?.city || "Delhi",
                      },
                    });
                  }}
                >
                  <div className="aci-chat-row-visual">
                    <AciVehicleVisual
                      vehicle={row.vehicle || row}
                      height={104}
                      stage
                      stageVariant="compact"
                    />
                  </div>

                  <div>
                    <strong>{rowTitle}</strong>
                    {rowSub ? <span>{rowSub}</span> : null}
                    {rowPrice ? <b>{formatIndianPrice(rowPrice)}</b> : null}
                  </div>
                </button>
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
          className="aci-chat-thread"
          aria-label="ACI Assist conversation"
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
    safeCanvasWidget.canvasType ||
    safeCanvasWidget.__rawCanvasType ||
    "";

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
          <span>{getWidgetTitle(safeCanvasWidget, canvasType, vehicle)}</span>
        </div>
      </header>

      <ScreenComponent
        data={data}
        vehicle={vehicle}
        widget={safeCanvasWidget}
        onAction={onAction}
        savedIds={savedIds}
        onToggleSaved={onToggleSaved}
      />
    </main>
  );
}

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

      return {
        ...effectiveContext,
        activeScreen: screen,
        activeCanvasType:
          activeCanvasPayload?.canvasType ||
          activeCanvasPayload?.__rawCanvasType ||
          sessionContext.lastCanvasType ||
          "",
        activeCanvasPayload:
          sanitizeWidgetForBackendContext(activeCanvasPayload),
        lastAction: sanitizeActionForBackendContext(lastAction),
      };
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
      const widget = message.widget || activeCanvasPayload || {};
      const canvasType =
        message.canvasType ||
        widget.canvasType ||
        widget.__rawCanvasType ||
        sessionContext.lastCanvasType ||
        "";

      const routedScreen = resolveScreenFromCanvasType(canvasType);
      if (routedScreen && routedScreen !== SCREEN.HOME) {
        setScreen(routedScreen);
      }

      setActiveCanvasPayload(widget);
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
  gap: 16px;
  padding: 0;
  margin: 0;
  overflow: visible;
}

.aci-chat-result-rows > button {
  appearance: none;
  min-width: 0;
  position: relative;
  overflow: hidden;
  padding: 14px;
  border: 1px solid rgba(216, 226, 240, 0.96);
  border-radius: 28px;
  text-align: left;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 50% -16%, rgba(7, 88, 248, 0.055), transparent 42%),
    rgba(255, 255, 255, 0.97);
  box-shadow:
    0 24px 58px -44px rgba(15, 23, 42, 0.44),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  opacity: 0;
  transform-origin: center bottom;
  animation: aciPremiumCardIn 560ms cubic-bezier(0.19, 1, 0.22, 1) both;
  transition:
    transform 180ms cubic-bezier(0.19, 1, 0.22, 1),
    border-color 180ms ease,
    box-shadow 180ms ease;
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
  height: 142px;
  margin-bottom: 13px;
  border: 0;
  border-radius: 24px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background:
    radial-gradient(ellipse at 50% 80%, rgba(15, 23, 42, 0.12), transparent 45%),
    linear-gradient(145deg, #ffffff 0%, #f5f8fd 56%, #edf3fb 100%);
}

.aci-chat-row-visual::after {
  content: "";
  position: absolute;
  left: 18%;
  right: 18%;
  bottom: 12px;
  height: 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.13);
  filter: blur(8px);
}

.aci-chat-row-visual img,
.aci-chat-row-visual svg {
  position: relative;
  z-index: 1;
  max-width: 132%;
  max-height: 104%;
  object-fit: contain;
  animation: aciVehicleSettle 680ms cubic-bezier(0.19, 1, 0.22, 1) both;
}

.aci-chat-result-rows strong,
.aci-chat-result-rows span,
.aci-chat-result-rows b {
  position: relative;
  z-index: 1;
  display: block;
}

.aci-chat-result-rows strong {
  width: fit-content;
  max-width: 100%;
  min-height: 23px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(7, 88, 248, 0.075);
  color: var(--aci-blue);
  border: 1px solid rgba(148, 183, 244, 0.36);
  font-size: 10.8px;
  line-height: 1;
  font-weight: 820;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aci-chat-result-rows span {
  margin-top: 8px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.28;
  font-weight: 540;
  letter-spacing: -0.012em;
}

.aci-chat-result-rows b {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(225, 233, 244, 0.92);
  color: #111827;
  font-size: 13px;
  line-height: 1.1;
  letter-spacing: -0.018em;
  font-weight: 620;
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
    flex: 0 0 calc((100% - 11px) / 2);
    max-width: calc((100% - 11px) / 2);
    scroll-snap-align: start;
    padding: 10px;
    border-radius: 23px;
    box-sizing: border-box;
  }

  .aci-chat-result-rows > button:active {
    transform: scale(0.985);
  }

  .aci-chat-row-visual {
    height: clamp(106px, 28vw, 122px);
    border-radius: 19px;
    margin-bottom: 10px;
  }

  .aci-chat-result-rows strong {
    min-height: 22px;
    padding: 0 8px;
    font-size: 10.2px;
    letter-spacing: 0.026em;
  }

  .aci-chat-result-rows span {
    margin-top: 7px;
    font-size: 11px;
    line-height: 1.24;
  }

  .aci-chat-result-rows b {
    margin-top: 9px;
    padding-top: 9px;
    font-size: 12px;
    font-weight: 620;
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
    flex-basis: calc((100% - 9px) / 2);
    max-width: calc((100% - 9px) / 2);
    padding: 9px;
  }

  .aci-chat-row-visual {
    height: 98px;
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
    transform: translateY(9px) scale(0.92);
    filter:
      blur(3px)
      drop-shadow(0 10px 8px rgba(15, 23, 42, 0.1));
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
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

/* ACI_CHAT_REFERENCE_SHELL_END */`}</style>

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
