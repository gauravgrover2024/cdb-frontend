import React from "react";
import { Form, Input, Select, InputNumber, Row, Col, Space } from "antd";
import { BankOutlined } from "@ant-design/icons";

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
      style={{
        marginBottom: 32,
        padding: 20,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #f0f0f0",
      }}
    >
      {/* SECTION HEADER */}
      <Space
        style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
        }}
      >
        <BankOutlined style={{ fontSize: 18, color: "#13c2c2" }} />
        <span style={{ fontWeight: 600 }}>Banking Details</span>
      </Space>

      {/* FORM FIELDS */}
      <Row gutter={[16, 16]}>
        {/* Bank Name */}
        <Col xs={24} md={8}>
          <Form.Item label="Bank Name" name="bankName">
            <Select
              placeholder="Select or type bank name"
              options={bankOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        </Col>

        {/* Account Number */}
        <Col xs={24} md={8}>
          <Form.Item label="Account Number" name="accountNumber">
            <Input placeholder="Account number" />
          </Form.Item>
        </Col>

        {/* IFSC */}
        <Col xs={24} md={8}>
          <Form.Item label="IFSC Code" name="ifsc">
            <Input placeholder="IFSC code" />
          </Form.Item>
        </Col>

        {/* Branch */}
        <Col xs={24} md={8}>
          <Form.Item label="Branch" name="branch">
            <Input placeholder="Branch name" />
          </Form.Item>
        </Col>

        {/* Account Since */}
        <Col xs={24} md={8}>
          <Form.Item label="Account Since (Years)" name="accountSinceYears">
            <InputNumber
              placeholder="Number of years"
              min={0}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>

        {/* Account Type */}
        <Col xs={24} md={8}>
          <Form.Item label="Account Type" name="accountType">
            <Select
              placeholder="Select account type"
              options={accountTypeOptions}
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default BankDetails;
