import React, { useMemo, useState } from "react";
import { Tooltip } from "antd";
import PendencyTracker from "../pendency/PendencyTracker";
import LoanDocumentsModal from "./LoanDocumentsModal";
import ApproxClosureModal from "./ApproxClosureModal";
import Icon from "../../../../components/AppIcon";
import Button from "../../../../components/ui/Button";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { formatINR } from "../../../../utils/currency";
import { calculateLivePrincipalOutstanding } from "../../../../utils/emiCalculator";

const STAGES = [
  { key: "customerProfile", label: "Customer Profile" },
  { key: "prefileCompletion", label: "Pre-File Completion" },
  { key: "loginToBank", label: "Login to bank" },
  { key: "approval", label: "Approval" },
  { key: "postfileCompletion", label: "Post-File Completion" },
  { key: "disbursement", label: "Disbursement" },
  { key: "documentsCollected", label: "Documents collected" },
  { key: "insurance", label: "Insurance" },
  { key: "invoice", label: "Invoice" },
  { key: "vehicleDelivery", label: "Vehicle Delivery" },
  { key: "rc", label: "RC" },
];

const SORT_OPTIONS = [
  { key: "createdAt", label: "Latest" },
  { key: "loanAmount", label: "Loan Amount" },
  { key: "emi", label: "EMI" },
  { key: "aging", label: "Aging" },
  { key: "customer", label: "Customer" },
  { key: "vehicle", label: "Vehicle" },
];

const STAGE_INDEX_MAP = {
  profile: 0,
  customerprofile: 0,
  customer_profile: 0,
  prefile: 1,
  "pre-file": 1,
  login: 2,
  logintobank: 2,
  login_to_bank: 2,
  approval: 3,
  postfile: 4,
  "post-file": 4,
  disbursement: 5,
  disbursal: 5,
  documents: 6,
  docs: 6,
  insurance: 7,
  invoice: 8,
  delivery: 9,
  vehicledelivery: 9,
  rc: 10,
  payout: 10,
};

const toDateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toIsoOrNull = (value) => {
  const d = toDateOrNull(value);
  return d ? d.toISOString() : null;
};

const minDate = (dates = []) => {
  const valid = dates.filter(Boolean);
  if (!valid.length) return null;
  return new Date(Math.min(...valid.map((d) => d.getTime())));
};

const maxDate = (dates = []) => {
  const valid = dates.filter(Boolean);
  if (!valid.length) return null;
  return new Date(Math.max(...valid.map((d) => d.getTime())));
};

const hasDisplayValue = (value) => {
  if (value == null) return false;
  const text = String(value).trim();
  if (!text) return false;
  const normalized = text.toLowerCase();
  return !["n/a", "na", "not set", "unknown", "-", "null", "undefined"].includes(
    normalized,
  );
};

const firstFilled = (...values) =>
  values.find(
    (v) =>
      v !== undefined &&
      v !== null &&
      !(typeof v === "string" && v.trim() === ""),
  );

const findStageIndexByCurrentStage = (loan) => {
  const rawStage = String(loan?.currentStage || "").trim().toLowerCase();
  if (!rawStage) return -1;
  const normalized = rawStage.replace(/\s+/g, "").replace(/_/g, "").replace(/-/g, "");
  if (Object.prototype.hasOwnProperty.call(STAGE_INDEX_MAP, rawStage)) {
    return STAGE_INDEX_MAP[rawStage];
  }
  if (Object.prototype.hasOwnProperty.call(STAGE_INDEX_MAP, normalized)) {
    return STAGE_INDEX_MAP[normalized];
  }
  if (normalized.includes("prefile")) return 1;
  if (normalized.includes("login")) return 2;
  if (normalized.includes("approv")) return 3;
  if (normalized.includes("postfile")) return 4;
  if (normalized.includes("disburs")) return 5;
  if (normalized.includes("doc")) return 6;
  if (normalized.includes("insur")) return 7;
  if (normalized.includes("invo")) return 8;
  if (normalized.includes("deliv")) return 9;
  if (normalized.includes("rc")) return 10;
  return -1;
};

