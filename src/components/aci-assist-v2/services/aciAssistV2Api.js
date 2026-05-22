import API_BASE_URL from "../../../config/apiBaseUrl";
import { getDisplayCarImage } from "../shared/aciV2Image";

const DEFAULT_CHAT_ENDPOINT = "/api/ai-agent/chat";
const DEFAULT_PUBLIC_CHAT_ENDPOINT = "/api/ai-agent/public-chat";
const VEHICLE_MEDIA_ENDPOINT = "/api/vehicles/media";
const VEHICLE_VARIANTS_ENDPOINT = "/api/vehicles/distinct/variants-with-price";
const VEHICLE_MODELS_ENDPOINT = "/api/vehicles/distinct/models";
const POPULAR_CARS_ENDPOINT = "/api/vehicles/popular-cars";
const LIVE_SNAPSHOT_TTL_MS = 1000 * 60 * 10;
const LIVE_SNAPSHOT_CACHE_VERSION = "model-hero-v4";
const liveSnapshotMemory = new Map();
const POPULAR_CARS_TTL_MS = 1000 * 60 * 10;
const POPULAR_CARS_CACHE_VERSION = "hero-v2";
const popularCarsMemory = new Map();

const createAbortError = () => {
  const error = new Error("Request aborted");
  error.name = "AbortError";
  return error;
};

const throwIfAborted = (signal) => {
  if (signal?.aborted) throw createAbortError();
};

const toSafeList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const firstSafeList = (...values) => {
  for (const value of values) {
    const list = toSafeList(value);
    if (list.length) return list;
  }

  return [];
};


const cleanJoin = (base = "", path = "") => {
  if (!base) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${String(base).replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;
};

const getAuthToken = () => {
  try {
    const directKeys = [
      "token",
      "authToken",
      "accessToken",
      "userInfo.token",
      "user.token",
      "authUser.token",
      "currentUser.token",
    ];

    for (const key of directKeys) {
      const sessionValue = sessionStorage.getItem(key);
      if (sessionValue) return sessionValue;

      const localValue = localStorage.getItem(key);
      if (localValue) return localValue;
    }

    const direct =
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("authToken") ||
      sessionStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken") ||
      "";

    if (direct) return direct;

    const stores = [sessionStorage, localStorage];
    const keys = [
      "userInfo",
      "user",
      "authUser",
      "currentUser",
      "profile",
      "cdbUser",
    ];

    for (const store of stores) {
      for (const key of keys) {
        const raw = store.getItem(key);
        if (!raw) continue;

        try {
          const parsed = JSON.parse(raw);
          const token =
            parsed?.token ||
            parsed?.authToken ||
            parsed?.accessToken ||
            parsed?.auth?.token ||
            parsed?.jwt ||
            parsed?.data?.token ||
            parsed?.user?.token ||
            "";

          if (token) return token;
        } catch {
          // ignore malformed storage values
        }
      }
    }

    return "";
  } catch {
    return "";
  }
};

const isObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

const firstObject = (...values) => {
  for (const value of values) {
    if (isObject(value)) return value;
  }
  return null;
};

const normalizeKey = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const looksLikePriceRow = (item) => {
  if (!isObject(item)) return false;

  const keys = Object.keys(item).map(normalizeKey);
  const hasVariant = keys.some((key) =>
    ["variant", "variantname", "trim", "version", "name", "title"].includes(
      key,
    ),
  );

  const hasPrice = keys.some((key) =>
    [
      "exshowroomprice",
      "exshowroom",
      "exshowroompriceinr",
      "onroadprice",
      "onroad",
      "price",
      "rto",
      "insurance",
      "roadtax",
    ].includes(key),
  );

  return hasVariant && hasPrice;
};

const looksLikeColorRow = (item) => {
  if (!isObject(item)) return false;

  const keys = Object.keys(item).map(normalizeKey);
  const hasName = keys.some((key) =>
    [
      "color",
      "colorname",
      "name",
      "label",
      "desktopname",
      "mobilename",
    ].includes(key),
  );

  const hasColorValue = keys.some((key) =>
    [
      "hex",
      "hexcode",
      "colorhex",
      "imageurl",
      "carimageurl",
      "swatchimage",
    ].includes(key),
  );

  return hasName && hasColorValue;
};

const looksLikeFeatureRow = (item) => {
  if (!isObject(item)) return false;

  const keys = Object.keys(item).map(normalizeKey);
  const hasName = keys.some((key) =>
    ["feature", "featurename", "name", "label", "title"].includes(key),
  );
  const hasFeatureSignal = keys.some((key) =>
    [
      "value",
      "displayvalue",
      "available",
      "present",
      "included",
      "category",
      "section",
      "group",
      "availability",
      "status",
    ].includes(key),
  );

  return hasName && hasFeatureSignal;
};

const looksLikeVehicle = (item) => {
  if (!isObject(item)) return false;

  const keys = Object.keys(item).map(normalizeKey);
  const hasModel =
    keys.includes("model") ||
    keys.includes("displayname") ||
    keys.includes("name");
  const hasVehicleSignal = keys.some((key) =>
    [
      "make",
      "brand",
      "variant",
      "city",
      "imageurl",
      "priceRange".toLowerCase(),
    ].includes(key),
  );

  return hasModel && hasVehicleSignal;
};

const collectDeep = (root, predicate, limit = 500) => {
  const found = [];
  const seen = new WeakSet();

  const walk = (value, depth = 0) => {
    if (!value || depth > 8 || found.length >= limit) return;

    if (Array.isArray(value)) {
      if (value.length && value.every((item) => predicate(item))) {
        found.push(value);
        return;
      }

      for (const item of value) walk(item, depth + 1);
      return;
    }

    if (!isObject(value)) return;
    if (seen.has(value)) return;
    seen.add(value);

    for (const child of Object.values(value)) {
      walk(child, depth + 1);
    }
  };

  walk(root);
  return found;
};

const firstMatchingArray = (root, predicate) => {
  const arrays = collectDeep(root, predicate);
  return arrays.sort((a, b) => b.length - a.length)[0] || [];
};

const firstMatchingObject = (root, predicate) => {
  const seen = new WeakSet();

  const walk = (value, depth = 0) => {
    if (!value || depth > 8) return null;

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = walk(item, depth + 1);
        if (found) return found;
      }
      return null;
    }

    if (!isObject(value)) return null;
    if (seen.has(value)) return null;
    seen.add(value);

    if (predicate(value)) return value;

    for (const child of Object.values(value)) {
      const found = walk(child, depth + 1);
      if (found) return found;
    }

    return null;
  };

  return walk(root);
};

