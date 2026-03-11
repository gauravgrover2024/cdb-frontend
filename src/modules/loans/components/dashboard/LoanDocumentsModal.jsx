import React, { useEffect, useMemo, useState } from "react";
import { Spin } from "antd";
import Icon from "../../../../components/AppIcon";
import { loansApi } from "../../../../api/loans";

const KEY_LABELS = {
  aadhaarCardDocUrl: "Aadhaar Card",
  panCardDocUrl: "PAN Card",
  passportDocUrl: "Passport",
  dlDocUrl: "Driving License",
  addressProofDocUrl: "Address Proof",
  gstDocUrl: "GST Certificate",
  co_aadhaarCardDocUrl: "Co-Applicant Aadhaar",
  co_panCardDocUrl: "Co-Applicant PAN",
  co_passportDocUrl: "Co-Applicant Passport",
  co_dlDocUrl: "Co-Applicant Driving License",
  co_addressProofDocUrl: "Co-Applicant Address Proof",
  gu_aadhaarCardDocUrl: "Guarantor Aadhaar",
  gu_panCardDocUrl: "Guarantor PAN",
  gu_passportDocUrl: "Guarantor Passport",
  gu_dlDocUrl: "Guarantor Driving License",
  gu_addressProofDocUrl: "Guarantor Address Proof",
  delivery_invoiceFile: "Delivery Invoice",
  delivery_rcFile: "Delivery RC Copy",
  vehiclePhotoUrl: "Vehicle Photo",
  vehicleRCUrl: "Vehicle RC",
  insurancePolicyUrl: "Insurance Policy",
  hypothecationDocUrl: "Hypothecation Document",
  photoUrl: "Customer Photo",
  signatureUrl: "Customer Signature",
  postfile_documents: "Post-File Document",
  postfile_documents_ledger: "Post-File Ledger Document",
};

const hasValue = (v) =>
  v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "");

const looksLikeUrl = (v) => {
  if (!hasValue(v) || typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("data:application/pdf") ||
    s.startsWith("data:image/")
  );
};

