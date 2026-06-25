import React from "react";
import Icon from "../../../components/AppIcon";

const DocumentsModal = ({ open, title, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-4xl max-h-[85vh] flex flex-col border border-border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <span className="text-sm font-semibold">Loan Documents</span>
            {title && <p className="text-xs text-muted-foreground mt-1">{title}</p>}
          </div>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground transition"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Upload Documents</label>
              <input
                type="file"
                multiple
                className="border border-border px-3 py-2 text-sm w-full rounded cursor-pointer"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Supported formats: PDF, JPG, PNG, DOC</p>
              <p>Maximum file size: 5MB per file</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button 
            onClick={onClose} 
            className="px-4 py-2 border border-border text-sm rounded hover:bg-muted transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentsModal;
