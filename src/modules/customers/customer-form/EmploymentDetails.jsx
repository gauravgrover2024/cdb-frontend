import React, { useEffect, useState } from "react";
import { Form, Input, Select, AutoComplete, Row, Col, Tag, Spin } from "antd";
import Icon from "../../../components/AppIcon";
import { COMPANY_TYPE_OPTIONS, BUSINESS_NATURE_OPTIONS, getOptionsWithCustom } from "../../../constants/employmentOptions";

const { TextArea } = Input;
const { Option } = Select;

const EmploymentDetails = () => {
  const form = Form.useFormInstance();
  const isFinanced = Form.useWatch("isFinanced", form);
  const occupation = Form.useWatch("occupationType", form);
  const employmentPincode = Form.useWatch("employmentPincode", form);
  const companyTypeValue = Form.useWatch("companyType", form);
  const businessNatureValue = Form.useWatch("businessNature", form);
  const companyTypeOptions = getOptionsWithCustom(COMPANY_TYPE_OPTIONS, companyTypeValue);
  const businessNatureOptions = getOptionsWithCustom(BUSINESS_NATURE_OPTIONS, businessNatureValue);

  const [fetchingPincode, setFetchingPincode] = useState(false);

  // 1. Pincode logic for Office Address
  useEffect(() => {
    if (employmentPincode && employmentPincode.length === 6) {
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
  }, [employmentPincode, form]);

  const showEmployment = isFinanced !== "No";
  if (!showEmployment) return null;

  const occupationOptions = [
    "Salaried",
    "Self Employed",
    "Self Employed Professional",
    "Other",
  ];

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
        <Col xs={24} md={8}>
          <Form.Item label="Occupation Type" name="occupationType">
            <Select placeholder="Select occupation" allowClear>
              {occupationOptions.map((opt) => (
                <Option key={opt} value={opt}>{opt}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

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

        {occupation === "Salaried" && (
          <Col xs={24} md={8} className="mt-4">
            <Form.Item label="Monthly Net Salary" name="salaryMonthly">
              <Input 
                placeholder="Take-home amount" 
                prefix={<Icon name="IndianRupee" size={14} className="text-muted-foreground" />} 
              />
            </Form.Item>
          </Col>
        )}

        {isSelfEmployed && (
          <Col xs={24} md={8} className="mt-4">
            <Form.Item label="Business Since (Year)" name="incorporationYear">
              <Input placeholder="Ex: 2012" maxLength={4} />
            </Form.Item>
          </Col>
        )}

        {/* --- GROUP 3: Contact Details --- */}
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
      </Row>
    </div>
  );
};

export default EmploymentDetails;
