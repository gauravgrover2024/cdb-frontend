import React from "react";
import { AlertCircle } from "lucide-react";
import { asArray, formatDate, pick } from "./utils";

export default function AmbiguityResolver({ ambiguity, onSelect }) {
  const options = asArray(ambiguity?.options || ambiguity?.matches || ambiguity?.candidates);
  if (!ambiguity || !options.length) return null;

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="flex items-center gap-2 text-sm font-black text-amber-900">
        <AlertCircle size={16} />
        {ambiguity.message || "I found multiple possible matches. Which one do you mean?"}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {options.map((option, index) => (
          <button
            key={option.id || option._id || index}
            type="button"
            onClick={() => onSelect?.(option)}
            className="rounded-xl border border-amber-200 bg-white p-3 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md"
          >
            <p className="text-sm font-black text-slate-900">{pick(option, ["customerName", "customer", "name"], "Possible match")}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              {[pick(option, ["vehicle", "model"], ""), pick(option, ["registrationNumber", "registration", "regNo"], "")].filter(Boolean).join(" · ") || "Vehicle not specified"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-500">
              {pick(option, ["module", "source"], "") ? <span>{pick(option, ["module", "source"], "")}</span> : null}
              {pick(option, ["status"], "") ? <span>· {pick(option, ["status"], "")}</span> : null}
              {pick(option, ["lastActivityDate", "updatedAt"], "") ? <span>· {formatDate(pick(option, ["lastActivityDate", "updatedAt"], ""))}</span> : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
