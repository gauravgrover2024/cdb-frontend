import React, { useState } from "react";
import { Button, Tooltip, message } from "antd";
import {
  CloudUploadOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilePdfOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { uploadSingleFile } from "../../api/uploads";
import LoanDocumentViewerModal from "../../modules/loans/components/shared/LoanDocumentViewerModal";
import LoanDocumentUploadModal from "../../modules/loans/components/shared/LoanDocumentUploadModal";

/**
 * DocumentUpload
 * 
 * A premium UI component for uploading and previewing documents (Images/PDFs).
 * 
 * Props:
 * - value: string (URL of uploaded doc)
 * - onChange: function(url) -> updates parent state
 * - folder: string (unused; retained for compatibility)
 */
const DocumentUpload = ({
  value,
  onChange,
  folder = "documents",
  className,
  uploadTitle = "Upload Document",
  viewerTitle = "Post-File Document Viewer",
  docTag = "Document",
}) => {
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const folderName = folder || "documents";
  const resolvedUrl = (() => {
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === "string") return first.trim();
      if (first && typeof first === "object") {
        return String(first.url || first.secure_url || first.path || "").trim();
      }
    }
    if (value && typeof value === "object") {
      return String(value.url || value.secure_url || value.path || "").trim();
    }
    return "";
  })();
  const isPdf = resolvedUrl.toLowerCase().endsWith(".pdf");

  const handleUpload = async (files) => {
    const file = Array.isArray(files) ? files[0] : null;
    if (!file) return;
    try {
      setLoading(true);
      const data = await uploadSingleFile(file);
      if (data?.url) {
        onChange?.(data.url);
        message.success("Uploaded successfully");
        setUploadOpen(false);
      }
    } catch (error) {
      console.error(`Upload error (${folderName}):`, error);
      message.error("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange?.("");
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-primary">
          <LoadingOutlined className="text-2xl mb-2" />
          <span className="text-xs font-medium">Uploading...</span>
        </div>
      );
    }

    if (!resolvedUrl) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-primary transition-colors">
          <CloudUploadOutlined className="text-2xl mb-1" />
          <span className="text-[10px] uppercase font-bold tracking-wide">Upload</span>
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-500">
          <FilePdfOutlined className="text-3xl" />
          <span className="text-[10px] font-bold mt-1">PDF</span>
        </div>
      );
    }

    // Image Preview
    return (
      <img
        src={resolvedUrl}
        alt="Preview"
        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      />
    );
  };

  return (
    <div className={`relative group ${className}`}>
      <div
        className="block"
        role="button"
        tabIndex={0}
        onClick={() => {
          if (loading) return;
          if (resolvedUrl) setPreviewOpen(true);
          else setUploadOpen(true);
        }}
        onKeyDown={(e) => {
          if (loading) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (resolvedUrl) setPreviewOpen(true);
            else setUploadOpen(true);
          }
        }}
      >
        <div 
          className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary bg-white overflow-hidden cursor-pointer transition-all hover:shadow-md active:scale-95 flex items-center justify-center relative"
          style={{
            width: 96,
            height: 96,
            minWidth: 96,
            minHeight: 96,
            maxWidth: 96,
            maxHeight: 96,
            overflow: "hidden",
            position: "relative",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {renderPreview()}

          {/* Overlay Actions (only if value exists and not loading) */}
          {resolvedUrl && !loading && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
              <Tooltip title="Preview">
                <Button 
                  shape="circle" 
                  size="small" 
                  icon={<EyeOutlined />} 
                  className="bg-white/90 border-none text-gray-700 hover:text-primary hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewOpen(true);
                  }}
                />
              </Tooltip>
              <Tooltip title="Change">
                <Button
                  shape="circle"
                  size="small"
                  icon={<CloudUploadOutlined />}
                  className="bg-white/90 border-none text-gray-700 hover:text-primary hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadOpen(true);
                  }}
                />
              </Tooltip>
              <Tooltip title="Remove">
                <Button 
                  shape="circle" 
                  size="small" 
                  danger
                  icon={<DeleteOutlined />} 
                  className="bg-white/90 border-none hover:bg-white"
                  onClick={handleRemove}
                />
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      <LoanDocumentUploadModal
        open={uploadOpen}
        title={uploadTitle}
        multiple={false}
        uploading={loading}
        accept="image/*,.pdf"
        onUpload={handleUpload}
        onClose={() => {
          if (!loading) setUploadOpen(false);
        }}
      />

      <LoanDocumentViewerModal
        open={Boolean(previewOpen && resolvedUrl)}
        title={viewerTitle}
        documents={
          resolvedUrl
            ? [
                {
                  id: "document_upload_preview",
                  name: "Uploaded Document",
                  tag: isPdf ? "PDF" : docTag,
                  url: resolvedUrl,
                },
              ]
            : []
        }
        onClose={() => setPreviewOpen(false)}
        showThumbnailRail={false}
      />
    </div>
  );
};
export default DocumentUpload;
