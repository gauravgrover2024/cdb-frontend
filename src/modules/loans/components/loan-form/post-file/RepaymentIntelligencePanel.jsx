import React, { useEffect, useMemo, useRef, useState } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";
import {
  calculateLivePrincipalOutstanding,
  formatCurrency,
  formatDate,
  generateRepaymentSchedule,
} from "../../../../../utils/emiCalculator";

const toNumber = (val) => Number(String(val ?? "").replace(/[^0-9.]/g, "")) || 0;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

const RepaymentIntelligencePanel = ({ form }) => {
  const [showClosureCalc, setShowClosureCalc] = useState(false);
  const [preClosurePct, setPreClosurePct] = useState("");
  const monthlyContainerRef = useRef(null);
  const currentMonthlyRowRef = useRef(null);
  const lastSyncedEmiRef = useRef(null);
  const lastCenteredIndexRef = useRef(null);

  const approvedAmount = Form.useWatch("postfile_loanAmountApproved", form) || 0;
  const disbursedAmountRaw = Form.useWatch("postfile_loanAmountDisbursed", form);
  const interestRateRaw = Form.useWatch("postfile_roi", form);
  const tenureMonthsRaw = Form.useWatch("postfile_tenureMonths", form);
  const firstEmiDate = Form.useWatch("postfile_firstEmiDate", form);
  const roiType = Form.useWatch("postfile_roiType", form);

  const disbursedAmount = toNumber(disbursedAmountRaw) || toNumber(approvedAmount);
  const interestRate = toNumber(interestRateRaw);
  const tenureMonths = toNumber(tenureMonthsRaw);

  const schedule = useMemo(() => {
    if (!disbursedAmount || !interestRate || !tenureMonths) return [];
    return generateRepaymentSchedule(
      disbursedAmount,
      interestRate,
      tenureMonths,
      firstEmiDate,
      roiType || "Reducing",
    );
  }, [disbursedAmount, interestRate, tenureMonths, firstEmiDate, roiType]);

  const outstanding = useMemo(() => {
    if (!disbursedAmount || !interestRate || !tenureMonths) return null;
    return calculateLivePrincipalOutstanding(
      disbursedAmount,
      interestRate,
      tenureMonths,
      firstEmiDate,
    );
  }, [disbursedAmount, interestRate, tenureMonths, firstEmiDate]);

  const remainingMetrics = useMemo(() => {
    if (!schedule.length || !outstanding) {
      return {
        remainingEmiCount: 0,
        remainingInterestPayable: 0,
        remainingTotalPayable: 0,
      };
    }

    const paidCount = Math.min(outstanding.monthsElapsed || 0, schedule.length);
    const remaining = schedule.slice(paidCount);
    const remainingInterestPayable = remaining.reduce(
      (sum, row) => sum + Number(row.interestPayment || 0),
      0,
    );
    const remainingTotalPayable = remaining.reduce(
      (sum, row) => sum + Number(row.emi || 0),
      0,
    );

    return {
      remainingEmiCount: remaining.length,
      remainingInterestPayable,
      remainingTotalPayable,
    };
  }, [schedule, outstanding]);

  const perDayInterest = useMemo(() => {
    const principalOutstanding = Number(outstanding?.outstanding || 0);
    const annualRate = Number(interestRate || 0);
    if (!principalOutstanding || !annualRate) return 0;
    return (principalOutstanding * annualRate) / 100 / 365;
  }, [outstanding?.outstanding, interestRate]);

  const currentScheduleIndex = useMemo(() => {
    if (!schedule.length) return -1;
    const paidCount = clamp(outstanding?.monthsElapsed || 0, 0, schedule.length);
    if (paidCount === 0) return -1;
    return paidCount - 1;
  }, [outstanding?.monthsElapsed, schedule.length]);

  const lastPaidMonthNumber = clamp(outstanding?.monthsElapsed || 0, 0, schedule.length);
  const lastPaidRow = lastPaidMonthNumber > 0 ? schedule[lastPaidMonthNumber - 1] : null;

  const daysAfterLastPaidEmi = useMemo(() => {
    if (!lastPaidRow?.date) return 0;
    const today = new Date();
    const lastDate = new Date(lastPaidRow.date);
    const diffMs = today.setHours(0, 0, 0, 0) - lastDate.setHours(0, 0, 0, 0);
    if (Number.isNaN(diffMs) || diffMs <= 0) return 0;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [lastPaidRow?.date]);

  const closureBreakup = useMemo(() => {
    const outstandingPrincipal = Number(outstanding?.outstanding || 0);
    const inputPct = Math.max(0, Number(preClosurePct || 0));
    const pctWithGst = inputPct * 1.18;
    const preClosureCharge = (outstandingPrincipal * pctWithGst) / 100;
    const daysInterest = perDayInterest * daysAfterLastPaidEmi;
    const totalClosure = outstandingPrincipal + preClosureCharge + daysInterest;
    return {
      outstandingPrincipal,
      inputPct,
      pctWithGst,
      preClosureCharge,
      daysAfterLastPaidEmi,
      perDayInterest,
      daysInterest,
      totalClosure,
    };
  }, [outstanding?.outstanding, preClosurePct, perDayInterest, daysAfterLastPaidEmi]);

  useEffect(() => {
    if (!outstanding?.emi) return;
    if (lastSyncedEmiRef.current === outstanding.emi) return;
    lastSyncedEmiRef.current = outstanding.emi;
    form?.setFieldsValue?.({ postfile_emiAmount: outstanding.emi });
  }, [form, outstanding?.emi]);

  useEffect(() => {
    if (currentScheduleIndex < 0) return;
    if (lastCenteredIndexRef.current === currentScheduleIndex) return;
    lastCenteredIndexRef.current = currentScheduleIndex;
    const container = monthlyContainerRef.current;
    const row = currentMonthlyRowRef.current;
    if (!container || !row) return;
    const target = row.offsetTop - container.clientHeight / 2 + row.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, target), behavior: "auto" });
  }, [schedule.length, currentScheduleIndex]);

  if (!disbursedAmount || !tenureMonths) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/80 p-8 text-center">
        <Icon name="BarChart3" size={28} className="mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Add disbursed amount, tenure and interest rate to activate repayment intelligence.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100/70 shadow-[0_20px_55px_-36px_rgba(15,23,42,0.35)] dark:from-zinc-950 dark:via-zinc-950 dark:to-slate-950">
      <div className="section-header border-b border-slate-200/80 bg-white/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/65 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-100/70 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-900/30 dark:text-emerald-200">
              <Icon name="Activity" size={12} />
              Live Repayment Intelligence
            </div>
            <h3 className="mt-1 text-base font-semibold text-foreground md:text-lg">
              Principal Outstanding & Repayment Schedule
            </h3>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-100/70 px-3 py-1 text-xs font-medium text-slate-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200">
            Monthly View
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-12 xl:gap-5 xl:p-5">
        <div className="space-y-3 xl:col-span-4">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/75 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <p className="text-xs text-muted-foreground">Current Outstanding</p>
            <p className="mt-1 text-3xl font-semibold leading-tight text-foreground">
              {formatCurrency(outstanding?.outstanding || 0)}
            </p>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-100/70 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-900/35 dark:text-emerald-200">
              <Icon name="CalendarClock" size={11} />
              Per Day Interest: {formatCurrency(perDayInterest)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name="Clock" size={12} />
              {outstanding?.monthsElapsed || 0} paid / {tenureMonths} total EMIs
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/55">
            <p className="text-xs text-muted-foreground">Loan Parameters (Read Only)</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-900/65">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rate</p>
                <p className="mt-0.5 font-semibold text-foreground">{formatPercent(interestRateRaw)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-900/65">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ROI Type</p>
                <p className="mt-0.5 font-semibold text-foreground">{roiType || "Reducing"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-900/65">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Disbursed</p>
                <p className="mt-0.5 font-semibold text-foreground">{formatCurrency(disbursedAmount)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-900/65">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current EMI</p>
                <p className="mt-0.5 font-semibold text-foreground">{formatCurrency(outstanding?.emi || 0)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/55">
              <p className="text-xs text-muted-foreground">Remaining EMIs</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {remainingMetrics.remainingEmiCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/55">
              <p className="text-xs text-muted-foreground">Interest Payable (Remaining EMIs)</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatCurrency(remainingMetrics.remainingInterestPayable)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/55">
              <p className="text-xs text-muted-foreground">Total Remaining Outflow</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatCurrency(remainingMetrics.remainingTotalPayable)}
              </p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-8">
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/55">
            <div ref={monthlyContainerRef} className="max-h-[520px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-100/95 dark:bg-zinc-900/95">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-foreground">M</th>
                    <th className="px-3 py-2 text-left font-semibold text-foreground">Date</th>
                    <th className="px-3 py-2 text-right font-semibold text-foreground">EMI</th>
                    <th className="px-3 py-2 text-right font-semibold text-foreground">Principal</th>
                    <th className="px-3 py-2 text-right font-semibold text-foreground">Interest</th>
                    <th className="px-3 py-2 text-right font-semibold text-foreground">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row, idx) => {
                    const isCurrent = idx === currentScheduleIndex;
                    return (
                    <tr
                      key={row.month}
                      ref={isCurrent ? currentMonthlyRowRef : null}
                      className={`border-t border-border/60 ${isCurrent ? "bg-emerald-50/90 dark:bg-emerald-950/35" : ""}`}
                    >
                      <td className="px-3 py-2 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {isCurrent && (
                            <span className="relative inline-flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-emerald-400 opacity-70" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            </span>
                          )}
                          {row.month}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(row.date)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${isCurrent ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
                        {formatCurrency(row.emi)}
                      </td>
                      <td className="px-3 py-2 text-right text-success">{formatCurrency(row.principalPayment)}</td>
                      <td className={`px-3 py-2 text-right ${isCurrent ? "font-semibold text-emerald-700 dark:text-emerald-300" : "text-slate-700 dark:text-slate-300"}`}>
                        {formatCurrency(row.interestPayment)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-primary">{formatCurrency(row.outstandingBalance)}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-xs text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900/55">
            <span>
              {tenureMonths} months • {Math.floor(tenureMonths / 12)} years {tenureMonths % 12} months
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-100/70 px-2.5 py-1 font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Last Paid EMI: {lastPaidMonthNumber > 0 ? `Month ${lastPaidMonthNumber}` : "Not Paid Yet"}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowClosureCalc((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-gradient-to-b from-indigo-100 to-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 shadow-sm transition hover:from-indigo-200 hover:to-indigo-100 dark:border-indigo-800 dark:from-indigo-950/60 dark:to-indigo-900/40 dark:text-indigo-200 dark:hover:from-indigo-900/70 dark:hover:to-indigo-800/50"
              >
                <Icon name="Calculator" size={14} />
                Approx Closure
              </button>
              <Button
                variant="outline"
                size="small"
                className="rounded-lg border border-slate-300 bg-gradient-to-b from-white to-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:from-slate-100 hover:to-slate-200 dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-100 dark:hover:from-zinc-700 dark:hover:to-zinc-800"
              >
                <Icon name="Download" size={14} className="text-slate-600 dark:text-slate-300" />
                Export
              </Button>
              <Button
                variant="outline"
                size="small"
                onClick={() => window.print()}
                className="rounded-lg border border-emerald-300 bg-gradient-to-b from-emerald-100 to-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm transition hover:from-emerald-200 hover:to-emerald-100 dark:border-emerald-800 dark:from-emerald-950/60 dark:to-emerald-900/40 dark:text-emerald-200 dark:hover:from-emerald-900/70 dark:hover:to-emerald-800/50"
              >
                <Icon name="Printer" size={14} className="text-emerald-700 dark:text-emerald-300" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showClosureCalc && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-lg rounded-2xl border border-indigo-200 bg-white shadow-2xl dark:border-indigo-900 dark:bg-zinc-900">
            <div className="flex items-start justify-between border-b border-indigo-100 px-4 py-3 dark:border-indigo-900/60">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Approx Closure Calculator</h4>
                <p className="text-xs text-muted-foreground">Read-only breakup from current outstanding.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowClosureCalc(false)}
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
                  GST 18% applied: {closureBreakup.inputPct.toFixed(2)}% →{" "}
                  {closureBreakup.pctWithGst.toFixed(2)}%
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/45 p-3 text-xs dark:border-indigo-900/50 dark:bg-indigo-950/20">
                <p className="text-muted-foreground">Last paid EMI date: {lastPaidRow?.date ? formatDate(lastPaidRow.date) : "-"}</p>
                <p className="text-muted-foreground">Days after last EMI: {closureBreakup.daysAfterLastPaidEmi}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/65">
                  <span className="text-xs text-muted-foreground">Outstanding Principal</span>
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(closureBreakup.outstandingPrincipal)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/65">
                  <span className="text-xs text-muted-foreground">
                    Pre-Closure Charges ({closureBreakup.pctWithGst.toFixed(2)}%)
                  </span>
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(closureBreakup.preClosureCharge)}</span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/65">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Interest for {closureBreakup.daysAfterLastPaidEmi} days</span>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(closureBreakup.daysInterest)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatCurrency(closureBreakup.perDayInterest)} x {closureBreakup.daysAfterLastPaidEmi}
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-indigo-300 bg-indigo-100 px-3 py-2 dark:border-indigo-800 dark:bg-indigo-950/35">
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Approx Closure Amount</span>
                  <span className="text-base font-bold text-indigo-800 dark:text-indigo-200">{formatCurrency(closureBreakup.totalClosure)}</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Assumptions & Conditions</p>
                <ul className="mt-1 space-y-1 text-[11px] text-amber-700 dark:text-amber-300">
                  <li>1. All EMIs up to the last paid EMI are assumed paid on time.</li>
                  <li>2. No overdue penalty, bounce charge, legal charge, or recovery cost is included.</li>
                  <li>3. Interest after last paid EMI is estimated as simple per-day interest on current outstanding.</li>
                  <li>4. Pre-closure charge is applied only on current outstanding principal.</li>
                  <li>5. GST @18% is included in pre-closure charges.</li>
                  <li>6. Final settlement amount is subject to lender system calculation on closure date.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepaymentIntelligencePanel;
