import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, PencilLine } from "lucide-react";
import InsuranceIntroCard from "../../components/insurance/InsuranceIntroCard";

const demoCases = [
  {
    caseId: "INS-1764844048261",
    customer: "Rahul Sharma",
    mobile: "9876543210",
    vehicle: "Hyundai Creta",
    status: "In Progress",
  },
  {
    caseId: "INS-1764844048262",
    customer: "Apex Mobility Pvt Ltd",
    mobile: "9988776655",
    vehicle: "Tata Nexon",
    status: "Quote Finalized",
  },
];

const InsuranceDashboardPage = () => {
  const navigate = useNavigate();

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
          onClick={() => navigate("/insurance/new")}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700"
        >
          <Plus size={16} />
          New Insurance Case
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-black sm:p-5">
        <h3 className="mb-3 text-sm font-black text-slate-900 dark:text-white">
          Recent Insurance Cases
        </h3>
        <div className="space-y-2">
          {demoCases.map((item) => (
            <div
              key={item.caseId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"
            >
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {item.caseId}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {item.customer} • {item.mobile} • {item.vehicle}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                  {item.status}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/insurance/edit/${item.caseId}`, {
                      state: { caseData: item },
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <PencilLine size={13} /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <InsuranceIntroCard />
    </div>
  );
};

export default InsuranceDashboardPage;
