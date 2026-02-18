import React from "react";
import { Form, Input, Select, InputNumber, Row, Col } from "antd";

import Icon from "../../../components/AppIcon";

const bankOptions = [
  { label: "HDFC Bank", value: "HDFC Bank" },
  { label: "ICICI Bank", value: "ICICI Bank" },
  { label: "State Bank of India", value: "State Bank of India" },
  { label: "Axis Bank", value: "Axis Bank" },
  { label: "Kotak Mahindra Bank", value: "Kotak Mahindra Bank" },
  { label: "Federal Bank", value: "Federal Bank" },
  { label: "Punjab National Bank", value: "Punjab National Bank" },
];

const accountTypeOptions = [
  { label: "Savings", value: "Savings" },
  { label: "Current", value: "Current" },
];

const BankDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);

  // Show in customer module & financed loans
  const showBank = isFinanced !== "No";

  if (!showBank) {
    return null;
  }

  return (
    <div 
        id="section-bank" 
        className="form-section bg-card border border-border/50 rounded-2xl p-6 shadow-sm mb-6"
        style={{ background: "var(--card)" }}
    >
      {/* SECTION HEADER */}
      <div className="section-header mb-6 flex justify-between items-center">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
             <Icon name="Building2" size={20} />
          </div>
          <span className="text-lg font-bold text-foreground">Banking Details</span>
        </div>
      </div>

      {/* FORM FIELDS */}
      <Row gutter={[16, 16]}>

         {/* IFSC */}
        <Col xs={24} md={8}>
          <Form.Item label="IFSC Code" name="ifsc">
            <Input placeholder="IFSC Code" className="rounded-xl border-border placeholder:font-normal" />
          </Form.Item>
        </Col>

        {/* Bank Name */}
        <Col xs={24} md={8}>
          <Form.Item label="Bank Name" name="bankName">
            <Select
              placeholder="Select or type bank name"
              options={bankOptions}
              showSearch
              optionFilterProp="label"
              className="rounded-xl border-border w-full placeholder:font-normal"
            />
          </Form.Item>
        </Col>

        {/* Branch */}
        <Col xs={24} md={8}>
          <Form.Item label="Branch" name="branch">
            <Input placeholder="Branch name" className="rounded-xl border-border placeholder:font-normal" />
          </Form.Item>
        </Col>
        
        {/* Account Number */}
        <Col xs={24} md={8}>
          <Form.Item label="Account Number" name="accountNumber">
            <Input placeholder="Account number" className="rounded-xl border-border placeholder:font-normal" />
          </Form.Item>
        </Col>

      

        {/* Account Since */}
        <Col xs={24} md={8}>
          <Form.Item label="Account Since (Years)" name="accountSinceYears">
            <InputNumber
              placeholder="Number of years"
              min={0}
              className="w-full rounded-xl border-border placeholder:font-normal"
            />
          </Form.Item>
        </Col>

        {/* Account Type */}
        <Col xs={24} md={8}>
          <Form.Item label="Account Type" name="accountType">
            <Select
              placeholder="Select account type"
              options={accountTypeOptions}
              className="rounded-xl border-border w-full placeholder:font-normal"
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default BankDetails;
