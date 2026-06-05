const isObject = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);

export const firstValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

export const getVehicleId = (vehicle = {}) =>
  firstValue(vehicle?.id, vehicle?._id, vehicle?.vehicleId, vehicle?.modelId);

export const getVehicleModelKey = (vehicle = {}) =>
  String(firstValue(vehicle?.model, vehicle?.modelName) || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getVehicleTitle = (vehicle = {}) =>
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
      vehicle?.modelName ||
      vehicle?.name ||
      vehicle?.displayName,
  );

export const normalizeVehicle = (vehicle) => {
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

export const mergeVehicle = (base, incoming) => {
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

const getPatchVehicle = (patch = {}) =>
  patch?.selectedVehicle || patch?.vehicle || patch?.activeVehicle || null;

export const mergeSessionContext = (previous = {}, patch = {}) => {
  const rawPatchSelectedVehicle = getPatchVehicle(patch);
  const patchHasAnchorVariant = hasOwn(patch, "anchorVariant");
  const patchHasAnchorModel =
    hasOwn(patch, "anchorModel") && Boolean(String(patch.anchorModel || "").trim());

  const previousVehicleKey = getVehicleModelKey(
    previous.selectedVehicle || { model: previous.anchorModel },
  );
  const patchModelKey = patchHasAnchorModel
    ? getVehicleModelKey({ model: patch.anchorModel })
    : "";
  const rawPatchVehicleKey = getVehicleModelKey(rawPatchSelectedVehicle);
  const patchVehicleConflictsAnchor = Boolean(
    patchModelKey && rawPatchVehicleKey && patchModelKey !== rawPatchVehicleKey,
  );
  const patchSelectedVehicle = patchVehicleConflictsAnchor
    ? null
    : rawPatchSelectedVehicle;
  const patchVehicleKey = getVehicleModelKey(patchSelectedVehicle);

  const patchModelChangedVehicle = Boolean(
    patchModelKey && previousVehicleKey && patchModelKey !== previousVehicleKey,
  );
  const patchVehicleChangedVehicle = Boolean(
    patchVehicleKey && previousVehicleKey && patchVehicleKey !== previousVehicleKey,
  );
  const vehicleChanged = patchModelChangedVehicle || patchVehicleChangedVehicle;

  const mergedSelectedVehicle = mergeVehicle(previous.selectedVehicle, patchSelectedVehicle);
  const selectedVehicle =
    vehicleChanged && !patchSelectedVehicle ? null : mergedSelectedVehicle;

  const patchSelectedVehicleHasVariant =
    hasOwn(patchSelectedVehicle || {}, "variant") ||
    hasOwn(patchSelectedVehicle || {}, "variantName") ||
    hasOwn(patchSelectedVehicle || {}, "selectedVariant");

  const patchSelectedVehicleVariant = firstValue(
    patchSelectedVehicle?.variant,
    patchSelectedVehicle?.variantName,
    patchSelectedVehicle?.selectedVariant,
  );

  const patchClearsVariant =
    (patchHasAnchorVariant && !String(patch.anchorVariant || "").trim()) ||
    (patchSelectedVehicleHasVariant && !patchSelectedVehicleVariant) ||
    vehicleChanged;

  const scopedSelectedVehicle = selectedVehicle
    ? {
        ...selectedVehicle,
        ...(patchClearsVariant
          ? {
              variant: "",
              variantName: "",
              selectedVariant: "",
            }
          : {}),
      }
    : selectedVehicle;

  const canReusePreviousVehicleAnchors = !vehicleChanged;

  return {
    ...previous,
    ...patch,
    selectedVehicle:
      scopedSelectedVehicle ||
      (canReusePreviousVehicleAnchors ? previous.selectedVehicle : null) ||
      null,
    anchorMake: firstValue(
      patch.anchorMake,
      scopedSelectedVehicle?.make,
      scopedSelectedVehicle?.brand,
      canReusePreviousVehicleAnchors ? previous.anchorMake : "",
    ),
    anchorModel: firstValue(
      patch.anchorModel,
      scopedSelectedVehicle?.model,
      canReusePreviousVehicleAnchors ? previous.anchorModel : "",
    ),
    anchorFullModel: firstValue(
      patch.anchorFullModel,
      scopedSelectedVehicle?.fullModel,
      scopedSelectedVehicle?.displayName,
      patch.anchorModel,
      scopedSelectedVehicle?.model,
      canReusePreviousVehicleAnchors ? previous.anchorFullModel : "",
    ),
    anchorVariant: patchHasAnchorVariant
      ? String(patch.anchorVariant || "")
      : patchClearsVariant
        ? ""
        : firstValue(
            scopedSelectedVehicle?.variant,
            scopedSelectedVehicle?.variantName,
            scopedSelectedVehicle?.selectedVariant,
            canReusePreviousVehicleAnchors ? previous.anchorVariant : "",
          ),
    anchorCity: firstValue(
      patch.anchorCity,
      scopedSelectedVehicle?.citySlug,
      scopedSelectedVehicle?.city,
      previous.anchorCity,
      "new-delhi",
    ),
    selectedColor: hasOwn(patch, "selectedColor")
      ? patch.selectedColor
      : vehicleChanged
        ? null
        : previous.selectedColor || null,
  };
};

export const compactColorForBackend = (color = {}) => {
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

export const compactVehicleForBackend = (vehicle = {}) => {
  const normalized = normalizeVehicle(vehicle);
  if (!normalized) return null;

  const variant = firstValue(
    normalized.variant,
    normalized.variantName,
    normalized.selectedVariant,
  );

  return {
    make: firstValue(normalized.make, normalized.brand),
    model: normalized.model || "",
    fullModel: normalized.fullModel || "",
    makeKey: normalized.makeKey || "",
    modelKey: normalized.modelKey || "",
    shortModelKey: normalized.shortModelKey || "",
    variant,
    variantKey: normalized.variantKey || "",
    fuelType: firstValue(normalized.fuelType, normalized.fuel),
    fuelKey: normalized.fuelKey || "",
    transmission: normalized.transmission || "",
    transmissionKey: normalized.transmissionKey || "",
    city: firstValue(normalized.city, normalized.cityName),
    citySlug: normalized.citySlug || "",
    confidence: normalized.confidence || 0,
    source: normalized.source || "",
  };
};

const compactAciContextStateForBackend = (state = {}) => {
  if (!isObject(state)) return null;
  const selectedVehicle = compactVehicleForBackend(state.selectedVehicle || {});
  const comparisonVehicles = Array.isArray(state.activeComparison?.vehicles)
    ? state.activeComparison.vehicles.map(compactVehicleForBackend).filter(Boolean)
    : [];

  return {
    schemaVersion: state.schemaVersion || "aci_context_state_v1",
    selectedVehicle: selectedVehicle || {},
    activeComparison: {
      vehicles: comparisonVehicles,
      fuelKey: state.activeComparison?.fuelKey || "",
      transmissionKey: state.activeComparison?.transmissionKey || "",
      city: state.activeComparison?.city || "",
      citySlug: state.activeComparison?.citySlug || "",
      features: Array.isArray(state.activeComparison?.features)
        ? state.activeComparison.features
        : [],
      confidence: state.activeComparison?.confidence || 0,
      source: state.activeComparison?.source || "",
    },
    requested: {
      facts: isObject(state.requested?.facts) ? state.requested.facts : {},
      features: Array.isArray(state.requested?.features) ? state.requested.features : [],
      topics: Array.isArray(state.requested?.topics) ? state.requested.topics : [],
      specAttributes: Array.isArray(state.requested?.specAttributes)
        ? state.requested.specAttributes
        : [],
      topic: state.requested?.topic || "",
      budget: isObject(state.requested?.budget) ? state.requested.budget : {},
      city: state.requested?.city || "",
      citySlug: state.requested?.citySlug || "",
    },
    anchors: {
      primaryVehicle: compactVehicleForBackend(state.anchors?.primaryVehicle || {}) || {},
      comparisonTargets: Array.isArray(state.anchors?.comparisonTargets)
        ? state.anchors.comparisonTargets.map(compactVehicleForBackend).filter(Boolean)
        : [],
    },
    confidence: {
      entityConfidence: state.confidence?.entityConfidence || 0,
      modelConfidence: state.confidence?.modelConfidence || 0,
      variantConfidence: state.confidence?.variantConfidence || 0,
      contextConfidence: state.confidence?.contextConfidence || 0,
      resolutionSource: state.confidence?.resolutionSource || "",
    },
    provenance: {
      sources: Array.isArray(state.provenance?.sources) ? state.provenance.sources : [],
      warnings: Array.isArray(state.provenance?.warnings) ? state.provenance.warnings : [],
      isolation: state.provenance?.isolation || "",
      updatedBy: state.provenance?.updatedBy || "",
    },
  };
};

export const compactContextForBackend = ({
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

  const hasExplicitAnchorVariant = hasOwn(effectiveContext, "anchorVariant");
  const anchorVariant = hasExplicitAnchorVariant
    ? String(effectiveContext.anchorVariant || "")
    : firstValue(
        selectedVehicle?.variant,
        selectedVehicle?.variantName,
        selectedVehicle?.selectedVariant,
      );

  const durableContextState = compactAciContextStateForBackend(
      effectiveContext.contextState ||
      effectiveContext.aciContextState ||
      action.contextPatch?.contextState ||
      action.contextPatch?.aciContextState ||
      null,
  );

  return {
    contextState: durableContextState,
    aciContextState: durableContextState,
    selectedVehicle: selectedVehicle
      ? {
          ...selectedVehicle,
          variant: anchorVariant,
          variantName: anchorVariant,
          selectedVariant: anchorVariant,
        }
      : null,
    anchorMake: firstValue(
      effectiveContext.anchorMake,
      selectedVehicle?.make,
      selectedVehicle?.brand,
    ),
    anchorModel: firstValue(
      effectiveContext.anchorModel,
      selectedVehicle?.model,
    ),
    anchorVariant,
    anchorCity: firstValue(
      effectiveContext.anchorCity,
      selectedVehicle?.citySlug,
      selectedVehicle?.city,
      "new-delhi",
    ),
    selectedColor,
    selectedComparisonSet: effectiveContext.selectedComparisonSet || {},
    activeComparison:
      effectiveContext.activeComparison ||
      effectiveContext.contextState?.activeComparison ||
      effectiveContext.aciContextState?.activeComparison ||
      {},
    activeScreen: screen || effectiveContext.activeScreen || "",
    activeCanvasType: firstValue(
      activeCanvasPayload?.canvasType,
      activeCanvasPayload?.__rawCanvasType,
      effectiveContext.activeCanvasType,
      effectiveContext.lastCanvasType,
    ),
    lastIntent: firstValue(action.intent, lastAction?.intent, effectiveContext.lastIntent),
    lastActionLabel: firstValue(action.label, lastAction?.label),
    lastActionQuery: firstValue(action.query, lastAction?.query),
  };
};

export const buildVehicleContextPatch = ({
  vehicle,
  variant,
  city,
  includeVariant = true,
} = {}) => {
  const normalized = normalizeVehicle(vehicle);
  if (!normalized) return {};

  const nextVariant = includeVariant
    ? firstValue(variant, normalized.variant, normalized.variantName, normalized.selectedVariant)
    : "";

  return {
    selectedVehicle: {
      ...normalized,
      variant: nextVariant,
      variantName: nextVariant,
      selectedVariant: nextVariant,
    },
    anchorMake: firstValue(normalized.make, normalized.brand),
    anchorModel: normalized.model || "",
    anchorFullModel: firstValue(normalized.fullModel, normalized.displayName),
    anchorVariant: nextVariant,
    anchorCity: firstValue(city, normalized.citySlug, normalized.city, "new-delhi"),
  };
};

export const getDisplayVehicleFromContext = (context = {}) => {
  const anchorModel = firstValue(context.anchorModel, context.model);
  const anchorMake = firstValue(context.anchorMake, context.anchorBrand, context.make);
  const anchorVariant = hasOwn(context, "anchorVariant")
    ? String(context.anchorVariant || "")
    : firstValue(context.variant);
  const selectedVehicle = normalizeVehicle(context.selectedVehicle);
  const anchorKey = getVehicleModelKey({ model: anchorModel });
  const selectedKey = getVehicleModelKey(selectedVehicle);
  const selectedMatchesAnchor =
    !anchorKey || !selectedKey || anchorKey === selectedKey;

  if (selectedVehicle && selectedMatchesAnchor) {
    return {
      ...selectedVehicle,
      make: firstValue(selectedVehicle.make, selectedVehicle.brand, anchorMake),
      brand: firstValue(selectedVehicle.brand, selectedVehicle.make, anchorMake),
      model: firstValue(anchorModel, selectedVehicle.model),
      displayName: firstValue(anchorModel, selectedVehicle.displayName, selectedVehicle.model),
      variant: anchorVariant,
      variantName: anchorVariant,
      selectedVariant: anchorVariant,
    };
  }

  if (!anchorModel) return null;

  return {
    make: anchorMake,
    brand: anchorMake,
    model: anchorModel,
    modelName: anchorModel,
    displayName: anchorModel,
    fullModel: firstValue(context.anchorFullModel, anchorMake && anchorModel ? `${anchorMake} ${anchorModel}` : anchorModel),
    variant: anchorVariant,
    variantName: anchorVariant,
    selectedVariant: anchorVariant,
    city: firstValue(context.anchorCity, context.city, "new-delhi"),
    citySlug: firstValue(context.anchorCity, context.citySlug, "new-delhi"),
  };
};
