import { Alert, Form, InputNumber, Radio, Button, message, Progress } from "antd";
import { useState } from "react";
import Icon from "../../../../../components/AppIcon";

const BulkLoanCreationSection = ({ form, onProcess }) => {
  const isMultipleCars = Form.useWatch("isMultipleCars", form);
  const isSameVehicle = Form.useWatch("isSameVehicle", form) ?? true;

  const numberOfCars = Form.useWatch("numberOfCars", form);

  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleCreateBulkLoans = async () => {
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
      if (typeof onProcess === "function") {
        await onProcess({ forceBulkCreate: true });
      } else if (typeof form.submit === "function") {
        form.submit();
      }
      
      setProgress(100);
      // Let the success animation show for a moment
      setTimeout(() => {
        setIsCreating(false);
      }, 500);
    } catch (error) {
      setIsCreating(false);
      setProgress(0);
      message.error("An error occurred during bulk creation.");
    } finally {
      clearInterval(interval);
    }
  };

  return (
    <div className="mb-8 p-6 bg-card rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Icon name="Copy" size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Bulk Loan Creation</h3>
          <p className="text-sm text-muted-foreground">Create multiple loan files for the same customer</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Question 1: Multiple Loans */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30 p-5">
          <div className="flex items-start gap-3 mb-4">
            <Icon name="HelpCircle" size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm text-blue-900 dark:text-blue-300 mb-1">
                Is the customer applying for multiple home loans?
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Select if you need to create multiple loan files for this customer
              </p>
            </div>
          </div>

          <Form.Item name="isMultipleCars" className="mb-0">
            <Radio.Group
              className="flex gap-3"
            >
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

        {/* Show additional questions only if multiple loans */}
        {isMultipleCars && (
          <>
            {/* Question 2: Same Property */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800/30 p-5">
              <div className="flex items-start gap-3 mb-4">
                <Icon name="Building2" size={20} className="text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm text-emerald-900 dark:text-emerald-300 mb-1">
                    Is the property same for all loans?
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    If yes, property details will be cloned. If no, you'll need to enter property details separately
                  </p>
                </div>
              </div>

              <Form.Item name="isSameVehicle" className="mb-0">
                <Radio.Group
                  className="flex gap-3"
                >
                  <div className="flex-1 p-3 rounded-lg border-2 border-transparent has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 dark:has-[:checked]:bg-emerald-950/30 transition-all cursor-pointer">
                    <Radio value={true} className="w-full">
                      <span className="font-medium text-foreground">Yes - Same Property</span>
                    </Radio>
                  </div>
                  <div className="flex-1 p-3 rounded-lg border-2 border-transparent has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 dark:has-[:checked]:bg-emerald-950/30 transition-all cursor-pointer">
                    <Radio value={false} className="w-full">
                      <span className="font-medium text-foreground">No - Different Properties</span>
                    </Radio>
                  </div>
                </Radio.Group>
              </Form.Item>
            </div>

            {/* Number of Loans Input */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/30 p-5">
              <div className="flex items-start gap-3 mb-4">
                <Icon name="Hash" size={20} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm text-amber-900 dark:text-amber-300 mb-1">
                    How many loan files to create?
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Enter the total number of loans (maximum 50)
                  </p>
                </div>
              </div>

              <Form.Item
                name="numberOfCars"
                className="mb-0"
                rules={[
                  { required: true, message: "Please enter number of loans" },
                  { type: "number", min: 2, max: 50, message: "Enter between 2 and 50" }
                ]}
              >
                <InputNumber
                  min={2}
                  max={50}
                  placeholder="e.g. 5"
                  className="w-full"
                  size="large"
                />
              </Form.Item>

              {numberOfCars && numberOfCars > 1 && (
                <div className="mt-4 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Icon name="Info" size={16} />
                  <span className="text-xs font-medium">
                    {numberOfCars} loan files will be created with cloned customer data
                    {!isSameVehicle && " (property details will need to be entered separately)"}
                  </span>
                </div>
              )}
            </div>

            {/* Information Alert */}
            <Alert
              message="What will be cloned?"
              description={
                <ul className="mt-2 space-y-1 text-sm">
                  <li className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-success mt-0.5" />
                    <span>Customer Profile (Personal, Employment, Bank Details)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-success mt-0.5" />
                    <span>Pre-File Details (Occupational, Income & Banking, Section 7)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon name="Check" size={16} className="text-success mt-0.5" />
                    <span>Co-Applicant, Guarantor, Authorized Signatory (if applicable)</span>
                  </li>
                  {isSameVehicle ? (
                    <li className="flex items-start gap-2">
                      <Icon name="Check" size={16} className="text-success mt-0.5" />
                      <span>Property Details & Pricing</span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-2">
                      <Icon name="X" size={16} className="text-destructive mt-0.5" />
                      <span className="text-muted-foreground">Property Details (will NOT be cloned - enter separately for each loan)</span>
                    </li>
                  )}
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
                    <span>Creating {numberOfCars} loans...</span>
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
                >
                  {!isCreating && <Icon name="Copy" size={20} className="text-white" />}
                  <span>Create Bulk Loans</span>
                </Button>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
};

export default BulkLoanCreationSection;
