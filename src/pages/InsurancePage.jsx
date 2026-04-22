import React, { useState } from "react";
import { Plus } from "lucide-react";
import InsuranceIntroCard from "../components/insurance/InsuranceIntroCard";
import NewInsuranceCaseForm from "../components/insurance/NewInsuranceCaseForm";

const InsurancePage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState("");

  const handleCreateCase = (payload) => {
    // Placeholder for API integration in next step
    // For now, we show success and close the form.
    setCreatedCaseId(payload?.caseId || "");
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50 via-cyan-50 to-emerald-50 p-4 shadow-[0_12px_30px_rgba(79,70,229,0.12)] dark:border-slate-800 dark:bg-black sm:p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-slate-400">
            Insurance Dashboard
          </p>
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
            Manage insurance cases
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white shadow-[0_8px_18px_rgba(79,70,229,0.28)] transition hover:brightness-105"
        >
          <Plus size={16} />
          New Insurance Case
        </button>
      </div>

      {createdCaseId ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          Insurance case created successfully ({createdCaseId}).
        </div>
      ) : null}

      {isFormOpen ? (
        <NewInsuranceCaseForm
          onCancel={() => setIsFormOpen(false)}
          onSubmit={handleCreateCase}
        />
      ) : null}

      <InsuranceIntroCard />
    </div>
  );
};

export default InsurancePage;
