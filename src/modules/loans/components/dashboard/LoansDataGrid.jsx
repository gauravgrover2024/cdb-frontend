import React, { useMemo, useState } from "react";
import { Tooltip } from "antd";
import PendencyTracker from "../pendency/PendencyTracker";
import LoanDocumentsModal from "./LoanDocumentsModal";
import Icon from "../../../../components/AppIcon";
import Button from "../../../../components/ui/Button";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { formatINR } from "../../../../utils/currency";

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

// Map your real fields to the stages (support multiple possible field names from API)
const buildRawTimeline = (loan) => ({
  customerProfile: loan?.receivingDate || loan?.createdAt || null,
  prefileCompletion: loan?.__postfileSeeded
    ? loan?.postfile_approvalDate || null
    : null,
  loginToBank: loan?.approval_approvalDate || null,
  approval: loan?.approval_approvalDate || null,
  postfileCompletion: loan?.__deliveryInitialized
    ? loan?.postfile_approvalDate || null
    : null,
  disbursement: loan?.disbursement_date || loan?.approval_disbursedDate || null,
  documentsCollected: loan?.docs_collected_at || null,
  insurance: loan?.insurance_done_at || null,
  invoice: loan?.invoice_done_at || loan?.invoice_received_date || null,
  vehicleDelivery: loan?.delivery_done_at || null,
  rc: loan?.rc_received_at || loan?.rc_received_date || null,
});

const buildTimeline = (loan) => {
  const raw = buildRawTimeline(loan);
  return STAGES.map((s) => {
    const ts = raw[s.key];
    return {
      ...s,
      date: ts ? new Date(ts) : null,
    };
  });
};

const findCurrentStageIndex = (loan) => {
  const steps = buildTimeline(loan);
  // last stage with a date
  let lastDone = -1;
  steps.forEach((s, i) => {
    if (s.date) lastDone = i;
  });
  if (lastDone !== -1) return lastDone;

  // fallback to currentStage text
  const cs = (loan?.currentStage || "").toLowerCase();
  const byStage = steps.findIndex((s) => s.label.toLowerCase().includes(cs));
  return byStage !== -1 ? byStage : 0;
};

// Only previous, current (center), next
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

