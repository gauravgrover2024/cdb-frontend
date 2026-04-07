import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import HorizontalFilterBar from "./dashboard/HorizontalFilterBar";
import LoansDataGrid from "./dashboard/LoansDataGrid";
import LoanViewModal from "./dashboard/LoanViewModal";
import DashboardNotesModal from "./dashboard/DashboardNotesModal";
import Icon from "../../../components/AppIcon";
import { loansApi } from "../../../api/loans";
import { startNewLoanCase } from "../utils/startNewLoanCase";

// Showroom hydration fires extra per-loan API calls and can slow dashboard loads.
// Keep disabled by default; backend list payload should provide these fields directly.
const SHOWROOM_HYDRATION_ENABLED = false;
const CPV_COMPLETION_THRESHOLD = 80;
const CPV_SECTION_MIN_FIELDS = 3;
const EXPANDED_FETCH_LIMIT = 5000;
const AUTO_LOAN_NUMBER_REGEX = /^LN-\d{4}-\d+$/i;
const PREFILE_CO_APPLICANT_FIELD_GROUPS = [
  ["co_customerName", "co_name"],
  ["co_primaryMobile", "co_mobile"],
  ["co_dob"],
  ["co_pan"],
  ["co_aadhaar", "co_aadhar"],
  ["co_address"],
  ["co_pincode"],
  ["co_city"],
  ["co_occupation", "co_occupationType"],
];
const PREFILE_GUARANTOR_FIELD_GROUPS = [
  ["gu_customerName", "gu_name"],
  ["gu_primaryMobile", "gu_mobile"],
  ["gu_dob"],
  ["gu_pan"],
  ["gu_aadhaar", "gu_aadhar"],
  ["gu_address"],
  ["gu_pincode"],
  ["gu_city"],
  ["gu_occupation", "gu_occupationType"],
];

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
  pendingDisbursal: {
    card: "from-emerald-500 to-green-600",
    iconBg: "bg-white/20",
    accent: "text-emerald-100",
  },
  disbursed: {
    card: "from-violet-500 to-fuchsia-600",
    iconBg: "bg-white/20",
    accent: "text-violet-100",
  },
  cashCars: {
    card: "from-cyan-500 to-blue-600",
    iconBg: "bg-white/20",
    accent: "text-cyan-100",
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

const MetricCard = ({
  id,
  title,
  subtitle,
  value,
  iconName,
  onClick,
  isActive,
  loading,
}) => {
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
          <p
            className={`text-[11px] uppercase tracking-[0.18em] font-semibold ${theme.accent}`}
          >
            {title}
          </p>
          <p className="mt-1 text-2xl md:text-3xl font-black text-white tabular-nums">
            {loading ? "—" : value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-white/80">{subtitle}</p>}
        </div>

        <div
          className={`mt-1 h-10 w-10 rounded-xl ${theme.iconBg} text-white flex items-center justify-center backdrop-blur-sm`}
        >
          <Icon name={iconName} size={18} />
        </div>
      </div>

      {isActive && (
        <div className="absolute right-2 top-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white"></div>
      )}
    </button>
  );
};

const DashboardSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {/* Stats skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800"
        />
      ))}
    </div>
    {/* Table skeleton */}
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="h-12 bg-slate-100 dark:bg-slate-800" />
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="h-14 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 px-4"
        >
          <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 ml-4" />
          <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700 ml-auto" />
        </div>
      ))}
    </div>
  </div>
);

