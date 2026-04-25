import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Select, message } from "antd";
import Icon from "../../AppIcon";
import Button from "../../ui/Button";
import LoanDocumentViewerModal from "../../../modules/loans/components/shared/LoanDocumentViewerModal";
import { uploadMultipleFiles } from "../../../api/uploads";
import API_BASE_URL from "../../../config/apiBaseUrl";

const sectionHeaderLabel =
  "text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400";

const TAG_COLOR_THEMES = [
  {
    active: "border-emerald-300 bg-emerald-600 text-white",
    soft: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    active: "border-sky-300 bg-sky-600 text-white",
    soft: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    active: "border-violet-300 bg-violet-600 text-white",
    soft: "border-violet-200 bg-violet-50 text-violet-700",
  },
  {
    active: "border-amber-300 bg-amber-500 text-white",
    soft: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    active: "border-rose-300 bg-rose-600 text-white",
    soft: "border-rose-200 bg-rose-50 text-rose-700",
  },
  {
    active: "border-cyan-300 bg-cyan-600 text-white",
    soft: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
];

const EW_SUGGESTED_TAGS = [
  "Policy Copy",
  "RC Copy",
  "Invoice",
  "Pan",
  "Aadhaar Front",
  "Aadhaar Back",
  "GST Page 1",
  "GST Page 2",
  "GST Page 3",
];

const DOCUMENT_MATRIX = {
  "new-car-insurance": {
    label: "New Car Insurance",
    suggested: [
      "Policy Copy",
      "Invoice",
      "Pan",
      "Aadhaar Front",
      "Aadhaar Back",
      "GST Page 1",
      "GST Page 2",
      "GST Page 3",
      "RC Copy",
    ],
  },
  "used-car-insurance": {
    label: "Used Car Insurance",
    suggested: [
      "Policy Copy",
      "RC Copy",
      "Pan",
      "Aadhaar Front",
      "Aadhaar Back",
      "GST Page 1",
      "GST Page 2",
      "GST Page 3",
      "Form 29",
      "Form 30 page 1",
      "Form 30 page 2",
      "Inspection Report",
    ],
  },
  "used-car-renewal": {
    label: "Used Car Renewal",
    suggested: [
      "Policy Copy",
      "Previous Year Policy",
      "RC Copy",
      "Pan",
      "Aadhaar Front",
      "Aadhaar Back",
      "GST Page 1",
      "GST Page 2",
      "GST Page 3",
    ],
  },
  "policy-already-expired": {
    label: "Policy Already Expired",
    suggested: [
      "Policy Copy",
      "Previous Year Policy",
      "RC Copy",
      "Pan",
      "Aadhaar Front",
      "Aadhaar Back",
      "GST Page 1",
      "GST Page 2",
      "GST Page 3",
      "Inspection Report",
    ],
  },
  "ew-policy": {
    label: "EW Policy",
    suggested: EW_SUGGESTED_TAGS,
  },
};

const initialUiState = {
  scenario: "used-car-renewal",
  searchText: "",
  sortBy: "newest",
  selectedDocId: null,
  isViewerOpen: false,
  isDragging: false,
};

function uiReducer(state, action) {
  switch (action.type) {
    case "SET_SCENARIO":
      return { ...state, scenario: action.payload };
    case "SET_SEARCH":
      return { ...state, searchText: action.payload };
    case "SET_SORT":
      return { ...state, sortBy: action.payload };
    case "SELECT_DOC":
      return { ...state, selectedDocId: action.payload };
    case "OPEN_VIEWER":
      return { ...state, isViewerOpen: true, selectedDocId: action.payload };
    case "CLOSE_VIEWER":
      return { ...state, isViewerOpen: false };
    case "SET_DRAGGING":
      return { ...state, isDragging: action.payload };
    default:
      return state;
  }
}

const getScenarioFromForm = (formData = {}) => {
  const policyCategory = String(formData?.policyCategory || "")
    .trim()
    .toLowerCase();
  if (policyCategory.includes("extended warranty") || policyCategory.includes("ew")) {
    return "ew-policy";
  }

  if (formData?.vehicleType === "New Car") return "new-car-insurance";

  const expiryDates = [formData?.previousOdExpiryDate, formData?.previousTpExpiryDate]
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));

  const isExpired =
    expiryDates.length > 0 &&
    Math.max(...expiryDates.map((date) => date.getTime())) < Date.now();

  if (isExpired) return "policy-already-expired";

  const hasPreviousPolicy =
    Boolean(String(formData?.previousPolicyNumber || "").trim()) ||
    Boolean(String(formData?.previousInsuranceCompany || "").trim());

  if (hasPreviousPolicy) return "used-car-renewal";
  return "used-car-insurance";
};

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
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;

  const isR2Path =
    looksLikeR2Host(url) || url.startsWith("/uploads/") || url.startsWith("uploads/");

  if (!isR2Path || !API_BASE) return url;
  return `${API_BASE}/api/upload/file?url=${encodeURIComponent(url)}`;
};

const getStableDocId = (doc, fallback = "") =>
  String(doc?.id || doc?.public_id || doc?.publicId || doc?.storageKey || doc?.url || fallback);

