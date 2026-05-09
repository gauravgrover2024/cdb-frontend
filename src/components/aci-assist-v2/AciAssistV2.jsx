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

export default function AciAssistV2() {
  const [screen, setScreen] = useState(SCREEN.HOME);
  const [selectedVehicleId, setSelectedVehicleId] = useState("hyundai-creta");
  const [savedIds, setSavedIds] = useState(() => new Set(["hyundai-verna"]));
  const [lastAction, setLastAction] = useState(null);
  const [activeCanvasPayload, setActiveCanvasPayload] = useState(null);

  const homeData = useMemo(
    () => ({
      ...ACI_ASSIST_HOME_DATA,
      avatarUrl: ACI_HOME_IMAGES.avatar,
    }),
    [],
  );

  const selectedVehicle = useMemo(
    () => getAciVehicleById(selectedVehicleId),
    [selectedVehicleId],
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

  const openVehicle = (vehicle, sourceAction = {}) => {
    const nextVehicle = vehicle || selectedVehicle;
    if (!nextVehicle?.id) return;

    setSelectedVehicleId(nextVehicle.id);
    setActiveCanvasPayload(null);
    setScreen(SCREEN.CAR_OVERVIEW);

    rememberAction({
      ...buildVehicleAction(nextVehicle),
      sourceAction,
    });
  };

  const openColors = (vehicle, sourceAction = {}) => {
    const nextVehicle = vehicle || selectedVehicle;
    if (!nextVehicle?.id) return;

    setSelectedVehicleId(nextVehicle.id);
    setActiveCanvasPayload(sourceAction.payload || sourceAction.widget || null);
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
    const nextVehicle = vehicle || selectedVehicle;
    if (!nextVehicle?.id) return;

    setSelectedVehicleId(nextVehicle.id);
    setActiveCanvasPayload(sourceAction.payload || sourceAction.widget || null);
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

  const handleAciAction = (rawAction) => {
    const action = normalizeAciAction(rawAction);
    const actionText = `${action.label || ""} ${action.query || ""}`.toLowerCase();

    if (action.type === "go_home" || action.label === "Home") {
      setScreen(SCREEN.HOME);
      setActiveCanvasPayload(null);
      rememberAction(action);
      return;
    }

    if (action.type === "back_to_car" || actionText.startsWith("back to")) {
      if (action.vehicle?.id) setSelectedVehicleId(action.vehicle.id);
      setScreen(SCREEN.CAR_OVERVIEW);
      setActiveCanvasPayload(null);
      rememberAction(action);
      return;
    }

    if (action.type === "toggle_saved") {
      toggleSaved(action.vehicle);
      return;
    }

    const explicitVehicle = action.vehicle || null;
    const vehicleFromQuery = getAciVehicleByQuery(action.query || action.label);
    const targetVehicle = explicitVehicle || vehicleFromQuery;

    const shouldOpenPriceList =
      action.canvasType === ACI_CANVAS_TYPES.PRICELIST ||
      action.intent === ACI_INTENTS.PRICELIST ||
      actionText.includes("price list") ||
      actionText.includes("pricelist") ||
      actionText.includes("prices");

    if (shouldOpenPriceList) {
      openPriceList(targetVehicle || selectedVehicle, action);
      return;
    }

    const shouldOpenColors =
      action.canvasType === ACI_CANVAS_TYPES.COLORS &&
      !action.payload?.color &&
      !action.payload?.selectedColor &&
      !action.selectedColor &&
      (
        action.type === "open_canvas" ||
        action.id?.includes("colors") ||
        actionText.includes("color") ||
        actionText.includes("colour")
      );

    if (shouldOpenColors) {
      openColors(targetVehicle || selectedVehicle, action);
      return;
    }

    const shouldOpenVehicle =
      action.type === "open_vehicle" ||
      action.intent === ACI_INTENTS.OPEN_VEHICLE ||
      (
        !explicitVehicle &&
        Boolean(vehicleFromQuery) &&
        !action.canvasType &&
        !action.intent
      );

    if (shouldOpenVehicle) {
      openVehicle(targetVehicle || selectedVehicle, action);
      return;
    }

    const enrichedAction = {
      ...action,
      contextPatch: {
        selectedVehicle,
        anchorModel: selectedVehicle?.model,
        anchorMake: selectedVehicle?.make,
        anchorCity: selectedVehicle?.city,
        ...(action.contextPatch || {}),
      },
    };

    rememberAction(enrichedAction);

    /**
     * Backend wiring point:
     *
     * aiAgentApi.chat({
     *   message: enrichedAction.query,
     *   context: {
     *     selectedVehicle,
     *     ...enrichedAction.contextPatch,
     *   },
     * })
     *
     * Expected backend pricelist contract:
     * response.canvasType = "pricelist_canvas"
     * response.vehicle = { id, make, model, displayName, city, imageUrl }
     * response.widget = {
     *   city,
     *   rows: [
     *     {
     *       id, variant, fuel, transmission,
     *       exShowroomPrice, rto, insurance, otherChargesTotal, onRoadPrice,
     *       otherItems: [{ label, amount }],
     *       keyFeatures: []
     *     }
     *   ]
     * }
     */
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

        .aci-action-toast {
          display: none;
        }
      `}</style>

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
