import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import Icon from "../../components/AppIcon";

const PRIMARY_STAT_THEMES = {
  total: {
    card: "from-sky-500 to-indigo-600",
    iconBg: "bg-white/20",
    accent: "text-sky-100",
  },
  underReview: {
    card: "from-amber-500 to-orange-600",
    iconBg: "bg-white/20",
    accent: "text-amber-100",
  },
  sanctioned: {
    card: "from-emerald-500 to-green-600",
    iconBg: "bg-white/20",
    accent: "text-emerald-100",
  },
  disbursed: {
    card: "from-violet-500 to-fuchsia-600",
    iconBg: "bg-white/20",
    accent: "text-violet-100",
  },
  rejected: {
    card: "from-rose-500 to-pink-600",
    iconBg: "bg-white/20",
    accent: "text-rose-100",
  },
  bookValue: {
    card: "from-slate-700 to-slate-900",
    iconBg: "bg-white/20",
    accent: "text-slate-200",
  },
};

const MetricCard = ({ id, title, subtitle, value, iconName, onClick, isActive, loading }) => {
  const theme = PRIMARY_STAT_THEMES[id] || PRIMARY_STAT_THEMES.total;
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
            {loading ? "—" : value}
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

const DashboardSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      ))}
    </div>
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="h-12 bg-slate-100 dark:bg-slate-800" />
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-14 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 px-4">
          <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700 ml-4" />
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 ml-auto" />
        </div>
      ))}
    </div>
  </div>
);

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    "New":          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    "Under Review": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "Sanctioned":   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "Disbursed":    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    "Rejected":     "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  };
  const cls = map[status] || map["New"];
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {status || "New"}
    </span>
  );
};

// ─── Empty state ─────────────────────────────────────────────────────────────
const EmptyState = ({ onNew }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
    <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
      <Icon name="Home" size={28} className="text-indigo-400" />
    </div>
    <div>
      <p className="text-base font-bold text-slate-800 dark:text-slate-200">No home loan applications yet</p>
      <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
        Start by creating a new home loan application.
      </p>
    </div>
    <button
      onClick={onNew}
      className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-95"
    >
      <Icon name="Plus" size={15} />
      New Application
    </button>
  </div>
);

// ─── Columns config ───────────────────────────────────────────────────────────
const COL_HEADERS = [
  { key: "loanNo",        label: "Application No",   w: "w-[140px]" },
  { key: "applicant",     label: "Applicant",         w: "flex-1 min-w-[160px]" },
  { key: "mobile",        label: "Mobile",            w: "w-[120px]" },
  { key: "propertyCity",  label: "Property City",     w: "w-[130px]" },
  { key: "bank",          label: "Bank",              w: "w-[140px]" },
  { key: "loanAmount",    label: "Loan Amount",       w: "w-[120px]" },
  { key: "status",        label: "Status",            w: "w-[120px]" },
  { key: "leadDate",      label: "Lead Date",         w: "w-[110px]" },
  { key: "actions",       label: "",                  w: "w-[80px]" },
];

