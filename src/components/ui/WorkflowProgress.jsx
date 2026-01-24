import React from "react";
import Icon from "../AppIcon";

const WorkflowProgress = ({ currentStage, stages }) => {
  const defaultStages = [
    { id: 1, label: "Customer Profile", status: "completed" },
    { id: 2, label: "Pre-File", status: "completed" },
    { id: 3, label: "Multi-Bank Approval", status: "current" },
    { id: 4, label: "Post-File", status: "pending" },
    { id: 5, label: "Vehicle Delivery", status: "pending" },
  ];

  const workflowStages = stages || defaultStages;

  const getStageIcon = (status) => {
    switch (status) {
      case "completed":
        return "CheckCircle2";
      case "current":
        return "Circle";
      case "pending":
        return "Circle";
      default:
        return "Circle";
    }
  };

  return (
    <div className="workflow-progress">
      {workflowStages?.map((stage, index) => (
        <React.Fragment key={stage?.id}>
          <div className="workflow-step">
            <div className={`workflow-step-indicator ${stage?.status}`}>
              {stage?.status === "completed" ? (
                <Icon name="Check" size={16} />
              ) : (
                <span>{stage?.id}</span>
              )}
            </div>
            <span
              className={`workflow-step-label ${
                stage?.status === "current" ? "current" : ""
              } hidden md:inline`}
            >
              {stage?.label}
            </span>
          </div>
          {index < workflowStages?.length - 1 && (
            <div
              className={`workflow-connector ${
                stage?.status === "completed" ? "completed" : ""
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default WorkflowProgress;
