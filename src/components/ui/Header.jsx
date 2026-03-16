import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  ChevronDown,
  User,
  Sun,
  Moon,
  LogOut,
  Settings,
  Bell,
} from "lucide-react";
import Icon from "../AppIcon";
import { Dropdown, Avatar, Badge as AntBadge } from "antd";
import { useTheme } from "../../context/ThemeContext";
import { startNewLoanCase } from "../../modules/loans/utils/startNewLoanCase";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  // Handle scroll effect for glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Determine if user is superadmin
  let isSuperadmin = false;
  let userData = null;
  try {
    userData = JSON.parse(localStorage.getItem("user"));
    isSuperadmin = userData?.role === "superadmin";
  } catch {}

  const navigationGroups = [
    {
      label: "Analytics",
      path: "/analytics",
      icon: <Icon name="BarChart3" size={18} />,
    },
    {
      label: "Customers",
      icon: <Icon name="Users" size={18} />,
      children: [
        {
          label: "Dashboard",
          path: "/customers",
          desc: "View all customer records",
        },
        {
          label: "New Registration",
          path: "/customers/new",
          desc: "Register a new client",
        },
      ],
    },
    {
      label: "Loans",
      icon: <Icon name="Wallet" size={18} />,
      path: "/loans",
      children: [
        {
          label: "Loan Dashboard",
          path: "/loans",
          desc: "Lifecycle management",
        },
        {
          label: "New Application",
          path: "/loans/new",
          desc: "Start a new loan file",
        },
        {
          label: "EMI Calculator",
          path: "/loans/emi-calculator",
          desc: "Calculate loan EMI",
        },
        {
          label: "Quotation manager",
          path: "/loans/quotations",
          desc: "Saved loan quotations",
        }, // ← add this line
        {
          label: "Variant Features", // ← new
          path: "/loans/features", // ← points to FeaturesPage
          desc: "Compare variant features", // short description
        },
      ],
    },
    {
      label: "Vehicles",
      icon: <Icon name="Car" size={18} />,
      children: [
        {
          label: "Vehicle Inventory",
          path: "/vehicles",
          desc: "Master vehicle records",
        },
        {
          label: "Vehicle Price List",
          path: "/vehicles/price-list",
          desc: "Browse pricing catalog",
        },
      ],
    },
    {
      label: "Finance",
      icon: <Icon name="Coins" size={18} />,
      children: [
        {
          label: "Receivables",
          path: "/payouts/receivables",
          desc: "Track incoming funds",
        },
        {
          label: "Payables",
          path: "/payouts/payables",
          desc: "Track outgoing payouts",
        },
        {
          label: "Delivery Orders",
          path: "/delivery-orders",
          desc: "Manage DO dispatch",
        },
        { label: "Payments", path: "/payments", desc: "Process installments" },
      ],
    },
    ...(isSuperadmin
      ? [
          {
            label: "Control Panel",
            path: "/superadmin/users",
            icon: <Icon name="ShieldCheck" size={18} />,
          },
        ]
      : []),
  ];

  const isActive = (path) => location?.pathname === path;
  const isGroupActive = (children) =>
    children?.some((child) => isActive(child.path));

  const groupAccent = (label) => {
    const map = {
      Analytics: {
        icon: "bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-700 dark:from-sky-500/20 dark:to-indigo-500/20 dark:text-sky-300",
        dot: "bg-sky-500 dark:bg-sky-400",
      },
      Customers: {
        icon: "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-500/20 dark:to-teal-500/20 dark:text-emerald-300",
        dot: "bg-emerald-500 dark:bg-emerald-400",
      },
      Loans: {
        icon: "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 dark:from-violet-500/20 dark:to-fuchsia-500/20 dark:text-violet-300",
        dot: "bg-violet-500 dark:bg-violet-400",
      },
      Vehicles: {
        icon: "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 dark:from-amber-500/20 dark:to-orange-500/20 dark:text-amber-300",
        dot: "bg-amber-500 dark:bg-amber-400",
      },
      Finance: {
        icon: "bg-gradient-to-br from-cyan-100 to-blue-100 text-cyan-700 dark:from-cyan-500/20 dark:to-blue-500/20 dark:text-cyan-300",
        dot: "bg-cyan-500 dark:bg-cyan-400",
      },
      "Control Panel": {
        icon: "bg-gradient-to-br from-slate-200 to-slate-100 text-slate-700 dark:from-slate-500/20 dark:to-slate-400/20 dark:text-slate-300",
        dot: "bg-slate-500 dark:bg-slate-300",
      },
    };
    return (
      map[label] || {
        icon: "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 dark:from-slate-500/20 dark:to-slate-400/20 dark:text-slate-300",
        dot: "bg-sky-500 dark:bg-sky-400",
      }
    );
  };

  const handleNavigation = (path) => {
    if (path === "/loans/new") {
      startNewLoanCase(navigate, "global-header");
      setMobileMenuOpen(false);
      return;
    }
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-[1000] py-0">
        <div className="app-max-wrap w-full">
          <div
            className={`relative flex h-14 items-center gap-2.5 rounded-2xl px-2.5 md:px-3 xl:h-16 xl:gap-3 xl:px-4 shadow-[0_12px_26px_-20px_rgba(15,23,42,0.45)] transition-colors duration-300 ${
              scrolled
                ? "bg-white/86 dark:bg-black/96 backdrop-blur-xl"
                : "bg-white/95 dark:bg-black"
            }`}
          >
            {/* Brand Logo */}
            <button
              type="button"
              className="relative z-[1] group flex items-center rounded-xl bg-transparent px-1.5 py-0.5 transition-colors hover:bg-slate-100/80 dark:bg-white dark:hover:bg-white"
              onClick={() => handleNavigation("/")}
            >
              <img
                src={process.env.PUBLIC_URL + "/acillp-logo-without-car.svg"}
                alt="ACILLP"
                className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105 xl:h-11"
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
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${
                              accent.icon
                            }`}
                          >
                            {group.icon}
                          </span>
                          {group.label}
                          <ChevronDown
                            size={14}
                            className="opacity-60 transition-transform duration-300 group-hover/nav:rotate-180"
                          />
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
                                  <span className="text-[13px] font-bold tracking-tight">
                                    {child.label}
                                  </span>
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${accent.dot} transition-all ${
                                      isActive(child.path)
                                        ? "opacity-100"
                                        : "opacity-0 group-hover/item:opacity-45"
                                    }`}
                                  />
                                </div>
                                <span className="mt-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                  {child.desc}
                                </span>
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
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${
                            accent.icon
                          }`}
                        >
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
            <div className="relative z-[1] flex items-center gap-2 sm:gap-3">
              <div className="relative hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-emerald-100 text-slate-600 transition-colors hover:from-sky-200 hover:to-emerald-200 hover:text-slate-900 dark:from-sky-500/20 dark:to-emerald-500/20 dark:text-slate-200 dark:hover:from-sky-500/30 dark:hover:to-emerald-500/30 xl:h-10 xl:w-10">
                <AntBadge dot color="#1d9bf0" offset={[-1, 2]}>
                  <Bell size={18} />
                </AntBadge>
              </div>

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

              {/* Profile Dropdown */}
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "user-info",
                      label: (
                        <div className="px-4 py-3 min-w-[200px] border-b border-border/40 mb-2">
                          <div className="text-[13px] font-black text-foreground uppercase tracking-tight">
                            {userData?.name || "Administrator"}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-medium">
                            {userData?.email || "system@acillp.com"}
                          </div>
                          <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider">
                            {userData?.role || "Staff"} Access
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "settings",
                      label: (
                        <div className="flex items-center gap-3 px-1 py-1 font-semibold text-[13px]">
                          <Settings size={16} className="opacity-60" />
                          Settings
                        </div>
                      ),
                    },
                    { type: "divider" },
                    {
                      key: "logout",
                      danger: true,
                      label: (
                        <div className="flex items-center gap-3 px-1 py-1 font-bold text-[13px]">
                          <LogOut size={16} />
                          Sign Out
                        </div>
                      ),
                    },
                  ],
                  onClick: ({ key }) => {
                    if (key === "logout") {
                      localStorage.clear();
                      navigate("/login");
                    }
                  },
                }}
                trigger={["click"]}
                placement="bottomRight"
                overlayClassName="header-profile-dropdown"
              >
                <button
                  type="button"
                  className="group/profile flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-slate-100 to-slate-50 px-1.5 pr-2.5 transition-colors hover:from-slate-200 hover:to-slate-100 dark:from-white/[0.08] dark:to-white/[0.04] dark:hover:from-white/[0.12] dark:hover:to-white/[0.08]"
                >
                  <div className="relative">
                    <Avatar
                      className="bg-primary text-primary-foreground transition-all duration-300 shadow-sm"
                      size={30}
                      icon={<User size={16} />}
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-success dark:border-black" />
                  </div>
                  <ChevronDown
                    size={13}
                    className="hidden text-muted-foreground transition-colors group-hover/profile:text-foreground sm:block"
                  />
                </button>
              </Dropdown>

              {/* Mobile Menu Trigger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-100 to-blue-100 text-slate-700 transition-all hover:from-cyan-200 hover:to-blue-200 hover:text-sky-600 active:scale-95 dark:from-white/[0.08] dark:to-white/[0.04] dark:text-slate-100 dark:hover:from-white/[0.14] dark:hover:to-white/[0.08] dark:hover:text-sky-300 lg:hidden"
              >
                <Menu size={22} />
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
          className={`absolute top-0 right-0 bottom-0 w-[300px] bg-white dark:bg-black shadow-[0_0_50px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full bg-gradient-to-b from-white to-muted/20 dark:from-black dark:to-zinc-900/50">
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-border/50">
              <div className="rounded-lg px-2 py-1 dark:bg-white">
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
                          <span className="text-xs font-black uppercase tracking-[0.2em]">
                            {group.label}
                          </span>
                        </div>
                        <div className="space-y-1 ml-4 pl-4 border-l-2 border-border/40">
                          {group.children.map((child) => (
                            <button
                              key={child.path}
                              onClick={() => handleNavigation(child.path)}
                              className={`w-full text-left flex flex-col py-3 px-4 rounded-xl transition-all duration-200
                                ${
                                  isActive(child.path)
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "text-foreground hover:bg-muted"
                                }
                              `}
                            >
                              <span className="text-sm font-bold tracking-tight">
                                {child.label}
                              </span>
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
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 font-bold
                          ${
                            isActive(group.path)
                              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                              : "text-foreground hover:bg-muted"
                          }
                        `}
                      >
                        <span
                          className={`opacity-60 ${isActive(group.path) ? "text-white" : ""}`}
                        >
                          {group.icon}
                        </span>
                        <span className="text-sm tracking-tight">
                          {group.label}
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer / User Info */}
            <div className="p-6 border-t border-border/50 bg-white dark:bg-black/50">
              <div className="flex items-center gap-4 mb-6 px-1">
                <Avatar
                  className="bg-primary text-primary-foreground ring-4 ring-primary/10"
                  size={48}
                  icon={<User size={24} />}
                />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-black text-foreground truncate">
                    {userData?.name || "Staff User"}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium truncate opacity-70">
                    Control Panel Operator
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl bg-muted text-foreground hover:text-primary transition-colors text-xs font-bold"
                >
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                  {isDarkMode ? "Light" : "Dark"}
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    navigate("/login");
                  }}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all text-xs font-black uppercase tracking-wider"
                >
                  <LogOut size={16} />
                  Quit
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
