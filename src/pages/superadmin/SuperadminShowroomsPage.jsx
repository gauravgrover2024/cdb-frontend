import React, { useState, useEffect } from "react";
import { Button, Input, message, Table, Space, Modal } from "antd";
import { Plus, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { showroomsApi } from "../../api/showrooms";

/**
 * Superadmin page: Manage all showrooms
 * Features: Create, Edit, Delete, View all showrooms
 */
const SuperadminShowroomsPage = () => {
  const navigate = useNavigate();
  const [showrooms, setShowrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInputText, setSearchInputText] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [activeStatFilter, setActiveStatFilter] = useState("all");
  const stats = {
    totalShowrooms: pagination.total || 0,
    activeOnPage: showrooms.filter((s) => String(s?.status || "Active") === "Active").length,
    uniqueCitiesOnPage: new Set(
      showrooms.map((s) => String(s?.city || "").trim()).filter(Boolean),
    ).size,
    avgCommissionOnPage:
      showrooms.length > 0
        ? (
            showrooms.reduce((sum, s) => sum + (Number(s?.commissionRate) || 0), 0) /
            showrooms.length
          ).toFixed(1)
        : "0.0",
  };
  const filteredShowrooms = showrooms.filter((s) => {
    if (activeStatFilter === "active") return String(s?.status || "Active") === "Active";
    if (activeStatFilter === "city") return Boolean(String(s?.city || "").trim());
    if (activeStatFilter === "commission") return Number(s?.commissionRate || 0) > 0;
    return true;
  });

  const parseShowroomListResponse = (res) => {
    const payload = res?.data && !Array.isArray(res.data) && res.data.data ? res.data : res;
    const data = Array.isArray(payload?.data) ? payload.data : [];
    const total = Number(payload?.count ?? payload?.total ?? data.length ?? 0);
    return { data, total };
  };

  // Load showrooms with pagination
  const loadShowrooms = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const skip = (page - 1) * 20;
      const res = await showroomsApi.getAll({ skip, limit: 20, q: search });
      const { data, total } = parseShowroomListResponse(res);
      setShowrooms(Array.isArray(data) ? data : []);
      setPagination({ current: page, pageSize: 20, total });
    } catch (error) {
      console.error("Error loading showrooms:", error);
      message.error("Failed to load showrooms");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInputText(value);

    // Clear existing timeout
    if (searchTimeout) clearTimeout(searchTimeout);

    // Debounce search - 300ms delay
    const timeout = setTimeout(() => {
      loadShowrooms(1, value);
    }, 300);
    setSearchTimeout(timeout);
  };

  useEffect(() => {
    loadShowrooms(1, "");
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, []);

  // Handle delete
  const handleDelete = (id) => {
    Modal.confirm({
      title: "Delete Showroom",
      content: "Are you sure you want to delete this showroom?",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await showroomsApi.delete(id);
          message.success("Deleted successfully");
          loadShowrooms(pagination.current, searchInputText);
        } catch (error) {
          console.error("Error deleting showroom:", error);
          message.error(error?.message || "Failed to delete");
        }
      },
    });
  };

  const columns = [
    {
      title: "Showroom Name",
      dataIndex: "name",
      key: "name",
      width: "18%",
    },
    {
      title: "Contact Person",
      dataIndex: "contactPerson",
      key: "contactPerson",
      width: "15%",
    },
    {
      title: "Mobile",
      dataIndex: "mobile",
      key: "mobile",
      width: "12%",
    },
    {
      title: "City",
      dataIndex: "city",
      key: "city",
      width: "12%",
    },
    {
      title: "GST Number",
      dataIndex: "gstNumber",
      key: "gstNumber",
      width: "15%",
      render: (text) => text || "—",
    },
    {
      title: "Commission Rate",
      dataIndex: "commissionRate",
      key: "commissionRate",
      width: "12%",
      render: (text) => `${text || 0}%`,
    },
    {
      title: "Actions",
      key: "actions",
      width: "16%",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => navigate(`/superadmin/showrooms/${record._id}`)}
          >
            View
          </Button>
          <Button
            danger
            size="small"
            onClick={() => handleDelete(record._id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-black text-foreground">Showroom Management</h2>
      </div>

      <Input
        placeholder="Search by name or city..."
        value={searchInputText}
        onChange={handleSearchChange}
        className="w-full"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <button
          type="button"
          onClick={() => setActiveStatFilter("all")}
          className={`rounded-xl border p-3 text-left ${activeStatFilter === "all" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
        >
          <p className="text-xs text-muted-foreground">Total Showrooms</p>
          <p className="text-2xl font-black text-foreground">{stats.totalShowrooms}</p>
        </button>
        <button
          type="button"
          onClick={() => setActiveStatFilter("active")}
          className={`rounded-xl border p-3 text-left ${activeStatFilter === "active" ? "border-emerald-500 bg-emerald-50/60" : "border-border bg-card"}`}
        >
          <p className="text-xs text-muted-foreground">Active (This Page)</p>
          <p className="text-2xl font-black text-emerald-600">{stats.activeOnPage}</p>
        </button>
        <button
          type="button"
          onClick={() => setActiveStatFilter("city")}
          className={`rounded-xl border p-3 text-left ${activeStatFilter === "city" ? "border-sky-500 bg-sky-50/60" : "border-border bg-card"}`}
        >
          <p className="text-xs text-muted-foreground">Cities Covered</p>
          <p className="text-2xl font-black text-sky-600">{stats.uniqueCitiesOnPage}</p>
        </button>
        <button
          type="button"
          onClick={() => setActiveStatFilter("commission")}
          className={`rounded-xl border p-3 text-left ${activeStatFilter === "commission" ? "border-violet-500 bg-violet-50/60" : "border-border bg-card"}`}
        >
          <p className="text-xs text-muted-foreground">Avg Commission</p>
          <p className="text-2xl font-black text-violet-600">{stats.avgCommissionOnPage}%</p>
        </button>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Active Filter</p>
          <p className="text-sm font-bold text-foreground capitalize">{activeStatFilter}</p>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={filteredShowrooms}
        loading={loading}
        rowKey="_id"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page) => loadShowrooms(page, searchInputText),
        }}
      />

      {/* No modal needed - using detail page for view/edit */}
    </div>
  );
};

export default SuperadminShowroomsPage;
