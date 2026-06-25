import React, { useMemo } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";
import { 
  calculateLivePrincipalOutstanding,
  formatCurrency 
} from "../../../../../utils/emiCalculator";

/**
 * Live Principal Outstanding Display
 * Shows real-time outstanding balance based on current date and disbursement details
 */
const PrincipalOutstanding = ({ form }) => {
  // Watch form values
  const loanAmount = Form.useWatch("postfile_loanAmountApproved", form) || 0;
  const disbursedAmount = Form.useWatch("postfile_loanAmountDisbursed", form) || loanAmount;
  const interestRate = Form.useWatch("postfile_roi", form) || 0;
  const tenureMonths = Form.useWatch("postfile_tenureMonths", form) || 0;
  const firstEmiDate = Form.useWatch("postfile_firstEmiDate", form);
  const disbursementDate = Form.useWatch("disbursement_date", form);

  // Calculate live outstanding
  const outstandingData = useMemo(() => {
    if (!disbursedAmount || !interestRate || !tenureMonths) {
      return null;
    }

    // Use first EMI date if available, otherwise disbursement date
    const emiDate = firstEmiDate || disbursementDate;

    return calculateLivePrincipalOutstanding(
      disbursedAmount,
      interestRate,
      tenureMonths,
      emiDate
    );
  }, [disbursedAmount, interestRate, tenureMonths, firstEmiDate, disbursementDate]);

  if (!outstandingData) {
    return (
      <div className="bg-card rounded-lg border border-dashed border-muted p-4">
        <div className="flex items-center gap-3 mb-2">
          <Icon name="TrendingDown" size={16} className="text-primary" />
          <p className="text-sm text-muted-foreground">
            Principal Outstanding - Pending loan details
          </p>
        </div>
        <p className="text-xs text-muted-foreground pl-7">
          Enter disbursement details to track live outstanding balance
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="TrendingDown" size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Principal Outstanding
            </h3>
            <p className="text-xs text-muted-foreground">
              Live balance as of today
            </p>
          </div>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 rounded-full border border-success/20">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-success">LIVE</span>
        </div>
      </div>

      {/* Outstanding Amount - Hero Display */}
      <div className="bg-card rounded-lg border border-border p-4 mb-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Current Outstanding</p>
          <p className="text-3xl md:text-4xl font-bold text-primary mb-2">
            {formatCurrency(outstandingData.outstanding)}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Icon name="Calendar" size={12} className="text-primary" />
            <span>
              {outstandingData.monthsElapsed} of {tenureMonths} EMIs completed
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Repayment Progress</span>
          <span className="text-xs font-semibold text-foreground">
            {outstandingData.progressPercentage}%
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${outstandingData.progressPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {formatCurrency(disbursedAmount)}
          </span>
          <span className="text-xs text-muted-foreground">{formatCurrency(0)}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="CheckCircle" size={14} className="text-success" />
            <p className="text-xs text-muted-foreground">EMIs Paid</p>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {outstandingData.monthsElapsed}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(outstandingData.totalPaid)}
          </p>
        </div>

        <div className="bg-muted/30 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Clock" size={14} className="text-primary" />
            <p className="text-xs text-muted-foreground">EMIs Remaining</p>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {outstandingData.monthsRemaining}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(outstandingData.emi * outstandingData.monthsRemaining)}
          </p>
        </div>

        <div className="bg-muted/30 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="DollarSign" size={14} className="text-primary" />
            <p className="text-xs text-muted-foreground">Monthly EMI</p>
          </div>
          <p className="text-sm font-semibold text-primary">
            {formatCurrency(outstandingData.emi)}
          </p>
        </div>

        <div className="bg-muted/30 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Target" size={14} className="text-primary" />
            <p className="text-xs text-muted-foreground">Disbursed</p>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(disbursedAmount)}
          </p>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-2 bg-primary/5 rounded-md border border-primary/20">
        <p className="text-xs text-foreground flex items-start gap-2">
          <Icon name="Info" size={12} className="mt-0.5 flex-shrink-0 text-primary" />
          <span>
            Outstanding calculated assuming all EMIs paid on time. Actual outstanding may vary based on payment history.
          </span>
        </p>
      </div>
    </div>
  );
};

export default PrincipalOutstanding;
