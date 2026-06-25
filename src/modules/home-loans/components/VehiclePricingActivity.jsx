import React from "react";
import { Card, Input, DatePicker } from "antd";

export default function VehiclePricingActivity({ form }) {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left: Basic Info & Pricing Breakdown */}
      <div className="flex-1 min-w-[320px]">
        <Card title={<span className="font-bold text-primary">Basic Information</span>} className="mb-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Manufacturer</div>
            <div className="font-semibold">Toyota</div>
            <div>Model</div>
            <div className="font-semibold">Corolla Altis</div>
            <div>Variant</div>
            <div className="font-semibold">1.8 E CVT</div>
            <div>Dealer Name</div>
            <div className="font-semibold">ABAD SANTOS</div>
          </div>
        </Card>
        <Card title={<span className="font-bold text-primary">Pricing Breakdown</span>}>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Ex-Showroom Price</div>
            <div className="font-semibold">₹ 1,213,000</div>
            <div>Insurance Fee</div>
            <div className="font-semibold">₹ 10,000</div>
            <div>RTO fee</div>
            <div className="font-semibold">₹ 5,000</div>
            <div>Hypothecation Fee</div>
            <div className="font-semibold">₹ 1,000</div>
            <div>On-Road Price</div>
            <div className="font-semibold">₹ 1,218,000</div>
            <div>Down Payment</div>
            <div className="font-semibold">₹ 1,118,000</div>
            <div>Accessories Charges</div>
            <div className="font-semibold">₹ 7,500</div>
            <div>Itv</div>
            <div className="font-semibold">8.21%</div>
          </div>
        </Card>
      </div>
      {/* Right: Editable Form */}
      <div className="flex-1 min-w-[320px]">
        <Card title={<span className="font-bold text-primary">Modify Vehicle Pricing</span>} className="mb-4">
          <div className="grid grid-cols-2 gap-3">
            <label htmlFor="insurance-fee">Insurance Fee*</label>
            <Input id="insurance-fee" name="insurance-fee" defaultValue="10000" />
            <label htmlFor="hypothecation-fee">Hypothecation Fee*</label>
            <Input id="hypothecation-fee" name="hypothecation-fee" defaultValue="1000" />
            <label htmlFor="rto-fee">RTO fee*</label>
            <Input id="rto-fee" name="rto-fee" defaultValue="5000" />
            <label htmlFor="accessories-charges">Accessories Charges*</label>
            <Input id="accessories-charges" name="accessories-charges" defaultValue="7500" />
          </div>
        </Card>
        <Card title={<span className="font-bold text-primary">Loan Terms</span>}>
          <div className="grid grid-cols-2 gap-3">
            <label htmlFor="loan-amount">Loan Amount*</label>
            <Input id="loan-amount" name="loan-amount" defaultValue="100000" />
            <label htmlFor="interest-rate">Interest Rate*</label>
            <Input id="interest-rate" name="interest-rate" defaultValue="12" suffix="%" />
            <label htmlFor="tenure">Tenure*</label>
            <Input id="tenure" name="tenure" defaultValue="12" suffix="Months" />
            <label htmlFor="expected-disbursement-date">Expected Disbursement Date*</label>
            <DatePicker id="expected-disbursement-date" name="expected-disbursement-date" style={{ width: "100%" }} />
            <label htmlFor="repayment-starting-date">Repayment Starting Date</label>
            <DatePicker id="repayment-starting-date" name="repayment-starting-date" style={{ width: "100%" }} />
          </div>
        </Card>
      </div>
    </div>
  );
}
