import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, PencilLine, Trash2, Eye, ShieldCheck } from "lucide-react";
import {
  Alert,
  Button,
  Empty,
  Input,
  message,
  Pagination,
  Popconfirm,
  Tag,
  Tooltip,
  Typography,
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

const hasDisplayValue = (value) => {
  if (value == null) return false;
  const text = String(value).trim();
  return text.length > 0 && text.toLowerCase() !== "n/a";
};

/** @param {Record<string, unknown>} c */
const premiumNum = (c) => {
  const n = Number(c?.newTotalPremium);
  return Number.isFinite(n) ? n : 0;
};

/** @param {Record<string, unknown>} c */
const hasPolicyNumber = (c) => hasDisplayValue(c?.newPolicyNumber);

/** @param {Record<string, unknown>} c */
const vehicleTypeLower = (c) =>
  String(c?.typesOfVehicle || "").trim().toLowerCase();

/** @param {Record<string, unknown>} c */
const isTwoWheeler = (c) => {
  const v = vehicleTypeLower(c);
  return (
    v.includes("two") ||
    v.includes("2w") ||
    v.includes("2 wheel") ||
    v.includes("bike") ||
    v.includes("scooter")
  );
};

/** @param {Record<string, unknown>} c */
const isCommercial = (c) => {
  const v = vehicleTypeLower(c);
  return v.includes("commercial") || /\bcomm\b/.test(v) || v.includes("goods");
};

/** @param {Record<string, unknown>} c */
const isFourWheeler = (c) => {
  if (isTwoWheeler(c) || isCommercial(c)) return false;
  const v = vehicleTypeLower(c);
  return (
    v.includes("four") ||
    v.includes("4w") ||
    v.includes("4 wheel") ||
    v === "" ||
    v.includes("car") ||
    v.includes("suv")
  );
};

/**
 * @param {Record<string, unknown>} c
 * @param {'all'|'completed'|'draft'|'paymentDue'|'fullyPaid'|'2w'|'4w'|'comm'} key
 */
const matchesPolicyFilter = (c, key) => {
  const st = String(c?.status || "").toLowerCase();
  switch (key) {
    case "all":
      return true;
    case "completed":
      return st === "submitted" || st === "issued";
    case "draft":
      return st === "draft";
    case "paymentDue":
      return (
        st === "submitted" &&
        (!hasPolicyNumber(c) || premiumNum(c) <= 0)
      );
    case "fullyPaid":
      return (
        st === "issued" ||
        (st === "submitted" && hasPolicyNumber(c) && premiumNum(c) > 0)
      );
    case "2w":
      return isTwoWheeler(c);
    case "4w":
      return isFourWheeler(c);
    case "comm":
      return isCommercial(c);
    default:
      return true;
  }
};

/** @param {Record<string, unknown>[]} list */
const policyFilterCounts = (list) => {
  const rows = Array.isArray(list) ? list : [];
  return {
    all: rows.length,
    completed: rows.filter((c) => matchesPolicyFilter(c, "completed")).length,
    draft: rows.filter((c) => matchesPolicyFilter(c, "draft")).length,
    paymentDue: rows.filter((c) => matchesPolicyFilter(c, "paymentDue")).length,
    fullyPaid: rows.filter((c) => matchesPolicyFilter(c, "fullyPaid")).length,
    "2w": rows.filter((c) => matchesPolicyFilter(c, "2w")).length,
    "4w": rows.filter((c) => matchesPolicyFilter(c, "4w")).length,
    comm: rows.filter((c) => matchesPolicyFilter(c, "comm")).length,
  };
};

const FILTER_CHIPS = [
  { key: "all", label: "All Policies" },
  { key: "completed", label: "Completed" },
  { key: "draft", label: "Draft" },
  { key: "paymentDue", label: "Payment Due" },
  { key: "fullyPaid", label: "Fully Paid" },
  { key: "2w", label: "2W" },
  { key: "4w", label: "4W" },
  { key: "comm", label: "Comm" },
];

const InsuranceDashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState("");
  const [policyFilter, setPolicyFilter] = useState("all");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

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
      if (!id) {
        message.error("Invalid case ID");
        return;
      }
      await insuranceApi.delete(id);
      message.success(`Case ${caseName} deleted successfully`);
      setCases((prev) => prev.filter((c) => getCaseId(c) !== id));
    } catch (err) {
      console.error("[InsuranceDashboard] delete error:", err);
      if (err.status === 404) {
        message.warning(`Case no longer exists on server, removing from list`);
        setCases((prev) => prev.filter((c) => getCaseId(c) !== id));
      } else {
        message.error(err?.message || "Failed to delete case");
      }
    }
  }, []);

  const stats = useMemo(() => {
    const total = cases.length;
    const draftCount = cases.filter((c) => c.status === "draft").length;
    const submittedCount = cases.filter((c) => c.status === "submitted").length;
    return {
      total,
      draft: draftCount,
      submitted: submittedCount,
      actionNeeded: draftCount,
    };
  }, [cases]);

  const filterCounts = useMemo(() => policyFilterCounts(cases), [cases]);

  const filteredCases = useMemo(() => {
    return (cases || []).filter((c) => {
      if (!matchesPolicyFilter(c, policyFilter)) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const haystack = [
        c.caseId,
        c.customerSnapshot?.customerName,
        c.customerSnapshot?.companyName,
        c.customerSnapshot?.primaryMobile,
        c.vehicleNumber,
        c.registrationNumber,
        c.vehicleModel,
        c.newInsuranceCompany,
        c.newPolicyNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [cases, search, policyFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, policyFilter, cases.length]);

  const paginatedCases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, page]);

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-sky-50 via-white to-white p-4 md:p-6 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="flex h-full min-h-0 flex-col gap-5">
        {/* Header — matches loan dashboard command center */}
        <section className="rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/40">
                <ShieldCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-400">
                  Insurance Module
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl dark:text-slate-100">
                  Dashboard Command Center
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Cases, policy snapshot, and actions — same layout as loans.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 dark:border-sky-900/40 dark:bg-sky-950/30">
                <p className="text-slate-500 dark:text-slate-400">In view</p>
                <p className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {filteredCases.length}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <p className="text-slate-500 dark:text-slate-400">Submitted</p>
                <p className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {stats.submitted}
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30">
                <p className="text-slate-500 dark:text-slate-400">Draft</p>
                <p className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {stats.draft}
                </p>
              </div>
            </div>

            <Button
              type="primary"
              size="large"
              icon={<Plus size={18} />}
              onClick={() => navigate("/insurance/new")}
              className="w-full shrink-0 sm:w-auto"
            >
              New Insurance Case
            </Button>
          </div>
        </section>

        {/* Metric strip — loan-style clickable-looking cards (visual only) */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Total cases
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">
              {stats.total}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">All records</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Draft
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">
              {stats.draft}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">Needs completion</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Submitted
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">
              {stats.submitted}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">Filed / done</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Action needed
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-amber-700 dark:text-amber-400">
              {stats.actionNeeded}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">Draft queue</p>
          </div>
        </section>

        {/* Filter bar — loan grid toolbar style */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex-shrink-0 border-b border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                <Text className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {filteredCases.length} of {cases.length} cases
                </Text>
                <Search
                  placeholder="Search case, customer, mobile, vehicle, policy..."
                  allowClear
                  value={search}
                  onSearch={(val) => setSearch(val || "")}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full min-w-0 lg:max-w-sm lg:flex-1"
                />
              </div>

              {/* Filter Policies — one scrollable row on small screens, wraps on larger */}
              <div className="min-w-0 border-t border-slate-200/60 pt-3 dark:border-slate-800">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
                  Filter Policies
                </p>
                <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
                  {FILTER_CHIPS.map(({ key, label }) => {
                    const count =
                      filterCounts[key] ?? filterCounts.all;
                    const active = policyFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPolicyFilter(key)}
                        className={`inline-flex shrink-0 items-baseline gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition-colors ${
                          active
                            ? "border-sky-500 bg-sky-50 text-sky-800 shadow-sm dark:border-sky-500 dark:bg-sky-950/50 dark:text-sky-100"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
                        }`}
                      >
                        <span>{label}</span>
                        <span className="tabular-nums text-[13px] font-black text-slate-900 dark:text-slate-100">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-4">
            {error && (
              <Alert
                type="error"
                showIcon
                message="Failed to load insurance cases"
                description={error}
                className="mb-4"
              />
            )}

            {loading && cases.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center text-slate-500">
                Loading cases…
              </div>
            ) : filteredCases.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No insurance cases found"
              />
            ) : (
              <div className="space-y-3">
                {paginatedCases.map((record) => {
                  const snap = record.customerSnapshot || {};
                  const customerName =
                    snap.customerName ||
                    snap.companyName ||
                    snap.contactPersonName ||
                    "—";
                  const reg =
                    record.registrationNumber ||
                    record.vehicleNumber ||
                    "—";
                  const vehicleTitle = [
                    record.vehicleMake,
                    record.vehicleModel,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || "—";
                  const stepLabel =
                    STEP_LABEL_MAP[record.currentStep] || "—";
                  const statusVal = record.status;
                  const tagColor =
                    STATUS_COLOR_MAP[statusVal] || "default";
                  const statusLabel =
                    STATUS_LABEL_MAP[statusVal] || statusVal || "Unknown";
                  const createdAt = record.createdAt
                    ? dayjs(record.createdAt)
                    : null;
                  const createdLabel =
                    createdAt?.isValid()
                      ? createdAt.format("DD MMM YYYY, HH:mm")
                      : "—";
                  const expiry = record.policyExpiry
                    ? dayjs(record.policyExpiry)
                    : null;
                  const expiryLabel =
                    expiry?.isValid()
                      ? expiry.format("DD MMM YYYY")
                      : "—";
                  const premium = record.newTotalPremium;
                  const insurer = record.newInsuranceCompany;
                  const docCount = Array.isArray(record.documents)
                    ? record.documents.length
                    : 0;
                  const isDraft = statusVal === "draft";
                  const id = getCaseId(record);

                  return (
                    <article
                      key={id}
                      className="group rounded-xl border border-slate-200/90 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40"
                    >
                      <div className="border-b border-slate-200/80 px-3 py-2 dark:border-slate-800">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
                              Insurance
                            </span>
                            <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[12px] font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                              {record.caseId || id}
                            </span>
                            <Tag color={tagColor} className="m-0">
                              {statusLabel}
                            </Tag>
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Step {record.currentStep ?? "—"}: {stepLabel}
                            </span>
                          </div>
                          <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                            <div>Created</div>
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              {createdLabel}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 p-3">
                        <section className="grid grid-cols-1 gap-2 lg:grid-cols-5">
                          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/60">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Customer
                            </p>
                            <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                              {customerName}
                            </p>
                            {hasDisplayValue(snap.primaryMobile) && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                {snap.primaryMobile}
                              </p>
                            )}
                            {hasDisplayValue(snap.city) && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {snap.city}
                                {hasDisplayValue(snap.pincode)
                                  ? ` · ${snap.pincode}`
                                  : ""}
                              </p>
                            )}
                          </div>

                          <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-2 dark:border-sky-900/70 dark:bg-sky-950/40">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
                              Vehicle
                            </p>
                            <p className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                              {vehicleTitle}
                            </p>
                            <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                              Reg: {reg}
                            </p>
                            <p className="text-[10px] text-slate-600 dark:text-slate-300">
                              {record.typesOfVehicle || "Four Wheeler"} ·{" "}
                              {record.vehicleType || "Used"}
                            </p>
                          </div>

                          <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50/80 p-2 dark:border-fuchsia-900/70 dark:bg-fuchsia-950/40">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-700 dark:text-fuchsia-300">
                              Policy
                            </p>
                            <p className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                              {hasDisplayValue(insurer) ? insurer : "—"}
                            </p>
                            <p className="text-[11px] text-slate-700 dark:text-slate-200">
                              Premium:{" "}
                              <span className="font-semibold">
                                {premium != null && premium !== ""
                                  ? `₹${premium}`
                                  : "—"}
                              </span>
                            </p>
                            <p className="truncate text-[10px] text-slate-600 dark:text-slate-300">
                              No.{" "}
                              {hasDisplayValue(record.newPolicyNumber)
                                ? record.newPolicyNumber
                                : "—"}
                            </p>
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/60">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Dates & docs
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-700 dark:text-slate-200">
                              Expiry:{" "}
                              <span className="font-semibold">
                                {expiryLabel}
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-600 dark:text-slate-300">
                              Documents:{" "}
                              <span className="font-semibold">{docCount}</span>
                            </p>
                            {hasDisplayValue(record.sourceOrigin) && (
                              <p className="truncate text-[10px] text-slate-500">
                                Source: {record.sourceOrigin}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/60">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                Actions
                              </p>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center justify-end gap-1">
                              <Tooltip title="View details">
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-100 text-sky-700 hover:bg-sky-200 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300"
                                  onClick={() => {
                                    setSelectedCase(record);
                                    setPreviewVisible(true);
                                  }}
                                >
                                  <Eye size={14} />
                                </button>
                              </Tooltip>
                              <Tooltip
                                title={isDraft ? "Continue case" : "Edit case"}
                              >
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300"
                                  onClick={() =>
                                    navigate(`/insurance/edit/${id}`)
                                  }
                                >
                                  <PencilLine size={14} />
                                </button>
                              </Tooltip>
                              <Popconfirm
                                title="Delete case"
                                description={`Delete "${record.caseId}"? This cannot be undone.`}
                                onConfirm={() =>
                                  handleDeleteCase(id, record.caseId)
                                }
                                okText="Delete"
                                okType="danger"
                                cancelText="Cancel"
                              >
                                <Tooltip title="Delete">
                                  <button
                                    type="button"
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </Tooltip>
                              </Popconfirm>
                            </div>
                          </div>
                        </section>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {filteredCases.length > 0 && (
              <div className="mt-4 flex justify-end border-t border-slate-200/80 pt-3 dark:border-slate-800">
                <Pagination
                  size="small"
                  current={page}
                  pageSize={pageSize}
                  total={filteredCases.length}
                  onChange={(p) => setPage(p)}
                  showSizeChanger={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>

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
