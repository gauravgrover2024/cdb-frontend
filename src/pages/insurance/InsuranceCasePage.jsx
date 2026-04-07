import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-black sm:p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Insurance Case
        </p>
        <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
          {isEditMode
            ? `Edit Insurance Case (${caseId})`
            : "New Insurance Case"}
        </h2>
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
