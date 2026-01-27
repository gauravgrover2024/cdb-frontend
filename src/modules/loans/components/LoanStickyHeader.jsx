// src/modules/loans/components/LoanStickyHeader.jsx
import React, { useMemo, useState } from "react";
import { Button, Form, message } from "antd";
import dayjs from "dayjs";

import Icon from "../../../components/AppIcon";

/**
 * FIX: Header not updating live
 * - Using Form.useWatch() so component rerenders on field changes.
 *
 * Header shows LIVE:
 * - Customer Name
 * - Vehicle
 * - Case Type
 * - Amount (Expected till approval, then Approved/Loan amount)
 * - After disbursed: EMI + ROI
 */

/* --------------------------- Helpers --------------------------- */
const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (v) => {
  const n = toNumber(v);
  if (!n) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
};

const formatPercent = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n}%`;
};

const statusPillClass = (status) => {
  const s = (status || "").toLowerCase();

  if (["approved", "disbursed", "completed"].includes(s)) {
    return "bg-success/10 text-success border-success/20";
  }
  if (["in progress", "in-progress"].includes(s)) {
    return "bg-primary/10 text-primary border-primary/20";
  }
  if (["rejected"].includes(s)) {
    return "bg-error/10 text-error border-error/20";
  }
  if (["pending", ""].includes(s)) {
    return "bg-muted text-muted-foreground border-border";
  }
  return "bg-muted text-muted-foreground border-border";
};

const sanitizeForJSON = (obj) => {
  if (obj == null) return obj;

  if (Array.isArray(obj)) return obj.map(sanitizeForJSON);

  if (typeof obj === "object") {
    if (dayjs?.isDayjs?.(obj)) return obj.toISOString();
    if (obj instanceof Date) return obj.toISOString();

    const out = {};
    for (const k in obj) out[k] = sanitizeForJSON(obj[k]);
    return out;
  }

  return obj;
};

/* --------------------------- Notes Modal --------------------------- */
const NotesModal = ({ open, form, onClose }) => {
  const [notes, setNotes] = useState(
    () => form?.getFieldValue("loan_notes") || "",
  );

  if (!open) return null;

  const handleSave = () => {
    if (!form) return;
    form.setFieldsValue({ loan_notes: notes });
    message.success("Notes saved");
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-elevation-4 w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="MessageSquare" size={18} className="text-primary" />
            <div className="text-sm font-semibold text-foreground">
              Loan Notes
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-4">
          <textarea
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background min-h-[220px] focus:outline-none"
            placeholder="Add internal notes for this loan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary/90"
          >
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
};

/* --------------------------- Documents Modal (kept simple) --------------------------- */
const DocumentsModal = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-elevation-4 w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="FileText" size={18} className="text-primary" />
            <div className="text-sm font-semibold text-foreground">
              Documents
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-4 text-sm text-muted-foreground">
          Documents UI is already handled inside steps (Post-file / Delivery).{" "}
          <br />
          This modal can later show aggregated docs from API.
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* --------------------------- Main Sticky Header --------------------------- */
const LoanStickyHeader = ({
  onSave,
  onExit,
  activeStep,
  onStepChange,
  isFinanced,
  form,
  isDisbursed,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);

  // ✅ LIVE WATCHERS (this is the fix)
  const loanId = Form.useWatch("loanId", form);
  const customerName = Form.useWatch("customerName", form);
  const primaryMobile = Form.useWatch("primaryMobile", form);

  const typeOfLoan = Form.useWatch("typeOfLoan", form);

  const vehicleMake = Form.useWatch("vehicleMake", form);
  const vehicleModel = Form.useWatch("vehicleModel", form);
  const vehicleVariant = Form.useWatch("vehicleVariant", form);

  const financeExpectation = Form.useWatch("financeExpectation", form);

  const approvalStatus = Form.useWatch("approval_status", form);
  const approvalBankName = Form.useWatch("approval_bankName", form);
  const approvalLoanAmountApproved = Form.useWatch(
    "approval_loanAmountApproved",
    form,
  );

  const postfileEmiAmount = Form.useWatch("postfile_emiAmount", form);
  const postfileRoi = Form.useWatch("postfile_roi", form);

  const vehicleLabel = useMemo(() => {
    const v = [vehicleMake, vehicleModel, vehicleVariant]
      .filter(Boolean)
      .join(" ");
    return v || "Not selected";
  }, [vehicleMake, vehicleModel, vehicleVariant]);

  const isBeforeOrAtApproval = ["profile", "prefile", "approval"].includes(
    activeStep,
  );

  const amountLabel =
    approvalStatus === "Approved"
      ? "Approved Loan Amount"
      : approvalStatus === "Disbursed"
        ? "Disbursed Loan Amount"
        : "Expected Loan Amount";

  const amountValue = isBeforeOrAtApproval
    ? financeExpectation
    : approvalLoanAmountApproved;

  const showDisbursedExtras =
    (approvalStatus || "").toLowerCase() === "disbursed" || !!isDisbursed;

  const STEPS = useMemo(
    () => [
      { key: "profile", label: "Customer Profile" },
      { key: "prefile", label: "Pre-File" },
      { key: "approval", label: "Loan Approval" },
      { key: "postfile", label: "Post-File" },
      { key: "delivery", label: "Vehicle Delivery" },
      { key: "payout", label: "Payout" },
    ],
    [],
  );

  const filteredSteps = useMemo(() => {
    if (isFinanced === "No") {
      return STEPS.filter((s) => s.key === "profile" || s.key === "delivery");
    }
    return STEPS.filter((s) => (s.key === "payout" ? !!isDisbursed : true));
  }, [STEPS, isFinanced, isDisbursed]);

  const currentIndex = useMemo(() => {
    return filteredSteps.findIndex((s) => s.key === activeStep);
  }, [filteredSteps, activeStep]);

  const visibleSteps = useMemo(() => {
    return filteredSteps.map((step, index) => {
      let status = "pending";
      if (step.key === activeStep) status = "current";
      else if (index < currentIndex) status = "completed";
      return { ...step, status };
    });
  }, [filteredSteps, activeStep, currentIndex]);

  const handleExtractJSON = async () => {
    try {
      if (!form?.getFieldsValue) {
        message.error("Form not ready");
        return;
      }

      const allFields = form.getFieldsValue(true);
      const sanitized = sanitizeForJSON(allFields);

      await navigator.clipboard.writeText(JSON.stringify(sanitized, null, 2));

      const blob = new Blob([JSON.stringify(sanitized, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `loan-form-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      message.success("JSON copied + downloaded");
    } catch (e) {
      console.error("Extract JSON Error:", e);
      message.error("Failed to extract JSON");
    }
  };

  return (
    <>
      <div className="sticky top-0 z-[50] bg-background/95 backdrop-blur-md border-b border-border">
        {/* Header Top */}
        <div className="px-4 md:px-6 py-3">
          <div className="flex items-start md:items-center justify-between gap-3">
            {/* Left */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-10 h-10 rounded-2xl border border-border bg-muted/30 flex items-center justify-center">
                  <Icon name="FileText" size={18} className="text-primary" />
                </div>

                <div className="min-w-0">
                  {/* MAIN LINE */}
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <h1 className="text-base md:text-lg font-semibold text-foreground truncate">
                      {customerName || "Not entered"}
                    </h1>

                    <span className="text-xs px-2 py-1 rounded-full border border-border bg-muted text-muted-foreground">
                      {loanId || "New Loan"}
                    </span>

                    {typeOfLoan && (
                      <span className="text-xs px-2 py-1 rounded-full border border-border bg-muted/40 text-foreground">
                        {typeOfLoan}
                      </span>
                    )}

                    {approvalStatus && (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusPillClass(
                          approvalStatus,
                        )}`}
                      >
                        <Icon name="Circle" size={6} />
                        {approvalStatus}
                      </span>
                    )}
                  </div>

                  {/* SUBLINE */}
                  <div className="text-xs text-muted-foreground truncate">
                    {primaryMobile ? `${primaryMobile} • ` : ""}
                    {vehicleLabel}
                  </div>
                </div>
              </div>

              {/* Chips */}
              {(isExpanded || window.innerWidth >= 768) && (
                <div className="mt-2 hidden md:flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {isFinanced === "Yes" && (
                    <span className="px-2 py-1 rounded-full border border-border bg-muted/30">
                      {amountLabel}:{" "}
                      <span className="text-foreground font-semibold">
                        {formatMoney(amountValue)}
                      </span>
                    </span>
                  )}

                  {approvalBankName && (
                    <span className="px-2 py-1 rounded-full border border-border bg-muted/30">
                      Bank:{" "}
                      <span className="text-foreground">
                        {approvalBankName}
                      </span>
                    </span>
                  )}

                  {showDisbursedExtras && (
                    <>
                      <span className="px-2 py-1 rounded-full border border-border bg-muted/30">
                        EMI:{" "}
                        <span className="text-foreground font-semibold">
                          {formatMoney(postfileEmiAmount)}
                        </span>
                      </span>
                      <span className="px-2 py-1 rounded-full border border-border bg-muted/30">
                        ROI:{" "}
                        <span className="text-foreground font-semibold">
                          {formatPercent(postfileRoi)}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowDocumentsModal(true)}
                className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-sm flex items-center gap-2"
              >
                <Icon name="FileText" size={16} />
                <span className="hidden md:inline">Documents</span>
              </button>

              <button
                onClick={() => setShowNotesModal(true)}
                className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-sm flex items-center gap-2"
              >
                <Icon name="MessageSquare" size={16} />
                <span className="hidden md:inline">Notes</span>
              </button>

              <button
                onClick={handleExtractJSON}
                className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-sm flex items-center gap-2"
              >
                <Icon name="Braces" size={16} />
                <span className="hidden md:inline">Extract JSON</span>
              </button>

              <Button type="primary" onClick={() => onSave?.()}>
                <span className="flex items-center gap-2">
                  <Icon name="Save" size={16} />
                  Save
                </span>
              </Button>

              <button
                onClick={() => setIsExpanded((p) => !p)}
                className="md:hidden p-2 rounded-xl hover:bg-muted border border-border"
                title="Toggle details"
              >
                <Icon
                  name={isExpanded ? "ChevronUp" : "ChevronDown"}
                  size={18}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Steps Row (reduced height) */}
        <div className="px-4 md:px-6 pb-3">
          <div className="bg-muted/20 border border-border rounded-2xl px-2 py-1 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max">
              {visibleSteps.map((step, idx) => {
                const isCurrent = step.status === "current";
                const isDone = step.status === "completed";

                return (
                  <button
                    key={step.key}
                    onClick={() => onStepChange?.(step.key)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border transition-colors ${
                      isCurrent
                        ? "bg-primary text-white border-primary"
                        : isDone
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                        isCurrent
                          ? "bg-white/20"
                          : isDone
                            ? "bg-success text-white"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isDone ? <Icon name="Check" size={12} /> : idx + 1}
                    </div>

                    <span className="text-[12px] font-semibold whitespace-nowrap">
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <NotesModal
        open={showNotesModal}
        form={form}
        onClose={() => setShowNotesModal(false)}
      />

      <DocumentsModal
        open={showDocumentsModal}
        onClose={() => setShowDocumentsModal(false)}
      />
    </>
  );
};

export default LoanStickyHeader;
