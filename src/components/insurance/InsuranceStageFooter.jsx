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
  onDiscard,
  onClear,
  isSaving,
  mode = "create",
}) => {
  const currentStepDisplay = Number(displayStep || activeStep || 1);
  const computedIsLastStep =
    typeof isLastStep === "boolean"
      ? isLastStep
      : currentStepDisplay === Number(totalSteps || 9);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[930] border-t border-slate-200 bg-white py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-[1920px] items-center justify-between px-4 sm:px-6 md:px-8">
        {/* Left — step indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600">
            Step {currentStepDisplay} / {totalSteps}
          </div>
          <span className="hidden text-[11px] text-slate-400 sm:inline">
            Ctrl+S to Quick Save
          </span>
        </div>

        {/* Right — action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onClear}
            className="h-9 border-slate-200 px-4 text-[12px] text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            Clear Form
          </Button>

          <Button
            variant="outline"
            onClick={onDiscard}
            className="h-9 border-red-100 px-4 text-[12px] text-red-500 hover:bg-red-50"
          >
            Discard
          </Button>

          <div className="mx-1 h-5 w-px bg-slate-200" />

          <Button
            variant="outline"
            onClick={onExit}
            disabled={isSaving}
            className="h-9 border-emerald-200 bg-emerald-50 px-4 text-[12px] text-emerald-700 hover:bg-emerald-100"
          >
            {isSaving ? "Saving…" : "Save & Exit"}
          </Button>

          <Button
            variant="default"
            onClick={onNext}
            loading={isSaving && !computedIsLastStep}
            className="h-9 min-w-[130px] bg-blue-600 px-5 text-[12px] font-semibold text-white hover:bg-blue-700"
          >
            {computedIsLastStep ? (
              mode === "edit" ? "Update Case" : "Complete Case"
            ) : (
              <div className="flex items-center gap-1.5">
                Next Step
                <Icon name="ArrowRight" size={14} />
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InsuranceStageFooter;
