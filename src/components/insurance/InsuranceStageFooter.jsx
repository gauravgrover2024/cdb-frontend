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
    <div className="fixed bottom-0 left-0 right-0 z-[930] border-t border-slate-200 bg-white/98 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1920px] flex-col gap-2.5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between md:px-8">
        {/* Left — step indicator */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 sm:text-sm">
            Step {currentStepDisplay} / {totalSteps}
          </div>
          <span className="hidden text-xs text-slate-400 sm:inline">
            Ctrl+S to Quick Save
          </span>
        </div>

        {/* Right — action buttons */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          <Button
            variant="outline"
            onClick={onClear}
            className="h-10 rounded-xl border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          >
            Clear Form
          </Button>

          <Button
            variant="outline"
            onClick={onDiscard}
            className="h-10 rounded-xl border-red-100 px-4 text-sm text-red-500 hover:bg-red-50"
          >
            Discard
          </Button>

          <div className="hidden sm:mx-1 sm:block sm:h-6 sm:w-px sm:bg-slate-200" />

          <Button
            variant="outline"
            onClick={onExit}
            disabled={isSaving}
            className="h-10 rounded-xl border-emerald-200 bg-emerald-50 px-4 text-sm text-emerald-700 hover:bg-emerald-100"
          >
            {isSaving ? "Saving..." : "Save & Exit"}
          </Button>

          <Button
            variant="default"
            onClick={onNext}
            loading={isSaving && !computedIsLastStep}
            className="h-10 min-w-[144px] rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
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
