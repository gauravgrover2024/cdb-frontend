// src/modules/loans/components/loan-form/loan-approval/components/BankStatusCard.jsx
import React, { useState, useEffect } from "react";
import Icon from "../../../../../../components/AppIcon";
import Button from "../../../../../../components/ui/Button";

const getStatusClasses = (status) => {
  const s = (status || "").toLowerCase();

  if (s === "approved")
    return "bg-success/10 text-success border border-success/20";
  if (s === "documents required")
    return "bg-accent/10 text-accent border border-accent/20";
  if (s === "rejected") return "bg-error/10 text-error border border-error/20";
  if (s === "pending" || s === "under review")
    return "bg-warning/10 text-warning border border-warning/20";

  return "bg-muted text-muted-foreground border border-border/50";
};

const parseInr = (val) => {
  if (val === "" || val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? 0 : n;
};

const formatInr = (val) =>
  parseInr(val).toLocaleString("en-IN", { maximumFractionDigits: 0 });

// EMI formula
const calculateEmi = (principal, annualRate, tenureMonths) => {
  const P = parseInr(principal);
  const N = tenureMonths || 0;
  const R = (annualRate || 0) / 12 / 100;
  if (!P || !N || !R) return 0;
  const pow = Math.pow(1 + R, N);
  const emi = (P * R * pow) / (pow - 1);
  return Math.round(emi);
};

// LTV formula
const calculateLtv = (loanAmount, carValue) => {
  const loan = parseInr(loanAmount);
  const value = parseInr(carValue);
  if (!loan || !value) return 0;
  return (loan / value) * 100;
};

const clamp = (val, min, max) => Math.min(max, Math.max(min, val || 0));

const BankStatusCard = ({
  bank,
  form,
  onUpdateStatus,
  onBankNameChange,
  onDeleteBank,
  readOnly = false,
  onBankUpdate, // NEW: parent updater
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showBreakup, setShowBreakup] = useState(false);
  const [breakupReadOnly, setBreakupReadOnly] = useState(false);

  // breakup fields (strings)
  const [netLoanApproved, setNetLoanApproved] = useState(
    bank.breakupNetLoanApproved ?? bank.loanAmount ?? ""
  );

  const [creditAssuredFinance, setCreditAssuredFinance] = useState(
    bank.breakupCreditAssured ?? ""
  );

  const [insuranceFinance, setInsuranceFinance] = useState(
    bank.breakupInsuranceFinance ?? ""
  );

  const [extendedWarrantyFinance, setExtendedWarrantyFinance] = useState(
    bank.breakupEwFinance ?? ""
  );

  // vehicle + price + rate/fee/tenure + extra fields
  const vehicleMake = form?.getFieldValue("vehicleMake");
  const vehicleModel = form?.getFieldValue("vehicleModel");
  const vehicleVariant = form?.getFieldValue("vehicleVariant");
  const exShowroomPrice = form?.getFieldValue("exShowroomPrice");
  const loanType = form?.getFieldValue("typeOfLoan");
  const isNewCar = loanType === "New Car";

  const [tenureMonths, setTenureMonths] = useState(Number(bank.tenure) || 60);
  const [interestRate, setInterestRate] = useState(
    bank.interestRate?.toString() || ""
  );

  const [processingFee, setProcessingFee] = useState(bank.processingFee || "");
  const [cibilScore, setCibilScore] = useState(750);
  const [dsaCode, setDsaCode] = useState("");
  const [payoutPercent, setPayoutPercent] = useState(bank.payoutPercent || "");

  const breakupTotal =
    parseInr(netLoanApproved) +
    parseInr(creditAssuredFinance) +
    parseInr(insuranceFinance) +
    parseInr(extendedWarrantyFinance);

  const displayLoanAmount =
    breakupTotal > 0 ? breakupTotal : parseInr(bank.loanAmount);

  const emi = calculateEmi(
    displayLoanAmount,
    parseFloat(interestRate) || 0,
    tenureMonths
  );

  const ltv = calculateLtv(displayLoanAmount, exShowroomPrice);

  // SUMMARY loan amount (read-only, opens popup read-only)
  const SummaryLoanAmount = (
    <div
      className="cursor-pointer"
      onClick={() => {
        setBreakupReadOnly(true);
        setShowBreakup(true);
      }}
    >
      <p className="text-xs text-muted-foreground">Loan Amount</p>
      <p className="font-semibold font-mono">
        ₹ {formatInr(displayLoanAmount)}
      </p>
    </div>
  );

  // EXPANDED loan amount (styled like other fields, opens popup editable)
  const ExpandedLoanAmount = (
    <div
      className="cursor-pointer"
      onClick={() => {
        setBreakupReadOnly(false);
        setShowBreakup(true);
      }}
    >
      <label className="text-xs text-muted-foreground">Loan Amount</label>
      <div className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-muted/40">
        <span className="font-mono">₹ {formatInr(displayLoanAmount)}</span>
      </div>
    </div>
  );

  const handleTenureInputChange = (val) => {
    if (val === "") {
      setTenureMonths("");
      return;
    }
    const num = parseInt(val, 10);
    if (Number.isNaN(num)) return;
    setTenureMonths(num);
  };

  const handleTenureInputBlur = () => {
    if (tenureMonths === "") return;
    const num = clamp(parseInt(tenureMonths, 10) || 0, 12, 120);
    setTenureMonths(num);
    onBankUpdate && onBankUpdate({ tenure: num });
  };

  const handleTenureSliderChange = (e) => {
    const num = parseInt(e.target.value, 10);
    setTenureMonths(num);
    onBankUpdate && onBankUpdate({ tenure: num });
  };

  const normalizedCibil = clamp(parseInt(cibilScore || 0, 10), 300, 900);
  const cibilPercent = ((normalizedCibil - 300) / (900 - 300)) * 100;

  useEffect(() => {
    setNetLoanApproved(bank.breakupNetLoanApproved ?? bank.loanAmount ?? "");
    setCreditAssuredFinance(bank.breakupCreditAssured ?? "");
    setInsuranceFinance(bank.breakupInsuranceFinance ?? "");
    setExtendedWarrantyFinance(bank.breakupEwFinance ?? "");
  }, [
    bank.breakupNetLoanApproved,
    bank.breakupCreditAssured,
    bank.breakupInsuranceFinance,
    bank.breakupEwFinance,
    bank.loanAmount,
  ]);

  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-6 transition-all relative">
      {/* SUMMARY */}
      {!expanded && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="Building2" size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{bank.bankName}</h3>
                <p className="text-xs text-muted-foreground">
                  Loan A/c:{" "}
                  <span className="font-mono">{bank.applicationId}</span>
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${getStatusClasses(
                  bank.status
                )}`}
              >
                {bank.status || "Status N/A"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs text-muted-foreground">Interest Rate</p>
              <p className="font-semibold">
                {bank.interestRate ? `${bank.interestRate}%` : "-"}
              </p>
            </div>

            {/* Loan Amount summary */}
            <div>{SummaryLoanAmount}</div>

            <div>
              <p className="text-xs text-muted-foreground">Processing Fee</p>
              <p className="font-semibold font-mono">
                {bank.processingFee || "0"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tenure</p>
              <p className="font-semibold">
                {bank.tenure ? `${bank.tenure} months` : "-"}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              size="sm"
              fullWidth
              onClick={() => setExpanded(true)}
              disabled={readOnly}
            >
              Show Details
            </Button>
            <Button
              size="sm"
              variant="outline"
              fullWidth
              onClick={() => onUpdateStatus(bank)}
              disabled={readOnly}
            >
              Update Status
            </Button>
            {onDeleteBank && (
              <Button
                size="sm"
                variant="outline"
                iconName="Trash2"
                onClick={onDeleteBank}
                disabled={readOnly}
              />
            )}
          </div>
        </>
      )}
      {/* EXPANDED */}
      {expanded && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Loan Details</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpanded(false)}
            >
              Back
            </Button>
          </div>

          {/* Bank Name */}
          <div>
            <label className="text-xs text-muted-foreground">Bank Name</label>
            <input
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={bank.bankName}
              onChange={(e) => onBankNameChange(bank.id, e.target.value)}
            />
          </div>

          {/* Make / Model / Variant */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Make</label>
              <input
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                value={vehicleMake || ""}
                onChange={(e) =>
                  form?.setFieldsValue({ vehicleMake: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Model</label>
              <input
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                value={vehicleModel || ""}
                onChange={(e) =>
                  form?.setFieldsValue({ vehicleModel: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Variant</label>
              <input
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                value={vehicleVariant || ""}
                onChange={(e) =>
                  form?.setFieldsValue({ vehicleVariant: e.target.value })
                }
              />
            </div>
          </div>

          {/* Ex-showroom */}
          {isNewCar && (
            <div>
              <label className="text-xs text-muted-foreground">
                Ex-Showroom Price
              </label>
              <div className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-muted/40">
                ₹{" "}
                {exShowroomPrice
                  ? Number(exShowroomPrice).toLocaleString("en-IN")
                  : "-"}
              </div>
            </div>
          )}

          {/* Loan Amount (breakup) */}
          {ExpandedLoanAmount}

          {/* LTV */}
          <div>
            <label className="text-xs text-muted-foreground">
              LTV (Loan to Value)
            </label>
            <div className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-muted/40">
              <span className="font-mono">
                {ltv ? ltv.toFixed(2) : "0.00"}%
              </span>
            </div>
          </div>

          {/* Tenure: slider + textbox */}
          <div>
            <label className="text-xs text-muted-foreground">
              Tenure (Months)
            </label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="range"
                min={12}
                max={120}
                step={3}
                value={clamp(tenureMonths, 12, 120)}
                onChange={handleTenureSliderChange}
                className="flex-1"
              />
              <input
                type="number"
                className="w-20 border rounded-md px-2 py-1 text-sm"
                value={tenureMonths}
                onChange={(e) => handleTenureInputChange(e.target.value)}
                onBlur={handleTenureInputBlur}
              />
            </div>
          </div>

          {/* Rate of Interest */}
          <div>
            <label className="text-xs text-muted-foreground">
              Rate of Interest (% p.a.)
            </label>
            <input
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={interestRate}
              onChange={(e) => {
                const val = e.target.value;
                setInterestRate(val);
              }}
              onBlur={() => {
                if (interestRate === "") return;
                const num = parseFloat(interestRate);
                if (Number.isNaN(num)) {
                  setInterestRate("");
                  return;
                }
                const normalized = num.toFixed(2);
                setInterestRate(normalized);
                onBankUpdate &&
                  onBankUpdate({ interestRate: Number(normalized) });
              }}
            />
          </div>

          {/* Processing Fee */}
          <div>
            <label className="text-xs text-muted-foreground">
              Processing Fee
            </label>
            <input
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={processingFee}
              onChange={(e) => {
                const val = e.target.value;
                setProcessingFee(val);
                onBankUpdate && onBankUpdate({ processingFee: val });
              }}
            />
          </div>

          {/* EMI */}
          <div>
            <label className="text-xs text-muted-foreground">Monthly EMI</label>
            <div className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-muted/40">
              <span className="font-mono">
                ₹ {emi ? emi.toLocaleString("en-IN") : "-"}
              </span>
            </div>
          </div>

          {/* CIBIL Score */}
          <div>
            <label className="text-xs text-muted-foreground">CIBIL Score</label>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-24 border rounded-md px-2 py-1 text-sm"
                    value={cibilScore}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setCibilScore("");
                        return;
                      }
                      const num = parseInt(val, 10);
                      if (Number.isNaN(num)) return;
                      setCibilScore(num);
                    }}
                    onBlur={() => {
                      if (cibilScore === "") return;
                      setCibilScore(
                        clamp(parseInt(cibilScore, 10) || 0, 300, 900)
                      );
                    }}
                  />

                  <span className="text-xs text-muted-foreground">
                    Enter score (300–900)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Visual indicator updates as you change the score.
                </p>
              </div>

              <div className="flex items-center justify-center">
                <div className="relative w-24 h-24 md:w-28 md:h-28">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke="#E4E4E7"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke={
                        cibilScore >= 750
                          ? "#16a34a"
                          : cibilScore >= 650
                          ? "#f59e0b"
                          : "#ef4444"
                      }
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${
                        (clamp(cibilScore, 300, 900) / 900) * 283
                      } 283`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className={`text-xl md:text-2xl font-bold ${
                        cibilScore >= 750
                          ? "text-success"
                          : cibilScore >= 650
                          ? "text-warning"
                          : "text-error"
                      }`}
                    >
                      {cibilScore}
                    </span>
                    <span className="text-[10px] md:text-xs text-muted-foreground">
                      out of 900
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DSA Code */}
          <div>
            <label className="text-xs text-muted-foreground">DSA Code</label>
            <input
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={dsaCode}
              onChange={(e) => setDsaCode(e.target.value)}
            />
          </div>

          {/* Payout % */}
          <div>
            <label className="text-xs text-muted-foreground">Payout %</label>
            <input
              type="number"
              step="0.01"
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={payoutPercent}
              onChange={(e) => {
                const val = e.target.value;
                setPayoutPercent(val);
                onBankUpdate && onBankUpdate({ payoutPercent: val });
              }}
              placeholder="Enter payout percentage"
            />
          </div>
        </div>
      )}

      {/* Popup for breakup */}
      {showBreakup && (
        <LoanBreakupPopup
          netLoanApproved={netLoanApproved}
          creditAssuredFinance={creditAssuredFinance}
          insuranceFinance={insuranceFinance}
          extendedWarrantyFinance={extendedWarrantyFinance}
          setNetLoanApproved={setNetLoanApproved}
          setCreditAssuredFinance={setCreditAssuredFinance}
          setInsuranceFinance={setInsuranceFinance}
          setExtendedWarrantyFinance={setExtendedWarrantyFinance}
          readOnly={breakupReadOnly}
          onClose={() => setShowBreakup(false)}
          onBankUpdate={onBankUpdate} // NEW
        />
      )}
    </div>
  );
};

