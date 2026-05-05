import React from "react";
import { motion } from "framer-motion";
import {
  Gauge,
  Zap,
  Wind,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { ModernCanvasShell } from "./BaseComponents";

export function PerformanceCanvas({ message, widget, footer }) {
  const data = widget?.data || widget || {};
  const {
    model = "Vehicle",
    brand = "",
    hp = 160,
    torque = 253,
    zeroToHundred = 8.1,
  } = data;

  const titleModel = [brand, model].filter(Boolean).join(" ");

  return (
    <ModernCanvasShell
      title={`${titleModel} Performance`}
      subtitle="Engine specs, acceleration, and driving dynamics."
      icon={Gauge}
      eyebrow="Performance Advisor"
      footer={footer}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <StatBlock
          icon={Zap}
          label="Power"
          value={`${hp} PS`}
          desc="Class-leading output"
        />
        <StatBlock
          icon={TrendingUp}
          label="Torque"
          value={`${torque} Nm`}
          desc="Strong mid-range punch"
        />
        <StatBlock
          icon={Wind}
          label="0-100 km/h"
          value={`${zeroToHundred}s`}
          desc="Quickest in segment"
        />
      </div>

      <div className="mt-8 rounded-[28px] border border-[#dbe3ef] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-[#0f172a]">Driving Dynamics</h3>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <DynamicMetric
            label="High Speed Stability"
            score={9}
            desc="Solid and planted on highways even at 120kmph."
          />
          <DynamicMetric
            label="Cornering Grip"
            score={8}
            desc="Minimal body roll with precise steering feedback."
          />
          <DynamicMetric
            label="Braking Bite"
            score={9}
            desc="Predictable and strong stopping power."
          />
          <DynamicMetric
            label="Ride Quality"
            score={8}
            desc="Absorbs bumps well at city speeds."
          />
        </div>
      </div>

      <div className="mt-6 rounded-[24px] bg-[#0f172a] p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-amber-400">
            <Zap size={20} />
          </div>
          <h4 className="font-black italic uppercase tracking-widest">
            Expert Turbo Verdict
          </h4>
        </div>
        <p className="mt-4 text-sm font-semibold leading-relaxed opacity-80">
          "The 1.5L Turbo engine is a gem. It offers explosive acceleration and
          is mated to a snappy DCT that makes it an absolute enthusiast's
          delight."
        </p>
      </div>
    </ModernCanvasShell>
  );
}

function StatBlock({ icon: Icon, label, value, desc }) {
  return (
    <div className="rounded-[24px] border border-[#dbe3ef] bg-white p-6 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
        <Icon size={24} />
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#64748b]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-[#0f172a]">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-[#2563eb]">{desc}</p>
    </div>
  );
}

function DynamicMetric({ label, score, desc }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-[#0f172a]">{label}</p>
        <p className="text-sm font-black text-[#2563eb]">{score}/10</p>
      </div>
      <div className="mt-3 flex gap-1">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < score ? "bg-[#2563eb]" : "bg-[#f1f5f9]"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold leading-relaxed text-[#64748b]">
        {desc}
      </p>
    </div>
  );
}
