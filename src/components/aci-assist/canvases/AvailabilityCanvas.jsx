import React from "react";
import { motion } from "framer-motion";
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  ChevronRight,
} from "lucide-react";
import { asArray } from "../utils";
import { compactText } from "../canvas-utils";
import { ModernCanvasShell } from "./BaseComponents";

export function AvailabilityCanvas({ message, widget, footer }) {
  const data = widget?.data || widget || {};
  const {
    model = "Vehicle",
    brand = "",
    city = "Delhi",
    availability = [],
  } = data;

  const titleModel = [brand, model].filter(Boolean).join(" ");

  return (
    <ModernCanvasShell
      title={`${titleModel} Availability`}
      subtitle={`Real-time stock status and waiting periods in ${city}.`}
      icon={Clock}
      eyebrow="Delivery Tracker"
      footer={footer}
    >
      <div className="grid gap-6 md:grid-cols-[1fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-[#dbe3ef] bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-[#0f172a]">
              Estimated Waiting Period
            </h3>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {asArray(data.waitingPeriods || data.waiting_periods).map((wp, idx) => (
                <WaitingCard 
                  key={idx} 
                  label={compactText(wp.label || wp.variant || "Variant")} 
                  period={compactText(wp.period || wp.waiting || "—")} 
                  status={wp.status || "medium"} 
                />
              ))}
              {!asArray(data.waitingPeriods || data.waiting_periods).length && (
                <>
                  <WaitingCard label="Petrol MT" period="2-4 Weeks" status="fast" />
                  <WaitingCard label="Petrol IVT" period="8-12 Weeks" status="slow" />
                  <WaitingCard label="Diesel MT" period="4-6 Weeks" status="medium" />
                  <WaitingCard label="Turbo DCT" period="12-16 Weeks" status="slow" />
                </>
              )}
            </div>
          </div>

          <div className="rounded-[24px] bg-[#f8fafc] p-6">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2563eb] shadow-sm">
                <Truck size={24} />
              </div>
              <div>
                <h4 className="font-black text-[#0f172a]">In-Stock Alert</h4>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-[#64748b]">
                  3 units of Verna SX Turbo (Black) are currently available for
                  immediate delivery at select dealerships in {city}.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#dbe3ef] bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-black text-[#0f172a]">
            <Building2 size={20} className="text-[#2563eb]" />
            Dealer Stock
          </h3>
          <div className="mt-6 space-y-4">
            {asArray(data.dealers || data.dealerStock).map((ds, idx) => (
              <DealerStockRow
                key={idx}
                name={compactText(ds.name || ds.dealerName)}
                location={compactText(ds.location || ds.city)}
                stock={compactText(ds.stock || ds.status)}
              />
            ))}
            {!asArray(data.dealers || data.dealerStock).length && (
              <>
                <DealerStockRow name="Himgiri Hyundai" location="Okhla Phase 3" stock="Available" />
                <DealerStockRow name="Deep Hyundai" location="West Delhi" stock="2 Weeks" />
                <DealerStockRow name="Koncept Hyundai" location="Green Park" stock="In Transit" />
              </>
            )}
          </div>
          <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#eff6ff] py-4 text-sm font-black text-[#2563eb] transition hover:bg-[#dbeafe]">
            Contact All Dealers <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </ModernCanvasShell>
  );
}

function WaitingCard({ label, period, status }) {
  const statusColors = {
    fast: "text-emerald-600 bg-emerald-50",
    medium: "text-amber-600 bg-amber-50",
    slow: "text-rose-600 bg-rose-50",
  };

  return (
    <div className="rounded-2xl border border-[#e2e8f0] p-4 text-center">
      <p className="text-xs font-black text-[#64748b] uppercase tracking-wider">
        {compactText(label)}
      </p>
      <p className="mt-2 text-lg font-black text-[#0f172a]">{compactText(period)}</p>
      <span
        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${statusColors[status]}`}
      >
        {status === "fast" ? "Fast Delivery" : status === "medium" ? "Moderate" : "High Demand"}
      </span>
    </div>
  );
}

function DealerStockRow({ name, location, stock }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#f1f5f9] last:border-0">
      <div>
        <p className="text-sm font-black text-[#0f172a]">{compactText(name)}</p>
        <p className="text-xs font-semibold text-[#64748b]">{compactText(location)}</p>
      </div>
      <div className="text-right">
        <span
          className={`text-[11px] font-black ${
            stock === "Available" ? "text-emerald-600" : "text-[#2563eb]"
          }`}
        >
          {compactText(stock)}
        </span>
      </div>
    </div>
  );
}
