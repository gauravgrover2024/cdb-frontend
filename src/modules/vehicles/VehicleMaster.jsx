import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Space,
  Tag,
  message,
  Popconfirm,
  Collapse,
  Input,
} from "antd";
import * as XLSX from "xlsx";
import { vehiclesApi } from "../../api/vehicles";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import VehicleFormModal from "./VehicleFormModal";
import { formatINR } from "../../utils/currency";

/** Build unique key for (make, model, variant, fuel, city) to match backend bulk upsert */
const vehicleKey = (v) =>
  [v.make || "", v.model || "", v.variant || "", v.fuel || "", v.city || ""].join("|");

/** Map one Excel row to vehicle payload; normalize numbers and strings */
const mapExcelRowToVehicle = (row) => {
  const make = (row.Make ?? row.make ?? row.Brand ?? row.brand ?? "").toString().trim();
  const model = (row.Model ?? row.model ?? row.Name ?? row.name ?? "").toString().trim();
  const variant = (row.Variant ?? row.variant ?? row.Version ?? row.version ?? "Standard").toString().trim();
  const fuel = (row.Fuel ?? row["Fuel Type"] ?? row.FuelType ?? "N/A").toString().trim() || "N/A";
  const city = (row.City ?? row.city ?? "Delhi").toString().trim() || "Delhi";
  const num = (val) => (val === "" || val == null ? 0 : Number(val));
  return {
    make,
    model,
    variant,
    fuel,
    city,
    exShowroom: num(row.ExShowroom ?? row["Ex-Showroom Price"] ?? row.ExShowroomPrice ?? row.Price),
    rto: num(row.RTO ?? row.rto),
    insurance: num(row.Insurance ?? row.insurance),
    otherCharges: num(row.OtherCharges ?? row["Other Charges"]),
    onRoadPrice: num(row.OnRoadPrice ?? row["On-Road Price"]),
    status: "Active",
    isDiscontinued: false,
  };
};

