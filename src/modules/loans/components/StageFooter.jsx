import React, { useMemo, useState } from "react";
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
    onDisburse?.(selectedBankId, disbursementDate);
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
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Approved Banks
              </label>

              <select
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
                value={selectedBankId || ""}
                onChange={(e) => setSelectedBankId(Number(e.target.value))}
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
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Disbursement Date
            </label>
            <input
              type="date"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
              value={disbursementDate}
              onChange={(e) => setDisbursementDate(e.target.value)}
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
            disabled={!selectedBankId || !disbursementDate}
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

  const approvalStatus = form?.getFieldValue?.("approval_status") || "";
  const alreadyDisbursed =
    String(approvalStatus || "").toLowerCase() === "disbursed";

  const canDisburse = useMemo(() => {
    // You can adjust this rule later
    // For now: need at least 1 approved bank OR alreadyDisbursed status
    return alreadyDisbursed || (approvedBanks?.length || 0) > 0;
  }, [approvedBanks, alreadyDisbursed]);

  const handleDisburseLoan = () => {
    if (!approvedBanks || approvedBanks.length === 0) {
      alert("No approved banks available for disbursement");
      return;
    }
    setShowDisburseModal(true);
  };

  const handleDisburseConfirm = (bankId, date) => {
    setShowDisburseModal(false);
    onDisburseLoan?.(bankId, date);
  };

  const actions = useMemo(() => {
    // helper buttons
    const SaveExitBtn = (
      <Button variant="outline" size="sm" onClick={onSaveAndExit}>
        <Icon name="Save" size={16} style={{ marginRight: 6 }} />
        Save & Exit
      </Button>
    );

    const PrintBtn = (
      <Button variant="outline" size="sm" onClick={onPrint}>
        <Icon name="Printer" size={16} style={{ marginRight: 6 }} />
        Print
      </Button>
    );

    const DiscardBtn = (
      <Button
        variant="outline"
        size="sm"
        onClick={onDiscard}
        className="border-error/30 text-error hover:bg-error/10"
      >
        <Icon name="X" size={16} style={{ marginRight: 6 }} />
        Discard
      </Button>
    );

    switch (currentStage) {
      case "profile":
        return (
          <>
            {PrintBtn}
            {SaveExitBtn}
            {DiscardBtn}

            <Button variant="default" size="sm" onClick={onProcessLoan}>
              {isCashCar ? "Go to Delivery" : "Process Loan"}
              <Icon name="ArrowRight" size={16} style={{ marginLeft: 6 }} />
            </Button>
          </>
        );

      case "prefile":
        return (
          <>
            {SaveExitBtn}
            <Button variant="default" size="sm" onClick={onMoveToApproval}>
              Loan Approval
              <Icon name="ArrowRight" size={16} style={{ marginLeft: 6 }} />
            </Button>
          </>
        );

      case "approval":
        return (
          <>
            {SaveExitBtn}

            {alreadyDisbursed ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onSave?.();
                  setTimeout(() => onMoveToPostFile?.(), 200);
                }}
              >
                Continue to Post-File
                <Icon name="ArrowRight" size={16} style={{ marginLeft: 6 }} />
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleDisburseLoan}
                disabled={!canDisburse}
              >
                <Icon name="CreditCard" size={16} style={{ marginRight: 6 }} />
                Disburse Loan
              </Button>
            )}
          </>
        );

      case "postfile":
        return (
          <>
            {SaveExitBtn}
            <Button variant="default" size="sm" onClick={onMoveToDelivery}>
              Delivery
              <Icon name="ArrowRight" size={16} style={{ marginLeft: 6 }} />
            </Button>
          </>
        );

      case "delivery":
        return (
          <>
            {SaveExitBtn}

            {isCashCar ? (
              <Button
                variant="default"
                size="sm"
                onClick={onCloseLead}
                className="bg-success text-white hover:bg-success/90"
              >
                <Icon name="CheckCircle" size={16} style={{ marginRight: 6 }} />
                Close Lead
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={onMoveToPayout}
                className="bg-primary text-white hover:bg-primary/90"
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
            {SaveExitBtn}
            <Button
              variant="default"
              size="sm"
              onClick={onCloseLead}
              className="bg-success text-white hover:bg-success/90"
            >
              <Icon name="CheckCircle" size={16} style={{ marginRight: 6 }} />
              Close Lead
            </Button>
          </>
        );

      default:
        return (
          <>
            {SaveExitBtn}
            <Button variant="default" size="sm" onClick={onSave}>
              <Icon name="Save" size={16} style={{ marginRight: 6 }} />
              Save
            </Button>
          </>
        );
    }
  }, [
    currentStage,
    isCashCar,
    onPrint,
    onSaveAndExit,
    onDiscard,
    onProcessLoan,
    onMoveToApproval,
    alreadyDisbursed,
    canDisburse,
    onSave,
    onMoveToPostFile,
    onMoveToDelivery,
    onMoveToPayout,
    onCloseLead,
    handleDisburseLoan,
  ]);

  return (
    <>
      <div className="sticky bottom-0 z-[900] border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-end gap-2 flex-wrap">
            {actions}
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
