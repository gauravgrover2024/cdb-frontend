const DEFAULT_CHAT_ENDPOINT = "/api/ai-agent/chat";

const cleanJoin = (base = "", path = "") => {
  if (!base) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${String(base).replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;
};

const getAuthToken = () => {
  try {
    return (
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      ""
    );
  } catch {
    return "";
  }
};

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

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
    ["variant", "variantname", "trim", "version", "name", "title"].includes(key),
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
    ["color", "colorname", "name", "label", "desktopname", "mobilename"].includes(key),
  );

  const hasColorValue = keys.some((key) =>
    ["hex", "hexcode", "colorhex", "imageurl", "carimageurl", "swatchimage"].includes(key),
  );

  return hasName && hasColorValue;
};

const looksLikeVehicle = (item) => {
  if (!isObject(item)) return false;

  const keys = Object.keys(item).map(normalizeKey);
  const hasModel = keys.includes("model") || keys.includes("displayname") || keys.includes("name");
  const hasVehicleSignal = keys.some((key) =>
    ["make", "brand", "variant", "city", "imageurl", "priceRange".toLowerCase()].includes(key),
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
  const apiBase = process.env.REACT_APP_API_BASE_URL || "";
  const endpoint =
    process.env.REACT_APP_ACI_ASSIST_CHAT_ENDPOINT || DEFAULT_CHAT_ENDPOINT;

  const url = cleanJoin(apiBase, endpoint);
  const token = getAuthToken();

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
        : body?.message || body?.error || `ACI backend failed with ${response.status}`,
    );
    error.status = response.status;
    error.body = body;
    throw error;
  }

  const normalized = normalizeAciBackendResponse(body);
  console.log("ACI Assist V2 normalized backend:", normalized);
  return normalized;
}
