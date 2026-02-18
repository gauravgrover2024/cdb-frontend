import React, { useState } from "react";
import { message } from "antd";
import Icon from "../../../components/AppIcon";

const NotesModal = ({ open, form, title, onClose }) => {
  const [notes, setNotes] = useState(() => form?.getFieldValue("loan_notes") || "");
  
  if (!open) return null;

  const handleSave = () => {
    form?.setFieldsValue({ loan_notes: notes });
    message.success("Notes saved");
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-2xl border border-border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <span className="text-sm font-semibold">Internal Notes</span>
            {title && <p className="text-xs text-muted-foreground mt-1">{title}</p>}
          </div>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground transition"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
        
        <div className="p-4">
          <textarea
            className="w-full min-h-[220px] border border-border px-3 py-2 text-sm bg-background rounded focus:outline-none focus:ring-2 focus:ring-primary"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal notes about this loan application..."
          />
        </div>
        
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button 
            onClick={onClose} 
            className="px-4 py-2 border border-border text-sm rounded hover:bg-muted transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-4 py-2 bg-primary text-white text-sm rounded hover:bg-primary/90 transition"
          >
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotesModal;
