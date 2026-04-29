import React from "react";
import { X } from "lucide-react";

export const ASK_GROUPS = [
  {
    title: "Vehicles / Pricelist",
    examples: [
      "Verna pricelist",
      "Verna colors",
      "Compare Verna City Slavia",
      "Show similar cars to Verna",
      "Does Verna SX have sunroof?",
      "How many new variants were added this month?",
    ],
  },
  {
    title: "Insurance",
    examples: [
      "Latest insurance of Rahul Diwan 4577",
      "Policies expiring this week",
      "Insurance cases without registration number",
      "Expired policies but status still active",
    ],
  },
  {
    title: "Loans / Finance",
    examples: [
      "Loan status of Verna 4577",
      "Approx loan closure of Rahul Diwan Verna 4577",
      "Approved but not disbursed cases",
      "Cases with payout missing",
      "Payment pending Rahul 4577",
    ],
  },
  {
    title: "Reports",
    examples: [
      "How many cars are without registration number?",
      "Cases with payout missing",
      "Customers with active loan but expired insurance",
      "Used car leads where RC check is pending",
    ],
  },
  {
    title: "360 Views",
    examples: [
      "Customer 360 Rahul Diwan",
      "Vehicle 360 DL8CAX4577",
      "Vehicle 360 4577",
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