const StatCard = ({ title, value, iconName, iconColor = "text-primary" }) => (
  <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
      <p className="text-xl font-bold font-mono tracking-tight text-foreground truncate">{value}</p>
    </div>
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 shrink-0 ${iconColor}`}>
      <Icon name={iconName} size={20} className={iconColor} />
    </div>
  </div>
);

const VehicleMaster = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10
  });

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const res = await vehiclesApi.getAll();
      setVehicles(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Load Vehicles Error:", err);
      message.error("Failed to load vehicle inventory ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleCreate = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingVehicle(record);
    setIsModalOpen(true);
  };

  const handleSave = async (values) => {
    try {
      setModalLoading(true);
      if (editingVehicle) {
        await vehiclesApi.update(editingVehicle._id, values);
        message.success("Vehicle updated ✅");
      } else {
        await vehiclesApi.create(values);
        message.success("Vehicle added to inventory ✅");
      }
      setIsModalOpen(false);
      loadVehicles();
    } catch (err) {
      message.error(err.response?.data?.message || "Operation failed ❌");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await vehiclesApi.delete(id);
      message.success("Vehicle removed ❌");
      loadVehicles();
    } catch (err) {
      message.error("Delete failed ❌");
    }
  };

  const handleImportExcel = async (file) => {
    if (!file || !file.name?.toLowerCase().endsWith(".xlsx")) {
      message.warning("Please select an .xlsx file");
      return;
    }
    try {
      setImportLoading(true);
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws);
      if (!rows.length) {
        message.warning("No rows found in the Excel file");
        return;
      }
      const keysInDb = new Set(vehicles.map((v) => vehicleKey(v)));
      const parsed = rows
        .map(mapExcelRowToVehicle)
        .filter((v) => v.make && v.model && v.variant);
      // Skip rows without fuel or ex-showroom (match backend import rules)
      const withFuelAndPrice = parsed.filter((v) => {
        const hasFuel = (v.fuel || "").trim() && (v.fuel || "").trim() !== "N/A";
        const hasExShowroom = v.exShowroom != null && Number(v.exShowroom) > 0;
        return hasFuel && hasExShowroom;
      });
      const toInsert = withFuelAndPrice.filter((v) => !keysInDb.has(vehicleKey(v)));
      const alreadyExisted = withFuelAndPrice.length - toInsert.length;
      const skippedInvalid = parsed.length - withFuelAndPrice.length;
      if (toInsert.length === 0) {
        const msg =
          withFuelAndPrice.length === 0
            ? `No valid rows to import (need Make, Model, Variant, Fuel and Ex-Showroom price).${skippedInvalid ? ` ${parsed.length} row(s) skipped (missing fuel or ex-showroom).` : ""}`
            : skippedInvalid > 0
              ? `All ${withFuelAndPrice.length} valid row(s) already in DB. ${skippedInvalid} row(s) skipped (missing fuel or ex-showroom).`
              : `All ${parsed.length} row(s) already exist in the database.`;
        message.info(msg);
        return;
      }
      const res = await vehiclesApi.bulkUpload(toInsert);
      const data = res?.data ?? {};
      const inserted = data.inserted ?? toInsert.length;
      const updated = data.updated ?? 0;
      message.success(
        `Imported ${inserted} new vehicle(s). ${updated} updated. ${alreadyExisted} already existed.${skippedInvalid ? ` ${skippedInvalid} row(s) skipped (missing fuel or ex-showroom).` : ""}`
      );
      loadVehicles();
    } catch (err) {
      message.error(err.response?.data?.message || "Import failed");
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return vehicles;

    return vehicles.filter(v => 
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.variant.toLowerCase().includes(q) ||
      (v.city && v.city.toLowerCase().includes(q))
    );
  }, [searchText, vehicles]);

  const columns = [
    {
      title: "Vehicle Details",
      key: "vehicle",
      width: 300,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">{record.make} {record.model}</span>
            <Tag className="m-0 text-[10px] font-bold px-1.5 py-0 border-none bg-primary/10 text-primary uppercase">
                {record.fuel || "—"}
            </Tag>
            {record.isDiscontinued && (
              <Tag color="red" className="m-0 text-[10px] font-bold px-1.5 py-0">
                Discontinued
              </Tag>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-medium italic">
            {record.variant}
          </div>
          {record.city && (
             <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1 opacity-70">
                <Icon name="MapPin" size={10} />
                <span>{record.city}</span>
             </div>
          )}
        </Space>
      ),
    },
    {
      title: "Ex-Showroom",
      dataIndex: "exShowroom",
      key: "exShowroom",
      render: (v) => (
        <span className="font-mono text-sm">
          {v != null && Number(v) > 0 ? formatINR(v) : "—"}
        </span>
      ),
    },
    {
      title: "On-Road Price",
      dataIndex: "onRoadPrice",
      key: "onRoadPrice",
      render: (v) => (
        <span className="font-mono text-sm font-bold text-primary">
          {v != null && Number(v) > 0 ? formatINR(v) : "—"}
        </span>
      ),
    },
    {
       title: "Status",
       dataIndex: "status",
       key: "status",
       render: (status) => (
         <div className={`
            inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide
            ${status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}
         `}>
           {status}
         </div>
       )
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "right",
      render: (_, record) => (
        <Space size={2}>
            <Button
              size="sm"
              variant="ghost"
              iconName="Edit3"
              onClick={() => handleEdit(record)}
            />
          <Popconfirm
            title="Remove from inventory?"
            onConfirm={() => handleDelete(record._id)}
            okText="Delete"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
             <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:bg-red-50 hover:text-red-700"
                iconName="Trash2"
              />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Calculate statistics
  const totalValue = vehicles.reduce((acc, curr) => acc + (curr.onRoadPrice || 0), 0);
  const totalVariations = vehicles.length;
  const activeModels = vehicles.filter(v => v.status === 'Active').length;
  
  // Get unique makes, models, and variants
  const uniqueMakes = [...new Set(vehicles.map(v => v.make))].sort();
  const uniqueModels = [...new Set(vehicles.map(v => v.model))].sort();
  const makeStats = useMemo(() => {
    const stats = {};
    vehicles.forEach(v => {
      if (!stats[v.make]) {
        stats[v.make] = {
          make: v.make,
          models: new Set(),
          variants: [],
          totalActive: 0,
          totalValue: 0
        };
      }
      stats[v.make].models.add(v.model);
      stats[v.make].variants.push(v);
      if (v.status === 'Active') stats[v.make].totalActive++;
      stats[v.make].totalValue += v.onRoadPrice || 0;
    });
    return Object.values(stats).sort((a, b) => a.make.localeCompare(b.make));
  }, [vehicles]);

  return (
    <div className="min-h-full p-4 md:p-6 bg-background">
      {/* Outer page card */}
      <div className="max-w-[1600px] mx-auto flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Vehicle Inventory
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage master records for makes, models, variants and pricing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportExcel(f);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              iconName="Upload"
              loading={importLoading}
              onClick={() => fileInputRef.current?.click()}
            >
              Import Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconName="DollarSign"
              onClick={() => window.location.href = "/vehicles/price-list"}
            >
              Price List
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconName="RefreshCcw"
              onClick={loadVehicles}
              loading={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Inner card: Add Vehicle CTA */}
        <div
          className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-dashed hover:border-primary/50 hover:bg-primary/[0.02] transition-colors"
          role="button"
          tabIndex={0}
          onClick={handleCreate}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon name="Plus" size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Add Vehicle</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Add a new make, model, variant and pricing to the inventory.
              </p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            iconName="Plus"
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleCreate();
            }}
          >
            Add Vehicle
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Total Vehicles" value={totalVariations} iconName="Layers" />
          <StatCard title="Total Models" value={uniqueModels.length} iconName="Car" />
          <StatCard title="Total Makes" value={uniqueMakes.length} iconName="Building2" />
          <StatCard title="Active Vehicles" value={activeModels} iconName="CheckCircle2" iconColor="text-success" />
        </div>

        {/* Search Bar */}
        <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by make, model, variant, or city..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<Icon name="Search" size={16} className="text-muted-foreground" />}
              suffix={
                searchText && (
                  <Icon 
                    name="X" 
                    size={16} 
                    className="text-muted-foreground cursor-pointer hover:text-foreground" 
                    onClick={() => setSearchText('')}
                  />
                )
              }
              className="h-10"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} of {vehicles.length} vehicles
          </div>
        </div>
      </div>

        {/* Brand-wise Inventory View */}
        <div className="flex-1 min-h-0 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Icon name="Building2" size={16} className="text-primary" />
              Brand-wise Inventory
            </h3>
          </div>

        <div className="flex-1 overflow-y-auto">
          <Collapse
            items={makeStats
              .filter(brand => {
                if (!searchText) return true;
                const search = searchText.toLowerCase();
                return brand.make.toLowerCase().includes(search) ||
                  brand.variants.some(v => 
                    v.model.toLowerCase().includes(search) ||
                    v.variant.toLowerCase().includes(search) ||
                    (v.city && v.city.toLowerCase().includes(search))
                  );
              })
              .map((brand) => ({
              key: brand.make,
              label: (
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">{brand.make}</span>
                    <Tag color="blue">{brand.variants.length} variants</Tag>
                    <Tag color="default">{brand.models.size} models</Tag>
                    <Tag color="green">{brand.totalActive} active</Tag>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatINR(brand.totalValue)}
                  </span>
                </div>
              ),
              children: (
                <div className="space-y-4">
                  {Array.from(brand.models).sort().map((model) => {
                    const modelVehicles = brand.variants.filter(v => v.model === model);
                    return (
                      <div key={model} className="border-2 border-border dark:border-border/60 rounded-lg p-3 bg-muted/30 dark:bg-muted/20">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon name="Car" size={14} className="text-amber-600" />
                            <span className="font-medium text-foreground">{brand.make} {model}</span>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {modelVehicles.length} variant{modelVehicles.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Variants Table for this Model */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="border-b-2 border-border dark:border-border/60 bg-muted/50 dark:bg-muted/30">
                              <tr>
                                <th className="px-2 py-2 text-left font-semibold text-foreground">Variant</th>
                                <th className="px-2 py-2 text-left font-semibold text-foreground">Fuel</th>
                                <th className="px-2 py-2 text-right font-semibold text-foreground">Ex-Showroom</th>
                                <th className="px-2 py-2 text-right font-semibold text-foreground">On-Road</th>
                                <th className="px-2 py-2 text-center font-semibold text-foreground">Status</th>
                                <th className="px-2 py-2 text-center font-semibold text-foreground">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {modelVehicles.map((vehicle) => (
                                <tr key={vehicle._id} className="border-b border-border dark:border-border/60 hover:bg-muted/30 dark:hover:bg-muted/20 transition-colors">
                                  <td className="px-2 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-foreground">{vehicle.variant}</span>
                                      {vehicle.isDiscontinued && (
                                        <Tag color="red" className="text-[10px] m-0">
                                          Discontinued
                                        </Tag>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-2 py-2">
                                    <Tag color={vehicle.fuel === 'Petrol' ? 'orange' : 'blue'} className="text-[10px]">
                                      {vehicle.fuel || "—"}
                                    </Tag>
                                  </td>
                                  <td className="px-2 py-2 text-right font-mono text-muted-foreground text-xs">
                                    {vehicle.exShowroom != null && Number(vehicle.exShowroom) > 0 ? formatINR(vehicle.exShowroom) : "—"}
                                  </td>
                                  <td className="px-2 py-2 text-right font-mono font-semibold text-primary text-xs">
                                    {vehicle.onRoadPrice != null && Number(vehicle.onRoadPrice) > 0 ? formatINR(vehicle.onRoadPrice) : "—"}
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <Tag color={vehicle.status === 'Active' ? 'green' : 'red'} className="text-[10px]">
                                      {vehicle.status}
                                    </Tag>
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <Space size={2}>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs h-6 px-2"
                                        iconName="Edit3"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(vehicle);
                                        }}
                                      />
                                      <Popconfirm
                                        title="Remove?"
                                        onConfirm={(e) => {
                                          e?.stopPropagation();
                                          handleDelete(vehicle._id);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-xs text-red-500 h-6 px-2"
                                          iconName="Trash2"
                                        />
                                      </Popconfirm>
                                    </Space>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ),
            }))}
            accordion
            className="bg-transparent"
          />
        </div>
        </div>
      </div>

      <VehicleFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        loading={modalLoading}
        initialValues={editingVehicle}
      />
    </div>
  );
};

export default VehicleMaster;
