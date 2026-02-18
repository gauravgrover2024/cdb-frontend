import React, { useState } from "react";
import { CheckCircleFilled, ClockCircleOutlined } from "@ant-design/icons";
import { Timeline, Tooltip } from "antd";

// Steps for the Customer Creation Form
const steps = [
  {
    key: "profile",
    label: "Customer Profile",
    details: [
      { name: "Personal Details", key: "personal" },
      { name: "Employment Details", key: "employment" },
      { name: "Income Details", key: "income" },
      { name: "Bank Details", key: "bank" },
      { name: "Reference Details", key: "references" },
      { name: "KYC Details", key: "kyc" },
    ],
  },
];

export default function CustomerStepperSidebar({ 
  currentStep = "profile", 
  activeSection, 
  completedSections = [], 
  sectionStatus = {},
  onSectionClick,
  isCollapsed = false,
  onCollapseToggle
}) {
  const [openKey, setOpenKey] = useState("profile");

  // Helper to get status for a section (detail)
  const getSectionStatus = (stepKey, detail) => {
    const detailKey = detail.key;
    if (activeSection === detailKey) return "In Progress";
    if (completedSections.includes(detailKey) || sectionStatus[detailKey] === true) return "Completed";
    if (sectionStatus[detailKey] === "Rejected") return "Rejected";
    return "Pending";
  };

  const handleStepClick = (stepKey, isDisabled) => {
    if (isDisabled) return;
    if (isCollapsed) onCollapseToggle?.(false); 
    setOpenKey(openKey === stepKey ? null : stepKey);
  };

  return (
    <div 
      className={`bg-background border-r border-border min-h-full py-4 flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16 items-center px-2" : "w-64 pr-2"
      }`}
    >

      <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
        {steps.map((step) => {
          const isStepActive = currentStep === step.key;
          const isDisabled = step.disabled ?? false;
          const isOpen = openKey === step.key;

          return (
            <div key={step.key} className="mb-2">
              <Tooltip title={isCollapsed ? step.label : ""} placement="right">
                <div
                  className={`flex items-center gap-3 rounded-xl cursor-pointer transition-all relative overflow-hidden
                    ${isCollapsed ? "justify-center p-3 h-12 w-12 mx-auto" : "px-4 py-3"}
                    ${
                      isStepActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-bold"
                        : isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : "text-muted-foreground hover:bg-muted/60"
                    }
                  `}
                  onClick={() => handleStepClick(step.key, isDisabled)}
                >
                  {isStepActive && <div className={`absolute left-0 top-0 bottom-0 bg-primary-foreground/50 ${isCollapsed ? 'w-1' : 'w-1'}`} />}
                  
                  <div className="flex-shrink-0 flex items-center justify-center">
                    {isStepActive ? (
                      <ClockCircleOutlined className="text-primary-foreground" style={{ fontSize: isCollapsed ? 18 : 14 }} />
                    ) : (
                      <CheckCircleFilled className="text-muted-foreground/40 text-[18px]" style={{ fontSize: isCollapsed ? 18 : 16 }} />
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

              {/* Inline Timeline */}
              {isOpen && step.details && step.details.length > 0 && (
                <div className={`transition-all duration-300 ${isCollapsed ? "mt-2 flex justify-center" : "bg-muted/20 border border-border/50 rounded-xl mt-2 p-3 ml-1 shadow-sm"}`}>
                  <Timeline
                    className={`custom-timeline ${isCollapsed ? "collapsed-timeline" : ""}`}
                    items={step.details.map((detail) => {
                      const status = getSectionStatus(step.key, detail);
                      const isDetailActive = activeSection === detail.key;
                      const isCompleted = status === "Completed";
                      const isRejected = status === "Rejected";
                      
                      return {
                        dot: isRejected ? (
                          <div className="w-3 h-3 rounded-full bg-destructive flex items-center justify-center border-2 border-background shadow-lg shadow-destructive/20">
                              <div className="w-1 h-1 bg-white rounded-full" />
                          </div>
                        ) : isCompleted ? (
                          <CheckCircleFilled className="text-emerald-500" style={{ fontSize: isCollapsed ? "16px" : "14px" }} />
                        ) : isDetailActive ? (
                          <div className="relative flex items-center justify-center w-3 h-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                          </div>
                        ) : (
                          <div className={`rounded-full border-2 border-muted-foreground/30 bg-background ${isCollapsed ? 'w-3 h-3' : 'w-2 h-2'}`} />
                        ),
                        children: !isCollapsed ? (
                          <div 
                            className={`cursor-pointer -mt-1 pb-3 transition-all duration-200 flex items-center gap-2 ${
                              isDetailActive 
                                ? "text-primary font-bold translate-x-1" 
                                : isRejected
                                ? "text-destructive font-medium"
                                : isCompleted 
                                ? "text-foreground font-medium" 
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSectionClick) onSectionClick(detail.key);
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
