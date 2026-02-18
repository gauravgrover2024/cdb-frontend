import React from "react";
import Icon from "../../../components/AppIcon";

const StatCard = ({ title, value, color, iconName }) => {
  const colorMap = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800",
  };

  const iconColorMap = {
    blue: "text-blue-600 dark:text-blue-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    purple: "text-purple-600 dark:text-purple-400",
    rose: "text-rose-600 dark:text-rose-400",
  };

  return (
    <div 
      className={`bg-white dark:bg-card border border-border shadow-sm rounded-xl p-5 flex items-center justify-between group h-full`}
    >
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <p className={`text-2xl font-bold font-mono tracking-tight ${iconColorMap[color]}`}>
          {value}
        </p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${colorMap[color]}`}>
        <Icon name={iconName} size={24} className={iconColorMap[color]} />
      </div>
    </div>
  );
};

export default StatCard;
