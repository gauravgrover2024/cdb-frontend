import React, { useState, useEffect, useMemo } from "react";
import { Input, Select, message, Space, Tag } from "antd";
import { vehiclesApi } from "../../api/vehicles";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";

const { Search } = Input;
const { Option } = Select;

const StatCard = ({ title, value, color, iconName }) => {
  const colorMap = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800",
  };

  const iconColorMap = {
    blue: "text-blue-600 dark:text-blue-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    purple: "text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="bg-card dark:bg-card/95 border-2 border-border dark:border-border/60 shadow-sm rounded-xl p-5 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <p className={`text-2xl font-bold font-mono tracking-tight ${iconColorMap[color]}`}>
          {value}
        </p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        <Icon name={iconName} size={24} className={iconColorMap[color]} />
      </div>
    </div>
  );
};

const VehiclePriceList = ({ onSelectVehicle, selectionMode = false }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [fuelFilter, setFuelFilter] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const res = await vehiclesApi.getAll();
      setVehicles(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Load Vehicles Error:", err);
      message.error("Failed to load vehicle price list ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  // Get unique makes and models for filters
  const uniqueMakes = useMemo(() => {
    const makes = [...new Set(vehicles.map(v => v.make))].sort();
    return makes;
  }, [vehicles]);

  const uniqueModels = useMemo(() => {
    if (!makeFilter) return [];
    const models = [...new Set(
      vehicles.filter(v => v.make === makeFilter).map(v => v.model)
    )].sort();
    return models;
  }, [vehicles, makeFilter]);

  const uniqueFuels = useMemo(() => {
    const fuels = [...new Set(vehicles.map(v => v.fuel).filter(Boolean))].sort();
    return fuels;
  }, [vehicles]);

  // Filter vehicles based on search and filters
  const filteredVehicles = useMemo(() => {
    let filtered = [...vehicles];

    // Apply make filter
    if (makeFilter) {
      filtered = filtered.filter(v => v.make === makeFilter);
    }

    // Apply model filter
    if (modelFilter) {
      filtered = filtered.filter(v => v.model === modelFilter);
    }

    // Apply fuel filter
    if (fuelFilter) {
      filtered = filtered.filter(v => v.fuel === fuelFilter);
    }

    // Apply search text (searches across make, model, variant)
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(v => 
        v.make?.toLowerCase().includes(search) ||
        v.model?.toLowerCase().includes(search) ||
        v.variant?.toLowerCase().includes(search) ||
        v.fuel?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [vehicles, searchText, makeFilter, modelFilter, fuelFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredVehicles.length;
    const active = filteredVehicles.filter(v => !v.isDiscontinued).length;
    const discontinued = filteredVehicles.filter(v => v.isDiscontinued).length;
    const makes = new Set(filteredVehicles.map(v => v.make)).size;

    return { total, active, discontinued, makes };
  }, [filteredVehicles]);

  const formatCurrency = (amount) => {
    if (!amount) return "₹ 0";
    return `₹ ${Number(amount).toLocaleString("en-IN")}`;
  };

  const handleMakeChange = (value) => {
    setMakeFilter(value);
    setModelFilter(""); // Reset model when make changes
  };

  const handleClearFilters = () => {
    setSearchText("");
    setMakeFilter("");
    setModelFilter("");
    setFuelFilter("");
  };

  const handleSelectVehicle = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Please select a vehicle");
      return;
    }
    const selectedVehicle = vehicles.find(v => v._id === selectedRowKeys[0]);
    if (onSelectVehicle) {
      onSelectVehicle(selectedVehicle);
      message.success(`Selected: ${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.variant}`);
    }
  };

  const columns = [
    {
      title: "Make",
      dataIndex: "make",
      key: "make",
      width: 120,
      fixed: "left",
      sorter: (a, b) => a.make.localeCompare(b.make),
      render: (text) => <span className="font-semibold text-foreground">{text}</span>,
    },
    {
      title: "Model",
      dataIndex: "model",
      key: "model",
      width: 150,
      sorter: (a, b) => a.model.localeCompare(b.model),
      render: (text) => <span className="font-medium text-foreground">{text}</span>,
    },
    {
      title: "Variant",
      dataIndex: "variant",
      key: "variant",
      width: 200,
      sorter: (a, b) => a.variant.localeCompare(b.variant),
      render: (text, record) => (
        <div className="flex items-center gap-2">
          <span className="text-foreground">{text}</span>
          {record.isDiscontinued && (
            <Tag color="red" className="text-xs">
              Discontinued
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Fuel",
      dataIndex: "fuel",
      key: "fuel",
      width: 100,
      sorter: (a, b) => (a.fuel || "").localeCompare(b.fuel || ""),
      render: (text) => (
        <Tag color={text === "Petrol" ? "blue" : text === "Diesel" ? "orange" : "green"}>
          {text && text.trim() !== "N/A" ? text : "—"}
        </Tag>
      ),
    },
    {
      title: "Ex-Showroom",
      dataIndex: "exShowroom",
      key: "exShowroom",
      width: 140,
      align: "right",
      sorter: (a, b) => a.exShowroom - b.exShowroom,
      render: (value) => (
        <span className="font-mono font-semibold text-primary">
          {value != null && Number(value) > 0 ? formatCurrency(value) : "—"}
        </span>
      ),
    },
    {
      title: "RTO",
      dataIndex: "rto",
      key: "rto",
      width: 120,
      align: "right",
      sorter: (a, b) => a.rto - b.rto,
      render: (value) => <span className="font-mono text-muted-foreground">{formatCurrency(value)}</span>,
    },
    {
      title: "Insurance",
      dataIndex: "insurance",
      key: "insurance",
      width: 120,
      align: "right",
      sorter: (a, b) => a.insurance - b.insurance,
      render: (value) => <span className="font-mono text-muted-foreground">{formatCurrency(value)}</span>,
    },
    {
      title: "Other Charges",
      dataIndex: "otherCharges",
      key: "otherCharges",
      width: 130,
      align: "right",
      sorter: (a, b) => a.otherCharges - b.otherCharges,
      render: (value) => <span className="font-mono text-muted-foreground">{formatCurrency(value)}</span>,
    },
    {
      title: "On-Road Price",
      dataIndex: "onRoadPrice",
      key: "onRoadPrice",
      width: 150,
      align: "right",
      fixed: "right",
      sorter: (a, b) => a.onRoadPrice - b.onRoadPrice,
      render: (value) => (
        <span className="font-mono font-bold text-success text-base">
          {value != null && Number(value) > 0 ? formatCurrency(value) : "—"}
        </span>
      ),
    },
  ];

  if (selectionMode) {
    columns.push({
      title: "Action",
      key: "action",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (onSelectVehicle) {
              onSelectVehicle(record);
              message.success(`Selected: ${record.make} ${record.model} ${record.variant}`);
            }
          }}
          className="border-primary text-primary hover:bg-primary/10"
        >
          Select
        </Button>
      ),
    });
  }

  const rowSelection = selectionMode ? {
    type: "radio",
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  } : null;

  return (
    <div className="h-full flex flex-col gap-6 p-4 md:p-6 bg-background dark:bg-background/95 overflow-hidden font-sans border-2 border-border dark:border-border/40 rounded-lg">
      {/* Header */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="DollarSign" size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Vehicle Price List
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {selectionMode ? "Select a vehicle from the price list" : "Browse and search vehicle pricing"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Vehicles" value={stats.total} color="blue" iconName="Car" />
          <StatCard title="Active" value={stats.active} color="emerald" iconName="CheckCircle" />
          <StatCard title="Discontinued" value={stats.discontinued} color="amber" iconName="XCircle" />
          <StatCard title="Unique Makes" value={stats.makes} color="purple" iconName="Tag" />
        </div>

        {/* Filters */}
        <div className="bg-card dark:bg-card/95 border-2 border-border dark:border-border/60 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <Search
              placeholder="Search by make, model, variant..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              prefix={<Icon name="Search" size={16} className="text-muted-foreground" />}
              className="w-full"
            />
            
            <Select
              placeholder="Filter by make"
              value={makeFilter || undefined}
              onChange={handleMakeChange}
              allowClear
              className="w-full"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {uniqueMakes.map(make => (
                <Option key={make} value={make}>{make}</Option>
              ))}
            </Select>

            <Select
              placeholder="Filter by model"
              value={modelFilter || undefined}
              onChange={setModelFilter}
              allowClear
              className="w-full"
              disabled={!makeFilter}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {uniqueModels.map(model => (
                <Option key={model} value={model}>{model}</Option>
              ))}
            </Select>

            <Select
              placeholder="Filter by fuel"
              value={fuelFilter || undefined}
              onChange={setFuelFilter}
              allowClear
              className="w-full"
            >
              {uniqueFuels.map(fuel => (
                <Option key={fuel} value={fuel}>{fuel}</Option>
              ))}
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="flex-1 border-border dark:border-border/60 hover:bg-muted dark:hover:bg-muted/80"
              >
                <Icon name="X" size={16} />
                Clear
              </Button>
              {selectionMode && selectedRowKeys.length > 0 && (
                <Button
                  variant="default"
                  onClick={handleSelectVehicle}
                  className="flex-1 bg-primary dark:bg-primary/90 hover:bg-primary/90 dark:hover:bg-primary/80 text-white"
                >
                  <Icon name="Check" size={16} />
                  Select
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 flex flex-col min-h-0 bg-card dark:bg-card/95 border-2 border-border dark:border-border/60 rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          dataSource={filteredVehicles}
          loading={loading}
          rowKey="_id"
          scroll={{ x: 1400, y: "calc(100vh - 450px)" }}
          pagination={{
            total: filteredVehicles.length,
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} vehicles`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          rowSelection={rowSelection}
          rowClassName={(record) =>
            record.isDiscontinued
              ? "opacity-60"
              : ""
          }
        />
      </div>
    </div>
  );
};

export default VehiclePriceList;
