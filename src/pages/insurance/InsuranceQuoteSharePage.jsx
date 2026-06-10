import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const toINR = (val) =>
  Number(val)
    ? `₹${Number(val).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
    : "—";

const Field = ({ label, value }) =>
  value ? (
    <div className="flex justify-between gap-4 py-1 border-b border-slate-100 last:border-0 text-sm">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="font-semibold text-slate-800 text-right">{value}</span>
    </div>
  ) : null;

const QuoteCard = ({ quote, idx }) => {
  const isAccepted = quote.isAccepted;
  return (
    <div
      className={`rounded-2xl border-2 p-5 space-y-3 ${
        isAccepted
          ? "border-emerald-400 bg-emerald-50/60"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-slate-900">
            {quote.insuranceCompany || `Quote ${idx + 1}`}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {quote.coverageType && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700">
                {quote.coverageType}
              </span>
            )}
            {quote.policyDuration && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                {quote.policyDuration}
              </span>
            )}
            {isAccepted && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-200 text-emerald-800">
                ✓ Selected
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-slate-900 tabular-nums">
            {toINR(quote.totalPremium)}
          </p>
          <p className="text-[11px] text-slate-500">Total Premium (incl. GST)</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 space-y-0">
        {quote.idv > 0 && <Field label="IDV (Vehicle Value)" value={toINR(quote.idv)} />}
        {quote.ncbDiscount > 0 && <Field label="NCB Discount" value={`${quote.ncbDiscount}%`} />}
        {quote.odAmount > 0 && <Field label="Own Damage Premium" value={toINR(quote.odAmount)} />}
        {quote.tpAmount > 0 && <Field label="Third Party Premium" value={toINR(quote.tpAmount)} />}
        {quote.addOnsTotal > 0 && <Field label="Add-ons Total" value={toINR(quote.addOnsTotal)} />}
        {quote.gstAmount > 0 && <Field label="GST (18%)" value={toINR(quote.gstAmount)} />}
      </div>

      {Array.isArray(quote.addOns) && quote.addOns.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Included Add-ons
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quote.addOns.map((a, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full text-[11px] bg-violet-50 text-violet-700 border border-violet-200"
              >
                {a.name}
                {a.amount > 0 && ` (${toINR(a.amount)})`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const InsuranceQuoteSharePage = () => {
  const [params] = useSearchParams();

  const data = useMemo(() => {
    const raw = params.get("d");
    if (!raw) return null;
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }, [params]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <p className="text-2xl font-bold text-slate-700">Invalid or expired link</p>
          <p className="mt-2 text-slate-500">Please ask for a new quote link.</p>
        </div>
      </div>
    );
  }

  const { customer, vehicle, quotes = [] } = data;
  const vehicleLabel = [vehicle?.make, vehicle?.model, vehicle?.variant].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
          Autocredits India LLP
        </p>
        <p className="mt-1 text-xl font-black text-slate-900">Insurance Quotation</p>
        {customer?.name && (
          <p className="mt-0.5 text-sm text-slate-500">
            Prepared for <span className="font-semibold text-slate-700">{customer.name}</span>
          </p>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Customer + Vehicle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(customer?.name || customer?.mobile) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Customer Details
              </p>
              <Field label="Name" value={customer.name} />
              <Field label="Mobile" value={customer.mobile} />
            </div>
          )}

          {(vehicleLabel || vehicle?.registration) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Vehicle Details
              </p>
              <Field label="Registration" value={vehicle.registration} />
              <Field label="Vehicle" value={vehicleLabel} />
              <Field label="Fuel Type" value={vehicle.fuelType} />
              <Field label="Year" value={vehicle.year} />
              <Field label="Type" value={vehicle.type} />
            </div>
          )}
        </div>

        {/* Quotes */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            {quotes.length} Quote{quotes.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-4">
            {quotes.map((q, i) => (
              <QuoteCard key={i} quote={q} idx={i} />
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-6">
          This quotation is indicative. Final premium may vary based on insurer approval.
        </p>
      </div>
    </div>
  );
};

export default InsuranceQuoteSharePage;
