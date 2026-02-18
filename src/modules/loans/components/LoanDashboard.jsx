import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import HorizontalFilterBar from "./dashboard/HorizontalFilterBar";
import LoansDataGrid from "./dashboard/LoansDataGrid";
import LoanViewModal from "./dashboard/LoanViewModal";
import DashboardNotesModal from "./dashboard/DashboardNotesModal";
import Icon from "../../../components/AppIcon";
import { loansApi } from "../../../api/loans";
const StatCard = ({ title, value, color, iconName, onClick, isActive }) => {
  const theme = {
    indigo: {
      card: "border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10",
      active: "bg-indigo-600 border-indigo-600 text-white shadow-lg ring-2 ring-offset-2 ring-offset-background ring-indigo-500 dark:ring-indigo-400",
      text: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    },
    amber: {
      card: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10",
      active: "bg-amber-500 border-amber-500 text-white shadow-lg ring-2 ring-offset-2 ring-offset-background ring-amber-500 dark:ring-amber-400",
      text: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
    },
    emerald: {
      card: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10",
      active: "bg-emerald-600 border-emerald-600 text-white shadow-lg ring-2 ring-offset-2 ring-offset-background ring-emerald-500 dark:ring-emerald-400",
      text: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    blue: {
      card: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10",
      active: "bg-blue-600 border-blue-600 text-white shadow-lg ring-2 ring-offset-2 ring-offset-background ring-blue-500 dark:ring-blue-400",
      text: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
    },
  };
  const t = theme[color] || theme.indigo;
  const textClass = isActive ? "text-white" : t.text;
  const iconClass = isActive ? "bg-white/20 text-white" : `${t.iconBg} ${t.text}`;

  return (
    <div
      className={`relative border rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] flex items-center justify-between gap-3 overflow-hidden min-h-0
        ${isActive ? t.active : `bg-card dark:bg-card/80 border-border ${t.card}`}
      `}
      onClick={onClick}
    >
      {isActive && (
        <div className="absolute top-1 right-1">
          <Icon name="CheckCircle2" size={12} className="text-white opacity-50" />
        </div>
      )}
      <div className="relative z-10 min-w-0">
        <p className={`text-xs font-medium mb-0.5 ${isActive ? "text-white/80" : "text-muted-foreground"}`}>{title}</p>
        <p className={`text-xl font-bold font-mono tracking-tight ${textClass}`}>{value}</p>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClass}`}>
        <Icon name={iconName} size={20} className={textClass} />
      </div>
    </div>
  );
};

const LoanDashboard = () => {
  const navigate = useNavigate();

  // "viewLoan" controls the detailed LoanViewModal
  const [viewLoan, setViewLoan] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [initialViewTab, setInitialViewTab] = useState(null);
  
  const [notesLoan, setNotesLoan] = useState(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  const [selectedLoans, setSelectedLoans] = useState([]);

  const [filters, setFilters] = useState({
    loanTypes: [],
    stages: [],
    statuses: [],
    agingBuckets: [],
    amountRanges: [],
    approvedToday: false,
    searchQuery: "",
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

  const normalizeLoan = useCallback((loan) => ({
    ...loan,
    loanId: loan?.loanId || loan?._id || "",
    _id: loan?._id,
    aging: loan?.aging ?? calculateAging(loan?.createdAt),
    status: loan?.approval_status || loan?.status || "New",
    loanAmount: loan?.approval_loanAmountApproved || loan?.approval_loanAmountDisbursed || loan?.loanAmount || loan?.financeExpectation || 0,
    bankName: loan?.approval_bankName || loan?.bankName || null,
    currentStage: loan?.currentStage || "profile",
    // Customer Details
    customerName: loan?.customerName || loan?.applicant_name || loan?.leadName || "Unknown",
    primaryMobile: loan?.primaryMobile || loan?.mobile || loan?.phone || "N/A",
    email: loan?.email || loan?.emailId || "",
    city: loan?.city || loan?.permanentCity || "N/A",
    pincode: loan?.pincode || loan?.permanentPincode || "",
    residenceAddress: loan?.residenceAddress || loan?.currentAddress || "",
    permanentAddress: loan?.permanentAddress || "",
    // Source & Reference
    source: loan?.source || loan?.sourcingChannel || loan?.recordSource || "N/A",
    sourceName: loan?.sourceName || "",
    dealerName: loan?.dealerName || loan?.showroomName || "",
    dealerContactPerson: loan?.dealerContactPerson || "",
    // Vehicle Details
    vehicleMake: loan?.vehicleMake || loan?.make || "",
    vehicleModel: loan?.vehicleModel || loan?.model || "",
    vehicleVariant: loan?.vehicleVariant || loan?.variant || "",
    registrationNumber: loan?.registrationNumber || loan?.vehicleNumber || loan?.regNo || "N/A",
    typeOfLoan: loan?.typeOfLoan || loan?.loanType || "",
    registrationCity: loan?.registrationCity || "",
    postfile_regd_city: loan?.postfile_regd_city || loan?.registrationCity || "",
    // Approval Details
    approval_loanAmountApproved: loan?.approval_loanAmountApproved || loan?.loanAmount || 0,
    approval_loanAmountDisbursed: loan?.approval_loanAmountDisbursed || 0,
    approval_bankName: loan?.approval_bankName || loan?.bankName || "N/A",
    approval_banksData: loan?.approval_banksData || [],
    approval_roi: loan?.approval_roi || loan?.roi || null,
    approval_tenureMonths: loan?.approval_tenureMonths || loan?.loanTenureMonths || loan?.tenure || null,
    approval_disbursedDate: loan?.approval_disbursedDate || loan?.disbursement_date || null,
    // Reference data
    reference1: loan?.reference1 || {},
    // Timestamps
    createdAt: loan?.createdAt || loan?.receivingDate || null,
    updatedAt: loan?.updatedAt || null,
  }), []);

  const fetchLoans = useCallback(async () => {
    try {
      setLoading(true);
      const json = await loansApi.getAll();
      const list = Array.isArray(json?.data) ? json.data : [];
      setLoans(list.map(normalizeLoan));
    } catch (e) {
      console.error("Fetch Loans Error:", e);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, [normalizeLoan]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  // Refresh loans when component becomes visible (e.g., after navigating back from edit)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLoans();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchLoans]);

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
      searchQuery: "",
    });
  };

  const handleStatClick = (type) => {
    handleResetFilters();
    switch (type) {
      case "pending":
        setFilters((prev) => ({
          ...prev,
          statuses: ["Pending", "In Progress"],
          stages: ["approval"],
        }));
        break;
      case "today":
        setFilters((prev) => ({
          ...prev,
          statuses: ["Approved"],
          approvedToday: true,
        }));
        break;
      case "disbursed":
        setFilters((prev) => ({
          ...prev,
          statuses: ["Disbursed"],
        }));
        break;
      default:
        break;
    }
  };

  const handleSelectLoan = (loanId, checked) => {
    setSelectedLoans((prev) =>
      checked ? [...prev, loanId] : prev.filter((id) => id !== loanId),
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedLoans(checked ? loans.map((l) => l.loanId) : []);
  };

  const handleSelectionChange = (keys) => {
    setSelectedLoans(keys);
  };

  // MAIN HANDLER FOR CLICKS
  const handleLoanClick = (loan, mode) => {
    if (mode === "edit") {
      navigate(`/loans/edit/${loan.loanId}`);
    } else if (mode === "view") {
      // Explicitly open modal for "view" mode
      setInitialViewTab(null);
      setViewLoan(loan);
      setIsViewModalOpen(true);
    } else if (mode === "approval") {
      // Open modal and navigate to approval tab
      setInitialViewTab("approval");
      setViewLoan(loan);
      setIsViewModalOpen(true);
    }
  };

  const handleQuickAction = async (actionId) => {
    if (actionId === "new-case") {
        navigate("/loans/new");
    }
  };

  const handleBulkAction = async (action) => {
    switch (action) {
      case "export":
        message.success(`Exporting ${selectedLoans.length} cases...`);
        break;
      case "dispatch":
        message.info(`Dispatching ${selectedLoans.length} cases...`);
        break;
      case "approve":
        message.success(`Approving ${selectedLoans.length} cases...`);
        fetchLoans(); 
        break;
      case "delete":
        if (selectedLoans.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedLoans.length} cases?`)) return;
        try {
          message.loading({ content: "Deleting...", key: "bulk_delete" });
          await Promise.all(selectedLoans.map((id) => loansApi.delete(id)));
          message.success({ content: "Deleted successfully", key: "bulk_delete" });
          setSelectedLoans([]);
          fetchLoans();
        } catch (e) {
          console.error("Bulk delete failed", e);
          message.error({ content: "Failed to delete some cases", key: "bulk_delete" });
        }
        break;
      default:
        console.warn("Unknown bulk action:", action);
    }
  };

  const handleDeleteLoan = async (loan) => {
    if (!loan) return;
    const id = loan._id || loan.loanId;
    if (!window.confirm(`Delete ${loan.loanId}?`)) return;
    try {
      await loansApi.delete(id);
      fetchLoans();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleShowOtherBanks = (loan, otherBanks) => {
    setInitialViewTab("approval");
    setViewLoan(loan);
    setIsViewModalOpen(true);
  };

  const handleUpdateStatus = (loan) => {
    setInitialViewTab("approval");
    setViewLoan(loan);
    setIsViewModalOpen(true);
  };

  const handleNotesClick = (loan) => {
    setNotesLoan(loan);
    setIsNotesModalOpen(true);
  };

  const handleUploadDocuments = (loan) => {
    navigate(`/loans/edit/${loan?.loanId || loan?._id}`);
  };

  const handleShareLoan = (loan) => {
    const loanId = loan?.loanId || loan?.loan_number || loan?._id;
    if (!loanId) {
      message.warning("Loan ID not found.");
      return;
    }
    const base = window.location.pathname.split("/loans")[0] || "";
    const url = `${window.location.origin}${base}/loans/edit/${loanId}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        message.success("Loan link copied to clipboard.");
      }).catch(() => {
        message.error("Could not copy link.");
      });
    } else {
      message.info("Copy link: " + url);
    }
  };

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      // Global search
      if (filters.searchQuery?.trim()) {
        const q = filters.searchQuery.trim().toLowerCase();
        const searchableFields = [
          loan.loanId,
          loan.loan_number,
          loan._id,
          loan.customerName,
          loan.primaryMobile,
          loan.email,
          loan.city,
          loan.permanentCity,
          loan.residenceAddress,
          loan.permanentAddress,
          loan.pincode,
          loan.permanentPincode,
          loan.vehicleMake,
          loan.vehicleModel,
          loan.vehicleVariant,
          loan.registrationNumber,
          loan.vehicleNumber,
          loan.typeOfLoan,
          loan.loanType,
          loan.postfile_regd_city,
          loan.bankName,
          loan.approval_bankName,
          ...(loan.approval_banksData || []).map((b) => b.bankName),
          loan.source,
          loan.sourcingChannel,
          loan.recordSource,
          loan.sourceName,
          loan.dealerName,
          loan.dealerContactPerson,
          loan.reference1?.name,
          loan.status,
          loan.approval_status,
          loan.currentStage,
        ];
        const matchFound = searchableFields.some(
          (field) => field != null && String(field).toLowerCase().includes(q)
        );
        if (!matchFound) return false;
      }

      // Loan type (support both loanType and typeOfLoan from API)
      const loanTypeValue = (loan.loanType || loan.typeOfLoan || "").trim();
      if (filters.loanTypes?.length) {
        const matches = filters.loanTypes.some(
          (ft) => (loanTypeValue && ft.toLowerCase() === loanTypeValue.toLowerCase()) || (ft === loanTypeValue)
        );
        if (!matches) return false;
      }

      // Stage
      const stage = (loan.currentStage || "profile").toLowerCase();
      if (filters.stages?.length) {
        const matches = filters.stages.some((s) => s.toLowerCase() === stage);
        if (!matches) return false;
      }

      // Status (case-insensitive; API may return Approved, approved, Pending, etc.)
      const loanStatus = (loan.status || loan.approval_status || "New").trim();
      if (filters.statuses?.length) {
        const matches = filters.statuses.some(
          (s) => s && loanStatus && s.toLowerCase() === loanStatus.toLowerCase()
        );
        if (!matches) return false;
      }

      // Aging buckets (days since creation)
      const aging = loan.aging ?? calculateAging(loan.createdAt);
      if (filters.agingBuckets?.length) {
        const inBucket = filters.agingBuckets.some((bucket) => {
          if (bucket === "0-7") return aging >= 0 && aging <= 7;
          if (bucket === "8-15") return aging >= 8 && aging <= 15;
          if (bucket === "16-30") return aging >= 16 && aging <= 30;
          if (bucket === "31-60") return aging >= 31 && aging <= 60;
          if (bucket === "60+") return aging >= 60;
          return false;
        });
        if (!inBucket) return false;
      }

      // Amount ranges (loan amount in lakhs: 5-10 means 5–10 Lakh)
      const amountLakhs = (loan.loanAmount || loan.approval_loanAmountApproved || loan.approval_loanAmountDisbursed || 0) / 100000;
      if (filters.amountRanges?.length) {
        const inRange = filters.amountRanges.some((range) => {
          if (range === "0-5") return amountLakhs >= 0 && amountLakhs < 5;
          if (range === "5-10") return amountLakhs >= 5 && amountLakhs < 10;
          if (range === "10-15") return amountLakhs >= 10 && amountLakhs < 15;
          if (range === "15-20") return amountLakhs >= 15 && amountLakhs < 20;
          if (range === "20+") return amountLakhs >= 20;
          return false;
        });
        if (!inRange) return false;
      }

      // Approved today (updated or approved today)
      if (filters.approvedToday) {
        const today = new Date().toDateString();
        const updated = loan.updatedAt ? new Date(loan.updatedAt).toDateString() : "";
        const approved = loan.approval_approvalDate ? new Date(loan.approval_approvalDate).toDateString() : "";
        if (updated !== today && approved !== today) return false;
      }

      return true;
    });
  }, [loans, filters]);

  const statsData = useMemo(() => {
    const total = loans.length;
    const pending = loans.filter(l => l.currentStage === "approval" && ["pending", "in progress"].includes((l.status || "").toLowerCase())).length;
    const todayStr = new Date().toDateString();
    const approvedToday = loans.filter(l => (l.status || "").toLowerCase() === "approved" && l.updatedAt && new Date(l.updatedAt).toDateString() === todayStr).length;
    const disbursed = loans.filter(l => (l.status || "").toLowerCase() === "disbursed").length;
    return { total, pending, approvedToday, disbursed };
  }, [loans]);

  return (
    <div className="h-full flex flex-col gap-6 p-4 md:p-6 bg-background dark:bg-background overflow-hidden font-sans border-2 border-border dark:border-border/40 rounded-lg">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
         <StatCard 
            title="Total Cases" 
            value={statsData.total} 
            color="indigo" 
            iconName="FileText" 
            isActive={!filters.approvedToday && filters.statuses.length === 0 && filters.stages.length === 0}
            onClick={() => handleStatClick('total')}
         />
         <StatCard 
            title="Pending Approval" 
            value={statsData.pending} 
            color="amber" 
            iconName="Clock" 
            isActive={filters.stages.includes('approval') && (filters.statuses.includes('Pending') || filters.statuses.includes('In Progress'))}
            onClick={() => handleStatClick('pending')}
         />
         <StatCard 
            title="Approved Today" 
            value={statsData.approvedToday} 
            color="emerald" 
            iconName="CheckCircle2" 
            isActive={filters.approvedToday}
            onClick={() => handleStatClick('today')}
         />
         <StatCard 
            title="Disbursed" 
            value={statsData.disbursed} 
            color="blue" 
            iconName="Banknote" 
            isActive={filters.statuses.includes('Disbursed')}
            onClick={() => handleStatClick('disbursed')}
         />
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-card dark:bg-card/95 border-2 border-border dark:border-border/60 rounded-xl shadow-sm overflow-hidden">
        <div className="flex-shrink-0 bg-muted/30 dark:bg-muted/20 border-b-2 border-border dark:border-border/60 p-1">
            <HorizontalFilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                onRefresh={fetchLoans}
                onNewCase={() => handleQuickAction("new-case")}
            />
        </div>

        <div className="flex-1 overflow-hidden relative">
            <LoansDataGrid
                loans={filteredLoans}
                selectedLoans={selectedLoans}
                onSelectLoan={handleSelectLoan}
                onSelectAll={handleSelectAll}
                onSelectionChange={handleSelectionChange}
                onLoanClick={handleLoanClick}
                onBulkAction={handleBulkAction}
                onDeleteLoan={handleDeleteLoan}
                onUpdateStatus={handleUpdateStatus}
                onUploadDocuments={handleUploadDocuments}
                onShareLoan={handleShareLoan}
                onRefreshLoans={fetchLoans}
                onAddLoan={() => handleQuickAction("new-case")}
                onShowOtherBanks={handleShowOtherBanks}
                onNotesClick={handleNotesClick}
                userRole={userRole}
                loading={loading}
            />
        </div>
      </div>

      <LoanViewModal
        open={isViewModalOpen}
        loan={viewLoan}
        initialTab={initialViewTab}
        onClose={() => {
            setIsViewModalOpen(false);
            setViewLoan(null);
            setInitialViewTab(null);
        }}
        onEdit={() => {
            if (viewLoan) {
                navigate(`/loans/edit/${viewLoan.loanId}`);
            }
         }}
      />

      <DashboardNotesModal
        open={isNotesModalOpen}
        loan={notesLoan}
        onClose={() => {
          setIsNotesModalOpen(false);
          setNotesLoan(null);
        }}
        onRefresh={fetchLoans}
      />
    </div>
  );
};

export default LoanDashboard;
