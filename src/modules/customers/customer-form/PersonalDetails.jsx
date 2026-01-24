import React from "react";
import { Form, Input, DatePicker, Select, Row, Col, Tag, Space } from "antd";
import {
  UserOutlined,
  MailOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";

const { TextArea } = Input;
const { Option } = Select;

const PersonalDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);

  // Hide credit-relevant fields ONLY when explicitly "No"
  const showCreditFields = isFinanced !== "No";

  return (
    <div
      id="section-personal"
      style={{
        marginBottom: 32,
        padding: 16,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #f0f0f0",
      }}
    >
      <Space
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Space>
          <UserOutlined style={{ color: "#722ed1" }} />
          <span style={{ fontWeight: 600 }}>Personal Details</span>
        </Space>
        <Tag color="blue">Core</Tag>
      </Space>

      <Row gutter={[16, 0]}>
        {/* Basic identity */}
        <Col xs={24} md={8}>
          <Form.Item label="Customer Name" name="customerName">
            <Input placeholder="Enter full name" prefix={<UserOutlined />} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="S/D/W of" name="sdwOf">
            <Input placeholder="Father / spouse name" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Gender" name="gender">
            <Select placeholder="Select gender" allowClear>
              <Option value="male">Male</Option>
              <Option value="female">Female</Option>
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Date of Birth" name="dob">
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Mother's Name" name="motherName">
            <Input placeholder="Mother's name" />
          </Form.Item>
        </Col>

        <Col xs={24} md={24}>
          <Form.Item label="Residence Address" name="residenceAddress">
            <TextArea rows={3} placeholder="House no, street, area" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Pincode" name="pincode">
            <Input placeholder="6-digit pincode" maxLength={6} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="City" name="city">
            <Input placeholder="City" />
          </Form.Item>
        </Col>

        {/* ===== CREDIT-RELEVANT FIELDS ===== */}
        {showCreditFields && (
          <>
            <Col xs={24} md={8}>
              <Form.Item
                label="Staying in current house since (years)"
                name="yearsInCurrentHouse"
              >
                <Input placeholder="Years" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="House Type" name="houseType">
                <Select placeholder="Select house type" allowClear>
                  <Option value="owned">Owned</Option>
                  <Option value="parental">Parental</Option>
                  <Option value="company">Company Provided</Option>
                  <Option value="rented">Rented</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Education" name="education">
                <Select placeholder="Select education" allowClear>
                  <Option value="undergraduate">Undergraduate</Option>
                  <Option value="graduate">Graduate</Option>
                  <Option value="postgraduate">Post Graduate & above</Option>
                  <Option value="others">Others</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Marital Status" name="maritalStatus">
                <Select placeholder="Select marital status" allowClear>
                  <Option value="married">Married</Option>
                  <Option value="unmarried">Unmarried</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Dependents" name="dependents">
                <Input placeholder="Number of dependents" />
              </Form.Item>
            </Col>
          </>
        )}

        {/* Contact */}
        <Col xs={24} md={24}>
          <Form.Item label="Mobile Numbers">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Form.Item name="primaryMobile" style={{ marginBottom: 0 }}>
                <Input placeholder="Primary" style={{ width: 260 }} />
              </Form.Item>

              <Form.List name="extraMobiles">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <div key={field.key} style={{ display: "flex", gap: 4 }}>
                        <Form.Item {...field} style={{ marginBottom: 0 }}>
                          <Input
                            placeholder="Additional"
                            style={{ width: 220 }}
                          />
                        </Form.Item>
                        <MinusCircleOutlined
                          onClick={() => remove(field.name)}
                          style={{ color: "#ff4d4f", cursor: "pointer" }}
                        />
                      </div>
                    ))}
                    <PlusCircleOutlined
                      onClick={() => add()}
                      style={{ color: "#1890ff", cursor: "pointer" }}
                    />
                  </>
                )}
              </Form.List>
            </div>
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Email ID" name="email">
            <Input
              placeholder="customer@example.com"
              prefix={<MailOutlined />}
            />
          </Form.Item>
        </Col>

        {/* Nominee */}
        <Col xs={24} md={8}>
          <Form.Item label="Nominee Name" name="nomineeName">
            <Input placeholder="Nominee name" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Nominee DOB" name="nomineeDob">
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Nominee Relation" name="nomineeRelation">
            <Input placeholder="Relation" />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default PersonalDetails;