const firstArrayFromKnownPaths = (...values) => {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return value;
  }
  return [];
};

const parseAmount = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const text = String(value).replace(/,/g, "").trim();
  if (!text) return 0;

  const match = text.match(/[-+]?\d*\.?\d+/);
  if (!match) return 0;

  const number = Number(match[0]);
  if (!Number.isFinite(number)) return 0;

  if (/crore|cr\b/i.test(text)) return Math.round(number * 10000000);
  if (/lakh|lac|l\b/i.test(text)) return Math.round(number * 100000);
  if (number > 0 && number < 250) return Math.round(number * 100000);
  return Math.round(number);
};

const formatCompactAmount = (value) => {
  const amount = Number(value || 0);
  if (!amount) return "";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  return `₹${(amount / 100000).toFixed(2)}L`;
};

const normalizeHex = (value = "") => {
  const hex = String(value || "").trim().replace(/^#/, "");
  if (!hex) return "";
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return `#${hex
      .split("")
      .map((part) => `${part}${part}`)
      .join("")
      .toUpperCase()}`;
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex.toUpperCase()}`;
  return "";
};

const canonicalVehicleKey = ({ make = "", model = "", city = "" } = {}) =>
  `${LIVE_SNAPSHOT_CACHE_VERSION}|${String(make || "").trim().toLowerCase()}|${String(model || "")
    .trim()
    .toLowerCase()}|${String(city || "").trim().toLowerCase()}`;

const normalizeModelLookupText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stripMakePrefix = (value = "", make = "") => {
  const text = normalizeModelLookupText(value);
  const makeText = normalizeModelLookupText(make);

  if (!makeText) return text;
  if (text === makeText) return "";
  if (text.startsWith(`${makeText} `)) return text.slice(makeText.length + 1);
  return text;
};

const MODEL_MATCH_KEYS = [
  "model",
  "modelName",
  "model_name",
  "rawModel",
  "raw_model",
  "displayName",
  "display_name",
  "modelDisplayName",
  "model_display_name",
  "vehicleModel",
  "vehicle_model",
];

const IMAGE_MODEL_KEYS = [
  "heroImageNormalizedUrl",
  "normalizedHeroImageUrl",
  "heroNormalizedImageUrl",
  "displayNormalizedImageUrl",
  "heroImageUrl",
  "hero_image_url",
  "heroImage",
  "defaultNormalizedImageUrl",
  "normalizedImageUrl",
  "cleanImageUrl",
  "normalized_image_url",
  "clean_image_url",
  "imageUrl",
  "image_url",
  "carImageUrl",
  "car_image_url",
  "sourceImageUrl",
  "source_image_url",
];

const SOURCE_IMAGE_MODEL_KEYS = [
  "image_url",
  "sourceImageUrl",
  "source_image_url",
  "originalImageUrl",
  "original_image_url",
  "rawImageUrl",
  "raw_image_url",
  "car_image_url",
];

const imageModelCandidatesFromUrl = (value = "", make = "") => {
  const text = String(value || "").trim();
  if (!text) return [];

  const path = text.split(/[?#]/)[0] || text;
  return [
    ...new Set(
      path
        .split(/[/:]+/)
        .flatMap((part) => part.split(/[._]+/))
        .map((part) => part.replace(/\.(png|jpe?g|webp|avif|gif|svg)$/i, ""))
        .map((part) => stripMakePrefix(part, make))
        .filter((part) => part && part.length > 1),
    ),
  ];
};

const sourceImageModelCandidatesFromUrl = (value = "", make = "") => {
  const text = String(value || "").trim();
  if (!text) return [];

  const makeText = normalizeModelLookupText(make);
  const path = text.split(/[?#]/)[0] || text;
  const segments = path
    .split(/[/:]+/)
    .flatMap((part) => part.split(/[._]+/))
    .map((part) => part.replace(/\.(png|jpe?g|webp|avif|gif|svg)$/i, ""))
    .filter(Boolean);

  if (!makeText) return imageModelCandidatesFromUrl(value, make);

  const directoryModelCandidates = segments
    .map((part, index) => {
      const normalized = normalizeModelLookupText(part);
      if (normalized !== makeText) return "";
      return stripMakePrefix(segments[index + 1], make);
    })
    .filter((part) => part && part.length > 1);

  return [...new Set(directoryModelCandidates)];
};

const tokensStartWith = (tokens = [], prefix = []) =>
  prefix.length > 0 &&
  prefix.every((token, index) => tokens[index] === token);

const findTokenSequence = (tokens = [], sequence = [], fromIndex = 0) => {
  if (!sequence.length) return -1;
  for (let index = fromIndex; index <= tokens.length - sequence.length; index += 1) {
    if (sequence.every((token, offset) => tokens[index + offset] === token)) {
      return index;
    }
  }
  return -1;
};

const modelCandidateFromNormalizedAssetUrl = (value = "", make = "") => {
  const text = String(value || "").trim();
  const makeText = normalizeModelLookupText(make);
  if (!text || !makeText) return "";

  const makeTokens = makeText.split(" ").filter(Boolean);
  const path = text.split(/[?#]/)[0] || text;
  const parts = path
    .split(/[/:]+/)
    .flatMap((part) => part.split(/[._]+/))
    .map((part) => part.replace(/\.(png|jpe?g|webp|avif|gif|svg)$/i, ""))
    .filter(Boolean);

  for (const part of parts) {
    const tokens = normalizeModelLookupText(part).split(" ").filter(Boolean);
    if (!tokensStartWith(tokens, makeTokens)) continue;

    const afterMake = tokens.slice(makeTokens.length);
    const nextMakeIndex = findTokenSequence(afterMake, makeTokens);
    const modelTokens =
      nextMakeIndex > 0 ? afterMake.slice(0, nextMakeIndex) : [];

    if (modelTokens.length) return modelTokens.join(" ");
  }

  return "";
};

const imageUrlModelScope = (value = "", requestedModel = "", make = "") => {
  const modelKey = stripMakePrefix(requestedModel, make);
  if (!value || !modelKey) return "unknown";

  const normalizedAssetModel = modelCandidateFromNormalizedAssetUrl(value, make);
  if (normalizedAssetModel) {
    return normalizedAssetModel === modelKey ? "exact" : "mismatch";
  }

  const sourceCandidates = sourceImageModelCandidatesFromUrl(value, make);
  if (sourceCandidates.some((candidate) => candidate === modelKey)) return "exact";
  if (
    sourceCandidates.some(
      (candidate) =>
        candidate.startsWith(`${modelKey} `) ||
        modelKey.startsWith(`${candidate} `),
    )
  ) {
    return "mismatch";
  }

  const text = normalizeModelLookupText(value);
  const makeText = normalizeModelLookupText(make);
  if (makeText && text.includes(`${makeText} ${modelKey}`)) return "exact";

  return "unknown";
};

const selectImageForRequestedModel = (row = {}, requestedModel = "", make = "") => {
  const candidates = [
    row.normalizedImageUrl,
    row.cleanImageUrl,
    row.normalized_image_url,
    row.clean_image_url,
    row.normalizedImagePngUrl,
    row.imageUrl,
    row.image_url,
    row.car_image_url,
    row.sourceImageUrl,
    row.source_image_url,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const exact = candidates.find(
    (value) => imageUrlModelScope(value, requestedModel, make) === "exact",
  );
  if (exact) return exact;

  const nonMismatch = candidates.find(
    (value) => imageUrlModelScope(value, requestedModel, make) !== "mismatch",
  );
  return nonMismatch || candidates[0] || "";
};

const collectSourceImageModelCandidates = (row = {}, make = "") => {
  const candidates = [];
  const push = (value) => {
    sourceImageModelCandidatesFromUrl(value, make).forEach((candidate) => {
      if (candidate) candidates.push(candidate);
    });
  };

  SOURCE_IMAGE_MODEL_KEYS.forEach((key) => push(row?.[key]));
  SOURCE_IMAGE_MODEL_KEYS.forEach((key) => push(row?.vehicle?.[key]));
  SOURCE_IMAGE_MODEL_KEYS.forEach((key) => push(row?.car?.[key]));

  return [...new Set(candidates)];
};

const isSpecificModelSlugConflict = (candidate = "", requestedModel = "") => {
  if (!candidate || !requestedModel) return false;
  return candidate.startsWith(`${requestedModel} `);
};

const collectModelCandidates = (row = {}, make = "") => {
  const candidates = [];
  const push = (value) => {
    const normalized = stripMakePrefix(value, make);
    if (normalized) candidates.push(normalized);
  };

  MODEL_MATCH_KEYS.forEach((key) => push(row?.[key]));
  MODEL_MATCH_KEYS.forEach((key) => push(row?.vehicle?.[key]));
  MODEL_MATCH_KEYS.forEach((key) => push(row?.car?.[key]));
  IMAGE_MODEL_KEYS.forEach((key) => {
    imageModelCandidatesFromUrl(row?.[key], make).forEach(push);
  });

  return [...new Set(candidates)];
};

const rowMatchesRequestedModel = (
  row = {},
  requestedModel = "",
  make = "",
  { strict = false } = {},
) => {
  const candidates = collectModelCandidates(row, make);
  if (candidates.some((candidate) => candidate === requestedModel)) return true;

  if (strict) {
    const sourceImageModels = collectSourceImageModelCandidates(row, make);
    if (sourceImageModels.some((candidate) => candidate === requestedModel)) return true;
    if (
      sourceImageModels.some((candidate) =>
        isSpecificModelSlugConflict(candidate, requestedModel),
      )
    ) {
      return false;
    }
  }

  return false;
};

const filterRowsByExactModel = (
  rows = [],
  requestedModel = "",
  make = "",
  { strict = false } = {},
) => {
  if (!Array.isArray(rows) || !rows.length) return [];

  const modelKey = stripMakePrefix(requestedModel, make);
  if (!modelKey) return rows;

  const rowsWithModelInfo = rows.filter(
    (row) => collectModelCandidates(row, make).length,
  );
  if (!rowsWithModelInfo.length) return rows;

  const exactMatches = rows.filter((row) => {
    return rowMatchesRequestedModel(row, modelKey, make, { strict });
  });

  if (exactMatches.length) return exactMatches;
  return strict ? [] : rows;
};

const normalizeLiveVariant = (row = {}, index = 0, city = "Delhi") => {
  const name =
    row.variant ||
    row.variantName ||
    row.name ||
    row.title ||
    row.trim ||
    `Variant ${index + 1}`;
  const fuel = row.fuel || row.fuel_type || row.fuelType || "";
  const transmission =
    row.transmission || row.transmissionType || row.gearbox || "";
  const exShowroom = parseAmount(
    row.exShowroom ?? row.ex_showroom ?? row.exShowroomPrice ?? row.exPrice,
  );
  const onRoad = parseAmount(
    row.onRoadPrice ??
      row.on_road_price_cardekho ??
      row.total_on_road_with_accessories ??
      row.on_road_price ??
      row.price,
  );

  return {
    ...row,
    id: row._id || row.id || `${name}-${index}`,
    model: row.model || row.modelName || row.model_name || "",
    rawModel: row.rawModel || row.raw_model || row.model || row.modelName || row.model_name || "",
    name,
    variant: name,
    fuel,
    transmission,
    exShowroomPrice: exShowroom,
    onRoadPrice: onRoad || exShowroom,
    price: formatCompactAmount(onRoad || exShowroom),
    sub: `On-road ${city || "Delhi"}`,
    note: row.note || row.summary || row.description || "Variant details",
  };
};

const normalizeLiveColor = (
  row = {},
  index = 0,
  { requestedModel = "", make = "" } = {},
) => {
  const name =
    row.color_name ||
    row.colorName ||
    row.name ||
    row.label ||
    row.desktopName ||
    row.mobileName ||
    `Color ${index + 1}`;
  const normalizedImageUrl =
    row.normalizedImageUrl ||
    row.cleanImageUrl ||
    row.normalized_image_url ||
    row.clean_image_url ||
    row.normalizedImagePngUrl ||
    "";
  const rawImageUrl =
    row.image_url || row.imageUrl || row.car_image_url || "";
  const displayImage =
    selectImageForRequestedModel(row, requestedModel, make) ||
    getDisplayCarImage({
      normalizedImageUrl,
      imageUrl: rawImageUrl,
    });

  return {
    ...row,
    id: row._id || row.id || `${name}-${index}`,
    name,
    desktopName: row.desktopName || name,
    mobileName: row.mobileName || name,
    hex:
      normalizeHex(
        row.color_hex || row.hex || row.hexCode || row.colorHex || "",
      ) || "#2563EB",
    normalizedImageUrl,
    cleanImageUrl: row.cleanImageUrl || row.clean_image_url || normalizedImageUrl,
    imageUrl: displayImage || rawImageUrl,
    carImageUrl: displayImage || rawImageUrl,
    sourceImageUrl: rawImageUrl,
  };
};

const queryString = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    search.set(key, value);
  });
  return search.toString();
};

const uniqueNonEmpty = (items = []) =>
  [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];

const resolveApiBaseCandidates = () => {
  const envBase = process.env.REACT_APP_API_BASE_URL || "";
  const configuredBase = API_BASE_URL || "";
  const browserHost =
    typeof window !== "undefined"
      ? String(window.location?.hostname || "").trim()
      : "";

  const localCandidate =
    browserHost && /^(localhost|127\.0\.0\.1)$/i.test(browserHost)
      ? `http://${browserHost}:5050`
      : "";

  return uniqueNonEmpty([
    envBase,
    configuredBase,
    localCandidate,
    "https://cdb-api.vercel.app",
  ]);
};

