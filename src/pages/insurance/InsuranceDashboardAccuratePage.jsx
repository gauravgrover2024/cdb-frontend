import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  RefreshCw,
  Search,
  Filter,
  X,
  Clock,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { insuranceApi } from "../../api/insurance";

dayjs.extend(customParseFormat);

const LEAD_STATUS_OPTIONS = [
  "All", "New", "Quotes Shared", "Payment Pending", "Inspection Pending", "Issued", "Closed",
];
const DATE_FILTER_OPTIONS = [
  { key: "createdAt", label: "Creation Date" },
  { key: "quotesSharedAt", label: "Quotes Shared Date" },
  { key: "inspectionDate", label: "Inspection Date" },
  { key: "issueDate", label: "Issue Date" },
  { key: "cancellationDate", label: "Cancellation Date" },
  { key: "closedDate", label: "Closed Date" },
];

const STATUS_COLORS = {
  "New": "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800",
  "Quotes Shared": "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800",
  "Payment Pending": "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-800",
  "Inspection Pending": "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800",
  "Issued": "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800",
  "Closed": "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700",
};

const normalizeText = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalizeText(value).toLowerCase();

const parseDateStrict = (value) => {
  const raw = normalizeText(value);
  if (!raw) return null;
  const parsed = dayjs(raw, ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", "D/M/YYYY", "D-M-YYYY", "DD MMM YYYY", "D MMM YYYY", "YYYY/MM/DD"], true);
  if (parsed.isValid()) return parsed;
  const fallback = dayjs(raw);
  return fallback.isValid() ? fallback : null;
};

const formatDateTime = (value) => {
  const parsed = parseDateStrict(value);
  return parsed ? parsed.format("DD MMM YYYY, hh:mm A") : "—";
};

const formatDate = (value) => {
  const parsed = parseDateStrict(value);
  return parsed ? parsed.format("DD MMM YYYY") : "—";
};

const getCaseId = (row) => normalizeText(row?.caseId) || normalizeText(row?._id) || normalizeText(row?.id);
const getAddress = (row) => normalizeText(row?.residenceAddress) || normalizeText(row?.customerSnapshot?.residenceAddress);
const getCustomerName = (row) => normalizeText(row?.customerName) || normalizeText(row?.customerSnapshot?.customerName) || normalizeText(row?.contactPersonName);
const getCompanyName = (row) => normalizeText(row?.companyName) || normalizeText(row?.customerSnapshot?.companyName);
const getMobile = (row) => normalizeText(row?.mobile) || normalizeText(row?.customerSnapshot?.primaryMobile);
const getVehicleLabel = (row) => [row?.vehicleMake, row?.vehicleModel, row?.vehicleVariant].map((v) => normalizeText(v)).filter(Boolean).join(" ");
const getRegistration = (row) => normalizeText(row?.registrationNumber) || normalizeText(row?.vehicleNumber);
const getRegYear = (row) => {
  const regDate = parseDateStrict(row?.dateOfReg);
  if (regDate) return regDate.format("YYYY");
  return normalizeText(row?.manufactureYear) || "—";
};
const getPrevPolicyNumber = (row) => normalizeText(row?.previousPolicyNumber);
const getPrevPolicyCompany = (row) => normalizeText(row?.previousInsuranceCompany);
const getPrevPolicyDueDate = (row) => normalizeText(row?.previousOdExpiryDate) || normalizeText(row?.newOdExpiryDate);
const getSourceType = (row) => {
  const source = normalizeLower(row?.source || row?.sourceOrigin);
  if (source.includes("indirect") || source.includes("dealer") || source.includes("broker")) return "Dealer";
  return "Inhouse";
};
const getAssignedTo = (row) => normalizeText(row?.renewalAssignedToName) || normalizeText(row?.employeeName) || "—";
const getInsuranceCategory = (row) => {
  const vType = normalizeLower(row?.vehicleType);
  const flowType = normalizeLower(row?.usedCarFlowType);
  if (vType === "new car") return "New Car";
  if (flowType.includes("expired")) return "Policy Already Expired";
  if (flowType.includes("renew")) return "Renewal";
  return "Used Car";
};
const getLeadStatus = (row) => {
  const status = normalizeLower(row?.renewalLeadStatus || row?.status);
  if (status.includes("quote")) return "Quotes Shared";
  if (status.includes("payment")) return "Payment Pending";
  if (status.includes("inspect")) return "Inspection Pending";
  if (status.includes("issued") || normalizeText(row?.newPolicyNumber)) return "Issued";
  if (status.includes("close") || status.includes("cancel")) return "Closed";
  return "New";
};
const getStatusDate = (row, leadStatus) => {
  if (leadStatus === "Quotes Shared") return row?.quotesSharedAt || row?.quoteSharedAt || row?.updatedAt;
  if (leadStatus === "Inspection Pending") return row?.inspectionDate || row?.inspectionCompletedAt || row?.updatedAt;
  if (leadStatus === "Issued") return row?.newIssueDate || row?.issueDate || row?.updatedAt;
  if (leadStatus === "Closed") return row?.closedDate || row?.cancelledAt || row?.updatedAt;
  if (leadStatus === "Payment Pending") return row?.paymentPendingAt || row?.updatedAt;
  return row?.updatedAt || row?.createdAt;
};
const getDateByFilterType = (row, key) => {
  if (key === "createdAt") return row?.createdAt;
  if (key === "quotesSharedAt") return row?.quotesSharedAt || row?.quoteSharedAt;
  if (key === "inspectionDate") return row?.inspectionDate || row?.inspectionCompletedAt;
  if (key === "issueDate") return row?.newIssueDate || row?.issueDate;
  if (key === "cancellationDate") return row?.cancelledAt || row?.cancellationDate;
  if (key === "closedDate") return row?.closedDate;
  return null;
};
const getTimeline = (row) => {
  const rawTimeline = Array.isArray(row?.renewalTimeline) ? row.renewalTimeline : Array.isArray(row?.timeline) ? row.timeline : [];
  const base = rawTimeline.map((item) => ({
    at: item?.at || item?.date || item?.createdAt,
    by: item?.by || item?.updatedBy || "System",
    status: item?.status || item?.event || "Update",
    comment: item?.comment || "",
  }));
  if (!base.length) {
    return [
      { at: row?.createdAt, by: "System", status: "Case Created", comment: "Initial case creation" },
      { at: row?.updatedAt, by: "System", status: "Latest Update", comment: "" },
    ].filter((x) => x.at);
  }
  return base.filter((x) => x.at).sort((a, b) => dayjs(b.at).valueOf() - dayjs(a.at).valueOf());
};

const KPI_TONES = {
  total: "from-slate-900 to-slate-700 text-white",
  new: "from-blue-600 to-blue-500 text-white",
  quotes: "from-amber-500 to-amber-400 text-white",
  payment: "from-orange-500 to-orange-400 text-white",
  issued: "from-emerald-600 to-emerald-500 text-white",
  closed: "from-zinc-700 to-zinc-600 text-white",
};

const KpiTile = ({ label, value, helper, tone = "total" }) => (
  <article className={`rounded-xl bg-gradient-to-br p-4 shadow-sm ${KPI_TONES[tone] || KPI_TONES.total}`}>
    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-90">{label}</p>
    <p className="mt-2 text-2xl font-semibold leading-none">{value}</p>
    {helper ? <p className="mt-2 text-[11px] opacity-90">{helper}</p> : null}
  </article>
);

const LoadingSkeleton = () => (
  <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
    <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
    <div className="mt-3 h-3 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
    <div className="mt-2 h-3 w-40 rounded bg-zinc-200 dark:bg-zinc-700" />
    <div className="mt-4 h-20 rounded bg-zinc-100 dark:bg-zinc-800" />
    <div className="mt-4 flex gap-2">
      <div className="h-8 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-8 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
    </div>
  </div>
);

const InsuranceDashboardAccuratePage = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timelineRow, setTimelineRow] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState("");
  const [copiedCaseId, setCopiedCaseId] = useState("");

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [leadStatusFilter, setLeadStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [assignedToFilter, setAssignedToFilter] = useState("All");
  const [dateTypeFilter, setDateTypeFilter] = useState("createdAt");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await insuranceApi.getAll();
      const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res?.items) ? res.items : [];
      setCases(rows);
      setLastRefreshedAt(dayjs().toISOString());
    } catch (err) {
      setError(err?.message || "Failed to load insurance cases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCases(); }, [loadCases]);

  const assignedToOptions = useMemo(() => {
    const vals = Array.from(new Set(cases.map((row) => getAssignedTo(row)).filter((x) => x && x !== "—"))).sort((a, b) => a.localeCompare(b));
    return ["All", ...vals];
  }, [cases]);

  const clearFilters = () => {
    setSearch(""); setSourceFilter("All"); setLeadStatusFilter("All");
    setCategoryFilter("All"); setAssignedToFilter("All"); setDateTypeFilter("createdAt");
    setFromDate(""); setToDate("");
  };

  const handleCopyCaseId = useCallback(async (caseId) => {
    if (!caseId) return;
    try {
      await navigator.clipboard.writeText(caseId);
      setCopiedCaseId(caseId);
      setTimeout(() => setCopiedCaseId((prev) => (prev === caseId ? "" : prev)), 1200);
    } catch {
      // ignore clipboard failure silently
    }
  }, []);

  const rows = useMemo(() => {
    const q = normalizeLower(search);
    const from = parseDateStrict(fromDate);
    const to = parseDateStrict(toDate);

    return (Array.isArray(cases) ? cases : []).filter((row) => {
      const source = getSourceType(row);
      const leadStatus = getLeadStatus(row);
      const category = getInsuranceCategory(row);
      const assignedTo = getAssignedTo(row);
      const searchBag = [getCustomerName(row), getMobile(row), row?.dealerChannelName, row?.sourceName, getPrevPolicyCompany(row), getRegistration(row)].map((x) => normalizeLower(x)).join(" ");

      if (q && !searchBag.includes(q)) return false;
      if (sourceFilter !== "All" && source !== sourceFilter) return false;
      if (leadStatusFilter !== "All" && leadStatus !== leadStatusFilter) return false;
      if (categoryFilter !== "All" && category !== categoryFilter) return false;
      if (assignedToFilter !== "All" && assignedTo !== assignedToFilter) return false;

      const dateValue = parseDateStrict(getDateByFilterType(row, dateTypeFilter));
      if (from && (!dateValue || dateValue.isBefore(from.startOf("day")))) return false;
      if (to && (!dateValue || dateValue.isAfter(to.endOf("day")))) return false;
      return true;
    });
  }, [assignedToFilter, cases, categoryFilter, dateTypeFilter, fromDate, leadStatusFilter, search, sourceFilter, toDate]);

  const kpis = useMemo(() => {
    const source = Array.isArray(rows) ? rows : [];
    const byStatus = (name) => source.filter((r) => getLeadStatus(r) === name).length;
    return {
      total: source.length,
      totalRaw: Array.isArray(cases) ? cases.length : 0,
      newCount: byStatus("New"),
      quotesCount: byStatus("Quotes Shared"),
      paymentCount: byStatus("Payment Pending"),
      issuedCount: byStatus("Issued"),
      closedCount: byStatus("Closed"),
    };
  }, [cases, rows]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (search.trim()) chips.push(`Search: ${search.trim()}`);
    if (sourceFilter !== "All") chips.push(`Source: ${sourceFilter}`);
    if (leadStatusFilter !== "All") chips.push(`Status: ${leadStatusFilter}`);
    if (categoryFilter !== "All") chips.push(`Category: ${categoryFilter}`);
    if (assignedToFilter !== "All") chips.push(`Assigned: ${assignedToFilter}`);
    if (fromDate) chips.push(`From: ${formatDate(fromDate)}`);
    if (toDate) chips.push(`To: ${formatDate(toDate)}`);
    return chips;
  }, [assignedToFilter, categoryFilter, fromDate, leadStatusFilter, search, sourceFilter, toDate]);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5">
        <header className="sticky top-0 z-20 rounded-xl border border-zinc-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Insurance Case Listing</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Case ops dashboard for renewals and new policy journeys.
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Last refreshed: {lastRefreshedAt ? formatDateTime(lastRefreshedAt) : "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={loadCases}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <KpiTile label="Total" value={kpis.total} helper={`From ${kpis.totalRaw}`} tone="total" />
          <KpiTile label="New" value={kpis.newCount} tone="new" />
          <KpiTile label="Quotes Shared" value={kpis.quotesCount} tone="quotes" />
          <KpiTile label="Payment Pending" value={kpis.paymentCount} tone="payment" />
          <KpiTile label="Issued" value={kpis.issuedCount} tone="issued" />
          <KpiTile label="Closed" value={kpis.closedCount} tone="closed" />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer, mobile, dealer, insurer, reg no..." className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950" />
            </div>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="All">All Sources</option><option value="Dealer">Dealer</option><option value="Inhouse">Inhouse</option>
            </select>
            <select value={leadStatusFilter} onChange={(e) => setLeadStatusFilter(e.target.value)} className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950">
              {LEAD_STATUS_OPTIONS.map((x) => <option key={x} value={x}>{x === "All" ? "All Statuses" : x}</option>)}
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="All">All Categories</option><option value="New Car">New Car</option><option value="Used Car">Used Car</option><option value="Renewal">Renewal</option><option value="Policy Already Expired">Expired</option>
            </select>
            <select value={assignedToFilter} onChange={(e) => setAssignedToFilter(e.target.value)} className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950">
              {assignedToOptions.map((x) => <option key={x} value={x}>{x === "All" ? "All Assignees" : x}</option>)}
            </select>
            <select value={dateTypeFilter} onChange={(e) => setDateTypeFilter(e.target.value)} className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950">
              {DATE_FILTER_OPTIONS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950" />
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950" />
            </div>
            <button type="button" onClick={clearFilters} className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800">
              Clear Filters
            </button>
          </div>
          {activeFilterChips.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeFilterChips.map((chip) => (
                <span key={chip} className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={loadCases} className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-semibold">Retry</button>
          </div>
        ) : null}

        {loading ? (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => <LoadingSkeleton key={`skeleton-${idx}`} />)}
          </section>
        ) : rows.length === 0 ? (
          <section className="flex flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-14 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
              <Search className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No cases match your filters</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Try adjusting search terms or clearing filters</p>
            <button type="button" onClick={clearFilters} className="mt-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold">
              Clear all filters
            </button>
          </section>
        ) : (
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Case & Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Vehicle</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Policy</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Meta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {rows.map((row) => {
                    const caseId = getCaseId(row) || "—";
                    const leadStatus = getLeadStatus(row);
                    const statusDate = getStatusDate(row, leadStatus);
                    const category = getInsuranceCategory(row);
                    const copied = copiedCaseId === caseId;
                    return (
                      <tr key={caseId} className="align-top transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                        <td className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{caseId}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[leadStatus] || STATUS_COLORS.New}`}>{leadStatus}</span>
                                <span className="inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                  {getSourceType(row)}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyCaseId(caseId)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              aria-label="Copy case id"
                            >
                              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{[getCustomerName(row), getCompanyName(row)].filter(Boolean).join(" / ") || "—"}</p>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{getMobile(row) || "—"}</p>
                          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 line-clamp-2">{getAddress(row) || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-zinc-800 dark:text-zinc-200">{getVehicleLabel(row) || "—"}</p>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{getRegistration(row) || "—"} · {getRegYear(row)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-zinc-900 dark:text-zinc-100">{getPrevPolicyNumber(row) || "—"}</p>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{getPrevPolicyCompany(row) || "—"}</p>
                          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">Exp: {formatDate(getPrevPolicyDueDate(row))}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400"><span className="font-semibold">Category:</span> {category}</p>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"><span className="font-semibold">Assigned:</span> {getAssignedTo(row)}</p>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"><span className="font-semibold">Status Date:</span> {formatDateTime(statusDate)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-2">
                            <button type="button" onClick={() => navigate(`/insurance/edit/${row?._id || row?.id || row?.caseId}`)} className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
                              View / Edit
                            </button>
                            <button type="button" onClick={() => setTimelineRow(row)} className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
                              <Clock className="h-3 w-3" />
                              Timeline
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Timeline Modal */}
      {timelineRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <h3 className="text-base font-semibold">Timeline · {getCaseId(timelineRow)}</h3>
              <button type="button" onClick={() => setTimelineRow(null)} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
              {getTimeline(timelineRow).map((item, idx) => (
                <div key={`${item.at}-${idx}`} className="relative pl-6 before:absolute before:left-2 before:top-2 before:h-full before:w-px before:bg-zinc-200 dark:before:bg-zinc-700 last:before:hidden">
                  <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-sm dark:border-zinc-900" />
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{formatDateTime(item.at)}</span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.by}</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.status}</div>
                    {item.comment && <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{item.comment}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceDashboardAccuratePage;