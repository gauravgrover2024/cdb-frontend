import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  Settings,
  UserCircle2,
} from "lucide-react";
import { Modal, message } from "antd";
import Icon from "../AppIcon";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { FEATURE_ACCESS } from "../../hooks/useRBAC";
import { startNewLoanCase } from "../../modules/loans/utils/startNewLoanCase";
import PayoutSetupModal from "../payout/PayoutSetupModal";
import { openNewCaseConfirmation } from "./NewCaseConfirmation";
import { showUnsavedChangesModal } from "./UnsavedChangesModal";

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
  superadmin: {
    label: "Superadmin",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  admin: {
    label: "Admin",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  },
  staff: {
    label: "Staff",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  user: {
    label: "User",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  demo: {
    label: "Demo",
    color:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  },
};

// Initials avatar — used in header button and mobile footer
const UserAvatar = ({ name, photoUrl, size = 32 }) => {
  const [imgBroken, setImgBroken] = useState(false);
  const hue = nameToHue(name);
  const initials = getInitials(name);
  const showPhoto = Boolean(photoUrl) && !imgBroken;

  return showPhoto ? (
    <img
      src={photoUrl}
      alt={name || "User"}
      onError={() => setImgBroken(true)}
      className="flex-shrink-0 rounded-full object-cover shadow-sm select-none"
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
    />
  ) : (
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
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const { isDarkMode } = useTheme();
  const { user: userData, logout } = useAuth();

  const roleMeta = ROLE_META[userData?.role] || ROLE_META.staff;

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    // Ensure stale toast/modal UI does not survive route refreshes.
    Modal.destroyAll();
    message.destroy();
  }, []);

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
      label: "ACI Assist",
      path: "/aci-assist",
      icon: <Icon name="Sparkles" size={18} />,
      roles: FEATURE_ACCESS.ANALYTICS,
    },
    {
      label: "Insurance",
      icon: <Icon name="Shield" size={18} />,
      roles: FEATURE_ACCESS.INSURANCE,
      children: [
        {
          label: "Dashboard",
          path: "/insurance",
          desc: "View all insurance cases",
          roles: FEATURE_ACCESS.INSURANCE,
        },
        {
          label: "New Case",
          path: "/insurance/new",
          desc: "Create a new insurance case",
          roles: FEATURE_ACCESS.INSURANCE,
        },
        {
          label: "Renewal Cases",
          path: "/insurance/renewals",
          desc: "Assign and track pending renewals",
          roles: FEATURE_ACCESS.INSURANCE,
        },
      ],
    },
    {
      label: "Customers",
      icon: <Icon name="Users" size={18} />,
      roles: FEATURE_ACCESS.CUSTOMERS,
      children: [
        {
          label: "Dashboard",
          path: "/customers",
          desc: "View all customer records",
          roles: FEATURE_ACCESS.CUSTOMERS,
        },
        {
          label: "New Registration",
          path: "/customers/new",
          desc: "Register a new client",
          roles: FEATURE_ACCESS.CUSTOMERS,
        },
      ],
    },
    {
      label: "Loans",
      icon: <Icon name="Wallet" size={18} />,
      roles: FEATURE_ACCESS.LOANS,
      children: [
        {
          label: "Loan Dashboard",
          path: "/loans",
          desc: "Lifecycle management",
          roles: FEATURE_ACCESS.LOANS,
        },
        {
          label: "New Application",
          path: "/loans/new",
          desc: "Start a new loan file",
          roles: FEATURE_ACCESS.LOANS,
        },
      ],
    },
    {
      label: "Finance",
      icon: <Icon name="Coins" size={18} />,
      roles: [
        ...new Set([
          ...FEATURE_ACCESS.PAYOUTS,
          ...FEATURE_ACCESS.DELIVERY_ORDERS,
          ...FEATURE_ACCESS.PAYMENTS,
        ]),
      ],
      children: [
        {
          label: "Receivables",
          path: "/payouts/receivables",
          desc: "Track incoming funds",
          roles: FEATURE_ACCESS.PAYOUTS,
        },
        {
          label: "Payables",
          path: "/payouts/payables",
          desc: "Track outgoing funds",
          roles: FEATURE_ACCESS.PAYOUTS,
        },
        {
          label: "Delivery Orders",
          path: "/delivery-orders",
          desc: "Manage DO dispatch",
          roles: FEATURE_ACCESS.DELIVERY_ORDERS,
        },
        {
          label: "Payments",
          path: "/payments",
          desc: "Process installments",
          roles: FEATURE_ACCESS.PAYMENTS,
        },
        {
          label: "Bookings",
          path: "/bookings",
          desc: "Manage vehicle bookings",
          roles: FEATURE_ACCESS.PAYMENTS,
        },
      ],
    },
    {
      label: "Tools",
      icon: <Icon name="Wrench" size={18} />,
      roles: FEATURE_ACCESS.TOOLS,
      children: [
        {
          label: "Fleet Master",
          path: "/fleet-vehicles",
          desc: "Manage fleet and assignments",
          roles: FEATURE_ACCESS.TOOLS,
        },
        {
          label: "EMI Calculator",
          path: "/loans/emi-calculator",
          desc: "Calculate loan EMI",
          roles: FEATURE_ACCESS.TOOLS,
        },
        {
          label: "Quotations",
          path: "/loans/quotations",
          desc: "Manage vehicle quotes",
          roles: FEATURE_ACCESS.TOOLS,
        },
        {
          label: "Features Catalog",
          path: "/loans/features",
          desc: "Compare variant features",
          roles: FEATURE_ACCESS.TOOLS,
        },
        {
          label: "Vehicle Price List",
          path: "/vehicles/price-list",
          desc: "Browse pricing catalog",
          roles: FEATURE_ACCESS.TOOLS,
        },
      ],
    },

    {
      label: "Used Cars",
      icon: <Icon name="CarFront" size={18} />,
      roles: FEATURE_ACCESS.USED_CARS,
      children: [
        {
          label: "Lead Intake",
          path: "/used-cars",
          desc: "Capture seller leads and manage the calling queue",
          roles: FEATURE_ACCESS.USED_CARS,
        },
        {
          label: "Inspection",
          path: "/used-cars/inspection",
          desc: "Run field inspections and generate detailed reports",
          roles: FEATURE_ACCESS.USED_CARS,
        },
      ],
    },
    {
      label: "Control Panel",
      icon: <Icon name="ShieldCheck" size={18} />,
      roles: FEATURE_ACCESS.SUPERADMIN_USERS,
      children: [
        {
          label: "User Management",
          path: "/superadmin/users",
          desc: "Manage user roles & access",
          roles: FEATURE_ACCESS.SUPERADMIN_USERS,
        },
        {
          label: "Showrooms",
          path: "/superadmin/showrooms",
          desc: "Manage all showrooms",
          roles: FEATURE_ACCESS.SUPERADMIN_SHOWROOMS,
        },
        {
          label: "Channels",
          path: "/superadmin/channels",
          desc: "Manage partner channels",
          roles: FEATURE_ACCESS.SUPERADMIN_CHANNELS,
        },
        {
          label: "Banks",
          path: "/superadmin/banks",
          desc: "Configure finance partners",
          roles: FEATURE_ACCESS.SUPERADMIN_BANKS,
        },
        {
          label: "Payout Setup",
          path: "__payout_setup__",
          desc: "Set company wise payout rates",
          roles: FEATURE_ACCESS.SUPERADMIN_BANKS,
        },
      ],
    },
  ];

  // Filter navigation: hide groups/items the current user cannot access
  const navigationGroups = allNavigationGroups
    .filter((group) => canAccess(group.roles))
    .map((group) => {
      if (!group.children) return group;
      const visibleChildren = group.children.filter((child) =>
        canAccess(child.roles),
      );
      if (visibleChildren.length === 0) return null;
      return { ...group, children: visibleChildren };
    })
    .filter(Boolean);

  const isActive = (path) =>
    location?.pathname === path ||
    (path !== "/" && location?.pathname?.startsWith(`${path}/`));
  const isGroupActive = (children) =>
    children?.some((child) => isActive(child.path));

  const groupAccent = (label) => {
    const map = {
      "ACI Assist": {
        icon: "bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-indigo-700 dark:from-indigo-500/20 dark:to-fuchsia-500/20 dark:text-indigo-300",
        dot: "bg-indigo-500 dark:bg-indigo-400",
      },
      Insurance: {
        icon: "bg-gradient-to-br from-cyan-100 to-teal-100 text-cyan-700 dark:from-cyan-500/20 dark:to-teal-500/20 dark:text-cyan-300",
        dot: "bg-cyan-500 dark:bg-cyan-400",
      },
      Customers: {
        icon: "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-500/20 dark:to-teal-500/20 dark:text-emerald-300",
        dot: "bg-emerald-500 dark:bg-emerald-400",
      },
      Loans: {
        icon: "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 dark:from-violet-500/20 dark:to-fuchsia-500/20 dark:text-violet-300",
        dot: "bg-violet-500 dark:bg-violet-400",
      },
      "Used Cars": {
        icon: "bg-gradient-to-br from-emerald-100 to-cyan-100 text-emerald-700 dark:from-emerald-500/20 dark:to-cyan-500/20 dark:text-emerald-300",
        dot: "bg-emerald-500 dark:bg-emerald-400",
      },
      Tools: {
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

  // Returns true if the current page is an insurance create/edit form.
  const isOnInsuranceForm =
    location.pathname === "/insurance/new" ||
    location.pathname.startsWith("/insurance/edit");

  // Shows the unified 3-button unsaved-changes modal when the insurance form
  // has pending edits, then runs `action` on Save or Discard.
  const withInsuranceGuard = (action) => {
    if (isOnInsuranceForm && window.__isInsuranceFormDirty) {
      showUnsavedChangesModal({
        onSave: () => {
          // Ask the mounted form to save first, then execute the action.
          window.dispatchEvent(
            new CustomEvent("SAVE_AND_NAVIGATE_INSURANCE", {
              detail: { afterSave: action },
            }),
          );
        },
        onDiscard: action,
        onCancel: () => {},
      });
      return true; // guarded — caller should not proceed
    }
    return false; // not guarded — caller may proceed
  };

  const handleNavigation = (path) => {
    if (path === "__payout_setup__") {
      setIsPayoutModalOpen(true);
      setMobileMenuOpen(false);
      return;
    }

    // Same page — just close menus, no navigation needed.
    if (path === location.pathname) {
      setMobileMenuOpen(false);
      setProfileOpen(false);
      return;
    }

    // ── Insurance form guard ─────────────────────────────────────────────────
    // Any navigation away from an insurance form page (create or edit) must
    // pass through the unsaved-changes check.
    if (
      withInsuranceGuard(() => {
        navigate(path);
        setMobileMenuOpen(false);
        setProfileOpen(false);
      })
    ) {
      return;
    }

    // ── Loan form guard (existing behaviour) ─────────────────────────────────
    if (path === "/loans/new") {
      const isInLoanForm =
        location.pathname === "/loans/new" ||
        location.pathname.startsWith("/loans/edit");

      if (isInLoanForm) {
        if (window.__isLoanFormDirty === false) {
          startNewLoanCase(navigate, "global-header");
          setMobileMenuOpen(false);
          setProfileOpen(false);
          return;
        }

        openNewCaseConfirmation({
          moduleLabel: "Loan",
          onSaveAndNew: () => {
            window.dispatchEvent(new CustomEvent("SAVE_AND_NEW_LOAN"));
            setMobileMenuOpen(false);
            setProfileOpen(false);
          },
        });
        return;
      }

      startNewLoanCase(navigate, "global-header");
      setMobileMenuOpen(false);
      return;
    }

    navigate(path);
    setMobileMenuOpen(false);
    setProfileOpen(false);
  };

  const handleLogout = () => {
    const doLogout = () => {
      logout();
      navigate("/login");
    };
    if (withInsuranceGuard(doLogout)) return;
    doLogout();
  };

  return (
    <>
      {/* ── DESKTOP HEADER ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-[1000] w-full border-b border-slate-200/70 bg-white/95 backdrop-blur-md dark:border-white/[0.06] dark:bg-zinc-950/95">
        <div className="app-max-wrap w-full">
          <div className="flex h-13 items-center gap-3 px-3 md:h-14 md:px-4 xl:h-[58px] xl:gap-4 xl:px-5">

            {/* ── Logo ── */}
            <button
              type="button"
              onClick={() => handleNavigation("/")}
              className="group mr-1 flex flex-shrink-0 items-center rounded-lg p-1 transition-opacity hover:opacity-80 active:opacity-60"
            >
              <img
                src={isDarkMode ? "/acillp-logo-dark.svg" : "/acillp-logo-without-car.svg"}
                alt="ACILLP"
                className="h-7 w-auto object-contain md:h-8 xl:h-9"
              />
            </button>

            {/* ── Desktop Nav ── */}
            <nav className="hidden flex-1 items-center gap-0.5 lg:flex">
              {navigationGroups.map((group) => {
                const accent = groupAccent(group.label);
                const groupActive = group.children
                  ? isGroupActive(group.children)
                  : isActive(group.path);

                return (
                  <div key={group.label} className="relative group/nav">
                    {group.children ? (
                      <>
                        {/* Nav trigger */}
                        <button
                          className={[
                            "flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold tracking-tight outline-none transition-all duration-150 xl:px-3.5 xl:text-[13px]",
                            groupActive
                              ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white"
                              : "text-slate-500 hover:bg-slate-100/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-slate-100",
                          ].join(" ")}
                        >
                          <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[13px] ${accent.icon}`}>
                            {group.icon}
                          </span>
                          {group.label}
                          <ChevronDown
                            size={12}
                            className={[
                              "ml-0.5 flex-shrink-0 transition-transform duration-200",
                              groupActive ? "opacity-70" : "opacity-40",
                              "group-hover/nav:rotate-180",
                            ].join(" ")}
                          />
                        </button>

                        {/* Dropdown */}
                        <div className="invisible absolute left-1/2 top-full z-50 w-[300px] -translate-x-1/2 translate-y-1.5 pt-2 opacity-0 transition-[opacity,transform,visibility] duration-200 ease-out group-hover/nav:visible group-hover/nav:translate-y-0 group-hover/nav:opacity-100">
                          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/[0.08] dark:border-slate-800 dark:bg-zinc-900">
                            {/* Dropdown header */}
                            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                              <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[12px] ${accent.icon}`}>
                                {group.icon}
                              </span>
                              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                {group.label}
                              </span>
                              <span className={`ml-auto h-1.5 w-1.5 rounded-full ${accent.dot}`} />
                            </div>
                            {/* Dropdown items */}
                            <div className="p-1.5">
                              {group.children.map((child) => {
                                const childActive = isActive(child.path);
                                return (
                                  <button
                                    key={child.path}
                                    onClick={() => handleNavigation(child.path)}
                                    className={[
                                      "group/item flex w-full items-start gap-3 rounded-lg px-3.5 py-2.5 text-left transition-colors duration-100",
                                      childActive
                                        ? "bg-slate-50 dark:bg-white/[0.06]"
                                        : "hover:bg-slate-50 dark:hover:bg-white/[0.04]",
                                    ].join(" ")}
                                  >
                                    <span className={`mt-0.5 flex-shrink-0 h-1.5 w-1.5 rounded-full ${accent.dot} transition-opacity ${childActive ? "opacity-100" : "opacity-0 group-hover/item:opacity-40"}`} />
                                    <span className="flex-1 min-w-0">
                                      <span className={`block text-[13px] font-semibold tracking-tight ${childActive ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}`}>
                                        {child.label}
                                      </span>
                                      <span className="mt-0.5 block truncate text-[11px] text-slate-400 dark:text-slate-500">
                                        {child.desc}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => handleNavigation(group.path)}
                        className={[
                          "flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold tracking-tight outline-none transition-all duration-150 xl:px-3.5 xl:text-[13px]",
                          groupActive
                            ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white"
                            : "text-slate-500 hover:bg-slate-100/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-slate-100",
                        ].join(" ")}
                      >
                        <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[13px] ${accent.icon}`}>
                          {group.icon}
                        </span>
                        {group.label}
                      </button>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* ── Right side ── */}
            <div className="ml-auto flex flex-shrink-0 items-center gap-2">

              {/* Profile button + dropdown */}
              <div className="relative hidden sm:block" data-profile-menu>
                <button
                  type="button"
                  onClick={() => setProfileOpen((o) => !o)}
                  className={[
                    "group/profile flex h-8 items-center gap-2 rounded-lg border px-2 pr-2.5 transition-all duration-150",
                    profileOpen
                      ? "border-slate-300 bg-slate-100 dark:border-white/15 dark:bg-white/10"
                      : "border-slate-200/80 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.07]",
                  ].join(" ")}
                >
                  <div className="relative">
                    <UserAvatar name={userData?.name} photoUrl={userData?.avatarUrl} size={24} />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-[1.5px] border-white bg-emerald-400 dark:border-zinc-950" />
                  </div>
                  <span className="hidden max-w-[100px] truncate text-[12px] font-semibold text-slate-700 dark:text-slate-200 xl:block">
                    {userData?.name?.split(" ")[0] || "Account"}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-slate-400 transition-transform duration-200 dark:text-slate-500 ${profileOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-64 origin-top-right">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/[0.08] dark:border-slate-800 dark:bg-zinc-900">
                      {/* Identity */}
                      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
                        <div className="relative flex-shrink-0">
                          <UserAvatar name={userData?.name} photoUrl={userData?.avatarUrl} size={38} />
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-zinc-900" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white">
                            {userData?.name || "Administrator"}
                          </p>
                          <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                            {userData?.email || "—"}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleMeta.color}`}>
                          {roleMeta.label}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="p-1">
                        {[
                          { label: "My Profile", icon: <UserCircle2 size={14} />, path: "/profile" },
                          { label: "Settings",   icon: <Settings size={14} />,    path: "/settings" },
                        ].map((item) => (
                          <button
                            key={item.path}
                            onClick={() => handleNavigation(item.path)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
                          >
                            <span className="text-slate-400 dark:text-slate-500">{item.icon}</span>
                            {item.label}
                          </button>
                        ))}
                      </div>

                      <div className="mx-3 border-t border-slate-100 dark:border-slate-800" />

                      <div className="p-1">
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                        >
                          <LogOut size={14} />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-white/[0.12] dark:hover:bg-white/[0.07] dark:hover:text-white md:h-9 md:w-9 lg:hidden"
              >
                <Menu size={17} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE SIDEBAR ───────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-[2000] lg:hidden ${mobileMenuOpen ? "visible" : "invisible"}`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`absolute bottom-0 right-0 top-0 flex w-full max-w-[300px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] dark:bg-zinc-950 ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 dark:border-white/[0.06]">
            <img
              src={isDarkMode ? "/acillp-logo-dark.svg" : "/acillp-logo-without-car.svg"}
              alt="ACILLP"
              className="h-8 w-auto object-contain"
            />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav list */}
          <div className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar">
            {navigationGroups.map((group, idx) => (
              <div key={idx} className="mb-4">
                {group.children ? (
                  <>
                    {/* Section label */}
                    <div className="mb-1 flex items-center gap-2 px-3 py-1">
                      <span className="text-slate-300 dark:text-slate-600">{group.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-600">
                        {group.label}
                      </span>
                    </div>
                    {/* Children */}
                    <div className="space-y-0.5">
                      {group.children.map((child) => {
                        const childActive = isActive(child.path);
                        const accent = groupAccent(group.label);
                        return (
                          <button
                            key={child.path}
                            onClick={() => handleNavigation(child.path)}
                            className={[
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100",
                              childActive
                                ? "bg-slate-100 text-slate-900 dark:bg-white/[0.08] dark:text-white"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-100",
                            ].join(" ")}
                          >
                            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${accent.dot} ${childActive ? "opacity-100" : "opacity-30"}`} />
                            <span className="text-[13px] font-medium">{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => handleNavigation(group.path)}
                    className={[
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100",
                      isActive(group.path)
                        ? "bg-slate-100 text-slate-900 dark:bg-white/[0.08] dark:text-white"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-100",
                    ].join(" ")}
                  >
                    <span className="text-slate-400 dark:text-slate-500">{group.icon}</span>
                    <span className="text-[13px] font-semibold">{group.label}</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Drawer footer — user card */}
          <div className="border-t border-slate-100 p-3 dark:border-white/[0.06]">
            <div className="mb-2 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-white/[0.04]">
              <div className="relative flex-shrink-0">
                <UserAvatar name={userData?.name} photoUrl={userData?.avatarUrl} size={36} />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-zinc-950" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white">
                  {userData?.name || "Staff User"}
                </p>
                <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">
                  {userData?.email || "—"}
                </p>
              </div>
              <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${roleMeta.color}`}>
                {roleMeta.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleNavigation("/profile")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/[0.04]"
              >
                <UserCircle2 size={14} />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 py-2 text-[12px] font-semibold text-red-500 transition-colors hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <PayoutSetupModal
        open={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
      />
    </>
  );
};

export default Header;
