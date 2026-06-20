import React, { useState, useEffect, useCallback } from "react";
import { Table, Tag, Space, Input, Select, Modal, Form, InputNumber, Popconfirm, message } from "antd";
import { usedCarsDbApi } from "../../../api/usedCars";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import { formatINR } from "../../../utils/currency";

const { Option } = Select;

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
  const [filters, setFilters] = useState({
    make: "",
    year: "",
    transmission: "",
    fuel_type: "",
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
  });

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
        q: debouncedSearch,
        make: filters.make || undefined,
        year: filters.year || undefined,
        transmission: filters.transmission || undefined,
        fuel_type: filters.fuel_type || undefined,
      };

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
  }, [debouncedSearch, filters, pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Used Cars Master DB</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse, filter, and manage the master database of variants by manufacturing year.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            iconName="RefreshCcw"
            onClick={() => {
              fetchCars();
              fetchStats();
            }}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            iconName="Plus"
            onClick={handleOpenAddModal}
          >
            Add New Row
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Records" value={total} iconName="Layers" />
        <StatCard title="Total Models in Database" value={stats.totalCount} iconName="Car" iconColor="text-blue-500" />
        <StatCard title="Active Configurations" value="Yes" iconName="CheckCircle2" iconColor="text-success" />
      </div>

      {/* Filter and Search controls */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by make, model, variant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              prefix={<Icon name="Search" size={16} className="text-muted-foreground mr-1" />}
              suffix={
                searchQuery && (
                  <Icon
                    name="X"
                    size={16}
                    className="text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => setSearchQuery("")}
                  />
                )
              }
              className="h-10 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select
              allowClear
              placeholder="Fuel Type"
              className="h-10 w-full"
              onChange={(val) => handleFilterChange("fuel_type", val)}
            >
              <Option value="Petrol">Petrol</Option>
              <Option value="Diesel">Diesel</Option>
              <Option value="CNG">CNG</Option>
              <Option value="Electric">Electric</Option>
            </Select>

            <Select
              allowClear
              placeholder="Transmission"
              className="h-10 w-full"
              onChange={(val) => handleFilterChange("transmission", val)}
            >
              <Option value="Manual">Manual</Option>
              <Option value="Automatic">Automatic</Option>
            </Select>

            <Input
              placeholder="Mfg Year"
              type="number"
              className="h-10 w-full"
              onChange={(e) => handleFilterChange("year", e.target.value)}
            />

            <Input
              placeholder="Brand/Make"
              className="h-10 w-full"
              onChange={(e) => handleFilterChange("make", e.target.value)}
            />
          </div>
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
