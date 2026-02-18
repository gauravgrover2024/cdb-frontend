import React, { useCallback, useMemo, useState } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";

// ----------------------------
// Disburse Modal (compact + safe)
// ----------------------------
const DisburseModal = ({ approvedBanks = [], onDisburse, onClose }) => {
  const [selectedBankId, setSelectedBankId] = useState(() => {
    if (approvedBanks?.length === 1) return approvedBanks[0]?.id || null;
    return null;
  });

  const [disbursementDate, setDisbursementDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [remarks, setRemarks] = useState("");

  const formatMoney = (v) => {
    const num = Number(v || 0);
    if (!Number.isFinite(num)) return "—";
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const handleDisburse = () => {
    if (!selectedBankId || !disbursementDate) {
      alert("Please select a bank and disbursement date");
      return;
    }
    if (!remarks || remarks.trim() === "") {
      alert("Please enter disbursement remarks");
      return;
    }
    onDisburse?.(selectedBankId, disbursementDate, remarks);
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-elevation-4 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="CreditCard" size={18} className="text-primary" />
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Disburse Loan
              </div>
              <div className="text-xs text-muted-foreground">
                Select bank + disbursement date
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
            type="button"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Bank selection */}
          {approvedBanks?.length > 1 ? (
            <div>
              <label htmlFor="bank-selection" className="text-xs font-medium text-muted-foreground mb-2 block">
                Approved Banks
              </label>

              <select
                id="bank-selection"
                name="bank-selection"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
                value={selectedBankId || ""}
                onChange={(e) => setSelectedBankId(Number(e.target.value))}
                autoComplete="off"
              >
                <option value="">Select bank</option>
                {approvedBanks.map((bank) => (
                  <option key={bank?.id} value={bank?.id}>
                    {bank?.bankName || "Bank"} • {formatMoney(bank?.loanAmount)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-border bg-muted/20">
              <div className="text-xs text-muted-foreground mb-1">
                Approved Bank
              </div>
              <div className="text-sm font-semibold text-foreground">
                {approvedBanks?.[0]?.bankName || "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Amount: {formatMoney(approvedBanks?.[0]?.loanAmount)}
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label htmlFor="disbursement-date" className="text-xs font-medium text-muted-foreground mb-2 block">
              Disbursement Date
            </label>
              <div className="relative">
                <Icon
                  name="Calendar"
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  id="disbursement-date"
                  name="disbursement-date"
                  type="date"
                  className="w-full border border-border rounded-xl pl-10 pr-3 py-2.5 text-sm bg-background text-foreground"
                  value={disbursementDate}
                  onChange={(e) => setDisbursementDate(e.target.value)}
                  autoComplete="off"
                />
              </div>
          </div>

          {/* Remarks - Mandatory */}
          <div>
            <label htmlFor="disbursement-remarks" className="text-xs font-medium text-muted-foreground mb-2 block">
              Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              id="disbursement-remarks"
              name="disbursement-remarks"
              rows="3"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background resize-none"
              placeholder="Enter disbursement remarks (mandatory)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Warning */}
          <div className="p-3 rounded-xl border border-warning/20 bg-warning/10">
            <div className="flex items-start gap-2">
              <Icon
                name="AlertCircle"
                size={16}
                className="text-warning mt-0.5"
              />
              <div className="text-xs text-warning leading-relaxed">
                This will mark the selected bank as <b>Disbursed</b> and move
                the case to <b>Post-File</b>.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-card">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleDisburse}
            disabled={!selectedBankId || !disbursementDate || !remarks.trim()}
            className="bg-amber-600 dark:bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-700 text-white shadow-lg shadow-amber-600/30"
          >
            <Icon name="CreditCard" size={16} style={{ marginRight: 6 }} />
            Disburse
          </Button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------
// StageFooter (production-ready)
// ----------------------------
const StageFooter = ({
  currentStage,
  isFinanced,
  onSave,
  onSaveAndExit,
  onDiscard,
  onProcessLoan,
  onMoveToApproval,
  onDisburseLoan,
  onMoveToDelivery,
  onMoveToPayout,
  onCloseLead,
  onPrint,
  approvedBanks = [],
  onMoveToPostFile,
  form,
}) => {
  const [showDisburseModal, setShowDisburseModal] = useState(false);

  const isCashCar = isFinanced === "No";
  const loanType = form?.getFieldValue?.("typeOfLoan") || "";
  const isRefinanceOrCashIn = loanType === "Refinance" || loanType === "Car Cash-in";

  const approvalStatus = form?.getFieldValue?.("approval_status") || "";
  const alreadyDisbursed =
    String(approvalStatus || "").toLowerCase() === "disbursed";

  const canDisburse = useMemo(() => {
    // You can adjust this rule later
    // For now: need at least 1 approved bank OR alreadyDisbursed status
    return alreadyDisbursed || (approvedBanks?.length || 0) > 0;
  }, [approvedBanks, alreadyDisbursed]);

  const handleDisburseLoan = useCallback(() => {
    if (!approvedBanks || approvedBanks.length === 0) {
      alert("No approved banks available for disbursement");
      return;
    }
    setShowDisburseModal(true);
  }, [approvedBanks]);

  const handleDisburseConfirm = (bankId, date, remarks) => {
    setShowDisburseModal(false);
    onDisburseLoan?.(bankId, date, remarks);
  };

  const actions = useMemo(() => {
    // Exit button: does not save or discard, just navigates away
    const ExitBtn = (
      <Button
        variant="outline"
        size="sm"
        key="exit-btn"
        onClick={() => {
          if (window.confirm('Are you sure you want to exit? Unsaved data will be lost.')) {
            window.location.href = '/loans';
          }
        }}
        className="border-gray-400 text-gray-500 hover:bg-gray-100"
      >
        <Icon name="LogOut" size={16} style={{ marginRight: 6 }} />
        Exit
      </Button>
    );

    const PrintBtn = (
      <Button 
        variant="outline" 
        size="sm" 
        key="print-btn"
        onClick={onPrint}
        className="border-border dark:border-border/60 hover:bg-muted dark:hover:bg-muted/80"
      >
        <Icon name="Printer" size={16} style={{ marginRight: 6 }} />
        Print
      </Button>
    );

    const DiscardBtn = (
      <Button
        variant="outline"
        size="sm" 
        key="discard-btn"
        onClick={onDiscard}
        className="border-destructive/40 dark:border-destructive/30 text-destructive dark:text-destructive/90 hover:bg-destructive/10 dark:hover:bg-destructive/20"
      >
        <Icon name="X" size={16} style={{ marginRight: 6 }} />
        Discard
      </Button>
    );

    const SaveBtn = (
      <Button 
        variant="default" 
        size="sm" 
        key="save-btn"
        onClick={onSave}
        className="bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30"
      >
        <Icon name="Save" size={16} style={{ marginRight: 6 }} />
        Save
      </Button>
    );

    switch (currentStage) {
      case "profile":
        return (
          <>
            {PrintBtn}
            {SaveBtn}
            {ExitBtn}
            {DiscardBtn}
            <Button 
              variant="default" 
              size="sm" 
              onClick={onProcessLoan}
              className="bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white border-none shadow-lg shadow-blue-600/30"
            >
              {isCashCar ? "Go to Delivery" : "Process Loan"}
              <Icon name="ArrowRight" size={16} style={{ marginLeft: 6 }} />
            </Button>
          </>
        );

      case "prefile":
        return (
          <>
            {SaveBtn}
            {ExitBtn}
            <Button 
              variant="default" 
              size="sm" 
              onClick={onMoveToApproval}
              className="bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white border-none shadow-lg shadow-blue-600/30"
            >
              Loan Approval
              <Icon name="ArrowRight" size={16} style={{ marginLeft: 6 }} />
            </Button>
          </>
        );

      case "approval":
        return (
          <>
            {SaveBtn}
            {ExitBtn}
            <Button
              variant="default"
              size="sm"
              onClick={handleDisburseLoan}
              disabled={!canDisburse}
              className="bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-700 text-white border-none shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="CreditCard" size={16} style={{ marginRight: 6 }} />
              Disburse Loan
            </Button>
          </>
        );

      case "postfile":
        return (
          <>
            {SaveBtn}
            {ExitBtn}
            {isRefinanceOrCashIn ? (
              <Button 
                variant="default" 
                size="sm" 
                onClick={onMoveToPayout}
                className="bg-amber-600 dark:bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-700 text-white border-none shadow-lg shadow-amber-600/30"
              >
                Payout
                <Icon name="ArrowRight" size={16} style={{ marginLeft: 6 }} />
              </Button>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                onClick={onMoveToDelivery}
                className="bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-600/30"
              >
                Delivery
                <Icon name="ArrowRight" size={16} style={{ marginLeft: 6 }} />
              </Button>
            )}
          </>
        );

      case "delivery":
        return (
          <>
            {SaveBtn}
            {ExitBtn}
            {isCashCar ? (
              <Button
                variant="default"
                size="sm"
                onClick={onCloseLead}
                className="bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30"
              >
                <Icon name="CheckCircle" size={16} style={{ marginRight: 6 }} />
                Close Lead
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={onMoveToPayout}
                className="bg-amber-600 dark:bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-700 text-white border-none shadow-lg shadow-amber-600/30"
              >
                <Icon name="Wallet" size={16} style={{ marginRight: 6 }} />
                Payout
                <Icon name="ArrowRight" size={16} style={{ marginLeft: 6 }} />
              </Button>
            )}
          </>
        );

      case "payout":
        return (
          <>
            {SaveBtn}
            {ExitBtn}
            <Button
              variant="default"
              size="sm"
              onClick={onCloseLead}
              className="bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30"
            >
              <Icon name="CheckCircle" size={16} style={{ marginRight: 6 }} />
              Close Lead
            </Button>
          </>
        );

      default:
        return (
          <>
            {SaveBtn}
            {ExitBtn}
          </>
        );
    }
  }, [
    currentStage,
    isCashCar,
    isRefinanceOrCashIn,
    onPrint,
    onDiscard,
    onProcessLoan,
    onMoveToApproval,
    canDisburse,
    onSave,
    onMoveToDelivery,
    onMoveToPayout,
    onCloseLead,
    handleDisburseLoan,
  ]);

  return (
    <>
      <div className="sticky bottom-0 z-[900] border-t border-border bg-card/98 backdrop-blur-xl shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="w-full px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Left side - Optional info or empty */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name="Info" size={14} />
              <span>Stage: <span className="font-semibold capitalize text-foreground">{currentStage}</span></span>
            </div>
            
            {/* Right side - Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {actions}
            </div>
          </div>
        </div>
      </div>

      {showDisburseModal && (
        <DisburseModal
          approvedBanks={approvedBanks || []}
          onDisburse={handleDisburseConfirm}
          onClose={() => setShowDisburseModal(false)}
        />
      )}
    </>
  );
};

export default StageFooter;
