import React, { useState, useEffect } from "react";
import { Popover, Table, Tag, Input, Modal, Form, Select, DatePicker, message } from "antd";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import { apiClient } from "../../api/client";

const { Option } = Select;

// ── User Quick-View Popover ────────────────────────────────────────────────────
const UserQuickView = ({ user }) => {
  if (!user || !user.name) return <span className="text-muted-foreground">—</span>;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const content = (
    <div className="w-60 p-1">
      <div className="flex items-center gap-3 border-b border-border pb-3 mb-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold m-0 truncate">{user.name}</h4>
          <p className="text-xs text-muted-foreground m-0">{user.role || "Customer"}</p>
        </div>
      </div>
      <div className="space-y-2 text-xs">
        {user.phone && user.phone !== "N/A" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon name="Phone" size={13} className="shrink-0" />
            <span className="text-foreground font-medium">{user.phone}</span>
          </div>
        )}
        {user.loanId && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon name="FileText" size={13} className="shrink-0" />
            <span className="text-foreground font-mono">{user.loanId}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="right">
      <span className="cursor-pointer text-primary font-medium hover:underline flex items-center gap-1.5 w-fit">
        <Icon name="UserCircle" size={15} />
        {user.name}
      </span>
    </Popover>
  );
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, iconName, color = "text-primary" }) => (
  <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
    </div>
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 ${color}`}>
      <Icon name={iconName} size={20} />
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FleetVehicleMaster() {
  const [vehicles, setVehicles]                 = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [searchText, setSearchText]             = useState("");
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle]   = useState(null);
  const [form]                                  = Form.useForm();

  // ── Fetch all records from the backend ────────────────────────────────────
  const fetchVehicles = async (query = "") => {
    setLoading(true);
    try {
      const endpoint = query.trim()
        ? `/api/vehicles/records/search?q=${encodeURIComponent(query)}&limit=200`
        : `/api/vehicles/records/search?all=true&limit=200`;

      const res = await apiClient.get(endpoint);

      if (res?.success && Array.isArray(res.data)) {
        // Map VehicleRecord schema → fleet UI model
        const mapped = res.data
          .filter((item) => item.make || item.registrationNumber) // skip totally empty
          .map((item) => ({
            id:             item._id,
            make:           item.make || "—",
            model:          item.model || "—",
            variant:        item.variant || "",
            fuel:           item.fuelType || "—",
            year:           item.yearOfManufacture || "—",
            chassis:        item.chassisNumber || "—",
            engine:         item.engineNumber || "—",
            license_plate:  item.registrationNumber || "N/A",
            city:           item.registrationCity || "—",
            reg_date:       item.registrationDate
                              ? new Date(item.registrationDate).toLocaleDateString("en-IN")
                              : "—",
            status:         "Active",
            assigned_user:  item.customerName
                              ? { name: item.customerName, phone: item.primaryMobile || "", loanId: item.loanId }
                              : null,
          }));
        setVehicles(mapped);
      } else {
        setVehicles([]);
      }
    } catch (err) {
      console.error("Fleet fetch error:", err);
      message.error("Failed to load fleet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  // ── Local search filter ───────────────────────────────────────────────────
  const q = searchText.trim().toLowerCase();
  const filteredVehicles = q
    ? vehicles.filter((v) =>
        [v.make, v.model, v.variant, v.license_plate, v.city, v.assigned_user?.name, v.fuel, v.year]
          .some((f) => String(f || "").toLowerCase().includes(q))
      )
    : vehicles;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const uniqueMakes   = [...new Set(vehicles.map((v) => v.make).filter(Boolean))].length;
  const assigned      = vehicles.filter((v) => v.assigned_user).length;
  const unassigned    = vehicles.length - assigned;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleScheduleMaintenance = (vehicle) => {
    setSelectedVehicle(vehicle);
    form.resetFields();
    setIsMaintenanceModalOpen(true);
  };

  const onFinishMaintenance = () => {
    message.success(`Maintenance scheduled for ${selectedVehicle.license_plate}`);
    setIsMaintenanceModalOpen(false);
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      title: "Registration No.",
      dataIndex: "license_plate",
      key: "license_plate",
      render: (text) =>
        text && text !== "N/A" ? (
          <span className="bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-mono text-xs px-2 py-0.5 rounded border border-amber-200 dark:border-amber-700 font-bold">
            {text}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs italic">Not Registered</span>
        ),
    },
    {
      title: "Make & Model",
      key: "makeModel",
      render: (_, record) => (
        <div>
          <div className="font-semibold text-foreground text-sm">
            {record.make} {record.model}
          </div>
          {record.variant && (
            <div className="text-xs text-muted-foreground truncate max-w-[180px]">{record.variant}</div>
          )}
        </div>
      ),
    },
    {
      title: "Fuel / Year",
      key: "fuelYear",
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          {record.fuel && record.fuel !== "—" && (
            <Tag color={record.fuel.toLowerCase().includes("petrol") ? "orange" : record.fuel.toLowerCase().includes("electric") ? "green" : "blue"} className="text-[10px] w-fit">
              {record.fuel}
            </Tag>
          )}
          <span className="text-xs text-muted-foreground">{record.year}</span>
        </div>
      ),
    },
    {
      title: "City",
      dataIndex: "city",
      key: "city",
      render: (text) => <span className="text-sm">{text}</span>,
    },
    {
      title: "Chassis No.",
      dataIndex: "chassis",
      key: "chassis",
      render: (text) =>
        text && text !== "—" ? (
          <span className="font-mono text-xs text-muted-foreground">{text}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <Tag color="green">{status}</Tag>,
    },
    {
      title: "Customer",
      key: "assigned_user",
      render: (_, record) => <UserQuickView user={record.assigned_user} />,
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_, record) => (
        <Button
          size="sm"
          variant="ghost"
          iconName="Wrench"
          onClick={() => handleScheduleMaintenance(record)}
          title="Schedule Maintenance"
        />
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full p-4 md:p-6 bg-background">
      <div className="app-max-wrap flex flex-col gap-5">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Fleet Vehicle Master</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Consolidated view of all fleet vehicles, assignments, and maintenance status.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            iconName="RefreshCcw"
            loading={loading}
            onClick={() => fetchVehicles()}
          >
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Total Vehicles"  value={vehicles.length} iconName="Car"        color="text-primary"       />
          <StatCard title="Unique Makes"    value={uniqueMakes}     iconName="Building2"  color="text-blue-500"      />
          <StatCard title="Assigned"        value={assigned}        iconName="UserCheck"  color="text-emerald-500"   />
          <StatCard title="Unassigned"      value={unassigned}      iconName="UserMinus"  color="text-amber-500"     />
        </div>

        {/* Search */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <Input
            placeholder="Search by registration, make, model, city, customer..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<Icon name="Search" size={15} className="text-muted-foreground" />}
            suffix={
              searchText && (
                <Icon
                  name="X"
                  size={14}
                  className="text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => setSearchText("")}
                />
              )
            }
            className="max-w-lg h-9"
          />
          <span className="text-xs text-muted-foreground shrink-0">
            {filteredVehicles.length} of {vehicles.length}
          </span>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table
            dataSource={filteredVehicles}
            columns={columns}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (total) => `${total} records` }}
            locale={{ emptyText: loading ? "Loading..." : "No fleet records found" }}
          />
        </div>

      </div>

      {/* Schedule Maintenance Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Icon name="Wrench" size={16} className="text-primary" />
            Schedule Maintenance
            {selectedVehicle && (
              <span className="text-xs font-mono text-muted-foreground ml-1">
                — {selectedVehicle.license_plate}
              </span>
            )}
          </div>
        }
        open={isMaintenanceModalOpen}
        onCancel={() => setIsMaintenanceModalOpen(false)}
        footer={null}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={onFinishMaintenance} className="mt-4">
          <Form.Item label="Service Type" name="serviceType" rules={[{ required: true, message: "Select a service type" }]}>
            <Select placeholder="Select service type">
              <Option value="oil_change">Oil Change</Option>
              <Option value="tire_rotation">Tire Rotation</Option>
              <Option value="engine_repair">Engine Repair</Option>
              <Option value="inspection">General Inspection</Option>
              <Option value="battery">Battery / Charging</Option>
              <Option value="brakes">Brake Service</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Scheduled Date" name="date" rules={[{ required: true, message: "Pick a date" }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} placeholder="Describe the issue or service required..." />
          </Form.Item>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsMaintenanceModalOpen(false)}>Cancel</Button>
            <Button variant="default" htmlType="submit">Confirm Schedule</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
