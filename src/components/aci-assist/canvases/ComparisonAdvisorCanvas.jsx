import React from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ThumbsUp,
  ChevronRight,
  TrendingUp,
  Zap,
} from "lucide-react";
import { ModernCanvasShell } from "./BaseComponents";

export function ComparisonAdvisorCanvas({ message, widget, footer }) {
  const data = widget?.data || widget || {};
  const { models = [], comparison = {} } = data;

  return (
    <ModernCanvasShell
      title="Expert Verdict"
      subtitle="Side-by-side analysis and final recommendation."
      icon={Trophy}
      eyebrow="Comparison Advisor"
      footer={footer}
    >
      <div className="rounded-[30px] bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-8 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400">
              The Winner
            </p>
            <h3 className="text-2xl font-black">{models[0]?.name || "Hyundai Verna"}</h3>
          </div>
        </div>
        <p className="mt-6 text-sm font-semibold leading-relaxed opacity-80">
          {data.verdict ||
            "The Verna stands out as the best overall package, offering a superior balance of performance, features, and safety compared to its rivals in this segment."}
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <AnalysisBlock
          title="Why Choose Verna?"
          type="pros"
          items={[
            "Powerful 1.5L Turbo Petrol Engine",
            "Level 2 ADAS features",
            "Best-in-class features list",
          ]}
        />
        <AnalysisBlock
          title="Why Choose Slavia?"
          type="pros"
          items={[
            "Excellent ride and handling",
            "Solid European build quality",
            "Timeless design aesthetic",
          ]}
        />
      </div>

      <div className="mt-8 rounded-[28px] border border-[#dbe3ef] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-[#0f172a]">Segment Comparison</h3>
        <div className="mt-6 space-y-4">
          <ComparisonMetric label="Performance" winner="Verna" />
          <ComparisonMetric label="Ride Quality" winner="Slavia" />
          <ComparisonMetric label="Features" winner="Verna" />
          <ComparisonMetric label="Value for Money" winner="Verna" />
        </div>
      </div>
    </ModernCanvasShell>
  );
}

function AnalysisBlock({ title, type, items }) {
  return (
    <div className="rounded-[28px] border border-[#dbe3ef] bg-white p-6 shadow-sm">
      <h4 className="flex items-center gap-2 font-black text-[#0f172a]">
        {type === "pros" ? (
          <ThumbsUp size={18} className="text-[#2563eb]" />
        ) : (
          <AlertCircle size={18} className="text-amber-500" />
        )}
        {title}
      </h4>
      <ul className="mt-4 space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm font-semibold text-[#64748b]">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonMetric({ label, winner }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#f1f5f9] last:border-0">
      <span className="text-sm font-black text-[#64748b] uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-black text-[#0f172a]">{winner}</span>
        <Zap size={14} className="text-amber-500 fill-amber-500" />
      </div>
    </div>
  );
}
