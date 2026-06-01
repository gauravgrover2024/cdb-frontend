import React, { useState, useEffect } from "react";
import { Popconfirm, Table, Tag, Input, message } from "antd";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import { vehiclesApi } from "../../api/vehicles";
import VehicleFormModal from "../vehicles/VehicleFormModal";

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, iconName, color = "text-primary" }) => (
  <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
    </div>
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 ${color}`}
    >
      <Icon name={iconName} size={20} />
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FleetVehicleMaster() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // ── Fetch all records from the backend ────────────────────────────────────
  const fetchVehicles = async (query = "") => {
    setLoading(true);
    try {
      const params = query ? { q: query, limit: 200 } : { limit: 200 };
      const res = await vehiclesApi.getMasterRecords(params);

      if (res?.data && Array.isArray(res.data)) {
        const mapped = res.data.map((item) => ({
          id: item._id,
          _id: item._id,
          make: item.make || item.brand || "—",
          model: item.model || item.vehicleModel || "—",
          variant: item.variant || item.version || "—",
          fuel:
            item.fuel ||
            item.fuelType ||
            item.fuel_type ||
            item.fuelType ||
            "—",
          year: item.yearOfManufacture || item.year || "—",
          chassis: item.chassisNumber || item.rc_chassis_no || "—",
          engine: item.engineNumber || item.rc_engine_no || "—",
          registrationNumber:
            item.registrationNumber ||
            item.registrationNumberNormalized ||
            item.regNo ||
            item.vehicleRegNo ||
            item.vehicleNumber ||
            item.rc_redg_no ||
            "",
          license_plate:
            item.registrationNumber ||
            item.registrationNumberNormalized ||
            item.regNo ||
            item.vehicleRegNo ||
            item.vehicleNumber ||
            item.rc_redg_no ||
            "N/A",
          city: item.registrationCity || item.city || "—",
          status:
            item.status ||
            (item.isDiscontinued === true ? "Inactive" : "Active") ||
            "Active",
        }));
        setVehicles(mapped);
      } else {
        setVehicles([]);
      }
    } catch (err) {
      console.error("Fleet load error:", err);
      message.error("Failed to load fleet data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleSave = async (values) => {
    try {
      setModalLoading(true);
      if (editingVehicle && editingVehicle._id) {
        await vehiclesApi.update(editingVehicle._id, values);
        message.success("Vehicle updated successfully");
      } else {
        await vehiclesApi.create(values);
        message.success("Vehicle created successfully");
      }
      setIsModalOpen(false);
      setEditingVehicle(null);
      fetchVehicles(searchText);
    } catch (err) {
      console.error("Save vehicle error:", err);
      message.error("Failed to save vehicle");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await vehiclesApi.delete(id);
      message.success("Vehicle deleted successfully");
      fetchVehicles(searchText);
    } catch (err) {
      console.error("Delete vehicle error:", err);
      message.error("Failed to delete vehicle");
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // ── Local search filter ───────────────────────────────────────────────────
  const q = searchText.trim().toLowerCase();
  const filteredVehicles = q
    ? vehicles.filter((v) =>
        [
          v.make,
          v.model,
          v.variant,
          v.registrationNumber,
          v.license_plate,
          v.city,
          v.fuel,
          v.year,
        ].some((f) =>
          String(f || "")
            .toLowerCase()
            .includes(q),
        ),
      )
    : vehicles;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const uniqueMakes = [...new Set(vehicles.map((v) => v.make).filter(Boolean))]
    .length;
  const activeVehicles = vehicles.reduce(
    (count, v) =>
      String(v.status || "").toLowerCase() === "active" ? count + 1 : count,
    0,
  );
  const inactiveVehicles = vehicles.length - activeVehicles;

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
          <span className="text-muted-foreground text-xs italic">
            Not Registered
          </span>
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
            <div className="text-xs text-muted-foreground truncate max-w-[180px]">
              {record.variant}
            </div>
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
            <Tag
              color={
                record.fuel.toLowerCase().includes("petrol")
                  ? "orange"
                  : record.fuel.toLowerCase().includes("electric")
                    ? "green"
                    : "blue"
              }
              className="text-[10px] w-fit"
            >
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
          <span className="font-mono text-xs text-muted-foreground">
            {text}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag
          color={
            String(status || "").toLowerCase() === "active" ? "green" : "orange"
          }
        >
          {status}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      render: (_, record) => {
        const vehicleId = record._id || record.id;
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              iconName="Edit3"
              onClick={() => handleEdit(record)}
            >
              Edit
            </Button>
            <Popconfirm
              title="Delete this vehicle?"
              onConfirm={() => handleDelete(vehicleId)}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button size="sm" variant="ghost" iconName="Trash2" />
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full p-4 md:p-6 bg-background">
      <div className="app-max-wrap flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Fleet Vehicle Master
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Consolidated view of all fleet vehicles and assignments.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            iconName="Plus"
            onClick={handleCreate}
          >
            Add Vehicle
          </Button>
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
          <StatCard
            title="Total Vehicles"
            value={vehicles.length}
            iconName="Car"
            color="text-primary"
          />
          <StatCard
            title="Unique Makes"
            value={uniqueMakes}
            iconName="Building2"
            color="text-blue-500"
          />
          <StatCard
            title="Active"
            value={activeVehicles}
            iconName="CheckCircle"
            color="text-emerald-500"
          />
          <StatCard
            title="Inactive"
            value={inactiveVehicles}
            iconName="Slash"
            color="text-amber-500"
          />
        </div>

        {/* Search */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <Input
            placeholder="Search by registration, make, model, city, fuel, year..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={
              <Icon name="Search" size={15} className="text-muted-foreground" />
            }
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
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              showTotal: (total) => `${total} records`,
            }}
            locale={{
              emptyText: loading ? "Loading..." : "No fleet records found",
            }}
          />
        </div>

        <VehicleFormModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingVehicle(null);
          }}
          onSave={handleSave}
          loading={modalLoading}
          initialValues={editingVehicle}
        />
      </div>
    </div>
  );
}
