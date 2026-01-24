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
  message,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  FileDoneOutlined,
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import CustomerViewModal from "./CustomerViewModal";

const { Search } = Input;

const CustomerDashboard = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load Customers Error:", err);
      message.error("Failed to load customers ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleNewCustomer = () => {
    navigate("/customers/new");
  };

  const handleEditCustomer = (record) => {
    const id = record?._id || record?.id;
    if (!id) return;
    navigate(`/customers/edit/${id}`);
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

    return (customers || []).filter((c) => {
      const name = String(c.customerName || "").toLowerCase();
      const mobile = String(c.primaryMobile || "");
      const city = String(c.city || "").toLowerCase();
      const pan = String(c.panNumber || "").toLowerCase();

      return (
        name.includes(q) ||
        mobile.includes(q) ||
        city.includes(q) ||
        pan.includes(q)
      );
    });
  }, [searchText, customers]);

  const total = customers.length;
  const completedKyc = customers.filter(
    (c) => c.kycStatus === "Completed"
  ).length;
  const pendingDocs = customers.filter(
    (c) => c.kycStatus !== "Completed"
  ).length;

  const repeat = customers.filter(
    (c) => String(c.customerType || "").toLowerCase() === "repeat"
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
              {record.customerName || "—"}
            </span>
            {record.customerType && (
              <Tag color={record.customerType === "Repeat" ? "purple" : "blue"}>
                {record.customerType}
              </Tag>
            )}
          </Space>

          <Space size={12} style={{ fontSize: 12, color: "#595959" }}>
            <span>
              <PhoneOutlined /> {record.primaryMobile || "N/A"}
            </span>
            <span>{record.city || "—"}</span>
          </Space>
        </Space>
      ),
      sorter: (a, b) =>
        String(a.customerName || "").localeCompare(
          String(b.customerName || "")
        ),
    },
    {
      title: "Employment",
      key: "employment",
      render: (_, record) => (
        <Space direction="vertical" size={2} style={{ fontSize: 12 }}>
          <span>{record.occupationType || "—"}</span>
          <span style={{ color: "#8c8c8c" }}>{record.companyName || ""}</span>
        </Space>
      ),
      sorter: (a, b) =>
        String(a.occupationType || "").localeCompare(
          String(b.occupationType || "")
        ),
    },
    {
      title: "Bank",
      key: "bank",
      render: (_, record) => (
        <Space direction="vertical" size={2} style={{ fontSize: 12 }}>
          <span>{record.bankName || "—"}</span>
          <span style={{ color: "#8c8c8c" }}>{record.accountType || ""}</span>
        </Space>
      ),
      sorter: (a, b) =>
        String(a.bankName || "").localeCompare(String(b.bankName || "")),
    },
    {
      title: "KYC",
      dataIndex: "kycStatus",
      key: "kycStatus",
      sorter: (a, b) =>
        String(a.kycStatus || "").localeCompare(String(b.kycStatus || "")),
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
      render: (v) => v || "—",
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
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadCustomers}
              loading={loading}
            >
              Refresh
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleNewCustomer}
            >
              New Customer
            </Button>
          </Space>
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
              placeholder="Search by name, mobile, city, PAN"
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
          rowKey={(r) => r._id || r.id}
          size="small"
          loading={loading}
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
