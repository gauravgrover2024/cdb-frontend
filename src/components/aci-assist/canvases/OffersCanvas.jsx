import React from "react";
import { motion } from "framer-motion";
import {
  Gift,
  Info,
  BadgePercent,
  Calendar,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { formatAmount } from "../canvas-utils";
import { ModernCanvasShell } from "./BaseComponents";

export function OffersCanvas({ message, widget, footer }) {
  const data = widget?.data || widget || {};
  const {
    model = "Vehicle",
    brand = "",
    offers = [],
    validUntil = "May 31, 2026",
  } = data;

  const titleModel = [brand, model].filter(Boolean).join(" ");
  const totalBenefit = offers.reduce((sum, o) => sum + (o.value || 0), 0);

  return (
    <ModernCanvasShell
      title={`${titleModel} Offers`}
      subtitle={`Exclusive benefits and savings available this month.`}
      icon={Gift}
      eyebrow="Special Deals"
      footer={footer}
    >
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#2563eb] to-[#1e40af] p-6 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] opacity-80">
            <BadgePercent size={14} /> Total Benefits Up To
          </div>
          <p className="mt-2 text-4xl font-black tracking-tight">
            {formatAmount(totalBenefit || 75000)}
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold opacity-90">
            <Calendar size={14} /> Valid until {validUntil}
          </div>
        </div>
        <div className="absolute -right-8 -top-8 opacity-20">
          <Gift size={160} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {offers.length > 0 ? (
          offers.map((offer, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-[24px] border border-[#dbe3ef] bg-white p-5 shadow-sm transition hover:border-[#2563eb] hover:bg-[#eff6ff]/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-black text-[#0f172a]">{offer.title}</h4>
                  <p className="mt-1 text-sm font-semibold text-[#64748b]">
                    {offer.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-[#2563eb]">
                    {offer.value ? formatAmount(offer.value) : "Special"}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <>
            <OfferCard
              title="Cash Discount"
              description="Direct savings on ex-showroom price"
              value={30000}
            />
            <OfferCard
              title="Exchange Bonus"
              description="Top-up over your car's valuation"
              value={25000}
            />
            <OfferCard
              title="Corporate Benefit"
              description="Exclusive for select organizations"
              value={10000}
            />
            <OfferCard
              title="Loyalty Bonus"
              description="For existing brand owners"
              value={10000}
            />
          </>
        )}
      </div>

      <div className="mt-8 rounded-[24px] border border-dashed border-[#cbd5e1] p-6 text-center">
        <p className="text-sm font-semibold text-[#64748b]">
          Looking for a custom deal? Connect with our expert advisors.
        </p>
        <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-6 py-3 text-sm font-black text-white transition hover:bg-[#1e293b]">
          Get Best Quote <ArrowUpRight size={16} />
        </button>
      </div>
    </ModernCanvasShell>
  );
}

function OfferCard({ title, description, value }) {
  return (
    <div className="rounded-[24px] border border-[#dbe3ef] bg-white p-5 shadow-sm transition hover:border-[#2563eb] hover:bg-[#eff6ff]/50">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-black text-[#0f172a]">{title}</h4>
          <p className="mt-1 text-sm font-semibold text-[#64748b]">
            {description}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-[#2563eb]">
            {formatAmount(value)}
          </p>
        </div>
      </div>
    </div>
  );
}
