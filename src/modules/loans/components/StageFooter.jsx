import React, { useState } from "react";
import { Button } from "antd";
import Icon from "../../../components/AppIcon";

// Disburse Modal for selecting bank and date
const DisburseModal = ({ approvedBanks, onDisburse, onClose }) => {
  const [selectedBankId, setSelectedBankId] = useState(
    approvedBanks.length === 1 ? approvedBanks[0].id : null
  );
  const [disbursementDate, setDisbursementDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const handleDisburse = () => {
    if (!selectedBankId || !disbursementDate) {
      alert("Please select a bank and disbursement date");
      return;
    }
    onDisburse(selectedBankId, disbursementDate);
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="CreditCard" size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Disburse Loan
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Bank Selection */}
          {approvedBanks.length > 1 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Select Bank to Disburse
              </label>
              <select
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                value={selectedBankId || ""}
                onChange={(e) => setSelectedBankId(Number(e.target.value))}
              >
                <option value="">Select Bank</option>
                {approvedBanks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bankName} - ₹
                    {bank.loanAmount?.toLocaleString?.("en-IN") ||
                      bank.loanAmount}
                  </option>
                ))}
              </select>
            </div>
          )}

          {approvedBanks.length === 1 && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="text-sm font-medium text-foreground">
                {approvedBanks[0].bankName}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Loan Amount: ₹
                {approvedBanks[0].loanAmount?.toLocaleString?.("en-IN") ||
                  approvedBanks[0].loanAmount}
              </div>
            </div>
          )}

          {/* Disbursement Date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Disbursement Date
            </label>
            <input
              type="date"
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              value={disbursementDate}
              onChange={(e) => setDisbursementDate(e.target.value)}
            />
          </div>

          <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
            <div className="flex items-start gap-2">
              <Icon
                name="AlertCircle"
                size={14}
                className="text-warning mt-0.5"
              />
              <div className="text-xs text-warning">
                This will mark the selected bank as "Disbursed" and move to
                Post-File stage.
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-md text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleDisburse}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
            disabled={!selectedBankId || !disbursementDate}
          >
            Disburse Loan
          </button>
        </div>
      </div>
    </div>
  );
};

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
  onMoveToPayout, // ✅ NEW
  onCloseLead,
  onPrint,
  approvedBanks,
  onMoveToPostFile,
  form,
}) => {
  const [showDisburseModal, setShowDisburseModal] = useState(false);

  const isCashCar = isFinanced === "No";

  const handleDisburseLoan = () => {
    if (!approvedBanks || approvedBanks.length === 0) {
      alert("No approved banks available for disbursement");
      return;
    }
    setShowDisburseModal(true);
  };

  const handleDisburseConfirm = (bankId, date) => {
    setShowDisburseModal(false);
    onDisburseLoan && onDisburseLoan(bankId, date);
  };

  const getButtons = () => {
    switch (currentStage) {
      case "profile":
        return (
          <>
            <Button size="large" variant="outline" onClick={onPrint}>
              <Icon name="Printer" size={16} style={{ marginRight: 6 }} />
              Print
            </Button>
            <Button size="large" variant="outline" onClick={onSaveAndExit}>
              <Icon name="Save" size={16} style={{ marginRight: 6 }} />
              Save & Exit
            </Button>
            <Button
              size="large"
              variant="outline"
              onClick={onDiscard}
              style={{ color: "#ef4444", borderColor: "#ef4444" }}
            >
              <Icon name="X" size={16} style={{ marginRight: 6 }} />
              Discard & Exit
            </Button>
            <Button size="large" type="primary" onClick={onProcessLoan}>
              {isFinanced === "No" ? "Go to Delivery" : "Process Loan"}
              <Icon name="ArrowRight" size={16} style={{ marginLeft: 6 }} />
            </Button>
          </>
        );

      case "prefile":
        return (
          <>
            <Button size="large" variant="outline" onClick={onSaveAndExit}>
              <Icon name="Save" size={16} style={{ marginRight: 6 }} />
              Save & Exit
            </Button>
            <Button size="large" type="primary" onClick={onMoveToApproval}>
              Loan Approval
              <Icon name="ArrowRight" size={16} style={{ marginLeft: 6 }} />
            </Button>
          </>
        );

      case "approval": {
        const alreadyDisbursed =
          approvedBanks.length === 0 &&
          form?.getFieldValue("approval_status") === "Disbursed";

        return (
          <>
            <Button size="large" variant="outline" onClick={onSaveAndExit}>
              <Icon name="Save" size={16} style={{ marginRight: 6 }} />
              Save & Exit
            </Button>

            {alreadyDisbursed ? (
              <Button
                size="large"
                type="primary"
                onClick={() => {
                  onSave();
                  setTimeout(() => onMoveToPostFile(), 300);
                }}
              >
                Continue to Post-File
                <Icon name="ArrowRight" size={16} style={{ marginLeft: 6 }} />
              </Button>
            ) : (
              <Button size="large" type="primary" onClick={handleDisburseLoan}>
                <Icon name="CreditCard" size={16} style={{ marginRight: 6 }} />
                Disburse Loan
              </Button>
            )}
          </>
        );
      }

      case "postfile":
        return (
          <>
            <Button size="large" variant="outline" onClick={onSaveAndExit}>
              <Icon name="Save" size={16} style={{ marginRight: 6 }} />
              Save & Exit
            </Button>
            <Button size="large" type="primary" onClick={onMoveToDelivery}>
              Delivery
              <Icon name="ArrowRight" size={16} style={{ marginRight: 6 }} />
            </Button>
          </>
        );

      case "delivery":
        return (
          <>
            <Button size="large" variant="outline" onClick={onSaveAndExit}>
              <Icon name="Save" size={16} style={{ marginRight: 6 }} />
              Save & Exit
            </Button>

            {/* ✅ CASH CAR: Close lead from Delivery */}
            {isCashCar ? (
              <Button
                size="large"
                type="primary"
                onClick={onCloseLead}
                style={{ background: "#10b981", borderColor: "#10b981" }}
              >
                <Icon name="CheckCircle" size={16} style={{ marginRight: 6 }} />
                Close Lead
              </Button>
            ) : (
              /* ✅ FINANCED: Move to payout from Delivery */
              <Button
                size="large"
                type="primary"
                onClick={onMoveToPayout}
                style={{ background: "#6366f1", borderColor: "#6366f1" }}
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
            <Button size="large" variant="outline" onClick={onSaveAndExit}>
              <Icon name="Save" size={16} style={{ marginRight: 6 }} />
              Save & Exit
            </Button>

            <Button
              size="large"
              type="primary"
              onClick={onCloseLead}
              style={{ background: "#10b981", borderColor: "#10b981" }}
            >
              <Icon name="CheckCircle" size={16} style={{ marginRight: 6 }} />
              Close Lead
            </Button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 999,
          background: "#ffffff",
          borderTop: "1px solid #e5e7eb",
          boxShadow: "0 -2px 8px rgba(0,0,0,0.08)",
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
            maxWidth: 1400,
            margin: "0 auto",
          }}
        >
          {getButtons()}
        </div>
      </div>

      {/* Disburse Modal */}
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
