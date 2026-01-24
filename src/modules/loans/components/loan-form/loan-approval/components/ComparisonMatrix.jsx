import React from "react";
import Icon from "../../../../../../components/AppIcon";

const ComparisonMatrix = ({ banks }) => {
  const comparisonMetrics = [
    {
      key: "interestRate",
      label: "Interest Rate",
      format: (val) => `${val}% p.a.`,
    },
    { key: "processingFee", label: "Processing Fee", format: (val) => val },
    { key: "loanAmount", label: "Loan Amount", format: (val) => val },
    { key: "tenure", label: "Tenure", format: (val) => `${val} months` },
    { key: "emi", label: "Monthly EMI", format: (val) => val },
    { key: "totalInterest", label: "Total Interest", format: (val) => val },
  ];

  const getBestValue = (key) => {
    if (
      key === "interestRate" ||
      key === "processingFee" ||
      key === "totalInterest"
    ) {
      return Math.min(
        ...banks?.map((b) => parseFloat(b?.[key]?.replace(/[^0-9.]/g, "") || 0))
      );
    }
    if (key === "loanAmount") {
      return Math.max(
        ...banks?.map((b) => parseFloat(b?.[key]?.replace(/[^0-9.]/g, "") || 0))
      );
    }
    return null;
  };

  const isBestValue = (bank, key) => {
    const bestValue = getBestValue(key);
    if (bestValue === null) return false;
    const currentValue = parseFloat(bank?.[key]?.replace(/[^0-9.]/g, "") || 0);
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
              {banks?.map((bank, index) => (
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
                {banks?.map((bank, bankIndex) => (
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
