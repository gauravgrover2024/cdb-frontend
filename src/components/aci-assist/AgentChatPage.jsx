import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle, Loader2, MessageSquarePlus, SearchCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import aiAgentApi from "../../api/aiAgent";
import { useAuth } from "../../context/AuthContext";
import AgentInput from "./AgentInput";
import AgentMessage from "./AgentMessage";
import ConfirmationModal from "./ConfirmationModal";
import WhatCanIAskPanel, { ASK_GROUPS } from "./WhatCanIAskPanel";
import { compactObject, isActionDestructive, knownRouteAllowed, normalizeActionType, routeWithParams } from "./utils";

const createSessionId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `aci-assist-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const starterSuggestions = [
  "Latest insurance of Rahul Diwan 4577",
  "How many cars are without registration number?",
  "Verna pricelist",
  "Compare Verna City Slavia",
  "Cases with payout missing",
  "Customer 360 Rahul Diwan",
];

const normalizeAgentResponse = (payload) => {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  return {
    assistantMessage: data?.assistantMessage || data?.message || "I found a response, but no readable answer text was returned.",
    intent: data?.intent,
    entities: data?.entities || {},
    confidence: data?.confidence,
    filters: Array.isArray(data?.filters) || typeof data?.filters === "object" ? data.filters : [],
    resultType: data?.resultType,
    widgets: Array.isArray(data?.widgets) ? data.widgets : [],
    sourceTransparency: data?.sourceTransparency,
    followUpSuggestions: Array.isArray(data?.followUpSuggestions) ? data.followUpSuggestions : [],
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
      .filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
};

const CUSTOMER_FILTER_KEYS = new Set(["customer", "customerName", "Customer", "CustomerName"]);
const LAST4_FILTER_KEYS = new Set(["last4", "vehicleLast4", "Vehicle Last 4", "VehicleLast4"]);

const removeKeysCaseInsensitive = (source = {}, keys = []) => {
  const blocked = new Set(keys.map((key) => String(key).toLowerCase()));
  return Object.fromEntries(
    Object.entries(source || {}).filter(([key]) => !blocked.has(String(key).toLowerCase())),
  );
};

const stripContextForRemovedChip = (sourceContext = {}, chip = {}) => {
  const key = String(chip.key || chip.label || "").toLowerCase();
  const shouldRemoveCustomer = key.includes("customer");
  const shouldRemoveLast4 = key.includes("last4") || key.includes("vehicle last 4");
  const shouldRemoveModel = key === "model";
  const nextEntities = { ...(sourceContext.entities || {}) };
  if (shouldRemoveCustomer) delete nextEntities.customerName;
  if (shouldRemoveLast4) {
    delete nextEntities.last4;
    delete nextEntities.registrationNumber;
  }
  if (shouldRemoveModel) delete nextEntities.model;

  const nextContext = { ...sourceContext, entities: nextEntities };
  if (shouldRemoveCustomer) delete nextContext.customerName;
  if (shouldRemoveLast4) {
    delete nextContext.last4;
    delete nextContext.registrationNumber;
  }
  if (shouldRemoveModel) delete nextContext.model;
  return nextContext;
};

const makeMessage = (role, content, extra = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  content,
  createdAt: new Date().toISOString(),
  ...extra,
});

const deriveRoute = (action = {}) => {
  if (action.route) return action.route;
  const moduleName = String(action.module || action.source || "").toLowerCase();
  const id = action.id || action.recordId || action.caseId || action.loanId || action.customerId;
  if (/insurance/.test(moduleName) && id) return `/insurance/edit/${id}`;
  if (/loan/.test(moduleName) && id) return `/loans/edit/${id}`;
  if (/customer/.test(moduleName) && id) return `/customers/edit/${id}`;
  if (/payment/.test(moduleName) && (action.loanId || id)) return `/payments/${action.loanId || id}`;
  if (/price|vehicle/.test(moduleName)) return "/vehicles/price-list";
  return "";
};

const deriveDashboardRoute = (action = {}) => {
  if (action.route) return action.route;
  const moduleName = String(action.module || action.dashboard || "").toLowerCase();
  if (/insurance/.test(moduleName)) return "/insurance";
  if (/loan/.test(moduleName)) return "/loans";
  if (/payout|receivable/.test(moduleName)) return "/payouts/receivables";
  if (/payment/.test(moduleName)) return "/payments";
  if (/used/.test(moduleName)) return "/used-cars";
  if (/price|vehicle/.test(moduleName)) return "/vehicles/price-list";
  return "";
};

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
  const [resultReferences, setResultReferences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showQueryPlan, setShowQueryPlan] = useState(false);

  const canShowQueryPlan = ["admin", "superadmin", "developer", "dev"].includes(String(user?.role || "").toLowerCase());

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

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
      const text = String(rawMessage || "").trim();
      if (!text || loading) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError("");
      setNotice("");
      setInput("");

      const baseContext = overrides.replaceContext ? {} : context;
      const nextContext = compactObject({ ...baseContext, ...(overrides.context || {}) });
      const hasSelectedEntityOverride = Object.prototype.hasOwnProperty.call(overrides, "selectedEntity");
      const nextSelectedEntity = hasSelectedEntityOverride ? overrides.selectedEntity || undefined : selectedEntity || undefined;
      const baseFilters = overrides.keepFilters ? filtersToObject(activeFilters) : {};
      const nextFilters = compactObject({ ...baseFilters, ...filtersToObject(overrides.filters) });
      const userMessage = makeMessage("user", overrides.displayText || text);
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
        setContext(compactObject({ ...nextContext, ...(normalized.context || {}), intent: normalized.intent, entities: normalized.entities }));
        setSelectedEntity(normalized.selectedEntity || nextSelectedEntity || null);
        setActiveFilters(filtersToObject(normalized.filters) || nextFilters || {});
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
        const message = err?.message || "ACI Assist could not reach the agent endpoint.";
        setError(message);
        setMessages((prev) => [
          ...prev,
          makeMessage("assistant", "I could not complete that request. Please try again.", {
            widgets: [{ type: "unavailable_notice", message }],
          }),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [activeFilters, context, loading, selectedEntity, sessionId],
  );

  const removeFilterAndRerun = (message, chip) => {
    let nextFilters = { ...filtersToObject(activeFilters) };
    delete nextFilters[chip.key];
    if (String(chip.key || "").toLowerCase().includes("customer")) {
      nextFilters = removeKeysCaseInsensitive(nextFilters, [...CUSTOMER_FILTER_KEYS]);
      setSelectedEntity(null);
    }
    if (String(chip.key || "").toLowerCase().includes("last4") || String(chip.label || "").toLowerCase().includes("last 4")) {
      nextFilters = removeKeysCaseInsensitive(nextFilters, [...LAST4_FILTER_KEYS]);
    }
    const nextContext = stripContextForRemovedChip(context, chip);
    setActiveFilters(nextFilters);
    sendMessage(message.userPrompt || message.content, {
      filters: nextFilters,
      context: nextContext,
      replaceContext: true,
      selectedEntity: String(chip.key || "").toLowerCase().includes("customer") ? null : selectedEntity,
      displayText: `Re-run without ${chip.label}: ${chip.value}`,
    });
  };

  const handleAmbiguitySelect = (selection, message) => {
    setSelectedEntity(selection);
    sendMessage(message.userPrompt || message.content || "Use selected record", {
      selectedEntity: selection,
      context: { ambiguityResolved: true },
      displayText: `Use ${selection.customerName || selection.customer || selection.name || "selected record"}`,
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
    const target = routeWithParams(route, action.query || action.queryParams || action.params);

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
    if (["open_record", "edit_record", "open_dashboard_with_filter", "open_pricelist_prefilled", "open_live_pos"].includes(type)) {
      runNavigationAction(action);
      return;
    }
    if (type === "compare" && action.message) {
      sendMessage(action.message, {
        context: action.context,
        filters: action.filters,
        keepFilters: true,
        displayText: action.label || action.message,
      });
      return;
    }
    if (type === "show_more_inline" && action.message) {
      sendMessage(action.message, {
        context: action.context,
        filters: action.filters,
        keepFilters: true,
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
    if (["edit_record", "open_record", "open_dashboard_with_filter", "open_pricelist_prefilled"].includes(type)) {
      runNavigationAction(action);
      return;
    }
    setNotice("Action not available yet.");
  };

  const empty = messages.length === 0;
  const titleMeta = useMemo(
    () => ({
      count: resultReferences.length,
      filters: Object.keys(activeFilters || {}).length,
    }),
    [activeFilters, resultReferences],
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6.5rem)] w-full max-w-[1380px] flex-col gap-4">
      <header className="rounded-3xl border border-slate-300 bg-white px-5 py-4 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.9)] ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
              <Sparkles size={14} />
              ACI Assist
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">ACI Assist</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">Ask anything across CDrive</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-wide text-slate-600">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Live data</span>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700">Inline reports</span>
              <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1">No chat stored</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canShowQueryPlan ? (
              <button
                type="button"
                onClick={() => setShowQueryPlan((value) => !value)}
                className={`rounded-2xl border px-3 py-2 text-xs font-black transition ${showQueryPlan ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
              >
                Show Query Plan
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setExamplesOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <HelpCircle size={16} />
              What can I ask?
            </button>
            <button
              type="button"
              onClick={clearChat}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700"
            >
              <MessageSquarePlus size={16} />
              New Chat
            </button>
          </div>
        </div>
        {!empty ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{messages.length} messages</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{titleMeta.count} result references</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{titleMeta.filters} active filters</span>
          </div>
        ) : null}
      </header>

      <main className="flex-1 overflow-hidden rounded-3xl border border-slate-300 bg-[linear-gradient(180deg,#f7f9fc_0%,#ffffff_55%,#f8fafc_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:p-5">
        {notice ? (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {empty ? (
          <section className="flex min-h-[430px] flex-col items-center justify-center px-3 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-[0_18px_38px_-24px_rgba(15,23,42,0.95)] ring-8 ring-indigo-50">
                <SearchCheck size={24} />
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Your CDrive database agent</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                Ask for answers, reports, comparisons, 360 views, missing-data lists, policy details, loan status or pricelist intelligence. Results render here as inline cards, tables and charts.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {starterSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          </section>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <AgentMessage
                  key={message.id}
                  message={message}
                  onAction={handleAction}
                  onFollowUp={sendMessage}
                  onAmbiguitySelect={handleAmbiguitySelect}
                  onRemoveFilter={removeFilterAndRerun}
                  onRerun={(msg) => sendMessage(msg.userPrompt || msg.content)}
                  showQueryPlan={showQueryPlan}
                />
              ))}
            </AnimatePresence>
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white ring-4 ring-indigo-50">
                  <Loader2 size={17} className="animate-spin" />
                </div>
                <div className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">
                  Thinking across modules...
                </div>
              </div>
            ) : null}
            <div ref={scrollRef} />
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 z-20 bg-background/90 pb-3 pt-1 backdrop-blur">
        <AgentInput
          value={input}
          onChange={setInput}
          onSubmit={() => sendMessage(input)}
          disabled={loading}
          placeholder="Ask: latest insurance, missing payout report, Verna pricelist, customer 360..."
        />
      </footer>

      {empty ? (
        <div className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Quick suggestions</p>
          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
            {ASK_GROUPS.flatMap((group) => group.examples.slice(0, 1)).map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => sendMessage(example)}
                className="rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-800 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <WhatCanIAskPanel open={examplesOpen} onClose={() => setExamplesOpen(false)} onAsk={sendMessage} />
      <ConfirmationModal
        open={Boolean(pendingAction)}
        action={pendingAction}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />
    </div>
  );
}
