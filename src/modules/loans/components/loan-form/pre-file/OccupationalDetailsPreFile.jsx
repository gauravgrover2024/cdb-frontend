import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, Select, AutoComplete, Row, Col, Button } from "antd";
import { SolutionOutlined, PlusCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import { COMPANY_TYPE_OPTIONS, BUSINESS_NATURE_OPTIONS, getOptionsWithCustom } from "../../../../../constants/employmentOptions";
import { lookupCityByPincode, normalizePincode } from "./pincodeCityLookup";

const { Option } = Select;

const OccupationalDetailsPreFile = () => {
  const form = Form.useFormInstance();
  const applicantType = Form.useWatch("applicantType", form);
  const employmentPincode = Form.useWatch("employmentPincode", form);
  const companyTypeValue = Form.useWatch("companyType", form);
  const businessNatureValue = Form.useWatch("businessNature", form);
  const customerName = Form.useWatch("customerName", form);
  const panNumber = Form.useWatch("panNumber", form);
  const occupationType = Form.useWatch("occupationType", form);
  const incorporationDate = Form.useWatch("dob", form);
  const [fetchingEmploymentPincode, setFetchingEmploymentPincode] = useState(false);
  const companyTypeOptions = getOptionsWithCustom(COMPANY_TYPE_OPTIONS, companyTypeValue);
  const businessNatureOptions = useMemo(
    () => getOptionsWithCustom(BUSINESS_NATURE_OPTIONS, businessNatureValue),
    [businessNatureValue],
  );
  const isCompany = applicantType === "Company";

  const companyOccupationOptions = [
    { label: "Self Employed", value: "Self Employed" },
    { label: "Self Employed Professional", value: "Self Employed Professional" },
    { label: "Other", value: "Other" },
  ];

  const inferredCompanyType = useMemo(() => {
    const pan = String(panNumber || "").trim().toUpperCase();
    const name = String(customerName || "").trim().toUpperCase();

    if (name.includes("PVT LTD") || name.includes("PRIVATE LIMITED")) return "Pvt Ltd";
    if (name.includes("LIMITED") || name.includes(" LTD")) return "Ltd";
    if (name.includes("LLP")) return "Partnership";
    if (name.includes("PARTNERSHIP")) return "Partnership";
    if (name.includes("PROPRIETOR") || name.includes("PROP")) return "Proprietorship";
    if (pan.length >= 4) {
      const code = pan[3];
      if (code === "C") return "Pvt Ltd";
      if (code === "F") return "Partnership";
      if (code === "P") return "Proprietorship";
      if (code === "T") return "Trust";
    }
    return "";
  }, [customerName, panNumber]);

  // Employment Pincode to City Auto-fill
  useEffect(() => {
    const pin = normalizePincode(employmentPincode);
    if (isCompany || !pin) return;
    let cancelled = false;
    const fetchCity = async () => {
      try {
        setFetchingEmploymentPincode(true);
        const city = await lookupCityByPincode(pin);
        if (!cancelled && city) {
          form.setFieldsValue({ employmentCity: city });
        }
      } catch (error) {
        console.error("Employment pincode fetch failed", error);
      } finally {
        if (!cancelled) setFetchingEmploymentPincode(false);
      }
    };
    const timer = setTimeout(fetchCity, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [employmentPincode, form, isCompany]);

  useEffect(() => {
    if (!isCompany) return;

    const patch = {};
    if (!form.getFieldValue("occupationType")) patch.occupationType = "Self Employed";
    if (inferredCompanyType && !form.getFieldValue("companyType")) {
      patch.companyType = inferredCompanyType;
    }

    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
    }
  }, [isCompany, inferredCompanyType, form]);

  useEffect(() => {
    if (!isCompany || !incorporationDate) return;
    const date = new Date(incorporationDate?.toISOString ? incorporationDate.toISOString() : incorporationDate);
    if (Number.isNaN(date.getTime())) return;

    const now = new Date();
    let years = now.getFullYear() - date.getFullYear();
    const monthDiff = now.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
      years -= 1;
    }
    const value = years >= 0 ? String(years) : "";
    form.setFieldsValue({
      experienceCurrent: value,
      totalExperience: value,
    });
  }, [isCompany, incorporationDate, form]);

  return (
    <div id="prefile-occupation" className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm mb-6">
      {/* HEADER */}
      <div className="section-header mb-6 flex items-center gap-2">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <SolutionOutlined className="text-blue-600" />
        </div>
        <span className="text-base text-foreground">Occupational Details</span>
      </div>

      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          const liveApplicantType = getFieldValue("applicantType");
          const occupation = getFieldValue("occupationType");
          const companyMode = liveApplicantType === "Company";

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
              {companyMode && (
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Whether MSME"
                    name="isMSME"
                    rules={[{ required: true, message: "Select MSME status" }]}
                  >
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
              {!companyMode && (
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
              )}

              {companyMode && (
                <Col xs={24} md={8}>
                  <Form.Item label="Occupation" name="occupationType" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Business Profile" className="mb-0">
                    <Select
                      value={occupationType || "Self Employed"}
                      options={companyOccupationOptions}
                      className="h-10 rounded-lg"
                      onChange={(value) => form.setFieldsValue({ occupationType: value })}
                    />
                  </Form.Item>
                </Col>
              )}

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

              {(occupation === "Self Employed" ||
                occupation === "Self Employed Professional" ||
                companyMode) && (
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
                      <Select
                        mode="multiple"
                        className="w-full"
                        placeholder="Select or type multiple business types"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={businessNatureOptions}
                        onChange={(value) => form.setFieldsValue({ businessNature: value })}
                      />
                    </Form.Item>
                  </Col>
                </>
              )}

              {/* SALARIED */}
              {!companyMode && occupation === "Salaried" && (
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
                <Form.Item
                  label={companyMode ? "Business Since / Current Vintage (Years)" : "Current Exp (Years)"}
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

              {!companyMode && (
                <>
                  <Col xs={24} md={8}>
                    <Form.Item label="Designation" name="designation">
                      <Input className="h-10 rounded-lg" placeholder="Enter Designation" />
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
                      <Input className="h-10 rounded-lg" placeholder="Mobile/Landline" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item 
                      label="Official Email ID" 
                      name="officialEmail"
                      rules={[{ type: 'email', message: 'Invalid email format' }]}
                    >
                      <Input className="h-10 rounded-lg" placeholder="email@company.com" />
                    </Form.Item>
                  </Col>
                </>
              )}

              {companyMode && (
                <Col span={24}>
                  <div className="mt-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          Partners / Directors Details
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Add the key partners or directors associated with this company case
                        </div>
                      </div>
                    </div>

                    <Form.List name="companyPartners">
                      {(fields, { add, remove }) => (
                        <div className="space-y-3">
                          <div className="hidden md:grid md:grid-cols-12 gap-3 px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            <div className="md:col-span-4">Name</div>
                            <div className="md:col-span-3">PAN No.</div>
                            <div className="md:col-span-3">Contact</div>
                            <div className="md:col-span-2">Date of Birth</div>
                          </div>

                          {fields.map((field) => (
                            <div
                              key={field.key}
                              className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded-xl border border-border bg-background p-3"
                            >
                              <div className="md:col-span-4">
                                <Form.Item
                                  {...field}
                                  label="Name"
                                  name={[field.name, "name"]}
                                  className="mb-0"
                                >
                                  <Input placeholder="Partner / Director name" />
                                </Form.Item>
                              </div>

                              <div className="md:col-span-3">
                                <Form.Item
                                  {...field}
                                  label="PAN No."
                                  name={[field.name, "panNumber"]}
                                  className="mb-0"
                                >
                                  <Input placeholder="PAN Number" />
                                </Form.Item>
                              </div>

                              <div className="md:col-span-3">
                                <Form.Item
                                  {...field}
                                  label="Contact"
                                  name={[field.name, "contactNumber"]}
                                  className="mb-0"
                                >
                                  <Input placeholder="Mobile Number" />
                                </Form.Item>
                              </div>

                              <div className="md:col-span-2">
                                <Form.Item
                                  {...field}
                                  label="Date of Birth"
                                  name={[field.name, "dateOfBirth"]}
                                  className="mb-0"
                                >
                                  <Input type="date" />
                                </Form.Item>
                              </div>

                              <div className="md:col-span-12 flex justify-end">
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => remove(field.name)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}

                          <Button
                            type="dashed"
                            icon={<PlusCircleOutlined />}
                            onClick={() =>
                              add({
                                name: "",
                                panNumber: "",
                                contactNumber: "",
                                dateOfBirth: "",
                              })
                            }
                          >
                            Add Partner / Director
                          </Button>
                        </div>
                      )}
                    </Form.List>
                  </div>
                </Col>
              )}
            </Row>
          );
        }}
      </Form.Item>
    </div>
  );
};

export default OccupationalDetailsPreFile;
