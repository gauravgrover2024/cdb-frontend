import React from "react";
import Icon from "../../../components/AppIcon";

const palette = {
  blue: {
    icon: "text-sky-700",
    ring: "ring-sky-200",
    chip: "bg-sky-50 text-sky-700",
    glow: "from-sky-500/20 to-cyan-400/10",
  },
  emerald: {
    icon: "text-emerald-700",
    ring: "ring-emerald-200",
    chip: "bg-emerald-50 text-emerald-700",
    glow: "from-emerald-500/20 to-lime-400/10",
  },
  amber: {
    icon: "text-amber-700",
    ring: "ring-amber-200",
    chip: "bg-amber-50 text-amber-700",
    glow: "from-amber-500/20 to-orange-400/10",
  },
  rose: {
    icon: "text-rose-700",
    ring: "ring-rose-200",
    chip: "bg-rose-50 text-rose-700",
    glow: "from-rose-500/20 to-red-400/10",
  },
};

const StatCard = ({ title, value, iconName, color = "blue", subtitle }) => {
  const token = palette[color] || palette.blue;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border/70 bg-white p-5 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${token.glow}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900">{value}</p>
          {subtitle ? (
            <p className="mt-1 text-xs font-medium text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        <div
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 ring-1 ${token.ring}`}
          aria-hidden="true"
        >
          <Icon name={iconName} size={21} className={token.icon} />
        </div>
      </div>

      <div className="relative mt-4">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${token.chip}`}>
          Live snapshot
        </span>
      </div>
    </article>
  );
};

export default StatCard;
