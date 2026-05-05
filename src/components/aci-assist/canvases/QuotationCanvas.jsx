import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  Download,
  Share2,
  Mail,
  Smartphone,
  ChevronRight,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { asArray } from "../utils";
import { formatAmount, compactText, getPriceParts } from "../canvas-utils";
import { ModernCanvasShell } from "./BaseComponents";

export function QuotationCanvas({ message, widget, footer }) {
  const data = widget?.data || widget || {};
  const {
    model = "Vehicle",
    brand = "",
    variant = "SX",
    city = "Delhi",
    breakup = [],
    totalOnRoad = 1850000,
  } = data;

  const titleModel = [brand, model, variant].map(v => compactText(v, "")).filter(Boolean).join(" ");

  return (
    <ModernCanvasShell
      title="Personalized Quote"
      subtitle={`Official quotation for ${titleModel} in ${compactText(city)}.`}
      icon={FileText}
      eyebrow="ACI Digital Quote"
      footer={footer}
    >
      <div className="rounded-[28px] border border-[#dbe3ef] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#64748b]">
              Quotation Summary
            </p>
            <h3 className="mt-1 text-2xl font-black text-[#0f172a]">
              {titleModel}
            </h3>
            <p className="mt-1 text-sm font-semibold text-[#64748b]">
              Reference: #ACI-2026-9921
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#64748b]">
              Total On-Road Price
            </p>
            <p className="mt-1 text-3xl font-black text-[#2563eb]">
              {formatAmount(totalOnRoad)}
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[22px] border border-[#e2e8f0]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8fafc] text-[11px] font-black uppercase tracking-wider text-[#64748b]">
              <tr>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              <PriceRow label="Ex-Showroom Price" value={data.exShowroom || data.ex_showroom} />
              {data.rto > 0 && <PriceRow label="RTO (Registration)" value={data.rto} />}
              {data.insurance > 0 && <PriceRow label="Insurance" value={data.insurance} />}
              {asArray(data.listItems || data.optional_list || data.other_list).map((item, idx) => (
                <PriceRow 
                  key={idx} 
                  label={compactText(item.label || item.name || item.chargeName || "Other Charge")} 
                  value={item.amount || item.value} 
                  isOptional={item.isOptional}
                />
              ))}
              <tr className="bg-[#eff6ff]">
                <td className="px-6 py-4 font-black text-[#1e40af]">
                  Net Payable
                </td>
                <td className="px-6 py-4 text-right font-black text-[#2563eb]">
                  {formatAmount(totalOnRoad)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button className="flex items-center justify-center gap-2 rounded-2xl bg-[#0f172a] py-4 text-sm font-black text-white transition hover:bg-[#1e293b]">
            <Download size={18} /> Download PDF
          </button>
          <button className="flex items-center justify-center gap-2 rounded-2xl border border-[#dbe3ef] bg-white py-4 text-sm font-black text-[#0f172a] transition hover:bg-[#f8fafc]">
            <Share2 size={18} /> Share Quote
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatusCard
          icon={ShieldCheck}
          title="Price Guarantee"
          desc="Valid for 48 hours"
        />
        <StatusCard
          icon={CreditCard}
          title="Instant Loan"
          desc="Approval in 2 hours"
        />
        <StatusCard
          icon={CheckCircle2}
          title="Priority Booking"
          desc="Fast-track delivery"
        />
      </div>
    </ModernCanvasShell>
  );
}

function PriceRow({ label, value, isOptional }) {
  return (
    <tr>
      <td className="px-6 py-4 font-semibold text-[#334155]">
        {label}
        {isOptional && (
          <span className="ml-2 text-[10px] font-black text-[#94a3b8]">
            OPTIONAL
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-right font-black text-[#0f172a]">
        {formatAmount(value)}
      </td>
    </tr>
  );
}

function StatusCard({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/60 p-4 ring-1 ring-[#dbe3ef]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563eb] shadow-sm">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-black text-[#0f172a]">{title}</p>
        <p className="text-xs font-semibold text-[#64748b]">{desc}</p>
      </div>
    </div>
  );
}
