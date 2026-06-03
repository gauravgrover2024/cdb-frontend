import React, { useState } from "react";
import { Modal } from "antd";
import { createRoot } from "react-dom/client";
import { AlertTriangle, Save, Trash2, X } from "lucide-react";

// ── React component — use inside form trees ───────────────────────────────────
const UnsavedChangesModal = ({ open, onSave, onDiscard, onCancel, saving = false }) => (
  <Modal
    open={open}
    centered
    closable={false}
    maskClosable={false}
    footer={null}
    width={420}
    styles={{ body: { padding: 0 } }}
  >
    <div style={{ padding: "28px 28px 24px" }}>
      {/* Icon + title */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#fff7ed",
            border: "1.5px solid #fed7aa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertTriangle size={20} color="#ea580c" />
        </div>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.3,
            }}
          >
            Unsaved Changes
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "#64748b",
              lineHeight: 1.55,
            }}
          >
            You have unsaved changes. Do you want to save your changes before
            leaving?
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Save Changes */}
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            width: "100%",
            height: 42,
            borderRadius: 10,
            border: "none",
            background: saving ? "#6ee7b7" : "#059669",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = "#047857"; }}
          onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = "#059669"; }}
        >
          <Save size={15} />
          {saving ? "Saving…" : "Save Changes"}
        </button>

        {/* Discard Changes */}
        <button
          onClick={onDiscard}
          disabled={saving}
          style={{
            width: "100%",
            height: 42,
            borderRadius: 10,
            border: "1.5px solid #fecaca",
            background: "#fef2f2",
            color: "#dc2626",
            fontSize: 13,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background 0.15s",
            opacity: saving ? 0.55 : 1,
          }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = "#fee2e2"; }}
          onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = "#fef2f2"; }}
        >
          <Trash2 size={15} />
          Discard Changes
        </button>

        {/* Cancel */}
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            width: "100%",
            height: 42,
            borderRadius: 10,
            border: "1.5px solid #e2e8f0",
            background: "#fff",
            color: "#475569",
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background 0.15s",
            opacity: saving ? 0.5 : 1,
          }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = "#f8fafc"; }}
          onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = "#fff"; }}
        >
          <X size={15} />
          Cancel
        </button>
      </div>
    </div>
  </Modal>
);

export default UnsavedChangesModal;

// ── Imperative helper — use outside React trees (e.g. Header) ─────────────────
// Mounts a temporary React root, shows the modal, then cleans up.
export const showUnsavedChangesModal = ({ onSave, onDiscard, onCancel } = {}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const cleanup = () => {
    // Delay unmount slightly so the close animation plays
    setTimeout(() => {
      root.unmount();
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }, 300);
  };

  const ModalWrapper = () => {
    const [open, setOpen] = useState(true);
    const [saving, setSaving] = useState(false);

    const close = () => setOpen(false);

    return (
      <UnsavedChangesModal
        open={open}
        saving={saving}
        onSave={async () => {
          setSaving(true);
          try {
            await onSave?.();
          } finally {
            close();
            cleanup();
          }
        }}
        onDiscard={() => {
          close();
          cleanup();
          onDiscard?.();
        }}
        onCancel={() => {
          close();
          cleanup();
          onCancel?.();
        }}
      />
    );
  };

  root.render(<ModalWrapper />);
};
