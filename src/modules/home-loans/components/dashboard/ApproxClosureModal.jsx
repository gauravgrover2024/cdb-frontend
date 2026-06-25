import React, { useMemo, useState } from "react";
import Icon from "../../../../components/AppIcon";
import { formatINR } from "../../../../utils/currency";
import {
  calculateLivePrincipalOutstanding,
  generateRepaymentSchedule,
} from "../../../../utils/emiCalculator";

const toNumber = (val) => Number(String(val ?? "").replace(/[^0-9.]/g, "")) || 0;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatCurrency = (value) => formatINR(toNumber(value));

const ApproxClosureModal = ({ open, onClose, data }) => {
  const [preClosurePct, setPreClosurePct] = useState("");

  const disbursedAmount = toNumber(data?.disbursedAmount);
  const interestRate = toNumber(data?.interestRate);
  const tenureMonths = toNumber(data?.tenureMonths);
  const firstEmiDate = data?.firstEmiDate || null;

  const outstandingDerived = useMemo(() => {
    if (!disbursedAmount || !interestRate || !tenureMonths) return null;
    return calculateLivePrincipalOutstanding(
      disbursedAmount,
      interestRate,
      tenureMonths,
      firstEmiDate,
    );
  }, [disbursedAmount, interestRate, tenureMonths, firstEmiDate]);

  const schedule = useMemo(() => {
    if (!disbursedAmount || !interestRate || !tenureMonths) return [];
    return generateRepaymentSchedule(
      disbursedAmount,
      interestRate,
      tenureMonths,
      firstEmiDate,
      "Reducing",
    );
  }, [disbursedAmount, interestRate, tenureMonths, firstEmiDate]);

  const outstandingPrincipal = Math.max(
    0,
    toNumber(data?.principalOutstanding) || toNumber(outstandingDerived?.outstanding),
  );
  const perDayInterest = outstandingPrincipal
    ? (outstandingPrincipal * interestRate) / 100 / 365
    : 0;
  const paidMonths = clamp(outstandingDerived?.monthsElapsed || 0, 0, schedule.length);
  const lastPaidRow = paidMonths > 0 ? schedule[paidMonths - 1] : null;
  const daysAfterLastPaidEmi = useMemo(() => {
    if (!lastPaidRow?.date) return 0;
    const today = new Date();
    const lastDate = new Date(lastPaidRow.date);
    const diffMs =
      today.setHours(0, 0, 0, 0) - lastDate.setHours(0, 0, 0, 0);
    if (Number.isNaN(diffMs) || diffMs <= 0) return 0;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [lastPaidRow?.date]);

  const basePct = Math.max(0, toNumber(preClosurePct));
  const pctWithGst = basePct * 1.18;
  const preClosureCharge = (outstandingPrincipal * pctWithGst) / 100;
  const daysInterest = perDayInterest * daysAfterLastPaidEmi;
  const totalClosure = outstandingPrincipal + preClosureCharge + daysInterest;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-indigo-200 bg-white shadow-2xl dark:border-indigo-900 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-indigo-100 px-4 py-3 dark:border-indigo-900/60">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Approx Closure Calculator</h4>
            <p className="text-xs text-muted-foreground">
              {data?.customerName || "Loan"} · {data?.loanId || "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-slate-100 hover:text-foreground dark:hover:bg-zinc-800"
          >
            <Icon name="X" size={14} />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Pre-Closure % (Base)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={preClosurePct}
              onChange={(e) => setPreClosurePct(e.target.value)}
              className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-indigo-400 dark:border-indigo-900 dark:bg-zinc-900 dark:focus:border-indigo-700"
              placeholder="Enter %"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              GST 18% applied: {basePct.toFixed(2)}% → {pctWithGst.toFixed(2)}%
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/65">
              <span className="text-xs text-muted-foreground">Outstanding Principal</span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(outstandingPrincipal)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/65">
              <span className="text-xs text-muted-foreground">
                Pre-Closure Charges ({pctWithGst.toFixed(2)}%)
              </span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(preClosureCharge)}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/65">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Interest for {daysAfterLastPaidEmi} days
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(daysInterest)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatCurrency(perDayInterest)} × {daysAfterLastPaidEmi}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-indigo-300 bg-indigo-100 px-3 py-2 dark:border-indigo-800 dark:bg-indigo-950/35">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                Approx Closure Amount
              </span>
              <span className="text-base font-bold text-indigo-800 dark:text-indigo-200">
                {formatCurrency(totalClosure)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
            <ul className="space-y-1 text-[11px] text-amber-700 dark:text-amber-300">
              <li>1. Pre-closure charge is applied on current outstanding principal.</li>
              <li>2. GST @18% is included in pre-closure charge %.</li>
              <li>3. Final settlement remains subject to lender confirmation.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApproxClosureModal;
