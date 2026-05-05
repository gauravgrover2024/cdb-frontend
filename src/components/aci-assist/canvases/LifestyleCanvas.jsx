import React from "react";
import { motion } from "framer-motion";
import {
  Heart,
  Baby,
  Briefcase,
  Users,
  Mountain,
  Building2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { ModernCanvasShell } from "./BaseComponents";

export function LifestyleCanvas({ message, widget, footer }) {
  const data = widget?.data || widget || {};
  const {
    model = "Vehicle",
    brand = "",
    scores = {},
    persona = "Family Explorer",
  } = data;

  const titleModel = [brand, model].filter(Boolean).join(" ");

  return (
    <ModernCanvasShell
      title={`${titleModel} Fit`}
      subtitle={`How well this vehicle matches your specific needs.`}
      icon={Sparkles}
      eyebrow="Lifestyle Expert"
      footer={footer}
    >
      <div className="grid gap-6 md:grid-cols-[1fr_0.8fr]">
        <div className="rounded-[28px] border border-[#dbe3ef] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-[#0f172a]">Persona Matching</h3>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <ScoreCard
              icon={Users}
              label="Family Friendly"
              score={92}
              desc="Great rear legroom and safety."
            />
            <ScoreCard
              icon={Heart}
              label="Senior Friendly"
              score={88}
              desc="Easy ingress/egress and ride."
            />
            <ScoreCard
              icon={Building2}
              label="City Commute"
              score={85}
              desc="Compact and light steering."
            />
            <ScoreCard
              icon={Mountain}
              label="Adventure Ready"
              score={78}
              desc="Good ground clearance."
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] bg-[#0f172a] p-6 text-white shadow-lg">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">
              Primary Persona
            </p>
            <h4 className="mt-2 text-2xl font-black text-blue-400">{persona}</h4>
            <p className="mt-3 text-sm font-semibold leading-relaxed opacity-80">
              This vehicle is ideal for weekend getaways with family and daily
              urban commutes, offering a balanced mix of space and efficiency.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                Isofix
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                Tall Boy
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                Large Boot
              </span>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#dbe3ef] bg-[#f8fafc] p-6">
            <h4 className="font-black text-[#0f172a]">Expert Verdict</h4>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#64748b]">
              "The {model} stands out for its senior-friendly features like high
              hip-point and large window area, making it a top pick for family
              needs."
            </p>
          </div>
        </div>
      </div>
    </ModernCanvasShell>
  );
}

function ScoreCard({ icon: Icon, label, score, desc }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
          <Icon size={20} />
        </div>
        <p className="text-xl font-black text-[#0f172a]">{score}%</p>
      </div>
      <div>
        <p className="text-sm font-black text-[#0f172a]">{label}</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-[#2563eb]"
          />
        </div>
        <p className="mt-2 text-xs font-semibold text-[#64748b]">{desc}</p>
      </div>
    </div>
  );
}