const readLiveSnapshotCache = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("aci_v2_live_snapshot_cache");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeLiveSnapshotCache = (cache) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("aci_v2_live_snapshot_cache", JSON.stringify(cache));
  } catch {
    // ignore cache write errors
  }
};

const readPopularCarsCache = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("aci_v2_popular_cars_cache");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writePopularCarsCache = (cache) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("aci_v2_popular_cars_cache", JSON.stringify(cache));
  } catch {
    // ignore cache write errors
  }
};

const fetchJsonSafe = async (url, token = "", signal) => {
  throwIfAborted(signal);

  const response = await fetch(url, {
    method: "GET",
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  throwIfAborted(signal);

  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

const normalizeBrandCard = ({ brand = "", model = "", city = "Delhi", variants = [], media = [] } = {}) => {
  const rows = Array.isArray(variants) ? variants : [];
  const values = rows
    .map((item) =>
      parseAmount(
        item.onRoadPrice ||
          item.on_road_price ||
          item.total_on_road_with_accessories ||
          item.exShowroom ||
          item.exShowroomPrice,
      ),
    )
    .filter(Boolean);

  const minOnRoad = values.length ? Math.min(...values) : 0;
  const imageRow = (Array.isArray(media) ? media : []).find(
    (item) =>
      item?.normalizedImageUrl ||
      item?.cleanImageUrl ||
      item?.imageUrl ||
      item?.image_url ||
      item?.car_image_url,
  );
  const variantImage = rows.find((item) => item?.imageUrl || item?.image_url);

  const imageUrl = getDisplayCarImage(
    imageRow || variantImage || { imageUrl: "", normalizedImageUrl: "" },
  );

  return {
    id: `${String(brand).toLowerCase()}-${String(model).toLowerCase()}`.replace(
      /[^a-z0-9]+/g,
      "-",
    ),
    brand,
    make: brand,
    model,
    displayName: `${brand} ${model}`.trim(),
    city,
    imageUrl,
    normalizedImageUrl: imageRow?.normalizedImageUrl || imageRow?.cleanImageUrl || "",
    sourceImageUrl: imageRow?.sourceImageUrl || imageRow?.image_url || imageRow?.imageUrl || "",
    startingOnRoadPrice: formatCompactAmount(minOnRoad),
    priceRange: formatCompactAmount(minOnRoad),
    variantCount: rows.length || undefined,
    variants: rows,
  };
};

export 
const isStableAciBackendContract = (value) => {
  if (!isObject(value)) return false;

  const hasContractSignal = Boolean(
    value.intent ||
      value.displayMode ||
      value.canvasType ||
      value.inlineType ||
      value.contextSnapshot ||
      value.contextPatch ||
      value.sourceTransparency ||
      value.runtimeResultsMeta,
  );

  const hasPayloadSignal = Boolean(
    value.widget ||
      value.widgets ||
      value.rows ||
      value.items ||
      value.features ||
      value.colors ||
      value.variants ||
      value.data?.rows ||
      value.data?.features ||
      value.data?.variants,
  );

  return hasContractSignal && hasPayloadSignal;
};

const preserveStableAciBackendContract = (body = {}) => {
  if (!isStableAciBackendContract(body)) return null;

  const widget =
    (isObject(body.widget) && body.widget) ||
    (Array.isArray(body.widgets) && isObject(body.widgets[0]) && body.widgets[0]) ||
    {};

  const rowCandidates = [
    body.data?.rows,
    widget.data?.rows,
    body.rows,
    body.items,
    body.data?.items,
    widget.rows,
    widget.items,
    widget.matchedVariants,
  ].map(toSafeList);
  const featureRowFallbacks = [
    body.features,
    body.featureList,
    body.searchableFeatures,
    body.data?.features,
    body.data?.featureList,
    body.data?.searchableFeatures,
    widget.features,
    widget.featureList,
    widget.searchableFeatures,
  ].map(toSafeList);
  const bestRowCandidate =
    rowCandidates
      .slice()
      .sort((left, right) => right.length - left.length)[0] || [];
  const rows =
    bestRowCandidate.length
      ? bestRowCandidate
      : featureRowFallbacks
          .slice()
          .sort((left, right) => right.length - left.length)[0] || [];

  const enrichedWidget = {
    ...widget,
    intent: body.intent || widget.intent,
    displayMode: body.displayMode || widget.displayMode,
    canvasType: body.canvasType || widget.canvasType || "",
    inlineType: body.inlineType || widget.inlineType || "",
    title: body.title || widget.title,
    answer: body.answer || widget.answer,
    rows: rows.length >= toSafeList(widget.rows).length ? rows : toSafeList(widget.rows),
    items: rows.length >= toSafeList(widget.items).length ? rows : toSafeList(widget.items),
    features: firstSafeList(
      widget.features,
      widget.featureList,
      widget.searchableFeatures,
      widget.data?.features,
      widget.data?.featureList,
      widget.data?.searchableFeatures,
      body.features,
      body.featureList,
      body.searchableFeatures,
      body.data?.features,
      body.data?.featureList,
      body.data?.searchableFeatures,
    ),
    featureList: firstSafeList(
      widget.featureList,
      widget.features,
      widget.searchableFeatures,
      widget.data?.featureList,
      widget.data?.features,
      widget.data?.searchableFeatures,
      body.featureList,
      body.features,
      body.searchableFeatures,
      body.data?.featureList,
      body.data?.features,
      body.data?.searchableFeatures,
    ),
    variants: firstSafeList(widget.variantOptions, widget.variants, body.variants, body.data?.variants),
    variantOptions: firstSafeList(widget.variantOptions, body.variantOptions, body.data?.variantOptions, widget.variants),
    matchedVariants: firstSafeList(widget.matchedVariants, body.matchedVariants, body.data?.matchedVariants),
    featureGroups: firstSafeList(
      widget.featureGroups,
      widget.groups,
      widget.data?.featureGroups,
      widget.data?.groups,
      body.featureGroups,
      body.groups,
      body.data?.featureGroups,
      body.data?.groups,
    ),
    quickSpecs: firstSafeList(widget.quickSpecs, body.quickSpecs, body.data?.quickSpecs),
    highlights: firstSafeList(widget.highlights, body.highlights, body.data?.highlights),
    vehicle: widget.vehicle || body.vehicle || body.data?.vehicle || null,
    data: {
      ...(widget.data || {}),
      ...(body.data || {}),
    },
  };

  return {
    ...body,
    widget: enrichedWidget,
    widgets: [enrichedWidget],
    rows,
    items: firstSafeList(body.items, rows),
    features: firstSafeList(body.features, body.data?.features, enrichedWidget.features),
    featureGroups: firstSafeList(
      body.featureGroups,
      body.data?.featureGroups,
      enrichedWidget.featureGroups,
    ),
    variants: firstSafeList(body.variants, body.data?.variants, enrichedWidget.variantOptions, enrichedWidget.variants),
    actions: firstSafeList(body.actions, enrichedWidget.actions),
    leadingQuestions: firstSafeList(body.leadingQuestions, enrichedWidget.leadingQuestions),
  };
};


const normalizeAciBackendResponse = (raw) => {
  // PRESERVE_STABLE_ACI_BACKEND_CONTRACT_GUARD
  const stableContract = preserveStableAciBackendContract(raw);
  if (stableContract) return stableContract;

  if (typeof raw === "string") {
    return {
      ok: true,
      raw,
      answer: raw,
      canvasType: "",
      vehicle: null,
      contextPatch: {},
      actions: [],
      leadingQuestions: [],
      suggestions: [],
      widget: {
        __fromBackend: true,
        __rawCanvasType: "",
        answer: raw,
        contextPatch: {},
        actions: [],
        leadingQuestions: [],
      },
      rows: [],
      colors: [],
    };
  }

  const container =
    raw?.data?.response ||
    raw?.data?.result ||
    raw?.data ||
    raw?.response ||
    raw?.result ||
    raw ||
    {};

  const root =
    container?.summary ||
    container?.response?.summary ||
    container?.result?.summary ||
    container?.data?.summary ||
    container ||
    {};

  const canvas =
    root.canvas ||
    root.widget ||
    root.activeCanvas ||
    root.ui ||
    root.payload?.canvas ||
    root.payload?.widget ||
    container.canvas ||
    container.widget ||
    {};

  const knownWidget =
    root.widget ||
    root.canvasWidget ||
    root.payload?.widget ||
    canvas.widget ||
    canvas.data ||
    canvas.payload ||
    root.data ||
    container.widget ||
    container.data ||
    {};

  const knownRows = firstArrayFromKnownPaths(
    root.rows,
    root.items,
    root.variants,
    root.data?.rows,
    root.data?.items,
    root.data?.variants,
    root.widget?.rows,
    root.widget?.items,
    root.widget?.variants,
    knownWidget.rows,
    knownWidget.items,
    knownWidget.variants,
    canvas.rows,
    canvas.items,
    canvas.variants,
    container.rows,
    container.items,
    container.variants,
    container.data?.rows,
    container.data?.variants,
  );

  const deepPriceRows = firstMatchingArray(container, looksLikePriceRow);
  const rows = knownRows.length ? knownRows : deepPriceRows;

  const knownColors = firstArrayFromKnownPaths(
    root.colors,
    root.exteriorColors,
    root.availableColors,
    root.data?.colors,
    root.widget?.colors,
    knownWidget.colors,
    knownWidget.exteriorColors,
    knownWidget.availableColors,
    canvas.colors,
    container.colors,
    container.exteriorColors,
    container.availableColors,
    container.data?.colors,
  );

  const deepColors = firstMatchingArray(container, looksLikeColorRow);
  const colors = knownColors.length ? knownColors : deepColors;

  const featureGroups = firstArrayFromKnownPaths(
    root.featureGroups,
    root.groups,
    root.data?.featureGroups,
    root.data?.groups,
    root.widget?.featureGroups,
    root.widget?.groups,
    knownWidget.featureGroups,
    knownWidget.groups,
    knownWidget.data?.featureGroups,
    knownWidget.data?.groups,
    canvas.featureGroups,
    canvas.groups,
    container.featureGroups,
    container.groups,
    container.data?.featureGroups,
    container.data?.groups,
  );

  const knownFeatures = firstArrayFromKnownPaths(
    root.features,
    root.featureList,
    root.searchableFeatures,
    root.data?.features,
    root.data?.featureList,
    root.data?.searchableFeatures,
    root.widget?.features,
    root.widget?.featureList,
    root.widget?.searchableFeatures,
    knownWidget.features,
    knownWidget.featureList,
    knownWidget.searchableFeatures,
    knownWidget.data?.features,
    knownWidget.data?.featureList,
    knownWidget.data?.searchableFeatures,
    canvas.features,
    canvas.featureList,
    canvas.searchableFeatures,
    container.features,
    container.featureList,
    container.searchableFeatures,
    container.data?.features,
    container.data?.featureList,
    container.data?.searchableFeatures,
  );

  const deepFeatures = firstMatchingArray(container, looksLikeFeatureRow);
  const features = knownFeatures.length ? knownFeatures : deepFeatures;

  const contextPatch =
    root.contextPatch ||
    root.context_patch ||
    root.summary?.contextPatch ||
    container.contextPatch ||
    container.context_patch ||
    {};

  const actions = toSafeList(
    firstArrayFromKnownPaths(
      root.actions,
      root.quickActions,
      root.suggestedActions,
      root.data?.actions,
      knownWidget.actions,
      knownWidget.quickActions,
      knownWidget.suggestedActions,
      canvas.actions,
      container.actions,
      container.quickActions,
      container.suggestedActions,
      container.data?.actions,
    ),
  );

  const leadingQuestions = toSafeList(
    firstArrayFromKnownPaths(
      root.leadingQuestions,
      root.leading_questions,
      root.data?.leadingQuestions,
      knownWidget.leadingQuestions,
      knownWidget.leading_questions,
      canvas.leadingQuestions,
      container.leadingQuestions,
      container.leading_questions,
      container.data?.leadingQuestions,
    ),
  );

  const suggestions = toSafeList(
    firstArrayFromKnownPaths(
      root.suggestions,
      root.followUps,
      root.follow_up_suggestions,
      root.leadingQuestions,
      root.data?.suggestions,
      knownWidget.suggestions,
      knownWidget.followUps,
      canvas.suggestions,
      container.suggestions,
      container.followUps,
      container.follow_up_suggestions,
      container.leadingQuestions,
      container.data?.suggestions,
    ),
  );

  const vehicle =
    firstObject(
      root.vehicle,
      root.selectedVehicle,
      root.context?.selectedVehicle,
      root.payload?.vehicle,
      contextPatch.selectedVehicle,
      canvas.vehicle,
      knownWidget.vehicle,
      knownWidget.selectedVehicle,
      container.vehicle,
      container.selectedVehicle,
    ) ||
    firstMatchingObject(container, looksLikeVehicle) ||
    null;

  const normalizedVehicle = vehicle
    ? {
        ...vehicle,
        imageUrl: getDisplayCarImage(vehicle),
      }
    : null;

  const canvasType =
    root.canvasType ||
    root.canvas_type ||
    root.summary?.canvasType ||
    root.summary?.canvas_type ||
    root.type ||
    canvas.canvasType ||
    canvas.canvas_type ||
    canvas.type ||
    knownWidget.canvasType ||
    knownWidget.canvas_type ||
    knownWidget.type ||
    container.canvasType ||
    container.canvas_type ||
    container.type ||
    "";

  return {
    ok: true,
    raw,
    answer:
      root.answer ||
      root.text ||
      root.message ||
      root.reply ||
      container.answer ||
      "",
    canvasType,
    vehicle: normalizedVehicle,
    contextPatch,
    actions,
    leadingQuestions,
    suggestions,
    widget: {
      ...knownWidget,
      __fromBackend: true,
      __rawCanvasType: canvasType,
      ...(rows.length ? { rows } : {}),
      ...(colors.length ? { colors } : {}),
      ...(features.length
        ? {
            features,
            featureList: features,
            searchableFeatures: features,
          }
        : {}),
      ...(featureGroups.length ? { featureGroups } : {}),
      contextPatch,
      actions,
      leadingQuestions,
      answer:
        root.answer ||
        root.text ||
        root.message ||
        root.reply ||
        container.answer ||
        "",
    },
    rows,
    colors,
    features,
    featureGroups,
  };
};

const compactText = (value = "", max = 180) =>
  String(value || "")
    .trim()
    .slice(0, max);

const compactColorForChat = (color = {}) => {
  if (!isObject(color)) return null;

  const name =
    color.colorName ||
    color.name ||
    color.desktopName ||
    color.mobileName ||
    color.label ||
    "";

  if (!name && !color.hex && !color.id && !color._id) return null;

  return {
    id: compactText(color.id || color._id, 80),
    colorName: compactText(name, 80),
    name: compactText(name, 80),
    hex: compactText(color.hex || color.hexCode || color.colorHex, 20),
  };
};

const compactVehicleForChat = (vehicle = {}) => {
  if (!isObject(vehicle)) return null;

  const make = vehicle.make || vehicle.brand || "";
  const brand = vehicle.brand || vehicle.make || "";
  const model = vehicle.model || vehicle.modelName || "";
  const displayName =
    vehicle.displayName ||
    vehicle.name ||
    [make, model].filter(Boolean).join(" ");

  if (
    !make &&
    !brand &&
    !model &&
    !displayName &&
    !vehicle.id &&
    !vehicle._id
  ) {
    return null;
  }

  const selectedColor = compactColorForChat(vehicle.selectedColor || {});

  return {
    id: compactText(
      vehicle.id || vehicle._id || vehicle.vehicleId || vehicle.modelId,
      100,
    ),
    make: compactText(make, 80),
    brand: compactText(brand, 80),
    model: compactText(model, 100),
    modelName: compactText(vehicle.modelName || model, 100),
    displayName: compactText(displayName, 140),
    variant: compactText(vehicle.variant || vehicle.variantName, 120),
    variantName: compactText(vehicle.variantName || vehicle.variant, 120),
    city: compactText(vehicle.city || vehicle.cityName, 80),
    citySlug: compactText(vehicle.citySlug, 80),
    colorName: compactText(
      vehicle.colorName ||
        selectedColor?.colorName ||
        vehicle.selectedColor?.colorName ||
        vehicle.selectedColor?.name,
      80,
    ),
    selectedColor,
  };
};

const compactActionForChat = (action = {}) => {
  if (!isObject(action)) return null;

  return {
    id: compactText(action.id, 80),
    label: compactText(action.label || action.title, 120),
    query: compactText(action.query || action.message || action.text, 240),
    intent: compactText(action.intent, 80),
    canvasType: compactText(action.canvasType, 80),
    type: compactText(action.type, 80),
  };
};

const compactAciChatContext = (context = {}) => {
  if (!isObject(context)) return {};

  const hasExplicitAnchorVariant = Object.prototype.hasOwnProperty.call(
    context,
    "anchorVariant",
  );

  const selectedVehicle = compactVehicleForChat(
    context.selectedVehicle ||
      context.vehicle ||
      context.activeVehicle ||
      context.contextPatch?.selectedVehicle ||
      {},
  );

  const selectedColor = compactColorForChat(
    context.selectedColor ||
      context.contextPatch?.selectedColor ||
      selectedVehicle?.selectedColor ||
      {},
  );

  const lastAction = compactActionForChat(
    context.lastAction || context.action || context.activeAction || {},
  );

  const anchorVariant = compactText(
    hasExplicitAnchorVariant
      ? String(context.anchorVariant || "")
      : selectedVehicle?.variant || selectedVehicle?.variantName,
    120,
  );

  const scopedSelectedVehicle = selectedVehicle
    ? {
        ...selectedVehicle,
        variant: anchorVariant,
        variantName: anchorVariant,
      }
    : null;

  return {
    selectedVehicle: scopedSelectedVehicle,
    selectedColor,

    anchorMake: compactText(
      context.anchorMake || scopedSelectedVehicle?.make || scopedSelectedVehicle?.brand,
      80,
    ),
    anchorModel: compactText(
      context.anchorModel || scopedSelectedVehicle?.model,
      100,
    ),
    anchorVariant,
    anchorCity: compactText(
      context.anchorCity ||
        scopedSelectedVehicle?.citySlug ||
        scopedSelectedVehicle?.city ||
        "new-delhi",
      80,
    ),
    selectedComparisonSet: isObject(context.selectedComparisonSet)
      ? context.selectedComparisonSet
      : {},

    activeScreen: compactText(context.activeScreen || context.screen, 80),
    activeCanvasType: compactText(
      context.activeCanvasType ||
        context.lastCanvasType ||
        context.activeCanvasPayload?.canvasType ||
        context.activeCanvasPayload?.__rawCanvasType,
      80,
    ),

    lastIntent: compactText(
      context.lastIntent ||
        lastAction?.intent ||
        context.activeCanvasPayload?.intent,
      80,
    ),
    lastAction,
  };
};

export async function askAciAssistV2({ message, context = {}, signal } = {}) {
  const token = getAuthToken();
  const apiBase = process.env.REACT_APP_API_BASE_URL || API_BASE_URL || "";
  const privateEndpoint =
    process.env.REACT_APP_ACI_ASSIST_CHAT_ENDPOINT || DEFAULT_CHAT_ENDPOINT;
  const publicEndpoint =
    process.env.REACT_APP_ACI_ASSIST_PUBLIC_CHAT_ENDPOINT ||
    DEFAULT_PUBLIC_CHAT_ENDPOINT;
  const isPortalPage =
    typeof window !== "undefined" &&
    /^\/portal(?:\/|$)/i.test(String(window.location?.pathname || ""));
  const endpoint = isPortalPage || !token ? publicEndpoint : privateEndpoint;

  const url = cleanJoin(apiBase, endpoint);

  const compactContext = compactAciChatContext(context);

  const payload = {
    message,
    text: message,
    query: message,
    context: compactContext,
    source: "aci_assist_v2_frontend",
  };

  const payloadText = JSON.stringify(payload);

  if (process.env.NODE_ENV === "development") {
    console.log("[ACI REQUEST PAYLOAD SIZE]", payloadText.length, {
      message,
      context: compactContext,
    });
  }

  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: payloadText,
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      response.status === 413
        ? "Request was too large. I trimmed the chat context, please try again."
        : typeof body === "string"
          ? body
          : body?.message ||
            body?.error ||
            `ACI backend failed with ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  const normalized = normalizeAciBackendResponse(body);
  if (process.env.NODE_ENV === "development") {
    console.log("ACI Assist V2 normalized backend:", normalized);
  }
  return normalized;
}

export async function fetchAciVehicleLiveSnapshot({
  make = "",
  model = "",
  city = "",
  signal,
} = {}) {
  const normalizedMake = String(make || "").trim();
  const normalizedModel = String(model || "").trim();
  const normalizedCity = String(city || "Delhi").trim();

  if (!normalizedMake || !normalizedModel) {
    return {
      ok: false,
      reason: "missing_make_or_model",
      vehicle: null,
      rows: [],
      colors: [],
    };
  }

  const key = canonicalVehicleKey({
    make: normalizedMake,
    model: normalizedModel,
    city: normalizedCity,
  });
  const now = Date.now();

  const memoryHit = liveSnapshotMemory.get(key);
  if (memoryHit && now - Number(memoryHit.ts || 0) < LIVE_SNAPSHOT_TTL_MS) {
    return memoryHit.payload;
  }

  const localCache = readLiveSnapshotCache();
  const localHit = localCache[key];
  if (localHit && now - Number(localHit.ts || 0) < LIVE_SNAPSHOT_TTL_MS) {
    liveSnapshotMemory.set(key, localHit);
    return localHit.payload;
  }

  const token = getAuthToken();
  let mediaRows = [];
  let variantRowsRaw = [];

  const candidates = resolveApiBaseCandidates();
  for (const apiBase of candidates) {
    throwIfAborted(signal);

    const mediaUrl = cleanJoin(
      apiBase,
      `${VEHICLE_MEDIA_ENDPOINT}?${queryString({
        make: normalizedMake,
        model: normalizedModel,
      })}`,
    );
    const variantsUrl = cleanJoin(
      apiBase,
      `${VEHICLE_VARIANTS_ENDPOINT}?${queryString({
        make: normalizedMake,
        model: normalizedModel,
        city: normalizedCity,
      })}`,
    );

    const [mediaRes, variantsRes] = await Promise.allSettled([
      fetchJsonSafe(mediaUrl, token, signal),
      fetchJsonSafe(variantsUrl, token, signal),
    ]);

    throwIfAborted(signal);

    const nextMediaRows = Array.isArray(mediaRes.value?.data)
      ? mediaRes.value.data
      : [];
    const nextVariantRows = Array.isArray(variantsRes.value?.data)
      ? variantsRes.value.data
      : [];

    mediaRows = mediaRows.length ? mediaRows : nextMediaRows;
    variantRowsRaw = variantRowsRaw.length ? variantRowsRaw : nextVariantRows;

    if (nextMediaRows.length || nextVariantRows.length) {
      break;
    }
  }

  const scopedMediaRows = filterRowsByExactModel(
    mediaRows,
    normalizedModel,
    normalizedMake,
    { strict: true },
  );
  const scopedVariantRowsRaw = filterRowsByExactModel(
    variantRowsRaw,
    normalizedModel,
    normalizedMake,
  );

  const variantRows = scopedVariantRowsRaw
    .map((item, index) => normalizeLiveVariant(item, index, normalizedCity))
    .filter((item) => item.variant && (item.exShowroomPrice || item.onRoadPrice));

  const colors = scopedMediaRows
    .map((item, index) =>
      normalizeLiveColor(item, index, {
        requestedModel: normalizedModel,
        make: normalizedMake,
      }),
    )
    .filter((item) => item.name)
    .filter((item, index, list) => {
      const keyName = `${String(item.name || "")
        .trim()
        .toLowerCase()}|${item.hex}`;
      return list.findIndex((entry) => {
        const entryKey = `${String(entry.name || "")
          .trim()
          .toLowerCase()}|${entry.hex}`;
        return keyName === entryKey;
      }) === index;
    });

  const onRoadValues = variantRows
    .map((item) => parseAmount(item.onRoadPrice))
    .filter(Boolean);
  const exValues = variantRows
    .map((item) => parseAmount(item.exShowroomPrice))
    .filter(Boolean);
  const minOnRoad = onRoadValues.length ? Math.min(...onRoadValues) : 0;
  const maxOnRoad = onRoadValues.length ? Math.max(...onRoadValues) : 0;
  const minEx = exValues.length ? Math.min(...exValues) : 0;
  const imageScopedVariantRows = filterRowsByExactModel(
    variantRows,
    normalizedModel,
    normalizedMake,
    { strict: true },
  );
  const heroImage =
    getDisplayCarImage(
      scopedMediaRows.find(
        (item) =>
          item?.heroImageUrl ||
          item?.displayNormalizedImageUrl ||
          item?.defaultNormalizedImageUrl,
      ) ||
        scopedMediaRows[0] ||
        {},
    ) ||
    getDisplayCarImage({
      variants: imageScopedVariantRows,
      imageUrl: imageScopedVariantRows.find((item) => item.imageUrl)?.imageUrl || "",
    }) ||
    "";

  const payload = {
    ok: true,
    source: "vehicle_snapshot",
    vehicle: {
      make: normalizedMake,
      brand: normalizedMake,
      model: normalizedModel,
      city: normalizedCity,
      imageUrl: heroImage,
      heroImageUrl: heroImage,
      colors,
      variants: variantRows,
      variantCount: variantRows.length || undefined,
      selectedVariant: variantRows[0]?.variant || "",
      startingOnRoadPrice: formatCompactAmount(minOnRoad),
      exShowroomPrice: formatCompactAmount(minEx),
      priceRange:
        minOnRoad && maxOnRoad
          ? `${formatCompactAmount(minOnRoad)} – ${formatCompactAmount(maxOnRoad)}`
          : "",
    },
    rows: variantRows,
    colors,
  };

  const entry = { ts: now, payload };
  liveSnapshotMemory.set(key, entry);
  writeLiveSnapshotCache({
    ...localCache,
    [key]: entry,
  });

  if (process.env.NODE_ENV === "development") {
    console.log("ACI Assist V2 live snapshot:", {
      key,
      rows: payload.rows.length,
      colors: payload.colors.length,
    });
  }

  return payload;
}

export async function fetchAciPopularCars({
  city = "new-delhi",
  limit = 25,
  signal,
} = {}) {
  const normalizedCity = String(city || "new-delhi").trim() || "new-delhi";
  const normalizedLimit = Math.min(Math.max(Number(limit) || 25, 1), 25);
  const key = `${POPULAR_CARS_CACHE_VERSION}|${normalizedCity}|${normalizedLimit}`;
  const now = Date.now();

  const memoryHit = popularCarsMemory.get(key);
  if (memoryHit && now - Number(memoryHit.ts || 0) < POPULAR_CARS_TTL_MS) {
    return memoryHit.payload;
  }

  const localCache = readPopularCarsCache();
  const localHit = localCache[key];
  if (localHit && now - Number(localHit.ts || 0) < POPULAR_CARS_TTL_MS) {
    popularCarsMemory.set(key, localHit);
    return localHit.payload;
  }

  const token = getAuthToken();
  const candidates = resolveApiBaseCandidates();
  let lastError = null;

  for (const apiBase of candidates) {
    throwIfAborted(signal);

    const url = cleanJoin(
      apiBase,
      `${POPULAR_CARS_ENDPOINT}?${queryString({
        city: normalizedCity,
        limit: normalizedLimit,
      })}`,
    );

    try {
      const response = await fetchJsonSafe(url, token, signal);
      const rows = Array.isArray(response?.rows) ? response.rows : [];
      if (!response?.ok || !rows.length) continue;

      const payload = {
        ok: true,
        source: response.source || "v3cars",
        month: response.month || "",
        year: response.year || null,
        city: response.city || normalizedCity,
        count: Number(response.count || rows.length) || rows.length,
        rows,
      };
      const entry = { ts: now, payload };
      popularCarsMemory.set(key, entry);
      writePopularCarsCache({
        ...localCache,
        [key]: entry,
      });
      return payload;
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      lastError = error;
    }
  }

  return {
    ok: false,
    reason: lastError?.message || "popular_cars_unavailable",
    source: "v3cars",
    month: "",
    year: null,
    city: normalizedCity,
    count: 0,
    rows: [],
  };
}

export async function fetchAciBrandCatalog({
  brand = "",
  city = "Delhi",
  signal,
} = {}) {
  const cleanedBrand = String(brand || "").trim();
  const cleanedCity = String(city || "Delhi").trim();
  if (!cleanedBrand) {
    return { ok: false, rows: [] };
  }

  const token = getAuthToken();
  const candidates = resolveApiBaseCandidates();
  let models = [];

  for (const apiBase of candidates) {
    throwIfAborted(signal);

    const url = cleanJoin(
      apiBase,
      `${VEHICLE_MODELS_ENDPOINT}?${queryString({ make: cleanedBrand, city: cleanedCity })}`,
    );
    const response = await fetchJsonSafe(url, token, signal);
    const rows = Array.isArray(response?.data) ? response.data : [];
    if (rows.length) {
      models = rows;
      break;
    }
  }

  const list = models.slice(0, 24);
  if (!list.length) return { ok: true, rows: [] };

  const rows = await Promise.all(
    list.map(async (modelName) => {
      const model = String(modelName || "").trim();
      if (!model) return null;

      let variants = [];
      let media = [];

      for (const apiBase of candidates) {
        throwIfAborted(signal);

        const variantsUrl = cleanJoin(
          apiBase,
          `${VEHICLE_VARIANTS_ENDPOINT}?${queryString({
            make: cleanedBrand,
            model,
            city: cleanedCity,
          })}`,
        );
        const mediaUrl = cleanJoin(
          apiBase,
          `${VEHICLE_MEDIA_ENDPOINT}?${queryString({
            make: cleanedBrand,
            model,
          })}`,
        );

        const [variantsRes, mediaRes] = await Promise.allSettled([
          fetchJsonSafe(variantsUrl, token, signal),
          fetchJsonSafe(mediaUrl, token, signal),
        ]);

        throwIfAborted(signal);

        const nextVariants = Array.isArray(variantsRes.value?.data) ? variantsRes.value.data : [];
        const nextMedia = Array.isArray(mediaRes.value?.data) ? mediaRes.value.data : [];

        if (!variants.length) variants = nextVariants;
        if (!media.length) media = nextMedia;
        if (variants.length || media.length) break;
      }

      return normalizeBrandCard({
        brand: cleanedBrand,
        model,
        city: cleanedCity,
        variants,
        media,
      });
    }),
  );

  return {
    ok: true,
    brand: cleanedBrand,
    rows: rows.filter(Boolean),
  };
}
