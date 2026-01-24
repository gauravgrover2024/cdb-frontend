import React, { useMemo } from "react";
import Icon from "../../../../components/AppIcon";

const LoansDashboardStats = ({ loans, loading }) => {
  const stats = useMemo(() => {
    const totalLoans = loans?.length || 0;

    const pendingApprovals =
      loans?.filter(
        (l) =>
          (l.currentStage || "") === "approval" &&
          ((l.status || "").toLowerCase() === "pending" ||
            (l.status || "").toLowerCase() === "in progress")
      ).length || 0;

    const today = new Date().toDateString();
    const approvedToday =
      loans?.filter((l) => {
        const updated = l.updatedAt ? new Date(l.updatedAt).toDateString() : "";
        return (
          (l.status || "").toLowerCase() === "approved" && updated === today
        );
      }).length || 0;

    const totalDisbursed =
      loans
        ?.filter((l) => (l.status || "").toLowerCase() === "disbursed")
        ?.reduce((sum, l) => sum + (l.loanAmount || 0), 0) || 0;

    const formatAmount = (amount) => {
      if (!amount) return "₹0";
      if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
      if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
      return `₹${amount.toLocaleString("en-IN")}`;
    };

    return [
      {
        id: "total",
        label: "Total Loans",
        value: totalLoans.toString(),
        icon: "FileText",
        color: "bg-primary/10 text-primary border-primary/20",
      },
      {
        id: "pending",
        label: "Pending Approvals",
        value: pendingApprovals.toString(),
        icon: "Clock",
        color: "bg-warning/10 text-warning border-warning/20",
      },
      {
        id: "today",
        label: "Approved Today",
        value: approvedToday.toString(),
        icon: "CheckCircle2",
        color: "bg-success/10 text-success border-success/20",
      },
      {
        id: "disbursed",
        label: "Total Disbursed",
        value: formatAmount(totalDisbursed),
        icon: "TrendingUp",
        color: "bg-accent/10 text-accent border-border",
      },
    ];
  }, [loans]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.id}
          className="bg-card border border-border rounded-2xl p-4 md:p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${s.color}`}
              >
                <Icon name={s.icon} size={18} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-semibold text-foreground data-text">
                  {loading ? "…" : s.value}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <Icon name="ChevronRight" size={16} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoansDashboardStats;
