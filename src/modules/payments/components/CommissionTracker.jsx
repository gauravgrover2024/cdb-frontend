import React, { useState, useEffect } from "react";
import { Form } from "antd";
import Icon from "../../../../../components/AppIcon";
import Button from "../../../../../components/ui/Button";

/**
 * Commission & Excess Payment Tracker
 * Displays showroom excess payments and commission receivable
 */
const CommissionTracker = ({ form, loanId }) => {
  const [commissionData, setCommissionData] = useState({
    totalPaymentToShowroom: 0,
    expectedPaymentToShowroom: 0,
    excessPaymentToShowroom: 0,
    commissionReceivableFromShowroom: 0,
    commissionReceivedFromShowroom: 0,
    outstandingCommissionFromShowroom: 0,
  });

  // Watch form values
  const totalPayment = Form.useWatch("totalPaymentToShowroom", form) || 0;
  const expectedPayment = Form.useWatch("expectedPaymentToShowroom", form) || 0;
  const commissionReceivable = Form.useWatch("commissionReceivableFromShowroom", form) || 0;
  const commissionReceived = Form.useWatch("commissionReceivedFromShowroom", form) || 0;
  const showroomName = Form.useWatch("showroomName", form);

  // Calculate excess and outstanding
  useEffect(() => {
    const excess = Math.max(0, totalPayment - expectedPayment);
    const outstanding = Math.max(0, commissionReceivable - commissionReceived);

    setCommissionData({
      totalPaymentToShowroom: totalPayment,
      expectedPaymentToShowroom: expectedPayment,
      excessPaymentToShowroom: excess,
      commissionReceivableFromShowroom: commissionReceivable,
      commissionReceivedFromShowroom: commissionReceived,
      outstandingCommissionFromShowroom: outstanding,
    });

    // Update form
    form.setFieldsValue({
      excessPaymentToShowroom: excess,
      outstandingCommissionFromShowroom: outstanding,
    });
  }, [totalPayment, expectedPayment, commissionReceivable, commissionReceived, form]);

  const hasExcess = commissionData.excessPaymentToShowroom > 0;
  const hasOutstanding = commissionData.outstandingCommissionFromShowroom > 0;

  if (!showroomName) {
    return (
      <div className="bg-card rounded-lg border border-dashed border-muted p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Icon name="AlertCircle" size={20} />
          <div>
            <p className="text-sm font-medium">Commission Tracking Unavailable</p>
            <p className="text-xs">Select a showroom to track commission</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-elevation-2 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
          <Icon name="TrendingUp" size={20} className="text-purple-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Commission Tracker
          </h3>
          <p className="text-xs text-muted-foreground">
            {showroomName}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {/* Total Payment */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="DollarSign" size={14} className="text-primary" />
            <p className="text-xs text-muted-foreground">Total Paid</p>
          </div>
          <p className="text-lg font-bold text-primary">
            ₹{commissionData.totalPaymentToShowroom.toLocaleString()}
          </p>
        </div>

        {/* Expected Payment */}
        <div className="bg-gradient-to-br from-info/5 to-info/10 rounded-lg p-3 border border-info/20">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Target" size={14} className="text-info" />
            <p className="text-xs text-muted-foreground">Expected</p>
          </div>
          <p className="text-lg font-bold text-info">
            ₹{commissionData.expectedPaymentToShowroom.toLocaleString()}
          </p>
        </div>

        {/* Excess Payment */}
        <div className={`bg-gradient-to-br rounded-lg p-3 border ${
          hasExcess 
            ? 'from-warning/5 to-warning/10 border-warning/20' 
            : 'from-muted/5 to-muted/10 border-muted/20'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="TrendingUp" size={14} className={hasExcess ? "text-warning" : "text-muted-foreground"} />
            <p className="text-xs text-muted-foreground">Excess</p>
          </div>
          <p className={`text-lg font-bold ${hasExcess ? 'text-warning' : 'text-muted-foreground'}`}>
            ₹{commissionData.excessPaymentToShowroom.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Excess Payment Alert */}
      {hasExcess && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-3">
            <Icon name="AlertTriangle" size={20} className="text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning mb-1">
                Excess Payment Detected
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                You've paid ₹{commissionData.excessPaymentToShowroom.toLocaleString()} more than expected. 
                This will be tracked as commission receivable from showroom.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="small" className="border-warning/30 text-warning">
                  <Icon name="ArrowRightLeft" size={12} />
                  Adjust Commission
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commission Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon name="Receipt" size={14} className="text-muted-foreground" />
            <span className="text-sm text-foreground">Commission Receivable</span>
          </div>
          <span className="text-sm font-semibold text-foreground">
            ₹{commissionData.commissionReceivableFromShowroom.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
          <div className="flex items-center gap-2">
            <Icon name="CheckCircle" size={14} className="text-success" />
            <span className="text-sm text-foreground">Commission Received</span>
          </div>
          <span className="text-sm font-semibold text-success">
            ₹{commissionData.commissionReceivedFromShowroom.toLocaleString()}
          </span>
        </div>

        <div className={`flex items-center justify-between p-3 rounded-lg border ${
          hasOutstanding 
            ? 'bg-destructive/10 border-destructive/20' 
            : 'bg-muted/10 border-muted/20'
        }`}>
          <div className="flex items-center gap-2">
            <Icon name="Clock" size={14} className={hasOutstanding ? "text-destructive" : "text-muted-foreground"} />
            <span className="text-sm text-foreground">Outstanding Commission</span>
          </div>
          <span className={`text-sm font-semibold ${hasOutstanding ? 'text-destructive' : 'text-muted-foreground'}`}>
            ₹{commissionData.outstandingCommissionFromShowroom.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {hasOutstanding && (
        <div className="mt-4 pt-4 border-t border-border">
          <Button variant="default" className="w-full">
            <Icon name="Receipt" size={14} />
            Record Commission Receipt
          </Button>
        </div>
      )}

      {/* Hidden Form Fields */}
      <div className="hidden">
        <Form.Item name="totalPaymentToShowroom">
          <input type="hidden" />
        </Form.Item>
        <Form.Item name="expectedPaymentToShowroom">
          <input type="hidden" />
        </Form.Item>
        <Form.Item name="excessPaymentToShowroom">
          <input type="hidden" />
        </Form.Item>
        <Form.Item name="commissionReceivableFromShowroom">
          <input type="hidden" />
        </Form.Item>
        <Form.Item name="commissionReceivedFromShowroom">
          <input type="hidden" />
        </Form.Item>
        <Form.Item name="outstandingCommissionFromShowroom">
          <input type="hidden" />
        </Form.Item>
      </div>
    </div>
  );
};

export default CommissionTracker;
