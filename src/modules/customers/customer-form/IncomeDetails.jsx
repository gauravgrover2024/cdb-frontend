import React from "react";
import { Form, Input, InputNumber, Row, Col, Space } from "antd";
import { ProfileOutlined } from "@ant-design/icons";

const IncomeDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);

  // Show in customer module & financed loans
  const showIncome = isFinanced !== "No";

  if (!showIncome) {
    return null;
  }

  return (
    <div
      id="section-income"
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
        <ProfileOutlined style={{ fontSize: 18, color: "#faad14" }} />
        <span style={{ fontWeight: 600 }}>Income Details</span>
      </Space>

      {/* FORM FIELDS */}
      <Row gutter={[16, 16]}>
        {/* PAN Number */}
        <Col xs={24} md={8}>
          <Form.Item label="PAN Number" name="panNumber">
            <Input placeholder="Enter PAN number" />
          </Form.Item>
        </Col>

        {/* ITR Income */}
        <Col xs={24} md={8}>
          <Form.Item label="Total Income (as per ITR)" name="itrYears">
            <InputNumber
              placeholder="Total income"
              min={0}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default IncomeDetails;
