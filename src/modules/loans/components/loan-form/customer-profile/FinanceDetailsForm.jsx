import React from "react";
import { Form, Select, InputNumber, Row, Col, Space } from "antd";
import { DollarOutlined } from "@ant-design/icons";

const FinanceDetailsForm = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);

  const isFinancedValue = isFinanced === "No" ? "No" : "Yes";

  if (isFinancedValue !== "Yes") return null;

  return (
    <div
      id="section-finance-details"
      style={{
        marginBottom: 32,
        padding: 20,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #f0f0f0",
      }}
    >
      <Space
        style={{ marginBottom: 20, display: "flex", alignItems: "center" }}
      >
        <DollarOutlined style={{ color: "#722ed1" }} />
        <span style={{ fontWeight: 600 }}>Finance Details</span>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Form.Item label="Type of Loan" name="typeOfLoan">
            <Select placeholder="Select loan type">
              <Select.Option value="New Car">New Car</Select.Option>
              <Select.Option value="Used Car">Used Car</Select.Option>
              <Select.Option value="Cash-in">Cash-in</Select.Option>
              <Select.Option value="Re-finance">Re-finance</Select.Option>
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Expected Loan Amount" name="financeExpectation">
            <InputNumber
              placeholder="Expected loan amount"
              min={0}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Tenure (months)" name="loanTenureMonths">
            <InputNumber
              placeholder="Loan tenure"
              min={1}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default FinanceDetailsForm;
