import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACI_ASSIST_HOME_DATA,
  ACI_CANVAS_TYPES,
  ACI_HOME_IMAGES,
  ACI_INTENTS,
  buildVehicleAction,
  getAciVehicleById,
  getAciVehicleByQuery,
} from "./data/homeScreenData";
import {
  ACI_V2_SCREENS,
  ACI_V2_SCREEN_COMPONENTS,
  normalizeCanvasType as normalizeV2CanvasType,
  resolveScreenFromCanvasType,
} from "./canvas/aciV2CanvasRegistry";
import AciAssistStyles from "./shared/AciAssistStyles";
import { normalizeAciAction } from "./shared/AciAssistShared";
import { getDisplayCarImage } from "./shared/aciV2Image";
import {
  askAciAssistV2,
  fetchAciBrandCatalog,
  fetchAciVehicleLiveSnapshot,
} from "./services/aciAssistV2Api";
import AciAssistHomeScreen from "./screens/AciAssistHomeScreen";
const SCREEN = ACI_V2_SCREENS;
const IMAGE_CACHE_KEY = "aci_v2_live_model_images_v1";

const vehicleIdentityKey = (vehicle = {}) =>
  String(vehicle?.id || vehicle?._id || "")
    .trim()
    .toLowerCase() ||
  `${String(vehicle?.make || vehicle?.brand || "")
    .trim()
    .toLowerCase()}|${String(vehicle?.model || "")
    .trim()
    .toLowerCase()}`;

