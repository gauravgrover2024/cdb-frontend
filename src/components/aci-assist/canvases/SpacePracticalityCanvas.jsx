import React from "react";
import {
  Maximize,
  Briefcase,
  Users,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";
import { ModernCanvasShell } from "./BaseComponents";

export function SpacePracticalityCanvas({ message, widget, footer }) {
  const data = widget?.data || widget || {};
  const { model = "Vehicle", brand = "", bootSpace = 528, seats = 5 } = data;

  const titleModel = [brand, model].filter(Boolean).join(" ");

  return (
    <ModernCanvasShell
      title={`${titleModel} Space`}
      subtitle="Cabin space, boot capacity, and practicality overview."
      icon={Maximize}
      eyebrow="Space Advisor"
      footer={footer}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[28px] border border-[#dbe3ef] bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-black text-[#0f172a]">
            <Briefcase size={20} className="text-[#2563eb]" />
            Cargo & Utility
          </h3>
          <div className="mt-8 flex items-end gap-3">
            <p className="text-4xl font-black text-[#0f172a]">{bootSpace}</p>
            <p className="mb-1.5 text-lg font-black text-[#64748b]">Litres</p>
          </div>
          <p className="mt-2 text-sm font-semibold text-[#64748b]">
            Best-in-segment boot space. Fits 3 large suitcases easily.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <FeatureBox label="Rear 60:40 Split" value="Available" />
            <FeatureBox label="Glove Box" value="Cooled" />
            <FeatureBox label="Cup Holders" value="6 Units" />
            <FeatureBox label="Phone Tray" value="Wireless" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-[#dbe3ef] bg-[#f8fafc] p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-black text-[#0f172a]">
              <Users size={20} className="text-[#2563eb]" />
              Passenger Comfort
            </h3>
            <div className="mt-6 space-y-5">
              <PracticalityRow label="Rear Legroom" score={9} max={10} />
              <PracticalityRow label="Headroom" score={8} max={10} />
              <PracticalityRow label="Shoulder Room" score={7} max={10} />
              <PracticalityRow label="Underthigh Support" score={8} max={10} />
            </div>
          </div>

          <div className="rounded-[24px] bg-[#eff6ff] p-5 ring-1 ring-[#bfdbfe]">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563eb] shadow-sm">
                <Layers size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#0f172a]">Floor Hump</h4>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-[#64748b]">
                  Almost flat floor in the rear allows comfortable seating for
                  the middle passenger.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernCanvasShell>
  );
}

function FeatureBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#f8fafc] p-3 text-center ring-1 ring-[#e2e8f0]">
      <p className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#0f172a]">{value}</p>
    </div>
  );
}

function PracticalityRow({ label, score, max }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-black">
        <span className="text-[#334155]">{label}</span>
        <span className="text-[#2563eb]">{score} / {max}</span>
      </div>
      <div className="flex gap-1">
        {[...Array(max)].map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < score ? "bg-[#2563eb]" : "bg-[#cbd5e1]/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
