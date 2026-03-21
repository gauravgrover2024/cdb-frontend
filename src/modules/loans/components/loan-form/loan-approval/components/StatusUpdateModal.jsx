// src/modules/loans/components/loan-form/loan-approval/components/StatusUpdateModal.jsx
import React, { useState } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
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
  if (s === "disbursed") return "text-teal-600 dark:text-teal-300";
  if (s === "pending" || s === "under review") return "text-warning";
  return "text-muted-foreground";
};

const getStatusIcon = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "CheckCircle2";
  if (s === "rejected") return "XCircle";
  if (s === "disbursed") return "WalletCards";
  if (s === "pending" || s === "under review") return "Clock";
  return "Circle";
};

const getStatusBg = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "bg-success/10";
  if (s === "disbursed") return "bg-teal-100 dark:bg-teal-900/30";
  if (s === "rejected") return "bg-error/10";
  return "bg-amber-100 dark:bg-amber-900/30";
};

const getStatusSurface = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved")
    return "border-emerald-300/60 bg-emerald-50/80 dark:border-emerald-800/40 dark:bg-emerald-950/20";
  if (s === "disbursed")
    return "border-teal-300/60 bg-teal-50/80 dark:border-teal-800/40 dark:bg-teal-950/20";
  if (s === "rejected")
    return "border-rose-300/60 bg-rose-50/80 dark:border-rose-800/40 dark:bg-rose-950/20";
  return "border-amber-300/60 bg-amber-50/85 dark:border-amber-800/40 dark:bg-amber-950/24";
};

const resolveTimelineDate = (event, bank) => {
  const s = (event?.status || "").toLowerCase();
  return (
    event?.changedAt ||
    event?.timestamp ||
    event?.date ||
    (s === "approved" ? bank?.approvalDate : null) ||
    (s === "rejected" ? bank?.rejectionDate : null) ||
    (s === "disbursed" ? bank?.disbursalDate || bank?.approvalDate : null) ||
    bank?.lastUpdated ||
    null
  );
};

const toDayjsValue = (value) => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
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
      date: resolveTimelineDate(event, bank)
        ? new Date(resolveTimelineDate(event, bank)).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "NA",
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
                className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusBg(
                  event?.status,
                )}`}
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
      <div className="bg-card rounded-2xl border border-border shadow-elevation-4 w-full max-w-xl max-h-[82vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 md:p-6 border-b ${getStatusSurface(status)}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusBg(status)}`}>
              <Icon
                name={getStatusIcon(status)}
                size={20}
                className={getStatusColor(status)}
              />
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
          className="flex-1 overflow-y-auto p-4 md:p-5"
        >
          <div className="space-y-6 md:space-y-8">
            {/* Status Update Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Icon name={getStatusIcon(status)} size={16} className={getStatusColor(status)} />
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
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-foreground">
                    Approval Date
                  </label>
                  <DatePicker
                    className="w-full"
                    format="DD-MM-YYYY"
                    value={toDayjsValue(formData.approvalDate)}
                    onChange={(date) =>
                      handleInputChange(
                        "approvalDate",
                        date ? date.format("YYYY-MM-DD") : "",
                      )
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Select the approval date
                  </p>
                </div>
              )}

              {status === "Rejected" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-foreground">
                    Rejection Date
                  </label>
                  <DatePicker
                    className="w-full"
                    format="DD-MM-YYYY"
                    value={toDayjsValue(formData.rejectionDate)}
                    onChange={(date) =>
                      handleInputChange(
                        "rejectionDate",
                        date ? date.format("YYYY-MM-DD") : "",
                      )
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Select the rejection date
                  </p>
                </div>
              )}

              {status === "Disbursed" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-foreground">
                    Disbursal Date
                  </label>
                  <DatePicker
                    className="w-full"
                    format="DD-MM-YYYY"
                    value={toDayjsValue(formData.disbursalDate)}
                    onChange={(date) =>
                      handleInputChange(
                        "disbursalDate",
                        date ? date.format("YYYY-MM-DD") : "",
                      )
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Select the disbursal date
                  </p>
                </div>
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
        <div className="flex flex-col sm:flex-row gap-3 p-4 md:p-5 border-t border-border bg-background/60">
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