const LoansDataGrid = ({
  loans,
  selectedLoans,
  onSelectLoan,
  onSelectAll,
  onLoanClick,
  onBulkAction,
  onDeleteLoan,
  userRole,
  loading,
  onUploadDocuments,
  onUpdateStatus,
  onShareLoan,
  onPendencyClick,
  onShowOtherBanks,
  onRefreshLoans,
  onNotesClick,
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });
  const [timelineLoan, setTimelineLoan] = useState(null);
  const [pendencyLoan, setPendencyLoan] = useState(null);
  const [documentsLoan, setDocumentsLoan] = useState(null);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev?.key === key && prev?.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortableValue = (loan, key) => {
    switch (key) {
      case "loanId":
        return loan?.loanId || loan?.loan_number || "";
      case "customer":
        return loan?.customerName || "";
      case "mobile":
        return loan?.primaryMobile || "";
      case "email":
        return loan?.email || "";
      case "city":
        return loan?.city || loan?.permanentCity || "";
      case "vehicle":
        return `${loan?.vehicleMake || ""} ${loan?.vehicleModel || ""}`;
      case "vehicleVariant":
        return loan?.vehicleVariant || "";
      case "typeOfLoan":
        return loan?.typeOfLoan || loan?.loanType || "";
      case "loanAmount": {
        const banks = loan?.approval_banksData || [];
        const primary =
          banks.find((b) => b.status === "Disbursed") ||
          banks.find((b) => b.status === "Approved") ||
          banks[0];
        return (
          primary?.loanAmount ||
          loan?.approval_loanAmountDisbursed ||
          loan?.approval_loanAmountApproved ||
          loan?.financeExpectation ||
          0
        );
      }
      case "bank": {
        const banksList = loan?.approval_banksData || [];
        const primaryBank =
          banksList.find((b) => b.status === "Disbursed") ||
          banksList.find((b) => b.status === "Approved") ||
          banksList[0];
        return primaryBank?.bankName || loan?.approval_bankName || "";
      }
      case "interest": {
        const banksInterest = loan?.approval_banksData || [];
        const primaryInt =
          banksInterest.find((b) => b.status === "Disbursed") ||
          banksInterest.find((b) => b.status === "Approved") ||
          banksInterest[0];
        return primaryInt?.interestRate ?? loan?.approval_roi ?? 0;
      }
      case "tenure": {
        const banksTenure = loan?.approval_banksData || [];
        const primaryTen =
          banksTenure.find((b) => b.status === "Disbursed") ||
          banksTenure.find((b) => b.status === "Approved") ||
          banksTenure[0];
        return (
          primaryTen?.tenure ||
          loan?.approval_tenureMonths ||
          loan?.loanTenureMonths ||
          0
        );
      }
      case "reference":
        return loan?.reference1?.name || "";
      case "source":
        return loan?.source || loan?.recordSource || "";
      case "sourceName":
        return loan?.sourceName || "";
      case "dealer":
        return loan?.dealerName || "";
      case "aging":
        return loan?.aging ?? 0;
      case "createdAt":
        return loan?.createdAt ? new Date(loan.createdAt).getTime() : 0;
      default:
        return "";
    }
  };

  const sortedLoans = useMemo(() => {
    if (!sortConfig.key) return loans || [];

    const sorted = [...(loans || [])].sort((a, b) => {
      const aValue = getSortableValue(a, sortConfig.key);
      const bValue = getSortableValue(b, sortConfig.key);

      // Handle different types
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

      // String comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [loans, sortConfig]);

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "Cash Sale";
    return formatINR(amount);
  };

  const formatLoanId = (id) => {
    if (!id) return "Loan number not set";
    if (id.length > 12) {
      return `${id.slice(0, 6)}…${id.slice(-4)}`;
    }
    return id;
  };

  const allChecked =
    selectedLoans?.length === loans?.length && loans?.length > 0;
  const someChecked =
    selectedLoans?.length > 0 && selectedLoans?.length < loans?.length;

  // Calculate pendencyCount and pending step names for each loan
  const getPendingSteps = (loan) => {
    const steps = [
      {
        label: "Profile Created",
        completed: !!(loan.createdAt || loan.receivingDate),
      },
      {
        label: "Disbursement",
        completed: !!(loan.approval_disbursedDate || loan.disbursement_date),
      },
      { label: "RC Received", completed: !!loan.rc_received_date },
      { label: "Invoice Received", completed: !!loan.invoice_received_date },
      { label: "Loan Number Assigned", completed: !!loan.loan_number },
    ];
    return steps.filter((s) => !s.completed).map((s) => s.label);
  };

  // Add pendencyCount and pendingSteps to each loan
  const loansWithPendency = useMemo(() => {
    return (loans || []).map((loan) => {
      const pendingSteps = getPendingSteps(loan);
      return {
        ...loan,
        pendencyCount: pendingSteps.length,
        pendingSteps,
      };
    });
  }, [loans]);

  return (
    <div className="h-full flex flex-col bg-card rounded-2xl border border-border overflow-hidden">
      {/* Top bar */}
      <div className="">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          {selectedLoans?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                iconName="FileDown"
                onClick={() => onBulkAction("export")}
              >
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="Send"
                onClick={() => onBulkAction("dispatch")}
              >
                Dispatch
              </Button>
              {userRole === "admin" && (
                <Button
                  variant="default"
                  size="sm"
                  iconName="CheckCircle2"
                  onClick={() => onBulkAction("approve")}
                >
                  Approve
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur border-b border-border">
            <tr>
              <th className="p-3 text-left w-[44px]">
                <Checkbox
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={(e) => onSelectAll(e?.target?.checked)}
                />
              </th>
              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <button
                  onClick={() => handleSort("loanId")}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Loan No.
                  {sortConfig?.key === "loanId" && (
                    <Icon
                      name={
                        sortConfig?.direction === "asc"
                          ? "ChevronUp"
                          : "ChevronDown"
                      }
                      size={14}
                    />
                  )}
                </button>
              </th>
              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <button
                  onClick={() => handleSort("customer")}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Customer
                  {sortConfig?.key === "customer" && (
                    <Icon
                      name={
                        sortConfig?.direction === "asc"
                          ? "ChevronUp"
                          : "ChevronDown"
                      }
                      size={14}
                    />
                  )}
                </button>
              </th>
              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <button
                  onClick={() => handleSort("vehicle")}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Vehicle
                  {sortConfig?.key === "vehicle" && (
                    <Icon
                      name={
                        sortConfig?.direction === "asc"
                          ? "ChevronUp"
                          : "ChevronDown"
                      }
                      size={14}
                    />
                  )}
                </button>
              </th>
              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <button
                  onClick={() => handleSort("loanAmount")}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Loan Details
                  {sortConfig?.key === "loanAmount" && (
                    <Icon
                      name={
                        sortConfig?.direction === "asc"
                          ? "ChevronUp"
                          : "ChevronDown"
                      }
                      size={14}
                    />
                  )}
                </button>
              </th>
              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <button
                  onClick={() => handleSort("source")}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Reference &amp; Source
                  {sortConfig?.key === "source" && (
                    <Icon
                      name={
                        sortConfig?.direction === "asc"
                          ? "ChevronUp"
                          : "ChevronDown"
                      }
                      size={14}
                    />
                  )}
                </button>
              </th>
              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <button
                  onClick={() => handleSort("aging")}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Timeline
                  {sortConfig?.key === "aging" && (
                    <Icon
                      name={
                        sortConfig?.direction === "asc"
                          ? "ChevronUp"
                          : "ChevronDown"
                      }
                      size={14}
                    />
                  )}
                </button>
              </th>
              <th className="p-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-[220px]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedLoans?.slice(0, 50).map((loan, index) => {
              // Use loansWithPendency to get pendencyCount and pendingSteps
              const loanWithPendency = loansWithPendency.find(
                (l) => l.loanId === loan.loanId || l._id === loan._id,
              );
              const pendencyCount = loanWithPendency?.pendencyCount || 0;
              const pendingSteps = loanWithPendency?.pendingSteps || [];

              // Unique key: prefer stable id, fallback to index
              const loanKey =
                loan?._id ||
                loan?.loanId ||
                loan?.loan_number ||
                `loan-${index}`;

              // customer
              const customerName =
                loan?.customerName || "Customer name not set";
              const mobile = loan?.primaryMobile || "Mobile not set";
              const email = loan?.email || "Email not set";
              const address =
                loan?.residenceAddress ||
                loan?.permanentAddress ||
                "Address not available";
              const cityLine =
                loan?.city || loan?.permanentCity || loan?.pincode
                  ? `${loan?.city || loan?.permanentCity || ""}${
                      loan?.pincode || loan?.permanentPincode
                        ? ` · ${loan?.pincode || loan?.permanentPincode}`
                        : ""
                    }`
                  : "";

              // vehicle
              const fullCarName = `${loan?.vehicleMake || ""} ${
                loan?.vehicleModel || ""
              }`.trim();
              const carTitle = fullCarName || "Vehicle not selected";
              const variant = loan?.vehicleVariant || "Variant not set";
              const regNo = loan?.postfile_regd_city
                ? `${loan.postfile_regd_city} (Regn. city)`
                : "Registration not set";
              const typeOfLoan = loan?.typeOfLoan || "Loan type not set";

              // banks
              const banks = loan?.approval_banksData || [];
              const primary =
                banks.find((b) => b.status === "Disbursed") ||
                banks.find((b) => b.status === "Approved") ||
                banks[0];

              const primaryBankName =
                primary?.bankName || loan?.approval_bankName || "Bank not set";
              const primaryLoanAmount =
                typeof primary?.loanAmount === "number"
                  ? primary.loanAmount
                  : loan?.approval_loanAmountDisbursed ||
                    loan?.approval_loanAmountApproved ||
                    loan?.financeExpectation ||
                    0;
              const primaryInterest =
                typeof primary?.interestRate === "number"
                  ? primary.interestRate
                  : loan?.approval_roi;
              const primaryTenureMonths =
                primary?.tenure ||
                loan?.approval_tenureMonths ||
                loan?.loanTenureMonths;

              const otherBanks = banks.filter(
                (b) => primary && b?.id !== primary.id,
              );
              const moreBanksCount = otherBanks.length;

              const loanAmountLabel = formatCurrency(primaryLoanAmount);
              const interestLabel =
                primaryInterest != null
                  ? `${primaryInterest}%`
                  : "Interest not set";
              const tenureLabel =
                primaryTenureMonths != null
                  ? `${primaryTenureMonths} months`
                  : "Tenure not set";

              // reference & source
              const referenceName =
                loan?.reference1?.name || "Reference not set";
              const source =
                loan?.source || loan?.recordSource || "Source not set";
              const sourceName = loan?.sourceName || "Source name not set";
              const showroomName = loan?.dealerName || "Showroom not set";
              const contactPerson =
                loan?.dealerContactPerson || "Contact person not set";

              // FIX: Get mini window data without causing re-renders
              const miniWindowData = getMiniWindow(loan);

              return (
                <tr
                  key={loanKey}
                  className="border-b border-border hover:bg-muted/40 transition-colors cursor-pointer align-top"
                  onClick={() => setDocumentsLoan(loan)}
                >
                  {/* checkbox */}
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedLoans?.includes(loan?.loanId)}
                      onChange={(e) =>
                        onSelectLoan(loan?.loanId, e?.target?.checked)
                      }
                    />
                  </td>

                  {/* Loan No */}
                  <td className="p-3 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground">
                        {formatLoanId(loan?.loanId || loan?.loan_number)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {loan?.createdAt
                          ? new Date(loan.createdAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "Created date not set"}
                      </span>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="p-3 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground">
                        {customerName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {mobile}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {email}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {address}
                      </span>
                      {cityLine && (
                        <span className="text-[11px] text-muted-foreground">
                          {cityLine}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Vehicle */}
                  <td className="p-3 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground">
                        {carTitle}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {variant}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {regNo}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {typeOfLoan}
                      </span>
                    </div>
                  </td>

                  {/* Loan Details */}
                  <td className="p-3 align-top">
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="font-semibold text-foreground">
                        Loan Amount – {loanAmountLabel}
                      </span>
                      <span className="text-muted-foreground">
                        {primaryBankName}
                      </span>
                      <span className="text-muted-foreground">
                        Interest – {interestLabel}
                      </span>
                      <span className="text-muted-foreground">
                        Tenure – {tenureLabel}
                      </span>

                      {moreBanksCount > 0 && (
                        <button
                          type="button"
                          className="mt-1 text-[11px] text-primary underline underline-offset-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShowOtherBanks &&
                              onShowOtherBanks(loan, otherBanks);
                          }}
                        >
                          + {moreBanksCount} more bank
                          {moreBanksCount > 1 ? "s" : ""}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Reference & Source */}
                  <td className="p-3 align-top">
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="text-muted-foreground">
                        Reference – {referenceName}
                      </span>
                      <span className="text-muted-foreground">
                        Source – {source}
                      </span>
                      <span className="text-muted-foreground">
                        Source Name – {sourceName}
                      </span>
                      <span className="text-muted-foreground">
                        Showroom – {showroomName}
                      </span>
                      <span className="text-muted-foreground">
                        Contact – {contactPerson}
                      </span>
                    </div>
                  </td>

                  {/* Mini vertical timeline (prev / current / next) */}
                  <td className="p-3 align-top">
                    <button
                      type="button"
                      className="w-full text-left rounded-lg border border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-colors p-2.5 group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTimelineLoan(loan);
                      }}
                      title="View full timeline"
                    >
                      <div className="relative flex flex-col gap-1.5 pl-3 min-h-[52px]">
                        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border group-hover:bg-primary/30 transition-colors" />
                        {miniWindowData.steps.map((step, idx) => {
                          if (!step) {
                            return (
                              <div
                                key={`empty-${idx}`}
                                className="flex items-center gap-2 min-h-[14px]"
                              >
                                <span className="w-2 h-2 rounded-full bg-muted-foreground/20 flex-shrink-0" />
                                <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                                  —
                                </span>
                              </div>
                            );
                          }
                          const isCurrent =
                            step.key === miniWindowData.currentKey;
                          return (
                            <div
                              key={step.key || `placeholder-${idx}`}
                              className={`flex items-center gap-2 min-h-[14px] ${isCurrent ? "" : "opacity-75"}`}
                            >
                              <span
                                className={`relative z-10 flex-shrink-0 rounded-full border-2 ${
                                  isCurrent
                                    ? "w-2.5 h-2.5 bg-primary border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]"
                                    : step.date
                                      ? "w-2 h-2 bg-primary/60 border-primary/40"
                                      : "w-2 h-2 bg-muted border-border"
                                }`}
                              />
                              <span
                                className={`text-[11px] truncate max-w-[100px] ${
                                  isCurrent
                                    ? "font-semibold text-foreground"
                                    : step.date
                                      ? "text-muted-foreground"
                                      : "text-muted-foreground/70"
                                }`}
                                title={
                                  step.label +
                                  (step.date
                                    ? ` · ${new Date(
                                        step.date,
                                      ).toLocaleDateString("en-IN")}`
                                    : "")
                                }
                              >
                                {step.label || "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  </td>

                  {/* Actions */}
                  <td
                    className="p-3 align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col items-end gap-1.5">
                      {/* Row 1 – icons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="View loan details"
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLoanClick(loan, "view");
                          }}
                        >
                          <Icon name="Eye" size={12} />
                        </button>
                        <button
                          type="button"
                          title="Documents – present & pending"
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-foreground border border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocumentsLoan(loan);
                          }}
                        >
                          <Icon name="FolderOpen" size={12} />
                        </button>

                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-foreground border border-border hover:bg-background"
                          onClick={() => onLoanClick(loan, "edit")}
                        >
                          <Icon name="Edit" size={12} />
                        </button>
                        <button
                          type="button"
                          title="Share loan link"
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-foreground border border-border hover:bg-background"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShareLoan?.(loan);
                          }}
                        >
                          <Icon name="Share2" size={12} />
                        </button>

                        {userRole === "admin" && (
                          <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-error/5 text-error border border-error/20 hover:bg-error/10"
                            onClick={() => onDeleteLoan?.(loan)}
                          >
                            <Icon name="Trash2" size={12} />
                          </button>
                        )}

                        <button
                          type="button"
                          title="Internal Notes"
                          className={`w-7 h-7 flex items-center justify-center rounded-full border transition-all ${
                            loan.loan_notes
                              ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
                              : "bg-muted text-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onNotesClick?.(loan);
                          }}
                        >
                          <Icon name="StickyNote" size={12} />
                        </button>
                      </div>

                      {/* Row 2 – Update Status */}
                      <button
                        type="button"
                        title="Update approval status"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-foreground border border-border hover:bg-background"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateStatus?.(loan);
                        }}
                      >
                        <Icon name="Flag" size={11} />
                        Update status
                      </button>

                      {/* Row 3 – Pendency */}
                      <Tooltip
                        title={
                          pendencyCount > 0
                            ? `Pending: ${pendingSteps.join(", ")}`
                            : "No pendency"
                        }
                        placement="top"
                      >
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-border hover:bg-background relative ${
                            pendencyCount > 0
                              ? "bg-warning/10 text-warning border-warning/20"
                              : "bg-muted text-foreground"
                          }`}
                          onClick={() => setPendencyLoan(loan)}
                        >
                          <Icon name="AlertTriangle" size={11} />
                          Pendency
                          {pendencyCount > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-warning text-white text-[10px] font-bold animate-pulse">
                              {pendencyCount}
                            </span>
                          )}
                        </button>
                      </Tooltip>
                      {/* Pendency Modal */}
                      {pendencyLoan && (
                        <div
                          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                          onClick={() => setPendencyLoan(null)}
                        >
                          <div
                            className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border p-6 relative animate-fadeIn"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex flex-col">
                                <span className="text-base font-bold text-foreground tracking-tight">
                                  Loan Pendency
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {pendencyLoan.customerName || "Customer"} ·{" "}
                                  {formatLoanId(
                                    pendencyLoan.loanId ||
                                      pendencyLoan.loan_number,
                                  )}
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
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Loan Documents modal - single instance outside row map */}
        <LoanDocumentsModal
          loan={documentsLoan}
          open={!!documentsLoan}
          onClose={() => setDocumentsLoan(null)}
          onUploadComplete={() => {
            onRefreshLoans?.();
          }}
        />

        {loading && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Loading loans...
          </div>
        )}

        {!loading && loans?.length === 0 && (
          <div className="text-center py-14">
            <Icon
              name="FileText"
              size={46}
              className="text-muted-foreground mx-auto mb-4"
            />
            <p className="text-base font-semibold text-foreground">
              No loans found
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new loan to get started
            </p>
          </div>
        )}
      </div>

      {/* Timeline popup */}
      {timelineLoan && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setTimelineLoan(null)}
        >
          <div
            className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-bold text-foreground tracking-tight">
                  Loan Timeline
                </span>
                <span className="text-xs text-muted-foreground">
                  {timelineLoan.customerName || "Customer"} ·{" "}
                  {formatLoanId(
                    timelineLoan.loanId || timelineLoan.loan_number,
                  )}
                </span>
              </div>
              <button
                type="button"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-background border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                onClick={() => setTimelineLoan(null)}
                title="Close"
              >
                <Icon name="X" size={18} />
              </button>
            </div>
            {/* body */}
            <div className="flex-1 overflow-y-auto p-5 min-h-0">
              <div className="relative pl-6">
                {/* vertical spine */}
                <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border rounded-full" />
                <div className="space-y-3">
                  {buildTimeline(timelineLoan).map((step) => {
                    const currentIndex = findCurrentStageIndex(timelineLoan);
                    const currentStageKey = STAGES[currentIndex]?.key;
                    const isCurrent = currentStageKey === step.key;
                    const isDone = step.date != null;

                    return (
                      <div key={step.key} className="relative flex gap-4">
                        {/* node dot - aligned to card center */}
                        <div className="relative z-10 flex-shrink-0 flex items-center justify-center w-6 h-8">
                          <div
                            className={`w-3 h-3 rounded-full border-2 transition-all ${
                              isCurrent
                                ? "border-primary bg-primary ring-4 ring-primary/20"
                                : isDone
                                  ? "border-primary bg-primary/80"
                                  : "border-border bg-muted"
                            }`}
                          />
                        </div>
                        {/* card */}
                        <div
                          className={`flex-1 min-w-0 rounded-xl border px-4 py-3 transition-all ${
                            isCurrent
                              ? "border-primary bg-primary/5 shadow-sm"
                              : isDone
                                ? "border-border bg-background"
                                : "border-dashed border-border bg-muted/20"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isCurrent
                                  ? "text-primary"
                                  : isDone
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {step.label}
                              {isCurrent && (
                                <span className="ml-1.5 text-xs font-semibold text-primary opacity-90">
                                  (Current)
                                </span>
                              )}
                            </span>
                            {step.date ? (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {step.date.toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                                <span className="ml-1 opacity-80">
                                  {step.date.toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/80">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-semibold">
              {Math.min(50, sortedLoans?.length || 0)}
            </span>{" "}
            of <span className="font-semibold">{sortedLoans?.length || 0}</span>{" "}
            loan(s)
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" iconName="ChevronLeft" disabled>
              Previous
            </Button>
            <Button variant="default" size="sm">
              1
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconName="ChevronRight"
              disabled
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoansDataGrid;
