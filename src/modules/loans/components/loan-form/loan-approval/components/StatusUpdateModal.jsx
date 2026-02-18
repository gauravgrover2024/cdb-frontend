// src/modules/loans/components/loan-form/loan-approval/components/StatusUpdateModal.jsx
import React, { useState } from "react";
import Icon from "../../../../../../components/AppIcon";
import Button from "../../../../../../components/ui/Button";
import Input from "../../../../../../components/ui/Input";
import Select from "../../../../../../components/ui/Select";

/**
 * STATUS UPDATE MODAL COMPONENT
 * 
 * PURPOSE:
 * Updates bank application status during loan approval process
 * 
 * BACKEND INTEGRATION:
 * - Updates: approval_banksData array in Loan model
 * - Fields Updated for each bank:
 *   • status: Application status ("Pending", "Approved", "Rejected")
 *   • statusNote: Remarks/notes for status change
 *   • approvalDate: Date when approved (if status = "Approved")
 *   • rejectionDate: Date when rejected (if status = "Rejected")
 *   • statusHistory: Array of status changes with timestamps
 *     - status: New status value
 *     - changedAt: Timestamp of change
 *     - note: Remarks provided by user
 * 
 * IMPORTANT CHANGE:
 * - "Disbursed" status REMOVED from dropdown
 * - Reason: Disbursement is now a separate action (not just a status)
 * - Disbursement MUST be done via footer "Disburse" button with mandatory remarks
 * - This ensures:
 *   ✓ Proper workflow separation (Approval → Disbursement)
 *   ✓ Mandatory remarks for disbursement (audit trail)
 *   ✓ Better data integrity and tracking
 * 
 * AVAILABLE STATUS OPTIONS:
 * - "Pending": Initial state / Under review
 * - "Approved": Application approved by bank
 * - "Rejected": Application rejected by bank
 * 
 * WORKFLOW:
 * 1. User clicks "Update Status" button on bank card
 * 2. Modal opens with current bank details
 * 3. User selects new status from dropdown
 * 4. User enters remarks (recommended)
 * 5. If "Approved": Approval date can be set
 * 6. If "Rejected": Rejection date can be set
 * 7. Status history timeline shows all previous changes
 * 8. On submit:
 *    - updateBankStatus() called in parent
 *    - Backend updates approval_banksData array
 *    - Status history entry added
 */

const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "text-success";
  if (s === "rejected") return "text-error";
  if (s === "disbursed") return "text-success";
  if (s === "pending" || s === "under review") return "text-warning";
  return "text-muted-foreground";
};

const getStatusIcon = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "CheckCircle2";
  if (s === "rejected") return "XCircle";
  if (s === "disbursed") return "CheckCircle2";
  if (s === "pending" || s === "under review") return "Clock";
  return "Circle";
};

const StatusUpdateModal = ({ bank, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    status: bank?.status || "Pending",
    remarks: "",
    approvalDate: "",
    rejectionDate: "",
    disbursalDate: "",
  });

  const statusOptions = [
    { value: "Pending", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
    // Disbursed status is now handled only via footer disburse action
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!bank) return;

    onSave({
      ...bank,
      ...formData,
      statusNote: formData.remarks,
      lastUpdated: new Date()?.toLocaleString("en-IN"),
    });
    onClose();
  };

  if (!bank) return null;

  const { status } = formData;

  // Transform statusHistory into timeline format
  const renderTimeline = () => {
    const timeline = (bank?.statusHistory || []).map((event, index) => ({
      ...event,
      title: event.status || "Status Update",
      description: event.note || "No notes",
      date: event.changedAt
        ? new Date(event.changedAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A",
    }));

    if (!timeline.length) {
      return (
        <div className="text-center py-6">
          <p className="text-xs md:text-sm text-muted-foreground">
            No status history yet
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {timeline.map((event, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  event?.status === "Disbursed" || event?.status === "Approved"
                    ? "bg-success/10"
                    : event?.status === "Rejected"
                    ? "bg-error/10"
                    : "bg-warning/10"
                }`}
              >
                <Icon
                  name={getStatusIcon(event?.status)}
                  size={16}
                  className={getStatusColor(event?.status)}
                />
              </div>
              {index < timeline.length - 1 && (
                <div className="w-0.5 h-12 bg-border mt-2" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h4 className="text-sm md:text-base font-semibold text-foreground capitalize">
                  {event?.title}
                </h4>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {event?.date}
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mb-2">
                {event?.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card rounded-lg shadow-elevation-4 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="RefreshCw" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-foreground">
                Update Status
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                {bank?.bankName} - {bank?.applicationId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 md:p-6"
        >
          <div className="space-y-6 md:space-y-8">
            {/* Status Update Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Icon name="Edit" size={16} />
                Update Status
              </h3>

              <Select
                label="Application Status"
                required
                options={statusOptions}
                value={formData.status}
                onChange={(value) => handleInputChange("status", value)}
                description="Select the current status of the loan application"
              />

              <Input
                label="Remarks"
                type="text"
                placeholder="Enter status update remarks"
                value={formData.remarks}
                onChange={(e) => handleInputChange("remarks", e?.target?.value)}
                description="Add any relevant notes or comments"
              />

              {status === "Approved" && (
                <Input
                  label="Approval Date"
                  type="date"
                  value={formData.approvalDate}
                  onChange={(e) =>
                    handleInputChange("approvalDate", e?.target?.value)
                  }
                  description="Select the approval date"
                />
              )}

              {status === "Rejected" && (
                <Input
                  label="Rejection Date"
                  type="date"
                  value={formData.rejectionDate}
                  onChange={(e) =>
                    handleInputChange("rejectionDate", e?.target?.value)
                  }
                  description="Select the rejection date"
                />
              )}

              {status === "Disbursed" && (
                <Input
                  label="Disbursal Date"
                  type="date"
                  value={formData.disbursalDate}
                  onChange={(e) =>
                    handleInputChange("disbursalDate", e?.target?.value)
                  }
                  description="Select the disbursal date"
                />
              )}
            </div>

            {/* Status Timeline History */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Icon name="History" size={16} />
                Status Timeline
              </h3>
              {renderTimeline()}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 md:p-6 border-t border-border">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="default"
            iconName="Save"
            iconPosition="left"
            fullWidth
            onClick={handleSubmit}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StatusUpdateModal;
