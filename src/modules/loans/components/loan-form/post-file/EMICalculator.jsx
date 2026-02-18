import React, { useState, useEffect } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";
import { calculateEMI, formatCurrency } from "../../../../../utils/emiCalculator";

/**
 * Interactive EMI Calculator Component
 * Allows users to calculate EMI for different loan scenarios
 * Can be used standalone or with form integration
 */
const EMICalculator = ({ form, mode = "integrated" }) => {
  // State for standalone mode
  const [loanAmount, setLoanAmount] = useState(500000);
  const [interestRate, setInterestRate] = useState(10.5);
  const [tenure, setTenure] = useState(60);
  const [calculatedEmi, setCalculatedEmi] = useState(0);

  // Watch form values in integrated mode
  const formLoanAmount = Form.useWatch("postfile_loanAmountApproved", form);
  const formInterestRate = Form.useWatch("postfile_roi", form);
  const formTenure = Form.useWatch("postfile_tenureMonths", form);
  const formRoiType = Form.useWatch("postfile_roiType", form);

  // Watch loan components for total calculation
  const disbursedLoan = Number(Form.useWatch("postfile_disbursedLoan", form) || 0);
  const disbursedCredit = Number(Form.useWatch("postfile_disbursedCreditAssured", form) || 0);
  const disbursedInsurance = Number(Form.useWatch("postfile_disbursedInsurance", form) || 0);
  const disbursedEw = Number(Form.useWatch("postfile_disbursedEw", form) || 0);
  
  const totalDisbursed = disbursedLoan + disbursedCredit + disbursedInsurance + disbursedEw;

  // Use form values if in integrated mode, otherwise use state
  // If totalDisbursed is available (from breakdown), prioritize it over the raw loanAmountApproved
  const activeLoanAmount = mode === "integrated" 
    ? (totalDisbursed > 0 ? totalDisbursed : (formLoanAmount || 0))
    : loanAmount;
  const activeInterestRate = mode === "integrated" && formInterestRate ? formInterestRate : interestRate;
  const activeTenure = mode === "integrated" && formTenure ? formTenure : tenure;
  const activeRoiType = mode === "integrated" && formRoiType ? formRoiType : "Reducing";

  // Calculate EMI whenever inputs change
  useEffect(() => {
    const emi = calculateEMI(activeLoanAmount, activeInterestRate, activeTenure, activeRoiType);
    setCalculatedEmi(emi);

    // Auto-update form field if in integrated mode
    if (mode === "integrated" && form && emi > 0) {
      form.setFieldsValue({ postfile_emiAmount: emi });
    }
  }, [activeLoanAmount, activeInterestRate, activeTenure, activeRoiType, form, mode]);

  // Calculate derived values
  const totalPayment = calculatedEmi * activeTenure;
  const totalInterest = totalPayment - activeLoanAmount;
  const interestPercentage = activeLoanAmount > 0 ? ((totalInterest / activeLoanAmount) * 100).toFixed(2) : 0;

  const handleCalculate = () => {
    const emi = calculateEMI(activeLoanAmount, activeInterestRate, activeTenure);
    setCalculatedEmi(emi);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="Calculator" size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">
            EMI Calculator
          </h3>
          <p className="text-sm text-muted-foreground">
            Calculate your monthly installment
          </p>
        </div>
      </div>

      {/* Input Fields - Only show in standalone mode */}
      {mode === "standalone" && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Loan Amount (₹)
            </label>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="Enter loan amount"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Interest Rate (% p.a.)
              </label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="Rate"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Tenure (Months)
              </label>
              <input
                type="number"
                value={tenure}
                onChange={(e) => setTenure(Number(e.target.value))}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="Months"
              />
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            className="w-full"
            size="small"
          >
            <Icon name="Calculator" size={14} className="text-primary" />
            Calculate EMI
          </Button>
        </div>
      )}

      {/* EMI Display - important data highlighted */}
      <div className="bg-muted/30 rounded-lg border border-border p-5 mb-4">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Monthly EMI</p>
          <p className="text-3xl font-bold text-primary mb-2 tracking-tight">
            {formatCurrency(calculatedEmi)}
          </p>
          <p className="text-sm text-muted-foreground">
            for {activeTenure} months @ {activeInterestRate}% p.a.
          </p>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="TrendingUp" size={14} className="text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Principal</p>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(activeLoanAmount)}
          </p>
        </div>

        <div className="bg-muted/30 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="TrendingDown" size={14} className="text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Interest</p>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(totalInterest)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ({interestPercentage}% of principal)
          </p>
        </div>

        <div className="bg-muted/30 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="DollarSign" size={14} className="text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Payment</p>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(totalPayment)}
          </p>
        </div>

        <div className="bg-muted/30 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Calendar" size={14} className="text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</p>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {activeTenure} months
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ({Math.floor(activeTenure / 12)} years {activeTenure % 12} months)
          </p>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
        <p className="text-xs text-foreground flex items-start gap-2">
          <Icon name="Info" size={14} className="mt-0.5 flex-shrink-0 text-primary" />
          EMI calculated using {activeRoiType === "Flat" ? "Flat Rate" : "reducing balance"} method. Actual EMI may vary based on bank policies.
        </p>
      </div>
    </div>
  );
};

export default EMICalculator;
