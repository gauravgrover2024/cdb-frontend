import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Empty, Progress, Select } from "antd";
import Icon from "../../AppIcon";
import Button from "../../ui/Button";
import LoanDocumentViewerModal from "../../../modules/loans/components/shared/LoanDocumentViewerModal";
import { requiredDocumentTags } from "./allSteps";

const sectionHeaderLabel =
  "text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400";

const DOCUMENT_MATRIX = {
  "new-car-insurance": {
    label: "New Car Insurance",
    mandatory: ["Invoice"],
    optional: ["New Policy", "New policy covernote"],
  },
  "used-car-insurance": {
    label: "Used Car Insurance",
    mandatory: ["RC", "Form 29", "Form 30 page 1", "Form 30 page 2"],
    optional: ["New Policy", "New policy covernote", "Inspection report"],
  },
  "used-car-renewal": {
    label: "Used Car Renewal",
    mandatory: ["RC", "Previous Year Policy"],
    optional: ["New Policy", "New policy covernote"],
  },
  "policy-already-expired": {
    label: "Policy Already Expired",
    mandatory: ["RC", "Previous Year Policy"],
    optional: ["New Policy", "New policy covernote", "Inspection report"],
  },
};

const getScenarioFromForm = (formData = {}) => {
  if (formData?.vehicleType === "New Car") return "new-car-insurance";

  const expiryDates = [
    formData?.previousOdExpiryDate,
    formData?.previousTpExpiryDate,
  ]
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

const normalizeDocumentStage = (value, fallback = "Post-File") => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw.includes("pre")) return "Pre-File";
  if (raw.includes("post")) return "Post-File";
  return fallback;
};

const getDocumentStage = (doc = {}) =>
  normalizeDocumentStage(
    doc?.documentStage || doc?.scope,
    doc?.isPreFile ? "Pre-File" : "Post-File",
  );

const getScopedTagLabel = (tag, stage) => {
  const trimmedTag = String(tag || "").trim();
  if (!trimmedTag) return "";
  return `${trimmedTag} (${normalizeDocumentStage(stage)})`;
};

const getStableDocId = (doc, fallback = "") =>
  String(doc?.id || doc?.publicId || doc?.url || doc?.name || fallback);

const formatFileSize = (bytes) => {
  const numeric = Number(bytes || 0);
  if (!numeric) return "0 KB";
  const units = ["Bytes", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(numeric) / Math.log(1024)),
    units.length - 1,
  );
  const value = numeric / 1024 ** unitIndex;
  return `${Math.round(value * 100) / 100} ${units[unitIndex]}`;
};

const extensionFromName = (value = "") => {
  const clean = String(value || "")
    .split("?")[0]
    .split("#")[0];
  const last = clean.split(".").pop();
  return last && last !== clean ? last.toLowerCase() : "";
};

const isImageLike = (doc = {}) => {
  const type = String(doc?.type || "").toLowerCase();
  const format = String(
    doc?.format ||
      extensionFromName(doc?.name || doc?.originalName || doc?.url),
  ).toLowerCase();
  const url = String(doc?.previewUrl || doc?.url || "").toLowerCase();
  return (
    type.startsWith("image/") ||
    [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
      "bmp",
      "svg",
      "heic",
      "heif",
    ].includes(format) ||
    /\.(jpg|jpeg|png|webp|gif|bmp|svg|heic|heif)(\?|#|$)/i.test(url)
  );
};

const isPdfLike = (doc = {}) => {
  const type = String(doc?.type || "").toLowerCase();
  const format = String(
    doc?.format ||
      extensionFromName(doc?.name || doc?.originalName || doc?.url),
  ).toLowerCase();
  const url = String(doc?.previewUrl || doc?.url || "").toLowerCase();
  return (
    type === "application/pdf" || format === "pdf" || /\.pdf(\?|#|$)/i.test(url)
  );
};

const revokeIfBlob = (src) => {
  if (typeof src === "string" && src.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(src);
    } catch (_) {
      // noop
    }
  }
};

const getDocDisplayLabel = (doc, index = -1) => {
  if (String(doc?.displayName || "").trim())
    return String(doc.displayName).trim();
  const tag = String(doc?.tag || "").trim();
  if (tag) return getScopedTagLabel(tag, getDocumentStage(doc));
  const originalName = String(doc?.originalName || doc?.name || "").trim();
  if (originalName) return originalName;
  return index >= 0 ? `Document ${index + 1}` : "Document";
};

const RequirementPill = ({ label, covered, optional = false }) => {
  const stateClass = covered
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : optional
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-slate-200 bg-white text-slate-600";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${stateClass}`}
    >
      {covered ? <Icon name="CheckCircle2" size={12} /> : null}
      {label}
    </span>
  );
};

