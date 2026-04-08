import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, PencilLine, Trash2, Eye } from "lucide-react";
import {
  Alert,
  Button,
  Empty,
  Input,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Select,
} from "antd";
import dayjs from "dayjs";
import { insuranceApi } from "../../api/insurance";
import InsurancePreview from "../../components/insurance/InsurancePreview";

const { Text } = Typography;
const { Search } = Input;

const STATUS_COLOR_MAP = {
  draft: "default",
  submitted: "success",
};

const STATUS_LABEL_MAP = {
  draft: "Draft",
  submitted: "Submitted",
};

const STEP_LABEL_MAP = {
  1: "Customer",
  2: "Vehicle",
  3: "Prev. Policy",
  4: "Quotes",
  5: "Policy",
  6: "Documents",
};

const getCaseId = (item) => item?._id || item?.id || item?.caseId || "";

const InsuranceDashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await insuranceApi.getAll();
        const rows = Array.isArray(res?.data) ? res.data : res?.items || [];
        setCases(rows);
      } catch (err) {
        console.error("[InsuranceDashboard] load error:", err);
        setError(err?.message || "Failed to load insurance cases");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDeleteCase = useCallback(async (id, caseName) => {
    try {
      // id is already extracted as a string, use it directly
      if (!id) {
        message.error("Invalid case ID");
        return;
      }
      await insuranceApi.delete(id);
      message.success(`Case ${caseName} deleted successfully`);
      setCases((prev) => prev.filter((c) => getCaseId(c) !== id));
    } catch (err) {
      console.error("[InsuranceDashboard] delete error:", err);

      // If case is not found (404), remove it from local list anyway
      if (err.status === 404) {
        message.warning(`Case no longer exists on server, removing from list`);
        setCases((prev) => prev.filter((c) => getCaseId(c) !== id));
      } else {
        message.error(err?.message || "Failed to delete case");
      }
    }
  }, []);

  const renderExpandedDetails = (record) => {
    const snap = record.customerSnapshot || {};
    const createdAtObj = dayjs(record.createdAt);
    const policyExpiryObj = dayjs(record.policyExpiry);
    const createdDate =
      record.createdAt && createdAtObj.isValid()
        ? createdAtObj.format("DD MMM YYYY")
        : "-";
    const expiryDate =
      record.policyExpiry && policyExpiryObj.isValid()
        ? policyExpiryObj.format("DD MMM YYYY")
        : "-";

    const Field = ({ label, value }) => (
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-1">
          {label}
        </p>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
          {value || "—"}
        </p>
      </div>
    );

    return (
      <div className="space-y-4 py-4">
        {/* Customer Details Section */}
        <section className="rounded-xl border border-slate-200/70 bg-white/50 backdrop-blur px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <h4 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
            👤 Customer Details
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Type" value={record.buyerType || "Individual"} />
            <Field label="Name" value={snap.customerName || snap.companyName} />
            <Field label="Mobile" value={snap.primaryMobile} />
            <Field label="Email" value={snap.email} />
            <Field label="City" value={snap.city} />
            <Field label="Pincode" value={snap.pincode} />
            <Field
              label="Policy By"
              value={record.policyDoneBy || "Autocredits"}
            />
            {record.sourceOrigin && (
              <Field label="Source" value={record.sourceOrigin} />
            )}
          </div>
        </section>

        {/* Vehicle Details Section */}
        <section className="rounded-xl border border-slate-200/70 bg-white/50 backdrop-blur px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <h4 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
            🚗 Vehicle Details
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Registration" value={record.registrationNumber} />
            <Field
              label="Make & Model"
              value={
                `${record.vehicleMake || ""} ${record.vehicleModel || ""}`.trim() ||
                "N/A"
              }
            />
            <Field label="Variant" value={record.vehicleVariant} />
            <Field
              label="Category"
              value={record.typesOfVehicle || "Four Wheeler"}
            />
            <Field label="Type" value={record.vehicleType || "Used"} />
            <Field label="CC" value={record.cubicCapacity} />
          </div>
        </section>

        {/* Policy Details Section */}
        <section className="rounded-xl border border-slate-200/70 bg-white/50 backdrop-blur px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <h4 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
            📋 Policy Details
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Insurance Company"
              value={record.newInsuranceCompany || "N/A"}
            />
            <Field
              label="Policy Number"
              value={record.newPolicyNumber || "N/A"}
            />
            <Field
              label="Policy Type"
              value={record.newPolicyType || "Motor"}
            />
            <Field
              label="Premium"
              value={`₹${record.newTotalPremium || "N/A"}`}
            />
            <Field
              label="IDV Amount"
              value={`₹${record.newIdvAmount || "N/A"}`}
            />
            <Field
              label="NCB Discount"
              value={`${record.newNcbDiscount || 0}%`}
            />
          </div>
        </section>

        {/* Status & Dates Section */}
        <section className="rounded-xl border border-slate-200/70 bg-white/50 backdrop-blur px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <h4 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
            📅 Status & Dates
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-2">
                Status
              </div>
              <Tag color={STATUS_COLOR_MAP[record.status]}>
                {STATUS_LABEL_MAP[record.status] || record.status}
              </Tag>
            </div>
            <Field label="Created" value={createdDate} />
            <Field label="Expiry" value={expiryDate} />
            <Field
              label="Documents"
              value={`${Array.isArray(record.documents) ? record.documents.length : 0}`}
            />
          </div>
        </section>
      </div>
    );
  };

  const stats = useMemo(() => {
    const total = cases.length;
    const draftCount = cases.filter((c) => c.status === "draft").length;
    const submittedCount = cases.filter((c) => c.status === "submitted").length;
    const actionNeeded = draftCount;
    return {
      total,
      draft: draftCount,
      submitted: submittedCount,
      actionNeeded,
    };
  }, [cases]);

  const filteredCases = useMemo(() => {
    return (cases || []).filter((c) => {
      const matchesStatus =
        statusFilter === "all" ? true : c.status === statusFilter;
      const q = search.trim().toLowerCase();
      if (!q) return matchesStatus;
      const haystack = [
        c.caseId,
        c.customerSnapshot?.customerName,
        c.customerSnapshot?.companyName,
        c.customerSnapshot?.primaryMobile,
        c.vehicleNumber,
        c.registrationNumber,
        c.vehicleModel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && haystack.includes(q);
    });
  }, [cases, search, statusFilter]);

  const columns = useMemo(
    () => [
      {
        title: "Case ID",
        dataIndex: "caseId",
        key: "caseId",
        render: (val) => (
          <Text code strong>
            {val}
          </Text>
        ),
      },
      {
        title: "Customer",
        key: "customer",
        render: (_, record) => {
          const snap = record.customerSnapshot || {};
          const name =
            snap.customerName ||
            snap.companyName ||
            snap.contactPersonName ||
            "-";
          return (
            <Space direction="vertical" size={2}>
              <Text strong>{name}</Text>
              {snap.primaryMobile ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {snap.primaryMobile}
                </Text>
              ) : null}
            </Space>
          );
        },
      },
      {
        title: "Vehicle",
        key: "vehicle",
        render: (_, record) => {
          const model = record.vehicleModel || record.vehicleMake || "-";
          const number =
            record.vehicleNumber || record.registrationNumber || "";
          return (
            <Space direction="vertical" size={2}>
              <Text>{model}</Text>
              {number ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {number}
                </Text>
              ) : null}
            </Space>
          );
        },
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (val, record) => {
          const color = STATUS_COLOR_MAP[val] || "default";
          const label = STATUS_LABEL_MAP[val] || val || "Unknown";
          const stepLabel = STEP_LABEL_MAP[record.currentStep] || null;
          return (
            <Space direction="vertical" size={2}>
              <Tag color={color}>{label}</Tag>
              {stepLabel ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Step {record.currentStep}: {stepLabel}
                </Text>
              ) : null}
            </Space>
          );
        },
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (val) =>
          val ? (
            <Text type="secondary">
              {dayjs(val).format("DD MMM YYYY, HH:mm")}
            </Text>
          ) : (
            "-"
          ),
      },
      {
        title: "Actions",
        key: "actions",
        render: (_, record) => {
          const isDraft = record.status === "draft";
          return (
            <Space>
              <Tooltip title="View details">
                <Button
                  size="small"
                  icon={<Eye size={14} />}
                  onClick={() => {
                    setSelectedCase(record);
                    setPreviewVisible(true);
                  }}
                >
                  View
                </Button>
              </Tooltip>
              <Tooltip title={isDraft ? "Continue case" : "Edit case"}>
                <Button
                  size="small"
                  type="primary"
                  icon={<PencilLine size={14} />}
                  onClick={() =>
                    navigate(`/insurance/edit/${getCaseId(record)}`)
                  }
                >
                  {isDraft ? "Continue" : "Edit"}
                </Button>
              </Tooltip>
              <Popconfirm
                title="Delete Case"
                description={`Are you sure you want to delete case "${record.caseId}"? This action cannot be undone.`}
                onConfirm={() =>
                  handleDeleteCase(getCaseId(record), record.caseId)
                }
                okText="Delete"
                okType="danger"
                cancelText="Cancel"
              >
                <Tooltip title="Delete case">
                  <Button size="small" danger icon={<Trash2 size={14} />}>
                    Delete
                  </Button>
                </Tooltip>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [navigate, handleDeleteCase],
  );

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-transparent p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/30">
      <div className="flex h-full min-h-0 flex-col gap-5">
        {/* Header Section */}
        <section className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">
                Insurance Module
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl dark:text-slate-100">
                Insurance Command Center
              </h1>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<Plus size={18} />}
              onClick={() => navigate("/insurance/new")}
              className="w-fit"
            >
              New Insurance Case
            </Button>
          </div>
        </section>

        {/* Stats Section */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 dark:border-sky-900/40 dark:bg-sky-950/30">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Total Cases
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {stats.total}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-slate-600 dark:text-slate-400 text-sm">Draft</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {stats.draft}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Submitted
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {stats.submitted}
            </p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/30">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Action Needed
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {stats.actionNeeded}
            </p>
          </div>
        </section>

        {/* Filter & Search Section */}
        <section className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {filteredCases.length} of {cases.length} cases
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Search
                placeholder="Search case, customer, mobile..."
                allowClear
                size="small"
                value={search}
                onSearch={(val) => setSearch(val || "")}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64"
              />
              <Select
                size="small"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "draft", label: "Draft" },
                  { value: "submitted", label: "Submitted" },
                ]}
                className="w-full sm:w-44"
              />
            </div>
          </div>
        </section>

        {/* Table Section */}
        <section className="flex-1 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          {error && (
            <Alert
              type="error"
              showIcon
              message="Failed to load insurance cases"
              description={error}
              style={{
                marginBottom: 12,
                borderRadius: 0,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }}
            />
          )}
          <div className="overflow-x-auto h-full">
            <Table
              rowKey={(record) => getCaseId(record)}
              columns={columns}
              dataSource={filteredCases}
              loading={loading}
              pagination={{ pageSize: 10, size: "small" }}
              expandable={{
                expandedRowRender: (record) => renderExpandedDetails(record),
                expandRowByClick: true,
              }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No insurance cases found"
                  />
                ),
              }}
              className="dark:bg-slate-800"
            />
          </div>
        </section>
      </div>

      {/* Insurance Preview Modal */}
      <InsurancePreview
        visible={previewVisible}
        onClose={() => {
          setPreviewVisible(false);
          setSelectedCase(null);
        }}
        data={selectedCase}
      />
    </div>
  );
};

export default InsuranceDashboardPage;
