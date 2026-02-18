import React, { useMemo } from "react";
import { Layout, Menu } from "antd";
import { DashboardOutlined, FileAddOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";

const { Header, Sider, Content } = Layout;

const LoanLayout = () => {
  const location = useLocation();

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith("/loans/pendency")) return "pendency";
    if (location.pathname.startsWith("/loans/new")) return "newLoan";
    return "dashboard";
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: "100vh", background: "#f7f8fb" }}>
      {/* SIDEBAR */}
      <Sider
        theme="light"
        width={250}
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          borderRight: "1px solid #f0f0f0",
          background: "#fff",
          overflow: "auto",
        }}
      >
        {/* Brand */}
        <div
          style={{
            height: 60,
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 10,
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg,#6d28d9,#9333ea)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            AC
          </div>

          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>
              Autocredits India LLP
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Loans Module</div>
          </div>
        </div>

        {/* Menu */}
        <div style={{ padding: 10 }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            style={{
              border: "none",
              background: "transparent",
            }}
            items={[
              {
                key: "dashboard",
                icon: <DashboardOutlined />,
                label: <Link to="/loans">Dashboard</Link>,
              },
              {
                key: "newLoan",
                icon: <FileAddOutlined />,
                label: <Link to="/loans/new">New Loan</Link>,
              {
                key: "pendency",
                icon: <ClockCircleOutlined />,
                label: <Link to="/loans/pendency">Pendency Tracker</Link>,
              },
              },
            ]}
          />
        </div>
      </Sider>

      {/* MAIN */}
      <Layout style={{ background: "transparent" }}>
        {/* TOP HEADER */}
        <Header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 12020,
            background: "#fff",
            padding: "0 18px",
            borderBottom: "1px solid #f0f0f0",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
              Loan Management
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Dashboard • Create • Edit (via Loan ID)
            </div>
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              background: "#f9fafb",
              border: "1px solid #f0f0f0",
              padding: "6px 10px",
              borderRadius: 10,
              whiteSpace: "nowrap",
            }}
          >
            {location.pathname.startsWith("/loans/new")
              ? "Creating New Loan"
              : "Viewing Dashboard"}
          </div>
        </Header>

        {/* PAGE CONTENT */}
        <Content style={{ padding: 18 }}>
          <div
            style={{
              width: "100%",
            }}
          >
            <div
              style={{
                background: "#fff",
                border: "1px solid #f0f0f0",
                borderRadius: 14,
                padding: 16,
                minHeight: "calc(100vh - 120px)",
              }}
            >
              <Outlet />
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default LoanLayout;
