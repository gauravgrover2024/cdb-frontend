import React from "react";
import Icon from "../../../components/AppIcon";

const StageDistributionCard = ({ stages }) => {
  const stageColors = {
    profile: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    prefile: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approval: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    postfile: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    delivery: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    payout: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  return (
    <div className="bg-white dark:bg-card border border-border rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="Layers" size={18} className="text-primary" />
        <h3 className="text-lg font-bold text-foreground">Stage Distribution</h3>
      </div>
      <div className="space-y-3">
        {stages.map((stage) => (
          <div key={stage.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div
                className={`px-2 py-1 rounded-lg text-xs font-semibold uppercase ${
                  stageColors[stage.name.toLowerCase()] || "bg-gray-100 text-gray-700"
                }`}
              >
                {stage.name}
              </div>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${stage.percentage}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm font-bold text-foreground">{stage.count}</span>
              <span className="text-xs text-muted-foreground">({stage.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StageDistributionCard;
