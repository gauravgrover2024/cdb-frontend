import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, HelpCircle, Loader2, MessageSquarePlus, PanelRight, SearchCheck, Sparkles, UserRound, Zap } from "lucide-react";
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
  const aciChatScrollRef = useRef(null);
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

  const canShowQueryPlan = ["admin", "superadmin", "developer", "dev"].includes(
    String(user?.role || "").toLowerCase(),
  );

  useEffect(() => {
    const el = aciChatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const assistantMessages = useMemo(
    () => messages.filter((message) => message.role === "assistant"),
    [messages],
  );
  const activeAssistantMessage =
    assistantMessages[assistantMessages.length - 1] || null;

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
      const nextContext = compactObject({
        ...baseContext,
        ...(overrides.context || {}),
      });
      const hasSelectedEntityOverride = Object.prototype.hasOwnProperty.call(
        overrides,
        "selectedEntity",
      );
      const nextSelectedEntity = hasSelectedEntityOverride
        ? overrides.selectedEntity || undefined
        : selectedEntity || undefined;
      const baseFilters = overrides.keepFilters
        ? filtersToObject(activeFilters)
        : {};
      const nextFilters = compactObject({
        ...baseFilters,
        ...filtersToObject(overrides.filters),
      });
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
    sendMessage(
      message.userPrompt || message.content || "Use selected record",
      {
        selectedEntity: selection,
        context: { ambiguityResolved: true },
        displayText: `Use ${selection.customerName || selection.customer || selection.name || "selected record"}`,
      },
    );
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

  const empty = messages.length === 0;
  const titleMeta = useMemo(
    () => ({
      count: resultReferences.length,
      filters: Object.keys(activeFilters || {}).length,
    }),
    [activeFilters, resultReferences],
  );

  return (
    <div className="relative -mx-2 min-h-[calc(100vh-5.5rem)] overflow-visible rounded-[28px] bg-slate-50 px-3 py-5 md:-mx-4 md:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
        <div className="absolute -left-20 top-0 h-96 w-96 rounded-full bg-sky-100/30 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-indigo-100/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1720px] flex-col gap-5">
        <header className="rounded-[24px] border border-slate-200/60 bg-white/90 px-6 py-5 shadow-[0_8px_32px_-16px_rgba(15,23,42,0.18)] backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Sparkles size={13} strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-indigo-600">
                  ACI Assist
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                ACI Assist
              </h1>
              <p className="mt-0.5 text-sm font-semibold text-slate-500">
                Ask anything across CDrive
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live data
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-200">
                  <Zap size={10} strokeWidth={2.5} />
                  Inline reports
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                  No chat stored
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canShowQueryPlan ? (
                <button
                  type="button"
                  onClick={() => setShowQueryPlan((value) => !value)}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-all duration-150 ${showQueryPlan ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm" : "border-slate-300 bg-white text-slate-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"}`}
                >
                  {showQueryPlan ? "Hide Query Plan" : "Show Query Plan"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setExamplesOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-150 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md"
              >
                <HelpCircle size={16} strokeWidth={2.5} />
                What can I ask?
              </button>
              <button
                type="button"
                onClick={clearChat}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-200 transition-all duration-150 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-300"
              >
                <MessageSquarePlus size={16} strokeWidth={2.5} />
                New Chat
              </button>
            </div>
          </div>
          {!empty ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                <MessageSquarePlus size={12} />
                {messages.length} messages
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                <PanelRight size={12} />
                {titleMeta.count} results
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                <SearchCheck size={12} />
                {titleMeta.filters} filters
              </span>
            </div>
          ) : null}
        </header>

        <main className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-5 xl:self-start">
            <div className="flex max-h-[calc(100vh-9rem)] min-h-[min(640px,calc(100dvh-12rem))] flex-col rounded-[24px] border border-slate-200/60 bg-white p-5 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.15)] xl:min-h-[640px]">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                    <Bot size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Copilot chat
                    </p>
                    <p className="text-[11px] font-bold text-slate-500">
                      Local session only
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearChat}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition-all duration-150 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  New
                </button>
              </div>

              {notice ? (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800 shadow-sm">
                  {notice}
                </div>
              ) : null}
              {error ? (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-700 shadow-sm">
                  {error}
                </div>
              ) : null}

              <div
                ref={aciChatScrollRef}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1"
              >
                {empty ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-[20px] border border-indigo-100 bg-indigo-50/60 p-5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-indigo-600 shadow-sm">
                      <SearchCheck size={18} strokeWidth={2.5} />
                    </div>
                    <h2 className="mt-3 text-lg font-black text-slate-900">
                      Ask the database
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                      Send a question here. The answer opens as a live workspace
                      on the right.
                    </p>
                  </motion.div>
                ) : null}

                <div className="mt-4 space-y-3">
                  <AnimatePresence initial={false}>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {message.role === "assistant" ? (
                          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Bot size={14} strokeWidth={2.5} />
                          </div>
                        ) : null}
                        <div
                          className={`max-w-[82%] rounded-[18px] px-4 py-3 text-sm font-semibold leading-6 shadow-sm ${
                            message.role === "user"
                              ? "bg-indigo-600 text-white"
                              : "border border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {message.role === "assistant" ? (
                            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-indigo-500">
                              ACI Assist
                            </p>
                          ) : null}
                          <p>{message.content}</p>
                        </div>
                        {message.role === "user" ? (
                          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-indigo-600">
                            <UserRound size={14} strokeWidth={2.5} />
                          </div>
                        ) : null}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {loading ? (
                    <div className="flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">
                      <Loader2
                        size={16}
                        className="animate-spin text-indigo-600"
                      />
                      Updating workspace...
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                  Quick prompts
                </p>
                <div className="mb-3 flex max-h-36 flex-wrap gap-2 overflow-auto">
                  {starterSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => sendMessage(suggestion)}
                      disabled={loading}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all duration-150 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="mb-3 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              <PanelRight
                size={14}
                className="text-indigo-500"
                strokeWidth={2.5}
              />
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
          <div className="rounded-[20px] border border-slate-200/60 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Example groups
            </p>
            <div className="grid gap-3 md:grid-cols-4">
              {ASK_GROUPS.map((group) => (
                <button
                  key={group.title}
                  type="button"
                  onClick={() => setExamplesOpen(true)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-sm font-bold text-slate-800 transition-all duration-150 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md"
                >
                  {group.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}

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
    </div>
  );
}