import React from "react";
import { ShieldCheck, FileText, CalendarDays, ArrowRight } from "lucide-react";

const quickActions = [
  {
    title: "Create New Policy Case",
    description:
      "Start a fresh insurance case linked to customer and vehicle details.",
    icon: FileText,
  },
  {
    title: "Renewal Tracker",
    description: "Track expiring policies and upcoming renewals in one place.",
    icon: CalendarDays,
  },
  {
    title: "Claims Desk",
    description:
      "Capture and monitor claim lifecycle from initiation to closure.",
    icon: ShieldCheck,
  },
];

const InsuranceIntroCard = () => {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-black sm:p-6">
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
          Insurance Workspace
        </p>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Insurance Dashboard (First Page)
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          This is the initial Insurance landing page. From here, your team can
          create policy cases, manage renewals, and handle claims in upcoming
          iterations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <article
              key={action.title}
              className="group rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-colors hover:bg-sky-50/70 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-900"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                <Icon size={18} />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {action.title}
              </h2>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                {action.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                Coming soon <ArrowRight size={12} />
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default InsuranceIntroCard;
