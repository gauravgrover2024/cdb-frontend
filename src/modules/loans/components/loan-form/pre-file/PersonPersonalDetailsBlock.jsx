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
import PermissionFormItem from "../../../../../components/permissions/PermissionFormItem";
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
        <PermissionFormItem label="Applicant Name" name={`${prefix}Name`}>
          <Input />
        </PermissionFormItem>
      </Col>

      <Col md={8}>
        <PermissionFormItem label="Mother's Name" name={`${prefix}MotherName`}>
          <Input />
        </PermissionFormItem>
      </Col>

      <Col md={8}>
        <PermissionFormItem label="Father / Husband Name" name={`${prefix}FatherName`}>
          <Input />
        </PermissionFormItem>
      </Col>

      <Col md={6}>
        <PermissionFormItem label="Date of Birth" name={`${prefix}Dob`}>
          <DatePicker style={{ width: "100%" }} />
        </PermissionFormItem>
      </Col>

      <Col md={6}>
        <PermissionFormItem label="Gender" name={`${prefix}Gender`}>
          <Select options={["Male", "Female"].map((v) => ({ value: v }))} />
        </PermissionFormItem>
      </Col>

      <Col md={6}>
        <PermissionFormItem label="Marital Status" name={`${prefix}MaritalStatus`}>
          <Select
            options={["Married", "Unmarried"].map((v) => ({ value: v }))}
          />
        </PermissionFormItem>
      </Col>

      <Col md={6}>
        <PermissionFormItem label="No of Dependents" name={`${prefix}Dependents`}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </PermissionFormItem>
      </Col>

      <Col md={8}>
        <PermissionFormItem label="Education Details" name={`${prefix}Education`}>
          <Select
            options={[
              "Undergraduate",
              "Graduate",
              "Post Graduate & above",
              "Others",
            ].map((v) => ({ value: v }))}
          />
        </PermissionFormItem>
      </Col>

      <Col span={24}>
        <PermissionFormItem label="Present Address" name={`${prefix}Address`}>
          <TextArea autoSize={{ minRows: 2, maxRows: 5 }} prefix={<HomeOutlined />} />
        </PermissionFormItem>
      </Col>

      <Col md={6}>
        <PermissionFormItem label="Pincode" name={`${prefix}Pincode`}>
          <Input />
        </PermissionFormItem>
      </Col>

      <Col md={6}>
        <PermissionFormItem label="City" name={`${prefix}City`}>
          <Input />
        </PermissionFormItem>
      </Col>

      <Col md={6}>
        <PermissionFormItem
          label="Years at Current Residence"
          name={`${prefix}YearsAtResidence`}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </PermissionFormItem>
      </Col>

      <Col md={6}>
        <PermissionFormItem label="House" name={`${prefix}House`}>
          <Select
            options={[
              "Owned",
              "Parental",
              "Company Provided",
              "Rented (monthly rent)",
            ].map((v) => ({ value: v }))}
          />
        </PermissionFormItem>
      </Col>

      <Col md={8}>
        <PermissionFormItem label="Primary Mobile" name={`${prefix}Mobile`}>
          <Input prefix={<PhoneOutlined />} />
        </PermissionFormItem>
      </Col>

      <Col md={8}>
        <Form.List name={`${prefix}ExtraMobiles`}>
          {(fields, { add, remove }) => (
            <>
              <label>Additional Mobile(s)</label>
              {fields.map((field) => (
                <Space key={field.key}>
                  <PermissionFormItem {...field}>
                    <Input />
                  </PermissionFormItem>
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
        <PermissionFormItem label="PAN Number" name={`${prefix}Pan`}>
          <Input prefix={<IdcardOutlined />} />
        </PermissionFormItem>
      </Col>

      <Col md={8}>
        <PermissionFormItem
          label="Aadhaar Number" 
          name={`${prefix}Aadhaar`}
          rules={[{ pattern: /^[0-9]{12}$/, message: '12 digits required' }]}
        >
          <Input maxLength={12} />
        </PermissionFormItem>
      </Col>
    </Row>
  </>
);

export default PersonPersonalDetailsBlock;
