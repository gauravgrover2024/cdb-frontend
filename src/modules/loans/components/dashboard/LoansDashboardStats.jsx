import React from "react";
import Icon from "../../../../components/AppIcon";

const LoansDashboardStats = ({ loans }) => {
  const totalLoans = loans?.length || 0;
  const pendingApprovals = loans?.filter(
    (l) => l.currentStage === "approval" && l.status === "pending"
  ).length;

  const approvedToday = loans?.filter((l) => {
    const today = new Date().toDateString();
    return (
      l.status === "approved" && new Date(l.updatedAt).toDateString() === today
    );
  }).length;

  const totalDisbursed = loans
    ?.filter((l) => l.status === "disbursed")
    ?.reduce((sum, l) => sum + (l.loanAmount || 0), 0);

  const formatAmount = (amount) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const stats = [
    {
      id: 1,
      label: "Total Loans",
      value: totalLoans.toString(),
      change: "+12",
      changeType: "increase",
      icon: "FileText",
      color: "bg-primary/10 text-primary",
    },
    {
      id: 2,
      label: "Pending Approvals",
      value: pendingApprovals.toString(),
      change: "+5",
      changeType: "increase",
      icon: "Clock",
      color: "bg-warning/10 text-warning",
    },
    {
      id: 3,
      label: "Approved Today",
      value: approvedToday.toString(),
      change: "+8",
      changeType: "increase",
      icon: "CheckCircle2",
      color: "bg-success/10 text-success",
    },
    {
      id: 4,
      label: "Total Disbursed",
      value: formatAmount(totalDisbursed),
      change: "+₹45L",
      changeType: "increase",
      icon: "TrendingUp",
      color: "bg-accent/10 text-accent",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {stats?.map((stat) => (
        <div
          key={stat?.id}
          className="bg-card border border-border rounded-lg p-4 md:p-6 hover:shadow-elevation-2 transition-all duration-250"
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${stat?.color}`}
            >
              <Icon name={stat?.icon} size={20} />
            </div>
            <div className="flex items-center gap-1 text-xs font-medium">
              <Icon
                name={
                  stat?.changeType === "increase"
                    ? "TrendingUp"
                    : "TrendingDown"
                }
                size={14}
                className={
                  stat?.changeType === "increase"
                    ? "text-success"
                    : "text-error"
                }
              />
              <span
                className={
                  stat?.changeType === "increase"
                    ? "text-success"
                    : "text-error"
                }
              >
                {stat?.change}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs md:text-sm text-muted-foreground mb-1">
              {stat?.label}
            </p>
            <p className="text-xl md:text-2xl font-semibold text-foreground data-text">
              {stat?.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoansDashboardStats;
