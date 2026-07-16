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
import { normalizeAciAction } from "./shared/AciAssistShared";
import AciV2PortalHeader from "./shared/AciV2PortalHeader";
import AciV2CityPicker from "./shared/AciV2CityPicker";
import {
  askAciAssistV2,
  fetchAciPricingCities,
} from "./services/aciAssistV2Api";
import AciAssistHomeScreen from "./screens/AciAssistHomeScreen";
import AciV2ChatFirstShell from "./chat/AciV2ChatShell";
import {
  compactContextForBackend,
  firstValue,
  getVehicleId,
  getVehicleModelKey,
  getVehicleTitle,
  mergeSessionContext,
  mergeVehicle,
  normalizeVehicle,
} from "./context/aciV2ContextManager";

const SCREEN = ACI_V2_SCREENS;

const INITIAL_SESSION_CONTEXT = {
  selectedVehicle: null,
  anchorMake: "",
  anchorModel: "",
  anchorVariant: "",
  anchorCity: "Delhi",
  selectedColor: null,
  lastCanvasType: "",
  customerStage: "discovery",
  customerJourney: {},
  leadContext: {},
  researchByVehicle: {},
};

const SESSION_MEMORY_KEY = "aci-assist-v2-vehicle-memory";

const getVehicleMemoryKey = (vehicle = {}) =>
  String(getVehicleId(vehicle) || getVehicleModelKey(vehicle) || "").trim();

const readVehicleMemory = () => {
  if (typeof window === "undefined") {
    return { recent: [], saved: [], researchByVehicle: {} };
  }
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SESSION_MEMORY_KEY) || "{}");
    return {
      recent: toArray(parsed.recent).map(normalizeVehicle).filter(Boolean).slice(0, 5),
      saved: toArray(parsed.saved).map(normalizeVehicle).filter(Boolean).slice(0, 12),
      researchByVehicle: isObject(parsed.researchByVehicle)
        ? parsed.researchByVehicle
        : {},
    };
  } catch {
    return { recent: [], saved: [], researchByVehicle: {} };
  }
};

const rememberVehicleInList = (list = [], vehicle, limit = 5) => {
  const normalized = normalizeVehicle(vehicle);
  const key = getVehicleMemoryKey(normalized);
  if (!normalized || !key) return list;
  return [normalized, ...list.filter((item) => getVehicleMemoryKey(item) !== key)].slice(0, limit);
};

const normalizeResearchTopic = (action = {}) => {
  const explicit = firstValue(
    action.payload?.researchTopic,
    action.researchTopic,
  );
  if (explicit) return String(explicit).trim().toLowerCase();

  const canvasType = normalizeV2CanvasType(action.canvasType || "");
  if (/price|pricelist/.test(canvasType)) return "prices";
  if (/color|colour/.test(canvasType)) return "colors";
  if (/emi|finance|monthly_budget/.test(canvasType)) return "emi";
  if (/feature/.test(canvasType)) return "features";
  if (/comparison|compare|recommendation|similar/.test(canvasType)) {
    return "comparison";
  }
  if (/quotation|quote|lead_capture/.test(canvasType)) return "quotation";
  if (/offer/.test(canvasType)) return "offers";
  if (/overview/.test(canvasType)) return "overview";
  return "";
};

const addResearchVisit = (
  researchByVehicle = {},
  vehicle = {},
  topic = "",
  canvasType = "",
) => {
  const vehicleKey = getVehicleMemoryKey(vehicle);
  const normalizedTopic = String(topic || "").trim().toLowerCase();
  if (!vehicleKey || !normalizedTopic) return researchByVehicle;

  const previousVehicle = isObject(researchByVehicle[vehicleKey])
    ? researchByVehicle[vehicleKey]
    : {};
  const previousTopics = isObject(previousVehicle.topics)
    ? previousVehicle.topics
    : {};
  const previousTopic = isObject(previousTopics[normalizedTopic])
    ? previousTopics[normalizedTopic]
    : {};
  const now = new Date().toISOString();

  return {
    ...researchByVehicle,
    [vehicleKey]: {
      ...previousVehicle,
      vehicleKey,
      vehicle: normalizeVehicle(vehicle),
      updatedAt: now,
      topics: {
        ...previousTopics,
        [normalizedTopic]: {
          ...previousTopic,
          topic: normalizedTopic,
          canvasType: normalizeV2CanvasType(canvasType),
          visits: Number(previousTopic.visits || 0) + 1,
          lastViewedAt: now,
          completed: true,
        },
      },
    },
  };
};

const isObject = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const normalizeModelOnlyPrompt = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const firstArray = (...values) => {
  for (const value of values) {
    const list = toArray(value);
    if (list.length) return list;
  }

  return [];
};

