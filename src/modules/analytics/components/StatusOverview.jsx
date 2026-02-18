import React from "react";
import Icon from "../../../components/AppIcon";

const StatusOverview = ({ statusData }) => {
  const getStatusColor = (status) => {
    const s = status.toLowerCase();
    if (["disbursed", "approved", "completed"].some((st) => s.includes(st))) {
      return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400";
    }
    if (["rejected", "declined", "failed"].some((st) => s.includes(st))) {
      return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400";
    }
    if (["pending", "submitted", "in progress"].some((st) => s.includes(st))) {
      return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400";
    }
    return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400";
  };

  return (
    <div className="bg-white dark:bg-card border border-border rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="BarChart3" size={18} className="text-primary" />
        <h3 className="text-lg font-bold text-foreground">Status Overview</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {statusData.map((item, idx) => (
          <div
            key={idx}
            className={`border rounded-lg p-4 flex flex-col items-center justify-center ${getStatusColor(
              item.status
            )}`}
          >
            <span className="text-2xl font-bold mb-1">{item.count}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-center">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusOverview;
