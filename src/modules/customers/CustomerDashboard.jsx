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
  Typography,
  Divider,
  Popconfirm,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  FileDoneOutlined,
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import CustomerViewModal from "./CustomerViewModal";

const { Search } = Input;
const { Title, Text } = Typography;

const CustomerDashboard = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);

      const url = `/api/customers`;
      const res = await fetch(url);

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("❌ /api/customers returned non-JSON:", text);
        throw new Error("Customers API did not return JSON");
      }

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

  const handleDeleteCustomer = async (record) => {
    const id = record?._id || record?.id;
    if (!id) return;

    try {
      setDeletingId(id);

      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Delete failed");
      }

      message.success("Customer deleted ✅");
      await loadCustomers();
    } catch (err) {
      console.error("Delete Customer Error:", err);
      message.error(`Delete failed ❌ (${err.message})`);
    } finally {
      setDeletingId(null);
    }
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
    (c) => c.kycStatus === "Pending Docs"
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
          <Space size={8}>
            <UserOutlined style={{ color: "#722ed1" }} />
            <span style={{ fontWeight: 600 }}>
              {record.customerName || "—"}
            </span>

            {record.customerType && (
              <Tag
                style={{ borderRadius: 999 }}
                color={record.customerType === "Repeat" ? "purple" : "blue"}
              >
                {record.customerType}
              </Tag>
            )}
          </Space>

          <Space size={12} style={{ fontSize: 12, color: "#595959" }}>
            <span>
              <PhoneOutlined /> {record.primaryMobile || "N/A"}
            </span>
            <span>•</span>
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
          <span style={{ fontWeight: 500 }}>
            {record.occupationType || "—"}
          </span>
          <span style={{ color: "#8c8c8c" }}>{record.companyName || "—"}</span>
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
          <span style={{ fontWeight: 500 }}>{record.bankName || "—"}</span>
          <span style={{ color: "#8c8c8c" }}>{record.accountType || "—"}</span>
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
        if (!status) return "—";
        const color =
          status === "Completed"
            ? "green"
            : status === "In Progress"
            ? "blue"
            : "orange";
        return (
          <Tag
            style={{ borderRadius: 999, padding: "2px 10px" }}
            color={color}
            icon={<FileDoneOutlined />}
          >
            {status}
          </Tag>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "createdOn",
      key: "createdOn",
      render: (v) => (
        <span style={{ fontSize: 12, color: "#595959" }}>{v || "—"}</span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      render: (_, record) => (
        <Space size={8}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openViewModal(record)}
          >
            View
          </Button>

          <Button
            size="small"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => handleEditCustomer(record)}
          >
            Edit
          </Button>

          <Popconfirm
            title="Delete this customer?"
            description="This cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => handleDeleteCustomer(record)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === (record?._id || record?.id)}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Top Header */}
      <Card
        style={{
          borderRadius: 14,
          border: "1px solid #f0f0f0",
          marginBottom: 14,
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        }}
        bodyStyle={{ padding: 16 }}
      >
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Customers
            </Title>
            <Text type="secondary">
              Total <b>{total}</b> customers • Showing <b>{filtered.length}</b>
            </Text>
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

        <Divider style={{ margin: "14px 0" }} />

        {/* Stats */}
        <Row gutter={[12, 12]}>
          <Col xs={12} md={6}>
            <Card
              size="small"
              style={{
                borderRadius: 12,
                border: "1px solid #f0f0f0",
                background: "#fafcff",
              }}
            >
              <Statistic title="All Customers" value={total} />
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card
              size="small"
              style={{
                borderRadius: 12,
                border: "1px solid #f0f0f0",
                background: "#f6ffed",
              }}
            >
              <Statistic title="KYC Completed" value={completedKyc} />
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card
              size="small"
              style={{
                borderRadius: 12,
                border: "1px solid #f0f0f0",
                background: "#fff7e6",
              }}
            >
              <Statistic title="Pending Docs" value={pendingDocs} />
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card
              size="small"
              style={{
                borderRadius: 12,
                border: "1px solid #f0f0f0",
                background: "#f9f0ff",
              }}
            >
              <Statistic title="Repeat Customers" value={repeat} />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Search + Table */}
      <Card
        style={{
          borderRadius: 14,
          border: "1px solid #f0f0f0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        }}
        bodyStyle={{ padding: 14 }}
      >
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col xs={24} md={10}>
            <Search
              allowClear
              placeholder="Search by name, mobile, city, PAN"
              prefix={<SearchOutlined />}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={24} md={14} style={{ textAlign: "right" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tip: Use PAN / mobile for fastest search
            </Text>
          </Col>
        </Row>

        <Divider style={{ margin: "12px 0" }} />

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey={(r) => r._id || r.id}
          size="middle"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          style={{ borderRadius: 12 }}
        />
      </Card>

      <CustomerViewModal
        open={isViewModalOpen}
        customer={selectedCustomer}
        onClose={() => closeViewModal()}
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
