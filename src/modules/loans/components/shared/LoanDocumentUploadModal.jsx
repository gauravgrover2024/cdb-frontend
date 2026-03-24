import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../../../../components/ui/Button";
import Icon from "../../../../components/AppIcon";

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  if (!Number.isFinite(Number(bytes)) || Number(bytes) < 0) return "-";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const LoanDocumentUploadModal = ({
  open,
  title = "Upload Documents",
  onUpload,
  onClose,
  uploading = false,
  progress = 0,
  accept = "image/*,.pdf,.doc,.docx",
  multiple = true,
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    if (!open) setSelectedFiles([]);
  }, [open]);

  const uploadLabel = useMemo(() => {
    if (uploading) return "Uploading...";
    const count = selectedFiles.length;
    return `Upload ${count} File${count !== 1 ? "s" : ""}`;
  }, [selectedFiles.length, uploading]);

  if (!open) return null;

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSelectedFiles((prev) => {
      if (!multiple) return [files[0]];
      return [...prev, ...files];
    });
    e.target.value = "";
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || typeof onUpload !== "function") return;
    try {
      await onUpload(selectedFiles);
      setSelectedFiles([]);
      onClose?.();
    } catch (error) {
      console.error("LoanDocumentUploadModal upload failed:", error);
    }
  };

  const modalNode = (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="pointer-events-auto w-full max-w-2xl rounded-[28px] border border-border bg-card shadow-elevation-4">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/15 to-orange-400/15 text-rose-600 dark:text-rose-300">
              <Icon name="Upload" size={18} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {uploading ? "Uploading..." : title}
            </span>
          </div>
          {!uploading && (
            <button onClick={onClose} className="rounded-xl p-2 hover:bg-muted">
              <Icon name="X" size={18} />
            </button>
          )}
        </div>

        <div className="space-y-4 p-5">
          {!uploading && (
            <div className="rounded-[24px] border-2 border-dashed border-rose-200/80 bg-gradient-to-br from-white via-rose-50/60 to-orange-50/40 p-8 text-center transition-colors hover:border-rose-300 dark:border-rose-900/60 dark:from-white/5 dark:via-rose-500/5 dark:to-orange-500/5">
              <input
                type="file"
                id="loanDocumentUploadInput"
                multiple={multiple}
                className="hidden"
                onChange={handleFileSelect}
                accept={accept}
              />
              <label htmlFor="loanDocumentUploadInput" className="flex cursor-pointer flex-col items-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/15 to-orange-400/15 text-rose-600 dark:text-rose-300">
                  <Icon name="Upload" size={24} />
                </div>
                <p className="mb-1 text-sm font-medium text-foreground">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, PNG, JPG (max 10MB each)</p>
              </label>
            </div>
          )}

          {uploading && (
            <div className="space-y-3 py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-rose-500/15 to-orange-400/15 text-rose-600 dark:text-rose-300">
                <Icon name="Upload" size={24} />
              </div>
              <p className="font-medium">Uploading {selectedFiles.length} files...</p>
              <div className="mx-auto h-2.5 w-full max-w-xs rounded-full bg-muted dark:bg-gray-700">
                <div className="h-2.5 rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, Number(progress) || 0))}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{Math.max(0, Math.min(100, Number(progress) || 0))}% Complete</p>
            </div>
          )}

          {selectedFiles.length > 0 && !uploading && (
            <div>
              <h4 className="mb-2 text-xs font-semibold text-foreground">
                Selected Files ({selectedFiles.length})
              </h4>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{`Document ${index + 1}`}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0 rounded-lg p-1.5 hover:bg-error/10 hover:text-error"
                    >
                      <Icon name="Trash2" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={uploading} className="rounded-xl">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="rounded-xl"
          >
            {uploadLabel}
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return modalNode;
  }

  return createPortal(modalNode, document.body);
};

export default LoanDocumentUploadModal;
