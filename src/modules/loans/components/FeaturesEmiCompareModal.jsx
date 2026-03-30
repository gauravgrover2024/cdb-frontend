import React, { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { X } from "lucide-react";
import ScenarioAPanel from "./ScenarioAPanel";
import ScenarioBPanel from "./ScenarioBPanel";

const solveEMI = (P, rMonthly, nMonths) => {
  if (P <= 0 || rMonthly <= 0 || nMonths <= 0) return 0;
  const x = Math.pow(1 + rMonthly, nMonths);
  return (P * rMonthly * x) / (x - 1);
};

const solveEMIAdvance = (P, rMonthly, nMonths) => {
  if (P <= 0 || rMonthly <= 0 || nMonths <= 0) return 0;
  const x = Math.pow(1 + rMonthly, nMonths);
  const xm1 = Math.pow(1 + rMonthly, nMonths - 1);
  return (P * rMonthly * xm1) / (x - 1);
};

const solvePrincipal = (emi, rMonthly, nMonths) => {
  if (emi <= 0 || rMonthly <= 0 || nMonths <= 0) return 0;
  const x = Math.pow(1 + rMonthly, nMonths);
  return (emi * (x - 1)) / (rMonthly * x);
};

const solveTenure = (emi, P, rMonthly) => {
  if (emi <= 0 || P <= 0 || rMonthly <= 0 || emi <= P * rMonthly) return 0;
  const num = Math.log(emi) - Math.log(emi - P * rMonthly);
  const den = Math.log(1 + rMonthly);
  return num / den;
};

const solveRate = (emi, P, nMonths) => {
  if (emi <= 0 || P <= 0 || nMonths <= 0) return 0;
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

const formatINR = (num) =>
  Number.isNaN(Number(num || 0))
    ? "₹0"
    : `₹${Math.round(Number(num || 0)).toLocaleString("en-IN")}`;

const formatNumber = (v) =>
  v === "" || v == null || Number.isNaN(Number(v))
    ? ""
    : Math.round(Number(v)).toLocaleString("en-IN");

const parseNumber = (str) => Number(String(str || "").replace(/,/g, "")) || 0;

const computeScenario = (
  mode,
  principal,
  rateAnnual,
  tenureVal,
  tenureType,
  emiInput,
  type = "arrear",
) => {
  const P = Number(principal) || 0;
  const Rm = (Number(rateAnnual) || 0) / 100 / 12;
  const N =
    tenureType === "years"
      ? (Number(tenureVal) || 0) * 12
      : Number(tenureVal) || 0;
  const E = Number(emiInput) || 0;

  const empty = {
    emi: 0,
    principal: 0,
    total: 0,
    interest: 0,
    months: 0,
    rateMonthly: Rm,
    emiExact: 0,
    principalExact: 0,
    totalExact: 0,
    interestExact: 0,
  };

  if (mode === "emi") {
    if (P <= 0 || Rm <= 0 || N <= 0) return empty;
    const emiVal =
      type === "advance" ? solveEMIAdvance(P, Rm, N) : solveEMI(P, Rm, N);
    const totalExact = emiVal * N;
    const interestExact = totalExact - P;
    return {
      ...empty,
      emi: Math.round(emiVal),
      principal: Math.round(P),
      total: Math.round(totalExact),
      interest: Math.round(interestExact),
      months: Math.round(N),
      rateMonthly: Rm,
      emiExact: emiVal,
      principalExact: P,
      totalExact,
      interestExact,
    };
  }

  if (mode === "amount") {
    if (E <= 0 || Rm <= 0 || N <= 0) return empty;
    const principalVal = solvePrincipal(E, Rm, N);
    const total = E * N;
    const interest = total - principalVal;
    return {
      ...empty,
      emi: Math.round(E),
      principal: Math.round(principalVal),
      total: Math.round(total),
      interest: Math.round(interest),
      months: Math.round(N),
      rateMonthly: Rm,
      emiExact: E,
      principalExact: principalVal,
      totalExact: total,
      interestExact: interest,
    };
  }

  if (mode === "tenure") {
    if (E <= 0 || P <= 0 || Rm <= 0) return empty;
    const nMonths = solveTenure(E, P, Rm);
    const nR = Math.round(nMonths);
    const total = E * nR;
    const interest = total - P;
    return {
      ...empty,
      emi: Math.round(E),
      principal: Math.round(P),
      total: Math.round(total),
      interest: Math.round(interest),
      months: nR,
      rateMonthly: Rm,
      emiExact: E,
      principalExact: P,
      totalExact: total,
      interestExact: interest,
    };
  }

  if (mode === "rate") {
    if (E <= 0 || P <= 0 || N <= 0) return { ...empty, rateMonthly: 0 };
    const rMonthly = solveRate(E, P, N);
    const total = E * N;
    const interest = total - P;
    return {
      ...empty,
      emi: Math.round(E),
      principal: Math.round(P),
      total: Math.round(total),
      interest: Math.round(interest),
      months: Math.round(N),
      rateMonthly: rMonthly,
      emiExact: E,
      principalExact: P,
      totalExact: total,
      interestExact: interest,
    };
  }

  return { ...empty, rateMonthly: 0 };
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
    return result.rateMonthly ? (result.rateMonthly * 12 * 100).toFixed(2) : "";
  }
  return null;
};

const AnimatedNumber = ({ value, className }) => (
  <span className={className}>
    {`₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`}
  </span>
);

const solveOptions = [
  { key: "emi", label: "EMI" },
  { key: "amount", label: "Amount" },
  { key: "rate", label: "Rate" },
  { key: "tenure", label: "Tenure" },
];

const DEFAULT_SCENARIO_BASE_PRICE = 1200000;

const getVariantPrice = (variant) =>
  Number(variant?.exShowroom || variant?.onRoadPrice || 0) || 0;

const FeaturesEmiCompareModal = ({
  open,
  variant,
  assumedOnRoadPrice = DEFAULT_SCENARIO_BASE_PRICE,
  onClose,
  onOpenFullCalculator,
}) => {
  const [loanAmountA, setLoanAmountA] = useState(0);
  const [interestA, setInterestA] = useState(9.5);
  const [tenureA, setTenureA] = useState(5);
  const [tenureTypeA, setTenureTypeA] = useState("years");
  const [emiAInput, setEmiAInput] = useState("");
  const [solveForA, setSolveForA] = useState("emi");
  const [emiType, setEmiType] = useState("arrear");

  const [showScenarioB, setShowScenarioB] = useState(false);
  const [loanAmountB, setLoanAmountB] = useState(0);
  const [interestB, setInterestB] = useState(9);
  const [tenureB, setTenureB] = useState(5);
  const [tenureTypeB, setTenureTypeB] = useState("years");
  const [emiBInput, setEmiBInput] = useState("");
  const [solveForB, setSolveForB] = useState("amount");
  const [emiTypeB, setEmiTypeB] = useState("arrear");
  const [comparisonTouched, setComparisonTouched] = useState(false);

  const basePrice = useMemo(() => {
    const variantPrice = getVariantPrice(variant);
    if (variantPrice > 0) return variantPrice;
    return Number(assumedOnRoadPrice) > 0
      ? Number(assumedOnRoadPrice)
      : DEFAULT_SCENARIO_BASE_PRICE;
  }, [variant, assumedOnRoadPrice]);

  useEffect(() => {
    if (!open) return;
    const assumedLoan = Math.max(0, Math.round(basePrice * 0.9));
    setLoanAmountA(assumedLoan);
    setInterestA(9.5);
    setTenureA(5);
    setTenureTypeA("years");
    setSolveForA("emi");
    setEmiType("arrear");
    setEmiAInput("");

    setShowScenarioB(false);
    setLoanAmountB(assumedLoan);
    setInterestB(9);
    setTenureB(5);
    setTenureTypeB("years");
    setEmiBInput("");
    setSolveForB("amount");
    setEmiTypeB("arrear");
    setComparisonTouched(false);
  }, [open, basePrice, variant?._id, variant?.vehicleId, variant?.variant]);

  const resultA = useMemo(
    () =>
      computeScenario(
        solveForA,
        loanAmountA,
        interestA,
        tenureA,
        tenureTypeA,
        solveForA === "emi" ? loanAmountA : emiAInput,
        emiType,
      ),
    [
      solveForA,
      loanAmountA,
      interestA,
      tenureA,
      tenureTypeA,
      emiAInput,
      emiType,
    ],
  );

  const liveEmiResult = useMemo(
    () =>
      computeScenario(
        "emi",
        loanAmountA,
        interestA,
        tenureA,
        tenureTypeA,
        0,
        emiType,
      ),
    [loanAmountA, interestA, tenureA, tenureTypeA, emiType],
  );

  useEffect(() => {
    if (resultA.emi) setEmiAInput(resultA.emi);
  }, [resultA.emi]);

  const effectiveScenarioARate = useMemo(() => {
    const computedAnnual = Number(resultA?.rateMonthly) * 12 * 100;
    if (Number.isFinite(computedAnnual) && computedAnnual > 0) {
      return computedAnnual;
    }
    return Number(interestA) || 0;
  }, [resultA?.rateMonthly, interestA]);

  useEffect(() => {
    if (comparisonTouched) return;
    setLoanAmountB(loanAmountA);
    setInterestB(Math.max(0, (Number(effectiveScenarioARate) || 0) - 0.25));
    setTenureB(tenureA);
    setTenureTypeB(tenureTypeA);
    setSolveForB("amount");
    setEmiBInput(resultA.emi || "");
  }, [
    comparisonTouched,
    loanAmountA,
    effectiveScenarioARate,
    tenureA,
    tenureTypeA,
    resultA.emi,
  ]);

  const resultB = useMemo(
    () =>
      computeScenario(
        solveForB,
        loanAmountB,
        interestB,
        tenureB,
        tenureTypeB,
        solveForB === "emi" ? loanAmountB : emiBInput,
        emiTypeB,
      ),
    [
      solveForB,
      loanAmountB,
      interestB,
      tenureB,
      tenureTypeB,
      emiBInput,
      emiTypeB,
    ],
  );

  const breakupA = useMemo(() => {
    const safePrincipal = Math.max(
      0,
      Number(liveEmiResult.principalExact ?? liveEmiResult.principal) || 0,
    );
    const safeInterest = Math.max(
      0,
      Number(liveEmiResult.interestExact ?? liveEmiResult.interest) || 0,
    );
    const total = safePrincipal + safeInterest;
    if (!total) {
      return {
        principalValue: 0,
        interestValue: 0,
        totalValue: 0,
        principalPct: 0,
        interestPct: 0,
      };
    }
    let principalPct = Math.round((safePrincipal / total) * 100);
    let interestPct = Math.round((safeInterest / total) * 100);
    const diff = 100 - (principalPct + interestPct);
    if (diff !== 0) {
      if (safePrincipal >= safeInterest) principalPct += diff;
      else interestPct += diff;
    }
    return {
      principalValue: safePrincipal,
      interestValue: safeInterest,
      totalValue: total,
      principalPct,
      interestPct,
    };
  }, [liveEmiResult]);

  const emiDiff = resultB.emi - resultA.emi;
  const interestDiff = resultB.interest - resultA.interest;
  const loanDiff = resultB.principal - resultA.principal;

  const cloneToScenarioB = () => {
    setComparisonTouched(true);
    setLoanAmountB(loanAmountA);
    setInterestB(Number(effectiveScenarioARate) || 0);
    setTenureB(tenureA);
    setEmiBInput(emiAInput);
    setSolveForB(solveForA);
    setTenureTypeB(tenureTypeA);
    setEmiTypeB(emiType);
    message.success("Copied Scenario A to Scenario B.");
  };

  const removeScenarioB = () => {
    setShowScenarioB(false);
    setComparisonTouched(false);
    setLoanAmountB(loanAmountA);
    setInterestB(Math.max(0, (Number(effectiveScenarioARate) || 0) - 0.25));
    setTenureB(tenureA);
    setTenureTypeB(tenureTypeA);
    setEmiBInput(resultA.emi || "");
    setSolveForB("amount");
    setEmiTypeB(emiType);
  };

  const addScenarioB = () => {
    setShowScenarioB(true);
    setComparisonTouched(false);
    setLoanAmountB(loanAmountA);
    setInterestB(Math.max(0, (Number(effectiveScenarioARate) || 0) - 0.25));
    setTenureB(tenureA);
    setTenureTypeB(tenureTypeA);
    setEmiBInput(resultA.emi || "");
    setEmiTypeB(emiType);
    setSolveForB("amount");
  };

  if (!open) return null;

  const variantTitle = [variant?.make, variant?.model, variant?.variant]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 md:p-5">
      <div className="w-full max-w-6xl rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-[#111111]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-neutral-800 md:px-5">
          <div>
            <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">
              EMI Scenarios
            </div>
            {variantTitle ? (
              <div className="text-[13px] text-slate-500 dark:text-slate-400">
                {variantTitle}
              </div>
            ) : (
              <div className="text-[13px] text-slate-500 dark:text-slate-400">
                Quick planner for any vehicle
              </div>
            )}
            <div className="mt-1 text-[12px] text-emerald-700 dark:text-emerald-300">
              Assumed loan in Scenario A: 90% ({formatINR(Math.round(basePrice * 0.9))})
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="mx-auto h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[78vh] space-y-4 overflow-y-auto p-4 md:p-5">
          <ScenarioAPanel
            disableAll={false}
            emiType={emiType}
            setEmiType={setEmiType}
            solveOptions={solveOptions}
            solveForA={solveForA}
            setSolveForA={setSolveForA}
            formatNumber={formatNumber}
            displayForField={displayForField}
            resultA={resultA}
            tenureTypeA={tenureTypeA}
            loanAmountA={loanAmountA}
            scenarioAInputsDisabled={false}
            parseNumber={parseNumber}
            setLoanAmountA={setLoanAmountA}
            interestA={interestA}
            setInterestA={setInterestA}
            tenureA={tenureA}
            setTenureA={setTenureA}
            setTenureTypeA={setTenureTypeA}
            liveEmiResult={liveEmiResult}
            emiAInput={emiAInput}
            setEmiAInput={setEmiAInput}
            AnimatedNumber={AnimatedNumber}
            formatINR={formatINR}
          />

          <ScenarioBPanel
            isFloating={false}
            showScenarioB={showScenarioB}
            disableAll={false}
            cloneToScenarioB={cloneToScenarioB}
            onRemoveScenarioB={removeScenarioB}
            onAddScenarioB={addScenarioB}
            resultA={resultA}
            resultB={resultB}
            breakupA={breakupA}
            emiDiff={emiDiff}
            interestDiff={interestDiff}
            loanDiff={loanDiff}
            solveOptions={solveOptions}
            solveForB={solveForB}
            setSolveForB={setSolveForB}
            emiTypeB={emiTypeB}
            setEmiTypeB={setEmiTypeB}
            tenureTypeB={tenureTypeB}
            setTenureTypeB={setTenureTypeB}
            loanAmountB={loanAmountB}
            setLoanAmountB={setLoanAmountB}
            emiBInput={emiBInput}
            setEmiBInput={setEmiBInput}
            interestB={interestB}
            setInterestB={setInterestB}
            tenureB={tenureB}
            setTenureB={setTenureB}
            setComparisonTouched={setComparisonTouched}
            displayForField={displayForField}
            parseNumber={parseNumber}
            formatNumber={formatNumber}
            formatINR={formatINR}
            AnimatedNumber={AnimatedNumber}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 dark:border-neutral-800 md:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onOpenFullCalculator}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-800"
          >
            Open full EMI calculator
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeaturesEmiCompareModal;
