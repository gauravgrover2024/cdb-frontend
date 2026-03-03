import React from "react";
import { useLocation } from "react-router-dom";
import Icon from "../AppIcon";

const MODULES = [
  {
    key: "analytics",
    match: (path) => path === "/" || path.startsWith("/analytics"),
    title: "Analytics",
    subtitle: "Decision-grade overview across lending, payouts, and operations",
    icon: "ChartColumnBig",
    badge: "Executive",
    glow: "from-sky-500/20 via-cyan-400/10 to-transparent",
  },
  {
    key: "customers",
    match: (path) => path.startsWith("/customers"),
    title: "Customers",
    subtitle: "Profiles, KYC, and relationship data in one place",
    icon: "Users",
    badge: "CRM",
    glow: "from-emerald-500/20 via-lime-400/10 to-transparent",
  },
  {
    key: "loans",
    match: (path) => path.startsWith("/loans"),
    title: "Loans",
    subtitle: "Application lifecycle, approvals, and post-file operations",
    icon: "Wallet",
    badge: "Core",
    glow: "from-indigo-500/20 via-violet-400/10 to-transparent",
  },
  {
    key: "payouts",
    match: (path) => path.startsWith("/payouts"),
    title: "Payouts",
    subtitle: "Receivables and payables with tighter financial control",
    icon: "HandCoins",
    badge: "Finance",
    glow: "from-amber-500/25 via-orange-400/10 to-transparent",
  },
  {
    key: "delivery-orders",
    match: (path) => path.startsWith("/delivery-orders"),
    title: "Delivery Orders",
    subtitle: "Vehicle dispatch and checklist execution workflow",
    icon: "Truck",
    badge: "Operations",
    glow: "from-rose-500/20 via-red-400/10 to-transparent",
  },
  {
    key: "payments",
    match: (path) => path.startsWith("/payments"),
    title: "Payments",
    subtitle: "Collections, booking flows, and reconciliation",
    icon: "ReceiptIndianRupee",
    badge: "Cashflow",
    glow: "from-teal-500/20 via-cyan-400/10 to-transparent",
  },
  {
    key: "vehicles",
    match: (path) => path.startsWith("/vehicles"),
    title: "Vehicles",
    subtitle: "Inventory, variants, and pricing intelligence",
    icon: "CarFront",
    badge: "Catalog",
    glow: "from-fuchsia-500/20 via-pink-400/10 to-transparent",
  },
  {
    key: "superadmin",
    match: (path) => path.startsWith("/superadmin"),
    title: "Control Panel",
    subtitle: "User governance and system-level administrative oversight",
    icon: "ShieldCheck",
    badge: "Admin",
    glow: "from-zinc-500/25 via-zinc-400/10 to-transparent",
  },
];

const DEFAULT_MODULE = {
  title: "Workspace",
  subtitle: "Operational cockpit",
  icon: "LayoutDashboard",
  badge: "Module",
  glow: "from-sky-500/20 via-cyan-400/10 to-transparent",
};

function ModuleFrame({ children }) {
  const location = useLocation();
  const moduleMeta = MODULES.find((mod) => mod.match(location.pathname)) || DEFAULT_MODULE;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-6 pt-4 md:px-6 md:pt-5">
        <section className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:mb-5 md:p-5">
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${moduleMeta.glow}`} />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                {moduleMeta.badge}
              </div>
              <h1 className="truncate text-lg font-black tracking-tight text-zinc-900 md:text-2xl">
                {moduleMeta.title}
              </h1>
              <p className="mt-1 text-xs font-medium text-zinc-600 md:text-sm">{moduleMeta.subtitle}</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/90 shadow-sm">
              <Icon name={moduleMeta.icon} size={22} className="text-zinc-800" />
            </div>
          </div>
        </section>

        {children}
      </div>
    </div>
  );
}

export default ModuleFrame;
