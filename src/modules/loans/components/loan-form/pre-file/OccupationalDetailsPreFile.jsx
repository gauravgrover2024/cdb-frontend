import React from "react";
import { Form, Input, Select, Row, Col, Space } from "antd";
import { SolutionOutlined } from "@ant-design/icons";

const { Option } = Select;
const { TextArea } = Input;

const OccupationalDetailsPreFile = () => {
  return (
    <div
      id="prefile-occupation"
      style={{
        marginBottom: 32,
        padding: 20,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #f0f0f0",
      }}
    >
      {/* HEADER */}
      <Space style={{ marginBottom: 20 }}>
        <SolutionOutlined style={{ color: "#1890ff" }} />
        <span style={{ fontWeight: 600 }}>Occupational Details </span>
      </Space>

      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          const applicantType = getFieldValue("applicantType");
          const occupation = getFieldValue("occupationType");

          return (
            <Row gutter={[16, 16]}>
              {/* Applicant Type */}
              <Col xs={24} md={8}>
                <Form.Item label="Applicant Type" name="applicantType">
                  <Select disabled>
                    <Option value="Individual">Individual</Option>
                    <Option value="Company">Company</Option>
                  </Select>
                </Form.Item>
              </Col>

              {/* MSME */}
              {applicantType === "Company" && (
                <Col xs={24} md={8}>
                  <Form.Item label="Whether MSME" name="isMSME">
                    <Select>
                      <Option value="Yes">Yes</Option>
                      <Option value="No">No</Option>
                    </Select>
                  </Form.Item>
                </Col>
              )}

              {/* Occupation */}
              <Col xs={24} md={8}>
                <Form.Item label="Occupation" name="occupationType">
                  <Select>
                    <Option value="Salaried">Salaried</Option>
                    <Option value="Self Employed">Self Employed</Option>
                    <Option value="Self Employed Professional">
                      Self Employed Professional
                    </Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>

              {/* PROFESSIONAL TYPE */}
              {occupation === "Self Employed Professional" && (
                <Col xs={24} md={8}>
                  <Form.Item label="Professional Type" name="professionalType">
                    <Select>
                      <Option value="Doctor">Doctor</Option>
                      <Option value="CA">CA</Option>
                      <Option value="CS">CS</Option>
                      <Option value="Consultant">Consultant</Option>
                      <Option value="Architect">Architect</Option>
                      <Option value="Lawyer">Lawyer</Option>
                      <Option value="Other">Other</Option>
                    </Select>
                  </Form.Item>
                </Col>
              )}

              {/* SELF EMPLOYED */}
              {(occupation === "Self Employed" ||
                occupation === "Self Employed Professional") && (
                <>
                  <Col xs={24} md={8}>
                    <Form.Item label="Type of Company" name="companyType">
                      <Select>
                        <Option value="Pvt Ltd">Pvt Ltd</Option>
                        <Option value="Partnership">Partnership</Option>
                        <Option value="Proprietorship">Proprietorship</Option>
                        <Option value="Public Ltd">Public Ltd</Option>
                        <Option value="Other">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Nature of Business" name="businessNature">
                      <Select mode="multiple">
                        <Option value="Manufacturer">Manufacturer</Option>
                        <Option value="Agriculturist">Agriculturist</Option>
                        <Option value="Service Provider">
                          Service Provider
                        </Option>
                        <Option value="Trader">Trader</Option>
                        <Option value="Distributor">Distributor</Option>
                        <Option value="Retailer">Retailer</Option>
                        <Option value="Other">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </>
              )}

              {/* SALARIED */}
              {occupation === "Salaried" && (
                <>
                  <Col xs={24} md={8}>
                    <Form.Item label="Company Type" name="companyType">
                      <Select>
                        <Option value="Pvt Ltd">Pvt Ltd</Option>
                        <Option value="Partnership">Partnership</Option>
                        <Option value="Proprietorship">Proprietorship</Option>
                        <Option value="Public Ltd">Public Ltd</Option>
                        <Option value="PSU">PSU</Option>
                        <Option value="Govt">Govt</Option>
                        <Option value="MNC">MNC</Option>
                        <Option value="Other">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Nature of Business" name="businessNature">
                      <Select mode="multiple">
                        <Option value="Automobiles">Automobiles</Option>
                        <Option value="IT">IT</Option>
                        <Option value="Banking">Banking</Option>
                        <Option value="BPO">BPO</Option>
                        <Option value="Retail">Retail</Option>
                        <Option value="Real Estate">Real Estate</Option>
                        <Option value="NBFC">NBFC</Option>
                        <Option value="Other">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </>
              )}

              {/* COMMON EMPLOYER DETAILS */}
              <Col xs={24} md={8}>
                <Form.Item label="Designation" name="designation">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Experience in Current Job / Business (Years)"
                  name="experienceCurrent"
                >
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Total Experience (Years)"
                  name="totalExperience"
                >
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Company Name" name="companyName">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item label="Company Address" name="employmentAddress">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Pincode" name="employmentPincode">
                  <Input maxLength={6} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="City" name="employmentCity">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Phone Number" name="employmentPhone">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Official Email ID" name="officialEmail">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          );
        }}
      </Form.Item>
    </div>
  );
};

export default OccupationalDetailsPreFile;
