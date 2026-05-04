import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { MODERN_COLORS, SHADOWS } from "./BaseComponents";

export function EmptyWorkspace({ onAsk }) {
  const prompts = [
    "Verna pricelist",
    "Show colors of Verna",
    "Approved loans this month",
    "Total business",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border border-slate-200/30 ${MODERN_COLORS.backgrounds.card} p-12 text-center ${SHADOWS.lg}`}
    >
      <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white mb-6">
        <Sparkles size={40} strokeWidth={1.5} />
      </div>

      <h2 className="text-3xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
        ACI Assist Ready
      </h2>
      <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
        Ask any question about vehicles, loans, or business metrics. Results
        will appear here instantly.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 max-w-xl mx-auto">
        {prompts.map((prompt) => (
          <motion.button
            key={prompt}
            whileHover={{ scale: 1.05, y: -2 }}
            onClick={() => onAsk?.(prompt)}
            className={`
              rounded-xl border border-slate-200/30 bg-white/50 px-4 py-3 text-sm font-bold
              text-slate-700 transition-all hover:bg-white hover:border-violet-300/50 hover:text-violet-700
            `}
          >
            {prompt}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
