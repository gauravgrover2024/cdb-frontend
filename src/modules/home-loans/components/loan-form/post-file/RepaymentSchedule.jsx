import React, { useState, useMemo } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";
import { 
  generateRepaymentSchedule, 
  formatCurrency, 
  formatDate 
} from "../../../../../utils/emiCalculator";

/**
 * Loan Repayment Schedule (Amortization Table)
 * Shows month-by-month breakdown of EMI, principal, interest, and outstanding balance
 */
const RepaymentSchedule = ({ form }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState("summary"); // "summary" or "detailed"

  // Watch form values
  const loanAmount = Form.useWatch("postfile_loanAmountApproved", form) || 0;
  const interestRate = Form.useWatch("postfile_roi", form) || 0;
  const tenureMonths = Form.useWatch("postfile_tenureMonths", form) || 0;
  const firstEmiDate = Form.useWatch("postfile_firstEmiDate", form);
  const roiType = Form.useWatch("postfile_roiType", form);

  // Generate schedule
  const schedule = useMemo(() => {
    if (!loanAmount || !interestRate || !tenureMonths) return [];
    return generateRepaymentSchedule(loanAmount, interestRate, tenureMonths, firstEmiDate, roiType);
  }, [loanAmount, interestRate, tenureMonths, firstEmiDate, roiType]);

  // Calculate summary data
  const summary = useMemo(() => {
    if (schedule.length === 0) return null;

    const lastEntry = schedule[schedule.length - 1];
    return {
      totalPayment: lastEntry.totalPaid,
      totalPrincipal: lastEntry.totalPrincipal,
      totalInterest: lastEntry.totalInterest,
      emi: schedule[0].emi,
    };
  }, [schedule]);

  // Yearly summary
  const yearlySummary = useMemo(() => {
    if (schedule.length === 0) return [];

    const years = [];
    for (let year = 0; year < Math.ceil(tenureMonths / 12); year++) {
      const startMonth = year * 12;
      const endMonth = Math.min((year + 1) * 12, tenureMonths);
      const yearData = schedule.slice(startMonth, endMonth);

      if (yearData.length === 0) continue;

      const yearPrincipal = yearData.reduce((sum, m) => sum + m.principalPayment, 0);
      const yearInterest = yearData.reduce((sum, m) => sum + m.interestPayment, 0);
      const yearTotal = yearData.reduce((sum, m) => sum + m.emi, 0);

      years.push({
        year: year + 1,
        principal: yearPrincipal,
        interest: yearInterest,
        total: yearTotal,
        closingBalance: yearData[yearData.length - 1].outstandingBalance,
      });
    }

    return years;
  }, [schedule, tenureMonths]);

  if (!loanAmount || !interestRate || !tenureMonths) {
    return (
      <div className="bg-card rounded-lg border border-dashed border-muted p-6 text-center">
        <Icon name="Calendar" size={32} className="text-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Enter loan amount, interest rate, and tenure to generate repayment schedule
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-elevation-2 border border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Calendar" size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground">
              Loan Repayment Schedule
            </h3>
            <p className="text-xs text-muted-foreground">
              {tenureMonths} months amortization breakdown
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={16} className="text-primary" />
          {isExpanded ? "Collapse" : "Expand"}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="p-4 bg-muted/20 border-b border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="Wallet" size={14} className="text-primary" />
                <p className="text-xs text-muted-foreground">Monthly EMI</p>
              </div>
              <p className="text-base font-bold text-primary">
                {formatCurrency(summary.emi)}
              </p>
            </div>

            <div className="bg-card rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="TrendingUp" size={14} className="text-primary" />
                <p className="text-xs text-muted-foreground">Total Principal</p>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(summary.totalPrincipal)}
              </p>
            </div>

            <div className="bg-card rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="Percent" size={14} className="text-primary" />
                <p className="text-xs text-muted-foreground">Total Interest</p>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(summary.totalInterest)}
              </p>
            </div>

            <div className="bg-card rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="DollarSign" size={14} className="text-primary" />
                <p className="text-xs text-muted-foreground">Total Repayment</p>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(summary.totalPayment)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Content */}
      {isExpanded && (
        <div className="p-4">
          {/* View Mode Toggle */}
          {/* View Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-muted p-1 rounded-lg inline-flex">
              <button
                onClick={() => setViewMode("summary")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === "summary"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon name="BarChart3" size={14} className="text-primary" />
                Yearly Summary
              </button>
              <button
                onClick={() => setViewMode("detailed")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === "detailed"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon name="List" size={14} className="text-primary" />
                Monthly Details
              </button>
            </div>
          </div>

          {/* Yearly Summary View */}
          {viewMode === "summary" && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-foreground">Year</th>
                    <th className="px-3 py-2 text-right font-semibold text-foreground">Principal</th>
                    <th className="px-3 py-2 text-right font-semibold text-foreground">Interest</th>
                    <th className="px-3 py-2 text-right font-semibold text-foreground">Total Paid</th>
                    <th className="px-3 py-2 text-right font-semibold text-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlySummary.map((year) => (
                    <tr key={year.year} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-medium text-foreground">Year {year.year}</td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">
                        {formatCurrency(year.principal)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">
                        {formatCurrency(year.interest)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-foreground">
                        {formatCurrency(year.total)}
                      </td>
                      <td className="px-3 py-2 text-right text-primary font-semibold">
                        {formatCurrency(year.closingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Monthly Details View */}
          {viewMode === "detailed" && (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-foreground">Month</th>
                    <th className="px-2 py-2 text-left font-semibold text-foreground">Date</th>
                    <th className="px-2 py-2 text-right font-semibold text-foreground">EMI</th>
                    <th className="px-2 py-2 text-right font-semibold text-foreground">Principal</th>
                    <th className="px-2 py-2 text-right font-semibold text-foreground">Interest</th>
                    <th className="px-2 py-2 text-right font-semibold text-foreground">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((entry) => (
                    <tr 
                      key={entry.month} 
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-2 py-2 font-medium text-foreground">{entry.month}</td>
                      <td className="px-2 py-2 text-muted-foreground">{formatDate(entry.date)}</td>
                      <td className="px-2 py-2 text-right font-semibold text-foreground">
                        {formatCurrency(entry.emi)}
                      </td>
                      <td className="px-2 py-2 text-right text-success">
                        {formatCurrency(entry.principalPayment)}
                      </td>
                      <td className="px-2 py-2 text-right text-destructive">
                        {formatCurrency(entry.interestPayment)}
                      </td>
                      <td className="px-2 py-2 text-right text-primary font-semibold">
                        {formatCurrency(entry.outstandingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Export/Print Actions */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {schedule.length} installments • {Math.floor(tenureMonths / 12)} years {tenureMonths % 12} months
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="small">
                <Icon name="Download" size={14} className="text-primary" />
                Export
              </Button>
              <Button variant="outline" size="small" onClick={() => window.print()}>
                <Icon name="Printer" size={14} className="text-primary" />
                Print
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepaymentSchedule;
