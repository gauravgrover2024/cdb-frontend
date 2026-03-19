import React, { useEffect, useState } from "react";
import { Form, Input, Select, AutoComplete, Row, Col, Tag, Spin, Button } from "antd";
import Icon from "../../../components/AppIcon";
import { COMPANY_TYPE_OPTIONS, BUSINESS_NATURE_OPTIONS, getOptionsWithCustom } from "../../../constants/employmentOptions";

const { TextArea } = Input;
const { Option } = Select;
const normalizeMultiTags = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

const EmploymentDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);
  const applicantType = Form.useWatch("applicantType", form);
  const occupation = Form.useWatch("occupationType", form);
  const employmentPincode = Form.useWatch("employmentPincode", form);
  const companyTypeValue = Form.useWatch("companyType", form);
  const businessNatureValue = Form.useWatch("businessNature", form);
  const customerName = Form.useWatch("customerName", form);
  const panNumber = Form.useWatch("panNumber", form);
  const incorporationDate = Form.useWatch("dob", form);
  const companyTypeOptions = getOptionsWithCustom(COMPANY_TYPE_OPTIONS, companyTypeValue);
  const businessNatureOptions = getOptionsWithCustom(BUSINESS_NATURE_OPTIONS, businessNatureValue);
  const isCompany = applicantType === "Company";

  const [fetchingPincode, setFetchingPincode] = useState(false);

  // 1. Pincode logic for Office Address
  useEffect(() => {
    if (!isCompany && employmentPincode && employmentPincode.length === 6) {
      const fetchCity = async () => {
        try {
          setFetchingPincode(true);
          const response = await fetch(`https://api.postalpincode.in/pincode/${employmentPincode}`);
          const data = await response.json();

          if (data && data[0]?.Status === "Success") {
             const postOffices = data[0].PostOffice;
             if (postOffices && postOffices.length > 0) {
                 const city = postOffices[0].District; 
                 form.setFieldsValue({ employmentCity: city });
             }
          }
        } catch (error) {
           console.error("Office Pincode fetch failed", error);
        } finally {
           setFetchingPincode(false);
        }
      };

      const timer = setTimeout(fetchCity, 500);
      return () => clearTimeout(timer);
    }
  }, [employmentPincode, form, isCompany]);

  useEffect(() => {
    if (!isCompany) return;

    const pan = String(panNumber || "").trim().toUpperCase();
    const name = String(customerName || "").trim().toUpperCase();
    let inferred = "";

    if (name.includes("PVT LTD") || name.includes("PRIVATE LIMITED")) inferred = "Pvt Ltd";
    else if (name.includes("LIMITED") || name.includes(" LTD")) inferred = "Ltd";
    else if (name.includes("LLP") || name.includes("PARTNERSHIP")) inferred = "Partnership";
    else if (name.includes("PROPRIETOR") || name.includes("PROP")) inferred = "Proprietorship";
    else if (pan.length >= 4) {
      const code = pan[3];
      if (code === "C") inferred = "Pvt Ltd";
      if (code === "F") inferred = "Partnership";
      if (code === "P") inferred = "Proprietorship";
      if (code === "T") inferred = "Trust";
    }

    const patch = {};
    if (!form.getFieldValue("occupationType")) patch.occupationType = "Self Employed";
    if (inferred && !form.getFieldValue("companyType")) patch.companyType = inferred;

    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
    }
  }, [isCompany, customerName, panNumber, form]);

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

  const showEmployment = isFinanced !== "No";
  if (!showEmployment) return null;

  const occupationOptions = isCompany
    ? ["Self Employed", "Self Employed Professional", "Other"]
    : ["Salaried", "Self Employed", "Self Employed Professional", "Other"];

  const isSelfEmployed = occupation?.includes("Self Employed");

  return (
    <div 
        id="section-employment" 
        className="form-section bg-card border border-border/50 rounded-2xl p-6 shadow-sm mb-6"
        style={{ background: "var(--card)" }}
    >
      <div className="section-header mb-6 flex justify-between items-center">
        <div className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
             <Icon name="Briefcase" size={20} />
          </div>
          <span className="text-lg font-bold text-foreground">Employment / Business Details</span>
        </div>
        <Tag className="m-0 border-none bg-purple-500/10 text-purple-600 dark:text-purple-400 uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full">
          Professional
        </Tag>
      </div>

      <Row gutter={[16, 0]}>
        {/* --- GROUP 1: Professional Setup --- */}
        {isCompany ? (
          <Col xs={24} md={8}>
            <Form.Item label="Occupation Type" name="occupationType" hidden>
              <Input />
            </Form.Item>
            <Form.Item label="Business Profile" className="mb-0">
              <Select
                value={occupation || "Self Employed"}
                placeholder="Select business profile"
                onChange={(value) => form.setFieldsValue({ occupationType: value })}
                options={occupationOptions.map((opt) => ({ label: opt, value: opt }))}
              />
            </Form.Item>
          </Col>
        ) : (
          <Col xs={24} md={8}>
            <Form.Item label="Occupation Type" name="occupationType">
              <Select placeholder="Select occupation" allowClear>
                {occupationOptions.map((opt) => (
                  <Option key={opt} value={opt}>{opt}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        )}

        {!isCompany && (
          <>
            <Col xs={24} md={8}>
              <Form.Item 
                label={isSelfEmployed ? "Business Name" : "Company Name"} 
                name="companyName"
              >
                <Input placeholder={isSelfEmployed ? "Trading name" : "Employer name"} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Designation / Role" name="designation">
                <Input placeholder="Enter Position" />
              </Form.Item>
            </Col>
          </>
        )}

        {isCompany && (
          <Col xs={24} md={8}>
            <Form.Item
              label="Whether MSME"
              name="isMSME"
              rules={[{ required: true, message: "Select MSME status" }]}
            >
              <Select placeholder="Select MSME status">
                <Option value="Yes">Yes</Option>
                <Option value="No">No</Option>
              </Select>
            </Form.Item>
          </Col>
        )}

        {/* --- GROUP 2: Business Specifics --- */}
        <Col xs={24} md={8} className="mt-4">
          <Form.Item label="Constitution / Type" name="companyType">
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

        <Col xs={24} md={8} className="mt-4">
          <Form.Item label="Nature of Business" name="businessNature">
            <Select
              mode="tags"
              placeholder="Select business nature(s)"
              allowClear
              showSearch
              optionFilterProp="label"
              options={businessNatureOptions}
              tokenSeparators={[","]}
              onChange={(value) =>
                form.setFieldsValue({ businessNature: normalizeMultiTags(value) })
              }
            />
          </Form.Item>
        </Col>

        {(occupation === "Self Employed Professional" || (isCompany && occupation === "Self Employed Professional")) && (
          <Col xs={24} md={8} className="mt-4">
            <Form.Item label="Professional Type" name="professionalType">
              <Select placeholder="Select professional type" allowClear>
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

        {!isCompany && occupation === "Salaried" && (
          <Col xs={24} md={8} className="mt-4">
            <Form.Item label="Monthly Net Salary" name="salaryMonthly">
              <Input 
                placeholder="Take-home amount" 
                prefix={<Icon name="IndianRupee" size={14} className="text-muted-foreground" />} 
              />
            </Form.Item>
          </Col>
        )}

        {!isCompany && isSelfEmployed && (
          <Col xs={24} md={8} className="mt-4">
            <Form.Item label="Business Since (Year)" name="incorporationYear">
              <Input placeholder="Ex: 2012" maxLength={4} />
            </Form.Item>
          </Col>
        )}

        <Col xs={24} md={8} className="mt-4">
          <Form.Item label={isCompany ? "Business Since / Current Vintage (Years)" : "Current Exp (Years)"} name="experienceCurrent">
            <Input placeholder="Years" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8} className="mt-4">
          <Form.Item label="Total Exp (Years)" name="totalExperience">
            <Input placeholder="Years" />
          </Form.Item>
        </Col>

        {/* --- GROUP 3: Contact Details --- */}
        {!isCompany && (
          <>
            <Col xs={24} md={24}>
              <div className="section-divider" />
              <span className="text-[13px] font-black text-foreground uppercase tracking-widest block mb-4">Workplace Address</span>
            </Col>

            <Col xs={24}>
              <Form.Item label="Office Address" name="employmentAddress">
                <TextArea rows={2} placeholder="Building, Street, Area" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Pincode" name="employmentPincode">
                <Input placeholder="6-Digit Pincode" maxLength={6} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="City" name="employmentCity">
                <Input 
                  placeholder="Auto-filled" 
                  suffix={fetchingPincode ? <Spin size="small" /> : null} 
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item label="Office Phone" name="employmentPhone">
                <Input
                  placeholder="Work contact"
                  prefix={<Icon name="Phone" size={14} className="text-muted-foreground mr-1" />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8} className="mt-4">
              <Form.Item
                label="Official Email ID"
                name="officialEmail"
                rules={[{ type: "email", message: "Enter a valid email" }]}
              >
                <Input placeholder="email@company.com" />
              </Form.Item>
            </Col>
          </>
        )}

        {isCompany && (
          <Col xs={24}>
            <div className="section-divider" />
            <div className="mb-3 text-[13px] font-black uppercase tracking-widest text-foreground">
              Partners / Directors Details
            </div>
            <Form.List name="companyPartners">
              {(fields, { add, remove }) => (
                <div className="space-y-3">
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded-xl border border-border bg-foreground/[0.02] p-3"
                    >
                      <div className="md:col-span-4">
                        <Form.Item {...field} label="Name" name={[field.name, "name"]} className="mb-0">
                          <Input placeholder="Partner / Director name" />
                        </Form.Item>
                      </div>
                      <div className="md:col-span-3">
                        <Form.Item {...field} label="PAN No." name={[field.name, "panNumber"]} className="mb-0">
                          <Input placeholder="PAN Number" />
                        </Form.Item>
                      </div>
                      <div className="md:col-span-3">
                        <Form.Item {...field} label="Contact" name={[field.name, "contactNumber"]} className="mb-0">
                          <Input placeholder="Mobile Number" />
                        </Form.Item>
                      </div>
                      <div className="md:col-span-2">
                        <Form.Item {...field} label="Date of Birth" name={[field.name, "dateOfBirth"]} className="mb-0">
                          <Input type="date" />
                        </Form.Item>
                      </div>
                      <div className="md:col-span-12 flex justify-end">
                        <Button type="text" danger onClick={() => remove(field.name)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="dashed"
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
          </Col>
        )}
      </Row>
    </div>
  );
};

export default EmploymentDetails;
