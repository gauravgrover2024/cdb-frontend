// src/modules/delivery-orders/components/DeliveryOrderDashboard.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Tag,
  Input,
  Button,
  Space,
  Select,
  DatePicker,
  Badge,
  Dropdown,
  Menu,
  Modal,
  message,
  Progress,
  Tooltip,
} from "antd";
import { useNavigate } from "react-router-dom";
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  FileTextOutlined,
  CarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CalendarOutlined,
  MoreOutlined,
  PrinterOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Option } = Select;
const { RangePicker } = DatePicker;

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹${asInt(n).toLocaleString("en-IN")}`;

// ✅ API helper
const fetchAllDOs = async () => {
  const res = await fetch("/api/do");
  if (!res.ok) throw new Error("Failed to load DO list");
  return res.json();
};

const DeliveryOrderDashboard = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateRange, setDateRange] = useState(null);
  const [dealerFilter, setDealerFilter] = useState("All");

  const loadLoansFromLocal = () => {
    const savedLoans = JSON.parse(localStorage.getItem("savedLoans") || "[]");
    setLoans(savedLoans);
  };

  const loadDOsFromMongo = async () => {
    try {
      setLoading(true);
      const docs = await fetchAllDOs();
      setDeliveryOrders(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error("Load DO Dashboard Error:", err);
      message.error("Failed to load Delivery Orders");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    loadLoansFromLocal();
    await loadDOsFromMongo();
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map DO by loanId
  const doMap = useMemo(() => {
    const map = {};
    (deliveryOrders || []).forEach((d) => {
      if (d?.loanId) map[d.loanId] = d;
      if (d?.do_loanId) map[d.do_loanId] = d;
    });
    return map;
  }, [deliveryOrders]);

  // Get unique dealers for filter
  const dealerOptions = useMemo(() => {
    const dealers = new Set();
    loans.forEach((loan) => {
      const dealer = loan.sourceName || loan.dealerName;
      if (dealer) dealers.add(dealer);
    });
    return Array.from(dealers).sort();
  }, [loans]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalDOs = deliveryOrders.length;
    const totalLoans = loans.length;
    const pending = totalLoans - totalDOs;

    const totalAmount = deliveryOrders.reduce(
      (sum, d) => sum + asInt(d.do_netDOAmount),
      0,
    );

    const thisMonth = deliveryOrders.filter((d) => {
      if (!d.do_date) return false;
      return dayjs(d.do_date).isAfter(dayjs().startOf("month"));
    }).length;

    return {
      total: totalDOs,
      pending,
      totalAmount,
      thisMonth,
      completion:
        totalLoans > 0 ? Math.round((totalDOs / totalLoans) * 100) : 0,
    };
  }, [loans, deliveryOrders]);

  // Filtered data
  const filteredData = useMemo(() => {
    return loans.filter((loan) => {
      // Search filter
      if (searchText) {
        const search = searchText.toLowerCase();
        const vehicle = `${safeText(loan.vehicleMake)} ${safeText(loan.vehicleModel)}`;
        const matchesSearch =
          safeText(loan.loanId).toLowerCase().includes(search) ||
          safeText(loan.customerName).toLowerCase().includes(search) ||
          vehicle.toLowerCase().includes(search) ||
          safeText(loan.sourceName).toLowerCase().includes(search);

        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "All") {
        const doExists = !!doMap[loan.loanId];
        if (statusFilter === "Created" && !doExists) return false;
        if (statusFilter === "Pending" && doExists) return false;
      }

      // Type filter
      if (typeFilter !== "All") {
        const isFinanced = safeText(loan?.isFinanced).toLowerCase() === "yes";
        if (typeFilter === "Financed" && !isFinanced) return false;
        if (typeFilter === "Cash" && isFinanced) return false;
      }

      // Date range filter
      if (dateRange && dateRange.length === 2) {
        const doData = doMap[loan.loanId];
        if (!doData?.do_date) return false;

        const doDate = dayjs(doData.do_date);
        if (!doDate.isBetween(dateRange[0], dateRange[1], "day", "[]"))
          return false;
      }

      // Dealer filter
      if (dealerFilter !== "All") {
        const dealer = loan.sourceName || loan.dealerName;
        if (dealer !== dealerFilter) return false;
      }

      return true;
    });
  }, [
    loans,
    doMap,
    searchText,
    statusFilter,
    typeFilter,
    dateRange,
    dealerFilter,
  ]);

  const handleExport = () => {
    const exportData = filteredData.map((loan) => {
      const d = doMap[loan.loanId];
      return {
        "Loan ID": loan.loanId,
        Customer: loan.customerName || "-",
        Vehicle: `${loan.vehicleMake} ${loan.vehicleModel}`,
        Type:
          safeText(loan?.isFinanced).toLowerCase() === "yes"
            ? "Financed"
            : "Cash",
        "DO Status": d ? "Created" : "Pending",
        "DO Ref No": d?.do_refNo || "-",
        "DO Date": d?.do_date ? dayjs(d.do_date).format("DD-MM-YYYY") : "-",
        "Net DO Amount": d ? asInt(d.do_netDOAmount) : 0,
        Dealer: loan.sourceName || loan.dealerName || "-",
      };
    });

    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(","),
      ...exportData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Delivery_Orders_${dayjs().format("YYYY-MM-DD")}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success("Data exported successfully");
  };

  const actionMenu = (loan) => (
    <Menu>
      <Menu.Item
        key="view"
        icon={<EyeOutlined />}
        onClick={() => navigate(`/delivery-orders/${loan.loanId}?view=1`)}
      >
        View Details
      </Menu.Item>
      <Menu.Item
        key="edit"
        icon={<EditOutlined />}
        onClick={() => navigate(`/delivery-orders/${loan.loanId}`)}
      >
        Edit DO
      </Menu.Item>
      <Menu.Item
        key="print"
        icon={<PrinterOutlined />}
        onClick={() => message.info("Print functionality coming soon")}
      >
        Print DO
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="delete"
        icon={<DeleteOutlined />}
        danger
        onClick={() => message.warning("Delete functionality coming soon")}
      >
        Delete DO
      </Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: "Loan Details",
      key: "loanDetails",
      width: 280,
      fixed: "left",
      render: (_, loan) => {
        const doExists = !!doMap[loan.loanId];

        return (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{loan.loanId}</span>
              {doExists && <Badge status="success" />}
            </div>
            <div className="text-xs text-gray-600">
              {loan.customerName || "-"}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {loan.sourceName || loan.dealerName || "Direct"}
            </div>
          </div>
        );
      },
    },
    {
      title: "Vehicle",
      key: "vehicle",
      width: 220,
      render: (_, loan) => (
        <div>
          <div className="font-medium text-sm">
            {safeText(loan.vehicleMake)} {safeText(loan.vehicleModel)}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {safeText(loan.vehicleVariant) || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Type",
      key: "type",
      width: 100,
      align: "center",
      render: (_, loan) => {
        const isFinanced = safeText(loan?.isFinanced).toLowerCase() === "yes";
        return isFinanced ? (
          <Tag color="blue" icon={<DollarOutlined />}>
            Financed
          </Tag>
        ) : (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Cash
          </Tag>
        );
      },
    },
    {
      title: "DO Status",
      key: "status",
      width: 120,
      align: "center",
      render: (_, loan) => {
        const doExists = !!doMap[loan.loanId];
        return doExists ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Created
          </Tag>
        ) : (
          <Tag color="warning" icon={<ClockCircleOutlined />}>
            Pending
          </Tag>
        );
      },
    },
    {
      title: "DO Reference",
      key: "doRef",
      width: 160,
      render: (_, loan) => {
        const d = doMap[loan.loanId];
        if (!d?.do_refNo) return <span className="text-gray-400">-</span>;

        return (
          <div>
            <div className="font-medium text-sm">{d.do_refNo}</div>
            {d.do_date && (
              <div className="text-xs text-gray-500 mt-0.5">
                <CalendarOutlined /> {dayjs(d.do_date).format("DD MMM YYYY")}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Net DO Amount",
      key: "netAmount",
      width: 140,
      align: "right",
      render: (_, loan) => {
        const d = doMap[loan.loanId];
        const net = asInt(d?.do_netDOAmount);

        if (!d || net === 0) {
          return <span className="text-gray-400">-</span>;
        }

        return <div className="font-semibold text-blue-600">{money(net)}</div>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      fixed: "right",
      align: "center",
      render: (_, loan) => {
        const doExists = !!doMap[loan.loanId];

        return (
          <Space size="small">
            {!doExists ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="small"
                onClick={() => navigate(`/delivery-orders/${loan.loanId}`)}
              >
                Create DO
              </Button>
            ) : (
              <>
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => navigate(`/delivery-orders/${loan.loanId}`)}
                >
                  Edit
                </Button>
                <Dropdown overlay={actionMenu(loan)} trigger={["click"]}>
                  <Button icon={<MoreOutlined />} size="small" />
                </Dropdown>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  const tableData = filteredData.map((l) => ({
    ...l,
    key: l.loanId,
  }));

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1">
              Delivery Orders Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              Manage and track all delivery orders
            </p>
          </div>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              size="large"
            >
              Export
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
              size="large"
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/loans")}
              size="large"
            >
              View All Loans
            </Button>
          </Space>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
          <div className="bg-white border rounded-2xl p-4 hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
                <FileTextOutlined className="text-blue-600 text-lg" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Total DOs</div>
                <div className="text-xl font-semibold">{stats.total}</div>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-4 hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center">
                <ClockCircleOutlined className="text-orange-600 text-lg" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Pending</div>
                <div className="text-xl font-semibold">{stats.pending}</div>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-4 hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-green-50 flex items-center justify-center">
                <CheckCircleOutlined className="text-green-600 text-lg" />
              </div>
              <div>
                <div className="text-xs text-gray-500">This Month</div>
                <div className="text-xl font-semibold">{stats.thisMonth}</div>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-4 hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center">
                <DollarOutlined className="text-purple-600 text-lg" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Amount</div>
                <div className="text-lg font-semibold">
                  {money(stats.totalAmount)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-4 hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <CarOutlined className="text-indigo-600 text-lg" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Completion</div>
                <Progress
                  percent={stats.completion}
                  size="small"
                  strokeColor="#6366f1"
                  format={() => `${stats.completion}%`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border rounded-2xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="xl:col-span-2">
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search by Loan ID, Customer, Vehicle..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="large"
              />
            </div>

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              size="large"
              className="w-full"
            >
              <Option value="All">All Status</Option>
              <Option value="Created">Created</Option>
              <Option value="Pending">Pending</Option>
            </Select>

            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              size="large"
              className="w-full"
            >
              <Option value="All">All Types</Option>
              <Option value="Financed">Financed</Option>
              <Option value="Cash">Cash</Option>
            </Select>

            <Select
              value={dealerFilter}
              onChange={setDealerFilter}
              size="large"
              className="w-full"
              showSearch
            >
              <Option value="All">All Dealers</Option>
              {dealerOptions.map((dealer) => (
                <Option key={dealer} value={dealer}>
                  {dealer}
                </Option>
              ))}
            </Select>

            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              format="DD MMM YY"
              size="large"
              className="w-full"
              placeholder={["Start Date", "End Date"]}
            />
          </div>

          {(statusFilter !== "All" ||
            typeFilter !== "All" ||
            dealerFilter !== "All" ||
            searchText ||
            dateRange) && (
            <div className="mt-3">
              <Button
                onClick={() => {
                  setStatusFilter("All");
                  setTypeFilter("All");
                  setDealerFilter("All");
                  setSearchText("");
                  setDateRange(null);
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <Table
          columns={columns}
          dataSource={tableData}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 15,
            showTotal: (total) => `Total ${total} loans`,
            showSizeChanger: true,
            pageSizeOptions: ["10", "15", "25", "50"],
          }}
        />
      </div>
    </div>
  );
};

export default DeliveryOrderDashboard;