const FilterPill = ({ active, label, count, onClick, tone = "slate" }) => {
  const activeClass =
    tone === "blue"
      ? "border-sky-300 bg-sky-500 text-white"
      : tone === "green"
        ? "border-emerald-300 bg-emerald-500 text-white"
        : "border-slate-300 bg-slate-700 text-white";

  const idleClass =
    tone === "blue"
      ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
      : tone === "green"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold shadow-sm transition ${active ? activeClass : idleClass}`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
          active ? "bg-white/20 text-white" : "bg-slate-900/5 text-current"
        }`}
      >
        {count}
      </span>
    </button>
  );
};

const TagPicker = ({ value, options, onChange }) => (
  <Select
    value={value || undefined}
    placeholder="Assign tag"
    onChange={onChange}
    allowClear
    showSearch
    style={{ width: "100%" }}
    optionFilterProp="label"
    options={options.map((tag) => ({ value: tag, label: tag }))}
  />
);

const Step6Documents = ({
  formData,
  documents = [],
  setDocuments,
  schedulePersist,
  docsTaggedCount,
}) => {
  const fileInputRef = useRef(null);
  const localBlobUrlsRef = useRef(new Set());

  const [scenario, setScenario] = useState(getScenarioFromForm(formData));
  const [selectedTagFilter, setSelectedTagFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [viewDocument, setViewDocument] = useState(null);

  useEffect(() => {
    setScenario(getScenarioFromForm(formData));
  }, [formData]);

  useEffect(
    () => () => {
      localBlobUrlsRef.current.forEach((url) => revokeIfBlob(url));
      localBlobUrlsRef.current.clear();
    },
    [],
  );

  const persistSoon = useCallback(() => {
    if (typeof schedulePersist === "function") schedulePersist(250);
  }, [schedulePersist]);

  const normalizedDocuments = useMemo(
    () =>
      (Array.isArray(documents) ? documents : []).map((doc, index) => {
        const originalName =
          doc?.originalName || doc?.name || `Document ${index + 1}`;
        const fallbackFormat = extensionFromName(originalName || doc?.url);
        return {
          ...doc,
          id: getStableDocId(doc, `doc-${index}`),
          originalName,
          name: originalName,
          displayName: doc?.displayName || "",
          sizeLabel:
            typeof doc?.size === "string"
              ? doc.size
              : doc?.sizeLabel || formatFileSize(doc?.size),
          uploadedAt: doc?.uploadedAt || "",
          uploadedBy: doc?.uploadedBy || "",
          documentStage: getDocumentStage(doc),
          previewUrl: doc?.previewUrl || "",
          url: doc?.url || doc?.previewUrl || "",
          type: doc?.type || "",
          format: doc?.format || fallbackFormat || "file",
        };
      }),
    [documents],
  );

  const viewerDocuments = useMemo(
    () =>
      normalizedDocuments.map((doc, index) => ({
        ...doc,
        id: getStableDocId(doc, `viewer-${index}`),
        name: doc.originalName || doc.name || `Document ${index + 1}`,
        title: doc.displayName || getDocDisplayLabel(doc, index),
        url: doc.previewUrl || doc.url,
        previewUrl: doc.previewUrl || doc.url,
        type:
          doc.type ||
          (isImageLike(doc)
            ? `image/${String(doc.format || "jpeg").toLowerCase()}`
            : isPdfLike(doc)
              ? "application/pdf"
              : ""),
        format:
          doc.format ||
          extensionFromName(doc.originalName || doc.name || doc.url) ||
          (isPdfLike(doc) ? "pdf" : isImageLike(doc) ? "jpg" : "file"),
      })),
    [normalizedDocuments],
  );

  const openViewerForDoc = useCallback(
    (doc) => {
      const next = viewerDocuments.find(
        (item) => getStableDocId(item) === getStableDocId(doc),
      );
      setViewDocument(next || doc || null);
    },
    [viewerDocuments],
  );

  const viewerIndex = useMemo(() => {
    if (!viewDocument) return 0;
    const idx = viewerDocuments.findIndex(
      (doc) => getStableDocId(doc) === getStableDocId(viewDocument),
    );
    return idx >= 0 ? idx : 0;
  }, [viewerDocuments, viewDocument]);

  const handleCloseViewer = useCallback(() => setViewDocument(null), []);

  const handleViewerIndexChange = useCallback(
    (idx) => {
      const nextDocument = viewerDocuments[idx];
      if (!nextDocument) return;
      setViewDocument(nextDocument);
    },
    [viewerDocuments],
  );

  const activeRequirement =
    DOCUMENT_MATRIX[scenario] || DOCUMENT_MATRIX["used-car-renewal"];

  const tagOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...requiredDocumentTags,
          ...Object.values(DOCUMENT_MATRIX).flatMap((item) => [
            ...item.mandatory,
            ...item.optional,
          ]),
        ]),
      ).filter(Boolean),
    [],
  );

  const uploadedTagSet = useMemo(
    () =>
      new Set(
        normalizedDocuments
          .map((doc) => String(doc?.tag || "").trim())
          .filter(Boolean),
      ),
    [normalizedDocuments],
  );

  const coveredMandatory = activeRequirement.mandatory.filter((item) =>
    uploadedTagSet.has(item),
  );

  const requirementProgress = activeRequirement.mandatory.length
    ? Math.round(
        (coveredMandatory.length / activeRequirement.mandatory.length) * 100,
      )
    : 0;

  const tagCounts = useMemo(() => {
    const counts = { All: normalizedDocuments.length, Untagged: 0 };
    normalizedDocuments.forEach((doc) => {
      const tag = String(doc?.tag || "").trim();
      if (!tag) counts.Untagged += 1;
      else counts[tag] = (counts[tag] || 0) + 1;
    });
    return counts;
  }, [normalizedDocuments]);

  const usedTags = useMemo(
    () =>
      Array.from(
        new Set(
          normalizedDocuments
            .map((doc) => String(doc?.tag || "").trim())
            .filter(Boolean),
        ),
      ),
    [normalizedDocuments],
  );

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return normalizedDocuments.filter((doc, index) => {
      const matchesFilter =
        selectedTagFilter === "All"
          ? true
          : selectedTagFilter === "Untagged"
            ? !String(doc?.tag || "").trim()
            : String(doc?.tag || "").trim() === selectedTagFilter;

      if (!matchesFilter) return false;
      if (!normalizedSearch) return true;

      const haystack = [
        getDocDisplayLabel(doc, index),
        doc.originalName,
        doc.tag,
        doc.uploadedBy,
        doc.uploadedAt,
        doc.format,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [normalizedDocuments, searchText, selectedTagFilter]);

  const openFileExplorer = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handlePickedFiles = useCallback(
    (event) => {
      const pickedFiles = Array.from(event.target.files || []);
      if (!pickedFiles.length) return;

      const incoming = pickedFiles.map((file, index) => {
        const objectUrl = URL.createObjectURL(file);
        localBlobUrlsRef.current.add(objectUrl);

        const format =
          extensionFromName(file.name) ||
          String(file.type || "")
            .split("/")
            .pop() ||
          "file";

        return {
          id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          originalName: file.name,
          displayName: file.name,
          size: formatFileSize(file.size),
          sizeLabel: formatFileSize(file.size),
          type: file.type || "",
          format,
          tag: "",
          tagId: null,
          uploadedAt: new Date().toLocaleString("en-IN"),
          uploadedBy: "Current User",
          url: objectUrl,
          previewUrl: objectUrl,
          source: "uploaded",
          documentStage: "Post-File",
        };
      });

      setDocuments((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        ...incoming,
      ]);
      persistSoon();
      event.target.value = "";
    },
    [persistSoon, setDocuments],
  );

  const handleTagChange = useCallback(
    (docId, tagValue) => {
      const finalTag = String(tagValue || "").trim();
      setDocuments((prev) =>
        (Array.isArray(prev) ? prev : []).map((doc) =>
          getStableDocId(doc) === docId
            ? {
                ...doc,
                originalName: doc.originalName || doc.name,
                name: doc.originalName || doc.name,
                displayName: finalTag
                  ? getScopedTagLabel(finalTag, getDocumentStage(doc))
                  : doc.originalName || doc.name,
                tag: finalTag,
              }
            : doc,
        ),
      );
      persistSoon();
    },
    [persistSoon, setDocuments],
  );

  const removeDocument = useCallback(
    (docId) => {
      setDocuments((prev) => {
        const existing = Array.isArray(prev) ? prev : [];
        const target = existing.find((item) => getStableDocId(item) === docId);
        if (target?.previewUrl) {
          revokeIfBlob(target.previewUrl);
          localBlobUrlsRef.current.delete(target.previewUrl);
        }
        if (target?.url && target.url !== target.previewUrl) {
          revokeIfBlob(target.url);
          localBlobUrlsRef.current.delete(target.url);
        }
        return existing.filter((item) => getStableDocId(item) !== docId);
      });

      if (viewDocument && getStableDocId(viewDocument) === docId) {
        setViewDocument(null);
      }

      persistSoon();
    },
    [persistSoon, setDocuments, viewDocument],
  );

  const handleDownload = useCallback((doc, index = 0) => {
    const href = doc?.url || doc?.previewUrl;
    if (!href) return;
    const link = document.createElement("a");
    link.href = href;
    link.download = (
      doc.originalName ||
      doc.name ||
      `document-${index + 1}`
    ).replace(/\s+/g, "_");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const safeTaggedCount =
    typeof docsTaggedCount === "number"
      ? docsTaggedCount
      : normalizedDocuments.filter((doc) => String(doc?.tag || "").trim())
          .length;

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

      <div className="flex flex-col gap-4">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-r from-[#EEF3EF] via-white to-[#FAF8F1] shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
          <div className="px-5 py-5 md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className={sectionHeaderLabel}>Documentation</div>
                <div className="truncate text-[24px] font-black tracking-tight text-slate-800">
                  Document workspace
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Upload, tag and verify documents with requirement coverage
                </div>
              </div>

              <div className="w-full xl:w-auto xl:min-w-[260px]">
                <Select
                  value={scenario}
                  style={{ width: "100%" }}
                  options={Object.entries(DOCUMENT_MATRIX).map(
                    ([value, item]) => ({
                      value,
                      label: item.label,
                    }),
                  )}
                  onChange={setScenario}
                />
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-slate-200 bg-white/85 p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Coverage
                </div>
                <div className="text-sm font-black text-slate-700">
                  {coveredMandatory.length}/{activeRequirement.mandatory.length}
                </div>
              </div>

              <Progress
                percent={requirementProgress}
                showInfo={false}
                strokeColor="#38BDF8"
                trailColor="#E2E8F0"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {activeRequirement.mandatory.map((item) => (
                  <RequirementPill
                    key={`mandatory-${item}`}
                    label={item}
                    covered={uploadedTagSet.has(item)}
                  />
                ))}
                {activeRequirement.optional.map((item) => (
                  <RequirementPill
                    key={`optional-${item}`}
                    label={item}
                    covered={uploadedTagSet.has(item)}
                    optional
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-200 px-5 py-4 md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Library
                </div>
                <div className="mt-1 text-[22px] font-black tracking-tight text-slate-800">
                  Documents
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[520px] lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Icon
                    name="Search"
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search by tag, file name, uploader, or date"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={openFileExplorer}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  aria-label="Upload documents"
                >
                  <Icon name="Upload" size={15} className="mr-2" />
                  Upload
                </button>
              </div>
            </div>

            {(usedTags.length > 0 || normalizedDocuments.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-2.5">
                <FilterPill
                  active={selectedTagFilter === "All"}
                  label="All"
                  count={tagCounts.All || 0}
                  onClick={() => setSelectedTagFilter("All")}
                />
                <FilterPill
                  active={selectedTagFilter === "Untagged"}
                  label="Untagged"
                  count={tagCounts.Untagged || 0}
                  onClick={() => setSelectedTagFilter("Untagged")}
                  tone="blue"
                />
                {usedTags.map((tag) => (
                  <FilterPill
                    key={tag}
                    active={selectedTagFilter === tag}
                    label={tag}
                    count={tagCounts[tag] || 0}
                    onClick={() => setSelectedTagFilter(tag)}
                    tone="green"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-5 md:px-6">
            {normalizedDocuments.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white text-sky-600 shadow-sm ring-1 ring-slate-200">
                  <Icon name="Files" size={26} />
                </div>
                <div className="text-lg font-black tracking-tight text-slate-800">
                  No documents yet
                </div>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Upload the first batch and use tag pills to keep the case
                  tidy.
                </p>
                <div className="mt-5">
                  <Button
                    variant="default"
                    iconName="Upload"
                    iconPosition="left"
                    size="sm"
                    onClick={openFileExplorer}
                    className="h-11 rounded-xl bg-sky-600 px-5 text-white hover:bg-sky-700"
                  >
                    Upload documents
                  </Button>
                </div>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                  <Icon name="SearchX" size={22} />
                </div>
                <div className="text-base font-bold text-slate-800">
                  No documents in this filter
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Try another tag pill or clear the search term.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDocuments.map((doc, index) => {
                  const imageLike = isImageLike(doc);
                  const pdfLike = isPdfLike(doc);
                  return (
                    <div
                      key={getStableDocId(doc, `row-${index}`)}
                      className="group rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row">
                        <button
                          type="button"
                          onClick={() => openViewerForDoc(doc)}
                          className="relative h-32 w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left lg:h-28 lg:w-28"
                        >
                          {imageLike ? (
                            <img
                              src={doc.previewUrl || doc.url}
                              alt={doc.originalName || `Document ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-50">
                              <Icon
                                name={pdfLike ? "FileText" : "File"}
                                size={30}
                                className="text-slate-400"
                              />
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
                                <h4 className="truncate text-sm font-black text-slate-800 md:text-base">
                                  {doc.displayName ||
                                    getDocDisplayLabel(doc, index)}
                                </h4>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                  {doc.format || "file"}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                  {doc.sizeLabel}
                                </span>
                                {doc.uploadedBy ? (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                    {doc.uploadedBy}
                                  </span>
                                ) : null}
                                {doc.uploadedAt ? (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                    {doc.uploadedAt}
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-3 text-[11px] text-slate-400 break-all">
                                {doc.originalName}
                              </div>
                            </div>

                            <div className="flex w-full flex-col gap-2 lg:w-[260px]">
                              <TagPicker
                                value={
                                  String(doc.tag || "").trim() || undefined
                                }
                                options={tagOptions}
                                onChange={(value) =>
                                  handleTagChange(getStableDocId(doc), value)
                                }
                              />

                              <div className="flex flex-wrap gap-2 sm:justify-end">
                                <Button
                                  variant="outline"
                                  iconName="Eye"
                                  iconPosition="left"
                                  size="sm"
                                  onClick={() => openViewerForDoc(doc)}
                                  className="h-10 rounded-xl border-slate-200 bg-white px-4 hover:bg-slate-50"
                                >
                                  Open Viewer
                                </Button>
                                <Button
                                  variant="outline"
                                  iconName="Download"
                                  iconPosition="left"
                                  size="sm"
                                  onClick={() => handleDownload(doc, index)}
                                  className="h-10 rounded-xl border-sky-200 bg-sky-50 px-4 text-sky-700 hover:bg-sky-100"
                                >
                                  Download
                                </Button>
                                <Button
                                  variant="outline"
                                  iconName="Trash2"
                                  iconPosition="left"
                                  size="sm"
                                  onClick={() =>
                                    removeDocument(getStableDocId(doc))
                                  }
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
              </div>
            )}
          </div>
        </section>
      </div>

      <LoanDocumentViewerModal
        open={Boolean(viewDocument)}
        title="Post-File Document Viewer"
        documents={viewerDocuments}
        currentIndex={viewerIndex}
        onIndexChange={handleViewerIndexChange}
        onClose={handleCloseViewer}
      />
    </>
  );
};

export default Step6Documents;
