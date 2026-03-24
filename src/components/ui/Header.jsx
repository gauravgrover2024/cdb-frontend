import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
  Settings,
  Bell,
  UserCircle2,
} from "lucide-react";
import Icon from "../AppIcon";
import { Badge as AntBadge } from "antd";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { FEATURE_ACCESS } from "../../hooks/useRBAC";
import { startNewLoanCase } from "../../modules/loans/utils/startNewLoanCase";

// ─── Helpers ────────────────────────────────────────────────────────────────

const nameToHue = (name) => {
  const str = String(name || "?");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
};

const getInitials = (name) => {
  const str = String(name || "").trim();
  if (!str) return "?";
  const parts = str.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return str.slice(0, 2).toUpperCase();
};

const ROLE_META = {
  superadmin: { label: "Superadmin", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  admin:       { label: "Admin",      color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
  staff:       { label: "Staff",      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  user:        { label: "User",       color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  demo:        { label: "Demo",       color: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" },
};

// Initials avatar — used in header button and mobile footer
const UserAvatar = ({ name, size = 32 }) => {
  const hue = nameToHue(name);
  const initials = getInitials(name);
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundColor: `hsl(${hue}, 55%, 46%)`,
      }}
    >
      {initials}
    </div>
  );
};

// ─── Component ──────────────────────────────────────────────────────────────

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { user: userData, logout } = useAuth();

  const roleMeta = ROLE_META[userData?.role] || ROLE_META.staff;

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => {
      if (!e.target.closest("[data-profile-menu]")) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  const userRole = userData?.role;

  // Helper: check if current user can access a given roles array
  // Empty array = any authenticated user can access
  const canAccess = (roles) => {
    if (!roles || roles.length === 0) return true;
    return roles.includes(userRole);
  };

  const allNavigationGroups = [
    {
      label: "Analytics",
      path: "/analytics",
      icon: <Icon name="BarChart3" size={18} />,
      roles: FEATURE_ACCESS.ANALYTICS,
    },
    {
      label: "Customers",
      icon: <Icon name="Users" size={18} />,
      roles: FEATURE_ACCESS.CUSTOMERS,
      children: [
        { label: "Dashboard",         path: "/customers",     desc: "View all customer records", roles: FEATURE_ACCESS.CUSTOMERS },
        { label: "New Registration",  path: "/customers/new", desc: "Register a new client",      roles: FEATURE_ACCESS.CUSTOMERS },
      ],
    },
    {
      label: "Loans",
      icon: <Icon name="Wallet" size={18} />,
      roles: FEATURE_ACCESS.LOANS,
      children: [
        { label: "Loan Dashboard",   path: "/loans",     desc: "Lifecycle management",  roles: FEATURE_ACCESS.LOANS },
        { label: "New Application",  path: "/loans/new", desc: "Start a new loan file", roles: FEATURE_ACCESS.LOANS },
      ],
    },
    {
      label: "Tools",
      icon: <Icon name="Wrench" size={18} />,
      roles: FEATURE_ACCESS.TOOLS,
      children: [
        { label: "EMI Calculator",     path: "/loans/emi-calculator", desc: "Calculate loan EMI",       roles: FEATURE_ACCESS.TOOLS },
        { label: "Quotations",         path: "/loans/quotations",     desc: "Manage vehicle quotes",    roles: FEATURE_ACCESS.TOOLS },
        { label: "Features Catalog",   path: "/loans/features",       desc: "Compare variant features", roles: FEATURE_ACCESS.TOOLS },
        { label: "Vehicle Price List", path: "/vehicles/price-list",  desc: "Browse pricing catalog",   roles: FEATURE_ACCESS.TOOLS },
      ],
    },
    {
      label: "Finance",
      icon: <Icon name="Coins" size={18} />,
      roles: [...new Set([...FEATURE_ACCESS.PAYOUTS, ...FEATURE_ACCESS.DELIVERY_ORDERS, ...FEATURE_ACCESS.PAYMENTS])],
      children: [
        { label: "Receivables",     path: "/payouts/receivables", desc: "Track incoming funds",   roles: FEATURE_ACCESS.PAYOUTS },
        { label: "Delivery Orders", path: "/delivery-orders",     desc: "Manage DO dispatch",     roles: FEATURE_ACCESS.DELIVERY_ORDERS },
        { label: "Payments",        path: "/payments",            desc: "Process installments",   roles: FEATURE_ACCESS.PAYMENTS },
      ],
    },
    {
      label: "Control Panel",
      icon: <Icon name="ShieldCheck" size={18} />,
      roles: FEATURE_ACCESS.SUPERADMIN_USERS,
      children: [
        { label: "User Management", path: "/superadmin/users",     desc: "Manage user roles & access", roles: FEATURE_ACCESS.SUPERADMIN_USERS },
        { label: "Showrooms",       path: "/superadmin/showrooms", desc: "Manage all showrooms",       roles: FEATURE_ACCESS.SUPERADMIN_SHOWROOMS },
        { label: "Channels",        path: "/superadmin/channels",  desc: "Manage partner channels",    roles: FEATURE_ACCESS.SUPERADMIN_CHANNELS },
        { label: "Banks",           path: "/superadmin/banks",     desc: "Configure finance partners", roles: FEATURE_ACCESS.SUPERADMIN_BANKS },
      ],
    },
  ];

  // Filter navigation: hide groups/items the current user cannot access
  const navigationGroups = allNavigationGroups
    .filter((group) => canAccess(group.roles))
    .map((group) => {
      if (!group.children) return group;
      const visibleChildren = group.children.filter((child) => canAccess(child.roles));
      if (visibleChildren.length === 0) return null;
      return { ...group, children: visibleChildren };
    })
    .filter(Boolean);

  const isActive = (path) => location?.pathname === path;
  const isGroupActive = (children) => children?.some((child) => isActive(child.path));

  const groupAccent = (label) => {
    const map = {
      Analytics:       { icon: "bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-700 dark:from-sky-500/20 dark:to-indigo-500/20 dark:text-sky-300",     dot: "bg-sky-500 dark:bg-sky-400"     },
      Customers:       { icon: "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-500/20 dark:to-teal-500/20 dark:text-emerald-300", dot: "bg-emerald-500 dark:bg-emerald-400" },
      Loans:           { icon: "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 dark:from-violet-500/20 dark:to-fuchsia-500/20 dark:text-violet-300", dot: "bg-violet-500 dark:bg-violet-400" },
      Tools:           { icon: "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 dark:from-amber-500/20 dark:to-orange-500/20 dark:text-amber-300", dot: "bg-amber-500 dark:bg-amber-400"   },
      Finance:         { icon: "bg-gradient-to-br from-cyan-100 to-blue-100 text-cyan-700 dark:from-cyan-500/20 dark:to-blue-500/20 dark:text-cyan-300",         dot: "bg-cyan-500 dark:bg-cyan-400"     },
      "Control Panel": { icon: "bg-gradient-to-br from-slate-200 to-slate-100 text-slate-700 dark:from-slate-500/20 dark:to-slate-400/20 dark:text-slate-300",   dot: "bg-slate-500 dark:bg-slate-300"   },
    };
    return map[label] || { icon: "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 dark:from-slate-500/20 dark:to-slate-400/20 dark:text-slate-300", dot: "bg-sky-500 dark:bg-sky-400" };
  };

  const handleNavigation = (path) => {
    if (path === "/loans/new") {
      startNewLoanCase(navigate, "global-header");
      setMobileMenuOpen(false);
      return;
    }
    navigate(path);
    setMobileMenuOpen(false);
    setProfileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-[1000] py-0">
        <div className="app-max-wrap w-full">
          <div
            className="relative flex h-12 items-center gap-2 rounded-2xl bg-white dark:bg-black px-2 md:h-14 md:px-3 xl:h-16 xl:gap-3 xl:px-4 shadow-[0_12px_26px_-20px_rgba(15,23,42,0.45)]"
          >
            {/* Brand Logo */}
            <button
              type="button"
              className="relative z-[1] group flex items-center rounded-xl bg-transparent px-1 py-0.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-white/10"
              onClick={() => handleNavigation("/")}
            >
              <img
                src={process.env.PUBLIC_URL + "/acillp-logo-without-car.svg"}
                alt="ACILLP"
                className="h-7 w-auto object-contain transition-transform duration-300 group-hover:scale-105 md:h-8 xl:h-11"
              />
            </button>

            {/* Center: Desktop Navigation */}
            <nav className="relative z-[1] hidden lg:flex flex-1 items-center gap-1 rounded-xl bg-white/70 px-1.5 py-1 dark:bg-black/80 xl:px-2 xl:py-1.5">
              {navigationGroups.map((group) => (
                <div key={group.label} className="relative group/nav">
                  {(() => {
                    const accent = groupAccent(group.label);
                    return group.children ? (
                      <>
                        <button
                          className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[12px] font-semibold transition-colors duration-200 outline-none xl:h-10 xl:px-3.5 xl:text-[13px] ${
                            isGroupActive(group.children)
                              ? "bg-white text-slate-900 shadow-sm dark:bg-white/[0.14] dark:text-white"
                              : "text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
                          }`}
                        >
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${accent.icon}`}>
                            {group.icon}
                          </span>
                          {group.label}
                          <ChevronDown size={14} className="opacity-60 transition-transform duration-300 group-hover/nav:rotate-180" />
                        </button>

                        {/* Dropdown */}
                        <div className="absolute left-1/2 top-full z-50 w-[320px] -translate-x-1/2 translate-y-2 pt-3 opacity-0 invisible transition-[opacity,transform,visibility] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/nav:translate-y-0 group-hover/nav:opacity-100 group-hover/nav:visible">
                          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xl ring-1 ring-black/5 dark:border-slate-800 dark:bg-black">
                            <div className="mb-2 flex items-center justify-between border-b border-slate-200/80 px-3 pb-2 dark:border-slate-800">
                              <span className="text-[11px] font-semibold tracking-tight text-slate-500 dark:text-slate-400">
                                {group.label}
                              </span>
                              <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
                            </div>
                            {group.children.map((child) => (
                              <button
                                key={child.path}
                                onClick={() => handleNavigation(child.path)}
                                className={`group/item mb-1 w-full rounded-xl px-4 py-3 text-left transition-colors duration-150 last:mb-0 ${
                                  isActive(child.path)
                                    ? "bg-sky-50 text-sky-700 dark:bg-slate-900 dark:text-sky-300"
                                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900/80"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[13px] font-bold tracking-tight">{child.label}</span>
                                  <span className={`h-1.5 w-1.5 rounded-full ${accent.dot} transition-all ${isActive(child.path) ? "opacity-100" : "opacity-0 group-hover/item:opacity-45"}`} />
                                </div>
                                <span className="mt-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">{child.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => handleNavigation(group.path)}
                        className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[12px] font-semibold transition-colors duration-200 xl:h-10 xl:px-3.5 xl:text-[13px] ${
                          isActive(group.path)
                            ? "bg-white text-slate-900 shadow-sm dark:bg-white/[0.14] dark:text-white"
                            : "text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
                        }`}
                      >
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${accent.icon}`}>
                          {group.icon}
                        </span>
                        {group.label}
                      </button>
                    );
                  })()}
                </div>
              ))}
            </nav>

            {/* Right: Actions */}
            <div className="relative z-[1] ml-auto flex items-center gap-1.5 sm:gap-3">
              {/* Notification bell */}
              <div className="relative hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-emerald-100 text-slate-600 transition-colors hover:from-sky-200 hover:to-emerald-200 hover:text-slate-900 dark:from-sky-500/20 dark:to-emerald-500/20 dark:text-slate-200 dark:hover:from-sky-500/30 dark:hover:to-emerald-500/30 xl:h-10 xl:w-10">
                <AntBadge dot color="#1d9bf0" offset={[-1, 2]}>
                  <Bell size={18} />
                </AntBadge>
              </div>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className={`hidden h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 sm:flex ${
                  isDarkMode
                    ? "bg-white/[0.08] text-amber-300 hover:bg-white/[0.14]"
                    : "bg-gradient-to-br from-violet-100 to-indigo-100 text-indigo-700 hover:from-violet-200 hover:to-indigo-200"
                }`}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Profile Dropdown — custom */}
              <div className="relative hidden sm:block" data-profile-menu>
                {/* Trigger button */}
                <button
                  type="button"
                  onClick={() => setProfileOpen((o) => !o)}
                  className="group/profile flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-slate-100 to-slate-50 px-1.5 pr-2.5 transition-colors hover:from-slate-200 hover:to-slate-100 dark:from-white/[0.08] dark:to-white/[0.04] dark:hover:from-white/[0.12] dark:hover:to-white/[0.08]"
                >
                  <div className="relative">
                    <UserAvatar name={userData?.name} size={30} />
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-black" />
                  </div>
                  <ChevronDown
                    size={13}
                    className={`hidden text-muted-foreground transition-transform duration-200 group-hover/profile:text-foreground sm:block ${profileOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown panel */}
                {profileOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2.5 w-72 origin-top-right">
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-800 dark:bg-[#0a0a0a]">
                      {/* User identity block */}
                      <div className="flex items-start gap-3.5 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="relative mt-0.5 flex-shrink-0">
                          <UserAvatar name={userData?.name} size={44} />
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-[#0a0a0a]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-black text-slate-900 dark:text-white">
                            {userData?.name || "Administrator"}
                          </p>
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {userData?.email || "—"}
                          </p>
                          <span className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${roleMeta.color}`}>
                            {roleMeta.label}
                          </span>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div className="p-1.5">
                        <button
                          onClick={() => handleNavigation("/profile")}
                          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          <UserCircle2 size={16} className="text-slate-400 dark:text-slate-500" />
                          My Profile
                        </button>
                        <button
                          onClick={() => handleNavigation("/settings")}
                          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          <Settings size={16} className="text-slate-400 dark:text-slate-500" />
                          Settings
                        </button>
                      </div>

                      <div className="mx-3 border-t border-slate-100 dark:border-slate-800" />

                      <div className="p-1.5">
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-bold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Trigger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-100 to-blue-100 text-slate-700 transition-all hover:from-cyan-200 hover:to-blue-200 hover:text-sky-600 active:scale-95 dark:from-white/[0.08] dark:to-white/[0.04] dark:text-slate-100 dark:hover:from-white/[0.14] dark:hover:to-white/[0.08] dark:hover:text-sky-300 md:h-10 md:w-10 lg:hidden"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Navigation */}
      <div
        className={`fixed inset-0 z-[2000] lg:hidden transition-all duration-500 ease-in-out ${
          mobileMenuOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-500 ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Sidebar Content */}
        <div
          className={`absolute top-0 right-0 bottom-0 w-full max-w-[340px] bg-white dark:bg-black shadow-[0_0_50px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full bg-gradient-to-b from-white to-muted/20 dark:from-black dark:to-zinc-900/50">
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-border/50">
              <div className="rounded-lg px-2 py-1">
                <img
                  src={process.env.PUBLIC_URL + "/acillp-logo-without-car.svg"}
                  alt="ACILLP"
                  className="h-12 w-auto object-contain"
                />
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* Navigation Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-2">
                {navigationGroups.map((group, idx) => (
                  <div key={idx} className="space-y-1">
                    {group.children ? (
                      <div>
                        <div className="px-4 py-3 flex items-center gap-3 text-muted-foreground">
                          <span className="opacity-50">{group.icon}</span>
                          <span className="text-xs font-black uppercase tracking-[0.2em]">{group.label}</span>
                        </div>
                        <div className="space-y-1 ml-4 pl-4 border-l-2 border-border/40">
                          {group.children.map((child) => (
                            <button
                              key={child.path}
                              onClick={() => handleNavigation(child.path)}
                              className={`w-full text-left flex flex-col py-3 px-4 rounded-xl transition-all duration-200 ${
                                isActive(child.path)
                                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                  : "text-foreground hover:bg-muted"
                              }`}
                            >
                              <span className="text-sm font-bold tracking-tight">{child.label}</span>
                              {!isActive(child.path) && (
                                <span className="text-[10px] text-muted-foreground font-medium opacity-60 mt-1 uppercase tracking-wider">
                                  {child.desc?.split(" ").slice(0, 2).join(" ")}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleNavigation(group.path)}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 font-bold ${
                          isActive(group.path)
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className={`opacity-60 ${isActive(group.path) ? "text-white" : ""}`}>
                          {group.icon}
                        </span>
                        <span className="text-sm tracking-tight">{group.label}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer / User Info */}
            <div className="p-5 border-t border-border/50 bg-white dark:bg-black/50">
              {/* User card */}
              <div className="flex items-center gap-3.5 mb-4 rounded-xl bg-muted/40 px-4 py-3 dark:bg-white/[0.05]">
                <div className="relative flex-shrink-0">
                  <UserAvatar name={userData?.name} size={44} />
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-black" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-foreground">
                    {userData?.name || "Staff User"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                    {userData?.email || "—"}
                  </p>
                  <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${roleMeta.color}`}>
                    {roleMeta.label}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleNavigation("/profile")}
                  className="flex flex-col items-center justify-center gap-1 h-12 rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-colors"
                >
                  <UserCircle2 size={16} className="opacity-60" />
                  <span className="text-[10px] font-bold opacity-70">Profile</span>
                </button>
                <button
                  onClick={toggleTheme}
                  className="flex flex-col items-center justify-center gap-1 h-12 rounded-xl bg-muted text-foreground hover:text-primary transition-colors"
                >
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                  <span className="text-[10px] font-bold opacity-70">{isDarkMode ? "Light" : "Dark"}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex flex-col items-center justify-center gap-1 h-12 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all"
                >
                  <LogOut size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wide">Quit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
