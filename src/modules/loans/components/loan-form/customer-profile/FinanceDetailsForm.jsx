import React from "react";
import { Form, Select, InputNumber, Row, Col } from "antd";
import Icon from "../../../../../components/AppIcon";

const FinanceDetailsForm = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);

  if (isFinanced !== "Yes") return null;

  return (
    <div id="section-finance-details" className="form-section">
      <div className="section-header mb-6">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon name="Banknote" size={20} />
          </div>
          <span className="text-lg font-medium text-foreground">Finance Details</span>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm mb-6">
        <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
           <Icon name="Calculator" size={12} className="text-primary" />
           Funding Parameters
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Form.Item label="Type of Loan" name="typeOfLoan" className="mb-0">
              <Select placeholder="Select loan type" className="h-10 rounded-xl">
                <Select.Option value="New Car">New Car</Select.Option>
                <Select.Option value="Used Car">Used Car</Select.Option>
                <Select.Option value="Cash-in">Cash-in</Select.Option>
                <Select.Option value="Re-finance">Re-finance</Select.Option>
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Expected Funding" name="financeExpectation" className="mb-0">
              <InputNumber
                placeholder="Requested amount"
                min={0}
                className="w-full h-10 rounded-xl flex items-center"
                formatter={(value) => {
                  if (!value) return '';
                  const numValue = Number(value);
                  return `₹ ${numValue.toLocaleString('en-IN')}`;
                }}
                parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Requested Tenure (Months)" name="loanTenureMonths" className="mb-0">
              <InputNumber
                placeholder="Months"
                min={1}
                className="w-full h-10 rounded-xl flex items-center"
                addonAfter="Months"
              />
            </Form.Item>
          </Col>
        </Row>
      </div>

      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-3">
         <Icon name="Info" size={16} className="text-primary shrink-0" />
         <div className="text-[11px] text-muted-foreground leading-relaxed">
            These are preliminary expectations. Final terms will be decided after credit review and bank approval in the following steps.
         </div>
      </div>
    </div>
  );
};

export default FinanceDetailsForm;