const buildRawTimeline = (loan) => {
  const currentStageIndex = findStageIndexByCurrentStage(loan);
  const reached = (idx) => currentStageIndex >= idx;
  const statusLower = String(
    loan?.approval_status || loan?.loanStatus || loan?.status || "",
  ).toLowerCase();
  const hasDisbursedStatus = statusLower.includes("disburs");
  const receivingDate = toDateOrNull(loan?.receivingDate);
  const createdAtDate = toDateOrNull(loan?.createdAt);
  const approvalDate = toDateOrNull(loan?.approval_approvalDate || loan?.postfile_approvalDate);
  const disbursementDate = toDateOrNull(
    loan?.disbursement_date || loan?.approval_disbursedDate || loan?.disbursementDate,
  );
  const dispatchDate = toDateOrNull(
    loan?.dispatch_date || loan?.docs_collected_at || loan?.documents_collected_at,
  );
  const insuranceDate = toDateOrNull(
    loan?.insurance_done_at || loan?.insurance_start_date || loan?.insurance_policy_start_date,
  );
  const invoiceDate = toDateOrNull(
    loan?.invoice_done_at || loan?.invoice_received_date || loan?.invoice_date,
  );
  const deliveryDate = toDateOrNull(
    loan?.delivery_done_at || loan?.delivery_date || loan?.deliveryDate,
  );
  const rcDate = toDateOrNull(loan?.rc_received_at || loan?.rc_received_date);

  const historicalDates = [
    receivingDate,
    approvalDate,
    disbursementDate,
    dispatchDate,
    insuranceDate,
    invoiceDate,
    deliveryDate,
    rcDate,
  ].filter(Boolean);

  // Migration-safe anchors:
  // 1) Prefer legacy business dates, then receiving date.
  // 2) Use createdAt only as last fallback to avoid "today" timelines after migration import.
  let leadDate = receivingDate || minDate(historicalDates) || createdAtDate || null;
  let journeyEndDate = maxDate(historicalDates) || leadDate || createdAtDate || null;
  if (leadDate && journeyEndDate && journeyEndDate < leadDate) {
    const lo = minDate([leadDate, journeyEndDate]);
    const hi = maxDate([leadDate, journeyEndDate]);
    leadDate = lo || leadDate;
    journeyEndDate = hi || journeyEndDate;
  }
  const timelineAnchorDate =
    journeyEndDate || leadDate || disbursementDate || approvalDate || null;
  const inRangeStepDate = (idx) => {
    if (leadDate && journeyEndDate && journeyEndDate >= leadDate) {
      const ratio = Math.max(0, Math.min(1, idx / (STAGES.length - 1)));
      const ms =
        leadDate.getTime() + (journeyEndDate.getTime() - leadDate.getTime()) * ratio;
      return new Date(ms).toISOString();
    }
    if (leadDate) return leadDate.toISOString();
    if (journeyEndDate) return journeyEndDate.toISOString();
    return null;
  };

  const resolveStepDate = (explicitDate, idx, fallbackDate = inRangeStepDate(idx)) => {
    if (explicitDate) {
      const explicit = toDateOrNull(explicitDate);
      // Keep explicit only if it falls within the lead -> journey-end window.
      // This prevents previously injected "today" dates from overriding timeline reconstruction.
      if (explicit) {
        if (leadDate && journeyEndDate && journeyEndDate >= leadDate) {
          if (explicit >= leadDate && explicit <= journeyEndDate) {
            return explicit.toISOString();
          }
          return reached(idx) ? fallbackDate : null;
        }
        if (timelineAnchorDate) {
          // If we have any historical anchor and explicit is after it, treat explicit as noisy.
          if (explicit > timelineAnchorDate) {
            return reached(idx) ? fallbackDate : null;
          }
          return explicit.toISOString();
        }
        return explicit.toISOString();
      }
    }
    if (reached(idx)) return fallbackDate;
    return null;
  };

  return {
    customerProfile: resolveStepDate(
      loan?.receivingDate || loan?.createdAt,
      0,
      toIsoOrNull(loan?.receivingDate) || inRangeStepDate(0),
    ),
    prefileCompletion: resolveStepDate(
      loan?.prefile_completed_at ||
        loan?.prefile_completion_date ||
        loan?.approval_approvalDate,
      1,
      toIsoOrNull(loan?.approval_approvalDate) || inRangeStepDate(1),
    ),
    loginToBank: resolveStepDate(
      loan?.login_to_bank_date || loan?.bank_login_date || loan?.approval_loginDate,
      2,
      toIsoOrNull(loan?.approval_approvalDate) || inRangeStepDate(2),
    ),
    approval: resolveStepDate(
      loan?.approval_approvalDate || loan?.postfile_approvalDate,
      3,
      toIsoOrNull(loan?.approval_approvalDate) || inRangeStepDate(3),
    ),
    postfileCompletion: resolveStepDate(
      loan?.postfile_completed_at ||
        loan?.postfile_completion_date ||
        loan?.postfile_approvalDate,
      4,
      toIsoOrNull(loan?.postfile_approvalDate || loan?.approval_approvalDate) ||
        inRangeStepDate(4),
    ),
    disbursement: resolveStepDate(
      loan?.disbursement_date ||
        loan?.approval_disbursedDate ||
        loan?.disbursementDate,
      hasDisbursedStatus ? 5 : 5,
      toIsoOrNull(
        loan?.disbursement_date || loan?.approval_disbursedDate || loan?.disbursementDate,
      ) || inRangeStepDate(5),
    ),
    documentsCollected: resolveStepDate(
      loan?.docs_collected_at ||
        loan?.documents_collected_at ||
        loan?.dispatch_date,
      6,
      inRangeStepDate(6),
    ),
    insurance: resolveStepDate(
      loan?.insurance_done_at ||
        loan?.insurance_start_date ||
        loan?.insurance_policy_start_date,
      7,
      inRangeStepDate(7),
    ),
    invoice: resolveStepDate(
      loan?.invoice_done_at ||
        loan?.invoice_received_date ||
        loan?.invoice_date,
      8,
      inRangeStepDate(8),
    ),
    vehicleDelivery: resolveStepDate(
      loan?.delivery_done_at || loan?.delivery_date || loan?.deliveryDate,
      9,
      inRangeStepDate(9),
    ),
    rc: resolveStepDate(
      loan?.rc_received_at || loan?.rc_received_date,
      10,
      inRangeStepDate(10),
    ),
  };
};

