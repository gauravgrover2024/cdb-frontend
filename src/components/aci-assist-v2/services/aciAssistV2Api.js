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

const firstArray = (...values) => {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return value;
  }
  return [];
};

const firstObject = (...values) => {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  }
  return null;
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
    {};

  const widget =
    root.widget ||
    root.canvasWidget ||
    root.payload?.widget ||
    canvas.widget ||
    canvas.data ||
    canvas.payload ||
    root.data ||
    {};

  const vehicle =
    firstObject(
      root.vehicle,
      root.selectedVehicle,
      root.context?.selectedVehicle,
      root.payload?.vehicle,
      canvas.vehicle,
      widget.vehicle,
      widget.selectedVehicle,
    ) || null;

  const rows = firstArray(
    root.rows,
    root.items,
    root.variants,
    root.data?.rows,
    root.data?.items,
    root.data?.variants,
    root.widget?.rows,
    root.widget?.items,
    root.widget?.variants,
    widget.rows,
    widget.items,
    widget.variants,
    canvas.rows,
    canvas.items,
    canvas.variants,
  );

  const colors = firstArray(
    root.colors,
    root.exteriorColors,
    root.availableColors,
    root.data?.colors,
    root.widget?.colors,
    widget.colors,
    widget.exteriorColors,
    canvas.colors,
  );

  const canvasType =
    root.canvasType ||
    root.canvas_type ||
    root.summary?.canvasType ||
    root.type ||
    canvas.canvasType ||
    canvas.canvas_type ||
    canvas.type ||
    widget.canvasType ||
    "";

  return {
    ok: true,
    raw,
    answer:
      root.answer ||
      root.text ||
      root.message ||
      root.reply ||
      raw?.answer ||
      "",
    canvasType,
    vehicle,
    widget: {
      ...widget,
      ...(rows.length ? { rows } : {}),
      ...(colors.length ? { colors } : {}),
    },
    rows,
    colors,
    contextPatch:
      root.contextPatch ||
      root.context_patch ||
      root.summary?.contextPatch ||
      {},
    actions:
      root.actions ||
      root.quickActions ||
      root.suggestedActions ||
      [],
    leadingQuestions:
      root.leadingQuestions ||
      root.leading_questions ||
      [],
    suggestions:
      root.suggestions ||
      root.followUps ||
      root.follow_up_suggestions ||
      root.leadingQuestions ||
      [],
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

  return normalizeAciBackendResponse(body);
}
