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
  if (step >= 8) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
  if (step >= 4) {
    return "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300";
  }
  return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300";
};

const STEP_NAMES = {
  1: "Customer Info",
  2: "Vehicle Details",
  3: "Previous Policy",
  4: "Quotes",
  6: "Policy Details",
  7: "Documents",
  8: "Payment",
  9: "Payout",
};

const STEP_SHORT_NAMES = {
  1: "Customer",
  2: "Vehicle",
  3: "Previous",
  4: "Quotes",
  5: "Premium",
  6: "Policy",
  7: "Docs",
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

const SummarySegment = ({
  icon,
  label,
  title,
  line1,
  line2,
  tint = "",
  divider = true,
  rightSlot = null,
}) => {
  return (
    <div
      className={`min-w-[190px] flex-1 px-3 py-2 ${tint} ${
        divider ? "border-r border-slate-200/70 dark:border-slate-800/80" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <Icon name={icon} size={10} />
            {label}
          </p>

          <p className="mt-0.5 truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
            {title || "—"}
          </p>

          <div className="mt-0.5 flex flex-col gap-0.5">
            <p className="truncate text-[9px] font-medium leading-none text-slate-500 dark:text-slate-400">
              {line1 || "—"}
            </p>
            <p className="truncate text-[9px] font-medium leading-none text-slate-500 dark:text-slate-400">
              {line2 || "—"}
            </p>
          </div>
        </div>

        {rightSlot ? (
          <div className="mt-0.5 shrink-0">{rightSlot}</div>
        ) : (
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/90 bg-white/80 text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-500">
            <Icon name="ChevronRight" size={10} />
          </div>
        )}
      </div>
    </div>
  );
};

const InsuranceStickyHeader = ({
  formData,
  activeStep,
  onStepClick,
  innerRef,
}) => {
  const data = formData || {};

  const vehicleLine = [data.vehicleMake, data.vehicleModel, data.vehicleVariant]
    .filter((v) => hasValue(v))
    .join(" ");

  const policyCoreLabel = useMemo(() => {
    if (hasValue(data.newInsuranceCompany)) return data.newInsuranceCompany;
    return data.registrationNumber || "New Policy";
  }, [data.newInsuranceCompany, data.registrationNumber]);

  const visibleSteps = useMemo(() => {
    const isNewCar = data.vehicleType === "New Car";
    const isExtendedWarranty =
      String(data.policyCategory || "").trim() === "Extended Warranty";
    return Object.keys(STEP_NAMES)
      .map((s) => parseInt(s, 10))
      .filter(
        (s) =>
          !((isNewCar || isExtendedWarranty) && s === 3) &&
          !(isExtendedWarranty && s === 4),
      );
  }, [data.policyCategory, data.vehicleType]);

  const currentStepIndex = Math.max(visibleSteps.indexOf(activeStep), 0);

  return (
    <>
      <div
        ref={innerRef}
        className="fixed left-0 right-0 z-[100] w-full border-b border-slate-200/70 bg-background/95 shadow-sm backdrop-blur-sm dark:border-slate-800"
        style={{ top: 60 }}
      >
        <div className="w-full px-2 py-2 sm:px-3 md:px-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/92 shadow-[0_6px_18px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/88">
            <div className="flex items-stretch overflow-x-auto no-scrollbar">
              <SummarySegment
                icon="User"
                label="Customer"
                title={data.customerName || data.companyName || "New Case"}
                line1={`${data.mobile || "—"} • ${data.email || "—"}`}
                line2={`PAN: ${data.panNumber || "—"}${
                  data.employeeName ? ` • Staff: ${data.employeeName}` : ""
                }`}
                tint="bg-sky-50/45 dark:bg-sky-950/10"
              />

              <SummarySegment
                icon="Shield"
                label="Policy"
                title={policyCoreLabel}
                line1={`${data.newInsuranceDuration || "1yr OD + 1yr TP"} • ${
                  data.newPolicyType || "—"
                }`}
                line2={`${data.newPolicyNumber || "No Policy #"} • Starts: ${
                  data.newPolicyStartDate || "—"
                }`}
                tint="bg-emerald-50/45 dark:bg-emerald-950/10"
              />

              <SummarySegment
                icon="IndianRupee"
                label="Premium & IDV"
                title={formatMoney(data.newTotalPremium)}
                line1={`IDV: ${formatMoney(data.newIdvAmount)} • NCB: ${
                  data.newNcbDiscount || 0
                }%`}
                line2={`Subvention: ${formatMoney(data.subventionAmount)}`}
                tint="bg-teal-50/45 dark:bg-teal-950/10"
              />

              <SummarySegment
                icon="Car"
                label="Vehicle"
                title={vehicleLine || "—"}
                line1={`Reg: ${data.registrationNumber || "Unregistered"} • Year: ${
                  data.manufactureYear || "—"
                }`}
                line2={`Chassis: ${data.chassisNumber || "—"}`}
                tint="bg-violet-50/45 dark:bg-violet-950/10"
              />

              <SummarySegment
                icon="BarChart2"
                label="Workflow"
                title={`ID: ${String(data.id || data._id || "NEW").slice(-8)}`}
                line1={STEP_NAMES[activeStep] || "—"}
                line2={`${currentStepIndex + 1} of ${visibleSteps.length} steps`}
                tint="bg-amber-50/45 dark:bg-amber-950/10"
                divider={false}
                rightSlot={
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${stepPillClass(
                      activeStep,
                    )}`}
                  >
                    {STEP_SHORT_NAMES[activeStep] || "Stage"}
                  </span>
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[72px] left-1/2 z-[120] -translate-x-1/2 px-3">
        <div className="flex max-w-[calc(100vw-40px)] items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/78 px-2 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl no-scrollbar dark:border-slate-800/80 dark:bg-slate-950/60">
          {visibleSteps.map((stepNum) => {
            const isActive = activeStep === stepNum;

            return (
              <button
                key={stepNum}
                type="button"
                onClick={() => onStepClick?.(stepNum)}
                title={STEP_NAMES[stepNum]}
                className={`group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[10px] font-medium tracking-tight transition-all duration-200 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-[0_6px_18px_rgba(1,105,111,0.22)] dark:bg-primary dark:text-white"
                    : "bg-transparent text-slate-500 hover:bg-white/80 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <span className="flex items-center justify-center">
                  <Icon
                    name={STEP_ICONS[stepNum]}
                    size={12}
                    className={
                      isActive ? "text-[hsl(var(--primary-foreground))]" : ""
                    }
                  />
                </span>

                <span className="whitespace-nowrap">
                  {STEP_SHORT_NAMES[stepNum]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
};

export default InsuranceStickyHeader;
