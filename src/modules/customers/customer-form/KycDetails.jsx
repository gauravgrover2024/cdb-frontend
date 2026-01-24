import React from "react";
import { Form, Input, Row, Col, Space } from "antd";
import {
  IdcardOutlined,
  CreditCardOutlined,
  CarOutlined,
} from "@ant-design/icons";

const KycDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);

  // Show in customer module & financed loans
  const showKyc = isFinanced !== "No";

  if (!showKyc) {
    return null;
  }

  return (
    <div
      id="section-kyc"
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
        <IdcardOutlined style={{ color: "#722ed1" }} />
        <span style={{ fontWeight: 600 }}>Customer ID / Address Proof</span>
        <CreditCardOutlined style={{ color: "#fa8c16" }} />
      </Space>

      {/* FORM FIELDS */}
      <Row gutter={[16, 16]}>
        {/* Aadhaar */}
        <Col xs={24} md={8}>
          <Form.Item label="Aadhaar Number" name="aadhaarNumber">
            <Input placeholder="12-digit Aadhaar" maxLength={12} />
          </Form.Item>
        </Col>

        {/* Passport */}
        <Col xs={24} md={8}>
          <Form.Item label="Passport Number" name="passportNumber">
            <Input placeholder="Passport number" />
          </Form.Item>
        </Col>

        {/* GST */}
        <Col xs={24} md={8}>
          <Form.Item label="GST Number (if applicable)" name="gstNumber">
            <Input placeholder="GSTIN" maxLength={15} />
          </Form.Item>
        </Col>

        {/* Driving License */}
        <Col xs={24} md={8}>
          <Form.Item label="Driving License Number" name="dlNumber">
            <Input placeholder="DL number" prefix={<CarOutlined />} />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default KycDetails;
