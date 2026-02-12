import React, { useMemo } from "react";
import Icon from "../../../../components/AppIcon";

const LoansDashboardStats = ({ loans, loading, onStatClick }) => {
  const stats = useMemo(() => {
    const total = loans.length;

    const pending = loans.filter(
      (l) =>
        l.currentStage === "approval" &&
        ["pending", "in progress"].includes((l.status || "").toLowerCase()),
    ).length;

    const today = new Date().toDateString();
    const approvedToday = loans.filter((l) => {
      if ((l.status || "").toLowerCase() !== "approved") return false;
      if (!l.updatedAt) return false;
      return new Date(l.updatedAt).toDateString() === today;
    }).length;

    const disbursed = loans.filter(
      (l) => (l.status || "").toLowerCase() === "disbursed",
    ).length;

    return [
      {
        id: "total",
        label: "Total Loans",
        value: total,
        icon: "FileText",
        bgGradient: "from-blue-500 to-blue-600",
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
      },
      {
        id: "pending",
        label: "Pending Approvals",
        value: pending,
        icon: "Clock",
        bgGradient: "from-amber-500 to-orange-500",
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
      },
      {
        id: "today",
        label: "Approved Today",
        value: approvedToday,
        icon: "CheckCircle2",
        bgGradient: "from-green-500 to-emerald-500",
        iconBg: "bg-green-50",
        iconColor: "text-green-600",
      },
      {
        id: "disbursed",
        label: "Disbursed",
        value: disbursed,
        icon: "TrendingUp",
        bgGradient: "from-purple-500 to-purple-600",
        iconBg: "bg-purple-50",
        iconColor: "text-purple-600",
      },
    ];
  }, [loans]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s) => (
        <button
          key={s.id}
          onClick={() => onStatClick?.(s.id)}
          className="group relative bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-200 text-left"
        >
          {/* Content */}
          <div className="relative z-10">
            {/* Icon + Value Row */}
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center transition-transform group-hover:scale-110 duration-200`}
              >
                <Icon name={s.icon} size={20} className={s.iconColor} />
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 tracking-tight tabular-nums">
                  {loading ? "—" : s.value.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Label + Arrow Row */}
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {s.label}
              </div>
              <Icon
                name="ArrowRight"
                size={16}
                className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </div>

          {/* Hover gradient overlay */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-[0.03] bg-gradient-to-br from-gray-900 to-transparent transition-opacity pointer-events-none" />
        </button>
      ))}
    </div>
  );
};

export default LoansDashboardStats;
