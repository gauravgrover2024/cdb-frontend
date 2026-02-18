import React, { useMemo, useState, useRef } from "react";
import Icon from "../../../../components/AppIcon";
import Button from "../../../../components/ui/Button";
import { loansApi } from "../../../../api/loans";
import { message } from "antd";

const DOCUMENT_CATEGORIES = [
  {
    id: "kyc",
    title: "KYC Documents",
    icon: "FileText",
    fields: [
      { key: "aadhaarCardDocUrl", label: "Aadhaar Card" },
      { key: "panCardDocUrl", label: "PAN Card" },
      { key: "passportDocUrl", label: "Passport" },
      { key: "dlDocUrl", label: "Driving License" },
      { key: "addressProofDocUrl", label: "Address Proof" },
      { key: "gstDocUrl", label: "GST Certificate" },
    ],
  },
  {
    id: "co-applicant",
    title: "Co-Applicant Documents",
    icon: "Users",
    fields: [
      { key: "co_aadhaarCardDocUrl", label: "Co-App Aadhaar" },
      { key: "co_panCardDocUrl", label: "Co-App PAN" },
      { key: "co_passportDocUrl", label: "Co-App Passport" },
      { key: "co_dlDocUrl", label: "Co-App DL" },
      { key: "co_addressProofDocUrl", label: "Co-App Address Proof" },
    ],
  },
  {
    id: "guarantor",
    title: "Guarantor Documents",
    icon: "Shield",
    fields: [
      { key: "gu_aadhaarCardDocUrl", label: "Guarantor Aadhaar" },
      { key: "gu_panCardDocUrl", label: "Guarantor PAN" },
      { key: "gu_passportDocUrl", label: "Guarantor Passport" },
      { key: "gu_dlDocUrl", label: "Guarantor DL" },
      { key: "gu_addressProofDocUrl", label: "Guarantor Address Proof" },
    ],
  },
  {
    id: "vehicle",
    title: "Vehicle Documents",
    icon: "Car",
    fields: [
      { key: "vehiclePhotoUrl", label: "Vehicle Photo" },
      { key: "vehicleRCUrl", label: "RC Book" },
      { key: "insurancePolicyUrl", label: "Insurance Policy" },
      { key: "hypothecationDocUrl", label: "Hypothecation Doc" },
    ],
  },
  {
    id: "delivery",
    title: "Delivery Documents",
    icon: "Truck",
    fields: [
      { key: "delivery_invoiceFile", label: "Invoice" },
      { key: "delivery_rcFile", label: "RC Copy" },
    ],
  },
  {
    id: "postfile",
    title: "Post-File Documents",
    icon: "FolderOpen",
    fields: [{ key: "postfile_documents", label: "Additional Documents", isArray: true }],
  },
];

const getDocUrl = (loan, key, isArray) => {
  if (isArray && key === "postfile_documents") {
    const arr = loan?.postfile_documents;
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => (typeof item === "object" && item ? item.url || item.secure_url : item)).filter(Boolean);
  }
  const v = loan?.[key];
  return v ? [v] : [];
};

const LoanDocumentsModal = ({ loan, open, onClose, onUploadComplete }) => {
  const [localLoan, setLocalLoan] = useState(loan);
  const [uploadingKey, setUploadingKey] = useState(null);
  const fileInputRefs = useRef({});

  React.useEffect(() => {
    if (loan) setLocalLoan(loan);
  }, [loan]);

  const loanId = localLoan?._id || localLoan?.loanId;
  const formatLoanId = (id) => {
    if (!id) return "—";
    const s = String(id);
    return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
  };

  const categoriesWithStatus = useMemo(() => {
    return DOCUMENT_CATEGORIES.map((cat) => ({
      ...cat,
      fields: cat.fields.map((field) => {
        const isArray = field.isArray;
        const urls = getDocUrl(localLoan, field.key, isArray);
        const present = isArray ? urls.length > 0 : urls.length === 1;
        const count = isArray ? urls.length : (urls[0] ? 1 : 0);
        return {
          ...field,
          present,
          count,
          url: isArray ? null : urls[0] || null,
          urls: isArray ? urls : [],
        };
      }),
    }));
  }, [localLoan]);

  const handleUpload = async (fieldKey, isArray, file) => {
    if (!file || !loanId) return;
    setUploadingKey(fieldKey);
    try {
      const { uploadToCloudinary } = await import("../../../../utils/cloudinary");
      const data = await uploadToCloudinary(file);
      const url = data?.secure_url || data?.url;
      if (!url) throw new Error("No URL returned from upload");

      if (isArray && fieldKey === "postfile_documents") {
        const existing = Array.isArray(localLoan.postfile_documents) ? localLoan.postfile_documents : [];
        const newDoc = { name: file.name, url, uploadedAt: new Date().toISOString() };
        const updated = [...existing, newDoc];
        await loansApi.update(loanId, { postfile_documents: updated });
        setLocalLoan((prev) => ({ ...prev, postfile_documents: updated }));
      } else {
        await loansApi.update(loanId, { [fieldKey]: url });
        setLocalLoan((prev) => ({ ...prev, [fieldKey]: url }));
      }
      message.success("Document uploaded.");
      onUploadComplete?.();
    } catch (err) {
      console.error("Upload error", err);
      message.error(err?.message || "Upload failed.");
    } finally {
      setUploadingKey(null);
      const input = fileInputRefs.current[fieldKey];
      if (input) input.value = "";
    }
  };

  const triggerFileInput = (fieldKey, isArray) => {
    const input = fileInputRefs.current[fieldKey];
    if (input) input.click();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-bold text-foreground tracking-tight">Loan Documents</span>
            <span className="text-xs text-muted-foreground">
              {localLoan?.customerName || "Customer"} · {formatLoanId(localLoan?.loanId || localLoan?.loan_number)}
            </span>
          </div>
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-background border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={onClose}
            title="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 min-h-0 space-y-5">
          {categoriesWithStatus.map((category) => (
            <div key={category.id} className="rounded-xl border border-border bg-background/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                <Icon name={category.icon} size={18} className="text-muted-foreground" />
                <span className="font-semibold text-sm text-foreground">{category.title}</span>
              </div>
              <div className="p-3 space-y-2">
                {category.fields.map((field) => {
                  const isArray = field.isArray;
                  const isUploading = uploadingKey === field.key;
                  const present = field.present;
                  return (
                    <div
                      key={field.key}
                      className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-muted/20 border border-transparent hover:border-border/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${
                            present ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          <Icon name={present ? "CheckCircle2" : "AlertCircle"} size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{field.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {present
                              ? isArray
                                ? `${field.count} file(s) uploaded`
                                : "Uploaded"
                              : "Pending"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {field.url && !isArray && (
                          <a
                            href={field.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View
                          </a>
                        )}
                        <input
                          ref={(el) => (fileInputRefs.current[field.key] = el)}
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(field.key, isArray, file);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          iconName="Upload"
                          onClick={() => triggerFileInput(field.key, isArray)}
                          disabled={isUploading}
                          className="text-xs"
                        >
                          {isUploading ? "Uploading…" : present ? "Replace" : "Upload"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          Required documents are shown in their respective sections. Upload missing documents or replace existing ones.
        </div>
      </div>
    </div>
  );
};

export default LoanDocumentsModal;