const normalizeBackendWidget = (backend = {}) => {
  const widget =
    (isObject(backend.widget) && backend.widget) ||
    (isObject(backend.widgets?.[0]) && backend.widgets[0]) ||
    (isObject(backend.canvas) && backend.canvas) ||
    (isObject(backend.payload?.widget) && backend.payload.widget) ||
    (isObject(backend.data?.widget) && backend.data.widget) ||
    {};

  const backendData = isObject(backend.data) ? backend.data : {};
  const widgetData = isObject(widget.data) ? widget.data : {};
  const rows = firstArray(backend.rows, widget.rows, backendData.rows, widgetData.rows);
  const items = firstArray(backend.items, widget.items, backendData.items, widgetData.items);
  const searchableFeatures = firstArray(
    widget.searchableFeatures,
    backend.searchableFeatures,
    backendData.searchableFeatures,
    widgetData.searchableFeatures,
  );
  const features = firstArray(
    backend.features,
    widget.features,
    widget.featureList,
    backendData.features,
    backendData.featureList,
    widgetData.features,
    widgetData.featureList,
    searchableFeatures,
  );
  const variantOptions = firstArray(
    backend.variantOptions,
    widget.variantOptions,
    backendData.variantOptions,
    widgetData.variantOptions,
    backend.variants,
    widget.variants,
    backendData.variants,
    widgetData.variants,
  );
  const modelGroups = firstArray(
    backend.modelGroups,
    backendData.modelGroups,
    widget.modelGroups,
    widgetData.modelGroups,
  );

  return {
    ...widget,
    intent: firstValue(backend.intent, widget.intent, backendData.intent, widgetData.intent),
    displayMode: firstValue(
      backend.displayMode,
      widget.displayMode,
      backendData.displayMode,
      widgetData.displayMode,
    ),
    canvasType: firstValue(backend.canvasType, widget.canvasType),
    inlineType: firstValue(backend.inlineType, widget.inlineType),
    title: firstValue(backend.title, widget.title),
    subtitle: firstValue(backend.subtitle, widget.subtitle),
    answer: firstValue(backend.answer, widget.answer),
    rows,
    items,
    modelGroups,
    features,
    featureList: features,
    colors: firstArray(backend.colors, widget.colors, backendData.colors, widgetData.colors),
    variants: variantOptions,
    variantOptions,
    allVariants: firstArray(
      widget.allVariants,
      backend.allVariants,
      backendData.allVariants,
      widgetData.allVariants,
    ),
    matchedVariants: firstArray(
      widget.matchedVariants,
      backend.matchedVariants,
      backendData.matchedVariants,
      widgetData.matchedVariants,
    ),
    featureGroups: firstArray(
      widget.featureGroups,
      widget.groups,
      backend.featureGroups,
      backend.groups,
      backendData.featureGroups,
      backendData.groups,
      widgetData.featureGroups,
      widgetData.groups,
    ),
    quickSpecs: firstArray(
      widget.quickSpecs,
      backend.quickSpecs,
      backendData.quickSpecs,
      widgetData.quickSpecs,
    ),
    highlights: firstArray(
      widget.highlights,
      backend.highlights,
      backendData.highlights,
      widgetData.highlights,
    ),
    searchableFeatures,
    selectedVariant: firstValue(
      widget.selectedVariant,
      backend.selectedVariant,
      backendData.selectedVariant,
      widgetData.selectedVariant,
    ),
    selectedVariantId: firstValue(
      widget.selectedVariantId,
      backend.selectedVariantId,
      backendData.selectedVariantId,
      widgetData.selectedVariantId,
    ),
    activeStatusSource: firstValue(
      widget.activeStatusSource,
      backend.activeStatusSource,
      backendData.activeStatusSource,
      widgetData.activeStatusSource,
    ),
    activeVariantCount: firstValue(
      widget.activeVariantCount,
      backend.activeVariantCount,
      backendData.activeVariantCount,
      widgetData.activeVariantCount,
    ),
    totalRawVariantCount: firstValue(
      widget.totalRawVariantCount,
      backend.totalRawVariantCount,
      backendData.totalRawVariantCount,
      widgetData.totalRawVariantCount,
    ),
    selectedVariantIsActive: firstValue(
      widget.selectedVariantIsActive,
      backend.selectedVariantIsActive,
      backendData.selectedVariantIsActive,
      widgetData.selectedVariantIsActive,
    ),
    currentPricelistMatched: firstValue(
      widget.currentPricelistMatched,
      backend.currentPricelistMatched,
      backendData.currentPricelistMatched,
      widgetData.currentPricelistMatched,
    ),
    totalFeatureCount: firstValue(
      widget.totalFeatureCount,
      backend.totalFeatureCount,
      backendData.totalFeatureCount,
      widgetData.totalFeatureCount,
    ),
    availableFeatureCount: firstValue(
      widget.availableFeatureCount,
      backend.availableFeatureCount,
      backendData.availableFeatureCount,
      widgetData.availableFeatureCount,
    ),
    actions: firstArray(backend.actions, widget.actions),
    leadingQuestions: firstArray(backend.leadingQuestions, widget.leadingQuestions),
    vehicle: widget.vehicle || backend.vehicle || backendData.vehicle || widgetData.vehicle || null,
    data: {
      ...widgetData,
      ...backendData,
    },
    contextPatch: {
      ...(widget.contextPatch || {}),
      ...(widgetData.contextPatch || {}),
      ...(backendData.contextPatch || {}),
      ...(backend.contextPatch || {}),
    },
    raw: backend.raw || widget.raw || null,
  };
};

