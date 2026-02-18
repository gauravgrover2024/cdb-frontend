// loan-form/pre-file/blocks/PersonPersonalDetailsBlock.jsx
import React from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Space,
  Button,
} from "antd";
import {
  UserOutlined,
  HomeOutlined,
  PhoneOutlined,
  IdcardOutlined,
} from "@ant-design/icons";

const { TextArea } = Input;


const PersonPersonalDetailsBlock = ({ prefix }) => (
  <>
    <Space style={{ marginBottom: 12 }}>
      <UserOutlined />
      <strong>Personal Details</strong>
    </Space>

    <Row gutter={[16, 16]}>
      <Col md={8}>
        <Form.Item label="Applicant Name" name={`${prefix}Name`}>
          <Input />
        </Form.Item>
      </Col>

      <Col md={8}>
        <Form.Item label="Mother's Name" name={`${prefix}MotherName`}>
          <Input />
        </Form.Item>
      </Col>

      <Col md={8}>
        <Form.Item label="Father / Husband Name" name={`${prefix}FatherName`}>
          <Input />
        </Form.Item>
      </Col>

      <Col md={6}>
        <Form.Item label="Date of Birth" name={`${prefix}Dob`}>
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
      </Col>

      <Col md={6}>
        <Form.Item label="Gender" name={`${prefix}Gender`}>
          <Select options={["Male", "Female"].map((v) => ({ value: v }))} />
        </Form.Item>
      </Col>

      <Col md={6}>
        <Form.Item label="Marital Status" name={`${prefix}MaritalStatus`}>
          <Select
            options={["Married", "Unmarried"].map((v) => ({ value: v }))}
          />
        </Form.Item>
      </Col>

      <Col md={6}>
        <Form.Item label="No of Dependents" name={`${prefix}Dependents`}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
      </Col>

      <Col md={8}>
        <Form.Item label="Education Details" name={`${prefix}Education`}>
          <Select
            options={[
              "Undergraduate",
              "Graduate",
              "Post Graduate & above",
              "Others",
            ].map((v) => ({ value: v }))}
          />
        </Form.Item>
      </Col>

      <Col span={24}>
        <Form.Item label="Present Address" name={`${prefix}Address`}>
          <TextArea rows={2} prefix={<HomeOutlined />} />
        </Form.Item>
      </Col>

      <Col md={6}>
        <Form.Item label="Pincode" name={`${prefix}Pincode`}>
          <Input />
        </Form.Item>
      </Col>

      <Col md={6}>
        <Form.Item label="City" name={`${prefix}City`}>
          <Input />
        </Form.Item>
      </Col>

      <Col md={6}>
        <Form.Item
          label="Years at Current Residence"
          name={`${prefix}YearsAtResidence`}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
      </Col>

      <Col md={6}>
        <Form.Item label="House" name={`${prefix}House`}>
          <Select
            options={[
              "Owned",
              "Parental",
              "Company Provided",
              "Rented (monthly rent)",
            ].map((v) => ({ value: v }))}
          />
        </Form.Item>
      </Col>

      <Col md={8}>
        <Form.Item label="Primary Mobile" name={`${prefix}Mobile`}>
          <Input prefix={<PhoneOutlined />} />
        </Form.Item>
      </Col>

      <Col md={8}>
        <Form.List name={`${prefix}ExtraMobiles`}>
          {(fields, { add, remove }) => (
            <>
              <label>Additional Mobile(s)</label>
              {fields.map((field) => (
                <Space key={field.key}>
                  <Form.Item {...field}>
                    <Input />
                  </Form.Item>
                  <Button danger onClick={() => remove(field.name)}>
                    Remove
                  </Button>
                </Space>
              ))}
              <Button type="dashed" onClick={() => add()}>
                + Add Mobile
              </Button>
            </>
          )}
        </Form.List>
      </Col>

      <Col md={8}>
        <Form.Item label="PAN Number" name={`${prefix}Pan`}>
          <Input prefix={<IdcardOutlined />} />
        </Form.Item>
      </Col>

      <Col md={8}>
        <Form.Item 
          label="Aadhaar Number" 
          name={`${prefix}Aadhaar`}
          rules={[{ pattern: /^[0-9]{12}$/, message: '12 digits required' }]}
        >
          <Input maxLength={12} />
        </Form.Item>
      </Col>
    </Row>
  </>
);

export default PersonPersonalDetailsBlock;