const uniqueList = (values = []) => Array.from(new Set(values.filter(Boolean)));

const formatFileSize = (bytes) => {
  const numeric = Number(bytes || 0);
  if (!numeric) return "0 KB";
  const units = ["Bytes", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(numeric) / Math.log(1024)), units.length - 1);
  const value = numeric / 1024 ** unitIndex;
  return `${Math.round(value * 100) / 100} ${units[unitIndex]}`;
};

const extensionFromName = (value = "") => {
  const clean = String(value || "").split("?")[0].split("#")[0];
  const last = clean.split(".").pop();
  return last && last !== clean ? last.toLowerCase() : "";
};

const decodeLoose = (value = "") => {
  const input = String(value || "");
  if (!input) return "";
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
};

const buildDetectionText = (doc = {}) =>
  [
    doc?.type,
    doc?.mimeType,
    doc?.contentType,
    doc?.resource_type,
    doc?.format,
    doc?.name,
    doc?.originalName,
    doc?.original_name,
    doc?.storageKey,
    doc?.storage_key,
    doc?.public_id,
    doc?.publicId,
    doc?.url,
    doc?.previewUrl,
    doc?.rawUrl,
    decodeLoose(doc?.url),
    decodeLoose(doc?.previewUrl),
    decodeLoose(doc?.rawUrl),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const isImageLike = (doc = {}) => {
  const type = String(doc?.type || doc?.mimeType || doc?.contentType || "").toLowerCase();
  const format = String(
    doc?.format ||
      extensionFromName(
        doc?.name ||
          doc?.originalName ||
          doc?.storageKey ||
          doc?.storage_key ||
          doc?.url ||
          doc?.rawUrl,
      ),
  ).toLowerCase();
  const url = buildDetectionText(doc);
  return (
    type.startsWith("image/") ||
    type.includes("image") ||
    ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg", "heic", "heif"].includes(format) ||
    /\.(jpg|jpeg|png|webp|gif|bmp|svg|heic|heif)(\?|#|$)/i.test(url)
  );
};

const isPdfLike = (doc = {}) => {
  const type = String(doc?.type || doc?.mimeType || doc?.contentType || "").toLowerCase();
  const format = String(
    doc?.format ||
      extensionFromName(
        doc?.name ||
          doc?.originalName ||
          doc?.storageKey ||
          doc?.storage_key ||
          doc?.url ||
          doc?.rawUrl,
      ),
  ).toLowerCase();
  const url = buildDetectionText(doc);
  return (
    type === "application/pdf" ||
    type.includes("pdf") ||
    format === "pdf" ||
    format.includes("pdf") ||
    /\.pdf(\?|#|$)/i.test(url)
  );
};

const safeDateValue = (value) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getDocDisplayLabel = (doc, index = -1) => {
  const tag = String(doc?.tag || "").trim();
  if (tag) return tag;
  return index >= 0 ? `Document ${index + 1}` : "Document";
};

const getDocStatus = (doc) => {
  const tag = String(doc?.tag || "").trim();
  if (!tag) {
    return { label: "Untagged", className: "border-sky-200 bg-sky-50 text-sky-700" };
  }
  return { label: "Tagged", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
};

const getTagTheme = (tag) => {
  const key = String(tag || "").trim();
  if (!key) return TAG_COLOR_THEMES[0];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return TAG_COLOR_THEMES[Math.abs(hash) % TAG_COLOR_THEMES.length];
};

const StatTile = ({ label, value, tone = "slate", helper }) => {
  const toneClass =
    tone === "sky"
      ? "border-sky-200 bg-sky-50"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50"
        : "border-slate-200 bg-slate-50";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-800">{value}</div>
      {helper ? <div className="mt-1 text-xs text-slate-500">{helper}</div> : null}
    </div>
  );
};

const QuickTag = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    data-quick-tag="true"
    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
      active ? getTagTheme(label).active : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
    }`}
  >
    {label}
  </button>
);

const UploadDropzone = ({ isDragging, uploading, onBrowse, onDragStateChange, onDropFiles }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => {
      if (!uploading) onBrowse();
    }}
    onKeyDown={(event) => {
      if ((event.key === "Enter" || event.key === " ") && !uploading) {
        event.preventDefault();
        onBrowse();
      }
    }}
    onDragOver={(event) => {
      event.preventDefault();
      onDragStateChange(true);
    }}
    onDragEnter={(event) => {
      event.preventDefault();
      onDragStateChange(true);
    }}
    onDragLeave={(event) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      onDragStateChange(false);
    }}
    onDrop={(event) => {
      event.preventDefault();
      onDragStateChange(false);
      if (uploading) return;
      const files = Array.from(event.dataTransfer?.files || []);
      if (files.length) onDropFiles(files);
    }}
    className={`rounded-[24px] border-2 border-dashed px-5 py-4 transition ${
      isDragging
        ? "border-sky-400 bg-sky-50 shadow-[0_14px_40px_rgba(14,165,233,0.12)]"
        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
    }`}
  >
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Icon name="CloudUpload" size={22} />
        </div>
        <div>
          <div className="text-sm font-black text-slate-800 md:text-base">Upload insurance documents</div>
          <div className="mt-1 text-sm text-slate-500">
            Files are uploaded to Cloudflare R2 and linked to this insurance case instantly.
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
          JPG, PNG, PDF, DOC, XLSX
        </span>
        <Button
          variant="default"
          iconName={uploading ? "Loader2" : "Upload"}
          iconPosition="left"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            if (!uploading) onBrowse();
          }}
          className="h-10 rounded-xl bg-sky-600 px-4 text-white hover:bg-sky-700"
        >
          {uploading ? "Uploading..." : "Upload documents"}
        </Button>
      </div>
    </div>
  </div>
);

const PreviewPane = ({ doc, index, total, onOpenViewer, onDownload, onPrint }) => {
  const imageLike = isImageLike(doc || {});
  const pdfLike = isPdfLike(doc || {});
  const status = getDocStatus(doc || {});
  const [pdfBlobUrl, setPdfBlobUrl] = useState("");

  const rawPreviewSrc = useMemo(
    () => String(doc?.rawUrl || doc?.url || doc?.previewUrl || "").split("#")[0],
    [doc],
  );
  const pdfSourceCandidates = useMemo(
    () =>
      uniqueList([
        rawPreviewSrc,
        doc?.rawUrl,
        doc?.url,
        doc?.previewUrl,
        buildAccessibleDocumentUrl(rawPreviewSrc),
        buildAccessibleDocumentUrl(doc?.rawUrl),
        buildAccessibleDocumentUrl(doc?.url),
        buildAccessibleDocumentUrl(doc?.previewUrl),
      ]).filter(Boolean),
    [doc, rawPreviewSrc],
  );

  const pdfPreviewSrc = useMemo(() => {
    return String(pdfBlobUrl || pdfSourceCandidates[0] || rawPreviewSrc || "");
  }, [pdfBlobUrl, pdfSourceCandidates, rawPreviewSrc]);

  useEffect(() => {
    let isCanceled = false;
    let objectUrl = "";
    if (!pdfLike || !pdfSourceCandidates.length) {
      setPdfBlobUrl("");
      return undefined;
    }
    const loadPdf = async () => {
      for (let i = 0; i < pdfSourceCandidates.length; i += 1) {
        try {
          const response = await fetch(pdfSourceCandidates[i], { credentials: "include" });
          if (!response.ok) throw new Error("PDF fetch failed");
          const blob = await response.blob();
          if (!blob || !blob.size) throw new Error("Empty PDF blob");
          objectUrl = URL.createObjectURL(
            blob.type === "application/pdf"
              ? blob
              : new Blob([blob], { type: "application/pdf" }),
          );
          if (!isCanceled) setPdfBlobUrl(objectUrl);
          return;
        } catch {
          // try next candidate
        }
      }
      if (!isCanceled) setPdfBlobUrl(pdfSourceCandidates[0] || "");
    };
    loadPdf();
    return () => {
      isCanceled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdfLike, pdfSourceCandidates]);

  if (!doc) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-4">
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
            <Icon name="PanelRightOpen" size={22} />
          </div>
          <div className="text-base font-black text-slate-800">Select a document</div>
          <p className="mt-2 max-w-xs text-sm text-slate-500">
            Click any document card from the library to open a live preview.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
      <div className="flex items-center justify-between gap-3 px-2 pb-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Preview</div>
          <div className="mt-1 text-sm font-black text-slate-800">
            {Math.min(index + 1, total)}/{total}
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
        {imageLike ? (
          <img
            src={doc.previewUrl || doc.url}
            alt={getDocDisplayLabel(doc, index)}
            loading="lazy"
            className="h-[420px] w-full object-contain bg-white"
          />
        ) : pdfLike ? (
          pdfPreviewSrc ? (
            <object
              data={pdfPreviewSrc}
              type="application/pdf"
              className="h-[420px] w-full bg-white"
            >
              <iframe
                title={getDocDisplayLabel(doc, index)}
                src={pdfPreviewSrc}
                className="h-[420px] w-full bg-white"
              />
            </object>
          ) : (
            <div className="flex h-[420px] flex-col items-center justify-center gap-3 bg-white px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-500">
                <Icon name="FileText" size={28} />
              </div>
              <div className="text-sm font-bold text-slate-800">Unable to load PDF preview</div>
              <div className="max-w-xs text-sm text-slate-500">
                Use Open Viewer or Download to inspect this file.
              </div>
            </div>
          )
        ) : (
          <div className="flex h-[420px] flex-col items-center justify-center gap-3 bg-white px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-500">
              <Icon name="File" size={28} />
            </div>
            <div className="text-sm font-bold text-slate-800">Preview unavailable</div>
            <div className="max-w-xs text-sm text-slate-500">
              This file type can still be downloaded and reviewed externally.
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-3 px-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Document</div>
          <div className="mt-1 break-words text-sm font-bold text-slate-800">{getDocDisplayLabel(doc, index)}</div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span className="rounded-full bg-slate-100 px-2.5 py-1">{doc.sizeLabel}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">{doc.format || "file"}</span>
          {doc.uploadedAt ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              {new Date(doc.uploadedAt).toLocaleDateString("en-IN")}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            variant="outline"
            iconName="Expand"
            iconPosition="left"
            size="sm"
            onClick={() => onOpenViewer(doc)}
            className="h-10 rounded-xl border-slate-200 bg-white px-4 hover:bg-slate-50"
          >
            Full viewer
          </Button>
          <Button
            variant="outline"
            iconName="Printer"
            iconPosition="left"
            size="sm"
            onClick={() => onPrint(doc, index)}
            className="h-10 rounded-xl border-violet-200 bg-violet-50 px-4 text-violet-700 hover:bg-violet-100"
          >
            Print
          </Button>
          <Button
            variant="outline"
            iconName="Download"
            iconPosition="left"
            size="sm"
            onClick={() => onDownload(doc, index)}
            className="h-10 rounded-xl border-sky-200 bg-sky-50 px-4 text-sky-700 hover:bg-sky-100"
          >
            Download
          </Button>
        </div>
      </div>
    </div>
  );
};

const Step6Documents = ({
  formData,
  documents = [],
  setDocuments,
  schedulePersist,
  docsTaggedCount,
}) => {
  const fileInputRef = useRef(null);
  const [ui, dispatch] = useReducer(uiReducer, initialUiState);
  const [uploading, setUploading] = useState(false);
  const [manualTagInput, setManualTagInput] = useState("");
  const [manualTags, setManualTags] = useState([]);
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    dispatch({ type: "SET_SCENARIO", payload: getScenarioFromForm(formData) });
  }, [formData]);

  const persistSoon = useCallback(() => {
    if (typeof schedulePersist === "function") schedulePersist(250);
  }, [schedulePersist]);

  const activeRequirement = DOCUMENT_MATRIX[ui.scenario] || DOCUMENT_MATRIX["used-car-renewal"];

  const normalizedDocuments = useMemo(
    () =>
      (Array.isArray(documents) ? documents : []).map((doc, index) => {
        const rawUrl = String(doc?.url || doc?.previewUrl || doc?.secure_url || "").trim();
        const previewUrl = buildAccessibleDocumentUrl(rawUrl);

        const originalName = String(
          doc?.originalName || doc?.original_name || doc?.name || `Document ${index + 1}`,
        ).trim();

        const fallbackFormat =
          extensionFromName(originalName || rawUrl) ||
          String(doc?.format || "")
            .toLowerCase()
            .split("/")
            .pop();

        const mimeType = String(doc?.type || doc?.resource_type || doc?.format || "");
        const sizeBytes =
          typeof doc?.size === "number" ? doc.size : Number(doc?.sizeBytes || 0) || 0;

        return {
          ...doc,
          id: getStableDocId(doc, `doc-${index}`),
          name: originalName,
          originalName,
          rawUrl,
          url: previewUrl || rawUrl,
          previewUrl: previewUrl || rawUrl,
          sizeBytes,
          sizeLabel: doc?.sizeLabel || formatFileSize(sizeBytes),
          uploadedAt: doc?.uploadedAt || "",
          uploadedBy: doc?.uploadedBy || "",
          type: mimeType,
          format: String(doc?.format || fallbackFormat || "file").toLowerCase(),
          tag: String(doc?.tag || "").trim(),
        };
      }),
    [documents],
  );

  const baseSuggestedTags = useMemo(() => {
    if (ui.scenario === "ew-policy") return EW_SUGGESTED_TAGS;
    return activeRequirement.suggested || [];
  }, [activeRequirement.suggested, ui.scenario]);

  const persistedCustomTags = useMemo(() => {
    const baseSet = new Set(baseSuggestedTags.map((x) => String(x || "").trim()));
    return uniqueList(
      normalizedDocuments
        .map((doc) => String(doc?.tag || "").trim())
        .filter((tag) => tag && !baseSet.has(tag)),
    );
  }, [baseSuggestedTags, normalizedDocuments]);

  const suggestedTags = useMemo(
    () => uniqueList([...baseSuggestedTags, ...persistedCustomTags, ...manualTags]),
    [baseSuggestedTags, manualTags, persistedCustomTags],
  );

  const safeTaggedCount =
    typeof docsTaggedCount === "number"
      ? docsTaggedCount
      : normalizedDocuments.filter((doc) => String(doc?.tag || "").trim()).length;

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = ui.searchText.trim().toLowerCase();

    const filtered = normalizedDocuments.filter((doc, index) => {
      if (!normalizedSearch) return true;
      const haystack = [
        getDocDisplayLabel(doc, index),
        doc.tag,
        doc.format,
        doc.uploadedBy,
        doc.uploadedAt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    return [...filtered].sort((a, b) => {
      if (ui.sortBy === "tagged") {
        const aTagged = Boolean(String(a.tag || "").trim());
        const bTagged = Boolean(String(b.tag || "").trim());
        if (aTagged !== bTagged) return aTagged ? -1 : 1;
      }
      if (ui.sortBy === "untagged") {
        const aTagged = Boolean(String(a.tag || "").trim());
        const bTagged = Boolean(String(b.tag || "").trim());
        if (aTagged !== bTagged) return aTagged ? 1 : -1;
      }
      if (ui.sortBy === "name") {
        return String(getDocDisplayLabel(a, 0)).localeCompare(String(getDocDisplayLabel(b, 0)));
      }
      return safeDateValue(b.uploadedAt) - safeDateValue(a.uploadedAt);
    });
  }, [normalizedDocuments, ui.searchText, ui.sortBy]);

  const selectedDoc = useMemo(() => {
    if (!filteredDocuments.length) return null;
    const selected = filteredDocuments.find((doc) => getStableDocId(doc) === ui.selectedDocId);
    return selected || filteredDocuments[0];
  }, [filteredDocuments, ui.selectedDocId]);

  const visibleDocuments = useMemo(
    () => filteredDocuments.slice(0, visibleCount),
    [filteredDocuments, visibleCount],
  );

  useEffect(() => {
    setVisibleCount(24);
  }, [ui.searchText, ui.sortBy, ui.scenario]);

  useEffect(() => {
    if (!filteredDocuments.length) {
      dispatch({ type: "SELECT_DOC", payload: null });
      return;
    }
    if (!ui.selectedDocId) {
      dispatch({ type: "SELECT_DOC", payload: getStableDocId(filteredDocuments[0]) });
      return;
    }
    const exists = filteredDocuments.some((doc) => getStableDocId(doc) === ui.selectedDocId);
    if (!exists) {
      dispatch({ type: "SELECT_DOC", payload: getStableDocId(filteredDocuments[0]) });
    }
  }, [filteredDocuments, ui.selectedDocId]);

  const viewerDocuments = useMemo(
    () =>
      filteredDocuments.map((doc, index) => ({
        ...doc,
        original_name: doc.original_name || doc.originalName || doc.name || "",
        storageKey: doc.storageKey || doc.storage_key || "",
        public_id: doc.public_id || doc.publicId || "",
        resource_type: doc.resource_type || "",
        mimeType: doc.mimeType || doc.type || "",
        id: getStableDocId(doc, `viewer-${index}`),
        name: getDocDisplayLabel(doc, index),
        originalName: doc.originalName || doc.name || "",
        tag: doc.tag || "",
        documentStage: doc.documentStage || "",
        rawUrl: doc.rawUrl || doc.url || doc.previewUrl || "",
        url:
          doc.rawUrl ||
          doc.url ||
          doc.previewUrl ||
          buildAccessibleDocumentUrl(doc.rawUrl || doc.url || doc.previewUrl || ""),
        previewUrl:
          doc.rawUrl ||
          doc.url ||
          doc.previewUrl ||
          buildAccessibleDocumentUrl(doc.rawUrl || doc.url || doc.previewUrl || ""),
        proxyUrl: buildAccessibleDocumentUrl(doc.rawUrl || doc.url || doc.previewUrl || ""),
        isPdf:
          Boolean(doc.isPdf) ||
          isPdfLike({
            ...doc,
            name: doc.originalName || doc.name,
            format:
              doc.format ||
              extensionFromName(
                doc.originalName ||
                  doc.original_name ||
                  doc.storageKey ||
                  doc.name ||
                  doc.url,
              ),
          }),
        isImage: Boolean(doc.isImage) || isImageLike(doc),
        type:
          doc.type ||
          (isImageLike(doc)
            ? `image/${String(doc.format || "jpeg").toLowerCase()}`
            : isPdfLike(doc)
              ? "application/pdf"
              : ""),
        format:
          doc.format ||
          extensionFromName(
            doc.originalName || doc.original_name || doc.storageKey || doc.name || doc.url,
          ) ||
          (isPdfLike(doc) ? "pdf" : isImageLike(doc) ? "jpg" : "file"),
      })),
    [filteredDocuments],
  );

  const viewerIndex = useMemo(() => {
    if (!selectedDoc) return 0;
    const idx = viewerDocuments.findIndex((doc) => getStableDocId(doc) === getStableDocId(selectedDoc));
    return idx >= 0 ? idx : 0;
  }, [selectedDoc, viewerDocuments]);

  const openFileExplorer = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const appendFiles = useCallback(
    async (files) => {
      const pickedFiles = Array.from(files || []).filter(Boolean);
      if (!pickedFiles.length) return;

      setUploading(true);
      try {
        const uploaded = await uploadMultipleFiles(pickedFiles);
        const nowIso = new Date().toISOString();
        const incoming = uploaded.map((file, index) => {
          const rawUrl = String(file?.secure_url || file?.url || "").trim();
          const originalName = String(file?.original_name || file?.name || `Document ${index + 1}`).trim();
          const format =
            extensionFromName(originalName || rawUrl) ||
            String(file?.format || "")
              .toLowerCase()
              .split("/")
              .pop() ||
            "file";

          const mimeType = String(file?.format || file?.type || "").trim();
          const sizeBytes = Number(file?.size || 0);
          const storageKey = String(file?.public_id || file?.storageKey || "").trim();

          return {
            id:
              storageKey ||
              `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
            name: originalName,
            originalName,
            size: sizeBytes,
            sizeBytes,
            sizeLabel: formatFileSize(sizeBytes),
            type: mimeType,
            format,
            tag: "",
            uploadedAt: nowIso,
            uploadedBy: "Current User",
            storageKey,
            url: rawUrl,
            previewUrl: buildAccessibleDocumentUrl(rawUrl),
            source: "uploaded-r2",
          };
        });

        setDocuments((prev) => [...(Array.isArray(prev) ? prev : []), ...incoming]);
        persistSoon();
        message.success(`${incoming.length} document${incoming.length > 1 ? "s" : ""} uploaded`);
      } catch (err) {
        console.error("[Insurance][Documents] upload failed:", err);
        message.error(err?.message || "Document upload failed");
      } finally {
        setUploading(false);
      }
    },
    [persistSoon, setDocuments],
  );

  const handlePickedFiles = useCallback(
    (event) => {
      appendFiles(event.target.files || []);
      event.target.value = "";
    },
    [appendFiles],
  );

  const updateDocTag = useCallback(
    (docId, tagValue) => {
      const finalTag = String(tagValue || "").trim();
      setDocuments((prev) =>
        (Array.isArray(prev) ? prev : []).map((doc) => {
          if (getStableDocId(doc) !== docId) return doc;
          const currentTag = String(doc?.tag || "").trim();
          return {
            ...doc,
            tag: currentTag === finalTag ? "" : finalTag,
          };
        }),
      );
      persistSoon();
    },
    [persistSoon, setDocuments],
  );

  const addManualTag = useCallback(() => {
    const nextTag = String(manualTagInput || "").trim();
    if (!nextTag) return;
    setManualTags((prev) => uniqueList([...prev, nextTag]));
    setManualTagInput("");
  }, [manualTagInput]);

  const removeManualTag = useCallback((tagToRemove) => {
    const normalized = String(tagToRemove || "").trim();
    if (!normalized) return;
    setManualTags((prev) => prev.filter((tag) => String(tag || "").trim() !== normalized));
  }, []);

  const removeDocument = useCallback(
    (docId) => {
      setDocuments((prev) =>
        (Array.isArray(prev) ? prev : []).filter((item) => getStableDocId(item) !== docId),
      );
      persistSoon();
    },
    [persistSoon, setDocuments],
  );

  const handleDownload = useCallback((doc, index = 0) => {
    const href = doc?.previewUrl || doc?.url || doc?.rawUrl;
    if (!href) return;

    const ext = extensionFromName(doc?.format || doc?.name || doc?.url || "") || "file";
    const nameBase = getDocDisplayLabel(doc, index)
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const link = document.createElement("a");
    link.href = href;
    link.download = `${nameBase || `document-${index + 1}`}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handlePrint = useCallback((doc) => {
    const href = String(doc?.previewUrl || doc?.url || doc?.rawUrl || "").trim();
    if (!href) {
      message.warning("No document available for print.");
      return;
    }
    const printFromBlob = async () => {
      let objectUrl = "";
      let iframe = null;
      try {
        const response = await fetch(href, { credentials: "include" });
        if (!response.ok) throw new Error("Unable to load document for print.");
        const blob = await response.blob();
        if (!blob || !blob.size) throw new Error("Empty document.");
        objectUrl = URL.createObjectURL(blob);

        iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.src = objectUrl;
        document.body.appendChild(iframe);

        iframe.onload = () => {
          setTimeout(() => {
            try {
              iframe?.contentWindow?.focus();
              iframe?.contentWindow?.print();
            } catch {
              message.warning("Unable to trigger print on this file.");
            }
          }, 300);
        };
      } catch (error) {
        message.warning(error?.message || "Unable to print this document.");
      } finally {
        setTimeout(() => {
          if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        }, 4000);
      }
    };
    printFromBlob();
  }, []);

  const handleDownloadAll = useCallback(async () => {
    if (!normalizedDocuments.length) {
      message.info("No documents available to download.");
      return;
    }
    for (let index = 0; index < normalizedDocuments.length; index += 1) {
      handleDownload(normalizedDocuments[index], index);
      // avoid browser dropping multiple instant downloads
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 140));
    }
    message.success(`Download started for ${normalizedDocuments.length} documents.`);
  }, [handleDownload, normalizedDocuments]);

  const handleViewerIndexChange = useCallback(
    (idx) => {
      const nextDocument = viewerDocuments[idx];
      if (!nextDocument) return;
      dispatch({ type: "SELECT_DOC", payload: getStableDocId(nextDocument) });
    },
    [viewerDocuments],
  );

  const selectedDocIndex = useMemo(() => {
    if (!selectedDoc) return 0;
    const idx = filteredDocuments.findIndex((doc) => getStableDocId(doc) === getStableDocId(selectedDoc));
    return idx >= 0 ? idx : 0;
  }, [filteredDocuments, selectedDoc]);

  const getQuickTagsForDoc = useCallback(
    (doc) => {
      const docId = getStableDocId(doc);
      const usedElsewhere = new Set(
        normalizedDocuments
          .filter((item) => getStableDocId(item) !== docId)
          .map((item) => String(item?.tag || "").trim())
          .filter(Boolean),
      );

      return suggestedTags.filter((tag) => {
        const normalized = String(tag || "").trim();
        if (!normalized) return false;
        return !usedElsewhere.has(normalized) || normalized === String(doc?.tag || "").trim();
      });
    },
    [normalizedDocuments, suggestedTags],
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        onChange={handlePickedFiles}
      />

      <div className="-mt-2 flex flex-col gap-3">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-r from-[#DAF3FF] via-white to-[#FFE6C6] shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
          <div className="px-5 py-3.5 md:px-6 md:py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className={sectionHeaderLabel}>Documentation</div>
                <div className="truncate text-[22px] font-black tracking-tight text-slate-800">Document workspace</div>
                <div className="mt-1 text-sm text-slate-500">
                  Suggested tags only, live preview rail, and direct Cloudflare R2 storage.
                </div>
              </div>

              <div className="w-full xl:w-auto xl:min-w-[280px]">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Policy flow</div>
                  <div className="mt-1 text-sm font-bold text-slate-800">{activeRequirement.label}</div>
                  <div className="mt-1 text-xs text-slate-500">Documents are suggested, not mandatory.</div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <StatTile
                label="Uploaded"
                value={normalizedDocuments.length}
                tone="sky"
                helper="Documents linked to this case"
              />
              <StatTile
                label="Tagged"
                value={safeTaggedCount}
                tone="emerald"
                helper={`${Math.max(normalizedDocuments.length - safeTaggedCount, 0)} left to classify`}
              />
              <StatTile
                label="Suggested"
                value={suggestedTags.length}
                helper="Quick tags available for this policy"
              />
            </div>

            <div className="mt-3 rounded-[20px] border border-slate-200 bg-white/90 p-3 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Suggested document tags</div>
                <div className="flex w-full items-center gap-2 md:w-auto md:max-w-[360px]">
                  <input
                    value={manualTagInput}
                    onChange={(event) => setManualTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addManualTag();
                      }
                    }}
                    placeholder="Manual tag"
                    className="h-8 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                  />
                  <Button
                    variant="outline"
                    iconName="Plus"
                    size="sm"
                    onClick={addManualTag}
                    className="h-8 rounded-xl border-slate-200 bg-white px-2.5 hover:bg-slate-50"
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestedTags.map((item) => {
                  const normalized = String(item || "").trim();
                  const isManual = manualTags.some((tag) => String(tag || "").trim() === normalized);
                  const theme = getTagTheme(item);
                  return (
                    <span
                      key={item}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${theme.soft}`}
                    >
                      {item}
                      {isManual ? (
                        <button
                          type="button"
                          aria-label={`Remove ${item}`}
                          onClick={() => removeManualTag(item)}
                          className="rounded-full p-0.5 text-current/80 transition hover:bg-black/10 hover:text-current"
                        >
                          <Icon name="X" size={10} />
                        </button>
                      ) : null}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <UploadDropzone
          isDragging={ui.isDragging}
          uploading={uploading}
          onBrowse={openFileExplorer}
          onDragStateChange={(value) => dispatch({ type: "SET_DRAGGING", payload: value })}
          onDropFiles={appendFiles}
        />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.05)]">
            <div className="border-b border-slate-200 px-5 py-4 md:px-6">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Library</div>
                  <div className="mt-1 text-[22px] font-black tracking-tight text-slate-800">Documents</div>
                </div>

                <div className="flex w-full flex-col gap-2 xl:w-auto xl:min-w-[560px] xl:flex-row xl:items-center">
                  <div className="relative flex-1">
                    <Icon name="Search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={ui.searchText}
                      onChange={(e) => dispatch({ type: "SET_SEARCH", payload: e.target.value })}
                      placeholder="Search by tag, uploader or file type"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
                    />
                  </div>

                  <Select allowClear
                    value={ui.sortBy}
                    style={{ width: "100%", maxWidth: 190 }}
                    options={[
                      { value: "newest", label: "Newest first" },
                      { value: "name", label: "Name A-Z" },
                      { value: "tagged", label: "Tagged first" },
                      { value: "untagged", label: "Untagged first" },
                    ]}
                    onChange={(value) => dispatch({ type: "SET_SORT", payload: value })}
                  />
                  <Button
                    variant="outline"
                    iconName="Download"
                    iconPosition="left"
                    size="sm"
                    onClick={handleDownloadAll}
                    className="h-11 shrink-0 rounded-xl border-violet-200 bg-violet-50 px-4 text-violet-700 hover:bg-violet-100"
                  >
                    Download all
                  </Button>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 md:px-6">
              {normalizedDocuments.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white text-sky-600 shadow-sm ring-1 ring-slate-200">
                    <Icon name="Files" size={26} />
                  </div>
                  <div className="text-lg font-black tracking-tight text-slate-800">No documents yet</div>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    Upload the first batch and use Quick Tag on each row.
                  </p>
                  <div className="mt-5">
                    <Button
                      variant="default"
                      iconName={uploading ? "Loader2" : "Upload"}
                      iconPosition="left"
                      size="sm"
                      onClick={openFileExplorer}
                      className="h-11 rounded-xl bg-sky-600 px-5 text-white hover:bg-sky-700"
                    >
                      {uploading ? "Uploading..." : "Upload documents"}
                    </Button>
                  </div>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                    <Icon name="SearchX" size={22} />
                  </div>
                  <div className="text-base font-bold text-slate-800">No documents in this filter</div>
                  <p className="mt-1 text-sm text-slate-500">Try another search or clear the search input.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleDocuments.map((doc, index) => {
                    const docId = getStableDocId(doc, `row-${index}`);
                    const status = getDocStatus(doc);
                    const isSelected = selectedDoc && getStableDocId(selectedDoc) === docId;
                    const imageLike = isImageLike(doc);
                    const pdfLike = isPdfLike(doc);
                    const quickTags = getQuickTagsForDoc(doc);

                    return (
                      <div
                        key={docId}
                        role="button"
                        tabIndex={0}
                        onClick={() => dispatch({ type: "SELECT_DOC", payload: docId })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            dispatch({ type: "SELECT_DOC", payload: docId });
                          }
                        }}
                        className={`rounded-[24px] border p-4 shadow-sm transition ${
                          isSelected
                            ? "border-sky-300 bg-sky-50/50 shadow-[0_12px_32px_rgba(56,189,248,0.12)]"
                            : "border-slate-200 bg-white hover:shadow-md"
                        }`}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              dispatch({ type: "SELECT_DOC", payload: docId });
                            }}
                            className="relative h-32 w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left lg:h-28 lg:w-28"
                          >
                            {imageLike ? (
                              <img src={doc.previewUrl || doc.url} alt={getDocDisplayLabel(doc, index)} className="h-full w-full object-cover" />
                            ) : pdfLike ? (
                              <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-white">
                                <Icon name="FileText" size={30} className="text-rose-500" />
                                <span className="text-[10px] font-semibold text-slate-500">
                                  PDF
                                </span>
                              </div>
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-50">
                                <Icon name="File" size={30} className="text-slate-400" />
                              </div>
                            )}
                            {pdfLike ? (
                              <span className="absolute bottom-2 left-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                PDF
                              </span>
                            ) : null}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      dispatch({ type: "SELECT_DOC", payload: docId });
                                    }}
                                    className="truncate text-left text-sm font-black text-slate-800 md:text-base"
                                  >
                                    {getDocDisplayLabel(doc, index)}
                                  </button>
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                    {doc.format || "file"}
                                  </span>
                                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${status.className}`}>{status.label}</span>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{doc.sizeLabel}</span>
                                  {doc.uploadedBy ? (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{doc.uploadedBy}</span>
                                  ) : null}
                                  {doc.uploadedAt ? (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                      {new Date(doc.uploadedAt).toLocaleString("en-IN")}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Quick Tag</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {quickTags.map((tag) => (
                                    <QuickTag
                                      key={`${docId}-${tag}`}
                                      label={tag}
                                      active={String(doc.tag || "").trim() === tag}
                                      onClick={() => updateDocTag(docId, tag)}
                                    />
                                  ))}
                                </div>
                              </div>

                              <div className="flex w-full flex-col gap-2 lg:w-[230px]">
                                <div className="flex flex-wrap gap-2 sm:justify-end">
                                  <Button
                                    variant="outline"
                                    iconName="Eye"
                                    iconPosition="left"
                                    size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      dispatch({ type: "OPEN_VIEWER", payload: docId });
                                    }}
                                    className="h-10 rounded-xl border-slate-200 bg-white px-4 hover:bg-slate-50"
                                  >
                                    Open viewer
                                  </Button>
                                  <Button
                                    variant="outline"
                                    iconName="Download"
                                    iconPosition="left"
                                    size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleDownload(doc, index);
                                    }}
                                    className="h-10 rounded-xl border-sky-200 bg-sky-50 px-4 text-sky-700 hover:bg-sky-100"
                                  >
                                    Download
                                  </Button>
                                  <Button
                                    variant="outline"
                                    iconName="Trash2"
                                    iconPosition="left"
                                    size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removeDocument(docId);
                                    }}
                                    className="h-10 rounded-xl border-rose-200 bg-rose-50 px-4 text-rose-700 hover:bg-rose-100"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredDocuments.length > visibleDocuments.length ? (
                    <div className="flex justify-center pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        iconName="ChevronDown"
                        iconPosition="left"
                        onClick={() =>
                          setVisibleCount((prev) =>
                            Math.min(prev + 24, filteredDocuments.length),
                          )
                        }
                        className="h-10 rounded-xl border-blue-200 bg-blue-50 px-4 text-blue-700 hover:bg-blue-100"
                      >
                        Load more ({filteredDocuments.length - visibleDocuments.length} left)
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <PreviewPane
            doc={selectedDoc}
            index={selectedDocIndex}
            total={filteredDocuments.length}
            onOpenViewer={(doc) => dispatch({ type: "OPEN_VIEWER", payload: getStableDocId(doc) })}
            onDownload={handleDownload}
            onPrint={handlePrint}
          />
        </section>
      </div>

      <LoanDocumentViewerModal
        open={Boolean(ui.isViewerOpen && viewerDocuments.length)}
        title="Insurance Document Viewer"
        documents={viewerDocuments}
        currentIndex={viewerIndex}
        onIndexChange={handleViewerIndexChange}
        onClose={() => dispatch({ type: "CLOSE_VIEWER" })}
      />
    </>
  );
};

export default Step6Documents;
