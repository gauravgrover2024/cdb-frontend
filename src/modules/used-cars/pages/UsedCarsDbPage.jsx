import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, RefreshCw, Plus } from "lucide-react";
import { Table, Tag, Space, Select, Modal, Form, Input, InputNumber, Popconfirm, message } from "antd";
import { usedCarsDbApi } from "../../../api/usedCars";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import { formatINR } from "../../../utils/currency";

const { Option } = Select;

// Filter chip colour map — matches insurance dashboard palette
const CHIP_COLORS = {
  All:        { active: "#6366f1" },
  Petrol:     { active: "#f97316" },
  Diesel:     { active: "#2563eb" },
  CNG:        { active: "#10b981" },
  Electric:   { active: "#8b5cf6" },
  Manual:     { active: "#475569" },
  Automatic:  { active: "#f59e0b" },
};

const FilterChip = ({ label, isActive, onClick, count }) => {
  const c = CHIP_COLORS[label] || { active: "#475569" };
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="rounded-lg border-2 transition-all"
      style={{
        background: isActive ? "#0f172a" : "#ffffff",
        borderColor: isActive ? "#0f172a" : "#e2e8f0",
        boxShadow: isActive ? "0 2px 8px rgba(15,23,42,0.2)" : "none",
      }}
    >
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <span
          className="text-[13px] font-semibold"
          style={{ color: isActive ? "#fff" : "#374151" }}
        >
          {label}
        </span>
        {count !== undefined && (
          <span
            className="rounded px-1.5 py-0.5 text-[11px] font-bold"
            style={{
              background: isActive ? "rgba(255,255,255,0.22)" : `${c.active}18`,
              color: isActive ? "#fff" : c.active,
            }}
          >
            {count}
          </span>
        )}
      </div>
    </motion.button>
  );
};