const LoanBreakupPopup = ({
  netLoanApproved,
  creditAssuredFinance,
  insuranceFinance,
  extendedWarrantyFinance,
  setNetLoanApproved,
  setCreditAssuredFinance,
  setInsuranceFinance,
  setExtendedWarrantyFinance,
  readOnly,
  onClose,
  onBankUpdate, // NEW
}) => {
  const recomputeTotal = (n, c, i, e) =>
    parseInr(n) + parseInr(c) + parseInr(i) + parseInr(e);

  const toNum = (v) => (v === "" || v == null ? 0 : Number(v));

  const handleChangeAndUpdate = (field, value) => {
    if (readOnly) return;

    if (field === "netLoanApproved") {
      const nextNet = toNum(value);
      const total = recomputeTotal(
        nextNet,
        creditAssuredFinance,
        insuranceFinance,
        extendedWarrantyFinance
      );
      setNetLoanApproved(nextNet);
      onBankUpdate &&
        onBankUpdate({
          loanAmount: total,
          breakupNetLoanApproved: nextNet,
          breakupCreditAssured: creditAssuredFinance,
          breakupInsuranceFinance: insuranceFinance,
          breakupEwFinance: extendedWarrantyFinance,
        });
    }
    if (field === "creditAssuredFinance") {
      const nextCredit = toNum(value);
      const total = recomputeTotal(
        netLoanApproved,
        nextCredit,
        insuranceFinance,
        extendedWarrantyFinance
      );
      setCreditAssuredFinance(nextCredit);
      onBankUpdate &&
        onBankUpdate({
          loanAmount: total,
          breakupNetLoanApproved: netLoanApproved,
          breakupCreditAssured: nextCredit,
          breakupInsuranceFinance: insuranceFinance,
          breakupEwFinance: extendedWarrantyFinance,
        });
    }
    if (field === "insuranceFinance") {
      const nextIns = toNum(value);
      const total = recomputeTotal(
        netLoanApproved,
        creditAssuredFinance,
        nextIns,
        extendedWarrantyFinance
      );
      setInsuranceFinance(nextIns);
      onBankUpdate &&
        onBankUpdate({
          loanAmount: total,
          breakupNetLoanApproved: netLoanApproved,
          breakupCreditAssured: creditAssuredFinance,
          breakupInsuranceFinance: nextIns,
          breakupEwFinance: extendedWarrantyFinance,
        });
    }
    if (field === "extendedWarrantyFinance") {
      const nextEw = toNum(value);
      const total = recomputeTotal(
        netLoanApproved,
        creditAssuredFinance,
        insuranceFinance,
        nextEw
      );
      setExtendedWarrantyFinance(nextEw);
      onBankUpdate &&
        onBankUpdate({
          loanAmount: total,
          breakupNetLoanApproved: netLoanApproved,
          breakupCreditAssured: creditAssuredFinance,
          breakupInsuranceFinance: insuranceFinance,
          breakupEwFinance: nextEw,
        });
    }
  };

  const total = recomputeTotal(
    netLoanApproved,
    creditAssuredFinance,
    insuranceFinance,
    extendedWarrantyFinance
  );

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg border border-border shadow-elevation-4 w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="IndianRupee" size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Loan Amount Breakdown
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">
              Net Loan Amount Approved
            </label>
            <input
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={netLoanApproved}
              readOnly={readOnly}
              onChange={(e) =>
                handleChangeAndUpdate("netLoanApproved", e.target.value)
              }
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              Credit Assured Finance
            </label>
            <input
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={creditAssuredFinance}
              readOnly={readOnly}
              onChange={(e) =>
                handleChangeAndUpdate("creditAssuredFinance", e.target.value)
              }
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              Insurance Finance
            </label>
            <input
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={insuranceFinance}
              readOnly={readOnly}
              onChange={(e) =>
                handleChangeAndUpdate("insuranceFinance", e.target.value)
              }
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              Extended Warranty Finance
            </label>
            <input
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              value={extendedWarrantyFinance}
              readOnly={readOnly}
              onChange={(e) =>
                handleChangeAndUpdate("extendedWarrantyFinance", e.target.value)
              }
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
            <span className="text-xs text-muted-foreground">
              Total Loan Amount
            </span>
            <span className="text-sm font-semibold font-mono">
              ₹ {formatInr(total)}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BankStatusCard;
