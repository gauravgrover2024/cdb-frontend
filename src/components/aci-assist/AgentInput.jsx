import React, { useEffect, useRef } from "react";
import { SendHorizontal, Sparkles } from "lucide-react";

export default function AgentInput({ value, onChange, onSubmit, disabled, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(180, Math.max(56, node.scrollHeight))}px`;
  }, [value]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.9)]">
      <div className="flex items-end gap-2">
        <div className="hidden rounded-2xl bg-indigo-50 p-3 text-indigo-600 sm:block">
          <Sparkles size={18} />
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={placeholder || "Ask across CDrive..."}
          className="max-h-[180px] min-h-14 flex-1 resize-none border-0 bg-transparent px-2 py-4 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !String(value || "").trim()}
          className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          aria-label="Send message"
        >
          <SendHorizontal size={18} />
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-1 text-[11px] font-medium text-slate-400">
        <span>Enter to send · Shift+Enter for newline</span>
        {disabled ? <span>Thinking...</span> : null}
      </div>
    </div>
  );
}
