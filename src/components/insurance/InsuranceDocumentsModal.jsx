import React, { useEffect, useMemo, useRef, useState } from "react";
import { Spin } from "antd";
import Icon from "../../components/AppIcon";
import { insuranceApi } from "../../api/insurance";
import API_BASE_URL from "../../config/apiBaseUrl";
import InsuranceDocumentViewerModal from "./InsuranceDocumentViewerModal";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "kyc", label: "KYC" },
  { key: "policy", label: "Policy" },
  { key: "vehicle", label: "Vehicle" },
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
  policy: {
    active: "border-emerald-400/70 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    idle: "border-emerald-300/70 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  vehicle: {
    active: "border-amber-400/70 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    idle: "border-amber-300/70 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
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
const API_BASE = String(API_BASE_URL || "").replace(/\/+$/, "");

const looksLikeR2Host = (value = "") => {
  try {
    const parsed = new URL(String(value || ""));
    const host = String(parsed.hostname || "").toLowerCase();
    return host.includes("r2.dev") || host.includes("cloudflarestorage.com");
  } catch {
    return false;
  }
};

const buildAccessibleDocumentUrl = (value = "") => {
  const url = String(value || "").trim();
  if (!url || url.startsWith("data:")) return url;

  const isR2Path =
    looksLikeR2Host(url) ||
    url.startsWith("/uploads/") ||
    url.startsWith("uploads/");

  if (!isR2Path || !API_BASE) return url;
  return `${API_BASE}/api/upload/file?url=${encodeURIComponent(url)}`;
};

const getSourceFromPath = (path = "") => {
  const p = String(path).toLowerCase();
  if (p.includes("aadhaar") || p.includes("aadhar") || p.includes("pan") || p.includes("kyc")) {
    return "KYC Documents";
  }
  if (p.includes("policy") || p.includes("insurance")) return "Insurance Policy";
  if (p.includes("vehicle") || p.includes("rc_") || p.includes("registration")) return "Vehicle Documents";
  return null;
};

const getDocFilterType = (doc = {}) => {
  const source = String(doc.source || "").toLowerCase();
  const tag = String(doc.tag || "").toLowerCase();
  const hay = `${source} ${tag}`;

  if (hay.includes("kyc") || hay.includes("aadhaar") || hay.includes("pan")) return "kyc";
  if (hay.includes("policy") || hay.includes("insurance")) return "policy";
  if (hay.includes("vehicle") || hay.includes("rc")) return "vehicle";
  return "all";
};

const getDocTagText = (doc = {}, index = -1) => {
  let tag = String(doc?.tag || "").trim();
  if (!tag) {
    tag = String(doc?.name || "").trim();
  }
  
  if (tag && tag.toLowerCase() !== "uploaded-r2") return tag;
  
  const source = String(doc?.source || "");
  if (source) return source;

  return index >= 0 ? `Document ${index + 1}` : "Document";
};

const extractAllDocuments = (data) => {
  if (!data || typeof data !== "object") return [];
  const found = [];

  const pushDoc = ({ path, url, tag, source, name }) => {
    if (!looksLikeUrl(url)) return;
    const finalSource = source || getSourceFromPath(path);
    if (!finalSource) return;

    found.push({
      id: `${path}:${url}`,
      path,
      name: hasValue(name) ? String(name) : "",
      rawUrl: url,
      url: buildAccessibleDocumentUrl(url),
      tag: hasValue(tag) ? String(tag) : "",
      source: finalSource,
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
        name: parent?.name || parent?.fileName,
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
          source: value.source,
          name: value.name || value.fileName,
        });
      }

      Object.entries(value).forEach(([k, v]) => {
        walk(v, path ? `${path}.${k}` : k, value);
      });
    }
  };

  walk(data);

  const seenByUrl = new Map();
  found.forEach((doc) => {
    const dedupeKey = doc.rawUrl || doc.url;
    if (!seenByUrl.has(dedupeKey)) {
      seenByUrl.set(dedupeKey, doc);
    }
  });

  return Array.from(seenByUrl.values());
};

