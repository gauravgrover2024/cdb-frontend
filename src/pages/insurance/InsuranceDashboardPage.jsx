import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  PencilLine,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
} from "lucide-react";
import InsuranceIntroCard from "../../components/insurance/InsuranceIntroCard";

const demoCases = [
  {
    caseId: "INS-1764844048261",
    customer: "Rahul Sharma",
    mobile: "9876543210",
    vehicle: "Hyundai Creta",
    status: "In Progress",
  },
  {
    caseId: "INS-1764844048262",
    customer: "Apex Mobility Pvt Ltd",
    mobile: "9988776655",
    vehicle: "Tata Nexon",
    status: "Quote Finalized",
  },
  {
    caseId: "INS-1764844048263",
    customer: "Priya Mehta",
    mobile: "9123456780",
    vehicle: "Maruti Swift",
    status: "Documents Pending",
  },
];

const statusConfig = {
  "In Progress": {
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
  },
  "Quote Finalized": {
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50",
  },
  "Documents Pending": {
    icon: AlertCircle,
    className: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/50",
  },
};

const stats = [
  { label: "Total Cases", value: "3", icon: FileText, color: "sky" },
  { label: "In Progress", value: "1", icon: Clock, color: "amber" },
  { label: "Finalized", value: "1", icon: CheckCircle2, color: "emerald" },
  { label: "Action Needed", value: "1", icon: AlertCircle, color: "orange" },
];

const statColorMap = {
  sky: {
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    border: "border-l-sky-500",
    value: "text-sky-700 dark:text-sky-400",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    border: "border-l-amber-500",
    value: "text-amber-700 dark:text-amber-400",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    border: "border-l-emerald-500",
    value: "text-emerald-700 dark:text-emerald-400",
  },
  orange: {
    icon: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    border: "border-l-orange-500",
    value: "text-orange-700 dark:text-orange-400",
  },
};

const InsuranceDashboardPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-5 pb-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-black">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-950/50">
            <ShieldCheck size={20} className="text-sky-700 dark:text-sky-300" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Insurance Dashboard
            </p>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Manage Insurance Cases
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/insurance/new")}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 active:scale-95"
        >
          <Plus size={16} />
          New Insurance Case
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colors = statColorMap[stat.color];
          return (
            <div
              key={stat.label}
              className={`rounded-xl border border-l-4 border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-black ${colors.border}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                  <p className={`mt-1.5 text-2xl font-black tracking-tight ${colors.value}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors.icon}`}>
                  <Icon size={16} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cases Table */}
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-black overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Recent Insurance Cases
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {demoCases.length} total cases
            </p>
          </div>
        </div>

        {/* Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
          <p className="col-span-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Case ID</p>
          <p className="col-span-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</p>
          <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Vehicle</p>
          <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
          <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {demoCases.map((item) => {
            const statusCfg = statusConfig[item.status] || statusConfig["In Progress"];
            const StatusIcon = statusCfg.icon;
            return (
              <div
                key={item.caseId}
                className="grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-slate-50/60 dark:hover:bg-slate-900/30 md:grid-cols-12 md:items-center"
              >
                <div className="md:col-span-3">
                  <p className="text-xs font-black tracking-wide text-slate-900 dark:text-white font-mono">
                    {item.caseId}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 md:hidden">
                    {item.mobile}
                  </p>
                </div>
                <div className="md:col-span-3">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.customer}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">
                    {item.mobile}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {item.vehicle}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${statusCfg.className}`}>
                    <StatusIcon size={11} />
                    {item.status}
                  </span>
                </div>
                <div className="md:col-span-2 flex items-center justify-start md:justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/insurance/edit/${item.caseId}`, {
                        state: { caseData: item },
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <PencilLine size={12} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                  >
                    <Eye size={12} />
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {demoCases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-3">
              <FileText size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No cases yet</p>
            <p className="text-xs text-slate-400 mt-1">Create your first insurance case to get started.</p>
          </div>
        )}
      </div>

      <InsuranceIntroCard />
    </div>
  );
};

export default InsuranceDashboardPage;
