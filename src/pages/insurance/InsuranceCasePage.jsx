import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ShieldCheck, ChevronRight, Plus, PencilLine } from "lucide-react";
import NewInsuranceCaseForm from "../../components/insurance/NewInsuranceCaseForm";

const InsuranceCasePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { caseId } = useParams();

  const isEditMode = Boolean(caseId);
  const initialValues = location?.state?.caseData || null;

  const handleSubmit = () => {
    navigate("/insurance");
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-black">
        {/* Breadcrumb */}
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
          <button
            type="button"
            onClick={() => navigate("/insurance")}
            className="font-semibold hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            Insurance
          </button>
          <ChevronRight size={12} />
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {isEditMode ? "Edit Case" : "New Case"}
          </span>
        </nav>

        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isEditMode ? "bg-amber-100 dark:bg-amber-950/50" : "bg-sky-100 dark:bg-sky-950/50"}`}>
            {isEditMode ? (
              <PencilLine size={18} className="text-amber-700 dark:text-amber-300" />
            ) : (
              <Plus size={18} className="text-sky-700 dark:text-sky-300" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Insurance Case
            </p>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {isEditMode ? `Edit Case — ${caseId}` : "New Insurance Case"}
            </h2>
          </div>
        </div>

        {isEditMode && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            <ShieldCheck size={12} />
            Editing existing case — changes will update the record
          </div>
        )}
      </div>

      <NewInsuranceCaseForm
        mode={isEditMode ? "edit" : "create"}
        initialValues={initialValues}
        onCancel={() => navigate("/insurance")}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default InsuranceCasePage;
