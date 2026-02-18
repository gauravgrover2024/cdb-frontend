import React from "react";
import Icon from "../../../components/AppIcon";

const LoanTypeBreakdown = ({ loanTypes }) => {
  return (
    <div className="bg-white dark:bg-card border border-border rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="PieChart" size={18} className="text-primary" />
        <h3 className="text-lg font-bold text-foreground">Loan Type Breakdown</h3>
      </div>
      <div className="space-y-3">
        {loanTypes.map((type, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-medium text-foreground">{type.name || "Unknown"}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground font-mono">
                ₹{(type.volume / 100000).toFixed(1)} L
              </span>
              <span className="text-sm font-bold text-foreground">{type.count}</span>
            </div>
          </div>
        ))}
        {loanTypes.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-4">No loan type data available</p>
        )}
      </div>
    </div>
  );
};

export default LoanTypeBreakdown;
