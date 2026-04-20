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
  if (step >= 8)
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (step >= 4)
    return "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300";
  return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300";
};

const STEP_NAMES = {
  1: "Customer Info",
  2: "Vehicle Details",
  3: "Previous Policy",
  4: "Quotes",
  5: "Quote Summary",
  6: "Policy Details",
  7: "Documents",
  8: "Payment",
  9: "Payout",
};

const STEP_ICONS = {
  1: "User",
  2: "Car",
  3: "History",
  4: "Layout",
  5: "DollarSign",
  6: "FileText",
  7: "Upload",
  8: "CreditCard",
  9: "Banknote",
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
      .filter((s) => !(isNewCar && s === 3))
      .filter((s) => s !== 5);
  }, [data.vehicleType]);


  return (
    <div
      ref={innerRef}
      className="fixed left-0 right-0 z-[100] w-full border-b border-border bg-background/95 backdrop-blur-sm shadow-sm"
      style={{ top: 60 }}
    >
      <div className="w-full px-2 sm:px-3 md:px-4 py-2 space-y-2">
        <div className="flex items-stretch gap-2 overflow-x-auto no-scrollbar">
          <div className="min-w-[220px] rounded-xl border border-sky-200/70 bg-sky-50/70 px-3 py-2 dark:border-sky-900/60 dark:bg-sky-950/20">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
              <Icon name="User" size={12} />
              Customer
            </p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {data.customerName || data.companyName || "New Case"}
            </p>
            <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">
              {customerLine || "Mobile / Email not added"}
            </p>
            <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">
              PAN: {data.panNumber || "—"}{" "}
              {data.employeeName ? `• Staff: ${data.employeeName}` : ""}
            </p>
          </div>

          <div className="min-w-[220px] rounded-xl border border-violet-200/70 bg-violet-50/70 px-3 py-2 dark:border-violet-900/60 dark:bg-violet-950/20">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
              <Icon name="Car" size={12} />
              Vehicle
            </p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {vehicleLine || data.registrationNumber || "Vehicle details pending"}
            </p>
            <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">
              Reg: {data.registrationNumber || "—"} • Year:{" "}
              {data.manufactureYear || "—"}
            </p>
          </div>

          <div className="min-w-[220px] rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <Icon name="Shield" size={12} />
              Policy
            </p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {policyCoreLabel}
            </p>
            <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">
              {data.newInsuranceDuration || "1yr OD + 1yr TP"} •{" "}
              {data.newPolicyType || "—"}
            </p>
            <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">
              #{data.newPolicyNumber || "No Policy #"} • Start:{" "}
              {data.newPolicyStartDate || "—"}
            </p>
          </div>

          <div className="min-w-[220px] rounded-xl border border-teal-200/70 bg-teal-50/70 px-3 py-2 dark:border-teal-900/60 dark:bg-teal-950/20">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
              <Icon name="IndianRupee" size={12} />
              Premium
            </p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatMoney(data.newTotalPremium)}
            </p>
            <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">
              IDV: {formatMoney(data.newIdvAmount)} • NCB:{" "}
              {data.newNcbDiscount || 0}%
            </p>
            <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">
              Subvention: {formatMoney(data.subventionAmount)}
            </p>
          </div>

          <div className="min-w-[220px] rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2 dark:border-amber-900/60 dark:bg-amber-950/20">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              <Icon name="CreditCard" size={12} />
              Customer Payment
            </p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              Bal:{" "}
              {formatMoney(
                asNumber(data.customerPaymentExpected) -
                  asNumber(data.customerPaymentReceived),
              )}
            </p>
            <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">
              Rec: {formatMoney(data.customerPaymentReceived)} • Exp:{" "}
              {formatMoney(data.customerPaymentExpected)}
            </p>
          </div>

          <div className="min-w-[220px] rounded-xl border border-rose-200/70 bg-rose-50/70 px-3 py-2 dark:border-rose-900/60 dark:bg-rose-950/20">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
              <Icon name="Home" size={12} />
              In-house Payment
            </p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              Bal:{" "}
              {formatMoney(
                asNumber(data.inhousePaymentExpected) -
                  asNumber(data.inhousePaymentReceived),
              )}
            </p>
            <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">
              Paid: {formatMoney(data.inhousePaymentReceived)} • Exp:{" "}
              {formatMoney(data.inhousePaymentExpected)}
            </p>
          </div>


          <div className="ml-auto min-w-[170px] rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              <Icon name="BarChart2" size={12} />
              Workflow
            </p>
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              Case ID: {String(data.id || data._id || "NEW").slice(-8)}
            </p>
            <div
              className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${stepPillClass(activeStep)}`}
            >
              {STEP_NAMES[activeStep]}
            </div>
          </div>
        </div>

        {/* Row 2: Horizontal Stepper */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white/80 px-2 py-1.5 no-scrollbar dark:border-slate-800 dark:bg-slate-950/80">
          {visibleSteps.map((stepNum, idx) => {
            const isActive = activeStep === stepNum;
            const isCompleted = activeStep > stepNum;

            return (
              <React.Fragment key={stepNum}>
                <button
                  onClick={() => onStepClick?.(stepNum)}
                  className={`group flex items-center gap-1.5 rounded-lg border px-2 py-1 transition-all duration-200 ${
                    isActive
                      ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                      : isCompleted
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-semibold transition-all duration-200 ${
                      isActive
                        ? "border-sky-500 bg-sky-500 text-white"
                        : isCompleted
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  >
                    {isCompleted ? (
                      <Icon name="Check" size={12} strokeWidth={3} />
                    ) : (
                      <Icon name={STEP_ICONS[stepNum]} size={12} />
                    )}
                  </div>
                  <span
                    className={`whitespace-nowrap text-[11px] font-semibold ${
                      isActive
                        ? "text-sky-600 dark:text-sky-400"
                        : isCompleted
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-slate-500"
                    }`}
                  >
                    {STEP_NAMES[stepNum]}
                  </span>
                </button>
                {idx < visibleSteps.length - 1 && (
                  <div
                    className={`h-[2px] min-w-[10px] flex-1 rounded-full transition-all duration-300 ${
                      isCompleted
                        ? "bg-emerald-400/90"
                        : "bg-slate-200/90 dark:bg-slate-800"
                    }`}
                  />
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
