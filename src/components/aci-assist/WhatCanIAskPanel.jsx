import React from "react";
import { X } from "lucide-react";

export const ASK_GROUPS = [
  {
    title: "Vehicles",
    examples: [
      "Verna pricelist",
      "Show colors of Verna",
      "Does Verna SX have sunroof?",
    ],
  },
  {
    title: "Loans",
    examples: [
      "Approved but not disbursed cases",
      "Loan closure 7077",
    ],
  },
  {
    title: "Business",
    examples: [
      "Total business this month",
      "Cash car business this month",
    ],
  },
  {
    title: "Customers",
    examples: [
      "Customer 360 Vinod Kumar Jha",
    ],
  },
];

export default function WhatCanIAskPanel({ open, onClose, onAsk }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1050] flex justify-end bg-slate-950/30 backdrop-blur-sm">
      <aside className="h-full w-full max-w-xl overflow-auto border-l border-slate-200 bg-white p-5 shadow-2xl">
        <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">What can I ask?</h2>
            <p className="text-sm text-slate-500">Click any example to send it to ACI Assist.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            aria-label="Close examples"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          {ASK_GROUPS.map((group) => (
            <section key={group.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-black text-slate-900">{group.title}</h3>
              <div className="mt-3 grid gap-2">
                {group.examples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      onAsk?.(example);
                      onClose?.();
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}
