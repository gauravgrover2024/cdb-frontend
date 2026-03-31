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
import DirectCreateModal from "../../shared/DirectCreateModal";

const { Option } = Select;

const safeText = (v) => (v === undefined || v === null ? "" : String(v));

const asInt = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
};

const money = (n) => `₹${asInt(n).toLocaleString("en-IN")}`;

const listFromResponse = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};
const normalizeLoanId = (value) => safeText(value).trim();
const dedupeDOByLoanId = (rows = []) => {
  const byLoanId = new Map();
  (rows || []).forEach((row) => {
    const key = normalizeLoanId(row?.loanId || row?.do_loanId);
    if (!key) return;
    if (!byLoanId.has(key)) {
      byLoanId.set(key, row);
      return;
    }
    const prev = byLoanId.get(key);
    const prevTs = new Date(prev?.updatedAt || prev?.createdAt || 0).getTime() || 0;
    const nextTs = new Date(row?.updatedAt || row?.createdAt || 0).getTime() || 0;
    if (nextTs >= prevTs) {
      byLoanId.set(key, row);
    }
  });
  return Array.from(byLoanId.values());
};
const chunkArray = (arr = [], size = 300) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const fetchAllDOs = async () => {
  const pageSize = 1000;
  let skip = 0;
  let hasMore = true;
  const all = [];

  while (hasMore) {
    const res = await deliveryOrdersApi.getAll({
      limit: pageSize,
      skip,
      noCount: true,
    });
    const page = listFromResponse(res);
    all.push(...page);
    hasMore = Boolean(res?.hasMore);
    skip += pageSize;
  }

  return all;
};

const fetchLoansByIds = async (loanIds = []) => {
  const ids = Array.from(
    new Set((loanIds || []).map((id) => normalizeLoanId(id)).filter(Boolean)),
  );
  if (!ids.length) return [];

  const chunks = chunkArray(ids, 300);
  const payloads = await Promise.all(
    chunks.map((chunk) =>
      loansApi.getAll({
        loanIds: chunk.join(","),
        limit: 1000,
        noCount: true,
        view: "dashboard",
        sortBy: "leadDate",
        sortDir: "desc",
      }),
    ),
  );
  return payloads.flatMap((payload) => listFromResponse(payload));
};

const buildLoanFallbackFromDO = (d = {}) => ({
  loanId: normalizeLoanId(d.loanId || d.do_loanId),
  customerName: safeText(d.customerName || d.do_customerName || d.customer_name),
  vehicleMake: safeText(d.vehicleMake || d.make),
  vehicleModel: safeText(d.vehicleModel || d.model),
  vehicleVariant: safeText(d.vehicleVariant || d.variant),
  isFinanced: safeText(d.isFinanced || d.do_accountType || "No"),
  recordSource: safeText(d.recordSource || d.source || d.sourcing),
  sourceName: safeText(d.sourceName || d.dealerName),
  _hasLinkedLoan: false,
});

