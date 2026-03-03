// src/modules/delivery-orders/components/DeliveryOrderDashboard.jsx

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Table,
  Tag,
  Select,
  Input,
  Button,
  Space,
  message,
  Tooltip,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  FileTextOutlined,
  CarOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { deliveryOrdersApi } from "../../../api/deliveryOrders";
import { loansApi } from "../../../api/loans";

const { Option } = Select;

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹${asInt(n).toLocaleString("en-IN")}`;

const fetchAllDOs = async () => {
  const res = await deliveryOrdersApi.getAll();
  return res.data || [];
};

const DeliveryOrderDashboard = () => {
  const navigate = useNavigate();

  const [loans, setLoans] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);

  const [statusFilter, setStatusFilter] = useState("All"); // All / Created / NotCreated
  const [financeFilter, setFinanceFilter] = useState("All"); // All / Financed / Cash
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(false);

  const loadLoansFromApi = useCallback(async () => {
    try {
      const res = await loansApi.getAll("?limit=10000&skip=0");
      setLoans(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Load Loans Error:", err);
      setLoans([]);
    }
  }, []);

  const loadDOsFromMongo = useCallback(async () => {
    try {
      setLoading(true);
      const docs = await fetchAllDOs();
      setDeliveryOrders(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error("Load DO Dashboard Error:", err);
      message.error("Failed to load Delivery Orders from server ❌");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    await loadLoansFromApi();
    await loadDOsFromMongo();
  }, [loadLoansFromApi, loadDOsFromMongo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const doMap = useMemo(() => {
    const map = {};
    (deliveryOrders || []).forEach((d) => {
      if (d?.loanId) map[d.loanId] = d;
      if (d?.do_loanId) map[d.do_loanId] = d;
    });
    return map;
  }, [deliveryOrders]);

  const stats = useMemo(() => {
    const totalLoans = loans.length;
    const withDO = loans.filter((l) => !!doMap[l.loanId]).length;
    const withoutDO = totalLoans - withDO;

    const allNet = loans
      .map((l) => asInt(doMap[l.loanId]?.do_netDOAmount))
      .filter((n) => n > 0);
    const totalNet =
      allNet.length > 0 ? money(allNet.reduce((a, b) => a + b, 0)) : "₹0";
    const avgNet =
      allNet.length > 0
        ? money(allNet.reduce((a, b) => a + b, 0) / allNet.length)
        : "—";

    return [
      {
        id: "total",
        label: "Total Loans",
        value: totalLoans,
        icon: <FileTextOutlined />,
        bgColor: "bg-blue-50",
        iconColor: "text-blue-600",
        onClick: () => {
          setStatusFilter("All");
          setFinanceFilter("All");
        },
      },
      {
        id: "created",
        label: "DO Created",
        value: withDO,
        icon: <CheckCircleOutlined />,
        bgColor: "bg-green-50",
        iconColor: "text-green-600",
        onClick: () => setStatusFilter("Created"),
      },
      {
        id: "pending",
        label: "Pending DO",
        value: withoutDO,
        icon: <ClockCircleOutlined />,
        bgColor: "bg-orange-50",
        iconColor: "text-orange-600",
        onClick: () => setStatusFilter("NotCreated"),
      },
      {
        id: "netdo",
        label: "Total Net DO",
        value: totalNet,
        subtext: `Avg: ${avgNet}`,
        icon: <AlertOutlined />,
        bgColor: "bg-purple-50",
        iconColor: "text-purple-600",
        onClick: () => {
          // optional: focus only Created DOs when clicking total net
          setStatusFilter("Created");
        },
      },
    ];
  }, [loans, doMap, setStatusFilter, setFinanceFilter]);

  const filteredRows = useMemo(() => {
    return loans.filter((loan) => {
      const d = doMap[loan.loanId];

      if (statusFilter === "Created" && !d) return false;
      if (statusFilter === "NotCreated" && d) return false;

      const financed = safeText(loan?.isFinanced).toLowerCase() === "yes";
      if (financeFilter === "Financed" && !financed) return false;
      if (financeFilter === "Cash" && financed) return false;

      if (searchText) {
        const vehicle = `${safeText(loan.vehicleMake)} ${safeText(
          loan.vehicleModel,
        )} ${safeText(loan.vehicleVariant)}`;
        const blob = `${loan.loanId} ${loan.customerName} ${vehicle} ${
          loan.recordSource || ""
        } ${loan.sourceName || ""}`.toLowerCase();
        if (!blob.includes(searchText.toLowerCase())) return false;
      }

      return true;
    });
  }, [loans, doMap, statusFilter, financeFilter, searchText]);

  const columns = [
    {
      title: "Loan Details",
      width: 260,
      fixed: "left",
      render: (_, loan) => {
        const d = doMap[loan.loanId];
        const financed = safeText(loan?.isFinanced).toLowerCase() === "yes";

        return (
          <div>
            <div className="font-semibold text-sm">
              {safeText(loan.customerName) || "—"}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Loan: {safeText(loan.loanId)}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {financed ? "Financed" : "Cash"} ·{" "}
              {safeText(loan.recordSource) || "Direct"}
              {loan.sourceName ? ` · ${safeText(loan.sourceName)}` : ""}
            </div>
            {d?.do_refNo && (
              <div className="text-[10px] text-gray-400 mt-0.5">
                DO: {safeText(d.do_refNo)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Vehicle",
      key: "vehicle",
      width: 220,
      render: (_, loan) =>
        `${safeText(loan.vehicleMake)} ${safeText(
          loan.vehicleModel,
        )} ${safeText(loan.vehicleVariant)}`.trim() || "—",
    },
    {
      title: "Type",
      key: "type",
      width: 90,
      align: "center",
      render: (_, loan) => {
        const financed = safeText(loan?.isFinanced).toLowerCase() === "yes";
        return financed ? (
          <Tag color="blue">Financed</Tag>
        ) : (
          <Tag color="green">Cash</Tag>
        );
      },
    },
    {
      title: "DO Status",
      key: "status",
      width: 130,
      align: "center",
      render: (_, loan) => {
        const d = doMap[loan.loanId];
        if (!d) {
          return (
            <Tag icon={<ClockCircleOutlined />} color="default">
              Not Created
            </Tag>
          );
        }
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Created
          </Tag>
        );
      },
    },
    {
      title: "DO Details",
      key: "doDetails",
      width: 200,
      render: (_, loan) => {
        const d = doMap[loan.loanId];
        if (!d) return "—";

        const ref = d?.do_refNo || "—";
        const dt =
          d?.do_date && dayjs(d.do_date).isValid()
            ? dayjs(d.do_date).format("DD MMM YYYY")
            : "—";

        return (
          <div>
            <div className="text-sm font-medium">{ref}</div>
            <div className="text-xs text-gray-500">{dt}</div>
          </div>
        );
      },
    },
    {
      title: "Net DO",
      key: "netdo",
      width: 140,
      align: "right",
      render: (_, loan) => {
        const d = doMap[loan.loanId];
        const net = asInt(d?.do_netDOAmount);
        return net > 0 ? (
          <span className="text-base font-semibold">{money(net)}</span>
        ) : (
          "—"
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      align: "center",
      render: (_, loan) => {
        const d = doMap[loan.loanId];
        const hasDO = !!d;

        return (
          <Space size="small">
            {!hasDO ? (
              <Tooltip title="Create DO">
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => navigate(`/delivery-orders/${loan.loanId}`)}
                >
                  Create
                </Button>
              </Tooltip>
            ) : (
              <>
                <Tooltip title="Edit DO">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/delivery-orders/${loan.loanId}`)}
                  />
                </Tooltip>
                <Tooltip title="View DO">
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() =>
                      navigate(`/delivery-orders/${loan.loanId}?view=1`)
                    }
                  />
                </Tooltip>
              </>
            )}
          </Space>
        );
      },
    },
  ];

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
              Manage Delivery Orders and track net payable for each loan.
            </p>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              size="large"
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              icon={<CarOutlined />}
              onClick={() => navigate("/loans")}
              size="large"
            >
              Go to Loans
            </Button>
          </Space>
        </div>

        {/* Stats Cards as filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <button
              key={stat.id}
              type="button"
              onClick={stat.onClick}
              className="bg-white border rounded-2xl p-4 hover:shadow-md transition text-left cursor-pointer relative focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl ${stat.bgColor} flex items-center justify-center`}
                >
                  <span className={`${stat.iconColor} text-lg`}>
                    {stat.icon}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                  <div className="text-xl font-semibold">{stat.value}</div>
                  {stat.subtext && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {stat.subtext}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border rounded-2xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
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
              <Option value="All">All DO Status</Option>
              <Option value="Created">DO Created</Option>
              <Option value="NotCreated">DO Not Created</Option>
            </Select>

            <Select
              value={financeFilter}
              onChange={setFinanceFilter}
              size="large"
              className="w-full"
            >
              <Option value="All">All Types</Option>
              <Option value="Financed">Financed</Option>
              <Option value="Cash">Cash</Option>
            </Select>
          </div>

          {(statusFilter !== "All" ||
            financeFilter !== "All" ||
            searchText) && (
            <div className="mt-3">
              <Button
                onClick={() => {
                  setStatusFilter("All");
                  setFinanceFilter("All");
                  setSearchText("");
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <Table
          rowKey={(r) => r.loanId || r.id}
          columns={columns}
          dataSource={filteredRows}
          pagination={{
            pageSize: 15,
            showTotal: (total) => `Total ${total} loans`,
            showSizeChanger: true,
            pageSizeOptions: ["10", "15", "25", "50"],
          }}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </div>
    </div>
  );
};

export default DeliveryOrderDashboard;
