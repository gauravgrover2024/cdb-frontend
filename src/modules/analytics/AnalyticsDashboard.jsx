import React, { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Icon from "../../components/AppIcon";
import { loansApi } from "../../api/loans";
import { StatCard, RecentApplicationsTable } from "./components";

const statusTone = {
  approved: "bg-emerald-50 text-emerald-700",
  disbursed: "bg-sky-50 text-sky-700",
  completed: "bg-indigo-50 text-indigo-700",
  pending: "bg-amber-50 text-amber-700",
  submitted: "bg-yellow-50 text-yellow-700",
  login: "bg-orange-50 text-orange-700",
  rejected: "bg-rose-50 text-rose-700",
  declined: "bg-rose-50 text-rose-700",
  failed: "bg-rose-50 text-rose-700",
};

const formatINR = (n) => `Rs ${Number(n || 0).toLocaleString("en-IN")}`;

const CompactBar = ({ label, value, total }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-zinc-700">{label}</span>
        <span className="font-semibold text-zinc-900">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const AnalyticsDashboard = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const loansRes = await loansApi.getAll();
        setLoans(Array.isArray(loansRes?.data) ? loansRes.data : []);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = useMemo(() => {
    const approvedLike = loans.filter((l) => {
      const status = (l.status || l.approval_status || "").toLowerCase();
      return ["approved", "disbursed", "completed"].includes(status);
    });

    const pendingLike = loans.filter((l) => {
      const status = (l.status || l.approval_status || "").toLowerCase();
      return ["pending", "in progress", "new", "submitted", "login"].includes(status);
    });

    const totalRevenue = approvedLike.reduce((acc, l) => {
      const amount = Number(l.approval_loanAmountApproved || l.loanAmount) || 0;
      return acc + amount;
    }, 0);

    const pendingValue = pendingLike.reduce((acc, l) => {
      const amount = Number(l.loanAmount) || 0;
      return acc + amount;
    }, 0);

    const totalApplications = loans.length;
    const successfulLoans = approvedLike.length;
    const conversionRate = totalApplications > 0 ? (successfulLoans / totalApplications) * 100 : 0;

    const statusMap = {};
    loans.forEach((l) => {
      const key = (l.status || l.approval_status || "pending").toLowerCase();
      statusMap[key] = (statusMap[key] || 0) + 1;
    });

    const bankMap = {};
    loans.forEach((l) => {
      const bank = l.approval_bankName || l.bankName || "Unknown";
      bankMap[bank] = (bankMap[bank] || 0) + 1;
    });

    const topBanks = Object.entries(bankMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalApplications,
      totalRevenue,
      pendingValue,
      conversionRate,
      approvedCount: approvedLike.length,
      activeCount: pendingLike.length,
      disbursedCount: statusMap.disbursed || 0,
      rejectedCount: (statusMap.rejected || 0) + (statusMap.declined || 0) + (statusMap.failed || 0),
      statusMap,
      topBanks,
    };
  }, [loans]);

  const recentTransactions = useMemo(() => {
    return [...loans]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 10)
      .map((l) => ({
        id: l._id,
        invoiceId: `APP-${(l._id || "").slice(-6).toUpperCase()}`,
        client: l.customerName || "Unknown Client",
        role: l.typeOfLoan || l.loanType || "General Loan",
        amount: formatINR(Number(l.approval_loanAmountApproved || l.loanAmount) || 0),
        date: l.updatedAt ? new Date(l.updatedAt).toLocaleDateString() : "N/A",
        status: l.status || l.approval_status || "Pending",
        rawStatus: (l.status || l.approval_status || "pending").toLowerCase(),
      }));
  }, [loans]);

  const topStatuses = useMemo(() => {
    return Object.entries(stats.statusMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [stats.statusMap]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <LoadingSpinner text="Loading analytics" />
      </div>
    );
  }

  return (
    <main className="space-y-6 bg-gradient-to-b from-slate-50 via-white to-cyan-50/30 p-4 md:p-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8">
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">Business cockpit</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 md:text-4xl">
              Lending performance at a glance
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-zinc-600 md:text-base">
              Track pipeline health, approval efficiency, and partner contribution from a single high-signal dashboard.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cases</p>
              <p className="mt-1 text-xl font-black text-zinc-900">{stats.totalApplications}</p>
            </div>
            <div className="rounded-2xl bg-emerald-100/70 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Approved</p>
              <p className="mt-1 text-xl font-black text-emerald-900">{stats.approvedCount}</p>
            </div>
            <div className="rounded-2xl bg-amber-100/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Active</p>
              <p className="mt-1 text-xl font-black text-amber-900">{stats.activeCount}</p>
            </div>
            <div className="rounded-2xl bg-rose-100/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Rejected</p>
              <p className="mt-1 text-xl font-black text-rose-900">{stats.rejectedCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatINR(stats.totalRevenue)}
          iconName="IndianRupee"
          color="blue"
          subtitle="Approved + disbursed value"
        />
        <StatCard
          title="Pipeline Value"
          value={formatINR(stats.pendingValue)}
          iconName="Gauge"
          color="amber"
          subtitle="Open opportunities"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate.toFixed(1)}%`}
          iconName="TrendingUp"
          color="emerald"
          subtitle="Approval efficiency"
        />
        <StatCard
          title="Disbursed Loans"
          value={String(stats.disbursedCount)}
          iconName="CheckCircle2"
          color="rose"
          subtitle="Finalized this dataset"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <article className="rounded-2xl border border-border/70 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight text-zinc-900">Top Banking Partners</h2>
            <Icon name="Building2" size={18} className="text-zinc-500" />
          </div>

          <div className="space-y-4">
            {stats.topBanks.length ? (
              stats.topBanks.map((bank) => (
                <CompactBar
                  key={bank.name}
                  label={bank.name}
                  value={bank.count}
                  total={stats.totalApplications}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No partner distribution available.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-border/70 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight text-zinc-900">Status mix</h2>
            <Icon name="PieChart" size={18} className="text-zinc-500" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topStatuses.length ? (
              topStatuses.map(([status, count]) => (
                <div key={status} className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${statusTone[status] || "bg-zinc-200 text-zinc-700"}`}
                    >
                      {status}
                    </span>
                    <span className="text-sm font-bold text-zinc-900">{count}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{stats.totalApplications ? Math.round((count / stats.totalApplications) * 100) : 0}% of total cases</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No status data found.</p>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-border/70 bg-white p-3 shadow-sm md:p-4">
        <div className="mb-2 flex items-center justify-between px-2 pt-1">
          <h2 className="text-lg font-extrabold tracking-tight text-zinc-900">Recent Applications</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Last 10 updates</span>
        </div>
        <RecentApplicationsTable transactions={recentTransactions} />
      </section>
    </main>
  );
};

export default AnalyticsDashboard;
