import React from "react";
import { motion } from "framer-motion";
import { Banknote } from "lucide-react";
import { formatCurrency, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";
import { valueFrom } from "../canvas-utils";

export function LoanClosureCanvas({ widget, onAction, footer }) {
  const data = widget.data || widget.summary || widget;
  const approx = valueFrom(
    data,
    ["approxClosure", "approxClosureAmount", "principalOutstanding"],
    "—",
  );
  const actions = asArray(widget.actions || data.actions);

  const fields = [
    ["Customer", valueFrom(data, ["customerName", "customer"])],
    ["Vehicle", valueFrom(data, ["vehicle", "vehicleName", "model"])],
    ["Registration", valueFrom(data, ["registrationNumber", "registration"])],
    ["Bank", valueFrom(data, ["bank", "loanBank", "bankName"])],
    [
      "Disbursed",
      formatCurrency(valueFrom(data, ["disbursedAmount", "principal"])),
    ],
    ["ROI", valueFrom(data, ["roi", "annualRate"], "—")],
    ["Tenure", valueFrom(data, ["tenureMonths", "tenure"], "—")],
    ["EMI", formatCurrency(valueFrom(data, ["emi"]))],
  ];

  return (
    <ModernCanvasShell
      title="Loan Closure"
      subtitle="Estimated closure amount based on current EMI schedule"
      icon={Banknote}
      actions={actions}
      onAction={onAction}
      footer={footer}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="relative rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white overflow-hidden"
      >
        <div className="absolute -right-16 -top-16 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <p className="text-sm font-bold uppercase tracking-widest opacity-90">
            Outstanding Amount
          </p>
          <p className="text-5xl font-black mt-2">{formatCurrency(approx)}</p>
          <p className="text-sm opacity-80 mt-3">
            Calculated assuming all EMIs paid on time
          </p>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <motion.div
            key={label}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-slate-200/30 bg-gradient-to-br from-slate-50/50 to-slate-100/50 p-4"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {label}
            </p>
            <p className="text-lg font-black text-slate-900 mt-2">{value}</p>
          </motion.div>
        ))}
      </div>
    </ModernCanvasShell>
  );
}
