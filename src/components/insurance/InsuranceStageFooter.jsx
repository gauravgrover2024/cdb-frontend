// src/components/insurance/InsuranceStageFooter.jsx
import React from "react";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";

const InsuranceStageFooter = ({
  activeStep,
  onNext,
  onBack,
  onSave,
  onExit,
  isSaving,
  mode = "create",
}) => {
  const isLastStep = activeStep === 8;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[930] border-t border-border bg-white/80 backdrop-blur-xl shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:bg-slate-950/80">
      <div className="w-full px-3 sm:px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          {/* Left side - Component Info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon name="Info" size={14} />
            <span>
              Step:{" "}
              <span className="font-semibold text-foreground">
                {activeStep} of 8
              </span>
            </span>
          </div>

          {/* Right side - Action buttons */}
          <div className="w-full sm:w-auto flex items-center justify-end gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={onExit}
              className="border-slate-400 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
            >
              <Icon name="LogOut" size={16} style={{ marginRight: 6 }} />
              Exit
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <Icon name="Save" size={16} style={{ marginRight: 6 }} />
              {isSaving ? "Saving..." : "Save Progress"}
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            {activeStep > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="border-slate-300 dark:border-slate-700"
              >
                <Icon name="ArrowLeft" size={16} style={{ marginRight: 6 }} />
                Back
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={onNext}
              loading={isSaving && isLastStep}
              className={`${
                isLastStep
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
              } text-white border-none shadow-lg`}
            >
              {isLastStep ? (
                <>
                  <Icon name="CheckCircle" size={16} style={{ marginRight: 6 }} />
                  {mode === "edit" ? "Update Case" : "Complete Case"}
                </>
              ) : (
                <>
                  Next Step
                  <Icon name="ArrowRight" size={16} style={{ marginLeft: 6 }} />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsuranceStageFooter;