const StatCard = ({ title, value, iconName, iconColor = "text-primary" }) => (
  <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
      <p className="text-xl font-bold font-mono tracking-tight text-foreground truncate mt-1">{value}</p>
    </div>
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 shrink-0 ${iconColor}`}>
      <Icon name={iconName} size={20} className={iconColor} />
    </div>
  </div>
);

export default function UsedCarsDbPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalCount: 0,
    uniqueMakes: 0,
    activeCount: 0,
    discontinuedCount: 0,
  });

  // Query and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [transFilter, setTransFilter] = useState("all");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
  });

  const hasActiveFilters = searchQuery || fuelFilter !== "all" || transFilter !== "all";

  // Form & Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [form] = Form.useForm();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination((prev) => ({ ...prev, current: 1 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load stats (derived from total query count or standard aggregates)
  const fetchStats = useCallback(async () => {
    try {
      // Fetching all makes/models requires simple count endpoints or query aggregates.
      // For speed, we derive these from backend listings, or fetch a broad stats object.
      // Let's run a quick get with no limit to count distinct fields.
      const res = await usedCarsDbApi.getUsedCars({ limit: 1 });
      if (res?.success) {
        // We'll set total count first
        setStats((prev) => ({
          ...prev,
          totalCount: res.count || 0,
        }));
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }, []);

  // Fetch list of cars
  const fetchCars = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: pagination.pageSize,
        skip: (pagination.current - 1) * pagination.pageSize,
        fuel_type: fuelFilter !== "all" ? fuelFilter : undefined,
        transmission: transFilter !== "all" ? transFilter : undefined,
      };

      if (debouncedSearch) {
        params.q = debouncedSearch;
      }

      const res = await usedCarsDbApi.getUsedCars(params);
      if (res?.success) {
        setData(res.data || []);
        setTotal(res.count || 0);
      } else {
        message.error("Failed to load records");
      }
    } catch (err) {
      console.error("Error loading used cars:", err);
      message.error("Failed to fetch used cars master database");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, fuelFilter, transFilter, pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleFilterChipChange = (setter, current, value) => {
    setter(current === value ? "all" : value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (newPagination) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  // Add & Edit actions
  const handleOpenAddModal = () => {
    setEditingCar(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record) => {
    setEditingCar(record);
    form.setFieldsValue({
      ...record,
      is_active: record.is_active ?? true,
      is_discontinued: record.is_discontinued ?? false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await usedCarsDbApi.deleteUsedCar(id);
      if (res?.success) {
        message.success("Record deleted successfully ✅");
        fetchCars();
        fetchStats();
      } else {
        message.error("Delete failed");
      }
    } catch (err) {
      console.error(err);
      message.error("Error deleting record");
    }
  };

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      setModalLoading(true);

      if (editingCar) {
        const res = await usedCarsDbApi.updateUsedCar(editingCar._id, values);
        if (res?.success) {
          message.success("Record updated successfully ✅");
          setIsModalOpen(false);
          fetchCars();
        } else {
          message.error("Failed to update record");
        }
      } else {
        const res = await usedCarsDbApi.createUsedCar(values);
        if (res?.success) {
          message.success("New record added successfully ✅");
          setIsModalOpen(false);
          fetchCars();
          fetchStats();
        } else {
          message.error("Failed to add record");
        }
      }
    } catch (err) {
      console.error("Form validation failed:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const columns = [
    {
      title: "Make",
      dataIndex: "make",
      key: "make",
      sorter: true,
      render: (text) => <span className="font-semibold text-foreground">{text}</span>,
    },
    {
      title: "Model",
      dataIndex: "model",
      key: "model",
    },
    {
      title: "Variant",
      dataIndex: "variant",
      key: "variant",
    },
    {
      title: "Year",
      dataIndex: "year",
      key: "year",
      render: (year) => <Tag color="blue">{year}</Tag>,
    },
    {
      title: "Fuel Type",
      dataIndex: "fuel_type",
      key: "fuel_type",
      render: (fuel) => (
        <Tag color={fuel === "Petrol" ? "orange" : fuel === "Diesel" ? "geekblue" : "purple"}>
          {fuel || "N/A"}
        </Tag>
      ),
    },
    {
      title: "Transmission",
      dataIndex: "transmission",
      key: "transmission",
      render: (trans) => (
        <Tag color={trans === "Manual" ? "default" : "green"}>{trans || "N/A"}</Tag>
      ),
    },
    {
      title: "CC",
      dataIndex: "cc",
      key: "cc",
      render: (cc) => (cc ? `${cc} cc` : "—"),
    },
    {
      title: "Mileage",
      dataIndex: "mileage",
      key: "mileage",
      render: (m) => m || "—",
    },
    {
      title: "Ex-Showroom",
      dataIndex: "ex_showroom_price",
      key: "ex_showroom_price",
      render: (price) => (price ? formatINR(price) : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Button
            size="sm"
            variant="ghost"
            iconName="Edit3"
            onClick={() => handleOpenEditModal(record)}
            className="h-8 w-8 p-0"
          />
          <Popconfirm
            title="Are you sure you want to delete this master record?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              size="sm"
              variant="ghost"
              iconName="Trash2"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-full p-4 md:p-6 bg-background">
      <div className="app-max-wrap flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Used Cars Master DB</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse, filter, and manage the master database of variants by manufacturing year.
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Records" value={total} iconName="Layers" />
          <StatCard title="Total Models in DB" value={stats.totalCount} iconName="Car" iconColor="text-blue-500" />
          <StatCard title="Active Configurations" value="Yes" iconName="CheckCircle2" iconColor="text-success" />
        </div>

        {/* Search + Filters — insurance/loans style */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
          {/* Top row: search input + action buttons */}
          <div className="flex flex-col lg:flex-row gap-3 mb-3">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search by make, model, variant, year…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-slate-900 placeholder-slate-400 font-medium transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-lg font-bold text-white flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Record
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { fetchCars(); fetchStats(); }}
              className="px-4 py-2.5 rounded-lg font-semibold text-slate-700 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </motion.button>
          </div>

          {/* Filter chips — Fuel Type */}
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="All"
              isActive={fuelFilter === "all" && transFilter === "all"}
              onClick={() => { setFuelFilter("all"); setTransFilter("all"); setPagination(p => ({ ...p, current: 1 })); }}
            />

            {/* Fuel chips */}
            {["Petrol", "Diesel", "CNG", "Electric"].map((fuel) => (
              <FilterChip
                key={fuel}
                label={fuel}
                isActive={fuelFilter === fuel}
                onClick={() => handleFilterChipChange(setFuelFilter, fuelFilter, fuel)}
              />
            ))}

            {/* Transmission chips */}
            {["Manual", "Automatic"].map((tr) => (
              <FilterChip
                key={tr}
                label={tr}
                isActive={transFilter === tr}
                onClick={() => handleFilterChipChange(setTransFilter, transFilter, tr)}
              />
            ))}

            {/* Clear all active filters */}
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setSearchQuery("");
                    setFuelFilter("all");
                    setTransFilter("all");
                    setPagination((p) => ({ ...p, current: 1 }));
                  }}
                  className="rounded-lg border-2 border-red-200 bg-red-50 flex items-center gap-1.5 px-3 py-1.5"
                >
                  <X size={13} className="text-red-500" />
                  <span className="text-[13px] font-semibold text-red-600">Clear Filters</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Grid database Table */}
        <div className="bg-card border border-border rounded-xl flex-1 overflow-hidden shadow-sm">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "15", "25", "50"],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`,
          }}
          onChange={handleTableChange}
          className="custom-table"
        />
      </div>

      {/* Add / Edit Form Modal */}
      <Modal
        title={editingCar ? "Edit Used Car Master Record" : "Add New Used Car Master Record"}
        open={isModalOpen}
        onOk={handleFormSubmit}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={modalLoading}
        destroyOnClose
        okText={editingCar ? "Save Changes" : "Create Record"}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="make"
              label="Make/Brand"
              rules={[{ required: true, message: "Brand name is required" }]}
            >
              <Input placeholder="e.g. Audi" />
            </Form.Item>

            <Form.Item
              name="model"
              label="Model"
              rules={[{ required: true, message: "Model is required" }]}
            >
              <Input placeholder="e.g. A4" />
            </Form.Item>
          </div>

          <Form.Item
            name="variant"
            label="Variant"
            rules={[{ required: true, message: "Variant name is required" }]}
          >
            <Input placeholder="e.g. 35 TDI Premium Plus" />
          </Form.Item>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item
              name="year"
              label="Manufacturing Year"
              rules={[{ required: true, message: "Year is required" }]}
            >
              <InputNumber min={1900} max={2100} className="w-full" />
            </Form.Item>

            <Form.Item name="fuel_type" label="Fuel Type">
              <Select placeholder="Select fuel">
                <Option value="Petrol">Petrol</Option>
                <Option value="Diesel">Diesel</Option>
                <Option value="CNG">CNG</Option>
                <Option value="Electric">Electric</Option>
              </Select>
            </Form.Item>

            <Form.Item name="transmission" label="Transmission">
              <Select placeholder="Select trans">
                <Option value="Manual">Manual</Option>
                <Option value="Automatic">Automatic</Option>
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="cc" label="Engine (cc)">
              <InputNumber className="w-full" />
            </Form.Item>

            <Form.Item name="mileage" label="Mileage (kmpl)">
              <Input placeholder="e.g. 18.2" />
            </Form.Item>

            <Form.Item name="seating_capacity" label="Seating Capacity">
              <Input placeholder="e.g. 5 Person" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="body_type" label="Body Type">
              <Input placeholder="e.g. Sedan, SUV" />
            </Form.Item>

            <Form.Item name="ex_showroom_price" label="Ex-Showroom Price">
              <InputNumber className="w-full" placeholder="Price in ₹" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="start_year" label="Production Start Year">
              <InputNumber className="w-full" />
            </Form.Item>

            <Form.Item name="end_year" label="Production End Year">
              <InputNumber className="w-full" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="carwale_make_slug" label="Carwale Make Slug">
              <Input />
            </Form.Item>

            <Form.Item name="carwale_model_slug" label="Carwale Model Slug">
              <Input />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="carwale_version_id" label="Carwale Version ID">
              <InputNumber className="w-full" />
            </Form.Item>

            <Form.Item name="model_generation" label="Model Generation">
              <Input placeholder="e.g. A4 [2016-2021]" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="is_active" label="Is Active" valuePropName="checked">
              <Select defaultValue={true}>
                <Option value={true}>Active</Option>
                <Option value={false}>Inactive</Option>
              </Select>
            </Form.Item>

            <Form.Item name="is_discontinued" label="Is Discontinued" valuePropName="checked">
              <Select defaultValue={false}>
                <Option value={true}>Discontinued</Option>
                <Option value={false}>Production Active</Option>
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>
      </div>
    </div>
  );
}
