import React from "react";
import { Form, Row, Col, Input, Select, Divider } from "antd";
import { SolutionOutlined } from "@ant-design/icons";

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
                      <Select>
                        <Select.Option value="Pvt Ltd">Pvt Ltd</Select.Option>
                        <Select.Option value="Partnership">
                          Partnership
                        </Select.Option>
                        <Select.Option value="Proprietorship">
                          Proprietorship
                        </Select.Option>
                        <Select.Option value="Public Ltd">
                          Public Ltd
                        </Select.Option>
                        <Select.Option value="Other">Other</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Nature of Business"
                      name={`${prefix}_businessNature`}
                    >
                      <Select>
                        <Select.Option value="Manufacturer">
                          Manufacturer
                        </Select.Option>
                        <Select.Option value="Agriculturist">
                          Agriculturist
                        </Select.Option>
                        <Select.Option value="Service Provider">
                          Service Provider
                        </Select.Option>
                        <Select.Option value="Trader">Trader</Select.Option>
                        <Select.Option value="Distributor">
                          Distributor
                        </Select.Option>
                        <Select.Option value="Comm Agent">
                          Comm Agent
                        </Select.Option>
                        <Select.Option value="Retailer">Retailer</Select.Option>
                        <Select.Option value="Other">Other</Select.Option>
                      </Select>
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
                      <Select>
                        <Select.Option value="Pvt Ltd">Pvt Ltd</Select.Option>
                        <Select.Option value="Partnership">
                          Partnership
                        </Select.Option>
                        <Select.Option value="Proprietorship">
                          Proprietorship
                        </Select.Option>
                        <Select.Option value="Public Ltd">
                          Public Ltd
                        </Select.Option>
                        <Select.Option value="Retailers">
                          Retailers
                        </Select.Option>
                        <Select.Option value="PSU">PSU</Select.Option>
                        <Select.Option value="Govt">Govt</Select.Option>
                        <Select.Option value="MNC">MNC</Select.Option>
                        <Select.Option value="Other">Other</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label="Nature of Business"
                      name={`${prefix}_businessNature`}
                    >
                      <Select>
                        <Select.Option value="Automobiles">
                          Automobiles
                        </Select.Option>
                        <Select.Option value="Agriculture Based">
                          Agriculture Based
                        </Select.Option>
                        <Select.Option value="Banking">Banking</Select.Option>
                        <Select.Option value="BPO">BPO</Select.Option>
                        <Select.Option value="Capital Goods">
                          Capital Goods
                        </Select.Option>
                        <Select.Option value="Telecom">Telecom</Select.Option>
                        <Select.Option value="IT">IT</Select.Option>
                        <Select.Option value="Retail">Retail</Select.Option>
                        <Select.Option value="Real Estate">
                          Real Estate
                        </Select.Option>
                        <Select.Option value="Consumer Durables">
                          Consumer Durables
                        </Select.Option>
                        <Select.Option value="FMCG">FMCG</Select.Option>
                        <Select.Option value="NBFC">NBFC</Select.Option>
                        <Select.Option value="Marketing">
                          Marketing
                        </Select.Option>
                        <Select.Option value="Advertisement">
                          Advertisement
                        </Select.Option>
                        <Select.Option value="Pharma">Pharma</Select.Option>
                        <Select.Option value="Media">Media</Select.Option>
                        <Select.Option value="Other">Other</Select.Option>
                      </Select>
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
