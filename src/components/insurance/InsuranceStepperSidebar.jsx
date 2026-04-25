// src/components/insurance/InsuranceStepperSidebar.jsx
import React from "react";
import { Tooltip } from "antd";
import Icon from "../../components/AppIcon";

const STEPS = [
  { key: 1, label: "Customer Info", icon: "User" },
  { key: 2, label: "Vehicle Details", icon: "Car" },
  { key: 3, label: "Previous Policy", icon: "History" },
  { key: 4, label: "Quotes", icon: "Search" },
  { key: 5, label: "Policy Details", icon: "ShieldCheck" },
  { key: 6, label: "Documents", icon: "Files" },
  { key: 7, label: "Payment", icon: "CreditCard" },
  { key: 8, label: "Payout", icon: "Coins" },
];

export default function InsuranceStepperSidebar({
  activeStep,
  onStepClick,
  isCollapsed,
  onCollapseToggle,
}) {
  return (
    <div
      className={`bg-background border-r border-border min-h-full py-6 flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-20 items-center px-2" : "w-72 pr-3"
      }`}
    >
      {/* Toggle Button */}
      <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-end'} mb-3 px-2`}>
        <button 
          onClick={onCollapseToggle}
          className="w-8 h-8 rounded-lg hover:bg-primary/10 flex items-center justify-center text-foreground hover:text-primary transition-colors border border-primary/30 hover:border-primary shadow-sm bg-background"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <Icon name={isCollapsed ? "PanelRightOpen" : "PanelLeftClose"} size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
        {STEPS.map((step) => {
          const isActive = activeStep === step.key;
          const isCompleted = activeStep > step.key;

          return (
            <div key={step.key} className="mb-2">
              <Tooltip title={isCollapsed ? step.label : ""} placement="right">
                    <div
                      className={`flex items-center gap-4 rounded-xl cursor-pointer transition-all relative overflow-hidden
                        ${isCollapsed ? "justify-center p-4 h-14 w-14 mx-auto" : "px-5 py-4"}
                        ${
                          isActive
                            ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shadow-md shadow-blue-500/20 font-bold border border-blue-300 dark:border-blue-700"
                            : isCompleted
                            ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        }
                      `}
                      onClick={() => onStepClick(step.key)}
                    >
                      {isActive && <div className="absolute left-0 top-0 bottom-0 bg-blue-500 w-1.5" />}
    
                      <div className="flex-shrink-0 flex items-center justify-center">
                        {isActive ? (
                          <Icon name={step.icon} size={isCollapsed ? 22 : 20} className="text-blue-500" />
                        ) : isCompleted ? (
                          <Icon name="CheckCircle" size={isCollapsed ? 22 : 20} className="text-emerald-500" />
                        ) : (
                          <Icon name={step.icon} size={isCollapsed ? 22 : 20} />
                        )}
                      </div>
                      
                      {!isCollapsed && (
                        <span className="truncate flex-1 text-base font-semibold">{step.label}</span>
                      )}
                    </div>
              </Tooltip>
            </div>
          );
        })}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
