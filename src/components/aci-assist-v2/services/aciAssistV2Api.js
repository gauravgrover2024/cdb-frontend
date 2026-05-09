import API_BASE_URL from "../../../config/apiBaseUrl";

const DEFAULT_CHAT_ENDPOINT = "/api/ai-agent/chat";
const DEFAULT_PUBLIC_CHAT_ENDPOINT = "/api/ai-agent/public-chat";
const VEHICLE_MEDIA_ENDPOINT = "/api/vehicles/media";
const VEHICLE_VARIANTS_ENDPOINT = "/api/vehicles/distinct/variants-with-price";
const LIVE_SNAPSHOT_TTL_MS = 1000 * 60 * 10;
const liveSnapshotMemory = new Map();

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
  `${String(make || "").trim().toLowerCase()}|${String(model || "")
    .trim()
    .toLowerCase()}|${String(city || "").trim().toLowerCase()}`;

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

const normalizeLiveColor = (row = {}, index = 0) => {
  const name =
    row.color_name ||
    row.colorName ||
    row.name ||
    row.label ||
    row.desktopName ||
    row.mobileName ||
    `Color ${index + 1}`;
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
    imageUrl: row.image_url || row.imageUrl || row.car_image_url || "",
    carImageUrl: row.car_image_url || row.image_url || row.imageUrl || "",
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

const fetchJsonSafe = async (url, token = "", signal) => {
  const response = await fetch(url, {
    method: "GET",
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

export const normalizeAciBackendResponse = (raw) => {
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

  const contextPatch =
    root.contextPatch ||
    root.context_patch ||
    root.summary?.contextPatch ||
    container.contextPatch ||
    container.context_patch ||
    {};

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

  const canvasType =
    root.canvasType ||
    root.canvas_type ||
    root.summary?.canvasType ||
    root.type ||
    canvas.canvasType ||
    canvas.canvas_type ||
    canvas.type ||
    knownWidget.canvasType ||
    container.canvasType ||
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
    vehicle,
    contextPatch,
    actions:
      root.actions ||
      root.quickActions ||
      root.suggestedActions ||
      container.actions ||
      [],
    leadingQuestions:
      root.leadingQuestions ||
      root.leading_questions ||
      container.leadingQuestions ||
      [],
    suggestions:
      root.suggestions ||
      root.followUps ||
      root.follow_up_suggestions ||
      root.leadingQuestions ||
      [],
    widget: {
      ...knownWidget,
      __fromBackend: true,
      __rawCanvasType: canvasType,
      ...(rows.length ? { rows } : {}),
      ...(colors.length ? { colors } : {}),
      contextPatch,
      actions:
        root.actions ||
        root.quickActions ||
        root.suggestedActions ||
        container.actions ||
        [],
      leadingQuestions:
        root.leadingQuestions ||
        root.leading_questions ||
        container.leadingQuestions ||
        [],
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

  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify({
      message,
      text: message,
      query: message,
      context,
      source: "aci_assist_v2_frontend",
    }),
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(
      typeof body === "string"
        ? body
        : body?.message ||
            body?.error ||
            `ACI backend failed with ${response.status}`,
    );
    error.status = response.status;
    error.body = body;
    throw error;
  }

  const normalized = normalizeAciBackendResponse(body);
  if (process.env.NODE_ENV !== "production") {
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

  const apiBase = process.env.REACT_APP_API_BASE_URL || API_BASE_URL || "";
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

  const token = getAuthToken();
  const [mediaRes, variantsRes] = await Promise.allSettled([
    fetchJsonSafe(mediaUrl, token, signal),
    fetchJsonSafe(variantsUrl, token, signal),
  ]);

  const mediaRows = Array.isArray(mediaRes.value?.data)
    ? mediaRes.value.data
    : [];
  const variantRowsRaw = Array.isArray(variantsRes.value?.data)
    ? variantsRes.value.data
    : [];

  const variantRows = variantRowsRaw
    .map((item, index) => normalizeLiveVariant(item, index, normalizedCity))
    .filter((item) => item.variant && (item.exShowroomPrice || item.onRoadPrice));

  const colors = mediaRows
    .map((item, index) => normalizeLiveColor(item, index))
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
  const heroImage =
    colors.find((item) => item.imageUrl)?.imageUrl ||
    variantRows.find((item) => item.imageUrl)?.imageUrl ||
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

  if (process.env.NODE_ENV !== "production") {
    console.log("ACI Assist V2 live snapshot:", {
      key,
      rows: payload.rows.length,
      colors: payload.colors.length,
    });
  }

  return payload;
}
