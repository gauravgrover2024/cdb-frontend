
import React, { useState } from "react";
import { Upload, Image, Button, Tooltip, message } from "antd";
import { 
  CloudUploadOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  FilePdfOutlined, 
  LoadingOutlined 
} from "@ant-design/icons";
import { uploadToCloudinary } from "../../utils/cloudinary";

/**
 * DocumentUpload
 * 
 * A premium UI component for uploading and previewing documents (Images/PDFs).
 * 
 * Props:
 * - value: string (URL of uploaded doc)
 * - onChange: function(url) -> updates parent state
 * - folder: string (optional cloudinary folder)
 */
const DocumentUpload = ({ value, onChange, folder = "documents", className }) => {
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const isPdf = value?.toLowerCase().endsWith(".pdf");

  const handleUpload = async (file) => {
    try {
      setLoading(true);
      const data = await uploadToCloudinary(file);
      if (data?.secure_url) {
        onChange(data.secure_url);
        message.success("Uploaded successfully");
      }
    } catch (error) {
      console.error("Upload error:", error);
      message.error("Upload failed");
    } finally {
      setLoading(false);
    }
    return false; // prevent auto upload
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange("");
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

    if (!value) {
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
        src={value}
        alt="Preview"
        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
      />
    );
  };

  return (
    <div className={`relative group ${className}`}>
      <Upload
        accept="image/*,.pdf"
        showUploadList={false}
        beforeUpload={handleUpload}
        disabled={loading}
        className="block"
      >
        <div 
          className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary bg-white overflow-hidden cursor-pointer transition-all hover:shadow-md active:scale-95 flex items-center justify-center relative"
        >
          {renderPreview()}

          {/* Overlay Actions (only if value exists and not loading) */}
          {value && !loading && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
              <Tooltip title="Preview">
                <Button 
                  shape="circle" 
                  size="small" 
                  icon={<EyeOutlined />} 
                  className="bg-white/90 border-none text-gray-700 hover:text-primary hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPdf) window.open(value, "_blank");
                    else setPreviewOpen(true);
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
      </Upload>

      {/* Image Lightbox */}
      {!isPdf && value && (
        <div style={{ display: 'none' }}>
          <Image
            preview={{
              visible: previewOpen,
              onVisibleChange: (vis) => setPreviewOpen(vis),
              src: value,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
