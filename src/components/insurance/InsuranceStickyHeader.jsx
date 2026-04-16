// src/components/insurance/InsuranceStickyHeader.jsx
import React, { useMemo } from "react";
import Icon from "../../components/AppIcon";

const hasValue = (v) =>
  v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "");

const asNumber = (v) => {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (v) => {
  const n = asNumber(v);
  if (!n) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

const stepPillClass = (step) => {
  if (step >= 7) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (step >= 4) return "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300";
  return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300";
};

const STEP_NAMES = {
  1: "Customer Info",
  2: "Vehicle Details",
  3: "Previous Policy",
  4: "Quotes",
  5: "Policy Details",
  6: "Documents",
  7: "Payment",
  8: "Payout",
};

const STEP_ICONS = {
  1: "User",
  2: "Car",
  3: "History",
  4: "Layout",
  5: "FileText",
  6: "Upload",
  7: "CreditCard",
  8: "Banknote",
};

const InsuranceStickyHeader = ({
  formData,
  activeStep,
  onStepClick,
  innerRef,
}) => {
  const data = formData || {};

  const customerLine = [data.mobile, data.email]
    .filter((v) => hasValue(v))
    .join(" • ");

  const vehicleLine = [data.vehicleMake, data.vehicleModel, data.vehicleVariant]
    .filter((v) => hasValue(v))
    .join(" ");

  const policyCoreLabel = useMemo(() => {
    if (hasValue(data.newInsuranceCompany)) return data.newInsuranceCompany;
    return data.registrationNumber || "New Policy";
  }, [data.newInsuranceCompany, data.registrationNumber]);

  const visibleSteps = useMemo(() => {
    const isNewCar = data.vehicleType === "New Car";
    return Object.keys(STEP_NAMES)
      .map((s) => parseInt(s))
      .filter((s) => !(isNewCar && s === 3));
  }, [data.vehicleType]);

  return (
    <div
      ref={innerRef}
      className="fixed left-0 right-0 z-[100] w-full border-b border-border bg-background/95 backdrop-blur-sm shadow-sm"
      style={{ top: 60 }}
    >
      <div className="w-full px-2 sm:px-3 md:px-4 py-2 flex flex-col gap-2">
        {/* Row 1: Summary Context */}
        <div className="flex items-stretch overflow-x-auto rounded-xl border border-slate-300/70 bg-white/90 no-scrollbar dark:border-slate-800 dark:bg-slate-950/85">
          {/* Customer Segment */}
          <div className="min-w-[180px] px-3 py-1.5 bg-sky-50/65 dark:bg-sky-950/15">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              <Icon name="User" size={10} />
              Customer
            </p>
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              {data.customerName || data.companyName || "New Case"}
            </p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <p className="truncate text-[9px] text-slate-500 font-medium leading-none">
                {data.mobile || "—"} • {data.email || "—"}
              </p>
              <p className="truncate text-[9px] text-slate-500 font-medium leading-none">
                PAN: {data.panNumber || "—"} {data.employeeName ? `• Staff: ${data.employeeName}` : ""}
              </p>
            </div>
          </div>

          {/* Policy Segment */}
          <div className="min-w-[200px] px-3 py-1.5 bg-emerald-50/65 border-l border-slate-300/30 dark:bg-emerald-950/15 dark:border-slate-800">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              <Icon name="Shield" size={10} />
              Policy
            </p>
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              {policyCoreLabel}
            </p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <p className="truncate text-[9px] text-slate-500 font-medium leading-none">
                {data.newInsuranceDuration || "1yr OD + 1yr TP"} • {data.newPolicyType || "—"}
              </p>
              <p className="truncate text-[9px] text-slate-500 font-medium leading-none">
                {data.newPolicyNumber || "No Policy #"} • Starts: {data.newPolicyStartDate || "—"}
              </p>
            </div>
          </div>

          {/* Premium Segment */}
          <div className="min-w-[180px] px-3 py-1.5 bg-teal-50/65 border-l border-slate-300/30 dark:bg-teal-950/15 dark:border-slate-800">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
              <Icon name="IndianRupee" size={10} />
              Premium & IDV
            </p>
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              {formatMoney(data.newTotalPremium)}
            </p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <p className="truncate text-[9px] text-slate-500 font-medium leading-none">
                IDV: {formatMoney(data.newIdvAmount)} • NCB: {data.newNcbDiscount || 0}%
              </p>
              <p className="truncate text-[9px] text-slate-500 font-medium leading-none">
                Subvention: {formatMoney(data.subventionAmount)}
              </p>
            </div>
          </div>

          {/* Vehicle Segment */}
          <div className="min-w-[200px] px-3 py-1.5 bg-violet-50/65 border-l border-slate-300/30 dark:bg-violet-950/15 dark:border-slate-800">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              <Icon name="Car" size={10} />
              Vehicle
            </p>
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              {vehicleLine || "—"}
            </p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <p className="truncate text-[9px] text-slate-500 font-medium leading-none">
                Reg: {data.registrationNumber || "Unregistered"} • Year: {data.manufactureYear || "—"}
              </p>
              <p className="truncate text-[9px] text-slate-500 font-medium leading-none">
                Chassis: {data.chassisNumber || "—"}
              </p>
            </div>
          </div>

          {/* Customer Financials Segment */}
          <div className="min-w-[180px] px-3 py-1.5 bg-amber-50/65 border-l border-slate-300/30 dark:bg-amber-950/15 dark:border-slate-800">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              <Icon name="CreditCard" size={10} />
              Customer Pmt
            </p>
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              Bal: {formatMoney(asNumber(data.customerPaymentExpected) - asNumber(data.customerPaymentReceived))}
            </p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <p className="truncate text-[9px] text-slate-500 font-medium leading-none text-emerald-600 dark:text-emerald-400">
                Rec: {formatMoney(data.customerPaymentReceived)}
              </p>
              <p className="truncate text-[9px] text-slate-500 font-medium leading-none">
                Exp: {formatMoney(data.customerPaymentExpected)}
              </p>
            </div>
          </div>

          {/* In-house Financials Segment */}
          <div className="min-w-[180px] px-3 py-1.5 bg-rose-50/65 border-l border-slate-300/30 dark:bg-rose-950/15 dark:border-slate-800">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              <Icon name="Home" size={10} />
              In-house Pmt
            </p>
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              Bal: {formatMoney(asNumber(data.inhousePaymentExpected) - asNumber(data.inhousePaymentReceived))}
            </p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <p className="truncate text-[9px] text-slate-500 font-medium leading-none text-rose-600 dark:text-rose-400">
                Paid: {formatMoney(data.inhousePaymentReceived)}
              </p>
              <p className="truncate text-[9px] text-slate-500 font-medium leading-none">
                Exp: {formatMoney(data.inhousePaymentExpected)}
              </p>
            </div>
          </div>

          <div className="ml-auto min-w-[130px] px-3 py-1.5 bg-slate-50/65 border-l border-slate-300/30 dark:bg-slate-900/40 dark:border-slate-800">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
              <Icon name="BarChart2" size={10} />
              Workflow
            </p>
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              ID: {String(data.id || data._id || "NEW").slice(-8)}
            </p>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold mt-0.5 ${stepPillClass(activeStep)}`}>
              {STEP_NAMES[activeStep]}
            </span>
          </div>
        </div>

        {/* Row 2: Horizontal Stepper */}
        <div className="flex items-center justify-between px-1 overflow-x-auto no-scrollbar">
          {visibleSteps.map((stepNum, idx) => {
            const isActive = activeStep === stepNum;
            const isCompleted = activeStep > stepNum;
            
            return (
              <React.Fragment key={stepNum}>
                <button
                  onClick={() => onStepClick?.(stepNum)}
                  className={`group relative flex flex-col items-center gap-1.5 transition-all duration-300 ${
                    isActive ? "opacity-100" : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl border-2 transition-all duration-300 ${
                    isActive 
                      ? "border-sky-500 bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]" 
                      : isCompleted 
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" 
                        : "border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-900"
                  }`}>
                    {isCompleted ? (
                      <Icon name="Check" size={16} strokeWidth={3} />
                    ) : (
                      <Icon name={STEP_ICONS[stepNum]} size={16} />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold tracking-tight whitespace-nowrap ${
                    isActive ? "text-sky-600 dark:text-sky-400" : "text-slate-500"
                  }`}>
                    {STEP_NAMES[stepNum]}
                  </span>
                  
                  {isActive && (
                    <div className="absolute -bottom-2 h-1 w-full rounded-t-full bg-sky-500" />
                  )}
                </button>
                {idx < visibleSteps.length - 1 && (
                  <div className={`h-[2px] flex-1 min-w-[20px] mx-2 mb-4 rounded-full transition-all duration-500 ${
                    isCompleted ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-800"
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InsuranceStickyHeader;
