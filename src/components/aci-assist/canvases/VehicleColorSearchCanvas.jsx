import React from "react";
import { motion } from "framer-motion";
import {
  Palette,
} from "lucide-react";
import { asArray } from "../utils";
import {
  ModernCanvasShell,
} from "./BaseComponents";

export function VehicleColorSearchCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const rows = asArray(data.rows || data.records || widget?.rows);
  const title = data.title || widget?.title || "Color Search Results";

  return (
    <ModernCanvasShell title={title} subtitle="Results from stored vehicle color catalogue" icon={Palette} footer={footer}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.slice(0, 24).map((r, i) => (
          <motion.div key={i} whileHover={{ scale: 1.02 }}
            className="rounded-2xl border border-slate-200/40 bg-white/70 overflow-hidden cursor-pointer hover:border-violet-300 transition-all"
            onClick={() => onAction?.({ type: "ask", message: `${r.brand} ${r.model} pricelist` })}
          >
            {r.imageUrl ? (
              <img src={r.imageUrl} alt={r.colorName} className="w-full h-36 object-cover" onError={(e) => { e.target.style.display = "none"; }} />
            ) : (
              <div className="h-24 w-full flex items-center justify-center" style={{ background: r.hex || "#e2e8f0" }}>
                <Palette size={32} className="text-white/70" />
              </div>
            )}
            <div className="p-3">
              <p className="font-bold text-slate-900 truncate">{r.brand} {r.model}</p>
              <div className="flex items-center gap-2 mt-1">
                {r.hex && <div className="h-4 w-4 rounded-full border border-slate-300" style={{ background: r.hex }} />}
                <p className="text-sm text-slate-600">{r.colorName}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {rows.length === 0 && (
        <p className="text-slate-500 text-sm">No color records matched this search.</p>
      )}
    </ModernCanvasShell>
  );
}
