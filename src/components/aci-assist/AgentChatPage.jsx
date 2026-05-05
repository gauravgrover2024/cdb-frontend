import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calculator,
  CarFront,
  ChevronRight,
  Crown,
  Gift,
  Heart,
  HelpCircle,
  ListChecks,
  Loader2,
  Mic,
  Palette,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Zap,
  Scale,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import aiAgentApi from "../../api/aiAgent";
import { useAuth } from "../../context/AuthContext";
import AgentWorkspaceCanvas from "./AgentWorkspaceCanvas";
import ConfirmationModal from "./ConfirmationModal";
import WhatCanIAskPanel from "./WhatCanIAskPanel";
import {
  compactObject,
  isActionDestructive,
  knownRouteAllowed,
  normalizeActionType,
  routeWithParams,
} from "./utils";

const createSessionId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return `aci-assist-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const starterSuggestions = [
  "Verna pricelist",
  "Show colors of Tata Safari",
  "Does Verna SX have sunroof?",
  "Compare Verna, City & Slavia",
  "Suggest automatic cars under ₹15 lakh",
  "Calculate EMI for Creta",
  "Help me choose the right variant",
  "Get best quotation",
];

const actionTiles = [
  {
    label: "Prices",
    description: "Check latest ex-showroom prices",
    icon: Tag,
    prompt: "Verna pricelist",
  },
  {
    label: "Features",
    description: "Explore top features",
    icon: Star,
    prompt: "Does Verna SX have sunroof?",
  },
  {
    label: "Compare",
    description: "Compare cars side by side",
    icon: Scale,
    prompt: "Compare Verna, City & Slavia",
  },
  {
    label: "Colors",
    description: "View colors & interiors",
    icon: Palette,
    prompt: "Show colors of Tata Safari",
  },
  {
    label: "EMI",
    description: "Calculate EMI instantly",
    icon: Calculator,
    prompt: "Calculate EMI for Creta",
  },
  {
    label: "Recommendations",
    description: "AI picks for you",
    icon: Crown,
    prompt: "Suggest automatic cars under ₹15 lakh",
  },
  {
    label: "Variant Help",
    description: "Find right variant",
    icon: ListChecks,
    prompt: "Help me choose the right variant",
  },
  {
    label: "Offers",
    description: "Latest offers & benefits",
    icon: Gift,
    prompt: "Get best quotation",
  },
];

const savedCars = [
  {
    name: "Hyundai Verna",
    meta: "1.5 MPi SX(O) IVT",
    price: "₹12.98 – 17.38 Lakh",
    image: "",
    tone: "from-[#f8fafc] via-white to-[#eff6ff]",
  },
  {
    name: "Tata Safari",
    meta: "2.0 Adventure+ AT",
    price: "₹16.19 – 27.34 Lakh",
    image: "",
    tone: "from-[#f8fafc] via-white to-[#eef2ff]",
  },
  {
    name: "Kia Seltos",
    meta: "1.5 HTX IVT",
    price: "₹11.13 – 20.51 Lakh",
    image: "",
    tone: "from-[#f8fafc] via-white to-[#f1f5f9]",
  },
];

const trendingCars = [
  {
    name: "Hyundai Verna",
    trim: "1.5 MPi SX(O) IVT",
    price: "₹ 12.98 – 17.38 Lakh",
    badge: "BEST SELLER",
    specs: ["Petrol", "17.7 kmpl", "115 PS", "Automatic"],
    image: "",
    tone: "from-[#f8fafc] via-white to-[#eff6ff]",
  },
  {
    name: "Tata Safari",
    trim: "2.0 Adventure+ AT",
    price: "₹ 16.19 – 27.34 Lakh",
    badge: "TOP RATED",
    specs: ["Diesel", "16.3 kmpl", "170 PS", "Automatic"],
    image: "",
    tone: "from-[#f8fafc] via-white to-[#eef2ff]",
  },
  {
    name: "Kia Seltos",
    trim: "1.5 HTX IVT",
    price: "₹ 11.13 – 20.51 Lakh",
    badge: "VALUE PICK",
    specs: ["Petrol", "17.8 kmpl", "115 PS", "Automatic"],
    image: "",
    tone: "from-[#f8fafc] via-white to-[#f1f5f9]",
  },
];

const helpTopics = [
  { label: "Prices", meta: "Latest ex-showroom prices", icon: Tag },
  { label: "Colors", meta: "Exterior & interior options", icon: Palette },
  { label: "Features", meta: "Top features & safety", icon: Star },
  { label: "Compare", meta: "Compare cars side by side", icon: Scale },
  { label: "EMI", meta: "Calculate & plan your EMI", icon: Calculator },
  { label: "Quotations", meta: "Get best quotations", icon: ShieldCheck },
];

const asWidgetTypes = (widgets) =>
  Array.isArray(widgets)
    ? widgets
        .map((widget) => widget?.type || widget?.widgetType)
        .filter(Boolean)
    : [];

const normalizeAgentResponse = (payload) => {
  const data =
    payload?.data && typeof payload.data === "object" ? payload.data : payload;

  return {
    assistantMessage:
      data?.assistantMessage ||
      data?.message ||
      "I found a response, but no readable answer text was returned.",
    intent: data?.intent,
    entities: data?.entities || {},
    confidence: data?.confidence,
    filters:
      Array.isArray(data?.filters) || typeof data?.filters === "object"
        ? data.filters
        : [],
    resultType: data?.resultType,
    displayMode: data?.displayMode || "",
    canvasType: data?.canvasType || null,
    inlineType: data?.inlineType || null,
    title: data?.title || "",
    answer: data?.answer || "",
    widgets: Array.isArray(data?.widgets) ? data.widgets : [],
    actions: Array.isArray(data?.actions) ? data.actions : [],
    conversationSuggestions: Array.isArray(data?.conversationSuggestions)
      ? data.conversationSuggestions
      : [],
    leadingQuestions: Array.isArray(data?.leadingQuestions)
      ? data.leadingQuestions
      : [],
    widgetTypes: Array.isArray(data?.widgetTypes)
      ? data.widgetTypes
      : asWidgetTypes(data?.widgets),
    sourceTransparency: data?.sourceTransparency,
    followUpSuggestions: Array.isArray(data?.followUpSuggestions)
      ? data.followUpSuggestions
      : [],
    contextSnapshot:
      data?.contextSnapshot && typeof data.contextSnapshot === "object"
        ? data.contextSnapshot
        : null,
    ambiguity: data?.ambiguity,
    queryPlan: data?.queryPlan,
    context: data?.context,
    selectedEntity: data?.selectedEntity,
    sessionId: data?.sessionId,
  };
};

const filtersToObject = (filters) => {
  if (!filters) return {};
  if (!Array.isArray(filters) && typeof filters === "object") return filters;
  if (!Array.isArray(filters)) return {};

  return Object.fromEntries(
    filters
      .map((filter, index) => [
        filter.key || filter.field || filter.label || `filter${index + 1}`,
        filter.value || filter.displayValue || filter.text,
      ])
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      ),
  );
};

const makeMessage = (role, content, extra = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  content,
  createdAt: new Date().toISOString(),
  ...extra,
});

const arrayFrom = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
};

const rowHasVariant = (row = {}) =>
  Boolean(
    row.variant ||
    row.variantName ||
    row.variant_name ||
    row.VariantName ||
    row.variantDisplayName,
  );

const rowHasModel = (row = {}) =>
  Boolean(row.model || row.name || row.title || row.modelName);

const selectionLabel = (selection = {}) => {
  const vehicle = [
    selection.brand || selection.make,
    selection.model,
    selection.variant ||
      selection.variantName ||
      selection.variant_name ||
      selection.name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    selection.displayName ||
    selection.customerName ||
    selection.customer ||
    selection.name ||
    vehicle ||
    "selected record"
  );
};

const uniqueRows = (rows = []) => {
  const seen = new Set();

  return rows.filter((row, index) => {
    if (!row || typeof row !== "object") return false;

    const key =
      [
        row.id,
        row._id,
        row.variantId,
        row.modelId,
        row.brand || row.make,
        row.model,
        row.variant || row.variantName || row.variant_name || row.name,
      ]
        .filter(Boolean)
        .join("|")
        .toLowerCase() || `row-${index}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const cleanSelectionRows = (rows) =>
  arrayFrom(rows)
    .filter((row) => row && typeof row === "object")
    .map((row) => compactObject(row));

