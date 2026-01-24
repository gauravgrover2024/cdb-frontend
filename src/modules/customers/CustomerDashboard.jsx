// src/modules/customers/CustomerDashboard.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Input,
  Tag,
  Space,
  Table,
  Button,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  FileDoneOutlined,
  SearchOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import demoCustomers from "./demoCustomers";
import CustomerViewModal from "./CustomerViewModal";

const { Search } = Input;

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [customers, setCustomers] = useState(demoCustomers);
  const [searchText, setSearchText] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // accept updated list from Add/Edit exactly once
  useEffect(() => {
    if (location.state && location.state.customers) {
      setCustomers(location.state.customers);
      // clear location.state so refresh or manual click doesn't break
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location]);

  const handleNewCustomer = () => {
    navigate("/customers/new", { state: { customers } });
  };

  const handleEditCustomer = (record) => {
    navigate("/customers/edit", { state: { customer: record, customers } });
  };

  const openViewModal = (record) => {
    setSelectedCustomer(record);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedCustomer(null);
  };

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const name = (c.customerName || c.name || "").toLowerCase();
      const mobile = c.primaryMobile || c.mobile || "";
      const city = (c.city || "").toLowerCase();
      return (
        name.includes(q) || mobile.includes(q) || (city && city.includes(q))
      );
    });
  }, [searchText, customers]);

  const total = customers.length;
  const completedKyc = customers.filter(
    (c) => c.kycStatus === "Completed"
  ).length;
  const pendingDocs = customers.filter(
    (c) => c.kycStatus === "Pending Docs"
  ).length;
  const repeat = customers.filter(
    (c) => (c.customerType || "").toLowerCase() === "repeat"
  ).length;

  const columns = [
    {
      title: "Customer",
      key: "customer",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Space size={6}>
            <UserOutlined style={{ color: "#722ed1" }} />
            <span style={{ fontWeight: 500 }}>
              {record.customerName || record.name}
            </span>
            {record.customerType && (
              <Tag color={record.customerType === "Repeat" ? "purple" : "blue"}>
                {record.customerType}
              </Tag>
            )}
          </Space>
          <Space size={12} style={{ fontSize: 12, color: "#595959" }}>
            <span>
              <PhoneOutlined /> {record.primaryMobile || record.mobile || "N/A"}
            </span>
            <span>{record.city}</span>
          </Space>
        </Space>
      ),
      sorter: (a, b) =>
        (a.customerName || a.name || "").localeCompare(
          b.customerName || b.name || ""
        ),
    },
    {
      title: "Employment",
      key: "employment",
      render: (_, record) => (
        <Space direction="vertical" size={2} style={{ fontSize: 12 }}>
          <span>{record.occupationType}</span>
          <span style={{ color: "#8c8c8c" }}>{record.companyName}</span>
        </Space>
      ),
      sorter: (a, b) =>
        (a.occupationType || "").localeCompare(b.occupationType || ""),
    },
    {
      title: "Bank",
      key: "bank",
      render: (_, record) => (
        <Space direction="vertical" size={2} style={{ fontSize: 12 }}>
          <span>{record.bankName}</span>
          <span style={{ color: "#8c8c8c" }}>{record.accountType}</span>
        </Space>
      ),
      sorter: (a, b) => (a.bankName || "").localeCompare(b.bankName || ""),
    },
    {
      title: "KYC",
      dataIndex: "kycStatus",
      key: "kycStatus",
      sorter: (a, b) => (a.kycStatus || "").localeCompare(b.kycStatus || ""),
      render: (status) => {
        if (!status) return "-";
        const color =
          status === "Completed"
            ? "green"
            : status === "In Progress"
            ? "blue"
            : "orange";
        return (
          <Tag color={color} icon={<FileDoneOutlined />}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "createdOn",
      key: "createdOn",
      sorter: (a, b) => {
        if (!a.createdOn || !b.createdOn) return 0;
        const pa = a.createdOn.split(" ").reverse().join("-");
        const pb = b.createdOn.split(" ").reverse().join("-");
        return new Date(pa) - new Date(pb);
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size={8}>
          <Button
            size="small"
            type="link"
            onClick={() => openViewModal(record)}
          >
            View
          </Button>
          <Button
            size="small"
            type="link"
            onClick={() => handleEditCustomer(record)}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Customers</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            Total {total} customers • Showing {filtered.length}
          </div>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleNewCustomer}
          >
            New Customer
          </Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="All Customers"
              value={total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="KYC Completed"
              value={completedKyc}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Pending Docs"
              value={pendingDocs}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Repeat Customers" value={repeat} />
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        style={{ marginBottom: 12 }}
        bodyStyle={{ padding: 12 }}
      >
        <Row justify="space-between" align="middle" gutter={12}>
          <Col xs={24} md={12}>
            <Search
              allowClear
              placeholder="Search by name, mobile, city"
              prefix={<SearchOutlined />}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
        </Row>
      </Card>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </Card>

      <CustomerViewModal
        open={isViewModalOpen}
        customer={selectedCustomer}
        onClose={closeViewModal}
        onEdit={() => {
          if (selectedCustomer) {
            handleEditCustomer(selectedCustomer);
            closeViewModal();
          }
        }}
      />
    </div>
  );
};

export default CustomerDashboard;
