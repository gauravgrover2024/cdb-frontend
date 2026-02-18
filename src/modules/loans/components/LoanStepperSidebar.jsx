import React, { useState, useEffect, useMemo } from "react";
import { CheckCircleFilled, ClockCircleOutlined } from "@ant-design/icons";
import { Timeline, Tooltip } from "antd";
import Icon from "../../../components/AppIcon";

// Steps from the actual loan form logic
const ALL_STEPS = [
  {
    key: "profile",
    label: "Customer Profile",
    details: [
      { name: "Lead Details", key: "lead" },
      { name: "Vehicle Details", key: "vehicle" },
      { name: "Finance Details", key: "finance" },
      { name: "Personal Details", key: "personal" },
      { name: "Employment Details", key: "employment" },
      { name: "Income Details", key: "income" },
      { name: "Bank Details", key: "bank" },
      { name: "Reference Details", key: "references" },
      { name: "KYC Details", key: "kyc" },
    ],
  },
  {
    key: "prefile",
    label: "Pre-File",
    details: [
      { name: "Personal Details (Pre-File)", key: "personal_pre" },
      { name: "Occupational Details", key: "occupational" },
      { name: "Income & Banking Details", key: "income_banking" },
      { name: "Vehicle Pricing & Loan Details", key: "vehicle_loan" },
      { name: "Section 7 Record Details", key: "section7" },
      { name: "Co-Applicant Section", key: "co_applicant" },
      { name: "Guarantor Section", key: "guarantor" },
      { name: "Authorised Signatory Section", key: "auth_signatory" },
      { name: "Bulk Loan Creation", key: "bulk_loan" },
    ],
  },
  {
    key: "approval",
    label: "Loan Approval",
    details: [{ name: "Loan Approval Step", key: "approval" }],
  },
  {
    key: "postfile",
    label: "Post-File",
    details: [{ name: "Post File Step", key: "post_file" }],
  },
  {
    key: "delivery",
    label: "Vehicle Delivery",
    details: [{ name: "Vehicle Delivery Step", key: "delivery" }],
  },
  {
    key: "payout",
    label: "Payout",
    details: [{ name: "Payout Section", key: "payout" }],
  },
];

