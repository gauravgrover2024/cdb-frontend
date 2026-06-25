import React from "react";
import { Input } from "antd";
import Button from "../../../components/ui/Button";

const Label = ({ children }) => (
  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
    {children}
  </div>
);

const ScenarioBPanel = ({
  isFloating,
  showScenarioB,
  disableAll,
  cloneToScenarioB,
  onRemoveScenarioB,
  onAddScenarioB,
  resultA,
  resultB,
  breakupA,
  emiDiff,
  interestDiff,
  loanDiff,
  solveOptions,
  solveForB,
  setSolveForB,
  emiTypeB,
  setEmiTypeB,
  tenureTypeB,
  setTenureTypeB,
  loanAmountB,
  setLoanAmountB,
  emiBInput,
  setEmiBInput,
  interestB,
  setInterestB,
  tenureB,
  setTenureB,
  setComparisonTouched,
  displayForField,
  parseNumber,
  formatNumber,
  formatINR,
  AnimatedNumber,
}) => {
  if (isFloating) return null;

  return showScenarioB ? (
    <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-sm border border-slate-100 dark:border-[#262626] overflow-hidden transition-all hover:shadow-md">
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-[#262626] bg-gradient-to-r from-violet-50/70 via-transparent to-transparent dark:from-violet-950/20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[11px] font-black flex items-center justify-center select-none">
              A
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium px-0.5">
              vs
            </span>
            <span className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[11px] font-black flex items-center justify-center select-none">
              B
            </span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Scenario B — comparison EMI
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Tweak rate, tenure or amount · savings update live
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!disableAll) cloneToScenarioB();
            }}
            disabled={disableAll}
            className="text-[11px]"
          >
            Copy A -> B
          </Button>
          <button
            type="button"
            title="Remove Scenario B"
            onClick={onRemoveScenarioB}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {resultA.emi > 0 && resultB.emi > 0 && (
        <div
          className={`px-5 py-3 flex items-center gap-3 border-b border-slate-100 dark:border-[#262626] ${
            emiDiff < 0
              ? "bg-emerald-50/70 dark:bg-emerald-950/20"
              : emiDiff > 0
                ? "bg-rose-50/70 dark:bg-rose-950/20"
                : "bg-slate-50/60 dark:bg-[#262626]/40"
          }`}
        >
          <span className="text-2xl leading-none select-none" aria-hidden="true">
            {emiDiff < 0 ? "🎉" : emiDiff > 0 ? "⚠️" : "⚖️"}
          </span>
          <div className="flex-1 min-w-0">
            {emiDiff === 0 ? (
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Same EMI as Scenario A
              </p>
            ) : emiDiff < 0 ? (
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Save <span className="text-[15px]">{formatINR(Math.abs(emiDiff))}/month</span>{" "}
                with Scenario B
              </p>
            ) : (
              <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                Scenario B costs{" "}
                <span className="text-[15px]">{formatINR(Math.abs(emiDiff))}/month</span>{" "}
                more
              </p>
            )}
            {interestDiff !== 0 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {interestDiff < 0
                  ? `Save ${formatINR(Math.abs(interestDiff))} total interest`
                  : `Pay ${formatINR(Math.abs(interestDiff))} more in total interest`}
                {` · ${resultB.months} months`}
              </p>
            )}
          </div>
          {emiDiff !== 0 && (
            <span
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold ${
                emiDiff < 0 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
              }`}
            >
              {emiDiff < 0 ? "✓ B is better" : "A is better"}
            </span>
          )}
        </div>
      )}

      <div className="p-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr),minmax(0,1fr)] gap-5">
        <div className="space-y-4">
          <div className="rounded-2xl border border-violet-100 dark:border-violet-900/30 bg-violet-50/40 dark:bg-[#1e1726]/60 px-4 py-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-full bg-white dark:bg-[#262626] border border-slate-200 dark:border-[#383838] p-0.5 text-[11px]">
                {[
                  { key: "arrear", label: "Arrear" },
                  { key: "advance", label: "Advance" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (disableAll) return;
                      setComparisonTouched(true);
                      setEmiTypeB(opt.key);
                    }}
                    disabled={disableAll}
                    className={`px-3 py-1 rounded-full font-semibold transition-all ${
                      emiTypeB === opt.key
                        ? "bg-violet-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#333]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium">Solve:</span>
                <div className="inline-flex rounded-full bg-white dark:bg-[#262626] border border-slate-200 dark:border-[#383838] p-0.5 text-[11px]">
                  {solveOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        if (disableAll) return;
                        setComparisonTouched(true);
                        setSolveForB(opt.key);
                      }}
                      disabled={disableAll}
                      className={`px-3 py-1 rounded-full font-semibold transition-all ${
                        solveForB === opt.key
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#333]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Loan amount</Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={
                      solveForB === "amount"
                        ? formatNumber(
                            displayForField(solveForB, "amount", resultB, tenureTypeB),
                          ) || ""
                        : formatNumber(loanAmountB)
                    }
                    onChange={(e) => {
                      if (disableAll) return;
                      setComparisonTouched(true);
                      if (solveForB === "amount") return;
                      setLoanAmountB(parseNumber(e.target.value));
                    }}
                    readOnly={solveForB === "amount" || disableAll}
                    className={
                      solveForB === "amount"
                        ? "pr-10 border-violet-400 focus:ring-violet-300"
                        : ""
                    }
                  />
                  {solveForB === "amount" && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-violet-600 dark:text-violet-400 animate-pulse font-bold">
                      Live
                    </span>
                  )}
                </div>
                {loanDiff !== 0 && resultA.principal > 0 && resultB.principal > 0 && (
                  <p
                    className={`text-[10px] font-semibold ${
                      loanDiff > 0 ? "text-rose-500" : "text-emerald-600"
                    }`}
                  >
                    {loanDiff > 0
                      ? `▲ ${formatINR(Math.abs(loanDiff))} vs A`
                      : `▼ ${formatINR(Math.abs(loanDiff))} vs A`}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>EMI</Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={
                      solveForB === "emi"
                        ? formatNumber(
                            displayForField(solveForB, "emi", resultB, tenureTypeB),
                          ) || ""
                        : formatNumber(emiBInput)
                    }
                    onChange={(e) => {
                      if (disableAll) return;
                      setComparisonTouched(true);
                      if (solveForB === "emi") return;
                      setEmiBInput(parseNumber(e.target.value));
                    }}
                    readOnly={solveForB === "emi" || disableAll}
                    className={
                      solveForB === "emi"
                        ? "pr-10 border-violet-400 focus:ring-violet-300"
                        : ""
                    }
                  />
                  {solveForB === "emi" && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-violet-600 dark:text-violet-400 animate-pulse font-bold">
                      Live
                    </span>
                  )}
                </div>
                {emiDiff !== 0 && resultA.emi > 0 && resultB.emi > 0 && (
                  <p
                    className={`text-[10px] font-semibold ${
                      emiDiff < 0 ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {emiDiff < 0
                      ? `▼ ${formatINR(Math.abs(emiDiff))}/mo vs A`
                      : `▲ ${formatINR(Math.abs(emiDiff))}/mo vs A`}
                  </p>
                )}
              </div>

              <div className="space-y-1 col-span-2">
                <Label>Interest rate (annual %)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={
                      solveForB === "rate"
                        ? displayForField(solveForB, "rate", resultB, tenureTypeB) || ""
                        : interestB
                    }
                    onChange={(e) => {
                      if (disableAll) return;
                      setComparisonTouched(true);
                      if (solveForB === "rate") return;
                      setInterestB(Number(e.target.value) || 0);
                    }}
                    readOnly={solveForB === "rate" || disableAll}
                    className={solveForB === "rate" ? "pr-10 border-violet-400" : ""}
                  />
                  {solveForB === "rate" && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-violet-600 dark:text-violet-400 animate-pulse font-bold">
                      Live
                    </span>
                  )}
                </div>
                <div className="pt-1 space-y-1">
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step="0.1"
                    value={interestB}
                    onChange={(e) => {
                      if (disableAll) return;
                      setComparisonTouched(true);
                      setInterestB(Number(e.target.value) || 0);
                    }}
                    className="w-full accent-violet-600"
                    disabled={disableAll}
                  />
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>5%</span>
                    <span className="font-bold text-violet-600 dark:text-violet-400">
                      {Number(interestB).toFixed(2)}% p.a.
                    </span>
                    <span>20%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 col-span-2">
                <Label>Tenure</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      value={
                        solveForB === "tenure"
                          ? displayForField(solveForB, "tenure", resultB, tenureTypeB) || ""
                          : tenureB
                      }
                      onChange={(e) => {
                        if (disableAll) return;
                        setComparisonTouched(true);
                        if (solveForB === "tenure") return;
                        setTenureB(Number(e.target.value) || 0);
                      }}
                      readOnly={solveForB === "tenure" || disableAll}
                      className={solveForB === "tenure" ? "pr-10 border-violet-400" : ""}
                    />
                    {solveForB === "tenure" && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-violet-600 dark:text-violet-400 animate-pulse font-bold">
                        Live
                      </span>
                    )}
                  </div>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-[#383838]">
                    {["years", "months"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`px-3 py-1.5 text-[11px] font-semibold capitalize transition-colors ${
                          tenureTypeB === t
                            ? "bg-violet-600 text-white"
                            : "bg-transparent text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-[#383838] first:border-l-0 hover:bg-slate-50 dark:hover:bg-[#2a2a2a]"
                        }`}
                        onClick={() => {
                          if (disableAll) return;
                          setComparisonTouched(true);
                          setTenureTypeB(t);
                        }}
                        disabled={disableAll}
                      >
                        {t === "years" ? "Yrs" : "Mos"}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  = {resultB.months || 0} months
                  {resultB.months !== resultA.months && resultA.months > 0 && (
                    <span
                      className={`ml-2 font-semibold ${
                        resultB.months < resultA.months ? "text-emerald-600" : "text-rose-500"
                      }`}
                    >
                      (
                      {resultB.months < resultA.months
                        ? `-${resultA.months - resultB.months}`
                        : `+${resultB.months - resultA.months}`}{" "}
                      vs A)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-px bg-violet-100/60 dark:bg-[#2a2035] rounded-2xl overflow-hidden border border-violet-100 dark:border-violet-900/30">
            <div className="bg-white dark:bg-[#1f1f1f] px-3 py-3.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                Loan EMI
              </div>
              <div className="text-xl font-extrabold text-violet-600 dark:text-violet-400 leading-none">
                <AnimatedNumber value={resultB.emi} />
              </div>
              {emiDiff !== 0 && resultA.emi > 0 && (
                <div
                  className={`text-[10px] mt-1.5 font-bold ${
                    emiDiff < 0 ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {emiDiff < 0
                    ? `▼ ${formatINR(Math.abs(emiDiff))}`
                    : `▲ ${formatINR(Math.abs(emiDiff))}`}
                </div>
              )}
              <div className="text-[9px] text-slate-400 mt-0.5">/month</div>
            </div>

            <div className="bg-white dark:bg-[#1f1f1f] px-3 py-3.5 text-center border-x border-violet-100/60 dark:border-[#2a2035]">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                Total Interest
              </div>
              <div className="text-xl font-extrabold text-orange-500 dark:text-orange-400 leading-none">
                {formatINR(resultB.interest)}
              </div>
              {interestDiff !== 0 && breakupA.interestValue > 0 && (
                <div
                  className={`text-[10px] mt-1.5 font-bold ${
                    interestDiff < 0 ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {interestDiff < 0
                    ? `▼ ${formatINR(Math.abs(interestDiff))}`
                    : `▲ ${formatINR(Math.abs(interestDiff))}`}
                </div>
              )}
              <div className="text-[9px] text-slate-400 mt-0.5">payable</div>
            </div>

            <div className="bg-white dark:bg-[#1f1f1f] px-3 py-3.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                Total Payment
              </div>
              <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100 leading-none">
                {formatINR(resultB.total)}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">{resultB.months}mo</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-[#2a2a2a] overflow-hidden">
            <div className="grid grid-cols-[1fr,72px,72px] px-4 py-2 bg-slate-50 dark:bg-[#262626] border-b border-slate-100 dark:border-[#2a2a2a]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Metric
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 text-center">
                A
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 text-center">
                B
              </span>
            </div>

            {[
              {
                label: "Monthly EMI",
                a: resultA.emi,
                b: resultB.emi,
                format: formatINR,
                lowerBetter: true,
              },
              {
                label: "Total Interest",
                a: breakupA.interestValue,
                b: resultB.interest,
                format: formatINR,
                lowerBetter: true,
              },
              {
                label: "Total Payment",
                a: breakupA.totalValue,
                b: resultB.total,
                format: formatINR,
                lowerBetter: true,
              },
              {
                label: "Loan Amount",
                a: resultA.principal,
                b: resultB.principal,
                format: formatINR,
                lowerBetter: null,
              },
              {
                label: "Tenure",
                a: resultA.months,
                b: resultB.months,
                format: (v) => `${v}mo`,
                lowerBetter: true,
              },
            ].map(({ label, a, b, format, lowerBetter }) => {
              const safeA = a || 0;
              const safeB = b || 0;
              const maxVal = Math.max(safeA, safeB);
              const aBar = maxVal > 0 ? Math.round((safeA / maxVal) * 100) : 0;
              const bBar = maxVal > 0 ? Math.round((safeB / maxVal) * 100) : 0;
              const diff = safeB - safeA;
              const aWins =
                lowerBetter !== null
                  ? lowerBetter
                    ? safeA <= safeB
                    : safeA >= safeB
                  : false;
              const bWins =
                lowerBetter !== null
                  ? lowerBetter
                    ? safeB <= safeA
                    : safeB >= safeA
                  : false;
              const hasBothValues = safeA > 0 && safeB > 0;

              return (
                <div
                  key={label}
                  className="grid grid-cols-[1fr,72px,72px] items-center px-4 py-2.5 border-b border-slate-100 dark:border-[#262626] last:border-b-0 bg-white dark:bg-[#1f1f1f] gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        {label}
                      </span>
                      {diff !== 0 && hasBothValues && lowerBetter !== null && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            (lowerBetter && diff < 0) || (!lowerBetter && diff > 0)
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                          }`}
                        >
                          {diff < 0 ? "▼" : "▲"} {format(Math.abs(diff))}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    {hasBothValues && (
                      <div className="h-1 rounded-full bg-slate-100 dark:bg-[#2e2e2e] overflow-hidden mx-1">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            aWins ? "bg-emerald-500" : "bg-emerald-200 dark:bg-emerald-800"
                          }`}
                          style={{ width: `${aBar}%` }}
                        />
                      </div>
                    )}
                    <div
                      className={`text-[11px] font-bold tabular-nums ${
                        hasBothValues && aWins
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {safeA > 0 ? format(safeA) : "—"}
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    {hasBothValues && (
                      <div className="h-1 rounded-full bg-slate-100 dark:bg-[#2e2e2e] overflow-hidden mx-1">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            bWins ? "bg-violet-500" : "bg-violet-200 dark:bg-violet-800"
                          }`}
                          style={{ width: `${bBar}%` }}
                        />
                      </div>
                    )}
                    <div
                      className={`text-[11px] font-bold tabular-nums ${
                        hasBothValues && bWins
                          ? "text-violet-700 dark:text-violet-300"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {safeB > 0 ? format(safeB) : "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {loanDiff !== 0 && resultA.emi > 0 && resultB.emi > 0 && (
            <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 px-4 py-3 flex items-start gap-2">
              <span className="text-violet-500 text-base leading-none mt-0.5" aria-hidden="true">
                ⓘ
              </span>
              <p className="text-[11px] text-violet-700 dark:text-violet-300 leading-relaxed">
                <span className="font-bold">Subvention note: </span>
                {loanDiff > 0
                  ? `At the same EMI & tenure, Scenario B requires ${formatINR(Math.abs(loanDiff))} extra loan / subvention.`
                  : `Scenario B uses ${formatINR(Math.abs(loanDiff))} less loan — meaning a higher down payment is required.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={onAddScenarioB}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-3xl border-2 border-dashed border-slate-200 dark:border-[#2e2e2e] text-[12px] font-medium text-slate-400 hover:text-emerald-600 hover:border-emerald-400 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all"
    >
      <span className="text-lg leading-none">+</span>
      Add Comparison (Scenario B)
    </button>
  );
};

export default React.memo(ScenarioBPanel);
