import React, { useState } from "react";
import { Button } from "antd";
import dayjs from "dayjs";

import Icon from "../../../components/AppIcon";

// Notes Modal Component
const NotesModal = ({ form, onClose }) => {
  const [notes, setNotes] = useState(() => {
    if (!form) return "";
    return form.getFieldValue("loan_notes") || "";
  });

  const handleSave = () => {
    if (!form) return;
    form.setFieldsValue({ loan_notes: notes });
    alert("Notes saved successfully!");
    onClose();
  };

  if (!form) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="MessageSquare" size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Loan Notes
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-4">
          <textarea
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background min-h-[200px]"
            placeholder="Add notes about this loan application..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-md text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
          >
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
};

// Documents Modal Component with Viewer
const DocumentsModal = ({ form, onClose }) => {
  const safeText = (v) => {
    if (v == null) return "";
    if (typeof v === "string" || typeof v === "number") return String(v);
    return ""; // block objects like dayjs
  };

  const [viewingDocument, setViewingDocument] = useState(null);

  if (!form) return null;

  // Get all document-related data
  const invoiceFile = form.getFieldValue("delivery_invoiceFile");
  const rcFile = form.getFieldValue("delivery_rcFile");

  // Check for document management uploads
  const uploadedDocs = form.getFieldValue("postfile_documents") || [];

  const documents = [
    // Standard KYC documents
    {
      name: "Aadhaar Card",
      field: "identityProofNumber",
      value: form.getFieldValue("identityProofNumber"),
      uploaded: !!form.getFieldValue("identityProofNumber"),
      type: "text",
    },
    {
      name: "PAN Card",
      field: "addressProofNumber",
      value: form.getFieldValue("addressProofNumber"),
      uploaded: !!form.getFieldValue("addressProofNumber"),
      type: "text",
    },
    // Delivery documents
    ...(invoiceFile
      ? [
          {
            name: "Invoice",
            field: "delivery_invoiceFile",
            value: invoiceFile,
            uploaded: true,
            type: "file",
          },
        ]
      : []),
    ...(rcFile
      ? [
          {
            name: "RC Document",
            field: "delivery_rcFile",
            value: rcFile,
            uploaded: true,
            type: "file",
          },
        ]
      : []),
    // Post-File uploaded documents
    ...uploadedDocs.map((doc, index) => ({
      name:
        safeText(doc?.tag) || safeText(doc?.name) || `Document ${index + 1}`,
      field: `postfile_doc_${index}`,
      value: doc,
      uploaded: true,
      type: "file",
    })),
  ];

  const uploadedCount = documents.filter((d) => d.uploaded).length;

  return (
    <>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-3xl max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Icon name="FileText" size={18} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">
                All Documents ({uploadedCount}/{documents.length})
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted"
            >
              <Icon name="X" size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc, index) => (
                <div
                  key={doc.field || index}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon
                      name="FileText"
                      size={18}
                      className={
                        doc.uploaded ? "text-success" : "text-muted-foreground"
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {doc.name}
                      </div>
                      {doc.uploaded && doc.value && doc.type === "text" && (
                        <div className="text-xs text-muted-foreground truncate">
                          {doc.value}
                        </div>
                      )}
                      {doc.uploaded && doc.type === "file" && (
                        <div className="text-xs text-muted-foreground">
                          File uploaded
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.uploaded ? (
                      <>
                        {doc.type === "file" && doc.value?.url && (
                          <button
                            onClick={() => setViewingDocument(doc.value)}
                            className="px-2 py-1 text-xs border border-primary/20 text-primary rounded hover:bg-primary/10"
                          >
                            View
                          </button>
                        )}
                        <Icon
                          name="CheckCircle2"
                          size={18}
                          className="text-success"
                        />
                      </>
                    ) : (
                      <Icon
                        name="Circle"
                        size={18}
                        className="text-muted-foreground"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-md text-sm hover:bg-muted"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </>
  );
};

// Document Viewer Component
const DocumentViewer = ({ document, onClose }) => {
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="Eye" size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {document.name || "Document"}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/20">
          {document.url ? (
            <img
              src={document.url}
              alt={document.name}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center">
              <Icon
                name="FileText"
                size={48}
                className="text-muted-foreground mx-auto mb-4"
              />
              <p className="text-muted-foreground">No preview available</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-4 py-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {document.size || "Size unknown"}
          </div>
          <div className="flex gap-2">
            {document.url && (
              <button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = document.url;
                  link.download = document.name || "document";
                  link.click();
                }}
                className="px-3 py-1.5 border border-border rounded-md text-sm hover:bg-muted flex items-center gap-2"
              >
                <Icon name="Download" size={14} />
                Download
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main LoanStickyHeader Component
const LoanStickyHeader = ({
  title,
  onSave,
  onExit,
  activeStep,
  onStepChange,
  isFinanced,
  form,
  isDisbursed, // ADD THIS
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);

  // Use getFieldValue for reliable data across all stages
  const customerName = form?.getFieldValue("customerName") || "Not entered";
  const mobile = form?.getFieldValue("primaryMobile") || "";
  const make = form?.getFieldValue("vehicleMake") || "";
  const model = form?.getFieldValue("vehicleModel") || "";
  const variant = form?.getFieldValue("vehicleVariant") || "";
  const loanType = form?.getFieldValue("typeOfLoan") || "";
  const financeExpectation = form?.getFieldValue("financeExpectation") || "";
  const bankName = form?.getFieldValue("approval_bankName") || "";
  const approvalStatus = form?.getFieldValue("approval_status") || "";
  const loanId = form?.getFieldValue("loanId") || "New Loan";

  const vehicleLabel =
    [make, model, variant].filter(Boolean).join(" ") || "Not selected";

  const STEPS = [
    { key: "profile", label: "Customer Profile" },
    { key: "prefile", label: "Pre-File" },
    { key: "approval", label: "Loan Approval" },
    { key: "postfile", label: "Post-File" },
    { key: "delivery", label: "Vehicle Delivery" },
    { key: "payout", label: "Payout" }, // ADD THIS
  ];

  const filteredSteps = STEPS.filter((step) => {
    // Skip finance steps if cash sale
    if (isFinanced === "No") {
      return step.key === "profile" || step.key === "delivery";
    }

    // Only show payout if disbursed
    if (step.key === "payout" && !isDisbursed) {
      return false;
    }

    return true;
  });

  const currentIndex = filteredSteps.findIndex((s) => s.key === activeStep);

  const visibleSteps = filteredSteps.map((step, index) => {
    let status = "pending";
    if (step.key === activeStep) {
      status = "current";
    } else if (index < currentIndex) {
      status = "completed";
    }
    return { ...step, status };
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "disbursed":
        return "bg-success/10 text-success border-success/20";
      case "in progress":
        return "bg-warning/10 text-warning border-warning/20";
      case "rejected":
        return "bg-error/10 text-error border-error/20";
      case "pending":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleSave = () => {
    onSave && onSave();
  };

  const handleExtractJSON = () => {
    const allFields = form.getFieldsValue(true);

    const convertDatesToStrings = (obj) => {
      if (!obj) return obj;

      if (Array.isArray(obj)) {
        return obj.map((item) => convertDatesToStrings(item));
      }

      if (typeof obj === "object") {
        if (dayjs?.isDayjs?.(obj)) return obj.toISOString();
        if (obj instanceof Date) return obj.toISOString();

        const result = {};
        for (const key in obj) {
          result[key] = convertDatesToStrings(obj[key]);
        }
        return result;
      }

      return obj;
    };

    const sanitized = convertDatesToStrings(allFields);

    navigator.clipboard.writeText(JSON.stringify(allFields, null, 2));
    const blob = new Blob([JSON.stringify(allFields, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loan-form-data-${Date.now()}.json`;
    a.click();
    alert("Form data copied to clipboard and downloaded!");
  };
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        marginBottom: 16,
        marginTop: 0, // ADD THIS to pull it up
      }}
    >
      {/* Info Bar */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid #f0f0f0" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Left: Case Info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                minWidth: 120,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                }}
              >
                Loan ID
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                {loanId}
              </span>
            </div>

            <div
              className="hidden md:block w-px h-8"
              style={{ background: "#e5e7eb" }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minWidth: 0,
              }}
              className="hidden md:flex"
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                }}
              >
                Customer
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#111827",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {customerName}
              </span>
              {mobile && (
                <span style={{ fontSize: 11, color: "#6b7280" }}>{mobile}</span>
              )}
            </div>

            {(isExpanded || window.innerWidth >= 768) && (
              <>
                <div
                  className="hidden md:block w-px h-8"
                  style={{ background: "#e5e7eb" }}
                />

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minWidth: 0,
                  }}
                  className="hidden md:flex"
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                    }}
                  >
                    Vehicle
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#111827",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {vehicleLabel}
                  </span>
                </div>

                {isFinanced === "Yes" && financeExpectation && (
                  <>
                    <div
                      className="hidden lg:block w-px h-8"
                      style={{ background: "#e5e7eb" }}
                    />

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 120,
                      }}
                      className="hidden lg:flex"
                    >
                      <span
                        style={{
                          fontSize: 10,
                          color: "#6b7280",
                          textTransform: "uppercase",
                          fontWeight: 600,
                          letterSpacing: "0.5px",
                        }}
                      >
                        Loan Amount
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#111827",
                        }}
                      >
                        ₹{financeExpectation}
                      </span>
                      {bankName && (
                        <span style={{ fontSize: 11, color: "#6b7280" }}>
                          {bankName}
                        </span>
                      )}
                    </div>
                  </>
                )}

                {approvalStatus && (
                  <>
                    <div
                      className="hidden lg:block w-px h-8"
                      style={{ background: "#e5e7eb" }}
                    />

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 100,
                      }}
                      className="hidden lg:flex"
                    >
                      <span
                        style={{
                          fontSize: 10,
                          color: "#6b7280",
                          textTransform: "uppercase",
                          fontWeight: 600,
                          letterSpacing: "0.5px",
                        }}
                      >
                        Status
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border w-fit ${getStatusColor(
                          approvalStatus
                        )}`}
                        style={{ marginTop: 2 }}
                      >
                        <Icon name="Circle" size={6} />
                        {approvalStatus}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={20} />
            </button>
          </div>

          {/* Right: Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDocumentsModal(true)}
            >
              <Icon name="FileText" size={14} style={{ marginRight: 4 }} />
              <span className="hidden md:inline">Documents</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotesModal(true)}
            >
              <Icon name="MessageSquare" size={14} style={{ marginRight: 4 }} />
              <span className="hidden md:inline">Notes</span>
            </Button>
            <Button
              size="sm"
              style={{ background: "#10b981", color: "#fff", border: "none" }}
              onClick={handleExtractJSON}
            >
              <span className="hidden md:inline">Extract</span>
              <span className="md:hidden">JSON</span>
            </Button>
            <Button size="sm" type="primary" onClick={handleSave}>
              <Icon name="Save" size={14} style={{ marginRight: 4 }} />
              Save
            </Button>
          </div>
        </div>
      </div>
      {/* Workflow Progress Bar */}
      <div style={{ padding: "16px 24px", background: "#fafafa" }}>
        <div
          className="workflow-progress"
          style={{ display: "flex", alignItems: "center" }}
        >
          {visibleSteps.map((stage, index) => (
            <React.Fragment key={stage.key}>
              <div
                className="workflow-step"
                onClick={() => onStepChange(stage.key)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  className={`workflow-step-indicator ${stage.status}`}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 600,
                    background:
                      stage.status === "completed"
                        ? "#10b981"
                        : stage.status === "current"
                        ? "#667eea"
                        : "#e5e7eb",
                    color: stage.status === "pending" ? "#6b7280" : "#fff",
                  }}
                >
                  {stage.status === "completed" ? (
                    <Icon name="Check" size={16} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={`workflow-step-label ${
                    stage.status === "current" ? "current" : ""
                  } hidden md:inline`}
                  style={{
                    fontSize: 13,
                    fontWeight: stage.status === "current" ? 600 : 500,
                    color: stage.status === "pending" ? "#6b7280" : "#111827",
                  }}
                >
                  {stage.label}
                </span>
              </div>
              {index < visibleSteps.length - 1 && (
                <div
                  className={`workflow-connector ${
                    stage.status === "completed" ? "completed" : ""
                  }`}
                  style={{
                    flex: 1,
                    height: 2,
                    maxWidth: 80,
                    margin: "0 8px",
                    background:
                      stage.status === "completed" ? "#10b981" : "#e5e7eb",
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showNotesModal && (
        <NotesModal form={form} onClose={() => setShowNotesModal(false)} />
      )}
      {showDocumentsModal && (
        <DocumentsModal
          form={form}
          onClose={() => setShowDocumentsModal(false)}
        />
      )}
    </div>
  );
};

export default LoanStickyHeader;
