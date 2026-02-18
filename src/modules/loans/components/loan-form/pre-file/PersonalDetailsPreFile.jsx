import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Space,
  Switch,
} from "antd";
import {
  UserOutlined,
  IdcardOutlined,
  PhoneOutlined,
  MailOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { TextArea } = Input;

const IDENTITY_OPTIONS = [
  { label: "Aadhaar Card", value: "AADHAAR" },
  { label: "Voter ID", value: "VOTER_ID" },
  { label: "Passport", value: "PASSPORT" },
  { label: "Driving License", value: "DRIVING_LICENSE" },
];

const ADDRESS_PROOF_OPTIONS = [
  { label: "Aadhaar Card", value: "AADHAAR" },
  { label: "Voter ID", value: "VOTER_ID" },
  { label: "Passport", value: "PASSPORT" },
  { label: "Driving License", value: "DRIVING_LICENSE" },
];

const HOUSE_TYPE_OPTIONS = [
  { label: "Owned", value: "owned" },
  { label: "Parental", value: "parental" },
  { label: "Company Provided", value: "company" },
  { label: "Rented (monthly rent)", value: "rented" },
];

const ADDRESS_TYPE_OPTIONS = [
  { label: "Residential", value: "residential" },
  { label: "Business", value: "business" },
  { label: "Registered Office", value: "registered" },
];

const PersonalDetailsPreFile = () => {
  const form = Form.useFormInstance();

  // Watches
  const identityType = Form.useWatch("identityProofType", form);
  const sameAsCurrent = Form.useWatch("sameAsCurrentAddress", form);
  const pincode = Form.useWatch("pincode", form);
  const permanentPincode = Form.useWatch("permanentPincode", form);
  const dob = Form.useWatch("dob", form);

  // State
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const [fetchingPermanentPincode, setFetchingPermanentPincode] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState(null);

  // Calculate age
  useEffect(() => {
    if (dob) {
      const birthDate = dayjs(dob);
      if (birthDate.isValid()) {
        setCalculatedAge(dayjs().diff(birthDate, 'year'));
      }
    }
  }, [dob]);

  // Helper for KYC auto-fill
  const getKycValues = React.useCallback(() => ({
    aadhaar: form.getFieldValue("aadhaarNumber") || "",
    passport: form.getFieldValue("passportNumber") || "",
    dl: form.getFieldValue("dlNumber") || "",
  }), [form]);

  // Pincode Fetching (Current)
  useEffect(() => {
    if (pincode?.length === 6) {
      const fetchCity = async () => {
        try {
          setFetchingPincode(true);
          const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
          const data = await res.json();
          if (data?.[0]?.Status === "Success") {
            form.setFieldsValue({ city: data[0].PostOffice[0].District });
          }
        } finally { setFetchingPincode(false); }
      };
      const timer = setTimeout(fetchCity, 500);
      return () => clearTimeout(timer);
    }
  }, [pincode, form]);

  // Pincode Fetching (Permanent)
  useEffect(() => {
    if (permanentPincode?.length === 6) {
      const fetchCity = async () => {
        try {
          setFetchingPermanentPincode(true);
          const res = await fetch(`https://api.postalpincode.in/pincode/${permanentPincode}`);
          const data = await res.json();
          if (data?.[0]?.Status === "Success") {
            form.setFieldsValue({ permanentCity: data[0].PostOffice[0].District });
          }
        } finally { setFetchingPermanentPincode(false); }
      };
      const timer = setTimeout(fetchCity, 500);
      return () => clearTimeout(timer);
    }
  }, [permanentPincode, form]);

  // Identity logic
  useEffect(() => {
    const kyc = getKycValues();
    let val = identityType === "AADHAAR" ? kyc.aadhaar : identityType === "PASSPORT" ? kyc.passport : identityType === "DRIVING_LICENSE" ? kyc.dl : "";
    if (val) form.setFieldsValue({ identityProofNumber: val });
  }, [identityType, form, getKycValues]);

  return (
    <div style={{ background: "var(--card)", padding: 20, borderRadius: 12, border: "2px solid var(--border)", marginBottom: 24 }}>
      <Space style={{ marginBottom: 20 }}>
        <IdcardOutlined style={{ color: "#722ed1" }} />
        <span style={{ fontWeight: 600, fontSize: 15 }}>Personal Details</span>
      </Space>

      <Row gutter={[16, 0]}>
        {/* Row 1 */}
        <Col xs={24} md={8}><Form.Item label="Customer Name" name="customerName"><Input disabled prefix={<UserOutlined />} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="Mother's Name" name="motherName"><Input placeholder="Mother's Name" /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="Father / Husband Name" name="sdwOf"><Input placeholder="Father/Husband Name" /></Form.Item></Col>

        {/* Row 2 */}
        <Col xs={24} md={8}>
          <Form.Item label="Date of Birth" name="dob">
            <DatePicker style={{ width: "100%" }} suffixIcon={calculatedAge !== null ? <span style={{fontSize: '10px', color: '#888'}}>Age: {calculatedAge}</span> : null} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}><Form.Item label="Gender" name="gender"><Select options={[{ label: "Male", value: "Male" }, { label: "Female", value: "Female" }]} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="Marital Status" name="maritalStatus"><Select options={[{ label: "Married", value: "Married" }, { label: "Unmarried", value: "Unmarried" }]} /></Form.Item></Col>

        {/* Row 3 */}
        <Col xs={24} md={8}><Form.Item label="No. of Dependents" name="dependents"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
        <Col xs={24} md={8}>
          <Form.Item label="Education" name="education">
            <Select options={[{ label: "Undergraduate", value: "Undergraduate" }, { label: "Graduate", value: "Graduate" }, { label: "Post Graduate & above", value: "Postgraduate" }, { label: "Others", value: "Others" }]} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}><Form.Item label="House" name="houseType"><Select options={HOUSE_TYPE_OPTIONS} /></Form.Item></Col>

        {/* Row 4 */}
        <Col xs={24} md={8}><Form.Item label="Address Type" name="addressType"><Select options={ADDRESS_TYPE_OPTIONS} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="Identity Proof" name="identityProofType"><Select options={IDENTITY_OPTIONS} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="Identity Proof Number" name="identityProofNumber"><Input /></Form.Item></Col>

        {/* Conditional Expiry Row */}
        {(identityType === "PASSPORT" || identityType === "DRIVING_LICENSE") && (
          <Col xs={24} md={8}><Form.Item label="Identity Proof Expiry" name="identityProofExpiry"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
        )}

        {/* Row 5: Current Address */}
        <Col xs={24} md={8}><Form.Item label="Present Address" name="residenceAddress"><TextArea rows={1} placeholder="Address" /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="Pincode" name="pincode"><Input maxLength={6} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="City" name="city"><Input suffix={fetchingPincode ? "..." : null} /></Form.Item></Col>

        {/* Row 6 */}
        <Col xs={24} md={8}><Form.Item label="Years at current City" name="yearsInCurrentCity"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="Years at current Residence" name="yearsInCurrentHouse"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
        {/* Primary & Extra Mobiles - Unified UI */}
        <Form.List name="extraMobiles">
          {(fields, { add, remove }) => (
            <>
              {/* Primary Mobile with Plus Icon */}
              <Col xs={24} md={8}>
                <Form.Item label="Primary Mobile" name="primaryMobile">
                  <Input 
                    prefix={<PhoneOutlined />} 
                    suffix={
                      <PlusCircleOutlined 
                        style={{ color: "#1890ff", cursor: "pointer" }} 
                        onClick={() => add()} 
                        title="Add Alternative Mobile"
                      />
                    }
                  />
                </Form.Item>
              </Col>

              {/* Dynamic Extra Mobiles */}
              {fields.map((field, index) => (
                <Col xs={24} md={8} key={field.key}>
                  <Form.Item label="Additional Mobile">
                    <Form.Item {...field} noStyle>
                      <Input
                        placeholder="Mobile Number"
                        prefix={<PhoneOutlined />}
                        suffix={
                          <Space>
                            <DeleteOutlined 
                              style={{ color: "#ff4d4f", cursor: "pointer" }} 
                              onClick={() => remove(field.name)} 
                              title="Remove"
                            />
                            {index === fields.length - 1 && (
                              <PlusCircleOutlined 
                                style={{ color: "#1890ff", cursor: "pointer" }} 
                                onClick={() => add()} 
                                title="Add Another"
                              />
                            )}
                          </Space>
                        }
                      />
                    </Form.Item>
                  </Form.Item>
                </Col>
              ))}
            </>
          )}
        </Form.List>

        <Col xs={24} md={8}><Form.Item label="Email ID" name="email" rules={[{ type: 'email' }]}><Input prefix={<MailOutlined />} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="Address Proof (type)" name="addressProofType"><Select options={ADDRESS_PROOF_OPTIONS} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="Address Proof Number" name="addressProofNumber"><Input /></Form.Item></Col>

        {/* Row 8 */}
        <Col xs={24} md={8}><Form.Item label="Permanent Address is same as the current Address?" name="sameAsCurrentAddress" valuePropName="checked"><Switch /></Form.Item></Col>

        {!sameAsCurrent && (
          <>
            <Col xs={24} md={8}><Form.Item label="Permanent Address" name="permanentAddress"><TextArea rows={1} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Permanent Pincode" name="permanentPincode"><Input maxLength={6} suffix={fetchingPermanentPincode ? "..." : null} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Permanent City" name="permanentCity"><Input /></Form.Item></Col>
          </>
        )}

        {/* Final Row */}
        <Col xs={24} md={8}><Form.Item label="Is Co-Applicant Applicable" name="hasCoApplicant" valuePropName="checked"><Switch /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="Is Guarantor Applicable" name="hasGuarantor" valuePropName="checked"><Switch /></Form.Item></Col>
      </Row>
    </div>
  );
};

export default PersonalDetailsPreFile;