const InsuranceDocumentsModal = ({ insuranceCase, caseId, open, onClose }) => {
  const [localCase, setLocalCase] = useState(insuranceCase || null);
  const [loading, setLoading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState("all");
  const groupRefs = useRef({});

  const setGroupRef = (source) => (el) => {
    if (el) groupRefs.current[source] = el;
  };

  useEffect(() => {
    setLocalCase(insuranceCase || null);
  }, [insuranceCase]);

  useEffect(() => {
    if (!open || !caseId) return;
    let cancelled = false;

    const loadFullCase = async () => {
      setLoading(true);
      try {
        const res = await insuranceApi.getById(caseId);
        const full = res?.data ?? res;
        if (cancelled) return;
        if (full && typeof full === "object") {
          setLocalCase(full);
        }
      } catch (err) {
        console.warn("Could not fetch full insurance case for documents modal:", err?.message || err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFullCase();
    return () => {
      cancelled = true;
    };
  }, [open, caseId]);

  const allDocs = useMemo(() => extractAllDocuments(localCase), [localCase]);
  
  const filteredDocs = useMemo(() => {
    if (activeFilter === "all") return allDocs;
    return allDocs.filter((doc) => getDocFilterType(doc) === activeFilter);
  }, [activeFilter, allDocs]);

  const groupedDocs = useMemo(() => {
    const map = new Map();
    filteredDocs.forEach((doc) => {
      const key = doc.source;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(doc);
    });
    return Array.from(map.entries()).map(([source, docs]) => ({ source, docs }));
  }, [filteredDocs]);

  const filterCounts = useMemo(() => {
    const counts = { all: allDocs.length, kyc: 0, policy: 0, vehicle: 0 };
    allDocs.forEach((doc) => {
      const k = getDocFilterType(doc);
      if (counts[k] !== undefined) counts[k] += 1;
    });
    return counts;
  }, [allDocs]);

  const viewerDoc = viewerIndex >= 0 && viewerIndex < filteredDocs.length ? filteredDocs[viewerIndex] : null;

  const openViewer = (doc) => {
    const index = filteredDocs.findIndex((d) => d.id === doc.id);
    if (index >= 0) setViewerIndex(index);
  };

  const closeViewer = () => setViewerIndex(-1);

  const handleDownloadAll = () => {
    if (!filteredDocs.length) return;
    filteredDocs.forEach((doc, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = doc.url;
        link.download = getDocTagText(doc, index).replace(/\s+/g, "_").toLowerCase();
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 200);
    });
  };

  const scrollGroup = (source, direction = "right") => {
    const node = groupRefs.current[source];
    if (!node) return;
    const delta = direction === "left" ? -300 : 300;
    node.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (!open) return null;

  const customerName = localCase?.customerName || "Customer";
  const policyNumber = localCase?.policyNumber || "Policy";

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="relative flex h-full max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-border bg-[#f8fafc] shadow-2xl dark:bg-[#0A0A0B]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-white px-6 py-4 dark:bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <Icon name="FolderOpen" size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-foreground">Uploaded docs in this insurance</h2>
              <p className="truncate text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {customerName !== "uploaded-r2" ? customerName : "Insurance Case"} • {policyNumber !== "uploaded-r2" ? policyNumber : "Documents"}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-white/5 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Icon name="X" size={18} />
          </button>
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
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-bold transition-all ${
                    isActive ? `${tone.active} shadow-sm scale-[1.02]` : tone.idle
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
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/70 bg-sky-50 px-3 py-1.5 font-bold text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
                <Spin size="small" />
                Updating Gallery...
              </span>
            )}

            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={!filteredDocs.length}
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-1.5 font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:opacity-50 disabled:shadow-none"
            >
              <Icon name="Download" size={13} />
              Download All
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
          {groupedDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-300 dark:bg-white/5 dark:text-white/10">
                <Icon name="File" size={40} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">No Documents Found</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-xs">
                We couldn't find any documents matching the current filter.
              </p>
            </div>
          ) : (
            groupedDocs.map((group) => (
              <section key={group.source} className="rounded-[24px] border border-border/80 bg-white shadow-sm dark:bg-card">
                <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
                  <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{group.source}</p>
                  <div className="flex items-center gap-2">
                    <span className="mr-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {group.docs.length} file(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => scrollGroup(group.source, "left")}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <Icon name="ChevronLeft" size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollGroup(group.source, "right")}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <Icon name="ChevronRight" size={16} />
                    </button>
                  </div>
                </div>

                <div ref={setGroupRef(group.source)} className="overflow-x-auto p-5 scroll-smooth no-scrollbar">
                  <div className="flex min-w-max gap-5">
                    {group.docs.map((doc) => (
                      <article
                        key={doc.id}
                        className="group relative w-64 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition hover:shadow-md"
                      >
                        <div
                          className="relative h-40 cursor-pointer overflow-hidden border-b border-border/80 bg-muted"
                          onClick={() => openViewer(doc)}
                        >
                          {doc.isImage ? (
                            <img
                              src={doc.url}
                              alt={getDocTagText(doc)}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                              onError={(event) => {
                                if (doc.rawUrl && event.currentTarget.src !== doc.rawUrl) {
                                  event.currentTarget.src = doc.rawUrl;
                                }
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground bg-slate-50 dark:bg-black/20">
                              <Icon name={doc.isPdf ? "FileText" : "File"} size={32} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">
                                {doc.isPdf ? "PDF Document" : "File"}
                              </span>
                            </div>
                          )}
                          
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl">
                              <Icon name="Eye" size={20} />
                            </div>
                          </div>

                          <span className="absolute left-3 top-3 inline-flex items-center rounded-full border border-black/10 bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                            {doc.isPdf ? "PDF" : "IMAGE"}
                          </span>
                        </div>

                        <div className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-bold text-foreground">
                              {getDocTagText(doc)}
                            </p>
                            <a
                              href={doc.rawUrl || doc.url}
                              download
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-indigo-600"
                            >
                              <Icon name="Download" size={14} />
                            </a>
                          </div>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                            {doc.source}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ))
          )}
        </div>

        <div className="border-t border-border bg-slate-50 px-6 py-4 dark:bg-black/40">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Documents are automatically extracted from KYC, policy details, and vehicle records associated with this insurance case.
          </p>
        </div>

        {viewerDoc && (
          <InsuranceDocumentViewerModal
            open={Boolean(viewerDoc)}
            documents={filteredDocs}
            currentIndex={viewerIndex}
            onIndexChange={setViewerIndex}
            onClose={closeViewer}
            title="Insurance Document Viewer"
            subtitle={`${customerName} • ${getDocTagText(viewerDoc)}`}
            showThumbnailRail
          />
        )}
      </div>
    </div>
  );
};

export default React.memo(InsuranceDocumentsModal);