const mergeVehicle = (fallback, incoming) => {
  if (!incoming) return fallback;

  const fallbackId = fallback?.id || fallback?._id || "";
  const incomingId = incoming?.id || incoming?._id || "";
  const fallbackModel = String(fallback?.model || "").toLowerCase();
  const incomingModel = String(incoming?.model || "").toLowerCase();
  const isSameVehicle =
    (fallbackId && incomingId && fallbackId === incomingId) ||
    (fallbackModel && incomingModel && fallbackModel === incomingModel);

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
    normalizedImageUrl:
      incoming.normalizedImageUrl ||
      incoming.cleanImageUrl ||
      (isSameVehicle ? fallback?.normalizedImageUrl : ""),
    imageUrl:
      getDisplayCarImage(incoming) ||
      incoming.imageUrl ||
      incoming.heroImageUrl ||
      incoming.vehicleImageUrl ||
      incoming.image ||
      (isSameVehicle ? fallback?.imageUrl : ""),
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

const isPriceListCanvas = (value = "") => {
  const canvasType = normalizeV2CanvasType(value);
  return canvasType === ACI_CANVAS_TYPES.PRICELIST || canvasType === "pricelist_canvas";
};

const isColorsCanvas = (value = "") => {
  const canvasType = normalizeV2CanvasType(value);
  return (
    canvasType === ACI_CANVAS_TYPES.COLORS ||
    canvasType === "color_gallery_canvas" ||
    canvasType === "color_studio_canvas"
  );
};

const isCarOverviewCanvas = (value = "") => {
  const canvasType = normalizeV2CanvasType(value);
  return (
    canvasType === ACI_CANVAS_TYPES.CAR_OVERVIEW ||
    canvasType === "car_overview_canvas" ||
    canvasType === "vehicle_overview_canvas"
  );
};

const isFeaturesCanvas = (value = "") => {
  const canvasType = normalizeV2CanvasType(value);
  return (
    canvasType === ACI_CANVAS_TYPES.FEATURES ||
    canvasType === "features_canvas" ||
    canvasType === "feature_explorer_canvas" ||
    canvasType === "features_explorer_canvas"
  );
};

const mergeVehicleData = (base = {}, incoming = {}) => ({
  ...base,
  ...incoming,
  colors:
    Array.isArray(incoming?.colors) && incoming.colors.length
      ? incoming.colors
      : base?.colors,
  variants:
    Array.isArray(incoming?.variants) && incoming.variants.length
      ? incoming.variants
      : base?.variants,
  normalizedImageUrl:
    incoming?.normalizedImageUrl ||
    incoming?.cleanImageUrl ||
    base?.normalizedImageUrl,
  imageUrl: getDisplayCarImage({ ...base, ...incoming }) || base?.imageUrl || "",
});

const BRAND_CANDIDATES = [
  "hyundai",
  "kia",
  "tata",
  "mahindra",
  "maruti",
  "maruti suzuki",
  "toyota",
  "honda",
  "skoda",
  "volkswagen",
  "mg",
  "renault",
  "nissan",
];

const resolveBrandQuery = (text = "") => {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";

  for (const brand of BRAND_CANDIDATES) {
    const brandText = brand.toLowerCase();
    if (
      normalized === brandText ||
      normalized === `show ${brandText}` ||
      normalized === `all ${brandText} cars` ||
      normalized === `${brandText} cars` ||
      normalized.includes(`show ${brandText} cars`) ||
      normalized.includes(`cars of ${brandText}`)
    ) {
      return brandText;
    }
  }

  return "";
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
  const [liveModelImages, setLiveModelImages] = useState({});
  const [liveVehiclePatches, setLiveVehiclePatches] = useState({});
  const pendingLiveFetchRef = useRef(new Map());

  const homeData = useMemo(
    () => ({
      ...ACI_ASSIST_HOME_DATA,
      avatarUrl: ACI_HOME_IMAGES.avatar,
    }),
    [],
  );

  const hydrateVehicleLive = useCallback(async (vehicle, { timeoutMs = 4200 } = {}) => {
    const key = vehicleIdentityKey(vehicle);
    if (!key || !vehicle?.model) return null;

    const existingPending = pendingLiveFetchRef.current.get(key);
    if (existingPending) return existingPending;

    const task = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const snapshot = await fetchAciVehicleLiveSnapshot({
          make: vehicle.make || vehicle.brand || "",
          model: vehicle.model || "",
          city: vehicle.city || "Delhi",
          signal: controller.signal,
        });

        const patch = snapshot?.vehicle || null;
        if (!patch) return null;

        const mergedPatch = mergeVehicleData(vehicle, patch);
        setLiveVehiclePatches((prev) => ({
          ...prev,
          [key]: mergeVehicleData(prev[key] || {}, mergedPatch),
        }));

        if (mergedPatch.imageUrl) {
          setLiveModelImages((prev) => ({
            ...prev,
            [vehicle.id]: mergedPatch.imageUrl,
          }));
          try {
            const cached = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || "{}");
            localStorage.setItem(
              IMAGE_CACHE_KEY,
              JSON.stringify({
                ...(cached && typeof cached === "object" ? cached : {}),
                [vehicle.id]: { url: mergedPatch.imageUrl, ts: Date.now() },
              }),
            );
          } catch {
            // ignore cache write errors
          }
        }

        return snapshot;
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    })();

    pendingLiveFetchRef.current.set(key, task);
    try {
      return await task;
    } finally {
      pendingLiveFetchRef.current.delete(key);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateHomeImages = async () => {
      try {
        const cached = localStorage.getItem(IMAGE_CACHE_KEY);
        if (cached && !cancelled) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            const normalized = Object.fromEntries(
              Object.entries(parsed)
                .map(([id, value]) => [
                  id,
                  typeof value === "string" ? value : value?.url || "",
                ])
                .filter(([, value]) => Boolean(value)),
            );
            setLiveModelImages((prev) => ({ ...normalized, ...prev }));
          }
        }
      } catch {
        // ignore cache read issues
      }

      const candidates = [
        homeData?.selectedVehicle,
        ...(homeData?.trendingCars || []),
        ...(homeData?.rightRail?.savedCars || []),
        ...(homeData?.mobile?.popularCars || []),
      ].filter(Boolean);

      const byId = {};
      for (const vehicle of candidates) {
        if (!vehicle?.id || byId[vehicle.id]) continue;
        byId[vehicle.id] = vehicle;
      }

      const list = Object.values(byId).slice(0, 6);
      const now = Date.now();
      const recentMs = 1000 * 60 * 60 * 6;

      const cachedMap = (() => {
        try {
          const cached = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || "{}");
          return cached && typeof cached === "object" ? cached : {};
        } catch {
          return {};
        }
      })();

      await Promise.allSettled(
        list.map(async (vehicle) => {
          if (cancelled || !vehicle?.id) return;

          const cachedEntry = cachedMap[vehicle.id];
          if (
            cachedEntry?.url &&
            cachedEntry?.ts &&
            now - Number(cachedEntry.ts) < recentMs
          ) {
            if (!cancelled) {
              setLiveModelImages((prev) => ({
                ...prev,
                [vehicle.id]: cachedEntry.url,
              }));
            }
            return;
          }

          await hydrateVehicleLive(vehicle, { timeoutMs: 3200 });
        }),
      );
    };

    hydrateHomeImages().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [homeData, hydrateVehicleLive]);

  const homeDataWithLiveImages = useMemo(() => {
    const patchImage = (vehicle) => {
      if (!vehicle) return vehicle;
      const key = vehicleIdentityKey(vehicle);
      const patch = liveVehiclePatches[key] || {};
      const merged = mergeVehicleData(vehicle, patch);
      const imageUrl = liveModelImages[vehicle.id] || merged.imageUrl || "";
      return { ...merged, imageUrl };
    };

    return {
      ...homeData,
      selectedVehicle: patchImage(homeData?.selectedVehicle),
      trendingCars: (homeData?.trendingCars || []).map(patchImage),
      rightRail: {
        ...(homeData?.rightRail || {}),
        savedCars: (homeData?.rightRail?.savedCars || []).map(patchImage),
      },
      mobile: {
        ...(homeData?.mobile || {}),
        popularCars: (homeData?.mobile?.popularCars || []).map(patchImage),
      },
    };
  }, [homeData, liveModelImages, liveVehiclePatches]);

  const fallbackSelectedVehicle = useMemo(
    () => getAciVehicleById(selectedVehicleId),
    [selectedVehicleId],
  );

  const selectedVehicle = useMemo(
    () =>
      mergeVehicleData(
        mergeVehicle(
          fallbackSelectedVehicle,
          liveVehiclePatches[vehicleIdentityKey(fallbackSelectedVehicle)] || null,
        ),
        activeVehicleOverride || {},
      ),
    [fallbackSelectedVehicle, activeVehicleOverride, liveVehiclePatches],
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

    const key = vehicleIdentityKey(nextVehicle);
    const patchedVehicle = mergeVehicleData(
      nextVehicle,
      liveVehiclePatches[key] || {},
    );

    setSelectedVehicleId(nextVehicle.id);
    setActiveVehicleOverride(patchedVehicle);

    hydrateVehicleLive(patchedVehicle).then((snapshot) => {
      const liveVehicle = snapshot?.vehicle;
      if (!liveVehicle) return;
      setActiveVehicleOverride((prev) =>
        mergeVehicleData(mergeVehicle(prev || patchedVehicle, liveVehicle), liveVehicle),
      );
    });

    return patchedVehicle;
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

    const canvasPayload =
      sourceAction.widget ||
      sourceAction.payload?.widget ||
      sourceAction.payload ||
      { __fromBackend: true };

    setActiveCanvasPayload(
      canvasPayload,
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

    const canvasPayload =
      sourceAction.widget ||
      sourceAction.payload?.widget ||
      sourceAction.payload ||
      { __fromBackend: true };

    setActiveCanvasPayload(
      canvasPayload,
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

  const openFeatures = (vehicle, sourceAction = {}) => {
    const nextVehicle = setSelectedVehicle(vehicle || selectedVehicle);
    if (!nextVehicle?.id) return;

    const canvasPayload =
      sourceAction.widget ||
      sourceAction.payload?.widget ||
      sourceAction.payload ||
      { __fromBackend: true };

    setActiveCanvasPayload(canvasPayload);
    setScreen(SCREEN.FEATURES);

    rememberAction({
      ...sourceAction,
      id: sourceAction.id || `${nextVehicle.id}-features-open`,
      label: sourceAction.label || `${nextVehicle.displayName} features`,
      query: sourceAction.query || `Show features of ${nextVehicle.displayName}`,
      type: "open_canvas",
      intent: ACI_INTENTS.FEATURES,
      canvasType: ACI_CANVAS_TYPES.FEATURES,
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

    const routedScreen = resolveScreenFromCanvasType(canvasType);
    if (routedScreen && routedScreen !== SCREEN.HOME) {
      setSelectedVehicle(backendVehicle);
      setActiveCanvasPayload(widget);
      setScreen(routedScreen);
      rememberAction(enrichedAction);
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
        actionText.includes("compare") ||
        actionText.includes("emi") ||
        actionText.includes("feature") ||
        actionText.includes("quotation") ||
        actionText.includes("quote"),
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
    const brandQuery = resolveBrandQuery(action.query || action.label || "");

    if (brandQuery && !vehicleFromQuery) {
      setIsBackendLoading(true);
      setBackendError("");
      try {
        const brandSnapshot = await fetchAciBrandCatalog({
          brand: brandQuery,
          city: targetVehicle?.city || "Delhi",
        });

        setIsBackendLoading(false);
        setScreen(SCREEN.BRANDS);
        setActiveCanvasPayload({
          __fromBackend: true,
          canvasType: "brand_models_canvas",
          brand: brandQuery,
          title: `${brandQuery[0]?.toUpperCase() || ""}${brandQuery.slice(1)} cars`,
          answer: `Showing live ${brandQuery} models. Tap any car to open details.`,
          rows: brandSnapshot?.rows || [],
          actions: [],
          leadingQuestions: [],
        });

        rememberAction({
          ...action,
          canvasType: "brand_models_canvas",
          widget: {
            rows: brandSnapshot?.rows || [],
          },
        });
        return;
      } catch (error) {
        setIsBackendLoading(false);
        setBackendError(error?.message || "Unable to fetch brand cars");
      }
    }

    const shouldOpenPriceList =
      isPriceListCanvas(action.canvasType) ||
      action.intent === ACI_INTENTS.PRICELIST ||
      actionText.includes("price list") ||
      actionText.includes("pricelist") ||
      actionText.includes("prices");

    if (shouldOpenPriceList) {
      setBackendError("");
      openPriceList(targetVehicle, action);
      hydrateVehicleLive(targetVehicle, { timeoutMs: 4500 });
      return;
    }

    const shouldOpenColors =
      isColorsCanvas(action.canvasType) ||
      action.intent === ACI_INTENTS.COLORS ||
      actionText.includes("color") ||
      actionText.includes("colour");

    if (shouldOpenColors) {
      setBackendError("");
      openColors(targetVehicle, action);
      hydrateVehicleLive(targetVehicle, { timeoutMs: 4500 });
      return;
    }

    const shouldOpenFeatures =
      isFeaturesCanvas(action.canvasType) ||
      action.intent === ACI_INTENTS.FEATURES ||
      actionText.includes("feature");

    if (shouldOpenFeatures) {
      setBackendError("");
      openFeatures(targetVehicle, action);
      hydrateVehicleLive(targetVehicle, { timeoutMs: 4500 });
      return;
    }

    const shouldOpenVehicle =
      action.type === "open_vehicle" ||
      action.intent === ACI_INTENTS.OPEN_VEHICLE ||
      Boolean(vehicleFromQuery);

    if (shouldOpenVehicle) {
      setBackendError("");
      openVehicle(targetVehicle, action);
      hydrateVehicleLive(targetVehicle, { timeoutMs: 4500 });
      return;
    }

    const routedScreen = resolveScreenFromCanvasType(action.canvasType);
    if (
      routedScreen &&
      ![SCREEN.HOME, SCREEN.CAR_OVERVIEW, SCREEN.COLORS, SCREEN.PRICELIST].includes(routedScreen)
    ) {
      setBackendError("");
      setSelectedVehicle(targetVehicle);
      setActiveCanvasPayload(
        action.widget ||
          action.payload?.widget ||
          action.payload ||
          { __fromBackend: true },
      );
      setScreen(routedScreen);
      rememberAction(action);
      return;
    }

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
          data={homeDataWithLiveImages}
          onAction={handleAciAction}
          savedIds={savedIds}
          onToggleSaved={toggleSaved}
        />
      ) : (
        (() => {
          const ScreenComponent =
            ACI_V2_SCREEN_COMPONENTS[screen] ||
            ACI_V2_SCREEN_COMPONENTS[SCREEN.CAR_OVERVIEW];
          return (
            <ScreenComponent
              data={homeDataWithLiveImages}
              vehicle={selectedVehicle}
              widget={activeCanvasPayload}
              onAction={handleAciAction}
              savedIds={savedIds}
              onToggleSaved={toggleSaved}
            />
          );
        })()
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
