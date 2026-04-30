import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, HelpCircle, Loader2, MessageSquarePlus, PanelRight, SearchCheck, Sparkles, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import aiAgentApi from "../../api/aiAgent";
import { useAuth } from "../../context/AuthContext";
import AgentInput from "./AgentInput";
import AgentWorkspaceCanvas from "./AgentWorkspaceCanvas";
import ConfirmationModal from "./ConfirmationModal";
import WhatCanIAskPanel, { ASK_GROUPS } from "./WhatCanIAskPanel";
import { compactObject, isActionDestructive, knownRouteAllowed, normalizeActionType, routeWithParams } from "./utils";

const createSessionId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `aci-assist-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const starterSuggestions = [
  "Verna pricelist",
  "Show colors of Verna",
  "Does Verna SX have sunroof?",
  "Approved but not disbursed cases",
  "Total business this month",
  "Cash car business this month",
  "Loan closure 7077",
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
    widgetTypes: Array.isArray(data?.widgetTypes) ? data.widgetTypes : asWidgetTypes(data?.widgets),
    sourceTransparency: data?.sourceTransparency,
    followUpSuggestions: Array.isArray(data?.followUpSuggestions) ? data.followUpSuggestions : [],
    ambiguity: data?.ambiguity,
    queryPlan: data?.queryPlan,
    context: data?.context,
    selectedEntity: data?.selectedEntity,
    sessionId: data?.sessionId,
  };
};

const asWidgetTypes = (widgets) =>
  Array.isArray(widgets) ? widgets.map((widget) => widget?.type || widget?.widgetType).filter(Boolean) : [];

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

  const assistantMessages = useMemo(() => messages.filter((message) => message.role === "assistant"), [messages]);
  const activeAssistantMessage = assistantMessages[assistantMessages.length - 1] || null;

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
        setSelectedEntity(null);
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

  const handleAmbiguitySelect = (selection, message) => {
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
        replaceContext: Boolean(action.context),
        keepFilters: Boolean(action.keepFilters),
        displayText: action.label || action.message,
      });
      return;
    }
    if (type === "show_more_inline" && action.message) {
      sendMessage(action.message, {
        context: action.context,
        filters: action.filters,
        replaceContext: Boolean(action.context),
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
    <div className="relative -mx-2 min-h-[calc(100vh-5.5rem)] overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top_left,rgba(219,234,254,0.72),transparent_34%),radial-gradient(circle_at_top_right,rgba(209,250,229,0.65),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fafc_42%,#f1f5f9_100%)] px-3 py-4 md:-mx-4 md:px-5">
      <div className="pointer-events-none absolute left-[-80px] top-36 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 right-[-120px] h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-[1720px] flex-col gap-4">
      <header className="rounded-[32px] border border-white/80 bg-white/85 px-5 py-5 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.95)] ring-1 ring-slate-200/70 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
              <Sparkles size={14} />
              ACI Assist
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">ACI Assist</h1>
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

      <main className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="flex max-h-[calc(100vh-9rem)] min-h-[640px] flex-col rounded-[32px] border border-white/80 bg-white/90 p-4 shadow-[0_28px_90px_-64px_rgba(15,23,42,0.95)] ring-1 ring-slate-200/70 backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-950 text-white shadow-sm">
                  <Bot size={20} />
                </div>
                <div>
                  <p className="text-base font-black text-slate-950">Copilot chat</p>
                  <p className="text-xs font-bold text-slate-500">Local session only</p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearChat}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                New
              </button>
            </div>

            {notice ? (
              <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                {notice}
              </div>
            ) : null}
            {error ? (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                {error}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-auto pr-1">
              {empty ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[26px] border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-white text-indigo-600 shadow-sm">
                    <SearchCheck size={20} />
                  </div>
                  <h2 className="mt-3 text-xl font-black text-slate-950">Ask the database.</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    Send a question here. The answer opens as a live workspace on the right.
                  </p>
                </motion.div>
              ) : null}

              <div className="mt-4 space-y-3">
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" ? (
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                          <Bot size={15} />
                        </div>
                      ) : null}
                      <div
                        className={`max-w-[82%] rounded-[22px] px-4 py-3 text-sm font-bold leading-6 shadow-sm ${
                          message.role === "user"
                            ? "bg-slate-950 text-white"
                            : "border border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-indigo-500">ACI Assist</p>
                        ) : null}
                        <p>{message.content}</p>
                      </div>
                      {message.role === "user" ? (
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-indigo-600">
                          <UserRound size={15} />
                        </div>
                      ) : null}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loading ? (
                  <div className="flex items-center gap-2 rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">
                    <Loader2 size={16} className="animate-spin text-indigo-600" />
                    Updating workspace...
                  </div>
                ) : null}
                <div ref={scrollRef} />
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Quick prompts</p>
              <div className="mb-3 flex max-h-36 flex-wrap gap-2 overflow-auto">
                {starterSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    disabled={loading}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <AgentInput
                value={input}
                onChange={setInput}
                onSubmit={() => sendMessage(input)}
                disabled={loading}
                placeholder="Ask across CDrive..."
              />
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-3 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            <PanelRight size={15} className="text-indigo-500" />
            Live result canvas
          </div>
          <AgentWorkspaceCanvas
            message={activeAssistantMessage}
            loading={loading}
            onAsk={sendMessage}
            onAction={handleAction}
            onFollowUp={sendMessage}
            onAmbiguitySelect={handleAmbiguitySelect}
            showQueryPlan={showQueryPlan}
          />
        </section>
      </main>

      {empty ? (
        <div className="rounded-[28px] border border-white/80 bg-white/75 p-4 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Example groups</p>
          <div className="grid gap-2 md:grid-cols-4">
            {ASK_GROUPS.map((group) => (
              <button
                key={group.title}
                type="button"
                onClick={() => setExamplesOpen(true)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {group.title}
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
    </div>
  );
}