const DeliveryOrderDashboard = () => {
  const navigate = useNavigate();

  const [loans, setLoans] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);

  const [statusFilter, setStatusFilter] = useState("All"); // All / Created / NotCreated
  const [financeFilter, setFinanceFilter] = useState("All"); // All / Financed / Cash
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const docs = dedupeDOByLoanId(await fetchAllDOs());
      setDeliveryOrders(Array.isArray(docs) ? docs : []);

      const loanIds = docs
        .map((d) => normalizeLoanId(d?.loanId || d?.do_loanId))
        .filter(Boolean);
      const linkedLoans = await fetchLoansByIds(loanIds);
      const linkedMap = new Map();
      (linkedLoans || []).forEach((loan) => {
        const id = normalizeLoanId(loan?.loanId || loan?.loan_number || loan?._id);
        if (!id) return;
        linkedMap.set(id, {
          ...loan,
          loanId: id,
          _hasLinkedLoan: true,
        });
      });

      const mergedRows = docs.map((doc) => {
        const id = normalizeLoanId(doc?.loanId || doc?.do_loanId);
        return linkedMap.get(id) || buildLoanFallbackFromDO(doc);
      });
      setLoans(mergedRows);
    } catch (err) {
      console.error("Load DO Dashboard Error:", err);
      setLoans([]);
      setDeliveryOrders([]);
      message.error("Failed to load Delivery Orders from server ❌");
    } finally {
      setLoading(false);
    }
  }, []);

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
    const withoutDO = loans.filter((l) => !l?._hasLinkedLoan).length;

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
        label: "Total DO Entries",
        value: totalLoans,
        icon: <FileTextOutlined />,
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
        onClick: () => setStatusFilter("Created"),
      },
      {
        id: "pending",
        label: "Loan Link Missing",
        value: withoutDO,
        icon: <ClockCircleOutlined />,
        onClick: () => setStatusFilter("MissingLoan"),
      },
      {
        id: "netdo",
        label: "Total Net DO",
        value: totalNet,
        subtext: `Avg: ${avgNet}`,
        icon: <AlertOutlined />,
        onClick: () => {
          setStatusFilter("Created");
        },
      },
    ];
  }, [loans, doMap, setStatusFilter, setFinanceFilter]);

  const filteredRows = useMemo(() => {
    return loans.filter((loan) => {
      const d = doMap[loan.loanId];

      if (statusFilter === "Created" && !d) return false;
      if (statusFilter === "MissingLoan" && loan?._hasLinkedLoan) return false;

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
            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              {safeText(loan.customerName) || "—"}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Loan: {safeText(loan.loanId)}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {financed ? "Financed" : "Cash"} ·{" "}
              {safeText(loan.recordSource) || "Direct"}
              {loan.sourceName ? ` · ${safeText(loan.sourceName)}` : ""}
            </div>
            {d?.do_refNo && (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
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
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {ref}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {dt}
            </div>
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

  /* ── Gradient theme map for stat cards (mirrors LoanDashboard MetricCard) ── */
  const STAT_GRADIENTS = {
    total: "from-sky-500 to-indigo-600",
    created: "from-emerald-500 to-green-600",
    pending: "from-amber-500 to-orange-600",
    netdo: "from-violet-500 to-fuchsia-600",
  };

  return (
    <div className="px-4 md:px-6 py-6 bg-slate-50 dark:bg-[#171717] min-h-screen">
      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#262626] text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-2">
              <CarOutlined style={{ fontSize: 11 }} />
              Delivery Orders
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1">
              Delivery Orders Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
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
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
              size="large"
            >
              New DO
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

        {/* ── Gradient Stat Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {stats.map((stat) => {
            const gradient =
              STAT_GRADIENTS[stat.id] || "from-slate-600 to-slate-800";
            return (
              <button
                key={stat.id}
                type="button"
                onClick={stat.onClick}
                className={`group relative text-left overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br ${gradient} p-4 shadow-lg shadow-slate-900/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none`}
              >
                <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/70">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl md:text-3xl font-black text-white tabular-nums leading-none">
                      {stat.value}
                    </p>
                    {stat.subtext && (
                      <p className="mt-1 text-xs text-white/80">
                        {stat.subtext}
                      </p>
                    )}
                  </div>
                  <div className="mt-1 h-10 w-10 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shrink-0">
                    <span className="text-lg">{stat.icon}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white dark:bg-[#1f1f1f] border border-slate-100 dark:border-[#262626] rounded-2xl p-4 shadow-sm">
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
              <Option value="MissingLoan">Loan Link Missing</Option>
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
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#262626]">
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

      {/* ── Table ── */}
      <div className="bg-white dark:bg-[#1f1f1f] border border-slate-100 dark:border-[#262626] rounded-2xl overflow-hidden shadow-sm">
        <Table
          rowKey={(r) => r.loanId || r.id}
          columns={columns}
          dataSource={filteredRows}
          pagination={{
            pageSize: 15,
            showTotal: (total) => `Total ${total} DO entries`,
            showSizeChanger: true,
            pageSizeOptions: ["10", "15", "25", "50"],
          }}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </div>
      <DirectCreateModal
        open={showCreateModal}
        mode="DO"
        onClose={() => setShowCreateModal(false)}
        onCreated={() => loadData()}
      />
    </div>
  );
};

export default DeliveryOrderDashboard;
