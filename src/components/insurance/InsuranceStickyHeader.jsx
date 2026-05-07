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

const getPolicyDisplayName = (data = {}) => {
  const customerLabel =
    String(
      data.customerName ||
        data.contactPersonName ||
        data.companyName ||
        "Customer",
    ).trim() || "Customer";
  const vehicleLabel =
    String(data.registrationNumber || "").trim() ||
    [data.vehicleMake, data.vehicleModel, data.vehicleVariant]
      .filter((value) => hasValue(value))
      .join(" ")
      .trim() ||
    "Vehicle";
  const startYear = String(
    data.newPolicyStartDate || data.ewCommencementDate || "",
  )
    .trim()
    .slice(0, 4);
  const endSource = String(
    data.newOdExpiryDate || data.newTpExpiryDate || data.ewExpiryDate || "",
  )
    .trim()
    .slice(0, 4);
  const yearLabel =
    startYear && endSource
      ? `${startYear}-${endSource}`
      : startYear
        ? `${startYear}`
        : "";
  return [customerLabel, vehicleLabel, yearLabel].filter(Boolean).join(" · ");
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

// Colour palette for each segment
const SEGMENT_STYLES = [
  { dot: "#6366f1", bg: "rgba(99,102,241,0.08)", label: "#6366f1" }, // indigo – Customer
  { dot: "#0ea5e9", bg: "rgba(14,165,233,0.08)", label: "#0ea5e9" }, // sky – Policy
  { dot: "#10b981", bg: "rgba(16,185,129,0.08)", label: "#10b981" }, // emerald – Premium
  { dot: "#f59e0b", bg: "rgba(245,158,11,0.08)", label: "#f59e0b" }, // amber – Vehicle
  { dot: "#8b5cf6", bg: "rgba(139,92,246,0.08)", label: "#8b5cf6" }, // violet – Progress
];

const SummarySegment = ({
  icon,
  label,
  title,
  line1,
  line2,
  divider = true,
  rightSlot = null,
  colorIdx = 0,
}) => {
  const c = SEGMENT_STYLES[colorIdx] ?? SEGMENT_STYLES[0];
  return (
    <div
      className={`min-w-[160px] flex-1 px-4 py-2.5 ${divider ? "border-r border-slate-100" : ""}`}
      style={{ background: c.bg }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Coloured label row */}
          <p
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest"
            style={{ color: c.label }}
          >
            <Icon name={icon} size={9} />
            {label}
          </p>

          {/* Primary value */}
          <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">
            {title || "—"}
          </p>

          {/* Secondary lines */}
          <div className="mt-0.5 space-y-0.5">
            {line1 && (
              <p className="truncate text-[10px] text-slate-500">{line1}</p>
            )}
            {line2 && (
              <p className="truncate text-[10px] text-slate-400">{line2}</p>
            )}
          </div>
        </div>

        {rightSlot && <div className="mt-0.5 shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
};

const InsuranceStickyHeader = ({
  formData,
  activeStep,
  onStepClick,
  skipPreviousPolicyStep = false,
  skipQuotesStep = false,
  innerRef,
}) => {
  const data = formData || {};

  const vehicleLine = [data.vehicleMake, data.vehicleModel, data.vehicleVariant]
    .filter((v) => hasValue(v))
    .join(" ");

  const policyCoreLabel = useMemo(() => {
    return (
      getPolicyDisplayName(data) || data.newInsuranceCompany || "New Policy"
    );
  }, [data]);

  const visibleSteps = useMemo(() => {
    return Object.keys(STEP_NAMES)
      .map((s) => parseInt(s, 10))
      .filter(
        (s) =>
          !(skipPreviousPolicyStep && s === 3) && !(skipQuotesStep && s === 4),
      );
  }, [skipPreviousPolicyStep, skipQuotesStep]);

  const currentStepIndex = Math.max(visibleSteps.indexOf(activeStep), 0);

  return (
    <>
      {/* ── Sticky Summary Bar ── */}
      <div
        ref={innerRef}
        className="fixed left-0 right-0 z-[100] w-full"
        style={{
          top: 60,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div className="w-full">
          <div
            className="flex items-stretch overflow-x-auto px-0"
            style={{ scrollbarWidth: "none" }}
          >
            <SummarySegment
              icon="User"
              label="Customer"
              colorIdx={0}
              title={
                String(data.buyerType || "").toLowerCase() === "company"
                  ? data.companyName ||
                    data.contactPersonName ||
                    data.customerName ||
                    "New Case"
                  : data.customerName ||
                    data.contactPersonName ||
                    data.companyName ||
                    "New Case"
              }
              line1={
                [data.mobile, data.email].filter(Boolean).join(" · ") || "—"
              }
              line2={data.panNumber ? `PAN: ${data.panNumber}` : undefined}
            />
            <SummarySegment
              icon="Shield"
              label="Policy"
              colorIdx={1}
              title={policyCoreLabel}
              line1={
                [data.newPolicyType, data.newInsuranceDuration]
                  .filter(Boolean)
                  .join(" · ") || "—"
              }
              line2={data.newPolicyNumber || undefined}
            />
            <SummarySegment
              icon="IndianRupee"
              label="Premium"
              colorIdx={2}
              title={formatMoney(data.newTotalPremium)}
              line1={`IDV: ${formatMoney(data.newIdvAmount)} · NCB: ${data.newNcbDiscount || 0}%`}
              line2={
                data.subventionAmount
                  ? `Subvention: ${formatMoney(data.subventionAmount)}`
                  : undefined
              }
            />
            <SummarySegment
              icon="Car"
              label="Vehicle"
              colorIdx={3}
              divider={false}
              title={vehicleLine || "—"}
              line1={`Reg: ${data.registrationNumber || "Unregistered"}`}
              line2={
                data.manufactureYear
                  ? `Year: ${data.manufactureYear}`
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* ── Step Rail — floating above footer ── */}
      <div className="fixed bottom-[100px] left-1/2 z-[120] -translate-x-1/2 px-3 sm:bottom-[108px]">
        <div
          className="flex max-w-[calc(100vw-24px)] items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white px-2 py-1.5 sm:max-w-[calc(100vw-40px)] sm:px-2.5"
          style={{
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            scrollbarWidth: "none",
          }}
        >
          {visibleSteps.map((stepNum, idx) => {
            const isActive = activeStep === stepNum;
            const isDone = visibleSteps.indexOf(activeStep) > idx;
            return (
              <button
                key={stepNum}
                type="button"
                onClick={() => onStepClick?.(stepNum)}
                title={STEP_NAMES[stepNum]}
                className="inline-flex h-9 min-w-[96px] shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-[12px] font-semibold tracking-tight transition-all duration-150"
                style={
                  isActive
                    ? {
                        background: "#2563eb",
                        borderColor: "#2563eb",
                        color: "#fff",
                        boxShadow: "0 2px 8px rgba(37,99,235,0.28)",
                      }
                    : isDone
                      ? {
                          background: "#f0fdf4",
                          borderColor: "#bbf7d0",
                          color: "#15803d",
                        }
                      : {
                          background: "#ffffff",
                          borderColor: "#e2e8f0",
                          color: "#475569",
                        }
                }
              >
                <Icon name={STEP_ICONS[stepNum]} size={13} />
                <span className="whitespace-nowrap">
                  {STEP_SHORT_NAMES[stepNum]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default InsuranceStickyHeader;
