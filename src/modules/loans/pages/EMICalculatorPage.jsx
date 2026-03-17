// src/modules/loans/pages/EMICalculatorPage.jsx
import React, { useState, useEffect } from "react";
import EMICalculator from "../components/EMICalculator";
import EMICustomerDetails from "../components/EMICustomerDetails";
import { quotationsApi } from "../../../api/quotations";
import { useNavigate } from "react-router-dom";
import { ArrowLeftOutlined, FileTextOutlined } from "@ant-design/icons";

const EMICalculatorPage = () => {
  const navigate = useNavigate();
  const [customerValue, setCustomerValue] = useState(null);
  const [customerKey, setCustomerKey] = useState(0);
  const [initialQuotation, setInitialQuotation] = useState(null);
  const [initialShareView, setInitialShareView] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const handleResetAll = () => {
    setCustomerValue(null);
    setCustomerKey((k) => k + 1);
    setInitialQuotation(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quoteId = params.get("quote");
    const mode = params.get("mode");

    if (mode === "view") setInitialShareView(true);
    if (!quoteId) return;

    (async () => {
      setLoadingQuote(true);
      try {
        const res = await quotationsApi.get(quoteId);
        const q = res.data?.data || res.data;
        setInitialQuotation(q);
        if (q?.customer) {
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
      } finally {
        setLoadingQuote(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#111] dark:via-[#171717] dark:to-[#111]">
      {/* ── BREADCRUMBS / BACK BUTTON ── */}
      {!initialShareView && (
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/loans/quotations")}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#252525] transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeftOutlined style={{ fontSize: 14 }} />
          </button>
          <div className="h-5 w-px bg-slate-200 dark:bg-[#333]" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 16 16" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 1.5A6.5 6.5 0 1 0 14.5 8 6.507 6.507 0 0 0 8 1.5ZM7.25 4.5h1.5v1.75H10.5v1.5H8.75V9.5h-1.5V7.75H5.5v-1.5h1.75Z"/>
              </svg>
            </div>
            <span className="font-semibold text-slate-900 dark:text-white text-[15px] tracking-tight">
              EMI Calculator
            </span>
            {initialQuotation?.quotationId && (
              <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-[#252525] px-2 py-0.5 rounded-full ml-1">
                {initialQuotation.quotationId}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/loans/quotations")}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#252525]"
        >
          <FileTextOutlined style={{ fontSize: 13 }} />
          All Quotations
        </button>
      </div>
      )}

      {/* ── CUSTOMER PANEL ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-5 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-[#2a2a2a] to-transparent" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Customer
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 dark:via-[#2a2a2a] to-transparent" />
        </div>

        {loadingQuote ? (
          <div className="h-16 bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-100 dark:border-[#262626] animate-pulse" />
        ) : (
          <EMICustomerDetails
            key={customerKey}
            value={customerValue}
            onChange={setCustomerValue}
          />
        )}
      </div>

      {/* ── EMI CALCULATOR ── */}
      <div className="max-w-7xl mx-auto pb-16">
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
