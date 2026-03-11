import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import HorizontalFilterBar from "./dashboard/HorizontalFilterBar";
import LoansDataGrid from "./dashboard/LoansDataGrid";
import LoanViewModal from "./dashboard/LoanViewModal";
import DashboardNotesModal from "./dashboard/DashboardNotesModal";
import Icon from "../../../components/AppIcon";
import { loansApi } from "../../../api/loans";

const PRIMARY_STAT_THEMES = {
  total: {
    card: "from-sky-500 to-indigo-600",
    iconBg: "bg-white/20",
    accent: "text-sky-100",
  },
  pending: {
    card: "from-amber-500 to-orange-600",
    iconBg: "bg-white/20",
    accent: "text-amber-100",
  },
  today: {
    card: "from-emerald-500 to-green-600",
    iconBg: "bg-white/20",
    accent: "text-emerald-100",
  },
  disbursed: {
    card: "from-violet-500 to-fuchsia-600",
    iconBg: "bg-white/20",
    accent: "text-violet-100",
  },
  ticket: {
    card: "from-slate-700 to-slate-900",
    iconBg: "bg-white/20",
    accent: "text-slate-200",
  },
  emi: {
    card: "from-rose-500 to-pink-600",
    iconBg: "bg-white/20",
    accent: "text-rose-100",
  },
};

