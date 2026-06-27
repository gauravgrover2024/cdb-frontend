import React from "react";
import { Form, Select, Row, Col } from "antd";

const PROPERTY_TYPE_OPTIONS = [
  { label: "Residential", value: "Residential" },
  { label: "Commercial", value: "Commercial" },
  { label: "Industrial", value: "Industrial" },
  { label: "Unsecured", value: "Unsecured" },
];

const LOAN_TYPE_OPTIONS_SECURED = [
  { label: "Property Purchase", value: "Property Purchase" },
  { label: "Loan Against Property (LAP)", value: "LAP" },
  { label: "Top-Up Loan", value: "Top-Up Loan" },
];

const LOAN_TYPE_OPTIONS_UNSECURED = [
  { label: "Business Loan", value: "Business Loan" },
  { label: "Personal Loan", value: "Personal Loan" },
  { label: "CGTMSE Limit", value: "CGTMSE Limit" },
  { label: "OD/CC Limit", value: "OD/CC Limit" },
  { label: "DLOD", value: "DLOD" },
];

const PropertyDetailsForm = () => {
  const form = Form.useFormInstance();
  const propertyType = Form.useWatch("propertyType", form);

  const loanTypeOptions =
    propertyType === "Unsecured"
      ? LOAN_TYPE_OPTIONS_UNSECURED
      : LOAN_TYPE_OPTIONS_SECURED;

  const handlePropertyTypeChange = () => {
    form.setFieldValue("typeOfLoan", undefined);
  };

  return (
    <div className="space-y-4 p-2">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Property Type"
            name="propertyType"
            rules={[{ required: true, message: "Select property type" }]}
          >
            <Select
              placeholder="Select property type"
              options={PROPERTY_TYPE_OPTIONS}
              onChange={handlePropertyTypeChange}
              className="h-10 rounded-lg w-full"
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Type of Loan"
            name="typeOfLoan"
            rules={[{ required: true, message: "Select loan type" }]}
          >
            <Select
              placeholder={propertyType ? "Select loan type" : "Select property type first"}
              options={loanTypeOptions}
              disabled={!propertyType}
              className="h-10 rounded-lg w-full"
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default PropertyDetailsForm;
