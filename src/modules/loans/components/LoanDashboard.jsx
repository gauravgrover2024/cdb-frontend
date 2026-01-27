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
    approvedToday: false, // ✅ extra flag
  });

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);

  const userRole = "admin";

  // ----------------------------
  // Helpers
  // ----------------------------
  const calculateAging = (createdAt) => {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const normalizeLoan = (loan) => ({
    ...loan,
    loanId: loan?.loanId || loan?._id || "",
    aging: loan?.aging ?? calculateAging(loan?.createdAt),
    status: loan?.approval_status || loan?.status || "Pending",
    loanAmount: loan?.approval_loanAmountApproved || loan?.loanAmount || 0,
    bankName: loan?.approval_bankName || loan?.bankName || null,
    currentStage: loan?.currentStage || "profile",
  });

  // ----------------------------
  // API
  // ----------------------------
  const fetchLoans = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/api/loans`);
      if (!res.ok) throw new Error("Failed to load loans");

      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];

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

  // ----------------------------
  // Filters
  // ----------------------------
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
      approvedToday: false,
    });
  };

  // ----------------------------
  // 🔥 STAT CLICK HANDLER
  // ----------------------------
  const handleStatClick = (type) => {
    switch (type) {
      case "total":
        handleResetFilters();
        break;

      case "pending":
        setFilters((prev) => ({
          ...prev,
          statuses: ["pending", "in progress"],
          stages: ["approval"],
          approvedToday: false,
        }));
        break;

      case "today":
        setFilters((prev) => ({
          ...prev,
          statuses: ["approved"],
          approvedToday: true,
        }));
        break;

      case "disbursed":
        setFilters((prev) => ({
          ...prev,
          statuses: ["disbursed"],
          approvedToday: false,
        }));
        break;

      default:
        break;
    }
  };

  // ----------------------------
  // Selection / actions
  // ----------------------------
  const handleSelectLoan = (loanId, checked) => {
    setSelectedLoans((prev) =>
      checked ? [...prev, loanId] : prev.filter((id) => id !== loanId),
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedLoans(checked ? loans.map((l) => l.loanId) : []);
  };

  const handleLoanClick = (loan, mode) => {
    if (mode === "edit") navigate(`/loans/edit/${loan.loanId}`);
    else setSelectedLoan(loan);
  };

  const handleQuickAction = (actionId) => {
    if (actionId === "new-case") navigate("/loans/new");
  };

  const handleDeleteLoan = async (loan) => {
    if (!loan) return;

    const id = loan._id || loan.loanId;
    if (!id) {
      alert("Invalid loan id");
      return;
    }

    const confirm = window.confirm(
      `Are you sure you want to delete loan ${loan.loanId}? This cannot be undone.`,
    );
    if (!confirm) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/loans/${id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Delete failed");
      }

      // ✅ refresh dashboard
      fetchLoans();
    } catch (err) {
      console.error("Delete loan failed:", err);
      alert(`Delete failed ❌\n${err.message}`);
    }
  };

  // ----------------------------
  // Filtering logic (single source of truth)
  // ----------------------------
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !loan.loanId?.toLowerCase().includes(q) &&
          !loan.customerName?.toLowerCase().includes(q) &&
          !loan.vehicleMake?.toLowerCase().includes(q) &&
          !loan.vehicleModel?.toLowerCase().includes(q)
        )
          return false;
      }

      if (
        filters.loanTypes.length &&
        !filters.loanTypes.includes(loan.loanType)
      )
        return false;

      if (filters.stages.length && !filters.stages.includes(loan.currentStage))
        return false;

      if (
        filters.statuses.length &&
        !filters.statuses.includes((loan.status || "").toLowerCase())
      )
        return false;

      if (filters.approvedToday) {
        const today = new Date().toDateString();
        const updated = loan.updatedAt
          ? new Date(loan.updatedAt).toDateString()
          : "";
        if (updated !== today) return false;
      }

      return true;
    });
  }, [loans, searchQuery, filters]);

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 lg:p-8 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border flex items-center justify-center">
              <Icon name="FileText" size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Loans</h1>
              <p className="text-xs text-muted-foreground">
                Track cases, approvals, disbursals & payouts
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              iconName="RefreshCcw"
              onClick={fetchLoans}
            >
              Refresh
            </Button>
            <QuickActionToolbar onAction={handleQuickAction} />
          </div>
        </div>

        {/* 🔥 STATS */}
        <LoansDashboardStats
          loans={loans}
          loading={loading}
          onStatClick={handleStatClick}
        />

        {/* Controls */}
        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <Input
            type="search"
            placeholder="Search Loan ID, Customer, Vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="mt-4">
            <HorizontalFilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
            />
          </div>

          <div className="mt-4" style={{ minHeight: 560 }}>
            <LoansDataGrid
              loans={filteredLoans}
              selectedLoans={selectedLoans}
              onSelectLoan={handleSelectLoan}
              onSelectAll={handleSelectAll}
              onLoanClick={handleLoanClick}
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
        onEdit={(loan) => navigate(`/loans/edit/${loan.loanId}`)}
      />
    </div>
  );
};

export default LoanDashboard;
