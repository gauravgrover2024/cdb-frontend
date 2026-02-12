// src/layouts/CustomerLayout.jsx
import React, { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

/* ========= Light SaaS theme (orange accent) ========= */

const theme = {
  bgPage: "#f5f7fb",
  bgSidebar: "#ffffff",
  bgSidebarStripe: "#f97316",
  bgSidebarItemActive: "#fff7ed",
  bgSidebarItemHover: "#f9fafb",
  bgHeader: "#ffffff",
  bgTag: "#f9fafb",

  borderSoft: "#e5e7eb",

  textPrimary: "#111827",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  textBrand: "#ea580c",

  brandGrad: "linear-gradient(135deg,#f97316,#fb923c)",

  radiusLg: 18,
  radiusMd: 12,
  radiusSm: 8,

  sidebarWidth: 260,
  sidebarCollapsed: 80,
  headerHeight: 60,

  font: "Inter, system-ui, -apple-system, BlinkMacSystemFont",
};

/* ========= Minimal icon set ========= */

const Icon = ({ d, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ display: "block" }}
  >
    <path
      d={d}
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const icons = {
  chevronLeft: "M15 18l-6-6 6-6",
  users:
    "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  file: "M14.5 3H8a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V9.5L14.5 3Z",
  wallet:
    "M5 7a3 3 0 0 1 3-3h11a1 1 0 0 1 1 1v3H6a1 1 0 0 1-1-1V7Zm0 4h15v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-6Zm11 3.5a1.5 1.5 0 1 0 0-3",
  truck:
    "M3 7a2 2 0 0 1 2-2h9v10H5a2 2 0 0 1-2-2V7Zm11 3h4.5L21 12.5V15a2 2 0 0 1-2 2h-5V10ZM7 19.5A1.5 1.5 0 1 0 7 16a1.5 1.5 0 0 0 0 3.5Zm9 0A1.5 1.5 0 1 0 16 16a1.5 1.5 0 0 0 0 3.5Z",
  rupee: "M7 5h10M7 9h10M12 9a4 4 0 0 1 4 4H7m5 0 3 4",
};

/* ========= Nav config ========= */

const NAV_ITEMS = [
  { key: "customers", label: "Customers", to: "/customers", icon: icons.users },
  { key: "loans", label: "Loans", to: "/loans", icon: icons.file },
  {
    key: "payouts",
    label: "Payouts",
    to: "/payouts/receivables",
    icon: icons.wallet,
  },
  {
    key: "delivery",
    label: "Delivery Orders",
    to: "/delivery-orders",
    icon: icons.truck,
  },
  {
    key: "payments",
    label: "Payments",
    to: "/payments",
    icon: icons.rupee,
  },
];


/* ========= Sidebar nav item ========= */

const NavItem = ({ item, active, collapsed }) => (
  <Link
    to={item.to}
    style={{
      display: "flex",
      alignItems: "center",
      gap: collapsed ? 0 : 10,
      justifyContent: collapsed ? "center" : "flex-start",
      padding: collapsed ? "10px 0" : "8px 12px",
      borderRadius: 999,
      marginInline: collapsed ? 0 : 4,
      color: active ? theme.textBrand : theme.textSecondary,
      textDecoration: "none",
      fontSize: 13,
      fontWeight: active ? 600 : 500,
      backgroundColor: active
        ? theme.bgSidebarItemActive
        : "transparent",
      border: active ? `1px solid #fed7aa` : "1px solid transparent",
      transition:
        "background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease",
    }}
  >
    <span
      style={{
        width: 30,
        height: 30,
        borderRadius: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "#ffedd5" : "#f3f4f6",
        color: active ? theme.textBrand : theme.textSecondary,
      }}
    >
      <Icon d={item.icon} size={17} />
    </span>
    {!collapsed && <span>{item.label}</span>}
  </Link>
);

/* ========= Layout ========= */

const CustomerLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const activeKey = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/customers")) return "customers";
    if (p.startsWith("/loans")) return "loans";
    if (p.startsWith("/payouts")) return "payouts";
    if (p.startsWith("/delivery-orders")) return "delivery";
    if (p.startsWith("/payments")) return "payments";
    return "";
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/customers/new")) return "New Customer";
    if (p.startsWith("/customers/edit")) return "Edit Customer";
    if (p.startsWith("/customers")) return "Customers";
    if (p.startsWith("/loans")) return "Loans";
    if (p.startsWith("/payouts")) return "Payouts";
    if (p.startsWith("/delivery-orders")) return "Delivery Orders";
    if (p.startsWith("/payments")) return "Payments";
    return "Dashboard";
  }, [location.pathname]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: theme.bgPage,
        fontFamily: theme.font,
        color: theme.textPrimary,
      }}
    >
      {/* ========== SIDEBAR ========== */}
      <aside
        style={{
          width: collapsed ? theme.sidebarCollapsed : theme.sidebarWidth,
          transition: "width 0.22s ease",
          borderRight: `1px solid ${theme.borderSoft}`,
          background: theme.bgSidebar,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "0 0 0 1px rgba(15,23,42,0.03)",
          zIndex: 20,
        }}
      >
        {/* Colored stripe on the very left */}
        <div
          style={{
            position: "absolute",
            insetY: 0,
            left: 0,
            width: 4,
            background: theme.brandGrad,
          }}
        />

        {/* Content */}
        <div
          style={{
            padding: "10px 10px 12px 14px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
        >
          {/* Brand row */}
          <div
            style={{
              height: theme.headerHeight,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                background: theme.brandGrad,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 14,
                color: "#fff7ed",
                boxShadow: "0 10px 25px rgba(249,115,22,0.4)",
                flexShrink: 0,
              }}
            >
              AC
            </div>
            {!collapsed && (
              <div style={{ lineHeight: 1.15 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: theme.textPrimary,
                  }}
                >
                  Autocredits India LLP
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: theme.textSecondary,
                  }}
                >
                  CDrive Platform
                </div>
              </div>
            )}
          </div>

          {/* Section label */}
          {!collapsed && (
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: theme.textMuted,
                padding: "8px 4px 4px",
              }}
            >
              Navigation
            </div>
          )}

          {/* Nav list */}
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 4,
              flex: 1,
            }}
          >
            {NAV_ITEMS.map((item) => (
              <NavItem
                key={item.key}
                item={item}
                active={activeKey === item.key}
                collapsed={collapsed}
              />
            ))}
          </nav>

          {/* Collapse button */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            style={{
              marginTop: 12,
              marginInline: 4,
              width: collapsed ? 40 : "auto",
              alignSelf: collapsed ? "center" : "stretch",
              borderRadius: 999,
              border: `1px solid ${theme.borderSoft}`,
              background: "#ffffff",
              color: theme.textSecondary,
              fontSize: 11,
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                transform: collapsed ? "rotate(180deg)" : "none",
                transition: "transform 0.18s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon d={icons.chevronLeft} size={14} />
            </span>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ========== MAIN COLUMN ========== */}
      <section
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Header */}
        <header
          style={{
            height: theme.headerHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            borderBottom: `1px solid ${theme.borderSoft}`,
            background: theme.bgHeader,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: theme.textPrimary,
              }}
            >
              {pageTitle}
            </div>
            <div
              style={{
                fontSize: 11,
                color: theme.textSecondary,
              }}
            >
              Autocredits • CDrive
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                padding: "4px 9px",
                borderRadius: 999,
                border: `1px solid ${theme.borderSoft}`,
                background: theme.bgTag,
                color: theme.textSecondary,
                whiteSpace: "nowrap",
              }}
            >
              {todayLabel}
            </span>
          </div>
        </header>

        {/* Content */}
        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: 18,
          }}
        >
          <div
            style={{
              maxWidth: 1440,
              margin: "0 auto",
              height: "100%",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: theme.radiusLg,
                border: `1px solid ${theme.borderSoft}`,
                boxShadow:
                  "0 18px 45px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.02)",
                padding: 18,
                minHeight: "calc(100vh - 60px - 36px)",
              }}
            >
              <Outlet />
            </div>
          </div>
        </main>
      </section>
    </div>
  );
};

export default CustomerLayout;
