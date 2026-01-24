import React from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Card,
  AutoComplete,
  Divider,
  Space,
  Button,
} from "antd";
import { UserOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import demoCustomers from "../../../../customers/demoCustomers";

const { Option } = Select;
const { TextArea } = Input;

const AuthorisedSignatorySection = () => {
  const form = Form.useFormInstance();

  const applicantType = Form.useWatch("applicantType", form);

  // Render ONLY for company applicant
  if (applicantType !== "Company") return null;

  /* ------------------------------
     AUTOFILL FROM DEMO CUSTOMERS
  ------------------------------ */
  const handleSelect = (_, option) => {
    const c = option.customer;

    form.setFieldsValue({
      signatory_name: c.customerName || "",
      signatory_dob: c.dob ? dayjs(c.dob) : null,
      signatory_gender: c.gender || "",
      signatory_address: c.residenceAddress || "",
      signatory_pincode: c.pincode || "",
      signatory_city: c.city || "",
      signatory_pan: c.panNumber || "",
      signatory_aadhaar: c.aadhaarNumber || "",
      signatory_primaryMobile: c.primaryMobile || "",
    });
  };

  const options = demoCustomers.map((c) => ({
    value: `${c.customerName} - ${c.primaryMobile}`,
    label: `${c.customerName} (${c.primaryMobile})`,
    customer: c,
  }));

  return (
    <Card
      style={{ borderRadius: 12, marginBottom: 24 }}
      title={
        <Space>
          <SafetyCertificateOutlined />
          <span>Authorised Signatory Details</span>
        </Space>
      }
    >
      {/* SEARCH */}
      <Form.Item label="Search Authorised Signatory">
        <AutoComplete
          options={options}
          onSelect={handleSelect}
          placeholder="Search by name or mobile"
          allowClear
        />
      </Form.Item>

      <Divider orientation="left">Personal Details</Divider>

      <Row gutter={16}>
        <Col md={8}>
          <Form.Item label="Applicant Name" name="signatory_name">
            <Input prefix={<UserOutlined />} />
          </Form.Item>
        </Col>

        {/* MOBILE NUMBERS */}
        <Col md={8}>
          <Form.Item label="Primary Mobile" name="signatory_primaryMobile">
            <Input />
          </Form.Item>
        </Col>

        <Col span={24}>
          <Form.Item label="Present / Current Address" name="signatory_address">
            <TextArea rows={2} />
          </Form.Item>
        </Col>

        <Col md={6}>
          <Form.Item label="Pincode" name="signatory_pincode">
            <Input />
          </Form.Item>
        </Col>

        <Col md={6}>
          <Form.Item label="City" name="signatory_city">
            <Input />
          </Form.Item>
        </Col>

        <Col md={6}>
          <Form.Item label="Date of Birth" name="signatory_dob">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>

        <Col md={6}>
          <Form.Item label="Gender" name="signatory_gender">
            <Select>
              <Option value="Male">Male</Option>
              <Option value="Female">Female</Option>
            </Select>
          </Form.Item>
        </Col>

        <Col md={8}>
          <Form.Item label="Designation" name="designation">
            <Input />
          </Form.Item>
        </Col>

        <Col md={8}>
          <Form.Item label="PAN Number" name="signatory_pan">
            <Input />
          </Form.Item>
        </Col>

        <Col md={8}>
          <Form.Item label="Aadhaar Number" name="signatory_aadhaar">
            <Input />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
};

export default AuthorisedSignatorySection;
