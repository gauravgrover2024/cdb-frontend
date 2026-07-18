import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  Car,
  CarFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Fuel,
  IndianRupee,
  ListChecks,
  Palette,
  Scale,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  fetchAciVehicleFuelProfile,
  fetchAciVehicleImage,
  fetchAciVehicleLiveSnapshot,
} from "../services/aciAssistV2Api";

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

const modelKey = (value = "") =>
  clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");

const formatPrice = (value) => {
  const amount = Number(value || 0);
  if (!amount) return "—";
  const compact = (number) => Number(number.toFixed(2)).toString();
  if (amount >= 10000000) return `₹${compact(amount / 10000000)}Cr`;
  if (amount >= 100000) return `₹${compact(amount / 100000)}L`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
};

const firstText = (...values) =>
  values.map(clean).find(Boolean) || "";

const numericPrice = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = clean(value).replace(/,/g, "");
  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return 0;
  const amount = Number(match[0]);
  if (/\bcr(?:ore)?\b/i.test(text)) return amount * 10000000;
  if (/\b(?:l|lac|lakh)\b/i.test(text) || amount < 250) return amount * 100000;
  return amount;
};

const compactVariantName = (value = "", vehicle = {}) => {
  let label = clean(value);
  const brand = clean(vehicle.brand || vehicle.make);
  const model = clean(vehicle.model);
  const fullModel = clean(vehicle.fullModel || [brand, model].filter(Boolean).join(" "));
  const prefixes = [fullModel, [brand, model].filter(Boolean).join(" "), model, brand]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);

  prefixes.forEach((prefix) => {
    label = label.replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "");
  });
  return clean(label) || clean(value);
};

const blockRows = (block = {}) =>
  asArray(block.widget?.rows || block.widget?.items || block.rows);

const blockVehicleName = (block = {}) => {
  const vehicle = block.widget?.vehicle || block.vehicle || {};
  return clean(
    vehicle.displayName ||
      vehicle.fullModel ||
      [vehicle.make || vehicle.brand, vehicle.model].filter(Boolean).join(" ") ||
      block.title?.replace(/\s+(colors?|colours?|price list)$/i, ""),
  );
};

const openBlockMessage = (block = {}) => ({
  ...block,
  role: "assistant",
  text: block.answer || block.widget?.answer || "",
  answer: block.answer || block.widget?.answer || "",
  widget: block.widget || {},
  rows: blockRows(block),
  vehicle: block.widget?.vehicle || block.vehicle || null,
  contextPatch: block.widget?.contextPatch || block.contextPatch || {},
});

const findRelatedBlock = (blocks = [], name = "") => {
  const key = modelKey(name);
  const exact = blocks.find((block) => modelKey(blockVehicleName(block)) === key);
  if (exact) return exact;

  return blocks.find((block) => {
    const candidate = modelKey(blockVehicleName(block));
    return Boolean(candidate && key && (candidate.endsWith(key) || key.endsWith(candidate)));
  });
};

