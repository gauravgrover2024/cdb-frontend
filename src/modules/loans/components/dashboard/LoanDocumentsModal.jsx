import React, { useEffect, useMemo, useRef, useState } from "react";
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

const FILTERS = [
  { key: "all", label: "All" },
  { key: "kyc", label: "KYC" },
  { key: "delivery", label: "Delivery" },
  { key: "postfile", label: "Post-file" },
  { key: "rc", label: "RC" },
];

const FILTER_PILL_STYLES = {
  all: {
    active: "border-slate-400/70 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200",
    idle: "border-slate-300/70 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  },
  kyc: {
    active: "border-sky-400/70 bg-sky-100 text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    idle: "border-sky-300/70 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-300",
  },
  delivery: {
    active: "border-amber-400/70 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    idle: "border-amber-300/70 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  },
  postfile: {
    active: "border-emerald-400/70 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    idle: "border-emerald-300/70 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  rc: {
    active: "border-violet-400/70 bg-violet-100 text-violet-800 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    idle: "border-violet-300/70 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-300",
  },
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

const getDocFilterType = (doc = {}) => {
  const source = String(doc.source || "").toLowerCase();
  const path = String(doc.path || "").toLowerCase();
  const name = String(doc.name || "").toLowerCase();
  const hay = `${source} ${path} ${name}`;

  const isRc = hay.includes("rc_") || hay.includes("vehicle rc") || hay.includes(" rc ");
  if (isRc) return "rc";
  if (source.includes("kyc") || path.includes("aadhaar") || path.includes("aadhar") || path.includes("pan") || path.includes("passport")) {
    return "kyc";
  }
  if (source.includes("post-file") || path.includes("postfile") || path.includes("instrument") || path.includes("approval_") || path.includes("banksdata")) {
    return "postfile";
  }
  if (source.includes("delivery") || path.includes("delivery_") || path.includes("invoice")) {
    return "delivery";
  }
  return "all";
};

const getDocTagText = (doc = {}) => (hasValue(doc.tag) ? String(doc.tag) : "Untagged");

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
  const [viewerIndex, setViewerIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showThumbRail, setShowThumbRail] = useState(false);
  const groupScrollRefs = useRef({});
  const thumbHideTimerRef = useRef(null);

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

  useEffect(() => {
    if (!open) {
      setViewerIndex(-1);
      setActiveFilter("all");
      setShowThumbRail(false);
      if (thumbHideTimerRef.current) {
        clearTimeout(thumbHideTimerRef.current);
        thumbHideTimerRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (thumbHideTimerRef.current) clearTimeout(thumbHideTimerRef.current);
    };
  }, []);

  const allDocs = useMemo(() => extractAllDocuments(localLoan), [localLoan]);
  const filteredDocs = useMemo(() => {
    if (activeFilter === "all") return allDocs;
    return allDocs.filter((doc) => getDocFilterType(doc) === activeFilter);
  }, [activeFilter, allDocs]);

  const groupedDocs = useMemo(() => {
    const map = new Map();
    filteredDocs.forEach((doc) => {
      const key = doc.source || "Other Documents";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(doc);
    });
    return Array.from(map.entries()).map(([source, docs]) => ({ source, docs }));
  }, [filteredDocs]);

  const filterCounts = useMemo(() => {
    const counts = { all: allDocs.length, kyc: 0, delivery: 0, postfile: 0, rc: 0 };
    allDocs.forEach((doc) => {
      const k = getDocFilterType(doc);
      if (counts[k] !== undefined) counts[k] += 1;
    });
    return counts;
  }, [allDocs]);

  const viewerDoc = viewerIndex >= 0 && viewerIndex < filteredDocs.length ? filteredDocs[viewerIndex] : null;

  useEffect(() => {
    if (viewerIndex >= filteredDocs.length) setViewerIndex(-1);
  }, [filteredDocs.length, viewerIndex]);

  const openViewer = (doc) => {
    const index = filteredDocs.findIndex((d) => d.id === doc.id);
    if (index >= 0) setViewerIndex(index);
  };

  const closeViewer = () => setViewerIndex(-1);

  const goPrev = () => {
    if (!filteredDocs.length) return;
    setViewerIndex((prev) => (prev <= 0 ? filteredDocs.length - 1 : prev - 1));
  };

  const goNext = () => {
    if (!filteredDocs.length) return;
    setViewerIndex((prev) => (prev >= filteredDocs.length - 1 ? 0 : prev + 1));
  };

  const handleDownloadAll = () => {
    if (!filteredDocs.length) return;
    filteredDocs.forEach((doc, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = doc.url;
        link.download = doc.name || `document_${index + 1}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 180);
    });
  };

  const revealThumbRail = () => {
    if (thumbHideTimerRef.current) {
      clearTimeout(thumbHideTimerRef.current);
      thumbHideTimerRef.current = null;
    }
    setShowThumbRail(true);
  };

  const scheduleHideThumbRail = () => {
    if (thumbHideTimerRef.current) clearTimeout(thumbHideTimerRef.current);
    thumbHideTimerRef.current = setTimeout(() => setShowThumbRail(false), 550);
  };

  const handleViewerMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nearBottom = rect.bottom - e.clientY <= 140;
    if (nearBottom) revealThumbRail();
    else scheduleHideThumbRail();
  };

  const setGroupRef = (source) => (node) => {
    if (node) groupScrollRefs.current[source] = node;
  };

  const scrollGroup = (source, direction = "right") => {
    const node = groupScrollRefs.current[source];
    if (!node) return;
    const delta = direction === "left" ? -320 : 320;
    node.scrollBy({ left: delta, behavior: "smooth" });
  };

  const displayId = localLoan?.loan_number || localLoan?.loanId || "—";
  const displayName = localLoan?.customerName || "Customer";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-2xl dark:bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-white px-6 py-4 dark:bg-card">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <Icon name="FolderOpen" size={18} />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">Loan Documents Gallery</p>
              <p className="text-xs text-muted-foreground">
                {displayName} · {displayId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
              {filteredDocs.length} shown
            </span>
            <p className="text-xs text-muted-foreground">
              {allDocs.length} total
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon name="X" size={16} />
            </button>
          </div>
        </div>

        <div className="border-b border-border bg-white px-5 py-3 dark:bg-card">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter.key;
              const tone = FILTER_PILL_STYLES[filter.key] || FILTER_PILL_STYLES.all;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => {
                    setActiveFilter(filter.key);
                    setViewerIndex(-1);
                  }}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-semibold transition ${
                    isActive ? `${tone.active} shadow-sm` : tone.idle
                  }`}
                >
                  {filter.label}
                  <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px]">
                    {filterCounts[filter.key] || 0}
                  </span>
                </button>
              );
            })}
            {loading && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/70 bg-sky-50 px-3 py-1 font-semibold text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
                <Spin size="small" />
                Syncing latest files...
              </span>
            )}
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={!filteredDocs.length}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-semibold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="Download" size={12} />
              Download All
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {groupedDocs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center">
              <p className="text-sm font-semibold text-foreground">
                No documents found for {FILTERS.find((f) => f.key === activeFilter)?.label || "this filter"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload files in Profile KYC, Post-File Instrument/Document Management, or Delivery RC/Invoice.
              </p>
            </div>
          ) : (
            groupedDocs.map((group) => (
              <section key={group.source} className="rounded-2xl border border-border/80 bg-white shadow-sm dark:bg-card">
                <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                  <p className="text-sm font-bold text-foreground">{group.source}</p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {group.docs.length} file(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => scrollGroup(group.source, "left")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      title="Scroll left"
                    >
                      <Icon name="ChevronLeft" size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollGroup(group.source, "right")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      title="Scroll right"
                    >
                      <Icon name="ChevronRight" size={15} />
                    </button>
                  </div>
                </div>

                <div ref={setGroupRef(group.source)} className="overflow-x-auto p-4">
                  <div className="flex min-w-max gap-4">
                    {group.docs.map((doc) => (
                      <article
                        key={doc.id}
                        className="w-[250px] shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        title={doc.path}
                      >
                        <div
                          className="relative h-36 cursor-pointer overflow-hidden border-b border-border/80 bg-muted"
                          onClick={() => openViewer(doc)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") openViewer(doc);
                          }}
                        >
                          {doc.isImage ? (
                            <img src={doc.url} alt={doc.name} className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Icon name={doc.isPdf ? "FileText" : "File"} size={24} />
                            </div>
                          )}
                          <span className="absolute left-2 top-2 inline-flex items-center rounded-full border border-black/20 bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                            {doc.isPdf ? "PDF" : "Image"}
                          </span>
                        </div>

                        <div className="space-y-2 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">{getDocTagText(doc)}</p>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              title="Download"
                            >
                              <Icon name="Download" size={13} />
                            </a>
                          </div>
                          <p className="line-clamp-2 min-h-[30px] text-[11px] text-muted-foreground">{formatLabelFromPath(doc.path)}</p>
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
        {viewerDoc && (
          <div className="absolute inset-0 z-[5] flex flex-col bg-white/95 backdrop-blur-sm dark:bg-card/95">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{getDocTagText(viewerDoc)}</p>
                  <span className="inline-flex rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {viewerDoc.source}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Document {viewerIndex + 1} of {filteredDocs.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewerDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                >
                  <Icon name="Download" size={13} />
                  Download
                </a>
                <button
                  type="button"
                  onClick={closeViewer}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <Icon name="X" size={16} />
                </button>
              </div>
            </div>

            <div
              className="relative min-h-0 flex-1 px-5 py-4"
              onMouseMove={handleViewerMouseMove}
              onMouseLeave={scheduleHideThumbRail}
            >
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-8 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-background/95 p-2.5 text-foreground shadow-lg transition hover:bg-muted"
                title="Previous"
              >
                <Icon name="ChevronLeft" size={18} />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-8 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-background/95 p-2.5 text-foreground shadow-lg transition hover:bg-muted"
                title="Next"
              >
                <Icon name="ChevronRight" size={18} />
              </button>

              <div className="h-full overflow-hidden rounded-2xl border border-border/70 bg-background shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                {viewerDoc.isImage ? (
                  <img src={viewerDoc.url} alt={viewerDoc.name} className="h-full w-full object-contain" />
                ) : (
                  <iframe
                    title={viewerDoc.name}
                    src={viewerDoc.url}
                    className="h-full w-full"
                    loading="lazy"
                  />
                )}
              </div>

              <div
                className={`pointer-events-none absolute inset-x-6 bottom-4 z-20 transition-all duration-200 ${
                  showThumbRail ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                }`}
              >
                <div
                  className="pointer-events-auto rounded-xl border border-border/70 bg-background/92 p-2 shadow-xl backdrop-blur-sm"
                  onMouseEnter={revealThumbRail}
                  onMouseLeave={scheduleHideThumbRail}
                >
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {filteredDocs.map((doc, idx) => (
                      <div
                        key={doc.id}
                        className={`relative w-[120px] shrink-0 rounded-lg border p-1.5 transition ${
                          idx === viewerIndex
                            ? "border-primary bg-primary/5 ring-1 ring-primary/25"
                            : "border-border bg-card/70"
                        }`}
                        title={getDocTagText(doc)}
                      >
                        <button
                          type="button"
                          onClick={() => setViewerIndex(idx)}
                          className="h-16 w-full overflow-hidden rounded-md border border-border/50 bg-muted"
                        >
                          {doc.isImage ? (
                            <img src={doc.url} alt={doc.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                              <Icon name={doc.isPdf ? "FileText" : "File"} size={17} />
                            </div>
                          )}
                        </button>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background/95 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          title="Download"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Icon name="Download" size={11} />
                        </a>
                        <p className="mt-1.5 truncate text-[10px] font-semibold text-foreground">{getDocTagText(doc)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanDocumentsModal;
