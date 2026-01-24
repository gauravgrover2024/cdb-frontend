import React, { useState } from "react";
import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  FileAddOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";

const { Header, Sider, Content } = Layout;

const LoanLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  let selectedKey = "dashboard";
  if (location.pathname.startsWith("/loans/new")) selectedKey = "newLoan";
  if (location.pathname.startsWith("/loans/edit")) selectedKey = "editLoan";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={64}
        theme="light"
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          borderRight: "1px solid #f0f0f0",
        }}
      >
        <div
          style={{
            height: 56,
            margin: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            fontWeight: 600,
            fontSize: collapsed ? 18 : 14,
            color: "#531dab",
            paddingLeft: collapsed ? 0 : 8,
          }}
        >
          {collapsed ? "AC" : "Autocredits India LLP"}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
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
            },
            {
              key: "editLoan",
              icon: <FileTextOutlined />,
              label: <Link to="/loans/edit">Edit Loan</Link>,
            },
          ]}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            fontSize: 18,
            fontWeight: 500,
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          Loan Management
        </Header>
        <Content style={{ margin: "16px" }}>
          <div
            style={{
              padding: 16,
              background: "#fff",
              borderRadius: 8,
              minHeight: 360,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default LoanLayout;
