// src/modules/loans/components/ScenarioAInline.jsx
import React, { useState, useMemo, useEffect } from "react";
import { Input } from "antd";

// ---------- Math helpers (same logic as EMICalculator) ----------
const solveEMI = (P, rMonthly, nMonths) => {
  if (!P || !rMonthly || !nMonths) return 0;
  const x = Math.pow(1 + rMonthly, nMonths);
  return (P * rMonthly * x) / (x - 1);
};

const solvePrincipal = (emi, rMonthly, nMonths) => {
  if (!emi || !rMonthly || !nMonths) return 0;
  const x = Math.pow(1 + rMonthly, nMonths);
  return (emi * (x - 1)) / (rMonthly * x);
};

const solveTenure = (emi, P, rMonthly) => {
  if (!emi || !P || !rMonthly || emi <= P * rMonthly) return 0;
  const num = Math.log(emi) - Math.log(emi - P * rMonthly);
  const den = Math.log(1 + rMonthly);
  return num / den;
};

const solveRate = (emi, P, nMonths) => {
  if (!emi || !P || !nMonths) return 0;
  let low = 0.0001;
  let high = 0.05;
  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    const guessEmi = solveEMI(P, mid, nMonths);
    if (guessEmi > emi) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
};

const formatNumber = (v) =>
  v == null || Number.isNaN(v) ? "" : Math.round(v).toLocaleString("en-IN");
const parseNumber = (str) =>
  Number(String(str || "0").replace(/[^0-9.]/g, "")) || 0;

// Same modes as EMI page
const solveOptions = [
  { key: "emi", label: "EMI" },
  { key: "amount", label: "Amount" },
  { key: "rate", label: "Rate" },
  { key: "tenure", label: "Tenure" },
];

const computeScenario = (
  mode,
  principal,
  rateAnnual,
  tenureVal,
  tenureType,
  emiInput,
) => {
  let P = Number(principal) || 0;
  let Rm = (Number(rateAnnual) || 0) / 100 / 12;
  let N =
    tenureType === "years"
      ? (Number(tenureVal) || 0) * 12
      : Number(tenureVal) || 0;
  let E = Number(emiInput) || 0;

  if (mode === "emi") {
    if (!P || !Rm || !N) {
      return {
        emi: 0,
        principal: 0,
        total: 0,
        interest: 0,
        months: 0,
        rateMonthly: Rm,
      };
    }
    const emiVal = solveEMI(P, Rm, N);
    const emiRounded = Math.round(emiVal);
    const total = emiRounded * N;
    const interest = total - P;
    return {
      emi: emiRounded,
      principal: Math.round(P),
      total,
      interest,
      months: Math.round(N),
      rateMonthly: Rm,
    };
  }

  if (mode === "amount") {
    if (!E || !Rm || !N) {
      return {
        emi: 0,
        principal: 0,
        total: 0,
        interest: 0,
        months: 0,
        rateMonthly: Rm,
      };
    }
    const principalVal = solvePrincipal(E, Rm, N);
    const pR = Math.round(principalVal);
    const total = E * N;
    const interest = total - pR;
    return {
      emi: Math.round(E),
      principal: pR,
      total,
      interest,
      months: Math.round(N),
      rateMonthly: Rm,
    };
  }

  if (mode === "tenure") {
    if (!E || !P || !Rm) {
      return {
        emi: 0,
        principal: 0,
        total: 0,
        interest: 0,
        months: 0,
        rateMonthly: Rm,
      };
    }
    const nMonths = solveTenure(E, P, Rm);
    const nR = Math.round(nMonths);
    const total = E * nR;
    const interest = total - P;
    return {
      emi: Math.round(E),
      principal: Math.round(P),
      total,
      interest,
      months: nR,
      rateMonthly: Rm,
    };
  }

  if (mode === "rate") {
    if (!E || !P || !N) {
      return {
        emi: 0,
        principal: 0,
        total: 0,
        interest: 0,
        months: 0,
        rateMonthly: 0,
      };
    }
    const rMonthly = solveRate(E, P, N);
    const total = E * N;
    const interest = total - P;
    return {
      emi: Math.round(E),
      principal: Math.round(P),
      total,
      interest,
      months: Math.round(N),
      rateMonthly: rMonthly,
    };
  }

  return {
    emi: 0,
    principal: 0,
    total: 0,
    interest: 0,
    months: 0,
    rateMonthly: Rm,
  };
};

const displayForField = (mode, field, result, tenureType) => {
  if (mode === "emi" && field === "emi") return result.emi;
  if (mode === "amount" && field === "amount") return result.principal;
  if (mode === "tenure" && field === "tenure") {
    return tenureType === "years"
      ? Math.round(result.months / 12)
      : result.months;
  }
  if (mode === "rate" && field === "rate") {
    return result.rateMonthly
      ? (result.rateMonthly * 12 * 100).toFixed(2)
      : null;
  }
  return null;
};

