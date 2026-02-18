import { Alert, Form, InputNumber, Radio } from "antd";
import { useState } from "react";
import Icon from "../../../../../components/AppIcon";

const BulkLoanCreationSection = ({ form }) => {
  const [isMultipleCars, setIsMultipleCars] = useState(false);
  const [isSameVehicle, setIsSameVehicle] = useState(true);

  const numberOfCars = Form.useWatch("numberOfCars", form);

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
        {/* Question 1: Multiple Cars */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30 p-5">
          <div className="flex items-start gap-3 mb-4">
            <Icon name="HelpCircle" size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm text-blue-900 dark:text-blue-300 mb-1">
                Is the customer buying multiple cars?
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Select if you need to create multiple loan files for this customer
              </p>
            </div>
          </div>

          <Form.Item name="isMultipleCars" className="mb-0">
            <Radio.Group
              onChange={(e) => setIsMultipleCars(e.target.value)}
              className="flex gap-3"
            >
              <div className="flex-1 p-3 rounded-lg border-2 border-transparent has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-950/30 transition-all cursor-pointer">
                <Radio value={false} className="w-full">
                  <span className="font-medium text-foreground">No - Single Car</span>
                </Radio>
              </div>
              <div className="flex-1 p-3 rounded-lg border-2 border-transparent has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-950/30 transition-all cursor-pointer">
                <Radio value={true} className="w-full">
                  <span className="font-medium text-foreground">Yes - Multiple Cars</span>
                </Radio>
              </div>
            </Radio.Group>
          </Form.Item>
        </div>

        {/* Show additional questions only if multiple cars */}
        {isMultipleCars && (
          <>
            {/* Question 2: Same Vehicle */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800/30 p-5">
              <div className="flex items-start gap-3 mb-4">
                <Icon name="Car" size={20} className="text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm text-emerald-900 dark:text-emerald-300 mb-1">
                    Is the vehicle same for all loans?
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    If yes, vehicle details will be cloned. If no, you'll need to enter vehicle details separately
                  </p>
                </div>
              </div>

              <Form.Item name="isSameVehicle" className="mb-0">
                <Radio.Group
                  onChange={(e) => setIsSameVehicle(e.target.value)}
                  className="flex gap-3"
                >
                  <div className="flex-1 p-3 rounded-lg border-2 border-transparent has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 dark:has-[:checked]:bg-emerald-950/30 transition-all cursor-pointer">
                    <Radio value={true} className="w-full">
                      <span className="font-medium text-foreground">Yes - Same Vehicle</span>
                    </Radio>
                  </div>
                  <div className="flex-1 p-3 rounded-lg border-2 border-transparent has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 dark:has-[:checked]:bg-emerald-950/30 transition-all cursor-pointer">
                    <Radio value={false} className="w-full">
                      <span className="font-medium text-foreground">No - Different Vehicles</span>
                    </Radio>
                  </div>
                </Radio.Group>
              </Form.Item>
            </div>

            {/* Number of Cars Input */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/30 p-5">
              <div className="flex items-start gap-3 mb-4">
                <Icon name="Hash" size={20} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm text-amber-900 dark:text-amber-300 mb-1">
                    How many loan files to create?
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Enter the total number of vehicles (maximum 50)
                  </p>
                </div>
              </div>

              <Form.Item
                name="numberOfCars"
                className="mb-0"
                rules={[
                  { required: true, message: "Please enter number of cars" },
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
                    {!isSameVehicle && " (vehicle details will need to be entered separately)"}
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
                    <span>Customer Profile (Personal, Employment, Income, Bank Details)</span>
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
                      <span>Vehicle Details & Pricing</span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-2">
                      <Icon name="X" size={16} className="text-destructive mt-0.5" />
                      <span className="text-muted-foreground">Vehicle Details (will NOT be cloned - enter separately for each loan)</span>
                    </li>
                  )}
                </ul>
              }
              type="info"
              showIcon
              icon={<Icon name="Info" size={18} />}
              className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default BulkLoanCreationSection;
