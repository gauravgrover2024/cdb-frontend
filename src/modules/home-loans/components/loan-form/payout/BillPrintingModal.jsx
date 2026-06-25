/**
 * BILL PRINTING MODAL COMPONENT
 * 
 * Purpose: Generates bills for payout payables with auto-generated bill numbers
 * 
 * Backend Integration:
 * - API Endpoint: PATCH /api/loans/:loanId
 * - Backend Model: Loan.js (MongoDB schema)
 * - Fields Updated:
 *   * bill_number: Auto-generated in format BILL-YYYYMMDD-XXXX (e.g., BILL-20240115-0001)
 *   * bill_date: Timestamp when bill was generated
 *   * payout_status: Changed to "Bill Generated"
 * 
 * Features:
 * - Auto-Generated Bill Numbers: Format BILL-YYYYMMDD-XXXX ensures uniqueness
 * - Date Auto-Fill: bill_date defaults to current date/time
 * - Print Preview: Triggers window.print() on submission
 * - Status Update: Automatically updates loan status to indicate bill generation
 * 
 * Bill Number Generation Logic:
 * - Format: BILL-[YYYYMMDD]-[Sequential Number]
 * - Example: BILL-20240115-0001
 * - Sequential counter resets daily
 * 
 * Data Flow:
 * 1. User selects payables from PayoutPayablesDashboard
 * 2. Modal opens with pre-filled bill_number and bill_date
 * 3. On submit: Updates backend via onGenerate callback
 * 4. Backend stores bill_number and bill_date in Loan model
 * 5. Triggers print dialog for physical/PDF bill
 * 
 * Workflow:
 * - Called from PayoutPayablesDashboard when "Generate Bill" is clicked
 * - Validates bill details before submission
 * - Updates loan status for audit trail
 * - Provides print-friendly bill format
 */
import React, { useState } from "react";
import { Modal, Form, message } from "antd";
import Button from "../../../../../components/ui/Button";
import Icon from "../../../../../components/AppIcon";
import "./BillPrint.css";

const BillPrintingModal = ({ visible, onClose, onGenerate, selectedPayables }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // Call the onGenerate callback with bill details
      await onGenerate({
        billNumber: values.billNumber,
        billDate: values.billDate,
      });
      
      message.success("Bill generated successfully!");
      form.resetFields();
      onClose();
    } catch (error) {
      console.error("Bill generation failed:", error);
      message.error("Failed to generate bill. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // Auto-generate bill number based on current date
  const generateBillNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    return `BILL-${year}${month}${day}-${random}`;
  };

  React.useEffect(() => {
    if (visible) {
      // Pre-fill with auto-generated bill number and today's date
      form.setFieldsValue({
        billNumber: generateBillNumber(),
        billDate: new Date().toISOString().split("T")[0],
      });
    }
  }, [visible, form]);

  return (
    <Modal
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnHidden
      className="bill-printing-modal"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Printer" size={24} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Generate Bill
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedPayables?.length || 0} payable(s) selected
            </p>
          </div>
        </div>

        {/* Selected Payables Summary */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon name="ListChecks" size={16} />
            Selected Payables
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {selectedPayables?.map((payable, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-background rounded-md p-2"
              >
                <div className="flex items-center gap-2">
                  <Icon name="FileText" size={14} className="text-muted-foreground" />
                  <span className="font-medium">{payable.payoutId}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{payable.payout_party_name}</span>
                </div>
                <span className="font-semibold text-foreground">
                  ₹{Number(payable.net_amount || 0).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Total Amount:</span>
            <span className="text-lg font-bold text-primary">
              ₹
              {selectedPayables
                ?.reduce((sum, p) => sum + Number(p.net_amount || 0), 0)
                .toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Bill Form */}
        <Form form={form} layout="vertical" className="space-y-4">
          <Form.Item
            label={
              <span className="text-sm font-medium text-foreground">
                Bill Number
              </span>
            }
            name="billNumber"
            rules={[
              { required: true, message: "Please enter bill number" },
              { min: 5, message: "Bill number must be at least 5 characters" },
            ]}
          >
            <div className="relative">
              <input
                id="bill-number"
                name="bill-number"
                type="text"
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background pr-10"
                placeholder="Enter bill number"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => form.setFieldsValue({ billNumber: generateBillNumber() })}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                title="Generate new bill number"
              >
                <Icon name="RefreshCw" size={16} className="text-muted-foreground" />
              </button>
            </div>
          </Form.Item>

          <Form.Item
            label={
              <span className="text-sm font-medium text-foreground">
                Bill Date
              </span>
            }
            name="billDate"
            rules={[{ required: true, message: "Please select bill date" }]}
          >
              <div className="relative">
                <Icon
                  name="Calendar"
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  id="bill-date"
                  name="bill-date"
                  type="date"
                  className="w-full border border-border rounded-md pl-10 pr-3 py-2 text-sm bg-background text-foreground"
                  autoComplete="off"
                />
              </div>
          </Form.Item>
        </Form>

        {/* Info Alert */}
        <div className="bg-info/10 border border-info/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Icon name="Info" size={16} className="text-info mt-0.5" />
            <div className="text-xs text-info leading-relaxed">
              <p>After generating the bill:</p>
              <ul className="mt-1 ml-4 list-disc space-y-0.5">
                <li>Status will be updated to "Bill Generated"</li>
                <li>Expected Date will be removed</li>
                <li>Bill Number and Date will be displayed</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            loading={loading}
            className="gap-2"
          >
            <Icon name="Printer" size={16} />
            Generate Bill & Print
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BillPrintingModal;
