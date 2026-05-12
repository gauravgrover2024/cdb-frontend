import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACI_ASSIST_HOME_DATA,
  ACI_HOME_IMAGES,
} from "./data/homeScreenData";
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
    id: firstValue(normalizedIncoming.id, normalizedIncoming._id, normalizedBase.id),
    make: firstValue(normalizedIncoming.make, normalizedIncoming.brand, normalizedBase.make),
    brand: firstValue(normalizedIncoming.brand, normalizedIncoming.make, normalizedBase.brand),
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
      acc[key] = value.slice(0, MAX_CONTEXT_ITEMS).map(sanitizeRecordForBackendContext);
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
    if (widget[key] !== undefined && widget[key] !== null && widget[key] !== "") {
      clean[key] = trimContextText(widget[key]);
    }
  });

  allowedArrayKeys.forEach((key) => {
    const list = toArray(widget[key]);
    if (list.length) {
      clean[key] = list.slice(0, MAX_CONTEXT_ITEMS).map(sanitizeRecordForBackendContext);
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

const getWidgetTitle = (widget = {}, canvasType = "", vehicle = null) =>
  firstValue(
    widget.title,
    widget.heading,
    widget.model,
    widget.displayName,
    vehicle?.displayName,
    canvasTypeLabel(canvasType),
  );

const getWidgetSubtitle = (widget = {}, vehicle = null) =>
  firstValue(
    widget.subtitle,
    widget.summary,
    widget.answer,
    widget.city ? `Live ${widget.city} data` : "",
    vehicle?.city ? `Using ${vehicle.city} as city context` : "",
  );

const getWidgetRows = (widget = {}) =>
  toArray(widget.rows || widget.variants || widget.items || widget.colors).slice(0, 3);

const getWidgetCountText = (widget = {}) => {
  const rows = toArray(widget.rows);
  const variants = toArray(widget.variants);
  const colors = toArray(widget.colors);
  const items = toArray(widget.items);

  if (rows.length) return `${rows.length} results`;
  if (variants.length) return `${variants.length} variants`;
  if (colors.length) return `${colors.length} colors`;
  if (items.length) return `${items.length} items`;
  return "Live result";
};

function AciV2CanvasPreviewCard({ message = {}, selectedVehicle, onOpen, onAction }) {
  const widget = message.widget || {};
  const canvasType = message.canvasType || widget.canvasType || widget.__rawCanvasType || "";
  const title = getWidgetTitle(widget, canvasType, selectedVehicle);
  const subtitle = getWidgetSubtitle(widget, selectedVehicle);
  const rows = getWidgetRows(widget);
  const actions = toArray(widget.leadingQuestions || widget.actions || message.actions).slice(0, 4);

  return (
    <article className="aci-chat-result-card">
      <header>
        <div>
          <span>{canvasTypeLabel(canvasType)}</span>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        <button type="button" onClick={() => onOpen?.(message)}>
          Open details
        </button>
      </header>

      {rows.length ? (
        <div className="aci-chat-result-rows">
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
                onClick={() =>
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
                  })
                }
              >
                <div className="aci-chat-row-visual">
                  <AciVehicleVisual
                    vehicle={row.vehicle || row}
                    height={64}
                    stage
                    stageVariant="compact"
                  />
                </div>

                <div>
                  <strong>{rowTitle}</strong>
                  {rowSub ? <span>{rowSub}</span> : null}
                  {rowPrice ? <b>{rowPrice}</b> : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="aci-chat-result-skeleton">
          <i />
          <i />
          <i />
        </div>
      )}

      {actions.length ? (
        <footer>
          {actions.map((item, index) => (
            <button
              type="button"
              key={item.id || item.label || item.query || index}
              onClick={() => onAction?.(item)}
            >
              {item.label || item.title || item.query || `Next ${index + 1}`}
            </button>
          ))}
        </footer>
      ) : null}
    </article>
  );
}

function AciV2ChatMessage({ message = {}, selectedVehicle, onAction, onOpenCanvas }) {
  const isUser = message.role === "user";
  const hasCanvas = Boolean(message.canvasType || message.widget?.canvasType || message.widget?.__rawCanvasType);
  const followups = toArray(message.leadingQuestions || message.actions).slice(0, 5);

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
          <div className="aci-chat-error-note">Live backend not reached. Please try again.</div>
        ) : null}

        {followups.length && !hasCanvas ? (
          <div className="aci-chat-followups">
            {followups.map((item, index) => (
              <button
                type="button"
                key={item.id || item.label || item.query || index}
                onClick={() => onAction?.(item)}
              >
                {item.label || item.title || item.query || `Suggestion ${index + 1}`}
              </button>
            ))}
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
          <button type="button" className="aci-chat-back" onClick={onGoHome} aria-label="Back home">
            <span>‹</span>
          </button>

          <AciLogo compact onAction={onAction} />

          <div className="aci-chat-header-actions">
            <button type="button" className="aci-chat-bell" aria-label="Notifications">
              <span />
            </button>

            <button type="button" className="aci-chat-avatar" aria-label="Profile">
              {homeData?.avatarUrl ? <img src={homeData.avatarUrl} alt="Profile" /> : null}
            </button>
          </div>
        </header>

        <AciV2ContextPill
          selectedVehicle={activeVehicle}
          sessionContext={sessionContext}
          onAction={onAction}
        />

        <section className="aci-chat-thread" aria-label="ACI Assist conversation">
          {!hasMessages ? (
            <AciV2ChatMessage
              message={{
                id: "welcome",
                role: "assistant",
                text:
                  "Ask me about price, EMI, colors, features, comparison or quotation. I’ll keep the car and city context while answering.",
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
          <strong>{canvasTypeLabel(widget?.canvasType || widget?.__rawCanvasType || "")}</strong>
          <span>{getWidgetTitle(widget, widget?.canvasType, vehicle)}</span>
        </div>
      </header>

      <ScreenComponent
        data={data}
        vehicle={vehicle}
        widget={widget}
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
        activeCanvasPayload: sanitizeWidgetForBackendContext(activeCanvasPayload),
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
        firstValue(backend.answer, widget.answer, widget.summary, widget.subtitle) ||
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
    [buildContextForBackend, rememberAction, routeBackendResponse, selectedVehicle],
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
      const actionText = `${action.label || ""} ${action.query || ""}`.toLowerCase();

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
          action.vehicle || action.contextPatch?.selectedVehicle || selectedVehicle,
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

      <style>{`
        /* ACI_CHAT_REFERENCE_SHELL_START */

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

        .aci-chat-shell {
          min-height: 100dvh;
          padding: 18px 18px calc(118px + env(safe-area-inset-bottom));
          color: var(--ink);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background:
            radial-gradient(circle at 0% 28%, rgba(37,99,235,.055), transparent 25%),
            radial-gradient(circle at 100% 100%, rgba(37,99,235,.06), transparent 28%),
            linear-gradient(180deg, #fff 0%, #fbfdff 58%, #f7fbff 100%);
        }

        .aci-chat-app-frame {
          width: min(1080px, 100%);
          min-height: calc(100dvh - 138px);
          margin: 0 auto;
          border: 1px solid rgba(219, 227, 239, 0.9);
          border-radius: 34px;
          background:
            radial-gradient(circle at 8% 36%, rgba(37,99,235,.045), transparent 24%),
            rgba(255,255,255,.88);
          box-shadow:
            0 32px 90px -78px rgba(15,23,42,.50),
            inset 0 1px 0 rgba(255,255,255,.96);
          padding: 20px 22px 34px;
          backdrop-filter: blur(18px);
        }

        .aci-chat-header {
          min-height: 62px;
          display: grid;
          grid-template-columns: 50px 1fr auto;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }

        .aci-chat-header .aci-logo {
          justify-self: center;
        }

        .aci-chat-back {
          width: 44px;
          height: 44px;
          border: 1px solid #dbe3ef;
          border-radius: 999px;
          background: rgba(255,255,255,.94);
          color: #334155;
          display: grid;
          place-items: center;
          box-shadow: 0 15px 35px -30px rgba(15,23,42,.40);
        }

        .aci-chat-back span {
          display: block;
          transform: translateY(-1px);
          font-size: 34px;
          line-height: 1;
          font-weight: 300;
        }

        .aci-chat-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .aci-chat-bell,
        .aci-chat-avatar {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 1px solid #dbe3ef;
          background: rgba(255,255,255,.94);
          display: grid;
          place-items: center;
          box-shadow: 0 15px 35px -30px rgba(15,23,42,.40);
          overflow: hidden;
        }

        .aci-chat-bell span {
          width: 18px;
          height: 20px;
          border: 2px solid #526079;
          border-top-left-radius: 9px;
          border-top-right-radius: 9px;
          border-bottom: 0;
          position: relative;
        }

        .aci-chat-bell span::before {
          content: "";
          position: absolute;
          right: -8px;
          top: -8px;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--blue);
        }

        .aci-chat-bell span::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -7px;
          width: 8px;
          height: 4px;
          border-radius: 0 0 999px 999px;
          background: #526079;
          transform: translateX(-50%);
        }

        .aci-chat-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .aci-chat-context-pill {
          width: min(760px, 100%);
          min-height: 56px;
          margin: 0 auto 28px;
          border: 1px solid #dbe3ef;
          border-radius: 22px;
          background: rgba(255,255,255,.96);
          box-shadow:
            0 18px 48px -42px rgba(15,23,42,.38),
            inset 0 1px 0 #fff;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 0 18px;
        }

        .aci-chat-context-pill div {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .aci-chat-context-pill div::before {
          content: "";
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 2px solid var(--blue);
          box-shadow: inset 0 0 0 4px #fff;
          background: #dbeafe;
          flex: 0 0 auto;
        }

        .aci-chat-context-pill span {
          min-width: 0;
          color: #0f172a;
          font-size: 16px;
          line-height: 1.2;
          font-weight: 720;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .aci-chat-context-pill em {
          color: #64748b;
          font-size: 12px;
          font-style: normal;
          font-weight: 760;
          white-space: nowrap;
        }

        .aci-chat-context-pill button {
          border: 0;
          background: transparent;
          color: var(--blue);
          font-size: 14px;
          font-weight: 840;
        }

        .aci-chat-thread {
          width: min(760px, 100%);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .aci-chat-message {
          display: grid;
          grid-template-columns: 52px minmax(0, 1fr);
          align-items: end;
          column-gap: 13px;
        }

        .aci-chat-message.is-user {
          display: flex;
          justify-content: flex-end;
        }

        .aci-chat-orb {
          width: 50px;
          height: 50px;
          display: grid;
          place-items: center;
          align-self: start;
          margin-top: 4px;
        }

        .aci-chat-assistant-stack {
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }

        .aci-chat-bubble {
          position: relative;
          max-width: min(620px, 100%);
          border: 1px solid #dbe3ef;
          border-radius: 25px;
          border-bottom-left-radius: 9px;
          background: rgba(255,255,255,.98);
          box-shadow:
            0 18px 52px -44px rgba(15,23,42,.45),
            inset 0 1px 0 #fff;
          padding: 18px 20px 17px;
        }

        .aci-chat-message.is-assistant .aci-chat-bubble::before {
          content: "";
          position: absolute;
          left: -8px;
          bottom: 11px;
          width: 16px;
          height: 16px;
          background: rgba(255,255,255,.98);
          border-left: 1px solid #dbe3ef;
          border-bottom: 1px solid #dbe3ef;
          transform: rotate(45deg);
        }

        .aci-chat-message.is-user .aci-chat-bubble {
          max-width: min(540px, 82%);
          border: 0;
          border-radius: 27px;
          border-bottom-right-radius: 9px;
          background: linear-gradient(135deg, #0b63ff, #004bdc);
          color: #fff;
          box-shadow: 0 20px 44px -25px rgba(37,99,235,.60);
        }

        .aci-chat-message.is-user .aci-chat-bubble::after {
          content: "";
          position: absolute;
          right: -7px;
          bottom: 10px;
          width: 16px;
          height: 16px;
          background: #004bdc;
          transform: rotate(45deg);
        }

        .aci-chat-bubble > p {
          margin: 0;
          color: inherit;
          font-size: 18px;
          line-height: 1.46;
          letter-spacing: -.018em;
          font-weight: 520;
        }

        .aci-chat-message.is-assistant .aci-chat-bubble > p {
          color: #10172f;
        }

        .aci-chat-message.is-user .aci-chat-bubble > p {
          color: #fff;
        }

        .aci-chat-bubble time {
          display: block;
          margin-top: 9px;
          color: #8a99af;
          font-size: 11px;
          line-height: 1;
          text-align: right;
          font-weight: 600;
        }

        .aci-chat-message.is-user .aci-chat-bubble time {
          color: rgba(255,255,255,.72);
        }

        .aci-chat-result-card {
          width: min(720px, 100%);
          border-radius: 25px;
          border: 1px solid #dfe7f2;
          background:
            radial-gradient(circle at 84% 0%, rgba(37,99,235,.08), transparent 30%),
            linear-gradient(135deg, #fff 0%, #f8fbff 100%);
          box-shadow:
            0 22px 58px -47px rgba(15,23,42,.42),
            inset 0 1px 0 #fff;
          padding: 16px;
          overflow: hidden;
        }

        .aci-chat-result-card header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .aci-chat-result-card header span {
          color: var(--blue);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .aci-chat-result-card h3 {
          margin: 5px 0 0;
          color: #07102b;
          font-size: 20px;
          line-height: 1.05;
          letter-spacing: -.04em;
          font-weight: 860;
        }

        .aci-chat-result-card p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 560;
        }

        .aci-chat-result-card header > button {
          flex: 0 0 auto;
          height: 34px;
          border: 0;
          border-radius: 999px;
          padding: 0 13px;
          background: linear-gradient(135deg, var(--blue), var(--blue-dark));
          color: #fff;
          font-size: 12px;
          font-weight: 820;
          box-shadow: 0 14px 30px -20px rgba(37,99,235,.58);
        }

        .aci-chat-result-rows {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .aci-chat-result-rows > button {
          min-width: 0;
          border: 1px solid #e2e8f0;
          border-radius: 19px;
          background: rgba(255,255,255,.94);
          padding: 9px;
          text-align: left;
          box-shadow: 0 16px 38px -34px rgba(15,23,42,.30);
        }

        .aci-chat-row-visual {
          height: 78px;
          border-radius: 15px;
          background: linear-gradient(135deg, #fff 0%, #eef4fb 100%);
          overflow: hidden;
          display: grid;
          place-items: center;
          margin-bottom: 9px;
        }

        .aci-chat-result-rows strong,
        .aci-chat-result-rows span,
        .aci-chat-result-rows b {
          display: block;
        }

        .aci-chat-result-rows strong {
          color: #0f172a;
          font-size: 13px;
          line-height: 1.12;
          font-weight: 780;
        }

        .aci-chat-result-rows span {
          margin-top: 4px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.25;
          font-weight: 560;
        }

        .aci-chat-result-rows b {
          margin-top: 8px;
          color: #0f172a;
          font-size: 12px;
          line-height: 1;
          font-weight: 760;
        }

        .aci-chat-result-skeleton {
          margin-top: 14px;
          display: grid;
          gap: 9px;
        }

        .aci-chat-result-skeleton i {
          height: 32px;
          border-radius: 999px;
          background: linear-gradient(90deg, #eef4ff, #fff, #eaf2ff);
          background-size: 220% 100%;
          animation: aciChatSkeleton 1.35s ease-in-out infinite;
        }

        @keyframes aciChatSkeleton {
          from { background-position: 120% 0; }
          to { background-position: -120% 0; }
        }

        .aci-chat-result-card footer,
        .aci-chat-followups {
          margin-top: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .aci-chat-result-card footer button,
        .aci-chat-followups button {
          min-height: 38px;
          border-radius: 999px;
          border: 1px solid #bfd4fb;
          background: rgba(255,255,255,.98);
          color: var(--blue);
          padding: 0 15px;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 12px 28px -25px rgba(15,23,42,.35);
        }

        .aci-chat-thinking {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .aci-chat-thinking span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--blue);
          animation: aciThinking 1s infinite ease-in-out;
        }

        .aci-chat-thinking span:nth-child(2) { animation-delay: .12s; }
        .aci-chat-thinking span:nth-child(3) { animation-delay: .24s; }

        .aci-chat-thinking p {
          margin-left: 6px;
          color: #64748b !important;
          font-size: 12px !important;
        }

        @keyframes aciThinking {
          0%, 100% { opacity: .35; transform: translateY(1px); }
          50% { opacity: 1; transform: translateY(-2px); }
        }

        .aci-chat-error-note {
          border-radius: 15px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #b45309;
          padding: 10px 11px;
          font-size: 11px;
          font-weight: 760;
        }

        .aci-full-canvas-shell {
          min-height: 100dvh;
          background: #fff;
        }

        .aci-full-canvas-header {
          position: sticky;
          top: 0;
          z-index: 250;
          min-height: 62px;
          padding: 10px 20px;
          border-bottom: 1px solid #e2e8f0;
          background: rgba(255,255,255,.94);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .aci-full-canvas-header button {
          height: 38px;
          border-radius: 999px;
          border: 1px solid #dbe3ef;
          background: #fff;
          color: var(--blue);
          padding: 0 14px;
          font-size: 12px;
          font-weight: 820;
        }

        .aci-full-canvas-header div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .aci-full-canvas-header strong {
          color: var(--blue);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .aci-full-canvas-header span {
          color: #0f172a;
          font-size: 14px;
          font-weight: 820;
        }

        @media (max-width: 1180px) {
          .aci-chat-shell {
            width: min(430px, calc(100vw - 28px));
            margin-inline: auto;
            padding: 16px 0 calc(116px + env(safe-area-inset-bottom));
            background:
              radial-gradient(circle at 0% 28%, rgba(37,99,235,.06), transparent 25%),
              radial-gradient(circle at 100% 100%, rgba(37,99,235,.06), transparent 28%),
              linear-gradient(180deg, #fff 0%, #fbfdff 58%, #f7fbff 100%);
          }

          .aci-chat-app-frame {
            width: 100%;
            min-height: auto;
            border: 0;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
            padding: 0;
          }

          .aci-chat-header {
            grid-template-columns: 44px 1fr auto;
            min-height: 54px;
            margin-bottom: 16px;
          }

          .aci-chat-header .aci-logo {
            justify-self: start;
          }

          .aci-chat-back {
            width: 42px;
            height: 42px;
          }

          .aci-chat-header-actions {
            gap: 9px;
          }

          .aci-chat-bell,
          .aci-chat-avatar {
            width: 40px;
            height: 40px;
          }

          .aci-chat-context-pill {
            width: 100%;
            min-height: 54px;
            margin-bottom: 22px;
            border-radius: 20px;
            padding-inline: 15px;
          }

          .aci-chat-context-pill span {
            font-size: 14px;
          }

          .aci-chat-message {
            grid-template-columns: 44px minmax(0, 1fr);
            column-gap: 10px;
          }

          .aci-chat-orb {
            width: 42px;
            height: 42px;
          }

          .aci-chat-bubble {
            max-width: 100%;
            padding: 16px 17px;
            border-radius: 22px;
            border-bottom-left-radius: 7px;
          }

          .aci-chat-message.is-user .aci-chat-bubble {
            max-width: 82%;
            border-radius: 24px;
            border-bottom-right-radius: 7px;
          }

          .aci-chat-bubble > p {
            font-size: 17px;
            line-height: 1.46;
          }

          .aci-chat-result-card {
            width: 100%;
            border-radius: 23px;
          }

          .aci-chat-result-rows {
            display: flex;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            padding-bottom: 4px;
          }

          .aci-chat-result-rows > button {
            flex: 0 0 178px;
            scroll-snap-align: start;
          }

          .aci-chat-result-card footer,
          .aci-chat-followups {
            display: grid;
            grid-template-columns: 1fr;
          }

          .aci-chat-result-card footer button,
          .aci-chat-followups button {
            justify-content: space-between;
            text-align: left;
          }

          .aci-chat-shell .aci-v2-chatdock {
            width: min(430px, calc(100vw - 28px)) !important;
            bottom: calc(8px + env(safe-area-inset-bottom)) !important;
          }
        }

        @media (max-width: 460px) {
          .aci-chat-shell {
            width: 100%;
            padding-inline: 16px;
          }

          .aci-chat-header .aci-logo .aci-mark {
            font-size: 33px;
          }

          .aci-chat-header .aci-logo-copy strong {
            font-size: 14px;
            letter-spacing: 5px;
          }
        }

        /* ACI_CHAT_REFERENCE_SHELL_END */
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
