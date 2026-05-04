import React from "react";
import { motion } from "framer-motion";
import { SearchCheck, Zap } from "lucide-react";
import { asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";
import { findWidget } from "../canvas-utils";

export function AmbiguityCanvas({ message, onAmbiguitySelect, footer }) {
  const ambiguity =
    message?.ambiguity ||
    findWidget(message, "ambiguity")?.data ||
    findWidget(message, "ambiguity");
  const options = asArray(ambiguity?.options);

  return (
    <ModernCanvasShell
      title="Multiple Matches Found"
      subtitle="Please clarify which one you meant"
      icon={SearchCheck}
      footer={footer}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {options.map((option, index) => (
          <motion.button
            key={option.id || index}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAmbiguitySelect?.(option, message)}
            className={`
              text-left rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-50/70 to-orange-50/70
              p-6 transition-all shadow-md hover:border-amber-300/70 hover:shadow-lg
            `}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <p className="font-bold text-slate-900">
                {option.displayName ||
                  option.customerName ||
                  option.name ||
                  "Option"}
              </p>
              <Zap size={20} className="text-amber-600" />
            </div>

            <p className="text-sm text-slate-600 mb-3">
              {option.vehicle ||
                [option.make, option.model, option.variant]
                  .filter(Boolean)
                  .join(" ") ||
                "Vehicle not listed"}
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                option.registrationNumber && {
                  label: option.registrationNumber,
                },
                option.module && { label: option.module },
                option.status && { label: option.status },
              ]
                .filter(Boolean)
                .map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-lg bg-white/60 text-xs font-bold text-slate-700"
                  >
                    {tag.label}
                  </span>
                ))}
            </div>
          </motion.button>
        ))}
      </div>
    </ModernCanvasShell>
  );
}
