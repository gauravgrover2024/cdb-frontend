// src/modules/customers/CustomerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/AppIcon"; // adjust path if needed

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

// KYC chip helper
const getKycChipClass = (status = "") => {
  const s = status.toLowerCase();
  if (s === "completed")
    return "inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 text-[11px] font-medium";
  if (s === "in progress")
    return "inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 text-[11px] font-medium";
  if (s.includes("pending"))
    return "inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 text-[11px] font-medium";
  return "inline-flex items-center rounded-full bg-muted text-muted-foreground border border-border px-2.5 py-0.5 text-[11px] font-medium";
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | completed | pending | repeat

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [viewCustomer, setViewCustomer] = useState(null);
  const [confirmCustomer, setConfirmCustomer] = useState(null);

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCustomers = async (pageNumber = 1) => {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_BASE_URL}/api/customers?page=${pageNumber}&limit=${pageSize}`,
      );

      const parsed = await res.json();

      setCustomers(parsed.data || []);
      setTotal(parsed.total || 0);
      setPage(pageNumber);
    } catch (err) {
      console.error("Load customers error", err);
      alert("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const completed = customers.filter(
      (c) => c.kycStatus === "Completed",
    ).length;
    const pending = customers.filter(
      (c) => c.kycStatus && c.kycStatus.toLowerCase().includes("pending"),
    ).length;
    const repeat = customers.filter(
      (c) => String(c.customerType || "").toLowerCase() === "repeat",
    ).length;

    return {
      total: total,
      completed,
      pending,
      repeat,
    };
  }, [customers]);

  const pageEnd = Math.min(safePage * pageSize, total);

  const handleDelete = async () => {
    if (!confirmCustomer) return;
    try {
      setLoading(true);
      const id = confirmCustomer._id || confirmCustomer.id;
      const res = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Delete failed");
      }
      setConfirmCustomer(null);
      setViewCustomer(null);
      await loadCustomers();
    } catch (err) {
      console.error("Delete error", err);
      alert("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const filterButtonClass = (active) =>
    `relative flex flex-col justify-between rounded-2xl border px-4 py-3 text-left shadow-sm transition-colors ${
      active
        ? "border-primary/40 bg-primary text-primary-foreground"
        : "border-border bg-card text-foreground"
    }`;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;

  return (
    <div className="flex flex-col gap-4 md:gap-5 px-4 md:px-6 pb-6">
      {/* Header row */}
      <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg md:text-xl font-semibold text-foreground">
            Customers
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Manage customer profiles, KYC status and interactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground"
            onClick={() => loadCustomers(page)}
          >
            <Icon name="RefreshCw" size={13} />
            Refresh
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-medium shadow-sm"
            onClick={() => navigate("/customers/new")}
          >
            <Icon name="Plus" size={13} />
            New Customer
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-4">
        {/* All */}
        <button
          type="button"
          className={filterButtonClass(filter === "all")}
          onClick={() => {
            setFilter("all");
            setPage(1);
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide opacity-80">
                All Customers
              </span>
              <span className="text-xl font-semibold">{stats.total}</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-background/20 text-inherit">
              <Icon name="Users" size={16} />
            </div>
          </div>
        </button>

        {/* KYC Completed */}
        <button
          type="button"
          className={filterButtonClass(filter === "completed")}
          onClick={() => {
            setFilter("completed");
            setPage(1);
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide opacity-80">
                KYC Completed
              </span>
              <span className="text-xl font-semibold">{stats.completed}</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <Icon name="CheckCircle2" size={16} />
            </div>
          </div>
        </button>

        {/* Pending Docs */}
        <button
          type="button"
          className={filterButtonClass(filter === "pending")}
          onClick={() => {
            setFilter("pending");
            setPage(1);
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide opacity-80">
                Pending Docs
              </span>
              <span className="text-xl font-semibold">{stats.pending}</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <Icon name="FileClock" size={16} />
            </div>
          </div>
        </button>

        {/* Repeat */}
        <button
          type="button"
          className={filterButtonClass(filter === "repeat")}
          onClick={() => {
            setFilter("repeat");
            setPage(1);
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide opacity-80">
                Repeat
              </span>
              <span className="text-xl font-semibold">{stats.repeat}</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
              <Icon name="Repeat" size={16} />
            </div>
          </div>
        </button>
      </div>

      {/* Search + table card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Search row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card">
          <div className="flex-1">
            <div className="relative">
              <Icon
                name="Search"
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, mobile, city, PAN…"
                className="w-full rounded-xl border border-border bg-muted/50 pl-9 pr-3 py-1.5 text-xs md:text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Showing {customers.length} of {total} customers
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Customer ID
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Customer Info
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Employment
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Bank
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  KYC Status
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Created
                </th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-[150px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-xs text-muted-foreground"
                  >
                    Loading customers…
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-xs text-muted-foreground"
                  >
                    No customers found for this view.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c._id || c.id}
                    className="border-t border-border hover:bg-muted/40 transition-colors"
                  >
                    {/* ID */}
                    <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                      {c.customerCode || c.customerId || "—"}
                    </td>

                    {/* Customer info */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {(c.customerName || "U").slice(0, 1)}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-semibold text-foreground">
                            {c.customerName || "—"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {c.primaryMobile || "Mobile not set"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {c.city || "City not set"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Employment */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
                        <span className="text-[12px] text-foreground font-medium">
                          {c.employmentType || c.occupationType || "—"}
                        </span>
                        <span>{c.companyName || ""}</span>
                      </div>
                    </td>

                    {/* Bank */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
                        <span className="text-[12px] text-foreground font-medium">
                          {c.bankName || "—"}
                        </span>
                        <span>{c.accountType || ""}</span>
                      </div>
                    </td>

                    {/* KYC */}
                    <td className="px-4 py-3 align-top">
                      <span className={getKycChipClass(c.kycStatus)}>
                        {c.kycStatus || "Not started"}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 align-top text-[11px] text-muted-foreground">
                      {formatDate(c.createdOn)}
                    </td>

                    {/* Actions */}
                    <td
                      className="px-4 py-3 align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                          onClick={() => setViewCustomer(c)}
                        >
                          <Icon name="Eye" size={12} />
                        </button>
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-foreground border border-border hover:bg-background"
                          onClick={() =>
                            navigate(`/customers/edit/${c._id || c.id}`)
                          }
                        >
                          <Icon name="Edit" size={12} />
                        </button>
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-error/5 text-error border border-error/20 hover:bg-error/10"
                          onClick={() => setConfirmCustomer(c)}
                        >
                          <Icon name="Trash2" size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination row */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
          <span>
            Showing {pageStart}–{pageEnd} of {total} entries
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="inline-flex h-7 items-center justify-center rounded-full border border-border px-2 disabled:opacity-50"
              disabled={safePage === 1}
              onClick={() => loadCustomers(1)}
            >
              {"<<"}
            </button>
            <button
              type="button"
              className="inline-flex h-7 items-center justify-center rounded-full border border-border px-2 disabled:opacity-50"
              disabled={safePage === 1}
              onClick={() => loadCustomers(safePage - 1)}
            >
              {"<"}
            </button>
            <span className="px-2 text-[11px]">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              className="inline-flex h-7 items-center justify-center rounded-full border border-border px-2 disabled:opacity-50"
              disabled={safePage === totalPages}
              onClick={() => loadCustomers(safePage + 1)}
            >
              {">"}
            </button>
            <button
              type="button"
              className="inline-flex h-7 items-center justify-center rounded-full border border-border px-2 disabled:opacity-50"
              disabled={safePage === totalPages}
              onClick={() => loadCustomers(totalPages)}
            >
              {">>"}
            </button>
          </div>
        </div>
      </div>

      {/* Simple view drawer/modal – you can replace with your existing one */}
      {viewCustomer && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
          onClick={() => setViewCustomer(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {viewCustomer.customerName || "Customer"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {viewCustomer.primaryMobile || "—"} ·{" "}
                  {viewCustomer.city || "—"}
                </span>
              </div>
              <button
                className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-muted-foreground"
                onClick={() => setViewCustomer(null)}
              >
                <Icon name="X" size={14} />
              </button>
            </div>

            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div>PAN: {viewCustomer.panNumber || "—"}</div>
              <div>Company: {viewCustomer.companyName || "—"}</div>
              <div>Employment: {viewCustomer.employmentType || "—"}</div>
              <div>Bank: {viewCustomer.bankName || "—"}</div>
              <div>KYC: {viewCustomer.kycStatus || "—"}</div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs"
                onClick={() => {
                  setViewCustomer(null);
                  navigate(
                    `/customers/edit/${viewCustomer._id || viewCustomer.id}`,
                  );
                }}
              >
                <Icon name="Edit" size={12} />
                Edit
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-full border border-error/30 bg-error/10 px-3 py-1 text-xs text-error"
                onClick={() => {
                  setViewCustomer(null);
                  setConfirmCustomer(viewCustomer);
                }}
              >
                <Icon name="Trash2" size={12} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmCustomer && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
          onClick={() => setConfirmCustomer(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-foreground mb-1">
              Delete customer?
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              Are you sure you want to delete{" "}
              <span className="font-medium">
                {confirmCustomer.customerName || "this customer"}
              </span>
              ? This action cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs"
                onClick={() => setConfirmCustomer(null)}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-full border border-error/30 bg-error px-3 py-1 text-xs text-error-foreground"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
