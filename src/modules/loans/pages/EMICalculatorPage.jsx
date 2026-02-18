// src/modules/loans/pages/EMICalculatorPage.jsx
import React, { useState, useEffect } from "react";
import EMICalculator from "../components/EMICalculator";
import EMICustomerDetails from "../components/EMICustomerDetails";
import { quotationsApi } from "../../../api/quotations";
import { useNavigate } from "react-router-dom";

const EMICalculatorPage = () => {
  const navigate = useNavigate();
  const [customerValue, setCustomerValue] = useState(null);
  const [customerKey, setCustomerKey] = useState(0);
  const [initialQuotation, setInitialQuotation] = useState(null);
  const [initialShareView, setInitialShareView] = useState(false);

  const handleResetAll = () => {
    setCustomerValue(null);
    setCustomerKey((k) => k + 1);
    setInitialQuotation(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quoteId = params.get("quote");
    const mode = params.get("mode");

    if (mode === "view") {
      setInitialShareView(true);
    }

    if (!quoteId) return;

    (async () => {
      try {
        const res = await quotationsApi.get(quoteId);
        const q = res.data;
        setInitialQuotation(q);

        if (q.customer) {
          setCustomerValue({
            customerId: q.customer.customerId,
            customerName: q.customer.customerName,
            primaryMobile: q.customer.primaryMobile,
            email: q.customer.email,
            residenceAddress: q.customer.residenceAddress,
            city: q.customer.city,
            pincode: q.customer.pincode,
          });
          setCustomerKey((k) => k + 1);
        }
      } catch (err) {
        console.error("Load quotation error:", err);
      }
    })();
  }, []);

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
          <button
            type="button"
            onClick={() => navigate("/loans/quotations")}
            className="mb-2 inline-flex items-center text-[11px] text-slate-500 hover:text-slate-900"
          >
            ‹ Back to quotation manager
          </button>
          <EMICustomerDetails
            key={customerKey}
            value={customerValue}
            onChange={setCustomerValue}
          />
        </div>

        {/* EMI & Loan Planner */}
        <EMICalculator
          onResetCustomer={handleResetAll}
          customer={customerValue}
          initialQuotation={initialQuotation}
          initialShareView={initialShareView}
        />
      </div>
    </div>
  );
};

export default EMICalculatorPage;
