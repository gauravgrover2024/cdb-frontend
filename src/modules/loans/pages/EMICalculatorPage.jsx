// src/modules/loans/pages/EMICalculatorPage.jsx
import React, { useState } from "react";
import EMICalculator from "../components/EMICalculator";
import EMICustomerDetails from "../components/EMICustomerDetails";
import Button from "../../../components/ui/Button";

const EMICalculatorPage = () => {
  const [customerValue, setCustomerValue] = useState(null);
  const [customerKey, setCustomerKey] = useState(0);

  const handleResetAll = () => {
    setCustomerValue(null);
    setCustomerKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#171717] px-4 py-4 md:px-8 md:py-6">
      <div className="max-w-6xl mx-auto space-y-3 pb-10">
        {/* Sticky top bar */}
        <div className="sticky top-[64px] z-20 bg-slate-50/80 dark:bg-[#171717]/80 backdrop-blur flex items-center justify-between mb-1 px-6 md:px-8 py-1">
          <h1 className="text-[20px] md:text-[22px] font-semibold text-slate-900 dark:text-slate-50">
            EMI & Loan Planner
          </h1>
        </div>

        {/* Customer card – width aligned with EMI inner padding */}
        <div className="px-6 md:px-8">
          <EMICustomerDetails
            key={customerKey}
            value={customerValue}
            onChange={setCustomerValue}
          />
        </div>

        {/* EMI & Loan Planner – unchanged */}
        <EMICalculator
          onResetCustomer={handleResetAll}
          customer={customerValue}
        />
      </div>
    </div>
  );
};

export default EMICalculatorPage;
