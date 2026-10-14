import { Alert, Form, InputNumber, Radio, Button, message, Progress } from "antd";
import { useState } from "react";
import Icon from "../../../../../components/AppIcon";

// Bulk Loan Creation for the Home Loan module, in two parts:
//  - mode="collect" (Profile step): the bulk-loan answers are collected on the
//    original entry, before property details. Locked on split files and on an
//    original that has already been split.
//  - mode="create" (end of Pre-File): splits the saved original into the
//    requested number of loan files once customer/pre-file data is complete.
// Property details are never asked on the original when it is for multiple
// loans - each loan file captures its own after the split.
const BulkLoanCreationSection = ({
  form,
  mode = "collect",
  onProcess,
  disabled = false,
  isSplitFile = false,
  isSplitOriginal = false,
}) => {
  // preserve: in "create" mode these inputs live on the Profile step.
  const isMultipleCars = Form.useWatch("isMultipleCars", { form, preserve: true });
  const numberOfCars = Form.useWatch("numberOfCars", { form, preserve: true });
  const bulkIndex = Form.useWatch("bulkIndex", { form, preserve: true });
  const bulkCount = Form.useWatch("bulkCount", { form, preserve: true });

  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleCreateBulkLoans = async () => {
    if (disabled) return;
    try {
      await form.validateFields();
    } catch (error) {
      message.error("Please fill in all required fields correctly.");
      return;
    }

    if (!numberOfCars || numberOfCars < 2) {
      message.error("Please enter a valid number of loans (minimum 2)");
      return;
    }

    setIsCreating(true);
    setProgress(0);

    // Progress up to 90% while waiting for backend
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 250);

    try {
      const ok = typeof onProcess === "function" ? await onProcess() : false;
      if (!ok) {
        setIsCreating(false);
        setProgress(0);
        return;
      }
      setProgress(100);
      // Let the success animation show for a moment
      setTimeout(() => {
        setIsCreating(false);
      }, 500);
    } catch (error) {
      setIsCreating(false);
      setProgress(0);
      message.error(error?.message || "An error occurred during bulk creation.");
    } finally {
      clearInterval(interval);
    }
  };

  if (mode === "create") {
    return (
      <div className="p-6 bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Icon name="Copy" size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Create Loan Files</h3>
            <p className="text-sm text-muted-foreground">
              Split this entry into {numberOfCars || "multiple"} loan files for the same customer
            </p>
          </div>
        </div>

        <Alert
          message="What happens on split?"
          description={
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex items-start gap-2">
                <Icon name="Check" size={16} className="text-success mt-0.5" />
                <span>This entry becomes loan file 1; the other files are linked to it</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={16} className="text-success mt-0.5" />
                <span>Customer profile, pre-file details, references and KYC documents are copied</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={16} className="text-success mt-0.5" />
                <span>Co-applicants, guarantor and authorised signatory (if any) are copied</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={16} className="text-success mt-0.5" />
                <span>Banks added for comparison are copied to every file</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Info" size={16} className="text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">
                  Property details and loan structure are entered separately in each loan file
                </span>
              </li>
            </ul>
          }
          type="info"
          showIcon
          icon={<Icon name="Info" size={18} />}
          className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30"
        />

        <div className="mt-6 flex flex-col gap-4">
          {isCreating && (
            <div className="bg-violet-50 dark:bg-violet-950/20 p-4 rounded-xl border border-violet-100 dark:border-violet-800/30">
              <div className="flex justify-between text-xs font-bold text-violet-700 dark:text-violet-400 mb-2 uppercase tracking-wider">
                <span>Creating {numberOfCars} loan files...</span>
                <span>{progress > 100 ? 100 : progress}%</span>
              </div>
              <Progress percent={progress > 100 ? 100 : progress} showInfo={false} status="active" strokeColor={{ '0%': '#8b5cf6', '100%': '#4f46e5' }} />
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="primary"
              size="large"
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0 shadow-md shadow-violet-500/20 flex items-center justify-center gap-2 font-semibold h-12 px-10 rounded-full text-base"
              onClick={handleCreateBulkLoans}
              loading={isCreating}
              disabled={disabled}
            >
              {!isCreating && <Icon name="Copy" size={20} className="text-white" />}
              <span>Create {numberOfCars || ""} Loan Files</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      {isSplitFile && (
        <Alert
          message={`Loan file ${bulkIndex || "?"} of ${bulkCount || "?"} - split from an original entry`}
          description="Bulk loan fields come from the original entry and can't be changed here. Enter this file's own property details below."
          type="warning"
          showIcon
          icon={<Icon name="Info" size={18} />}
        />
      )}
      {isSplitOriginal && !isSplitFile && (
        <Alert
          message={`This entry has been split into ${bulkCount || "multiple"} loan files (this is file 1)`}
          description="Bulk loan fields are locked. Enter this file's own property details below."
          type="info"
          showIcon
          icon={<Icon name="Info" size={18} />}
        />
      )}

      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30 p-5">
        <div className="flex items-start gap-3 mb-4">
          <Icon name="HelpCircle" size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm text-blue-900 dark:text-blue-300 mb-1">
              Is the customer applying for multiple loans?
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              If yes, this entry is split into one loan file per loan at the end of Pre-File
            </p>
          </div>
        </div>

        <Form.Item name="isMultipleCars" className="mb-0">
          <Radio.Group disabled={disabled} className="flex gap-3">
            <div className="flex-1 p-3 rounded-lg border-2 border-transparent has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-950/30 transition-all cursor-pointer">
              <Radio value={false} className="w-full">
                <span className="font-medium text-foreground">No - Single Loan</span>
              </Radio>
            </div>
            <div className="flex-1 p-3 rounded-lg border-2 border-transparent has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-950/30 transition-all cursor-pointer">
              <Radio value={true} className="w-full">
                <span className="font-medium text-foreground">Yes - Multiple Loans</span>
              </Radio>
            </div>
          </Radio.Group>
        </Form.Item>
      </div>

      {isMultipleCars && (
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/30 p-5">
          <div className="flex items-start gap-3 mb-4">
            <Icon name="Hash" size={20} className="text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm text-amber-900 dark:text-amber-300 mb-1">
                How many loan files to create?
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Enter the total number of loans, including this one (maximum 50)
              </p>
            </div>
          </div>

          <Form.Item
            name="numberOfCars"
            className="mb-0"
            rules={
              disabled
                ? []
                : [
                    { required: true, message: "Please enter number of loans" },
                    { type: "number", min: 2, max: 50, message: "Enter between 2 and 50" },
                  ]
            }
          >
            <InputNumber
              min={2}
              max={50}
              placeholder="e.g. 5"
              className="w-full"
              size="large"
              disabled={disabled}
            />
          </Form.Item>

          {!disabled && (
            <div className="mt-4 flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Icon name="Info" size={16} />
              <span className="text-xs font-medium">
                Property details are not needed now - each loan file captures its own after the split.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkLoanCreationSection;