export default function LoanStepperSidebar({ 
  currentStep, 
  completedSteps = [], 
  sectionStatus = {}, 
  onSectionClick,
  onStageClick,
  isCollapsed,
  onCollapseToggle,
  isFinanced,
  loanType // NEW: Loan type for conditional step filtering
}) {
  const [openKey, setOpenKey] = useState(null);

  /**
   * CONDITIONAL STEP FILTERING
   * 
   * Filter steps based on Finance toggle and loan type:
   * 
   * 1. CASH CASE (isFinanced === "No"):
   *    - Shows only: profile, delivery, payout
   *    - Skips: prefile, approval, disbursement, postfile
   *    - Reason: No loan processing needed for cash purchases
   * 
   * 2. REFINANCE / CAR CASH-IN:
   *    - Filters out: delivery step
   *    - Reason: These loan types don't involve new vehicle delivery
   *    - Refinance: Existing vehicle loan refinancing
   *    - Car Cash-in: Cash loan against existing vehicle
   * 
   * 3. DEFAULT (Financed: Yes, Other loan types):
   *    - Shows all steps: profile → prefile → approval → disbursement → postfile → delivery → payout
   */
  // Filter steps based on Finance toggle and loan type
  const steps = useMemo(() => {
    if (isFinanced === "No") {
      // Cash Case: Skip loan processing steps
      return ALL_STEPS.filter(step => ["profile", "delivery", "payout"].includes(step.key));
    }
    // Refinance or Car Cash-in: Skip delivery step
    if (loanType === "Refinance" || loanType === "Car Cash-in") {
      return ALL_STEPS.filter(step => step.key !== "delivery");
    }
    // Default / Yes: Show all steps
    return ALL_STEPS;
  }, [isFinanced, loanType]);

  // Sync openKey with currentStep
  useEffect(() => {
    if (currentStep) {
      setOpenKey(currentStep);
    }
  }, [currentStep]);

  const handleStepClick = (stepKey, isDisabled) => {
    if (isDisabled) return;
    if (isCollapsed) {
      onCollapseToggle?.();
      setOpenKey(stepKey);
      onStageClick?.(stepKey);
      return;
    }
    
    // If clicking the current stage, just toggle the accordion
    if (stepKey === openKey) {
      setOpenKey(null);
    } else {
      setOpenKey(stepKey);
    }
    
    // Also navigate to that stage
    onStageClick?.(stepKey);
  };

  return (
    <div 
      className={`bg-background border-r border-border min-h-full py-4 flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16 items-center px-2" : "w-64 pr-2"
      }`}
    >
      {/* Toggle Button at Top */}
      <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-end'} mb-3 px-2`}>
        <button 
          onClick={() => onCollapseToggle?.()}
          className="w-8 h-8 rounded-lg hover:bg-primary/10 flex items-center justify-center text-foreground hover:text-primary transition-colors border border-primary/30 hover:border-primary shadow-sm bg-background"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <Icon name={isCollapsed ? "PanelRightOpen" : "PanelLeftClose"} size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
        {steps.map((step) => {
          const isStepActive = currentStep === step.key;
          const isStepCompleted = completedSteps.includes(step.key);
          const isDisabled = step.disabled ?? false;
          const isOpen = openKey === step.key; 
          
          let foundActive = false;
          const isStepRejected = (step.key === 'approval' && sectionStatus.approval_status === 'Rejected');

          return (
            <div key={step.key} className="mb-2">
              <Tooltip title={isCollapsed ? step.label : ""} placement="right">
                <div
                  className={`flex items-center gap-3 rounded-xl cursor-pointer transition-all relative overflow-hidden
                    ${isCollapsed ? "justify-center p-3 h-12 w-12 mx-auto" : "px-4 py-3"}
                    ${
                      isStepActive
                        ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shadow-md shadow-blue-500/20 font-bold border border-blue-300 dark:border-blue-700"
                        : isStepCompleted
                        ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
                        : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900"
                    }
                  `}
                  onClick={() => handleStepClick(step.key, isDisabled)}
                >
                  {isStepActive && <div className={`absolute left-0 top-0 bottom-0 bg-primary-foreground/50 ${isCollapsed ? 'w-1' : 'w-1'}`} />}

                  <div className="flex-shrink-0 flex items-center justify-center">
                    {isStepActive ? (
                      <ClockCircleOutlined className="text-blue-500" style={{ fontSize: isCollapsed ? 18 : 14 }} />
                    ) : isStepCompleted ? (
                      <CheckCircleFilled className="text-green-500" style={{ fontSize: isCollapsed ? 18 : 16 }} />
                    ) : (
                      <div className={`rounded-full border-2 border-red-500 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                    )}
                  </div>
                  
                  {!isCollapsed && (
                    <>
                      <span className="truncate flex-1 text-sm">{step.label}</span>
                      {step.details && step.details.length > 0 && (
                        <span className={`text-[10px] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                          {isOpen ? "▲" : "▼"}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </Tooltip>

              {/* Sub-steps (Timeline) - Show when open OR when collapsed (for tracking lines) */}
              {(isOpen || isCollapsed) && step.details && step.details.length > 0 && (
                <div className={`transition-all duration-300 ${isCollapsed ? "mt-2 flex justify-center" : "bg-muted/20 border border-border/50 rounded-xl mt-2 p-3 ml-1 shadow-sm"}`}>
                  <Timeline
                    className={`custom-timeline ${isCollapsed ? "collapsed-timeline" : ""}`}
                    items={step.details.map((detail) => {
                      const detailKey = detail.key;
                      const sectionKey = `${step.key}.${detailKey}`;
                      const isCompleted = sectionStatus[sectionKey] === true;
                      const isRejected = sectionStatus[sectionKey] === "Rejected";
                      
                      let isActive = false;
                      if (isStepActive && !isCompleted && !isRejected && !foundActive) {
                          isActive = true;
                          foundActive = true;
                      }

                      return {
                        dot: isRejected ? (
                          <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20 border-2 border-background">
                            <div className="w-1 h-1 bg-white rounded-full" />
                          </div>
                        ) : isCompleted ? (
                          <CheckCircleFilled className="text-green-500" style={{ fontSize: isCollapsed ? "16px" : "14px" }} />
                        ) : isActive ? (
                          <div className="relative flex items-center justify-center w-3 h-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400/40 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </div>
                        ) : (
                           <div className={`rounded-full border-2 border-red-400/50 bg-background ${isCollapsed ? 'w-3 h-3' : 'w-2 h-2'}`} />
                        ),
                        children: !isCollapsed ? (
                          <div 
                            className={`cursor-pointer -mt-1 pb-3 transition-all duration-200 flex items-center gap-2 ${
                              isActive 
                                ? "text-blue-600 dark:text-blue-400 font-bold translate-x-1" 
                                : isRejected
                                ? "text-red-600 dark:text-red-400 font-medium"
                                : isCompleted 
                                ? "text-green-600 dark:text-green-400 font-medium" 
                                : "text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSectionClick) onSectionClick(detail);
                            }}
                          >
                            <div className="text-xs">{detail.name}</div>
                          </div>
                        ) : null,
                      };
                    })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .custom-timeline .ant-timeline-item-tail {
          border-left: 2px solid var(--border) !important;
          opacity: 0.5;
        }
        .custom-timeline .ant-timeline-item-content {
            margin-left: 16px !important;
            min-height: 24px !important;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .collapsed-timeline .ant-timeline-item-content {
          display: none !important;
        }
        .collapsed-timeline .ant-timeline-item-tail {
          left: 50% !important;
          transform: translateX(-50%);
        }
        .collapsed-timeline .ant-timeline-item-head {
          left: 50% !important;
          transform: translateX(-50%);
        }
      `}</style>
    </div>
  );
}
