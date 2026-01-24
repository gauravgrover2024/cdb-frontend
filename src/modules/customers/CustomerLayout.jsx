import React, { useState, useMemo } from "react";
import { Layout, Menu, Tooltip } from "antd";
import {
  DashboardOutlined,
  UserAddOutlined,
  TeamOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CarOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";

const { Header, Sider, Content } = Layout;

const CustomerLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith("/customers/new")) return "customerNew";
    if (location.pathname.startsWith("/customers/new")) return "customerNew";
    if (location.pathname.startsWith("/customers")) return "customerDashboard";

    if (location.pathname.startsWith("/customers")) return "customerDashboard";

    if (location.pathname.startsWith("/loans/new")) return "loanNew";
    if (location.pathname.startsWith("/loans/edit")) return "loanEdit";
    if (location.pathname.startsWith("/loans")) return "loanDashboard";

    // ✅ PAYOUTS
    if (location.pathname.startsWith("/payouts/receivables"))
      return "payoutReceivables";
    if (location.pathname.startsWith("/payouts/payables"))
      return "payoutPayables";
    if (location.pathname.startsWith("/payouts")) return "payoutReceivables";

    // ✅ DELIVERY ORDERS
    if (location.pathname.startsWith("/delivery-orders/new"))
      return "deliveryOrderNew";
    if (location.pathname.startsWith("/delivery-orders"))
      return "deliveryOrderDashboard";

    // ✅ PAYMENTS
    if (location.pathname.startsWith("/payments")) return "paymentsDashboard";

    return "";
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
        width={200}
        collapsedWidth={64}
        collapsed={collapsed}
        trigger={null}
        theme="light"
        style={{
          borderRight: "1px solid #f0f0f0",
          background: "#ffffff",
        }}
      >
        {/* BRAND */}
        <div
          style={{
            height: 48,
            margin: "8px 12px",
            display: "flex",
            alignItems: "center",
            fontWeight: 600,
            fontSize: collapsed ? 16 : 14,
            color: "#1d39c4",
            whiteSpace: "nowrap",
          }}
        >
          {collapsed ? "AC" : "Autocredits"}
        </div>

        {/* MENU */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{
            borderRight: 0,
            padding: "4px",
            height: "calc(100vh - 64px)",
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
                  "Customer Dashboard",
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
                  "Loan Dashboard",
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

            // ✅ PAYOUTS GROUP (unchanged)
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

            // ✅ DELIVERY ORDERS GROUP (unchanged)
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

            // ✅ PAYMENTS GROUP (ONLY ADDED THIS)
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
            lineHeight: "56px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* COLLAPSE TOGGLE */}
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{
              cursor: "pointer",
              fontSize: 18,
              color: "#595959",
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          <div style={{ fontWeight: 500 }}>
            {location.pathname.startsWith("/loans")
              ? "Loan Dashboard"
              : location.pathname.startsWith("/payouts")
              ? "Payout Management"
              : location.pathname.startsWith("/delivery-orders")
              ? "Delivery Orders"
              : location.pathname.startsWith("/payments")
              ? "Payments"
              : "Customer Dashboard"}
          </div>
        </Header>

        {/* CONTENT */}
        <Content
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
    </Layout>
  );
};

export default CustomerLayout;
