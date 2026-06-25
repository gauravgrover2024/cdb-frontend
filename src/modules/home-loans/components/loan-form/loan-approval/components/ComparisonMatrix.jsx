import React from "react";
import Icon from "../../../../../../components/AppIcon";

const ComparisonMatrix = ({ banks }) => {
  const formatInr = (val) => {
    if (!val && val !== 0) return "-";
    const num = parseFloat(String(val).replace(/[^0-9.]/g, "")) || 0;
    return num.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  };

  // Calculate EMI
  const calculateEMI = (principal, annualRate, tenureMonths) => {
    const P = parseFloat(principal) || 0;
    const N = parseFloat(tenureMonths) || 0;
    const R = (parseFloat(annualRate) || 0) / 12 / 100;
    if (!P || !N || !R) return 0;
    const pow = Math.pow(1 + R, N);
    const emi = (P * R * pow) / (pow - 1);
    return Math.round(emi);
  };

  // Calculate Total Interest
  const calculateTotalInterest = (principal, emi, tenureMonths) => {
    const P = parseFloat(principal) || 0;
    const E = parseFloat(emi) || 0;
    const N = parseFloat(tenureMonths) || 0;
    if (!P || !E || !N) return 0;
    return Math.round((E * N) - P);
  };

  // Enrich banks with calculated values
  const enrichedBanks = banks?.map((bank) => {
    const emi = calculateEMI(bank?.loanAmount, bank?.interestRate, bank?.tenure);
    const totalInterest = calculateTotalInterest(bank?.loanAmount, emi, bank?.tenure);
    return {
      ...bank,
      emi,
      totalInterest,
    };
  }) || [];

  const comparisonMetrics = [
    {
      key: "interestRate",
      label: "Interest Rate",
      format: (val) => `${val || "-"}% p.a.`,
    },
    { key: "processingFee", label: "Processing Fee", format: formatInr },
    { key: "loanAmount", label: "Loan Amount", format: formatInr },
    { key: "tenure", label: "Tenure", format: (val) => val ? `${val} months` : "-" },
    { key: "emi", label: "Monthly EMI", format: formatInr },
    { key: "totalInterest", label: "Total Interest", format: formatInr },
  ];

  const cleanValue = (val) => {
    if (typeof val === "number") return val;
    return parseFloat(String(val || "0").replace(/[^0-9.]/g, "")) || 0;
  };

  const getBestValue = (key) => {
    if (!enrichedBanks || enrichedBanks.length === 0) return null;
    
    // metrics where lower is better
    if (
      key === "interestRate" ||
      key === "processingFee" ||
      key === "totalInterest" || 
      key === "emi"
    ) {
      const values = enrichedBanks.map((b) => cleanValue(b?.[key]));
      return Math.min(...values);
    }
    // metrics where higher is better
    if (key === "loanAmount" || key === "tenure") {
      const values = enrichedBanks.map((b) => cleanValue(b?.[key]));
      return Math.max(...values);
    }
    return null;
  };

  const isBestValue = (bank, key) => {
    if (!bank) return false;
    const bestValue = getBestValue(key);
    if (bestValue === null) return false;
    const currentValue = cleanValue(bank?.[key]);
    return currentValue === bestValue;
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 md:p-6 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="BarChart3" size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground">
              Bank Comparison Matrix
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Side-by-side comparison of all submitted applications
            </p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left p-3 md:p-4 text-xs md:text-sm font-semibold text-foreground min-w-[140px] sticky left-0 bg-muted/20 z-10">
                Metric
              </th>
              {enrichedBanks?.map((bank, index) => (
                <th
                  key={index}
                  className="text-center p-3 md:p-4 min-w-[140px]"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs md:text-sm font-semibold text-foreground">
                      {bank?.bankName}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {bank?.status}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonMetrics?.map((metric, metricIndex) => (
              <tr
                key={metricIndex}
                className="border-b border-border hover:bg-muted/10 transition-colors"
              >
                <td className="p-3 md:p-4 text-xs md:text-sm font-medium text-foreground sticky left-0 bg-card z-10">
                  {metric?.label}
                </td>
                {enrichedBanks?.map((bank, bankIndex) => (
                  <td key={bankIndex} className="p-3 md:p-4 text-center">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md ${
                        isBestValue(bank, metric?.key)
                          ? "bg-success/10 text-success font-semibold"
                          : "text-foreground"
                      }`}
                    >
                      {isBestValue(bank, metric?.key) && (
                        <Icon
                          name="TrendingDown"
                          size={14}
                          className="text-success"
                        />
                      )}
                      <span className="text-xs md:text-sm font-mono">
                        {metric?.format(bank?.[metric?.key] || "N/A")}
                      </span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 md:p-6 border-t border-border bg-muted/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Icon name="TrendingDown" size={16} className="text-success" />
            <span className="text-xs md:text-sm text-muted-foreground">
              Best value indicators shown in green
            </span>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Icon name="Info" size={16} className="text-primary" />
            <span className="text-xs md:text-sm text-muted-foreground">
              Lower rates and fees are better
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonMatrix;
