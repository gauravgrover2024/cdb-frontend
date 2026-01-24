import React, { useState } from "react";
import Icon from "../AppIcon";
import Button from "./Button";

const CaseContextHeader = ({ caseData }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const defaultCaseData = {
    caseId: "DSA-2025-001234",
    customerName: "Rajesh Kumar",
    vehicleModel: "Maruti Suzuki Swift VXI",
    currentStage: "Multi-Bank Approval",
    loanAmount: "₹8,50,000",
    approvalStatus: "In Progress",
    lastUpdated: "23 Dec 2025, 08:09 AM",
  };

  const data = caseData || defaultCaseData;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-success text-success-foreground";
      case "in progress":
        return "bg-warning text-warning-foreground";
      case "rejected":
        return "bg-error text-error-foreground";
      case "pending":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="case-context-header">
      <div className="case-context-container">
        <div className="case-context-info">
          <div className="case-context-section">
            <span className="case-context-label">Case ID</span>
            <span className="case-context-value data">{data?.caseId}</span>
          </div>

          <div className="hidden md:block w-px h-8 bg-border" />

          <div className="case-context-section">
            <span className="case-context-label">Customer</span>
            <span className="case-context-value">{data?.customerName}</span>
          </div>

          {(isExpanded || window.innerWidth >= 768) && (
            <>
              <div className="hidden md:block w-px h-8 bg-border" />

              <div className="case-context-section">
                <span className="case-context-label">Vehicle</span>
                <span className="case-context-value">{data?.vehicleModel}</span>
              </div>

              <div className="hidden lg:block w-px h-8 bg-border" />

              <div className="case-context-section hidden lg:flex">
                <span className="case-context-label">Current Stage</span>
                <span className="case-context-value">{data?.currentStage}</span>
              </div>

              <div className="hidden lg:block w-px h-8 bg-border" />

              <div className="case-context-section hidden lg:flex">
                <span className="case-context-label">Loan Amount</span>
                <span className="case-context-value data">
                  {data?.loanAmount}
                </span>
              </div>

              <div className="hidden lg:block w-px h-8 bg-border" />

              <div className="case-context-section hidden lg:flex">
                <span className="case-context-label">Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium ${getStatusColor(
                    data?.approvalStatus
                  )}`}
                >
                  <Icon name="Circle" size={8} />
                  {data?.approvalStatus}
                </span>
              </div>
            </>
          )}

          <button
            onClick={toggleExpand}
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors duration-250"
          >
            <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={20} />
          </button>
        </div>

        <div className="case-context-actions">
          <Button
            variant="outline"
            iconName="FileText"
            iconPosition="left"
            size="sm"
          >
            Documents
          </Button>
          <Button
            variant="outline"
            iconName="MessageSquare"
            iconPosition="left"
            size="sm"
          >
            Notes
          </Button>
          <Button
            variant="default"
            iconName="Save"
            iconPosition="left"
            size="sm"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CaseContextHeader;
