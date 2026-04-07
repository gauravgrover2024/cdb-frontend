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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-black sm:p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Insurance Dashboard
          </p>
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
            Manage insurance cases
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700"
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
