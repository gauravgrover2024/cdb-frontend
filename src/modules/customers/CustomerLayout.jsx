import React, { useMemo, useState } from "react";
import { Layout, Menu, Tooltip } from "antd";
import {
  DashboardOutlined,
  UserAddOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CarOutlined,
  WalletOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";

const { Header, Sider, Content } = Layout;

const CustomerLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const selectedKey = useMemo(() => {
    const path = location.pathname;

    // Customers
    if (path.startsWith("/customers/new")) return "customerNew";
    if (path.startsWith("/customers/edit")) return "customerDashboard";
    if (path.startsWith("/customers")) return "customerDashboard";

    // Loans
    if (path.startsWith("/loans/new")) return "loanNew";
    if (path.startsWith("/loans/edit")) return "loanEdit";
    if (path.startsWith("/loans")) return "loanDashboard";

    // Payouts
    if (path.startsWith("/payouts/receivables")) return "payoutReceivables";
    if (path.startsWith("/payouts/payables")) return "payoutPayables";
    if (path.startsWith("/payouts")) return "payoutReceivables";

    // Delivery Orders
    if (path.startsWith("/delivery-orders/new")) return "deliveryOrderNew";
    if (path.startsWith("/delivery-orders")) return "deliveryOrderDashboard";

    // Payments
    if (path.startsWith("/payments")) return "paymentsDashboard";

    return "";
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    const path = location.pathname;

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
  }, [location.pathname]);

  const menuItem = (key, icon, label, to) => ({
    key,
    icon: collapsed ? (
      <Tooltip title={label} placement="right">
        {icon}
      </Tooltip>
    ) : (
      icon
    ),
    label: <Link to={to}>{label}</Link>,
  });

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      {/* SIDEBAR */}
      <Sider
        width={230}
        collapsedWidth={72}
        collapsed={collapsed}
        trigger={null}
        theme="light"
        style={{
          background: "#ffffff",
          borderRight: "1px solid #f0f0f0",
          boxShadow: "2px 0 10px rgba(0,0,0,0.03)",
        }}
      >
        {/* BRAND */}
        <div
          style={{
            height: 56,
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "#f0f5ff",
              border: "1px solid #d6e4ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#1d39c4",
            }}
          >
            AC
          </div>

          {!collapsed && (
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontWeight: 800, color: "#1d39c4" }}>
                Autocredits
              </div>
              <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                CDrive Platform
              </div>
            </div>
          )}
        </div>

        {/* MENU */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{
            borderRight: 0,
            padding: 10,
            height: "calc(100vh - 56px)",
            overflowY: "auto",
          }}
          items={[
            {
              type: "group",
              label: !collapsed && "Customers",
              children: [
                menuItem(
                  "customerDashboard",
                  <DashboardOutlined />,
                  "Dashboard",
                  "/customers"
                ),
                menuItem(
                  "customerNew",
                  <UserAddOutlined />,
                  "New Customer",
                  "/customers/new"
                ),
              ],
            },

            { type: "divider" },

            {
              type: "group",
              label: !collapsed && "Loans",
              children: [
                menuItem(
                  "loanDashboard",
                  <DashboardOutlined />,
                  "Dashboard",
                  "/loans"
                ),
                menuItem(
                  "loanNew",
                  <FileTextOutlined />,
                  "New Loan",
                  "/loans/new"
                ),
              ],
            },

            { type: "divider" },

            {
              type: "group",
              label: !collapsed && "Payouts",
              children: [
                menuItem(
                  "payoutReceivables",
                  <WalletOutlined />,
                  "Receivables",
                  "/payouts/receivables"
                ),
                menuItem(
                  "payoutPayables",
                  <WalletOutlined />,
                  "Payables",
                  "/payouts/payables"
                ),
              ],
            },

            { type: "divider" },

            {
              type: "group",
              label: !collapsed && "Delivery Orders",
              children: [
                menuItem(
                  "deliveryOrderDashboard",
                  <CarOutlined />,
                  "Delivery Orders",
                  "/delivery-orders"
                ),
              ],
            },

            { type: "divider" },

            {
              type: "group",
              label: !collapsed && "Payments",
              children: [
                menuItem(
                  "paymentsDashboard",
                  <WalletOutlined />,
                  "Payments",
                  "/payments"
                ),
              ],
            },
          ]}
        />
      </Sider>

      {/* MAIN AREA */}
      <Layout>
        {/* HEADER */}
        <Header
          style={{
            background: "#ffffff",
            padding: "0 16px",
            height: 56,
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* LEFT */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{
                cursor: "pointer",
                fontSize: 18,
                color: "#595959",
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #f0f0f0",
                background: "#fafafa",
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{pageTitle}</div>
              <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                Autocredits • CDrive
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
        </Header>

        {/* CONTENT */}
        <Content
          id="app-scroll-container"
          style={{
            padding: 0,
            background: "#f5f7fa",
            overflowY: "auto",
            height: "calc(100vh - 56px)",
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {/* small CSS override for better selected menu */}
      <style>{`
        .ant-menu-item-selected {
          background: #f0f5ff !important;
          border-radius: 12px !important;
          font-weight: 700 !important;
        }
        .ant-menu-item {
          border-radius: 12px !important;
          margin: 4px 0 !important;
        }
      `}</style>
    </Layout>
  );
};

export default CustomerLayout;
