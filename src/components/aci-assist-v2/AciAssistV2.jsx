import React, { useMemo, useState } from "react";
import {
  ACI_ASSIST_HOME_DATA,
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

const SCREEN = {
  HOME: "home",
  CAR_OVERVIEW: "car_overview",
};

export default function AciAssistV2() {
  const [screen, setScreen] = useState(SCREEN.HOME);
  const [selectedVehicleId, setSelectedVehicleId] = useState("hyundai-creta");
  const [savedIds, setSavedIds] = useState(() => new Set(["hyundai-verna"]));
  const [lastAction, setLastAction] = useState(null);

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

  const openVehicle = (vehicle, sourceAction = {}) => {
    const nextVehicle = vehicle || selectedVehicle;

    if (!nextVehicle?.id) return;

    setSelectedVehicleId(nextVehicle.id);
    setScreen(SCREEN.CAR_OVERVIEW);

    const openAction = {
      ...buildVehicleAction(nextVehicle),
      sourceAction,
    };

    setLastAction(openAction);
    console.log("ACI Assist V2 open vehicle:", openAction);
    dispatchBrowserEvent(openAction);
  };

  const toggleSaved = (vehicle) => {
    if (!vehicle?.id) return;

    setSavedIds((prev) => {
      const next = new Set(prev);
      const saved = next.has(vehicle.id);

      if (saved) {
        next.delete(vehicle.id);
      } else {
        next.add(vehicle.id);
      }

      const action = normalizeAciAction({
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
      });

      setLastAction(action);
      console.log("ACI Assist V2 saved toggle:", action);
      dispatchBrowserEvent(action);

      return next;
    });
  };

  const handleAciAction = (rawAction) => {
    const action = normalizeAciAction(rawAction);

    if (action.type === "go_home") {
      setScreen(SCREEN.HOME);
      setLastAction(action);
      dispatchBrowserEvent(action);
      return;
    }

    if (action.type === "toggle_saved") {
      toggleSaved(action.vehicle);
      return;
    }

    const explicitVehicle = action.vehicle;
    const vehicleFromQuery = getAciVehicleByQuery(action.query || action.label);
    const targetVehicle = explicitVehicle || vehicleFromQuery;

    if (
      action.type === "open_vehicle" ||
      action.intent === ACI_INTENTS.OPEN_VEHICLE ||
      targetVehicle
    ) {
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

    setLastAction(enrichedAction);
    console.log("ACI Assist V2 action:", enrichedAction);
    dispatchBrowserEvent(enrichedAction);

    /**
     * Backend wiring point:
     *
     * Replace the console/event with:
     * aiAgentApi.chat({
     *   message: enrichedAction.query,
     *   context: {
     *     selectedVehicle,
     *     ...enrichedAction.contextPatch,
     *   },
     * })
     *
     * Then route response.canvasType to the correct canvas.
     */
  };

  return (
    <>
      <AciAssistStyles />

      <style>{`
        .heart-button.is-saved,
        .mobile-heart.is-saved,
        .saved-heart-button.is-saved {
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
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 200;
          max-width: 320px;
          border-radius: 18px;
          border: 1px solid #dbe3ef;
          background: rgba(255,255,255,.96);
          box-shadow: 0 22px 66px -40px rgba(15,23,42,.48);
          padding: 12px 14px;
          color: #334155;
          font-size: 12px;
          line-height: 1.4;
          backdrop-filter: blur(18px);
        }

        .aci-action-toast strong {
          display: block;
          color: #0f172a;
          font-size: 13px;
          margin-bottom: 3px;
        }

        @media (max-width: 900px) {
          .aci-action-toast {
            left: 14px;
            right: 14px;
            bottom: 14px;
            display: none;
          }
        }
      `}</style>

      {screen === SCREEN.HOME ? (
        <AciAssistHomeScreen
          data={homeData}
          onAction={handleAciAction}
          savedIds={savedIds}
          onToggleSaved={toggleSaved}
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
