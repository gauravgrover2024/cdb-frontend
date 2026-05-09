import React, { useMemo, useState } from "react";
import {
  ACI_ASSIST_HOME_DATA,
  ACI_CANVAS_TYPES,
  ACI_HOME_IMAGES,
  ACI_INTENTS,
  buildVehicleAction,
  getAciVehicleById,
  getAciVehicleByQuery,
} from "./data/homeScreenData";
import AciAssistStyles from "./shared/AciAssistStyles";
import { normalizeAciAction } from "./shared/AciAssistShared";
import { askAciAssistV2 } from "./services/aciAssistV2Api";
import AciAssistHomeScreen from "./screens/AciAssistHomeScreen";
import AciAssistCarOverviewScreen from "./screens/AciAssistCarOverviewScreen";
import AciAssistColorsScreen from "./screens/AciAssistColorsScreen";
import AciAssistPriceListScreen from "./screens/AciAssistPriceListScreen";

const SCREEN = {
  HOME: "home",
  CAR_OVERVIEW: "car_overview",
  COLORS: "colors",
  PRICELIST: "pricelist",
};

const mergeVehicle = (fallback, incoming) => {
  if (!incoming) return fallback;

  return {
    ...(fallback || {}),
    ...incoming,
    id: incoming.id || incoming._id || fallback?.id,
    make: incoming.make || incoming.brand || fallback?.make || fallback?.brand,
    brand: incoming.brand || incoming.make || fallback?.brand || fallback?.make,
    model: incoming.model || fallback?.model,
    displayName:
      incoming.displayName ||
      incoming.name ||
      [incoming.brand || incoming.make || fallback?.brand || fallback?.make, incoming.model || fallback?.model]
        .filter(Boolean)
        .join(" ") ||
      fallback?.displayName,
    imageUrl:
      incoming.imageUrl ||
      incoming.heroImageUrl ||
      incoming.vehicleImageUrl ||
      incoming.image ||
      fallback?.imageUrl,
  };
};

