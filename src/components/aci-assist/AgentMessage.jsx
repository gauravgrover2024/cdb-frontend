import React from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, UserRound } from "lucide-react";
import AgentAnswerRenderer from "./AgentAnswerRenderer";
import AmbiguityResolver from "./AmbiguityResolver";
import FilterChips from "./FilterChips";
import FollowUpSuggestions from "./FollowUpSuggestions";
import SourceTransparencyBar from "./SourceTransparencyBar";

export default function AgentMessage({
  message,
  onAction,
  onFollowUp,
  onAmbiguitySelect,
  onRemoveFilter,
  onRerun,
  showQueryPlan,
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser ? (
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.9)] ring-4 ring-indigo-50">
          <Bot size={17} />
        </div>
      ) : null}
      <div className={isUser ? "max-w-[78%]" : "w-full max-w-[900px] flex-1"}>
        <div
          className={
            isUser
              ? "rounded-[1.35rem] bg-slate-950 px-4 py-3 text-sm font-semibold leading-relaxed text-white shadow-[0_16px_34px_-24px_rgba(15,23,42,0.9)]"
              : "rounded-[1.35rem] border border-slate-300 bg-white px-4 py-4 text-sm leading-relaxed text-slate-800 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.75)] ring-1 ring-slate-100"
          }
        >
          {!isUser ? (
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                <Sparkles size={13} className="text-indigo-600" />
                ACI Assist
              </span>
              {message.confidence !== undefined ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                  {Math.round(Number(message.confidence || 0) * 100)}% confidence
                </span>
              ) : null}
            </div>
          ) : null}
          {!isUser ? (
            <FilterChips
              intent={message.intent}
              entities={message.entities}
              filters={message.filters}
              onRemove={onRemoveFilter ? (chip) => onRemoveFilter(message, chip) : undefined}
              onRerun={onRerun ? () => onRerun(message) : undefined}
            />
          ) : null}
          <p className={`whitespace-pre-wrap ${isUser ? "" : "font-medium text-slate-800"}`}>{message.content}</p>
          {!isUser ? (
            <>
              <AgentAnswerRenderer
                message={message}
                widgets={message.widgets}
                onAction={onAction}
              />
              <AmbiguityResolver ambiguity={message.ambiguity} onSelect={(selection) => onAmbiguitySelect?.(selection, message)} />
              <SourceTransparencyBar sourceTransparency={message.sourceTransparency} />
              {showQueryPlan && message.queryPlan ? (
                <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">Query plan</summary>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
                    {JSON.stringify(message.queryPlan, null, 2)}
                  </pre>
                </details>
              ) : null}
              <FollowUpSuggestions suggestions={message.followUpSuggestions} onSelect={onFollowUp} />
            </>
          ) : null}
        </div>
      </div>
      {isUser ? (
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm">
          <UserRound size={17} />
        </div>
      ) : null}
    </motion.div>
  );
}