const MetricCard = ({ id, title, subtitle, value, iconName, onClick, isActive, loading }) => {
  const theme = PRIMARY_STAT_THEMES[id] || PRIMARY_STAT_THEMES.total;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left w-full overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br ${theme.card} p-4 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
    >
      <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] uppercase tracking-[0.18em] font-semibold ${theme.accent}`}>{title}</p>
          <p className="mt-1 text-2xl md:text-3xl font-black text-white tabular-nums">
            {loading ? "—" : value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-white/80">{subtitle}</p>}
        </div>

        <div className={`mt-1 h-10 w-10 rounded-xl ${theme.iconBg} text-white flex items-center justify-center backdrop-blur-sm`}>
          <Icon name={iconName} size={18} />
        </div>
      </div>

      {isActive && (
        <div className="absolute right-2 top-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
          Active
        </div>
      )}
    </button>
  );
};

const LoanDashboard = () => {
  const navigate = useNavigate();
  const PAGE1_CACHE_KEY = "loans_dashboard_page1_cache_v1";
  const STATS_CACHE_KEY = "loans_dashboard_stats_cache_v1";
  const STATS_TTL_MS = 2 * 60 * 1000;
  const formatCrores = (amount) => {
    const value = Number(amount) || 0;
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  };

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
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [serverTotal, setServerTotal] = useState(0);
  const [statsData, setStatsData] = useState({
    total: 0,
    pending: 0,
    approvedToday: 0,
    disbursed: 0,
    totalBookValue: 0,
    emiCapturedCount: 0,
    regNoCapturedCount: 0,
  });
  const pageSize = 75;
  const pageCacheRef = useRef(new Map());

  const userRole = "admin";

  const calculateAging = (createdAt) => {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const normalizeLoan = useCallback(
    (loan) => ({
      ...loan,
      loanId:
        loan?.loan_number ||
        loan?.loanNumber ||
        loan?.loan_no ||
        loan?.loanId ||
        loan?.caseId ||
        loan?._id ||
        "",
      loan_number:
        loan?.loan_number ||
        loan?.loanNumber ||
        loan?.loan_no ||
        loan?.loanId ||
        "",
      _id: loan?._id,
      aging: loan?.aging ?? calculateAging(loan?.createdAt),
      status:
        loan?.approval_status ||
        loan?.approvalStatus ||
        loan?.status ||
        loan?.loanStatus ||
        "New",
      currentStage: loan?.currentStage || loan?.stage || loan?.workflowStage || "profile",
      loanAmount:
        loan?.approval_loanAmountApproved ||
        loan?.approval_loanAmountDisbursed ||
        loan?.loanAmount ||
        loan?.financeExpectation ||
        0,
      postfile_emiAmount:
        loan?.postfile_emiAmount ||
        loan?.emiAmount ||
        loan?.monthlyEmi ||
        loan?.approval_emiAmount ||
        loan?.approval_emi ||
        0,

      bankName: loan?.approval_bankName || loan?.bankName || null,

      customerName:
        loan?.customerName || loan?.applicant_name || loan?.applicantName || loan?.leadName || "Unknown",
      primaryMobile: loan?.primaryMobile || loan?.mobile || loan?.phone || loan?.phoneNumber || "N/A",
      email: loan?.email || loan?.emailId || "",
      city: loan?.city || loan?.permanentCity || "N/A",
      pincode: loan?.pincode || loan?.permanentPincode || "",
      residenceAddress: loan?.residenceAddress || loan?.currentAddress || loan?.address || "",
      permanentAddress: loan?.permanentAddress || "",

      source: loan?.source || loan?.sourcingChannel || loan?.recordSource || "N/A",
      sourceName:
        loan?.sourceName ||
        loan?.source_name ||
        loan?.showroomName ||
        loan?.showroom ||
        loan?.showroom_name ||
        "",
      dealerName:
        loan?.dealerName ||
        loan?.showroomName ||
        loan?.showroom ||
        loan?.showroom_name ||
        loan?.branchName ||
        "",
      dealerContactPerson:
        loan?.dealerContactPerson ||
        loan?.showroomContactPerson ||
        loan?.dealer_contact_person ||
        "",

      vehicleMake: loan?.vehicleMake || loan?.make || "",
      vehicleModel: loan?.vehicleModel || loan?.model || "",
      vehicleVariant: loan?.vehicleVariant || loan?.variant || "",
      vehicleRegNo:
        loan?.vehicleRegNo ||
        loan?.vehicleRegdNumber ||
        loan?.rc_redg_no ||
        loan?.registrationNumber ||
        loan?.vehicleNumber ||
        loan?.regNo ||
        "",
      registrationNumber:
        loan?.registrationNumber ||
        loan?.vehicleRegNo ||
        loan?.vehicleNumber ||
        loan?.rc_redg_no ||
        loan?.regNo ||
        "",
      typeOfLoan: loan?.typeOfLoan || loan?.loanType || "",
      registrationCity: loan?.registrationCity || "",
      postfile_regd_city: loan?.postfile_regd_city || loan?.registrationCity || "",
      rc_redg_no:
        loan?.rc_redg_no ||
        loan?.vehicleRegNo ||
        loan?.vehicleRegdNumber ||
        loan?.registrationNumber ||
        "",

      approval_loanAmountApproved: loan?.approval_loanAmountApproved || loan?.loanAmount || 0,
      approval_loanAmountDisbursed: loan?.approval_loanAmountDisbursed || 0,
      approval_bankName: loan?.approval_bankName || loan?.bankName || "N/A",
      approval_banksData: loan?.approval_banksData || [],
      approval_roi: loan?.approval_roi || loan?.roi || null,
      approval_tenureMonths:
        loan?.approval_tenureMonths || loan?.loanTenureMonths || loan?.tenure || null,
      approval_approvalDate: loan?.approval_approvalDate || null,
      approval_disbursedDate:
        loan?.approval_disbursedDate ||
        loan?.disbursement_date ||
        loan?.disbursementDate ||
        loan?.disbursedDate ||
        null,
      disbursement_date:
        loan?.disbursement_date ||
        loan?.approval_disbursedDate ||
        loan?.disbursementDate ||
        loan?.disbursedDate ||
        null,
      dispatch_date: loan?.dispatch_date || loan?.dispatchDate || null,
      delivery_date:
        loan?.delivery_date ||
        loan?.deliveryDate ||
        loan?.delivery_done_at ||
        loan?.vehicleDeliveryDate ||
        null,
      postfile_maturityDate:
        loan?.postfile_maturityDate || loan?.postfile_maturity_date || loan?.maturityDate || null,
      postfile_firstEmiDate:
        loan?.postfile_firstEmiDate || loan?.postfile_first_emi_date || loan?.firstEmiDate || null,
      postfile_currentOutstanding:
        loan?.postfile_currentOutstanding ||
        loan?.postfile_current_outstanding ||
        loan?.currentOutstanding ||
        loan?.livePrincipalOutstanding ||
        loan?.principalOutstanding ||
        null,

      reference1:
        typeof loan?.reference1 === "string"
          ? { name: loan.reference1 }
          : loan?.reference1 || { name: loan?.referenceName || "" },
      createdAt: loan?.createdAt || loan?.receivingDate || null,
      updatedAt: loan?.updatedAt || null,
    }),
    [],
  );

  const fetchLoans = useCallback(async () => {
    const extractRows = (payload) => {
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.items)) return payload.items;
      if (Array.isArray(payload?.results)) return payload.results;
      return [];
    };

    const extractTotal = (payload) =>
      Number(
        payload?.total ??
          payload?.count ??
          payload?.pagination?.total ??
          payload?.meta?.total ??
          0,
      ) || 0;

    try {
      const searchKey = (debouncedSearchQuery || "").trim().toLowerCase();
      const mapSortToApi = (cfg) => {
        switch (cfg?.key) {
          case "loanAmount":
            return { sortBy: "approval_loanAmountDisbursed", sortDir: cfg?.direction || "desc" };
          case "emi":
            return { sortBy: "postfile_emiAmount", sortDir: cfg?.direction || "desc" };
          case "aging":
            return {
              sortBy: "createdAt",
              sortDir: cfg?.direction === "desc" ? "asc" : "desc",
            };
          case "customer":
            return { sortBy: "customerName", sortDir: cfg?.direction || "desc" };
          case "vehicle":
            return { sortBy: "vehicleModel", sortDir: cfg?.direction || "desc" };
          case "createdAt":
          default:
            return { sortBy: "latestBusiness", sortDir: cfg?.direction || "desc" };
        }
      };
      const apiSort = mapSortToApi(sortConfig);
      const cacheKey = `${searchKey}|${page}|${pageSize}|${apiSort.sortBy}|${apiSort.sortDir}`;
      const cached = pageCacheRef.current.get(cacheKey);
      if (cached) {
        setLoans(cached.rows);
        setServerTotal(cached.total);
      } else {
        setLoading(true);
      }

      const startedAt = performance.now();
      const apiStartAt = performance.now();
      const payload = await loansApi.getAll({
        view: "dashboard",
        page,
        limit: pageSize,
        search: debouncedSearchQuery?.trim() || "",
        sortBy: apiSort.sortBy,
        sortDir: apiSort.sortDir,
      });
      const apiMs = Math.round(performance.now() - apiStartAt);
      const rows = extractRows(payload);
      const normalizeStartAt = performance.now();
      const normalizedRows = rows.map(normalizeLoan);
      const normalizeMs = Math.round(performance.now() - normalizeStartAt);
      const total = extractTotal(payload);

      pageCacheRef.current.set(cacheKey, {
        rows: normalizedRows,
        total,
        ts: Date.now(),
      });
      if (!searchKey && page === 1) {
        try {
          sessionStorage.setItem(
            PAGE1_CACHE_KEY,
            JSON.stringify({ rows: normalizedRows, total, ts: Date.now() }),
          );
        } catch (_) {}
      }

      setLoans(normalizedRows);
      setServerTotal(total);

      const payloadSizeBytes = new Blob([JSON.stringify(payload || {})]).size;
      const payloadKB = Number((payloadSizeBytes / 1024).toFixed(1));

      // Warm next page for instant navigation.
      const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
      const nextPage = page + 1;
      if (nextPage <= totalPages) {
        const nextKey = `${searchKey}|${nextPage}|${pageSize}`;
        if (!pageCacheRef.current.has(nextKey)) {
          loansApi
            .getAll({
              view: "dashboard",
              page: nextPage,
              limit: pageSize,
              search: debouncedSearchQuery?.trim() || "",
              sortBy: "latestBusiness",
              sortDir: "desc",
            })
            .then((nextPayload) => {
              const nextRows = extractRows(nextPayload).map(normalizeLoan);
              pageCacheRef.current.set(nextKey, {
                rows: nextRows,
                total: extractTotal(nextPayload),
                ts: Date.now(),
              });
            })
            .catch(() => {});
        }
      }

      requestAnimationFrame(() => {
        const clientMs = Math.round(performance.now() - startedAt);
        const paintMs = Math.max(0, clientMs - apiMs - normalizeMs);
        const serverMs = Number(payload?.meta?.queryMs) || null;
        console.info("[LoansDashboard] loans fetch", {
          clientMs,
          apiMs,
          normalizeMs,
          paintMs,
          payloadKB,
          serverMs,
          page,
          pageSize,
          rows: rows.length,
          total,
          search: debouncedSearchQuery?.trim() || "",
          sortBy: payload?.meta?.sortBy || apiSort.sortBy,
          fromCache: Boolean(cached),
        });
      });
    } catch (e) {
      console.error("Fetch Loans Error:", e);
      setLoans([]);
      setServerTotal(0);
    } finally {
      setLoading(false);
    }
  }, [normalizeLoan, page, pageSize, debouncedSearchQuery, sortConfig]);

  const fetchDashboardStats = useCallback(async ({ force = false } = {}) => {
    try {
      if (!force) {
        try {
          const raw = sessionStorage.getItem(STATS_CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            const age = Date.now() - Number(parsed?.ts || 0);
            if (age >= 0 && age < STATS_TTL_MS && parsed?.data) {
              setStatsData(parsed.data);
              console.info("[LoansDashboard] stats fetch", {
                clientMs: 0,
                serverMs: null,
                total: Number(parsed?.data?.total) || 0,
                rowsScanned: 0,
                fromCache: true,
              });
              return;
            }
          }
        } catch (_) {}
      }

      const startedAt = performance.now();
      const payload = await loansApi.getDashboardStats();
      const stats = {
        total: Number(payload?.total) || 0,
        pending: Number(payload?.pending) || 0,
        approvedToday: Number(payload?.approvedToday) || 0,
        disbursed: Number(payload?.disbursed) || 0,
        totalBookValue: Number(payload?.totalBookValue) || 0,
        emiCapturedCount: Number(payload?.emiCapturedCount) || 0,
        regNoCapturedCount: Number(payload?.regNoCapturedCount) || 0,
      };
      setStatsData(stats);
      try {
        sessionStorage.setItem(
          STATS_CACHE_KEY,
          JSON.stringify({ data: stats, ts: Date.now() }),
        );
      } catch (_) {}
      const clientMs = Math.round(performance.now() - startedAt);
      console.info("[LoansDashboard] stats fetch", {
        clientMs,
        serverMs: Number(payload?.meta?.queryMs) || null,
        total: Number(payload?.total) || 0,
        rowsScanned: Number(payload?.meta?.rowsScanned) || 0,
        fromCache: false,
      });
    } catch (e) {
      console.error("Fetch Dashboard Stats Error:", e);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PAGE1_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.rows)) return;
      const hydratedRows = parsed.rows.map(normalizeLoan);
      pageCacheRef.current.set(`|1|${pageSize}`, {
        rows: hydratedRows,
        total: Number(parsed?.total) || hydratedRows.length,
        ts: Number(parsed?.ts) || Date.now(),
      });
      if (page === 1 && !filters.searchQuery?.trim()) {
        setLoans(hydratedRows);
        setServerTotal(Number(parsed?.total) || hydratedRows.length);
        console.info("[LoansDashboard] hydrated page cache", {
          rows: hydratedRows.length,
          total: Number(parsed?.total) || hydratedRows.length,
        });
      }
    } catch (_) {}
  }, [normalizeLoan, page, pageSize, filters.searchQuery]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchQuery(filters.searchQuery || "");
    }, 600);
    return () => clearTimeout(handle);
  }, [filters.searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [sortConfig.key, sortConfig.direction]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STATS_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed?.data) return;
      setStatsData(parsed.data);
      console.info("[LoansDashboard] stats hydrated cache", {
        total: Number(parsed?.data?.total) || 0,
      });
    } catch (_) {}
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) fetchDashboardStats();
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchDashboardStats]);

  const refreshDashboard = useCallback(() => {
    pageCacheRef.current.clear();
    try {
      sessionStorage.removeItem(PAGE1_CACHE_KEY);
      sessionStorage.removeItem(STATS_CACHE_KEY);
    } catch (_) {}
    fetchLoans();
    fetchDashboardStats({ force: true });
  }, [fetchLoans, fetchDashboardStats]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchLoans();
        fetchDashboardStats();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchLoans, fetchDashboardStats]);

  const handleFilterChange = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setPage(1);
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
    setSelectedLoans(checked ? filteredLoans.map((l) => l.loanId) : []);
  };

  const handleSelectionChange = (keys) => {
    setSelectedLoans(keys);
  };

  const handleLoanClick = (loan, mode) => {
    if (mode === "edit") {
      navigate(`/loans/edit/${loan._id || loan.loanId}`);
    } else if (mode === "view") {
      setInitialViewTab(null);
      setViewLoan(loan);
      setIsViewModalOpen(true);
    } else if (mode === "approval") {
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
        refreshDashboard();
        break;
      case "delete":
        if (selectedLoans.length === 0) return;
        if (
          !window.confirm(
            `Are you sure you want to delete ${selectedLoans.length} cases?`,
          )
        )
          return;
        try {
          message.loading({ content: "Deleting...", key: "bulk_delete" });
          await Promise.all(selectedLoans.map((id) => loansApi.delete(id)));
          message.success({ content: "Deleted successfully", key: "bulk_delete" });
          setSelectedLoans([]);
          refreshDashboard();
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
      refreshDashboard();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleShowOtherBanks = (loan) => {
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
    navigate(`/loans/edit/${loan?._id || loan?.loanId}`);
  };

  const handleShareLoan = (loan) => {
    const loanId = loan?._id || loan?.loanId;
    if (!loanId) {
      message.warning("Loan ID not found.");
      return;
    }
    const base = window.location.pathname.split("/loans")[0] || "";
    const url = `${window.location.origin}${base}/loans/edit/${loanId}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          message.success("Loan link copied to clipboard.");
        })
        .catch(() => {
          message.error("Could not copy link.");
        });
    } else {
      message.info(`Copy link: ${url}`);
    }
  };

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
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
          loan.vehicleRegNo,
          loan.registrationNumber,
          loan.vehicleNumber,
          loan.rc_redg_no,
          loan.typeOfLoan,
          loan.loanType,
          loan.postfile_regd_city,
          loan.bankName,
          loan.approval_bankName,
          loan.postfile_emiAmount,
          ...(loan.approval_banksData || []).map((b) => b.bankName),
          ...(loan.approval_banksData || []).map((b) => b.emiAmount),
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
          (field) => field != null && String(field).toLowerCase().includes(q),
        );
        if (!matchFound) return false;
      }

      const loanTypeValue = (loan.loanType || loan.typeOfLoan || "").trim();
      if (filters.loanTypes?.length) {
        const matches = filters.loanTypes.some(
          (ft) =>
            (loanTypeValue && ft.toLowerCase() === loanTypeValue.toLowerCase()) ||
            ft === loanTypeValue,
        );
        if (!matches) return false;
      }

      const stage = (loan.currentStage || "profile").toLowerCase();
      if (filters.stages?.length) {
        const matches = filters.stages.some((s) => s.toLowerCase() === stage);
        if (!matches) return false;
      }

      const loanStatus = (loan.status || loan.approval_status || "New").trim();
      if (filters.statuses?.length) {
        const matches = filters.statuses.some(
          (s) => s && loanStatus && s.toLowerCase() === loanStatus.toLowerCase(),
        );
        if (!matches) return false;
      }

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

      const amountLakhs =
        (loan.loanAmount ||
          loan.approval_loanAmountApproved ||
          loan.approval_loanAmountDisbursed ||
          0) / 100000;
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

      if (filters.approvedToday) {
        const today = new Date().toDateString();
        const updated = loan.updatedAt
          ? new Date(loan.updatedAt).toDateString()
          : "";
        const approved = loan.approval_approvalDate
          ? new Date(loan.approval_approvalDate).toDateString()
          : "";
        if (updated !== today && approved !== today) return false;
      }

      return true;
    });
  }, [loans, filters]);

  useEffect(() => {
    setPage(1);
  }, [filters.searchQuery, filters.loanTypes, filters.stages, filters.statuses, filters.agingBuckets, filters.amountRanges, filters.approvedToday]);

  const hasClientOnlyFilters =
    filters.loanTypes.length > 0 ||
    filters.stages.length > 0 ||
    filters.statuses.length > 0 ||
    filters.agingBuckets.length > 0 ||
    filters.amountRanges.length > 0 ||
    filters.approvedToday;
  const totalCountForGrid = hasClientOnlyFilters
    ? filteredLoans.length
    : (Number(serverTotal) || filteredLoans.length);

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-sky-50 via-white to-white p-4 md:p-6 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="flex h-full min-h-0 flex-col gap-5">
        <section className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-400">Loans Module</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl dark:text-slate-100">
                Dashboard Command Center
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Rich overview of pipeline, approvals, disbursals, EMI health, and registration readiness.
              </p>
              <div className="mt-2 inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                Live Stats Auto Refresh Enabled
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 dark:border-sky-900/40 dark:bg-sky-950/30">
                <p className="text-slate-500 dark:text-slate-400">Cases in view</p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {totalCountForGrid}
                </p>
              </div>
              <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 px-3 py-2 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/30">
                <p className="text-slate-500 dark:text-slate-400">EMI captured</p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {statsData.emiCapturedCount}/{statsData.total || 0}
                </p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 dark:border-rose-900/40 dark:bg-rose-950/30">
                <p className="text-slate-500 dark:text-slate-400">Reg no captured</p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {statsData.regNoCapturedCount}/{statsData.total || 0}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            id="total"
            title="Total Cases"
            subtitle="All active and archived flow"
            value={statsData.total}
            iconName="FileStack"
            loading={loading}
            isActive={
              !filters.approvedToday &&
              filters.statuses.length === 0 &&
              filters.stages.length === 0
            }
            onClick={() => handleStatClick("total")}
          />
          <MetricCard
            id="pending"
            title="Pending Approval"
            subtitle="Needs action in approval stage"
            value={statsData.pending}
            iconName="Clock3"
            loading={loading}
            isActive={
              filters.stages.includes("approval") &&
              (filters.statuses.includes("Pending") ||
                filters.statuses.includes("In Progress"))
            }
            onClick={() => handleStatClick("pending")}
          />
          <MetricCard
            id="today"
            title="Approved Today"
            subtitle="Updated on current date"
            value={statsData.approvedToday}
            iconName="BadgeCheck"
            loading={loading}
            isActive={filters.approvedToday}
            onClick={() => handleStatClick("today")}
          />
          <MetricCard
            id="disbursed"
            title="Disbursed"
            subtitle="Ready for delivery operations"
            value={statsData.disbursed}
            iconName="WalletCards"
            loading={loading}
            isActive={filters.statuses.includes("Disbursed")}
            onClick={() => handleStatClick("disbursed")}
          />
          <MetricCard
            id="ticket"
            title="Book Value"
            subtitle="Total disbursal/approval base"
            value={formatCrores(statsData.totalBookValue || 0)}
            iconName="IndianRupee"
            loading={loading}
            onClick={() => {}}
          />
        </section>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex-shrink-0 border-b border-slate-200/70 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-900/50">
            <HorizontalFilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              onRefresh={refreshDashboard}
              onNewCase={() => handleQuickAction("new-case")}
            />
          </div>

          <div className="flex-1 overflow-hidden">
            <LoansDataGrid
              loans={filteredLoans}
              selectedLoans={selectedLoans}
              totalCount={totalCountForGrid}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setPage}
              sortConfig={sortConfig}
              onSortChange={setSortConfig}
              onSelectLoan={handleSelectLoan}
              onSelectAll={handleSelectAll}
              onSelectionChange={handleSelectionChange}
              onLoanClick={handleLoanClick}
              onBulkAction={handleBulkAction}
              onDeleteLoan={handleDeleteLoan}
              onUpdateStatus={handleUpdateStatus}
              onUploadDocuments={handleUploadDocuments}
              onShareLoan={handleShareLoan}
              onRefreshLoans={refreshDashboard}
              onAddLoan={() => handleQuickAction("new-case")}
              onShowOtherBanks={handleShowOtherBanks}
              onNotesClick={handleNotesClick}
              userRole={userRole}
              loading={loading}
            />
          </div>
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
            navigate(`/loans/edit/${viewLoan._id || viewLoan.loanId}`);
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
        onRefresh={refreshDashboard}
      />
    </div>
  );
};

export default LoanDashboard;
