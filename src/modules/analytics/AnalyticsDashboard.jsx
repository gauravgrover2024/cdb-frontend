import React, { useState, useEffect, useMemo } from "react";
import LoadingSpinner from "../../components/ui/LoadingSpinner"; 
import { loansApi } from "../../api/loans";
import { 
  StatCard, 
  PartnerCard, 
  RecentApplicationsTable,
  StageDistributionCard,
  LoanTypeBreakdown,
  StatusOverview
} from "./components";

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
    // 1. Total Revenue (Approved + Disbursed Loans Only)
    // Logic: Sum of 'approval_loanAmountApproved' or 'loanAmount' for solid statuses
    const revenueLoans = loans.filter(l => {
         const status = (l.status || l.approval_status || "").toLowerCase();
         return ["approved", "disbursed", "completed"].includes(status);
    });
    
    const totalRevenue = revenueLoans.reduce((acc, l) => {
        const amount = Number(l.approval_loanAmountApproved || l.loanAmount) || 0;
        return acc + amount;
    }, 0);

    // 2. Pending Value (Pending, In Progress, Submitted)
    const pendingLoans = loans.filter(l => {
        const status = (l.status || l.approval_status || "").toLowerCase();
        return ["pending", "in progress", "new", "submitted", "login"].includes(status);
    });

    const pendingValue = pendingLoans.reduce((acc, l) => {
       const amount = Number(l.loanAmount) || 0; // Use requested amount for pending
       return acc + amount;
    }, 0);

    // 3. Conversion Rate
    const totalApplications = loans.length;
    const successfulLoans = revenueLoans.length;
    const conversionRate = totalApplications > 0 ? ((successfulLoans / totalApplications) * 100).toFixed(1) + "%" : "0%";

    // 4. Disbursed Count
    const disbursedCount = loans.filter(l => (l.status || l.approval_status || "").toLowerCase() === "disbursed").length;

    // 5. Average Loan Amount
    const avgLoanAmount = totalApplications > 0 
      ? loans.reduce((acc, l) => acc + (Number(l.loanAmount) || 0), 0) / totalApplications 
      : 0;

    // 6. Rejected Count
    const rejectedCount = loans.filter(l => {
      const status = (l.status || l.approval_status || "").toLowerCase();
      return ["rejected", "declined", "failed"].some(s => status.includes(s));
    }).length;

    // 7. Active Applications (In Progress)
    const activeCount = pendingLoans.length;

    // 8. Total Applications
    const totalApps = totalApplications;

    return {
      revenue: {
        value: `₹${(totalRevenue / 10000000).toFixed(2)} Cr`,
        title: "Total Revenue",
        color: "blue",
        icon: "DollarSign" 
      },
      pending: {
        value: `₹${(pendingValue / 100000).toFixed(2)} L`,
        title: "Pipeline Value",
        color: "rose",
        icon: "CircleAlert"
      },
      conversion: {
        value: conversionRate,
        title: "Conversion Rate",
        color: "purple",
        icon: "TrendingUp"
      },
      disbursed: {
        value: disbursedCount.toString(),
        title: "Disbursed Loans",
        color: "emerald",
        icon: "CheckCircle2"
      },
      avgLoan: {
        value: `₹${(avgLoanAmount / 100000).toFixed(2)} L`,
        title: "Avg Loan Amount",
        color: "blue",
        icon: "Calculator"
      },
      rejected: {
        value: rejectedCount.toString(),
        title: "Rejected",
        color: "rose",
        icon: "XCircle"
      },
      active: {
        value: activeCount.toString(),
        title: "Active Cases",
        color: "amber",
        icon: "Clock"
      },
      total: {
        value: totalApps.toString(),
        title: "Total Applications",
        color: "purple",
        icon: "FileText"
      }
    };
  }, [loans]);

  // Bank/Partner Stats (Top 3)
  const bankStats = useMemo(() => {
    const bankCounts = {};
    const bankVolumes = {};

    loans.forEach(l => {
      const bank = l.approval_bankName || l.bankName || "Direct / Unknown";
      bankCounts[bank] = (bankCounts[bank] || 0) + 1;
      
      const amount = Number(l.approval_loanAmountApproved || l.loanAmount) || 0;
      bankVolumes[bank] = (bankVolumes[bank] || 0) + amount;
    });

    return Object.entries(bankCounts)
      .map(([name, count]) => ({ 
          name, 
          count,
          volume: bankVolumes[name]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [loans]);

  // Stage Distribution
  const stageDistribution = useMemo(() => {
    const stages = {};
    loans.forEach(l => {
      const stage = l.currentStage || "profile";
      stages[stage] = (stages[stage] || 0) + 1;
    });

    const total = loans.length || 1;
    return Object.entries(stages)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [loans]);

  // Loan Type Breakdown
  const loanTypeBreakdown = useMemo(() => {
    const types = {};
    const volumes = {};

    loans.forEach(l => {
      const type = l.typeOfLoan || l.loanType || "General";
      types[type] = (types[type] || 0) + 1;
      
      const amount = Number(l.approval_loanAmountApproved || l.loanAmount) || 0;
      volumes[type] = (volumes[type] || 0) + amount;
    });

    return Object.entries(types)
      .map(([name, count]) => ({
        name,
        count,
        volume: volumes[name]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [loans]);

  // Status Overview
  const statusOverview = useMemo(() => {
    const statuses = {};
    
    loans.forEach(l => {
      const status = l.status || l.approval_status || "Pending";
      statuses[status] = (statuses[status] || 0) + 1;
    });

    return Object.entries(statuses)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [loans]);

  // Recent Transactions (Table Data) - Show top 10
  const recentTransactions = useMemo(() => {
    return [...loans]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 10) // Show top 10
      .map(l => ({
        id: l._id,
        invoiceId: `APP-${(l._id || "").slice(-6).toUpperCase()}`,
        client: l.customerName || "Unknown Client",
        role: l.typeOfLoan || l.loanType || "General Loan",
        amount: `₹${(Number(l.approval_loanAmountApproved || l.loanAmount) || 0).toLocaleString()}`,
        date: l.updatedAt ? new Date(l.updatedAt).toLocaleDateString() : "N/A",
        status: (l.status || l.approval_status || "Pending"),
        rawStatus: (l.status || l.approval_status || "pending").toLowerCase()
      }));
  }, [loans]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center min-h-[400px]">
        <LoadingSpinner text="Aggregating Business Intelligence & Metrics..." />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 p-4 md:p-6 bg-background dark:bg-background overflow-hidden font-sans">
      {/* Stats Grid - 8 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
        <StatCard {...stats.revenue} iconName={stats.revenue.icon} />
        <StatCard {...stats.pending} iconName={stats.pending.icon} />
        <StatCard {...stats.conversion} iconName={stats.conversion.icon} />
        <StatCard {...stats.disbursed} iconName={stats.disbursed.icon} />
      </div>

      {/* Additional Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
        <StatCard {...stats.avgLoan} iconName={stats.avgLoan.icon} />
        <StatCard {...stats.rejected} iconName={stats.rejected.icon} />
        <StatCard {...stats.active} iconName={stats.active.icon} />
        <StatCard {...stats.total} iconName={stats.total.icon} />
      </div>

      {/* Partner Stats / Middle Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        {bankStats.length > 0 ? (
          bankStats.map((bank, idx) => (
            <PartnerCard key={idx} bank={bank} index={idx} />
          ))
        ) : (
          <div className="rounded-xl border text-card-foreground shadow-sm bg-white dark:bg-card border-border p-6 col-span-3 flex items-center justify-center h-[120px]">
            <p className="text-muted-foreground text-sm">No Partner Data Available</p>
          </div>
        )}
      </div>

      {/* Stage Distribution & Loan Type Breakdown & Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        <StageDistributionCard stages={stageDistribution} />
        <LoanTypeBreakdown loanTypes={loanTypeBreakdown} />
        <StatusOverview statusData={statusOverview} />
      </div>

      {/* Recent Records Table */}
      <RecentApplicationsTable transactions={recentTransactions} />
    </div>
  );
};

export default AnalyticsDashboard;