const isImageUrl = (url = "") => /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|#|$)/i.test(url) || url.startsWith("data:image/");
const isPdfUrl = (url = "") => /\.pdf(\?|#|$)/i.test(url) || url.startsWith("data:application/pdf");

const formatLabelFromPath = (path = "") =>
  String(path)
    .split(".")
    .filter(Boolean)
    .map((segment) =>
      segment
        .replace(/\[(\d+)\]/g, " $1")
        .replace(/_/g, " ")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .trim(),
    )
    .join(" > ");

const getSourceFromPath = (path = "") => {
  const p = String(path).toLowerCase();
  if (p.includes("co_") || p.includes("coapplicant")) return "Co-Applicant";
  if (p.includes("gu_") || p.includes("guarantor")) return "Guarantor";
  if (p.includes("aadhaar") || p.includes("aadhar") || p.includes("pan") || p.includes("passport") || p.includes("kyc")) {
    return "KYC Documents";
  }
  if (p.includes("instrument")) return "Post-File Instruments";
  if (p.includes("approval_") || p.includes("banksdata")) return "Loan Approval Documents";
  if (p.includes("postfile_")) return "Post-File Document Management";
  if (p.includes("delivery_") || p.includes("rc_") || p.includes("invoice")) return "Delivery & RC";
  if (p.includes("vehicle")) return "Vehicle Documents";
  return "Other Documents";
};

const normalizeDocName = (path, rawName, url) => {
  if (hasValue(rawName)) return String(rawName);
  const key = String(path).split(".").pop();
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  const fromUrl = String(url || "").split("/").pop();
  return decodeURIComponent(fromUrl || formatLabelFromPath(path) || "Document");
};

const extractAllDocuments = (loan) => {
  if (!loan || typeof loan !== "object") return [];
  const found = [];

  const pushDoc = ({ path, url, tag, name, source }) => {
    if (!looksLikeUrl(url)) return;
    found.push({
      id: `${path}:${url}`,
      path,
      url,
      tag: hasValue(tag) ? String(tag) : "",
      name: normalizeDocName(path, name, url),
      source: source || getSourceFromPath(path),
      isImage: isImageUrl(url),
      isPdf: isPdfUrl(url),
    });
  };

  const walk = (value, path = "", parent = null) => {
    if (!hasValue(value)) return;

    if (typeof value === "string" && looksLikeUrl(value)) {
      pushDoc({
        path,
        url: value,
        tag: parent?.tag || parent?.label || parent?.documentTag,
        name: parent?.name || parent?.fileName || parent?.filename || parent?.title,
      });
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${path}[${index}]`, parent));
      return;
    }

    if (typeof value === "object") {
      const objectUrl = value.url || value.secure_url || value.fileUrl || value.docUrl;
      if (looksLikeUrl(objectUrl)) {
        pushDoc({
          path,
          url: objectUrl,
          tag: value.tag || value.label || value.documentTag,
          name: value.name || value.fileName || value.filename || value.title,
          source: value.source,
        });
      }

      Object.entries(value).forEach(([k, v]) => {
        walk(v, path ? `${path}.${k}` : k, value);
      });
    }
  };

  walk(loan);

  const seenByUrl = new Map();
  found.forEach((doc) => {
    if (!seenByUrl.has(doc.url)) {
      seenByUrl.set(doc.url, doc);
      return;
    }
    const existing = seenByUrl.get(doc.url);
    if (!existing.tag && doc.tag) existing.tag = doc.tag;
    if (existing.name === "Document" && doc.name !== "Document") existing.name = doc.name;
    if (existing.source === "Other Documents" && doc.source !== "Other Documents") existing.source = doc.source;
  });

  return Array.from(seenByUrl.values());
};

const LoanDocumentsModal = ({ loan, open, onClose }) => {
  const [localLoan, setLocalLoan] = useState(loan || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocalLoan(loan || null);
  }, [loan]);

  useEffect(() => {
    if (!open || !loan) return;
    const loanId = loan?._id || loan?.loanId;
    if (!loanId) return;
    let cancelled = false;

    const loadFullLoan = async () => {
      setLoading(true);
      try {
        const res = await loansApi.getById(loanId);
        if (cancelled) return;
        const full = res?.data ?? res;
        if (full && typeof full === "object") {
          setLocalLoan((prev) => ({ ...(prev || {}), ...full }));
        }
      } catch (err) {
        console.warn("Could not fetch full loan for documents modal:", err?.message || err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFullLoan();
    return () => {
      cancelled = true;
    };
  }, [open, loan]);

  const allDocs = useMemo(() => extractAllDocuments(localLoan), [localLoan]);

  const groupedDocs = useMemo(() => {
    const map = new Map();
    allDocs.forEach((doc) => {
      const key = doc.source || "Other Documents";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(doc);
    });
    return Array.from(map.entries()).map(([source, docs]) => ({ source, docs }));
  }, [allDocs]);

  const taggedCount = useMemo(() => allDocs.filter((d) => hasValue(d.tag)).length, [allDocs]);

  const displayId = localLoan?.loan_number || localLoan?.loanId || "—";
  const displayName = localLoan?.customerName || "Customer";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-5 py-4">
          <div>
            <p className="text-base font-bold text-foreground">All Loan Documents</p>
            <p className="text-xs text-muted-foreground">
              {displayName} · {displayId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="border-b border-border bg-background px-5 py-3">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="rounded-full border border-border bg-card px-3 py-1 font-semibold text-foreground">
              Total Files: {allDocs.length}
            </span>
            <span className="rounded-full border border-border bg-card px-3 py-1 font-semibold text-foreground">
              Tagged: {taggedCount}
            </span>
            <span className="rounded-full border border-border bg-card px-3 py-1 font-semibold text-foreground">
              Sources: {groupedDocs.length}
            </span>
            {loading && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/70 bg-sky-50 px-3 py-1 font-semibold text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
                <Spin size="small" />
                Syncing latest files...
              </span>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {groupedDocs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center">
              <p className="text-sm font-semibold text-foreground">No documents found in this case</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload files in Profile KYC, Post-File Instrument/Document Management, or Delivery RC/Invoice.
              </p>
            </div>
          ) : (
            groupedDocs.map((group) => (
              <section key={group.source} className="rounded-2xl border border-border bg-background">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-bold text-foreground">{group.source}</p>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {group.docs.length} file(s)
                  </span>
                </div>

                <div className="overflow-x-auto p-4">
                  <div className="flex min-w-max gap-3">
                    {group.docs.map((doc) => (
                      <article
                        key={doc.id}
                        className="w-[240px] shrink-0 rounded-xl border border-border bg-card p-3"
                        title={doc.path}
                      >
                        <div className="mb-3 h-28 overflow-hidden rounded-lg border border-border bg-muted">
                          {doc.isImage ? (
                            <img src={doc.url} alt={doc.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Icon name={doc.isPdf ? "FileText" : "File"} size={24} />
                            </div>
                          )}
                        </div>

                        <p className="truncate text-sm font-semibold text-foreground">{doc.name}</p>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">{formatLabelFromPath(doc.path)}</p>

                        <div className="mt-2 flex min-h-[24px] items-center">
                          {hasValue(doc.tag) ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <Icon name="Tag" size={11} />
                              {doc.tag}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">No tag</span>
                          )}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex flex-1 items-center justify-center rounded-md border border-border bg-background px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                          >
                            View
                          </a>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex flex-1 items-center justify-center rounded-md border border-border bg-background px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                          >
                            Download
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ))
          )}
        </div>

        <div className="border-t border-border bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
          Includes all files found across this loan: Profile KYC, Co-Applicant, Guarantor, Post-File Instruments, Document Management, Delivery RC/Invoice, and other uploaded document URLs.
        </div>
      </div>
    </div>
  );
};

export default LoanDocumentsModal;
