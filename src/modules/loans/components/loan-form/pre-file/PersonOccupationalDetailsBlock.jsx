import React from "react";
import { Form, Row, Col, Input, Select, AutoComplete, Divider } from "antd";
import { SolutionOutlined } from "@ant-design/icons";
import { COMPANY_TYPE_OPTIONS, BUSINESS_NATURE_OPTIONS, getOptionsWithCustom } from "../../../../../constants/employmentOptions";

const { TextArea } = Input;

/**
 * Props:
 *  - prefix: "co" | "g"
 *  - title: string
 */
const PersonOccupationalDetails = ({ prefix, title }) => {
  return (
    <>
      <Divider orientation="left">
        <SolutionOutlined /> {title}
      </Divider>

      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          const occupation = getFieldValue(`${prefix}_occupation`);
          const companyTypeValue = getFieldValue(`${prefix}_companyType`);
          const businessNatureValue = getFieldValue(`${prefix}_businessNature`);
          const companyTypeOptions = getOptionsWithCustom(COMPANY_TYPE_OPTIONS, companyTypeValue);
          const businessNatureOptions = getOptionsWithCustom(BUSINESS_NATURE_OPTIONS, businessNatureValue);

          return (
            <Row gutter={[16, 12]}>
              {/* Occupation */}
              <Col xs={24} md={8}>
                <Form.Item label="Occupation" name={`${prefix}_occupation`}>
                  <Select>
                    <Select.Option value="Salaried">Salaried</Select.Option>
                    <Select.Option value="Self Employed">
                      Self Employed
                    </Select.Option>
                    <Select.Option value="Self Employed Professional">
                      Self Employed Professional
                    </Select.Option>
                    <Select.Option value="Other">Other</Select.Option>
                  </Select>
                </Form.Item>
              </Col>

              {/* Professional Type */}
              {occupation === "Self Employed Professional" && (
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Professional Type"
                    name={`${prefix}_professionalType`}
                  >
                    <Select>
                      <Select.Option value="Doctor">Doctor</Select.Option>
                      <Select.Option value="CA">CA</Select.Option>
                      <Select.Option value="CS">CS</Select.Option>
                      <Select.Option value="Consultant">
                        Consultant
                      </Select.Option>
                      <Select.Option value="Architect">Architect</Select.Option>
                      <Select.Option value="Lawyer">Lawyer</Select.Option>
                      <Select.Option value="Other">Other</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              )}

              {/* SELF EMPLOYED */}
              {(occupation === "Self Employed" ||
                occupation === "Self Employed Professional") && (
                <>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Type of Company"
                      name={`${prefix}_companyType`}
                    >
                      <AutoComplete
                        placeholder="Select or type your own"
                        allowClear
                        options={companyTypeOptions}
                        filterOption={(input, option) =>
                          (option?.label ?? "").toString().toLowerCase().includes((input || "").toLowerCase())
                        }
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Nature of Business"
                      name={`${prefix}_businessNature`}
                    >
                      <AutoComplete
                        placeholder="Select or type your own"
                        allowClear
                        options={businessNatureOptions}
                        filterOption={(input, option) =>
                          (option?.label ?? "").toString().toLowerCase().includes((input || "").toLowerCase())
                        }
                      />
                    </Form.Item>
                  </Col>
                </>
              )}

              {/* SALARIED */}
              {occupation === "Salaried" && (
                <>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Type of Company"
                      name={`${prefix}_companyType`}
                    >
                      <AutoComplete
                        placeholder="Select or type your own"
                        allowClear
                        options={companyTypeOptions}
                        filterOption={(input, option) =>
                          (option?.label ?? "").toString().toLowerCase().includes((input || "").toLowerCase())
                        }
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Nature of Business"
                      name={`${prefix}_businessNature`}
                    >
                      <AutoComplete
                        placeholder="Select or type your own"
                        allowClear
                        options={businessNatureOptions}
                        filterOption={(input, option) =>
                          (option?.label ?? "").toString().toLowerCase().includes((input || "").toLowerCase())
                        }
                      />
                    </Form.Item>
                  </Col>
                </>
              )}

              {/* Common */}
              <Col xs={24} md={8}>
                <Form.Item
                  label="Employer / Business Detail"
                  name={`${prefix}_employerDetail`}
                >
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Designation" name={`${prefix}_designation`}>
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Experience in Current Job / Business"
                  name={`${prefix}_currentExperience`}
                >
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Total Experience"
                  name={`${prefix}_totalExperience`}
                >
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Company Name" name={`${prefix}_companyName`}>
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  label="Company Address"
                  name={`${prefix}_companyAddress`}
                >
                  <TextArea rows={2} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Pin code" name={`${prefix}_companyPincode`}>
                  <Input maxLength={6} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="City" name={`${prefix}_companyCity`}>
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Phone No" name={`${prefix}_companyPhone`}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          );
        }}
      </Form.Item>
    </>
  );
};

export default PersonOccupationalDetails;
