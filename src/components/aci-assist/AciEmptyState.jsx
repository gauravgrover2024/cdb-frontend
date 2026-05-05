import React from "react";
import { AlertCircle } from "lucide-react";

export default function AciEmptyState({
  title = "Data unavailable",
  message = "This information is not available right now.",
}) {
  return (
    <div className="rounded-2xl border border-[#dbe3ef] bg-[#f8fafc] p-4 text-sm text-[#475569]">
      <div className="flex items-start gap-3">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-[#64748b]" />
        <div>
          <p className="font-black text-[#0f172a]">{title}</p>
          <p className="mt-1 font-semibold">{message}</p>
        </div>
      </div>
    </div>
  );
}
