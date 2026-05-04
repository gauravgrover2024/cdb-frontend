import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { MODERN_COLORS, SHADOWS } from "./BaseComponents";

export function LoadingWorkspace() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-3xl border border-slate-200/30 ${MODERN_COLORS.backgrounds.card} p-12 ${SHADOWS.lg}`}
    >
      <div className="flex items-center gap-4 mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white"
        >
          <Sparkles size={24} />
        </motion.div>
        <div>
          <p className="font-bold text-slate-900">Fetching Results...</p>
          <p className="text-sm text-slate-600">Processing your query</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            className="h-32 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200"
          />
        ))}
      </div>
    </motion.div>
  );
}
