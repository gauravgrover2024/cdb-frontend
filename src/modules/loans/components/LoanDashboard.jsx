import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import QuickActionToolbar from "../../../components/ui/QuickActionToolbar";
import HorizontalFilterBar from "./dashboard/HorizontalFilterBar";
import LoansDataGrid from "./dashboard/LoansDataGrid";
import LoanViewModal from "./dashboard/LoanViewModal";
import LoansDashboardStats from "./dashboard/LoansDashboardStats";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import Icon from "../../../components/AppIcon";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

const LoanDashboard = () => {
  const navigate = useNavigate();

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedLoans, setSelectedLoans] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [filters, setFilters] = useState({
    loanTypes: [],
    stages: [],
    statuses: [],
    agingBuckets: [],
    amountRanges: [],
  });

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);

  const userRole = "admin";

  const calculateAging = (createdAt) => {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const normalizeLoan = (loan) => {
    return {
      ...loan,
      loanId: loan?.loanId || loan?._id || "",
      aging: loan?.aging ?? calculateAging(loan?.createdAt),
      status: loan?.approval_status || loan?.status || "Pending",
      loanAmount: loan?.approval_loanAmountApproved || loan?.loanAmount || 0,
      bankName: loan?.approval_bankName || loan?.bankName || null,
      currentStage: loan?.currentStage || "profile",
    };
  };

  const fetchLoans = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/api/loans`);
      if (!res.ok) throw new Error("Failed to load loans");

      const json = await res.json();

      // ✅ loans API returns ARRAY directly
      const list = Array.isArray(json) ? json : [];

      setLoans(list.map(normalizeLoan));
    } catch (e) {
      console.error("Fetch Loans Error:", e);
      setLoans([]);
      alert("Failed to load loans ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      loanTypes: [],
      stages: [],
      statuses: [],
      agingBuckets: [],
      amountRanges: [],
    });
  };

  const handleSelectLoan = (loanId, checked) => {
    setSelectedLoans((prev) =>
      checked ? [...prev, loanId] : prev?.filter((id) => id !== loanId),
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedLoans(checked ? loans?.map((l) => l?.loanId) : []);
  };

  const handleLoanClick = (loan, mode) => {
    if (mode === "edit") {
      handleNavigateToLoan(loan);
    } else {
      setSelectedLoan(loan);
    }
  };

  const handleBulkAction = (action) => {
    console.log("Bulk action:", action, "on loans:", selectedLoans);
  };

  const handleQuickAction = (actionId) => {
    if (actionId === "new-case") {
      navigate("/loans/new");
    }
  };

  const handleNavigateToLoan = (loan) => {
    navigate(`/loans/edit/${loan.loanId}`);
  };

  const handleDeleteLoan = async (loan) => {
    if (!loan?.loanId) return;

    const ok = window.confirm(
      `Delete loan ${loan.loanId}?\n\nThis will permanently remove it from database.`,
    );
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/loans/${loan.loanId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      await fetchLoans();
      setSelectedLoan(null);
      setSelectedLoans((prev) => prev.filter((id) => id !== loan.loanId));
    } catch (e) {
      console.error("Delete Loan Error:", e);
      alert("Failed to delete loan ❌");
    }
  };

  const filteredLoans = useMemo(() => {
    return loans?.filter((loan) => {
      if (searchQuery) {
        const query = searchQuery?.toLowerCase();
        const matchesSearch =
          loan?.loanId?.toLowerCase()?.includes(query) ||
          loan?.customerName?.toLowerCase()?.includes(query) ||
          loan?.vehicleModel?.toLowerCase()?.includes(query) ||
          loan?.vehicleMake?.toLowerCase()?.includes(query);

        if (!matchesSearch) return false;
      }

      if (
        filters?.loanTypes?.length > 0 &&
        !filters?.loanTypes?.includes(loan?.loanType)
      ) {
        return false;
      }

      if (
        filters?.stages?.length > 0 &&
        !filters?.stages?.includes(loan?.currentStage)
      ) {
        return false;
      }

      if (
        filters?.statuses?.length > 0 &&
        !filters?.statuses?.includes((loan?.status || "").toLowerCase())
      ) {
        return false;
      }

      if (filters?.agingBuckets?.length > 0) {
        const aging = loan?.aging || 0;
        const matchesBucket = filters?.agingBuckets?.some((bucket) => {
          if (bucket === "0-7") return aging >= 0 && aging <= 7;
          if (bucket === "8-15") return aging >= 8 && aging <= 15;
          if (bucket === "16-30") return aging >= 16 && aging <= 30;
          if (bucket === "31-60") return aging >= 31 && aging <= 60;
          if (bucket === "60+") return aging > 60;
          return false;
        });
        if (!matchesBucket) return false;
      }

      if (filters?.amountRanges?.length > 0) {
        const amount = (loan?.loanAmount || 0) / 100000;
        const matchesRange = filters?.amountRanges?.some((range) => {
          if (range === "0-5") return amount >= 0 && amount < 5;
          if (range === "5-10") return amount >= 5 && amount < 10;
          if (range === "10-15") return amount >= 10 && amount < 15;
          if (range === "15-20") return amount >= 15 && amount < 20;
          if (range === "20+") return amount >= 20;
          return false;
        });
        if (!matchesRange) return false;
      }

      return true;
    });
  }, [loans, searchQuery, filters]);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 lg:p-8 space-y-5">
        {/* Header (CustomerDashboard style) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Icon name="FileText" size={18} className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-foreground leading-tight">
                  Loans
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Track cases, approvals, disbursals, delivery & payouts
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              iconName="RefreshCcw"
              onClick={fetchLoans}
              disabled={loading}
            >
              Refresh
            </Button>
            <QuickActionToolbar onAction={handleQuickAction} />
          </div>
        </div>

        {/* Stats */}
        <LoansDashboardStats loans={loans} loading={loading} />

        {/* Controls */}
        <div className="bg-card border border-border rounded-2xl p-4 md:p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 w-full md:max-w-md">
              <Input
                type="search"
                placeholder="Search Loan ID, Customer, Vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e?.target?.value)}
              />
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3">
              <div className="text-xs text-muted-foreground">
                {loading ? "Loading..." : `${filteredLoans.length} result(s)`}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <HorizontalFilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
            />
          </div>

          {/* Table */}
          <div
            className="mt-4"
            style={{ height: "calc(100vh - 520px)", minHeight: 560 }}
          >
            <LoansDataGrid
              loans={filteredLoans}
              selectedLoans={selectedLoans}
              onSelectLoan={handleSelectLoan}
              onSelectAll={handleSelectAll}
              onLoanClick={handleLoanClick}
              onBulkAction={handleBulkAction}
              onDeleteLoan={handleDeleteLoan}
              userRole={userRole}
              loading={loading}
            />
          </div>
        </div>
      </div>

      <LoanViewModal
        open={!!selectedLoan}
        loan={selectedLoan}
        onClose={() => setSelectedLoan(null)}
        onEdit={(loan) => handleNavigateToLoan(loan)}
      />
    </div>
  );
};

export default LoanDashboard;