// ---------- Inline Scenario A component ----------
const ScenarioAInline = ({ initialPrice }) => {
  const [loanAmountA, setLoanAmountA] = useState(
    initialPrice ? initialPrice * 0.9 : 0,
  );
  const [interestA, setInterestA] = useState(10.5);
  const [tenureA, setTenureA] = useState(5);
  const [tenureTypeA, setTenureTypeA] = useState("years");
  const [emiAInput, setEmiAInput] = useState();
  const [solveForA, setSolveForA] = useState("emi");

  const resultA = useMemo(
    () =>
      computeScenario(
        solveForA,
        loanAmountA,
        interestA,
        tenureA,
        tenureTypeA,
        solveForA === "emi" ? loanAmountA : emiAInput,
      ),
    [solveForA, loanAmountA, interestA, tenureA, tenureTypeA, emiAInput],
  );

  useEffect(() => {
    if (resultA.emi) setEmiAInput(resultA.emi);
  }, [resultA.emi]);

  return (
    <div className="space-y-3 text-[13px]">
      {/* Toggle solve mode */}
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
          Scenario A (editable)
        </div>
        <div className="inline-flex rounded-full bg-slate-100 dark:bg-[#262626] p-1 text-[11px]">
          {solveOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSolveForA(opt.key)}
              className={[
                "px-3 py-1 rounded-full font-medium",
                solveForA === opt.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 dark:text-slate-300",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loan amount / rate / tenure / EMI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Loan amount */}
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Loan amount
          </div>
          <Input
            type="text"
            value={
              solveForA === "amount"
                ? formatNumber(
                    displayForField(solveForA, "amount", resultA, tenureTypeA),
                  )
                : formatNumber(loanAmountA)
            }
            onChange={(e) => {
              if (solveForA === "amount") return;
              const val = parseNumber(e.target.value);
              setLoanAmountA(val);
            }}
          />
        </div>

        {/* Interest */}
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Interest rate (annual)
          </div>
          <Input
            type="number"
            step="0.1"
            value={
              solveForA === "rate"
                ? (displayForField(solveForA, "rate", resultA, tenureTypeA) ??
                  interestA)
                : interestA
            }
            onChange={(e) => {
              if (solveForA === "rate") return;
              setInterestA(Number(e.target.value) || 0);
            }}
          />
        </div>

        {/* Tenure */}
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Tenure
          </div>
          <div className="flex items-end gap-2">
            <Input
              type="number"
              value={
                solveForA === "tenure"
                  ? (displayForField(
                      solveForA,
                      "tenure",
                      resultA,
                      tenureTypeA,
                    ) ?? tenureA)
                  : tenureA
              }
              onChange={(e) => {
                if (solveForA === "tenure") return;
                setTenureA(Number(e.target.value) || 0);
              }}
            />
            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-[#262626]">
              <button
                type="button"
                className={[
                  "px-3 py-1.5 text-[11px] font-medium whitespace-nowrap",
                  tenureTypeA === "years"
                    ? "bg-slate-900 text-white"
                    : "bg-transparent text-slate-600 dark:text-slate-300",
                ].join(" ")}
                onClick={() => setTenureTypeA("years")}
              >
                Years
              </button>
              <button
                type="button"
                className={[
                  "px-3 py-1.5 text-[11px] font-medium border-l border-slate-200 dark:border-[#262626] whitespace-nowrap",
                  tenureTypeA === "months"
                    ? "bg-slate-900 text-white"
                    : "bg-transparent text-slate-600 dark:text-slate-300",
                ].join(" ")}
                onClick={() => setTenureTypeA("months")}
              >
                Months
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EMI + summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            EMI amount
          </div>
          <Input
            type="text"
            value={
              solveForA === "emi"
                ? formatNumber(
                    displayForField(solveForA, "emi", resultA, tenureTypeA),
                  )
                : formatNumber(emiAInput)
            }
            onChange={(e) => {
              if (solveForA === "emi") return;
              const val = parseNumber(e.target.value);
              setEmiAInput(val);
            }}
          />
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Current EMI:{" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatNumber(resultA.emi)}
            </span>
          </div>
        </div>

        <div className="space-y-1 text-[12px] text-slate-600 dark:text-slate-300">
          <div>
            Principal:{" "}
            <span className="font-semibold">
              {formatNumber(resultA.principal)}
            </span>
          </div>
          <div>
            Total interest:{" "}
            <span className="font-semibold">
              {formatNumber(resultA.interest)}
            </span>
          </div>
          <div>
            Tenure:{" "}
            <span className="font-semibold">{resultA.months} months</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioAInline;
