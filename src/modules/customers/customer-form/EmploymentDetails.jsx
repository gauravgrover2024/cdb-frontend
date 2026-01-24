import React from "react";
import { Form, Input, Select, Row, Col, Space } from "antd";
import {
  SolutionOutlined,
  HomeOutlined,
  PhoneOutlined,
  BankOutlined,
} from "@ant-design/icons";

const { TextArea } = Input;
const { Option } = Select;

const EmploymentDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);

  // Show in customer module & financed loans
  const showEmployment = isFinanced !== "No";

  if (!showEmployment) {
    return null;
  }

  const occupationOptions = [
    "Salaried",
    "Self Employed",
    "Self Employed Professional",
    "Other",
  ];

  const companyTypeOptions = [
    "Pvt Ltd",
    "Partnership",
    "Proprietorship",
    "Public Ltd",
    "Retailers",
    "PSU",
    "Govt",
    "MNC",
    "Other (detail)",
  ];

  const businessNatureOptions = [
    "Automobiles",
    "Agriculture Based",
    "Banking",
    "BPO",
    "Capital Goods",
    "Telecom",
    "IT",
    "Retail",
    "Real Estate",
    "Consumer Durables",
    "FMCG",
    "NBFC",
    "Marketing",
    "Advertisement",
    "Pharma",
    "Media",
    "Other (detail)",
  ];

  return (
    <div
      id="section-employment"
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
          justifyContent: "space-between",
        }}
      >
        <Space>
          <SolutionOutlined style={{ color: "#1890ff" }} />
          <span style={{ fontWeight: 600 }}>Employment / Business Details</span>
        </Space>
        <BankOutlined style={{ color: "#b37feb" }} />
      </Space>

      {/* FORM FIELDS */}
      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          const occupation = getFieldValue("occupationType");

          return (
            <Row gutter={[16, 16]}>
              {/* Occupation Type */}
              <Col xs={24} md={8}>
                <Form.Item label="Occupation Type" name="occupationType">
                  <Select placeholder="Select occupation" allowClear>
                    {occupationOptions.map((opt) => (
                      <Option key={opt} value={opt}>
                        {opt}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              {/* Company / Business Name */}
              <Col xs={24} md={8}>
                <Form.Item label="Company / Business Name" name="companyName">
                  <Input placeholder="Company or business name" />
                </Form.Item>
              </Col>

              {/* Company Type */}
              <Col xs={24} md={8}>
                <Form.Item label="Company Type" name="companyType">
                  <Select placeholder="Select company type" allowClear>
                    {companyTypeOptions.map((opt) => (
                      <Option key={opt} value={opt}>
                        {opt}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              {/* Nature of Business */}
              <Col xs={24} md={8}>
                <Form.Item label="Nature of Business" name="businessNature">
                  <Select
                    placeholder="Select nature of business"
                    allowClear
                    mode="multiple"
                  >
                    {businessNatureOptions.map((opt) => (
                      <Option key={opt} value={opt}>
                        {opt}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              {/* Salary – Salaried only */}
              {occupation === "Salaried" && (
                <Col xs={24} md={8}>
                  <Form.Item label="Monthly Salary" name="salaryMonthly">
                    <Input placeholder="Monthly salary amount" />
                  </Form.Item>
                </Col>
              )}

              {/* Incorporation Year – Self Employed */}
              {(occupation === "Self Employed" ||
                occupation === "Self Employed Professional") && (
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Incorporation Year"
                    name="incorporationYear"
                  >
                    <Input placeholder="YYYY" maxLength={4} />
                  </Form.Item>
                </Col>
              )}

              {/* Designation */}
              <Col xs={24} md={8}>
                <Form.Item label="Designation" name="designation">
                  <Input placeholder="Designation / Role" />
                </Form.Item>
              </Col>

              {/* Office Address */}
              <Col xs={24}>
                <Form.Item label="Office Address" name="employmentAddress">
                  <TextArea
                    rows={3}
                    placeholder="Office / business address"
                    prefix={<HomeOutlined />}
                  />
                </Form.Item>
              </Col>

              {/* Pincode */}
              <Col xs={24} md={8}>
                <Form.Item label="Pincode" name="employmentPincode">
                  <Input placeholder="6-digit pincode" maxLength={6} />
                </Form.Item>
              </Col>

              {/* City */}
              <Col xs={24} md={8}>
                <Form.Item label="City" name="employmentCity">
                  <Input placeholder="City" />
                </Form.Item>
              </Col>

              {/* Office Phone */}
              <Col xs={24} md={8}>
                <Form.Item label="Office Phone" name="employmentPhone">
                  <Input
                    placeholder="Office contact number"
                    prefix={<PhoneOutlined />}
                  />
                </Form.Item>
              </Col>
            </Row>
          );
        }}
      </Form.Item>
    </div>
  );
};

export default EmploymentDetails;
