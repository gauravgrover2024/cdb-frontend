import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  Input,
  Select,
  Tag,
  Popconfirm,
  DatePicker,
  Tooltip,
  message,
} from "antd";
import {
  EyeOutlined,
  EditOutlined,
  LinkOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { quotationsApi } from "../../../api/quotations";
import Button from "../../../components/ui/Button";

const { Option } = Select;
const { RangePicker } = DatePicker;

const QuotationManagerPage = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState();
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState([]);

  // Selection for bulk actions
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const navigate = useNavigate();

  const loadData = async (pageOverride, sizeOverride) => {
    setLoading(true);
    try {
      const params = {
        page: pageOverride || page,
        limit: sizeOverride || pageSize,
      };

      if (statusFilter) params.status = statusFilter;
      if (search) params.q = search;
      if (dateRange && dateRange.length === 2) {
        params.from = dateRange[0].startOf("day").toISOString();
        params.to = dateRange[1].endOf("day").toISOString();
      }

      const res = await quotationsApi.list(params);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
      setPageSize(res.data.limit || params.limit);
    } catch (e) {
      console.error(e);
      message.error("Failed to load quotations.");
    } finally {
      setLoading(false);
    }
  };

  // Load whenever filters change
  useEffect(() => {
    loadData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search, dateRange]);

  const handleDelete = async (id) => {
    try {
      await quotationsApi.remove(id);
      message.success("Quotation deleted.");
      setSelectedRowKeys((keys) => keys.filter((k) => k !== id));
      loadData(1);
    } catch (e) {
      console.error(e);
      message.error("Failed to delete quotation.");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedRowKeys.length) return;
    try {
      await Promise.all(selectedRowKeys.map((id) => quotationsApi.remove(id)));
      message.success("Selected quotations deleted.");
      setSelectedRowKeys([]);
      loadData(1);
    } catch (e) {
      console.error(e);
      message.error("Failed to delete some quotations.");
    }
  };

  const handleBulkStatus = async (status) => {
    if (!selectedRowKeys.length) return;
    message.info("Bulk status update not implemented yet.");
  };

  const handleCopyLink = async (id) => {
    const url = `${window.location.origin}/loans/emi-calculator?quote=${id}&mode=view`;
    try {
      await navigator.clipboard.writeText(url);
      message.success("Sharable link copied to clipboard.");
    } catch (e) {
      console.error(e);
      message.error("Could not copy link.");
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  const columns = useMemo(
    () => [
      {
        title: "Date",
        dataIndex: "createdAt",
        width: 110,
        render: (v) =>
          v
            ? new Date(v).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              })
            : "-",
      },
      {
        title: "Customer",
        render: (row) => (
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold uppercase tracking-tight">
              {row.customer?.customerName || "-"}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              {row.customer?.primaryMobile || ""}
            </span>
          </div>
        ),
      },
      {
        title: "Vehicle",
        render: (row) => {
          if (!row.vehicle) return "-";
          const v = row.vehicle;
          const parts = [v.make, v.model, v.variant].filter(Boolean).join(" ");
          const color = row.pricing?.color;
          return (
            <div className="flex flex-col">
              <span className="text-[13px]">{parts || "-"}</span>
              {color && (
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Color: {color}
                </span>
              )}
            </div>
          );
        },
      },
      {
        title: "City",
        dataIndex: "cityTyped",
        width: 90,
        render: (v) => (
          <span className="text-[12px] text-slate-700 dark:text-slate-200">
            {v || "-"}
          </span>
        ),
      },
      {
        title: "On‑road",
        width: 130,
        render: (row) =>
          row.pricing?.netOnRoad ? (
            <span className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">
              ₹{Math.round(row.pricing.netOnRoad).toLocaleString("en-IN")}
            </span>
          ) : (
            "-"
          ),
      },
      {
        title: "Scenario A",
        width: 200,
        render: (row) => {
          const a = row.scenarios?.A;
          if (!a) return "-";
          return (
            <div className="flex flex-col text-[11px] leading-tight">
              <span>
                Loan{" "}
                <span className="font-semibold">
                  ₹{Math.round(a.loanAmount || 0).toLocaleString("en-IN")}
                </span>
              </span>
              <span>
                EMI{" "}
                <span className="font-semibold">
                  ₹{Math.round(a.emi || 0).toLocaleString("en-IN")}
                </span>
              </span>
              <span>
                Tenure{" "}
                <span className="font-semibold">
                  {a.tenure} {a.tenureType === "years" ? "yrs" : "months"}
                </span>
              </span>
            </div>
          );
        },
      },
      {
        title: "Status",
        dataIndex: "status",
        width: 90,
        render: (s) => {
          const colorMap = {
            draft: "default",
            sent: "processing",
            accepted: "success",
            lost: "error",
          };
          return (
            <Tag
              color={colorMap[s] || "default"}
              className="text-[11px] px-2 py-0.5 rounded-full"
            >
              {s || "draft"}
            </Tag>
          );
        },
      },
      {
        title: "",
        fixed: "right",
        width: 210,
        render: (row) => (
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100/80 dark:bg-[#262626] px-1 py-0.5">
            <Tooltip title="View (read-only)">
              <Button
                size="xs"
                variant="outline"
                className="!border-0 !bg-transparent !shadow-none !h-7 !px-2 rounded-full"
                onClick={() =>
                  navigate(`/loans/emi-calculator?quote=${row._id}&mode=view`)
                }
              >
                <EyeOutlined style={{ fontSize: 11 }} />
              </Button>
            </Tooltip>

            <Tooltip title="Edit">
              <Button
                size="xs"
                variant="outline"
                className="!border-0 !bg-transparent !shadow-none !h-7 !px-2 rounded-full"
                onClick={() =>
                  navigate(`/loans/emi-calculator?quote=${row._id}`)
                }
              >
                <EditOutlined style={{ fontSize: 11 }} />
              </Button>
            </Tooltip>

            <Tooltip title="Copy share link">
              <Button
                size="xs"
                variant="outline"
                className="!border-0 !bg-transparent !shadow-none !h-7 !px-2 rounded-full"
                onClick={() => handleCopyLink(row._id)}
              >
                <LinkOutlined style={{ fontSize: 11 }} />
              </Button>
            </Tooltip>

            <Popconfirm
              title="Delete quotation?"
              onConfirm={() => handleDelete(row._id)}
            >
              <Tooltip title="Delete">
                <Button
                  size="xs"
                  variant="outline"
                  className="!border-0 !bg-transparent !shadow-none !h-7 !px-2 rounded-full"
                >
                  <DeleteOutlined style={{ fontSize: 11, color: "#ef4444" }} />
                </Button>
              </Tooltip>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [navigate],
  );

  const hasSelection = selectedRowKeys.length > 0;

  const totalDraft = useMemo(
    () => items.filter((x) => (x.status || "draft") === "draft").length,
    [items],
  );
  const totalAccepted = useMemo(
    () => items.filter((x) => x.status === "accepted").length,
    [items],
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#171717] px-4 py-4 md:px-8 md:py-6">
      <div className="max-w-6xl mx-auto space-y-3 pb-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-[20px] md:text-[22px] font-semibold text-slate-900 dark:text-slate-50">
              Quotation manager
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              View, share, and manage all EMI quotations.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/loans/emi-calculator")}
          >
            <PlusOutlined style={{ fontSize: 12, marginRight: 6 }} />
            New quotation
          </Button>
        </div>

        <div className="h-px w-full bg-slate-100 dark:bg-[#242424] mb-2" />

        {/* Metrics strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-100 dark:border-[#262626] px-4 py-3">
            <div className="text-[11px] text-slate-500 mb-1">
              Total quotations
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {total}
            </div>
          </div>
          <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-100 dark:border-[#262626] px-4 py-3">
            <div className="text-[11px] text-slate-500 mb-1">Draft</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {totalDraft}
            </div>
          </div>
          <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-100 dark:border-[#262626] px-4 py-3">
            <div className="text-[11px] text-slate-500 mb-1">Accepted</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {totalAccepted}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl border border-slate-100 dark:border-[#262626] px-5 py-4 mb-3 grid grid-cols-1 md:grid-cols-[160px,minmax(0,1fr),220px] gap-3 items-end">
          <div>
            <div className="text-[11px] text-slate-500 mb-1">Status</div>
            <Select
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: "100%" }}
              size="small"
              placeholder="All"
            >
              <Option value="draft">Draft</Option>
              <Option value="sent">Sent</Option>
              <Option value="accepted">Accepted</Option>
              <Option value="lost">Lost</Option>
            </Select>
          </div>

          <div>
            <div className="text-[11px] text-slate-500 mb-1">Search</div>
            <Input
              size="small"
              placeholder="Name, mobile, vehicle, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <div className="text-[11px] text-slate-500 mb-1">Date range</div>
            <RangePicker
              size="small"
              value={dateRange}
              onChange={(val) => setDateRange(val || [])}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Bulk actions bar */}
        {hasSelection && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2 mb-3 flex items-center justify-between text-xs">
            <div className="text-slate-700 dark:text-slate-200">
              <span className="font-semibold">
                {selectedRowKeys.length} selected
              </span>{" "}
              – bulk actions
            </div>
            <div className="flex gap-2">
              <Popconfirm
                title="Delete selected quotations?"
                onConfirm={handleBulkDelete}
              >
                <Button size="xs" variant="outline">
                  Delete
                </Button>
              </Popconfirm>
              <Select
                size="small"
                style={{ width: 140 }}
                placeholder="Update status"
                onChange={(val) => handleBulkStatus(val)}
              >
                <Option value="sent">Mark as Sent</Option>
                <Option value="accepted">Mark as Accepted</Option>
                <Option value="lost">Mark as Lost</Option>
              </Select>
            </div>
          </div>
        )}

        {/* Table / empty state */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-100 dark:border-[#262626] px-2 py-2">
          <Table
            size="small"
            rowKey="_id"
            dataSource={items}
            columns={columns}
            loading={loading}
            rowSelection={rowSelection}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (p, s) => loadData(p, s),
              showSizeChanger: true,
            }}
            scroll={{ x: 900 }}
            rowClassName={(_, index) =>
              `align-middle [&>td]:py-4 ${
                index % 2 === 0
                  ? "bg-white dark:bg-[#141414]"
                  : "bg-slate-50/60 dark:bg-[#181818]"
              } hover:bg-emerald-50/80 hover:dark:bg-emerald-900/20 transition-colors`
            }
          />
          {!loading && items.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-center text-sm text-slate-500">
              <div className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-100">
                No quotations yet
              </div>
              <p className="max-w-xs mb-4 text-[13px]">
                Start by creating your first EMI quotation from the calculator.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/loans/emi-calculator")}
              >
                <PlusOutlined style={{ fontSize: 12, marginRight: 6 }} />
                New quotation
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuotationManagerPage;