const selectionContextFromAction = (action = {}) => {
  const selectedOptions = cleanSelectionRows(
    action.selectedOptions || action.options,
  );

  const selectedVariantRows = uniqueRows([
    ...cleanSelectionRows(action.selectedVariants),
    ...cleanSelectionRows(action.variantRows),
    ...cleanSelectionRows(action.selectedVariant),
    ...selectedOptions.filter(rowHasVariant),
  ]);

  const selectedModelRows = uniqueRows([
    ...cleanSelectionRows(action.selectedModels),
    ...cleanSelectionRows(action.modelRows),
    ...cleanSelectionRows(action.selectedModel),
    ...selectedOptions.filter((row) => rowHasModel(row) && !rowHasVariant(row)),
  ]);

  const selectedModels = Array.from(
    new Set(
      [
        ...selectedModelRows.map(
          (row) => row.model || row.modelName || row.name || row.title,
        ),
        ...selectedVariantRows.map((row) => row.model),
      ]
        .filter(Boolean)
        .map(String),
    ),
  );

  return compactObject({
    ambiguityResolved: true,

    selectedOptions: selectedOptions.length ? selectedOptions : undefined,

    selectedVariantRows: selectedVariantRows.length
      ? selectedVariantRows
      : undefined,

    selectedVariants: selectedVariantRows.length
      ? selectedVariantRows
      : undefined,

    selectedModelRows: selectedModelRows.length ? selectedModelRows : undefined,

    selectedModels: selectedModels.length ? selectedModels : undefined,
  });
};

const deriveRoute = (action = {}) => {
  if (action.route) return action.route;

  const moduleName = String(action.module || action.source || "").toLowerCase();
  const id =
    action.id ||
    action.recordId ||
    action.caseId ||
    action.loanId ||
    action.customerId;

  if (/insurance/.test(moduleName) && id) return `/insurance/edit/${id}`;
  if (/loan/.test(moduleName) && id) return `/loans/edit/${id}`;
  if (/customer/.test(moduleName) && id) return `/customers/edit/${id}`;
  if (/payment/.test(moduleName) && (action.loanId || id))
    return `/payments/${action.loanId || id}`;
  if (/price|vehicle/.test(moduleName)) return "/vehicles/price-list";

  return "";
};

const deriveDashboardRoute = (action = {}) => {
  if (action.route) return action.route;

  const moduleName = String(
    action.module || action.dashboard || "",
  ).toLowerCase();

  if (/insurance/.test(moduleName)) return "/insurance";
  if (/loan/.test(moduleName)) return "/loans";
  if (/payout|receivable/.test(moduleName)) return "/payouts/receivables";
  if (/payment/.test(moduleName)) return "/payments";
  if (/used/.test(moduleName)) return "/used-cars";
  if (/price|vehicle/.test(moduleName)) return "/vehicles/price-list";

  return "";
};

const hasCanvasPayload = (message) => {
  if (!message || message.role !== "assistant") return false;

  return Boolean(
    message.resultType ||
    message.intent ||
    message.ambiguity ||
    message.queryPlan ||
    (Array.isArray(message.widgets) && message.widgets.length) ||
    (Array.isArray(message.widgetTypes) && message.widgetTypes.length) ||
    (Array.isArray(message.followUpSuggestions) &&
      message.followUpSuggestions.length),
  );
};

