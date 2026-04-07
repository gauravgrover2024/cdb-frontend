import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, FileText, CalendarDays, ArrowRight, TrendingUp, Clock } from "lucide-react";

const quickActions = [
  {
    title: "Create New Policy Case",
    description: "Start a fresh insurance case linked to customer and vehicle details.",
    icon: FileText,
    color: "sky",
    stat: "Active",
    route: "/insurance/new",
    cta: "Get Started",
  },
  {
    title: "Renewal Tracker",
    description: "Track expiring policies and upcoming renewals in one place.",
    icon: CalendarDays,
    color: "amber",
    stat: "Soon",
    route: null,
    cta: "Coming soon",
  },
  {
    title: "Claims Desk",
    description: "Capture and monitor claim lifecycle from initiation to closure.",
    icon: ShieldCheck,
    color: "emerald",
    stat: "Soon",
    route: null,
    cta: "Coming soon",
  },
];

const colorMap = {
  sky: {
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    hover: "hover:border-sky-300 hover:bg-sky-50/60 dark:hover:border-sky-700 dark:hover:bg-sky-950/20",
    arrow: "text-sky-600 dark:text-sky-400",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    hover: "hover:border-amber-300 hover:bg-amber-50/60 dark:hover:border-amber-700 dark:hover:bg-amber-950/20",
    arrow: "text-amber-600 dark:text-amber-400",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    hover: "hover:border-emerald-300 hover:bg-emerald-50/60 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20",
    arrow: "text-emerald-600 dark:text-emerald-400",
  },
};

const InsuranceIntroCard = () => {
  const navigate = useNavigate();
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-black overflow-hidden">
      <div className="bg-gradient-to-r from-sky-600 to-sky-700 dark:from-sky-800 dark:to-sky-900 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-sky-100">
              Insurance Workspace
            </p>
            <h1 className="text-lg font-black tracking-tight text-white">
              Insurance Management Hub
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-sky-100/90">
          Manage policy cases, renewals, and claims from a single workspace. Create new cases, track upcoming renewals, and handle claims end-to-end.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-slate-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Available Modules
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const c = colorMap[action.color];
            const isLive = Boolean(action.route);
            return (
              <article
                key={action.title}
                onClick={() => isLive && navigate(action.route)}
                className={`group flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-200 dark:border-slate-700 dark:bg-slate-900/30 ${c.hover} ${isLive ? "cursor-pointer" : "opacity-80"}`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.icon}`}>
                    <Icon size={18} />
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${c.badge}`}>
                    {action.stat}
                  </span>
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {action.title}
                </h2>
                <p className="mt-1.5 flex-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {action.description}
                </p>
                <span className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${c.arrow} group-hover:gap-2 transition-all`}>
                  {action.cta} {isLive && <ArrowRight size={12} />}
                </span>
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
          <Clock size={14} className="text-slate-400 shrink-0" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            More modules coming soon — Renewal reminders, bulk upload, and advanced analytics are in development.
          </p>
        </div>
      </div>
    </section>
  );
};

export default InsuranceIntroCard;
