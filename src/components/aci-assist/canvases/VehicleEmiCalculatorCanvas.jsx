import React from "react";
import { Banknote } from "lucide-react";
import { formatCurrency, asArray } from "../utils";
import { ModernCanvasShell } from "./BaseComponents";

export function VehicleEmiCalculatorCanvas({ message, widget, onAction, footer }) {
  const data = widget?.data || widget || {};
  const vehicle = data.vehicle || {};
  const inputs = data.inputs || {};
  const result = data.result || {};
  const price = data.price || {};
  const scenarios = asArray(data.scenarios);

  return (
    <ModernCanvasShell title="EMI Calculator" subtitle={`${vehicle.model || "Vehicle"} ${vehicle.variant || ""}`} icon={Banknote} footer={footer}>
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Monthly EMI</p>
        <h2 className="text-5xl font-black mb-6">{formatCurrency(result.emi)}</h2>
        <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">On-road Price</p>
            <p className="text-xl font-bold">{formatCurrency(price.onRoad)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Loan Amount</p>
            <p className="text-xl font-bold">{formatCurrency(result.financeAmount)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Down Payment</p>
          <p className="font-bold text-slate-900">{formatCurrency(inputs.downPayment)} ({inputs.downPaymentPercent}%)</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tenure</p>
          <p className="font-bold text-slate-900">{inputs.tenureMonths / 12} Years ({inputs.tenureMonths} Mo)</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Interest Rate</p>
          <p className="font-bold text-slate-900">{inputs.annualRate}% p.a.</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Other Tenures</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {scenarios.map((s, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/40 bg-white/70 p-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-slate-500 mb-1">{s.label}</p>
              <p className="text-lg font-black text-slate-900">{formatCurrency(s.emi)}<span className="text-xs font-bold text-slate-400">/mo</span></p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/40 bg-white/70 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-600">Total Interest</span>
          <span className="font-bold text-slate-900">{formatCurrency(result.totalInterest)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-600">Total Payable</span>
          <span className="font-black text-slate-900">{formatCurrency(result.totalPayable)}</span>
        </div>
      </div>
    </ModernCanvasShell>
  );
}
