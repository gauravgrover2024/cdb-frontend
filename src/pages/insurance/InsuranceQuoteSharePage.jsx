import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { formatPolicyDuration } from "../../utils/insurancePolicyDisplay";

const toINR = (val) =>
  `₹${Number(val || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const CheckIcon = (props) => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
    <path
      fillRule="evenodd"
      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.79 6.8-6.8a1 1 0 0 1 1.4 0Z"
      clipRule="evenodd"
    />
  </svg>
);

const Field = ({ label, value }) =>
  value ? (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-[13px] text-slate-500 shrink-0">{label}</dt>
      <dd className="text-[13px] font-semibold text-slate-800 text-right break-words">
        {value}
      </dd>
    </div>
  ) : null;

const BreakupRow = ({ label, value, bold = false, indent = false }) => (
  <div
    className={`flex items-center justify-between py-1 ${
      bold ? "mt-0.5 border-t border-slate-100 pt-1.5" : ""
    } ${indent ? "pl-3" : ""}`}
  >
    <span
      className={`text-[12px] ${
        bold ? "font-bold text-slate-800" : "text-slate-500"
      }`}
    >
      {label}
    </span>
    <span
      className={`tabular-nums text-[12px] ${
        bold ? "font-black text-slate-900" : "font-semibold text-slate-500"
      }`}
    >
      {value}
    </span>
  </div>
);

const QuoteCard = ({ quote, idx, isNewCar }) => {
  const isAccepted = quote.isAccepted;
  const duration = formatPolicyDuration(quote.policyDuration);
  const addOns = Array.isArray(quote.addOns) ? quote.addOns : [];
  const showOwnDamage = quote.coverageType !== "Third Party";
  const showThirdParty = quote.coverageType !== "Stand Alone OD";
  const initial = String(quote.insuranceCompany || "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article
      className={`quote-card relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ${
        isAccepted ? "ring-2 ring-emerald-400" : "ring-slate-200"
      }`}
    >
      {isAccepted && (
        <div className="absolute -top-2.5 left-4 z-10 flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 shadow-sm ring-1 ring-emerald-300">
          <CheckIcon className="h-3 w-3" /> Accepted
        </div>
      )}

      <div className="px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ring-1 ${
                isAccepted
                  ? "bg-[#9FC0FF]/70 text-slate-800 ring-[#9FC0FF]"
                  : "bg-[#DAF3FF]/75 text-slate-700 ring-[#DAF3FF]"
              }`}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <h3 className="m-0 text-sm font-bold leading-tight text-slate-800">
                {quote.insuranceCompany || `Quote ${idx + 1}`}
              </h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {quote.coverageType && (
                  <span className="text-[11px] text-slate-500">
                    {quote.coverageType}
                  </span>
                )}
                {quote.coverageType && duration && (
                  <span className="text-[10px] text-slate-300">·</span>
                )}
                {duration && (
                  <span className="text-[11px] text-slate-500">{duration}</span>
                )}
              </div>
            </div>
          </div>
          {showOwnDamage && (
            <div className="shrink-0 text-right">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                IDV
              </p>
              <p className="m-0 text-sm font-black tabular-nums text-slate-800">
                {toINR(quote.idv)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-4 border-t border-slate-100" />

      <div className="px-4 pb-2 pt-3">
        <p className="m-0 mb-1.5 text-sm font-black text-slate-800">
          Premium Breakup
        </p>

        {showOwnDamage && (
          <>
            <BreakupRow label="Own Damage" value={toINR(quote.odAmount)} bold />
            <BreakupRow
              label="Own Damage (Base)"
              value={toINR(quote.odAmount)}
              indent
            />
            {!isNewCar && (
              <BreakupRow
                label="NCB %"
                value={`${Number(quote.ncbDiscount || 0)}%`}
                indent
              />
            )}
          </>
        )}

        {showThirdParty && (
          <>
            <BreakupRow label="Third Party" value={toINR(quote.tpAmount)} bold />
            <BreakupRow
              label="Basic Third Party"
              value={toINR(quote.tpAmount)}
              indent
            />
          </>
        )}

        {showOwnDamage && (addOns.length > 0 || Number(quote.addOnsTotal) > 0) && (
          <>
            <BreakupRow label="Add Ons" value={toINR(quote.addOnsTotal)} bold />
            {addOns.map((addOn, addOnIndex) => (
              <BreakupRow
                key={`${addOn.name || "add-on"}-${addOnIndex}`}
                label={addOn.name || "Add-on"}
                value={Number(addOn.amount) > 0 ? toINR(addOn.amount) : "included"}
                indent
              />
            ))}
          </>
        )}
      </div>

      <div className="mx-4 border-t border-dashed border-slate-200" />

      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-slate-800">Total Amount</span>
          <span className="text-lg font-black tabular-nums text-slate-900">
            {toINR(quote.totalPremium)}
          </span>
        </div>
        <p className="m-0 mt-0.5 text-right text-[10px] text-slate-400">
          Prices are inclusive of GST
        </p>
      </div>
    </article>
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
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <img src="/acillp-logo-without-car.svg" alt="Autocredits India LLP" className="mx-auto h-7 w-auto" />
          <p className="mt-6 text-lg font-bold text-slate-800">Invalid or expired link</p>
          <p className="mt-2 text-sm text-slate-500">
            Please ask your Autocredits representative for a fresh quotation link.
          </p>
        </div>
      </div>
    );
  }

  const { customer, vehicle, quotes = [] } = data;
  const vehicleLabel = [vehicle?.make, vehicle?.model, vehicle?.variant].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .quote-card { break-inside: avoid; box-shadow: none !important; }
        }
      `}</style>

      {/* Brand header */}
      <header className="bg-slate-900 px-4 pb-16 pt-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <img src="/acillp-logo-dark.svg" alt="Autocredits India LLP" className="h-7 w-auto" />
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/10"
          >
            Download PDF
          </button>
        </div>

        <div className="mx-auto mt-6 max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300">
            Insurance Quotation
          </p>
          <h1 className="mt-1.5 text-2xl font-black leading-tight text-white">
            {vehicleLabel || "Motor Insurance"}
          </h1>
          {customer?.name && (
            <p className="mt-1 text-sm text-slate-400">
              Prepared for <span className="font-semibold text-slate-200">{customer.name}</span>
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-3xl space-y-5 px-4">
        {/* Customer + Vehicle */}
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          {(customer?.name ||
            customer?.mobile ||
            customer?.email ||
            customer?.address ||
            customer?.city ||
            customer?.pincode) && (
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Customer Details
              </h2>
              <dl>
                <Field label="Name" value={customer.name} />
                <Field label="Mobile" value={customer.mobile} />
                <Field label="Email" value={customer.email} />
                <Field label="Address" value={customer.address} />
                <Field label="City" value={customer.city} />
                <Field label="Pincode" value={customer.pincode} />
              </dl>
            </section>
          )}

          {(vehicleLabel || vehicle?.registration) && (
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Vehicle Details
              </h2>
              <dl>
                <Field label="Registration" value={vehicle.registration} />
                <Field label="Vehicle" value={vehicleLabel} />
                <Field label="Fuel Type" value={vehicle.fuelType} />
                <Field label="Year" value={vehicle.year} />
                <Field label="Type" value={vehicle.type} />
              </dl>
            </section>
          )}
        </div>

        {/* Quotes */}
        <section>
          <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {quotes.length} Quote{quotes.length !== 1 ? "s" : ""}
          </h2>
          <div className="space-y-4">
            {quotes.map((q, i) => (
              <QuoteCard
                key={i}
                quote={q}
                idx={i}
                isNewCar={String(vehicle?.type || "").trim() === "New Car"}
              />
            ))}
            {quotes.length === 0 && (
              <div className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                No quotes available in this link.
              </div>
            )}
          </div>
        </section>

        <p className="px-4 pt-1 text-center text-[11px] leading-relaxed text-slate-400">
          This quotation is indicative. Final premium may vary based on insurer approval.
          <br />
          Autocredits India LLP
        </p>
      </main>
    </div>
  );
};

export default InsuranceQuoteSharePage;