const buildTimeline = (loan) => {
  const raw = buildRawTimeline(loan);
  return STAGES.map((s) => ({
    ...s,
    date: toDateOrNull(raw[s.key]),
  }));
};

const findCurrentStageIndex = (loan) => {
  const steps = buildTimeline(loan);
  let lastDone = -1;
  steps.forEach((s, i) => {
    if (s.date) lastDone = i;
  });
  if (lastDone !== -1) return lastDone;

  const byStage = findStageIndexByCurrentStage(loan);
  return byStage !== -1 ? byStage : 0;
};

const getMiniWindow = (loan) => {
  const steps = buildTimeline(loan);
  const current = findCurrentStageIndex(loan);
  const prev = current - 1 >= 0 ? steps[current - 1] : null;
  const curr = steps[current] || null;
  const next = current + 1 < steps.length ? steps[current + 1] : null;

  return {
    steps: [prev, curr, next],
    currentKey: curr?.key,
  };
};

const getStatusTheme = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("disburs")) {
    return "border-emerald-300/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
  if (s.includes("approved")) {
    return "border-cyan-300/80 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300";
  }
  if (s.includes("pending") || s.includes("progress")) {
    return "border-amber-300/80 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
  }
  if (s.includes("reject")) {
    return "border-rose-300/80 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300";
  }
  return "border-slate-300/80 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

const pickPrimaryBank = (loan) => {
  const banks = loan?.approval_banksData || [];
  return (
    banks.find((b) => b.status === "Disbursed") ||
    banks.find((b) => b.status === "Approved") ||
    banks[0] ||
    null
  );
};

const LoansDataGrid = ({
  loans,
  totalCount,
  currentPage = 1,
  pageSize = 75,
  onPageChange,
  sortConfig = { key: "createdAt", direction: "desc" },
  onSortChange,
  selectedLoans,
  onSelectLoan,
  onSelectAll,
  onLoanClick,
  onBulkAction,
  onDeleteLoan,
  userRole,
  loading,
  onUpdateStatus,
  onShareLoan,
  onShowOtherBanks,
  onRefreshLoans,
  onNotesClick,
}) => {
  const [timelineLoan, setTimelineLoan] = useState(null);
  const [pendencyLoan, setPendencyLoan] = useState(null);
  const [documentsLoan, setDocumentsLoan] = useState(null);
  const [closureLoan, setClosureLoan] = useState(null);

  const formatLoanId = (id) => {
    if (!id) return "Loan number not set";
    return String(id);
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "Cash Sale";
    return formatINR(amount);
  };

  const parseAmount = (value) => {
    if (value == null || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const cleaned = String(value).replace(/[^\d.-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const sortedLoans = loans || [];

  const getPendingSteps = (loan) => {
    const currentStageIndex = findStageIndexByCurrentStage(loan);
    const reached = (idx) => currentStageIndex >= idx;
    const statusLower = String(
      loan?.approval_status || loan?.loanStatus || loan?.status || "",
    ).toLowerCase();
    const hasDisbursedStatus = statusLower.includes("disburs");
    const steps = [
      {
        label: "Profile Created",
        completed: !!(loan.createdAt || loan.receivingDate) || reached(0),
      },
      {
        label: "Disbursement",
        completed:
          !!(loan.approval_disbursedDate || loan.disbursement_date) ||
          hasDisbursedStatus ||
          reached(5),
      },
      {
        label: "RC Received",
        completed: !!(loan.rc_received_date || loan.rc_received_at) || reached(10),
      },
      {
        label: "Invoice Received",
        completed: !!(loan.invoice_received_date || loan.invoice_date) || reached(8),
      },
      {
        label: "Loan Number Assigned",
        completed: !!(loan.loan_number || loan.loanId),
      },
    ];
    return steps.filter((s) => !s.completed).map((s) => s.label);
  };

  const loansWithPendency = useMemo(
    () =>
      (sortedLoans || []).map((loan) => {
        const pendingSteps = getPendingSteps(loan);
        return {
          ...loan,
          pendencyCount: pendingSteps.length,
          pendingSteps,
        };
      }),
    [sortedLoans],
  );

  const allChecked = selectedLoans?.length === sortedLoans?.length && sortedLoans?.length > 0;
  const someChecked = selectedLoans?.length > 0 && selectedLoans?.length < sortedLoans?.length;
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));

  return (
    <div className="h-full flex flex-col overflow-hidden bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allChecked}
            indeterminate={someChecked}
            onChange={(e) => onSelectAll(e?.target?.checked)}
          />
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">Visual Loan Board</p>
            <p className="text-sm font-semibold text-foreground">
              {totalCount || sortedLoans?.length || 0} case(s) in current result
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SORT_OPTIONS.map((opt) => {
            const active = sortConfig.key === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() =>
                  onSortChange?.((prev) => ({
                    key: opt.key,
                    direction: prev.key === opt.key && prev.direction === "desc" ? "asc" : "desc",
                  }))
                }
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {selectedLoans?.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" iconName="FileDown" onClick={() => onBulkAction("export")}>
              Export
            </Button>
            <Button variant="outline" size="sm" iconName="Send" onClick={() => onBulkAction("dispatch")}>
              Dispatch
            </Button>
            {userRole === "admin" && (
              <Button variant="default" size="sm" iconName="CheckCircle2" onClick={() => onBulkAction("approve")}>
                Approve
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 bg-background">
        {loading && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Loading loans...
          </div>
        )}

        {!loading && sortedLoans?.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Icon name="FileX2" size={44} className="mx-auto text-muted-foreground" />
            <p className="mt-3 text-base font-semibold text-foreground">No loans found</p>
            <p className="text-sm text-muted-foreground">Try adjusting filters or create a new case.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2.5">
          {!loading && loansWithPendency?.map((loanWithPendency, index) => {
            const loan = loanWithPendency;
            const pendencyCount = loanWithPendency?.pendencyCount || 0;
            const pendingSteps = loanWithPendency?.pendingSteps || [];

            const loanKey = loan?._id || loan?.loan_number || loan?.loanId || `loan-${index}`;
            const statusText = loan?.status || "New";

            const fullCarName = `${loan?.vehicleMake || ""} ${loan?.vehicleModel || ""}`.trim();
            const carTitle = fullCarName || "Vehicle not selected";
            const variant = loan?.vehicleVariant || "Variant not set";
            const regNo =
              loan?.rc_redg_no ||
              loan?.vehicleRegNo ||
              loan?.registrationNumber ||
              loan?.vehicleNumber ||
              "Reg no not set";
            const regCity = loan?.postfile_regd_city || loan?.registrationCity || "-";

            const primary = pickPrimaryBank(loan);
            const banks = loan?.approval_banksData || [];
            const otherBanks = banks.filter((b) => primary && b?.id !== primary.id);

            const primaryBankName = primary?.bankName || loan?.approval_bankName || "Bank not set";
            const primaryLoanAmount =
              parseAmount(primary?.loanAmount) ||
              loan?.approval_loanAmountDisbursed ||
              loan?.approval_loanAmountApproved ||
              loan?.financeExpectation ||
              0;
            const loanTypeText = String(
              loan?.typeOfLoan || loan?.loanType || loan?.caseType || loan?.loan_type || "",
            ).toLowerCase();
            const caseTypeLabel =
              loan?.typeOfLoan || loan?.loanType || loan?.caseType || loan?.loan_type || "Case";
            const primaryInterest =
              typeof primary?.interestRate === "number" ? primary.interestRate : loan?.approval_roi;
            const primaryTenureMonths =
              primary?.tenure || loan?.approval_tenureMonths || loan?.loanTenureMonths || null;
            const primaryEmiAmount =
              parseAmount(primary?.emiAmount) ||
              parseAmount(primary?.emi) ||
              parseAmount(loan?.postfile_emiAmount) ||
              parseAmount(loan?.emiAmount) ||
              0;
            const isCashCar = (() => {
              const isFinancedRaw = loan?.isFinanced ?? loan?.isFinanceRequired;
              const isFinancedText = String(isFinancedRaw ?? "").trim().toLowerCase();
              if (isFinancedText === "no" || isFinancedText === "false") return true;
              if (isFinancedText === "yes" || isFinancedText === "true") return false;
              if (loanTypeText.includes("cash")) return true;
              if (loan?.isFinanced === false || loan?.isFinanceRequired === false) return true;
              const financeExpectation = parseAmount(loan?.financeExpectation);
              const bankLoanAmount = parseAmount(primary?.loanAmount);
              const hasBankName = !!(primary?.bankName || loan?.approval_bankName);
              const noFinanceMetrics =
                bankLoanAmount === 0 && primaryEmiAmount === 0 && !primaryInterest && !primaryTenureMonths;
              return (financeExpectation === 0 && !hasBankName) || noFinanceMetrics;
            })();
            const disbursementDate =
              loan?.disbursement_date ||
              loan?.approval_disbursedDate ||
              loan?.disbursedDate ||
              loan?.disbursementDate ||
              primary?.disbursedDate ||
              null;
            const storedPrincipalOutstanding =
              parseAmount(loan?.postfile_currentOutstanding) ||
              parseAmount(loan?.postfile_current_outstanding) ||
              parseAmount(loan?.currentOutstanding) ||
              parseAmount(loan?.livePrincipalOutstanding) ||
              parseAmount(loan?.live_principal_outstanding) ||
              parseAmount(loan?.principalOutstanding) ||
              parseAmount(loan?.principal_outstanding) ||
              parseAmount(loan?.outstandingPrincipal) ||
              parseAmount(loan?.outstandingBalance) ||
              parseAmount(loan?.postfile_principalOutstanding) ||
              parseAmount(loan?.postfile_livePrincipalOutstanding) ||
              parseAmount(loan?.postFile?.currentOutstanding) ||
              0;
            const liveOutstandingFallback =
              !storedPrincipalOutstanding && !isCashCar && primaryLoanAmount && primaryInterest && primaryTenureMonths
                ? calculateLivePrincipalOutstanding(
                    primaryLoanAmount,
                    primaryInterest,
                    primaryTenureMonths,
                    loan?.postfile_firstEmiDate || disbursementDate,
                  )?.outstanding || 0
                : 0;
            const principalOutstanding =
              storedPrincipalOutstanding || parseAmount(liveOutstandingFallback);
            const maturityDate = (() => {
              if (loan?.postfile_maturityDate) return loan.postfile_maturityDate;
              const tenureMonths = parseAmount(primaryTenureMonths || loan?.loanTenureMonths || loan?.tenure);
              const firstEmiDate =
                loan?.postfile_firstEmiDate ||
                loan?.postfile_first_emi_date ||
                primary?.firstEmiDate ||
                loan?.firstEmiDate ||
                null;
              if (!firstEmiDate || !tenureMonths) return null;
              const start = new Date(firstEmiDate);
              if (Number.isNaN(start.getTime())) return null;
              const derived = new Date(start);
              derived.setMonth(derived.getMonth() + tenureMonths);
              return derived.toISOString();
            })();
            const isLoanClosed =
              !!loan?.closureDate ||
              !!loan?.closedDate ||
              String(loan?.loanStatus || loan?.status || "")
                .toLowerCase()
                .includes("closed");
            const customerAddress =
              loan?.residenceAddress || loan?.permanentAddress || loan?.address || "";
            const customerCity = loan?.city || loan?.permanentCity || "";
            const normalizedCaseType = String(
              loan?.typeOfLoan || loan?.loanType || loan?.caseType || loan?.loan_type || "",
            )
              .trim()
              .toLowerCase();
            const isNewCarCase = normalizedCaseType === "new car";
            const showroomFieldLabel = isNewCarCase
              ? "Showroom"
              : "Loan Payment Favouring";
            // Show only Post-File/Delivery vehicle showroom data here.
            // Do not fallback to channel/dealer source fields.
            const showroomName = firstFilled(
              loan?.showroomDealerName,
              loan?.delivery_dealerName,
              loan?.postFile?.showroomDealerName,
              loan?.postfile?.showroomDealerName,
              loan?.postFileVehicleVerification?.showroomDealerName,
              loan?.vehicleVerification?.showroomDealerName,
              loan?.postFileVehicle?.showroomDealerName,
              loan?.showroomName,
              loan?.showroom,
              loan?.showroom_name,
              "",
            );
            const disbursementLabel = disbursementDate
              ? new Date(disbursementDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "";
            const firstEmiDateForClosure =
              loan?.postfile_firstEmiDate ||
              loan?.postfile_first_emi_date ||
              primary?.firstEmiDate ||
              loan?.firstEmiDate ||
              disbursementDate ||
              null;
            const maturityStatus = (() => {
              if (!maturityDate) return null;
              const m = new Date(maturityDate);
              if (Number.isNaN(m.getTime())) return null;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              m.setHours(0, 0, 0, 0);
              return m > today ? "Active" : "Closed";
            })();
            const statusTextLower = String(statusText || "").toLowerCase();
            const effectiveLifecycleStatus = (() => {
              if (isCashCar) return null;
              if (isLoanClosed || maturityStatus === "Closed") return "Closed";
              if (maturityStatus === "Active") return "Active";
              if (
                statusTextLower.includes("disburs") ||
                statusTextLower.includes("approved") ||
                statusTextLower.includes("progress") ||
                statusTextLower.includes("pending")
              ) {
                return "Active";
              }
              return "Active";
            })();
            const isClosedByStatus = effectiveLifecycleStatus === "Closed";
            const sourceText = loan?.source || loan?.recordSource || "";
            const sourceNameText = loan?.sourceName || loan?.dealerName || "";
            const loanBookedInMode =
              loan?.approval_loanBookedIn ||
              primary?.loanBookedIn ||
              "Direct Code";
            const brokerOrCorporateDsaName =
              loanBookedInMode === "Indirect Code"
                ? (
                    loan?.approval_brokerName ||
                    primary?.brokerName ||
                    ""
                  ).trim()
                : "";
            const referenceName =
              loan?.reference1?.name || loan?.reference1_name || loan?.reference_name || "";
            const hasFinanceMeta = primaryInterest != null || !!primaryTenureMonths;

            const miniWindowData = getMiniWindow(loan);
            const currentStageIndex = findCurrentStageIndex(loan);
            const missingEmi = !isCashCar && !primaryEmiAmount;
            const missingRegNo = regNo === "Reg no not set";

            return (
              <article
                key={loanKey}
                className="group rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="border-b border-border px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedLoans?.includes(loan?.loanId)}
                        onChange={(e) => onSelectLoan(loan?.loanId, e?.target?.checked)}
                      />
                      <div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {isCashCar ? "Cash Sale" : "Loan"}
                          </span>
                          <span className="rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
                            {caseTypeLabel}
                          </span>
                          <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[12px] font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                            {formatLoanId(loan?.loan_number || loan?.loanId)}
                          </span>
                          {!isCashCar && hasDisplayValue(primaryBankName) && (
                            <span className="rounded-full border border-fuchsia-300 bg-fuchsia-50 px-2.5 py-1 text-[11px] font-bold text-fuchsia-700 dark:border-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-300">
                              {primaryBankName}
                            </span>
                          )}
                          {!isCashCar && hasDisplayValue(disbursementLabel) && (
                            <span className="rounded-full border border-cyan-300 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300">
                              Disb: {disbursementLabel}
                            </span>
                          )}
                          {!isCashCar && !isClosedByStatus && !!principalOutstanding && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setClosureLoan({
                                  loanId:
                                    loan?.loan_number ||
                                    loan?.loanId ||
                                    loan?._id ||
                                    null,
                                  customerName: loan?.customerName || "Loan",
                                  principalOutstanding,
                                  disbursedAmount: primaryLoanAmount,
                                  interestRate: primaryInterest,
                                  tenureMonths: primaryTenureMonths,
                                  firstEmiDate: firstEmiDateForClosure,
                                });
                              }}
                              className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/55"
                              title="Open Approx Closure"
                            >
                              Live POS: {formatINR(principalOutstanding)}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusTheme(statusText)}`}>
                        {statusText}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {loan?.currentStage || "profile"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <section className="grid grid-cols-1 gap-2 lg:grid-cols-5">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/60">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Customer</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {hasDisplayValue(loan?.customerName) ? loan.customerName : "Customer"}
                      </p>
                      {hasDisplayValue(loan?.primaryMobile) && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">{loan.primaryMobile}</p>
                      )}
                      {hasDisplayValue(customerAddress) && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{customerAddress}</p>
                      )}
                      {hasDisplayValue(customerCity) && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{customerCity}</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-2 dark:border-sky-900/70 dark:bg-sky-950/40">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">Vehicle</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{carTitle}</p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">{variant}</p>
                      <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 truncate">Reg: {regNo}</p>
                    </div>

                    <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50/80 p-2 dark:border-fuchsia-900/70 dark:bg-fuchsia-950/40">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-700 dark:text-fuchsia-300">Finance</p>
                      <p className="text-[11px] text-slate-700 dark:text-slate-200">Loan: <span className="font-semibold">{formatCurrency(primaryLoanAmount)}</span></p>
                      {!!primaryEmiAmount && (
                        <p className="text-[11px] text-slate-700 dark:text-slate-200">EMI: <span className="font-semibold">{formatINR(primaryEmiAmount)}</span></p>
                      )}
                      {!isCashCar && hasFinanceMeta && (
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
                          {primaryInterest != null ? `ROI ${primaryInterest}%` : ""}{primaryInterest != null && primaryTenureMonths ? " · " : ""}{primaryTenureMonths ? `${primaryTenureMonths}m` : ""}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {!isCashCar && effectiveLifecycleStatus && (
                          <span
                            className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              effectiveLifecycleStatus === "Closed"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                            }`}
                          >
                            {effectiveLifecycleStatus}
                          </span>
                        )}
                        {otherBanks.length > 0 && (
                          <button
                            type="button"
                            className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                            onClick={() => onShowOtherBanks && onShowOtherBanks(loan, otherBanks)}
                          >
                            +{otherBanks.length} banks
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/60">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Sourcing</p>
                      {hasDisplayValue(sourceText) && (
                        <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{sourceText}</p>
                      )}
                      {hasDisplayValue(sourceNameText) && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{sourceNameText}</p>
                      )}
                      {hasDisplayValue(brokerOrCorporateDsaName) && (
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
                          Broker/Corporate DSA: {brokerOrCorporateDsaName}
                        </p>
                      )}
                      {hasDisplayValue(showroomName) && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {showroomFieldLabel}: {showroomName}
                        </p>
                      )}
                      {hasDisplayValue(referenceName) && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Ref: {referenceName}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-left transition-colors hover:border-slate-300 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-900/80"
                      onClick={() => setTimelineLoan(loan)}
                      title="View full timeline"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        Timeline
                      </p>
                      <div className="relative mt-1.5 min-h-[56px]">
                        <div className="absolute bottom-1 left-[7px] top-1 w-px bg-slate-300 dark:bg-slate-700" />
                        {miniWindowData.steps.map((step, idx) => {
                          if (!step) {
                            return (
                              <div
                                key={`empty-${idx}`}
                                className="grid min-h-[16px] items-center gap-2"
                                style={{ gridTemplateColumns: "14px 1fr" }}
                              >
                                <span className="relative z-10 mx-auto block h-2.5 w-2.5 rounded-full border border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800" />
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">—</span>
                              </div>
                            );
                          }
                          const isCurrent = step.key === miniWindowData.currentKey;
                          return (
                            <div
                              key={step.key || `step-${idx}`}
                              className={`grid min-h-[16px] items-center gap-2 ${isCurrent ? "" : "opacity-80"}`}
                              style={{ gridTemplateColumns: "14px 1fr" }}
                            >
                              <span
                                className={`relative z-10 rounded-full border ${
                                  isCurrent
                                    ? "h-2.5 w-2.5 border-amber-500 bg-amber-500"
                                    : step.date
                                      ? "h-2.5 w-2.5 border-emerald-500 bg-emerald-500"
                                      : "h-2.5 w-2.5 border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800"
                                } mx-auto block`}
                              />
                              <span className={`max-w-[130px] truncate text-[10px] ${isCurrent ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        Stage {currentStageIndex + 1}/{STAGES.length}
                      </p>
                    </button>
                  </section>

                  <section className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {missingEmi && (
                        <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                          EMI missing
                        </span>
                      )}
                      {missingRegNo && (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                          Reg no missing
                        </span>
                      )}
                      <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Reg City: {regCity}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      <Tooltip title="View loan details" placement="top">
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-sky-100 text-sky-700 border border-sky-200 hover:bg-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800"
                          onClick={() => onLoanClick(loan, "view")}
                        >
                          <Icon name="Eye" size={12} />
                        </button>
                      </Tooltip>
                      <Tooltip title="Open documents" placement="top">
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          onClick={() => setDocumentsLoan(loan)}
                        >
                          <Icon name="FolderOpen" size={12} />
                        </button>
                      </Tooltip>
                      <Tooltip title="Edit case" placement="top">
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          onClick={() => onLoanClick(loan, "edit")}
                        >
                          <Icon name="Edit" size={12} />
                        </button>
                      </Tooltip>
                      <Tooltip title="Share case link" placement="top">
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          onClick={() => onShareLoan?.(loan)}
                        >
                          <Icon name="Share2" size={12} />
                        </button>
                      </Tooltip>
                      <Tooltip title="Update status" placement="top">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
                          onClick={() => onUpdateStatus?.(loan)}
                        >
                          <Icon name="Flag" size={12} /> Update
                        </button>
                      </Tooltip>
                      <Tooltip
                        title={
                          pendencyCount > 0 ? `Pending: ${pendingSteps.join(", ")}` : "No pendency"
                        }
                        placement="top"
                      >
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            pendencyCount > 0
                              ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                              : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                          onClick={() => setPendencyLoan(loan)}
                        >
                          <Icon name="AlertTriangle" size={12} /> Pendency {pendencyCount > 0 ? `(${pendencyCount})` : ""}
                        </button>
                      </Tooltip>
                      <Tooltip title="Internal notes" placement="top">
                        <button
                          type="button"
                          className={`w-7 h-7 flex items-center justify-center rounded-full border ${
                            loan.loan_notes
                              ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          }`}
                          onClick={() => onNotesClick?.(loan)}
                        >
                          <Icon name="StickyNote" size={12} />
                        </button>
                      </Tooltip>
                      {userRole === "admin" && (
                        <Tooltip title="Delete case" placement="top">
                          <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                            onClick={() => onDeleteLoan?.(loan)}
                          >
                            <Icon name="Trash2" size={12} />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </section>
                </div>
              </article>
            );
          })}
        </div>

        {!loading && (totalCount || 0) > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            <div>
              Showing{" "}
              <span className="font-semibold text-foreground">
                {Math.min((currentPage - 1) * pageSize + 1, totalCount || 0)}
              </span>{" "}
              -{" "}
              <span className="font-semibold text-foreground">
                {Math.min(currentPage * pageSize, totalCount || 0)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{totalCount || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                iconName="ChevronLeft"
                disabled={currentPage <= 1}
                onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
              >
                Prev
              </Button>
              <span className="px-2 text-foreground font-medium">
                {currentPage}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                iconName="ChevronRight"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <LoanDocumentsModal
        loan={documentsLoan}
        open={!!documentsLoan}
        onClose={() => setDocumentsLoan(null)}
        onUploadComplete={() => {
          onRefreshLoans?.();
        }}
      />
      <ApproxClosureModal
        open={!!closureLoan}
        data={closureLoan}
        onClose={() => setClosureLoan(null)}
      />

      {pendencyLoan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setPendencyLoan(null)}
        >
          <div
            className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-base font-bold text-foreground tracking-tight">Loan Pendency</span>
                <span className="text-xs text-muted-foreground">
                  {pendencyLoan.customerName || "Customer"} · {formatLoanId(pendencyLoan.loanId || pendencyLoan.loan_number)}
                </span>
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                onClick={() => setPendencyLoan(null)}
                title="Close"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
            <PendencyTracker singleLoan={pendencyLoan} />
          </div>
        </div>
      )}

      {timelineLoan && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setTimelineLoan(null)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-bold text-foreground tracking-tight">Loan Timeline</span>
                <span className="text-xs text-muted-foreground">
                  {timelineLoan.customerName || "Customer"} · {formatLoanId(timelineLoan.loanId || timelineLoan.loan_number)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Stage {findCurrentStageIndex(timelineLoan) + 1}/{STAGES.length}
                </span>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => setTimelineLoan(null)}
                  title="Close"
                >
                  <Icon name="X" size={16} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="relative rounded-xl border border-border bg-background px-3 py-3">
                <div className="space-y-0">
                  {(() => {
                    const currentIndex = findCurrentStageIndex(timelineLoan);
                    const currentStageKey = STAGES[currentIndex]?.key;
                    const timelineSteps = buildTimeline(timelineLoan);
                    return timelineSteps.map((step, idx) => {
                      const isCurrent = currentStageKey === step.key;
                      const isDone = step.date != null;
                      const isFirst = idx === 0;
                      const isLast = idx === timelineSteps.length - 1;

                      return (
                        <div
                          key={step.key}
                          className="grid items-start gap-3 py-1"
                          style={{ gridTemplateColumns: "24px 1fr" }}
                        >
                          <div className="relative z-10 h-9 w-6">
                            {!isFirst && (
                              <span className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 bg-border" />
                            )}
                            {!isLast && (
                              <span className="absolute left-1/2 top-1/2 h-1/2 w-px -translate-x-1/2 bg-border" />
                            )}
                            <span
                              className={`absolute left-1/2 top-1/2 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                                isCurrent
                                  ? "border-amber-500 bg-amber-500"
                                  : isDone
                                    ? "border-emerald-500 bg-emerald-500"
                                    : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
                              }`}
                            />
                          </div>
                          <div
                            className={`rounded-lg border px-3 py-2 ${
                              isCurrent
                                ? "border-amber-300 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/25"
                                : isDone
                                  ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/25"
                                  : "border-border bg-card"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className={`truncate text-sm ${isCurrent ? "font-semibold text-foreground" : "text-foreground/90"}`}>
                                {step.label}
                              </p>
                              <span
                                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                  isCurrent
                                    ? "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
                                    : isDone
                                      ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                                      : "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                }`}
                              >
                                {isCurrent ? "Current" : isDone ? "Done" : "Pending"}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {step.date ? new Date(step.date).toLocaleDateString("en-IN") : "Date not available"}
                            </p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoansDataGrid;