const cx = (...parts) => parts.filter(Boolean).join(" ");

function AciOrb({ size = "large" }) {
  const shell = size === "large" ? "h-36 w-36 md:h-44 md:w-44" : "h-16 w-16";
  const face = size === "large" ? "h-[72%] w-[72%]" : "h-[70%] w-[70%]";
  const sparkle = size === "large" ? 42 : 19;

  return (
    <div className={cx("relative flex items-center justify-center", shell)}>
      <div className="absolute inset-x-3 bottom-1 h-8 rounded-full bg-[#2563eb]/20 blur-xl" />

      <div className="absolute inset-0 rounded-full border border-white/90 bg-[radial-gradient(circle_at_28%_22%,#ffffff_0,#f8fafc_34%,#dbeafe_70%,#ffffff_100%)] shadow-[0_28px_80px_-36px_rgba(15,23,42,0.7)]" />

      <div className="absolute inset-[8%] rounded-full border border-white/80 bg-white/30 shadow-inner" />

      <div
        className={cx(
          "relative flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_34%_25%,#1e3a8a_0,#0f172a_48%,#020617_100%)] text-[#93c5fd] shadow-[inset_0_0_30px_rgba(147,197,253,0.32),0_0_0_1px_rgba(255,255,255,0.25)]",
          face,
        )}
      >
        <Sparkles size={sparkle} strokeWidth={1.55} />
      </div>

      {size === "large" ? (
        <>
          <div className="absolute inset-3 rounded-full border border-[#93c5fd]/35" />
          <div className="absolute left-[-12%] right-[-12%] top-[52%] h-12 -rotate-12 rounded-[50%] border border-[#93c5fd]/35" />
        </>
      ) : null}
    </div>
  );
}

