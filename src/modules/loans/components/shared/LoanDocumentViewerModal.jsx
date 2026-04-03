import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../../../../components/AppIcon";
import Button from "../../../../components/ui/Button";
import API_BASE_URL from "../../../../config/apiBaseUrl";

const hasValue = (value) =>
  value !== undefined &&
  value !== null &&
  !(typeof value === "string" && value.trim() === "");

const isImageUrl = (url = "") =>
  /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|#|$)/i.test(url) ||
  String(url).startsWith("data:image/");

const isPdfUrl = (url = "") =>
  /\.pdf(\?|#|$)/i.test(url) || String(url).startsWith("data:application/pdf");
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

const clampZoomValue = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0.1, Math.min(4, n));
};

const clampImageZoomValue = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(4, n));
};

const withPdfZoomHash = (url, zoom, fitMode) => {
  const raw = String(url || "");
  if (!raw) return raw;
  const [base] = raw.split("#");
  const isDefaultZoom = Math.abs(clampZoomValue(zoom) - 1) < 0.01;
  if (fitMode === "width" && isDefaultZoom) {
    return `${base}#view=FitH&toolbar=0&navpanes=0&scrollbar=1`;
  }
  if (fitMode === "fit" && isDefaultZoom) {
    return `${base}#view=FitV&toolbar=0&navpanes=0&scrollbar=1`;
  }
  return `${base}#zoom=${Math.round(
    Math.max(10, Math.min(500, clampZoomValue(zoom) * 100)),
  )}&toolbar=0&navpanes=0&scrollbar=1`;
};

const normalizeDocs = (documents = []) =>
  (Array.isArray(documents) ? documents : [])
    .filter((doc) => hasValue(doc?.url))
    .map((doc, index) => ({
      id: doc?.id || `${doc?.url}-${index}`,
      name: doc?.name || doc?.tag || `Document ${index + 1}`,
      tag: doc?.tag || "",
      rawUrl: doc?.rawUrl || doc?.url,
      url: buildAccessibleDocumentUrl(doc?.url),
      size: doc?.size || "",
      uploadedBy: doc?.uploadedBy || "",
      isImage: doc?.isImage ?? isImageUrl(doc?.url),
      isPdf: doc?.isPdf ?? isPdfUrl(doc?.url),
    }));

const getDocDisplayLabel = (doc, index = -1) => {
  const tag = String(doc?.tag || "").trim();
  if (tag) return tag;
  return index >= 0 ? `Document ${index + 1}` : "Document";
};

