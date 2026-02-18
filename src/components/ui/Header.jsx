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

  const handleNavigation = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-[1000] w-full transition-all duration-500 will-change-[background-color,backdrop-filter,border-color] ${
          scrolled
            ? "h-16 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
            : "h-16 bg-white dark:bg-black border-b border-transparent"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-full flex items-center justify-between">
          {/* Brand Logo */}
          <div
            className="flex items-center group cursor-pointer shrink-0"
            onClick={() => handleNavigation("/")}
          >
            <div
              className={`relative transition-all duration-500 will-change-transform group-hover:scale-105 ${scrolled ? "h-9" : "h-10"}`}
            >
              <img
                src={process.env.PUBLIC_URL + "/ACILLP.svg"}
                alt="ACILLP"
                className="h-full w-auto object-contain logo-theme-aware"
              />
            </div>
          </div>

          {/* Center: Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navigationGroups.map((group) => (
              <div key={group.label} className="relative group/nav">
                {group.children ? (
                  <>
                    <button
                      className={`flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-full transition-all duration-300 h-10 outline-none
                        ${
                          isGroupActive(group.children)
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
                      <span className="opacity-70 group-hover/nav:opacity-100 transition-opacity">
                        {group.icon}
                      </span>
                      {group.label}
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-300 group-hover/nav:rotate-180 opacity-50`}
                      />
                    </button>

                    {/* Mega Menu style Dropdown */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 opacity-0 invisible translate-y-2 group-hover/nav:opacity-100 group-hover/nav:visible group-hover/nav:translate-y-0 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] z-50">
                      <div className="w-[280px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-border/50 p-2 overflow-hidden ring-1 ring-black/5">
                        <div className="px-3 py-2 border-b border-border/40 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            {group.label} Operations
                          </span>
                        </div>
                        {group.children.map((child) => (
                          <button
                            key={child.path}
                            onClick={() => handleNavigation(child.path)}
                            className={`w-full text-left flex flex-col px-4 py-3 rounded-xl transition-all duration-200 group/item
                              ${
                                isActive(child.path)
                                  ? "bg-primary/5 text-primary"
                                  : "text-foreground hover:bg-muted"
                              }
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold tracking-tight">
                                {child.label}
                              </span>
                              <div
                                className={`w-1.5 h-1.5 rounded-full bg-primary transition-all duration-300 ${isActive(child.path) ? "opacity-100 scale-100" : "opacity-0 scale-0 group-hover/item:opacity-40 group-hover/item:scale-100"}`}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium mt-0.5 opacity-70 group-hover/item:opacity-100 transition-opacity">
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
                    className={`flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-full transition-all duration-300 h-10 outline-none
                      ${
                        isActive(group.path)
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }
                    `}
                  >
                    <span className="opacity-70 group-hover/nav:opacity-100 transition-opacity">
                      {group.icon}
                    </span>
                    {group.label}
                  </button>
                )}
              </div>
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Notifications (Visual Placeholder) */}
            <div className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full hover:bg-muted cursor-pointer transition-colors text-muted-foreground hover:text-foreground relative">
              <AntBadge dot color="#1d9bf0" offset={[-2, 2]}>
                <Bell size={20} />
              </AntBadge>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`hidden sm:flex items-center justify-center w-10 h-10 rounded-full transition-all duration-500 hover:scale-110 active:scale-90
                ${
                  isDarkMode
                    ? "bg-zinc-800 text-yellow-400 hover:bg-zinc-700"
                    : "bg-zinc-100 text-blue-600 hover:bg-zinc-200"
                }
              `}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="w-px h-6 bg-border/60 mx-1 hidden sm:block" />

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
              <div className="flex items-center gap-2 cursor-pointer group/profile rounded-full pr-2 transition-all duration-300">
                <div className="relative">
                  <Avatar
                    className="bg-primary text-primary-foreground border-2 border-transparent group-hover/profile:border-primary/30 transition-all duration-300 shadow-sm"
                    size={36}
                    icon={<User size={18} />}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-white dark:border-black" />
                </div>
                <ChevronDown
                  size={14}
                  className="text-muted-foreground group-hover/profile:text-foreground transition-colors hidden sm:block"
                />
              </div>
            </Dropdown>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-muted text-foreground hover:text-primary transition-all active:scale-95"
            >
              <Menu size={24} />
            </button>
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
              <img
                src={process.env.PUBLIC_URL + "/ACILLP.svg"}
                alt="ACILLP"
                className="h-10 w-auto logo-theme-aware"
              />
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
