// src/components/insurance/InsuranceStageFooter.jsx
import React from "react";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";

const InsuranceStageFooter = ({
  activeStep,
  displayStep,
  totalSteps = 9,
  isLastStep,
  onNext,
  onBack,
  onSave,
  onExit,
  isSaving,
  mode = "create",
}) => {
  const currentStepDisplay = Number(displayStep || activeStep || 1);
  const computedIsLastStep =
    typeof isLastStep === "boolean"
      ? isLastStep
      : currentStepDisplay === Number(totalSteps || 9);
  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round((currentStepDisplay / Number(totalSteps || 1)) * 100)),
  );

  return (
    <div className="insurance-footer-shell fixed bottom-0 left-0 right-0 z-[930] border-t border-border bg-background/95 backdrop-blur-xl shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
      <div className="w-full px-3 py-2.5 sm:px-4 md:px-6 md:py-3.5">
        <div className="insurance-footer-progress-track mb-2 h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800">
          <div
            className="insurance-footer-progress-fill h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              background: "linear-gradient(90deg, #2563eb, #0ea5e9)",
            }}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="insurance-footer-step-chip inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <Icon name="Info" size={13} />
              Step {currentStepDisplay}/{totalSteps}
            </div>
            <span className="hidden sm:inline">Progress: {progressPercent}% • Ctrl/Cmd+S to save</span>
          </div>

          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onExit}
              className="insurance-footer-btn insurance-footer-btn-exit max-sm:flex-1 max-sm:justify-center border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <Icon name="LogOut" size={16} style={{ marginRight: 6 }} />
              Exit
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="insurance-footer-btn insurance-footer-btn-save max-sm:flex-1 max-sm:justify-center border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            >
              <Icon name="Save" size={16} style={{ marginRight: 6 }} />
              {isSaving ? "Saving..." : "Save Progress"}
            </Button>

            <div className="mx-1 hidden h-6 w-px bg-border max-sm:hidden" />

            {activeStep > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="insurance-footer-btn insurance-footer-btn-back max-sm:flex-1 max-sm:justify-center border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                <Icon name="ArrowLeft" size={16} style={{ marginRight: 6 }} />
                Back
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={onNext}
              loading={isSaving && computedIsLastStep}
              className="insurance-footer-btn insurance-footer-btn-next max-sm:flex-1 max-sm:justify-center border-none text-white shadow-md"
              style={{
                background: computedIsLastStep
                  ? "linear-gradient(90deg, #059669, #10b981)"
                  : "linear-gradient(90deg, #2563eb, #0ea5e9)",
                boxShadow: "0 10px 20px rgba(37,99,235,0.22)",
              }}
            >
              {computedIsLastStep ? (
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