const LoanDashboard = () => {
  const navigate = useNavigate();
  const PAGE1_CACHE_KEY = "loans_dashboard_page1_cache_v4";
  const STATS_CACHE_KEY = "loans_dashboard_stats_cache_v3";
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
    amountRanges: [],
    pendingApprovalOnly: false,
    pendingDisbursal: false,
    disbursedOnly: false,
    cashCarsOnly: false,
    cpvIncomplete: false,
    regNoPending: false,
    loanNoPending: false,
    rcPending: false,
    invoicePending: false,
    searchQuery: "",
  });

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [sortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [serverTotal, setServerTotal] = useState(0);
  const [statsData, setStatsData] = useState({
    total: 0,
    pending: 0,
    pendingDisbursal: 0,
    disbursed: 0,
    cashCars: 0,
    totalBookValue: 0,
    emiCapturedCount: 0,
    regNoCapturedCount: 0,
  });
  const pageSize = 30;
  const pageCacheRef = useRef(new Map());
  const showroomHydrationCacheRef = useRef(new Map());
  const showroomHydrationInFlightRef = useRef(new Set());
  const cpvEvaluationCacheRef = useRef(new Map());
  // cpvIncomplete is the ONLY filter that cannot be evaluated on the backend
  // (it inspects many optional fields client-side). All other filters are fully
  // handled server-side, so they use normal per-page fetches instead of the
  // expensive EXPANDED_FETCH_LIMIT=5000 scan.
  const hasWideClientFilters = filters.cpvIncomplete;

  const userRole = "admin";

  const calculateAging = (createdAt) => {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const parseAmountValue = useCallback((value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }, []);

  const normalizeStatusText = useCallback((value) => {
    return String(value || "")
      .trim()
      .toLowerCase();
  }, []);

  const isLoanDisbursed = useCallback(
    (loan) => {
      const statusText = normalizeStatusText(
        loan?.status || loan?.approval_status || "",
      );
      const disburseStatusText = normalizeStatusText(
        loan?.disburse_status ||
          loan?.disbursementStatus ||
          loan?.disbursement_status ||
          "",
      );
      const hasDisburseAmount =
        parseAmountValue(loan?.disburse_amount ?? loan?.disburseAmount ?? 0) >
        0;
      const hasDisburseDate = Boolean(
        loan?.disbursement_date ||
        loan?.approval_disbursedDate ||
        loan?.disburse_date ||
        loan?.disbursedDate ||
        loan?.disbursementDate,
      );
      return (
        statusText.includes("disburs") ||
        disburseStatusText.includes("disburs") ||
        hasDisburseAmount ||
        hasDisburseDate
      );
    },
    [normalizeStatusText, parseAmountValue],
  );

  const isCashCaseLoan = useCallback(
    (loan) => {
      if (loan?.isCashCase === true) return true;
      const loanType = normalizeStatusText(
        loan?.typeOfLoan || loan?.loanType || loan?.caseType || loan?.loan_type,
      );
      const financed = normalizeStatusText(loan?.isFinanced);
      const bankText = normalizeStatusText(
        loan?.approval_bankName || loan?.postfile_bankName || loan?.bankName,
      );

      if (bankText.includes("cash sale bank")) return true;
      if (loanType.includes("cash-in") || loanType.includes("cash in"))
        return false;
      if (
        (financed === "no" || financed === "false") &&
        !loanType.includes("refinance")
      ) {
        return true;
      }
      if (!loanType) return false;
      return (
        loanType === "cash" ||
        loanType.includes("cash car") ||
        loanType.includes("cash sale")
      );
    },
    [normalizeStatusText],
  );

  const isLoanPendingDisbursal = useCallback(
    (loan) => {
      const statusText = normalizeStatusText(
        loan?.status || loan?.approval_status || "",
      );
      const approvedByStatus = statusText.includes("approv");
      const approvedByAmount =
        parseAmountValue(loan?.approval_loanAmountApproved) > 0;
      const approvedByDate = Boolean(loan?.approval_approvalDate);
      const approved = approvedByStatus || approvedByAmount || approvedByDate;
      return approved && !isLoanDisbursed(loan) && !isCashCaseLoan(loan);
    },
    [normalizeStatusText, parseAmountValue, isLoanDisbursed, isCashCaseLoan],
  );

  const isLoanPendingApproval = useCallback(
    (loan) => {
      const stage = normalizeStatusText(loan?.currentStage || "profile");
      if (stage !== "approval") return false;
      if (isLoanDisbursed(loan)) return false;
      const statusText = normalizeStatusText(
        loan?.status || loan?.approval_status || "",
      );
      const approvedByStatus = statusText.includes("approv");
      const approvedByAmount =
        parseAmountValue(loan?.approval_loanAmountApproved) > 0;
      const approvedByDate = Boolean(loan?.approval_approvalDate);
      return !(approvedByStatus || approvedByAmount || approvedByDate);
    },
    [normalizeStatusText, parseAmountValue, isLoanDisbursed],
  );

  const isLoanDisbursedNonCash = useCallback(
    (loan) => isLoanDisbursed(loan) && !isCashCaseLoan(loan),
    [isLoanDisbursed, isCashCaseLoan],
  );

  const hasMeaningfulText = useCallback((value) => {
    const t = String(value ?? "")
      .trim()
      .toLowerCase();
    return (
      !!t &&
      !["n/a", "na", "not set", "unknown", "-", "null", "undefined"].includes(t)
    );
  }, []);

  const firstMeaningfulText = useCallback(
    (...values) => values.find((v) => hasMeaningfulText(v)) || "",
    [hasMeaningfulText],
  );

  const getValueByPath = useCallback(
    (obj, path) =>
      String(path || "")
        .split(".")
        .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj),
    [],
  );

  const isTruthyYes = useCallback((value) => {
    if (value === true) return true;
    const text = String(value ?? "")
      .trim()
      .toLowerCase();
    return text === "yes" || text === "true" || text === "1";
  }, []);

  const hasPrefileValue = useCallback(
    (value) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return hasMeaningfulText(value);
      if (typeof value === "number") return Number.isFinite(value);
      if (typeof value === "boolean") return true;
      if (Array.isArray(value))
        return value.some((item) => hasPrefileValue(item));
      if (value instanceof Date) return !Number.isNaN(value.getTime());
      if (typeof value === "object") {
        const nestedDate =
          value?.$date ?? value?.date ?? value?.value ?? value?._seconds;
        if (nestedDate != null && hasPrefileValue(nestedDate)) return true;
        return Object.values(value).some((item) => hasPrefileValue(item));
      }
      return false;
    },
    [hasMeaningfulText],
  );

  const normalizeLoanTypeForFilter = useCallback(
    (loan) => {
      if (hasMeaningfulText(loan?._metaLoanType)) {
        return String(loan._metaLoanType).trim();
      }
      const raw = normalizeStatusText(
        loan?.typeOfLoan || loan?.loanType || loan?.caseType || loan?.loan_type,
      );
      if (!raw) return "";
      if (raw.includes("cash-in") || raw.includes("cash in"))
        return "Car Cash-in";
      if (raw.includes("refinance")) return "Refinance";
      if (raw.includes("used")) return "Used Car";
      if (raw.includes("new")) return "New Car";
      return String(loan?.typeOfLoan || loan?.loanType || "").trim();
    },
    [hasMeaningfulText, normalizeStatusText],
  );

  const toDateOrNull = useCallback((value) => {
    if (value == null || value === "") return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return null;
      const ts = value > 1e12 ? value : value * 1000;
      const d = new Date(ts);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === "object") {
      if (typeof value?.toDate === "function")
        return toDateOrNull(value.toDate());
      if (typeof value?.valueOf === "function") {
        const maybe = value.valueOf();
        if (maybe !== value) return toDateOrNull(maybe);
      }
      const nested = value?.$date ?? value?.date ?? value?.value ?? null;
      return nested == null ? null : toDateOrNull(nested);
    }
    const parsed = Date.parse(String(value).trim());
    return Number.isFinite(parsed) ? new Date(parsed) : null;
  }, []);

  const getActualLoanNumber = useCallback(
    (loan) => {
      if (hasMeaningfulText(loan?._metaLoanNo)) {
        return String(loan._metaLoanNo).trim();
      }
      const candidates = [
        loan?.loan_number,
        loan?.loanNumber,
        loan?.loan_no,
        loan?.postfile_loanNumber,
      ];
      const found = candidates.find((value) => {
        if (!hasMeaningfulText(value)) return false;
        return !AUTO_LOAN_NUMBER_REGEX.test(String(value).trim());
      });
      return found ? String(found).trim() : "";
    },
    [hasMeaningfulText],
  );

  const getDisbursalDate = useCallback(
    (loan) => {
      if (
        Number.isFinite(Number(loan?._metaDisbursalTs)) &&
        Number(loan?._metaDisbursalTs) > 0
      ) {
        return new Date(Number(loan._metaDisbursalTs));
      }
      return toDateOrNull(
        loan?.disbursement_date ||
          loan?.approval_disbursedDate ||
          loan?.disbursementDate ||
          loan?.disbursedDate,
      );
    },
    [toDateOrNull],
  );

  const getDeliveryDate = useCallback(
    (loan) => {
      if (
        Number.isFinite(Number(loan?._metaDeliveryTs)) &&
        Number(loan?._metaDeliveryTs) > 0
      ) {
        return new Date(Number(loan._metaDeliveryTs));
      }
      return toDateOrNull(
        loan?.delivery_date ||
          loan?.deliveryDate ||
          loan?.delivery_done_at ||
          loan?.vehicleDeliveryDate,
      );
    },
    [toDateOrNull],
  );

  const getRcReceivedDate = useCallback(
    (loan) => {
      if (
        Number.isFinite(Number(loan?._metaRcReceivedTs)) &&
        Number(loan?._metaRcReceivedTs) > 0
      ) {
        return new Date(Number(loan._metaRcReceivedTs));
      }
      return toDateOrNull(loan?.rc_received_date || loan?.rc_received_at);
    },
    [toDateOrNull],
  );

  const getInvoiceReceivedDate = useCallback(
    (loan) => {
      if (
        Number.isFinite(Number(loan?._metaInvoiceReceivedTs)) &&
        Number(loan?._metaInvoiceReceivedTs) > 0
      ) {
        return new Date(Number(loan._metaInvoiceReceivedTs));
      }
      return toDateOrNull(
        loan?.invoice_received_date ||
          loan?.invoice_done_at ||
          loan?.invoice_date,
      );
    },
    [toDateOrNull],
  );

  const isRegistrationNumberPending = useCallback(
    (loan) =>
      !hasMeaningfulText(
        firstMeaningfulText(
          loan?.rc_redg_no,
          loan?.vehicleRegNo,
          loan?.registrationNumber,
          loan?.vehicleNumber,
          loan?.regNo,
          "",
        ),
      ),
    [firstMeaningfulText, hasMeaningfulText],
  );

  const isLoanNumberPending = useCallback(
    (loan) => !hasMeaningfulText(getActualLoanNumber(loan)),
    [getActualLoanNumber, hasMeaningfulText],
  );

  const isRcPending = useCallback(
    (loan) => {
      const stageText = normalizeStatusText(loan?.currentStage || "");
      const gateOpen = Boolean(getDisbursalDate(loan) || getDeliveryDate(loan));
      if (
        !gateOpen &&
        !stageText.includes("rc") &&
        !stageText.includes("delivery")
      ) {
        return false;
      }
      return !Boolean(getRcReceivedDate(loan));
    },
    [getDisbursalDate, getDeliveryDate, getRcReceivedDate, normalizeStatusText],
  );

  const isInvoicePending = useCallback(
    (loan) => {
      if (normalizeLoanTypeForFilter(loan) !== "New Car") return false;
      const stageText = normalizeStatusText(loan?.currentStage || "");
      const gateOpen = Boolean(getDisbursalDate(loan) || getDeliveryDate(loan));
      if (
        !gateOpen &&
        !stageText.includes("invoice") &&
        !stageText.includes("delivery") &&
        !stageText.includes("rc")
      ) {
        return false;
      }
      return !Boolean(getInvoiceReceivedDate(loan));
    },
    [
      getDeliveryDate,
      getDisbursalDate,
      getInvoiceReceivedDate,
      normalizeLoanTypeForFilter,
      normalizeStatusText,
    ],
  );

  const isCpvIncomplete = useCallback(
    (loan) => {
      if (isCashCaseLoan(loan)) return false;
      const cacheId = String(
        loan?._id || loan?.loanId || loan?.loan_number || "",
      ).trim();
      const cacheStamp = String(
        loan?.updatedAt || loan?.approval_approvalDate || "",
      );
      const cacheKey = `${cacheId}|${cacheStamp}`;
      if (cacheId && cpvEvaluationCacheRef.current.has(cacheKey)) {
        return cpvEvaluationCacheRef.current.get(cacheKey);
      }
      const loanType = normalizeLoanTypeForFilter(loan);
      const isNewCar = loanType === "New Car";
      const isUsedOrCashinOrRefinance =
        loanType === "Used Car" ||
        loanType === "Car Cash-in" ||
        loanType === "Refinance";
      const sourceLower = normalizeStatusText(
        firstMeaningfulText(loan?.recordSource, loan?.source, ""),
      );
      const isIndirectSource = sourceLower.includes("indirect");

      const sections = [
        {
          groups: [
            ["receivingDate"],
            ["recordSource", "source"],
            ["sourceName", "dealerName"],
            ["dealtBy"],
            ["docsPreparedBy"],
          ],
        },
        {
          groups: [
            ["customerName", "applicant_name", "applicantName"],
            ["primaryMobile", "mobile", "phone", "phoneNumber"],
            ["dob"],
            ["gender"],
            ["maritalStatus"],
          ],
        },
        {
          groups: [
            ["residenceAddress", "currentAddress", "address"],
            ["city"],
            ["pincode"],
            ["houseType"],
          ],
        },
        {
          groups: [
            ["occupationType", "occupation", "professionalType", "companyType"],
            ["companyName"],
            ["designation"],
            ["experienceCurrent", "currentExperience", "totalExperience"],
            ["totalIncomeITR", "annualIncome", "monthlyIncome"],
          ],
        },
        {
          groups: [
            ["bankName", "approval_bankName"],
            ["accountType"],
            ["accountNumber"],
            ["ifsc", "ifscCode"],
            ["branch"],
          ],
        },
        {
          groups: [
            ["typeOfLoan", "loanType"],
            ["usage"],
            ["vehicleMake"],
            ["vehicleModel"],
            ["vehicleVariant"],
            ["vehicleFuelType"],
          ],
        },
      ];

      if (isIndirectSource) {
        sections.push({
          groups: [["dealerMobile"], ["dealerAddress"], ["payoutApplicable"]],
        });
      }

      if (isNewCar) {
        sections.push({
          groups: [
            ["showroomDealerName", "dealer_name_manual_prefile", "dealerName"],
            ["showroomDealerContactPerson", "dealerContactPerson"],
            ["showroomDealerContactNumber", "dealerContactNumber"],
            ["showroomDealerAddress", "dealerAddress"],
          ],
        });
      }

      if (isNewCar || isUsedOrCashinOrRefinance) {
        const registrationGroups = [["registrationCity", "postfile_regd_city"]];
        if (isNewCar) {
          registrationGroups.unshift(["registerSameAsAadhaar"]);
          const isSameAsAadhaarNo =
            normalizeStatusText(loan?.registerSameAsAadhaar) === "no";
          if (isSameAsAadhaarNo) {
            registrationGroups.push(["registerSameAsPermanent"]);
            if (normalizeStatusText(loan?.registerSameAsPermanent) === "no") {
              registrationGroups.push(
                ["registrationAddress"],
                ["registrationPincode"],
              );
            }
          }
        }
        sections.push({
          groups: registrationGroups,
          minRequired: Math.min(2, registrationGroups.length),
        });
      }

      if (loanType === "Car Cash-in" || loanType === "Refinance") {
        sections.push({ groups: [["purposeOfLoan"]], minRequired: 1 });
      }

      if (isTruthyYes(loan?.hasCoApplicant)) {
        sections.push({ groups: PREFILE_CO_APPLICANT_FIELD_GROUPS });
      }
      if (isTruthyYes(loan?.hasGuarantor)) {
        sections.push({ groups: PREFILE_GUARANTOR_FIELD_GROUPS });
      }

      const completedSections = sections.reduce((count, section) => {
        const totalGroups = section.groups.length;
        const required = Math.min(
          section.minRequired ?? CPV_SECTION_MIN_FIELDS,
          totalGroups,
        );
        const filled = section.groups.reduce((groupCount, alternatives) => {
          const hasGroupValue = alternatives.some((path) =>
            hasPrefileValue(getValueByPath(loan, path)),
          );
          return hasGroupValue ? groupCount + 1 : groupCount;
        }, 0);
        return filled >= required ? count + 1 : count;
      }, 0);

      const totalSections = sections.length;
      const percentage = totalSections
        ? Math.round((completedSections / totalSections) * 100)
        : 0;
      const result = percentage < CPV_COMPLETION_THRESHOLD;
      if (cacheId) {
        cpvEvaluationCacheRef.current.set(cacheKey, result);
      }
      return result;
    },
    [
      firstMeaningfulText,
      getValueByPath,
      hasPrefileValue,
      isCashCaseLoan,
      isTruthyYes,
      normalizeLoanTypeForFilter,
      normalizeStatusText,
    ],
  );

  const normalizeSearchToken = useCallback(
    (value) =>
      String(value ?? "")
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[-_/().]/g, ""),
    [],
  );

  const matchesDashboardSearch = useCallback(
    (loan, query) => {
      const rawQuery = String(query ?? "")
        .trim()
        .toLowerCase();
      if (!rawQuery) return true;
      if (rawQuery.length < 3) return true;
      const normalizedQuery = normalizeSearchToken(rawQuery);

      const fields = [
        loan?.customerName,
        loan?.primaryMobile,
        loan?.mobile,
        loan?.phone,
        loan?.phoneNumber,
        loan?.vehicleRegNo,
        loan?.registrationNumber,
        loan?.rc_redg_no,
        loan?.vehicleNumber,
        loan?.loanId,
        loan?.loan_number,
        loan?._id,
      ];

      return fields.some((field) => {
        if (field == null) return false;
        const raw = String(field).toLowerCase();
        if (raw.includes(rawQuery)) return true;
        return normalizeSearchToken(field).includes(normalizedQuery);
      });
    },
    [normalizeSearchToken],
  );

  const extractShowroomFields = useCallback(
    (loan) => {
      const showroomDealerName = firstMeaningfulText(
        loan?.showroomDealerName,
        loan?.delivery_dealerName,
        loan?.dealerName,
        loan?.paymentFavouring,
        loan?.loanPaymentFavouring,
        loan?.loan_payment_favouring,
        loan?.payment_favouring,
        loan?.payment_favouring_at_despatch,
        loan?.payment_favouring_at_booking,
        loan?.paymentFavouringAtDespatch,
        loan?.PAYMENT_FAVOURING_AT_DESPATCH,
        loan?.PAYMENT_FAVOURING_AT_BOOKING,
        loan?.postFile?.showroomDealerName,
        loan?.postfile?.showroomDealerName,
        loan?.postFile?.[0]?.showroomDealerName,
        loan?.postfile?.[0]?.showroomDealerName,
        loan?.postFile?.[0]?.showroomName,
        loan?.postfile?.[0]?.showroomName,
        loan?.postFile?.showroomName,
        loan?.postfile?.showroomName,
        loan?.postFile?.paymentFavouring,
        loan?.postfile?.paymentFavouring,
        loan?.postFile?.[0]?.paymentFavouring,
        loan?.postfile?.[0]?.paymentFavouring,
        loan?.postFile?.[0]?.PAYMENT_FAVOURING_AT_DESPATCH,
        loan?.postFile?.[0]?.PAYMENT_FAVOURING_AT_BOOKING,
        loan?.postfile?.[0]?.PAYMENT_FAVOURING_AT_DESPATCH,
        loan?.postfile?.[0]?.PAYMENT_FAVOURING_AT_BOOKING,
        loan?.postFile?.payment_favouring_at_despatch,
        loan?.postFile?.payment_favouring_at_booking,
        loan?.postfile?.payment_favouring_at_despatch,
        loan?.postfile?.payment_favouring_at_booking,
        loan?.postFileVehicleVerification?.showroomDealerName,
        loan?.postfileVehicleVerification?.showroomDealerName,
        loan?.postfile_vehicle_verification?.showroomDealerName,
        loan?.post_file_vehicle_verification?.showroomDealerName,
        loan?.postFileVehicleVerification?.PAYMENT_FAVOURING_AT_DESPATCH,
        loan?.postfileVehicleVerification?.PAYMENT_FAVOURING_AT_DESPATCH,
        loan?.postfileVehicleVerification?.PAYMENT_FAVOURING_AT_BOOKING,
        loan?.postfile_vehicle_verification?.PAYMENT_FAVOURING_AT_DESPATCH,
        loan?.postfile_vehicle_verification?.PAYMENT_FAVOURING_AT_BOOKING,
        loan?.post_file_vehicle_verification?.PAYMENT_FAVOURING_AT_DESPATCH,
        loan?.post_file_vehicle_verification?.PAYMENT_FAVOURING_AT_BOOKING,
        loan?.vehicleVerification?.showroomDealerName,
        loan?.vehicle_verification?.showroomDealerName,
        loan?.postFileVehicle?.showroomDealerName,
        loan?.postFileVehicle?.[0]?.showroomDealerName,
        loan?.postfile_showroomDealerName,
        loan?.showroom_dealer_name,
        loan?.postfile_showroom_dealer_name,
        loan?.postfile_showroom_dealerName,
        loan?.showroomName,
        loan?.showroom,
        loan?.showroom_name,
        loan?.SHOWROOM_NAME,
        loan?.SHOWROOM_DEALER_NAME,
        loan?.DEALERSHIP_NAME,
        loan?.DEALER_NAME,
        loan?.SHOWROOM,
      );
      const deliveryDealerName = firstMeaningfulText(
        loan?.delivery_dealerName,
        loan?.showroomDealerName,
        loan?.dealerName,
        loan?.postFile?.dealerName,
        loan?.postfile?.dealerName,
        loan?.postFileVehicle?.dealerName,
        loan?.postFileVehicle?.[0]?.dealerName,
        loan?.postfileVehicleVerification?.dealerName,
        loan?.postfile_vehicle_verification?.dealerName,
        loan?.vehicleVerification?.dealerName,
        loan?.vehicle_verification?.dealerName,
        loan?.postFile?.delivery_dealerName,
        loan?.postfile?.delivery_dealerName,
        loan?.postFile?.[0]?.delivery_dealerName,
        loan?.postfile?.[0]?.delivery_dealerName,
        loan?.postFileVehicleVerification?.delivery_dealerName,
        loan?.postfileVehicleVerification?.delivery_dealerName,
        loan?.postfile_vehicle_verification?.delivery_dealerName,
        loan?.post_file_vehicle_verification?.delivery_dealerName,
        loan?.vehicleVerification?.delivery_dealerName,
        loan?.vehicle_verification?.delivery_dealerName,
        loan?.postFileVehicle?.delivery_dealerName,
        loan?.postFileVehicle?.[0]?.delivery_dealerName,
        loan?.postfile_showroomDealerName,
        loan?.delivery_dealer_name,
        loan?.postfile_delivery_dealer_name,
        loan?.delivery_dealer,
        loan?.dealership_name,
        loan?.showroomName,
        loan?.showroom,
        loan?.showroom_name,
        loan?.showroom_dealer_name,
        loan?.dealerName,
        loan?.DEALERSHIP_NAME,
        loan?.DEALER_NAME,
        loan?.SHOWROOM,
        loan?.SHOWROOM_NAME,
      );
      return {
        showroomDealerName,
        delivery_dealerName: deliveryDealerName,
      };
    },
    [firstMeaningfulText],
  );

  const normalizeLoan = useCallback(
    (loan) => {
      const showroomFields = {
        showroomDealerName:
          loan?.showroomDealerName ||
          loan?.SHOWROOM_DEALER_NAME ||
          loan?.showroom_dealer_name ||
          "",
        delivery_dealerName:
          loan?.delivery_dealerName || loan?.delivery_dealer_name || "",
      };
      const normalizedLoanType = normalizeLoanTypeForFilter(loan);
      const actualLoanNumber = getActualLoanNumber(loan);
      const disbursalDateObj = toDateOrNull(
        loan?.disbursement_date ||
          loan?.approval_disbursedDate ||
          loan?.disbursementDate ||
          loan?.disbursedDate,
      );
      const deliveryDateObj = toDateOrNull(
        loan?.delivery_date ||
          loan?.deliveryDate ||
          loan?.delivery_done_at ||
          loan?.vehicleDeliveryDate,
      );
      const rcReceivedDateObj = toDateOrNull(
        loan?.rc_received_date || loan?.rc_received_at,
      );
      const invoiceReceivedDateObj = toDateOrNull(
        loan?.invoice_received_date ||
          loan?.invoice_done_at ||
          loan?.invoice_date,
      );
      const leadDateObj = toDateOrNull(
        loan?.leadDate ||
          loan?.lead_date ||
          loan?.leadDetails?.leadDate ||
          loan?.lead_details?.leadDate ||
          loan?.profile?.leadDate ||
          loan?.receivingDate ||
          loan?.createdAt ||
          null,
      );
      return {
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
        currentStage:
          loan?.currentStage || loan?.stage || loan?.workflowStage || "profile",
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
          loan?.customerName ||
          loan?.applicant_name ||
          loan?.applicantName ||
          loan?.leadName ||
          "Unknown",
        primaryMobile:
          loan?.primaryMobile ||
          loan?.mobile ||
          loan?.phone ||
          loan?.phoneNumber ||
          "N/A",
        email: loan?.email || loan?.emailId || "",
        city: loan?.city || loan?.permanentCity || "N/A",
        pincode: loan?.pincode || loan?.permanentPincode || "",
        residenceAddress:
          loan?.residenceAddress || loan?.currentAddress || loan?.address || "",
        permanentAddress: loan?.permanentAddress || "",

        source:
          loan?.source || loan?.sourcingChannel || loan?.recordSource || "N/A",
        sourceName: firstMeaningfulText(
          loan?.sourceName,
          loan?.source_name,
          showroomFields.showroomDealerName,
          showroomFields.delivery_dealerName,
          loan?.showroomName,
          loan?.showroom,
          loan?.showroom_name,
          "",
        ),
        dealerName:
          showroomFields.showroomDealerName ||
          showroomFields.delivery_dealerName ||
          loan?.dealerName ||
          loan?.showroomName ||
          loan?.showroom ||
          loan?.showroom_name ||
          loan?.branchName ||
          "",
        // Post-file / delivery showroom data used by dashboard card display
        showroomDealerName:
          loan?.showroomDealerName || showroomFields.showroomDealerName || "",
        delivery_dealerName: showroomFields.delivery_dealerName,
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
        postfile_regd_city:
          loan?.postfile_regd_city || loan?.registrationCity || "",
        rc_redg_no:
          loan?.rc_redg_no ||
          loan?.vehicleRegNo ||
          loan?.vehicleRegdNumber ||
          loan?.registrationNumber ||
          "",

        approval_loanAmountApproved:
          loan?.approval_loanAmountApproved || loan?.loanAmount || 0,
        approval_loanAmountDisbursed: loan?.approval_loanAmountDisbursed || 0,
        approval_bankName: loan?.approval_bankName || loan?.bankName || "N/A",
        approval_banksData: loan?.approval_banksData || [],
        approval_roi: loan?.approval_roi || loan?.roi || null,
        approval_tenureMonths:
          loan?.approval_tenureMonths ||
          loan?.loanTenureMonths ||
          loan?.tenure ||
          null,
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
          loan?.postfile_maturityDate ||
          loan?.postfile_maturity_date ||
          loan?.maturityDate ||
          null,
        postfile_firstEmiDate:
          loan?.postfile_firstEmiDate ||
          loan?.postfile_first_emi_date ||
          loan?.firstEmiDate ||
          null,
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
        leadDate:
          loan?.leadDate ||
          loan?.lead_date ||
          loan?.leadDetails?.leadDate ||
          loan?.lead_details?.leadDate ||
          loan?.profile?.leadDate ||
          loan?.receivingDate ||
          null,
        lead_date:
          loan?.lead_date ||
          loan?.leadDate ||
          loan?.leadDetails?.leadDate ||
          loan?.lead_details?.leadDate ||
          loan?.profile?.leadDate ||
          loan?.receivingDate ||
          null,
        createdAt: loan?.createdAt || loan?.receivingDate || null,
        updatedAt: loan?.updatedAt || null,
        leadTimestamp: leadDateObj ? leadDateObj.getTime() : 0,
        _metaLoanType: normalizedLoanType,
        _metaLoanNo: actualLoanNumber,
        _metaDisbursalTs: disbursalDateObj ? disbursalDateObj.getTime() : 0,
        _metaDeliveryTs: deliveryDateObj ? deliveryDateObj.getTime() : 0,
        _metaRcReceivedTs: rcReceivedDateObj ? rcReceivedDateObj.getTime() : 0,
        _metaInvoiceReceivedTs: invoiceReceivedDateObj
          ? invoiceReceivedDateObj.getTime()
          : 0,
      };
    },
    [
      firstMeaningfulText,
      getActualLoanNumber,
      normalizeLoanTypeForFilter,
      toDateOrNull,
    ],
  );

  const hydrateMissingShowroomFields = useCallback(
    async (rows = []) => {
      if (!SHOWROOM_HYDRATION_ENABLED) return;
      const candidates = rows
        .filter(
          (loan) =>
            !hasMeaningfulText(loan?.showroomDealerName) &&
            !hasMeaningfulText(loan?.delivery_dealerName) &&
            (loan?._id || loan?.loanId),
        )
        .slice(0, 8);
      if (!candidates.length) return;

      const updates = await Promise.all(
        candidates.map(async (loan) => {
          const id = String(loan?._id || loan?.loanId || "").trim();
          if (!id) return null;

          const cached = showroomHydrationCacheRef.current.get(id);
          if (cached) return { id, patch: cached };
          if (showroomHydrationInFlightRef.current.has(id)) return null;

          showroomHydrationInFlightRef.current.add(id);
          try {
            const res = await loansApi.getById(id);
            const body = res?.data ?? res;
            const fullLoan = body?.data ?? body;
            if (!fullLoan) return null;
            const patch = extractShowroomFields(fullLoan);
            if (
              !hasMeaningfulText(patch?.showroomDealerName) &&
              !hasMeaningfulText(patch?.delivery_dealerName)
            ) {
              return null;
            }
            showroomHydrationCacheRef.current.set(id, patch);
            return { id, patch };
          } catch {
            return null;
          } finally {
            showroomHydrationInFlightRef.current.delete(id);
          }
        }),
      );

      const patchMap = new Map(
        updates.filter(Boolean).map((item) => [item.id, item.patch]),
      );
      if (!patchMap.size) return;

      setLoans((prev) =>
        (prev || []).map((loan) => {
          const id = String(loan?._id || loan?.loanId || "").trim();
          const patch = patchMap.get(id);
          return patch ? { ...loan, ...patch } : loan;
        }),
      );
    },
    [extractShowroomFields, hasMeaningfulText],
  );

  const fetchLoans = useCallback(async (options = {}) => {
    const { force = false } = options;
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
      const searchSeed = String(debouncedSearchQuery || "").trim();
      const searchKey = searchSeed.toLowerCase();
      const isSeedSearchMode = searchSeed.length >= 3;
      const isExpandedFetchMode = isSeedSearchMode || hasWideClientFilters;
      const isLatestLeadMode = sortConfig?.key === "createdAt";

      // Build server-side filter params so the backend can pre-filter results,
      // reducing payload size before client-side filtering runs (belt-and-suspenders).
      const serverFilterParams = {};
      if (filters.loanTypes?.length > 0) {
        serverFilterParams.filterLoanType = filters.loanTypes.join(",");
      }
      if (filters.amountRanges?.length > 0) {
        const mins = filters.amountRanges.map((range) => {
          if (range === "100+") return 100;
          const [min] = range.split("-");
          return Number(min);
        });
        const maxes = filters.amountRanges.map((range) => {
          if (range === "100+") return Infinity;
          const [, max] = range.split("-");
          return Number(max);
        });
        serverFilterParams.filterAmountMin = Math.min(...mins) * 100000;
        if (!maxes.includes(Infinity)) {
          serverFilterParams.filterAmountMax = Math.max(...maxes) * 100000;
        }
      }
      if (filters.pendingApprovalOnly)
        serverFilterParams.filterPendingApproval = "1";
      if (filters.pendingDisbursal)
        serverFilterParams.filterPendingDisbursal = "1";
      if (filters.disbursedOnly) serverFilterParams.filterDisbursed = "1";
      if (filters.cashCarsOnly) serverFilterParams.filterCashCars = "1";
      if (filters.regNoPending) serverFilterParams.filterRegNoPending = "1";
      if (filters.loanNoPending) serverFilterParams.filterLoanNoPending = "1";
      if (filters.rcPending) serverFilterParams.filterRcPending = "1";
      if (filters.invoicePending) serverFilterParams.filterInvoicePending = "1";
      const hasServerFilters = Object.keys(serverFilterParams).length > 0;
      // Each unique filter combination gets its own cache entry to avoid stale data.
      const filterFingerprint = hasServerFilters
        ? Object.entries(serverFilterParams)
            .map(([k, v]) => `${k}=${v}`)
            .sort()
            .join("&")
        : "";

      const mapSortToApi = (cfg) => {
        switch (cfg?.key) {
          case "loanAmount":
            return {
              sortBy: "approval_loanAmountDisbursed",
              sortDir: cfg?.direction || "desc",
            };
          case "emi":
            return {
              sortBy: "postfile_emiAmount",
              sortDir: cfg?.direction || "desc",
            };
          case "aging":
            return {
              sortBy: "createdAt",
              sortDir: cfg?.direction === "desc" ? "asc" : "desc",
            };
          case "customer":
            return {
              sortBy: "customerName",
              sortDir: cfg?.direction || "desc",
            };
          case "vehicle":
            return {
              sortBy: "vehicleModel",
              sortDir: cfg?.direction || "desc",
            };
          case "createdAt":
          default:
            return {
              sortBy: "leadDate",
              sortDir: cfg?.direction || "desc",
            };
        }
      };
      const apiSort = mapSortToApi(sortConfig);
      const cacheKey = isExpandedFetchMode
        ? `expanded:${searchKey}|${apiSort.sortBy}|${apiSort.sortDir}${filterFingerprint ? "|" + filterFingerprint : ""}`
        : `${searchKey}|${page}|${pageSize}|${apiSort.sortBy}|${apiSort.sortDir}${filterFingerprint ? "|" + filterFingerprint : ""}`;
      const cached = force ? null : pageCacheRef.current.get(cacheKey);
      if (cached) {
        setLoans(cached.rows);
        setServerTotal(cached.total);
        // For expanded mode, cached result is authoritative — skip re-fetch.
        if (isExpandedFetchMode) return;
        // For normal mode with a fresh cache hit, render immediately without
        // showing the loading skeleton. The fetch still runs in the background
        // to refresh stale data but the UI won't flicker.
        const cacheAgeMs = Date.now() - (cached.ts || 0);
        if (cacheAgeMs < STATS_TTL_MS) return; // cache is fresh enough
        // Cache is stale: refetch silently (no loading spinner, no flicker)
      } else {
        setLoading(true);
      }

      const startedAt = performance.now();
      const effectivePage = isExpandedFetchMode ? 1 : page;
      const effectiveLimit = isExpandedFetchMode
        ? EXPANDED_FETCH_LIMIT
        : pageSize;
      let payload = null;
      let rows = [];
      const apiStartAt = performance.now();
      const requestParams = {
        page: effectivePage,
        skip: (effectivePage - 1) * effectiveLimit,
        limit: effectiveLimit,
        search: searchSeed || "",
        sortBy: apiSort.sortBy,
        sortDir: apiSort.sortDir,
      };
      if (!isLatestLeadMode) {
        requestParams.view = "dashboard";
      }
      // Merge server-side filter params into the request.
      Object.assign(requestParams, serverFilterParams);
      payload = await loansApi.getAll({
        ...requestParams,
      });
      rows = extractRows(payload);
      const total = extractTotal(payload);

      // Search UX: backend only once for 3-char seed; then local filtering for additional chars.
      if (isExpandedFetchMode && total > rows.length) {
        const totalPages = Math.ceil(total / effectiveLimit);
        const pageRequests = [];
        for (let p = 2; p <= totalPages; p += 1) {
          pageRequests.push(
            loansApi.getAll({
              ...requestParams,
              page: p,
              skip: (p - 1) * effectiveLimit,
              limit: effectiveLimit,
            }),
          );
        }
        if (pageRequests.length) {
          const extraPayloads = await Promise.all(pageRequests);
          const extraRows = extraPayloads.flatMap((nextPayload) =>
            extractRows(nextPayload),
          );
          rows = rows.concat(extraRows);
        }
      }
      const apiMs = Math.round(performance.now() - apiStartAt);
      const normalizeStartAt = performance.now();
      let normalizedRows = rows.map(normalizeLoan);
      if (isExpandedFetchMode) {
        const dedupedById = new Map();
        for (const row of normalizedRows) {
          const key = String(
            row?._id || row?.loanId || row?.loan_number || "",
          ).trim();
          if (!key) continue;
          if (!dedupedById.has(key)) dedupedById.set(key, row);
        }
        normalizedRows = Array.from(dedupedById.values());
      }
      normalizedRows = normalizedRows.map((loan) => {
        const id = String(loan?._id || loan?.loanId || "").trim();
        if (!id) return loan;
        const cached = showroomHydrationCacheRef.current.get(id);
        return cached ? { ...loan, ...cached } : loan;
      });
      const normalizeMs = Math.round(performance.now() - normalizeStartAt);

      const pageRows = normalizedRows;

      pageCacheRef.current.set(cacheKey, {
        rows: pageRows,
        total: isExpandedFetchMode ? pageRows.length : total,
        ts: Date.now(),
      });
      if (
        !searchKey &&
        page === 1 &&
        !isExpandedFetchMode &&
        !hasServerFilters
      ) {
        try {
          sessionStorage.setItem(
            PAGE1_CACHE_KEY,
            JSON.stringify({ rows: pageRows, total, ts: Date.now() }),
          );
        } catch (_) {}
      }

      setLoans(pageRows);
      setServerTotal(isExpandedFetchMode ? pageRows.length : total);
      if (SHOWROOM_HYDRATION_ENABLED) {
        void hydrateMissingShowroomFields(pageRows);
      }

      const payloadSizeBytes = new Blob([JSON.stringify(payload || {})]).size;
      const payloadKB = Number((payloadSizeBytes / 1024).toFixed(1));

      if (!isExpandedFetchMode) {
        // Warm next page for instant navigation.
        const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
        const nextPage = page + 1;
        if (nextPage <= totalPages) {
          const nextKey = `${searchKey}|${nextPage}|${pageSize}|${apiSort.sortBy}|${apiSort.sortDir}${filterFingerprint ? "|" + filterFingerprint : ""}`;
          if (!pageCacheRef.current.has(nextKey)) {
            loansApi
              .getAll({
                ...(isLatestLeadMode ? {} : { view: "dashboard" }),
                page: nextPage,
                skip: (nextPage - 1) * pageSize,
                limit: pageSize,
                search: searchSeed || "",
                sortBy: apiSort.sortBy,
                sortDir: apiSort.sortDir,
                ...serverFilterParams,
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
          rows: pageRows.length,
          total: isExpandedFetchMode ? pageRows.length : total,
          search: searchSeed || "",
          sortBy: payload?.meta?.sortBy || apiSort.sortBy,
          fromCache: Boolean(cached),
          seedMode: isSeedSearchMode,
          statMode: false,
        });
      });
    } catch (e) {
      console.error("Fetch Loans Error:", e);
      setLoans([]);
      setServerTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    normalizeLoan,
    page,
    pageSize,
    debouncedSearchQuery,
    hasWideClientFilters,
    filters,
    sortConfig,
    hydrateMissingShowroomFields,
  ]);

  const fetchDashboardStats = useCallback(
    async ({ force = false } = {}) => {
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
          pendingDisbursal:
            Number(payload?.pendingDisbursal) ||
            Number(payload?.approvedToday) ||
            0,
          disbursed: Number(payload?.disbursed) || 0,
          cashCars: Number(payload?.cashCars) || 0,
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
    },
    [STATS_TTL_MS],
  );

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  useEffect(() => {
    const searchSeed = String(debouncedSearchQuery || "").trim();
    if (searchSeed) return;

    const isLatestLeadMode = sortConfig?.key === "createdAt";
    const mapSortToApi = (cfg) => {
      switch (cfg?.key) {
        case "loanAmount":
          return {
            sortBy: "approval_loanAmountDisbursed",
            sortDir: cfg?.direction || "desc",
          };
        case "emi":
          return {
            sortBy: "postfile_emiAmount",
            sortDir: cfg?.direction || "desc",
          };
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
          return { sortBy: "leadDate", sortDir: cfg?.direction || "desc" };
      }
    };
    const apiSort = mapSortToApi(sortConfig);
    const cacheKey = `expanded:|${apiSort.sortBy}|${apiSort.sortDir}`;
      if (pageCacheRef.current.has(cacheKey)) return;

    let cancelled = false;
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

    const timer = setTimeout(() => {
      const requestParams = {
        page: 1,
        skip: 0,
        limit: EXPANDED_FETCH_LIMIT,
        search: "",
        sortBy: apiSort.sortBy,
        sortDir: apiSort.sortDir,
        ...(isLatestLeadMode ? {} : { view: "dashboard" }),
      };

      loansApi
        .getAll(requestParams)
        .then(async (payload) => {
          if (cancelled) return;
          let rows = extractRows(payload);
          const total = extractTotal(payload);

          if (total > rows.length) {
            const totalPages = Math.ceil(total / EXPANDED_FETCH_LIMIT);
            const pageRequests = [];
            for (let p = 2; p <= totalPages; p += 1) {
              pageRequests.push(
                loansApi.getAll({
                  ...requestParams,
                  page: p,
                  skip: (p - 1) * EXPANDED_FETCH_LIMIT,
                }),
              );
            }
            if (pageRequests.length) {
              const extraPayloads = await Promise.all(pageRequests);
              const extraRows = extraPayloads.flatMap((nextPayload) =>
                extractRows(nextPayload),
              );
              rows = rows.concat(extraRows);
            }
          }

          if (cancelled) return;
          const normalizedRows = rows.map(normalizeLoan);
          const dedupedById = new Map();
          for (const row of normalizedRows) {
            const key = String(
              row?._id || row?.loanId || row?.loan_number || "",
            ).trim();
            if (!key) continue;
            if (!dedupedById.has(key)) dedupedById.set(key, row);
          }
          const pageRows = Array.from(dedupedById.values());
          pageCacheRef.current.set(cacheKey, {
            rows: pageRows,
            total: pageRows.length,
            ts: Date.now(),
          });
        })
        .catch(() => {});
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [debouncedSearchQuery, normalizeLoan, sortConfig]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PAGE1_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.rows)) return;
      const age = Date.now() - Number(parsed?.ts || 0);
      // Only restore from sessionStorage if cache is fresh enough (< STATS_TTL_MS = 2 min)
      // to avoid showing very stale data as the initial paint.
      if (age > STATS_TTL_MS) return;
      const hydratedRows = parsed.rows.map(normalizeLoan);
      // Use the same key format fetchLoans() uses for page 1, no search, default sort.
      // This ensures the next fetchLoans() call hits the cache and skips setLoading(true),
      // eliminating the stale → skeleton → fresh data flicker sequence.
      const page1CacheKey = `|1|${pageSize}|leadDate|desc`;
      pageCacheRef.current.set(page1CacheKey, {
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
          ageMs: age,
        });
      }
    } catch (_) {}
  }, [normalizeLoan, page, pageSize, filters.searchQuery, STATS_TTL_MS]);

  useEffect(() => {
    const rawQuery = String(filters.searchQuery || "");
    const trimmedQuery = rawQuery.trim();

    // Start server search only from the 3rd typed character.
    if (!trimmedQuery) {
      setDebouncedSearchQuery("");
      return undefined;
    }
    if (trimmedQuery.length < 3) {
      setDebouncedSearchQuery("");
      return undefined;
    }

    const handle = setTimeout(() => {
      // Seed backend search at 3 chars; 4th+ chars are refined on frontend.
      setDebouncedSearchQuery(trimmedQuery.slice(0, 3));
    }, 180);
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
    showroomHydrationCacheRef.current.clear();
    showroomHydrationInFlightRef.current.clear();
    cpvEvaluationCacheRef.current.clear();
    try {
      sessionStorage.removeItem(PAGE1_CACHE_KEY);
      sessionStorage.removeItem(STATS_CACHE_KEY);
    } catch (_) {}
    fetchLoans({ force: true });
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

  const handleFilterChange = useCallback((key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setPage(1);
    setFilters({
      loanTypes: [],
      amountRanges: [],
      pendingApprovalOnly: false,
      pendingDisbursal: false,
      disbursedOnly: false,
      cashCarsOnly: false,
      cpvIncomplete: false,
      regNoPending: false,
      loanNoPending: false,
      rcPending: false,
      invoicePending: false,
      searchQuery: "",
    });
  }, []);

  const handleStatClick = useCallback(
    (type) => {
      handleResetFilters();
      switch (type) {
        case "pending":
          setFilters((prev) => ({
            ...prev,
            pendingApprovalOnly: true,
          }));
          break;
        case "pendingDisbursal":
          setFilters((prev) => ({
            ...prev,
            pendingDisbursal: true,
          }));
          break;
        case "disbursed":
          setFilters((prev) => ({
            ...prev,
            disbursedOnly: true,
          }));
          break;
        case "cashCars":
          setFilters((prev) => ({
            ...prev,
            cashCarsOnly: true,
          }));
          break;
        default:
          break;
      }
    },
    [handleResetFilters],
  );

  const handleSelectLoan = (loanId, checked) => {
    setSelectedLoans((prev) =>
      checked ? [...prev, loanId] : prev.filter((id) => id !== loanId),
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedLoans(checked ? gridLoans.map((l) => l.loanId) : []);
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
    } else if (mode === "repayment") {
      setInitialViewTab("po_repayment_intelligence");
      setViewLoan(loan);
      setIsViewModalOpen(true);
    }
  };

  const handleQuickAction = async (actionId) => {
    if (actionId === "new-case") {
      startNewLoanCase(navigate, "loan-dashboard");
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
          message.success({
            content: "Deleted successfully",
            key: "bulk_delete",
          });
          setSelectedLoans([]);
          refreshDashboard();
        } catch (e) {
          console.error("Bulk delete failed", e);
          message.error({
            content: "Failed to delete some cases",
            key: "bulk_delete",
          });
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

  const handleOpenRepaymentIntelligence = (loan) => {
    handleLoanClick(loan, "repayment");
  };

  const handleOpenLoanDeliverySection = (loan, sectionId) => {
    const targetId = loan?._id || loan?.loanId || loan?.loan_number;
    if (!targetId) {
      message.warning("Loan ID not found.");
      return;
    }
    const query = new URLSearchParams({
      step: "delivery",
      section: sectionId || "delivery-rc",
      focus: String(Date.now()),
    });
    navigate(`/loans/edit/${targetId}?${query.toString()}`);
  };

  const filteredLoans = useMemo(() => {
    const activeSearch = String(filters.searchQuery || "").trim();
    const seedSearch = String(debouncedSearchQuery || "")
      .trim()
      .toLowerCase();
    // Only apply client-side search when the typed query is longer than the 3-char
    // seed sent to the backend (so the backend already did a coarser pre-filter).
    const shouldApplyClientSearch = (() => {
      if (!activeSearch) return false;
      if (activeSearch.length < 3) return true;
      if (!seedSearch) return true;
      return activeSearch.toLowerCase() !== seedSearch;
    })();

    const filtered = loans.filter((loan) => {
      // Search refinement (client-side only when query > 3 chars or no seed yet)
      if (shouldApplyClientSearch) {
        if (!matchesDashboardSearch(loan, filters.searchQuery)) return false;
      }

      // cpvIncomplete is the only filter that truly requires client evaluation
      // (it inspects many optional fields). All other filters are enforced by
      // the backend query before rows are returned.
      if (filters.cpvIncomplete) {
        if (!isCpvIncomplete(loan)) return false;
      }

      return true;
    });
    if (sortConfig?.key !== "createdAt") return filtered;

    const dir = sortConfig?.direction === "asc" ? 1 : -1;
    const leadTs = (loan) => Number(loan?.leadTimestamp) || 0;
    const tieBreak = (a, b) =>
      String(a?.loanId || a?._id || "").localeCompare(
        String(b?.loanId || b?._id || ""),
      );
    const compareBy = (resolver) => (a, b) => {
      const delta = resolver(a) - resolver(b);
      if (delta !== 0) return delta * dir;
      return tieBreak(a, b) * dir;
    };

    return [...filtered].sort(compareBy(leadTs));
  }, [
    loans,
    filters,
    debouncedSearchQuery,
    matchesDashboardSearch,
    isCpvIncomplete,
    sortConfig?.key,
    sortConfig?.direction,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    filters.searchQuery,
    filters.loanTypes,
    filters.amountRanges,
    filters.pendingApprovalOnly,
    filters.pendingDisbursal,
    filters.disbursedOnly,
    filters.cashCarsOnly,
    filters.cpvIncomplete,
    filters.regNoPending,
    filters.loanNoPending,
    filters.rcPending,
    filters.invoicePending,
  ]);

  // Only cpvIncomplete truly filters on the client side. All other filters are
  // handled by the backend, so server-pagination works correctly for them.
  const hasClientOnlyFilters = filters.cpvIncomplete;
  const activeFilterMode = hasClientOnlyFilters;
  const gridLoans = activeFilterMode
    ? filteredLoans.slice((page - 1) * pageSize, page * pageSize)
    : filteredLoans;
  const totalCountForGrid = hasClientOnlyFilters
    ? filteredLoans.length
    : Number(serverTotal) || filteredLoans.length;
  const searchMode = Boolean(filters.searchQuery?.trim());
  const effectiveTotalCountForGrid = searchMode
    ? filteredLoans.length
    : totalCountForGrid;

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-sky-50 via-white to-white p-4 md:p-6 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="flex h-full min-h-0 flex-col gap-5">
        <section className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-400">
                Loans Module
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl dark:text-slate-100">
                Dashboard Command Center
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 dark:border-sky-900/40 dark:bg-sky-950/30">
                <p className="text-slate-500 dark:text-slate-400">
                  Cases in view
                </p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {totalCountForGrid}
                </p>
              </div>
              <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 px-3 py-2 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/30">
                <p className="text-slate-500 dark:text-slate-400">
                  EMI captured
                </p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {statsData.emiCapturedCount}/{statsData.total || 0}
                </p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 dark:border-rose-900/40 dark:bg-rose-950/30">
                <p className="text-slate-500 dark:text-slate-400">
                  Reg no captured
                </p>
                <p className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {statsData.regNoCapturedCount}/{statsData.total || 0}
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading && loans.length === 0 ? (
          <DashboardSkeleton />
        ) : (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <MetricCard
                id="total"
                title="Total Cases"
                subtitle="All active and archived flow"
                value={statsData.total}
                iconName="FileStack"
                loading={loading}
                isActive={
                  !filters.pendingApprovalOnly &&
                  !filters.pendingDisbursal &&
                  !filters.disbursedOnly &&
                  !filters.cashCarsOnly
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
                isActive={filters.pendingApprovalOnly}
                onClick={() => handleStatClick("pending")}
              />
              <MetricCard
                id="pendingDisbursal"
                title="Pending Disbursal"
                subtitle="Approved but not disbursed yet"
                value={statsData.pendingDisbursal}
                iconName="BadgeCheck"
                loading={loading}
                isActive={filters.pendingDisbursal}
                onClick={() => handleStatClick("pendingDisbursal")}
              />
              <MetricCard
                id="disbursed"
                title="Disbursed"
                subtitle="Ready for delivery operations"
                value={statsData.disbursed}
                iconName="WalletCards"
                loading={loading}
                isActive={filters.disbursedOnly}
                onClick={() => handleStatClick("disbursed")}
              />
              <MetricCard
                id="cashCars"
                title="Cash Cars"
                subtitle="All cash car/cash sale cases"
                value={statsData.cashCars}
                iconName="CarFront"
                loading={loading}
                isActive={filters.cashCarsOnly}
                onClick={() => handleStatClick("cashCars")}
              />
              <MetricCard
                id="ticket"
                title="Book Value"
                subtitle="Disbursed amount + cash car ex-showroom"
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
                  loans={gridLoans}
                  selectedLoans={selectedLoans}
                  totalCount={effectiveTotalCountForGrid}
                  currentPage={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onSelectLoan={handleSelectLoan}
                  onSelectAll={handleSelectAll}
                  onSelectionChange={handleSelectionChange}
                  onLoanClick={handleLoanClick}
                  onBulkAction={handleBulkAction}
                  onDeleteLoan={handleDeleteLoan}
                  onUpdateStatus={handleUpdateStatus}
                  onUploadDocuments={handleUploadDocuments}
                  onOpenRepaymentIntelligence={handleOpenRepaymentIntelligence}
                  onOpenLoanDeliverySection={handleOpenLoanDeliverySection}
                  onRefreshLoans={refreshDashboard}
                  onAddLoan={() => handleQuickAction("new-case")}
                  onShowOtherBanks={handleShowOtherBanks}
                  onNotesClick={handleNotesClick}
                  userRole={userRole}
                  loading={loading}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <LoanViewModal
        open={isViewModalOpen}
        loan={viewLoan}
        loanId={viewLoan?.loanId || viewLoan?._id}
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