const isCanvasInteractionOnly = (action) => {
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

const normalizeCanvasType = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const isPriceListCanvas = (value = "") => {
  const canvasType = normalizeCanvasType(value);
  return canvasType === ACI_CANVAS_TYPES.PRICELIST || canvasType === "pricelist_canvas";
};

const isColorsCanvas = (value = "") => {
  const canvasType = normalizeCanvasType(value);
  return (
    canvasType === ACI_CANVAS_TYPES.COLORS ||
    canvasType === "color_gallery_canvas" ||
    canvasType === "color_studio_canvas"
  );
};

const isCarOverviewCanvas = (value = "") => {
  const canvasType = normalizeCanvasType(value);
  return (
    canvasType === ACI_CANVAS_TYPES.CAR_OVERVIEW ||
    canvasType === "car_overview_canvas" ||
    canvasType === "vehicle_overview_canvas"
  );
};

export default function AciAssistV2() {
  const [screen, setScreen] = useState(SCREEN.HOME);
  const [selectedVehicleId, setSelectedVehicleId] = useState("hyundai-creta");
  const [activeVehicleOverride, setActiveVehicleOverride] = useState(null);
  const [savedIds, setSavedIds] = useState(() => new Set(["hyundai-verna"]));
  const [lastAction, setLastAction] = useState(null);
  const [activeCanvasPayload, setActiveCanvasPayload] = useState(null);
  const [isBackendLoading, setIsBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState("");

  const homeData = useMemo(
    () => ({
      ...ACI_ASSIST_HOME_DATA,
      avatarUrl: ACI_HOME_IMAGES.avatar,
    }),
    [],
  );

  const fallbackSelectedVehicle = useMemo(
    () => getAciVehicleById(selectedVehicleId),
    [selectedVehicleId],
  );

  const selectedVehicle = useMemo(
    () => mergeVehicle(fallbackSelectedVehicle, activeVehicleOverride),
    [fallbackSelectedVehicle, activeVehicleOverride],
  );

  const dispatchBrowserEvent = (action) => {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("aci-assist-click", {
        detail: action,
      }),
    );
  };

  const rememberAction = (action) => {
    setLastAction(action);
    console.log("ACI Assist V2 action:", action);
    dispatchBrowserEvent(action);
  };

  const setSelectedVehicle = (vehicle) => {
    const nextVehicle = mergeVehicle(selectedVehicle, vehicle);
    if (!nextVehicle?.id) return nextVehicle;

    setSelectedVehicleId(nextVehicle.id);
    setActiveVehicleOverride(nextVehicle);
    return nextVehicle;
  };

  const openVehicle = (vehicle, sourceAction = {}) => {
    const nextVehicle = setSelectedVehicle(vehicle || selectedVehicle);
    if (!nextVehicle?.id) return;

    setActiveCanvasPayload(null);
    setScreen(SCREEN.CAR_OVERVIEW);

    rememberAction({
      ...buildVehicleAction(nextVehicle),
      sourceAction,
    });
  };

  const openColors = (vehicle, sourceAction = {}) => {
    const nextVehicle = setSelectedVehicle(vehicle || selectedVehicle);
    if (!nextVehicle?.id) return;

    setActiveCanvasPayload(
      sourceAction.widget ||
        sourceAction.payload?.widget ||
        sourceAction.payload ||
        null,
    );
    setScreen(SCREEN.COLORS);

    rememberAction({
      ...sourceAction,
      id: sourceAction.id || `${nextVehicle.id}-colors-open`,
      label: sourceAction.label || `Colors of ${nextVehicle.displayName}`,
      query: sourceAction.query || `Show colors of ${nextVehicle.displayName}`,
      type: "open_canvas",
      intent: ACI_INTENTS.COLORS,
      canvasType: ACI_CANVAS_TYPES.COLORS,
      vehicle: nextVehicle,
      contextPatch: {
        selectedVehicle: nextVehicle,
        anchorModel: nextVehicle.model,
        anchorMake: nextVehicle.make,
        anchorCity: nextVehicle.city,
        ...(sourceAction.contextPatch || {}),
      },
    });
  };

  const openPriceList = (vehicle, sourceAction = {}) => {
    const nextVehicle = setSelectedVehicle(vehicle || selectedVehicle);
    if (!nextVehicle?.id) return;

    setActiveCanvasPayload(
      sourceAction.widget ||
        sourceAction.payload?.widget ||
        sourceAction.payload ||
        null,
    );
    setScreen(SCREEN.PRICELIST);

    rememberAction({
      ...sourceAction,
      id: sourceAction.id || `${nextVehicle.id}-pricelist-open`,
      label: sourceAction.label || `${nextVehicle.displayName} price list`,
      query: sourceAction.query || `${nextVehicle.displayName} pricelist`,
      type: "open_canvas",
      intent: ACI_INTENTS.PRICELIST,
      canvasType: ACI_CANVAS_TYPES.PRICELIST,
      vehicle: nextVehicle,
      contextPatch: {
        selectedVehicle: nextVehicle,
        anchorModel: nextVehicle.model,
        anchorMake: nextVehicle.make,
        anchorCity: nextVehicle.city,
        ...(sourceAction.contextPatch || {}),
      },
    });
  };

  const toggleSaved = (vehicle) => {
    if (!vehicle?.id) return;

    setSavedIds((prev) => {
      const next = new Set(prev);
      const saved = next.has(vehicle.id);

      if (saved) next.delete(vehicle.id);
      else next.add(vehicle.id);

      rememberAction(
        normalizeAciAction({
          id: `${saved ? "unsave" : "save"}-${vehicle.id}`,
          label: saved
            ? `Removed ${vehicle.displayName || vehicle.name}`
            : `Saved ${vehicle.displayName || vehicle.name}`,
          query: saved
            ? `Remove saved car ${vehicle.displayName || vehicle.name}`
            : `Save car ${vehicle.displayName || vehicle.name}`,
          type: "toggle_saved",
          intent: ACI_INTENTS.TOGGLE_SAVED,
          vehicle,
          payload: {
            saved: !saved,
          },
        }),
      );

      return next;
    });
  };

  const buildContextForBackend = (action, targetVehicle) => ({
    selectedVehicle: targetVehicle || selectedVehicle,
    activeScreen: screen,
    activeCanvasPayload,
    anchorModel: targetVehicle?.model || selectedVehicle?.model,
    anchorMake: targetVehicle?.make || selectedVehicle?.make,
    anchorCity: targetVehicle?.city || selectedVehicle?.city,
    ...(action.contextPatch || {}),
  });

  const routeBackendResponse = (action, backend, targetVehicle) => {
    const backendVehicle = mergeVehicle(
      targetVehicle || selectedVehicle,
      backend.vehicle || backend.contextPatch?.selectedVehicle,
    );
    const canvasType = backend.canvasType || action.canvasType;
    const widget = {
      ...(backend.widget || {}),
      ...(backend.rows?.length ? { rows: backend.rows } : {}),
      ...(backend.colors?.length ? { colors: backend.colors } : {}),
      contextPatch: backend.contextPatch || {},
      actions: backend.actions || [],
      leadingQuestions: backend.leadingQuestions || [],
      answer: backend.answer || "",
    };

    const enrichedAction = {
      ...action,
      answer: backend.answer,
      canvasType,
      widget,
      payload: {
        ...(action.payload || {}),
        widget,
        backendRaw: backend.raw,
      },
      vehicle: backendVehicle,
    };

    if (isPriceListCanvas(canvasType)) {
      openPriceList(backendVehicle, enrichedAction);
      return true;
    }

    if (isColorsCanvas(canvasType)) {
      openColors(backendVehicle, enrichedAction);
      return true;
    }

    if (isCarOverviewCanvas(canvasType) || action.intent === ACI_INTENTS.OPEN_VEHICLE) {
      openVehicle(backendVehicle, enrichedAction);
      return true;
    }

    if (
      backendVehicle?.model &&
      !action.canvasType &&
      !action.intent
    ) {
      openVehicle(backendVehicle, enrichedAction);
      return true;
    }

    rememberAction({
      ...enrichedAction,
      contextPatch: {
        selectedVehicle: selectedVehicle,
        ...(action.contextPatch || {}),
      },
    });

    return false;
  };

  const shouldAskBackend = (action) => {
    const actionText = `${action.label || ""} ${action.query || ""}`.toLowerCase();

    if (!action.query && !action.label) return false;
    if (isCanvasInteractionOnly(action)) return false;

    return Boolean(
      action.canvasType ||
        action.intent ||
        actionText.includes("price") ||
        actionText.includes("pricelist") ||
        actionText.includes("color") ||
        actionText.includes("colour") ||
        actionText.includes("creta") ||
        actionText.includes("verna") ||
        actionText.includes("safari") ||
        actionText.includes("seltos") ||
        actionText.includes("city") ||
        actionText.includes("slavia"),
    );
  };

  const handleAciAction = async (rawAction) => {
    const action = normalizeAciAction(rawAction);
    const actionText = `${action.label || ""} ${action.query || ""}`.toLowerCase();

    if (action.type === "go_home" || action.label === "Home") {
      setScreen(SCREEN.HOME);
      setActiveCanvasPayload(null);
      setBackendError("");
      rememberAction(action);
      return;
    }

    if (action.type === "back_to_car" || actionText.startsWith("back to")) {
      if (action.vehicle?.id) setSelectedVehicle(action.vehicle);
      setScreen(SCREEN.CAR_OVERVIEW);
      setActiveCanvasPayload(null);
      setBackendError("");
      rememberAction(action);
      return;
    }

    if (action.type === "toggle_saved") {
      toggleSaved(action.vehicle);
      return;
    }

    if (isCanvasInteractionOnly(action)) {
      rememberAction({
        ...action,
        contextPatch: {
          selectedVehicle,
          anchorModel: selectedVehicle?.model,
          anchorMake: selectedVehicle?.make,
          anchorCity: selectedVehicle?.city,
          ...(action.contextPatch || {}),
        },
      });
      return;
    }

    const explicitVehicle = action.vehicle || null;
    const vehicleFromQuery = getAciVehicleByQuery(action.query || action.label);
    const targetVehicle = explicitVehicle || vehicleFromQuery || selectedVehicle;

    if (shouldAskBackend(action)) {
      setIsBackendLoading(true);
      setBackendError("");

      try {
        const backend = await askAciAssistV2({
          message: action.query || action.label,
          context: buildContextForBackend(action, targetVehicle),
        });

        setIsBackendLoading(false);

        const routed = routeBackendResponse(action, backend, targetVehicle);
        if (routed) return;
      } catch (error) {
        console.error("ACI Assist V2 backend failed. Falling back to local route.", error);
        setIsBackendLoading(false);
        setBackendError(error?.message || "Backend request failed");
      }
    }

    const shouldOpenPriceList =
      isPriceListCanvas(action.canvasType) ||
      action.intent === ACI_INTENTS.PRICELIST ||
      actionText.includes("price list") ||
      actionText.includes("pricelist") ||
      actionText.includes("prices");

    if (shouldOpenPriceList) {
      openPriceList(targetVehicle, action);
      return;
    }

    const shouldOpenColors =
      isColorsCanvas(action.canvasType) ||
      action.intent === ACI_INTENTS.COLORS ||
      actionText.includes("color") ||
      actionText.includes("colour");

    if (shouldOpenColors) {
      openColors(targetVehicle, action);
      return;
    }

    const shouldOpenVehicle =
      action.type === "open_vehicle" ||
      action.intent === ACI_INTENTS.OPEN_VEHICLE ||
      Boolean(vehicleFromQuery);

    if (shouldOpenVehicle) {
      openVehicle(targetVehicle, action);
      return;
    }

    rememberAction({
      ...action,
      contextPatch: {
        selectedVehicle,
        anchorModel: selectedVehicle?.model,
        anchorMake: selectedVehicle?.make,
        anchorCity: selectedVehicle?.city,
        ...(action.contextPatch || {}),
      },
    });
  };

  return (
    <>
      <AciAssistStyles />

      <style>{`
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
          border: 0;
          background: transparent;
          color: #64748b;
          display: grid;
          place-items: center;
        }

        .aci-v2-backend-state {
          position: fixed;
          left: 50%;
          top: 12px;
          transform: translateX(-50%);
          z-index: 300;
          min-height: 34px;
          border-radius: 999px;
          border: 1px solid #dbe3ef;
          background: rgba(255,255,255,.94);
          box-shadow: 0 18px 44px -34px rgba(15,23,42,.45);
          backdrop-filter: blur(14px);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 14px;
          color: #475569;
          font-size: 12px;
          font-weight: 750;
          pointer-events: none;
        }

        .aci-v2-backend-state.error {
          color: #b45309;
          background: #fff7ed;
          border-color: #fed7aa;
        }

        .aci-v2-pulse {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--blue);
          animation: aciPulse 1s infinite ease-in-out;
        }

        @keyframes aciPulse {
          0%, 100% { opacity: .35; transform: scale(.75); }
          50% { opacity: 1; transform: scale(1); }
        }

        .aci-action-toast {
          display: none;
        }
      `}</style>

      {isBackendLoading ? (
        <div className="aci-v2-backend-state">
          <span className="aci-v2-pulse" />
          Fetching live ACI data
        </div>
      ) : backendError ? (
        <div className="aci-v2-backend-state error">
          Using fallback data · backend not reached
        </div>
      ) : null}

      {screen === SCREEN.HOME ? (
        <AciAssistHomeScreen
          data={homeData}
          onAction={handleAciAction}
          savedIds={savedIds}
          onToggleSaved={toggleSaved}
        />
      ) : screen === SCREEN.COLORS ? (
        <AciAssistColorsScreen
          data={homeData}
          vehicle={selectedVehicle}
          widget={activeCanvasPayload}
          onAction={handleAciAction}
        />
      ) : screen === SCREEN.PRICELIST ? (
        <AciAssistPriceListScreen
          data={homeData}
          vehicle={selectedVehicle}
          widget={activeCanvasPayload}
          onAction={handleAciAction}
        />
      ) : (
        <AciAssistCarOverviewScreen
          data={homeData}
          vehicle={selectedVehicle}
          onAction={handleAciAction}
          savedIds={savedIds}
          onToggleSaved={toggleSaved}
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
