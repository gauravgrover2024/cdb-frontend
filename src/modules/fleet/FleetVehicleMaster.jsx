import React, { useState, useEffect, useMemo } from "react";
import { Popconfirm, Table, Tag, Input, Select, message } from "antd";
import dayjs from "dayjs";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import { vehiclesApi } from "../../api/vehicles";
import VehicleFormModal from "../vehicles/VehicleFormModal";

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (v) => String(v || "").trim();
const dash = (v) => fmt(v) || "—";

const fuelColor = (fuel) => {
  const f = fmt(fuel).toLowerCase();
  if (f.includes("electric")) return "green";
  if (f.includes("petrol")) return "orange";
  if (f.includes("diesel")) return "blue";
  if (f.includes("cng") || f.includes("hybrid")) return "cyan";
  return "default";
};

const sourceColor = (type) => {
  const t = fmt(type).toLowerCase();
  if (t.includes("insurance")) return "purple";
  if (t.includes("loan")) return "blue";
  if (t.includes("delivery")) return "cyan";
  return "default";
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, sub, iconName, color = "text-primary" }) => (
  <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between min-w-0">
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
      <p className="text-2xl font-bold text-foreground font-mono leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
    </div>
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 ${color} shrink-0 ml-3`}>
      <Icon name={iconName} size={20} />
    </div>
  </div>
);

// ── Map raw API row → display record ──────────────────────────────────────────
const mapRecord = (item) => ({
  id:                   item._id,
  _id:                  item._id,
  loanId:               fmt(item.loanId),
  customerName:         fmt(item.customerName),
  primaryMobile:        fmt(item.primaryMobile),
  make:                 dash(item.make),
  model:                dash(item.model),
  variant:              fmt(item.variant),
  fuelType:             fmt(item.fuelType),
  typesOfVehicle:       fmt(item.typesOfVehicle),
  yearOfManufacture:    fmt(item.yearOfManufacture),
  manufactureMonth:     fmt(item.manufactureMonth),
  chassisNumber:        fmt(item.chassisNumber),
  engineNumber:         fmt(item.engineNumber),
  registrationNumber:   fmt(item.registrationNumber || item.registrationNumberNormalized),
  registrationCity:     fmt(item.registrationCity),
  registrationDate:     item.registrationDate || null,
  hypothecation:        fmt(item.hypothecation),
  regAuthority:         fmt(item.regAuthority),
  batteryNumber:        fmt(item.batteryNumber),
  chargerNumber:        fmt(item.chargerNumber),
  cubicCapacityCc:      item.cubicCapacityCc || null,
  sourceLoanType:       fmt(item.sourceLoanType),
  sourceCaseType:       fmt(item.sourceCaseType),
  lastSyncedAt:         item.lastSyncedAt || item.updatedAt || null,
});

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FleetVehicleMaster() {
  const [vehicles, setVehicles]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [searchText, setSearchText]         = useState("");
  const [filterMake, setFilterMake]         = useState(null);
  const [filterFuel, setFilterFuel]         = useState(null);
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [modalLoading, setModalLoading]     = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await vehiclesApi.getMasterRecords({ all: true, limit: 500 });
      const raw = Array.isArray(res?.data) ? res.data : [];
      setVehicles(raw.map(mapRecord));
    } catch (err) {
      console.error("Fleet load error:", err);
      message.error("Failed to load fleet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  // ── Filter options ────────────────────────────────────────────────────────
  const makeOptions = useMemo(() => {
    const makes = [...new Set(vehicles.map((v) => v.make).filter((m) => m && m !== "—"))].sort();
    return makes.map((m) => ({ label: m, value: m }));
  }, [vehicles]);

  const fuelOptions = useMemo(() => {
    const fuels = [...new Set(vehicles.map((v) => v.fuelType).filter(Boolean))].sort();
    return fuels.map((f) => ({ label: f, value: f }));
  }, [vehicles]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredVehicles = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (filterMake && v.make !== filterMake) return false;
      if (filterFuel && v.fuelType !== filterFuel) return false;
      if (!q) return true;
      return [
        v.registrationNumber, v.customerName, v.primaryMobile,
        v.make, v.model, v.variant, v.loanId,
        v.registrationCity, v.chassisNumber, v.engineNumber,
        v.yearOfManufacture, v.fuelType,
      ].some((f) => String(f || "").toLowerCase().includes(q));
    });
  }, [vehicles, searchText, filterMake, filterFuel]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const uniqueMakes  = useMemo(() => new Set(vehicles.map((v) => v.make).filter((m) => m !== "—")).size, [vehicles]);
  const uniqueCities = useMemo(() => new Set(vehicles.map((v) => v.registrationCity).filter(Boolean)).size, [vehicles]);
  const linkedToLoan = useMemo(() => vehicles.filter((v) => v.loanId).length, [vehicles]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleCreate = () => { setEditingVehicle(null); setIsModalOpen(true); };
  const handleEdit   = (v)  => { setEditingVehicle(v);  setIsModalOpen(true); };

  const handleSave = async (values) => {
    try {
      setModalLoading(true);
      if (editingVehicle?._id) {
        await vehiclesApi.update(editingVehicle._id, values);
        message.success("Vehicle updated");
      } else {
        await vehiclesApi.create(values);
        message.success("Vehicle created");
      }
      setIsModalOpen(false);
      setEditingVehicle(null);
      fetchVehicles();
    } catch (err) {
      console.error(err);
      message.error("Failed to save vehicle");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await vehiclesApi.delete(id);
      message.success("Vehicle deleted");
      fetchVehicles();
    } catch (err) {
      console.error(err);
      message.error("Failed to delete vehicle");
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      title: "Reg. No.",
      dataIndex: "registrationNumber",
      key: "reg",
      width: 130,
      render: (text) =>
        text ? (
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700">
            {text}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs italic">Unregistered</span>
        ),
    },
    {
      title: "Vehicle",
      key: "vehicle",
      render: (_, r) => (
        <div className="min-w-0">
          <div className="font-semibold text-sm text-foreground leading-tight">
            {r.make} {r.model}
          </div>
          {r.variant && (
            <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{r.variant}</div>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {r.fuelType && (
              <Tag color={fuelColor(r.fuelType)} className="text-[10px] m-0 leading-tight px-1.5">
                {r.fuelType}
              </Tag>
            )}
            {r.typesOfVehicle && r.typesOfVehicle !== "Four Wheeler" && (
              <Tag color="default" className="text-[10px] m-0 leading-tight px-1.5">
                {r.typesOfVehicle}
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Year / City",
      key: "yearCity",
      width: 120,
      render: (_, r) => (
        <div className="text-sm">
          {r.yearOfManufacture && (
            <div className="font-medium text-foreground">{r.yearOfManufacture}</div>
          )}
          {r.registrationCity && (
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Icon name="MapPin" size={10} />
              {r.registrationCity}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Owner",
      key: "owner",
      render: (_, r) => (
        <div className="min-w-0">
          {r.customerName ? (
            <>
              <div className="text-sm font-medium text-foreground truncate max-w-[160px]">{r.customerName}</div>
              {r.primaryMobile && (
                <div className="text-xs text-muted-foreground font-mono">{r.primaryMobile}</div>
              )}
            </>
          ) : (
            <span className="text-muted-foreground text-xs italic">No owner</span>
          )}
          {r.loanId && (
            <div className="text-[10px] text-blue-500 mt-0.5 font-mono">#{r.loanId}</div>
          )}
        </div>
      ),
    },
    {
      title: "Chassis / Engine",
      key: "ids",
      render: (_, r) => (
        <div className="font-mono text-[11px] text-muted-foreground space-y-0.5">
          {r.chassisNumber && (
            <div className="truncate max-w-[150px]" title={r.chassisNumber}>{r.chassisNumber}</div>
          )}
          {r.engineNumber && (
            <div className="truncate max-w-[150px]" title={r.engineNumber}>{r.engineNumber}</div>
          )}
          {!r.chassisNumber && !r.engineNumber && <span>—</span>}
        </div>
      ),
    },
    {
      title: "Source / Synced",
      key: "source",
      width: 120,
      render: (_, r) => {
        const type = r.sourceCaseType || r.sourceLoanType;
        const synced = r.lastSyncedAt ? dayjs(r.lastSyncedAt).format("DD MMM YY") : null;
        return (
          <div className="space-y-1">
            {type && (
              <Tag color={sourceColor(type)} className="text-[10px] m-0 leading-tight px-1.5 capitalize">
                {type}
              </Tag>
            )}
            {synced && (
              <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Icon name="RefreshCcw" size={9} />
                {synced}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_, r) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" iconName="Edit3" onClick={() => handleEdit(r)} />
          <Popconfirm
            title="Delete this vehicle record?"
            onConfirm={() => handleDelete(r._id)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button size="sm" variant="ghost" iconName="Trash2" />
          </Popconfirm>
        </div>
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
              Consolidated vehicle registry — auto-synced from loans &amp; insurance.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" iconName="Plus" onClick={handleCreate}>
              Add Vehicle
            </Button>
            <Button variant="outline" size="sm" iconName="RefreshCcw" loading={loading} onClick={fetchVehicles}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Total Records"  value={vehicles.length} iconName="Car"       color="text-primary"     />
          <StatCard title="Unique Makes"   value={uniqueMakes}     iconName="Building2" color="text-blue-500"    />
          <StatCard title="Cities"         value={uniqueCities}    iconName="MapPin"    color="text-emerald-500" />
          <StatCard
            title="Loan-linked"
            value={linkedToLoan}
            sub={`${vehicles.length - linkedToLoan} standalone`}
            iconName="Link2"
            color="text-violet-500"
          />
        </div>

        {/* Search + Filters */}
        <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search reg no., owner, mobile, make, model, chassis…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<Icon name="Search" size={14} className="text-muted-foreground" />}
            suffix={
              searchText ? (
                <Icon
                  name="X" size={13}
                  className="text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => setSearchText("")}
                />
              ) : null
            }
            className="flex-1 min-w-[200px] max-w-sm h-9"
          />
          <Select
            allowClear
            placeholder="All Makes"
            value={filterMake}
            onChange={setFilterMake}
            options={makeOptions}
            className="w-36 h-9"
            popupMatchSelectWidth={false}
          />
          <Select
            allowClear
            placeholder="All Fuel"
            value={filterFuel}
            onChange={setFilterFuel}
            options={fuelOptions}
            className="w-32 h-9"
            popupMatchSelectWidth={false}
          />
          <span className="text-xs text-muted-foreground shrink-0 ml-auto">
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
              pageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => `${total} records`,
            }}
            locale={{ emptyText: loading ? "Loading…" : "No vehicle records found" }}
            scroll={{ x: 900 }}
          />
        </div>

      </div>

      <VehicleFormModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingVehicle(null); }}
        onSave={handleSave}
        loading={modalLoading}
        initialValues={editingVehicle}
      />
    </div>
  );
}
