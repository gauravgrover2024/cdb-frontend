import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  message,
  Modal,
  Popconfirm,
  Input,
  Tooltip,
  Button as AntButton,
} from "antd";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import CustomerViewModal from "./CustomerViewModal";
import { customersApi } from "../../api/customers";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";

const PRIMARY_STAT_THEMES = {
  all: {
    card: "from-sky-500 to-indigo-600",
    iconBg: "bg-white/20",
    accent: "text-sky-100",
  },
  completed: {
    card: "from-emerald-500 to-green-600",
    iconBg: "bg-white/20",
    accent: "text-emerald-100",
  },
  pending: {
    card: "from-amber-500 to-orange-600",
    iconBg: "bg-white/20",
    accent: "text-amber-100",
  },
  repeat: {
    card: "from-violet-500 to-fuchsia-600",
    iconBg: "bg-white/20",
    accent: "text-violet-100",
  },
};

const MetricCard = ({ id, title, subtitle, value, iconName, onClick, isActive }) => {
  const theme = PRIMARY_STAT_THEMES[id] || PRIMARY_STAT_THEMES.all;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left w-full overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br ${theme.card} p-4 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
    >
      <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] uppercase tracking-[0.18em] font-semibold ${theme.accent}`}>
            {title}
          </p>
          <p className="mt-1 text-2xl md:text-3xl font-black text-white tabular-nums">
            {value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-white/80">{subtitle}</p>}
        </div>

        <div className={`mt-1 h-10 w-10 rounded-xl ${theme.iconBg} text-white flex items-center justify-center backdrop-blur-sm`}>
          <Icon name={iconName} size={18} />
        </div>
      </div>

      {isActive && (
        <div className="absolute right-2 top-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
          Active
        </div>
      )}
    </button>
  );
};

const getKycTheme = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "completed") {
    return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (s === "in progress") {
    return "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300";
  }
  if (s === "pending docs") {
    return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
  }
  if (s === "rejected") {
    return "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300";
  }
  return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

const normalizeSearchText = (value) => String(value || "").trim().toLowerCase();

const matchesCustomerSearch = (customer, query) => {
  const q = normalizeSearchText(query);
  if (!q) return true;
  const name = normalizeSearchText(customer?.customerName);
  const mobile = String(customer?.primaryMobile || "");
  const city = normalizeSearchText(customer?.city);
  const pan = normalizeSearchText(customer?.panNumber);
  const customerId = normalizeSearchText(customer?.customerId);
  return (
    name.includes(q) ||
    mobile.includes(q) ||
    city.includes(q) ||
    pan.includes(q) ||
    customerId.includes(q)
  );
};

const CustomerDashboard = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [searchDebounced, setSearchDebounced] = useState("");
  const requestRef = useRef(0);
  const globalSearchCacheRef = useRef({ rows: null, ts: 0, promise: null });

  // Pagination State
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20
  });
  const currentPage = pagination.current;
  const pageSize = pagination.pageSize;

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [activeStatFilter, setActiveStatFilter] = useState("all");

  // Reassign flow: when delete is blocked by linked loans
  const [linkedLoansBlockedRecord, setLinkedLoansBlockedRecord] = useState(null);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignFrom, setReassignFrom] = useState(null);
  const [reassignSearch, setReassignSearch] = useState("");
  const [reassignSearchResults, setReassignSearchResults] = useState([]);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reassigning, setReassigning] = useState(false);

  const loadAllCustomersForSearch = useCallback(async (force = false) => {
    const now = Date.now();
    const cache = globalSearchCacheRef.current;
    if (!force && Array.isArray(cache.rows) && now - cache.ts < SEARCH_CACHE_TTL_MS) {
      return cache.rows;
    }
    if (cache.promise) return cache.promise;

    const promise = (async () => {
      const batchSize = 1000;
      const concurrency = 4;
      let all = [];

      const first = await customersApi.getAll({
        limit: batchSize,
        skip: 0,
        sortBy: "updatedAt",
        sortOrder: "desc",
      });
      const firstChunk = Array.isArray(first?.data) ? first.data : [];
      const apiCount = Number(first?.count ?? first?.total ?? first?.pagination?.total);
      all = firstChunk;

      if (Number.isFinite(apiCount) && apiCount > firstChunk.length) {
        const skips = [];
        for (let s = firstChunk.length; s < apiCount; s += batchSize) {
          skips.push(s);
        }

        for (let i = 0; i < skips.length; i += concurrency) {
          const block = skips.slice(i, i + concurrency);
          const requests = [];
          for (const skipValue of block) {
            requests.push(
              customersApi.getAll({
                limit: batchSize,
                skip: skipValue,
                sortBy: "updatedAt",
                sortOrder: "desc",
              }),
            );
          }
          const blockResults = await Promise.all(requests);
          for (const res of blockResults) {
            const chunk = Array.isArray(res?.data) ? res.data : [];
            if (chunk.length) all = all.concat(chunk);
          }
        }
      } else if (firstChunk.length === batchSize) {
        // Fallback when count isn't returned by backend.
        let skip = batchSize;
        while (true) {
          const data = await customersApi.getAll({
            limit: batchSize,
            skip,
            sortBy: "updatedAt",
            sortOrder: "desc",
          });
          const chunk = Array.isArray(data?.data) ? data.data : [];
          if (!chunk.length) break;
          all = all.concat(chunk);
          if (chunk.length < batchSize) break;
          skip += batchSize;
        }
      }

      const byId = new Map();
      all.forEach((row) => {
        const id = String(row?._id || row?.id || "");
        if (!id) return;
        if (!byId.has(id)) byId.set(id, row);
      });
      const deduped = [...byId.values()];

      globalSearchCacheRef.current = { rows: deduped, ts: Date.now(), promise: null };
      return deduped;
    })().catch((err) => {
      globalSearchCacheRef.current.promise = null;
      throw err;
    });

    globalSearchCacheRef.current.promise = promise;
    return promise;
  }, []);

  const loadCustomers = useCallback(async (options = {}) => {
    const page = Number(options.page || currentPage || 1);
    const pageSizeToUse = Number(options.pageSize || pageSize || 20);
    const skip = Math.max(0, (page - 1) * pageSizeToUse);
    const query = String(
      options.query !== undefined ? options.query : searchDebounced,
    ).trim();
    const requestId = ++requestRef.current;

    try {
      setLoading(true);

      let data;
      let rows = [];
      let count = 0;

      if (query.length >= 2) {
        let serverSearchWorked = false;
        try {
          const searchData = await customersApi.search(query, {
            limit: pageSizeToUse,
            skip,
            sortBy: "updatedAt",
            sortOrder: "desc",
          });
          const searchRows = Array.isArray(searchData?.data) ? searchData.data : [];
          const searchCount = Number(
            searchData?.count ?? searchData?.total ?? searchData?.pagination?.total,
          );
          if (searchRows.length || (Number.isFinite(searchCount) && searchCount > 0)) {
            rows = searchRows;
            count = Number.isFinite(searchCount) ? searchCount : searchRows.length;
            serverSearchWorked = true;
          }
        } catch (_) {
          serverSearchWorked = false;
        }

        // Fallback for API search mismatch: global in-memory search over full dataset.
        if (!serverSearchWorked) {
          const allCustomers = await loadAllCustomersForSearch(
            Boolean(options.forceReloadSearchCache),
          );
          const matched = allCustomers.filter((c) => matchesCustomerSearch(c, query));
          rows = matched.slice(skip, skip + pageSizeToUse);
          count = matched.length;
        }
      } else {
        data = await customersApi.getAll({
          limit: pageSizeToUse,
          skip,
          sortBy: "updatedAt",
          sortOrder: "desc",
        });
      }

      if (query.length < 2) {
        const apiRows = Array.isArray(data?.data) ? data.data : [];
        const apiCount = Number(data?.count ?? data?.total ?? data?.pagination?.total);

        if (Number.isFinite(apiCount) && apiCount >= 0) {
          rows = apiRows;
          count = apiCount;
        } else {
          // Fallback for endpoints that may ignore limit/skip and return all rows.
          rows = apiRows.slice(skip, skip + pageSizeToUse);
          count = apiRows.length;
        }
      }

      if (requestId !== requestRef.current) return;
      setCustomers(rows);
      setTotalCustomers(count || rows.length);
    } catch (err) {
      console.error("Load Customers Error:", err);
      message.error("Failed to load customers ❌");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [currentPage, pageSize, searchDebounced, loadAllCustomersForSearch]);

  useEffect(() => {
    // Warm cache in background so global-search fallback feels instant.
    const timer = setTimeout(() => {
      loadAllCustomersForSearch(false).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [loadAllCustomersForSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchText.trim());
    }, 280);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setPagination((prev) => (prev.current === 1 ? prev : { ...prev, current: 1 }));
  }, [searchDebounced]);

  useEffect(() => {
    loadCustomers({
      page: currentPage,
      pageSize,
      query: searchDebounced,
    });
  }, [loadCustomers, currentPage, pageSize, searchDebounced]);

  // Search for target customer when reassign modal is open
  useEffect(() => {
    if (!reassignModalOpen || !reassignFrom) return;
    const q = (reassignSearch || "").trim();
    if (q.length < 2) {
      setReassignSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const allCustomers = await loadAllCustomersForSearch();
        const list = allCustomers
          .filter((c) => String(c?._id) !== String(reassignFrom.id))
          .filter((c) => matchesCustomerSearch(c, q))
          .slice(0, 100);
        setReassignSearchResults(list);
      } catch {
        setReassignSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [reassignModalOpen, reassignFrom, reassignSearch, loadAllCustomersForSearch]);

  const handleNewCustomer = () => {
    navigate("/customers/new");
  };

  const handleEditCustomer = (record) => {
    const id = record?._id || record?.id;
    if (!id) return;
    navigate(`/customers/edit/${id}`);
  };

  const openViewModal = async (record) => {
    if (!record) return;

    setSelectedCustomer(record);
    setIsViewModalOpen(true);

    const id = record?._id || record?.id;
    if (!id) return;

    try {
      const data = await customersApi.getById(id);
      const fresh = data?.data || data;
      if (fresh && (fresh._id || fresh.id)) {
        setSelectedCustomer(fresh);
      }
    } catch (err) {
      console.error("Fetch Customer Error:", err);
    }
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedCustomer(null);
  };

  const handleDeleteCustomer = async (record) => {
    const id = record?._id || record?.id;
    if (!id) return;

    try {
      setDeletingId(id);

      await customersApi.delete(id);

      message.success("Customer deleted ✅");
      await loadCustomers({
        page: currentPage,
        pageSize,
        query: searchDebounced,
        forceReloadSearchCache: true,
      });
    } catch (err) {
      console.error("Delete Customer Error:", err);
      // Extract backend message (support both Error.message and JSON response)
      let errMsg = err?.message || String(err);
      try {
        const parsed = typeof errMsg === "string" && errMsg.trim().startsWith("{") ? JSON.parse(errMsg) : null;
        if (parsed?.message) errMsg = parsed.message;
      } catch (_) {}

      const isLinkedLoans = /loan\(s\) are linked|reassign the loans|linked to this customer/i.test(errMsg);

      if (isLinkedLoans) {
        setLinkedLoansBlockedRecord({ id, customerName: record?.customerName || "this customer" });
      } else {
        message.error(`Delete failed ❌ ${errMsg}`);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const openReassignModal = () => {
    if (linkedLoansBlockedRecord) {
      setReassignFrom(linkedLoansBlockedRecord);
      setReassignModalOpen(true);
      setReassignSearch("");
      setReassignSearchResults([]);
      setReassignTarget(null);
      setLinkedLoansBlockedRecord(null);
    }
  };

  const handleReassignAndDelete = async () => {
    if (!reassignFrom?.id || !reassignTarget?._id) {
      message.warning("Please select a customer to reassign the loans to.");
      return;
    }
    try {
      setReassigning(true);
      await customersApi.reassignLoans(reassignFrom.id, reassignTarget._id);
      await customersApi.delete(reassignFrom.id);
      message.success(`Loans reassigned to ${reassignTarget.customerName || "customer"} and "${reassignFrom.customerName}" deleted.`);
      setReassignModalOpen(false);
      setReassignFrom(null);
      setReassignTarget(null);
      await loadCustomers({
        page: currentPage,
        pageSize,
        query: searchDebounced,
        forceReloadSearchCache: true,
      });
    } catch (err) {
      const msg = err?.message || String(err);
      message.error(`Failed: ${msg}`);
    } finally {
      setReassigning(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...customers];

    // Stat/Status Filter
    if (activeStatFilter === "completed") {
      list = list.filter(c => c.kycStatus === "Completed");
    } else if (activeStatFilter === "pending") {
      list = list.filter(c => c.kycStatus === "Pending Docs");
    } else if (activeStatFilter === "repeat") {
      list = list.filter(c => c.customerType === "Repeat");
    }

    return list;
  }, [customers, activeStatFilter]);

  const total = totalCustomers || customers.length;
  const completedKyc = customers.filter(
    (c) => c.kycStatus === "Completed",
  ).length;
  const pendingDocs = customers.filter(
    (c) => c.kycStatus === "Pending Docs",
  ).length;
  const repeat = customers.filter(
    (c) => String(c.customerType || "").toLowerCase() === "repeat",
  ).length;

  const formatDateCell = (v) => {
    if (!v) return "—";
    const d = dayjs(v);
    return d.isValid() ? d.format("DD MMM YYYY") : String(v);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setPagination((prev) => ({ ...prev, current: totalPages }));
    }
  }, [currentPage, totalPages]);

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-sky-50 via-white to-white p-4 md:p-6 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="flex h-full min-h-0 flex-col gap-5">
        <section className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-400">
                Customers Module
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl dark:text-slate-100">
                Customer Command Center
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 dark:border-sky-900/40 dark:bg-sky-950/30">
                <p className="text-slate-500 dark:text-slate-400">Customers in view</p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">{filtered.length}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <p className="text-slate-500 dark:text-slate-400">KYC completed</p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {completedKyc}/{total || 0}
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30">
                <p className="text-slate-500 dark:text-slate-400">Pending docs</p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">{pendingDocs}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            id="all"
            title="All Customers"
            subtitle="Master list"
            value={total}
            iconName="Users"
            isActive={activeStatFilter === "all"}
            onClick={() => setActiveStatFilter("all")}
          />
          <MetricCard
            id="completed"
            title="KYC Completed"
            subtitle="Ready for loan creation"
            value={completedKyc}
            iconName="CheckCircle2"
            isActive={activeStatFilter === "completed"}
            onClick={() => setActiveStatFilter("completed")}
          />
          <MetricCard
            id="pending"
            title="Pending Docs"
            subtitle="Needs document follow-up"
            value={pendingDocs}
            iconName="FileText"
            isActive={activeStatFilter === "pending"}
            onClick={() => setActiveStatFilter("pending")}
          />
          <MetricCard
            id="repeat"
            title="Repeat"
            subtitle="Returning customer base"
            value={repeat}
            iconName="Repeat"
            isActive={activeStatFilter === "repeat"}
            onClick={() => setActiveStatFilter("repeat")}
          />
        </section>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex-shrink-0 border-b border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                iconName="RefreshCcw"
                onClick={() =>
                  loadCustomers({
                    page: pagination.current,
                    pageSize: pagination.pageSize,
                    query: searchDebounced,
                    forceReloadSearchCache: true,
                  })
                }
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                variant="default"
                size="sm"
                iconName="UserPlus"
                onClick={handleNewCustomer}
              >
                New Customer
              </Button>
              <div className="relative w-full max-w-sm min-w-[220px] flex-1">
                <Icon
                  name="Search"
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by name, mobile, city or PAN..."
                  className="w-full h-9 pl-9 pr-3 py-1 text-sm border border-border rounded-lg bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>
              <div className="text-xs font-semibold text-muted-foreground">
                Showing {filtered.length} records
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
            {loading ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Loading customers...
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <Icon name="FileX" size={28} className="mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No customers found</p>
              </div>
            ) : (
              filtered.map((record, index) => {
                const id = record?._id || record?.id || `cust-${index}`;
                const isSelected = selectedRowKeys.includes(id);
                const linkedLoanCount = Array.isArray(record?.linkedLoans)
                  ? record.linkedLoans.length
                  : 0;
                const hasKycGaps = !(record?.panNumber || record?.aadhaarNumber || record?.aadharNumber);
                const hasMissingBank = !(record?.bankName && record?.accountNumber);

                return (
                  <article
                    key={id}
                    className={`group rounded-xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                      isSelected ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
                    }`}
                    onClick={() => openViewModal(record)}
                  >
                    <div className="border-b border-border px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedRowKeys((prev) =>
                                checked ? [...new Set([...prev, id])] : prev.filter((k) => k !== id),
                              );
                            }}
                            className="mt-1 h-4 w-4 rounded border-border accent-primary"
                          />
                          <div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {record?.customerId || "Customer"}
                              </span>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                  record?.customerType === "Repeat"
                                    ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
                                    : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                                }`}
                              >
                                {record?.customerType === "Repeat" ? "Repeat" : "New"}
                              </span>
                              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${getKycTheme(record?.kycStatus)}`}>
                                {record?.kycStatus || "Unknown"}
                              </span>
                              {!!linkedLoanCount && (
                                <span className="rounded-full border border-cyan-300 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300">
                                  {linkedLoanCount} linked loan{linkedLoanCount > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Created {formatDateCell(record?.createdOn || record?.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 space-y-2">
                      <section className="grid grid-cols-1 gap-2 lg:grid-cols-5">
                        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/60">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Customer
                          </p>
                          <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {record?.customerName || "Customer"}
                          </p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300">{record?.primaryMobile || "No mobile"}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{record?.email || "No email"}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {record?.city || "City not set"}
                          </p>
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2 dark:border-amber-900/70 dark:bg-amber-950/40">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                            Employment
                          </p>
                          <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {record?.occupationType || "Occupation pending"}
                          </p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
                            {record?.companyName || "Company not set"}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {record?.designation || "Designation not set"}
                          </p>
                          <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                            Income: {(() => {
                              const income =
                                record?.salaryMonthly ??
                                record?.monthlySalary ??
                                record?.monthlyIncome;
                              return income ? `₹${Number(income).toLocaleString("en-IN")}` : "N/A";
                            })()}
                          </p>
                        </div>

                        <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-2 dark:border-sky-900/70 dark:bg-sky-950/40">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
                            Banking
                          </p>
                          <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {record?.bankName || "Bank pending"}
                          </p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
                            A/C: {record?.accountNumber || "Not set"}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            IFSC: {record?.ifsc || "Not set"}
                          </p>
                          <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                            {record?.accountType || "Account type N/A"}
                          </p>
                        </div>

                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-2 dark:border-emerald-900/70 dark:bg-emerald-950/40">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                            KYC & Identity
                          </p>
                          <p className="text-[11px] text-slate-700 dark:text-slate-200">
                            PAN: <span className="font-semibold">{record?.panNumber || "—"}</span>
                          </p>
                          <p className="text-[11px] text-slate-700 dark:text-slate-200">
                            Aadhaar: <span className="font-semibold">{record?.aadhaarNumber || record?.aadharNumber || "—"}</span>
                          </p>
                          <p className="text-[11px] text-slate-700 dark:text-slate-200">
                            DL: <span className="font-semibold">{record?.dlNumber || "—"}</span>
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Updated: {formatDateCell(record?.updatedAt)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-violet-200 bg-violet-50/80 p-2 dark:border-violet-900/70 dark:bg-violet-950/40">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">
                            References
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-700 dark:text-slate-200 truncate">
                            Ref 1: <span className="font-semibold">{record?.reference1?.name || record?.reference1_name || "—"}</span>
                          </p>
                          <p className="text-[11px] text-slate-700 dark:text-slate-200 truncate">
                            Ref 2: <span className="font-semibold">{record?.reference2?.name || record?.reference2_name || "—"}</span>
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            Type: {record?.applicantType || "Individual"}
                          </p>
                        </div>
                      </section>

                      <section className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {hasKycGaps && (
                            <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                              KYC pending
                            </span>
                          )}
                          {hasMissingBank && (
                            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                              Banking pending
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          <Tooltip title="View customer" placement="top">
                            <button
                              type="button"
                              className="h-7 w-7 flex items-center justify-center rounded-full bg-sky-100 text-sky-700 border border-sky-200 hover:bg-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                openViewModal(record);
                              }}
                            >
                              <Icon name="Eye" size={12} />
                            </button>
                          </Tooltip>
                          <Tooltip title="Edit customer" placement="top">
                            <button
                              type="button"
                              className="h-7 w-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCustomer(record);
                              }}
                            >
                              <Icon name="Edit" size={12} />
                            </button>
                          </Tooltip>
                          <Popconfirm
                            title="Delete this customer?"
                            description="This cannot be undone."
                            okText="Delete"
                            okButtonProps={{ danger: true }}
                            cancelText="Cancel"
                            onConfirm={() => handleDeleteCustomer(record)}
                          >
                            <Tooltip title="Delete customer" placement="top">
                              <button
                                type="button"
                                className="h-7 w-7 flex items-center justify-center rounded-full bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
                                onClick={(e) => e.stopPropagation()}
                                disabled={deletingId === id}
                              >
                                <Icon name={deletingId === id ? "Loader2" : "Trash2"} size={12} className={deletingId === id ? "animate-spin" : ""} />
                              </button>
                            </Tooltip>
                          </Popconfirm>
                        </div>
                      </section>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200/70 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="text-xs font-semibold text-muted-foreground">
              Showing {(pagination.current - 1) * pagination.pageSize + (filtered.length ? 1 : 0)}-
              {(pagination.current - 1) * pagination.pageSize + filtered.length} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground disabled:opacity-40"
                disabled={pagination.current <= 1}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, current: Math.max(1, prev.current - 1) }))
                }
              >
                Prev
              </button>
              <span className="text-xs font-semibold text-muted-foreground">
                Page {pagination.current} / {totalPages}
              </span>
              <button
                type="button"
                className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground disabled:opacity-40"
                disabled={pagination.current >= totalPages}
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    current: Math.min(totalPages, prev.current + 1),
                  }))
                }
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cannot delete: linked loans */}
      <Modal
        open={!!linkedLoansBlockedRecord}
        title="Cannot delete customer"
        width={480}
        onCancel={() => setLinkedLoansBlockedRecord(null)}
        footer={[
          <AntButton
            key="go"
            className="rounded-lg border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => {
              setLinkedLoansBlockedRecord(null);
              navigate("/loans");
            }}
          >
            Go to Loans
          </AntButton>,
          <AntButton
            key="reassign"
            type="primary"
            className="rounded-lg bg-sky-600 text-white hover:bg-sky-500"
            onClick={openReassignModal}
          >
            Reassign loans & delete customer
          </AntButton>,
        ]}
      >
        {linkedLoansBlockedRecord && (
          <>
            <p className="text-neutral-700 dark:text-neutral-300 mb-2">
              1 loan (or more) is linked to this customer. Delete those loans or reassign them to another customer first.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Use <strong>Reassign loans & delete customer</strong> to move the loans to another customer, then remove this one.
            </p>
          </>
        )}
      </Modal>

      {/* Reassign loans to another customer, then delete */}
      <Modal
        open={reassignModalOpen}
        title="Reassign loans & delete customer"
        width={520}
        onCancel={() => { setReassignModalOpen(false); setReassignFrom(null); setReassignTarget(null); }}
        footer={[
          <AntButton
            key="cancel"
            className="rounded-lg border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => {
              setReassignModalOpen(false);
              setReassignFrom(null);
              setReassignTarget(null);
            }}
          >
            Cancel
          </AntButton>,
          <AntButton
            key="submit"
            type="primary"
            className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
            loading={reassigning}
            disabled={!reassignTarget}
            onClick={handleReassignAndDelete}
          >
            Reassign & delete
          </AntButton>,
        ]}
      >
        {reassignFrom && (
          <div className="space-y-4">
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">
              Move all loans from <strong>{reassignFrom.customerName}</strong> to another customer, then delete this customer.
            </p>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Search customer to reassign to</label>
              <Input
                placeholder="Type name, mobile, or city..."
                value={reassignSearch}
                onChange={(e) => setReassignSearch(e.target.value)}
                allowClear
                className="rounded-lg"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
              {reassignSearchResults.length === 0 && (
                <div className="p-4 text-center text-neutral-500 text-sm">
                  {reassignSearch.trim().length < 2 ? "Type at least 2 characters to search" : "No other customers found"}
                </div>
              )}
              {reassignSearchResults.map((c) => (
                <div
                  key={c._id}
                  onClick={() => setReassignTarget(c)}
                  className={`p-3 cursor-pointer transition-colors ${reassignTarget?._id === c._id ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/50"}`}
                >
                  <div className="font-medium text-foreground">{c.customerName || "—"}</div>
                  <div className="text-xs text-muted-foreground">{c.primaryMobile || ""} {c.city ? ` • ${c.city}` : ""}</div>
                </div>
              ))}
            </div>
            {reassignTarget && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Loans will be reassigned to: <strong>{reassignTarget.customerName}</strong>
              </p>
            )}
          </div>
        )}
      </Modal>

      <CustomerViewModal
        open={isViewModalOpen}
        customer={selectedCustomer}
        onClose={() => closeViewModal()}
        onEdit={() => {
          if (selectedCustomer) {
            handleEditCustomer(selectedCustomer);
            closeViewModal();
          }
        }}
      />
    </div>
  );
};

export default CustomerDashboard;
