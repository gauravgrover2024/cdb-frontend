import React from "react";
import { Users } from "lucide-react";

const PartnerCard = ({ bank, index }) => {
  return (
    <div className="rounded-xl border text-card-foreground shadow-sm bg-white dark:bg-card border-border flex flex-col">
      <div className="p-5 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-primary/10 dark:bg-primary/20">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
            Top Partner #{index + 1}
          </p>
          <p className="text-lg font-bold text-foreground truncate">{bank.name}</p>
        </div>
      </div>
      <div className="mt-auto border-t border-border p-4 bg-muted/20 flex justify-between items-center rounded-b-xl">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground font-medium">Volume</span>
          <span className="text-xs font-bold font-mono">₹{(bank.volume / 100000).toFixed(1)} L</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-muted-foreground font-medium">Cases</span>
          <span className="text-xs font-bold">{bank.count}</span>
        </div>
      </div>
    </div>
  );
};

export default PartnerCard;
