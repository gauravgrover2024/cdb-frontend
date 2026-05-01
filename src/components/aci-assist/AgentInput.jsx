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
    <div className="rounded-3xl border border-slate-300 bg-white p-2 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.95)] ring-1 ring-slate-100 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100">
      <div className="flex items-end gap-2">
        
        <textarea
          ref={ref}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={placeholder || "Ask across CDrive..."}
          className="max-h-[180px] min-h-14 flex-1 resize-none border-0 bg-transparent px-2 py-4 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !String(value || "").trim()}
          className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0"
          aria-label="Send message"
        >
          <SendHorizontal size={18} />
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-1 text-[11px] font-bold text-slate-500">
        <span>Enter to send · Shift+Enter for newline</span>
        {disabled ? <span>Thinking...</span> : null}
      </div>
    </div>
  );
}
