import React, { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

/* =========================================================
   Snow UI – Design Tokens (Premium SaaS grade)
========================================================= */

const snow = {
  bg: "#f6f8fb",
  sidebarGlass: "rgba(255,255,255,0.75)",
  headerGlass: "rgba(255,255,255,0.65)",
  contentBg: "#f6f8fb",

  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  accent: "#4f46e5",

  border: "rgba(15,23,42,0.08)",

  shadowSoft: "0 8px 24px rgba(15,23,42,0.06)",
  shadowStrong: "0 20px 50px rgba(15,23,42,0.12)",

  radiusLg: 20,
  radiusMd: 14,
  radiusSm: 10,

  sidebarWidth: 260,
  sidebarCollapsed: 84,
  headerHeight: 64,

  font: "Inter, system-ui, -apple-system, BlinkMacSystemFont",
};

/* =========================================================
   Icons (inline SVG – clean & professional)
========================================================= */

const Icon = ({ d }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const icons = {
  dashboard: "M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-18v6h8V3h-8Z",
  users:
    "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z",
  wallet:
    "M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5Zm-4 0h.01",
  car: "M5 16l1.5-4.5h11L19 16M7 16v2M17 16v2",
  chevron: "M9 18l6-6-6-6",
};

/* =========================================================
   Layout Component
========================================================= */

const CustomerLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const active = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/customers")) return "customers";
    if (p.startsWith("/loans")) return "loans";
    if (p.startsWith("/payouts")) return "payouts";
    if (p.startsWith("/delivery-orders")) return "delivery";
    if (p.startsWith("/payments")) return "payments";
    return "";
  }, [location.pathname]);

  const title = useMemo(() => {
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

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <aside
        style={{
          ...styles.sidebar,
          width: collapsed ? snow.sidebarCollapsed : snow.sidebarWidth,
        }}
      >
        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.logo}>AC</div>
          {!collapsed && (
            <div>
              <div style={styles.brandTitle}>Autocredits</div>
              <div style={styles.brandSub}>CDrive Platform</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          <NavItem
            to="/customers"
            label="Customers"
            icon={icons.users}
            active={active === "customers"}
            collapsed={collapsed}
          />
          <NavItem
            to="/loans"
            label="Loans"
            icon={icons.file}
            active={active === "loans"}
            collapsed={collapsed}
          />
          <NavItem
            to="/payouts/receivables"
            label="Payouts"
            icon={icons.wallet}
            active={active === "payouts"}
            collapsed={collapsed}
          />
          <NavItem
            to="/delivery-orders"
            label="Delivery Orders"
            icon={icons.car}
            active={active === "delivery"}
            collapsed={collapsed}
          />
          <NavItem
            to="/payments"
            label="Payments"
            icon={icons.dashboard}
            active={active === "payments"}
            collapsed={collapsed}
          />
        </nav>
      </aside>

      {/* Main */}
      <section style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={styles.collapseBtn}
            >
              <Icon d={icons.chevron} />
            </button>

            <div>
              <div style={styles.pageTitle}>{title}</div>
              <div style={styles.pageSub}>Autocredits • CDrive</div>
            </div>
          </div>

          <div style={styles.headerRight}>
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
        </header>

        {/* Content */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </section>
    </div>
  );
};

/* =========================================================
   Nav Item
========================================================= */

const NavItem = ({ to, label, icon, active, collapsed }) => (
  <Link
    to={to}
    style={{
      ...styles.navItem,
      ...(active ? styles.navItemActive : {}),
    }}
  >
    <Icon d={icon} />
    {!collapsed && <span>{label}</span>}
  </Link>
);

/* =========================================================
   Styles
========================================================= */

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background: snow.bg,
    fontFamily: snow.font,
    color: snow.textPrimary,
  },

  sidebar: {
    background: snow.sidebarGlass,
    backdropFilter: "blur(20px)",
    borderRight: `1px solid ${snow.border}`,
    boxShadow: snow.shadowSoft,
    display: "flex",
    flexDirection: "column",
    transition: "width 0.25s ease",
  },

  brand: {
    height: snow.headerHeight,
    padding: "0 18px",
    display: "flex",
    alignItems: "center",
    gap: 14,
    borderBottom: `1px solid ${snow.border}`,
  },

  logo: {
    width: 40,
    height: 40,
    borderRadius: 14,
    background: "linear-gradient(135deg,#6366f1,#4338ca)",
    color: "#fff",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  brandTitle: { fontWeight: 800, fontSize: 15 },
  brandSub: { fontSize: 11, color: snow.textSecondary },

  nav: {
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "12px 14px",
    borderRadius: snow.radiusMd,
    textDecoration: "none",
    color: snow.textPrimary,
    fontWeight: 500,
    transition: "all .15s ease",
  },

  navItemActive: {
    background: "rgba(99,102,241,0.12)",
    color: snow.accent,
    fontWeight: 700,
  },

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  header: {
    height: snow.headerHeight,
    background: snow.headerGlass,
    backdropFilter: "blur(16px)",
    borderBottom: `1px solid ${snow.border}`,
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  headerRight: {
    fontSize: 12,
    color: snow.textSecondary,
  },

  collapseBtn: {
    width: 40,
    height: 40,
    borderRadius: snow.radiusSm,
    border: `1px solid ${snow.border}`,
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  pageTitle: {
    fontWeight: 800,
    fontSize: 16,
  },

  pageSub: {
    fontSize: 11,
    color: snow.textSecondary,
  },

  content: {
    flex: 1,
    background: snow.contentBg,
    overflowY: "auto",
  },
};

export default CustomerLayout;