const LoanDocumentViewerModal = ({
  open,
  documents,
  currentIndex = 0,
  onIndexChange,
  onClose,
  title = "Document Viewer",
  subtitle = "",
  showThumbnailRail = true,
}) => {
  const docs = useMemo(() => normalizeDocs(documents), [documents]);
  const [internalIndex, setInternalIndex] = useState(0);
  const [fitMode, setFitMode] = useState("fit"); // fit = height, width = width
  const [zoom, setZoom] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(1);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });

  const viewportRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const isControlled = typeof onIndexChange === "function";
  const activeIndexRaw = isControlled ? Number(currentIndex) : Number(internalIndex);
  const activeIndex =
    Number.isFinite(activeIndexRaw) && activeIndexRaw >= 0
      ? Math.min(activeIndexRaw, Math.max(0, docs.length - 1))
      : 0;
  const activeDoc = docs[activeIndex] || null;
  const activeDocId = activeDoc?.id || "";

  const setIndex = useCallback(
    (next) => {
      const target = Math.max(0, Math.min(docs.length - 1, Number(next) || 0));
      if (isControlled) onIndexChange(target);
      else setInternalIndex(target);
    },
    [docs.length, isControlled, onIndexChange],
  );

  const goPrev = useCallback(() => {
    if (!docs.length) return;
    setIndex(activeIndex <= 0 ? docs.length - 1 : activeIndex - 1);
  }, [docs.length, activeIndex, setIndex]);

  const goNext = useCallback(() => {
    if (!docs.length) return;
    setIndex(activeIndex >= docs.length - 1 ? 0 : activeIndex + 1);
  }, [docs.length, activeIndex, setIndex]);

  const resetViewport = useCallback(() => {
    const node = viewportRef.current;
    if (node) {
      node.scrollLeft = 0;
      node.scrollTop = 0;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setInternalIndex(0);
      setFitMode("fit");
      setZoom(1);
      setPdfZoom(1);
      setViewportSize({ width: 0, height: 0 });
      setImageNaturalSize({ width: 0, height: 0 });
      resetViewport();
      return;
    }
    setFitMode("fit");
    setZoom(1);
    setPdfZoom(1);
    setImageNaturalSize({ width: 0, height: 0 });
    resetViewport();
    if (!isControlled) setInternalIndex(Number(currentIndex) || 0);
  }, [open, currentIndex, isControlled, resetViewport]);

  useEffect(() => {
    if (!open || !activeDocId) return;
    setZoom(1);
    setPdfZoom(1);
    setImageNaturalSize({ width: 0, height: 0 });
    resetViewport();
  }, [open, activeDocId, resetViewport]);

  useEffect(() => {
    if (!open) return undefined;
    const node = viewportRef.current;
    if (!node) return undefined;

    const refreshSize = () => {
      const rect = node.getBoundingClientRect();
      const width = Number(node.clientWidth || rect.width || 0);
      const height = Number(node.clientHeight || rect.height || 0);
      setViewportSize({
        width: Math.max(0, Math.floor(width)),
        height: Math.max(0, Math.floor(height)),
      });
    };

    refreshSize();
    const ro = new ResizeObserver(refreshSize);
    ro.observe(node);
    window.addEventListener("resize", refreshSize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", refreshSize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if ((e.key === "+" || e.key === "=") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (activeDoc?.isImage) setZoom((prev) => clampImageZoomValue(prev + 0.1));
        else setPdfZoom((prev) => clampZoomValue(prev + 0.1));
      }
      if (e.key === "-" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (activeDoc?.isImage) setZoom((prev) => clampImageZoomValue(prev - 0.1));
        else setPdfZoom((prev) => clampZoomValue(prev - 0.1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, goPrev, goNext, activeDoc?.isImage]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    const { body, documentElement } = document;
    const appScrollContainer = document.getElementById("app-scroll-container");
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;
    const prevAppOverflow = appScrollContainer?.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    if (appScrollContainer) appScrollContainer.style.overflow = "hidden";

    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
      if (appScrollContainer) appScrollContainer.style.overflow = prevAppOverflow || "";
    };
  }, [open]);

  const handleZoomIn = useCallback(() => {
    if (activeDoc?.isImage) setZoom((prev) => clampImageZoomValue(prev + 0.1));
    else setPdfZoom((prev) => clampZoomValue(prev + 0.1));
  }, [activeDoc?.isImage]);

  const handleZoomOut = useCallback(() => {
    if (activeDoc?.isImage) setZoom((prev) => clampImageZoomValue(prev - 0.1));
    else setPdfZoom((prev) => clampZoomValue(prev - 0.1));
  }, [activeDoc?.isImage]);

  const handleFit = useCallback(() => {
    setFitMode("fit");
    if (activeDoc?.isImage) setZoom(1);
    else setPdfZoom(1);
    resetViewport();
  }, [activeDoc?.isImage, resetViewport]);

  const handleFitWidth = useCallback(() => {
    setFitMode("width");
    if (activeDoc?.isImage) setZoom(1);
    else setPdfZoom(1);
    resetViewport();
  }, [activeDoc?.isImage, resetViewport]);

  const handleDownload = useCallback(() => {
    if (!activeDoc) return;
    const label = getDocDisplayLabel(activeDoc, activeIndex)
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();
    const link = document.createElement("a");
    link.href = activeDoc.url || activeDoc.rawUrl;
    link.download = label || `document_${activeIndex + 1}`;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [activeDoc, activeIndex]);

  const handleMouseDown = useCallback(
    (e) => {
      if (!activeDoc?.isImage || zoom <= 1) return;
      const node = viewportRef.current;
      if (!node) return;
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: node.scrollLeft,
        scrollTop: node.scrollTop,
      };
      node.style.cursor = "grabbing";
      e.preventDefault();
    },
    [activeDoc?.isImage, zoom],
  );

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    const node = viewportRef.current;
    if (!node) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    node.scrollLeft = dragStartRef.current.scrollLeft - dx;
    node.scrollTop = dragStartRef.current.scrollTop - dy;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const node = viewportRef.current;
    if (node) node.style.cursor = activeDoc?.isImage && zoom > 1 ? "grab" : "default";
  }, [activeDoc?.isImage, zoom]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    node.style.cursor = activeDoc?.isImage && zoom > 1 ? "grab" : "default";
  }, [activeDoc?.isImage, zoom]);

  const imageBaseScale = useMemo(() => {
    const vw = Number(viewportSize.width || 0);
    const vh = Number(viewportSize.height || 0);
    const iw = Number(imageNaturalSize.width || 0);
    const ih = Number(imageNaturalSize.height || 0);
    if (!(vw > 0 && vh > 0 && iw > 0 && ih > 0)) return 1;
    if (fitMode === "width") {
      return vw / iw;
    }
    return vh / ih;
  }, [viewportSize, imageNaturalSize, fitMode]);

  const renderedImageSize = useMemo(() => {
    const iw = Number(imageNaturalSize.width || 0);
    const ih = Number(imageNaturalSize.height || 0);
    if (!(iw > 0 && ih > 0)) return null;
    const effectiveScale = imageBaseScale * clampImageZoomValue(zoom);
    return {
      width: Math.max(1, Math.round(iw * effectiveScale)),
      height: Math.max(1, Math.round(ih * effectiveScale)),
    };
  }, [imageNaturalSize, imageBaseScale, zoom]);

  const imageCanvasSize = useMemo(() => {
    const vw = Number(viewportSize.width || 0);
    const vh = Number(viewportSize.height || 0);
    if (!renderedImageSize) {
      return { width: vw, height: vh };
    }
    return {
      width: Math.max(vw, renderedImageSize.width),
      height: Math.max(vh, renderedImageSize.height),
    };
  }, [viewportSize, renderedImageSize]);

  if (!open || !docs.length || !activeDoc) return null;
  if (typeof document === "undefined") return null;

  const currentZoom = activeDoc?.isImage ? clampImageZoomValue(zoom) : clampZoomValue(pdfZoom);

  const modalNode = (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm"
      onWheelCapture={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="group/viewer flex h-[90vh] max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-elevation-4">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/15 to-orange-400/15 text-rose-600 dark:text-rose-300">
                <Icon name="Eye" size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {title}
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {getDocDisplayLabel(activeDoc, activeIndex)}
                </p>
              </div>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {subtitle || getDocDisplayLabel(activeDoc, activeIndex)} • {activeIndex + 1} of {docs.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-xl border border-border bg-background/80 p-1 md:flex">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleZoomOut}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
                title="Zoom out"
                aria-label="Zoom out"
                disabled={currentZoom <= (activeDoc?.isImage ? 1 : 0.1)}
              >
                <Icon name="ZoomOut" size={14} />
              </button>
              <span className="w-[52px] text-center text-xs font-semibold text-foreground">
                {Math.round(currentZoom * 100)}%
              </span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleZoomIn}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
                title="Zoom in"
                aria-label="Zoom in"
                disabled={currentZoom >= 4}
              >
                <Icon name="ZoomIn" size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleFit}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                fitMode === "fit"
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-background/70 text-foreground"
              }`}
              aria-pressed={fitMode === "fit"}
              aria-label="Fit height"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={handleFitWidth}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                fitMode === "width"
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-background/70 text-foreground"
              }`}
              aria-pressed={fitMode === "width"}
              aria-label="Fit width"
            >
              Fit Width
            </button>

            <Button
              variant="outline"
              iconName="Download"
              iconPosition="left"
              size="sm"
              onClick={handleDownload}
            >
              Download
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close viewer"
            >
              <Icon name="X" size={16} />
            </button>
          </div>
        </div>

        <div className="relative min-h-[320px] flex-1 bg-muted/20 p-4">
          {docs.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-6 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-background/95 p-2.5 text-foreground shadow-lg transition hover:bg-muted"
                title="Previous"
                aria-label="Previous document"
              >
                <Icon name="ChevronLeft" size={18} />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-6 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-background/95 p-2.5 text-foreground shadow-lg transition hover:bg-muted"
                title="Next"
                aria-label="Next document"
              >
                <Icon name="ChevronRight" size={18} />
              </button>
            </>
          )}

          <div
            ref={viewportRef}
            className="h-full min-h-[260px] w-full overflow-auto rounded-2xl border border-border/70 bg-background shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
            onWheelCapture={(e) => e.stopPropagation()}
            onWheel={(e) => {
              if (e.ctrlKey) {
                e.preventDefault();
                if (activeDoc?.isImage) {
                  setZoom((prev) => clampImageZoomValue(prev + (e.deltaY > 0 ? -0.1 : 0.1)));
                }
                else setPdfZoom((prev) => clampZoomValue(prev + (e.deltaY > 0 ? -0.1 : 0.1)));
              }
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {activeDoc.isImage ? (
              <div
                className={`flex ${zoom > 1 ? "items-start justify-start" : "items-center justify-center"}`}
                style={{
                  width: `${Math.max(0, imageCanvasSize.width)}px`,
                  height: `${Math.max(0, imageCanvasSize.height)}px`,
                  minWidth: "100%",
                  minHeight: "100%",
                }}
                onDoubleClick={() => {
                  setZoom((prev) => (Math.abs(prev - 1) < 0.01 ? 2 : 1));
                }}
              >
                <img
                  src={activeDoc.url}
                  alt={getDocDisplayLabel(activeDoc, activeIndex)}
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    if (activeDoc.rawUrl && event.currentTarget.src !== activeDoc.rawUrl) {
                      event.currentTarget.src = activeDoc.rawUrl;
                    }
                  }}
                  onLoad={(e) => {
                    const target = e.currentTarget;
                    const naturalWidth = Number(target?.naturalWidth || 0);
                    const naturalHeight = Number(target?.naturalHeight || 0);
                    if (naturalWidth > 0 && naturalHeight > 0) {
                      setImageNaturalSize({ width: naturalWidth, height: naturalHeight });
                    }
                  }}
                  style={{
                    width: renderedImageSize?.width ? `${renderedImageSize.width}px` : "auto",
                    height: renderedImageSize?.height ? `${renderedImageSize.height}px` : "auto",
                    display: "block",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                />
              </div>
            ) : activeDoc.isPdf ? (
              <iframe
                title={getDocDisplayLabel(activeDoc, activeIndex)}
                src={withPdfZoomHash(activeDoc.url, pdfZoom, fitMode)}
                className="h-full w-full"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <Icon name="File" size={28} />
                <p className="text-sm font-semibold text-foreground">Preview not available for this file type</p>
                <a
                  href={activeDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  Open Document
                </a>
              </div>
            )}
          </div>

          {showThumbnailRail && docs.length > 1 && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-30 opacity-0 transition-all duration-200 ease-out group-hover/viewer:pointer-events-auto group-hover/viewer:opacity-100 group-focus-within/viewer:pointer-events-auto group-focus-within/viewer:opacity-100">
              <div className="rounded-xl border border-border/80 bg-background/94 p-2 shadow-xl backdrop-blur-sm">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {docs.map((doc, idx) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setIndex(idx)}
                      className={`relative w-[116px] shrink-0 rounded-lg border p-1.5 text-left transition ${
                        idx === activeIndex
                          ? "border-primary bg-primary/5 ring-1 ring-primary/25"
                          : "border-border bg-card/70"
                      }`}
                      title={getDocDisplayLabel(doc, idx)}
                    >
                      <div className="h-14 w-full overflow-hidden rounded-md border border-border/50 bg-muted">
                        {doc.isImage ? (
                          <img
                            src={doc.url}
                            alt={getDocDisplayLabel(doc, idx)}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              if (doc.rawUrl && event.currentTarget.src !== doc.rawUrl) {
                                event.currentTarget.src = doc.rawUrl;
                              }
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Icon name={doc.isPdf ? "FileText" : "File"} size={16} />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 truncate text-[10px] font-semibold text-foreground">
                        {getDocDisplayLabel(doc, idx)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};

export default LoanDocumentViewerModal;
