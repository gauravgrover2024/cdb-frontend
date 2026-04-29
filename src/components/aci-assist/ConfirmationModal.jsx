import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmationModal({ open, action, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-amber-50 p-3 text-amber-600">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-950">Confirm action</h3>
            <p className="mt-1 text-sm text-slate-600">
              {action?.confirmMessage || `Run "${action?.label || action?.type || "this action"}"?`}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
