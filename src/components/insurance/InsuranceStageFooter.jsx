// src/components/insurance/InsuranceStageFooter.jsx
import React from "react";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";

/** Opaque footer bar; button row matches loan-style actions */
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
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[930] border-t border-border bg-transparent backdrop-blur-xl shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="w-full px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4 md:px-6 md:py-4 md:pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <Icon name="Info" size={14} />
              <span>
                Stage:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {currentStepDisplay}
                </span>
                <span className="text-muted-foreground"> / </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {totalSteps}
                </span>
              </span>
              <span className="hidden text-muted-foreground sm:inline">
                · Ctrl+S quick save
              </span>
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={onClear}
                className="h-9 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700/60 dark:text-amber-300 dark:hover:bg-amber-900/20"
              >
                <Icon name="Eraser" size={16} style={{ marginRight: 6 }} />
                Clear Form
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onDiscard}
                className="h-9 border-destructive/40 text-destructive hover:bg-destructive/10 dark:border-destructive/30 dark:text-destructive/90 dark:hover:bg-destructive/20"
              >
                <Icon name="X" size={16} style={{ marginRight: 6 }} />
                Discard
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onExit}
                disabled={isSaving}
                className="h-9 border-gray-400 text-gray-500 hover:bg-gray-100 dark:border-border dark:text-muted-foreground dark:hover:bg-muted/80"
              >
                <Icon name="LogOut" size={16} style={{ marginRight: 6 }} />
                {isSaving ? "Saving..." : "Exit"}
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={onNext}
                loading={isSaving && !computedIsLastStep}
                className={
                  computedIsLastStep
                    ? "h-9 border-none bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                    : "h-9 border-none bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                }
              >
                {computedIsLastStep ? (
                  <>
                    <Icon
                      name={mode === "edit" ? "Save" : "CheckCircle"}
                      size={16}
                      style={{ marginRight: 6 }}
                    />
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
    </>
  );
};

export default InsuranceStageFooter;
