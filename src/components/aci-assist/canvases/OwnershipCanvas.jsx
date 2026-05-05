import React from "react";
import {
  ShieldCheck,
  Wrench,
  TrendingDown,
  History,
  FileCheck,
  Info,
  ChevronRight,
  Zap,
} from "lucide-react";
import { formatAmount } from "../canvas-utils";
import { ModernCanvasShell } from "./BaseComponents";

export function OwnershipCanvas({ message, widget, footer }) {
  const data = widget?.data || widget || {};
  const {
    model = "Vehicle",
    brand = "",
    serviceCost5Years = 45000,
    warrantyYears = 3,
    warrantyKm = "Unlimited",
  } = data;

  const titleModel = [brand, model].filter(Boolean).join(" ");

  return (
    <ModernCanvasShell
      title={`${titleModel} Ownership`}
      subtitle="Estimated maintenance costs and warranty protection."
      icon={ShieldCheck}
      eyebrow="Ownership Guide"
      footer={footer}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-[#dbe3ef] bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-black text-[#0f172a]">
              <Wrench size={20} className="text-[#2563eb]" />
              Service Schedule
            </h3>
            <div className="mt-6 space-y-4">
              <ServiceIntervalRow
                label="1st Service"
                time="1 Month / 1,000 km"
                cost="Free"
              />
              <ServiceIntervalRow
                label="2nd Service"
                time="6 Months / 5,000 km"
                cost="Free"
              />
              <ServiceIntervalRow
                label="3rd Service"
                time="1 Year / 10,000 km"
                cost="₹4,500"
              />
              <ServiceIntervalRow
                label="Major Service"
                time="2 Years / 20,000 km"
                cost="₹8,200"
              />
            </div>
            <div className="mt-6 rounded-2xl bg-[#eff6ff] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-[#1e40af] uppercase">
                  5 Year Estimated Total
                </p>
                <p className="text-xl font-black text-[#2563eb]">
                  {formatAmount(serviceCost5Years)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-[#dbe3ef] bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-black text-[#0f172a]">
              <ShieldCheck size={20} className="text-emerald-500" />
              Warranty Coverage
            </h3>
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <FileCheck size={24} />
                </div>
                <div>
                  <p className="text-sm font-black text-[#0f172a]">
                    Standard Warranty
                  </p>
                  <p className="text-xs font-semibold text-[#64748b]">
                    {warrantyYears} Years / {warrantyKm} KM
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-[#cbd5e1] p-4">
                <p className="text-sm font-black text-[#0f172a]">
                  Extended Warranty Options
                </p>
                <p className="mt-1 text-xs font-semibold text-[#64748b]">
                  Shield of Trust available up to 7 years / 1,40,000 KM
                </p>
                <button className="mt-3 text-xs font-black text-[#2563eb] hover:underline">
                  View pricing details
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#0f172a] p-6 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-emerald-400">
                <Zap size={20} />
              </div>
              <h4 className="font-black">Reliability Score</h4>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <p className="text-3xl font-black">4.5</p>
              <p className="mb-1 text-sm font-semibold opacity-60">/ 5.0</p>
            </div>
            <p className="mt-2 text-xs font-semibold leading-relaxed opacity-70">
              High reliability rating based on service records and customer
              satisfaction indices.
            </p>
          </div>
        </div>
      </div>
    </ModernCanvasShell>
  );
}

function ServiceIntervalRow({ label, time, cost }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#f1f5f9] last:border-0">
      <div>
        <p className="text-sm font-black text-[#0f172a]">{label}</p>
        <p className="text-xs font-semibold text-[#64748b]">{time}</p>
      </div>
      <div className="text-right">
        <span className="text-sm font-black text-[#0f172a]">{cost}</span>
      </div>
    </div>
  );
}