function CarVisual({ imageUrl, name, priority = false }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  if (!imageUrl || failed) {
    return (
      <div className="aci-compound-car-fallback" aria-hidden="true">
        <span>{clean(name).slice(0, 1) || "C"}</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      loading={priority ? "eager" : "lazy"}
      fetchpriority={priority ? "high" : "auto"}
      decoding="async"
      draggable="false"
      onError={() => setFailed(true)}
    />
  );
}

export function AciV2CompoundInlineCard({ blocks = [], onOpen }) {
  const [showFeatureExamples, setShowFeatureExamples] = useState(false);
  const presentation = useMemo(() => {
    const list = asArray(blocks);
    const featureBlock = list.find((block) => /feature/.test(block.intent || block.canvasType));
    const priceBlocks = list.filter((block) => /price|pricelist/.test(block.intent || block.canvasType));
    const colorBlocks = list.filter((block) => /color|colour/.test(block.intent || block.canvasType));
    const featureRows = blockRows(featureBlock);
    const featureModels = asArray(featureRows[0]?.models);
    const modelNames = [
      ...featureModels.map((item) => clean(item.fullModel || [item.make, item.model].filter(Boolean).join(" "))),
      ...priceBlocks.map(blockVehicleName),
      ...colorBlocks.map(blockVehicleName),
    ].filter((item, index, all) => item && all.findIndex((candidate) => modelKey(candidate) === modelKey(item)) === index);

    const models = modelNames.slice(0, 2).map((name) => {
      const key = modelKey(name);
      const priceBlock = findRelatedBlock(priceBlocks, name);
      const colorBlock = findRelatedBlock(colorBlocks, name);
      const featureModel = featureModels.find((item) => {
        const label = item.fullModel || [item.make, item.model].filter(Boolean).join(" ");
        return modelKey(label).includes(key) || key.includes(modelKey(label));
      }) || {};
      const priceRows = blockRows(priceBlock)
        .filter((row) => Number(row.exShowroomPrice || row.exShowroomPriceValue || 0) > 0)
        .sort((left, right) => Number(left.exShowroomPrice || left.exShowroomPriceValue) - Number(right.exShowroomPrice || right.exShowroomPriceValue));
      const entry = priceRows[0] || {};
      const vehicle = priceBlock?.widget?.vehicle || colorBlock?.widget?.vehicle || {};
      return {
        name,
        imageUrl:
          vehicle.normalizedImageUrl ||
          vehicle.imageUrl ||
          blockRows(colorBlock)[0]?.normalizedImageUrl ||
          blockRows(colorBlock)[0]?.imageUrl ||
          "",
        priceBlock,
        colorBlock,
        exShowroom: Number(entry.exShowroomPrice || entry.exShowroomPriceValue || 0),
        onRoad: Number(entry.onRoadPrice || entry.onRoadPriceWithoutOptional || 0),
        colorCount: colorBlock ? blockRows(colorBlock).length : null,
        availableCount: featureBlock ? Number(featureModel.availableCount || 0) : null,
        totalVariants: featureBlock
          ? Number(featureModel.totalVariants || featureModel.checkedVariants || 0)
          : null,
        featureLabel: featureBlock
          ? clean(featureRows[0]?.displayName || featureRows[0]?.feature || "Requested feature")
          : "",
        previewVariants: asArray(featureModel.previewVariants).slice(0, 4),
      };
    });

    const capabilityCount = [featureBlock, priceBlocks.length, colorBlocks.length].filter(Boolean).length;
    return {
      models,
      featureBlock,
      title: models.length >= 2 ? `${models[0].name} vs ${models[1].name}` : "Compare cars",
      subtitle: capabilityCount > 1
        ? "Prices, features and colours together."
        : "Current prices shown side by side.",
    };
  }, [blocks]);

  if (presentation.models.length < 2) return null;

  return (
    <section className="aci-compound-card" aria-label="Complete comparison answer">
      <header className="aci-vehicle-card-header">
        <div>
          <span>Side-by-side</span>
          <h3>{presentation.title}</h3>
          <p>{presentation.subtitle}</p>
        </div>
      </header>
      <div className="aci-compound-grid">
        {presentation.models.map((model, index) => (
          <article
              className="aci-compound-model aci-vehicle-choice-card"
              key={modelKey(model.name)}
              style={{ "--aci-item-index": index }}
            >
            <div className="aci-compound-model-visual">
              <CarVisual imageUrl={model.imageUrl} name={model.name} priority={index === 0} />
            </div>
            <div className="aci-compound-model-copy">
              <h4>{model.name}</h4>
              <div className="aci-compound-facts">
                {model.exShowroom ? (
                  <span><IndianRupee size={14} /><b>{formatPrice(model.exShowroom)}</b><small>ex-showroom from</small></span>
                ) : null}
                {model.totalVariants ? (
                  <span><Sparkles size={14} /><b>{model.availableCount}/{model.totalVariants}</b><small>{model.featureLabel} variants</small></span>
                ) : null}
                {model.colorCount ? (
                  <span><Palette size={14} /><b>{model.colorCount}</b><small>colours</small></span>
                ) : null}
              </div>
              <div className="aci-compound-model-actions">
                {model.priceBlock ? (
                  <button type="button" onClick={() => onOpen?.(openBlockMessage(model.priceBlock))}>
                    <ListChecks size={14} /><span>Price list</span><ArrowRight size={13} />
                  </button>
                ) : null}
                {model.colorBlock ? (
                  <button type="button" onClick={() => onOpen?.(openBlockMessage(model.colorBlock))}>
                    <Palette size={14} /><span>Colours</span><ArrowRight size={13} />
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
      {presentation.featureBlock ? (
        <>
          {showFeatureExamples ? (
            <div className="aci-compound-feature-examples">
              {presentation.models.map((model) => (
                <div key={`feature-${modelKey(model.name)}`}>
                  <strong>{model.name}</strong>
                  <span>{model.previewVariants.join(" · ") || "Open the model feature list for variant details."}</span>
                </div>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="aci-compound-feature-action"
            aria-expanded={showFeatureExamples}
            onClick={() => setShowFeatureExamples((visible) => !visible)}
          >
            <span><Check size={15} /> {showFeatureExamples ? "Hide" : "Show"} {presentation.models[0].featureLabel} variant examples</span>
            <ArrowRight size={15} />
          </button>
        </>
      ) : null}
    </section>
  );
}

const firstRecommendationList = (...values) => {
  for (const value of values) {
    const rows = asArray(value);
    if (rows.length) return rows;
  }
  return [];
};

const recommendationRows = (message = {}, widget = {}) =>
  firstRecommendationList(
    widget.previewModelGroups,
    widget.data?.previewModelGroups,
    message.previewModelGroups,
    message.data?.previewModelGroups,
    widget.rows,
    message.rows,
    widget.items,
    message.items,
    widget.modelGroups,
    widget.data?.modelGroups,
    message.modelGroups,
    message.data?.modelGroups,
    widget.fullModelGroups,
    widget.data?.fullModelGroups,
    message.fullModelGroups,
    message.data?.fullModelGroups,
  ).filter((row) => clean(row.fullModel || row.displayName || row.model));

const fullRecommendationRows = (message = {}, widget = {}) =>
  firstRecommendationList(
    widget.modelGroups,
    widget.data?.modelGroups,
    message.modelGroups,
    message.data?.modelGroups,
    widget.fullModelGroups,
    widget.data?.fullModelGroups,
    message.fullModelGroups,
    message.data?.fullModelGroups,
    widget.rows,
    message.rows,
    widget.items,
    message.items,
  ).filter((row) => clean(row.fullModel || row.displayName || row.model));

const recommendationName = (row = {}) =>
  clean(
    row.fullModel ||
      row.displayName ||
      [row.make || row.brand, row.model].filter(Boolean).join(" ") ||
      row.model,
  );

const vehicleSource = (row = {}) => row.vehicle || row.selectedVehicle || row;

const FUEL_LABELS = {
  petrol: "Petrol",
  diesel: "Diesel",
  cng: "CNG",
  electric: "Electric",
  hybrid: "Hybrid",
};

const fuelCategoryFromText = (value = "") => {
  const text = clean(value).toLowerCase();
  if (/\b(?:electric|bev|ev)\b/.test(text)) return "electric";
  if (/\b(?:hybrid|mhev|hev)\b/.test(text)) return "hybrid";
  if (/\bcng\b/.test(text)) return "cng";
  if (/\bdiesel\b/.test(text)) return "diesel";
  if (/\b(?:petrol|gasoline)\b/.test(text)) return "petrol";
  return "";
};

const recommendationFuelCategories = (row = {}, fuelProfile = null) => {
  const source = vehicleSource(row);
  const variant = asArray(row.variants || source.variants)[0] || {};
  const hasFuelOptions = Object.prototype.hasOwnProperty.call(row, "fuelOptions") ||
    Object.prototype.hasOwnProperty.call(source, "fuelOptions");
  const optionFuels = asArray(row.fuelOptions || source.fuelOptions)
    .map((item) => fuelCategoryFromText(item.fuelType || item.fuel || item.fuelKey))
    .filter(Boolean);
  if (hasFuelOptions) return [...new Set(optionFuels)];

  const listedFuels = asArray(
    row.fuelTypes || row.fuels || source.fuelTypes || source.fuels,
  )
    .map(fuelCategoryFromText)
    .filter(Boolean);
  if (listedFuels.length) return [...new Set(listedFuels)];

  const qualifyingFuels = asArray(
    row.qualifyingVariants || source.qualifyingVariants,
  )
    .map((item) => fuelCategoryFromText(item.fuelType || item.fuel || item.variant))
    .filter(Boolean);
  if (qualifyingFuels.length) return [...new Set(qualifyingFuels)];

  const explicitFuel = fuelCategoryFromText([
    row.fuelType,
    row.fuel,
    source.fuelType,
    source.fuel,
    variant.fuelType,
    variant.fuel,
    row.startsFromVariant,
    row.bestUnderBudgetVariant,
    recommendationName(row),
  ].filter(Boolean).join(" "));
  if (explicitFuel) return [explicitFuel];

  const requestedVariant = modelKey(firstText(
    row.startsFromVariant,
    row.bestUnderBudgetVariant,
    typeof row.variant === "string" ? row.variant : "",
    typeof source.variant === "string" ? source.variant : "",
  ));
  const profileVariants = asArray(fuelProfile?.variants);
  const matchedVariant = requestedVariant
    ? profileVariants.find((item) => {
      const candidate = modelKey(item.variant);
      return candidate === requestedVariant ||
        candidate.includes(requestedVariant) ||
        requestedVariant.includes(candidate);
    })
    : null;
  const matchedFuel = fuelCategoryFromText(matchedVariant?.fuel);
  if (matchedFuel) return [matchedFuel];

  const profileFuels = [
    ...new Set(asArray(fuelProfile?.fuels).map(fuelCategoryFromText).filter(Boolean)),
  ];
  if (profileFuels.length) return profileFuels;
  return ["petrol"];
};

const rowForFuel = (row = {}, fuelCategory = "petrol") => {
  const source = vehicleSource(row);
  const compactFuelOption = asArray(row.fuelOptions || source.fuelOptions).find(
    (option) => fuelCategoryFromText(option.fuelType || option.fuel) === fuelCategory,
  );
  if (compactFuelOption) {
    return {
      ...row,
      fuelType: FUEL_LABELS[fuelCategory] || compactFuelOption.fuelType,
      startsFromVariant: compactFuelOption.startsFromVariant || row.startsFromVariant,
      startsFromPrice: compactFuelOption.startsFromPrice || row.startsFromPrice,
      startsFromPriceLabel: compactFuelOption.startsFromPriceLabel || row.startsFromPriceLabel,
      bestUnderBudgetVariant: compactFuelOption.bestUnderBudgetVariant || row.bestUnderBudgetVariant,
      bestUnderBudgetPrice: compactFuelOption.bestUnderBudgetPrice || row.bestUnderBudgetPrice,
      bestUnderBudgetPriceLabel: compactFuelOption.bestUnderBudgetPriceLabel || row.bestUnderBudgetPriceLabel,
      transmission: compactFuelOption.transmission || row.transmission,
      transmissions: compactFuelOption.transmissions || row.transmissions,
    };
  }
  const qualifying = asArray(row.qualifyingVariants || source.qualifyingVariants)
    .filter((variant) => fuelCategoryFromText(
      variant.fuelType || variant.fuel || variant.variant,
    ) === fuelCategory)
    .sort((left, right) => (
      numericPrice(left.exShowroomPrice || left.exShowroom || left.price) -
      numericPrice(right.exShowroomPrice || right.exShowroom || right.price)
    ));
  if (!qualifying.length) return row;

  const first = qualifying[0];
  const last = qualifying[qualifying.length - 1];
  return {
    ...row,
    fuelType: FUEL_LABELS[fuelCategory] || first.fuelType || first.fuel,
    startsFromVariant: first.variant || first.variantName || row.startsFromVariant,
    startsFromPrice: first.exShowroomPrice || first.exShowroom || first.price || row.startsFromPrice,
    startsFromPriceLabel: first.exShowroomPriceLabel || row.startsFromPriceLabel,
    bestUnderBudgetVariant: last.variant || last.variantName || row.bestUnderBudgetVariant,
    bestUnderBudgetPrice: last.exShowroomPrice || last.exShowroom || last.price || row.bestUnderBudgetPrice,
    bestUnderBudgetPriceLabel: last.exShowroomPriceLabel || row.bestUnderBudgetPriceLabel,
    qualifyingVariants: qualifying,
  };
};

const requestedFuelCategory = (message = {}, widget = {}) => {
  const filters = {
    ...(message.data?.filters || {}),
    ...(message.filters || {}),
    ...(widget.data?.filters || {}),
    ...(widget.filters || {}),
  };
  const text = clean([
    filters.fuel,
    filters.fuelType,
    widget.query,
    widget.originalQuery,
    widget.userQuery,
    message.query,
    message.originalQuery,
    message.userQuery,
  ].filter(Boolean).join(" ")).toLowerCase();
  if (/\b(?:electric|bev|ev)\b/.test(text)) return "electric";
  if (/\b(?:hybrid|mhev|hev)\b/.test(text)) return "hybrid";
  if (/\bcng\b/.test(text)) return "cng";
  if (/\bdiesel\b/.test(text)) return "diesel";
  if (/\b(?:petrol|gasoline)\b/.test(text)) return "petrol";
  return "petrol";
};

const requestedTransmissionCategory = (message = {}, widget = {}) => {
  const filters = {
    ...(message.data?.filters || {}),
    ...(message.filters || {}),
    ...(widget.data?.filters || {}),
    ...(widget.filters || {}),
  };
  const text = clean([
    filters.transmission,
    filters.transmissionType,
    filters.transmissionKey,
    widget.query,
    widget.originalQuery,
    widget.userQuery,
    message.query,
    message.originalQuery,
    message.userQuery,
  ].filter(Boolean).join(" ")).toLowerCase();
  if (/\b(?:automatic|auto|amt|cvt|dct|ivt|dsg|at)\b/.test(text)) return "automatic";
  if (/\b(?:manual|mt)\b/.test(text)) return "manual";
  return "";
};

const isTaxiProduct = (row = {}) => {
  const source = vehicleSource(row);
  const flags = [
    row.isTaxi,
    row.isCommercial,
    row.commercialOnly,
    source.isTaxi,
    source.isCommercial,
    source.commercialOnly,
  ];
  if (flags.some(Boolean)) return true;
  const text = clean([
    recommendationName(row),
    row.segment,
    row.category,
    row.productType,
    row.usageType,
    source.segment,
    source.category,
    source.productType,
    source.usageType,
  ].filter(Boolean).join(" ")).toLowerCase();
  return /\b(?:taxi|cab|fleet|commercial|cargo|goods?|pickup|pick[\s-]*up|tour|xpres(?:[\s-]*t)?|super\s+carry|dost|intra)\b/.test(text);
};

const LIVE_VEHICLE_CACHE_TTL_MS = 10 * 60 * 1000;
const LIVE_VEHICLE_CACHE_LIMIT = 100;
const liveVehicleCache = new Map();
const liveVehiclePending = new Map();

const liveVehicleRequestKey = ({ make = "", model = "", city = "", requireDetails = false } = {}) =>
  [requireDetails ? "details" : "image", make, model, requireDetails ? city : ""]
    .map(modelKey)
    .join(":");

const fetchCachedLiveVehicle = async ({ make, model, city, requireDetails = false }) => {
  const key = liveVehicleRequestKey({ make, model, city, requireDetails });
  const cached = liveVehicleCache.get(key);
  if (cached && Date.now() - cached.savedAt < LIVE_VEHICLE_CACHE_TTL_MS) {
    return cached.vehicle;
  }
  if (liveVehiclePending.has(key)) return liveVehiclePending.get(key);

  const request = (requireDetails
    ? fetchAciVehicleLiveSnapshot({ make, model, city }).then((snapshot) => snapshot?.vehicle || null)
    : fetchAciVehicleImage({ make, model }).then((imageUrl) => imageUrl
      ? { make, model, city, imageUrl, heroImageUrl: imageUrl }
      : null))
    .then((vehicle) => {
      if (vehicle) {
        liveVehicleCache.delete(key);
        liveVehicleCache.set(key, { savedAt: Date.now(), vehicle });
        while (liveVehicleCache.size > LIVE_VEHICLE_CACHE_LIMIT) {
          liveVehicleCache.delete(liveVehicleCache.keys().next().value);
        }
      }
      return vehicle;
    })
    .catch(() => null)
    .finally(() => liveVehiclePending.delete(key));

  liveVehiclePending.set(key, request);
  return request;
};

const useLiveVehicleMap = (rows = [], city = "New Delhi", requireDetails = false) => {
  const [liveVehicles, setLiveVehicles] = useState({});

  useEffect(() => {
    let active = true;
    const missing = rows.filter((row) => {
      const source = vehicleSource(row);
      const missingImage =
        !row.imageUrl &&
        !row.normalizedImageUrl &&
        !source.imageUrl &&
        !source.normalizedImageUrl;
      const missingVariants =
        requireDetails &&
        !asArray(row.variants || source.variants).length;
      return Boolean((missingImage || missingVariants) && source.model);
    });
    if (!missing.length) return undefined;

    const loadRows = async (rowsToLoad) => {
      const entries = await Promise.all(
        rowsToLoad.map(async (row) => {
          const source = vehicleSource(row);
          const vehicle = await fetchCachedLiveVehicle({
            make: source.make || source.brand || row.make || row.brand,
            model: source.model || row.model,
            city: source.city || row.city || city,
            requireDetails,
          });
          return [modelKey(recommendationName(source) || recommendationName(row)), vehicle];
        }),
      );
      if (!active) return;
      setLiveVehicles((current) => ({
        ...current,
        ...Object.fromEntries(entries.filter(([, vehicle]) => vehicle)),
      }));
    };

    const immediateCount = requireDetails ? missing.length : Math.min(2, missing.length);
    void loadRows(missing.slice(0, immediateCount));
    const deferredTimer = missing.length > immediateCount
      ? window.setTimeout(() => {
        void loadRows(missing.slice(immediateCount));
      }, 180)
      : null;

    return () => {
      active = false;
      if (deferredTimer) window.clearTimeout(deferredTimer);
    };
  }, [city, requireDetails, rows]);

  return liveVehicles;
};

const useVehicleFuelProfiles = (rows = [], city = "New Delhi") => {
  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    let active = true;
    const controllers = [];
    const loadRows = async (rowsToLoad) => {
      const entries = await Promise.all(rowsToLoad.map(async (row) => {
        const source = vehicleSource(row);
        const controller = new AbortController();
        controllers.push(controller);
        const profile = await fetchAciVehicleFuelProfile({
          make: source.make || source.brand || row.make || row.brand,
          model: source.model || row.model,
          city: source.city || row.city || city,
          signal: controller.signal,
        }).catch(() => null);
        return [modelKey(recommendationName(source) || recommendationName(row)), profile];
      }));
      if (!active) return;
      setProfiles((current) => ({
        ...current,
        ...Object.fromEntries(entries.filter(([, profile]) => profile)),
      }));
    };

    const immediateCount = Math.min(2, rows.length);
    void loadRows(rows.slice(0, immediateCount));
    const deferredTimer = rows.length > immediateCount
      ? window.setTimeout(() => {
        void loadRows(rows.slice(immediateCount));
      }, 160)
      : null;

    return () => {
      active = false;
      if (deferredTimer) window.clearTimeout(deferredTimer);
      controllers.forEach((controller) => controller.abort());
    };
  }, [city, rows]);

  return profiles;
};

const recommendationFacts = (row = {}, liveVehicle = {}) => {
  const source = vehicleSource(row);
  const variants = asArray(row.variants || source.variants || liveVehicle.variants);
  const requestedVariant = firstText(
    row.startsFromVariant,
    row.bestUnderBudgetVariant,
    row.variant,
    source.variant,
  );
  const variant = variants.find((item = {}) =>
    modelKey(item.name || item.variant || item.variantName) === modelKey(requestedVariant),
  ) || variants[0] || {};
  const evidence = asArray(
    row.matchReasons ||
      row.highlights ||
      row.reasons ||
      source.matchReasons ||
      source.highlights,
  ).map((item) => clean(typeof item === "string" ? item : item?.label || item?.text || item?.value));
  const safetyEvidence = evidence.find((item) => /ncap|\bstar\b.*safety|safety.*\bstar\b/i.test(item)) || "";
  const safetyValue = firstText(
    row.safetyScore,
    row.safetyRating,
    row.crashTestRating,
    source.safetyScore,
    source.safetyRating,
    variant.safetyScore,
    safetyEvidence.match(/\b([0-5](?:\.\d)?)\b/)?.[1],
  );
  const safetyScore = Number.parseFloat(safetyValue);
  const safetyAgency = firstText(
    row.safetyAgency,
    row.crashTestAgency,
    source.safetyAgency,
    safetyEvidence.match(/(?:Bharat|Global|ASEAN|Euro)\s+NCAP/i)?.[0],
  );
  const fuel = firstText(
    row.fuelType,
    row.fuel,
    source.fuelType,
    source.fuel,
    variant.fuelType,
    variant.fuel,
  );
  const explicitTransmission = firstText(
    row.transmissionType,
    row.transmission,
    row.gearbox,
    source.transmissionType,
    source.transmission,
    variant.transmissionType,
    variant.transmission,
    variant.gearbox,
  );
  const transmissionToken = requestedVariant.match(/\b(DCT|AMT|CVT|IVT|AT|MT|automatic|manual)\b/i)?.[1] || "";
  const transmission = explicitTransmission || (
    /^(DCT|AMT|CVT|IVT|AT|automatic)$/i.test(transmissionToken)
      ? "Automatic"
      : /^(MT|manual)$/i.test(transmissionToken)
        ? "Manual"
        : /^electric$/i.test(fuel)
          ? "Automatic"
          : ""
  );
  const bodyType = firstText(
    row.bodyType,
    row.bodyStyle,
    source.bodyType,
    source.bodyStyle,
    liveVehicle.bodyType,
    liveVehicle.bodyStyle,
  ).replace(/^sedans$/i, "Sedan").replace(/^suvs$/i, "SUV");

  return {
    make: firstText(source.make, source.brand, row.make, row.brand, liveVehicle.make, liveVehicle.brand),
    model: firstText(source.model, row.model, source.displayName, row.displayName, recommendationName(row)),
    fuel,
    transmission,
    bodyType,
    safetyScore: Number.isFinite(safetyScore) && safetyScore > 0 && safetyScore <= 5 ? safetyScore : 0,
    safetyLabel: safetyEvidence || (Number.isFinite(safetyScore) && safetyScore > 0
      ? `${safetyScore}-Star Safety${safetyAgency ? ` (${safetyAgency})` : ""}`
      : ""),
  };
};

const recommendationActionIcon = (action = {}) => {
  const label = clean(action.label || action.query).toLowerCase();
  if (/compare/.test(label)) return Scale;
  if (/automatic|gearbox|transmission/.test(label)) return Settings2;
  return ListChecks;
};

export function AciV2RecommendationInlineCard({
  message = {},
  widget = {},
  actions = [],
  onAction,
  onOpen,
}) {
  const rows = useMemo(() => recommendationRows(message, widget), [message, widget]);
  const passengerRows = useMemo(() => rows.filter((row) => !isTaxiProduct(row)), [rows]);
  const fullPassengerRows = useMemo(
    () => fullRecommendationRows(message, widget).filter((row) => !isTaxiProduct(row)),
    [message, widget],
  );
  const filters = useMemo(() => ({
    ...(message.data?.filters || {}),
    ...(message.filters || {}),
    ...(widget.data?.filters || {}),
    ...(widget.filters || {}),
  }), [message, widget]);
  const budgetTarget = Number(
    filters.budgetTarget || filters.statedBudget || filters.maxBudget || filters.budgetMax || 0,
  );
  const budgetMax = Number(filters.budgetMax || filters.maxPrice || budgetTarget || 0);
  const previewBudgetMin = Number(filters.previewBudgetMin || filters.budgetMin || 0);
  const rowsNeedingFuelProfiles = useMemo(() => passengerRows.filter((row) => {
    const source = vehicleSource(row);
    return !asArray(
      row.fuelTypes ||
        row.fuels ||
        row.fuelOptions ||
        row.qualifyingVariants ||
        source.fuelTypes ||
        source.fuels ||
        source.fuelOptions ||
        source.qualifyingVariants,
    ).length && !fuelCategoryFromText([
      row.fuelType,
      row.fuel,
      source.fuelType,
      source.fuel,
    ].filter(Boolean).join(" "));
  }), [passengerRows]);
  const fuelProfiles = useVehicleFuelProfiles(rowsNeedingFuelProfiles, widget.city || "New Delhi");
  const rowFuelCategories = useMemo(() => Object.fromEntries(passengerRows.map((row, index) => {
    const rowKey = row.vehicleId || row.modelId || modelKey(recommendationName(row)) || String(index);
    const profile = fuelProfiles[modelKey(recommendationName(vehicleSource(row)) || recommendationName(row))];
    return [rowKey, recommendationFuelCategories(row, profile)];
  })), [fuelProfiles, passengerRows]);
  const preferredFuel = useMemo(
    () => requestedFuelCategory(message, widget),
    [message, widget],
  );
  const requestedTransmission = useMemo(
    () => requestedTransmissionCategory(message, widget),
    [message, widget],
  );
  const fuelOptions = useMemo(() => {
    const available = new Set([
      ...Object.values(rowFuelCategories).flat(),
      ...fullPassengerRows.flatMap((row) => recommendationFuelCategories(row)),
    ]);
    return Object.entries(FUEL_LABELS)
      .filter(([value]) => available.has(value))
      .map(([value, label]) => ({ value, label }));
  }, [fullPassengerRows, rowFuelCategories]);
  const defaultFuel = fuelOptions.some((option) => option.value === preferredFuel)
    ? preferredFuel
    : fuelOptions[0]?.value || "petrol";
  const trackRef = useRef(null);
  const swipeRef = useRef({ x: 0, index: 0, target: null, settleTimer: null });
  const [carousel, setCarousel] = useState({ index: 0, visible: 3, max: 0 });
  const [sortDirection, setSortDirection] = useState("desc");
  const [activeFuel, setActiveFuel] = useState(defaultFuel);
  const filteredRows = useMemo(() => {
    const sourceRows = fullPassengerRows.length ? fullPassengerRows : passengerRows;
    return sourceRows
      .filter((row, index) => {
        const rowKey = row.vehicleId || row.modelId || modelKey(recommendationName(row)) || String(index);
        const categories = fullPassengerRows.length
          ? recommendationFuelCategories(row)
          : rowFuelCategories[rowKey] || ["petrol"];
        return categories.includes(activeFuel);
      })
      .map((row) => rowForFuel(row, activeFuel))
      .filter((row) => {
        const price = numericPrice(
          row.startsFromPrice || row.bestUnderBudgetPrice || row.exShowroomPrice,
        );
        return price > 0 &&
          (!previewBudgetMin || price > previewBudgetMin) &&
          (!budgetMax || price <= budgetMax);
      });
  }, [
    activeFuel,
    budgetMax,
    fullPassengerRows,
    passengerRows,
    previewBudgetMin,
    rowFuelCategories,
  ]);
  const fullFuelRows = useMemo(
    () => fullPassengerRows.filter((row) => {
      const categories = recommendationFuelCategories(row);
      return !categories.length || categories.includes(activeFuel);
    }),
    [activeFuel, fullPassengerRows],
  );
  const rankedRows = useMemo(() => [...filteredRows].sort((left, right) => {
    const leftPrice = numericPrice(left.startsFromPrice || left.bestUnderBudgetPrice || left.exShowroomPrice);
    const rightPrice = numericPrice(right.startsFromPrice || right.bestUnderBudgetPrice || right.exShowroomPrice);
    const difference = (leftPrice || Number.MAX_SAFE_INTEGER) - (rightPrice || Number.MAX_SAFE_INTEGER);
    return sortDirection === "asc" ? difference : -difference;
  }), [filteredRows, sortDirection]);
  const displayRows = useMemo(() => rankedRows.slice(0, 8), [rankedRows]);
  const liveVehicles = useLiveVehicleMap(displayRows, widget.city || "New Delhi");

  useEffect(() => {
    setActiveFuel(defaultFuel);
  }, [defaultFuel, rows]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const update = () => {
      const first = track.querySelector(".aci-recommendation-model");
      if (!first) return;
      const styles = window.getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
      const step = first.getBoundingClientRect().width + gap;
      if (!step) return;
      const visible = Math.max(1, Math.round((track.clientWidth + gap) / step));
      const max = Math.max(0, displayRows.length - visible);
      setCarousel((current) => ({ ...current, visible, max, index: Math.min(current.index, max) }));
    };
    update();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(track);
    return () => observer?.disconnect();
  }, [displayRows.length]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      trackRef.current?.scrollTo({ left: 0, behavior: "auto" });
      setCarousel((current) => ({ ...current, index: 0 }));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeFuel, sortDirection]);

  useEffect(() => () => window.clearTimeout(swipeRef.current.settleTimer), []);

  if (!passengerRows.length || !displayRows.length) return null;
  const feature = clean(widget.featureName || widget.feature || widget.data?.featureName);
  const isSuv = /suv/i.test(filters.bodyType || filters.bodyStyle || "");
  const bodyLabel = filteredRows.length === 1
    ? (isSuv ? "SUV" : "car")
    : (isSuv ? "SUVs" : "cars");
  const fuelLabel = FUEL_LABELS[activeFuel] || "Petrol";
  const transmissionLabel = requestedTransmission
    ? requestedTransmission[0].toUpperCase() + requestedTransmission.slice(1)
    : "";
  const isTopEight = filteredRows.length >= 8;
  const familyLabel = /family/i.test(filters.buyerUseCase || filters.useCase || filters.buyerIntent || "")
    ? "family "
    : "";
  const title = `${isTopEight ? "Top 8" : displayRows.length} ${transmissionLabel ? `${transmissionLabel.toLowerCase()} ` : ""}${fuelLabel.toLowerCase()} ${familyLabel}${bodyLabel}${feature ? ` with ${feature}` : ""}${budgetTarget ? ` around ${formatPrice(budgetTarget)}` : ""}`;
  const matchDescription = `${transmissionLabel ? `${transmissionLabel.toLowerCase()} ` : ""}${fuelLabel.toLowerCase()} passenger-car`;
  const budgetBand = previewBudgetMin && budgetMax
    ? `${formatPrice(previewBudgetMin)}–${formatPrice(budgetMax)}`
    : "";
  const subtitle = filteredRows.length > 8
      ? `Showing 8 focused matches${budgetBand ? ` in the ${budgetBand} decision range` : ""}.`
      : `${filteredRows.length} ${matchDescription} ${filteredRows.length === 1 ? "match" : "matches"}${budgetBand ? ` in the ${budgetBand} decision range` : ""}.`;

  const openAllCars = () => {
    const fullListWidget = {
      ...widget,
      canvasType: "vehicle_recommendation_results_canvas",
      title: `${fullFuelRows.length} ${fuelLabel.toLowerCase()} ${familyLabel}${bodyLabel}${budgetMax ? ` up to ${formatPrice(budgetMax)}` : ""}`,
      answer: `All matching passenger-car options up to ${formatPrice(budgetMax)}, with budget and fuel controls.`,
      rows: fullPassengerRows,
      items: fullPassengerRows,
      initialFuel: activeFuel,
      initialSortDirection: sortDirection,
      filters: { ...filters, fuelType: fuelLabel },
      data: {
        ...(widget.data || {}),
        rows: fullPassengerRows,
        items: fullPassengerRows,
        initialFuel: activeFuel,
        initialSortDirection: sortDirection,
        filters: {
          ...(widget.data?.filters || filters),
          fuelType: fuelLabel,
        },
      },
    };
    const canvasMessage = {
      canvasType: "vehicle_recommendation_results_canvas",
      widget: fullListWidget,
    };
    if (onOpen) onOpen(canvasMessage);
    else onAction?.({
      id: `open-all-${activeFuel}-cars`,
      label: `View all ${fuelLabel.toLowerCase()} cars`,
      type: "open_canvas",
      canvasType: "vehicle_recommendation_results_canvas",
      widget: fullListWidget,
      payload: { widget: fullListWidget },
    });
  };

  const measureCarousel = () => {
    const track = trackRef.current;
    const first = track?.querySelector(".aci-recommendation-model");
    if (!track || !first) return { step: 0, visible: 1, max: 0 };
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const step = first.getBoundingClientRect().width + gap;
    const visible = Math.max(1, Math.round((track.clientWidth + gap) / step));
    return { step, visible, max: Math.max(0, displayRows.length - visible) };
  };

  const settleSwipeTarget = () => {
    const track = trackRef.current;
    const metrics = measureCarousel();
    const target = swipeRef.current.target;
    if (!track || !metrics.step || target == null) return;
    const next = Math.min(metrics.max, Math.max(0, target));
    swipeRef.current.target = null;
    swipeRef.current.settleTimer = null;
    track.scrollTo({ left: next * metrics.step, behavior: "smooth" });
    setCarousel({ index: next, visible: metrics.visible, max: metrics.max });
  };

  const syncCarousel = () => {
    const track = trackRef.current;
    const metrics = measureCarousel();
    if (!track || !metrics.step) return;
    if (swipeRef.current.target != null) {
      window.clearTimeout(swipeRef.current.settleTimer);
      swipeRef.current.settleTimer = window.setTimeout(settleSwipeTarget, 90);
      return;
    }
    setCarousel({
      index: Math.min(metrics.max, Math.max(0, Math.round(track.scrollLeft / metrics.step))),
      visible: metrics.visible,
      max: metrics.max,
    });
  };

  const moveCarousel = (direction) => {
    const track = trackRef.current;
    const metrics = measureCarousel();
    if (!track || !metrics.step) return;
    const next = Math.min(metrics.max, Math.max(0, carousel.index + direction));
    track.scrollTo({ left: next * metrics.step, behavior: "smooth" });
    setCarousel({ index: next, visible: metrics.visible, max: metrics.max });
  };

  const beginSwipe = (event) => {
    const touch = event.touches?.[0];
    const track = trackRef.current;
    const metrics = measureCarousel();
    if (!touch || !track || !metrics.step) return;
    window.clearTimeout(swipeRef.current.settleTimer);
    swipeRef.current = {
      x: touch.clientX,
      index: Math.min(metrics.max, Math.max(0, Math.round(track.scrollLeft / metrics.step))),
      target: null,
      settleTimer: null,
    };
  };

  const finishSwipe = (event) => {
    const touch = event.changedTouches?.[0];
    const track = trackRef.current;
    const metrics = measureCarousel();
    if (!touch || !track || !metrics.step) return;
    const delta = touch.clientX - swipeRef.current.x;
    const direction = Math.abs(delta) >= 26 ? (delta < 0 ? 1 : -1) : 0;
    const next = Math.min(metrics.max, Math.max(0, swipeRef.current.index + direction));
    swipeRef.current.target = next;
    window.requestAnimationFrame(() => {
      track.scrollTo({ left: next * metrics.step, behavior: "smooth" });
    });
    window.clearTimeout(swipeRef.current.settleTimer);
    swipeRef.current.settleTimer = window.setTimeout(settleSwipeTarget, 180);
    setCarousel({ index: next, visible: metrics.visible, max: metrics.max });
  };

  return (
    <section
      className="aci-recommendation-card aci-reference-shortlist-card"
      aria-label="Recommended cars"
      data-result-count={rows.length}
      data-full-result-count={fullPassengerRows.length}
    >
      <header className="aci-reference-shortlist-header">
        <div>
          <span>Shortlist</span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {displayRows.length > carousel.visible ? (
          <div className="aci-carousel-controls">
            <small>{carousel.index + 1}–{Math.min(displayRows.length, carousel.index + carousel.visible)} of {displayRows.length}</small>
            <button type="button" onClick={() => moveCarousel(-1)} disabled={carousel.index === 0} aria-label="Previous car">
              <ChevronLeft size={17} />
            </button>
            <button type="button" onClick={() => moveCarousel(1)} disabled={carousel.index >= carousel.max} aria-label="Next car">
              <ChevronRight size={17} />
            </button>
          </div>
        ) : null}
      </header>
      <div className="aci-reference-shortlist-toolbar" aria-label="Shortlist filters">
        <details className="aci-reference-shortlist-filter-menu">
          <summary aria-label="Filter shortlist by fuel">
            <Fuel size={14} aria-hidden="true" />
            <span>Fuel</span>
            <strong>{fuelLabel}</strong>
            <ChevronDown size={13} aria-hidden="true" />
          </summary>
          <div role="menu" aria-label="Fuel options">
            {fuelOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={option.value === activeFuel}
                className={option.value === activeFuel ? "is-active" : ""}
                onClick={(event) => {
                  setActiveFuel(option.value);
                  event.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                <span>{option.label}</span>
                {option.value === activeFuel ? <Check size={14} aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        </details>
        <button
          type="button"
          aria-label={`Sort price ${sortDirection === "asc" ? "high to low" : "low to high"}`}
          onClick={() => setSortDirection((current) => current === "asc" ? "desc" : "asc")}
        >
          <ArrowDownUp size={14} />
          <span>Price: {sortDirection === "asc" ? "Low to high" : "High to low"}</span>
        </button>
        {fullFuelRows.length > displayRows.length ? (
          <button type="button" onClick={openAllCars}>
            <ListChecks size={14} />
            <span>View all {fullFuelRows.length}</span>
          </button>
        ) : null}
      </div>
      <div
        className="aci-recommendation-grid"
        ref={trackRef}
        onScroll={syncCarousel}
        onTouchStart={beginSwipe}
        onTouchEnd={finishSwipe}
      >
        {displayRows.map((row, index) => {
          const name = recommendationName(row);
          const rowKey = row.vehicleId || row.modelId || modelKey(name) || String(index);
          const rowFuel = activeFuel;
          const source = vehicleSource(row);
          const liveVehicle = liveVehicles[modelKey(name)] || {};
          const facts = recommendationFacts(row, liveVehicle);
          const imageUrl =
            row.normalizedImageUrl ||
            row.imageUrl ||
            source.normalizedImageUrl ||
            source.imageUrl ||
            liveVehicle.normalizedImageUrl ||
            liveVehicle.imageUrl;
          const price =
            row.startsFromPrice || row.bestUnderBudgetPrice || row.exShowroomPrice;
          const priceLabel = row.startsFromPriceLabel || formatPrice(price);
          const variant = clean(row.startsFromVariant || row.bestUnderBudgetVariant || row.variant);
          const overviewVehicle = {
            ...source,
            ...liveVehicle,
            make: facts.make || row.make || row.brand,
            brand: facts.make || row.make || row.brand,
            model: row.model || source.model || facts.model,
            fullModel: name,
            displayName: name,
            selectedVariant: variant,
            imageUrl,
            normalizedImageUrl: imageUrl,
            exShowroomPrice: priceLabel,
            fuelText: facts.fuel || FUEL_LABELS[rowFuel],
            transmission: facts.transmission,
            bodyType: facts.bodyType,
          };
          const factChips = [
            (facts.fuel || FUEL_LABELS[rowFuel])
              ? { label: facts.fuel || FUEL_LABELS[rowFuel], Icon: Fuel }
              : null,
            facts.transmission ? { label: facts.transmission, Icon: Settings2 } : null,
            facts.bodyType ? { label: facts.bodyType, Icon: Car } : null,
          ].filter(Boolean);

          return (
            <article
              className={`aci-recommendation-model aci-reference-shortlist-model${index === 0 ? " is-leading" : ""}`}
              key={rowKey}
              style={{ "--aci-item-index": index }}
            >
              <div className="aci-recommendation-visual">
                <span className="aci-reference-shortlist-rank" aria-label={`Rank ${index + 1}`}>{index + 1}</span>
                {imageUrl ? (
                  <CarVisual imageUrl={imageUrl} name={name} priority={index < Math.max(2, carousel.visible)} />
                ) : (
                  <CarFront size={34} strokeWidth={1.5} aria-hidden="true" />
                )}
                {facts.safetyLabel ? (
                  <span className="aci-reference-shortlist-safety-label">
                    <ShieldCheck size={12} /> {facts.safetyLabel}
                  </span>
                ) : null}
              </div>
              {factChips.length ? (
                <div className="aci-reference-shortlist-facts" aria-label={`${name} specifications`}>
                  {factChips.map(({ label, Icon }) => (
                    <span key={label}><Icon size={13} /><b>{label}</b></span>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                className="aci-reference-shortlist-summary"
                aria-label={`Open ${name} car overview`}
                title="Open car overview"
                onClick={() => {
                  const canvasMessage = {
                    canvasType: "car_overview_canvas",
                    vehicle: overviewVehicle,
                    widget: {
                      canvasType: "car_overview_canvas",
                      vehicle: overviewVehicle,
                      contextPatch: { selectedVehicle: overviewVehicle },
                    },
                  };
                  if (onOpen) onOpen(canvasMessage);
                  else onAction?.({
                    id: `open-overview-${modelKey(name)}`,
                    label: `Open ${name} overview`,
                    query: name,
                    type: "open_canvas",
                    intent: "open_vehicle",
                    canvasType: "car_overview_canvas",
                    vehicle: overviewVehicle,
                    contextPatch: { selectedVehicle: overviewVehicle },
                  });
                }}
              >
                <div className="aci-reference-shortlist-summary-identity">
                  {facts.make ? <small>{facts.make}</small> : null}
                  <span className="aci-reference-shortlist-summary-model">
                    <strong>{facts.model || name}</strong>
                    {variant ? <em>{compactVariantName(variant, source)}</em> : null}
                  </span>
                </div>
                {priceLabel ? (
                  <div className="aci-reference-shortlist-summary-price">
                    <small>Ex-showroom</small>
                    <strong>{priceLabel}</strong>
                  </div>
                ) : null}
                <span className="aci-reference-shortlist-summary-open">
                  Overview <ChevronRight size={15} aria-hidden="true" />
                </span>
              </button>
            </article>
          );
        })}
      </div>
      <footer className="aci-reference-shortlist-actions" aria-label="Shortlist actions">
        {asArray(actions).filter((action) => {
          const label = clean(action.label || action.query).toLowerCase();
          return !(requestedTransmission === "automatic" && /automatic|auto|gearbox|transmission/.test(label));
        }).slice(0, 2).map((action) => {
          const Icon = recommendationActionIcon(action);
          return (
            <button type="button" key={action.id || action.query || action.label} onClick={() => onAction?.(action)}>
              <Icon size={16} /><span>{action.label || action.query}</span><ArrowRight size={14} />
            </button>
          );
        })}
      </footer>
    </section>
  );
}

const comparisonName = (row = {}) => {
  const source = vehicleSource(row);
  return clean(
    source.fullModel ||
      source.displayName ||
      row.fullModel ||
      row.displayName ||
      [source.make || source.brand || row.make || row.brand, source.model || row.model].filter(Boolean).join(" ") ||
      source.model ||
      row.model,
  );
};

export function AciV2ComparisonInlineCard({ message = {}, widget = {}, onAction }) {
  const rows = useMemo(
    () => asArray(widget.rows || message.rows || widget.items || message.items).slice(0, 2),
    [message, widget],
  );
  const liveVehicles = useLiveVehicleMap(rows, widget.city || "New Delhi", true);
  if (rows.length < 2) return null;

  const names = rows.map(comparisonName);

  return (
    <section
      className="aci-comparison-card aci-reference-comparison-card"
      aria-label={`${names[0]} and ${names[1]} comparison`}
    >
      <div className="aci-reference-comparison-stage">
        <div className="aci-reference-comparison-grid">
          {rows.map((row, index) => {
            const source = vehicleSource(row);
            const name = names[index];
            const liveVehicle = liveVehicles[modelKey(name)] || {};
            const imageUrl =
              source.normalizedImageUrl ||
              row.normalizedImageUrl ||
              liveVehicle.normalizedImageUrl ||
              source.imageUrl ||
              row.imageUrl ||
              liveVehicle.imageUrl;

            const variant = clean(row.variantName || row.variant || source.variant || source.variantName);
            const fuel = clean(row.fuelType || row.fuel || source.fuelType || source.fuel);
            const transmission = clean(row.transmission || source.transmission);
            const price = Number(row.onRoadPrice || row.exShowroomPrice || row.price || 0);
            const variants = asArray(
              liveVehicle.variants || source.variants || row.variants,
            ).filter((item) => Number(item.onRoadPrice || item.exShowroomPrice || item.price || 0));
            const startingVariant = variants.reduce((best, item) => {
              const amount = Number(item.onRoadPrice || item.exShowroomPrice || item.price || 0);
              const bestAmount = Number(best?.onRoadPrice || best?.exShowroomPrice || best?.price || 0);
              return !best || amount < bestAmount ? item : best;
            }, null);
            const topVariant = variants.reduce((best, item) => {
              const amount = Number(item.onRoadPrice || item.exShowroomPrice || item.price || 0);
              const bestAmount = Number(best?.onRoadPrice || best?.exShowroomPrice || best?.price || 0);
              return !best || amount > bestAmount ? item : best;
            }, null);
            const startingPrice = Number(
              startingVariant?.onRoadPrice ||
                startingVariant?.exShowroomPrice ||
                startingVariant?.price ||
                price,
            );
            const rawTopVariantName = clean(
              topVariant?.variant ||
                topVariant?.variantName ||
                topVariant?.name ||
                variant,
            );
            const topVariantPrice = Number(
              topVariant?.onRoadPrice ||
                topVariant?.exShowroomPrice ||
                topVariant?.price ||
                price,
            );
            const topVariantMeta = [
              clean(topVariant?.fuel || topVariant?.fuelType || fuel),
              clean(topVariant?.transmission || transmission),
            ].filter(Boolean).join(" · ");

            const brand = clean(
              source.make ||
                source.brand ||
                row.make ||
                row.brand,
            );

            const displayModel =
              brand && name.toLowerCase().startsWith(brand.toLowerCase())
                ? clean(name.slice(brand.length))
                : name;
            const topVariantName = compactVariantName(rawTopVariantName, {
              brand,
              model: source.model || row.model || displayModel,
              fullModel: name,
            });

            return (
              <article
                className="aci-reference-comparison-model"
                key={modelKey(name) || index}
                style={{ "--aci-item-index": index }}
              >
                <span className="aci-reference-comparison-rank" aria-label={`Car ${index + 1}`}>
                  {index + 1}
                </span>
                <div className="aci-reference-model-heading">
                  <div className="aci-reference-model-identity">
                    {brand ? <small>{brand}</small> : null}
                      <h4>{displayModel}</h4>
                  </div>

                  <div className="aci-reference-model-specs" aria-label={`${name} specifications`}>
                    {variant ? (
                      <span><small>Variant</small><b>{variant}</b></span>
                    ) : null}
                    {fuel ? (
                      <span><small>Fuel</small><b>{fuel}</b></span>
                    ) : null}

                    {transmission ? (
                      <span><small>Gearbox</small><b>{transmission}</b></span>
                    ) : null}
                  </div>
                </div>

                <div className="aci-reference-model-visual">
                  <div className="aci-reference-model-floor" aria-hidden="true" />
                  <CarVisual imageUrl={imageUrl} name={name} priority={index === 0} />
                </div>

                <div className="aci-reference-model-footer">
                  <div className="aci-reference-starting-price">
                    <small>Starting from</small>
                    <strong>{formatPrice(startingPrice)}</strong>
                    <span>{row.onRoadPrice || startingVariant?.onRoadPrice ? "On-road" : "Ex-showroom"}</span>
                  </div>
                  <div className="aci-reference-top-variant">
                    <small>Top variant</small>
                    <strong>{topVariantName || "Variant details"}</strong>
                    <span>{topVariantPrice ? formatPrice(topVariantPrice) : ""}{topVariantMeta ? ` · ${topVariantMeta}` : ""}</span>
                  </div>
                  <button type="button" onClick={() => onAction?.({
                    id: `comparison-variants-${modelKey(name)}`,
                    label: `View ${source.model || row.model || name} variants`,
                    query: `Show ${name} variants`,
                    type: "ask",
                    vehicle: { ...liveVehicle, ...source, fullModel: name },
                  })}>
                    <span>View variants</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="aci-reference-comparison-vs" aria-hidden="true">
          <span>VS</span>
        </div>

      </div>
    </section>
  );
}

export function AciV2ScoreInsightInlineCard({ message = {}, widget = {} }) {
  const [expanded, setExpanded] = useState(false);
  const rows = asArray(widget.rows || message.rows).slice(0, 5);
  if (!rows.length) return null;
  const topRows = rows.slice(0, expanded ? 5 : 3);

  return (
    <section className="aci-score-inline-card" aria-label="Best value variants">
      <header>
        <span><Trophy size={16} /></span>
        <div>
          <small>Value shortlist</small>
          <h4>Strongest picks in this model range</h4>
        </div>
      </header>
      <div className="aci-score-inline-list">
        {topRows.map((row, index) => {
          const valueScore = Number(row.modules?.value?.score || 0);
          return (
            <article
              key={row.variantProfileKey || row.variantFullName || index}
              style={{ "--aci-item-index": index }}
            >
              <b>{index + 1}</b>
              <span>
                <strong>{row.variantFullName || row.variantName || `Option ${index + 1}`}</strong>
                <small>{asArray(row.strengths).slice(0, 2).join(" · ") || "Balanced value signal"}</small>
              </span>
              <em>
                {formatPrice(row.referenceExShowroomPrice)}
                {valueScore ? <small>{Math.round(valueScore)} value</small> : null}
              </em>
            </article>
          );
        })}
      </div>
      <button
        type="button"
        className="aci-score-inline-open"
        aria-expanded={expanded}
        onClick={() => setExpanded((visible) => !visible)}
      >
        <span>{expanded ? "Show the top three" : `Show ${Math.max(0, rows.length - 3)} more value picks`}</span>
        <ArrowRight size={15} />
      </button>
    </section>
  );
}
