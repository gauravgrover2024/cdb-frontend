import React, { useState } from "react";
import Icon from "../../../../../../components/AppIcon";
import Button from "../../../../../../components/ui/Button";

const BankDetailsModal = ({ bank, onClose, onUpdateStatus }) => {
  const [activeTab, setActiveTab] = useState("timeline");

  if (!bank) return null;

  const tabs = [
    { id: "timeline", label: "Timeline", icon: "Clock" },
    { id: "documents", label: "Documents", icon: "FileText" },
    { id: "conditions", label: "Conditions", icon: "CheckSquare" },
    { id: "communication", label: "Communication", icon: "MessageSquare" },
  ];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "text-success";
      case "pending":
        return "text-warning";
      case "rejected":
        return "text-error";
      case "completed":
        return "text-success";
      default:
        return "text-muted-foreground";
    }
  };

  const renderTimeline = () => (
    <div className="space-y-4">
      {bank?.timeline?.map((event, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                event?.status === "completed" ? "bg-success/10" : "bg-muted"
              }`}
            >
              <Icon
                name={event?.status === "completed" ? "CheckCircle2" : "Circle"}
                size={16}
                className={getStatusColor(event?.status)}
              />
            </div>
            {index < bank?.timeline?.length - 1 && (
              <div className="w-0.5 h-full bg-border mt-2" />
            )}
          </div>
          <div className="flex-1 pb-6">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h4 className="text-sm md:text-base font-semibold text-foreground">
                {event?.title}
              </h4>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {event?.date}
              </span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mb-2">
              {event?.description}
            </p>
            {event?.user && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon name="User" size={12} />
                <span>{event?.user}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-3">
      {bank?.documents?.map((doc, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 md:p-4 bg-muted/30 rounded-lg border border-border"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                doc?.status === "uploaded" ? "bg-success/10" : "bg-warning/10"
              }`}
            >
              <Icon
                name={doc?.status === "uploaded" ? "FileCheck" : "FileWarning"}
                size={20}
                className={
                  doc?.status === "uploaded" ? "text-success" : "text-warning"
                }
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm md:text-base font-medium text-foreground truncate">
                {doc?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {doc?.status === "uploaded"
                  ? `Uploaded: ${doc?.uploadDate}`
                  : "Pending upload"}
              </p>
            </div>
          </div>
          {doc?.status === "uploaded" ? (
            <Button variant="ghost" iconName="Download" size="sm">
              Download
            </Button>
          ) : (
            <Button variant="outline" iconName="Upload" size="sm">
              Upload
            </Button>
          )}
        </div>
      ))}
    </div>
  );

  const renderConditions = () => (
    <div className="space-y-3">
      {bank?.approvalConditions?.map((condition, index) => (
        <div
          key={index}
          className="flex items-start gap-3 p-3 md:p-4 bg-muted/30 rounded-lg border border-border"
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              condition?.met ? "bg-success/10" : "bg-warning/10"
            }`}
          >
            <Icon
              name={condition?.met ? "Check" : "Clock"}
              size={14}
              className={condition?.met ? "text-success" : "text-warning"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm md:text-base font-medium text-foreground mb-1">
              {condition?.title}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              {condition?.description}
            </p>
            {condition?.dueDate && !condition?.met && (
              <div className="flex items-center gap-2 mt-2 text-xs text-warning">
                <Icon name="Calendar" size={12} />
                <span>Due: {condition?.dueDate}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderCommunication = () => (
    <div className="space-y-4">
      {bank?.communications?.map((comm, index) => (
        <div key={index} className="flex gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon name="User" size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="text-sm md:text-base font-semibold text-foreground">
                  {comm?.from}
                </p>
                <p className="text-xs text-muted-foreground">{comm?.role}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {comm?.date}
              </span>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 md:p-4 border border-border">
              <p className="text-xs md:text-sm text-foreground whitespace-pre-line">
                {comm?.message}
              </p>
            </div>
            {comm?.attachments && comm?.attachments?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {comm?.attachments?.map((attachment, attIndex) => (
                  <div
                    key={attIndex}
                    className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-md border border-border text-xs"
                  >
                    <Icon
                      name="Paperclip"
                      size={12}
                      className="text-muted-foreground"
                    />
                    <span className="text-foreground">{attachment}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card rounded-lg shadow-elevation-4 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon name="Building2" size={24} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg md:text-xl font-semibold text-foreground truncate">
                {bank?.bankName}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Application ID:{" "}
                <span className="font-mono">{bank?.applicationId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="border-b border-border overflow-x-auto">
          <div className="flex gap-1 p-2 min-w-max">
            {tabs?.map((tab) => (
              <button
                key={tab?.id}
                onClick={() => setActiveTab(tab?.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab?.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon name={tab?.icon} size={16} />
                <span>{tab?.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === "timeline" && renderTimeline()}
          {activeTab === "documents" && renderDocuments()}
          {activeTab === "conditions" && renderConditions()}
          {activeTab === "communication" && renderCommunication()}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 p-4 md:p-6 border-t border-border">
          <Button
            variant="outline"
            iconName="MessageSquare"
            iconPosition="left"
            fullWidth
          >
            Add Note
          </Button>
          <Button
            variant="default"
            iconName="RefreshCw"
            iconPosition="left"
            fullWidth
            onClick={() => onUpdateStatus(bank)}
          >
            Update Status
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BankDetailsModal;