const formatINR = (val) => {
  const num = Number(val) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString("en-IN")}`;
};

const formatDate = (val) => {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
};

// ─── Main component ──────────────────────────────────────────────────────────
const HomeLoanDashboard = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState(null);
  const [loans] = useState([]);
  const [loading] = useState(false);

  const statsData = {
    total: 0,
    underReview: 0,
    sanctioned: 0,
    disbursed: 0,
    rejected: 0,
    totalBookValue: 0,
  };

  const handleStatClick = (type) => {
    setActiveFilter((prev) => (prev === type ? null : type));
  };

  const filteredLoans = loans.filter((loan) => {
    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (loan.customerName || "").toLowerCase().includes(q) ||
        (loan.primaryMobile || "").includes(q) ||
        (loan.loanNo || "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    if (activeFilter === "underReview") return loan.status === "Under Review";
    if (activeFilter === "sanctioned") return loan.status === "Sanctioned";
    if (activeFilter === "disbursed") return loan.status === "Disbursed";
    if (activeFilter === "rejected") return loan.status === "Rejected";
    return true;
  });

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-indigo-50 via-white to-white p-4 md:p-6 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="flex h-full min-h-0 flex-col gap-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">
                Home Loans Module
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl dark:text-slate-100">
                Dashboard Command Center
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                <p className="text-slate-500 dark:text-slate-400">Applications in view</p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {filteredLoans.length}
                </p>
              </div>
              <div className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 dark:border-violet-900/40 dark:bg-violet-950/30">
                <p className="text-slate-500 dark:text-slate-400">Total Book Value</p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {formatINR(statsData.totalBookValue)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading && loans.length === 0 ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* ── Metric cards ─────────────────────────────────────────────── */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <MetricCard
                id="total"
                title="Total Applications"
                subtitle="All home loan files"
                value={statsData.total}
                iconName="FileStack"
                loading={loading}
                isActive={!activeFilter}
                onClick={() => handleStatClick("total")}
              />
              <MetricCard
                id="underReview"
                title="Under Review"
                subtitle="Processing with bank"
                value={statsData.underReview}
                iconName="Clock3"
                loading={loading}
                isActive={activeFilter === "underReview"}
                onClick={() => handleStatClick("underReview")}
              />
              <MetricCard
                id="sanctioned"
                title="Sanctioned"
                subtitle="Approval letter issued"
                value={statsData.sanctioned}
                iconName="BadgeCheck"
                loading={loading}
                isActive={activeFilter === "sanctioned"}
                onClick={() => handleStatClick("sanctioned")}
              />
              <MetricCard
                id="disbursed"
                title="Disbursed"
                subtitle="Funds released to builder"
                value={statsData.disbursed}
                iconName="WalletCards"
                loading={loading}
                isActive={activeFilter === "disbursed"}
                onClick={() => handleStatClick("disbursed")}
              />
              <MetricCard
                id="rejected"
                title="Rejected"
                subtitle="Declined by lender"
                value={statsData.rejected}
                iconName="XCircle"
                loading={loading}
                isActive={activeFilter === "rejected"}
                onClick={() => handleStatClick("rejected")}
              />
              <MetricCard
                id="bookValue"
                title="Book Value"
                subtitle="Total sanctioned amount"
                value={formatINR(statsData.totalBookValue)}
                iconName="IndianRupee"
                loading={loading}
                onClick={() => {}}
              />
            </section>

            {/* ── Table ──────────────────────────────────────────────────── */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">

              {/* Filter / search bar */}
              <div className="flex-shrink-0 border-b border-slate-200/70 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Icon
                      name="Search"
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search applicant, mobile…"
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[12.5px] text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500"
                    />
                  </div>

                  {/* Quick filters */}
                  {[
                    { key: "underReview", label: "Under Review" },
                    { key: "sanctioned",  label: "Sanctioned" },
                    { key: "disbursed",   label: "Disbursed" },
                    { key: "rejected",    label: "Rejected" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => handleStatClick(f.key)}
                      className={[
                        "rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all",
                        activeFilter === f.key
                          ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                      ].join(" ")}
                    >
                      {f.label}
                    </button>
                  ))}

                  <div className="ml-auto flex items-center gap-2">
                    {activeFilter && (
                      <button
                        onClick={() => setActiveFilter(null)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={() => navigate("/home-loans/new")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95"
                    >
                      <Icon name="Plus" size={13} />
                      New Application
                    </button>
                  </div>
                </div>
              </div>

              {/* Table content */}
              <div className="flex-1 overflow-auto">
                {filteredLoans.length === 0 ? (
                  <EmptyState onNew={() => navigate("/home-loans/new")} />
                ) : (
                  <table className="w-full min-w-[900px] text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
                      <tr className="border-b border-slate-200/70 dark:border-slate-800">
                        {COL_HEADERS.map((col) => (
                          <th
                            key={col.key}
                            className={`${col.w} px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredLoans.map((loan) => (
                        <tr
                          key={loan._id || loan.loanNo}
                          className="group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                        >
                          <td className="px-4 py-3 text-[12.5px] font-mono font-semibold text-slate-700 dark:text-slate-200">
                            {loan.loanNo || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                              {loan.customerName || "Unknown"}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                              {loan.email || ""}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-[12.5px] tabular-nums text-slate-600 dark:text-slate-300">
                            {loan.primaryMobile || "—"}
                          </td>
                          <td className="px-4 py-3 text-[12.5px] text-slate-600 dark:text-slate-300">
                            {loan.propertyCity || "—"}
                          </td>
                          <td className="px-4 py-3 text-[12.5px] text-slate-600 dark:text-slate-300">
                            {loan.bankName || "—"}
                          </td>
                          <td className="px-4 py-3 text-[12.5px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                            {formatINR(loan.loanAmount)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={loan.status} />
                          </td>
                          <td className="px-4 py-3 text-[12px] text-slate-400 dark:text-slate-500">
                            {formatDate(loan.leadDate)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={() => navigate(`/home-loans/edit/${loan._id}`)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                title="Edit"
                              >
                                <Icon name="Pencil" size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HomeLoanDashboard;