const safeWidget = (widget) => (isObject(widget) ? widget : {});

const buildContextPatchFromBackend = (backend = {}, widget = {}) => {
  const contextPatch = {
    ...(widget.contextPatch || {}),
    ...(backend.contextPatch || {}),
  };
  const responseVehicle = firstVehicle(backend.vehicle, widget.vehicle);
  const patchVehicle = firstVehicle(contextPatch.selectedVehicle);
  const selectedVehicle =
    mergeVehicle(patchVehicle, responseVehicle) ||
    responseVehicle ||
    patchVehicle ||
    null;

  return {
    ...contextPatch,
    selectedVehicle,
  };
};

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

const buildChatMessageId = (prefix = "msg") =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const canvasTypeLabel = (canvasType = "") =>
  String(canvasType || "")
    .replace(/_/g, " ")
    .replace(/\bcanvas\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "Result";

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
  const scopedVehicle = useMemo(
    () =>
      mergeVehicle(vehicle, getCanvasScopedVehicle({ data }, safeCanvasWidget)),
    [data, safeCanvasWidget, vehicle],
  );

  const ScreenComponent =
    ACI_V2_SCREEN_COMPONENTS[screen] ||
    ACI_V2_SCREEN_COMPONENTS[SCREEN.CAR_OVERVIEW];
  const returnsToOverview =
    safeCanvasWidget.__originScreen === SCREEN.CAR_OVERVIEW &&
    screen !== SCREEN.CAR_OVERVIEW;

  const handleCanvasNewChat = () => {
    const payload = {
      id: "reset-session",
      type: "reset_session",
      action: "RESET_SESSION",
      label: "New chat",
      preserveHome: true,
      clearMessages: true,
      clearContext: true,
      resetConversation: true,
      startFresh: true,
    };

    onAction?.(payload);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("aci-assist:new-chat", {
          detail: payload,
        }),
      );
    }
  };

  return (
    <main className={`aci-full-canvas-shell aci-full-canvas-${screen}`}>
      <div className="aci-full-canvas-topbar">
        <AciV2PortalHeader
          compact
          onBack={onBack}
          onLogoClick={onBack}
          logoLabel={returnsToOverview ? "Back to car overview" : "Back to chat"}
          logoTitle={returnsToOverview ? "Back to car overview" : "Back to chat"}
          onNewChat={handleCanvasNewChat}
          onNotifications={() =>
            onAction?.({ id: "canvas-notifications", label: "Notifications" })
          }
          onProfile={() => onAction?.({ id: "canvas-profile", label: "Profile" })}
        />
      </div>

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

export default function AciAssistV2() {
  const requestSeqRef = useRef(0);
  const requestAbortRef = useRef(null);
  const directCanvasSeqRef = useRef(0);

  const [screen, setScreen] = useState(SCREEN.HOME);
  const initialVehicleMemoryRef = useRef(null);
  if (!initialVehicleMemoryRef.current) initialVehicleMemoryRef.current = readVehicleMemory();
  const [savedVehicles, setSavedVehicles] = useState(
    () => initialVehicleMemoryRef.current.saved,
  );
  const [recentVehicles, setRecentVehicles] = useState(
    () => initialVehicleMemoryRef.current.recent,
  );
  const savedIds = useMemo(
    () => new Set(savedVehicles.map(getVehicleMemoryKey).filter(Boolean)),
    [savedVehicles],
  );
  const [lastAction, setLastAction] = useState(null);
  const [activeCanvasPayload, setActiveCanvasPayload] = useState(null);
  const [isBackendLoading, setIsBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [cityPicker, setCityPicker] = useState(null);
  const [sessionContext, setSessionContext] = useState(() => ({
    ...INITIAL_SESSION_CONTEXT,
    researchByVehicle: initialVehicleMemoryRef.current.researchByVehicle || {},
  }));

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      SESSION_MEMORY_KEY,
      JSON.stringify({
        recent: recentVehicles,
        saved: savedVehicles,
        researchByVehicle: sessionContext.researchByVehicle || {},
      }),
    );
  }, [recentVehicles, savedVehicles, sessionContext.researchByVehicle]);

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
      setRecentVehicles((previous) => rememberVehicleInList(previous, nextVehicle));

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
      let canvasType = normalizeV2CanvasType(
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
      const backendVehicle = firstVehicle(
        contextPatch.selectedVehicle,
        backend.vehicle,
        widget.vehicle,
      );
      const normalizedPrompt = normalizeModelOnlyPrompt(
        getActionMessage(action, targetVehicle),
      );
      const overviewNames = backendVehicle
        ? [
            backendVehicle.model,
            backendVehicle.fullModel,
            backendVehicle.displayName,
            [backendVehicle.make || backendVehicle.brand, backendVehicle.model]
              .filter(Boolean)
              .join(" "),
          ]
            .map(normalizeModelOnlyPrompt)
            .filter(Boolean)
        : [];

      if (!canvasType && normalizedPrompt && overviewNames.includes(normalizedPrompt)) {
        canvasType = "car_overview_canvas";
      }
      const contextModelKey = getVehicleModelKey({
        model: contextPatch.anchorModel,
      });
      const fallbackVehicle = firstVehicle(targetVehicle, selectedVehicle);
      const fallbackVehicleKey = getVehicleModelKey(fallbackVehicle);
      const comparisonVehicles = firstArray(
        contextPatch.activeComparison?.vehicles,
        contextPatch.selectedComparisonSet?.vehicles,
        contextPatch.contextState?.activeComparison?.vehicles,
      );
      const comparisonScopedResponse =
        Number(contextPatch.compoundRequest?.modelCount || 0) > 1 ||
        comparisonVehicles.length > 1;
      const recommendationScopedResponse = /vehicle_recommendation|recommendation_results|feature_match_builder/i.test(
        `${backend.intent || ""} ${widget.intent || ""} ${canvasType}`,
      );
      const canUseFallbackVehicle = Boolean(
        !comparisonScopedResponse &&
          !recommendationScopedResponse &&
          fallbackVehicle &&
          (!contextModelKey ||
            !fallbackVehicleKey ||
            contextModelKey === fallbackVehicleKey),
      );
      const scopedVehicle =
        backendVehicle || (canUseFallbackVehicle ? fallbackVehicle : null);

      const scopedIdentityPatch = scopedVehicle
        ? {
            selectedVehicle: scopedVehicle,
            anchorMake: firstValue(scopedVehicle.make, scopedVehicle.brand),
            anchorModel: scopedVehicle.model || "",
            anchorFullModel: firstValue(
              scopedVehicle.fullModel,
              scopedVehicle.displayName,
              [scopedVehicle.make || scopedVehicle.brand, scopedVehicle.model]
                .filter(Boolean)
                .join(" "),
            ),
            anchorCity: firstValue(
              scopedVehicle.citySlug,
              scopedVehicle.city,
              contextPatch.anchorCity,
            ),
          }
        : {};
      const scopedContextPatch = recommendationScopedResponse
        ? {
            ...contextPatch,
            selectedVehicle: null,
            clearSelectedVehicle: true,
            anchorMake: "",
            anchorModel: "",
            anchorFullModel: "",
            anchorVariant: "",
          }
        : contextPatch;

      setSessionContext((previous) => {
        const merged = mergeSessionContext(previous, {
          ...scopedContextPatch,
          ...scopedIdentityPatch,
          selectedVehicle:
            scopedVehicle || scopedContextPatch.selectedVehicle || null,
          lastCanvasType: canvasType || previous.lastCanvasType,
        });
        const researchTopic = normalizeResearchTopic({
          ...action,
          canvasType,
        });

        return {
          ...merged,
          researchByVehicle: addResearchVisit(
            previous.researchByVehicle,
            scopedVehicle,
            researchTopic,
            canvasType,
          ),
        };
      });
      if (scopedVehicle) {
        setRecentVehicles((previous) => rememberVehicleInList(previous, scopedVehicle));
      }

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
        vehicle: scopedVehicle,
        contextPatch: {
          ...(action.contextPatch || {}),
          ...scopedContextPatch,
          selectedVehicle: scopedVehicle || scopedContextPatch.selectedVehicle || null,
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
          intent: firstValue(backend.intent, widget.intent),
          displayMode: firstValue(backend.displayMode, widget.displayMode),
          canvasType,
          inlineType: firstValue(backend.inlineType, widget.inlineType),
          widget,
          rows: firstArray(widget.data?.rows, backend.data?.rows, backend.rows, widget.rows),
          items: firstArray(backend.items, widget.items),
          modelGroups: firstArray(
            backend.modelGroups,
            backend.data?.modelGroups,
            widget.modelGroups,
            widget.data?.modelGroups,
          ),
          features: firstArray(
            backend.features,
            widget.features,
            widget.featureList,
            widget.searchableFeatures,
            widget.data?.features,
            widget.data?.featureList,
            widget.data?.searchableFeatures,
          ),
          actions: firstArray(backend.actions, widget.actions),
          leadingQuestions: firstArray(
            backend.leadingQuestions,
            widget.leadingQuestions,
          ),
          contextPatch: scopedContextPatch,
          journeyGuidance:
            backend.journeyGuidance ||
            widget.journeyGuidance ||
            scopedContextPatch.customerJourney ||
            null,
          sourceTransparency: backend.sourceTransparency || null,
          runtimeResultsMeta: backend.runtimeResultsMeta || [],
          answerBlocks: firstArray(backend.answerBlocks),
          compoundRequest:
            backend.compoundRequest || scopedContextPatch.compoundRequest || null,
          vehicle: scopedVehicle,
        },
      ]);

      if (canvasType) {
        const routedScreen = resolveScreenFromCanvasType(canvasType);
        if (routedScreen && routedScreen !== SCREEN.HOME) {
          setScreen(routedScreen);
          setActiveCanvasPayload(widget);
          setIsCanvasOpen(routedScreen === SCREEN.CAR_OVERVIEW);
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

  const openDirectCanvasFromAction = useCallback(
    (action, targetVehicle = null) => {
      const canvasType = normalizeV2CanvasType(action.canvasType || "");
      const routedScreen = resolveScreenFromCanvasType(canvasType);
      if (!routedScreen || routedScreen === SCREEN.HOME) return false;

      cancelActiveBackendRequest();

      const scopedVehicle = mergeVehicle(
        selectedVehicle,
        targetVehicle || action.vehicle || action.contextPatch?.selectedVehicle,
      );
      const researchTopic = normalizeResearchTopic(action);
      const requestId = directCanvasSeqRef.current + 1;
      directCanvasSeqRef.current = requestId;
      const rows = firstArray(
        action.payload?.rows,
        action.widget?.rows,
        scopedVehicle?.variants,
      );
      const colors = firstArray(
        action.payload?.colors,
        action.widget?.colors,
        scopedVehicle?.colors,
      );
      const seedWidget = withCanvasVehicleContext(
        {
          ...(isObject(action.widget) ? action.widget : {}),
          ...(isObject(action.payload?.widget) ? action.payload.widget : {}),
          __directCanvas: true,
          __directRequestId: requestId,
          __originScreen: SCREEN.CAR_OVERVIEW,
          __rawCanvasType: canvasType,
          canvasType,
          intent: action.intent || "",
          vehicle: scopedVehicle,
          rows,
          variants: rows,
          variantOptions: rows,
          colors,
          contextPatch: {
            ...(action.contextPatch || {}),
            selectedVehicle: scopedVehicle,
          },
          data: {
            ...(isObject(action.widget?.data) ? action.widget.data : {}),
            vehicle: scopedVehicle,
            selectedVehicle: scopedVehicle,
            rows,
            variants: rows,
            colors,
          },
        },
        scopedVehicle,
      );

      setScreen(routedScreen);
      setActiveCanvasPayload(seedWidget);
      setIsCanvasOpen(true);
      setBackendError("");

      setSessionContext((previous) => ({
        ...mergeSessionContext(previous, {
          ...(action.contextPatch || {}),
          selectedVehicle: scopedVehicle || previous.selectedVehicle,
          lastCanvasType: canvasType || previous.lastCanvasType,
        }),
        researchByVehicle: addResearchVisit(
          previous.researchByVehicle,
          scopedVehicle,
          researchTopic,
          canvasType,
        ),
      }));
      if (scopedVehicle) {
        setRecentVehicles((previous) =>
          rememberVehicleInList(previous, scopedVehicle),
        );
      }
      rememberAction({
        ...action,
        vehicle: scopedVehicle,
        payload: {
          ...(action.payload || {}),
          directCanvas: true,
          researchTopic,
        },
      });

      const hasLocalScreenData =
        (routedScreen === SCREEN.PRICELIST && rows.length) ||
        (routedScreen === SCREEN.COLORS && colors.length) ||
        (routedScreen === SCREEN.RECOMMENDATION && rows.length) ||
        routedScreen === SCREEN.CAR_OVERVIEW;

      if (!hasLocalScreenData) {
        const controller = new AbortController();
        requestAbortRef.current = controller;
        const message = getActionMessage(action, scopedVehicle);

        askAciAssistV2({
          message,
          context: buildContextForBackend(action, scopedVehicle),
          signal: controller.signal,
          // The backend's frontend-enriched feature response omits the
          // per-variant coverage matrix required by the feature canvas.
          source: routedScreen === SCREEN.FEATURES ? "" : undefined,
        })
          .then((backend) => {
            if (controller.signal.aborted || directCanvasSeqRef.current !== requestId) {
              return;
            }

            const hydrated = normalizeBackendWidget(backend);
            setActiveCanvasPayload((current) => {
              if (current?.__directRequestId !== requestId) return current;

              const hydratedRows = firstArray(
                hydrated.rows,
                hydrated.variantOptions,
                current.rows,
              );
              const hydratedColors = firstArray(hydrated.colors, current.colors);
              const canonicalVariants = firstArray(
                scopedVehicle?.variants,
                hydrated.variantOptions,
                hydrated.variants,
                hydratedRows,
              );

              return withCanvasVehicleContext(
                {
                  ...current,
                  ...hydrated,
                  __directCanvas: true,
                  __directRequestId: requestId,
                  __originScreen: SCREEN.CAR_OVERVIEW,
                  __rawCanvasType: canvasType,
                  canvasType,
                  vehicle: scopedVehicle,
                  rows: hydratedRows,
                  variants: canonicalVariants,
                  variantOptions: canonicalVariants,
                  colors: hydratedColors,
                  data: {
                    ...(current.data || {}),
                    ...(hydrated.data || {}),
                    vehicle: scopedVehicle,
                    selectedVehicle: scopedVehicle,
                    rows: hydratedRows,
                    variants: canonicalVariants,
                    variantOptions: canonicalVariants,
                    colors: hydratedColors,
                  },
                },
                scopedVehicle,
              );
            });
          })
          .catch((error) => {
            if (error?.name !== "AbortError") {
              setBackendError(
                error?.message || "Some live details could not be refreshed.",
              );
            }
          })
          .finally(() => {
            if (requestAbortRef.current === controller) {
              requestAbortRef.current = null;
            }
          });
      }

      return true;
    },
    [
      buildContextForBackend,
      cancelActiveBackendRequest,
      rememberAction,
      selectedVehicle,
    ],
  );

  const toggleSaved = useCallback(
    (vehicle) => {
      const id = getVehicleId(vehicle);
      if (!id) return;

      setSavedVehicles((previous) => {
        const memoryKey = getVehicleMemoryKey(vehicle) || String(id);
        const saved = previous.some((item) => getVehicleMemoryKey(item) === memoryKey);
        const next = saved
          ? previous.filter((item) => getVehicleMemoryKey(item) !== memoryKey)
          : rememberVehicleInList(previous, vehicle, 12);

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

      if (
        action.type === "reset_session" ||
        action.action === "RESET_SESSION" ||
        action.resetConversation === true
      ) {
        cancelActiveBackendRequest();
        setScreen(SCREEN.HOME);
        setActiveCanvasPayload(null);
        setBackendError("");
        setHasStartedChat(false);
        setIsCanvasOpen(false);
        setCityPicker(null);
        setChatMessages([]);
        setSessionContext((previous) => ({
          ...INITIAL_SESSION_CONTEXT,
          researchByVehicle: previous.researchByVehicle || {},
        }));
        rememberAction(action);
        return;
      }

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

      if (action.type === "select_context") {
        cancelActiveBackendRequest();
        setSelectedVehicle(action.vehicle || action.payload?.vehicle, action.contextPatch || {});
        setBackendError("");
        rememberAction(action);
        return;
      }

      if (action.type === "clear_context") {
        cancelActiveBackendRequest();
        setSessionContext((previous) => ({
          ...previous,
          selectedVehicle: null,
          anchorMake: "",
          anchorModel: "",
          anchorVariant: "",
          selectedColor: null,
        }));
        setBackendError("");
        rememberAction(action);
        return;
      }

      const targetVehicle =
        action.vehicle ||
        action.contextPatch?.selectedVehicle ||
        selectedVehicle ||
        null;

      if (action.type === "change_city") {
        cancelActiveBackendRequest();
        const embeddedCities = firstArray(
          action.availableCities,
          action.payload?.availableCities,
          activeCanvasPayload?.availableCities,
          activeCanvasPayload?.widget?.availableCities,
        );

        setCityPicker({
          vehicle: targetVehicle,
          cities: embeddedCities,
          loading: !embeddedCities.length,
        });
        rememberAction({
          ...action,
          label: "Choose pricing city",
          query: "",
        });

        if (!embeddedCities.length) {
          try {
            const cities = await fetchAciPricingCities();
            setCityPicker((current) =>
              current
                ? { ...current, cities, loading: false }
                : current,
            );
          } catch {
            setCityPicker((current) =>
              current ? { ...current, cities: [], loading: false } : current,
            );
          }
        }
        return;
      }

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

      if (
        action.payload?.directCanvas === true ||
        action.directCanvas === true ||
        action.navigationMode === "direct_canvas" ||
        (screen === SCREEN.CAR_OVERVIEW && Boolean(action.canvasType))
      ) {
        if (openDirectCanvasFromAction(action, targetVehicle)) return;
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
      activeCanvasPayload,
      openBackendWidgetFromAction,
      openDirectCanvasFromAction,
      rememberAction,
      screen,
      selectedVehicle,
      sendActionToBackend,
      sessionContext.anchorCity,
      sessionContext.anchorMake,
      sessionContext.anchorModel,
      setSelectedVehicle,
      toggleSaved,
    ],
  );

  const shellHomeData = useMemo(
    () => ({
      ...homeData,
      sessionContext,
      researchByVehicle: sessionContext.researchByVehicle || {},
    }),
    [homeData, sessionContext],
  );

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

  const handleCanvasBack = useCallback(() => {
    if (
      activeCanvasPayload?.__originScreen === SCREEN.CAR_OVERVIEW &&
      screen !== SCREEN.CAR_OVERVIEW
    ) {
      directCanvasSeqRef.current += 1;
      requestAbortRef.current?.abort();
      requestAbortRef.current = null;
      setScreen(SCREEN.CAR_OVERVIEW);
      setActiveCanvasPayload({
        __directCanvas: true,
        canvasType: "car_overview_canvas",
        vehicle: selectedVehicle,
        data: {
          vehicle: selectedVehicle,
          selectedVehicle,
        },
      });
      setIsCanvasOpen(true);
      setBackendError("");
      return;
    }

    setIsCanvasOpen(false);
  }, [activeCanvasPayload, screen, selectedVehicle]);

  return (
    <>
      <AciAssistStyles />

      <style>{`
	.aci-chat-preview-card.is-feature-card .aci-chat-row-visual {
	  background:
	    radial-gradient(circle at 35% 22%, #ffffff, transparent 28%),
    linear-gradient(180deg, #f8fbff, #eff6ff);
}

.aci-chat-feature-preview-icon {
  width: 100%;
  height: 100%;
  min-height: 112px;
  display: grid;
  place-items: center;
  gap: 6px;
}

.aci-chat-feature-preview-icon .aci-chat-chip-icon {
  width: 42px;
  height: 42px;
  color: var(--aci-blue);
  background: #fff;
  border: 1px solid #dbeafe;
  box-shadow: 0 16px 34px -28px rgba(37,99,235,0.6);
}

.aci-chat-feature-preview-icon strong {
  color: #0758f8;
  font-size: 24px;
  line-height: 1;
  letter-spacing: -0.06em;
  font-weight: 900;
}

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

.aci-chat-message.is-assistant:has(.aci-feature-inline-card-v4) .aci-chat-assistant-stack {
  flex: 1 1 auto;
}

.aci-chat-message.is-assistant:has(.aci-feature-inline-card-v4) .aci-feature-inline-card-v4 {
  width: calc(100% + 50px);
  max-width: min(800px, calc(100vw - 44px));
  margin-left: -50px;
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

.aci-v2-clarification-options {
  width: min(100%, 560px);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.aci-v2-clarification-options button {
  min-height: 36px;
  padding: 8px 12px;
  border: 1px solid rgba(4, 87, 255, .18);
  border-radius: 8px;
  color: #073477;
  background: #ffffff;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}

.aci-v2-clarification-options button:hover,
.aci-v2-clarification-options button:focus-visible {
  border-color: #0457ff;
  background: #f4f8ff;
  outline: none;
}

.aci-v2-finance-checklist {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}

.aci-v2-finance-checklist li,
.aci-v2-finance-caveat {
  font-size: 12px;
  line-height: 1.45;
  letter-spacing: 0;
}

.aci-v2-finance-actions {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.aci-v2-finance-actions button {
  min-height: 34px;
  padding: 7px 10px;
  border: 1px solid rgba(4, 87, 255, .18);
  border-radius: 7px;
  color: #073477;
  background: #fff;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}

.aci-v2-finance-caveat {
  margin: 10px 0 0;
  color: #5f6b7c;
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
  padding-bottom: calc(140px + env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 0% 0%, rgba(7, 88, 248, 0.06), transparent 28%),
    linear-gradient(180deg, #fff 0%, #f8fbff 100%);
}

.aci-full-canvas-topbar {
  position: sticky;
  top: 0;
  z-index: 250;
  padding: 8px 0 8px;
  background:
    linear-gradient(180deg, rgba(248,251,255,0.96), rgba(248,251,255,0.72) 72%, transparent);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.aci-full-canvas-car_overview {
  padding-top: 72px;
}

.aci-full-canvas-car_overview > .aci-full-canvas-topbar {
  position: fixed;
  inset: 0 0 auto;
  z-index: 300;
  padding: 7px 0;
  background: rgba(248, 251, 255, 0.94);
  border-bottom: 0;
  box-shadow: 0 18px 42px -38px rgba(15, 23, 42, 0.42);
}

.aci-full-canvas-shell .desktop-header,
.aci-full-canvas-shell .mobile-header,
.aci-full-canvas-shell .aci-mobile-topbar,
.aci-full-canvas-shell .price-desktop-header,
.aci-full-canvas-shell .price-mobile-header,
.aci-full-canvas-shell .afi-desktop-header,
.aci-full-canvas-shell .afi-mobile-header {
  display: none !important;
}

.aci-full-canvas-shell .aci-colors-mobile {
  padding-bottom: calc(196px + env(safe-area-inset-bottom)) !important;
}

.aci-full-canvas-shell .aci-colors-desktop,
.aci-full-canvas-shell .price-desktop-page,
.aci-full-canvas-shell .desktop-page,
.aci-full-canvas-shell .afi-desktop,
.aci-full-canvas-shell .afi-mobile {
  padding-bottom: calc(154px + env(safe-area-inset-bottom)) !important;
}

.aci-full-canvas-car_overview {
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}

.aci-full-canvas-car_overview .desktop-page {
  padding-bottom: 24px !important;
}

@media (max-width: 900px) {
  .aci-full-canvas-shell {
    padding-bottom: calc(190px + env(safe-area-inset-bottom));
  }

  .aci-full-canvas-car_overview {
    padding-bottom: calc(68px + env(safe-area-inset-bottom));
  }
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
  padding: 0 0 calc(176px + env(safe-area-inset-bottom)) !important;
  scroll-padding-bottom: calc(176px + env(safe-area-inset-bottom)) !important;
  scrollbar-width: none !important;
}

.aci-chat-thread::-webkit-scrollbar {
  display: none !important;
}

.aci-chat-scroll-anchor {
  width: 100% !important;
  height: calc(176px + env(safe-area-inset-bottom)) !important;
  min-height: calc(176px + env(safe-area-inset-bottom)) !important;
  flex: 0 0 calc(176px + env(safe-area-inset-bottom)) !important;
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

  .aci-chat-message.is-assistant:has(.aci-feature-inline-card-v4) {
    width: 100% !important;
  }

  .aci-chat-message.is-assistant:has(.aci-feature-inline-card-v4) .aci-chat-assistant-stack {
    flex: 1 1 auto !important;
    max-width: calc(100% - 50px) !important;
    min-width: 0 !important;
  }

  .aci-chat-message.is-assistant:has(.aci-feature-inline-card-v4) .aci-feature-inline-card-v4 {
    width: calc(100vw - 28px) !important;
    max-width: 402px !important;
    margin-left: -50px !important;
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
    padding-right: 12px !important;
    padding-top: 11px !important;
  }

  .aci-chat-result-card:not(.aci-chat-color-result-card) .aci-chat-row-copy {
    padding-left: 4px !important;
    padding-right: 12px !important;
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
          onBack={handleCanvasBack}
        />
      ) : (
        <AciV2ChatFirstShell
          homeData={shellHomeData}
          messages={chatMessages}
          isLoading={isBackendLoading}
          error={backendError}
          selectedVehicle={selectedVehicle}
          sessionContext={sessionContext}
          recentVehicles={recentVehicles}
          savedVehicles={savedVehicles}
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

      {cityPicker ? (
        <AciV2CityPicker
          cities={cityPicker.cities}
          vehicle={cityPicker.vehicle}
          loading={cityPicker.loading}
          onClose={() => setCityPicker(null)}
          onSelect={(city) => {
            const vehicle = cityPicker.vehicle || selectedVehicle || {};
            const cityName = city.city || city.citySlug;
            const citySlug = city.citySlug || cityName;
            setCityPicker(null);
            handleAciAction({
              id: `change-city-${citySlug}`,
              label: `${cityName} prices`,
              query: `${getVehicleTitle(vehicle)} price in ${cityName}`,
              type:
                screen === SCREEN.CAR_OVERVIEW ? "select_context" : "ask",
              vehicle: {
                ...vehicle,
                city: cityName,
                citySlug,
              },
              contextPatch: {
                selectedVehicle: {
                  ...vehicle,
                  city: cityName,
                  citySlug,
                },
                anchorCity: citySlug,
              },
              source: "aci_v2_city_picker",
            });
          }}
        />
      ) : null}
    </>
  );
}
