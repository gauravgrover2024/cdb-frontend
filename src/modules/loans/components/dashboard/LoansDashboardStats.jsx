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
      },
      {
        id: "pending",
        label: "Pending Approvals",
        value: pending,
        icon: "Clock",
      },
      {
        id: "today",
        label: "Approved Today",
        value: approvedToday,
        icon: "CheckCircle2",
      },
      {
        id: "disbursed",
        label: "Disbursed",
        value: disbursed,
        icon: "TrendingUp",
      },
    ];
  }, [loans]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.id}
          onClick={() => onStatClick?.(s.id)}
          className="bg-card border rounded-2xl p-4 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Icon name={s.icon} size={18} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-semibold">
                  {loading ? "—" : s.value}
                </div>
              </div>
            </div>
            <Icon name="ChevronRight" size={16} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoansDashboardStats;
