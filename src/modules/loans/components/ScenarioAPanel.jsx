import React from "react";
import { Input } from "antd";

const Label = ({ children }) => (
  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
    {children}
  </div>
);

const ScenarioAPanel = ({
  disableAll,
  emiType,
  setEmiType,
  solveOptions,
  solveForA,
  setSolveForA,
  formatNumber,
  displayForField,
  resultA,
  tenureTypeA,
  loanAmountA,
  scenarioAInputsDisabled,
  parseNumber,
  setLoanAmountA,
  interestA,
  setInterestA,
  tenureA,
  setTenureA,
  setTenureTypeA,
  liveEmiResult,
  emiAInput,
  setEmiAInput,
  AnimatedNumber,
  formatINR,
}) => (
  <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-sm border border-slate-100 dark:border-[#262626] px-5 py-5 space-y-4 transition-all hover:shadow-md">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Scenario A - primary EMI
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Configure core loan variables and solve instantly
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex flex-wrap rounded-full bg-slate-100 dark:bg-[#262626] p-1 text-[11px]">
          {[
            { key: "arrear", label: "Arrear (Standard)" },
            { key: "advance", label: "Advance" },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => !disableAll && setEmiType(opt.key)}
              disabled={disableAll}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                emiType === opt.key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#333]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="inline-flex flex-wrap rounded-full bg-slate-100 dark:bg-[#262626] p-1 text-[11px]">
          {solveOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => !disableAll && setSolveForA(opt.key)}
              disabled={disableAll}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                solveForA === opt.key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#333]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-1">
        <Label>Loan amount</Label>
        <div className="relative">
          <Input
            type="text"
            value={
              solveForA === "amount"
                ? formatNumber(
                    displayForField(solveForA, "amount", resultA, tenureTypeA),
                  ) || ""
                : formatNumber(loanAmountA)
            }
            onChange={(e) => {
              if (scenarioAInputsDisabled) return;
              if (solveForA === "amount") return;
              setLoanAmountA(parseNumber(e.target.value));
            }}
            readOnly={solveForA === "amount" || scenarioAInputsDisabled}
            className={solveForA === "amount" ? "pr-16 border-violet-500" : ""}
          />
          {solveForA === "amount" && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-violet-600 animate-pulse">
              Live
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Interest rate (annual %)</Label>
        <div className="relative">
          <Input
            type="number"
            step="0.1"
            value={
              solveForA === "rate"
                ? displayForField(solveForA, "rate", resultA, tenureTypeA) || ""
                : interestA
            }
            onChange={(e) => {
              if (disableAll) return;
              if (solveForA === "rate") return;
              setInterestA(Number(e.target.value) || 0);
            }}
            readOnly={solveForA === "rate" || disableAll}
            className={solveForA === "rate" ? "pr-16 border-violet-500" : ""}
          />
          {solveForA === "rate" && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-violet-600 animate-pulse">
              Live
            </span>
          )}
        </div>
        <input
          type="range"
          min={5}
          max={20}
          step="0.1"
          value={interestA}
          onChange={(e) =>
            !disableAll && setInterestA(Number(e.target.value) || 0)
          }
          className="w-full mt-1"
          disabled={disableAll}
        />
      </div>

      <div className="space-y-1">
        <Label>Tenure</Label>
        <div className="flex gap-2 items-end">
          <div className="relative flex-1">
            <Input
              type="number"
              value={
                solveForA === "tenure"
                  ? displayForField(
                      solveForA,
                      "tenure",
                      resultA,
                      tenureTypeA,
                    ) || ""
                  : tenureA
              }
              onChange={(e) => {
                if (disableAll) return;
                if (solveForA === "tenure") return;
                setTenureA(Number(e.target.value) || 0);
              }}
              readOnly={solveForA === "tenure" || disableAll}
              className={
                solveForA === "tenure" ? "pr-16 border-violet-500" : ""
              }
            />
            {solveForA === "tenure" && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-violet-600 animate-pulse">
                Live
              </span>
            )}
          </div>
          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-[#262626]">
            <button
              type="button"
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                tenureTypeA === "years"
                  ? "bg-violet-600 text-white"
                  : "bg-transparent text-slate-600 dark:text-slate-300"
              }`}
              onClick={() => !disableAll && setTenureTypeA("years")}
              disabled={disableAll}
            >
              Years
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-xs font-medium border-l border-slate-200 dark:border-[#262626] whitespace-nowrap ${
                tenureTypeA === "months"
                  ? "bg-violet-600 text-white"
                  : "bg-transparent text-slate-600 dark:text-slate-300"
              }`}
              onClick={() => !disableAll && setTenureTypeA("months")}
              disabled={disableAll}
            >
              Months
            </button>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          = {liveEmiResult.months} months
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      <div className="space-y-1">
        <Label>EMI amount</Label>
        <div className="relative">
          <Input
            type="text"
            value={
              solveForA === "emi"
                ? formatNumber(
                    displayForField(solveForA, "emi", resultA, tenureTypeA),
                  ) || ""
                : formatNumber(emiAInput)
            }
            onChange={(e) => {
              if (disableAll) return;
              if (solveForA === "emi") return;
              setEmiAInput(parseNumber(e.target.value));
            }}
            readOnly={solveForA === "emi" || disableAll}
            className={solveForA === "emi" ? "pr-16 border-violet-500" : ""}
          />
          {solveForA === "emi" && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-violet-600 animate-pulse">
              Live
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Current EMI:{" "}
          <span className="font-semibold text-violet-600 dark:text-violet-400">
            <AnimatedNumber value={liveEmiResult.emi} />
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default React.memo(ScenarioAPanel);
