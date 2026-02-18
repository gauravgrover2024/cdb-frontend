import React, { useEffect, useState } from "react";
import { Form, Input, Select, AutoComplete, Row, Col } from "antd";
import { SolutionOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import { COMPANY_TYPE_OPTIONS, BUSINESS_NATURE_OPTIONS, getOptionsWithCustom } from "../../../../../constants/employmentOptions";

const { Option } = Select;

const OccupationalDetailsPreFile = () => {
  const form = Form.useFormInstance();
  const employmentPincode = Form.useWatch("employmentPincode", form);
  const companyTypeValue = Form.useWatch("companyType", form);
  const businessNatureValue = Form.useWatch("businessNature", form);
  const [fetchingEmploymentPincode, setFetchingEmploymentPincode] = useState(false);
  const companyTypeOptions = getOptionsWithCustom(COMPANY_TYPE_OPTIONS, companyTypeValue);
  const businessNatureOptions = getOptionsWithCustom(BUSINESS_NATURE_OPTIONS, businessNatureValue);

  // Employment Pincode to City Auto-fill
  useEffect(() => {
    if (employmentPincode && employmentPincode.length === 6) {
      const fetchCity = async () => {
        try {
          setFetchingEmploymentPincode(true);
          const response = await fetch(`https://api.postalpincode.in/pincode/${employmentPincode}`);
          const data = await response.json();
          if (data && data[0]?.Status === "Success") {
            const postOffices = data[0].PostOffice;
            if (postOffices && postOffices.length > 0) {
              form.setFieldsValue({ employmentCity: postOffices[0].District });
            }
          }
        } catch (error) {
          console.error("Employment pincode fetch failed", error);
        } finally {
          setFetchingEmploymentPincode(false);
        }
      };
      const timer = setTimeout(fetchCity, 500);
      return () => clearTimeout(timer);
    }
  }, [employmentPincode, form]);

  return (
    <div id="prefile-occupation" className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm mb-6">
      {/* HEADER */}
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <SolutionOutlined className="text-blue-600" />
        </div>
        <span className="text-base text-foreground">Occupational Details</span>
      </div>

      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          const applicantType = getFieldValue("applicantType");
          const occupation = getFieldValue("occupationType");

          return (
            <Row gutter={[24, 0]}>
              {/* Applicant Type */}
              <Col xs={24} md={8}>
                <Form.Item label="Applicant Type" name="applicantType">
                  <Select 
                    disabled 
                    className="h-10 rounded-lg"
                    placeholder="Select Applicant Type"
                  >
                    <Option value="Individual">Individual</Option>
                    <Option value="Company">Company</Option>
                  </Select>
                </Form.Item>
              </Col>

              {/* MSME */}
              {applicantType === "Company" && (
                <Col xs={24} md={8}>
                  <Form.Item label="Whether MSME" name="isMSME">
                    <Select 
                      className="h-10 rounded-lg"
                      placeholder="Select MSME Status"
                    >
                      <Option value="Yes">Yes</Option>
                      <Option value="No">No</Option>
                    </Select>
                  </Form.Item>
                </Col>
              )}

              {/* Occupation */}
              <Col xs={24} md={8}>
                <Form.Item label="Occupation" name="occupationType">
                  <Select 
                    className="h-10 rounded-lg"
                    placeholder="Select Occupation"
                  >
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
                    <Select 
                      className="h-10 rounded-lg"
                      placeholder="Select Professional Type"
                    >
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
                      <AutoComplete
                        className="h-10 w-full"
                        placeholder="Select or type"
                        allowClear
                        options={companyTypeOptions}
                        filterOption={(input, option) =>
                          (option?.label ?? "").toString().toLowerCase().includes((input || "").toLowerCase())
                        }
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Nature of Business" name="businessNature">
                      <AutoComplete
                        className="h-10 w-full"
                        placeholder="Select or type"
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
                    <Form.Item label="Company Type" name="companyType">
                      <AutoComplete
                        className="h-10 w-full"
                        placeholder="Select or type"
                        allowClear
                        options={companyTypeOptions}
                        filterOption={(input, option) =>
                          (option?.label ?? "").toString().toLowerCase().includes((input || "").toLowerCase())
                        }
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label="Nature of Business" name="businessNature">
                      <AutoComplete
                        className="h-10 w-full"
                        placeholder="Select or type"
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

              {/* COMMON EMPLOYER DETAILS */}
              <Col xs={24} md={8}>
                <Form.Item label="Designation" name="designation">
                  <Input className="h-10 rounded-lg" placeholder="Enter Designation" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Current Exp (Years)"
                  name="experienceCurrent"
                >
                  <Input className="h-10 rounded-lg" placeholder="Years" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Total Exp (Years)"
                  name="totalExperience"
                >
                  <Input className="h-10 rounded-lg" placeholder="Years" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Company Name" name="companyName">
                  <Input className="h-10 rounded-lg" placeholder="Enter Company Name" />
                </Form.Item>
              </Col>

              <Col xs={24} md={16}>
                <Form.Item label="Company Address" name="employmentAddress">
                  <Input className="h-10 rounded-lg" placeholder="Full Business Address" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Pincode" name="employmentPincode">
                  <Input className="h-10 rounded-lg" maxLength={6} placeholder="6-digit PIN" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="City" name="employmentCity">
                  <Input 
                    className="h-10 rounded-lg" 
                    placeholder="Auto-filled" 
                    suffix={fetchingEmploymentPincode ? <span className="text-[10px] text-muted-foreground animate-pulse">Fetching...</span> : null} 
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Phone Number" name="employmentPhone">
                  <Input className="h-10 rounded-lg" prefix={<PhoneOutlined className="text-muted-foreground mr-1" />} placeholder="Mobile/Landline" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item 
                  label="Official Email ID" 
                  name="officialEmail"
                  rules={[{ type: 'email', message: 'Invalid email format' }]}
                >
                  <Input className="h-10 rounded-lg" prefix={<MailOutlined className="text-muted-foreground mr-1" />} placeholder="email@company.com" />
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
