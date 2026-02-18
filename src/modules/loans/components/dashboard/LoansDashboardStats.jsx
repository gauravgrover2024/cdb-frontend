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
        color: "text-blue-600",
        bg: "bg-blue-50",
        borderColor: "border-blue-100"
      },
      {
        id: "pending",
        label: "Pending Approvals",
        value: pending,
        icon: "Clock",
        color: "text-amber-600",
        bg: "bg-amber-50",
        borderColor: "border-amber-100"
      },
      {
        id: "today",
        label: "Approved Today",
        value: approvedToday,
        icon: "CheckCircle2",
        color: "text-green-600", // Green for approvals
        bg: "bg-green-50",
        borderColor: "border-green-100"
      },
      {
        id: "disbursed",
        label: "Disbursed",
        value: disbursed,
        icon: "TrendingUp",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        borderColor: "border-emerald-100"
      },
    ];
  }, [loans]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.id}
          onClick={() => onStatClick?.(s.id)}
          className={`bg-card border rounded-2xl p-4 cursor-pointer hover:shadow-md transition ${s.borderColor}`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${s.bg} ${s.borderColor}`}>
                <Icon name={s.icon} size={18} className={s.color} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-semibold">
                  {loading ? "—" : s.value}
                </div>
              </div>
            </div>
            <Icon name="ChevronRight" size={16} className="text-gray-400" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoansDashboardStats;
