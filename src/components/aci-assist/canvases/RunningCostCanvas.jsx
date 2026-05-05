import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  Calculator,
  ChevronRight,
  Fuel,
  Info,
  TrendingDown,
  Zap,
} from "lucide-react";
import { formatAmount } from "../canvas-utils";
import { ModernCanvasShell, ModernCanvasFooter } from "./BaseComponents";

export function RunningCostCanvas({ message, widget, footer }) {
  const data = widget?.data || widget || {};
  const {
    model = "Vehicle",
    brand = "",
    monthlyKm = 1000,
    fuelTypes = [],
    analysis = [],
  } = data;

  const titleModel = [brand, model].filter(Boolean).join(" ");

  return (
    <ModernCanvasShell
      title={titleModel}
      subtitle={`Running cost & TCO analysis for ${monthlyKm} km monthly usage.`}
      icon={Calculator}
      eyebrow="Ownership Expert"
      footer={footer}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {fuelTypes.map((fuel, idx) => (
          <motion.div
            key={fuel.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="rounded-[24px] border border-[#dbe3ef] bg-white/94 p-5 shadow-sm backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                {fuel.type === "Electric" ? <Zap size={20} /> : <Fuel size={20} />}
              </div>
              <div>
                <h3 className="font-black text-[#0f172a]">{fuel.type}</h3>
                <p className="text-xs font-semibold text-[#64748b]">
                  {fuel.mileage} {fuel.unit}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">
                    Monthly Cost
                  </p>
                  <p className="text-2xl font-black text-[#2563eb]">
                    {formatAmount(fuel.monthlyCost)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">
                    Cost per KM
                  </p>
                  <p className="text-lg font-black text-[#0f172a]">
                    ₹{fuel.costPerKm.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#f8fafc] p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Annual Fuel</span>
                  <span className="font-black text-[#0f172a]">
                    {formatAmount(fuel.monthlyCost * 12)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 rounded-[24px] border border-[#dbe3ef] bg-[#f8fafc]/50 p-6">
        <h3 className="flex items-center gap-2 text-lg font-black text-[#0f172a]">
          <TrendingDown size={20} className="text-emerald-500" />
          ACI Expert Recommendation
        </h3>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[#64748b]">
          {data.recommendation ||
            `Based on your monthly running of ${monthlyKm} km, we recommend the ${fuelTypes[0]?.type} variant for the best balance of initial cost and long-term savings.`}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white bg-white/60 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">
              5 Year Savings
            </p>
            <p className="mt-1 text-lg font-black text-emerald-600">
              {formatAmount(data.fiveYearSavings || 250000)}
            </p>
          </div>
          <div className="rounded-2xl border border-white bg-white/60 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">
              Break-even
            </p>
            <p className="mt-1 text-lg font-black text-[#0f172a]">
              {data.breakevenMonths || 32} Months
            </p>
          </div>
          <div className="rounded-2xl border border-white bg-white/60 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">
              Service Interval
            </p>
            <p className="mt-1 text-lg font-black text-[#0f172a]">
              10,000 KM
            </p>
          </div>
        </div>
      </div>
    </ModernCanvasShell>
  );
}