function PromptChips({ onAsk, loading }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-10 top-1/2 h-10 -translate-y-1/2 rounded-full bg-[#2563eb]/10 blur-2xl" />

      <div className="relative flex flex-wrap justify-center gap-2.5 md:gap-3">
        {starterSuggestions.map((suggestion, index) => {
          const Icon =
            index % 4 === 0
              ? Tag
              : index % 4 === 1
                ? Palette
                : index % 4 === 2
                  ? CarFront
                  : Scale;

          return (
            <motion.button
              key={suggestion}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * index }}
              onClick={() => onAsk(suggestion)}
              disabled={loading}
              className="group inline-flex items-center gap-2.5 rounded-full border border-[#cbd5e1] bg-white px-4 py-2.5 text-xs font-black text-[#1e293b] shadow-[0_16px_40px_-28px_rgba(15,23,42,0.55),inset_0_1px_0_rgba(255,255,255,0.95)] transition hover:-translate-y-0.5 hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe] transition group-hover:bg-white">
                <Icon size={13.5} strokeWidth={2.1} />
              </span>
              {suggestion}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function ActionTileGrid({ onAsk, loading }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-[24px] border border-[#dbe3ef] bg-white/90 shadow-[0_22px_70px_-54px_rgba(15,23,42,0.36)] backdrop-blur-xl md:grid-cols-4 lg:grid-cols-8">
      {actionTiles.map((tile) => {
        const Icon = tile.icon;

        return (
          <button
            key={tile.label}
            type="button"
            onClick={() => onAsk(tile.prompt)}
            disabled={loading}
            className="group min-h-[118px] border-b border-r border-[#e2e8f0] px-3 py-4 text-center transition hover:bg-[#eff6ff]/80 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[128px]"
          >
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#f8fafc] text-[#2563eb] ring-1 ring-[#bfdbfe] transition group-hover:bg-white group-hover:text-[#1e40af]">
              <Icon size={22} strokeWidth={1.85} />
            </span>

            <span className="mt-3 block text-sm font-black text-[#0f172a]">
              {tile.label}
            </span>

            <span className="mx-auto mt-1.5 block max-w-[112px] text-[11px] font-semibold leading-4 text-[#64748b]">
              {tile.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CarArt({
  image,
  alt,
  tone = "from-[#f8fafc] via-white to-[#eff6ff]",
}) {
  return (
    <div
      className={cx(
        "relative h-36 overflow-hidden rounded-[22px] bg-gradient-to-br",
        tone,
      )}
    >
      <div className="absolute inset-x-8 bottom-5 h-7 rounded-full bg-[#334155]/20 blur-xl" />

      {image ? (
        <img
          src={image}
          alt={alt}
          className="absolute left-1/2 top-1/2 max-h-[112px] w-[88%] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_20px_22px_rgba(15,23,42,0.2)]"
        />
      ) : (
        <div className="absolute left-1/2 top-1/2 flex h-20 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[34px] bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#020617] text-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.8)]">
          <CarFront size={54} strokeWidth={1.35} />
        </div>
      )}

      <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-white/60 blur-lg" />
      <div className="absolute left-4 top-5 h-16 w-16 rounded-full bg-[#bfdbfe]/35 blur-xl" />
    </div>
  );
}

function MiniCarArt({ image, tone = "from-[#f8fafc] via-white to-[#eff6ff]" }) {
  return (
    <div
      className={cx(
        "relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-gradient-to-br ring-1 ring-[#dbe3ef]",
        tone,
      )}
    >
      {image ? (
        <img
          src={image}
          alt=""
          className="h-10 w-14 object-contain drop-shadow-sm"
        />
      ) : (
        <CarFront size={25} strokeWidth={1.55} className="text-[#475569]" />
      )}
    </div>
  );
}

function TrendingCars({ onAsk, loading }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={17} className="text-[#2563eb]" />
            <h3 className="font-serif text-[22px] font-semibold tracking-[-0.045em] text-[#0f172a] md:text-[25px]">
              Trending cars for you
            </h3>
          </div>

          <p className="mt-0.5 text-sm font-semibold text-[#64748b]">
            Popular choices in India right now
          </p>
        </div>

        <button
          type="button"
          onClick={() => onAsk("Show popular new cars in India")}
          className="inline-flex items-center gap-1.5 text-sm font-black text-[#2563eb] hover:text-[#1d4ed8]"
        >
          View all <ChevronRight size={17} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {trendingCars.map((car) => (
          <button
            key={car.name}
            type="button"
            onClick={() => onAsk(`${car.name} pricelist`)}
            disabled={loading}
            className="group overflow-hidden rounded-[24px] border border-[#dbe3ef] bg-white p-3 text-left shadow-[0_18px_60px_-48px_rgba(15,23,42,0.42)] transition hover:-translate-y-1 hover:border-[#93c5fd] hover:shadow-[0_26px_78px_-50px_rgba(37,99,235,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="relative">
              <CarArt image={car.image} alt={car.name} tone={car.tone} />

              <span className="absolute left-3 top-3 rounded-full bg-[#eff6ff]/95 px-2.5 py-1 text-[10px] font-black tracking-wide text-[#1e40af] ring-1 ring-[#bfdbfe]">
                {car.badge}
              </span>

              <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#64748b] ring-1 ring-[#dbe3ef]">
                <Heart size={17} />
              </span>
            </div>

            <div className="px-1 pb-1 pt-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <h4 className="font-serif text-xl font-semibold tracking-[-0.04em] text-[#0f172a]">
                  {car.name}
                </h4>
                <p className="text-xs font-bold text-[#64748b]">{car.trim}</p>
              </div>

              <p className="mt-1.5 text-sm font-black text-[#0f172a]">
                {car.price}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#64748b]">
                Ex-showroom
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {car.specs.map((spec) => (
                  <span
                    key={spec}
                    className="rounded-full border border-[#dbe3ef] bg-[#f8fafc] px-2.5 py-1 text-[10px] font-bold text-[#475569]"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function EmptyHomeExperience({ onAsk, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <section className="relative overflow-hidden rounded-[34px] border border-[#dbe3ef] bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#eff6ff_100%)] p-5 shadow-[0_34px_100px_-72px_rgba(15,23,42,0.4)] md:p-8">
        <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-[#dbeafe]/45 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-[#e0e7ff]/45 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(255,255,255,0.92),transparent_34%)]" />

        <div className="relative grid items-center gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="relative flex min-h-[235px] items-center justify-center overflow-hidden rounded-[30px] border border-white/80 bg-[radial-gradient(circle_at_50%_38%,#ffffff_0%,#eff6ff_48%,#dbeafe_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <div className="absolute inset-8 rounded-full border border-[#8fa3bf]/35" />
            <div className="absolute left-8 right-8 top-[58%] h-14 -rotate-6 rounded-[50%] border border-[#8fa3bf]/35" />
            <div className="absolute left-14 right-14 top-[62%] h-10 rotate-6 rounded-[50%] border border-white/70" />
            <AciOrb />
          </div>

          <div className="max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-white/80 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#1e40af] shadow-sm">
              <Sparkles size={14} />
              Intelligent new car concierge
            </div>

            <h2 className="font-serif text-[42px] font-semibold leading-[1.02] tracking-[-0.065em] text-[#0f172a] md:text-[64px] xl:text-[72px]">
              Hi, I’m <span className="text-[#2563eb]">ACI Assist.</span>
              <br />
              Ask me anything about new cars.
            </h2>

            <div className="mt-6 max-w-3xl rounded-[24px] border border-[#dbe3ef] bg-white/86 p-5 shadow-[0_22px_70px_-54px_rgba(15,23,42,0.38)] backdrop-blur-xl">
              <p className="text-[15px] font-semibold leading-8 text-[#475569] md:text-base">
                I can help you with{" "}
                <span className="font-black text-[#2563eb]">prices</span>,{" "}
                <span className="font-black text-[#2563eb]">features</span>,{" "}
                <span className="font-black text-[#2563eb]">comparisons</span>,{" "}
                <span className="font-black text-[#2563eb]">colors</span>,{" "}
                <span className="font-black text-[#2563eb]">EMI</span> options,{" "}
                <span className="font-black text-[#2563eb]">variants</span>,
                expert recommendations and the best quotations — so you can buy
                with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PromptChips onAsk={onAsk} loading={loading} />
      <ActionTileGrid onAsk={onAsk} loading={loading} />
      <TrendingCars onAsk={onAsk} loading={loading} />
    </motion.div>
  );
}

function RightInsightRail({ onAsk, loading, onHelp }) {
  return (
    <aside className="hidden space-y-4 xl:block">
      <section className="overflow-hidden rounded-[28px] border border-[#263449] bg-[radial-gradient(circle_at_20%_0%,#1e3a8a_0%,#0f172a_42%,#020617_100%)] p-4 text-white shadow-[0_28px_80px_-58px_rgba(15,23,42,0.85)]">
        <div className="relative">
          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#93c5fd]/25 blur-2xl" />

          <div className="relative flex items-center gap-2">
            <Sparkles size={18} className="text-[#93c5fd]" />
            <h3 className="text-sm font-black">ACI Concierge</h3>
          </div>

          <p className="relative mt-3 text-sm font-semibold leading-6 text-white/70">
            Premium assistance for prices, comparisons, variants, EMI and
            quotations — all in one conversation.
          </p>

          <button
            type="button"
            onClick={onHelp}
            className="relative mt-4 w-full rounded-[18px] bg-white px-4 py-3 text-sm font-black text-[#111827] shadow-[0_18px_45px_-30px_rgba(255,255,255,0.75)] transition hover:-translate-y-0.5 hover:bg-[#eff6ff]"
          >
            Explore what I can do
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#dbe3ef] bg-white/92 p-4 shadow-[0_24px_70px_-58px_rgba(15,23,42,0.42)] backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={17} className="text-rose-500" />
            <h3 className="text-sm font-black text-[#0f172a]">Saved cars</h3>
          </div>

          <button
            type="button"
            className="text-xs font-black text-[#2563eb] hover:text-[#1d4ed8]"
          >
            View all
          </button>
        </div>

        <div className="space-y-3">
          {savedCars.map((car) => (
            <button
              key={car.name}
              type="button"
              onClick={() => onAsk(`${car.name} pricelist`)}
              disabled={loading}
              className="flex w-full items-center gap-3 rounded-[20px] border border-transparent p-2 text-left transition hover:border-[#93c5fd] hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MiniCarArt image={car.image} tone={car.tone} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#0f172a]">
                  {car.name}
                </p>
                <p className="truncate text-xs font-semibold text-[#64748b]">
                  {car.meta}
                </p>
                <p className="mt-0.5 truncate text-xs font-black text-[#334155]">
                  {car.price}
                </p>
              </div>

              <Heart size={16} className="text-[#2563eb]" fill="currentColor" />
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#dbe3ef] bg-white/92 p-4 shadow-[0_24px_70px_-58px_rgba(15,23,42,0.42)] backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2">
          <HelpCircle size={17} className="text-[#2563eb]" />
          <h3 className="text-sm font-black text-[#0f172a]">Buying tools</h3>
        </div>

        <div className="space-y-1.5">
          {helpTopics.map((topic) => {
            const Icon = topic.icon;

            return (
              <button
                key={topic.label}
                type="button"
                onClick={onHelp}
                className="flex w-full items-center justify-between rounded-[18px] border border-transparent px-2.5 py-2.5 text-left transition hover:border-[#93c5fd] hover:bg-[#eff6ff]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe]">
                    <Icon size={17} />
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-[#0f172a]">
                      {topic.label}
                    </span>
                    <span className="block truncate text-xs font-semibold text-[#64748b]">
                      {topic.meta}
                    </span>
                  </span>
                </span>

                <ChevronRight size={16} className="text-[#94a3b8]" />
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

function PremiumInputDock({
  input,
  setInput,
  onSubmit,
  loading,
  placeholder = "Ask ACI Assist about any new car...",
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(input);
      }}
      className="rounded-[30px] border border-[#cbd5e1] bg-white/95 p-2.5 shadow-[0_28px_90px_-52px_rgba(15,23,42,0.55),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#eff6ff,#dbeafe)] text-[#2563eb] ring-1 ring-[#bfdbfe]">
          <Sparkles size={21} strokeWidth={1.8} />
        </div>

        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={loading}
          placeholder={placeholder}
          className="h-12 min-w-0 flex-1 rounded-[18px] border-0 bg-transparent px-3 text-[15px] font-semibold text-[#111827] outline-none placeholder:text-[#9ca3af] disabled:opacity-60"
        />

        <button
          type="button"
          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[17px] border border-[#dbe3ef] bg-[#f8fafc] text-[#4b5563] transition hover:bg-white md:flex"
          aria-label="Voice input"
        >
          <Mic size={18} />
        </button>

        <button
          type="submit"
          disabled={loading || !String(input || "").trim()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[19px] bg-[linear-gradient(135deg,#2563eb,#1d4ed8)] text-white shadow-[0_20px_44px_-22px_rgba(37,99,235,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
          aria-label="Send message"
        >
          {loading ? (
            <Loader2 size={19} className="animate-spin" />
          ) : (
            <SendHorizontal size={19} />
          )}
        </button>
      </div>
    </form>
  );
}

function getRichMessageIntro(message) {
  const intent = String(message?.intent || "").toLowerCase();
  const widgets = Array.isArray(message?.widgets) ? message.widgets : [];
  const firstWidgetType = String(
    widgets[0]?.type || widgets[0]?.widgetType || "",
  ).toLowerCase();

  if (
    intent.includes("vehicle_feature_answer") ||
    firstWidgetType.includes("vehicle_feature_answer")
  ) {
    return "Here’s what I found for this feature.";
  }

  if (
    intent.includes("vehicle_pricelist") ||
    firstWidgetType.includes("vehicle_pricelist")
  ) {
    return "Here’s the price list. You can select any variant to update the details.";
  }

  if (
    intent.includes("vehicle_colors") ||
    firstWidgetType.includes("vehicle_colors")
  ) {
    return "Here are the available colors. Tap any color to preview it.";
  }

  if (
    intent.includes("vehicle_features") ||
    firstWidgetType.includes("vehicle_features")
  ) {
    return "Here’s the full feature catalogue. Choose a variant to explore its features.";
  }

  if (intent.includes("comparison") || firstWidgetType.includes("comparison")) {
    return "Here’s a side-by-side comparison based on your request.";
  }

  if (intent.includes("emi") || firstWidgetType.includes("emi")) {
    return "Here’s the EMI estimate. You can adjust the assumptions to refine it.";
  }

  return "Here’s the information you asked for.";
}

function ChatThread({
  messages,
  loading,
  onAsk,
  onAction,
  onFollowUp,
  onAmbiguitySelect,
  showQueryPlan,
  bottomRef,
}) {
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (loading) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
      return;
    }

    if (!lastMessage) return;

    const isRichAssistantMessage =
      lastMessage.role === "assistant" && hasCanvasPayload(lastMessage);

    requestAnimationFrame(() => {
      if (isRichAssistantMessage) {
        const messageNode = document.getElementById(
          `aci-message-${lastMessage.id}`,
        );

        messageNode?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        return;
      }

      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, [messages, loading, bottomRef]);

  return (
    <div className="space-y-4 overflow-visible">
      <AnimatePresence initial={false}>
        {messages.map((message) => {
          const rich = hasCanvasPayload(message);

          return (
            <motion.div
              key={message.id}
              id={`aci-message-${message.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className={cx(
                "flex scroll-mt-28",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {message.role === "user" ? (
                <div className="max-w-[82%] rounded-[24px] bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] px-5 py-4 text-sm font-semibold leading-6 text-white shadow-[0_18px_48px_-32px_rgba(37,99,235,0.75)] md:max-w-[62%]">
                  {message.content}
                </div>
              ) : (
                <div
                  className={cx(
                    "w-full max-w-full overflow-visible",
                    rich
                      ? "px-0 py-1"
                      : "rounded-[30px] border border-[#dbe3ef] bg-white/88 p-3 shadow-[0_22px_70px_-56px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:p-4 md:p-5",
                  )}
                >
                  {!rich ? (
                    <div className="flex gap-3">
                      <div className="hidden shrink-0 sm:block">
                        <AciOrb size="small" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-[0.15em] text-[#2563eb]">
                            ACI Assist
                          </span>

                          {message.confidence !== undefined &&
                          message.confidence !== null ? (
                            <span className="rounded-full bg-[#f8fafc] px-2 py-0.5 text-[10px] font-black text-[#64748b]">
                              {Math.round(Number(message.confidence) * 100)}%
                              confidence
                            </span>
                          ) : null}
                        </div>

                        <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-[#475569] md:text-[15px]">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {rich ? (
                    <div className="space-y-4 overflow-visible">
                      <div className="flex items-start gap-3">
                        <div className="hidden shrink-0 sm:block">
                          <AciOrb size="small" />
                        </div>

                        <div className="max-w-[720px] rounded-[24px] border border-[#dbe3ef] bg-white/88 px-5 py-4 shadow-[0_18px_54px_-44px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-[0.15em] text-[#2563eb]">
                              ACI Assist
                            </span>

                            {message.confidence !== undefined &&
                            message.confidence !== null ? (
                              <span className="rounded-full bg-[#f8fafc] px-2 py-0.5 text-[10px] font-black text-[#64748b]">
                                {Math.round(Number(message.confidence) * 100)}%
                                confidence
                              </span>
                            ) : null}
                          </div>

                          <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-[#475569] md:text-[15px]">
                            {message.content || getRichMessageIntro(message)}
                          </p>
                        </div>
                      </div>

                      <div className="overflow-visible pl-0 sm:pl-[52px]">
                        <AgentWorkspaceCanvas
                          message={message}
                          loading={false}
                          onAsk={onAsk}
                          onAction={onAction}
                          onFollowUp={onFollowUp}
                          onAmbiguitySelect={(selection) =>
                            onAmbiguitySelect(selection, message)
                          }
                          showQueryPlan={showQueryPlan}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {loading ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start"
        >
          <div className="flex items-center gap-3 rounded-[24px] border border-[#dbe3ef] bg-white px-5 py-4 text-sm font-black text-[#475569] shadow-sm">
            <Loader2 size={18} className="animate-spin text-[#2563eb]" />
            Thinking through your request...
          </div>
        </motion.div>
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
}

function ChatExperience({
  messages,
  loading,
  onAsk,
  onAction,
  onFollowUp,
  onAmbiguitySelect,
  showQueryPlan,
  bottomRef,
  onClear,
}) {
  return (
    <section className="w-full space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 rounded-full border border-[#cbd5e1] bg-white/72 px-4 py-2 text-xs font-black text-[#475569] shadow-sm backdrop-blur-xl transition hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#1e40af]"
        >
          <Sparkles size={14} />
          New chat
        </button>
      </div>

      <ChatThread
        messages={messages}
        loading={loading}
        onAsk={onAsk}
        onAction={onAction}
        onFollowUp={onFollowUp}
        onAmbiguitySelect={onAmbiguitySelect}
        showQueryPlan={showQueryPlan}
        bottomRef={bottomRef}
      />
    </section>
  );
}

export default function AgentChatPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  const [sessionId, setSessionId] = useState(createSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState({});
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [, setResultReferences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showQueryPlan, setShowQueryPlan] = useState(false);

  const canShowQueryPlan = ["admin", "superadmin", "developer", "dev"].includes(
    String(user?.role || "").toLowerCase(),
  );

  const empty = messages.length === 0;

  const clearChat = () => {
    abortRef.current?.abort();
    setSessionId(createSessionId());
    setMessages([]);
    setInput("");
    setContext({});
    setSelectedEntity(null);
    setActiveFilters({});
    setResultReferences([]);
    setError("");
    setNotice("");
    setPendingAction(null);
  };

  const sendMessage = useCallback(
    async (rawMessage, overrides = {}) => {
      const suggestion =
        rawMessage && typeof rawMessage === "object" && !Array.isArray(rawMessage)
          ? rawMessage
          : null;
      const text = String(
        suggestion?.query || suggestion?.message || rawMessage || "",
      ).trim();
      if (!text || loading) return;

      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError("");
      setNotice("");
      setInput("");

      const baseContext = overrides.replaceContext ? {} : context;
      const suggestionEntities = compactObject({
        ...(suggestion?.entities || {}),
      });
      const suggestionContextPatch = compactObject({
        ...(suggestion?.contextPatch || {}),
        actionContext: suggestion || undefined,
        entities: Object.keys(suggestionEntities).length
          ? {
              ...(baseContext?.entities || {}),
              ...(overrides.context?.entities || {}),
              ...suggestionEntities,
            }
          : undefined,
      });
      const nextContext = compactObject({
        ...baseContext,
        ...(overrides.context || {}),
        ...suggestionContextPatch,
      });

      const hasSelectedEntityOverride = Object.prototype.hasOwnProperty.call(
        overrides,
        "selectedEntity",
      );

      const nextSelectedEntity = hasSelectedEntityOverride
        ? overrides.selectedEntity || undefined
        : suggestion?.selectedEntity || selectedEntity || undefined;

      const baseFilters = overrides.keepFilters
        ? filtersToObject(activeFilters)
        : {};

      const nextFilters = compactObject({
        ...baseFilters,
        ...filtersToObject(suggestion?.filters),
        ...filtersToObject(overrides.filters),
      });

      const userMessage = makeMessage(
        "user",
        overrides.displayText || suggestion?.title || text,
      );
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await aiAgentApi.chat(
          {
            message: text,
            sessionId,
            context: nextContext,
            selectedEntity: nextSelectedEntity,
            filters: nextFilters,
          },
          { signal: controller.signal },
        );

        const normalized = normalizeAgentResponse(response);

        if (normalized.sessionId) setSessionId(normalized.sessionId);

        setContext(
          compactObject({
            ...nextContext,
            ...(normalized.context || {}),
            intent: normalized.intent,
            entities: normalized.entities,
          }),
        );

        setSelectedEntity(null);

        setActiveFilters(
          filtersToObject(normalized.filters) || nextFilters || {},
        );

        setResultReferences(normalized.widgets || []);

        setMessages((prev) => [
          ...prev,
          makeMessage("assistant", normalized.assistantMessage, {
            ...normalized,
            userPrompt: text,
          }),
        ]);
      } catch (err) {
        if (err?.name === "AbortError") return;

        const message =
          err?.message || "ACI Assist could not reach the agent endpoint.";
        setError(message);

        setMessages((prev) => [
          ...prev,
          makeMessage(
            "assistant",
            "I could not complete that request. Please try again.",
            {
              widgets: [{ type: "unavailable_notice", message }],
            },
          ),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [activeFilters, context, loading, selectedEntity, sessionId],
  );

  const handleAmbiguitySelect = (selection, message) => {
    const selectionType = String(
      selection?.type || selection?.action || "",
    ).toLowerCase();

    const explicitMessage =
      selection?.message || selection?.query || selection?.followUpQuery;

    const isCompareSelection =
      /compare_selected|compare_all|compare/.test(selectionType) ||
      (Array.isArray(selection?.options) && explicitMessage);

    if (isCompareSelection && explicitMessage) {
      const actionLike = {
        ...selection,
        selectedOptions: selection.selectedOptions || selection.options,
        message: explicitMessage,
      };

      sendMessage(explicitMessage, {
        context: selectionContextFromAction(actionLike),
        keepFilters: true,
        displayText: explicitMessage,
      });

      return;
    }

    const nextMessage =
      explicitMessage ||
      message.userPrompt ||
      message.content ||
      "Use selected record";

    sendMessage(nextMessage, {
      selectedEntity: selection,
      context: selectionContextFromAction({
        selectedOptions: [selection],
      }),
      keepFilters: true,
      displayText: `Use ${selectionLabel(selection)}`,
    });
  };

  const runNavigationAction = (action = {}) => {
    const type = normalizeActionType(action);

    const route =
      type === "open_dashboard_with_filter"
        ? deriveDashboardRoute(action)
        : type === "open_pricelist_prefilled"
          ? action.route || "/vehicles/price-list"
          : deriveRoute(action);

    const target = routeWithParams(
      route,
      action.query || action.queryParams || action.params,
    );

    if (!target || !knownRouteAllowed(target)) {
      setNotice("Action not available yet.");
      return;
    }

    navigate(target);
  };

  const handleAction = (action = {}) => {
    if (isActionDestructive(action)) {
      setPendingAction(action);
      return;
    }

    const type = normalizeActionType(action);
    const actionKind = String(
      action.action || action.kind || action.intent || "",
    ).toLowerCase();

    const askMessage = action.message || action.query || action.followUpQuery;

    if (
      type === "ask" ||
      (askMessage &&
        /compare_selected|compare_all|select_variant|select_model|ask/.test(
          actionKind,
        ))
    ) {
      if (!askMessage) {
        setNotice("Action not available yet.");
        return;
      }

      const selectionContext = selectionContextFromAction(action);

      const selectedEntityOverride =
        action.selectedEntity ||
        action.selectedVariant ||
        action.selectedModel ||
        action.selectedOption ||
        selectionContext.selectedVariantRows?.[0] ||
        selectionContext.selectedModelRows?.[0] ||
        undefined;

      sendMessage(action.query ? action : { ...action, query: askMessage }, {
        context: compactObject({
          ...selectionContext,
          ...(action.context || {}),
          ...(action.contextPatch || {}),
          entities: compactObject({
            ...(action.context?.entities || {}),
            ...(action.contextPatch?.entities || {}),
            ...(action.entities || {}),
          }),
        }),
        filters: action.filters,
        replaceContext: Boolean(action.replaceContext),
        keepFilters: true,
        selectedEntity: selectedEntityOverride,
        displayText: action.displayText || action.label || askMessage,
      });

      return;
    }

    if (type === "open_canvas") {
      const nextQuery =
        action.query ||
        action.message ||
        action.followUpQuery ||
        action.label ||
        "";

      if (!nextQuery) {
        setNotice("Action not available yet.");
        return;
      }

      sendMessage(action.query ? action : { ...action, query: nextQuery }, {
        context: compactObject({
          ...(action.context || {}),
          ...(action.contextPatch || {}),
          entities: compactObject({
            ...(action.context?.entities || {}),
            ...(action.contextPatch?.entities || {}),
            ...(action.entities || {}),
          }),
          canvasType: action.canvasType,
        }),
        filters: action.filters,
        replaceContext: Boolean(action.replaceContext),
        keepFilters: true,
        displayText: action.label || nextQuery,
      });

      return;
    }

    if (type === "lead") {
      const nextQuery =
        action.query ||
        action.message ||
        `Request ${action.leadType || "callback"}`;

      sendMessage(action.query ? action : { ...action, query: nextQuery }, {
        context: compactObject({
          ...(action.context || {}),
          ...(action.contextPatch || {}),
          entities: compactObject({
            ...(action.context?.entities || {}),
            ...(action.contextPatch?.entities || {}),
            ...(action.entities || {}),
          }),
          leadType: action.leadType,
        }),
        filters: action.filters,
        replaceContext: Boolean(action.replaceContext),
        keepFilters: true,
        displayText: action.label || nextQuery,
      });

      return;
    }

    if (type === "navigate") {
      runNavigationAction(action);
      return;
    }

    if (
      [
        "open_record",
        "edit_record",
        "open_dashboard_with_filter",
        "open_pricelist_prefilled",
        "open_live_pos",
      ].includes(type)
    ) {
      runNavigationAction(action);
      return;
    }

    if (type === "compare" && action.message) {
      sendMessage(action.query ? action : { ...action, query: action.message }, {
        context: compactObject({
          ...selectionContextFromAction(action),
          ...(action.context || {}),
          ...(action.contextPatch || {}),
          entities: compactObject({
            ...(action.context?.entities || {}),
            ...(action.contextPatch?.entities || {}),
            ...(action.entities || {}),
          }),
        }),
        filters: action.filters,
        replaceContext: Boolean(action.replaceContext),
        keepFilters: true,
        displayText: action.label || action.message,
      });

      return;
    }

    if (type === "show_more_inline" && action.message) {
      sendMessage(action.query ? action : { ...action, query: action.message }, {
        context: compactObject({
          ...selectionContextFromAction(action),
          ...(action.context || {}),
          ...(action.contextPatch || {}),
          entities: compactObject({
            ...(action.context?.entities || {}),
            ...(action.contextPatch?.entities || {}),
            ...(action.entities || {}),
          }),
        }),
        filters: action.filters,
        replaceContext: Boolean(action.replaceContext),
        keepFilters: Boolean(action.keepFilters),
        displayText: action.label || action.message,
      });

      return;
    }

    setNotice("Action not available yet.");
  };

  const confirmAction = () => {
    const action = pendingAction;
    setPendingAction(null);

    if (!action) return;

    const type = normalizeActionType(action);

    if (
      [
        "edit_record",
        "open_record",
        "open_dashboard_with_filter",
        "open_pricelist_prefilled",
      ].includes(type)
    ) {
      runNavigationAction(action);
      return;
    }

    setNotice("Action not available yet.");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] text-[#0f172a]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10rem] top-[-14rem] h-[34rem] w-[34rem] rounded-full bg-white blur-3xl" />
        <div className="absolute right-[-14rem] top-[-10rem] h-[36rem] w-[36rem] rounded-full bg-[#dbeafe]/70 blur-3xl" />
        <div className="absolute left-[28%] top-[15%] h-[30rem] w-[30rem] rounded-full bg-[#e0e7ff]/45 blur-3xl" />
        <div className="absolute bottom-[-18rem] right-[18%] h-[34rem] w-[34rem] rounded-full bg-[#e2e8f0]/65 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(245,247,251,0.96))]" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <main className="relative mx-auto w-full max-w-[1500px] flex-1 px-4 pb-40 pt-5 md:px-6 md:pt-7 xl:px-7">
          {notice ? (
            <div className="mb-4 rounded-[20px] border border-[#93c5fd] bg-[#eff6ff] px-4 py-3 text-sm font-bold text-[#1e40af] shadow-sm">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 shadow-sm">
              {error}
            </div>
          ) : null}

          {canShowQueryPlan && !empty ? (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowQueryPlan((value) => !value)}
                className={cx(
                  "rounded-[16px] border px-3 py-2 text-xs font-black transition",
                  showQueryPlan
                    ? "border-[#2563eb] bg-[#eff6ff] text-[#1e40af]"
                    : "border-[#cbd5e1] bg-white text-[#4b5563] hover:border-[#2563eb] hover:bg-[#eff6ff]",
                )}
              >
                {showQueryPlan ? "Hide Query Plan" : "Show Query Plan"}
              </button>
            </div>
          ) : null}

          {empty ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
              <div className="min-w-0 space-y-6">
                <EmptyHomeExperience onAsk={sendMessage} loading={loading} />
              </div>

              <RightInsightRail
                onAsk={sendMessage}
                loading={loading}
                onHelp={() => setExamplesOpen(true)}
              />
            </div>
          ) : (
            <ChatExperience
              messages={messages}
              loading={loading}
              input={input}
              setInput={setInput}
              onSubmit={sendMessage}
              onAsk={sendMessage}
              onAction={handleAction}
              onFollowUp={sendMessage}
              onAmbiguitySelect={handleAmbiguitySelect}
              showQueryPlan={showQueryPlan}
              bottomRef={scrollRef}
              onClear={clearChat}
            />
          )}
        </main>

        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/70 bg-[#f5f7fb]/76 px-4 pb-4 pt-3 shadow-[0_-24px_80px_-58px_rgba(15,23,42,0.65)] backdrop-blur-2xl md:px-6 xl:px-7">
          <div className="mx-auto w-full max-w-[1500px]">
            <PremiumInputDock
              input={input}
              setInput={setInput}
              onSubmit={sendMessage}
              loading={loading}
              placeholder={
                empty
                  ? "Ask ACI Assist about any new car..."
                  : "Continue asking ACI Assist..."
              }
            />

            <p className="mt-2 text-center text-[10px] font-semibold text-[#8b8f98]">
              ACI Assist can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      </div>

      <WhatCanIAskPanel
        open={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        onAsk={sendMessage}
      />

      <ConfirmationModal
        open={Boolean(pendingAction)}
        action={pendingAction}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />
    </div>
  );
}
