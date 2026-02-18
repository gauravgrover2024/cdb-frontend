import React, { useMemo, useState } from "react";
import { Layout, Button, Avatar, Dropdown, Space } from "antd";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "../../components/ui/navigation-menu";

const { Header, Content } = Layout;

const CustomerLayout = () => {
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();

  const isActive = (path) => location.pathname === path;

  const pageTitle = (() => {
    const path = location.pathname;
    if (path.startsWith("/analytics") || path === "/") return "Analytics Dashboard";
    if (path.startsWith("/customers/new")) return "New Customer";
    if (path.startsWith("/customers/edit")) return "Edit Customer";
    if (path.startsWith("/customers")) return "Customer Dashboard";
    if (path.startsWith("/loans/new")) return "New Loan";
    if (path.startsWith("/loans/edit")) return "Edit Loan";
    if (path.startsWith("/loans")) return "Loan Dashboard";
    if (path.startsWith("/payouts")) return "Payout Management";
    if (path.startsWith("/delivery-orders")) return "Delivery Orders";
    if (path.startsWith("/payments")) return "Payments";
    return "Dashboard";
  })();

  const navigationGroups = [
    {
      label: "Analytics",
      path: "/analytics",
    },
    {
      label: "Customers",
      children: [
        { label: "Dashboard", path: "/customers" },
        { label: "New Customer", path: "/customers/new" },
      ],
    },
    {
      label: "Loans",
      children: [
        { label: "Dashboard", path: "/loans" },
        { label: "New Loan", path: "/loans/new" },
      ],
    },
    {
      label: "Finance",
      children: [
        { label: "Receivables", path: "/payouts/receivables" },
        { label: "Delivery Orders", path: "/delivery-orders" },
        { label: "Payments", path: "/payments" },
      ],
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600 }}>Admin User</div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>admin@acillp.com</div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'settings',
      label: 'Settings',
    },
    {
      key: 'logout',
      label: 'Logout',
      danger: true,
    },
  ];

  const workSansStyle = {
    fontFamily: '"Work Sans", sans-serif',
    fontOpticalSizing: 'auto',
    fontWeight: 700,
    fontStyle: 'normal',
  };

  const BrandLogo = () => (
    <div
      style={{
        height: 64,
        display: "flex",
        alignItems: "center",
        padding: "0 16px 0 0",
        gap: 12,
        background: "transparent",
      }}
    >
      <img
        src={process.env.PUBLIC_URL + "/ACILLP.svg"}
        alt="Logo"
        style={{
          height: 56,
          width: "auto",
          objectFit: "contain",
          display: "block",
        }}
      />

    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout>
        <Header
          style={{
            ...workSansStyle,
            padding: "0 16px",
            background: isDarkMode ? "rgba(0, 0, 0, 0.85)" : "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid var(--border)`,
            zIndex: 9,
            height: 64,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <BrandLogo />
            <NavigationMenu>
              <NavigationMenuList>
                {navigationGroups.map((group) => (
                  group.children ? (
                    <NavigationMenuItem key={group.label}>
                      <NavigationMenuTrigger className={navigationMenuTriggerStyle()}>
                        {group.label}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div style={{ padding: "12px 16px", fontSize: 13, color: "#666", minWidth: 260 }}>
                          {group.description}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          {group.children.map((child) => (
                            <NavigationMenuLink
                              asChild
                              key={child.path}
                              className={navigationMenuTriggerStyle() + (isActive(child.path) ? " active" : "")}
                              style={{ minWidth: 260 }}
                            >
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <Link to={child.path}>{child.label}</Link>
                                <span style={{ fontSize: 11, color: "#888", marginLeft: 2 }}>{child.description}</span>
                              </div>
                            </NavigationMenuLink>
                          ))}
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  ) : (
                    <NavigationMenuItem key={group.path}>
                      <NavigationMenuLink
                        asChild
                        className={navigationMenuTriggerStyle() + (isActive(group.path) ? " active" : "")}
                      >
                        <Link to={group.path}>{group.label}</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  )
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Header Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button
                shape="circle"
                icon={isDarkMode ? "🌞" : "🌙"}
                onClick={toggleTheme}
                type="text"
                style={{ fontSize: 18 }}
            />
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <Space style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 999 }} className="hover:bg-foreground/5 transition-colors">
                <Avatar style={{ backgroundColor: "var(--primary)", verticalAlign: 'middle' }} size="medium" />
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, textAlign: 'left' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'inherit' }}>Admin User</span>
                  <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Admin</span>
                </div>
              </Space>
            </Dropdown>
          </div>
        </Header>

        <Content
          id="app-scroll-container"
          style={{
            margin: "0",
            padding: "0px",
            minHeight: 280,
            overflowY: "auto",
            height: "calc(100vh - 64px)",
            backgroundColor: "var(--background)",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default CustomerLayout;
