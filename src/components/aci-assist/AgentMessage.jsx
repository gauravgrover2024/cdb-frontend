import React from "react";
import { motion } from "framer-motion";
import { Bot, UserRound } from "lucide-react";
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
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
          <Bot size={17} />
        </div>
      ) : null}
      <div className={isUser ? "max-w-[78%]" : "w-full max-w-[900px] flex-1"}>
        <div
          className={
            isUser
              ? "rounded-3xl bg-slate-950 px-4 py-3 text-sm font-semibold leading-relaxed text-white shadow-sm"
              : "rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm leading-relaxed text-slate-800 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.7)]"
          }
        >
          {!isUser ? (
            <FilterChips
              intent={message.intent}
              entities={message.entities}
              filters={message.filters}
              onRemove={onRemoveFilter ? (chip) => onRemoveFilter(message, chip) : undefined}
              onRerun={onRerun ? () => onRerun(message) : undefined}
            />
          ) : null}
          <p className="whitespace-pre-wrap">{message.content}</p>
          {!isUser ? (
            <>
              <AgentAnswerRenderer widgets={message.widgets} onAction={onAction} />
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
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
          <UserRound size={17} />
        </div>
      ) : null}
    </motion.div>
  );
}
