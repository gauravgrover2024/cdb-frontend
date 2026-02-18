import React, { useState } from "react";
import { Form, message } from "antd";
import Button from "../../../../../components/ui/Button";
import Icon from "../../../../../components/AppIcon";
import WorkflowProgress from "../../../../../components/ui/WorkflowProgress";
import { disburseLoan } from "../../../../../api/loans";
import dayjs from "dayjs";

const DisbursementStep = ({ form, banksData, onNext, loanId }) => {
  const [loading, setLoading] = useState(false);
  const [payoutData, setPayoutData] = useState(null);
  const [disbursed, setDisbursed] = useState(false);

  const handleDisbursement = async (values) => {
    setLoading(true);
    try {
      // Find the approved bank
      const approvedBank = banksData.find((b) => b.status === "Approved");
      
      if (!approvedBank) {
        message.error("No approved bank found. Please approve a bank first.");
        setLoading(false);
        return;
      }

      const disbursementData = {
        disburseAmount: values.disburseAmount || approvedBank.loanAmount,
        disbursedBankName: approvedBank.bankName,
        payoutPercentage: values.payoutPercentage,
        disbursedDate: values.disbursedDate || new Date(),
        remarks: values.remarks || "",
      };

      // Call disbursement API
      const response = await disburseLoan(loanId, disbursementData);

      if (response.data) {
        setPayoutData(response.data.payouts);
        setDisbursed(true);
        message.success("Loan disbursed successfully!");
        
        // Update form with disbursement data
        form.setFieldsValue({
          disbursementStatus: "Disbursed",
          disbursementDate: dayjs(),
        });
      }
    } catch (error) {
      console.error("Disbursement error:", error);
      message.error(error.response?.data?.message || "Failed to disburse loan");
    } finally {
      setLoading(false);
    }
  };

  // Check if any bank is approved
  const approvedBank = banksData.find((b) => b.status === "Approved");
  const isApproved = approvedBank?.status === "Approved";

  const workflowStages = [
    "Prefill & KYC",
    "Vehicle & Loan Details",
    "Multi-Bank Approval",
    "Disbursement",
    "Documentation",
  ];

  if (!isApproved) {
    return (
      <div className="relative -mx-6 lg:-mx-8 px-6 lg:px-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Loan Disbursement
            </h2>
            <p className="text-sm text-muted-foreground">
              Complete disbursement process to generate payouts
            </p>
          </div>

          <WorkflowProgress
            currentStage="Disbursement"
            stages={workflowStages}
          />

          <div className="bg-warning/10 border border-warning rounded-lg p-6 flex items-start gap-4">
            <Icon name="AlertCircle" size={24} className="text-warning mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                Loan Not Approved
              </h3>
              <p className="text-sm text-muted-foreground">
                Please approve a loan in the Loan Approval step before proceeding to disbursement.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative -mx-6 lg:-mx-8 px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Loan Disbursement
        </h2>
        <p className="text-sm text-muted-foreground">
          Disburse the loan and generate payouts for bank and dealers
        </p>
      </div>

      <WorkflowProgress
        currentStage="Disbursement"
        stages={workflowStages}
      />

      {!disbursed ? (
        <Form
          layout="vertical"
          onFinish={handleDisbursement}
          className="space-y-6"
        >
          {/* Disbursement Details Card */}
          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon name="Banknote" size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Disbursement Details</h3>
                <p className="text-xs text-muted-foreground">
                  From: {approvedBank?.bankName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Disbursement Amount */}
              <Form.Item
                label="Disbursement Amount"
                name="disburseAmount"
                initialValue={approvedBank?.loanAmount}
                rules={[
                  { required: true, message: "Disbursement amount is required" },
                  { pattern: /^\d+(\.\d{1,2})?$/, message: "Enter a valid amount" },
                ]}
              >
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white border-gray-200 text-gray-900"
                />
              </Form.Item>

              {/* Disbursement Date */}
              <Form.Item
                label="Disbursement Date"
                name="disbursedDate"
                initialValue={dayjs()}
                rules={[{ required: true, message: "Disbursement date is required" }]}
              >
                  <div className="relative">
                    <Icon
                      name="Calendar"
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <input
                      type="date"
                      className="w-full border rounded-lg pl-10 pr-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background border-border text-foreground"
                    />
                  </div>
              </Form.Item>

              {/* Payout Percentage */}
              <Form.Item
                label="Payout Percentage (%)"
                name="payoutPercentage"
                rules={[
                  { required: true, message: "Payout percentage is required" },
                  {
                    validator: (_, value) => {
                      if (!value || (value >= 0 && value <= 100)) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Payout percentage must be between 0 and 100"));
                    },
                  },
                ]}
              >
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white border-gray-200 text-gray-900"
                />
              </Form.Item>

              {/* Remarks */}
              <Form.Item
                label="Remarks (Optional)"
                name="remarks"
              >
                <textarea
                  rows={3}
                  placeholder="Add any remarks or notes..."
                  className="w-full border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white border-gray-200 text-gray-900"
                />
              </Form.Item>
            </div>

            {/* Disbursement Summary */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
              <p className="text-sm text-muted-foreground mb-2">Disbursement Summary:</p>
              <div className="space-y-2 text-sm font-medium">
                <div className="flex justify-between">
                  <span className="text-foreground">Approved Amount:</span>
                  <span className="text-primary">₹{approvedBank?.loanAmount?.toLocaleString() || "0"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">Bank Name:</span>
                  <span className="text-primary">{approvedBank?.bankName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              htmlType="submit"
              size="lg"
              variant="default"
              iconName="CheckCircle2"
              loading={loading}
              className="flex-1"
            >
              Disburse Loan
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={onNext}
            >
              Skip Disbursement
            </Button>
          </div>
        </Form>
      ) : (
        <>
          {/* Disbursement Success */}
          <div className="bg-success/10 border border-success rounded-lg p-6 flex items-start gap-4">
            <Icon name="CheckCircle2" size={24} className="text-success mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">
                Loan Disbursed Successfully
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                The loan has been disbursed and payouts have been generated.
              </p>

              {/* Payout Summary */}
              {payoutData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-card rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name="TrendingUp" size={18} className="text-success" />
                      <span className="text-sm font-medium text-muted-foreground">Bank Receivables</span>
                    </div>
                    <p className="text-2xl font-bold text-success">
                      ₹{payoutData.summary?.bankReceivable?.toLocaleString() || "0"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {payoutData.receivables?.length || 0} entry
                    </p>
                  </div>

                  <div className="bg-card rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name="TrendingDown" size={18} className="text-warning" />
                      <span className="text-sm font-medium text-muted-foreground">Dealer Payables</span>
                    </div>
                    <p className="text-2xl font-bold text-warning">
                      ₹{payoutData.summary?.dealerPayable?.toLocaleString() || "0"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {payoutData.payables?.length || 0} entry
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Proceed Button */}
          <div className="flex gap-3 pt-4">
            <Button
              size="lg"
              variant="default"
              iconName="ChevronRight"
              onClick={onNext}
              className="flex-1"
            >
              Proceed to Next Step
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DisbursementStep;
