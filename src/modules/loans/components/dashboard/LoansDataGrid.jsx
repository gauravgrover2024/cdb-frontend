import React, { useMemo, useState } from "react";
import Icon from "../../../../components/AppIcon";
import Button from "../../../../components/ui/Button";
import { Checkbox } from "../../../../components/ui/Checkbox";

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

// Map your real fields to the stages
const buildRawTimeline = (loan) => ({
  customerProfile: loan?.receivingDate || null,
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
  invoice: loan?.invoice_done_at || null,
  vehicleDelivery: loan?.delivery_done_at || null,
  rc: loan?.rc_received_at || null,
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

// Only previous, current, next
const getMiniWindow = (loan) => {
  const steps = buildTimeline(loan);
  const current = findCurrentStageIndex(loan);
  const prevIndex = Math.max(0, current - 1);
  const nextIndex = Math.min(steps.length - 1, current + 1);
  const windowIndexes = [prevIndex, current, nextIndex].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );
  return {
    steps: windowIndexes.map((i) => steps[i]),
    currentKey: steps[current].key,
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
  onPendencyClick,
  onShowOtherBanks,
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: "aging",
    direction: "desc",
  });
  const [timelineLoan, setTimelineLoan] = useState(null);

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "approved":
      case "disbursed":
      case "completed":
        return "bg-success/10 text-success border-success/20";
      case "in progress":
        return "bg-primary/10 text-primary border-primary/20";
      case "pending":
        return "bg-warning/10 text-warning border-warning/20";
      case "rejected":
        return "bg-error/10 text-error border-error/20";
      case "on hold":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getAgingColor = (days) => {
    if (days <= 7) return "text-success";
    if (days <= 15) return "text-primary";
    if (days <= 30) return "text-warning";
    return "text-error";
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev?.key === key && prev?.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedLoans = useMemo(() => {
    return [...(loans || [])].sort((a, b) => {
      if (sortConfig?.key === "aging") {
        return sortConfig?.direction === "asc"
          ? (a?.aging || 0) - (b?.aging || 0)
          : (b?.aging || 0) - (a?.aging || 0);
      }
      if (sortConfig?.key === "loanAmount") {
        const aAmount =
          a?.approval_loanAmountDisbursed ||
          a?.approval_loanAmountApproved ||
          a?.financeExpectation ||
          0;
        const bAmount =
          b?.approval_loanAmountDisbursed ||
          b?.approval_loanAmountApproved ||
          b?.financeExpectation ||
          0;
        return sortConfig?.direction === "asc"
          ? aAmount - bAmount
          : bAmount - aAmount;
      }
      return 0;
    });
  }, [loans, sortConfig]);

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "Cash Sale";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
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

  return (
    <div className="h-full flex flex-col bg-card rounded-2xl border border-border overflow-hidden">
      {/* Top bar */}
      <div className="px-4 py-3 md:px-5 md:py-4 border-b border-border bg-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center border border-border">
              <Icon name="Table2" size={16} className="text-foreground" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-semibold text-foreground">
                  Cases
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                  {loans?.length || 0}
                </span>
              </div>
              {selectedLoans?.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {selectedLoans.length} selected
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Click any row to preview
                </span>
              )}
            </div>
          </div>

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
                Loan No.
              </th>
              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Customer
              </th>
              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Vehicle
              </th>
              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Loan Details
              </th>
              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Reference &amp; Source
              </th>
              <th className="p-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <button
                  onClick={() => handleSort("aging")}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Aging
                  <Icon
                    name={
                      sortConfig?.key === "aging" &&
                      sortConfig?.direction === "asc"
                        ? "ChevronUp"
                        : "ChevronDown"
                    }
                    size={14}
                  />
                </button>
              </th>
              <th className="p-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-[220px]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedLoans?.map((loan) => {
              const loanKey = loan?.loanId || loan?._id;

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

              const { steps, currentKey } = getMiniWindow(loan);

              return (
                <tr
                  key={loanKey}
                  className="border-b border-border hover:bg-muted/40 transition-colors cursor-pointer align-top"
                  onClick={() => onLoanClick(loan)}
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
                      className="flex items-stretch gap-3 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTimelineLoan(loan);
                      }}
                    >
                      {(() => {
                        const { steps, currentKey } = getMiniWindow(loan);
                        const prev = steps[0];
                        const current = steps[1] || steps[0];
                        const next = steps[2] || steps[steps.length - 1];
                        const miniSteps = [prev, current, next].filter(Boolean);

                        return (
                          <>
                            {/* Spine: tall line, dots will sit centered along it */}
                            <div className="relative flex items-stretch">
                              <div className="w-[2px] h-[80px] bg-border rounded-full" />
                              {/* dots wrapper, distributed vertically */}
                              <div className="absolute inset-0 flex flex-col items-center justify-between py-1.5">
                                {miniSteps.map((step, idx) => {
                                  const isCurrent = step.key === currentKey;
                                  return (
                                    <div
                                      key={step.key}
                                      className="flex items-center justify-center"
                                    >
                                      <div
                                        className={
                                          isCurrent
                                            ? "w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_0_4px_rgba(37,99,235,0.25)] animate-pulse"
                                            : "w-2 h-2 rounded-full bg-muted-foreground/40"
                                        }
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Labels with normal table font size */}
                            <div className="flex flex-col justify-between py-1.5">
                              {miniSteps.map((step) => {
                                const isCurrent = step.key === currentKey;
                                return (
                                  <div
                                    key={step.key}
                                    className={`text-xs text-right max-w-[130px] truncate ${
                                      isCurrent
                                        ? "font-semibold text-foreground"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {step.label}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
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
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                          onClick={() => onLoanClick(loan)}
                        >
                          <Icon name="Eye" size={12} />
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
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-foreground border border-border hover:bg-background"
                          onClick={() =>
                            onUploadDocuments && onUploadDocuments(loan)
                          }
                        >
                          <Icon name="Upload" size={12} />
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
                      </div>

                      {/* Row 2 – Update Status */}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-foreground border border-border hover:bg-background"
                        onClick={() => onUpdateStatus && onUpdateStatus(loan)}
                      >
                        <Icon name="Flag" size={11} />
                        Update status
                      </button>

                      {/* Row 3 – Pendency */}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-foreground border border-border hover:bg-background"
                        onClick={() => onPendencyClick && onPendencyClick(loan)}
                      >
                        <Icon name="AlertTriangle" size={11} />
                        Pendency
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

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
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
          onClick={() => setTimelineLoan(null)}
        >
          <div
            className="w-full max-w-lg bg-card rounded-2xl shadow-xl border border-border p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  Loan timeline
                </span>
                <span className="text-xs text-muted-foreground">
                  {timelineLoan.customerName || "Customer"} ·{" "}
                  {formatLoanId(
                    timelineLoan.loanId || timelineLoan.loan_number,
                  )}
                </span>
              </div>
              <button
                className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-muted-foreground"
                onClick={() => setTimelineLoan(null)}
              >
                <Icon name="X" size={14} />
              </button>
            </div>

            {/* body */}
            <div className="mt-1 max-h-80 overflow-auto pr-2">
              <div className="relative flex">
                {/* vertical spine */}
                <div className="absolute left-3 top-0 bottom-0 w-[2px] bg-border" />

                <div className="flex-1 space-y-3 ml-6">
                  {buildTimeline(timelineLoan).map((step, idx) => {
                    const currentIndex = findCurrentStageIndex(timelineLoan);
                    const isCurrent = STAGES[currentIndex]?.key === step.key;

                    return (
                      <div key={step.key} className="relative flex gap-3">
                        {/* node dot */}
                        <div className="absolute -left-6 top-2 flex items-center justify-center">
                          <div
                            className={`w-3 h-3 rounded-full border-2 ${
                              isCurrent
                                ? "border-primary bg-primary shadow-[0_0_0_4px_rgba(37,99,235,0.25)]"
                                : step.date
                                  ? "border-primary bg-white"
                                  : "border-border bg-muted"
                            }`}
                          />
                        </div>

                        {/* card */}
                        <div className="flex-1 rounded-xl border border-border bg-background px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">
                              {step.label}
                              {isCurrent && (
                                <span className="ml-1 text-[10px] text-primary">
                                  (Current)
                                </span>
                              )}
                            </span>
                            {step.date && (
                              <span className="text-[10px] text-muted-foreground">
                                {step.date.toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {step.date
                              ? step.date.toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Pending"}
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
            Showing <span className="font-semibold">{sortedLoans?.length}</span>{" "}
            loan(s)
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" iconName="ChevronLeft" disabled>
              Previous
            </Button>
            <Button variant="default" size="sm">
              1
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoansDataGrid;
